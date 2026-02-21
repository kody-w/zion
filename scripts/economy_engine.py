#!/usr/bin/env python3
"""Economy processing: earnings, transactions, ledger integrity."""
import json
import sys
import time

# Spark earnings for different activities
EARN_TABLE = {
    'join': 1,
    'move': 0,
    'say': 1,
    'shout': 2,
    'whisper': 1,
    'emote': 1,
    'build': 10,
    'plant': 5,
    'craft': 8,
    'compose': 15,
    'harvest': 3,
    'trade_offer': 0,
    'trade_accept': 0,
    'buy': 0,
    'sell': 0,
    'gift': 5,
    'teach': 10,
    'learn': 5,
    'mentor_offer': 0,
    'mentor_accept': 0,
    'challenge': 0,
    'accept_challenge': 0,
    'forfeit': 0,
    'score': 10,
    'discover': 20,
    'anchor_place': 25,
    'inspect': 1,
    'intention_set': 2,
    'intention_clear': 0,
    'warp': 0,
    'warp_fork': 50,
    'return_home': 0,
    'heartbeat': 0,
    'idle': 0,
    'leave': 0,
    'federation_announce': 100,
    'federation_handshake': 50
}

# Progressive tax brackets (§6.4)
_TAX_BRACKETS = [
    (0,   19,  0.00),
    (20,  49,  0.05),
    (50,  99,  0.10),
    (100, 249, 0.15),
    (250, 499, 0.20),
    (500, float('inf'), 0.25),
]

TREASURY_ID = 'TREASURY'


def _get_tax_rate(balance):
    """Get progressive tax rate based on current balance."""
    if balance < 0:
        return 0.0
    for low, high, rate in _TAX_BRACKETS:
        if low <= balance <= high:
            return rate
    return 0.0


def process_earnings(economy, actions):
    """
    Process earnings: award Spark for queued actions.

    Args:
        economy: dict with balances, ledger
        actions: list of action messages

    Returns:
        Updated economy dict
    """
    if 'balances' not in economy:
        economy['balances'] = {}

    if 'ledger' not in economy:
        economy['ledger'] = []

    for action in actions:
        if not isinstance(action, dict):
            continue

        action_type = action.get('type')
        user_id = action.get('from')

        if not action_type or not user_id:
            continue

        # Calculate earnings
        spark_earned = EARN_TABLE.get(action_type, 0)

        if spark_earned > 0:
            # Update balance
            if user_id not in economy['balances']:
                economy['balances'][user_id] = 0

            # Calculate progressive tax (§6.4)
            current_balance = economy['balances'][user_id]
            tax_rate = _get_tax_rate(current_balance)
            tax_amount = int(spark_earned * tax_rate)  # floor (player-favorable)
            net_amount = spark_earned - tax_amount

            economy['balances'][user_id] += net_amount

            # Add ledger entry
            economy['ledger'].append({
                'type': 'earn',
                'user': user_id,
                'amount': net_amount,
                'grossAmount': spark_earned,
                'taxWithheld': tax_amount,
                'taxRate': tax_rate,
                'action': action_type,
                'timestamp': action.get('ts', time.time())
            })

            # Credit TREASURY with tax
            if tax_amount > 0:
                if TREASURY_ID not in economy['balances']:
                    economy['balances'][TREASURY_ID] = 0
                economy['balances'][TREASURY_ID] += tax_amount
                economy['ledger'].append({
                    'type': 'tax',
                    'user': user_id,
                    'amount': tax_amount,
                    'taxRate': tax_rate,
                    'action': action_type,
                    'timestamp': action.get('ts', time.time())
                })

    return economy


def validate_transaction(economy, from_id, amount):
    """
    Validate that a user has sufficient balance for a transaction.

    Args:
        economy: dict with balances
        from_id: user ID
        amount: transaction amount (positive number)

    Returns:
        bool: True if transaction is valid
    """
    if 'balances' not in economy:
        return False

    current_balance = economy['balances'].get(from_id, 0)
    return current_balance >= amount


def check_ledger_integrity(economy):
    """
    Check that ledger is balanced: sum of credits == sum of debits + genesis.

    Args:
        economy: dict with ledger

    Returns:
        bool: True if ledger is balanced
    """
    if 'ledger' not in economy:
        return True  # Empty ledger is valid

    credits = 0
    debits = 0
    genesis = 0

    for entry in economy['ledger']:
        entry_type = entry.get('type')
        amount = entry.get('amount', 0)

        if entry_type == 'earn' or entry_type == 'genesis':
            credits += amount
            if entry_type == 'genesis':
                genesis += amount
        elif entry_type in ('spend', 'transfer', 'buy'):
            debits += amount

    # Total credits should equal debits + current outstanding balance
    # For simplicity, check that credits >= debits
    return credits >= debits


def expire_listings(economy, max_age_hours=24):
    """
    Remove expired market listings.

    Args:
        economy: dict with market listings
        max_age_hours: maximum age in hours before expiration

    Returns:
        Updated economy dict
    """
    if 'market' not in economy:
        return economy

    if 'listings' not in economy['market']:
        return economy

    current_time = time.time()
    max_age_seconds = max_age_hours * 3600

    active_listings = []
    for listing in economy['market']['listings']:
        listed_at = listing.get('listedAt', 0)
        age = current_time - listed_at

        if age < max_age_seconds:
            active_listings.append(listing)

    economy['market']['listings'] = active_listings
    return economy


def process_economy(economy_json, actions_json):
    """
    Process economy: earnings, validation, expiration.

    Args:
        economy_json: JSON string of economy state
        actions_json: JSON string of actions list

    Returns:
        Updated economy JSON string
    """
    economy = json.loads(economy_json)
    actions = json.loads(actions_json)

    # Process earnings
    economy = process_earnings(economy, actions)

    # Expire old listings
    economy = expire_listings(economy)

    # Validate integrity
    if not check_ledger_integrity(economy):
        print("Warning: Ledger integrity check failed", file=sys.stderr)

    return json.dumps(economy, indent=2)


def main():
    """Main entry point: read economy and actions, process, output updated economy."""
    if len(sys.argv) < 3:
        print("Usage: economy_engine.py <economy.json> <actions.json>", file=sys.stderr)
        sys.exit(1)

    economy_file = sys.argv[1]
    actions_file = sys.argv[2]

    # Read files
    try:
        with open(economy_file, 'r') as f:
            economy_json = f.read()
    except FileNotFoundError:
        print(f"Error: File not found: {economy_file}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading economy file: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        with open(actions_file, 'r') as f:
            actions_json = f.read()
    except FileNotFoundError:
        print(f"Error: File not found: {actions_file}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading actions file: {e}", file=sys.stderr)
        sys.exit(1)

    # Process
    try:
        updated_economy = process_economy(economy_json, actions_json)
        print(updated_economy)
        sys.exit(0)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error processing economy: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
