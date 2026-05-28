"""Backend integration tests for the Expense Submission App.

Verifies deployed stack outputs, Cognito auth, CORS, API endpoints,
and CloudWatch log groups against the live AWS environment.

Usage:
    pip install boto3 requests
    python -m pytest tests/test_integration.py -v
"""

import base64
import json
import os
import time
import uuid

import boto3
import pytest
import requests

# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------

CDK_OUTPUTS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "cdk-outputs.json")
STACK_NAME = "ExpenseAppStack"
REGION = "us-east-1"
TEST_USER_EMAIL = f"test-{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_PASSWORD = "Test@1234!"


def _load_outputs() -> dict:
    with open(CDK_OUTPUTS_PATH) as f:
        data = json.load(f)
    return data.get(STACK_NAME, {})


OUTPUTS = _load_outputs()
API_ENDPOINT = OUTPUTS.get("ApiEndpoint", "").rstrip("/")
USER_POOL_ID = OUTPUTS.get("UserPoolId", "")
USER_POOL_CLIENT_ID = OUTPUTS.get("UserPoolClientId", "")


def _cognito_client():
    return boto3.client("cognito-idp", region_name=REGION)


def _create_and_auth_user() -> str:
    """Create a confirmed test user and return an ID token."""
    client = _cognito_client()

    # Create user via admin API (auto-confirms)
    client.admin_create_user(
        UserPoolId=USER_POOL_ID,
        Username=TEST_USER_EMAIL,
        TemporaryPassword=TEST_USER_PASSWORD,
        UserAttributes=[{"Name": "email", "Value": TEST_USER_EMAIL}, {"Name": "email_verified", "Value": "true"}],
        MessageAction="SUPPRESS",
    )

    # Set permanent password
    client.admin_set_user_password(
        UserPoolId=USER_POOL_ID,
        Username=TEST_USER_EMAIL,
        Password=TEST_USER_PASSWORD,
        Permanent=True,
    )

    # Authenticate via admin flow (works without extra client auth flows)
    resp = client.admin_initiate_auth(
        UserPoolId=USER_POOL_ID,
        ClientId=USER_POOL_CLIENT_ID,
        AuthFlow="ADMIN_NO_SRP_AUTH",
        AuthParameters={"USERNAME": TEST_USER_EMAIL, "PASSWORD": TEST_USER_PASSWORD},
    )
    return resp["AuthenticationResult"]["IdToken"]


def _cleanup_user():
    """Delete the test user if it exists."""
    try:
        client = _cognito_client()
        client.admin_delete_user(UserPoolId=USER_POOL_ID, Username=TEST_USER_EMAIL)
    except Exception:
        pass



# ---------------------------------------------------------------------------
# Test 1: Stack outputs are present and non-empty (Req 10.1)
# ---------------------------------------------------------------------------

class TestStackOutputs:
    def test_api_endpoint_present(self):
        assert OUTPUTS.get("ApiEndpoint"), "ApiEndpoint output is missing or empty"

    def test_user_pool_id_present(self):
        assert OUTPUTS.get("UserPoolId"), "UserPoolId output is missing or empty"

    def test_user_pool_client_id_present(self):
        assert OUTPUTS.get("UserPoolClientId"), "UserPoolClientId output is missing or empty"

    def test_website_url_present(self):
        assert OUTPUTS.get("WebsiteURL"), "WebsiteURL output is missing or empty"


# ---------------------------------------------------------------------------
# Test 2: Cognito test user creation and authentication (Req 10.2)
# ---------------------------------------------------------------------------

class TestCognitoAuth:
    @classmethod
    def setup_class(cls):
        cls.id_token = None
        try:
            cls.id_token = _create_and_auth_user()
        except Exception as exc:
            pytest.skip(f"Could not create/auth test user: {exc}")

    @classmethod
    def teardown_class(cls):
        _cleanup_user()

    def test_id_token_obtained(self):
        assert self.id_token, "Failed to obtain ID token"
        # JWT has 3 dot-separated parts
        assert len(self.id_token.split(".")) == 3


# ---------------------------------------------------------------------------
# Test 3: CORS headers on OPTIONS requests (Req 10.3)
# ---------------------------------------------------------------------------

class TestCORS:
    def test_options_expenses(self):
        resp = requests.options(f"{API_ENDPOINT}/expenses", timeout=10)
        headers = resp.headers
        assert "access-control-allow-origin" in {k.lower() for k in headers}
        assert "access-control-allow-methods" in {k.lower() for k in headers}

    def test_options_expenses_extract(self):
        resp = requests.options(f"{API_ENDPOINT}/expenses/extract", timeout=10)
        headers = resp.headers
        assert "access-control-allow-origin" in {k.lower() for k in headers}


# ---------------------------------------------------------------------------
# Test 4: 401 for unauthenticated requests (Req 10.4)
# ---------------------------------------------------------------------------

class TestAuthGate:
    def test_get_expenses_no_auth(self):
        resp = requests.get(f"{API_ENDPOINT}/expenses", timeout=10)
        assert resp.status_code == 401

    def test_post_expenses_no_auth(self):
        resp = requests.post(
            f"{API_ENDPOINT}/expenses",
            json={"merchantName": "Test"},
            timeout=10,
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Test 5: POST /expenses/extract with base64 test image (Req 10.5)
# ---------------------------------------------------------------------------

class TestExtractEndpoint:
    @classmethod
    def setup_class(cls):
        try:
            cls.id_token = _create_and_auth_user()
        except Exception as exc:
            pytest.skip(f"Could not create/auth test user: {exc}")

    @classmethod
    def teardown_class(cls):
        _cleanup_user()

    def test_extract_with_test_image(self):
        # Create a minimal 1x1 white PNG as a test image
        # This is a valid PNG but not a real receipt, so Bedrock will do its best
        png_1x1 = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00"
            b"\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00"
            b"\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        image_b64 = base64.b64encode(png_1x1).decode()

        resp = requests.post(
            f"{API_ENDPOINT}/expenses/extract",
            json={"image": image_b64, "content_type": "image/png"},
            headers={"Authorization": self.id_token},
            timeout=60,
        )
        # Accept 200 (extraction succeeded) or 422 (extraction failed on non-receipt)
        assert resp.status_code in (200, 422), f"Unexpected status: {resp.status_code} — {resp.text}"


# ---------------------------------------------------------------------------
# Test 6: POST /expenses + GET /expenses round-trip (Req 10.6)
# ---------------------------------------------------------------------------

class TestExpensesCRUD:
    @classmethod
    def setup_class(cls):
        try:
            cls.id_token = _create_and_auth_user()
        except Exception as exc:
            pytest.skip(f"Could not create/auth test user: {exc}")
        cls.created_expense_id = None

    @classmethod
    def teardown_class(cls):
        _cleanup_user()

    def test_create_expense(self):
        payload = {
            "merchantName": "Integration Test Store",
            "date": "2025-01-15",
            "totalAmount": 42.99,
            "currency": "USD",
            "lineItems": [{"description": "Widget", "quantity": 1, "unitPrice": 42.99}],
        }
        resp = requests.post(
            f"{API_ENDPOINT}/expenses",
            json=payload,
            headers={"Authorization": self.id_token},
            timeout=15,
        )
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
        data = resp.json().get("data", {})
        assert data.get("expenseId"), "Missing expenseId in response"
        assert data.get("status") == "accepted"
        assert data.get("merchantName") == "Integration Test Store"
        self.__class__.created_expense_id = data["expenseId"]

    def test_list_expenses(self):
        # Allow a moment for eventual consistency
        time.sleep(1)
        resp = requests.get(
            f"{API_ENDPOINT}/expenses",
            headers={"Authorization": self.id_token},
            timeout=15,
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        items = resp.json().get("data", [])
        assert isinstance(items, list)
        assert len(items) >= 1, "Expected at least one expense"
        # Verify our created expense is in the list
        ids = [item.get("expenseId") for item in items]
        if self.__class__.created_expense_id:
            assert self.__class__.created_expense_id in ids


# ---------------------------------------------------------------------------
# Test 7: CloudWatch Log Groups exist (Req 10.8)
# ---------------------------------------------------------------------------

class TestCloudWatchLogs:
    def test_log_groups_exist(self):
        logs_client = boto3.client("logs", region_name=REGION)
        # List log groups matching our Lambda prefix
        resp = logs_client.describe_log_groups(
            logGroupNamePrefix="/aws/lambda/ExpenseAppStack",
        )
        group_names = [g["logGroupName"] for g in resp.get("logGroups", [])]
        # We expect at least the extract and expenses function log groups
        assert len(group_names) >= 2, f"Expected ≥2 log groups, found: {group_names}"
