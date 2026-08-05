"""test_self_nest_guard.py — P-QUOTE-PATH2-SELF-NESTING (2026-07-25, Bean-directed).

Two coupled defences, both universal (R-31-1/R-31-9), verified here so the
self-nest footgun can never silently return:

1. RECOGNITION self-nest guard (`db_lookup._resolve_slug_from_bem_tuple`, Path 2).
   A block can NEVER recognise its own UNRECOGNISED child element as a fresh copy
   of itself. Every block's short slug is registered as an element-scope slot
   pointing at itself, so a miss on the element name used to fall through to the
   block-segment lookup and self-resolve — e.g. `sgs-quote__<unknown>` → sgs/quote
   → a quote nested inside a quote. Confirmed latent (pre-fix) for heading / label
   / media / button / icon / tab / testimonial / option-picker / accordion-item /
   quote. The guard refuses any match resolving to the element's OWN parent block,
   so the node falls to pass-through (FR-31-11 / FR-31-4.1) — content preserved.

2. GENERIC-path transparent-wrapper DISSOLVE (`extraction._route_generic_child`).
   A slug-None `__inner`/`__body`/`__content` shell inside a GENERIC InnerBlocks
   composite (tabs / accordion / form / modal / …) must DISSOLVE: its CSS folds up
   and its children recurse IN as direct children — never gapped as one opaque
   column that drops everything inside it (the sgs/tab `__inner > __content` text
   drop). Mirrors the section-kind branch's descent; recursive for nested chains.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_self_nest_guard.py -q --import-mode=importlib
"""

from __future__ import annotations

import pytest

from converter.db import db_lookup
from converter.db.db_lookup import resolve_slug_from_bem

# The blocks whose short slug == an element-scope slot with standalone_block ==
# itself — the full latent-self-nest roster proven on 2026-07-25.
_SELF_NAMED_BLOCKS = [
    "heading", "label", "media", "button", "icon",
    "tab", "testimonial", "option-picker", "accordion-item", "quote",
]


@pytest.mark.parametrize("block", _SELF_NAMED_BLOCKS)
def test_unrecognised_child_never_self_nests(block: str):
    """An UNRECOGNISED child element of a self-named block must resolve to None
    (safe pass-through), NEVER to the block's own slug (a self-nest)."""
    result = resolve_slug_from_bem([f"sgs-{block}__zzunrecognised"])
    assert result != f"sgs/{block}", (
        f"sgs-{block}__zzunrecognised self-nested to sgs/{block} — the Path-2 "
        "block-segment fallback resolved a block's own unrecognised child to itself"
    )
    assert result is None, (
        f"an unrecognised child of sgs/{block} must be a pass-through no-match "
        f"(None), got {result!r}"
    )


def test_cross_block_element_fallback_still_resolves():
    """The guard is SELF-nest-only — a genuine CROSS-block element fallback
    (element of block A resolving to a DIFFERENT block B) is untouched."""
    # `panel`/`card` are element-scope slots pointing at sgs/info-box (not the
    # parent block), so they must still resolve — zero collateral from the guard.
    assert resolve_slug_from_bem(["sgs-modal__panel"]) == "sgs/info-box"
    assert resolve_slug_from_bem(["sgs-x__card"]) == "sgs/info-box"


def test_bare_block_root_unaffected():
    """Path 1 (bare block-root recognition) is untouched by the Path-2 guard."""
    assert resolve_slug_from_bem(["sgs-quote"]) == "sgs/quote"
    assert resolve_slug_from_bem(["sgs-tab"]) == "sgs/tab"


def test_self_nest_skip_is_traced():
    """A refused self-nest emits the loud `bem_resolve_self_nest_skipped` trace —
    the decision is visible, never silent."""
    events: list[dict] = []
    orig = db_lookup._trace
    db_lookup._trace = lambda stage, **kw: events.append({"stage": stage, **kw})
    try:
        db_lookup._resolve_slug_from_bem_tuple.cache_clear()
        resolve_slug_from_bem(["sgs-quote__zzunrecognised"])
    finally:
        db_lookup._trace = orig
    assert any(e["stage"] == "bem_resolve_self_nest_skipped" for e in events), (
        "a refused self-nest must emit the bem_resolve_self_nest_skipped trace"
    )


def test_generic_wrapper_dissolve_preserves_content():
    """A transparent `__inner` wrapper inside a generic composite dissolves and
    its text child survives (the sgs/tab content-drop regression)."""
    from tests.test_converter_conformance import _reproduce_golden_result

    markup = _reproduce_golden_result("sgs-tab").get("block_markup", "")
    # The ROOT identity: `sgs/tab` is blocks.tier='block', not 'class-section', so the
    # FR-31-16 section-root capability gate (recognition.py:239-247, commit `2b5a6b64`)
    # dissolves it to sgs/container — Bean ruled that dissolve CORRECT in the gate commit.
    # This test predates the gate; what it actually guards is the CONTENT surviving the
    # dissolve, asserted separately below. Split from a composite assert 2026-08-05 so a
    # failure names which condition broke instead of hiding three behind one `and`.
    assert "sgs/container" in markup, "the tab root did not dissolve to a container"
    # __inner dissolved → its max-width folded up to the root's contentWidth …
    assert "contentWidth" in markup, "the __inner max-width fold-up was lost"
    # … and its __content <p> survived as a sgs/text child (was silently dropped).
    assert "wp:sgs/text" in markup, "the tab body text child was dropped (not dissolved)"
    assert "individual tab panel" in markup, "the tab body TEXT itself was dropped"
