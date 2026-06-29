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
``from orchestrator.converter_v2 import db_lookup`` is the only frozen-tree import.
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

from orchestrator.converter_v2 import db_lookup
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

# Responsive suffix pairs: bp_decls key -> attr suffix appended to base attr name.
# (convert.py:980 — verbatim copy)
_BP_SUFFIX_MAP: dict[str, str] = {
    "Tablet":  "Tablet",
    "Mobile":  "Mobile",
    "Desktop": "Desktop",
}

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
    FR-22-21 step 6 — never silently drop an unresolvable var()).

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

def detect_content_layer(base_decls: dict[str, str]) -> bool:
    """Return True when ``base_decls`` carries a CONTENT-layer signature.

    CONTENT layer = a content-width inner band. Detection is deterministic-first:

    1. ``--content-width`` custom-property declared in the element's CSS -> True.
    2. ``max-width`` present AND margin-centring present (both ``margin-left:auto``
       AND ``margin-right:auto``, OR the ``margin:0 auto`` shorthand) -> True.

    Any other pattern -> False (routed to gap-candidate by the caller).

    Ported from convert.py:2244 (behaviour-identical).
    """
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

def lift_content_band_max_width(
    band_node: Tag,
    css_rules: dict,
    attrs: dict,
    dest_attr: str | None = "contentWidth",
) -> bool:
    """Lift a content-band element's max-width onto a block attr.

    Extracts ``max-width`` from ``band_node`` (resolving co-declared var()) and
    stores into ``attrs[dest_attr]`` via setdefault. Returns True when a value
    was available.

    Ported from convert.py:5821 (behaviour-identical).
    """
    if dest_attr is None:
        return False
    _base, _ = collect_css_decls_for_element(band_node, css_rules)
    _mw = _base.get("max-width")
    if not _mw:
        return False
    attrs.setdefault(dest_attr, _resolve_co_declared_var(
        strip_important(_mw).strip(), _base))
    return True


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

    Tier mapping (SGS 3-tier; base attr = DESKTOP; draft is mobile-first):
        draft base (no @media)     -> attr + 'Mobile'
        draft @768 (Tablet)        -> attr + 'Tablet'
        draft @1024/1280 (Desktop) -> attr (unsuffixed base)

    Ported from convert.py:2405 (behaviour-identical). ``_record_gap_candidate``
    removed (gap still visible via the ``cross_node_gap_candidate`` trace event).
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
    desk = bp_decls.get("Desktop", {})
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
                    _mw_unit_attr = re.sub(r"(Top|Right|Bottom|Left)$", "", _mw_per_slot_attr) + "Unit"
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
        draft_desk = desk.get(css_prop)
        draft_mob = mob_override.get(css_prop)

        tier_values: list[tuple[str, str | None]] = [
            ("Mobile", draft_mob or draft_base),
            ("Tablet", draft_tab or draft_base),
            ("", draft_desk or draft_tab or draft_base),  # base attr = desktop
        ]
        _attr_meta = block_attr_names.get(attr_base) or {}
        _is_number = (_attr_meta.get("attr_type") == "number")
        _family_unit_attr = re.sub(r"(Top|Right|Bottom|Left)$", "", attr_base) + "Unit"
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
# route_interior_css_to_parent_slot (convert.py:2597 — ported verbatim, renamed)
# ---------------------------------------------------------------------------

def route_interior_css_to_parent_slot(
    child_node: Tag,
    element_token: str | None,
    owning_block: str,
    parent_attrs: dict,
    css_rules: dict,
    *,
    trace: Callable[..., None] = _noop_trace,
    record_gap: Callable[..., None] = _noop_record_gap,
) -> None:
    """FR-22-5.3 — Route an interior element's structural box CSS to the owning
    composite's per-slot attr group when the slot has no equivalent child block.

    Fork on ``db_lookup.slot_has_equivalent_block(owning_block, slot_name)``:
        TRUE  -> the slot IS served by a child InnerBlock; CSS stays with it (no-op).
        FALSE -> lift the child's structural box CSS onto the parent's per-layer attrs.

    Ported from convert.py:2597 (behaviour-identical). ``_trace``/``_record_gap_candidate``
    -> injectable callables.
    """
    if not element_token or not owning_block:
        return

    slot_name: str | None = db_lookup.canonical_slot_for(element_token)

    if slot_name and db_lookup.slot_has_equivalent_block(owning_block, slot_name):
        trace(
            "cross_node_content_fork",
            owning_block=owning_block,
            element_token=element_token,
            slot_name=slot_name,
            branch="content_bearing_child_block_present__skip",
        )
        return

    base_decls, bp_decls = collect_css_decls_for_element(child_node, css_rules)

    if not base_decls and not bp_decls:
        return

    is_content = detect_content_layer(base_decls)

    def _lift_decl(css_prop: str, value: str, bp_suffix: str | None = None) -> bool:
        if css_prop in _CROSS_NODE_EXCLUDED_PROPS:
            return False  # GAP-3: never lift display/grid-template-* cross-node.

        layers_to_try: list[str] = []

        if css_prop in ("max-width", "width", "--content-width"):
            layers_to_try.append("CONTENT")
            layers_to_try.append("OUTER")
        elif css_prop.startswith("padding"):
            if is_content:
                layers_to_try.append("CONTENT")
            layers_to_try.append("GRID")
            layers_to_try.append("OUTER")
        elif css_prop in ("gap", "row-gap", "column-gap"):
            layers_to_try.append("GRID")
            layers_to_try.append("OUTER")
        elif css_prop in ("margin", "margin-top", "margin-right", "margin-bottom", "margin-left"):
            layers_to_try.append("GRID")
            layers_to_try.append("OUTER")
        elif css_prop == "min-height":
            layers_to_try.append("GRID")
            layers_to_try.append("OUTER")
        else:
            layers_to_try.append("OUTER")

        placed = False
        for layer in layers_to_try:
            attr_name = db_lookup.attr_for_layer_property(owning_block, layer, css_prop)
            if attr_name:
                dest_key = f"{attr_name}{bp_suffix}" if bp_suffix else attr_name
                parent_attrs.setdefault(dest_key, strip_important(value).strip())
                trace(
                    "cross_node_css_lifted",
                    owning_block=owning_block,
                    element_token=element_token,
                    css_property=css_prop,
                    layer=layer,
                    dest_attr=dest_key,
                    value=value,
                )
                placed = True
                break  # First matching layer wins (CONTENT > OUTER precedence).

        if not placed:
            source_class = next(
                (c for c in (child_node.get("class", []) or []) if c.startswith("sgs-")),
                element_token or "",
            )
            record_gap(
                block_slug=owning_block,
                css_property=css_prop,
                raw_value=value,
                source_class=source_class,
            )
            trace(
                "cross_node_gap_candidate",
                owning_block=owning_block,
                element_token=element_token,
                css_property=css_prop,
                reason="no_matching_layer_attr",
            )

        return placed

    for css_prop, value in base_decls.items():
        _lift_decl(css_prop, value, bp_suffix=None)

    for bp_key, bp_decl_map in bp_decls.items():
        bp_sfx = _BP_SUFFIX_MAP.get(bp_key)
        if not bp_sfx or not bp_decl_map:
            continue
        for css_prop, value in bp_decl_map.items():
            _lift_decl(css_prop, value, bp_suffix=bp_sfx)


# ---------------------------------------------------------------------------
# FLAGGED — fold_layout_into_attrs (convert.py:5863) — NOT PORTED
# ---------------------------------------------------------------------------
# Calls _merge_grid_attrs_into_container (convert.py:5486) and route_node_css
# (convert.py:2015), neither yet ported. When they are, fold_layout_into_attrs
# can be assembled from those + lift_content_band_max_width (already here).
# ---------------------------------------------------------------------------
