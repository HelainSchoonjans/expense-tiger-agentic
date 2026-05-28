"""POST /expenses and GET /expenses — Expense CRUD operations."""

import json
import os
import sys
import uuid
from datetime import datetime, timezone
from decimal import Decimal

# ---------------------------------------------------------------------------
# Shared logger import
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))
try:
    from logger import get_logger
except ImportError:
    import logging

    def get_logger(name: str = "lambda") -> logging.Logger:
        _logger = logging.getLogger(name)
        if not _logger.handlers:
            _handler = logging.StreamHandler()
            _logger.addHandler(_handler)
        _logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))
        return _logger

import boto3
from boto3.dynamodb.types import TypeDeserializer

# ---------------------------------------------------------------------------
# Module-level setup (re-used across warm starts)
# ---------------------------------------------------------------------------
logger = get_logger("expenses")
TABLE_NAME = os.environ.get("TABLE_NAME", "")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
}

REQUIRED_FIELDS = ("merchant_name", "date", "total_amount")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str),
    }


def _error_response(status_code: int, code: str, message: str) -> dict:
    return _build_response(status_code, {"error": {"code": code, "message": message}})


def _get_user_id(event: dict) -> str | None:
    """Extract the Cognito ``sub`` claim from the API Gateway authorizer."""
    try:
        return event["requestContext"]["authorizer"]["claims"]["sub"]
    except (KeyError, TypeError):
        return None



class DecimalEncoder(json.JSONEncoder):
    """Handle Decimal types returned by DynamoDB."""
    def default(self, o):
        if isinstance(o, Decimal):
            if o % 1 == 0:
                return int(o)
            return float(o)
        return super().default(o)


def _json_dumps(obj: dict) -> str:
    return json.dumps(obj, cls=DecimalEncoder)


def _validate_expense(data: dict) -> str | None:
    """Return an error message if required fields are missing, else None."""
    missing = [f for f in REQUIRED_FIELDS if not data.get(f)]
    if missing:
        return f"Missing required fields: {', '.join(missing)}"
    return None


# ---------------------------------------------------------------------------
# CRUD operations
# ---------------------------------------------------------------------------

def create_expense(user_id: str, expense_data: dict, request_id: str) -> dict:
    """Validate, generate ID, save to DynamoDB, return the record."""
    validation_error = _validate_expense(expense_data)
    if validation_error:
        return _error_response(400, "INVALID_REQUEST", validation_error)

    now = datetime.now(timezone.utc).isoformat()
    expense_id = str(uuid.uuid4())

    item = {
        "userId": user_id,
        "expenseId": expense_id,
        "merchantName": expense_data.get("merchant_name", ""),
        "date": expense_data.get("date", ""),
        "totalAmount": Decimal(str(expense_data.get("total_amount", 0))),
        "currency": expense_data.get("currency", "USD"),
        "taxAmount": Decimal(str(expense_data.get("tax_amount", 0))) if expense_data.get("tax_amount") is not None else Decimal("0"),
        "paymentMethod": expense_data.get("payment_method", ""),
        "lineItems": [
            {
                "description": li.get("description", ""),
                "quantity": Decimal(str(li.get("quantity", 0))),
                "unitPrice": Decimal(str(li.get("unit_price", 0))),
            }
            for li in expense_data.get("line_items", [])
        ],
        "category": expense_data.get("category", ""),
        "status": "accepted",
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        table.put_item(Item=item)
    except Exception as exc:
        logger.error(
            "DynamoDB put_item failed",
            exc_info=True,
            extra={
                "request_id": request_id,
                "user_id": user_id,
                "error_type": type(exc).__name__,
                "error_message": str(exc),
            },
        )
        return _error_response(500, "INTERNAL_ERROR", "Failed to save expense")

    logger.info(
        "Expense created",
        extra={
            "request_id": request_id,
            "user_id": user_id,
            "expense_id": expense_id,
        },
    )

    return _build_response(201, {"data": json.loads(_json_dumps(item))})


def list_expenses(user_id: str, request_id: str) -> dict:
    """Query DynamoDB by userId, return sorted by date descending."""
    try:
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("userId").eq(user_id),
        )
        items = response.get("Items", [])
    except Exception as exc:
        logger.error(
            "DynamoDB query failed",
            exc_info=True,
            extra={
                "request_id": request_id,
                "user_id": user_id,
                "error_type": type(exc).__name__,
                "error_message": str(exc),
            },
        )
        return _error_response(500, "INTERNAL_ERROR", "Failed to retrieve expenses")

    # Sort by date descending (most recent first)
    items.sort(key=lambda x: x.get("date", ""), reverse=True)

    logger.info(
        "Expenses listed",
        extra={
            "request_id": request_id,
            "user_id": user_id,
            "count": len(items),
        },
    )

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": _json_dumps({"data": items}),
    }


# ---------------------------------------------------------------------------
# Main handler
# ---------------------------------------------------------------------------

def handler(event, context):
    """Routes POST /expenses and GET /expenses."""
    request_id = getattr(context, "aws_request_id", "local")
    http_method = event.get("httpMethod", "")
    user_id = _get_user_id(event)

    logger.info(
        "Request received",
        extra={
            "request_id": request_id,
            "user_id": user_id,
            "http_method": http_method,
            "path": event.get("path"),
        },
    )

    if not user_id:
        return _error_response(400, "INVALID_REQUEST", "Unable to determine user identity")

    if http_method == "POST":
        try:
            body = json.loads(event.get("body") or "{}")
        except (json.JSONDecodeError, TypeError):
            return _error_response(400, "INVALID_REQUEST", "Request body must be valid JSON")
        return create_expense(user_id, body, request_id)

    if http_method == "GET":
        return list_expenses(user_id, request_id)

    return _error_response(400, "INVALID_REQUEST", f"Unsupported HTTP method: {http_method}")
