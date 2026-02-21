#!/usr/bin/env python3
"""Tests for amendment_vote.py — Constitutional Amendment Voting System.

Tests cover:
- propose(): creates amendment records with correct defaults
- vote(): records Spark-weighted votes, validates eligibility
- tally(): counts weighted votes, determines result
- close(): generates close message with tally
- Constitutional constraints: cannot remove rights, close source, require physical movement
"""
import unittest
import sys
import os
import json
import copy
from datetime import datetime, timezone, timedelta

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from amendment_vote import (
    propose,
    vote,
    tally,
    close,
    FORBIDDEN_PATTERNS,
    DISCUSSION_PERIOD_DAYS,
)


def make_message(msg_type, from_user, payload, ts=None):
    """Helper: build a minimal valid protocol message."""
    if ts is None:
        ts = datetime.now(timezone.utc).isoformat()
    return {
        'v': 1,
        'id': f'msg_{from_user}_{msg_type}',
        'ts': ts,
        'seq': 1,
        'from': from_user,
        'type': msg_type,
        'platform': 'api',
        'position': {'x': 0, 'y': 0, 'z': 0, 'zone': 'nexus'},
        'geo': {'lat': None, 'lon': None},
        'payload': payload,
    }


def make_economy(balances):
    """Helper: build a minimal economy state dict."""
    return {'balances': balances, 'ledger': []}


class TestPropose(unittest.TestCase):
    """Tests for propose()."""

    def _propose_msg(self, from_user='alice', title='Test Amendment',
                     desc='A test', diff='+ new rule', days=7, ts=None):
        return make_message('propose_amendment', from_user, {
            'title': title,
            'description': desc,
            'diff_text': diff,
            'discussion_period_days': days,
        }, ts=ts)

    def test_propose_creates_amendment(self):
        """propose() should return an amendment dict."""
        msg = self._propose_msg()
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        self.assertIn('amendment', result)
        a = result['amendment']
        self.assertEqual(a['title'], 'Test Amendment')
        self.assertEqual(a['description'], 'A test')
        self.assertEqual(a['diff_text'], '+ new rule')
        self.assertEqual(a['proposed_by'], 'alice')
        self.assertEqual(a['status'], 'open')
        self.assertIsInstance(a['votes'], list)
        self.assertEqual(len(a['votes']), 0)
        self.assertIsNone(a['result'])

    def test_propose_sets_id(self):
        """propose() should set a non-empty amendment id."""
        msg = self._propose_msg()
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        a = result['amendment']
        self.assertIn('id', a)
        self.assertIsInstance(a['id'], str)
        self.assertTrue(len(a['id']) > 0)

    def test_propose_sets_proposed_at(self):
        """propose() should set proposed_at from message timestamp."""
        ts = '2026-02-21T12:00:00Z'
        msg = self._propose_msg(ts=ts)
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        a = result['amendment']
        self.assertEqual(a['proposed_at'], ts)

    def test_propose_sets_voting_window(self):
        """propose() should set voting_closes_at at least 7 days after proposed_at."""
        ts = '2026-02-21T12:00:00Z'
        msg = self._propose_msg(ts=ts, days=7)
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        a = result['amendment']
        self.assertIn('voting_closes_at', a)
        proposed_dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        closes_dt = datetime.fromisoformat(a['voting_closes_at'].replace('Z', '+00:00'))
        self.assertGreaterEqual((closes_dt - proposed_dt).days, 7)

    def test_propose_minimum_discussion_period(self):
        """propose() should enforce minimum 7-day discussion period even if shorter specified."""
        ts = '2026-02-21T12:00:00Z'
        msg = self._propose_msg(ts=ts, days=1)  # Shorter than minimum
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        a = result['amendment']
        proposed_dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        closes_dt = datetime.fromisoformat(a['voting_closes_at'].replace('Z', '+00:00'))
        # Should be at least minimum regardless of what was requested
        self.assertGreaterEqual((closes_dt - proposed_dt).days, DISCUSSION_PERIOD_DAYS)

    def test_propose_adds_to_amendments_list(self):
        """propose() should add to the existing amendments list."""
        amendments = {'amendments': []}
        msg1 = self._propose_msg(title='Proposal One')
        msg2 = self._propose_msg(title='Proposal Two')
        propose(msg1, amendments)
        propose(msg2, amendments)
        self.assertEqual(len(amendments['amendments']), 2)

    def test_propose_rejects_missing_title(self):
        """propose() should fail if title is missing."""
        msg = make_message('propose_amendment', 'alice', {
            'description': 'desc',
            'diff_text': 'diff',
        })
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        self.assertIn('error', result)

    def test_propose_rejects_missing_description(self):
        """propose() should fail if description is missing."""
        msg = make_message('propose_amendment', 'alice', {
            'title': 'Title',
            'diff_text': 'diff',
        })
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        self.assertIn('error', result)

    def test_propose_rejects_missing_diff(self):
        """propose() should fail if diff_text is missing."""
        msg = make_message('propose_amendment', 'alice', {
            'title': 'Title',
            'description': 'desc',
        })
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        self.assertIn('error', result)

    def test_propose_rejects_remove_player_rights(self):
        """propose() should reject amendments that remove player rights (§2.3)."""
        msg = make_message('propose_amendment', 'alice', {
            'title': 'Remove Rights',
            'description': 'remove player rights §2.3',
            'diff_text': '- players may exist in the world',
        })
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        self.assertIn('error', result)
        self.assertIn('forbidden', result['error'].lower())

    def test_propose_rejects_close_source(self):
        """propose() should reject amendments that close the source code."""
        msg = make_message('propose_amendment', 'alice', {
            'title': 'Close Source',
            'description': 'make code proprietary, close source',
            'diff_text': '+ source code is now proprietary',
        })
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        self.assertIn('error', result)
        self.assertIn('forbidden', result['error'].lower())

    def test_propose_rejects_require_physical_movement(self):
        """propose() should reject amendments that require physical movement."""
        msg = make_message('propose_amendment', 'alice', {
            'title': 'Movement Required',
            'description': 'players must physically move to access content',
            'diff_text': '+ physical movement required for all zones',
        })
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        self.assertIn('error', result)
        self.assertIn('forbidden', result['error'].lower())

    def test_propose_wrong_message_type(self):
        """propose() should reject messages that are not propose_amendment type."""
        msg = make_message('vote_amendment', 'alice', {
            'title': 'Title',
            'description': 'desc',
            'diff_text': 'diff',
        })
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        self.assertIn('error', result)


class TestVote(unittest.TestCase):
    """Tests for vote()."""

    def _open_amendment(self, amendment_id='amend_001', days_ago=0):
        """Build an open amendment (voting window not yet closed)."""
        now = datetime.now(timezone.utc)
        proposed_at = (now - timedelta(days=days_ago)).isoformat()
        closes_at = (now + timedelta(days=7)).isoformat()
        return {
            'id': amendment_id,
            'title': 'Test Amendment',
            'description': 'A test',
            'diff_text': '+ a change',
            'proposed_by': 'proposer',
            'proposed_at': proposed_at,
            'voting_closes_at': closes_at,
            'status': 'open',
            'votes': [],
            'result': None,
        }

    def _vote_msg(self, from_user, amendment_id, vote_value, ts=None):
        if ts is None:
            ts = datetime.now(timezone.utc).isoformat()
        return make_message('vote_amendment', from_user, {
            'amendment_id': amendment_id,
            'vote': vote_value,
        }, ts=ts)

    def test_vote_records_for_vote(self):
        """vote() should record a 'for' vote on an open amendment."""
        amendment = self._open_amendment()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'alice': 100})
        msg = self._vote_msg('alice', 'amend_001', 'for')
        result = vote(msg, amendments, economy)
        self.assertTrue(result['success'])
        self.assertEqual(len(amendment['votes']), 1)
        self.assertEqual(amendment['votes'][0]['from'], 'alice')
        self.assertEqual(amendment['votes'][0]['vote'], 'for')

    def test_vote_records_against_vote(self):
        """vote() should record an 'against' vote on an open amendment."""
        amendment = self._open_amendment()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'bob': 50})
        msg = self._vote_msg('bob', 'amend_001', 'against')
        result = vote(msg, amendments, economy)
        self.assertTrue(result['success'])
        self.assertEqual(amendment['votes'][0]['vote'], 'against')

    def test_vote_uses_spark_weight(self):
        """vote() should set spark_weight from voter's balance."""
        amendment = self._open_amendment()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'alice': 150})
        msg = self._vote_msg('alice', 'amend_001', 'for')
        result = vote(msg, amendments, economy)
        self.assertTrue(result['success'])
        self.assertEqual(amendment['votes'][0]['spark_weight'], 150)

    def test_vote_minimum_weight_one(self):
        """vote() should assign weight 1 to voters with 0 or negative balance."""
        amendment = self._open_amendment()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'poorUser': 0})
        msg = self._vote_msg('poorUser', 'amend_001', 'for')
        result = vote(msg, amendments, economy)
        self.assertTrue(result['success'])
        self.assertEqual(amendment['votes'][0]['spark_weight'], 1)

    def test_vote_minimum_weight_for_negative_balance(self):
        """vote() should assign weight 1 to voters with negative balance."""
        amendment = self._open_amendment()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'broke': -50})
        msg = self._vote_msg('broke', 'amend_001', 'for')
        result = vote(msg, amendments, economy)
        self.assertTrue(result['success'])
        self.assertEqual(amendment['votes'][0]['spark_weight'], 1)

    def test_vote_minimum_weight_for_unknown_voter(self):
        """vote() should assign weight 1 to voters not in economy."""
        amendment = self._open_amendment()
        amendments = {'amendments': [amendment]}
        economy = make_economy({})  # No balances
        msg = self._vote_msg('newbie', 'amend_001', 'for')
        result = vote(msg, amendments, economy)
        self.assertTrue(result['success'])
        self.assertEqual(amendment['votes'][0]['spark_weight'], 1)

    def test_vote_dedup_same_citizen(self):
        """vote() should reject duplicate votes from same citizen."""
        amendment = self._open_amendment()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'alice': 100})
        msg1 = self._vote_msg('alice', 'amend_001', 'for')
        msg2 = self._vote_msg('alice', 'amend_001', 'against')
        vote(msg1, amendments, economy)
        result2 = vote(msg2, amendments, economy)
        self.assertFalse(result2['success'])
        self.assertIn('already voted', result2['error'].lower())
        # Still only one vote recorded
        self.assertEqual(len(amendment['votes']), 1)

    def test_vote_rejects_closed_amendment(self):
        """vote() should reject votes on closed amendments."""
        now = datetime.now(timezone.utc)
        closed_amendment = {
            'id': 'amend_closed',
            'title': 'Closed',
            'description': 'desc',
            'diff_text': 'diff',
            'proposed_by': 'proposer',
            'proposed_at': (now - timedelta(days=14)).isoformat(),
            'voting_closes_at': (now - timedelta(days=1)).isoformat(),
            'status': 'closed',
            'votes': [],
            'result': 'approved',
        }
        amendments = {'amendments': [closed_amendment]}
        economy = make_economy({'alice': 100})
        msg = self._vote_msg('alice', 'amend_closed', 'for')
        result = vote(msg, amendments, economy)
        self.assertFalse(result['success'])
        self.assertIn('closed', result['error'].lower())

    def test_vote_rejects_expired_window(self):
        """vote() should reject votes when voting window has passed."""
        now = datetime.now(timezone.utc)
        expired_amendment = {
            'id': 'amend_expired',
            'title': 'Expired',
            'description': 'desc',
            'diff_text': 'diff',
            'proposed_by': 'proposer',
            'proposed_at': (now - timedelta(days=14)).isoformat(),
            'voting_closes_at': (now - timedelta(days=1)).isoformat(),
            'status': 'open',  # Still open but window passed
            'votes': [],
            'result': None,
        }
        amendments = {'amendments': [expired_amendment]}
        economy = make_economy({'alice': 100})
        msg = self._vote_msg('alice', 'amend_expired', 'for')
        result = vote(msg, amendments, economy)
        self.assertFalse(result['success'])

    def test_vote_rejects_invalid_vote_value(self):
        """vote() should reject votes that are not 'for' or 'against'."""
        amendment = self._open_amendment()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'alice': 100})
        msg = self._vote_msg('alice', 'amend_001', 'maybe')
        result = vote(msg, amendments, economy)
        self.assertFalse(result['success'])
        self.assertIn('invalid', result['error'].lower())

    def test_vote_rejects_unknown_amendment(self):
        """vote() should reject votes on non-existent amendments."""
        amendments = {'amendments': []}
        economy = make_economy({'alice': 100})
        msg = self._vote_msg('alice', 'does_not_exist', 'for')
        result = vote(msg, amendments, economy)
        self.assertFalse(result['success'])

    def test_vote_wrong_message_type(self):
        """vote() should reject messages that are not vote_amendment type."""
        amendment = self._open_amendment()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'alice': 100})
        msg = make_message('say', 'alice', {
            'amendment_id': 'amend_001',
            'vote': 'for',
        })
        result = vote(msg, amendments, economy)
        self.assertFalse(result['success'])

    def test_vote_records_timestamp(self):
        """vote() should record the vote timestamp."""
        amendment = self._open_amendment()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'alice': 100})
        ts = '2026-02-21T10:00:00Z'
        msg = self._vote_msg('alice', 'amend_001', 'for', ts=ts)
        result = vote(msg, amendments, economy)
        self.assertTrue(result['success'])
        self.assertEqual(amendment['votes'][0]['ts'], ts)


class TestTally(unittest.TestCase):
    """Tests for tally()."""

    def _amendment_with_votes(self, votes_data, amendment_id='amend_001'):
        """Build an amendment with pre-populated votes."""
        now = datetime.now(timezone.utc)
        return {
            'id': amendment_id,
            'title': 'Test Amendment',
            'description': 'A test',
            'diff_text': '+ a change',
            'proposed_by': 'proposer',
            'proposed_at': (now - timedelta(days=10)).isoformat(),
            'voting_closes_at': (now + timedelta(days=1)).isoformat(),
            'status': 'open',
            'votes': votes_data,
            'result': None,
        }

    def test_tally_approval_majority(self):
        """tally() should return 'approved' when >50% of weighted votes are 'for'."""
        votes_data = [
            {'from': 'alice', 'vote': 'for', 'spark_weight': 100, 'ts': '2026-02-21T10:00:00Z'},
            {'from': 'bob', 'vote': 'for', 'spark_weight': 60, 'ts': '2026-02-21T10:00:00Z'},
            {'from': 'carol', 'vote': 'against', 'spark_weight': 50, 'ts': '2026-02-21T10:00:00Z'},
        ]
        amendment = self._amendment_with_votes(votes_data)
        economy = make_economy({'alice': 100, 'bob': 60, 'carol': 50})
        result = tally(amendment['id'], amendment['votes'], economy)
        self.assertEqual(result['result'], 'approved')
        self.assertEqual(result['for_weight'], 160)
        self.assertEqual(result['against_weight'], 50)

    def test_tally_rejection_minority(self):
        """tally() should return 'rejected' when <=50% of weighted votes are 'for'."""
        votes_data = [
            {'from': 'alice', 'vote': 'for', 'spark_weight': 50, 'ts': '2026-02-21T10:00:00Z'},
            {'from': 'bob', 'vote': 'against', 'spark_weight': 60, 'ts': '2026-02-21T10:00:00Z'},
            {'from': 'carol', 'vote': 'against', 'spark_weight': 40, 'ts': '2026-02-21T10:00:00Z'},
        ]
        amendment = self._amendment_with_votes(votes_data)
        economy = make_economy({'alice': 50, 'bob': 60, 'carol': 40})
        result = tally(amendment['id'], amendment['votes'], economy)
        self.assertEqual(result['result'], 'rejected')
        self.assertEqual(result['for_weight'], 50)
        self.assertEqual(result['against_weight'], 100)

    def test_tally_exactly_fifty_percent_rejected(self):
        """tally() should return 'rejected' when exactly 50% for (need >50%)."""
        votes_data = [
            {'from': 'alice', 'vote': 'for', 'spark_weight': 50, 'ts': '2026-02-21T10:00:00Z'},
            {'from': 'bob', 'vote': 'against', 'spark_weight': 50, 'ts': '2026-02-21T10:00:00Z'},
        ]
        amendment = self._amendment_with_votes(votes_data)
        economy = make_economy({'alice': 50, 'bob': 50})
        result = tally(amendment['id'], amendment['votes'], economy)
        self.assertEqual(result['result'], 'rejected')

    def test_tally_no_votes_rejected(self):
        """tally() should return 'rejected' when there are no votes."""
        amendment = self._amendment_with_votes([])
        economy = make_economy({})
        result = tally(amendment['id'], amendment['votes'], economy)
        self.assertEqual(result['result'], 'rejected')
        self.assertEqual(result['for_weight'], 0)
        self.assertEqual(result['against_weight'], 0)

    def test_tally_vote_count_in_result(self):
        """tally() should include vote count in result."""
        votes_data = [
            {'from': 'alice', 'vote': 'for', 'spark_weight': 100, 'ts': '2026-02-21T10:00:00Z'},
            {'from': 'bob', 'vote': 'against', 'spark_weight': 50, 'ts': '2026-02-21T10:00:00Z'},
        ]
        amendment = self._amendment_with_votes(votes_data)
        economy = make_economy({'alice': 100, 'bob': 50})
        result = tally(amendment['id'], amendment['votes'], economy)
        self.assertEqual(result['total_voters'], 2)

    def test_tally_returns_amendment_id(self):
        """tally() should include amendment_id in result."""
        amendment = self._amendment_with_votes([])
        economy = make_economy({})
        result = tally(amendment['id'], amendment['votes'], economy)
        self.assertEqual(result['amendment_id'], 'amend_001')

    def test_tally_spark_weighted_correctly(self):
        """tally() weights should match stored spark_weight values."""
        votes_data = [
            {'from': 'whale', 'vote': 'against', 'spark_weight': 1000, 'ts': '2026-02-21T10:00:00Z'},
            {'from': 'newbie1', 'vote': 'for', 'spark_weight': 1, 'ts': '2026-02-21T10:00:00Z'},
            {'from': 'newbie2', 'vote': 'for', 'spark_weight': 1, 'ts': '2026-02-21T10:00:00Z'},
        ]
        amendment = self._amendment_with_votes(votes_data)
        economy = make_economy({'whale': 1000, 'newbie1': 1, 'newbie2': 1})
        result = tally(amendment['id'], amendment['votes'], economy)
        self.assertEqual(result['for_weight'], 2)
        self.assertEqual(result['against_weight'], 1000)
        self.assertEqual(result['result'], 'rejected')


class TestClose(unittest.TestCase):
    """Tests for close()."""

    def _open_amendment_past_deadline(self, amendment_id='amend_001'):
        """Build an amendment with expired voting window."""
        now = datetime.now(timezone.utc)
        return {
            'id': amendment_id,
            'title': 'Test Amendment',
            'description': 'A test',
            'diff_text': '+ a change',
            'proposed_by': 'proposer',
            'proposed_at': (now - timedelta(days=10)).isoformat(),
            'voting_closes_at': (now - timedelta(seconds=1)).isoformat(),
            'status': 'open',
            'votes': [
                {'from': 'alice', 'vote': 'for', 'spark_weight': 100, 'ts': '2026-02-21T10:00:00Z'},
                {'from': 'bob', 'vote': 'against', 'spark_weight': 40, 'ts': '2026-02-21T10:00:00Z'},
            ],
            'result': None,
        }

    def test_close_sets_status_closed(self):
        """close() should mark the amendment status as 'closed'."""
        amendment = self._open_amendment_past_deadline()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'alice': 100, 'bob': 40})
        result = close(amendment['id'], amendments, economy)
        self.assertTrue(result['success'])
        self.assertEqual(amendment['status'], 'closed')

    def test_close_sets_result(self):
        """close() should set the amendment result (approved/rejected)."""
        amendment = self._open_amendment_past_deadline()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'alice': 100, 'bob': 40})
        result = close(amendment['id'], amendments, economy)
        self.assertTrue(result['success'])
        self.assertIn(amendment['result'], ['approved', 'rejected'])

    def test_close_approved_with_majority_for(self):
        """close() should set result='approved' when for votes win."""
        amendment = self._open_amendment_past_deadline()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'alice': 100, 'bob': 40})
        result = close(amendment['id'], amendments, economy)
        # alice=100 for > bob=40 against → approved
        self.assertEqual(amendment['result'], 'approved')

    def test_close_rejected_with_majority_against(self):
        """close() should set result='rejected' when against votes win."""
        now = datetime.now(timezone.utc)
        amendment = {
            'id': 'amend_002',
            'title': 'Test',
            'description': 'Test',
            'diff_text': '+ change',
            'proposed_by': 'proposer',
            'proposed_at': (now - timedelta(days=10)).isoformat(),
            'voting_closes_at': (now - timedelta(seconds=1)).isoformat(),
            'status': 'open',
            'votes': [
                {'from': 'alice', 'vote': 'for', 'spark_weight': 30, 'ts': '2026-02-21T10:00:00Z'},
                {'from': 'bob', 'vote': 'against', 'spark_weight': 100, 'ts': '2026-02-21T10:00:00Z'},
            ],
            'result': None,
        }
        amendments = {'amendments': [amendment]}
        economy = make_economy({'alice': 30, 'bob': 100})
        result = close(amendment['id'], amendments, economy)
        self.assertEqual(amendment['result'], 'rejected')

    def test_close_generates_close_message(self):
        """close() should return a valid protocol close_amendment message."""
        amendment = self._open_amendment_past_deadline()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'alice': 100, 'bob': 40})
        result = close(amendment['id'], amendments, economy)
        self.assertTrue(result['success'])
        self.assertIn('message', result)
        msg = result['message']
        self.assertEqual(msg['type'], 'close_amendment')
        self.assertEqual(msg['v'], 1)
        self.assertIn('payload', msg)
        payload = msg['payload']
        self.assertEqual(payload['amendment_id'], amendment['id'])
        self.assertIn('result', payload)
        self.assertIn('tally', payload)

    def test_close_tally_in_message(self):
        """close() message payload tally should include for_weight and against_weight."""
        amendment = self._open_amendment_past_deadline()
        amendments = {'amendments': [amendment]}
        economy = make_economy({'alice': 100, 'bob': 40})
        result = close(amendment['id'], amendments, economy)
        tally_data = result['message']['payload']['tally']
        self.assertIn('for_weight', tally_data)
        self.assertIn('against_weight', tally_data)
        self.assertEqual(tally_data['for_weight'], 100)
        self.assertEqual(tally_data['against_weight'], 40)

    def test_close_rejects_not_yet_expired(self):
        """close() should refuse to close an amendment before voting window expires."""
        now = datetime.now(timezone.utc)
        amendment = {
            'id': 'amend_future',
            'title': 'Future',
            'description': 'desc',
            'diff_text': 'diff',
            'proposed_by': 'proposer',
            'proposed_at': (now - timedelta(days=3)).isoformat(),
            'voting_closes_at': (now + timedelta(days=4)).isoformat(),  # Still open
            'status': 'open',
            'votes': [],
            'result': None,
        }
        amendments = {'amendments': [amendment]}
        economy = make_economy({})
        result = close(amendment['id'], amendments, economy)
        self.assertFalse(result['success'])
        self.assertIn('period', result['error'].lower())

    def test_close_rejects_already_closed(self):
        """close() should refuse to close an already closed amendment."""
        now = datetime.now(timezone.utc)
        amendment = {
            'id': 'amend_already_closed',
            'title': 'Already Closed',
            'description': 'desc',
            'diff_text': 'diff',
            'proposed_by': 'proposer',
            'proposed_at': (now - timedelta(days=10)).isoformat(),
            'voting_closes_at': (now - timedelta(days=2)).isoformat(),
            'status': 'closed',
            'votes': [],
            'result': 'approved',
        }
        amendments = {'amendments': [amendment]}
        economy = make_economy({})
        result = close(amendment['id'], amendments, economy)
        self.assertFalse(result['success'])

    def test_close_unknown_amendment(self):
        """close() should fail gracefully for unknown amendment ids."""
        amendments = {'amendments': []}
        economy = make_economy({})
        result = close('does_not_exist', amendments, economy)
        self.assertFalse(result['success'])


class TestForbiddenPatterns(unittest.TestCase):
    """Tests for FORBIDDEN_PATTERNS and constitutional constraint enforcement."""

    def test_forbidden_patterns_list_exists(self):
        """FORBIDDEN_PATTERNS should be a non-empty list."""
        self.assertIsInstance(FORBIDDEN_PATTERNS, list)
        self.assertGreater(len(FORBIDDEN_PATTERNS), 0)

    def test_allowed_normal_amendment(self):
        """A normal amendment should not trigger any forbidden pattern."""
        msg = make_message('propose_amendment', 'alice', {
            'title': 'Add Arena Season',
            'description': 'Adds a new seasonal arena tournament format',
            'diff_text': '+ Arena tournaments run for 30-day seasons',
            'discussion_period_days': 7,
        })
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        self.assertNotIn('error', result)

    def test_forbidden_remove_rights_in_diff(self):
        """Diff that removes player rights should be caught."""
        msg = make_message('propose_amendment', 'alice', {
            'title': 'Limit rights',
            'description': 'some change',
            'diff_text': '- players have the right to exist',
        })
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        self.assertIn('error', result)

    def test_forbidden_close_source_in_diff(self):
        """Diff that makes code proprietary should be caught."""
        msg = make_message('propose_amendment', 'alice', {
            'title': 'Close source',
            'description': 'make it closed source',
            'diff_text': '+ Code is closed source and proprietary',
        })
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        self.assertIn('error', result)

    def test_forbidden_physical_movement_required(self):
        """Amendment requiring physical movement should be caught."""
        msg = make_message('propose_amendment', 'alice', {
            'title': 'Require walking',
            'description': 'Players must walk to access all content',
            'diff_text': '+ physical movement required for all game content',
        })
        amendments = {'amendments': []}
        result = propose(msg, amendments)
        self.assertIn('error', result)


class TestDiscussionPeriodConstant(unittest.TestCase):
    """Tests for DISCUSSION_PERIOD_DAYS constant."""

    def test_discussion_period_is_7(self):
        """DISCUSSION_PERIOD_DAYS should be 7 per §7.5."""
        self.assertEqual(DISCUSSION_PERIOD_DAYS, 7)


if __name__ == '__main__':
    unittest.main()
