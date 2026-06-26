"""test_recognition.py — Stage-2 recognise() correctness (real, not xfail).

Run from plugins/sgs-blocks/scripts:  python -m pytest converter/tests/test_recognition.py
Design ref: .claude/plans/2026-06-23-stage2-recognition-design.md §6 acceptance.
"""
from __future__ import annotations

import sqlite3

import pytest
from bs4 import BeautifulSoup

from converter.context import Recognition
from converter.models import GapOrigin
from converter.recognition import (build_ctx, recognise, unrecognised_gap,
                                    variant_attrs)


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


# -- named / composite (the canary hero, real markup) -----------------------

def test_named_hero_with_variant():
    node = _node('<section class="sgs-container sgs-hero sgs-hero--split sgs-hero--align-left wp-block-sgs-hero"></section>')
    rec = recognise(node)
    assert rec.kind == "named"
    assert rec.slug == "sgs/hero"
    assert rec.variant_attr == "variant"
    assert rec.variant_value == "split"          # BEM modifier matched variant_slots
    assert rec.container_kind == "section"
    assert rec.has_inner_blocks == 1
    assert variant_attrs(rec) == {"variant": "split"}


def test_named_emits_as_the_composite_not_container():
    # The whole point of Method-2: a .sgs-hero is sgs/hero, NOT a generic sgs/container.
    rec = recognise(_node('<section class="sgs-hero"></section>'))
    assert rec.slug == "sgs/hero"
    assert rec.slug != "sgs/container"


# -- atomic-tag --------------------------------------------------------------

def test_atomic_h1_to_heading():
    rec = recognise(_node("<h1>Hello</h1>"))
    assert rec.kind == "atomic"
    assert rec.slug == "sgs/heading"
    assert rec.has_inner_blocks == 0       # a leaf cannot host children


# -- unrecognised (the loud RED, never a silent container) -------------------

def test_unrecognised_bem_node():
    rec = recognise(_node('<div class="sgs-nonsense"></div>'))
    assert rec.kind == "unrecognised"
    assert rec.slug is None


def test_unrecognised_gap_is_loud_and_plain_english():
    gap = unrecognised_gap(_node('<div class="sgs-nonsense"></div>'))
    assert gap.origin is GapOrigin.UNRECOGNISED
    assert "sgs-nonsense" in gap.detail
    assert "flag to the developer" in gap.detail.lower()


# -- multi-root tie-break (design §1 fold-L — never source-order) ------------

def test_two_section_roots_tie_is_unrecognised():
    # sgs-hero + sgs-cta-section are BOTH container_kind='section' -> ambiguous -> loud.
    rec = recognise(_node('<section class="sgs-hero sgs-cta-section"></section>'))
    assert rec.kind == "unrecognised"


def test_section_outranks_lower_kind():
    # sgs-hero (section) beside a non-section registered root -> hero wins, not source order.
    rec = recognise(_node('<section class="sgs-button sgs-hero"></section>'))
    assert rec.slug == "sgs/hero"


# -- build_ctx adapter + the unrecognised guard ------------------------------

def test_build_ctx_for_named():
    node = _node('<section class="sgs-hero sgs-hero--split"></section>')
    ctx = build_ctx(recognise(node), node, is_root=True, conn=sqlite3.connect(":memory:"))
    assert ctx.block_slug == "sgs/hero"
    assert ctx.variant_value == "split"
    assert ctx.container_kind == "section"
    assert ctx.is_root is True


def test_build_ctx_rejects_unrecognised():
    node = _node('<div class="sgs-nonsense"></div>')
    with pytest.raises(ValueError):
        build_ctx(recognise(node), node, is_root=True, conn=sqlite3.connect(":memory:"))


# -- metamorphic: source-order permutation -> identical recognition ----------

def test_class_order_invariant():
    a = recognise(_node('<section class="sgs-hero sgs-hero--split alignfull"></section>'))
    b = recognise(_node('<section class="alignfull sgs-hero--split sgs-hero"></section>'))
    assert (a.slug, a.variant_value) == (b.slug, b.variant_value) == ("sgs/hero", "split")
