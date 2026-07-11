"""attr_resolve — name-free (block, layer, property) → attr resolution (design §3.1).

Wraps db_lookup.attr_for_layer_property (the vetted per-block layer→attr resolver,
db_lookup.py:2400) — NAME resolution only; the value transfer is the resolver's job.

MF-4 (≥2-candidate ambiguity, design §3.1 / D-C): enforced GLOBALLY and report-only
by F6 (db-consistency/check_routing.py #1, which runs resolver_bridge.enumerate_candidates
over EVERY (block, css_property, writer_path) and is wired into prebuild + the commit
gate, baseline 0 today). attr_for_layer_property returns the first-by-rowid candidate —
identical to the live resolver — so re-running the ambiguity check here would duplicate
F6's logic (the drift trap). The full (block, layer, property) identity F6 keys on is a
superset of the slice's need; no per-call re-check is added.

D307 OUTER fallback (2026-07-11): attr_for_layer_property's suffix-based name-build
derives an OUTER candidate as ``suffix[0].lower() + suffix[1:]`` off the
``property_suffixes`` suffix column (e.g. ``background-color`` -> suffix
``BackgroundColour`` -> candidate ``backgroundColour``) and checks that EXACT string
against ``block_attributes``. A block whose own colour/border attr is declared with a
DIFFERENT camelCase shape than the suffix-derived guess (rare, but real — the suffix
table's ``BackgroundColour``/``BorderColour``/``BorderWidth``/``BorderStyle`` rows do
correctly lower-case the first letter, so this is not the general case; the concrete
gap is when the block's declared attr requires the COLUMN-first route in
``attr_for_property``, e.g. via ``declared_attrs_for_css_property``, which the layer
resolver's suffix loop never consults) returns None from ``attr_for_layer_property``
even though ``db_lookup.attr_for_property(block, css_property)`` resolves the SAME
(block, css_property) to a REAL attr via its column-first + suffix-loop route
(FR-31-5.2/5.3). GROUND-TRUTH: source=db evidence=
``attr_for_layer_property('sgs/text','','background-color')`` = None,
``attr_for_layer_property('sgs/text','','border-color')`` = None,
``attr_for_layer_property('sgs/text','','border-width')`` = None,
``attr_for_layer_property('sgs/text','','border-style')`` = None, while
``attr_for_property('sgs/text','background-color')`` = ``('typography','backgroundColour','colour')``,
``attr_for_property('sgs/text','border-color')`` = ``('wrapper_css','borderColour','colour')``,
``attr_for_property('sgs/text','border-width')`` = ``('wrapper_css','borderWidth','string')``,
``attr_for_property('sgs/text','border-style')`` = ``('wrapper_css','borderStyle','string')``.

The fallback fires ONLY for the OUTER layer (CONTENT/GRID keep their existing
layer-prefixed-only behaviour unchanged — ``attr_for_property``'s resolved attr is a
FLAT, unprefixed name, which is semantically the OUTER shape; extending the fallback
to CONTENT/GRID would risk routing a prefixed-layer property onto an unrelated flat
attr) and ONLY when the primary lookup returned nothing — so there is never a choice
between two candidates (never a second ambiguous path, MF-4 stays satisfied: zero-
then-one, not one-of-two) — AND ONLY when the fallback's attr_name is verified to
exist on THIS block's real schema (``block_attrs`` membership), so an undeclared
property still returns None (additive, never invents a destination).
"""
from __future__ import annotations

from typing import Any

from converter.db.db_lookup import attr_for_layer_property, attr_for_property, block_attrs


def attr_resolve(ctx: Any, layer: str, css_property: str) -> str | None:
    """Return the block's actual attr for (layer, css_property), or None (→ gap)."""
    attr = attr_for_layer_property(ctx.block_slug, layer, css_property)
    if attr is not None:
        return attr

    # D307 fallback — OUTER layer only (see module docstring).
    if layer != "OUTER":
        return None

    resolved = attr_for_property(ctx.block_slug, css_property)
    if resolved is None:
        return None
    _writer_path, fallback_attr, _kind = resolved
    if fallback_attr in block_attrs(ctx.block_slug):
        return fallback_attr
    return None
