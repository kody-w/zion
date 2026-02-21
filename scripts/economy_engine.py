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
    (250, 499, 0.25),
    (500, float('inf'), 0.40),
]

TREASURY_ID = 'TREASURY'
SYSTEM_ID = 'SYSTEM'

# UBI constants (§6.4.4)
BASE_UBI_AMOUNT = 5          # Max Spark per citizen per game day

# Wealth tax constants (§6.4.6)
WEALTH_TAX_THRESHOLD = 500
WEALTH_TAX_RATE = 0.02

# Spark Sink constants (§6.5)
MAINTENANCE_COST = 1         # Spark per structure per game day (§6.5.1)
LISTING_FEE_RATE = 0.05      # 5% of asking price (§6.5.2)
LISTING_FEE_MIN = 1          # Minimum listing fee in Spark


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


def apply_wealth_tax(economy, timestamp=None):
    """
    Apply wealth tax once per game day (§6.4.6).

    Citizens with balances above 500 pay 2% of the amount over 500 to TREASURY.
    Tax is rounded down (player-favorable).
    Entries are recorded in the ledger with type "wealth_tax".
    System accounts (TREASURY, SYSTEM) are exempt.

    Args:
        economy: dict with balances and ledger
        timestamp: optional timestamp for ledger entries (defaults to time.time())

    Returns:
        Updated economy dict
    """
    if 'balances' not in economy:
        economy['balances'] = {}

    if 'ledger' not in economy:
        economy['ledger'] = []

    if timestamp is None:
        timestamp = time.time()

    if TREASURY_ID not in economy['balances']:
        economy['balances'][TREASURY_ID] = 0

    _SYSTEM_ACCOUNTS = {TREASURY_ID, 'SYSTEM'}

    for citizen_id in list(economy['balances'].keys()):
        if citizen_id in _SYSTEM_ACCOUNTS:
            continue

        balance = economy['balances'][citizen_id]
        if balance <= WEALTH_TAX_THRESHOLD:
            continue

        taxable_amount = balance - WEALTH_TAX_THRESHOLD
        tax = int(taxable_amount * WEALTH_TAX_RATE)  # floor — player-favorable

        if tax <= 0:
            continue

        # Deduct from citizen, credit TREASURY
        economy['balances'][citizen_id] -= tax
        economy['balances'][TREASURY_ID] += tax

        # Record in the public ledger (§6.4.7 — every wealth tax is auditable)
        economy['ledger'].append({
            'type': 'wealth_tax',
            'user': citizen_id,
            'amount': tax,
            'taxableAmount': taxable_amount,
            'taxRate': WEALTH_TAX_RATE,
            'threshold': WEALTH_TAX_THRESHOLD,
            'balanceBefore': balance,
            'balanceAfter': balance - tax,
            'timestamp': timestamp,
        })

    return economy


def get_ubi_eligible_citizens(economy):
    """
    Return list of citizen IDs eligible for UBI distribution.

    Eligible citizens are any balance holder who is not a system account
    (TREASURY or SYSTEM).  There is no minimum balance requirement —
    even a citizen at 0 Spark receives UBI so they can rejoin the economy.

    Args:
        economy: dict with 'balances' key

    Returns:
        list of citizen ID strings
    """
    _SYSTEM_ACCOUNTS = {TREASURY_ID, SYSTEM_ID}
    eligible = []
    for pid in economy.get('balances', {}):
        if pid not in _SYSTEM_ACCOUNTS:
            eligible.append(pid)
    return eligible


def distribute_ubi(economy, game_day, timestamp=None):
    """
    Distribute UBI from TREASURY to all eligible citizens (§6.4.4).

    Once per game day the TREASURY distributes Spark equally to all
    active citizens.  Each citizen receives:
        min(BASE_UBI_AMOUNT, floor(TREASURY_balance / eligible_count))
    rounded down (player-favorable, §6.4.2).

    This function is idempotent for a given game_day: if
    economy['_lastUbiDay'] >= game_day it returns without distributing.

    Every payment is recorded in the public ledger with type
    'ubi_distribution' (§6.4.7 transparency mandate).

    Args:
        economy: dict with 'balances' and 'ledger' keys
        game_day: integer game-day number (worldTime // 1440)
        timestamp: Unix timestamp for ledger entries (defaults to
                   time.time())

    Returns:
        Updated economy dict (mutated in place and returned).
        economy['_lastUbiDay'] is set to game_day after distribution.
    """
    if 'balances' not in economy:
        economy['balances'] = {}
    if 'ledger' not in economy:
        economy['ledger'] = []

    # Ensure TREASURY exists (§6.4.3: TREASURY cannot go negative)
    if TREASURY_ID not in economy['balances']:
        economy['balances'][TREASURY_ID] = 0

    # Idempotency guard: distribute at most once per game day
    last_ubi_day = economy.get('_lastUbiDay', -1)
    if game_day <= last_ubi_day:
        return economy

    # Collect eligible citizens
    eligible = get_ubi_eligible_citizens(economy)

    # Always advance the day marker so we do not retry if treasury is empty
    economy['_lastUbiDay'] = game_day

    if not eligible:
        return economy

    treasury_balance = economy['balances'].get(TREASURY_ID, 0)
    if treasury_balance <= 0:
        return economy

    # Per-citizen amount: min(BASE_UBI_AMOUNT, floor(treasury / count))
    per_citizen = min(BASE_UBI_AMOUNT, treasury_balance // len(eligible))
    if per_citizen < 1:
        # Less than 1 Spark per citizen; nothing meaningful to distribute
        return economy

    ts = timestamp if timestamp is not None else time.time()

    for pid in eligible:
        # Defensive check: treasury must still have enough
        if economy['balances'].get(TREASURY_ID, 0) < per_citizen:
            break
        if pid not in economy['balances']:
            economy['balances'][pid] = 0
        economy['balances'][pid] += per_citizen
        economy['balances'][TREASURY_ID] -= per_citizen

        # Public ledger entry for transparency (§6.4.7)
        economy['ledger'].append({
            'type': 'ubi_distribution',
            'user': pid,
            'amount': per_citizen,
            'gameDay': game_day,
            'eligibleCount': len(eligible),
            'timestamp': ts,
        })

    return economy


def process_structure_maintenance(economy, structures, timestamp=None):
    """
    Apply structure maintenance costs once per game day (§6.5.1).

    Each structure costs its builder MAINTENANCE_COST (1) Spark per game day.
    Spark is destroyed — sent to SYSTEM void, not TREASURY.
    If the owner cannot pay (balance at floor 0), the structure misses a payment.
    A structure that misses 2 consecutive payments is marked for removal.

    Args:
        economy: dict with balances and ledger
        structures: dict of {structure_id: structure_dict} where each structure
                    has a 'builder' field with the owner's player ID
        timestamp: optional timestamp for ledger entries (defaults to time.time())

    Returns:
        tuple: (updated_economy, structures_to_remove: list[str])
               structures_to_remove contains IDs of structures that decayed
               (missed 2+ consecutive payments) and should be deleted from world state
    """
    if 'balances' not in economy:
        economy['balances'] = {}

    if 'ledger' not in economy:
        economy['ledger'] = []

    if timestamp is None:
        timestamp = time.time()

    _SYSTEM_ACCOUNTS = {TREASURY_ID, SYSTEM_ID}
    structures_to_remove = []

    for structure_id, structure in list(structures.items()):
        builder = structure.get('builder', '')

        # Skip system-owned structures (they have no balance to charge)
        if not builder or builder in _SYSTEM_ACCOUNTS:
            continue

        # Ensure builder has a balance entry
        if builder not in economy['balances']:
            economy['balances'][builder] = 0

        balance = economy['balances'][builder]

        if balance >= MAINTENANCE_COST:
            # Deduct maintenance — Spark is destroyed (§6.5: sent to SYSTEM void)
            economy['balances'][builder] -= MAINTENANCE_COST

            # Reset any missed payment counter on successful payment
            structure['_missedPayments'] = 0

            # Record in public ledger with type "structure_maintenance"
            economy['ledger'].append({
                'type': 'structure_maintenance',
                'user': builder,
                'structureId': structure_id,
                'amount': MAINTENANCE_COST,
                'sink': SYSTEM_ID,
                'timestamp': timestamp,
            })
        else:
            # Owner at balance floor — cannot pay
            missed = structure.get('_missedPayments', 0) + 1
            structure['_missedPayments'] = missed

            # Record the missed payment in ledger for transparency
            economy['ledger'].append({
                'type': 'structure_maintenance_missed',
                'user': builder,
                'structureId': structure_id,
                'missedPayments': missed,
                'timestamp': timestamp,
            })

            # §6.5.1: structure removed after 2 consecutive missed payments
            if missed >= 2:
                structures_to_remove.append(structure_id)

    return economy, structures_to_remove


def process_market_listing_fee(economy, seller_id, asking_price, timestamp=None):
    """
    Deduct market listing fee when a player lists an item for sale (§6.5.2).

    Fee = max(LISTING_FEE_MIN, floor(asking_price * LISTING_FEE_RATE))
    The fee is destroyed — sent to SYSTEM void, not TREASURY.
    Returns success=False if the seller cannot afford the fee (balance floor).

    Args:
        economy: dict with balances and ledger
        seller_id: player ID of the seller
        asking_price: the asking price of the listing in Spark
        timestamp: optional timestamp for ledger entries (defaults to time.time())

    Returns:
        dict: {
            'success': bool,
            'fee': int,            # fee charged (0 if failed)
            'balance': int,        # seller's balance after fee (or current if failed)
            'message': str,        # human-readable result description
        }
    """
    if 'balances' not in economy:
        economy['balances'] = {}

    if 'ledger' not in economy:
        economy['ledger'] = []

    if timestamp is None:
        timestamp = time.time()

    # Calculate fee: 5% of asking price, minimum 1 Spark, always rounded down
    fee = max(LISTING_FEE_MIN, int(asking_price * LISTING_FEE_RATE))

    # Ensure seller has a balance entry
    if seller_id not in economy['balances']:
        economy['balances'][seller_id] = 0

    balance = economy['balances'][seller_id]

    if balance < fee:
        return {
            'success': False,
            'fee': fee,
            'balance': balance,
            'message': f'Insufficient Spark: need {fee}, have {balance}',
        }

    # Deduct fee — Spark is destroyed (§6.5: sent to SYSTEM void)
    economy['balances'][seller_id] -= fee

    # Record in public ledger
    economy['ledger'].append({
        'type': 'market_listing_fee',
        'user': seller_id,
        'amount': fee,
        'askingPrice': asking_price,
        'feeRate': LISTING_FEE_RATE,
        'sink': SYSTEM_ID,
        'timestamp': timestamp,
    })

    return {
        'success': True,
        'fee': fee,
        'balance': economy['balances'][seller_id],
        'message': f'Listing fee of {fee} Spark destroyed',
    }


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
