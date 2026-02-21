#!/usr/bin/env python3
"""
json2yml — Universal JSON-to-YAML converter for the ZION ecosystem.

Stdlib only. No PyYAML. Handles all JSON types with proper YAML quoting.

Usage:
    # stdin/stdout
    echo '{"name": "zion"}' | python3 json2yml.py

    # file to stdout
    python3 json2yml.py state/federation.json

    # file to file
    python3 json2yml.py state/federation.json -o state/federation.yml

    # as a module
    from json2yml import json_to_yaml
    print(json_to_yaml({"name": "zion"}))
"""
import json
import sys
import re
import os

# Words that YAML parsers interpret as booleans or null (case-insensitive)
_YAML_BOOL_NULL = frozenset({
    'true', 'false', 'yes', 'no', 'on', 'off',
    'null', '~',
})

# Regex: looks like a number (int or float, possibly negative, possibly scientific)
_LOOKS_NUMERIC = re.compile(
    r'^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$'
)

# Regex: looks like a date or timestamp (YYYY-MM-DD with optional time)
_LOOKS_DATE = re.compile(
    r'^\d{4}-\d{2}-\d{2}'
)

# Characters that, when starting a string, require quoting
_SPECIAL_START_CHARS = set('#@&*|>!%[{')


def _needs_quoting(s):
    """Determine if a string value needs single-quoting in YAML."""
    if not s:
        return True  # empty string
    if s.lower() in _YAML_BOOL_NULL:
        return True
    if _LOOKS_NUMERIC.match(s):
        return True
    if _LOOKS_DATE.match(s):
        return True
    if s[0] in _SPECIAL_START_CHARS:
        return True
    if ': ' in s or s.endswith(':'):
        return True
    if s[0] in ('"', "'", ' ', ','):
        return True
    if s[-1] == ' ':
        return True
    if "'" in s:
        return True
    return False


def _quote(s):
    """Single-quote a string, escaping internal single quotes by doubling."""
    return "'" + s.replace("'", "''") + "'"


def _needs_key_quoting(key):
    """Determine if a dict key needs quoting."""
    if not key:
        return True
    if key.lower() in _YAML_BOOL_NULL:
        return True
    if _LOOKS_NUMERIC.match(key):
        return True
    if _LOOKS_DATE.match(key):
        return True
    if key[0] in _SPECIAL_START_CHARS:
        return True
    if ': ' in key or key.endswith(':'):
        return True
    if key[0] in ('"', "'", ' ', ','):
        return True
    if key[-1] == ' ':
        return True
    return False


def _format_key(key):
    """Format a dict key, quoting if necessary."""
    if _needs_key_quoting(key):
        return _quote(key)
    return key


def _format_scalar(value):
    """Format a scalar value (non-dict, non-list) as a YAML string."""
    if value is None:
        return 'null'
    if value is True:
        return 'true'
    if value is False:
        return 'false'
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return str(value)
    # It's a string
    if '\n' in value:
        return None  # signal: use block scalar
    if _needs_quoting(value):
        return _quote(value)
    return value


def _render_block_scalar(s, indent):
    """Render a multi-line string as a YAML block scalar."""
    prefix = ' ' * indent
    if s.endswith('\n'):
        header = '|'
        body = s[:-1]  # strip trailing newline (the | indicator preserves it)
    else:
        header = '|-'
        body = s
    lines = body.split('\n')
    result = header + '\n'
    for line in lines:
        if line:
            result += prefix + line + '\n'
        else:
            result += '\n'
    return result


def _render(value, indent=0, inline_first=False):
    """
    Render a JSON value as YAML lines.

    Args:
        value: The JSON value to render.
        indent: Current indentation level (number of spaces).
        inline_first: If True, the first line is placed inline (for list-of-dict items).

    Returns:
        A string of YAML content (without leading indent on the first line if inline_first).
    """
    prefix = ' ' * indent

    # Dict
    if isinstance(value, dict):
        if not value:
            return '{}\n' if inline_first else prefix + '{}\n'
        lines = []
        first = True
        for key, val in value.items():
            formatted_key = _format_key(str(key))
            if isinstance(val, dict):
                if not val:
                    line_prefix = '' if (first and inline_first) else prefix
                    lines.append(line_prefix + formatted_key + ': {}\n')
                else:
                    line_prefix = '' if (first and inline_first) else prefix
                    lines.append(line_prefix + formatted_key + ':\n')
                    lines.append(_render(val, indent + 2))
            elif isinstance(val, list):
                if not val:
                    line_prefix = '' if (first and inline_first) else prefix
                    lines.append(line_prefix + formatted_key + ': []\n')
                else:
                    line_prefix = '' if (first and inline_first) else prefix
                    lines.append(line_prefix + formatted_key + ':\n')
                    lines.append(_render(val, indent + 2))
            elif isinstance(val, str) and '\n' in val:
                line_prefix = '' if (first and inline_first) else prefix
                lines.append(line_prefix + formatted_key + ': ' + _render_block_scalar(val, indent + 2))
            else:
                scalar = _format_scalar(val)
                line_prefix = '' if (first and inline_first) else prefix
                lines.append(line_prefix + formatted_key + ': ' + scalar + '\n')
            first = False
        return ''.join(lines)

    # List
    if isinstance(value, list):
        if not value:
            return '[]\n' if inline_first else prefix + '[]\n'
        lines = []
        first = True
        for item in value:
            line_prefix = '' if (first and inline_first) else prefix
            if isinstance(item, dict):
                if not item:
                    lines.append(line_prefix + '- {}\n')
                else:
                    # First key-value pair goes on the same line as the dash
                    lines.append(line_prefix + '- ' + _render(item, indent + 2, inline_first=True))
                    # _render with inline_first handles putting first key on same line
            elif isinstance(item, list):
                if not item:
                    lines.append(line_prefix + '- []\n')
                else:
                    lines.append(line_prefix + '- ' + _render(item, indent + 2, inline_first=True))
            elif isinstance(item, str) and '\n' in item:
                lines.append(line_prefix + '- ' + _render_block_scalar(item, indent + 2))
            else:
                scalar = _format_scalar(item)
                lines.append(line_prefix + '- ' + scalar + '\n')
            first = False
        return ''.join(lines)

    # Scalar (top-level)
    if isinstance(value, str) and '\n' in value:
        return _render_block_scalar(value, indent)

    scalar = _format_scalar(value)
    if inline_first:
        return scalar + '\n'
    return prefix + scalar + '\n'


def json_to_yaml(data):
    """
    Convert a Python object (parsed JSON) to a YAML string.

    Args:
        data: Any JSON-compatible Python object.

    Returns:
        A YAML-formatted string.
    """
    return _render(data)


def convert_file(input_path, output_path=None):
    """
    Read a JSON file and convert to YAML.

    Args:
        input_path: Path to the JSON file.
        output_path: Optional path to write YAML output. If None, returns string.

    Returns:
        YAML string if output_path is None, else None (writes to file).
    """
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    result = json_to_yaml(data)
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result)
        return None
    return result


def main():
    """CLI entry point."""
    import argparse
    parser = argparse.ArgumentParser(
        description='Convert JSON to YAML (stdlib only, ZION ecosystem)'
    )
    parser.add_argument('input', nargs='?', help='Input JSON file (default: stdin)')
    parser.add_argument('-o', '--output', help='Output YAML file (default: stdout)')
    args = parser.parse_args()

    try:
        if args.input:
            if args.output:
                convert_file(args.input, args.output)
            else:
                sys.stdout.write(convert_file(args.input))
        else:
            raw = sys.stdin.read()
            data = json.loads(raw)
            sys.stdout.write(json_to_yaml(data))
    except (json.JSONDecodeError, ValueError) as e:
        sys.stderr.write(f"Error: {e}\n")
        sys.exit(1)
    except FileNotFoundError as e:
        sys.stderr.write(f"Error: {e}\n")
        sys.exit(1)


if __name__ == '__main__':
    main()
