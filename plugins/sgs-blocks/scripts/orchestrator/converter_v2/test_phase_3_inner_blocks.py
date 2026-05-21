#!/usr/bin/env python3
"""Phase 3 regression tests: _lift_inner_blocks DB-backed lookup.

Tests that the retired INNER_BLOCK_PATTERNS dict is correctly replaced by the
DB-backed _lift_inner_blocks(node, parent_slug) function.

Run with:
    cd plugins/sgs-blocks/scripts/orchestrator/converter_v2
    python -m pytest test_phase_3_inner_blocks.py -v

Requires:
    - sgs-framework.db seeded with Phase 0 + Phase 3 parent_block rows
    - BeautifulSoup4 installed
    - convert.py edited (Phase 3 changes applied)
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path
from io import StringIO

sys.stdout.reconfigure(encoding="utf-8")

from bs4 import BeautifulSoup, Tag

# Import the functions under test
from convert import _lift_inner_blocks, _lift_inner_block_attrs, set_trace, _TRACE


# ---------------------------------------------------------------------------
# Minimal stub trace that captures events — used for test_unseeded_slot
# ---------------------------------------------------------------------------
class _CapturingTrace:
    """Captures _trace() events for assertion in tests."""

    def __init__(self):
        self.events: list[dict] = []

    def event(self, stage: str, **kwargs) -> None:
        self.events.append({"stage": stage, **kwargs})

    def warnings(self) -> list[dict]:
        return [e for e in self.events if e.get("soft_failed")]


def _parse(html: str) -> Tag:
    """Parse HTML fragment and return the first child Tag."""
    soup = BeautifulSoup(html, "html.parser")
    # Return the first actual Tag (not NavigableString)
    for child in soup.children:
        if isinstance(child, Tag):
            return child
    return soup


class TestHero2CTAs(unittest.TestCase):
    """test_hero_2_ctas: 2 .sgs-button elements -> 1 sgs/multi-button containing 2 sgs/button."""

    def test_hero_2_ctas(self):
        html = """
        <section class="sgs-hero">
          <a class="sgs-button sgs-button--primary" href="/shop/">Shop Now</a>
          <a class="sgs-button sgs-button--secondary" href="/about/">Learn More</a>
        </section>
        """
        node = _parse(html)
        result = _lift_inner_blocks(node, "sgs/hero")

        self.assertEqual(len(result), 1, f"Expected 1 wrapper block, got {len(result)}: {result}")
        wrapper = result[0]
        self.assertIn("wp:sgs/multi-button", wrapper,
                      "Should emit sgs/multi-button wrapper")
        # Self-closing format: <!-- wp:sgs/button {...} /--> — one occurrence per button
        button_count = wrapper.count("wp:sgs/button")
        self.assertEqual(button_count, 2,
                         f"Should contain 2 sgs/button markers, got {button_count}.\n{wrapper}")
        # Check label extraction — use json.loads to parse the attr JSON robustly
        import json as _json
        import re as _re
        btn_matches = _re.findall(r'wp:sgs/button\s+(\{[^}]+\})', wrapper)
        self.assertEqual(len(btn_matches), 2, f"Expected 2 button attr blocks, got {len(btn_matches)}")
        btn1 = _json.loads(btn_matches[0])
        btn2 = _json.loads(btn_matches[1])
        self.assertEqual(btn1["label"], "Shop Now", "Should lift label from <a> text content")
        self.assertEqual(btn1["url"], "/shop/", "Should lift url from href")
        self.assertEqual(btn1["inheritStyle"], "primary", "Should map --primary to inheritStyle=primary")
        self.assertEqual(btn2["label"], "Learn More", "Second button label")
        self.assertEqual(btn2["inheritStyle"], "secondary", "Should map --secondary to inheritStyle=secondary")


class TestHero3CTAs(unittest.TestCase):
    """test_hero_3_ctas: 3 buttons -> 1 sgs/multi-button containing 3 sgs/button (no dropping)."""

    def test_hero_3_ctas(self):
        html = """
        <section class="sgs-hero">
          <a class="sgs-button sgs-button--primary" href="/shop/">Shop</a>
          <a class="sgs-button sgs-button--secondary" href="/about/">About</a>
          <a class="sgs-button sgs-button--ghost" href="/contact/">Contact</a>
        </section>
        """
        node = _parse(html)
        result = _lift_inner_blocks(node, "sgs/hero")

        self.assertEqual(len(result), 1, f"Expected 1 wrapper block, got {len(result)}")
        wrapper = result[0]
        self.assertIn("wp:sgs/multi-button", wrapper)

        # Self-closing format: <!-- wp:sgs/button {...} /--> — one occurrence per button
        button_count = wrapper.count("wp:sgs/button")
        self.assertEqual(button_count, 3,
                         f"Expected 3 sgs/button markers, found {button_count}.\n{wrapper}")

        # All labels must be present
        self.assertIn('"label":"Shop"', wrapper.replace(" ", ""))
        self.assertIn('"label":"About"', wrapper.replace(" ", ""))
        self.assertIn('"label":"Contact"', wrapper.replace(" ", ""))

        # ghost modifier
        self.assertIn('"inheritStyle":"ghost"', wrapper.replace(" ", ""))


class TestHero4CTAs(unittest.TestCase):
    """test_hero_4_ctas: 4 buttons -> 1 sgs/multi-button containing 4 sgs/button."""

    def test_hero_4_ctas(self):
        html = """
        <section class="sgs-hero">
          <a class="sgs-button sgs-button--primary" href="/a/">A</a>
          <a class="sgs-button sgs-button--secondary" href="/b/">B</a>
          <a class="sgs-button sgs-button--ghost" href="/c/">C</a>
          <a class="sgs-button sgs-button--outline" href="/d/">D</a>
        </section>
        """
        node = _parse(html)
        result = _lift_inner_blocks(node, "sgs/hero")

        self.assertEqual(len(result), 1, f"Expected 1 wrapper, got {len(result)}")
        wrapper = result[0]

        # Self-closing format: <!-- wp:sgs/button {...} /--> — one occurrence per button
        button_count = wrapper.count("wp:sgs/button")
        self.assertEqual(button_count, 4,
                         f"Expected 4 sgs/button markers, found {button_count}.\n{wrapper}")

        self.assertIn('"inheritStyle":"outline"', wrapper.replace(" ", ""))


class TestNoCTAs(unittest.TestCase):
    """test_no_ctas: hero with no buttons -> empty list returned, no error."""

    def test_no_ctas(self):
        html = """
        <section class="sgs-hero">
          <h1>Welcome</h1>
          <p>Some description here.</p>
        </section>
        """
        node = _parse(html)
        result = _lift_inner_blocks(node, "sgs/hero")

        # _lift_inner_blocks WILL find sgs/multi-button as a child of sgs/hero,
        # then look for .sgs-button grandchildren — finding none.
        # The function should return [] (no blocks emitted).
        self.assertIsInstance(result, list,
                              "Should return a list, not raise an exception")
        self.assertEqual(len(result), 0,
                         f"Expected empty list for hero with no buttons, got: {result}")


class TestUnseededSlot(unittest.TestCase):
    """test_unseeded_slot: block with no DB children -> WARNING logged + graceful empty return."""

    def test_unseeded_slot(self):
        # Use a block slug that has no parent_block entries in the DB.
        # sgs/cta-section has no children registered via parent_block.
        html = """
        <section class="sgs-cta-section">
          <a class="sgs-button sgs-button--primary" href="/go/">Go</a>
        </section>
        """
        node = _parse(html)

        # Bind a capturing trace so we can inspect events
        trace = _CapturingTrace()
        set_trace(trace, "test_unseeded_slot")

        try:
            result = _lift_inner_blocks(node, "sgs/cta-section")
        finally:
            set_trace(None)  # unbind trace after test

        # Should return empty list (no crash)
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 0,
                         f"Expected empty list for unseeded slot, got: {result}")

        # Should have fired a WARNING (soft_failed=True) trace event
        warnings = trace.warnings()
        self.assertGreater(
            len(warnings), 0,
            f"Expected at least one soft_failed WARNING trace event, got events: {trace.events}"
        )
        warning_stages = [w["stage"] for w in warnings]
        self.assertIn(
            "inner_blocks_no_children",
            warning_stages,
            f"Expected 'inner_blocks_no_children' warning stage. Got: {warning_stages}"
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
