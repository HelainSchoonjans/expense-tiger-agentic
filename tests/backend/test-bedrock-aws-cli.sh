#!/usr/bin/env bash
set -euo pipefail

IMAGE_PATH="${1:-tests/example-receipt-images/starbucks-vietnam.jpg}"
REGION="${AWS_REGION:-us-east-1}"
MODEL_ID="us.anthropic.claude-sonnet-4-6"

echo "========================================"
echo "  Test 1: Text-only (baseline timing)"
echo "========================================"

echo "==> Invoking Bedrock with text prompt"
time aws bedrock-runtime invoke-model \
  --model-id "$MODEL_ID" \
  --content-type application/json \
  --accept application/json \
  --body "$(echo '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":[{"type":"text","text":"Say hello in one word"}]}]}' | base64)" \
  --region "$REGION" \
  /tmp/bedrock-text-output.json

echo ""
echo "==> Text response:"
cat /tmp/bedrock-text-output.json
echo ""

echo ""
echo "========================================"
echo "  Test 2: Image + extraction prompt"
echo "========================================"

echo "==> Encoding image: $IMAGE_PATH"
IMAGE_B64=$(base64 < "$IMAGE_PATH")

echo "==> Building request payload"
cat > /tmp/bedrock-image-request.json <<EOF
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 4096,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": "${IMAGE_B64}"
          }
        },
        {
          "type": "text",
          "text": "Extract receipt details as JSON: merchant_name, date (YYYY-MM-DD), total_amount, currency, line_items [{description, quantity, unit_price}]. Return ONLY JSON."
        }
      ]
    }
  ]
}
EOF

echo "==> Invoking Bedrock with image ($(wc -c < "$IMAGE_PATH" | tr -d ' ') bytes)"
time aws bedrock-runtime invoke-model \
  --model-id "$MODEL_ID" \
  --content-type application/json \
  --accept application/json \
  --body "$(base64 < /tmp/bedrock-image-request.json)" \
  --region "$REGION" \
  /tmp/bedrock-image-output.json

echo ""
echo "==> Image extraction response:"
python3 -c "
import json
with open('/tmp/bedrock-image-output.json') as f:
    data = json.load(f)
for block in data.get('content', []):
    if block.get('type') == 'text':
        print(block['text'])
print()
print(f\"Input tokens: {data.get('usage',{}).get('input_tokens')}\")
print(f\"Output tokens: {data.get('usage',{}).get('output_tokens')}\")
"
