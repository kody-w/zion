#!/usr/bin/env python3
"""Validate ZION protocol messages."""
import json
import sys
import re
from datetime import datetime

MESSAGE_TYPES = {
    'join', 'leave', 'heartbeat', 'idle', 'move', 'warp',
    'say', 'shout', 'whisper', 'emote',
    'build', 'plant', 'craft', 'compose', 'harvest',
    'trade_offer', 'trade_accept', 'trade_decline', 'buy', 'sell', 'gift',
    'teach', 'learn', 'mentor_offer', 'mentor_accept',
    'challenge', 'accept_challenge', 'forfeit', 'score',
    'discover', 'anchor_place', 'inspect',
    'intention_set', 'intention_clear',
    'warp_fork', 'return_home', 'federation_announce', 'federation_handshake'
}

PLATFORMS = {'desktop', 'phone', 'vr', 'ar', 'api'}

CONSENT_REQUIRED = {'whisper', 'challenge', 'trade_offer', 'mentor_offer'}


def validate_message(msg):
    """
    Validate a ZION protocol message.

    Returns:
        (valid: bool, errors: list[str])
    """
    errors = []

    # Check if msg is a dict
    if not isinstance(msg, dict):
        return False, ["Message must be a dictionary"]

    # Check version
    if 'v' not in msg:
        errors.append("Missing field: v")
    elif msg['v'] != 1:
        errors.append(f"Invalid version: {msg['v']} (expected 1)")

    # Check id
    if 'id' not in msg:
        errors.append("Missing field: id")
    elif not isinstance(msg['id'], str) or not msg['id'].strip():
        errors.append("Field 'id' must be a non-empty string")

    # Check timestamp
    if 'ts' not in msg:
        errors.append("Missing field: ts")
    elif not isinstance(msg['ts'], str):
        errors.append("Field 'ts' must be a string")
    else:
        try:
            datetime.fromisoformat(msg['ts'].replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            errors.append(f"Invalid ISO-8601 timestamp: {msg['ts']}")

    # Check sequence
    if 'seq' not in msg:
        errors.append("Missing field: seq")
    elif not isinstance(msg['seq'], int):
        errors.append("Field 'seq' must be an integer")
    elif msg['seq'] < 0:
        errors.append(f"Field 'seq' must be non-negative (got {msg['seq']})")

    # Check from
    if 'from' not in msg:
        errors.append("Missing field: from")
    elif not isinstance(msg['from'], str) or not msg['from'].strip():
        errors.append("Field 'from' must be a non-empty string")

    # Check type
    if 'type' not in msg:
        errors.append("Missing field: type")
    elif msg['type'] not in MESSAGE_TYPES:
        errors.append(f"Invalid message type: {msg['type']}")

    # Check platform
    if 'platform' not in msg:
        errors.append("Missing field: platform")
    elif msg['platform'] not in PLATFORMS:
        errors.append(f"Invalid platform: {msg['platform']} (must be one of {PLATFORMS})")

    # Check position
    if 'position' not in msg:
        errors.append("Missing field: position")
    elif not isinstance(msg['position'], dict):
        errors.append("Field 'position' must be a dictionary")
    else:
        pos = msg['position']
        if 'x' not in pos:
            errors.append("Missing position.x")
        elif not isinstance(pos['x'], (int, float)):
            errors.append("position.x must be a number")

        if 'y' not in pos:
            errors.append("Missing position.y")
        elif not isinstance(pos['y'], (int, float)):
            errors.append("position.y must be a number")

        if 'z' not in pos:
            errors.append("Missing position.z")
        elif not isinstance(pos['z'], (int, float)):
            errors.append("position.z must be a number")

        if 'zone' not in pos:
            errors.append("Missing position.zone")
        elif not isinstance(pos['zone'], str) or not pos['zone'].strip():
            errors.append("position.zone must be a non-empty string")

    # Check payload
    if 'payload' not in msg:
        errors.append("Missing field: payload")
    elif not isinstance(msg['payload'], dict):
        errors.append("Field 'payload' must be a dictionary")

    # Check consent requirements
    if 'type' in msg and msg['type'] in CONSENT_REQUIRED:
        if 'payload' in msg and isinstance(msg['payload'], dict):
            if 'to' not in msg['payload']:
                errors.append(f"Message type '{msg['type']}' requires 'to' field in payload")

    valid = len(errors) == 0
    return valid, errors


def main():
    """Main entry point: read JSON from stdin or file, validate, and report."""
    # Read input
    input_data = None
    if len(sys.argv) > 1:
        # Read from file
        try:
            with open(sys.argv[1], 'r') as f:
                input_data = f.read()
        except FileNotFoundError:
            print(f"Error: File not found: {sys.argv[1]}", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"Error reading file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        # Read from stdin
        input_data = sys.stdin.read()

    # Parse JSON
    try:
        msg = json.loads(input_data)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    # Validate
    valid, errors = validate_message(msg)

    # Report
    if valid:
        print("VALID")
        print(json.dumps(msg, indent=2))
        sys.exit(0)
    else:
        print("INVALID")
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
