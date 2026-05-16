#!/usr/bin/env python3
"""Smoke test for P-PHASE9-4 — block-root supports lift.

Tests _lift_root_supports_to_style against three real-shape cases:
  1. sgs/info-box with padding + border-radius + background-color
  2. sgs/hero    with padding + color
  3. sgs/container with gap only

All three cases drive the function with realistic mockup CSS (long-hand sides
and shorthand) and assert that the resulting `style` dict matches the WP
block-attributes JSON shape that the editor expects.

Run via: python -m converter_v2.test_root_supports_lift
       or python plugins/sgs-blocks/scripts/orchestrator/converter_v2/test_root_supports_lift.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from bs4 import BeautifulSoup

# Support both package and direct-script execution
try:
    from . import convert  # type: ignore
    from . import db_lookup as db  # type: ignore  # noqa: F401
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent))
    import convert  # type: ignore[no-redef]
    import db_lookup as db  # type: ignore[no-redef]  # noqa: F401

sys.stdout.reconfigure(encoding="utf-8")


def _parse_html_node(html: str):
    soup = BeautifulSoup(html, "html.parser")
    # Return the first element (skip a wrapping body added by html.parser)
    el = soup.find(True)
    return el


def _check(label: str, actual: dict, expected: dict, failures: list) -> None:
    """Recursive deep-equal check; collects mismatches into `failures`."""
    for key, want in expected.items():
        got = actual.get(key)
        if isinstance(want, dict):
            if not isinstance(got, dict):
                failures.append(f"  {label}.{key}: expected dict, got {type(got).__name__}: {got!r}")
                continue
            _check(f"{label}.{key}", got, want, failures)
        else:
            if got != want:
                failures.append(f"  {label}.{key}: expected {want!r}, got {got!r}")


def case_info_box() -> tuple[str, list[str]]:
    """sgs/info-box with padding shorthand + border-radius + background-color."""
    html = '<div class="sgs-info-box"></div>'
    css_rules = {
        ".sgs-info-box": {
            "background-color": "#FFFFFF",
            "border-radius":    "12px",
            "padding":          "22px 16px",
            "border-width":     "1px",
            "border-style":     "solid",
            "border-color":     "var(--border-subtle)",
        }
    }
    node = _parse_html_node(html)
    attrs: dict = {}
    convert._lift_root_supports_to_style(node, "sgs/info-box", css_rules, attrs)
    expected_style = {
        "spacing": {
            "padding": {
                "top": "22px", "right": "16px", "bottom": "22px", "left": "16px",
            },
        },
        "border": {
            "radius": "12px",
            "width":  "1px",
            "style":  "solid",
            "color":  "var:preset|color|border-subtle",
        },
        "color": {
            "background": "#FFFFFF",
        },
    }
    failures: list[str] = []
    if "style" not in attrs:
        failures.append("  info-box: no `style` key set on attrs")
    else:
        _check("info-box.style", attrs["style"], expected_style, failures)
    return "case_info_box", failures


def case_hero() -> tuple[str, list[str]]:
    """sgs/hero with padding long-hand sides + text colour."""
    html = '<section class="sgs-hero"></section>'
    css_rules = {
        ".sgs-hero": {
            "padding-top":    "120px",
            "padding-bottom": "80px",
            "color":          "var(--text-inverse)",
        }
    }
    node = _parse_html_node(html)
    attrs: dict = {}
    convert._lift_root_supports_to_style(node, "sgs/hero", css_rules, attrs)
    expected_style = {
        "spacing": {
            "padding": {"top": "120px", "bottom": "80px"},
        },
        "color": {"text": "var:preset|color|text-inverse"},
    }
    failures: list[str] = []
    if "style" not in attrs:
        failures.append("  hero: no `style` key set on attrs")
    else:
        _check("hero.style", attrs["style"], expected_style, failures)
    return "case_hero", failures


def case_container_gap() -> tuple[str, list[str]]:
    """sgs/container with gap only (blockGap support gate)."""
    html = '<div class="sgs-container"></div>'
    css_rules = {
        ".sgs-container": {
            "gap": "24px",
        }
    }
    node = _parse_html_node(html)
    attrs: dict = {}
    convert._lift_root_supports_to_style(node, "sgs/container", css_rules, attrs)
    expected_style = {
        "spacing": {"blockGap": "24px"},
    }
    failures: list[str] = []
    if "style" not in attrs:
        failures.append("  container: no `style` key set on attrs")
    else:
        _check("container.style", attrs["style"], expected_style, failures)
    return "case_container_gap", failures


def main() -> int:
    cases = [case_info_box(), case_hero(), case_container_gap()]
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
