"""POST /expenses/extract — Extract expense details from a receipt image via Bedrock."""

import json
import os
import sys
import time
import base64
import traceback

# ---------------------------------------------------------------------------
# Shared logger import — works locally when running from the repo root and
# also when the CDK deployment bundles ``lambda/shared/`` alongside this file.
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))
try:
    from logger import get_logger
except ImportError:
    # Fallback: minimal structured logger if shared module is unavailable
    import logging

    def get_logger(name: str = "lambda") -> logging.Logger:
        _logger = logging.getLogger(name)
        if not _logger.handlers:
            _handler = logging.StreamHandler()
            _logger.addHandler(_handler)
        _logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))
        return _logger

import boto3

# ---------------------------------------------------------------------------
# Module-level setup (re-used across warm starts)
# ---------------------------------------------------------------------------
logger = get_logger("extract")
bedrock_client = boto3.client("bedrock-runtime")
BEDROCK_MODEL_ID = os.environ.get(
    "BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-6"
)

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
}

EXTRACTION_PROMPT = (
    "You are a receipt data extraction assistant. Analyze the provided receipt image "
    "and extract the following information as a JSON object. Return ONLY valid JSON "
    "with no additional text or markdown formatting.\n\n"
    "Required JSON schema:\n"
    "{\n"
    '  "merchant_name": "string - name of the merchant/store",\n'
    '  "date": "string - date in YYYY-MM-DD format",\n'
    '  "total_amount": "number - total amount charged",\n'
    '  "currency": "string - three-letter currency code e.g. USD",\n'
    '  "tax_amount": "number or null - tax amount if visible",\n'
    '  "payment_method": "string or null - payment method if visible (e.g. Visa, Cash)",\n'
    '  "line_items": [\n'
    "    {\n"
    '      "description": "string - item description",\n'
    '      "quantity": "number - quantity purchased",\n'
    '      "unit_price": "number - price per unit"\n'
    "    }\n"
    "  ],\n"
    '  "category": "string or null - expense category e.g. Food, Travel, Office Supplies"\n'
    "}\n\n"
    "If a field is not visible on the receipt, use null for optional fields. "
    "For required fields (merchant_name, date, total_amount), make your best estimate "
    "from the image. Return ONLY the JSON object."
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_response(status_code: int, body: dict) -> dict:
    """Return an API Gateway-compatible response dict."""
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


def call_bedrock(image_bytes: bytes, content_type: str) -> dict:
    """Invoke Bedrock Claude with the receipt image and return the raw API response."""
    media_type = content_type if content_type else "image/jpeg"
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    request_body = json.dumps(
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
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": EXTRACTION_PROMPT},
                    ],
                }
            ],
        }
    )

    start = time.time()
    response = bedrock_client.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=request_body,
    )
    latency_ms = int((time.time() - start) * 1000)

    response_body = json.loads(response["body"].read())
    return response_body, latency_ms


def parse_bedrock_response(response_body: dict) -> dict:
    """Extract the JSON payload from the Bedrock Claude response."""
    # Claude returns content as a list; the text block contains our JSON.
    content_blocks = response_body.get("content", [])
    text = ""
    for block in content_blocks:
        if block.get("type") == "text":
            text = block.get("text", "")
            break

    if not text:
        raise ValueError("Bedrock response contained no text content")

    # Strip markdown fences if the model wrapped the JSON
    cleaned = text.strip()
    if cleaned.startswith("```"):
        # Remove opening fence (possibly ```json)
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()

    return json.loads(cleaned)


def validate_extraction(data: dict) -> bool:
    """Return True when all required fields are present and non-empty."""
    for field in ("merchant_name", "date", "total_amount"):
        value = data.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            return False
    return True


# ---------------------------------------------------------------------------
# Main handler
# ---------------------------------------------------------------------------

def handler(event, context):
    """POST /expenses/extract — extract expense details from a receipt image."""
    request_id = getattr(context, "aws_request_id", "local")
    user_id = _get_user_id(event)

    logger.info(
        "Request received",
        extra={
            "request_id": request_id,
            "user_id": user_id,
            "http_method": event.get("httpMethod"),
            "path": event.get("path"),
        },
    )

    # --- Parse request body ---------------------------------------------------
    try:
        body = json.loads(event.get("body") or "{}")
    except (json.JSONDecodeError, TypeError):
        return _error_response(400, "INVALID_REQUEST", "Request body must be valid JSON")

    image_base64 = body.get("image")
    content_type = body.get("content_type", "image/jpeg")

    if not image_base64:
        return _error_response(400, "INVALID_REQUEST", "Missing required field: image")

    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception:
        return _error_response(400, "INVALID_REQUEST", "Invalid base64 image data")

    # --- Call Bedrock ---------------------------------------------------------
    try:
        response_body, latency_ms = call_bedrock(image_bytes, content_type)

        # Log token usage from the response
        usage = response_body.get("usage", {})
        logger.info(
            "Bedrock invocation complete",
            extra={
                "request_id": request_id,
                "model_id": BEDROCK_MODEL_ID,
                "input_tokens": usage.get("input_tokens"),
                "output_tokens": usage.get("output_tokens"),
                "latency_ms": latency_ms,
            },
        )
    except Exception as exc:
        logger.error(
            "Bedrock invocation failed",
            exc_info=True,
            extra={
                "request_id": request_id,
                "user_id": user_id,
                "error_type": type(exc).__name__,
                "error_message": str(exc),
            },
        )
        return _error_response(503, "SERVICE_UNAVAILABLE", "Receipt extraction service is temporarily unavailable")

    # --- Parse and validate extraction ----------------------------------------
    try:
        extracted = parse_bedrock_response(response_body)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error(
            "Failed to parse Bedrock response",
            exc_info=True,
            extra={
                "request_id": request_id,
                "user_id": user_id,
                "error_type": type(exc).__name__,
                "error_message": str(exc),
            },
        )
        return _error_response(422, "EXTRACTION_FAILED", "Could not parse extracted data from receipt")

    if not validate_extraction(extracted):
        logger.warning(
            "Extraction validation failed — missing required fields",
            extra={
                "request_id": request_id,
                "user_id": user_id,
                "extracted_keys": list(extracted.keys()),
            },
        )
        return _error_response(422, "EXTRACTION_FAILED", "Extraction missing required fields (merchant_name, date, total_amount)")

    # --- Success --------------------------------------------------------------
    logger.info(
        "Extraction successful",
        extra={
            "request_id": request_id,
            "user_id": user_id,
            "merchant_name": extracted.get("merchant_name"),
        },
    )

    return _build_response(200, {"data": extracted})
