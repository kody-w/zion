#!/usr/bin/env python3
"""Tests for validate_message.py"""
import unittest
import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from validate_message import validate_message, MESSAGE_TYPES, PLATFORMS, CONSENT_REQUIRED


class TestValidateMessage(unittest.TestCase):
    """Test suite for message validation."""

    def setUp(self):
        """Set up test fixtures."""
        self.valid_message = {
            'v': 1,
            'id': 'msg_001',
            'ts': '2026-02-12T12:00:00Z',
            'seq': 0,
            'from': 'user_123',
            'type': 'say',
            'platform': 'desktop',
            'position': {
                'x': 10.5,
                'y': 0,
                'z': -5.2,
                'zone': 'nexus'
            },
            'payload': {
                'text': 'Hello world'
            }
        }

    def test_valid_message_passes(self):
        """Valid message should pass validation."""
        valid, errors = validate_message(self.valid_message)
        self.assertTrue(valid, f"Expected valid, got errors: {errors}")
        self.assertEqual(len(errors), 0)

    def test_missing_version_field(self):
        """Missing version field should be rejected."""
        msg = self.valid_message.copy()
        del msg['v']
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertIn("Missing field: v", errors)

    def test_invalid_version(self):
        """Invalid version number should be rejected."""
        msg = self.valid_message.copy()
        msg['v'] = 2
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertTrue(any('version' in err.lower() for err in errors))

    def test_missing_from_field(self):
        """Missing 'from' field should be rejected."""
        msg = self.valid_message.copy()
        del msg['from']
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertIn("Missing field: from", errors)

    def test_empty_from_field(self):
        """Empty 'from' field should be rejected."""
        msg = self.valid_message.copy()
        msg['from'] = ''
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertTrue(any('from' in err for err in errors))

    def test_missing_type_field(self):
        """Missing 'type' field should be rejected."""
        msg = self.valid_message.copy()
        del msg['type']
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertIn("Missing field: type", errors)

    def test_invalid_message_type(self):
        """Invalid message type should be rejected."""
        msg = self.valid_message.copy()
        msg['type'] = 'invalid_type'
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertTrue(any('Invalid message type' in err for err in errors))

    def test_invalid_platform(self):
        """Invalid platform should be rejected."""
        msg = self.valid_message.copy()
        msg['platform'] = 'invalid_platform'
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertTrue(any('Invalid platform' in err for err in errors))

    def test_valid_platforms(self):
        """All valid platforms should pass."""
        for platform in PLATFORMS:
            msg = self.valid_message.copy()
            msg['platform'] = platform
            valid, errors = validate_message(msg)
            self.assertTrue(valid, f"Platform {platform} should be valid, got errors: {errors}")

    def test_invalid_timestamp(self):
        """Invalid timestamp should be rejected."""
        msg = self.valid_message.copy()
        msg['ts'] = 'not-a-timestamp'
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertTrue(any('timestamp' in err.lower() for err in errors))

    def test_negative_sequence(self):
        """Negative sequence number should be rejected."""
        msg = self.valid_message.copy()
        msg['seq'] = -1
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertTrue(any('seq' in err for err in errors))

    def test_missing_position(self):
        """Missing position should be rejected."""
        msg = self.valid_message.copy()
        del msg['position']
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertIn("Missing field: position", errors)

    def test_invalid_position_structure(self):
        """Position must be a dictionary."""
        msg = self.valid_message.copy()
        msg['position'] = "not a dict"
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertTrue(any('position' in err for err in errors))

    def test_missing_position_coordinates(self):
        """Position must have x, y, z coordinates."""
        msg = self.valid_message.copy()
        msg['position'] = {'zone': 'nexus'}
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertTrue(any('position.x' in err for err in errors))
        self.assertTrue(any('position.y' in err for err in errors))
        self.assertTrue(any('position.z' in err for err in errors))

    def test_missing_payload(self):
        """Missing payload should be rejected."""
        msg = self.valid_message.copy()
        del msg['payload']
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertIn("Missing field: payload", errors)

    def test_consent_required_types(self):
        """Consent-required types should be identified."""
        for msg_type in CONSENT_REQUIRED:
            self.assertIn(msg_type, MESSAGE_TYPES, f"{msg_type} should be in MESSAGE_TYPES")

    def test_whisper_requires_to_field(self):
        """Whisper message requires 'to' field in payload."""
        msg = self.valid_message.copy()
        msg['type'] = 'whisper'
        msg['payload'] = {'text': 'secret'}
        valid, errors = validate_message(msg)
        self.assertFalse(valid)
        self.assertTrue(any('to' in err for err in errors))

    def test_whisper_with_to_field_passes(self):
        """Whisper message with 'to' field should pass."""
        msg = self.valid_message.copy()
        msg['type'] = 'whisper'
        msg['payload'] = {'text': 'secret', 'to': 'user_456'}
        valid, errors = validate_message(msg)
        self.assertTrue(valid, f"Expected valid, got errors: {errors}")

    def test_not_a_dict(self):
        """Non-dict message should be rejected."""
        valid, errors = validate_message("not a dict")
        self.assertFalse(valid)
        self.assertIn("Message must be a dictionary", errors)

    def test_all_message_types_valid(self):
        """All defined message types should be valid."""
        for msg_type in MESSAGE_TYPES:
            msg = self.valid_message.copy()
            msg['type'] = msg_type

            # Add 'to' field for consent-required types
            if msg_type in CONSENT_REQUIRED:
                msg['payload'] = {'to': 'user_456'}

            valid, errors = validate_message(msg)
            self.assertTrue(valid, f"Message type {msg_type} should be valid, got errors: {errors}")


if __name__ == '__main__':
    unittest.main()
