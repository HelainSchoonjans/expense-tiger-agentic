"""Structured JSON logging module for Lambda functions.

Provides a JsonFormatter and get_logger() helper so every handler
emits consistent, machine-readable log entries with per-invocation
context (request_id, user_id, http_method, path, timestamp).
"""

import json
import logging
import os
from datetime import datetime, timezone


LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")


class JsonFormatter(logging.Formatter):
    """Formats log records as single-line JSON strings."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }

        # Per-invocation context fields
        for field in ("request_id", "user_id", "http_method", "path"):
            value = getattr(record, field, None)
            if value is not None:
                log_entry[field] = value

        # Exception info
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


def get_logger(name: str = "lambda") -> logging.Logger:
    """Return a logger pre-configured with JsonFormatter.

    Calling this multiple times with the same *name* returns the same
    logger instance (standard logging behaviour).  The handler and
    formatter are only attached once.
    """
    logger = logging.getLogger(name)

    # Avoid adding duplicate handlers on warm-start re-imports
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)

    logger.setLevel(LOG_LEVEL)
    logger.propagate = False
    return logger
