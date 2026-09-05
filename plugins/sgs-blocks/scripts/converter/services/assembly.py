"""assembly.py — Stage 3 §1 emit glue: build_block_markup (design §1).

Design ref: `.claude/plans/2026-06-26-stage3-child-shape-fork-design.md` §1.

Split out of `extraction.py` (mechanical re-house, EXECUTION Step 4 — zero logic
change). This module owns `build_block_markup`, the Spec 31 §3 ONE-dispatch
assembly function (variant → CSS → content merge, band-fold seam step-3c,
grid-item folds, post-lift passes). See `extraction.py`'s module docstring for
the wider Stage 3 content-extraction context.

`build_block_markup` calls back into `extraction.py` for `_build_css_attrs`,
`extract_content`, `_sole_passthrough_child` and `_bem_element_of`. Those calls
are resolved via a LATE-BOUND module-attribute lookup (`_ext.<name>`, imported
lazily inside the function) rather than a plain `from ... import ...`, for two
reasons:

  1. Circular import — `extraction.py` imports `build_block_markup` from this
     module at module level (to re-export it at its historical location for
     existing callers); this module must therefore NOT import `extraction` at
     module level, or the two modules would deadlock on import.
  2. Test monkeypatch compatibility — several tests do
     `monkeypatch.setattr(ext_mod, "_build_css_attrs", ...)` /
     `monkeypatch.setattr(_ext, "extract_content", ...)` against the
     `converter.services.extraction` module object (converter/tests/test_extraction.py
     and test_arrangement.py). A plain import binding here would capture the
     ORIGINAL function object at import time and never see the patched
     attribute. Reading `_ext.<name>` at call time picks up whatever the
     extraction module's attribute currently is, patched or not.

No block or slot string literals anywhere (scanned by gates/no_slug_literal).
"""
from __future__ import annotations

import logging
from typing import Any

_LOG = logging.getLogger(__name__)


def _fold_trace(stage: str, **kwargs: Any) -> None:
    """Surface a fold/per-area gap that was previously dropped SILENTLY.

    ``fold_helpers``' ``route_area_css_to_block_attrs`` and ``fold_band_css``
    both accept an injectable ``trace`` (and ``fold_band_css`` a ``record_gap``)
    whose default is a NO-OP, documented as "replaced by the orchestrator at
    wiring time". That wiring was never done: a repo-wide grep for ``trace=`` /
    ``record_gap=`` against these helpers returns ZERO call sites, so every
    "no destination for this area property" finding evaporated.

    Concretely: ``fold_helpers`` already builds the finding
    (``cross_node_gap_candidate`` / ``reason="no_area_attr"``) — the code was
    there, the channel was not. On the Mama's clone that swallowed the
    product-card ``__body`` padding, which then LOOKED correct only because the
    block's own hardcoded fallback happens to match the draft value. The
    comment at step 3d claiming the miss is "gap-tracked" was aspirational.

    This logs at WARNING so the drop appears in the run's captured output. It
    is deliberately cause-agnostic: it changes NO routing decision and fixes no
    lookup — it only makes an existing silent failure visible, which is the
    prerequisite for diagnosing the rest.
    """
    detail = " ".join(f"{k}={v!r}" for k, v in sorted(kwargs.items()))
    _LOG.warning("[fold-gap] %s %s", stage, detail)

from converter.context import ChildBlock, ContentGap, Recognition, ScalarLift
from converter.recognition import variant_attrs
from converter.dispatch_spine import emit_block_markup
from converter.block_serialization import parse_block_open_comment
from converter.services import content_gap_collector as _gap_collector
from converter.services.styling_helpers import collect_css_decls_for_element
from converter.db import db_lookup


# ---------------------------------------------------------------------------
# Emit glue — Stage 3 §1 walk/emit (design §1)
# ---------------------------------------------------------------------------


def build_block_markup(
    rec: Recognition,
    section_root: Any,
    media_map: dict | None = None,
    css_rules: dict | None = None,
    is_root: bool = True,
) -> str:
    """Assemble native WP block markup from extraction results.

    Implements the Spec 31 §3 ONE-dispatch unification: CSS attrs (§3.A) and
    content attrs (§3.B) both write into the SAME emitted block attrs dict.

    Merge order (Spec 31 §3 — content wins on collision):
      1. variant attrs     (e.g. {'variant': 'split'})
      2. CSS attrs         from _build_css_attrs → process_element → Write.attrs()
      3. content ScalarLifts from extract_content (overwrite CSS on same key)

    The COLLISION guard inside process_element hard-fails two CSS declarations
    targeting the same attr, so step-2 is already internally collision-free.
    A genuine cross-branch collision (CSS Write + content ScalarLift on the same
    attr key) is intentional: content is the ground-truth value, CSS is the
    layout floor — content wins.  If the orchestrator's COLLISION guard fires
    within the CSS branch itself, it propagates as ConservationError (never
    swallowed, Rule 4 / STOP-27).

    ``is_root``: True for the section root (layer_detect → OUTER); False for
    every child node (layer_detect → CONTENT/GRID per the node's own decls).
    The recursion seam ``_child_content_for_node`` passes is_root=False so
    the CSS pass is universal — it fires for the section AND every child.

    ``css_rules`` is threaded to both the CSS pass and ``extract_content``
    (the CSS-on-content / styling leg). Defaults to ``{}`` — a safe no-op
    that preserves the pre-existing content-only behaviour when no css_rules
    are provided.

    Design ref: `.claude/plans/2026-06-26-stage3-child-shape-fork-design.md` §1.
    No block or slot string literals (scanned by gates/no_slug_literal).
    """
    # Late-bound access to extraction.py's helpers — see module docstring for why
    # this is a lazy import through the module attribute rather than a direct one.
    from converter.services import extraction as _ext

    _css_rules = css_rules or {}

    # §3.A — CSS pass: route every CSS declaration through the resolver dispatch.
    # Returns {} when css_rules is empty / DB absent (safe no-op).
    css_attrs: dict = _ext._build_css_attrs(rec, section_root, _css_rules, is_root)

    # §3.B — Content pass: ScalarLifts + ChildBlocks + ContentGaps.
    results = _ext.extract_content(rec, section_root, media_map, _css_rules)

    # Assemble the final attr dict: variant → CSS → content (content wins collision).
    attrs: dict = dict(variant_attrs(rec))   # step 1: variant attrs
    attrs.update(css_attrs)                  # step 2: CSS Writes (OUTER box/grid/etc.)
    # step 3: ScalarLifts. CONTENT lifts OVERWRITE css_attrs (content is ground truth,
    # CSS the layout floor — documented). But the §2.5 uniform grid-item fold emits
    # gridItem* (GRID-layer) DEFAULTS, which must NOT overwrite a value the CSS pass
    # already set — the frozen `_lift_uniform_grid_item_css` setdefault contract
    # (convert.py:2888, "earlier paths win"; QC council MAJOR). Content NEVER targets a
    # gridItem* attr (the content resolvers emit none), so keying the setdefault on the
    # DB-sourced GRID-layer prefix affects ONLY the arrangement fold, never content.
    _grid_prefix = db_lookup.layer_attr_prefix("GRID")  # 'gridItem' (DB layer map, not a literal)
    for r in results:
        if isinstance(r, ScalarLift):
            # Wave 6 (2026-09-02) — scalar-media-roles.json's optional
            # `emit_as` field (db_lookup.scalar_media_emit_as()): a small,
            # explicit set of attrs (sgs/hero's splitImage/splitImageMobile
            # today) whose STORAGE shape moved from this composite
            # {id,url,alt} object to three separate scalar attrs when the
            # target block adopted the shared media-atom system. The LIFT
            # itself (scalar_media_from_img(), Branch A's img-scan/modifier
            # routing) is UNCHANGED — only the final write shape adapts, so a
            # future clone populates attrs the migrated block's render.php
            # actually reads instead of the now-dead composite name.
            # Widened 2026-09-02 (Tablet/video/svg tier routing): emit_as is no
            # longer a fixed id/url/alt trio — a video lift has no 'alt', so
            # this now expands WHATEVER keys the roster entry declares,
            # generically, defaulting each to 0 for 'id' and '' otherwise.
            _emit_as = db_lookup.scalar_media_emit_as(rec.slug or "", r.attr)
            if _emit_as and isinstance(r.value, dict):
                for _semantic_key, _target_attr in _emit_as.items():
                    _default = 0 if _semantic_key == "id" else ""
                    attrs[_target_attr] = r.value.get(_semantic_key, _default)
            elif _grid_prefix and r.attr.startswith(_grid_prefix):
                attrs.setdefault(r.attr, r.value)  # grid-item default — CSS pass wins
            else:
                attrs[r.attr] = r.value            # content wins on collision
        elif isinstance(r, ContentGap):
            # OBSERVABILITY ONLY (task: surface every content gap) — record, never
            # act on. `results` already carried these on every call (root AND every
            # recursive per-child build_block_markup call, since this is the SAME
            # dispatch line each time); they were simply discarded before this line
            # was added. Recording does not change `attrs`, `inner`, or which
            # block/attr anything resolves to. See content_gap_collector module
            # docstring for the proven-evidence trail.
            _gap_collector.record_content_gap(r, block_slug=rec.slug or "")

    # step 3a1: FR-31-2 behavioural scalar-attr lift (D949/Step-12 fix,
    # 2026-09-04). `lift_behavioural_attrs` was written for exactly this
    # (explicit `data-sgs-<attrName>` markers on a node, e.g. a draft's
    # `data-sgs-fx-trigger="scroll"`) but was never actually called from the
    # live walker — proven by grep before this fix (the only match for
    # `lift_behavioural_attrs(` in converter/ was its own `def` line), and
    # confirmed by a real convert_section() run emitting no fx* attrs despite
    # the data-sgs-fx-* markup being present. setdefault, matching step 3a2/
    # 3a3's precedent immediately below: an explicit value from variant/CSS/
    # content wins over an inferred behavioural marker, never the reverse.
    #
    # Rule 4 (D952-adversarial-council fix, 2026-09-04): `lift_behavioural_
    # attrs` also returns `skipped` — fx grammar attributes it recognised
    # but couldn't route to this block (no destination row). Recorded via
    # the SAME ContentGap/collector channel step 3's loop already uses
    # below, rather than a second, parallel reporting mechanism.
    if rec.slug is not None:
        _beh_attrs, _beh_skipped = db_lookup.lift_behavioural_attrs(section_root, rec.slug)
        for _beh_attr, _beh_value in _beh_attrs.items():
            attrs.setdefault(_beh_attr, _beh_value)
        for _skip_where, _skip_detail in _beh_skipped:
            _gap_collector.record_content_gap(
                ContentGap(where=_skip_where, detail=_skip_detail),
                block_slug=rec.slug,
            )

    # step 3a2: R-31-2 TAG-IDENTITY write (CG-2 fix, 2026-07-05 — the zero-h1
    # defect; shape-normalisation fix, 2026-08-17 — the h3-vs-numeric-enum
    # defect). Recognition uses the tag to pick the block then DISCARDED it on
    # every path; nothing wrote sgs/heading.level, so render.php's h2 default
    # flattened h1/h3/h4 (live page: 0×h1, 15×h2; SEO + WCAG hierarchy). For
    # each attr the block declares with role='tag-identity' (the sanctioned
    # ATTR_CLASSIFICATION_OVERRIDES channel — an explicit declaration, never
    # enum-contains guessing, FR-31-2.1a/R-31-9), write the source node's tag
    # when db_lookup.tag_identity_match resolves a value for it — matching is
    # done via a shape-normalised canonical form (2026-08-17 fix) so a
    # numeric-enum block (legacy [2,3,4] shape) and a string-tag-enum block
    # (["h2",...] canonical shape) both recognise 'h3', and a block declaring
    # NO enum at all still gets the tag written unconditionally rather than
    # being silently skipped (previously the SQL required enum_values IS NOT
    # NULL, and a bare `tag in allowed` never matched a numeric enum's
    # str-cast members against an "h3"-shaped tag — both excluded every block
    # except sgs/heading, the only one that happened to carry a string enum).
    # setdefault: an explicit value from variant/CSS/content wins. Same
    # precedent shape as steps 3b/5 (DB-gated attr declaration + node-
    # structural signal, no slug literal).
    if rec.slug is not None:
        _node_tag = getattr(section_root, "name", None)
        if _node_tag:
            for _ti_attr, _ti_allowed in db_lookup.tag_identity_attrs(rec.slug).items():
                _ti_value = db_lookup.tag_identity_match(_node_tag, _ti_allowed)
                if _ti_value is not None:
                    attrs.setdefault(_ti_attr, _ti_value)

    # step 3a3: text-wrap fidelity (D305). The theme applies `text-wrap: balance`
    # to ALL headings (core-blocks-critical.css `h1..h6`) — a deliberate
    # enhancement for AUTHORED content. A CLONED heading must instead render the
    # DRAFT's EFFECTIVE text-wrap: the declared value, else the CSS-initial `wrap`
    # (greedy), which overrides the theme so the clone matches the draft's line
    # breaks (proven live: a balanced hero H1 wrapped "Made for" instead of the
    # draft's "Made for the"). Gated on the block DECLARING a `textWrap` attr
    # (DB-driven — only sgs/heading does, so this is inert on every other block),
    # so it is universal and carve-out-free (R-31-9). FR-31-5.1 (absent → CSS
    # initial) + the step-3a2 tag-identity / step-3b layout-trigger precedent
    # (DB-gated attr declaration + node-structural CSS signal, no slug literal).
    # An AUTHORED heading leaves textWrap empty → inherits the theme's balance.
    if rec.slug is not None and "textWrap" in db_lookup.block_attrs(rec.slug):
        _eff_wrap = collect_css_decls_for_element(section_root, _css_rules)[0].get(
            "text-wrap", "wrap"
        )
        attrs.setdefault("textWrap", _eff_wrap)

    # step 3b: §2.3 ARRANGEMENT layout trigger. A container whose OWN CSS is
    # display:grid / display:flex must emit the `layout` attr — the wrapper renders
    # display:grid ONLY when 'grid'===$layout (class-sgs-container-wrapper.php:490);
    # gridTemplateColumns alone is INERT without it. This was the missing §2.3
    # "grid -> layoutType:grid" step (grid-item test + uniform fold were wired, this
    # trigger was not) — the nested-grid stacking bug (ingredients / products / gift /
    # social-proof). DB-gated on the block declaring a `layout` attr (container-
    # equivalents only — no dead attr on a non-container block); universal (R-31-9),
    # CSS-signature detected (R-31-2), no slug literal. setdefault: never override an
    # explicit layout already set.
    #
    # Bug (d): `layout_attrs` derives its value from CSS SIGNATURE alone
    # (display:grid/flex) — it has no idea what enum the RESOLVED block
    # actually declares for that attr name. A block that reuses the `layout`
    # attr NAME for a different closed vocabulary (e.g. a display-mode enum
    # unrelated to the arrangement trigger) would otherwise get an
    # out-of-enum value written straight through, which WP's schema
    # validation then SILENTLY COERCES to the enum's first member at render
    # time (the testimonial-slider `layout:"grid"` collapse-to-width-0 defect
    # — never a loud failure). Every candidate write is now gated through the
    # SAME `services.validate.validate()` every other resolver already uses
    # (content_band/grid/typography/outer_box/state_value_lift/tier_object/
    # tier_suffix) — attr-existence AND enum-membership — before it lands in
    # `attrs`. A value that fails either check is an honest NO_DESTINATION
    # gap (recorded via `_fold_trace`, the same observability channel every
    # other gap in this function already uses), never a coerced/invalid
    # write. No hardcoded per-attr branch (R-31-9): the SAME gate runs for
    # every key `layout_attrs` returns (`layout` and, for a flex container,
    # `flexDirection`).
    if rec.slug is not None and "layout" not in attrs:
        from converter.services import arrangement as _arr
        if "layout" in db_lookup.block_attrs(rec.slug):
            _layout_candidates = _arr.layout_attrs(section_root, _css_rules, rec.slug)
            if _layout_candidates:
                from converter.context import Ctx as _Ctx
                from converter.services.recognise_helpers import get_container_kind as _gck
                from converter.services.has_inner import derive_delegates_content as _ddc
                from converter.services.validate import validate as _validate

                _lconn = db_lookup.get_connection()
                try:
                    _lctx = _Ctx(
                        block_slug=rec.slug,
                        container_kind=_gck(rec.slug) or "",
                        delegates_content=_ddc(rec.slug) or 0,
                        variant_value=None,
                        variant_attr=None,
                        node=section_root,
                        is_root=is_root,
                        base_layer="ARRANGEMENT",
                        conn=_lconn,
                    )
                    for _lk, _lv in _layout_candidates.items():
                        if not _validate(_lctx, _lk, str(_lv)):
                            _fold_trace(
                                "layout_attr_invalid_enum",
                                block_slug=rec.slug, attr=_lk, value=_lv,
                                reason="NO_DESTINATION: value is not a member of the "
                                       "block's declared enum for this attr (or the "
                                       "attr is not declared at all) — gapped, not "
                                       "coerced/written",
                            )
                            continue
                        attrs.setdefault(_lk, _lv)
                finally:
                    _lconn.close()

    # step 3c: §2.4 / FR-31-5.3 COMPOSITE band-fold. A composite (NOT the default
    # container) whose section root has a SOLE pass-through inner wrapper (trust-bar's
    # __inner, etc.) must fold that band's interior box CSS onto its OWN container attrs:
    # max-width -> contentWidth, padding -> contentBandPadding*, gap/margin/min-height +
    # responsive tiers (grid-template EXCLUDED per GAP-3 — arrangement is step 3b's
    # concern). The default-container path folds this via _descend_container_children
    # (§2.4, extraction.py); the composite CONTENT mechanisms (array / scalar / inner-
    # blocks) do NOT, so a composite's band silently drops (proven: trust-bar dropped
    # contentWidth:1100 + gap). route_interior_css_to_parent_slot is the universal
    # FR-31-5.3 router (its slot_has_equivalent_block fork = the DB signal; no slug
    # literal). Gated OUT for the default container (already folded). Uses the SAME
    # _sole_passthrough_child detection (R-31-9). setdefault: a value the CSS/content
    # pass already set wins.
    if rec.slug is not None and rec.slug != db_lookup.container_default_slug():
        _inner = _ext._sole_passthrough_child(section_root, _css_rules)
        if _inner is not None:
            # EXECUTION Step 7 (FR-31-2.8.4): the composite band runs the SAME
            # dispatch cascade as the root (fold_band_css → process_element with
            # a parent Destination) — the retired element-token router + the
            # max-width-only fallback are DELETED; a BEM-less band folds
            # identically through the one cascade. GAP-3 exclusions are
            # RECORDED by the fold (EXCLUDED gaps + trace), never skipped.
            from converter.services.fold_helpers import fold_band_css
            _band_attrs: dict = {}
            # fold_band_css RETURNS its gaps list and accepts trace/record_gap
            # callables — all three were discarded here, so a band property with
            # no destination vanished exactly like the step-3d per-area case
            # below (Spec 31 §3.A step 8: FLAGGED, never silent-dropped).
            _band_gaps = fold_band_css(
                _inner, rec.slug, _band_attrs, _css_rules, trace=_fold_trace,
            )
            for _bg in _band_gaps or []:
                _fold_trace("band_fold_gap", owning_block=rec.slug, gap=_bg)
            for _bk, _bv in _band_attrs.items():
                attrs.setdefault(_bk, _bv)

    # step 3d: §2.9 L4 GRID-PER-AREA fold (FR-31-21.3 / Spec 31 §2.9 L4 row). A
    # composite whose section root has NAMED grid-area children (hero: content/media)
    # routes EACH area-wrapper's OWN box-CSS to the composite's per-area attrs
    # (content -> contentPadding*, media -> mediaPadding*/mediaBackground) via the
    # ported route_area_css_to_block_attrs (fold_helpers). db.attr_for_area_property is
    # the natural DB gate (no per-area attr for (block, area, prop) -> no write, gap-
    # tracked), so no gridAreas lookup is needed and the step is a no-op for every block
    # that declares no per-area attrs (default container, leaves) -- universal (R-31-9),
    # CSS-signature/BEM-element detected (R-31-2), no slug literal. Non-device residual
    # bands (@1280 etc.) drain to sgsCustomCss (D289 FR-31-5.2), APPENDED after any root
    # residual already present. setdefault: a per-area attr the CSS/content pass already
    # set wins (contentPadding* is written ONLY here in practice, so no collision). This
    # is the wiring the step-3c band-fold could not reach: step 3c fires only for a SOLE
    # pass-through child; a multi-area composite (2+ named areas) has none, so its
    # per-area box CSS was silently dropped (the hero content-padding gap).
    if rec.slug is not None:
        from converter.services.fold_helpers import route_area_css_to_block_attrs
        from converter.services.styling_helpers import serialise_residual_bands
        from converter.models import ResidualBand
        for _area_child in section_root.children:
            if not getattr(_area_child, "name", None):
                continue  # skip NavigableString / non-Tag nodes
            _area_el: str | None = None
            for _cls in (_area_child.get("class", []) or []):
                _bem = db_lookup.parse_sgs_bem(_cls)
                if _bem and _bem.element:
                    _area_el = _bem.element
                    break
            if _area_el is None:
                continue
            _area_attrs: dict = {}
            _area_sink: list[ResidualBand] = []
            route_area_css_to_block_attrs(
                _area_child, _area_el, rec.slug, _area_attrs, _css_rules,
                residual_sink=_area_sink,
                # Spec 31 §3.A step 8: a property with no destination is FLAGGED,
                # never silent-dropped. fold_helpers already builds that finding;
                # without this kwarg it went to _noop_trace and vanished.
                trace=_fold_trace,
            )
            for _ak, _av in _area_attrs.items():
                attrs.setdefault(_ak, _av)
            _area_residual = serialise_residual_bands(_area_sink)
            if _area_residual:
                _existing_css = attrs.get("sgsCustomCss", "")
                attrs["sgsCustomCss"] = (
                    f"{_existing_css}\n{_area_residual}" if _existing_css else _area_residual
                )

    # step 4: FR-31-20 variant detection (port of convert.py:4892-4919). Set the
    # variant-selector attr from the draft's LIFTED fingerprint (the attrs just
    # assembled — content ScalarLifts like splitImage are now present) so
    # render.php's ORIGINAL variant gate fires (e.g. hero render.php:250
    # `$is_split = 'split' === $variant`). Without this the new engine left the
    # variant unset and render.php fell back to the standard hero, IGNORING the
    # split image + grid attrs entirely (W3 LANDED proof, hero bug 3). DB-driven
    # (R-31-1) via variant_slots; universal (R-31-9) — variant_attr_for returns
    # None for non-variant blocks, making this a no-op for them. NOT a 4th walk
    # branch (it reads the lifted attrs, mirrors the convert.py oracle exactly).
    if rec.slug is not None:
        _variant_attr = db_lookup.variant_attr_for(rec.slug)
        if _variant_attr is not None:
            _child_records = [r for r in results if isinstance(r, ChildBlock)]
            _child_slugs = [r.slug for r in _child_records]
            # Child-ATTRIBUTE-VALUE composition signal (2026-09-06). Tier 1 of
            # the composition tiebreak needs only the child SLUGS above; tier 2
            # needs each child's OWN extracted attributes, for the case where
            # two variants nest the identical set of child block types and
            # differ only in how one of those children is configured.
            #
            # `ChildBlock` carries `(slug, content)` where `content` is the
            # child's already-SERIALISED block markup — its attributes exist
            # there and nowhere else at this point in the pipeline, because
            # `build_block_markup()` returns a string, not a dict. Reading them
            # back from the markup is therefore the whole plumbing change: it
            # reuses the emitted artefact rather than threading a parallel
            # attribute channel through every ChildBlock construction site (six
            # of them, in three different extraction paths). The read-back is
            # exact, not lossy — see `parse_block_open_comment`'s docstring for
            # why the first `-->` is provably the terminator.
            #
            # An unparseable child contributes nothing rather than an empty
            # guess: it is simply absent from `_child_blocks`, so it can never
            # manufacture a match.
            _child_blocks: list[tuple[str, dict]] = []
            for _cb in _child_records:
                _parsed = parse_block_open_comment(_cb.content)
                if _parsed is not None:
                    _child_blocks.append((_cb.slug, _parsed[1]))
            _detected = db_lookup.detect_variant(
                rec.slug, attrs, child_slugs=_child_slugs, child_blocks=_child_blocks
            )
            if isinstance(_detected, str):
                attrs[_variant_attr] = _detected

    # step 5: inheritStyle resolution (port convert.py:4994-5007, W3 MF2). A button's
    # style preset (primary/secondary/outline) is encoded in its --modifier BEM class
    # (Spec 11 §4); render.php emits is-style-<preset>. Gated on the block declaring a
    # STRING inheritStyle attr — distinguishes sgs/button's style ENUM from the BOOLEAN
    # inheritStyle on text/heading/quote (setting a string on those suppresses their
    # styling). DB-driven (R-31-1), universal over string-enum inheritStyle blocks
    # (R-31-9), no slug literal. NOT a content role — read from the node's own class.
    if (
        rec.slug is not None
        and "inheritStyle" not in attrs
        and db_lookup.block_attrs(rec.slug).get("inheritStyle", {}).get("attr_type") == "string"
    ):
        _node_classes = section_root.get("class", []) if hasattr(section_root, "get") else []
        _own_block_name = (rec.slug or "").split("/", 1)[-1]
        # Shared preset-modifier detection (db_lookup.preset_style_for_element): a
        # direct preset modifier via inherit_style_presets(), else the slots
        # alias→default_attrs channel (inherit_style_for_modifier — the DB's
        # `ghost-button`/`button-ghost` aliases carry {"inheritStyle":"outline"}, so a
        # draft `--ghost` maps with no code literal). This is the SAME mechanism the
        # composite nested-CTA mirror uses (walk.py foreign-identity arm — e.g.
        # sgs/product-card ctaStyle mirroring sgs/button) — ONE implementation, no
        # inline duplication (R-31-9).
        _resolved_style = db_lookup.preset_style_for_element(_node_classes, rec.slug)
        _matched = _resolved_style is not None
        if _matched:
            attrs["inheritStyle"] = _resolved_style
        # UX-Q2 (Part 7, D279): no modifier resolved a preset/alias. When the
        # draft element ALSO carries no BARE root class of its OWN family
        # (e.g. a plain contextual <a> with zero sgs-button-* signal at all —
        # the announcement-strip "Find out more" link, atomic-tag-swapped to
        # sgs/button with no BEM class of its own), never let it silently
        # fall through to the block's default preset look (block.json
        # default 'primary'). Emit 'custom' so the block's OWN lifted CSS
        # paints instead of a forced primary-button appearance. Signal is
        # STRUCTURAL/DB-driven only (presence/absence of the recognised
        # button-root/modifier class on the draft element) — never the
        # link's text content, never the parent block's slug.
        if not _matched:
            _has_own_family_class = any(
                isinstance(_c, str)
                and (_b := db_lookup.parse_sgs_bem(_c)) is not None
                and _b.block == _own_block_name
                for _c in (_node_classes or [])
            )
            if not _has_own_family_class:
                attrs["inheritStyle"] = "custom"

    # step 5a: ELEMENT-keyed slot default attrs (2026-08-07). The sibling of step 5's
    # modifier route, on the same DB column (slots.standalone_block_default_attrs) but
    # keyed on the node's `__element` segment rather than its `--modifier`:
    # `__subheading` -> sgs/heading {"headingRole":"subheading"}. Step 5's channel
    # cannot serve this — inherit_style_for_modifier hard-reads only `inheritStyle`,
    # and a subheading is an element, not a modifier — so widening it would give one
    # function two keying models. db_lookup.slot_default_attrs_for returns the WHOLE
    # default_attrs dict for the first element that carries one.
    #
    # setdefault: the defaults merge UNDERNEATH everything already assembled
    # (variant, CSS pass, content lifts, and step 5's own inheritStyle), so a value
    # the draft actually declared always wins over the slot's default — the same
    # precedence every other DB-gated step here uses.
    #
    # Universal + inert by construction (R-31-1 / R-31-9): a node whose element
    # resolves to no defaults-carrying slot gets {} and nothing happens, so this is a
    # no-op for the overwhelming majority of blocks. No slug literal, no attr-name
    # literal — the attr NAMES are whatever the DB row holds.
    if rec.slug is not None and hasattr(section_root, "get"):
        for _dk, _dv in db_lookup.slot_default_attrs_for(
            section_root.get("class", []) or []
        ).items():
            attrs.setdefault(_dk, _dv)

    # step 5b: preset colour is CLASS-driven (Spec 32 FR-32-2/8). A recognised
    # preset renders via the `.sgs-button--{preset}` class, which consumes the
    # per-client `--wp--custom--button-presets--{preset}--{role}` tokens (base +
    # hover) that WordPress auto-generates from the snapshot buttonPresets. So the
    # converter sets NO colour attrs (they stay empty = override-only, FR-32-4)
    # and STRIPS any colour the CSS pass lifted to the WP-native style.color.*
    # channel for a preset button — otherwise that lifted colour (inline via WP
    # supports) would fight the class + kill :hover. inheritStyle (already set in
    # step 5) is what render.php turns into the class. Custom buttons
    # (inheritStyle absent/'custom') keep their lifted style.color — step 5b does
    # not fire for them (they have no preset class to govern colour).
    if rec.slug is not None and attrs.get("inheritStyle") in db_lookup.inherit_style_presets():
        _stl = attrs.get("style")
        if isinstance(_stl, dict) and isinstance(_stl.get("color"), dict):
            _stl["color"].pop("text", None)
            _stl["color"].pop("background", None)
            if not _stl["color"]:
                _stl.pop("color", None)
            if not _stl:
                attrs.pop("style", None)

    # step 6: R6 background-strip (port convert.py:5017-5028, W3 MF2). The CSS pass
    # (_build_css_attrs -> lift_root_supports_to_style) lifts background-color into
    # style.color.background; for a PRESET button WP paints that onto the
    # .sgs-button-wrapper as a coloured box while the face colour comes from the
    # is-style-<preset> class — so the lifted background MUST be removed (background
    # only, never text). Custom buttons (inheritStyle absent/'custom') keep it.
    if rec.slug is not None and attrs.get("inheritStyle") in db_lookup.inherit_style_presets():
        _style = attrs.get("style")
        if isinstance(_style, dict):
            _colour = _style.get("color")
            if isinstance(_colour, dict) and "background" in _colour:
                del _colour["background"]
                if not _colour:
                    _style.pop("color", None)
                if not _style:
                    attrs.pop("style", None)

    # step 7: FR-31-4 section-outer width — UNIVERSAL across EVERY section-class-level
    # block (Bean review 2026-07-01, defects #1 + trust-bar-width). A block emitted as
    # the top-level SECTION root (is_root) with NO own max-width is FULL-BLEED (WP-native
    # align:"full"); WITH a max-width it stays constrained (its maxWidth already lands via
    # the CSS pass — e.g. the brand/about section). This fires for EVERY section-class
    # block identically — sgs/container, container-equivalents, AND composites (hero /
    # trust-bar / cta-section) — because they all declare supports.align:['wide','full'],
    # carry supports.sgs.is_section_root, and render through the shared SGS_Container_Wrapper
    # (composite-mirror, FR-31-21.1). Gating on the container slug was a carve-out CHEAT
    # (R-31-9) that left composites constrained. The universal signal is is_root itself:
    # build_block_markup is is_root=True ONLY for the top-level section (children pass
    # is_root=False), so this never touches a nested block. setdefault = idempotent (never
    # overrides an align emitted upstream). Port convert.py:4551-4553.
    if is_root and rec.slug is not None:
        _sec_base, _ = collect_css_decls_for_element(section_root, _css_rules)
        # Spec 31 §3 step 7 (spec:157/179): gate L1 full-bleed on the block actually
        # DECLARING align:["full"] in block_supports — never emit an align the block
        # cannot honour. Universal + DB-driven: every section-class block (container +
        # composites) declares it, so this passes for all of them, but a future is_root
        # block without align support is correctly left constrained rather than carrying
        # a dead attr. widthMode is RETIRED (D230/D231) — align is the OUTER full-bleed.
        _align_support = db_lookup.block_supports_for(rec.slug).get("align") or []
        if not _sec_base.get("max-width") and "full" in _align_support:
            attrs.setdefault("align", "full")

    # step 8: token-resolution advisory check (detection-only — see
    # converter/services/token_resolution_check.py module docstring). This is
    # the ONE chokepoint where every resolver's CSS Write AND every content
    # ScalarLift have already merged into the final `attrs` dict (steps 1-7
    # above), so it is the earliest point that sees the value WordPress will
    # actually render, regardless of which resolver produced it (the proven
    # gap: a resolver with role=None or an ungated colour branch — e.g.
    # grid.py's GRID-item props, fold_helpers.route_area_css_to_block_attrs's
    # per-area attrs (D642: the former resolvers/grid_area.py was dead code
    # [found at D639, deleted at D642] — this is the real live per-area path), pseudo_
    # overlay.py's solid/gradient colours — can write a draft-local
    # `var(--x)` straight through with no token resolution at all). Findings
    # are RECORDED, never acted on: no attr is dropped, no value rewritten,
    # no build failed. `token_resolution_check.check_attrs` is inert
    # (returns []) until `configure_token_resolution_from_run` has been
    # called (entry.py does this once per convert_section call).
    if rec.slug is not None:
        from converter.services import token_resolution_check as _token_check
        _token_check.record_findings(_token_check.check_attrs(attrs, rec.slug, _css_rules))

    # ChildBlock.content is now ALWAYS the child's COMPLETE block markup (W3 MF4
    # collapse) — emit it verbatim. The prior `if attr: emit_block_markup(slug,
    # {attr: content}, "")` fork is DELETED: it dropped every non-primary content
    # attr (the hero-CTA url/inheritStyle loss) and double-wrapped the InnerBlocks
    # path. Deleting it atomically with the _child_content_for_node collapse is
    # required — a stale fork would stuff full markup into an attr value (corruption).
    def _child_markup(cb: ChildBlock) -> str:
        return cb.content

    inner = "".join(_child_markup(r) for r in results if isinstance(r, ChildBlock))
    return emit_block_markup(rec.slug, attrs, inner)
