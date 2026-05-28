"""Tests for the shared logging module."""

import json
import logging
import os
import unittest
from unittest.mock import patch

from logger import JsonFormatter, get_logger


class TestJsonFormatter(unittest.TestCase):
    """Tests for JsonFormatter."""

    def setUp(self):
        self.formatter = JsonFormatter()

    def _make_record(self, msg="test message", level=logging.INFO, **extras):
        record = logging.LogRecord(
            name="test",
            level=level,
            pathname="test.py",
            lineno=1,
            msg=msg,
            args=(),
            exc_info=None,
        )
        for k, v in extras.items():
            setattr(record, k, v)
        return record

    def test_basic_fields(self):
        record = self._make_record("hello world")
        output = json.loads(self.formatter.format(record))

        self.assertEqual(output["message"], "hello world")
        self.assertEqual(output["level"], "INFO")
        self.assertEqual(output["logger"], "test")
        self.assertIn("timestamp", output)

    def test_timestamp_is_iso_utc(self):
        record = self._make_record()
        output = json.loads(self.formatter.format(record))
        # ISO 8601 with timezone offset
        self.assertIn("+00:00", output["timestamp"])

    def test_context_fields_included_when_set(self):
        record = self._make_record(
            request_id="req-123",
            user_id="user-456",
            http_method="POST",
            path="/expenses",
        )
        output = json.loads(self.formatter.format(record))

        self.assertEqual(output["request_id"], "req-123")
        self.assertEqual(output["user_id"], "user-456")
        self.assertEqual(output["http_method"], "POST")
        self.assertEqual(output["path"], "/expenses")

    def test_context_fields_omitted_when_absent(self):
        record = self._make_record()
        output = json.loads(self.formatter.format(record))

        for field in ("request_id", "user_id", "http_method", "path"):
            self.assertNotIn(field, output)

    def test_exception_included(self):
        try:
            raise ValueError("boom")
        except ValueError:
            import sys
            exc_info = sys.exc_info()

        record = self._make_record()
        record.exc_info = exc_info
        output = json.loads(self.formatter.format(record))

        self.assertIn("exception", output)
        self.assertIn("ValueError: boom", output["exception"])

    def test_output_is_valid_json_string(self):
        record = self._make_record("msg with special chars: \"quotes\" & <angle>")
        raw = self.formatter.format(record)
        parsed = json.loads(raw)
        self.assertIsInstance(parsed, dict)


class TestGetLogger(unittest.TestCase):
    """Tests for get_logger helper."""

    def test_returns_logger_with_json_handler(self):
        lg = get_logger("test_json_handler")
        self.assertTrue(len(lg.handlers) > 0)
        self.assertEqual(type(lg.handlers[0].formatter).__name__, "JsonFormatter")

    def test_respects_log_level_env(self):
        with patch.dict(os.environ, {"LOG_LEVEL": "DEBUG"}):
            # Re-import to pick up new env value
            import importlib
            import logger as logger_mod
            importlib.reload(logger_mod)
            lg = logger_mod.get_logger("test_debug_level")
            self.assertEqual(lg.level, logging.DEBUG)

    def test_no_duplicate_handlers_on_repeated_calls(self):
        name = "test_no_dup"
        lg1 = get_logger(name)
        handler_count = len(lg1.handlers)
        lg2 = get_logger(name)
        self.assertEqual(len(lg2.handlers), handler_count)

    def test_propagate_is_false(self):
        logger = get_logger("test_propagate")
        self.assertFalse(logger.propagate)


if __name__ == "__main__":
    unittest.main()
