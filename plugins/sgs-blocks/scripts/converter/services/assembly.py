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

from typing import Any

from converter.context import ChildBlock, Recognition, ScalarLift
from converter.recognition import variant_attrs
from converter.orchestrator import emit_block_markup
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
            if _grid_prefix and r.attr.startswith(_grid_prefix):
                attrs.setdefault(r.attr, r.value)  # grid-item default — CSS pass wins
            else:
                attrs[r.attr] = r.value            # content wins on collision

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
    if rec.slug is not None and "layout" not in attrs:
        from converter.services import arrangement as _arr
        if "layout" in db_lookup.block_attrs(rec.slug):
            for _lk, _lv in _arr.layout_attrs(section_root, _css_rules).items():
                attrs.setdefault(_lk, _lv)

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
            fold_band_css(_inner, rec.slug, _band_attrs, _css_rules)
            for _bk, _bv in _band_attrs.items():
                attrs.setdefault(_bk, _bv)

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
            _detected = db_lookup.detect_variant(rec.slug, attrs)
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
        _presets = db_lookup.inherit_style_presets()
        _node_classes = section_root.get("class", []) if hasattr(section_root, "get") else []
        _own_block_name = (rec.slug or "").split("/", 1)[-1]
        _matched = False
        for _cls in (_node_classes or []):
            if not isinstance(_cls, str):
                continue
            _bem = db_lookup.parse_sgs_bem(_cls)
            if _bem is None or not _bem.modifier:
                continue
            _mod = _bem.modifier.lower()
            if _mod in _presets:
                attrs["inheritStyle"] = _mod
                _matched = True
                break
            # A modifier that is not itself a preset value resolves through the
            # slots alias→default_attrs channel (db_lookup.inherit_style_for_modifier,
            # R-31-1): the DB's `ghost-button`/`button-ghost` aliases carry
            # {"inheritStyle": "outline"}, so a draft `--ghost` maps with no code
            # literal; a future synonym is a slots-row seed, zero code change.
            _alias_style = db_lookup.inherit_style_for_modifier(_mod, rec.slug)
            if _alias_style:
                attrs["inheritStyle"] = _alias_style
                _matched = True
                break
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
