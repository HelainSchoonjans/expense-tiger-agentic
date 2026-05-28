#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${STACK_NAME:-ExpenseAppStack}"
REGION="${AWS_REGION:-us-east-1}"
FRONTEND_DIR="$(cd "$(dirname "$0")/../frontend" && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUTS_FILE="$SCRIPT_DIR/../cdk-outputs.json"
if [ ! -f "$OUTPUTS_FILE" ]; then
  echo "Error: $OUTPUTS_FILE not found. Run scripts/deploy.sh first."
  exit 1
fi

SITE_BUCKET=$(node -e "const o=JSON.parse(require('fs').readFileSync('$OUTPUTS_FILE','utf8')); console.log(o['$STACK_NAME']['SiteBucketName'])")
DISTRIBUTION_ID=$(node -e "const o=JSON.parse(require('fs').readFileSync('$OUTPUTS_FILE','utf8')); console.log(o['$STACK_NAME']['DistributionId'])")

echo "==> Syncing frontend to S3"
aws s3 sync "$FRONTEND_DIR" "s3://${SITE_BUCKET}" --delete --region "$REGION"

echo "==> Invalidating CloudFront cache"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" --region "$REGION"

echo "==> Frontend deployment complete"
