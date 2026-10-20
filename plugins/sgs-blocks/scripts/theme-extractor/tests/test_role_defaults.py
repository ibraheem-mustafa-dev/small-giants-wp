"""Spec 48 FR-33-2 — a framework slug the draft leaves unset follows the client's colours (role_defaults.py).

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_role_defaults.py -q

Browser-free: unit cases on a framework palette copy with a gold accent client's confirmed colours, plus
build_snapshot on the checked-in bakery-client draft and facts.
"""
from __future__ import annotations

import copy
import json
import pathlib
import re
import sys

import pytest

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
REPO = PKG.parents[3]
sys.path.insert(0, str(PKG))

import confirmed_palette as cp  # noqa: E402
import extract  # noqa: E402
import role_defaults  # noqa: E402
from palette_vocab import ROLE_DEFAULT_TABLE  # noqa: E402
from snapshot_palette_roster import contrast_ratio  # noqa: E402

BASELINE = json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
FRAMEWORK = cp.framework_slugs(BASELINE)
FRAMEWORK_HEX = {e["slug"]: e["color"].lower() for e in BASELINE["settings"]["color"]["palette"]}
DRAFT = REPO / "sites/mamas-munches/mockups/homepage/index.html"
FACTS = PKG / "mamas-computed-facts.json"

# A gold-accent client: the framework accent-text #92400E reads 4.21:1 on this accent.
GOLD = {"text": "#4a5563", "accent": "#d8ca50", "accent-light": "#e7d768", "section": "#d8ca50",
        "primary": "#0a7ea8", "surface": "#ffffff"}


def _gold_snapshot() -> dict:
    snap = {"settings": {"color": {"palette": copy.deepcopy(BASELINE["settings"]["color"]["palette"])}}}
    confirmed = {slug: {"hex": hexv, "tokens": [f"--{slug}"]} for slug, hexv in GOLD.items()}
    return cp.apply_confirmed(snap, confirmed, FRAMEWORK, [])


def _pal(snap: dict) -> dict[str, str]:
    return {e["slug"]: e["color"].lower() for e in snap["settings"]["color"]["palette"]}


def _assert_no_framework_hex_on_followed_slugs(pal: dict[str, str]) -> None:
    assert pal["accent-text"] == GOLD["text"]
    assert pal["section-text"] == GOLD["text"]
    assert pal["heading"] == GOLD["text"]
    assert pal["link"] == GOLD["primary"]


def test_unset_text_slugs_follow_the_client_text():
    trace: list = []
    pal = _pal(role_defaults.apply_role_defaults(_gold_snapshot(), BASELINE, trace))
    _assert_no_framework_hex_on_followed_slugs(pal)
    assert contrast_ratio(pal["accent-text"], pal["accent-light"]) >= 4.5
    assert contrast_ratio(pal["section-text"], pal["section"]) >= 4.5
    assert any(r.get("what") == "palette.accent-text" and "#92400E" in r["reason"] for r in trace)


def test_negative_control_without_role_defaults_the_framework_brown_stays():
    # MUST FAIL without apply_role_defaults: the framework file's #92400E stays on accent-text.
    pal = _pal(_gold_snapshot())
    assert pal["accent-text"] == FRAMEWORK_HEX["accent-text"]
    with pytest.raises(AssertionError):
        _assert_no_framework_hex_on_followed_slugs(pal)


def test_a_confirmed_or_draft_colour_wins_over_the_default():
    snap = _gold_snapshot()
    cp.apply_confirmed(snap, {"accent-text": {"hex": "#2c3e50", "tokens": ["--slate"]}}, FRAMEWORK, [])
    for entry in snap["settings"]["color"]["palette"]:
        if entry["slug"] == "section":
            entry.update(color="#123456", _source="declared")
    pal = _pal(role_defaults.apply_role_defaults(snap, BASELINE, []))
    assert pal["accent-text"] == "#2c3e50"
    assert pal["section"] == "#123456"


def test_a_followed_slug_still_on_the_framework_colour_changes_nothing():
    snap = {"settings": {"color": {"palette": copy.deepcopy(BASELINE["settings"]["color"]["palette"])}}}
    pal = _pal(role_defaults.apply_role_defaults(snap, BASELINE, []))
    assert pal == FRAMEWORK_HEX


def test_every_table_slug_and_its_source_are_framework_slugs():
    for slug, follows in ROLE_DEFAULT_TABLE:
        assert slug in FRAMEWORK and follows in FRAMEWORK, (slug, follows)


# ── build_snapshot on a real draft ─────────────────────────────────────────────────────────────────
def test_build_snapshot_puts_the_confirmed_text_on_accent_text_and_section_text():
    html = DRAFT.read_text(encoding="utf-8")
    css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.DOTALL))
    facts = json.loads(FACTS.read_text(encoding="utf-8"))
    confirmed = {"text": {"hex": "#3a2e26", "tokens": ["--text"]}}
    snap = extract.build_snapshot("bakery-client", css, facts, html, BASELINE, [], REPO, confirmed=confirmed)
    pal = _pal(snap)
    assert pal["accent-text"] == "#3a2e26"
    assert pal["section-text"] == "#3a2e26"


def test_a_slug_following_an_advisory_colour_is_advisory_and_restorable():
    snap = {"settings": {"color": {"palette": copy.deepcopy(BASELINE["settings"]["color"]["palette"])}}}
    for entry in snap["settings"]["color"]["palette"]:
        if entry["slug"] == "text":
            entry.update(color="#222222", _source="derived", advisory=True, _baseline_color=entry["color"])
    by_slug = {e["slug"]: e for e in role_defaults.apply_role_defaults(snap, BASELINE, [])["settings"]["color"]["palette"]}
    for slug in ("heading", "section-text", "accent-text"):
        assert by_slug[slug]["color"] == "#222222"
        assert by_slug[slug]["advisory"] is True
        assert by_slug[slug]["_baseline_color"].lower() == FRAMEWORK_HEX[slug]
