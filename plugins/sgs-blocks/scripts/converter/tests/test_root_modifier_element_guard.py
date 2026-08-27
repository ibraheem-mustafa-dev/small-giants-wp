"""test_root_modifier_element_guard.py — a block-root BEM modifier must never
route to a CHILD element's attribute (Task 1, converter bug (b)).

Confirmed live: a root-level BEM modifier (e.g. ``.sgs-product-card--trial``)
carrying a border/background declaration can land on a CHILD element's attr
(``ctaBorder*``) instead of the block's own root attr. Root cause, verified
against the live SGS DB (2026-08-27):

``db_lookup._base_domain_attrs_for_css_property`` (the column-first domain
restriction ``attr_for_property`` uses) admits a row into the "root/self
domain" via TWO conditions OR'd together:

    (css_element IS NULL OR css_element IN ('', 'root', 'self'))
    OR (css_layer = 'OUTER')

The second arm has NO accompanying ``css_element`` check — ANY attr tagged
``css_layer='OUTER'``, even one explicitly scoped to a non-root child element
(``css_element='overlay'``/``'cta'``/etc.), passes the "root domain" filter.
This is the exact gap the brief names: "the ``css_element`` guard exists only
on the ``css_layer='OUTER'`` query" — that guard lives in the SIBLING function
``declared_attrs_for_css_property`` (used by ``attr_for_layer_property``, which
correctly ANDs ``css_layer='OUTER'`` with a root-domain ``css_element``
restriction, see its ``_outer_element_clause``); ``_base_domain_attrs_for_css_
property`` (feeding ``attr_for_property``'s column-first path, and therefore
the D307 OUTER fallback in ``attr_resolve``) never got the same AND.

GROUND-TRUTH reproduction (verified live against the seeded DB, no synthetic
data): ``sgs/hero`` declares NO root-domain destination for the CSS property
``background-image`` — only child-scoped Gradient attrs exist:
``overlayGradient`` (css_element='overlay', css_layer='OUTER'),
``mediaBackgroundGradient`` (css_element='media', css_layer='GRID_AREA'),
``contentBackgroundGradient`` (css_element='content', css_layer='GRID_AREA').
Because ``overlayGradient`` carries ``css_layer='OUTER'``, the unguarded OR
clause admits it into the "root domain" even though its ``css_element`` is
``'overlay'`` (a named child), so ``attr_for_property('sgs/hero',
'background-image')`` incorrectly resolves to ``overlayGradient`` — the SAME
misrouting shape as the reported ``ctaBorder*`` case (a block-root
declaration landing on a child element's attr). The correct answer is None
(an honest gap): ``attr_for_layer_property('sgs/hero', 'OUTER',
'background-image')`` already proves this via its own (correctly guarded)
sibling query.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_root_modifier_element_guard.py -q
"""
from __future__ import annotations

import pytest

from converter.db import db_lookup

pytestmark = pytest.mark.skipif(
    not db_lookup.SGS_DB.exists(), reason="SGS DB absent — root-domain guard needs it"
)


def test_hero_background_image_does_not_misroute_to_overlay_child_attr():
    """A root-level declaration for a property with NO root-domain destination
    must gap (None), never resolve to a child-scoped attr just because that
    child attr happens to be tagged css_layer='OUTER'.

    sgs/hero's only 'background-image' destinations are all child-scoped
    (overlay/media/content) — none is root/self/wrapper. The OUTER-layer
    resolver already gets this right (proves the correct answer); the
    column-first path attr_for_property uses did not, before this fix.
    """
    assert db_lookup.attr_for_layer_property("sgs/hero", "OUTER", "background-image") is None, (
        "sanity check: the correctly-guarded OUTER-layer resolver must also see "
        "no root-domain destination for this property"
    )
    resolved = db_lookup.attr_for_property("sgs/hero", "background-image")
    assert resolved is None, (
        f"attr_for_property('sgs/hero', 'background-image') resolved to {resolved!r} — "
        "it must return None (honest gap), not a child-scoped attr such as "
        "'overlayGradient' (css_element='overlay'). A block-root declaration must "
        "never land on a CHILD element's attribute."
    )


def test_base_domain_helper_excludes_outer_tagged_child_element_attrs():
    """Direct unit check on the column-first domain restriction itself:
    css_layer='OUTER' alone must not admit a row whose css_element is a named
    child (e.g. 'overlay') — the OUTER-layer union must ALSO respect
    css_element, mirroring attr_for_layer_property's own OUTER guard."""
    declared = db_lookup._base_domain_attrs_for_css_property(
        "sgs/hero", "background-image"
    )
    assert "overlayGradient" not in declared, (
        f"_base_domain_attrs_for_css_property('sgs/hero', 'background-image') "
        f"returned {declared!r} — 'overlayGradient' is css_element='overlay' "
        "(a named child), not root/self/wrapper, and must not enter the "
        "root-resolver domain merely because it carries css_layer='OUTER'."
    )
    assert declared == ()


def test_product_card_own_border_attrs_still_resolve_correctly():
    """Regression guard: the fix must not disturb a genuine root-domain OUTER
    match. sgs/product-card's own border-color/-width/-style ARE root/wrapper
    attrs tagged css_layer='OUTER' and must keep resolving to themselves, not
    to the child 'cta'-scoped siblings (ctaColourBorder/ctaBorderWidth/
    ctaBorderStyle)."""
    for prop, expected_attr in (
        ("border-color", "borderColour"),
        ("border-width", "borderWidth"),
        ("border-style", "borderStyle"),
    ):
        resolved = db_lookup.attr_for_property("sgs/product-card", prop)
        assert resolved is not None, f"{prop} unexpectedly gapped on sgs/product-card"
        _writer_path, attr_name, _kind = resolved
        assert attr_name == expected_attr, (
            f"sgs/product-card {prop} resolved to {attr_name!r}, expected the "
            f"block's own root attr {expected_attr!r} (not a 'cta'-scoped child attr)"
        )
