#!/usr/bin/env python3
"""Security scan: detect PII and secrets in state files."""
import json
import sys
import os
import re
import glob


# Patterns for detecting sensitive information
PATTERNS = {
    'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
    'github_token': re.compile(r'\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b'),
    'openai_key': re.compile(r'\bsk-[A-Za-z0-9]{48,}\b'),
    'api_key': re.compile(r'\b(api[_-]?key|apikey)["\']?\s*[:=]\s*["\']?[A-Za-z0-9_-]{20,}', re.IGNORECASE),
    'aws_key': re.compile(r'\bAKIA[0-9A-Z]{16}\b'),
    'private_key': re.compile(r'-----BEGIN (RSA |EC )?PRIVATE KEY-----'),
    'ssn': re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
    'credit_card': re.compile(r'(?<![.\d])\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}(?![.\d])'),
    'jwt': re.compile(r'\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b'),
    'password': re.compile(r'\b(password|passwd|pwd)["\']?\s*[:=]\s*["\']?[^\s"\']{8,}', re.IGNORECASE),
    'bearer_token': re.compile(r'\bBearer\s+[A-Za-z0-9\-._~+/]+=*', re.IGNORECASE)
}


def scan_text(text, filename):
    """
    Scan text for PII and sensitive patterns.

    Args:
        text: text content to scan
        filename: filename for reporting

    Returns:
        List of findings (dicts with type, match, location)
    """
    findings = []

    for pattern_name, pattern in PATTERNS.items():
        matches = pattern.finditer(text)
        for match in matches:
            # Get line number
            line_num = text[:match.start()].count('\n') + 1

            findings.append({
                'type': pattern_name,
                'match': match.group(0),
                'file': filename,
                'line': line_num
            })

    return findings


def scan_json_values(obj, path='', filename=''):
    """
    Recursively scan JSON object values for sensitive data.

    Args:
        obj: JSON object (dict, list, or primitive)
        path: current path in object (for reporting)
        filename: filename for reporting

    Returns:
        List of findings
    """
    findings = []

    if isinstance(obj, dict):
        for key, value in obj.items():
            new_path = f"{path}.{key}" if path else key
            findings.extend(scan_json_values(value, new_path, filename))

    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            new_path = f"{path}[{i}]"
            findings.extend(scan_json_values(item, new_path, filename))

    elif isinstance(obj, str):
        # Scan string values
        for pattern_name, pattern in PATTERNS.items():
            if pattern.search(obj):
                findings.append({
                    'type': pattern_name,
                    'match': obj[:100],  # First 100 chars
                    'file': filename,
                    'path': path
                })

    return findings


def scan_file(filepath):
    """
    Scan a file for PII and sensitive data.

    Args:
        filepath: path to file

    Returns:
        List of findings
    """
    findings = []
    filename = os.path.basename(filepath)

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # First, scan raw text
        findings.extend(scan_text(content, filename))

        # If it's JSON, also scan structured values
        if filepath.endswith('.json'):
            try:
                data = json.loads(content)
                findings.extend(scan_json_values(data, '', filename))
            except json.JSONDecodeError:
                # Not valid JSON, text scan is sufficient
                pass

    except UnicodeDecodeError:
        # Skip binary files
        pass
    except Exception as e:
        print(f"Error scanning {filepath}: {e}", file=sys.stderr)

    return findings


def scan_directory(directory):
    """
    Recursively scan directory for PII.

    Args:
        directory: path to directory

    Returns:
        List of all findings
    """
    all_findings = []

    # Scan all .json files
    json_pattern = os.path.join(directory, '**', '*.json')
    json_files = glob.glob(json_pattern, recursive=True)

    for filepath in json_files:
        findings = scan_file(filepath)
        all_findings.extend(findings)

    # Also scan common config files
    config_patterns = ['**/.env', '**/*.conf', '**/*.config', '**/*.yml', '**/*.yaml']
    for pattern in config_patterns:
        full_pattern = os.path.join(directory, pattern)
        files = glob.glob(full_pattern, recursive=True)
        for filepath in files:
            findings = scan_file(filepath)
            all_findings.extend(findings)

    return all_findings


def main():
    """Main entry point: scan state directory for PII."""
    state_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'state')

    if len(sys.argv) > 1:
        state_dir = sys.argv[1]

    if not os.path.isdir(state_dir):
        print(f"Error: Directory not found: {state_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning {state_dir} for PII and sensitive data...")

    findings = scan_directory(state_dir)

    if not findings:
        print("\nScan complete: No PII or sensitive data detected.")
        sys.exit(0)
    else:
        print(f"\nWARNING: Found {len(findings)} potential security issues:")
        print()

        # Group by type
        by_type = {}
        for finding in findings:
            finding_type = finding['type']
            if finding_type not in by_type:
                by_type[finding_type] = []
            by_type[finding_type].append(finding)

        # Report by type
        for finding_type, type_findings in by_type.items():
            print(f"{finding_type.upper()}: {len(type_findings)} occurrence(s)")
            for finding in type_findings[:5]:  # Show first 5 of each type
                location = finding.get('file', 'unknown')
                if 'line' in finding:
                    location += f":{finding['line']}"
                elif 'path' in finding:
                    location += f" at {finding['path']}"

                match_preview = finding['match'][:50]
                if len(finding['match']) > 50:
                    match_preview += '...'

                print(f"  - {location}: {match_preview}")

            if len(type_findings) > 5:
                print(f"  ... and {len(type_findings) - 5} more")
            print()

        print("RECOMMENDATION: Review and remove sensitive data before committing.")
        sys.exit(1)


if __name__ == '__main__':
    main()
