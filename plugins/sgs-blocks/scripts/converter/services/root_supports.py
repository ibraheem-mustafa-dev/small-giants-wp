"""root_supports.py — root-CSS-to-WP-native-style lift for the modular engine.

Ports ``_lift_root_supports_to_style`` (convert.py:774-956) and
``_root_lift_rules`` (convert.py:514-547) from the frozen engine into the new
converter service layer.

Public API
----------
    lift_root_supports_to_style(node, slug, css_rules, conn) -> tuple[dict, dict]

Returns ``(result_attrs, consumed)``:

  - ``result_attrs`` — a flat dict that may contain:
      - ``style``            — nested WP-style object (``style.spacing.padding.top``, etc.)
      - per-device custom attr keys (``paddingTopTablet``, ``paddingTopMobile``, etc.)
  - ``consumed`` — ``{tier: frozenset(css_property, ...)}`` (tier keys: ``"Base"``
    plus whatever bp_suffix strings appear in ``bp_decls``, e.g. ``"Tablet"``/
    ``"Mobile"``). A CSS property is a member of a tier's set ONLY when this
    function actually WROTE a destination for it at that tier (a style.* leaf
    at base, or a per-device custom attr for that bp tier). Membership in
    ``_root_lift_rules()``/the padding-margin shorthand list is NOT sufficient —
    the block's DB supports gate and the per-tier schema-attr gate can both
    cause an attempted property to go unconsumed even though it is lift-eligible.

STOP-43 council fix (2026-07-05): callers MUST partition the CSS decl list
using ``consumed``, NOT blanket membership in ``_LIFT_CSS_PROPS`` — the old
blanket strip silently dropped a property whenever the native lift ATTEMPTED
it but the supports/schema gate rejected it (e.g. ``color`` on a block with no
native color support but its own typography-resolver-backed colour attr;
``gap`` on a block with no ``blockGap`` support but a grid/outer_box gap
destination via ``attr_for_property``). ``background``/``border`` (the two
composite shorthands that only ever NORMALISE into other longhand properties —
see the base-tier normalisation block below) remain always-stripped
regardless of consumption — see ``_ALWAYS_STRIP_SHORTHANDS``; they were never
independently routable properties even before this fix (a CSS gradient
background, for example, is an intentionally-documented drop with no
destination — see the gradient gap-note below — not a routing bug).

Spec ref: Spec 31 §3.A native-style lift (root supports gate).
Port source lines: convert.py:514-547, 774-956.
No block-slug literals. No import from convert.py.
"""
from __future__ import annotations

import logging
import sqlite3
from typing import Any

from bs4 import Tag

from converter.db import db_lookup
from converter.services.styling_helpers import (
    collect_css_decls_for_element,
    strip_important,
    _colour_value_to_style,  # private but sibling module — internal use only
)

_LOG = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Root lift rules — faithful port of convert.py:514-547
#
# R-31-1 permitted-constant exception (WP-core schema): the style_path + supports
# keys below encode WordPress Core's serialised block-style schema (wp-includes/
# blocks/block-serialization-spec). This path structure is defined by WordPress,
# not by the SGS DB — there is no property_suffixes column for WP's nested
# style-object paths. The CSS→style_path transform is a deterministic WP-schema
# constant, not per-block lookup data.
#
# What IS DB-driven: which CSS properties a given block may receive is governed
# by db_lookup.block_supports_for(slug) queried at call-time. Only properties
# whose supports key is present in the block's DB record are actually written.
# ---------------------------------------------------------------------------

def _root_lift_rules() -> list[tuple[str, str, str, list[str], str]]:
    """Return canonical CSS-property → WP style.* mapping list.

    Each entry: (css_prop, supports_top, supports_sub, style_path, kind).

    ``kind`` is ``'unit'`` (preserved as-is) or ``'colour'`` (colour normaliser).
    Faithful port of convert.py:531-547.
    """
    return [
        ("padding-top",    "spacing",               "padding", ["spacing", "padding", "top"],    "unit"),
        ("padding-right",  "spacing",               "padding", ["spacing", "padding", "right"],  "unit"),
        ("padding-bottom", "spacing",               "padding", ["spacing", "padding", "bottom"], "unit"),
        ("padding-left",   "spacing",               "padding", ["spacing", "padding", "left"],   "unit"),
        ("margin-top",     "spacing",               "margin",  ["spacing", "margin", "top"],     "unit"),
        ("margin-right",   "spacing",               "margin",  ["spacing", "margin", "right"],   "unit"),
        ("margin-bottom",  "spacing",               "margin",  ["spacing", "margin", "bottom"],  "unit"),
        ("margin-left",    "spacing",               "margin",  ["spacing", "margin", "left"],    "unit"),
        ("gap",            "spacing",               "blockGap", ["spacing", "blockGap"],         "unit"),
        ("border-radius",  "__experimentalBorder",  "radius",  ["border", "radius"],             "unit"),
        ("border-width",   "__experimentalBorder",  "width",   ["border", "width"],              "unit"),
        ("border-style",   "__experimentalBorder",  "style",   ["border", "style"],              "unit"),
        ("border-color",   "__experimentalBorder",  "color",   ["border", "color"],              "colour"),
        ("background-color", "color",               "background", ["color", "background"],       "colour"),
        ("color",            "color",               "text",       ["color", "text"],             "colour"),
    ]


# The full set of CSS properties this lift MAY consume from the decl stream
# (lift-ELIGIBLE, not lift-GUARANTEED). Retained for documentation/back-compat;
# callers must NOT use blanket membership in this set to partition decls — see
# the ``consumed`` return value of ``lift_root_supports_to_style`` (STOP-43).
_LIFT_CSS_PROPS: frozenset[str] = frozenset(
    rule[0] for rule in _root_lift_rules()
) | frozenset(["padding", "margin", "background", "border"])

# The two composite shorthands that are NEVER independently routed — they exist
# purely as NORMALISATION SOURCES the base-tier block below expands into other
# longhand properties (background -> background-color; border -> border-width/
# -style/-color), each of which IS individually consumption-tracked. A raw
# `background`/`border` decl has no process_element destination of its own (a
# CSS gradient, for instance, is an intentionally-documented drop — see the
# gradient gap-note in the base-tier block), so these two remain unconditionally
# stripped from the decl stream regardless of whether normalisation succeeded —
# matching the pre-STOP-43 behaviour for these two shorthands only.
_ALWAYS_STRIP_SHORTHANDS: frozenset[str] = frozenset(["background", "border"])


# ---------------------------------------------------------------------------
# Private helpers — ported from convert.py (no frozen-engine import)
# ---------------------------------------------------------------------------

def _support_allows(supports: dict, top_key: str, sub_key: str | None = None) -> bool:
    """Return True when the block supports map allows the given property.

    Faithful port of convert.py:483-494.
    """
    if top_key not in supports:
        return False
    val = supports[top_key]
    if val is True:
        return True
    if isinstance(val, dict):
        if sub_key is None:
            return any(v is True for v in val.values())
        return bool(val.get(sub_key))
    return False


def _set_in(target: dict, path: list[str], value: Any) -> bool:
    """Set value at nested dict path; never overwrites an existing leaf.

    Faithful port of convert.py:497-511. Returns True iff a NEW leaf was
    written (STOP-43 addition — callers use this to build the per-tier
    ``consumed`` set; a no-op due to a non-dict node or an already-occupied
    leaf must NOT be counted as consumption).
    """
    cur = target
    for key in path[:-1]:
        nxt = cur.get(key)
        if not isinstance(nxt, dict):
            if nxt is not None:
                return False  # non-dict node already occupies this slot
            nxt = {}
            cur[key] = nxt
        cur = nxt
    leaf = path[-1]
    if leaf in cur:
        return False  # never overwrite
    cur[leaf] = value
    return True


def _preserve_unit(raw: str) -> str | None:
    """Return trimmed CSS value as-is for single dimension/literal.

    Faithful port of convert.py:475-480.
    """
    if not raw:
        return None
    v = raw.strip().rstrip(";")
    return v if v else None


def _parse_padding_shorthand(value: str) -> dict[str, str] | None:
    """Parse 'padding: 22px 16px' → {'top','right','bottom','left'}.

    Faithful port of convert.py:550-565.
    """
    if not value:
        return None
    parts = value.strip().split()
    if not parts or len(parts) > 4:
        return None
    if any("," in p for p in parts):
        return None
    if len(parts) == 1:
        return {"top": parts[0], "right": parts[0], "bottom": parts[0], "left": parts[0]}
    if len(parts) == 2:
        return {"top": parts[0], "right": parts[1], "bottom": parts[0], "left": parts[1]}
    if len(parts) == 3:
        return {"top": parts[0], "right": parts[1], "bottom": parts[2], "left": parts[1]}
    return {"top": parts[0], "right": parts[1], "bottom": parts[2], "left": parts[3]}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def lift_root_supports_to_style(
    node: Any,
    slug: str,
    css_rules: dict,
    conn: sqlite3.Connection,
) -> tuple[dict, dict[str, frozenset[str]]]:
    """Lift block-root CSS into WP native style.* attributes AND per-device custom attrs.

    PORT SOURCE:
      convert.py:774-956  (_lift_root_supports_to_style)
      convert.py:514-547  (_root_lift_rules)

    Steps:
      1. Reject non-SGS slugs early (guard: slug must start with 'sgs/').
      2. Query block_supports_for(slug) — the DB gate. Empty → return ({}, {}) (no-op).
      3. collect_css_decls_for_element → (base_decls, bp_decls).
      4. Both empty → return ({}, {}) (no-op).
      5. Base tier: normalise background/border shorthands, apply _root_lift_rules,
         expand padding/margin shorthands. Gradient backgrounds are DROPPED with a
         logged gap-note (no converter destination exists — see convert.py:826-844).
      6. Responsive tiers (bp_decls): for each breakpoint suffix, apply _root_lift_rules
         and build per-device attr names (e.g. 'paddingTopTablet'). Only emit when
         the attr is in the block schema (db_lookup.block_attrs).
      7. Return the assembled attrs dict + the per-tier consumed-property sets
         (STOP-43) — every property/shorthand that ACTUALLY landed a write is
         added to ``consumed["Base"]`` (base tier) or ``consumed[bp_suffix]``
         (a responsive tier), so the caller (``css_pass._build_css_attrs``) can
         partition the decl stream by what was truly consumed, not by lift-
         eligibility.

    Args:
        node:      BeautifulSoup Tag (or compatible) for the root element.
        slug:      Fully-qualified SGS block slug, e.g. 'sgs/container'.
        css_rules: Parsed CSS rule-set dict (selector → {prop: val}).
        conn:      Open SQLite connection to sgs-framework.db.

    Returns:
        ``(result_attrs, consumed)``:
          - ``result_attrs`` — a flat dict that may contain:
              - ``"style"`` → nested WP-style object
              - per-device custom attr keys (``paddingTopTablet``, etc.)
            ``{}`` when no supported properties were found.
          - ``consumed`` — ``{"Base": frozenset(...), bp_suffix: frozenset(...)}``
            of the CSS property/shorthand names actually written at each tier.
            ``{}`` on every early-return path (non-SGS slug, no supports, no decls).
    """
    # Guard: only SGS blocks have block_supports rows (convert.py:801-803).
    if not slug or not slug.startswith("sgs/"):
        return {}, {}

    # Gate 1: DB supports check — no supports → nothing to lift.
    supports = db_lookup.block_supports_for(slug)
    if not supports:
        return {}, {}

    # Collect CSS declarations for this node (base + @media tiers).
    base_decls, bp_decls = collect_css_decls_for_element(node, css_rules)

    if not base_decls and not bp_decls:
        return {}, {}

    result_attrs: dict = {}
    style: dict = {}

    # STOP-43: per-tier sets of CSS properties/shorthands this call ACTUALLY
    # wrote a destination for (never just "attempted" or "lift-eligible").
    consumed_base: set[str] = set()
    consumed_bp: dict[str, set[str]] = {}

    # -------------------------------------------------------------------------
    # BASE TIER — convert.py:813-880
    # -------------------------------------------------------------------------
    if base_decls:
        # Normalise background shorthand: extract colour when no gradient/url.
        # convert.py:815-844.
        if "background" in base_decls and "background-color" not in base_decls:
            bg = base_decls["background"].strip()
            if bg and "url(" not in bg and "gradient" not in bg:
                for tok in bg.split():
                    if tok in ("white", "black", "transparent"):
                        base_decls["background-color"] = tok
                        break
                    # extract_token_or_hex is the canonical checker; inline here to
                    # avoid importing _extract_token_or_hex (private to styling_helpers).
                    if tok.startswith("#") or tok.startswith("var("):
                        base_decls["background-color"] = tok
                        break
                else:
                    if len(bg.split()) == 1:
                        base_decls["background-color"] = bg
            elif bg and "gradient" in bg:
                # Fix #6 (convert.py:825-844): CSS gradient backgrounds have no
                # converter destination.  WP's style.color.gradient slot requires a
                # preset slug lookup unavailable at clone time.  DROP with trace note.
                _LOG.debug(
                    "[root_supports] gradient_background_gap slug=%s raw=%r — "
                    "CSS gradient background has no converter destination. "
                    "Gap candidate: add style.color.gradient to _root_lift_rules "
                    "when a gradient-slug resolver is available.",
                    slug, bg,
                )

        # Normalise border shorthand: expand to border-width/style/color.
        # convert.py:845-853.
        if "border" in base_decls and "border-width" not in base_decls:
            parts = base_decls["border"].strip().split()
            for tok in parts:
                if any(u in tok for u in ("px", "em", "rem", "pt")):
                    base_decls.setdefault("border-width", tok)
                elif tok in ("solid", "dashed", "dotted", "double", "none"):
                    base_decls.setdefault("border-style", tok)
                elif tok.startswith("#") or tok.startswith("var("):
                    base_decls.setdefault("border-color", tok)

        # Apply root lift rules — convert.py:855-866.
        for css_prop, sup_top, sup_sub, style_path, kind in _root_lift_rules():
            if css_prop not in base_decls:
                continue
            if not _support_allows(supports, sup_top, sup_sub if sup_sub != style_path[-1] else None):
                continue
            raw = strip_important(base_decls[css_prop])
            if kind == "colour":
                v = _colour_value_to_style(raw)
            else:
                v = _preserve_unit(raw)
            if v is not None:
                if _set_in(style, style_path, v):
                    consumed_base.add(css_prop)

        # Expand padding/margin shorthand to four sides — convert.py:867-876.
        for shorthand in ("padding", "margin"):
            if shorthand not in base_decls:
                continue
            if not _support_allows(supports, "spacing", shorthand):
                continue
            parsed = _parse_padding_shorthand(strip_important(base_decls[shorthand]))
            if parsed:
                for side, val in parsed.items():
                    if _set_in(style, ["spacing", shorthand, side], val):
                        consumed_base.add(shorthand)

    # Attach style dict to result (convert.py:878-880).
    # _snap_style_dict_leaves is DISABLED (convert.py:761-771) — skip.
    if style:
        result_attrs["style"] = style

    # -------------------------------------------------------------------------
    # RESPONSIVE TIERS — convert.py:882-956
    # -------------------------------------------------------------------------
    if bp_decls:
        block_schema = db_lookup.block_attrs(slug)
        for bp_suffix, bp_decl_map in bp_decls.items():
            if not bp_decl_map:
                continue
            tier_consumed = consumed_bp.setdefault(bp_suffix, set())

            # Per-property lift for each @media tier — convert.py:899-932.
            for css_prop, sup_top, sup_sub, style_path, kind in _root_lift_rules():
                if css_prop not in bp_decl_map:
                    continue
                if not _support_allows(supports, sup_top, sup_sub if sup_sub != style_path[-1] else None):
                    continue
                raw = strip_important(bp_decl_map[css_prop])
                if kind == "colour":
                    v = _colour_value_to_style(raw)
                else:
                    v = _preserve_unit(raw)
                if v is None:
                    _LOG.debug(
                        "[root_supports] responsive_attr_dropped slug=%s css_prop=%s "
                        "bp_suffix=%s reason=value_unparseable raw=%r",
                        slug, css_prop, bp_suffix, raw,
                    )
                    continue

                # Build per-device attr name — convert.py:914-922.
                # style_path=['spacing','padding','top'] + 'Tablet' → 'paddingTopTablet'
                path_leaves = style_path[1:]  # drop the top-level bucket key
                camel_base = "".join(p.capitalize() for p in path_leaves)
                camel_base = camel_base[:1].lower() + camel_base[1:]  # lowercase first char
                candidate = f"{camel_base}{bp_suffix}"

                if candidate in block_schema and candidate not in result_attrs:
                    result_attrs[candidate] = v
                    tier_consumed.add(css_prop)
                    _LOG.debug(
                        "[root_supports] responsive_attr_lifted slug=%s css_prop=%s "
                        "bp_suffix=%s attr=%s value=%r",
                        slug, css_prop, bp_suffix, candidate, v,
                    )
                else:
                    reason = "no_schema_attr" if candidate not in block_schema else "already_set"
                    _LOG.debug(
                        "[root_supports] responsive_attr_dropped slug=%s css_prop=%s "
                        "bp_suffix=%s reason=%s candidate=%s",
                        slug, css_prop, bp_suffix, reason, candidate,
                    )

            # Shorthand padding/margin responsive lift — convert.py:933-956.
            for shorthand in ("padding", "margin"):
                if shorthand not in bp_decl_map:
                    continue
                if not _support_allows(supports, "spacing", shorthand):
                    continue
                parsed = _parse_padding_shorthand(strip_important(bp_decl_map[shorthand]))
                if not parsed:
                    continue
                for side, val in parsed.items():
                    # e.g. 'padding' + 'top' + 'Tablet' → 'paddingTopTablet'
                    candidate = f"{shorthand}{side.capitalize()}{bp_suffix}"
                    if candidate in block_schema and candidate not in result_attrs:
                        result_attrs[candidate] = val
                        # Any side landing a write consumes the shorthand for this
                        # tier — matches the pre-STOP-43 blanket-strip parity for a
                        # PARTIAL multi-side success (some sides may still miss their
                        # schema attr and are dropped, unchanged from prior behaviour).
                        tier_consumed.add(shorthand)
                        _LOG.debug(
                            "[root_supports] responsive_attr_lifted slug=%s shorthand=%s(%s) "
                            "bp_suffix=%s attr=%s value=%r",
                            slug, shorthand, side, bp_suffix, candidate, val,
                        )
                    else:
                        reason = "no_schema_attr" if candidate not in block_schema else "already_set"
                        _LOG.debug(
                            "[root_supports] responsive_attr_dropped slug=%s shorthand=%s(%s) "
                            "bp_suffix=%s reason=%s candidate=%s",
                            slug, shorthand, side, bp_suffix, reason, candidate,
                        )

    consumed: dict[str, frozenset[str]] = {"Base": frozenset(consumed_base)}
    for bp_suffix, prop_set in consumed_bp.items():
        consumed[bp_suffix] = frozenset(prop_set)

    return result_attrs, consumed
