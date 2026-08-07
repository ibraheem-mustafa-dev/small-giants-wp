"""test_subheading_routes_to_heading_role.py — a draft subheading is a HEADING.

THE DEFECT
    A draft ``__subheading`` clones to ``sgs/text``. Measured on the live pipeline
    before the change:

        <p class="sgs-hero__subheading">Made fresh weekly</p>
          ->  <!-- wp:sgs/text {"text":"Made fresh weekly"} /-->

    The BLOCK was ready all along: ``sgs/heading`` declares a ``headingRole`` attr
    and ``render.php:94`` accepts ``'heading'`` or ``'subheading'``. Only the
    ROUTING was missing — the ``subheading`` slots row carried
    ``standalone_block = 'sgs/text'`` with ``standalone_block_default_attrs`` NULL,
    and the sole mention of ``headingRole`` in the entire converter was a docstring
    at ``db/db_lookup.py:3529``.

WHY THE DEFAULT_ATTRS COULD NEVER ARRIVE
    ``slots.standalone_block_default_attrs`` exists and is populated for four other
    slots, but the ELEMENT-keyed reader ``slot_default_attrs_for()`` was deleted
    2026-08-02 as having zero callers. The surviving route is MODIFIER-keyed
    (``preset_style_for_element`` -> ``inherit_style_for_modifier``) and hard-reads
    only ``hit.get("inheritStyle")``, so it can never return ``headingRole``. A
    subheading is an ELEMENT, not a modifier — the two keying models are genuinely
    different lookups, which is why the element-keyed reader is RESTORED here rather
    than the modifier-keyed one being widened to serve both.

SEEDING
    THE DATABASE IS NOT RESEEDED BY THIS CHANGE — the slots row only moves on the
    next ``/sgs-update``. These tests therefore compose the SEEDER's declared value
    (``uimax-tools/seed-slot-synonyms.py``, the source of truth) over the LIVE DB
    rows, exactly as ``test_testimonial_scalar_lift_fields.py`` composes the
    attr-classification overrides. Reading the value from the seeder rather than
    retyping it here means the test cannot drift from what /sgs-update will write.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_subheading_routes_to_heading_role.py -q
"""
from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from converter.db import db_lookup
from converter.recognition import recognise_section
from converter.services.extraction import build_block_markup

_SEEDER = (
    Path(__file__).resolve().parents[2] / "uimax-tools" / "seed-slot-synonyms.py"
)

# Bound at import time, BEFORE any monkeypatch — reading these off the module inside
# a fixture would re-enter whatever patched them and recurse forever.
_REAL_STANDALONE = db_lookup._slot_alias_to_standalone
_REAL_DEFAULT_ATTRS = db_lookup._slot_alias_to_default_attrs

_SLOT = "subheading"

_HTML = (
    '<section class="sgs-hero">'
    '<h1 class="sgs-hero__heading">Big flavours</h1>'
    '<p class="sgs-hero__subheading">Made fresh weekly</p>'
    "</section>"
)


def _load_seeder():
    """Import the hyphen-named seeder script as a module (no package path)."""
    spec = importlib.util.spec_from_file_location("_seed_slot_synonyms", _SEEDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _seeder_route(slot_name: str) -> tuple[str, dict]:
    """The (standalone_block, default_attrs) the SEEDER declares for a slot.

    Fails loudly rather than silently skipping — a missing row would make every
    assertion below vacuous, which is the failure mode this project has already
    been bitten by twice (`negative-control-or-the-test-is-vacuous`).
    """
    module = _load_seeder()
    overrides = getattr(module, "STANDALONE_ROUTE_OVERRIDES", [])
    for row in overrides:
        if row[0] == slot_name:
            return row[1], dict(row[2])
    raise AssertionError(
        f"seed-slot-synonyms.py declares no STANDALONE_ROUTE_OVERRIDES row for "
        f"{slot_name!r}. The seeder is the source of truth for this routing; "
        f"without that row these tests assert nothing."
    )


def _patch_routing(monkeypatch, block: str, default_attrs: dict) -> None:
    """Compose one slot's route over the LIVE DB maps (post-/sgs-update state)."""
    standalone = dict(_REAL_STANDALONE())
    standalone[_SLOT] = block

    defaults = dict(_REAL_DEFAULT_ATTRS())
    if default_attrs:
        defaults[_SLOT] = default_attrs
    else:
        defaults.pop(_SLOT, None)

    monkeypatch.setattr(db_lookup, "_slot_alias_to_standalone", lambda: standalone)
    monkeypatch.setattr(db_lookup, "_slot_alias_to_default_attrs", lambda: defaults)
    # Both maps sit behind lru_caches keyed on the CLASS TUPLE, not on the maps —
    # a stale entry would serve the pre-patch route and quietly void the test.
    db_lookup._resolve_slug_from_bem_tuple.cache_clear()


@pytest.fixture
def seeded(monkeypatch):
    """Route `subheading` exactly as the seeder declares it."""
    block, default_attrs = _seeder_route(_SLOT)
    _patch_routing(monkeypatch, block, default_attrs)
    return block


@pytest.fixture
def seeded_without_default_attrs(monkeypatch):
    """Negative control: the seeder's BLOCK, but its default_attrs blanked."""
    block, _ = _seeder_route(_SLOT)
    _patch_routing(monkeypatch, block, {})
    return block


def _child_blocks(markup: str) -> list[tuple[str, dict]]:
    """Every (slug, attrs) pair in the emitted markup, in document order."""
    out: list[tuple[str, dict]] = []
    for slug, raw in re.findall(r"wp:(sgs/[a-z0-9-]+)\s*(\{.*?\})?\s*/?-->", markup):
        out.append((slug, json.loads(raw) if raw else {}))
    return out


def _convert() -> str:
    node = BeautifulSoup(_HTML, "html.parser").find(True)
    return build_block_markup(recognise_section(node), node, media_map={}, css_rules={})


# --- (a) the fix ---------------------------------------------------------------


def test_subheading_emits_heading_block_with_subheading_role(seeded):
    """The draft subheading clones to sgs/heading carrying headingRole."""
    blocks = dict(_child_blocks(_convert()))

    assert seeded in blocks, (
        f"the subheading should route to {seeded}; emitted {sorted(blocks)}"
    )
    assert blocks[seeded].get("headingRole") == "subheading"


def test_subheading_content_survives_the_reroute(seeded):
    """Rerouting must not cost the text — the whole point is a faithful clone."""
    assert "Made fresh weekly" in _convert()


def test_subheading_no_longer_emits_the_default_text_block(seeded):
    """The old destination is gone, so the reroute is real rather than additive."""
    markup = _convert()
    assert '"text":"Made fresh weekly"' not in markup


# --- (b) regression guard: the element route must not shadow the modifier route -


def test_ghost_modifier_still_resolves_to_outline():
    """A ``--ghost`` button keeps resolving through the MODIFIER-keyed channel.

    The restored reader is ELEMENT-keyed. If it had been implemented by widening
    ``inherit_style_for_modifier`` instead, one function would carry two keying
    models and this is where that would show. Companion to
    ``test_inherit_style_modifier.py``, which must stay green.
    """
    assert db_lookup.inherit_style_for_modifier("ghost", "sgs/button") == "outline"


def test_button_ghost_modifier_still_emits_inherit_style_outline(seeded):
    """End-to-end: the modifier route survives WITH the element route active."""
    # The button must sit inside a section that emits it as a CHILD block. A bare
    # leaf root trips the FR-31-4 empty-container conservation check, and a hero
    # root absorbs its CTA into the composite's own attrs — neither reaches step 5.
    # An unregistered section class recognises as the default sgs/container, whose
    # children recurse through build_block_markup individually.
    html = (
        '<section class="sgs-promo-strip">'
        '<p class="sgs-promo-strip__text">Order for the week ahead.</p>'
        '<a class="sgs-button sgs-button--ghost" href="/menu">See the menu</a>'
        "</section>"
    )
    node = BeautifulSoup(html, "html.parser").find(True)
    markup = build_block_markup(
        recognise_section(node), node, media_map={}, css_rules={}
    )
    assert '"inheritStyle":"outline"' in markup, markup


# --- (c) negative control: blank the seeded value and the fix disappears --------


def test_negative_control_without_default_attrs_heading_role_is_absent(
    seeded_without_default_attrs,
):
    """Proves headingRole comes from the SEEDED default_attrs, not from anywhere else.

    With ``standalone_block_default_attrs`` blank the block still routes to
    sgs/heading — so this control is about the DEFAULT ATTRS specifically, not
    about the routing — and ``headingRole`` must be absent.
    """
    blocks = dict(_child_blocks(_convert()))

    assert seeded_without_default_attrs in blocks, (
        "routing must still hold — otherwise this control tests the wrong thing"
    )
    assert "headingRole" not in blocks[seeded_without_default_attrs]
