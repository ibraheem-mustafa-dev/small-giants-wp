"""Spec 48 FR-33-2 — a draft colour named for a status slot fills it; otherwise the framework value stays.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_status_slugs.py -q
"""
from __future__ import annotations

import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
PKG = HERE.parent
REPO = PKG.parents[3]
sys.path.insert(0, str(PKG))

import palette  # noqa: E402
import site_palette  # noqa: E402

FRAMEWORK = [e["slug"] for e in json.loads((REPO / "theme" / "sgs-theme" / "theme.json").read_text(encoding="utf-8"))
             ["settings"]["color"]["palette"]]


def test_the_token_vocabulary_is_the_framework_roster():
    assert set(FRAMEWORK) <= set(palette.BASELINE_SLUGS)


def test_a_token_named_for_a_status_slot_claims_it_by_name():
    trace: list = []
    pal = palette.build_palette({"info": "#1d4ed8", "error-light": "#fde8e8", "brand": "#123456"}, [], {}, trace)
    assert {e["slug"] for e in pal} >= {"info", "error-light", "brand"}
    reasons = {t["slug"]: t["reason"] for t in trace if t.get("kind") == "token"}
    assert reasons["info"].startswith("name-tiebreak") and reasons["error-light"].startswith("name-tiebreak")
    assert reasons["brand"].startswith("raw draft-token slug")


def test_readme_rows_named_error_or_info_fill_those_slots():
    for text, slug in (("Error  form validation", "error"), ("Danger  destructive actions", "error"),
                       ("Info  notices", "info")):
        kind, entry = site_palette._classify(text)
        assert kind == "role" and entry[1] == (slug,), (text, entry)
