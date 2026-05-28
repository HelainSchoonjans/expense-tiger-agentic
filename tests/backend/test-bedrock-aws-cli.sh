#!/usr/bin/env bash
set -euo pipefail

IMAGE_PATH="${1:-tests/example-receipt-images/starbucks-vietnam.jpg}"
REGION="${AWS_REGION:-eu-west-1}"
# ON_DEMAND model with vision support in eu-west-1 (no cross-region inference profile needed)
MODEL_ID="qwen.qwen3-vl-235b-a22b"

echo "========================================"
echo "  Test 1: Text-only (baseline timing)"
echo "========================================"

echo "==> Invoking Bedrock with text prompt (Converse API)"
time aws bedrock-runtime converse \
  --model-id "$MODEL_ID" \
  --messages '[{"role":"user","content":[{"text":"Say hello in one word"}]}]' \
  --region "$REGION" \
  --output json > /tmp/bedrock-text-output.json

echo ""
echo "==> Text response:"
python3 -c "
import json
with open('/tmp/bedrock-text-output.json') as f:
    data = json.load(f)
for block in data.get('output', {}).get('message', {}).get('content', []):
    if 'text' in block:
        print(block['text'])
usage = data.get('usage', {})
print(f'Input tokens: {usage.get(\"inputTokens\")}')
print(f'Output tokens: {usage.get(\"outputTokens\")}')
"
echo ""

echo ""
echo "========================================"
echo "  Test 2: Image + extraction prompt"
echo "========================================"

echo "==> Building image request payload"
# Use python3 (stdlib only) to build the JSON with base64-encoded image bytes
python3 - <<PYEOF
import json, base64
with open("$IMAGE_PATH", "rb") as f:
    image_b64 = base64.b64encode(f.read()).decode()

# Converse API messages structure with inline base64 image
messages = [
    {
        "role": "user",
        "content": [
            {
                "image": {
                    "format": "jpeg",
                    "source": {"bytes": image_b64}
                }
            },
            {
                "text": "Extract receipt details as JSON: merchant_name, date (YYYY-MM-DD), total_amount, currency, line_items [{description, quantity, unit_price}]. Return ONLY JSON."
            }
        ]
    }
]
with open("/tmp/bedrock-converse-messages.json", "w") as f:
    json.dump(messages, f)
PYEOF

echo "==> Invoking Bedrock with image ($(wc -c < "$IMAGE_PATH" | tr -d ' ') bytes)"
time aws bedrock-runtime converse \
  --model-id "$MODEL_ID" \
  --messages "$(cat /tmp/bedrock-converse-messages.json)" \
  --region "$REGION" \
  --output json > /tmp/bedrock-image-output.json

echo ""
echo "==> Image extraction response:"
python3 -c "
import json
with open('/tmp/bedrock-image-output.json') as f:
    data = json.load(f)
for block in data.get('output', {}).get('message', {}).get('content', []):
    if 'text' in block:
        print(block['text'])
usage = data.get('usage', {})
print()
print(f'Input tokens:  {usage.get(\"inputTokens\")}')
print(f'Output tokens: {usage.get(\"outputTokens\")}')
"
