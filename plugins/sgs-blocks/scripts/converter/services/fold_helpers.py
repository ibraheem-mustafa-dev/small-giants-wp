"""fold_helpers.py — ported CSS-fold helper functions for the modular rebuild.

Faithful port of the following from orchestrator/converter_v2/convert.py,
behaviour-IDENTICAL (Spec 31 §12.4, D246):

  - ``_detect_content_layer``          (convert.py:2244) -> ``detect_content_layer``
  - ``_resolve_co_declared_var``        (convert.py:384)  -> ``_resolve_co_declared_var`` (private)
  - ``_expand_box_shorthand``           (convert.py:2354) -> ``_expand_box_shorthand`` (private)
  - ``_lift_content_band_max_width``    (convert.py:5821) -> ``lift_content_band_max_width``
  - ``_grid_item_areas``               (convert.py:2308) -> ``grid_item_areas``
  - ``_route_area_css_to_block_attrs`` (convert.py:2405) -> ``route_area_css_to_block_attrs``
  - ``_route_interior_css_to_parent_slot`` (convert.py:2597) -> ``route_interior_css_to_parent_slot``

FLAGGED — not ported (entangled):
  - ``_fold_layout_into_attrs``  (convert.py:5863) -> FLAG: calls ``_merge_grid_attrs_into_container``
    (convert.py:5486) and ``route_node_css`` (convert.py:2015), neither of which is yet ported
    into a new-engine module. Porting this function requires those two to be ported first.

No block-slug string literals. No import from convert.py.
``from converter.db import db_lookup`` (moved off the frozen tree in EXECUTION
Step 9, Phase 3, 2026-07-04) is the only DB-accessor import.
``_trace`` and ``_record_gap_candidate`` are injectable callables (default no-op) so this
module carries no module-level side-effectful state.

Reused from converter/services/styling_helpers.py:
  - ``strip_important``  (-> ``_strip_important`` in frozen source)
  - ``collect_css_decls_for_element``  (-> ``_collect_css_decls_for_element`` in frozen source)
  - ``split_value_unit``  (-> ``_split_value_unit`` in frozen source)
"""
from __future__ import annotations

import re
from collections.abc import Callable
from typing import Any

from bs4 import Tag

from converter.db.db_lookup import modifier_suffixes

from converter.db import db_lookup
from converter.services.styling_helpers import (
    collect_css_decls_for_element,
    split_value_unit,
    strip_important,
)


# ---------------------------------------------------------------------------
# Module-level constants (convert.py:2206, 2218 — verbatim copies)
# ---------------------------------------------------------------------------

_CROSS_NODE_EXCLUDED_PROPS: frozenset[str] = frozenset({
    "display",
    "grid-template-columns",
    "grid-template-rows",
    "grid-template-areas",
    "grid-template",
})

_BOX_CSS_FAMILIES: frozenset[str] = frozenset({
    "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
    "max-width", "min-width", "width",
    "gap", "row-gap", "column-gap",
    "min-height",
})

# Breakpoint + side suffix grammar is DB-OWNED (R-31-1 / Spec 31 §4 / §7a.4 — D249).
# The former hardcoded `_BP_SUFFIX_MAP` identity dict (convert.py:980 verbatim copy)
# and the inline `(Top|Right|Bottom|Left)` regexes were the live-class R-31-1 violation;
# both now read the vocabulary from db_lookup.modifier_suffixes (cached).


def _strip_side_suffix(attr: str) -> str:
    """Strip a trailing side suffix (Top/Right/Bottom/Left) from an attr name using the
    DB-owned `side` vocabulary (R-31-1 — was a hardcoded `(Top|Right|Bottom|Left)$`
    regex). Used to derive the shared `…Unit` companion attr name (Spec 31 §4)."""
    sides = modifier_suffixes("side")
    if not sides:
        return attr
    return re.sub(r"(" + "|".join(re.escape(s) for s in sides) + r")$", "", attr)

# var() resolver regex (convert.py:382 — verbatim copy)
_VAR_RE = re.compile(r"^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\s*\)$", re.IGNORECASE)


# ---------------------------------------------------------------------------
# No-op defaults for injectable trace / gap callbacks
# ---------------------------------------------------------------------------

def _noop_trace(stage: str, **kwargs: Any) -> None:  # noqa: ARG001
    """Default no-op trace callback. Replaced by the orchestrator at wiring time."""


def _noop_record_gap(
    block_slug: str,
    css_property: str,
    raw_value: str,
    source_class: str,
) -> None:  # noqa: ARG001
    """Default no-op gap-candidate callback. Replaced by the orchestrator at wiring time."""


# ---------------------------------------------------------------------------
# _resolve_co_declared_var (convert.py:384 — ported verbatim, private)
# ---------------------------------------------------------------------------

def _resolve_co_declared_var(value: str, decls: dict) -> str:
    """Resolve a CSS ``var(--name[, fallback])`` against co-declared custom props.

    If ``value`` is a bare var() reference AND ``decls`` contains the named
    custom property, return the resolved value. Otherwise return the fallback
    (if provided) or the original ``value`` unchanged (flag-not-drop, per
    FR-31-21 step 6 — never silently drop an unresolvable var()).

    Only resolves ONE level of indirection.

    Ported from convert.py:384 (behaviour-identical).
    """
    m = _VAR_RE.match(value.strip())
    if not m:
        return value
    prop_name = m.group(1)   # e.g. "--content-width"
    fallback = (m.group(2) or "").strip() or None
    resolved = decls.get(prop_name)
    if resolved is not None:
        return resolved.strip()
    if fallback:
        return fallback
    # Unresolvable — return original so caller can flag-not-drop
    return value


# ---------------------------------------------------------------------------
# _expand_box_shorthand (convert.py:2354 — ported verbatim, private)
# ---------------------------------------------------------------------------

def _expand_box_shorthand(decls: dict[str, str], prop: str) -> dict[str, str]:
    """Expand a ``padding``/``margin`` SHORTHAND into longhands (CSS 1-4 value rules).

    Returns a NEW dict with the shorthand replaced by -top/-right/-bottom/-left
    (existing longhands win — they are more specific in the source). Paren-aware
    top-level token split keeps calc()/var(..., ...) values intact.

    Ported from convert.py:2354 (behaviour-identical). Uses ``strip_important``
    from styling_helpers.
    """
    if prop not in decls:
        return decls
    raw = strip_important(decls[prop]).strip()
    if not raw:
        return decls
    tokens: list[str] = []
    buf, depth_p = "", 0
    for ch in raw:
        if ch == "(":
            depth_p += 1
        elif ch == ")":
            depth_p -= 1
        if ch.isspace() and depth_p == 0:
            if buf:
                tokens.append(buf)
                buf = ""
        else:
            buf += ch
    if buf:
        tokens.append(buf)
    if not 1 <= len(tokens) <= 4:
        return decls
    t = tokens
    if len(t) == 1:
        top = right = bottom = left = t[0]
    elif len(t) == 2:
        top, bottom = t[0], t[0]
        right, left = t[1], t[1]
    elif len(t) == 3:
        top, right, bottom = t[0], t[1], t[2]
        left = t[1]
    else:
        top, right, bottom, left = t
    out = dict(decls)
    del out[prop]
    for side, val in (("top", top), ("right", right), ("bottom", bottom), ("left", left)):
        out.setdefault(f"{prop}-{side}", val)
    return out


# ---------------------------------------------------------------------------
# detect_content_layer (convert.py:2244 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def detect_content_layer(base_decls: dict[str, str], *, is_root: bool = False) -> bool:
    """Return True when ``base_decls`` carries a CONTENT-layer signature.

    CONTENT layer = a content-width inner band. Detection is deterministic-first:

    1. ``--content-width`` custom-property declared in the element's CSS -> True.
    2. ``max-width`` present AND margin-centring present (both ``margin-left:auto``
       AND ``margin-right:auto``, OR the ``margin:0 auto`` shorthand) -> True.

    Any other pattern -> False (routed to gap-candidate by the caller).

    MF-3 structural-position guard (Spec 31 §3 step 1 / FR-31-2.8.4, Step-3
    2026-07-04): L2 CONTENT detection fires ONLY on a non-root inner element.
    A section ROOT that legitimately declares ``max-width:1200px; margin:0
    auto`` is the OUTER box (its max-width routes to ``maxWidth``/``align``,
    never ``contentWidth``) — pass ``is_root=True`` and this returns False
    regardless of the CSS signature. Defaulted False so every existing caller
    (all of which pass interior child nodes) is behaviour-identical; the
    unified Step-7 cascade passes the node's real structural position.

    Ported from convert.py:2244 (behaviour-identical for non-root).
    """
    if is_root:
        return False
    # Priority 1: `--content-width` custom property anywhere in the declaration block.
    for prop in base_decls:
        if prop.strip() == "--content-width":
            return True
    for val in base_decls.values():
        if "--content-width" in (val or ""):
            return True

    # Priority 2: max-width + margin-centring.
    raw_mw = strip_important(base_decls.get("max-width", "")).strip()
    if not raw_mw:
        return False

    # Reject width:min()/clamp() shaped values that appear in max-width slot.
    if raw_mw.startswith(("min(", "clamp(", "max(")):
        return False

    # Reject flex-grid containers.
    raw_display = strip_important(base_decls.get("display", "")).strip().lower()
    if raw_display in ("flex", "grid", "inline-flex", "inline-grid"):
        return False

    # Check for margin-centring signature.
    margin_short = strip_important(base_decls.get("margin", "")).strip().lower()
    ml = strip_important(base_decls.get("margin-left", "")).strip().lower()
    mr = strip_important(base_decls.get("margin-right", "")).strip().lower()

    if margin_short:
        tokens = margin_short.split()
        if "auto" in tokens:
            return True

    if ml == "auto" and mr == "auto":
        return True

    return False


# ---------------------------------------------------------------------------
# grid_item_areas (convert.py:2308 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def grid_item_areas(node: Tag, css_rules: dict) -> frozenset[str]:
    """Return the grid-area names a node's OWN CSS declares, else empty frozenset.

    Reads the node's own base CSS plus EVERY breakpoint tier; returns the UNION
    of area names across tiers. No ``display:grid`` -> frozenset() (conservative).

    Ported from convert.py:2308 (behaviour-identical).
    """
    base, bp = collect_css_decls_for_element(node, css_rules)
    tiers: list[dict[str, str]] = [base, *bp.values()]

    has_grid = any(
        strip_important(t.get("display", "")).strip().lower() == "grid"
        for t in tiers
    )
    if not has_grid:
        return frozenset()

    names: set[str] = set()
    for t in tiers:
        raw = strip_important(t.get("grid-template-areas", "")).strip()
        if not raw or raw.lower() in ("none", "inherit", "initial", "unset"):
            continue
        for row in re.findall(r"[\"']([^\"']*)[\"']", raw):
            for token in row.split():
                if token != ".":
                    names.add(token.lower())
    return frozenset(names)


# ---------------------------------------------------------------------------
# lift_content_band_max_width (convert.py:5821 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

# (lift_content_band_max_width DELETED — EXECUTION Step 7; the BEM-less band
# folds through the same fold_band_css cascade, no special case.)


# ---------------------------------------------------------------------------
# route_area_css_to_block_attrs (convert.py:2405 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def route_area_css_to_block_attrs(
    child_node: Tag,
    area: str,
    owning_block: str,
    parent_attrs: dict,
    css_rules: dict,
    *,
    trace: Callable[..., None] = _noop_trace,
) -> None:
    """GRID-PER-AREA routing: route a dissolving named grid item's own CSS to the
    owning block's ``<areaName>+<suffix>`` attrs.

    Tier mapping (SGS 3-tier; base attr = DESKTOP). ``collect_css_decls_for_element``
    now returns ``base_decls`` = the EFFECTIVE value at DESKTOP (the FR-31-5.2 device-
    tier cascade, D259) and ``bp_decls`` = the ``Tablet``/``Mobile`` overrides that
    differ from it (there is NO ``Desktop`` key — Desktop is collapsed into base):
        base_decls              -> attr (unsuffixed base = desktop)
        bp_decls['Tablet']      -> attr + 'Tablet'
        bp_decls['Mobile']      -> attr + 'Mobile'

    NOTE (D259): currently UNWIRED in the new engine — the live grid-per-area path is
    the per-declaration ``resolvers/grid_area.py`` resolver (fed by the ``Decl`` stream
    ``_build_css_attrs`` assembles). Kept as a port; the tier mapping below matches the
    post-D259 cascade semantics so it is safe if wired. Ported from convert.py:2405.
    """
    base_decls, bp_decls = collect_css_decls_for_element(child_node, css_rules)
    if not base_decls and not bp_decls:
        return

    for prop in ("padding", "margin"):
        base_decls = _expand_box_shorthand(base_decls, prop)
        bp_decls = {k: _expand_box_shorthand(v, prop) for k, v in bp_decls.items()}

    _area_excluded = _CROSS_NODE_EXCLUDED_PROPS | {"grid-area", "width", "height",
                                                   "max-width", "min-width",
                                                   "max-height", "min-height"}

    all_props: set[str] = set(base_decls)
    for tier in bp_decls.values():
        all_props.update(tier)

    tab = bp_decls.get("Tablet", {})
    mob_override = bp_decls.get("Mobile", {})
    block_attr_names = db_lookup.block_attrs(owning_block) or {}

    # --- FIX A (H-C1): per-slot max-width routing ----------------------------
    _mw_raw = base_decls.get("max-width")
    if _mw_raw:
        _mw_per_slot_attr = db_lookup.attr_for_area_property(owning_block, area, "max-width")
        if _mw_per_slot_attr and _mw_per_slot_attr in block_attr_names:
            _mw_resolved = _resolve_co_declared_var(strip_important(_mw_raw).strip(), base_decls)
            _mw_meta = block_attr_names.get(_mw_per_slot_attr) or {}
            if _mw_meta.get("attr_type") == "number":
                _mw_num, _mw_unit = split_value_unit(_mw_resolved)
                if _mw_num is not None:
                    _mw_store: int | float | str = int(_mw_num) if float(_mw_num).is_integer() else _mw_num
                    parent_attrs.setdefault(_mw_per_slot_attr, _mw_store)
                    _mw_unit_attr = _strip_side_suffix(_mw_per_slot_attr) + "Unit"
                    if _mw_unit and _mw_unit_attr in block_attr_names:
                        parent_attrs.setdefault(_mw_unit_attr, _mw_unit)
                    trace("cross_node_css_lifted", owning_block=owning_block,
                          element_token=area, css_property="max-width",
                          layer="AREA_PER_SLOT_MAX_WIDTH", dest_attr=_mw_per_slot_attr)
                else:
                    trace("cross_node_gap_candidate", owning_block=owning_block,
                          element_token=area, css_property="max-width",
                          reason="per_slot_mw_number_unparseable", value=_mw_resolved)
            else:
                parent_attrs.setdefault(_mw_per_slot_attr, _mw_resolved)
                trace("cross_node_css_lifted", owning_block=owning_block,
                      element_token=area, css_property="max-width",
                      layer="AREA_PER_SLOT_MAX_WIDTH", dest_attr=_mw_per_slot_attr)
    # -------------------------------------------------------------------------

    for css_prop in sorted(all_props):
        if css_prop in _area_excluded or css_prop.startswith("--"):
            continue
        attr_base = db_lookup.attr_for_area_property(owning_block, area, css_prop)
        if attr_base is None:
            source_class = next(
                (c for c in (child_node.get("class", []) or []) if c.startswith("sgs-")),
                area,
            )
            trace(
                "cross_node_gap_candidate",
                owning_block=owning_block,
                element_token=area,
                css_property=css_prop,
                reason="no_area_attr",
                source_class=source_class,
            )
            continue

        draft_base = base_decls.get(css_prop)
        draft_tab = tab.get(css_prop)
        draft_mob = mob_override.get(css_prop)

        # base_decls is already the DESKTOP-effective value (FR-31-5.2 cascade, D259);
        # bp Tablet/Mobile are overrides that differ from it. Emit the tier override
        # where present, else inherit base (desktop) — never fold a Tablet value onto
        # the unsuffixed desktop attr (the pre-D259 semantics-mismatch bug).
        tier_values: list[tuple[str, str | None]] = [
            ("Mobile", draft_mob or draft_base),
            ("Tablet", draft_tab or draft_base),
            ("", draft_base),  # base attr = desktop-effective
        ]
        _attr_meta = block_attr_names.get(attr_base) or {}
        _is_number = (_attr_meta.get("attr_type") == "number")
        _family_unit_attr = _strip_side_suffix(attr_base) + "Unit"
        for tier_suffix, value in tier_values:
            if value is None:
                continue
            dest = f"{attr_base}{tier_suffix}" if tier_suffix else attr_base
            if dest not in block_attr_names:
                trace(
                    "cross_node_gap_candidate",
                    owning_block=owning_block,
                    element_token=area,
                    css_property=css_prop,
                    reason="area_attr_tier_missing",
                    attr_name=dest,
                )
                continue
            raw_val = strip_important(value).strip()
            if _is_number:
                _num, _unit = split_value_unit(raw_val)
                if _num is None:
                    trace(
                        "cross_node_gap_candidate",
                        owning_block=owning_block,
                        element_token=area,
                        css_property=css_prop,
                        reason="area_attr_number_unparseable",
                        attr_name=dest,
                        value=raw_val,
                    )
                    continue
                store_val = int(_num) if float(_num).is_integer() else _num
                if _unit and _family_unit_attr in block_attr_names:
                    _existing_unit = parent_attrs.get(_family_unit_attr)
                    if _existing_unit is None:
                        parent_attrs[_family_unit_attr] = _unit
                    elif _existing_unit != _unit:
                        trace(
                            "cross_node_gap_candidate",
                            owning_block=owning_block,
                            element_token=area,
                            css_property=css_prop,
                            reason="area_attr_mixed_units",
                            attr_name=dest,
                            value=raw_val,
                        )
                        continue
            else:
                store_val = raw_val
            parent_attrs.setdefault(dest, store_val)
            trace(
                "cross_node_css_lifted",
                owning_block=owning_block,
                element_token=area,
                css_property=css_prop,
                layer="AREA",
                dest_attr=dest,
                value=store_val,
            )


# ---------------------------------------------------------------------------
# fold_band_css — EXECUTION Step 7 (FR-31-2.8.4): the ONE cascade for a folded
# band. REPLACES route_interior_css_to_parent_slot (hand-rolled prop→layer
# ladder) + lift_content_band_max_width (max-width-only fallback) — both were
# reduced pipelines that silently dropped every other band declaration
# (R-31-9/Rule-4 violations, deleted this step).
# ---------------------------------------------------------------------------

def fold_band_css(
    band_node: Tag,
    owning_slug: str,
    band_attrs: dict,
    css_rules: dict,
    *,
    trace: Callable[..., None] = _noop_trace,
    record_gap: Callable[..., None] = _noop_record_gap,
) -> list:
    """Fold a sole pass-through band's FULL declaration stream onto the owner.

    Spec 31 FR-31-2.8.4: EVERY node's full declaration stream — root, folded
    band, grid item — runs the SAME dispatch/resolver cascade; only the
    DESTINATION differs. The band's declarations are dispatched through
    ``process_element`` with a ``Ctx`` built for the OWNING block
    (``is_root=False`` → layer_detect; the old fold ladder now lives as
    content_band's explicit layer priorities) and a ``Destination`` targeting
    ``band_attrs`` (setdefault — earlier paths win, the Step-3 contract).

    Callers guarantee the band is a slug-None PASS-THROUGH
    (``_sole_passthrough_child``), so the old ``slot_has_equivalent_block``
    fork is structurally satisfied (a pass-through owns no content-bearing
    slot) and the old element-token gate is unnecessary — a BEM-less band
    folds identically (the retired ``lift_content_band_max_width`` special
    case dissolves into the same path).

    GAP-3 (``_CROSS_NODE_EXCLUDED_PROPS``: display/grid-template-*) stays
    excluded from the cross-node fold — the §2.3 arrangement pass owns those —
    but each exclusion is now RECORDED (returned as an EXCLUDED GAP +
    record_gap + trace), never the silent early-return the old ladder had
    (its :522-524 skip died with it). Full ledger integration = Step 11 (A2).

    FR-31-5.1a: an inheritable base-tier ``text-align`` on the band folds to
    the owner's WP-native ``textAlign`` support (re-homed verbatim from the
    retired router; STOP-44 — the wrapper renders the class explicitly).

    Returns the list of EXCLUDED/NO-DESTINATION GAP objects for the caller's
    tracking channel; transferred values land in ``band_attrs`` via the
    destination. DB absent → no-op (parity with ``_build_css_attrs``).
    """
    import sqlite3
    from converter.services.css_pass import _SGS_DB_PATH

    gaps: list = []
    if not owning_slug or not _SGS_DB_PATH.exists():
        return gaps

    base_decls, bp_decls = collect_css_decls_for_element(band_node, css_rules)
    if not base_decls and not bp_decls:
        return gaps

    from converter.context import Ctx, Decl, Destination
    from converter.models import GAP, GapOrigin

    # ---- FR-31-5.1a native textAlign fold (base tier only; re-homed) ----
    ta = base_decls.get("text-align")
    if ta:
        _typ = db_lookup.block_supports_for(owning_slug).get("typography") or {}
        if _typ.get("textAlign"):
            band_attrs.setdefault("textAlign", strip_important(ta).strip())
            trace(
                "cross_node_css_lifted", owning_block=owning_slug,
                css_property="text-align", layer="NATIVE_TEXTALIGN",
                dest_attr="textAlign", value=ta,
            )
            base_decls = {k: v for k, v in base_decls.items() if k != "text-align"}

    # ---- GAP-3 partition — EXCLUDED-with-reason, never a silent skip ----
    def _partition(decl_map: dict, tier: str) -> list:
        kept: list = []
        for prop, value in decl_map.items():
            if prop in _CROSS_NODE_EXCLUDED_PROPS:
                reason = (
                    "GAP-3: display/grid-template-* never lift cross-node "
                    "(the §2.3 arrangement pass owns the band's grid; an "
                    "inline lift beats @media and collapses grids)"
                )
                gaps.append(GAP(origin=GapOrigin.EXCLUDED, property=prop,
                                tier=tier, detail=reason))
                record_gap(block_slug=owning_slug, css_property=prop,
                           raw_value=value, source_class="(band-fold)")
                trace("cross_node_gap3_excluded", owning_block=owning_slug,
                      css_property=prop, tier=tier)
                continue
            # Resolve a co-declared var() against the band's own base decls
            # (max-width:var(--content-width) with the custom prop co-declared).
            kept.append(Decl(property=prop,
                             value=_resolve_co_declared_var(
                                 strip_important(value).strip(), base_decls),
                             tier=tier))
        return kept

    decls: list = _partition(base_decls, "Base")
    for bp_key, bp_map in (bp_decls or {}).items():
        decls.extend(_partition(bp_map or {}, bp_key))
    if not decls:
        return gaps

    # ---- The ONE cascade: process_element with a parent DESTINATION ----
    from converter.orchestrator import process_element
    from converter.services.recognise_helpers import get_container_kind
    from converter.services.has_inner import derive_delegates_content

    conn = sqlite3.connect(str(_SGS_DB_PATH), check_same_thread=False)
    try:
        ctx = Ctx(
            block_slug=owning_slug,
            container_kind=get_container_kind(owning_slug) or "",
            delegates_content=derive_delegates_content(owning_slug) or 0,
            variant_value=None, variant_attr=None,
            node=band_node, is_root=False, base_layer=None, conn=conn,
            destination=Destination(block_slug=owning_slug, attrs=band_attrs),
        )
        result = process_element(ctx, decls)
        gaps.extend(g for g in result.gaps)
    finally:
        conn.close()
    return gaps


# ---------------------------------------------------------------------------
# route_interior_css_to_parent_slot (convert.py:2597 — ported verbatim, renamed)
# RETIRED (EXECUTION Step 7) — replaced by fold_band_css above.
# ---------------------------------------------------------------------------

# (route_interior_css_to_parent_slot DELETED — EXECUTION Step 7; see fold_band_css.)


# ---------------------------------------------------------------------------
# FLAGGED — fold_layout_into_attrs (convert.py:5863) — NOT PORTED
# ---------------------------------------------------------------------------
# Calls _merge_grid_attrs_into_container (convert.py:5486) and route_node_css
# (convert.py:2015), neither yet ported. When they are, fold_layout_into_attrs
# can be assembled from those + lift_content_band_max_width (already here).
# ---------------------------------------------------------------------------
