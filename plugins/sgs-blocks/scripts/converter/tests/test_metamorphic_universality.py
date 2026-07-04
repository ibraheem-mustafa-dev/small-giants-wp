"""test_metamorphic_universality.py — the THREE metamorphic relations over the NEW
engine (EXECUTION Step 15 sub-task 3, §12.2 item 3).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_metamorphic_universality.py -q --import-mode=importlib

These are section-level relations exercised through the real, DB-backed new engine
(``converter.recognition.recognise`` / ``recognise_section`` + ``build_block_markup``),
NOT the frozen ``converter_v2/convert.py`` (that engine is named-only in
``oracle/metamorphic.py`` for the retired MR-2 subprocess harness — a different,
narrower relation kept for the frozen engine's own regression coverage).

Relations (task spec, all against small SYNTHETIC fixtures + real DB lookups):

  (a) source-order permutation — swap two sibling top-level sections in the DOM;
      each section's OWN ``build_block_markup`` output is unaffected by its
      sibling's position (recognition + CSS routing key on the node's own class
      + css_rules selector, never sibling order).

  (b) BEM-synonym rename — rename a child element's BEM class to a KNOWN ALIAS of
      the same canonical slot (from ``slots.aliases`` in the live DB — real DB
      lookup, never a hand-picked/guessed pair) → identical emitted markup
      (name-free routing, R-31-2).

  (c) px-scale-by-k — multiply every px value in the fixture's css_rules by k;
      every CSS-routed px value in the emitted attrs scales by k too (proven on
      sgs/container's maxWidth + padding, mirroring test_outer_box.py's
      single-resolver proof but through the full build_block_markup dispatch).

Where a relation cannot be exercised against the full pipeline (e.g. the DB has
no alias for the probed slot in a given environment), the test SKIPS WITH REASON
rather than silently passing or hard-failing (R-31-6 discipline extended to
metamorphic coverage).
"""
from __future__ import annotations

import re

import pytest
from bs4 import BeautifulSoup

from converter.db import db_lookup
from converter.recognition import recognise, recognise_section
from converter.services.extraction import build_block_markup


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


def _soup(html: str):
    return BeautifulSoup(html, "html.parser")


# ---------------------------------------------------------------------------
# (a) source-order permutation of two sibling sections → identical per-section
#     emits.
# ---------------------------------------------------------------------------

_SECTION_A_HTML = (
    '<section class="sgs-container" id="sec-a">'
    '  <div class="sgs-container__content">Section A content</div>'
    "</section>"
)
_SECTION_B_HTML = (
    '<section class="sgs-trust-bar" id="sec-b">'
    '  <div class="sgs-trust-bar__items"></div>'
    "</section>"
)

# Real css_rules keyed by selector (position-independent — the whole point of
# the relation): identical regardless of which section appears first in source.
_PERMUTATION_CSS_RULES = {
    ".sgs-container": {"max-width": "640px"},
}


def _build_wrapper(order: tuple[str, str]) -> BeautifulSoup:
    html = f'<div class="sgs-page">{order[0]}{order[1]}</div>'
    return _soup(html)


def _emit_for_id(soup: BeautifulSoup, node_id: str) -> str:
    node = soup.find(id=node_id)
    assert node is not None, f"fixture node #{node_id} missing from soup"
    rec = recognise_section(node)
    return build_block_markup(rec, node, css_rules=_PERMUTATION_CSS_RULES)


def test_metamorphic_source_order_permutation_sibling_sections():
    """Swap the two sibling sections' DOM order; each section's own emit is unchanged."""
    forward = _build_wrapper((_SECTION_A_HTML, _SECTION_B_HTML))
    reversed_order = _build_wrapper((_SECTION_B_HTML, _SECTION_A_HTML))

    a_forward = _emit_for_id(forward, "sec-a")
    b_forward = _emit_for_id(forward, "sec-b")
    a_reversed = _emit_for_id(reversed_order, "sec-a")
    b_reversed = _emit_for_id(reversed_order, "sec-b")

    assert a_forward == a_reversed, (
        "Section A's own emit changed when its sibling's source position changed "
        f"— name/position-free routing is broken.\nforward={a_forward!r}\n"
        f"reversed={a_reversed!r}"
    )
    assert b_forward == b_reversed, (
        "Section B's own emit changed when its sibling's source position changed.\n"
        f"forward={b_forward!r}\nreversed={b_reversed!r}"
    )
    # Sanity: the two sections are genuinely DIFFERENT blocks (not a vacuous pass
    # where both sides degenerate to the same unrecognised/empty output).
    assert "wp:sgs/container" in a_forward
    assert "wp:sgs/trust-bar" in b_forward


# ---------------------------------------------------------------------------
# (b) BEM-synonym rename → identical emit (name-free routing via slots.aliases).
# ---------------------------------------------------------------------------

def _first_slot_with_alias() -> tuple[str, str, str] | None:
    """Return (canonical_slot, alias, standalone_block) for the first DB slot
    that has both a standalone_block and at least one alias, or None.

    Queried live from the DB (never hardcoded — R-31-1); the exact slot/alias
    picked may vary by DB snapshot, which is fine — the relation is universal
    over ANY (slot, alias) pair with the same standalone_block.
    """
    import sqlite3

    conn = sqlite3.connect(db_lookup.SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slot_name, aliases, standalone_block FROM slots "
            "WHERE standalone_block IS NOT NULL "
            "AND aliases IS NOT NULL AND aliases != '' AND aliases != '[]'"
        ).fetchall()
    finally:
        conn.close()
    import json
    for slot_name, aliases_json, standalone_block in rows:
        try:
            aliases = json.loads(aliases_json)
        except (TypeError, ValueError):
            continue
        if isinstance(aliases, list) and aliases:
            # Prefer a hyphen/underscore-safe alias usable directly as a BEM token.
            for alias in aliases:
                if isinstance(alias, str) and re.match(r"^[a-zA-Z][a-zA-Z0-9-]*$", alias):
                    return slot_name, alias, standalone_block
    return None


def test_metamorphic_bem_synonym_rename_identical_emit():
    """Renaming a child's BEM element class to a real DB alias of the SAME slot
    produces an identical scalar-element-slot recognition (name-free routing)."""
    picked = _first_slot_with_alias()
    if picked is None:
        pytest.skip("No DB slot with both a standalone_block and an alias — MR-b uncovered this run.")
    canonical_slot, alias, standalone_block = picked

    # A generic <div> (not a naturally atomic-mapped tag) so the scalar
    # element-slot branch (recognition.py step 3) — the one slots.aliases
    # feeds — is actually exercised, not short-circuited by the atomic-tag path.
    canonical_html = f'<div class="sgs-hero__{canonical_slot}">Hi</div>'
    alias_html = f'<div class="sgs-hero__{alias}">Hi</div>'

    rec_canonical = recognise(_node(canonical_html))
    rec_alias = recognise(_node(alias_html))

    assert rec_canonical.slug == standalone_block, (
        f"canonical slot {canonical_slot!r} did not resolve to its own "
        f"standalone_block {standalone_block!r} (rec.slug={rec_canonical.slug!r}) — "
        "cannot assert the alias relation against a broken baseline."
    )
    assert rec_alias.slug == rec_canonical.slug, (
        f"BEM alias {alias!r} of slot {canonical_slot!r} resolved to a DIFFERENT "
        f"block ({rec_alias.slug!r}) than the canonical name ({rec_canonical.slug!r}) "
        "— name-free routing (R-31-2) is broken for this alias."
    )
    assert rec_alias.kind == rec_canonical.kind == "scalar"

    # is_root=False: this fixture is a nested/child element (scalar element-slot),
    # never a top-level section root — mirrors how the real walker always threads
    # is_root=False for descendants (assembly.py step 7 is an OUTER-only concern).
    markup_canonical = build_block_markup(rec_canonical, _node(canonical_html), css_rules={}, is_root=False)
    markup_alias = build_block_markup(rec_alias, _node(alias_html), css_rules={}, is_root=False)
    assert markup_canonical == markup_alias, (
        "Emitted markup differs between the canonical slot name and its DB alias "
        f"— canonical:\n{markup_canonical}\nalias:\n{markup_alias}"
    )


# ---------------------------------------------------------------------------
# (c) px-scale-by-k — every transferred px value scales by k.
# ---------------------------------------------------------------------------

_PX_RE = re.compile(r"^(-?\d+(?:\.\d+)?)px$")


def _scale_px(value: str, k: int) -> str:
    """Multiply every bare '<n>px' token in a CSS value string by k."""
    def _sub(m: "re.Match[str]") -> str:
        return f"{float(m.group(1)) * k:g}px"
    return re.sub(r"(-?\d+(?:\.\d+)?)px", _sub, value)


def _container_fixture():
    html = (
        '<section class="sgs-container">'
        '  <div class="sgs-container__content">Body</div>'
        "</section>"
    )
    return _node(html)


def test_metamorphic_px_scale_by_k_container_maxwidth_and_padding():
    """Scaling every px value in css_rules by k scales every transferred px
    output value by the same k (max-width→maxWidth, padding→style.spacing.padding).

    Mirrors test_outer_box.py's single-resolver px-scale proof, but through the
    FULL build_block_markup dispatch (recognise → CSS pass → content pass →
    emit), proving the relation holds end-to-end on the new engine, not just at
    the resolver unit.
    """
    k = 2
    base_css_rules = {".sgs-container": {"max-width": "600px", "padding": "80px 24px"}}
    scaled_css_rules = {
        sel: {prop: _scale_px(val, k) for prop, val in decls.items()}
        for sel, decls in base_css_rules.items()
    }
    assert scaled_css_rules == {".sgs-container": {"max-width": "1200px", "padding": "160px 48px"}}

    rec = recognise_section(_container_fixture())
    base_markup = build_block_markup(rec, _container_fixture(), css_rules=base_css_rules)
    scaled_markup = build_block_markup(rec, _container_fixture(), css_rules=scaled_css_rules)

    base_px = [int(m) for m in re.findall(r"(\d+)px", base_markup)]
    scaled_px = [int(m) for m in re.findall(r"(\d+)px", scaled_markup)]

    assert base_px, f"No px values found in base markup — fixture did not route: {base_markup}"
    assert len(base_px) == len(scaled_px), (
        f"Different number of px tokens between base and scaled emit — the scale "
        f"changed WHICH properties routed, not just their values.\n"
        f"base={base_markup}\nscaled={scaled_markup}"
    )
    for b, s in zip(base_px, scaled_px):
        assert s == b * k, (
            f"px value {b} did not scale by k={k} (got {s}) — "
            f"base={base_markup}\nscaled={scaled_markup}"
        )
