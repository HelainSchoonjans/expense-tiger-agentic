# Changelog

## 2026-05-03

### Changed
- `scripts/deploy.sh` — Added automatic `cdk bootstrap` before `cdk deploy` to prevent "environment not bootstrapped" errors on fresh accounts
- `README.md` — Added note about Playwright headed mode requiring a display (local desktop only, headless works on EC2)
- `README.md` — Added note about Bedrock CLI test script base64 encoding issue with newer AWS CLI versions, with direct invoke-model alternative command
