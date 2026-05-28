#!/usr/bin/env bash
set -euo pipefail

STACK_NAME="${STACK_NAME:-ExpenseAppStack}"
REGION="${AWS_REGION:-us-east-1}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"
CDK_DIR="$SCRIPT_DIR/../cdk"
OUTPUTS_FILE="$SCRIPT_DIR/../cdk-outputs.json"

echo "==> Building CDK project"
npm run build --prefix "$CDK_DIR"

echo "==> Bootstrapping CDK (if not already done)"
npx cdk bootstrap --app "node $CDK_DIR/bin/cdk.js" 2>/dev/null || true

echo "==> Deploying CDK stack: $STACK_NAME"
npx cdk deploy "$STACK_NAME" --require-approval never --outputs-file "$OUTPUTS_FILE" --app "node $CDK_DIR/bin/cdk.js"

if [ ! -f "$OUTPUTS_FILE" ]; then
  echo "Error: cdk-outputs.json was not created. Deploy may have failed."
  exit 1
fi

echo "==> Extracting stack outputs"
read_output() {
  node -e "const o=JSON.parse(require('fs').readFileSync('$OUTPUTS_FILE','utf8')); console.log(o['$STACK_NAME']['$1'])"
}

API_ENDPOINT=$(read_output ApiEndpoint)
USER_POOL_ID=$(read_output UserPoolId)
USER_POOL_CLIENT_ID=$(read_output UserPoolClientId)
SITE_BUCKET=$(read_output SiteBucketName)
DISTRIBUTION_ID=$(read_output DistributionId)
WEBSITE_URL=$(read_output WebsiteURL)

echo "==> Generating frontend config.js"
cat > "$FRONTEND_DIR/config.js" <<EOF
window.APP_CONFIG = {
  apiEndpoint: "${API_ENDPOINT}",
  userPoolId: "${USER_POOL_ID}",
  userPoolClientId: "${USER_POOL_CLIENT_ID}",
  region: "${REGION}"
};
EOF

echo "==> Syncing frontend to S3"
aws s3 sync "$FRONTEND_DIR" "s3://${SITE_BUCKET}" --delete --region "$REGION"

echo "==> Invalidating CloudFront cache"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" --region "$REGION"

echo "==> Deployment complete"
echo "Website URL: ${WEBSITE_URL}"
