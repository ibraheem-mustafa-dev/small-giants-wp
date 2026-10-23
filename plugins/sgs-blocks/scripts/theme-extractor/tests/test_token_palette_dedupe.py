"""FR-33-1 token palette: a primitive literal beats a var() alias of the same value, and near-identical
colours (delta E <= 1) are one palette entry.

Run:  cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests/test_token_palette_dedupe.py -q
"""
from __future__ import annotations

import pathlib
import sys

PKG = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PKG))

import token_files  # noqa: E402


def _tokens(tmp_path: pathlib.Path, css: str) -> dict:
    (tmp_path / "tokens").mkdir()
    (tmp_path / "tokens" / "colors.css").write_text(css, encoding="utf-8")
    return token_files.read_token_files(tmp_path)


def test_the_primitive_literal_wins_over_an_alias_sorted_before_it(tmp_path):
    tokens = _tokens(tmp_path, ":root { --a-text: var(--z-ink); --z-ink: #141414; }")
    trace: list = []
    entries = token_files.palette_entries(tokens, {"#141414": {"uses": 3}}, {}, trace)
    assert [e["slug"] for e in entries] == ["custom-z-ink"]
    assert any(r.get("what") == "tokens/*.css --a-text" and "alias" in r["reason"] for r in trace)


def test_two_used_tokens_within_delta_e_1_are_one_entry(tmp_path):
    tokens = _tokens(tmp_path, ":root { --brand: #0A7EA8; --brand-soft: #0A7EA9; --other: #C0392B; }")
    census = {"#0A7EA8": {"uses": 2}, "#0A7EA9": {"uses": 1}, "#C0392B": {"uses": 1}}
    entries = token_files.palette_entries(tokens, census, {}, [])
    assert [e["slug"] for e in entries] == ["custom-brand", "custom-other"]


def test_a_token_within_delta_e_1_of_a_held_palette_entry_is_an_alias(tmp_path):
    tokens = _tokens(tmp_path, ":root { --ink: #141415; }")
    trace: list = []
    entries = token_files.palette_entries(tokens, {"#141415": {"uses": 1}}, {}, trace, held=["#141414"])
    assert entries == []
    assert any("alias" in r.get("reason", "") for r in trace)
