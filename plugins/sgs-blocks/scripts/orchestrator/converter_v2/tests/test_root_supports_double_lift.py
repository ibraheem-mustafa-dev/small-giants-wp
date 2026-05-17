#!/usr/bin/env python3
"""Regression test for P-FR1-PLUS-GRID-DOUBLE-LIFT-REGRESSION (2026-05-17).

Scenario: a section root that is BOTH an FR1 block-root (has a bare SGS-BEM
class resolving to a registered block) AND has `display: grid` in its mockup
CSS (triggering css_driven_container).

`_lift_root_supports_to_style` is called from both branches:
  - FR1 path         → line ~2378 in convert.py
  - css_driven_container path → line ~2478 in convert.py

Both calls receive the SAME `attrs` dict.  `_set_in` has never-overwrite
semantics — the first write wins and subsequent passes must not clobber or
duplicate values.

This test exercises the never-overwrite contract end-to-end by calling
`_lift_root_supports_to_style` twice (simulating the double-lift) and
asserting that:

  1. `style` keys appear exactly once (no duplication).
  2. The values written by the FIRST call are unchanged after the SECOND call.
  3. No KeyError or unexpected mutation occurs.

Run via:
  python plugins/sgs-blocks/scripts/orchestrator/converter_v2/tests/test_root_supports_double_lift.py
"""
from __future__ import annotations

import copy
import sys
from pathlib import Path

from bs4 import BeautifulSoup

# Support both package and direct-script execution.
try:
    from .. import convert  # type: ignore
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent.parent))
    import convert  # type: ignore[no-redef]

sys.stdout.reconfigure(encoding="utf-8")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_html_node(html: str):
    """Return the first Tag from an HTML fragment."""
    soup = BeautifulSoup(html, "html.parser")
    return soup.find(True)


def _deep_equal(a, b) -> bool:
    """Structural equality check for nested dicts / scalars."""
    if type(a) != type(b):
        return False
    if isinstance(a, dict):
        if set(a) != set(b):
            return False
        return all(_deep_equal(a[k], b[k]) for k in a)
    return a == b


# ---------------------------------------------------------------------------
# Test case
# ---------------------------------------------------------------------------

def case_fr1_plus_grid_double_lift() -> tuple[str, list[str]]:
    """FR1 block-root + display:grid — double lift must be idempotent.

    Mockup shape: a section with class `sgs-hero` (registered block → FR1
    path fires) that also has `display: grid` in its CSS (css_driven_container
    also fires).  Both paths call _lift_root_supports_to_style with the same
    `attrs` dict.

    Asserts:
      - After the first lift, `style` has the expected values.
      - After the second lift on the same attrs, values are UNCHANGED (first
        write wins — `_set_in` never-overwrite semantics hold).
      - Padding tuple has no duplication (not nested twice, not overwritten).
    """
    failures: list[str] = []

    html = '<section class="sgs-hero"></section>'
    # CSS that both FR1 and css_driven_container paths would see.
    css_rules = {
        ".sgs-hero": {
            "display":        "grid",
            "padding":        "80px 24px",
            "background-color": "var(--surface-alt)",
        }
    }
    node = _parse_html_node(html)

    # --- First lift (FR1 path) ---
    attrs: dict = {}
    convert._lift_root_supports_to_style(node, "sgs/hero", css_rules, attrs)

    if "style" not in attrs:
        failures.append("  double-lift: no `style` key after first lift — "
                        "check sgs/hero is in sgs-framework.db block_supports")
        return "case_fr1_plus_grid_double_lift", failures

    # Snapshot state after first lift — this is the authoritative version.
    snapshot_after_first: dict = copy.deepcopy(attrs["style"])

    # --- Second lift (css_driven_container path uses sgs/container slug) ---
    # In the real walker both calls receive the SAME attrs dict.  Simulate
    # that by passing the same `attrs` dict to a second call.  The slug may
    # differ (container path uses "sgs/container"); use the same slug here so
    # the supports gate cannot trivially differ — the idempotency claim is
    # about _set_in, not about which supports apply.
    convert._lift_root_supports_to_style(node, "sgs/hero", css_rules, attrs)

    state_after_second: dict = attrs["style"]

    if not _deep_equal(snapshot_after_first, state_after_second):
        failures.append(
            f"  double-lift: style dict changed after second call.\n"
            f"    after first:  {snapshot_after_first!r}\n"
            f"    after second: {state_after_second!r}"
        )

    # Confirm padding is a plain dict, not a doubly-nested structure.
    padding = (attrs.get("style", {})
                    .get("spacing", {})
                    .get("padding"))
    if padding is not None:
        if not isinstance(padding, dict):
            failures.append(
                f"  double-lift: padding should be a dict of sides, got {type(padding).__name__}: {padding!r}"
            )
        elif isinstance(padding.get("top"), dict):
            failures.append(
                f"  double-lift: padding.top is nested dict — double-lift created duplication: {padding!r}"
            )

    return "case_fr1_plus_grid_double_lift", failures


def case_set_in_never_overwrite_direct() -> tuple[str, list[str]]:
    """Direct unit test of _set_in never-overwrite semantics.

    Calls _set_in twice with the same path; verifies the first value is
    preserved.  This is the lowest-level contract the double-lift relies on.
    """
    failures: list[str] = []

    target: dict = {}

    # First write — must succeed.
    convert._set_in(target, ["style", "spacing", "padding", "top"], "80px")
    got_first = target["style"]["spacing"]["padding"]["top"]
    if got_first != "80px":
        failures.append(f"  _set_in: first write expected '80px', got {got_first!r}")

    # Second write with a different value — must NOT overwrite.
    convert._set_in(target, ["style", "spacing", "padding", "top"], "999px")
    got_second = target["style"]["spacing"]["padding"]["top"]
    if got_second != "80px":
        failures.append(
            f"  _set_in: never-overwrite violated — expected '80px' after second write, got {got_second!r}"
        )

    return "case_set_in_never_overwrite_direct", failures


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def main() -> int:
    cases = [
        case_set_in_never_overwrite_direct(),
        case_fr1_plus_grid_double_lift(),
    ]
    any_failed = False
    for label, failures in cases:
        if failures:
            any_failed = True
            print(f"FAIL {label}")
            for f in failures:
                print(f)
        else:
            print(f"PASS {label}")
    return 1 if any_failed else 0


if __name__ == "__main__":
    sys.exit(main())
