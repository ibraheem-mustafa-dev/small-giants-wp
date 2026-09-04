"""fold_helpers.py — ported CSS-fold helper functions for the modular rebuild.

Faithful port of the following from orchestrator/converter_v2/convert.py,
behaviour-IDENTICAL (Spec 31 §12.4, D246):

  - ``_detect_content_layer``          (convert.py:2244) -> DELETED 2026-07-05 (zero callers; live MF-3 guard = layer_detect.py)
  - ``_resolve_co_declared_var``        (convert.py:384)  -> ``_resolve_co_declared_var`` (private)
  - ``_expand_box_shorthand``           (convert.py:2354) -> ``_expand_box_shorthand`` (private)
  - ``_lift_content_band_max_width``    (convert.py:5821) -> ``lift_content_band_max_width``
  - ``_grid_item_areas``               (convert.py:2308) -> DELETED 2026-08-16 (D642; found at D639 — zero callers — the resolver it fed, `resolvers/grid_area.py`, was itself dead code and removed the same commit)
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
# detect_content_layer DELETED (post-programme QC, 2026-07-05). The Step-3
# commit (c85254db) added its `is_root` MF-3 guard, but the function had ZERO
# production callers — the LIVE MF-3 guard is layer_detect.py::layer_detect
# (`if ctx.is_root: return "OUTER"`), which pre-dates that commit, and the
# band-signature richness this boolean once carried dissolved into the
# per-declaration Step-7 cascade (content_band.resolve layer priorities).
# Keeping a second, uncalled implementation of the same guard was the exact
# duplicate-mechanism drift risk the ONE-cascade rule (FR-31-2.8.4) forbids.
# Its MF-3 unit test was re-pointed at the live guard (test_destination_contract).
# ---------------------------------------------------------------------------


# grid_item_areas (convert.py:2308) DELETED 2026-08-16 (D642; found at D639) —
# zero callers. It fed `resolvers/grid_area.py`'s `ctx.area_name`, which no
# production Ctx-builder ever set; both were dead code and removed the same
# commit. The real grid-per-area routing is `route_area_css_to_block_attrs`
# below, keyed on the draft's BEM element token via `services.assembly` step
# 3d, not on this. NOTE: the deleted resolver also carried the only
# production call site of `db_lookup.unit_companion_attr()` — the live path
# below does NOT do unit-companion handling. Not deleted (it is DB-driven and
# unit-tested); recorded as a genuine Spec 39 input in
# `.claude/plans/spec-39-seed-requirements.md`, not debt.

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
    residual_sink: list | None = None,
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

    ⚠ THIS FUNCTION IS WIRED AND LIVE. Corrected 2026-08-10 — the note below said
    "currently UNWIRED" and that is STALE. It was wired via ``assembly.py`` (import at
    ``:260``, call at ``:276``, assembly step 3d), and ``tests/test_l4_area_wiring.py``
    exists precisely to assert the live path — its own header says the L4 extraction
    "WAS UNWIRED (MF-5)", past tense.

    Left uncorrected, this docstring is actively dangerous: a QC-council rater read it,
    concluded in good faith that this was dead code, and recommended REMOVING it from the
    Spec 39 converter-rework inventory. Following that would have left a live flat-tier
    emitter unmigrated. Refuted by the call graph, not by opinion — grep the callers
    before believing any "unwired" claim, including this one.

    Corrected 2026-08-16 (D642; found at D639): the paragraph that used to sit here claimed the
    per-declaration ``resolvers/grid_area.py`` resolver was "the OTHER grid-per-area
    path; both are live". That was false — ``grid_area.py``'s trigger
    (``ctx.area_name`` set) was never produced by any production Ctx-builder, only
    by test fixtures. It and its dispatch wiring were dead code and have been
    deleted. THIS function is the only live grid-per-area path; there is no other.
    The tier mapping below matches post-D259 cascade semantics. Ported from
    convert.py:2405.
    """
    base_decls, bp_decls = collect_css_decls_for_element(
        child_node, css_rules, residual_sink=residual_sink
    )
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

    # --- Box-object per-area padding (FR-31-22 / Spec 31 §3.A step-3b) ----------
    # When the owning composite migrated its per-area padding flat→OBJECT (D295
    # hero: contentPadding/mediaPadding/imagePadding incl. Tablet/Mobile tiers),
    # the flat attr_for_area_property path can no longer resolve
    # {area}Padding{Side} (the flat attrs were pruned). Route the four padding
    # sides into the {area}Padding{Tier} OBJECT attr instead — base_decls
    # (desktop-effective) → the base object, bp Tablet/Mobile overrides → the tier
    # objects. Gated on db_lookup.box_family_for (NEVER a name regex, §3.A step-3b
    # AST gate); a no-op for blocks still on flat per-area attrs. The four
    # padding-side props are then skipped in the flat loop below.
    _skip_padding_flat = False
    # Declarative-first per-area padding-object resolution (manifest-authoritative,
    # STOP-FIX-THE-SEED-SOURCE): resolve the destination object attr from the
    # block's DECLARED css_element+css_property mapping, so a block whose padding
    # attr is NOT named "{area}Padding" (e.g. sgs/product-card's body area →
    # cardPadding) still routes. The legacy name-convention guess is retained ONLY
    # as a fallback for areas whose padding attr is not (yet) declaratively mapped
    # (e.g. hero's GRID_AREA imagePadding, css_element='split-image'). Purely
    # ADDITIVE + MF-4-safe: it never changes a currently-resolving case — every
    # working name-guess path is preserved verbatim as the fallback.
    _pad_object_base = db_lookup.attr_for_area_property(owning_block, area, "padding")
    if (
        _pad_object_base is None
        or db_lookup.box_family_for(owning_block, _pad_object_base) is None
    ):
        _pad_object_base = f"{area[0].lower()}{area[1:]}Padding"
    if db_lookup.box_family_for(owning_block, _pad_object_base) is not None:
        _skip_padding_flat = True
        for _tier_sfx, _src in (("", base_decls), ("Tablet", tab), ("Mobile", mob_override)):
            _obj: dict = {}
            for _side in ("top", "right", "bottom", "left"):
                _v = _src.get(f"padding-{_side}")
                if _v is not None:
                    _obj[_side] = strip_important(_v).strip()
            if not _obj:
                continue
            _dest = f"{_pad_object_base}{_tier_sfx}" if _tier_sfx else _pad_object_base
            if _dest in block_attr_names:
                parent_attrs.setdefault(_dest, _obj)

    for css_prop in sorted(all_props):
        if css_prop in _area_excluded or css_prop.startswith("--"):
            continue
        if _skip_padding_flat and css_prop.startswith("padding-"):
            continue  # routed into the box-object above
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

def _fold_band_arrangement(
    band_node: Tag,
    owning_slug: str,
    band_attrs: dict,
    css_rules: dict,
    held: list,
    *,
    trace: Callable[..., None] = _noop_trace,
    record_gap: Callable[..., None] = _noop_record_gap,
) -> list:
    """Fold a band's ARRANGEMENT onto the owning container (Spec 31 §2.4).

    Spec 31 §2.4 states where arrangement CSS lands: "always on the **direct
    parent of the items**, which is either **this** container (arrangement on
    the root, **or folded up from a sole arrangement inner — brand, trust-bar**)".
    This is that fold-up. Before it existed the band's `display` was recorded as
    a GAP-3 exclusion and nothing re-homed it, so the owner never learned it was
    a flex/grid container.

    Two destinations, both DB-gated so a block that declares neither gets nothing
    (R-31-9 universal, no per-block branch):

      * ``display`` → the ``layout`` trigger attr, via ``arrangement.layout_attrs``
        — the §2.3 channel, which yields ONLY the validated ``grid``/``flex``
        enum values (+ ``flexDirection``). ``display`` is deliberately NOT sent
        through the raw cascade: it resolves to an UNIMPLEMENTED_STUB there
        (measured), and lifting a raw ``display`` value cross-node is what GAP-3
        exists to prevent.
      * ``grid-template-*`` → the grid resolver, run as a SEPARATE pass with
        ``base_layer`` pinned to GRID. Pinning is what keeps the main cascade's
        layer detection — and therefore the band's ``contentWidth`` — intact,
        while still giving the tracks (and the ``columns`` count the resolver
        derives from ``repeat(N, …)``) their proper per-tier attrs. Rule 6 holds:
        every value lands on a block attribute, never inline CSS.

    A held declaration that reaches no destination is returned as an EXCLUDED GAP
    with its original GAP-3 reason, so nothing becomes a silent drop.

    RELATIONSHIP TO ``l2_qualify`` (D441) — two halves of one step, not rivals:

        l2_qualify.qualify  = the L2 DECISION  — does this wrapper dissolve?
        fold_band_css       = the L2 TRANSFER  — given it dissolves, where does
                              its CSS go?  (``entry.py``'s own removal note calls
                              this "the L2 fold".)

    The rework plan replaces the DECISION gate (``_sole_passthrough_child``, its
    mechanism #2) with the relational qualifier. It never proposed replacing the
    transfer, so this function sits on the far side of that seam and survives the
    wiring untouched.

    **This fold is a PREREQUISITE for wiring L2, not a competitor to it.**
    ``l2_qualify._lands_on_parent`` returns True for ``display`` on every
    container-kind block (measured: container / trust-bar / tabs), i.e. the
    qualifier already passes a band partly BECAUSE it believes the band's
    ``display`` has somewhere to land. Until this function existed that belief
    was false — the transfer dropped it — so wiring L2 would have widened the set
    of dissolving wrappers while their arrangement kept vanishing. Do not wire the
    qualifier on the assumption the transfer is lossless without checking this
    still holds.

    Sibling widening (watch, do not pre-solve): the current gate demands the
    parent have exactly ONE element child; the qualifier has no sibling-count
    requirement, so a future parent could present TWO arrangement-bearing bands
    and the second's ``layout`` would lose the setdefault race silently. Measured
    2026-08-01 across the homepage draft, the product draft and the realistic tabs
    fixture: ZERO parents yield more than one qualifying band, and the two gates
    disagree on ZERO parents — so this is a hazard to re-measure when L2 is wired,
    not a bug to fix speculatively.
    """
    from converter.context import Ctx, Decl, Destination
    from converter.models import GAP, GapOrigin
    from converter.services import arrangement

    gaps: list = []
    if not held:
        return gaps

    routed: set[tuple[str, str]] = set()

    # ---- display → the layout trigger (+ flexDirection) ----------------------
    owner_attrs = db_lookup.block_attrs(owning_slug) or {}
    for _lk, _lv in arrangement.layout_attrs(band_node, css_rules, owning_slug).items():
        if _lk not in owner_attrs:
            continue
        band_attrs.setdefault(_lk, _lv)
        routed.update(("display", d.tier) for d in held if d.property == "display")
        trace("band_fold_arrangement_lifted", owning_block=owning_slug,
              css_property="display", layer="ARRANGEMENT",
              dest_attr=_lk, value=_lv)

    # ---- grid-template-* → the grid resolver, GRID-pinned --------------------
    track_decls = [d for d in held if d.property != "display"]
    if track_decls:
        from converter.dispatch_spine import process_element
        from converter.services.recognise_helpers import get_container_kind
        from converter.services.has_inner import derive_delegates_content

        conn = db_lookup.get_connection()
        try:
            ctx = Ctx(
                block_slug=owning_slug,
                container_kind=get_container_kind(owning_slug) or "",
                delegates_content=derive_delegates_content(owning_slug) or 0,
                variant_value=None, variant_attr=None,
                node=band_node, is_root=False, base_layer="GRID", conn=conn,
                destination=Destination(block_slug=owning_slug, attrs=band_attrs),
            )
            result = process_element(ctx, track_decls)
        finally:
            conn.close()
        _failed = {(g.property, g.tier) for g in result.gaps}
        routed.update(
            (d.property, d.tier) for d in track_decls
            if (d.property, d.tier) not in _failed
        )
        for _w in result.gaps:
            trace("band_fold_arrangement_gap", owning_block=owning_slug,
                  css_property=_w.property, tier=_w.tier)

    # ---- whatever reached no destination stays an honest EXCLUDED gap --------
    for d in held:
        if (d.property, d.tier) in routed:
            continue
        reason = (
            "GAP-3: display/grid-template-* never lift cross-node as raw CSS "
            "(an inline lift beats @media and collapses grids), and the §2.4 "
            "arrangement fold-up found no destination attr on the owner"
        )
        gaps.append(GAP(origin=GapOrigin.EXCLUDED, property=d.property,
                        tier=d.tier, detail=reason))
        record_gap(block_slug=owning_slug, css_property=d.property,
                   raw_value=d.value, source_class="(band-fold)")
        trace("cross_node_gap3_excluded", owning_block=owning_slug,
              css_property=d.property, tier=d.tier)
    return gaps


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
    excluded from the MAIN cross-node cascade — but "excluded from the main
    cascade" is NOT "dropped". They are re-routed by the ARRANGEMENT FOLD below
    (2026-08-01), because the compensating mechanism GAP-3 named never fired for
    a band: the §2.3 arrangement pass (``assembly`` step 3b) reads the SECTION
    ROOT, and a root whose sole child is the band carries no arrangement of its
    own by construction — that is precisely what makes the child a band. So a
    band declaring ``display:flex;gap:24px`` folded its ``gap``/``flexWrap``/
    ``justifyContent``/``verticalAlign`` onto the owner and dropped the ONE
    declaration that makes any of them do something. Measured on the default
    container: ``layout`` unset → the wrapper renders ``display:block`` → every
    folded flex/grid property is inert.

    Anything the arrangement fold cannot re-route is still RECORDED (returned as
    an EXCLUDED GAP + record_gap + trace), never the silent early-return the old
    ladder had (its :522-524 skip died with it). Full ledger integration = Step
    11 (A2).

    FR-31-5.1a: an inheritable base-tier ``text-align`` on the band folds to
    the owner's WP-native ``textAlign`` support (re-homed verbatim from the
    retired router; STOP-44 — the wrapper renders the class explicitly).

    Returns the list of EXCLUDED/NO-DESTINATION GAP objects for the caller's
    tracking channel; transferred values land in ``band_attrs`` via the
    destination. DB absent → no-op (parity with ``_build_css_attrs``).
    """
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

    # ---- GAP-3 partition — held back for the arrangement fold, never dropped ----
    # `held` collects the display/grid-template-* declarations the MAIN cascade
    # must not see (they flip layer_detect to GRID for the whole node, which
    # costs the band its CONTENT-layer destinations — measured: including
    # `grid-template-columns` in the main stream turns `max-width` from
    # `contentWidth` into an UNIMPLEMENTED_STUB). They are re-routed below
    # through the §2.3 arrangement channel instead.
    held: list = []

    def _partition(decl_map: dict, tier: str) -> list:
        kept: list = []
        for prop, value in decl_map.items():
            if prop in _CROSS_NODE_EXCLUDED_PROPS:
                held.append(Decl(property=prop,
                                 value=strip_important(value).strip(),
                                 tier=tier))
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

    gaps.extend(_fold_band_arrangement(
        band_node, owning_slug, band_attrs, css_rules, held,
        trace=trace, record_gap=record_gap,
    ))
    if not decls:
        return gaps

    # ---- The ONE cascade: process_element with a parent DESTINATION ----
    from converter.dispatch_spine import process_element
    from converter.services.recognise_helpers import get_container_kind
    from converter.services.has_inner import derive_delegates_content

    conn = db_lookup.get_connection()
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
