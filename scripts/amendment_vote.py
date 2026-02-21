#!/usr/bin/env python3
"""Constitutional Amendment Voting System for ZION.

This module implements the amendment process defined in CONSTITUTION.md §7.5.

Protocol Message Types:
  propose_amendment:
    payload = {
      title: str,                    # Short amendment title
      description: str,              # Full amendment text / rationale
      diff_text: str,                # Diff-style text showing proposed changes
      discussion_period_days: int    # Minimum discussion period (default 7, minimum 7)
    }

  vote_amendment:
    payload = {
      amendment_id: str,             # ID of the amendment to vote on
      vote: "for" | "against",       # Voter's position
      # spark_weight is auto-set from voter's balance at time of vote
    }

  close_amendment:
    payload = {
      amendment_id: str,             # ID of the amendment being closed
      result: "approved" | "rejected",
      tally: {
        for_weight: int,
        against_weight: int,
        total_voters: int,
      }
    }

Constitutional constraints enforced (§7.5):
  - Amendments CANNOT remove player rights (§2.3)
  - Amendments CANNOT close the source code
  - Amendments CANNOT make physical movement required for core gameplay
  - Amendments CANNOT retroactively punish players for previously legal actions
  - Amendments CANNOT make the protocol distinguish between player types

Voting rules:
  - 7-day minimum discussion period (DISCUSSION_PERIOD_DAYS)
  - Each citizen votes once (deduplicated by 'from' field)
  - Weight = citizen's Spark balance at time of vote (minimum weight 1, even if 0 or negative)
  - Approval requires >50% of total weighted votes
"""
import json
import sys
import os
import uuid
from datetime import datetime, timezone, timedelta

# Minimum discussion period in days (§7.5)
DISCUSSION_PERIOD_DAYS = 7

# Valid vote values
VALID_VOTES = {'for', 'against'}

# The system user for generated close messages
SYSTEM_USER = 'ZION-GOVERNANCE'

# Forbidden patterns: (keyword_list, reason)
# If any keyword from the list appears in the combined text (title+description+diff_text),
# the amendment is rejected as unconstitutional.
# Each entry is a tuple: (list_of_trigger_phrases, human_readable_reason)
FORBIDDEN_PATTERNS = [
    # §7.5 — Cannot remove player rights (§2.3)
    (
        [
            'remove player rights',
            'remove the right',
            'revoke player rights',
            'revoke the right',
            'players may not',
            'players cannot exist',
            'players have no right',
            '- players have the right',
            '- every authenticated player',
        ],
        'Amendments cannot remove player rights (§2.3)'
    ),
    # §7.5 — Cannot close the source code
    (
        [
            'close source',
            'closed source',
            'proprietary',
            'not open source',
            'make code private',
            'code is closed',
            'source code is now proprietary',
        ],
        'Amendments cannot close the source code (§7.5)'
    ),
    # §7.5 — Cannot require physical movement for core gameplay
    (
        [
            'physical movement required',
            'require physical movement',
            'must physically move',
            'mandatory movement',
            'walking required',
            'physical activity required',
            'players must walk',
            'players must physically',
        ],
        'Amendments cannot make physical movement required for core gameplay (§7.5, §1.6)'
    ),
    # §7.5 — Cannot make protocol distinguish between player types
    (
        [
            'protocol must distinguish',
            'ai players are not',
            'human players only',
            'ai agents cannot',
            'humans only',
        ],
        'Amendments cannot make the protocol distinguish between player types (§7.5)'
    ),
    # §7.5 — Cannot retroactively punish players
    (
        [
            'retroactive punishment',
            'retroactively punish',
            'punishment for previously',
            'punish for past',
        ],
        'Amendments cannot retroactively punish players for previously legal actions (§7.5)'
    ),
]


def _utcnow_iso():
    """Return current UTC time as ISO-8601 string."""
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def _parse_iso(ts_str):
    """Parse ISO-8601 timestamp string into timezone-aware datetime."""
    return datetime.fromisoformat(ts_str.replace('Z', '+00:00'))


def _check_forbidden(text):
    """Check combined text against constitutional constraints.

    Args:
        text: Combined lowercase string of title + description + diff_text

    Returns:
        (forbidden: bool, reason: str or None)
    """
    text_lower = text.lower()
    for phrases, reason in FORBIDDEN_PATTERNS:
        for phrase in phrases:
            if phrase.lower() in text_lower:
                return True, reason
    return False, None


def _get_spark_weight(from_user, economy_state):
    """Get voting weight for a user from their Spark balance.

    Rules:
      - Weight = citizen's Spark balance (minimum 1, even if 0 or negative)
    """
    balances = economy_state.get('balances', {})
    balance = balances.get(from_user, 0)
    return max(1, balance)


def _find_amendment(amendment_id, amendments):
    """Find an amendment by ID. Returns the amendment dict or None."""
    for a in amendments.get('amendments', []):
        if a.get('id') == amendment_id:
            return a
    return None


def propose(message, amendments):
    """Process a propose_amendment message.

    Args:
        message: Protocol message with type='propose_amendment'
        amendments: Current amendments state dict (mutated on success)

    Returns:
        dict with:
          On success: {'amendment': <amendment_record>}
          On failure: {'error': <description>}
    """
    # Validate message type
    if message.get('type') != 'propose_amendment':
        return {'error': f"Wrong message type: expected 'propose_amendment', got '{message.get('type')}'"}

    payload = message.get('payload', {})
    from_user = message.get('from', '')
    ts = message.get('ts', _utcnow_iso())

    # Validate required payload fields
    title = payload.get('title', '').strip()
    description = payload.get('description', '').strip()
    diff_text = payload.get('diff_text', '').strip()

    if not title:
        return {'error': "Missing required payload field: 'title'"}
    if not description:
        return {'error': "Missing required payload field: 'description'"}
    if not diff_text:
        return {'error': "Missing required payload field: 'diff_text'"}

    # Constitutional constraint check — scan all text for forbidden patterns
    combined_text = f"{title} {description} {diff_text}".lower()
    is_forbidden, reason = _check_forbidden(combined_text)
    if is_forbidden:
        return {'error': f"Forbidden constitutional content: {reason}"}

    # Calculate voting window (minimum DISCUSSION_PERIOD_DAYS)
    requested_days = payload.get('discussion_period_days', DISCUSSION_PERIOD_DAYS)
    actual_days = max(int(requested_days), DISCUSSION_PERIOD_DAYS)

    proposed_dt = _parse_iso(ts)
    closes_dt = proposed_dt + timedelta(days=actual_days)
    voting_closes_at = closes_dt.strftime('%Y-%m-%dT%H:%M:%SZ')

    # Generate unique amendment ID
    amendment_id = f"amend_{uuid.uuid4().hex[:12]}"

    amendment = {
        'id': amendment_id,
        'title': title,
        'description': description,
        'diff_text': diff_text,
        'proposed_by': from_user,
        'proposed_at': ts,
        'discussion_period_days': actual_days,
        'voting_closes_at': voting_closes_at,
        'status': 'open',
        'votes': [],
        'result': None,
    }

    amendments.setdefault('amendments', []).append(amendment)

    return {'amendment': amendment}


def vote(message, amendments, economy_state):
    """Process a vote_amendment message.

    Args:
        message: Protocol message with type='vote_amendment'
        amendments: Current amendments state dict (mutated on success)
        economy_state: Economy state dict containing balances

    Returns:
        dict with:
          On success: {'success': True, 'vote_record': <vote>}
          On failure: {'success': False, 'error': <description>}
    """
    # Validate message type
    if message.get('type') != 'vote_amendment':
        return {'success': False, 'error': f"Wrong message type: expected 'vote_amendment', got '{message.get('type')}'"}

    payload = message.get('payload', {})
    from_user = message.get('from', '')
    ts = message.get('ts', _utcnow_iso())

    amendment_id = payload.get('amendment_id', '').strip()
    vote_value = payload.get('vote', '').strip()

    # Validate vote value
    if vote_value not in VALID_VOTES:
        return {'success': False, 'error': f"Invalid vote value '{vote_value}': must be 'for' or 'against'"}

    # Find amendment
    amendment = _find_amendment(amendment_id, amendments)
    if amendment is None:
        return {'success': False, 'error': f"Amendment not found: '{amendment_id}'"}

    # Check amendment is open
    if amendment.get('status') != 'open':
        return {'success': False, 'error': f"Amendment is closed (status: {amendment['status']})"}

    # Check voting window not expired
    now = datetime.now(timezone.utc)
    closes_dt = _parse_iso(amendment['voting_closes_at'])
    if now > closes_dt:
        return {'success': False, 'error': "Voting window has expired for this amendment"}

    # Deduplicate: one vote per citizen
    existing_voters = {v['from'] for v in amendment.get('votes', [])}
    if from_user in existing_voters:
        return {'success': False, 'error': f"'{from_user}' has already voted on this amendment"}

    # Determine Spark weight (minimum 1)
    spark_weight = _get_spark_weight(from_user, economy_state)

    # Record vote
    vote_record = {
        'from': from_user,
        'vote': vote_value,
        'spark_weight': spark_weight,
        'ts': ts,
    }
    amendment.setdefault('votes', []).append(vote_record)

    return {'success': True, 'vote_record': vote_record}


def tally(amendment_id, votes, economy_state):
    """Count weighted votes and determine result.

    Args:
        amendment_id: String ID of the amendment being tallied
        votes: List of vote records [{from, vote, spark_weight, ts}, ...]
        economy_state: Economy state dict (unused for re-tallying, weights already stored)

    Returns:
        dict with:
          amendment_id: str
          for_weight: int (total Spark weight of 'for' votes)
          against_weight: int (total Spark weight of 'against' votes)
          total_voters: int
          result: 'approved' | 'rejected'
    """
    for_weight = 0
    against_weight = 0

    for v in votes:
        weight = v.get('spark_weight', 1)
        if v.get('vote') == 'for':
            for_weight += weight
        elif v.get('vote') == 'against':
            against_weight += weight

    total_weight = for_weight + against_weight
    total_voters = len(votes)

    # Approval requires STRICTLY MORE THAN 50% of weighted votes
    if total_weight > 0 and for_weight > total_weight / 2:
        result = 'approved'
    else:
        result = 'rejected'

    return {
        'amendment_id': amendment_id,
        'for_weight': for_weight,
        'against_weight': against_weight,
        'total_voters': total_voters,
        'result': result,
    }


def close(amendment_id, amendments, economy_state):
    """Close an amendment after its discussion period has ended.

    Tallies votes, records the result, marks the amendment closed, and
    generates a close_amendment protocol message.

    Args:
        amendment_id: String ID of the amendment to close
        amendments: Current amendments state dict (mutated on success)
        economy_state: Economy state dict for accessing balances

    Returns:
        dict with:
          On success: {'success': True, 'message': <close_amendment protocol message>}
          On failure: {'success': False, 'error': <description>}
    """
    # Find amendment
    amendment = _find_amendment(amendment_id, amendments)
    if amendment is None:
        return {'success': False, 'error': f"Amendment not found: '{amendment_id}'"}

    # Check not already closed
    if amendment.get('status') == 'closed':
        return {'success': False, 'error': "Amendment is already closed"}

    # Check discussion period has ended
    now = datetime.now(timezone.utc)
    closes_dt = _parse_iso(amendment['voting_closes_at'])
    if now <= closes_dt:
        return {'success': False, 'error': "Discussion period has not ended yet; cannot close amendment before voting window expires"}

    # Tally votes
    tally_result = tally(amendment_id, amendment.get('votes', []), economy_state)

    # Update amendment record
    amendment['status'] = 'closed'
    amendment['result'] = tally_result['result']
    amendment['tally'] = {
        'for_weight': tally_result['for_weight'],
        'against_weight': tally_result['against_weight'],
        'total_voters': tally_result['total_voters'],
    }
    amendment['closed_at'] = now.strftime('%Y-%m-%dT%H:%M:%SZ')

    # Generate close_amendment protocol message
    close_msg = {
        'v': 1,
        'id': f"close_{amendment_id}_{uuid.uuid4().hex[:8]}",
        'ts': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'seq': 0,
        'from': SYSTEM_USER,
        'type': 'close_amendment',
        'platform': 'api',
        'position': {'x': 0, 'y': 0, 'z': 0, 'zone': 'nexus'},
        'geo': {'lat': None, 'lon': None},
        'payload': {
            'amendment_id': amendment_id,
            'result': tally_result['result'],
            'tally': {
                'for_weight': tally_result['for_weight'],
                'against_weight': tally_result['against_weight'],
                'total_voters': tally_result['total_voters'],
            },
        },
    }

    return {'success': True, 'message': close_msg}


def load_amendments(path):
    """Load amendments state from a JSON file. Returns empty structure if missing."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {'amendments': []}


def save_amendments(path, amendments):
    """Save amendments state to a JSON file."""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(amendments, f, indent=2)


def load_economy(path):
    """Load economy state from a JSON file. Returns empty structure if missing."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {'balances': {}, 'ledger': []}


def run_daily_tally(amendments_path, economy_path):
    """Run daily tally: close any amendments past their discussion period.

    Args:
        amendments_path: Path to state/amendments.json
        economy_path: Path to state/economy.json

    Returns:
        List of close results for amendments that were closed.
    """
    amendments = load_amendments(amendments_path)
    economy = load_economy(economy_path)

    closed_results = []
    now = datetime.now(timezone.utc)

    for amendment in amendments.get('amendments', []):
        if amendment.get('status') != 'open':
            continue

        closes_dt = _parse_iso(amendment['voting_closes_at'])
        if now > closes_dt:
            result = close(amendment['id'], amendments, economy)
            closed_results.append(result)
            if result['success']:
                print(f"Closed amendment '{amendment['id']}': {amendment['result']}")
            else:
                print(f"Error closing amendment '{amendment['id']}': {result['error']}", file=sys.stderr)

    if closed_results:
        save_amendments(amendments_path, amendments)

    return closed_results


def main():
    """Entry point for daily tally via GitHub Actions."""
    # Default paths relative to repo root
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    amendments_path = os.path.join(repo_root, 'state', 'amendments.json')
    economy_path = os.path.join(repo_root, 'state', 'economy.json')

    # Allow override via command-line args
    if len(sys.argv) >= 2:
        amendments_path = sys.argv[1]
    if len(sys.argv) >= 3:
        economy_path = sys.argv[2]

    print(f"Running daily amendment tally...")
    print(f"  Amendments: {amendments_path}")
    print(f"  Economy:    {economy_path}")

    results = run_daily_tally(amendments_path, economy_path)

    print(f"Tally complete. {len(results)} amendment(s) closed.")

    # Output close messages as JSON for logging
    close_messages = [r['message'] for r in results if r.get('success')]
    if close_messages:
        print(json.dumps(close_messages, indent=2))

    sys.exit(0)


if __name__ == '__main__':
    main()
