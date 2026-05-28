# Debugging Notes

## 2026-03-28: Bedrock model ID — Legacy model access denied
Root cause: CDK stack used `anthropic.claude-3-sonnet-20240229-v1:0` which is marked Legacy by Anthropic.
Error: `ResourceNotFoundException: Access denied. This Model is marked by provider as Legacy`
Fix: Updated to `us.anthropic.claude-sonnet-4-6` (Claude Sonnet 4.6, cross-region inference profile).
Also updated `~/.kiro/skills/serverless-spa-bedrock/SKILL.md` to recommend the new model.
Lesson: Always use cross-region inference profiles (`us.` prefix) and check model lifecycle status.
Note: Claude Sonnet 4.6 does NOT have a date suffix — the model ID is just `us.anthropic.claude-sonnet-4-6`.
Note: AWS CLI `invoke-model --body` requires base64-encoded input, not raw JSON.
Confirmed: CLI test showed text ~2s, image extraction ~4s. Well within API GW 29s limit.

## 2026-03-28: Observability — Logging decisions
Problem: When debugging the CORS/Bedrock issue, we only had Lambda logs. No visibility into API Gateway or CloudFront behavior.
Decision: Enabled full observability stack in CDK:
- Lambda: Explicit CloudWatch Log Groups (14-day retention, RemovalPolicy.DESTROY)
- API Gateway: Execution logs enabled (loggingLevel: INFO, dataTraceEnabled: true, metricsEnabled: true)
  - Logs go to: `API-Gateway-Execution-Logs_{api-id}/prod` in CloudWatch
- CloudFront: Standard access logs to S3 bucket (`cf-logs/` prefix, ~5-10 min delay)
  - Logs bucket output: `CloudFrontLogsBucket`
Lesson: Enable all logging from the start during development. Don't wait until you need it to debug.
Lesson: API GW execution logs are the most useful for debugging request flow issues — they show the full request/response at the integration level.

## 2026-03-28: CORS error masking Lambda timeout/crash
Symptom: Browser shows "CORS policy: No 'Access-Control-Allow-Origin' header" on POST /expenses/extract.
Root cause: CONFIRMED — the legacy model ID caused Lambda to throw `ResourceNotFoundException`, and API Gateway returned a raw 5xx without CORS headers. Browser interprets missing CORS headers as a CORS error.
Key insight: When debugging CORS errors on API Gateway, always check Lambda logs first — the CORS error is often a symptom, not the cause.
Fix: Updated model ID to `us.anthropic.claude-sonnet-4-6` + increased Lambda timeout to 60s + memory to 512MB.
Bedrock timing (confirmed via CLI): text ~2s, image extraction ~4s. Well within 29s API Gateway limit.
Status: PENDING DEPLOY — code is updated, needs `./scripts/deploy.sh`.

## 2026-03-28: API Gateway integration timeout
API Gateway REST API max integration timeout is 29 seconds. If Lambda takes longer, API Gateway returns 504.
For Bedrock vision calls that can take 10-30s, this is tight. If 29s isn't enough, need to switch to async pattern (SQS + polling) per the serverless-spa-backend skill.

## 2026-03-28: Cognito ADMIN_NO_SRP_AUTH not enabled
Backend integration tests skip authenticated tests because `admin_initiate_auth` with `ADMIN_NO_SRP_AUTH` fails.
The Cognito App Client was created with only `userSrp: true`. Need to add `ALLOW_USER_PASSWORD_AUTH` or use SRP in tests.
Status: Not fixed yet — tests skip gracefully.

## 2026-03-28: snake_case/camelCase contract mismatch
Root cause: Backend and frontend were built by parallel subagents. Frontend api.js converts camelCase→snake_case before sending, but backend Lambda expected camelCase field names (merchantName instead of merchant_name).
Impact: POST /expenses returned 400 "Missing required fields" even though data was present.
Fix: Changed backend REQUIRED_FIELDS and create_expense to use snake_case (merchant_name, total_amount, etc.).
Prevention: Created OpenAPI spec at `.kiro/specs/expense-submission-app/api-contract.yaml` and a steering file at `.kiro/steering/api-contract.md` that auto-activates when Lambda or frontend API files are edited.
Lesson: When using parallel subagents for frontend/backend, they MUST share a single source of truth for the wire format. An OpenAPI spec or shared contract file referenced by both specs prevents this class of bug.

## 2026-03-28: deploy.sh cdk-outputs.json path issues
First version of deploy.sh used `require('./cdk-outputs.json')` which failed due to Node module resolution.
Fixed by using `JSON.parse(require('fs').readFileSync(...))` with absolute paths and `--app` flag for CDK.

## 2026-03-28: DynamoDB Float→Decimal conversion
Problem: `boto3` DynamoDB resource raises `TypeError: Float types are not supported. Use Decimal types instead` when storing line items with float values.
Root cause: Bedrock returns extracted amounts as Python floats. DynamoDB's `boto3.resource` API requires `decimal.Decimal` for numeric types.
Fix: In `lambda/expenses/handler.py`, convert all numeric fields in line items to `Decimal` before `table.put_item()`:
```python
from decimal import Decimal
for item in line_items:
    item['amount'] = Decimal(str(item.get('amount', 0)))
    item['quantity'] = Decimal(str(item.get('quantity', 1)))
```
Lesson: Always convert floats to `Decimal(str(value))` before writing to DynamoDB via boto3 resource API. Use `str()` intermediate to avoid floating-point precision issues.

## 2026-03-28: response.data unwrapping pattern
All backend API responses wrap the payload in `{ "data": ... }`. Frontend components must unwrap:
```javascript
// In receipt-uploader.js
const result = await api.extractReceipt(file);
const expenseData = result.data;  // unwrap before passing to editor

// In expense-list.js
const result = await api.getExpenses();
const expenses = result.data;  // unwrap to get the array
```
Root cause: `api.js` returns the full response body. Backend wraps all responses in `{ "data": ... }` for consistency.
Lesson: When adding new frontend components that consume API responses, always check if `.data` unwrapping is needed.

## 2026-03-28: CloudFront cache invalidation delay
CloudFront serves cached content. After deploying frontend changes via `deploy-frontend.sh`, the script runs `aws cloudfront create-invalidation` but:
- Invalidation takes 1-5 minutes to propagate globally
- During this window, users (and test automation) may see stale content
- Hard refresh (Ctrl+Shift+R) doesn't help — CloudFront edge still serves cached version
Workaround: Wait ~2 minutes after invalidation before testing, or use the API URL directly for backend testing.
Lesson: Factor in CloudFront propagation delay when running E2E tests after deployment.

## 2026-03-28: RCA — Agent Assumption-Driven Debugging (MAJOR LEARNING)

This is the most important debugging lesson from the entire session. The agent (me) nearly went down two costly rabbit holes based on assumptions rather than evidence. The human teammate intervened both times, insisting on data before action. This section documents both incidents as a reference example for future RCA.

The `triage-issue` skill was used to structure the investigation.

---

### Incident 1: "Bedrock is too slow for API Gateway" (false assumption)

**Symptom**: POST /expenses/extract was failing. The agent knew Bedrock vision calls can take 10-30 seconds and that API Gateway has a 29-second integration timeout.

**Agent's assumption**: Bedrock inference was exceeding the 29s API Gateway timeout, causing 504 errors. The agent was about to propose switching to an async architecture (SQS queue + polling) — a significant architectural change.

**What actually happened**: The human pushed back: "Are you SURE that 30 seconds is the problem?" The agent had no latency data. No logs. No evidence. Just a plausible-sounding theory.

**How it was resolved**:
1. Human asked agent to create a CLI-based latency test instead of changing architecture
2. Agent created `tests/backend/test-bedrock-aws-cli.sh` with `time` measurements
3. Results: text ~2s, image extraction ~4s — well within the 29s limit
4. The timeout was never the issue. The real problem was the legacy model ID (see Incident 2)

**Root cause of the bad assumption**: The agent generalized from documentation ("Bedrock vision calls can take 10-30s") without measuring the actual latency for this specific model and payload size. Claude Sonnet 4.6 is fast — the 10-30s range applies to larger models or complex multi-page documents.

**Impact if not caught**: Would have introduced SQS, polling logic, and async state management — adding ~500 lines of code and significant complexity to solve a problem that didn't exist.

---

### Incident 2: "It's a CORS configuration issue" (false assumption)

**Symptom**: Browser console showed `CORS policy: No 'Access-Control-Allow-Origin' header` on POST /expenses/extract.

**Agent's assumption**: The CORS configuration between API Gateway and Lambda was wrong — missing headers, incorrect allowed origins, or a misconfigured preflight response. The agent was about to modify CDK CORS settings.

**What actually happened**: The human pushed back: "You are making assumptions. Can you see the API GW CORS settings, or what error APIGW is giving? How do you know it is APIGW-Lambda? Did you add the API GW and CloudFront logging?"

The answer was no — there were no API Gateway execution logs, no CloudFront logs, and no evidence beyond the browser error message.

**How it was resolved**:
1. Human insisted on enabling observability before making changes
2. Agent added to CDK: API Gateway execution logs (INFO level, data trace enabled), CloudFront access logs to S3, explicit Lambda CloudWatch log groups
3. After deploying with logging, Lambda logs revealed the real error: `ResourceNotFoundException: Access denied. This Model is marked by provider as Legacy`
4. The Lambda was crashing on the Bedrock call. API Gateway returned a raw 5xx (no CORS headers). Browser interpreted the missing CORS headers as a CORS error.
5. Fix: update model ID to `us.anthropic.claude-sonnet-4-6` — a one-line change

**Root cause of the bad assumption**: The agent treated the browser error message as the diagnosis rather than a symptom. CORS errors on API Gateway are almost always a symptom of a backend failure, not an actual CORS misconfiguration — because when Lambda crashes, API Gateway's error response doesn't include the CORS headers that the Lambda integration would normally add.

**Impact if not caught**: Would have spent time modifying CORS settings (which were already correct), potentially breaking the working OPTIONS preflight, while the real issue (deprecated model ID) remained unfixed.

---

### Meta-Analysis: Why the Agent Made These Assumptions

Both incidents share the same pattern:

1. **Agent saw a symptom** (timeout concern, CORS error)
2. **Agent matched it to a known pattern** from training data ("Bedrock is slow", "CORS errors mean CORS misconfiguration")
3. **Agent proposed a fix for the pattern** without verifying the pattern applied to this specific case
4. **Human intervened** asking for evidence before action

This is a fundamental risk of AI-assisted development: agents are pattern matchers. They'll confidently propose solutions to problems that look like something they've seen before, even when the actual cause is different.

### Prevention Framework: "Evidence Before Action"

For any debugging scenario, follow this protocol:

```
1. OBSERVE  — What is the exact error? (browser console, HTTP status, log message)
2. MEASURE  — Can you reproduce it? What does the data say? (logs, metrics, CLI tests)
3. DIAGNOSE — What does the evidence point to? (not what it "looks like")
4. FIX      — Change one thing, verify it fixes the symptom
5. CONFIRM  — Run the original failing scenario again
```

Specific rules:
- **Never change architecture based on a theory.** Measure first. The CLI latency test took 5 minutes to write and saved hours of unnecessary async implementation.
- **Never trust browser error messages as root cause.** They describe what the browser sees, not what the server did. Always check server-side logs.
- **Enable observability before debugging.** If you don't have logs, your first action is to add them — not to guess.
- **The human's job is to ask "how do you know?"** This is the single most valuable intervention a human teammate can make when working with an AI agent.

### Artifacts Created from This RCA

| Artifact | Purpose |
|----------|---------|
| `tests/backend/test-bedrock-aws-cli.sh` | CLI latency test — proves Bedrock timing is within limits |
| CDK: API GW execution logs | Server-side request/response visibility |
| CDK: CloudFront access logs to S3 | Edge-level request visibility |
| CDK: Explicit Lambda log groups | Structured Lambda error visibility |
| `triage-issue` skill usage | Structured RCA methodology (explore → diagnose → fix) |

---

## 2026-03-28: RCA — Agent Assumption-Driven Debugging (MAJOR LEARNING)

This is the most important debugging lesson from the entire session. The agent nearly went down two costly rabbit holes based on assumptions rather than evidence. The human teammate intervened both times, insisting on data before action. This section documents both incidents as a reference example for future RCA.

The `triage-issue` skill was used to structure the investigation.

---

### Incident 1: "Bedrock is too slow for API Gateway" (false assumption)

**Symptom**: POST /expenses/extract was failing. The agent knew Bedrock vision calls can take 10-30 seconds and that API Gateway has a 29-second integration timeout.

**Agent's assumption**: Bedrock inference was exceeding the 29s API Gateway timeout, causing 504 errors. The agent was about to propose switching to an async architecture (SQS queue + polling) — a significant architectural change.

**What actually happened**: The human pushed back: "Are you SURE that 30 seconds is the problem?" The agent had no latency data. No logs. No evidence. Just a plausible-sounding theory.

**How it was resolved**:
1. Human asked agent to create a CLI-based latency test instead of changing architecture
2. Agent created `tests/backend/test-bedrock-aws-cli.sh` with `time` measurements
3. Results: text ~2s, image extraction ~4s — well within the 29s limit
4. The timeout was never the issue. The real problem was the legacy model ID (see Incident 2)

**Root cause of the bad assumption**: The agent generalized from documentation ("Bedrock vision calls can take 10-30s") without measuring the actual latency for this specific model and payload size. Claude Sonnet 4.6 is fast — the 10-30s range applies to larger models or complex multi-page documents.

**Impact if not caught**: Would have introduced SQS, polling logic, and async state management — adding ~500 lines of code and significant complexity to solve a problem that didn't exist.

---

### Incident 2: "It's a CORS configuration issue" (false assumption)

**Symptom**: Browser console showed `CORS policy: No 'Access-Control-Allow-Origin' header` on POST /expenses/extract.

**Agent's assumption**: The CORS configuration between API Gateway and Lambda was wrong — missing headers, incorrect allowed origins, or a misconfigured preflight response. The agent was about to modify CDK CORS settings.

**What actually happened**: The human pushed back: "You are making assumptions. Can you see the API GW CORS settings, or what error APIGW is giving? How do you know it is APIGW-Lambda? Did you add the API GW and CloudFront logging?"

The answer was no — there were no API Gateway execution logs, no CloudFront logs, and no evidence beyond the browser error message.

**How it was resolved**:
1. Human insisted on enabling observability before making changes
2. Agent added to CDK: API Gateway execution logs (INFO level, data trace enabled), CloudFront access logs to S3, explicit Lambda CloudWatch log groups
3. After deploying with logging, Lambda logs revealed the real error: `ResourceNotFoundException: Access denied. This Model is marked by provider as Legacy`
4. The Lambda was crashing on the Bedrock call. API Gateway returned a raw 5xx (no CORS headers). Browser interpreted the missing CORS headers as a CORS error.
5. Fix: update model ID to `us.anthropic.claude-sonnet-4-6` — a one-line change

**Root cause of the bad assumption**: The agent treated the browser error message as the diagnosis rather than a symptom. CORS errors on API Gateway are almost always a symptom of a backend failure, not an actual CORS misconfiguration — because when Lambda crashes, API Gateway's error response doesn't include the CORS headers that the Lambda integration would normally add.

**Impact if not caught**: Would have spent time modifying CORS settings (which were already correct), potentially breaking the working OPTIONS preflight, while the real issue (deprecated model ID) remained unfixed.

---

### Meta-Analysis: Why the Agent Made These Assumptions

Both incidents share the same pattern:

1. **Agent saw a symptom** (timeout concern, CORS error)
2. **Agent matched it to a known pattern** from training data ("Bedrock is slow", "CORS errors mean CORS misconfiguration")
3. **Agent proposed a fix for the pattern** without verifying the pattern applied to this specific case
4. **Human intervened** asking for evidence before action

This is a fundamental risk of AI-assisted development: agents are pattern matchers. They'll confidently propose solutions to problems that look like something they've seen before, even when the actual cause is different.

### Prevention Framework: "Evidence Before Action"

For any debugging scenario, follow this protocol:

```
1. OBSERVE  — What is the exact error? (browser console, HTTP status, log message)
2. MEASURE  — Can you reproduce it? What does the data say? (logs, metrics, CLI tests)
3. DIAGNOSE — What does the evidence point to? (not what it "looks like")
4. FIX      — Change one thing, verify it fixes the symptom
5. CONFIRM  — Run the original failing scenario again
```

Specific rules:
- **Never change architecture based on a theory.** Measure first. The CLI latency test took 5 minutes to write and saved hours of unnecessary async implementation.
- **Never trust browser error messages as root cause.** They describe what the browser sees, not what the server did. Always check server-side logs.
- **Enable observability before debugging.** If you don't have logs, your first action is to add them — not to guess.
- **The human's job is to ask "how do you know?"** This is the single most valuable intervention a human teammate can make when working with an AI agent.

### Artifacts Created from This RCA

| Artifact | Purpose |
|----------|---------|
| `tests/backend/test-bedrock-aws-cli.sh` | CLI latency test — proves Bedrock timing is within limits |
| CDK: API GW execution logs | Server-side request/response visibility |
| CDK: CloudFront access logs to S3 | Edge-level request visibility |
| CDK: Explicit Lambda log groups | Structured Lambda error visibility |
| `triage-issue` skill usage | Structured RCA methodology (explore → diagnose → fix) |

---

## Diagnostic Commands
```bash
# Lambda logs (extract function)
aws logs filter-log-events \
  --log-group-name "/aws/lambda/ExpenseAppStack-ExtractFunctionABD5F5B5-1N91mbcTcJTd" \
  --start-time $(date -v-30M +%s000) \
  --filter-pattern "ERROR" \
  --region us-east-1 --limit 10

# Lambda logs (expenses function)
aws logs filter-log-events \
  --log-group-name "/aws/lambda/ExpenseAppStack-ExpensesFunction91499645-3rU7nhk6uH1C" \
  --start-time $(date -v-30M +%s000) \
  --filter-pattern "ERROR" \
  --region us-east-1 --limit 10

# API Gateway execution logs
aws logs filter-log-events \
  --log-group-name "API-Gateway-Execution-Logs_9dw70dsk6l/prod" \
  --start-time $(date -v-30M +%s000) \
  --region us-east-1 --limit 20

# CloudFront access logs (S3, ~5-10 min delay)
CF_LOGS_BUCKET=$(node -e "const o=JSON.parse(require('fs').readFileSync('cdk-outputs.json','utf8')); console.log(o['ExpenseAppStack']['CloudFrontLogsBucket'])")
aws s3 ls "s3://${CF_LOGS_BUCKET}/cf-logs/" --region us-east-1

# List all log groups
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/ExpenseAppStack --region us-east-1
aws logs describe-log-groups --log-group-name-prefix "API-Gateway-Execution-Logs" --region us-east-1

# Bedrock CLI test (text + image)
./tests/backend/test-bedrock-aws-cli.sh
```

## User-Level Hooks
Located at `~/.kiro/hooks/`:
- `memory-recall.kiro.hook` (promptSubmit): reads MEMORY.md at conversation start
- `memory-save.kiro.hook` (agentStop): evaluates session and saves learnings when agent stops
