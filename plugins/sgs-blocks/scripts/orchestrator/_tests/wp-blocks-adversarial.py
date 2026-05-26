#!/usr/bin/env python3
"""Adversarial test corpus for wp-blocks.py Spec 22 FR-22-8 extensions.

Per F-RA-3 — positive + negative + edge cases for each of the 5 implemented
subcommands. The 6th (equivalent-block) is scaffolded only; we cover the
"pending Task 2" error path.

Run:
    python plugins/sgs-blocks/scripts/orchestrator/_tests/wp-blocks-adversarial.py

Exits non-zero if ANY test fails. Writes test rows to uimax with a sentinel
provenance string and cleans them up at the end.

The subprocess pattern invokes the real wp-blocks.py — no mocks. Per
binding rule blub.db row 194 (verify rendered output, not internal metrics).
"""
from __future__ import annotations

import json
import sqlite3
import subprocess
import sys
import unittest
from pathlib import Path

WP_BLOCKS = Path.home() / '.claude' / 'hooks' / 'wp-blocks.py'
UIMAX_DB = Path.home() / '.agents' / 'skills' / 'ui-ux-pro-max' / 'scripts' / 'ui-ux-pro-max.db'
SENTINEL_PROVENANCE = 'wp-blocks-adversarial-test'
SENTINEL_RUN_ID = 'wp-blocks-adversarial-run'


def run(cli_args, stdin_payload=None):
    """Invoke wp-blocks.py as subprocess. Returns (rc, stdout, stderr)."""
    cmd = [sys.executable, str(WP_BLOCKS)] + cli_args
    proc = subprocess.run(
        cmd,
        input=(json.dumps(stdin_payload) if stdin_payload is not None else None),
        capture_output=True,
        text=True,
        encoding='utf-8',
    )
    return proc.returncode, proc.stdout, proc.stderr


def parse_json_out(stdout):
    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        return None


class TestNamingConvention(unittest.TestCase):
    def test_positive_canonical_match(self):
        """SGS WordPress is the only is_canonical=1 row — querying SGS finds it."""
        rc, out, err = run(['naming-convention', 'SGS'])
        self.assertEqual(rc, 0, err)
        data = parse_json_out(out)
        self.assertIsNotNone(data)
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['results'][0]['convention_name'], 'SGS WordPress')
        self.assertEqual(data['results'][0]['is_canonical_for_sgs_drafts'], 1)

    def test_negative_non_canonical_excluded(self):
        """BEM exists in DB but is_canonical=0 — must be filtered out."""
        rc, out, err = run(['naming-convention', 'BEM'])
        self.assertEqual(rc, 0, err)
        data = parse_json_out(out)
        self.assertEqual(data['count'], 0)

    def test_negative_no_match(self):
        """Fake convention returns empty."""
        rc, out, err = run(['naming-convention', 'NONEXISTENT_XYZZY_FAKE'])
        self.assertEqual(rc, 0, err)
        self.assertEqual(parse_json_out(out)['count'], 0)

    def test_edge_unicode(self):
        """Unicode input must not crash."""
        rc, out, err = run(['naming-convention', 'naïve—token'])
        self.assertEqual(rc, 0, err)
        self.assertEqual(parse_json_out(out)['count'], 0)

    def test_edge_regex_literal_match(self):
        """Pattern_regex literal-substring match works (search 'sgs-' as substring)."""
        rc, out, err = run(['naming-convention', 'sgs-'])
        self.assertEqual(rc, 0, err)
        data = parse_json_out(out)
        # The SGS WordPress pattern_regex contains '^sgs-' — should match
        self.assertGreaterEqual(data['count'], 1)


class TestGapCandidate(unittest.TestCase):
    def test_positive_read(self):
        rc, out, err = run(['gap-candidate', 'color'])
        self.assertEqual(rc, 0, err)
        data = parse_json_out(out)
        self.assertGreater(data['count'], 0)

    def test_negative_read_no_match(self):
        rc, out, err = run(['gap-candidate', 'NONEXISTENT_XYZZY_FAKE_ATTR'])
        self.assertEqual(rc, 0, err)
        self.assertEqual(parse_json_out(out)['count'], 0)

    def test_negative_read_missing_arg(self):
        """Read form without --write and without attr_name → exit 2."""
        rc, out, err = run(['gap-candidate'])
        self.assertEqual(rc, 2)
        self.assertIn('attr-name', err)

    def test_positive_write(self):
        payload = {
            "block_slug": "sgs/hero",
            "attr_name": "adversarial_positive",
            "selector": ".sgs-hero__test",
            "css_property": "background-color",
            "css_value": "#abcdef",
            "confidence": 0.42,
            "provenance": SENTINEL_PROVENANCE,
        }
        rc, out, err = run(['gap-candidate', '--write'], stdin_payload=payload)
        self.assertEqual(rc, 0, err)
        data = parse_json_out(out)
        self.assertEqual(data['status'], 'ok')
        self.assertEqual(data['table'], 'attribute_gap_candidates')

    def test_write_duplicate_bumps_seen_count(self):
        """Two writes with same UNIQUE key → second returns duplicate_bumped."""
        payload = {
            "block_slug": "sgs/hero",
            "attr_name": "adversarial_dup",
            "selector": ".sgs-hero__dup",
            "css_property": "padding",
            "css_value": "10px",
            "confidence": 0.5,
            "provenance": SENTINEL_PROVENANCE,
        }
        run(['gap-candidate', '--write'], stdin_payload=payload)  # first
        rc, out, err = run(['gap-candidate', '--write'], stdin_payload=payload)  # second
        self.assertEqual(rc, 0, err)
        self.assertEqual(parse_json_out(out)['status'], 'duplicate_bumped')

    def test_write_rejects_bad_confidence(self):
        """confidence > 1.0 → exit 2 with clear error."""
        payload = {
            "block_slug": "sgs/hero",
            "attr_name": "bad_confidence",
            "selector": ".sgs-hero__bad",
            "css_property": "color",
            "confidence": 99.0,
            "provenance": SENTINEL_PROVENANCE,
        }
        rc, _, err = run(['gap-candidate', '--write'], stdin_payload=payload)
        self.assertEqual(rc, 2)
        self.assertIn('confidence', err)

    def test_write_rejects_missing_required(self):
        payload = {"css_property": "color"}  # no block_slug / attr_name
        rc, _, err = run(['gap-candidate', '--write'], stdin_payload=payload)
        self.assertEqual(rc, 2)

    def test_write_rejects_malformed_json(self):
        cmd = [sys.executable, str(WP_BLOCKS), 'gap-candidate', '--write']
        proc = subprocess.run(cmd, input='{not json', capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(proc.returncode, 2)
        self.assertIn('invalid JSON', proc.stderr)


class TestAnimation(unittest.TestCase):
    def test_positive_slug_only(self):
        rc, out, err = run(['animation', 'sgs/hero'])
        self.assertEqual(rc, 0, err)
        data = parse_json_out(out)
        self.assertGreaterEqual(data['count'], 0)  # may be 0+ depending on seeded data

    def test_negative_unknown_slug(self):
        rc, out, err = run(['animation', 'sgs/NONEXISTENT_XYZZY'])
        self.assertEqual(rc, 0, err)
        self.assertEqual(parse_json_out(out)['count'], 0)

    def test_edge_hyphen_compound_attr(self):
        """Hyphenated attribute name must not crash."""
        rc, out, err = run(['animation', 'sgs/hero', 'background-color-on-hover'])
        self.assertEqual(rc, 0, err)
        self.assertEqual(parse_json_out(out)['count'], 0)


class TestComponentLibraryMatch(unittest.TestCase):
    def test_positive_common_component(self):
        rc, out, err = run(['component-library-match', 'Accordion'])
        self.assertEqual(rc, 0, err)
        data = parse_json_out(out)
        self.assertGreater(data['count'], 0)
        # Top result should have highest match score (component_name hit = 10)
        self.assertGreaterEqual(data['results'][0]['_match_score'], 10)

    def test_negative_no_match(self):
        rc, out, err = run(['component-library-match', 'NONEXISTENT_XYZZY_COMPONENT'])
        self.assertEqual(rc, 0, err)
        self.assertEqual(parse_json_out(out)['count'], 0)

    def test_edge_unicode(self):
        rc, out, err = run(['component-library-match', 'naïve'])
        self.assertEqual(rc, 0, err)
        self.assertIsNotNone(parse_json_out(out))


class TestRecognitionLog(unittest.TestCase):
    def test_positive_write(self):
        payload = {
            "run_id": SENTINEL_RUN_ID,
            "section_slug": "sgs-hero",
            "slot_name": ".sgs-hero__cta",
            "decision": "emit:sgs/button",
            "result": "success",
            "source_file": "convert.py",
            "source_line": 420,
        }
        rc, out, err = run(['recognition-log', '--write'], stdin_payload=payload)
        self.assertEqual(rc, 0, err)
        data = parse_json_out(out)
        self.assertEqual(data['status'], 'ok')
        self.assertEqual(data['table'], 'recognition_log')

    def test_write_requires_flag(self):
        """Plain 'recognition-log' without --write must error."""
        rc, _, err = run(['recognition-log'])
        # argparse will exit 2 because --write is required=True
        self.assertEqual(rc, 2)

    def test_write_with_special_chars(self):
        payload = {
            "run_id": SENTINEL_RUN_ID,
            "section_slug": "sgs-hero",
            "slot_name": ".sgs-hero__heading[data-foo=\"bar\"]",
            "decision": "emit",
            "result": "success — with em-dash and 'quotes' and \"doubles\"",
            "source_file": "x.py",
            "source_line": 1,
        }
        rc, out, err = run(['recognition-log', '--write'], stdin_payload=payload)
        self.assertEqual(rc, 0, err)

    def test_write_with_long_strings(self):
        payload = {
            "run_id": SENTINEL_RUN_ID,
            "section_slug": "sgs-hero",
            "slot_name": "x" * 4000,
            "decision": "y" * 2000,
            "result": "z" * 1000,
            "source_file": "x.py",
            "source_line": 1,
        }
        rc, out, err = run(['recognition-log', '--write'], stdin_payload=payload)
        self.assertEqual(rc, 0, err)


class TestEquivalentBlock(unittest.TestCase):
    """Spec 22 FR-22-8 — equivalent-block subcommand (shipped 2026-05-27).

    Wires wp-blocks.py to db_lookup.equivalent_block_for(). Validates positive
    + negative + edge cases for the FR-22-2.1 2-tier derivation + FR-22-2.2
    positive-allowlist role exclusion (D85).
    """
    def test_positive_tier_a_content_bearing(self):
        """Tier A direct join: product-card.description has role=text-content + canonical_slot=text → sgs/text."""
        rc, out, err = run(['equivalent-block', 'sgs/product-card', 'description'])
        self.assertEqual(rc, 0, f"stderr={err}")
        obj = parse_json_out(out)
        self.assertIsNotNone(obj)
        self.assertEqual(obj['equivalent_block'], 'sgs/text')
        self.assertEqual(obj['block_slug'], 'sgs/product-card')
        self.assertEqual(obj['attr_name'], 'description')

    def test_negative_styling_role_excluded(self):
        """FR-22-2.2 role-exclusion: hero.headlineFontSizeDesktop has role=typography → null."""
        rc, out, _ = run(['equivalent-block', 'sgs/hero', 'headlineFontSizeDesktop'])
        self.assertEqual(rc, 0)
        obj = parse_json_out(out)
        self.assertIsNone(obj['equivalent_block'])

    def test_negative_null_role_adversarial(self):
        """D85 / Rater A adversarial: cta-section.textTransform has canonical_slot='text' but role=NULL → null (was 'sgs/text' pre-fix)."""
        rc, out, _ = run(['equivalent-block', 'sgs/cta-section', 'textTransform'])
        self.assertEqual(rc, 0)
        obj = parse_json_out(out)
        self.assertIsNone(obj['equivalent_block'],
            "Positive-allowlist must close NULL-role hole. If this returns 'sgs/text' the role-exclusion regression has reverted.")

    def test_positive_tier_b_bem_element(self):
        """Tier B derivation: icon.iconSource has canonical_slot=icon + role=image-object (content-bearing) → sgs/icon."""
        rc, out, _ = run(['equivalent-block', 'sgs/icon', 'iconSource'])
        self.assertEqual(rc, 0)
        obj = parse_json_out(out)
        self.assertEqual(obj['equivalent_block'], 'sgs/icon')

    def test_negative_unknown_block(self):
        """Unknown block slug → null (no DB row matches)."""
        rc, out, _ = run(['equivalent-block', 'sgs/does-not-exist', 'anything'])
        self.assertEqual(rc, 0)
        obj = parse_json_out(out)
        self.assertIsNone(obj['equivalent_block'])

    def test_edge_hyphen_compound_attr(self):
        """Edge case: hyphen-compound attr names should not crash the parser."""
        rc, out, _ = run(['equivalent-block', 'sgs/hero', 'background-image'])
        self.assertEqual(rc, 0)
        obj = parse_json_out(out)
        # Result doesn't matter (likely null since DB attrs are camelCase); just no crash.
        self.assertIn('equivalent_block', obj)

    def test_missing_args_argparse_error(self):
        rc, _, _ = run(['equivalent-block'])
        self.assertEqual(rc, 2)


def cleanup_sentinel_rows():
    """Remove all test-injected rows from uimax."""
    if not UIMAX_DB.exists():
        return
    c = sqlite3.connect(str(UIMAX_DB))
    c.execute("DELETE FROM attribute_gap_candidates WHERE provenance = ?", (SENTINEL_PROVENANCE,))
    c.execute("DELETE FROM recognition_log WHERE clone_run_id = ?", (SENTINEL_RUN_ID,))
    c.commit()
    c.close()


if __name__ == '__main__':
    try:
        result = unittest.main(exit=False, verbosity=2).result
        failures = len(result.failures) + len(result.errors)
        sys.exit(0 if failures == 0 else 1)
    finally:
        cleanup_sentinel_rows()
