#!/usr/bin/env python3
"""Anchor safety validation: check GPS coordinates for safety."""
import json
import sys
import math


def is_valid_latitude(lat):
    """Check if latitude is in valid range."""
    return -90 <= lat <= 90


def is_valid_longitude(lon):
    """Check if longitude is in valid range."""
    return -180 <= lon <= 180


def is_null_island(lat, lon, threshold=0.1):
    """Check if coordinates are at or near (0, 0) - Null Island."""
    return abs(lat) < threshold and abs(lon) < threshold


def is_in_ocean(lat, lon):
    """
    Basic heuristic to detect if coordinates are in major ocean areas.

    This is a simplified check. Real implementation would use coastline data.
    """
    # Pacific Ocean (rough bounds)
    if -60 < lat < 60 and 120 < lon < -80:
        # Check if in known land areas (very rough)
        if not (10 < lat < 50 and 120 < lon < 145):  # Not Japan/Philippines area
            return True

    # Atlantic Ocean (rough bounds)
    if -60 < lat < 60 and -60 < lon < 20:
        # Check if not in Americas or Europe/Africa
        if not ((-60 < lat < 15 and -80 < lon < -35) or  # South America
                (25 < lat < 50 and -10 < lon < 40)):  # Europe/Africa
            return True

    # Southern Ocean
    if lat < -60:
        return True

    # Arctic Ocean
    if lat > 80:
        return True

    return False


def is_near_highway(lat, lon):
    """
    Basic heuristic to flag if coordinates might be near major highways.

    This is a simplified check using known highway corridors.
    Real implementation would use road network data.
    """
    # Interstate 5 (US West Coast) - approximate corridor
    if 32 < lat < 49 and -122 < lon < -117:
        return True

    # Interstate 95 (US East Coast) - approximate corridor
    if 25 < lat < 45 and -77 < lon < -71:
        return True

    # Trans-Canada Highway
    if 45 < lat < 52 and -130 < lon < -52:
        return True

    # Major European highways (E-roads) - very rough approximation
    if 40 < lat < 60 and -5 < lon < 30:
        return True

    return False


def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two coordinates using Haversine formula.

    Returns distance in kilometers.
    """
    R = 6371  # Earth's radius in kilometers

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lon / 2) ** 2)

    c = 2 * math.asin(math.sqrt(a))

    return R * c


def validate_anchor(anchor_data):
    """
    Validate anchor GPS coordinates for safety.

    Args:
        anchor_data: dict with 'latitude' and 'longitude' fields

    Returns:
        (valid: bool, warnings: list[str], errors: list[str])
    """
    errors = []
    warnings = []

    # Extract coordinates
    if 'latitude' not in anchor_data:
        errors.append("Missing field: latitude")
        return False, warnings, errors

    if 'longitude' not in anchor_data:
        errors.append("Missing field: longitude")
        return False, warnings, errors

    try:
        lat = float(anchor_data['latitude'])
        lon = float(anchor_data['longitude'])
    except (ValueError, TypeError):
        errors.append("Latitude and longitude must be numbers")
        return False, warnings, errors

    # Validate ranges
    if not is_valid_latitude(lat):
        errors.append(f"Invalid latitude: {lat} (must be between -90 and 90)")

    if not is_valid_longitude(lon):
        errors.append(f"Invalid longitude: {lon} (must be between -180 and 180)")

    if errors:
        return False, warnings, errors

    # Check for Null Island
    if is_null_island(lat, lon):
        errors.append("Coordinates are at or near (0, 0) - likely invalid or default values")

    # Check for ocean
    if is_in_ocean(lat, lon):
        warnings.append("Coordinates appear to be in ocean - verify this is intentional")

    # Check for highways
    if is_near_highway(lat, lon):
        warnings.append("Coordinates may be near major highway - ensure safe placement")

    # Check if coordinates have sufficient precision
    lat_str = str(anchor_data['latitude'])
    lon_str = str(anchor_data['longitude'])

    if '.' not in lat_str or '.' not in lon_str:
        warnings.append("Coordinates lack decimal precision - may not be accurate enough")

    # Additional checks from payload
    if 'name' in anchor_data and not anchor_data['name'].strip():
        warnings.append("Anchor name is empty")

    if 'zone' in anchor_data and not anchor_data['zone'].strip():
        warnings.append("Zone name is empty")

    valid = len(errors) == 0
    return valid, warnings, errors


def main():
    """Main entry point: read anchor data, validate, report."""
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
    else:
        # Read from stdin
        input_data = sys.stdin.read()

    # Parse JSON
    try:
        anchor_data = json.loads(input_data)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)

    # Validate
    valid, warnings, errors = validate_anchor(anchor_data)

    # Report
    if valid:
        print("VALID")
        if warnings:
            print("\nWarnings:")
            for warning in warnings:
                print(f"  - {warning}")
        print(json.dumps(anchor_data, indent=2))
        sys.exit(0)
    else:
        print("INVALID")
        if errors:
            print("\nErrors:")
            for error in errors:
                print(f"  - {error}", file=sys.stderr)
        if warnings:
            print("\nWarnings:")
            for warning in warnings:
                print(f"  - {warning}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
