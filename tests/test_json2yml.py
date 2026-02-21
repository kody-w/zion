#!/usr/bin/env python3
"""Tests for json2yml converter — ZION ecosystem universal JSON-to-YAML tool."""
import unittest
import sys
import os
import json
import tempfile
import subprocess

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
from json2yml import json_to_yaml, convert_file


class TestPrimitives(unittest.TestCase):
    """Test basic JSON primitive types."""

    def test_string(self):
        self.assertEqual(json_to_yaml("hello"), "hello\n")

    def test_integer(self):
        self.assertEqual(json_to_yaml(42), "42\n")

    def test_negative_integer(self):
        self.assertEqual(json_to_yaml(-7), "-7\n")

    def test_float(self):
        self.assertEqual(json_to_yaml(3.14), "3.14\n")

    def test_negative_float(self):
        self.assertEqual(json_to_yaml(-0.5), "-0.5\n")

    def test_zero(self):
        self.assertEqual(json_to_yaml(0), "0\n")

    def test_true(self):
        self.assertEqual(json_to_yaml(True), "true\n")

    def test_false(self):
        self.assertEqual(json_to_yaml(False), "false\n")

    def test_null(self):
        self.assertEqual(json_to_yaml(None), "null\n")

    def test_empty_string(self):
        self.assertEqual(json_to_yaml(""), "''\n")


class TestStringQuoting(unittest.TestCase):
    """Test that strings needing YAML quoting are properly quoted."""

    def test_string_true(self):
        self.assertEqual(json_to_yaml("true"), "'true'\n")

    def test_string_false(self):
        self.assertEqual(json_to_yaml("false"), "'false'\n")

    def test_string_yes(self):
        self.assertEqual(json_to_yaml("yes"), "'yes'\n")

    def test_string_no(self):
        self.assertEqual(json_to_yaml("no"), "'no'\n")

    def test_string_on(self):
        self.assertEqual(json_to_yaml("on"), "'on'\n")

    def test_string_off(self):
        self.assertEqual(json_to_yaml("off"), "'off'\n")

    def test_string_null_word(self):
        self.assertEqual(json_to_yaml("null"), "'null'\n")

    def test_string_tilde(self):
        self.assertEqual(json_to_yaml("~"), "'~'\n")

    def test_string_numeric(self):
        """A string that looks like a number must be quoted."""
        self.assertEqual(json_to_yaml("42"), "'42'\n")

    def test_string_float_numeric(self):
        self.assertEqual(json_to_yaml("3.14"), "'3.14'\n")

    def test_string_negative_numeric(self):
        self.assertEqual(json_to_yaml("-7"), "'-7'\n")

    def test_string_with_colon_space(self):
        """Strings containing ': ' need quoting."""
        self.assertEqual(json_to_yaml("key: value"), "'key: value'\n")

    def test_string_with_hash(self):
        """Strings starting with # need quoting."""
        self.assertEqual(json_to_yaml("#comment"), "'#comment'\n")

    def test_string_with_at(self):
        """Strings starting with @ need quoting."""
        self.assertEqual(json_to_yaml("@mention"), "'@mention'\n")

    def test_string_with_ampersand(self):
        self.assertEqual(json_to_yaml("&anchor"), "'&anchor'\n")

    def test_string_with_asterisk(self):
        self.assertEqual(json_to_yaml("*alias"), "'*alias'\n")

    def test_string_with_single_quote(self):
        """Single quotes inside string are escaped by doubling."""
        result = json_to_yaml("it's")
        self.assertEqual(result, "'it''s'\n")

    def test_string_with_newline(self):
        """Multi-line strings use block scalar."""
        result = json_to_yaml("line1\nline2")
        self.assertIn("|", result)
        self.assertIn("line1", result)
        self.assertIn("line2", result)

    def test_string_with_trailing_newline(self):
        result = json_to_yaml("line1\nline2\n")
        self.assertIn("|", result)

    def test_case_insensitive_bool_words(self):
        """TRUE, True, FALSE, etc. all need quoting."""
        self.assertEqual(json_to_yaml("TRUE"), "'TRUE'\n")
        self.assertEqual(json_to_yaml("True"), "'True'\n")
        self.assertEqual(json_to_yaml("FALSE"), "'FALSE'\n")
        self.assertEqual(json_to_yaml("False"), "'False'\n")
        self.assertEqual(json_to_yaml("YES"), "'YES'\n")
        self.assertEqual(json_to_yaml("NO"), "'NO'\n")

    def test_plain_string(self):
        """Normal strings don't need quoting."""
        self.assertEqual(json_to_yaml("hello world"), "hello world\n")

    def test_iso_timestamp(self):
        """ISO timestamps should be quoted to prevent YAML date parsing."""
        self.assertEqual(json_to_yaml("2026-02-21T00:00:00Z"), "'2026-02-21T00:00:00Z'\n")

    def test_date_string(self):
        """Date-like strings need quoting."""
        self.assertEqual(json_to_yaml("2026-02-21"), "'2026-02-21'\n")


class TestSimpleDict(unittest.TestCase):
    """Test flat dictionary conversion."""

    def test_single_key(self):
        result = json_to_yaml({"name": "zion"})
        self.assertEqual(result, "name: zion\n")

    def test_multiple_keys(self):
        result = json_to_yaml({"a": 1, "b": 2})
        self.assertIn("a: 1\n", result)
        self.assertIn("b: 2\n", result)

    def test_mixed_types(self):
        data = {"name": "zion", "version": 1, "active": True, "meta": None}
        result = json_to_yaml(data)
        self.assertIn("name: zion\n", result)
        self.assertIn("version: 1\n", result)
        self.assertIn("active: true\n", result)
        self.assertIn("meta: null\n", result)

    def test_empty_dict(self):
        self.assertEqual(json_to_yaml({}), "{}\n")


class TestSimpleList(unittest.TestCase):
    """Test flat list conversion."""

    def test_string_list(self):
        result = json_to_yaml(["a", "b", "c"])
        self.assertEqual(result, "- a\n- b\n- c\n")

    def test_number_list(self):
        result = json_to_yaml([1, 2, 3])
        self.assertEqual(result, "- 1\n- 2\n- 3\n")

    def test_mixed_list(self):
        result = json_to_yaml(["hello", 42, True, None])
        self.assertEqual(result, "- hello\n- 42\n- true\n- null\n")

    def test_empty_list(self):
        self.assertEqual(json_to_yaml([]), "[]\n")


class TestNestedStructures(unittest.TestCase):
    """Test nested dicts and lists."""

    def test_nested_dict(self):
        data = {"position": {"x": 10, "y": 20, "z": 30}}
        result = json_to_yaml(data)
        expected = "position:\n  x: 10\n  y: 20\n  z: 30\n"
        self.assertEqual(result, expected)

    def test_deeply_nested_dict(self):
        data = {"a": {"b": {"c": {"d": "deep"}}}}
        result = json_to_yaml(data)
        expected = "a:\n  b:\n    c:\n      d: deep\n"
        self.assertEqual(result, expected)

    def test_dict_with_list(self):
        data = {"tags": ["alpha", "beta"]}
        result = json_to_yaml(data)
        expected = "tags:\n  - alpha\n  - beta\n"
        self.assertEqual(result, expected)

    def test_list_of_dicts(self):
        data = [{"name": "a"}, {"name": "b"}]
        result = json_to_yaml(data)
        expected = "- name: a\n- name: b\n"
        self.assertEqual(result, expected)

    def test_dict_with_empty_nested_dict(self):
        data = {"config": {}}
        result = json_to_yaml(data)
        self.assertEqual(result, "config: {}\n")

    def test_dict_with_empty_nested_list(self):
        data = {"items": []}
        result = json_to_yaml(data)
        self.assertEqual(result, "items: []\n")

    def test_list_of_dicts_with_nested(self):
        data = [
            {"name": "a", "pos": {"x": 1, "y": 2}},
            {"name": "b", "pos": {"x": 3, "y": 4}}
        ]
        result = json_to_yaml(data)
        self.assertIn("- name: a\n  pos:\n    x: 1\n    y: 2\n", result)
        self.assertIn("- name: b\n  pos:\n    x: 3\n    y: 4\n", result)


class TestProtocolMessage(unittest.TestCase):
    """Test with actual ZION protocol message shape."""

    def test_protocol_message(self):
        msg = {
            "v": 1,
            "id": "msg-abc-123",
            "ts": "2026-02-21T12:00:00Z",
            "seq": 0,
            "from": "kody-w",
            "type": "say",
            "platform": "api",
            "position": {"x": 0, "y": 0, "z": 0, "zone": "nexus"},
            "geo": {"lat": None, "lon": None},
            "payload": {"message": "Hello ZION!"}
        }
        result = json_to_yaml(msg)
        self.assertIn("v: 1\n", result)
        self.assertIn("id: msg-abc-123\n", result)
        self.assertIn("ts: '2026-02-21T12:00:00Z'\n", result)
        self.assertIn("seq: 0\n", result)
        self.assertIn("from: kody-w\n", result)
        self.assertIn("type: say\n", result)
        self.assertIn("platform: api\n", result)
        self.assertIn("position:\n", result)
        self.assertIn("  zone: nexus\n", result)
        self.assertIn("geo:\n", result)
        self.assertIn("  lat: null\n", result)
        self.assertIn("payload:\n", result)
        self.assertIn("  message: Hello ZION!\n", result)


class TestSoulFile(unittest.TestCase):
    """Test with ZION soul file shape."""

    def test_soul_shape(self):
        soul = {
            "id": "agent_001",
            "name": "Sage",
            "archetype": "philosopher",
            "personality": ["curious", "calm", "deep-thinking"],
            "home_zone": "athenaeum",
            "intentions": [
                {
                    "id": "intent_001",
                    "trigger": {"condition": "player_nearby", "params": {"distance_lt": 5}},
                    "action": {"type": "say", "params": {"message": "Welcome, seeker."}},
                    "priority": 10,
                    "ttl": 300,
                    "cooldown": 60,
                    "max_fires": 10
                }
            ],
            "memory": {}
        }
        result = json_to_yaml(soul)
        self.assertIn("id: agent_001\n", result)
        self.assertIn("archetype: philosopher\n", result)
        self.assertIn("personality:\n", result)
        self.assertIn("  - curious\n", result)
        self.assertIn("intentions:\n", result)
        self.assertIn("    trigger:\n", result)
        self.assertIn("      condition: player_nearby\n", result)
        self.assertIn("memory: {}\n", result)


class TestEconomyLedger(unittest.TestCase):
    """Test with ZION economy ledger shape."""

    def test_economy_shape(self):
        economy = {
            "balances": {
                "agent_001": 150,
                "agent_002": 75,
                "TREASURY": 500
            },
            "transactions": [
                {
                    "type": "craft",
                    "from": "agent_001",
                    "ts": "2026-02-21T10:00:00Z",
                    "payload": {"item": "wooden_chair", "spark_earned": 15}
                }
            ]
        }
        result = json_to_yaml(economy)
        self.assertIn("balances:\n", result)
        self.assertIn("  agent_001: 150\n", result)
        self.assertIn("  TREASURY: 500\n", result)
        self.assertIn("transactions:\n", result)
        self.assertIn("  - type: craft\n", result)
        self.assertIn("    from: agent_001\n", result)


class TestGardenState(unittest.TestCase):
    """Test with ZION garden state shape."""

    def test_garden_plot(self):
        garden = {
            "plot_01": {
                "owner": None,
                "position": {"zone": "gardens", "x": 200, "y": 30, "z": 10},
                "plants": [],
                "fertility": 0.85,
                "size": "medium"
            }
        }
        result = json_to_yaml(garden)
        self.assertIn("plot_01:\n", result)
        self.assertIn("  owner: null\n", result)
        self.assertIn("  plants: []\n", result)
        self.assertIn("  fertility: 0.85\n", result)
        self.assertIn("  size: medium\n", result)


class TestFederationState(unittest.TestCase):
    """Test with federation.json shape."""

    def test_federation(self):
        fed = {
            "worldId": "zion-base",
            "worldName": "ZION",
            "endpoint": "https://kody-w.github.io/zion/",
            "protocolVersion": 1,
            "discoveredWorlds": [],
            "sparkExchangeRate": 1.0
        }
        result = json_to_yaml(fed)
        self.assertIn("worldId: zion-base\n", result)
        self.assertIn("endpoint: https://kody-w.github.io/zion/\n", result)
        self.assertIn("protocolVersion: 1\n", result)
        self.assertIn("discoveredWorlds: []\n", result)


class TestCRMSimulation(unittest.TestCase):
    """Test with CRM simulation state shape (deeply nested)."""

    def test_crm_schema(self):
        crm = {
            "_schema": {
                "collections": {
                    "accounts": {
                        "prefix": "acc",
                        "fields": ["name", "industry", "size"]
                    }
                },
                "activity_types": ["call", "email", "meeting"],
                "pipeline_stages": ["prospect", "qualified", "proposal", "closed"]
            },
            "_molt_log": [],
            "accounts": {}
        }
        result = json_to_yaml(crm)
        self.assertIn("_schema:\n", result)
        self.assertIn("  collections:\n", result)
        self.assertIn("    accounts:\n", result)
        self.assertIn("      prefix: acc\n", result)
        self.assertIn("      fields:\n", result)
        self.assertIn("        - name\n", result)
        self.assertIn("  activity_types:\n", result)
        self.assertIn("    - call\n", result)
        self.assertIn("_molt_log: []\n", result)
        self.assertIn("accounts: {}\n", result)


class TestMCPConfig(unittest.TestCase):
    """Test with .well-known/mcp.json shape."""

    def test_mcp(self):
        mcp = {
            "name": "ZION",
            "description": "A peaceful MMO world",
            "protocol_version": "1.0",
            "endpoints": {
                "ask": "/ask",
                "mcp": "/mcp"
            },
            "message_types": ["say", "move", "build", "plant"]
        }
        result = json_to_yaml(mcp)
        self.assertIn("name: ZION\n", result)
        self.assertIn("protocol_version: '1.0'\n", result)
        self.assertIn("endpoints:\n", result)
        self.assertIn("  ask: /ask\n", result)
        self.assertIn("message_types:\n", result)
        self.assertIn("  - say\n", result)


class TestFileIO(unittest.TestCase):
    """Test file reading and writing."""

    def test_convert_file_to_string(self):
        data = {"hello": "world", "count": 42}
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(data, f)
            inpath = f.name
        try:
            result = convert_file(inpath)
            self.assertIn("hello: world\n", result)
            self.assertIn("count: 42\n", result)
        finally:
            os.unlink(inpath)

    def test_convert_file_to_file(self):
        data = {"key": "value"}
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(data, f)
            inpath = f.name
        outpath = inpath.replace('.json', '.yml')
        try:
            convert_file(inpath, outpath)
            with open(outpath, 'r') as f:
                content = f.read()
            self.assertEqual(content, "key: value\n")
        finally:
            os.unlink(inpath)
            if os.path.exists(outpath):
                os.unlink(outpath)

    def test_convert_real_state_file(self):
        """Convert an actual ZION state file if it exists."""
        state_path = os.path.join(os.path.dirname(__file__), '..', 'state', 'federation.json')
        if os.path.exists(state_path):
            result = convert_file(state_path)
            self.assertIn("worldId:", result)
            self.assertTrue(result.endswith("\n"))


class TestCLI(unittest.TestCase):
    """Test command-line interface."""

    def _run_cli(self, args, stdin_data=None):
        cmd = [sys.executable, os.path.join(os.path.dirname(__file__), '..', 'scripts', 'json2yml.py')] + args
        proc = subprocess.run(cmd, input=stdin_data, capture_output=True, text=True)
        return proc

    def test_stdin_stdout(self):
        proc = self._run_cli([], stdin_data='{"name": "zion"}')
        self.assertEqual(proc.returncode, 0)
        self.assertIn("name: zion", proc.stdout)

    def test_file_arg(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump({"x": 1}, f)
            path = f.name
        try:
            proc = self._run_cli([path])
            self.assertEqual(proc.returncode, 0)
            self.assertIn("x: 1", proc.stdout)
        finally:
            os.unlink(path)

    def test_file_output_arg(self):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump({"y": 2}, f)
            inpath = f.name
        outpath = inpath.replace('.json', '.yml')
        try:
            proc = self._run_cli([inpath, '-o', outpath])
            self.assertEqual(proc.returncode, 0)
            with open(outpath, 'r') as f:
                self.assertIn("y: 2", f.read())
        finally:
            os.unlink(inpath)
            if os.path.exists(outpath):
                os.unlink(outpath)

    def test_invalid_json_stderr(self):
        proc = self._run_cli([], stdin_data='{bad json}')
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("Error", proc.stderr)


class TestEdgeCases(unittest.TestCase):
    """Edge cases and tricky inputs."""

    def test_unicode_string(self):
        result = json_to_yaml({"name": "Zoë"})
        self.assertIn("name: Zoë\n", result)

    def test_string_with_brackets(self):
        """Strings starting with [ or { need quoting."""
        self.assertEqual(json_to_yaml("[not a list]"), "'[not a list]'\n")
        self.assertEqual(json_to_yaml("{not a dict}"), "'{not a dict}'\n")

    def test_string_with_percent(self):
        self.assertEqual(json_to_yaml("%tag"), "'%tag'\n")

    def test_string_with_exclamation(self):
        self.assertEqual(json_to_yaml("!tag"), "'!tag'\n")

    def test_string_with_pipe(self):
        self.assertEqual(json_to_yaml("|block"), "'|block'\n")

    def test_string_with_gt(self):
        self.assertEqual(json_to_yaml(">fold"), "'>fold'\n")

    def test_very_long_string(self):
        long_str = "a" * 500
        result = json_to_yaml(long_str)
        self.assertIn(long_str, result)

    def test_nested_list_of_lists(self):
        data = [[1, 2], [3, 4]]
        result = json_to_yaml(data)
        self.assertIn("- - 1\n  - 2\n", result)
        self.assertIn("- - 3\n  - 4\n", result)

    def test_dict_key_needs_quoting(self):
        """Dict keys that are YAML special words need quoting."""
        data = {"true": "val", "null": "val2"}
        result = json_to_yaml(data)
        self.assertIn("'true': val\n", result)
        self.assertIn("'null': val2\n", result)

    def test_dict_numeric_key(self):
        """Dict keys that look like numbers need quoting."""
        data = {"42": "answer"}
        result = json_to_yaml(data)
        self.assertIn("'42': answer\n", result)

    def test_large_integer(self):
        self.assertEqual(json_to_yaml(9999999999999), "9999999999999\n")

    def test_scientific_float(self):
        result = json_to_yaml(1e10)
        # Python may render as 10000000000.0
        self.assertTrue(result.strip())

    def test_string_with_backslash(self):
        result = json_to_yaml("path\\to\\file")
        self.assertIn("path\\to\\file", result)

    def test_string_colon_at_end(self):
        """Colon at end of string needs quoting."""
        self.assertEqual(json_to_yaml("key:"), "'key:'\n")

    def test_string_comma(self):
        """Strings with commas that could confuse flow collections."""
        result = json_to_yaml("a, b, c")
        self.assertIn("a, b, c", result)

    def test_roundtrip_all_state_files(self):
        """Ensure all ZION state JSON files can be converted without error."""
        state_dir = os.path.join(os.path.dirname(__file__), '..', 'state')
        if not os.path.isdir(state_dir):
            return
        for root, dirs, files in os.walk(state_dir):
            for fname in files:
                if fname.endswith('.json'):
                    path = os.path.join(root, fname)
                    try:
                        result = convert_file(path)
                        self.assertTrue(len(result) > 0, f"Empty output for {path}")
                    except Exception as e:
                        self.fail(f"Failed to convert {path}: {e}")


if __name__ == '__main__':
    unittest.main()
