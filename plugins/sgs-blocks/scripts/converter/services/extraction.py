"""extraction.py — Stage 3 content extraction: ScalarLifts / ChildBlocks / ContentGaps.

Design ref: `.claude/plans/2026-06-26-stage3-child-shape-fork-design.md` §1/§2/§6.

Given a Recognition + a parsed bs4 section node, extract the composite's content
as a list of ScalarLift / ChildBlock / ContentGap items.  Conservation is enforced
per-mechanism as a hard ContentConservationError (never a silent drop).

No block or slot string literals anywhere (scanned by gates/no_slug_literal).
"""
from __future__ import annotations

import logging
import re
from typing import Any

from bs4 import NavigableString, Tag

# ---------------------------------------------------------------------------
# Content-noun / styling-suffix regexes for expected_content_gaps (FIX 3).
# Used ONLY as a GAP-only completeness heuristic — never affects block/slot
# routing (no name list, no per-block carve-out, per R-31-1 "no hardcoded dicts").
# ---------------------------------------------------------------------------

_CONTENT_NAME_RE = re.compile(
    r"(media|image|img|logo|photo|avatar|video|thumb|icon|text|title|heading|headline"
    r"|quote|caption|name|role|org|company|author|summary|phrase|source|body"
    r"|description|excerpt|label|date|link|url)",
    re.I,
)
_STYLING_RE = re.compile(
    r"(colour|color|fontsize|fontweight|fontstyle|lineheight|width|height|unit"
    r"|align|gap|padding|margin|radius|shadow|opacity|duration|easing|scale"
    r"|style$|weight$)",
    re.I,
)

from converter.context import (
    ChildBlock,
    ContentConservationError,
    ContentGap,
    Recognition,
    ScalarLift,
)
from converter.services.content_select import (
    content_children,
    has_bem_element_descendant,
    select_one,
)
from converter.services.recognise_helpers import bem_element_to_canonical_slot
from converter.resolvers.scalar_content import lift_scalar_content
from converter.resolvers.array_content import lift_array_content
from converter.resolvers.styling_content import lift_styling_content
from orchestrator.converter_v2 import db_lookup

# Emit-glue imports (stage 3 §1 walk/emit — design §1).
from converter.recognition import recognise, recognition_for_slug
from converter.services.field_extractors import extract_field_value, resolve_icon_kind

# ---------------------------------------------------------------------------
# Import-forwarding (EXECUTION Step 4 mechanical split, 2026-07-04).
#
# `_build_css_attrs` (Spec 31 §3.A CSS pass) and `build_block_markup` (Spec 31
# §3 emit-glue assembly) were re-housed into their own service modules —
# `css_pass.py` and `assembly.py` respectively — so this module stays focused
# on content extraction. They are re-imported HERE (at their historical
# location) purely so existing callers (`from converter.services.extraction
# import build_block_markup`, etc.) and test monkeypatches
# (`monkeypatch.setattr(ext_mod, "_build_css_attrs", ...)` /
# `monkeypatch.setattr(_ext, "extract_content", ...)`) keep working unchanged.
#
# `assembly.build_block_markup` calls `_build_css_attrs` / `extract_content` /
# `_sole_passthrough_child` / `_bem_element_of` back through this module's
# namespace via a LAZY `from converter.services import extraction as _ext`
# import inside its own function body (never at assembly.py's module level) —
# that is what avoids a load-time circular import here, and is also why a
# monkeypatch on this module's `_build_css_attrs`/`extract_content` attribute
# is still honoured by build_block_markup at call time.
# ---------------------------------------------------------------------------
from converter.services.css_pass import _build_css_attrs
from converter.services.assembly import build_block_markup


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _label(child: Any) -> str:
    """Return a short human label for a content-child node.

    Uses the first sgs- CSS class found on the node, else falls back to the
    node's HTML tag name.  Never references a block slug or slot literal.
    """
    classes = child.get("class", []) if hasattr(child, "get") else []
    for cls in (classes or []):
        if isinstance(cls, str) and cls.startswith("sgs-"):
            return cls
    return getattr(child, "name", "unknown") or "unknown"


# ---------------------------------------------------------------------------
# Mechanism A — scalar-content-lift via derived_selector
# ---------------------------------------------------------------------------


def run_mechanism_a(rec: Recognition, section_root: Any, media_map: dict | None = None) -> list:
    """Mechanism A: scalar content lift — the MODULARISED working function (D246, W2).

    Spec 31 §1/§3.B1: this is the modularised `_lift_scalar_attrs_by_selector`
    (now `converter.resolvers.scalar_content.lift_scalar_content`), the proven
    working content-lift — NOT a from-scratch reimplementation (the D245 from-scratch
    `content_attrs_with_selector`/`extract_payload`/object-shaping path is superseded).

    `lift_scalar_content` returns a plain attr dict; an attr whose selector matches
    nothing emits NO key — Spec 31 §3.B1 mandates this strict no-op (it is the
    faithful behaviour of `_lift_scalar_attrs_by_selector`). Wrapped here as
    ScalarLifts so build_block_markup's assembly is unchanged.

    ``media_map`` is threaded through to ``lift_scalar_content`` so the image-object
    branch resolves a mockup src to its uploaded WP URL per §3.B1
    (`{url: resolve_media_url(src), ...}`). It defaults to ``{}`` — the new engine
    has no media-map LOADER/driver yet (this entry has no production caller; it is
    driven via the STOP-21 LANDED recipe), so until the engine is wired into the
    pipeline the map is empty and image srcs stay un-remapped. That is a tracked
    dependency, NOT a silent claim of completeness.

    CONTENT COMPLETENESS NOTE (council A2, 2026-06-28): scalar content drops
    (selector matched nothing / empty text / no <img>) are NOT yet caught by any
    gate — Spec 31 §12.2.1's conservation ledger (`declare_input`) currently
    captures only the CSS `(selector, property, value)` stream, not content routing
    units. `expected_content_gaps` (below) covers only attrs with NO role/selector.
    Closing this hole is a ledger/instrument change (extend `declare_input` to
    capture CONTENT routing units per Spec 31 §3 line 101) — design-gated, NOT a
    patch here (a per-attr ContentGap inside the lift would breach §3.B1's strict
    no-op). Tracked in next-session-prompt Register A / A2.
    """
    lifted = lift_scalar_content(section_root, rec.slug, media_map=media_map or {})
    return [ScalarLift(attr=name, value=value) for name, value in lifted.items()]


# ---------------------------------------------------------------------------
# Mechanism B — faithful port of _route_composite_interior (convert.py:4124-4308)
#               + walk() child-resolution (convert.py:4446-4527)
# ---------------------------------------------------------------------------

# Module-level logger for G3 NULL-path traces (never silent per conservation rule).
_LOG = logging.getLogger(__name__)


def _mobile_suffixes() -> frozenset[str]:
    """Return the set of breakpoint suffix names that map to 'Mobile' tier.

    Ported from convert.py:4178-4187 (_route_composite_interior preamble).
    Uses db_lookup.breakpoint_suffix_rules() — no hardcoded suffix dict (R-31-1).

    SHAPE (verified against the live DB, 2026-06-30): breakpoint_suffix_rules()
    returns ``[(media_condition, [tier_marker, ...]), ...]`` — the FIRST tuple
    element is the @media CONDITION (e.g. ``'max-width: 767'``), the SECOND is
    the list of tier MARKERS (e.g. ``['Mobile']`` or ``['Tablet', 'Desktop']``).
    We therefore flatten the SECOND element and collect every marker that IS
    'Mobile' — exactly the ``_is_mobile_modifier`` semantics of the working
    convert.py oracle (sfx == 'Mobile').

    PRIOR BUG (fixed 2026-06-30, W3 LANDED proof): this iterated as
    ``for marker, suffixes in bp_rules: if marker == 'Mobile'`` — testing the
    media CONDITION against 'Mobile', which NEVER matches, so the set was always
    empty and ``is_mobile`` was always False.  That collapsed both art-directed
    images (``--mobile`` + ``--desktop``) onto the base ``splitImage`` attr
    (desktop wins by source order), silently dropping ``splitImageMobile``.

    Returns a frozenset of lowercase suffix strings so callers can do:
        ``img_modifier.lower() in _mobile_suffixes()``
    """
    try:
        bp_rules = db_lookup.breakpoint_suffix_rules()
    except Exception:  # noqa: BLE001 — soft-fail; DB unavailable during tests
        return frozenset()
    mobile: set[str] = set()
    for _media_condition, tier_markers in bp_rules:
        for marker in tier_markers:
            if marker == "Mobile":
                mobile.add(marker.lower())
    return frozenset(mobile)


def _child_content_for_node(
    child_node: Any,
    child_slug: str,
    css_rules: dict | None = None,
    media_map: dict | None = None,
) -> str:
    """Produce the FULL WP block markup for a resolved child node.

    W3 child-lift collapse (council MF4, 2026-06-30): the prior DUAL contract
    (TEXT value for a scalar child via extract_payload + the primary attr; inner
    markup for an InnerBlocks parent) is COLLAPSED. Every child now routes through
    ``build_block_markup(is_root=False)`` — the ONE unified content+CSS+variant
    dispatch (Spec 31 §3.B.0: identical recognise→content→CSS machinery whatever
    the output form). ``ChildBlock.content`` therefore ALWAYS carries the child's
    COMPLETE block markup; ``_child_markup`` returns it verbatim (no re-emit).

    Why the collapse is correct, not just cleaner:
      - The old scalar branch lifted ONLY the child's primary content attr (label),
        silently dropping every other content attr (url, etc.) — the hero-CTA bug.
        Routing through build_block_markup runs the named-leaf arm, which lifts the
        FULL attr set (label + url + inheritStyle).
      - The old InnerBlocks-parent branch ALSO returned full child markup, but the
        old _child_markup then RE-WRAPPED it via emit_block_markup(slug, {}, content)
        — a latent double-wrap. Returning full markup once and emitting it verbatim
        removes that bug.

    ``child_slug`` is the caller's PARENT-SCOPED resolution (G1 child_block_for_parent_token
    can override the global alias — Spec 22 §FR-31-5.3). recognition_for_slug
    preserves it (re-recognising would lose accordion __item -> sgs/accordion-item).

    ``css_rules`` is threaded so the CSS pass (Spec 31 §3.A) fires for child nodes.
    Children are non-root (is_root=False — layer_detect must not force OUTER, MF-3).

    Returns "" if the child does not recognise.
    """
    child_rec = recognition_for_slug(child_slug, child_node)
    if child_rec.kind == "unrecognised" or child_rec.slug is None:
        return ""
    return build_block_markup(
        child_rec, child_node, css_rules=css_rules, is_root=False, media_map=media_map
    )


def _emit_content_leaf(node: Any, css_rules: dict | None, media_map: dict | None) -> tuple[str | None, str]:
    """Emit a slug-None text-leaf as its ladder-target CONTENT block (FR-31-4.1 #5).

    A text-only sgs-classed node is CONTENT, never a `sgs/container` wrapping raw
    text (which fails WP block validation). Target ladder (port of the frozen
    _route_text_leaf's target selection, convert.py:5620 — DB-driven / no slug literal):
      (a) the node's OWN tag via atomic_tag_map (h2->heading, p->text, …);
      (b) else a text-capable BEM-element hyphen-segment (tail-first);
      (c) else the DB default text block (`standalone_block_for('text')`).
    The content itself lands via build_block_markup -> run_mechanism_leaf (the
    leaf lifts its own element text). The leaf's own typography/colour CSS lift is
    DEFERRED to Step-7 (scope A: content now, interior CSS-fold later).

    Returns (target_slug, markup) or (None, "") when no text-capable target exists.
    """
    from converter.services.text_leaf import is_text_capable_block

    # A text-leaf with no text AND no image has nothing to lift — return a gap
    # signal (caller emits ContentGap) rather than manufacturing an EMPTY sgs/text
    # ChildBlock, which would falsely satisfy the run_container_default conservation
    # guard (STOP-27 empty-container masking — QC correctness finding 3, 2026-07-01).
    if not node.get_text(strip=True) and node.find("img") is None:
        return None, ""

    target: str | None = db_lookup.atomic_tag_map().get(getattr(node, "name", None))
    # Rung (a) is text-CAPABILITY gated (matching rung (b)): the node's own tag must
    # map to a text-capable block. An <a>/<hr> text-leaf must NOT emit core/button /
    # core/separator (a non-text block carrying no readable content, STOP-23 — QC
    # correctness finding 2). Non-text-capable → fall through to (b)/(c) -> sgs/text.
    if target is not None and not is_text_capable_block(target):
        target = None
    if target is None:
        sgs = [c for c in (node.get("class", []) or [])
               if isinstance(c, str) and c.startswith("sgs-")]
        for cls in sgs:
            bem = db_lookup.parse_sgs_bem(cls)
            if bem and bem.element:
                for seg in reversed(bem.element.split("-")):
                    cand = db_lookup.block_for_slot_token(seg)
                    if cand and is_text_capable_block(cand):
                        target = cand
                        break
            if target:
                break
    if target is None:
        target = db_lookup.standalone_block_for("text")
    if target is None:
        return None, ""

    leaf_rec = recognition_for_slug(target, node)
    if leaf_rec.slug is None or leaf_rec.kind == "unrecognised":
        return None, ""
    markup = build_block_markup(
        leaf_rec, node, css_rules=css_rules, is_root=False, media_map=media_map
    ) or ""
    return (target, markup) if markup else (None, "")


def _route_container_child(
    child: Any, results: list, css_rules: dict | None, media_map: dict | None
) -> None:
    """Route ONE direct child of a default `sgs/container` (Spec 31 §2.4/§2.5 + FR-31-4.1).

    Precedence (CONTENT leg — a grid item and a sibling'd child route identically here;
    the §2.4 grid-item-vs-fold decision is made by the caller):
      1. recognise() resolves a block (named/atomic/scalar) -> emit ChildBlock
         (recurse its own content via _child_content_for_node). Covers brand's
         `__image` (-> atomic sgs/media), a heading, a button, a nested composite.
      2. slug-None text-leaf -> emit its ladder-target CONTENT block (never a
         container wrapping raw text — FR-31-4.1 #5).
      3. slug-None WRAPPER (element children) -> becomes its OWN `sgs/container`,
         recursed (§2.4 "a sibling'd child, or one with no block identity, recurses
         as its own container"). This REPLACES the D254 blind-descend that flattened
         a wrapper's children up into this container — the brand `__content` bug: the
         2-col grid saw [h2, quote, cta, img] as 4 items instead of 2 grid items
         (`__content`, `__image`). Recursion routes through build_block_markup ->
         run_container_default so the wrapper's OWN CSS (its flex/grid + band) lands
         on ITS own container, not this one.
      4. slug-None leaf with no content/children -> tracked ContentGap.
    """
    from converter.services.text_leaf import node_is_text_leaf

    child_rec = recognise(child)
    if child_rec.slug is not None and child_rec.kind != "unrecognised":
        content = _child_content_for_node(
            child, child_rec.slug, css_rules=css_rules, media_map=media_map
        )
        if content:
            results.append(ChildBlock(slug=child_rec.slug, content=content))
        else:
            results.append(ContentGap(
                _label(child),
                f"resolved child {child_rec.slug!r} produced no markup",
            ))
        return

    csgs = [c for c in (child.get("class", []) or [])
            if isinstance(c, str) and c.startswith("sgs-")]
    if csgs and node_is_text_leaf(child):
        tslug, markup = _emit_content_leaf(child, css_rules, media_map)
        if markup:
            results.append(ChildBlock(slug=tslug, content=markup))
        else:
            results.append(ContentGap(
                _label(child), "text-leaf produced no content block"))
    elif child.find(True) is not None:
        # slug-None WRAPPER -> its OWN sgs/container (grid item / sibling'd recurse),
        # NOT flattened (§2.4). DB-driven default slug (R-31-1), no literal.
        default_slug = db_lookup.container_default_slug()
        if default_slug is None:
            results.append(ContentGap(
                _label(child),
                "slug-None wrapper: container default slug unavailable (DB absent)",
            ))
            return
        content = _child_content_for_node(
            child, default_slug, css_rules=css_rules, media_map=media_map
        )
        if content:
            results.append(ChildBlock(slug=default_slug, content=content))
        else:
            results.append(ContentGap(
                _label(child), "slug-None wrapper produced no container markup"))
    else:
        results.append(ContentGap(
            _label(child),
            "slug-None node with no recognisable content or child elements",
        ))


def _sole_passthrough_child(parent: Any, css_rules: dict | None) -> Tag | None:
    """§2.4 sole pass-through detection — SHARED by the default-container fold
    (``_descend_container_children``) and the composite band-fold (``build_block_markup``
    step 3c), so the "which inner wrapper folds" rule is single-sourced (R-31-9).

    Returns the single slug-None pass-through inner wrapper when the parent does NOT
    itself arrange its children AND has exactly ONE real child that is a bare structural
    wrapper (no registered block identity, not a text leaf, has element children of its
    own); else None. Name-free — recognition + CSS-signature only (R-31-2). The
    ``not parent_arranges`` guard is the §2.4 grid-item-test-first rule: if the parent
    itself arranges, its single child is a GRID ITEM, not a pass-through to fold.
    """
    from converter.services.text_leaf import node_is_text_leaf
    from converter.services import arrangement

    element_children = [c for c in parent.children if isinstance(c, Tag)]
    loose_text = [
        c for c in parent.children
        if isinstance(c, NavigableString) and c.strip()
    ]
    if arrangement.carries_arrangement(parent, css_rules or {}):
        return None
    if len(element_children) != 1 or loose_text:
        return None
    only = element_children[0]
    only_rec = recognise(only)
    if (
        (only_rec.slug is None or only_rec.kind == "unrecognised")
        and not node_is_text_leaf(only)
        and only.find(True) is not None
    ):
        return only
    return None


def _bem_element_of(node: Any) -> str | None:
    """The BEM __element token of a node's first sgs- class (DB parse, name-free)."""
    for cls in (node.get("class", []) or []):
        if isinstance(cls, str):
            bem = db_lookup.parse_sgs_bem(cls)
            if bem and bem.element:
                return bem.element
    return None


def _descend_container_children(
    parent: Any, results: list, css_rules: dict | None, media_map: dict | None
) -> None:
    """FR-31-4.1 / Spec 31 §2.4 recurse-descent for a default `sgs/container`.

    The §2.4 procedure, per container node:

    * **Sole pass-through fold** — when the container does NOT itself arrange its
      children (no grid/flex) AND has exactly ONE real child that is a slug-None
      pass-through wrapper (the `__inner`/band shells), that inner FOLDS: its
      content-band `max-width` lifts to this container's `contentWidth` (a ScalarLift
      `build_block_markup` merges) and its children become THIS container's children
      (re-descend). (§2.4 "a sole pass-through child folds in".)
    * **Route each child** via `_route_container_child` — a recognised block emits as
      itself; a slug-None wrapper becomes its OWN `sgs/container` (grid item /
      sibling'd recurse — §2.4), NEVER flattened.
    * **Uniform grid-item fold** — when THIS container arranges its direct children as
      grid/flex items (§2.3), any box-CSS property IDENTICAL across every item folds
      to this container's `gridItem*` defaults (§2.5, via `arrangement`). A recognised
      content child still emits as its own block — folding only lifts the *uniform*
      box-CSS, never the content (§2.5 "a heading … is content, not a grid item").

    Recursion re-enters via the UNCHANGED recursive `recognise()`, so a nested
    slug-None wrapper resolves the same way and a text leaf terminates as a content
    block — termination holds on the finite DOM.
    """
    from converter.services import arrangement
    from converter.services.fold_helpers import fold_band_css

    element_children = [c for c in parent.children if isinstance(c, Tag)]
    parent_arranges = arrangement.carries_arrangement(parent, css_rules or {})

    # ---- Sole pass-through fold (§2.4 / FR-31-5.3) --------------------------------
    # A non-arranging container with exactly ONE real child that is a slug-None
    # pass-through wrapper: fold its FULL interior band CSS up (max-width->contentWidth,
    # padding->contentBandPadding*, gap, text-align->native textAlign, + tiers), then
    # descend it for content. (Multiple real children, or a container that itself
    # arranges its items, do NOT fold.) Detection single-sourced via
    # _sole_passthrough_child; the fold uses the SAME route_interior_css_to_parent_slot
    # router as the composite band-fold (build_block_markup step 3c) — ONE fold
    # mechanism (R-31-9). Owning block = the DB default container (no slug literal);
    # DB-absent -> the max-width-only lift (keeps the DB-free path working).
    only = _sole_passthrough_child(parent, css_rules)
    if only is not None:
        _band: dict = {}
        _owning = db_lookup.container_default_slug()
        if _owning is not None:
            # EXECUTION Step 7 (FR-31-2.8.4): the band's FULL declaration
            # stream runs the SAME dispatch cascade as the root — only the
            # destination differs. BEM-less bands fold identically (the old
            # element-token gate + max-width-only fallback are deleted).
            # GAP-3 exclusions come back as EXCLUDED gaps — tracked, never
            # the old silent early-return.
            for _g in fold_band_css(only, _owning, _band, css_rules or {}):
                results.append(ContentGap(
                    f"band:{_g.property}", f"[{_g.origin.value}] {_g.detail}",
                ))
        for _attr, _val in _band.items():
            results.append(ScalarLift(attr=_attr, value=_val))
        _descend_container_children(only, results, css_rules, media_map)
        return

    # ---- Route each direct child (§2.4 grid item / sibling'd recurse) -------------
    for child in parent.children:
        if not isinstance(child, Tag):
            # Loose (non-Tag) text directly under the container is real content —
            # track it as a ContentGap rather than silently dropping it (Rule 4).
            if isinstance(child, NavigableString) and child.strip():
                results.append(ContentGap(
                    _label(parent),
                    f"loose text {child.strip()[:40]!r} directly under the container "
                    "was not routed to a content block",
                ))
            continue
        _route_container_child(child, results, css_rules, media_map)

    # ---- Uniform grid-item box-CSS fold -> gridItem* (§2.5) -----------------------
    # Only when THIS container arranges its direct children as grid/flex items.
    if parent_arranges and len(element_children) >= 2:
        default_slug = db_lookup.container_default_slug()
        if default_slug is not None:
            results.extend(arrangement.lift_uniform_grid_item_css(
                element_children, css_rules or {}, default_slug,
            ))


def run_container_default(
    rec: Recognition, section_root: Any, css_rules: dict | None = None,
    media_map: dict | None = None
) -> list:
    """FR-31-4 default-container dispatch: recurse-descend a slug-None section's
    children into content blocks (the #1 unblock — 2/9 -> 9/9).

    A top-level class-section with no registered composite recognised as the
    default `sgs/container` (recognise_section). Its children recurse via
    _descend_container_children. Conservation (Rule 4 / STOP-27): a container that
    recursed to ZERO content blocks is the D244 empty-container bad case — `raise`
    a ContentConservationError (never a silent empty container). `raise`, not a
    bare `assert` (stripped by `python -O`).
    """
    results: list = []
    _descend_container_children(section_root, results, css_rules, media_map)
    if not any(isinstance(r, (ChildBlock, ScalarLift)) for r in results):
        raise ContentConservationError(
            f"default sgs/container recursed to {len(results)} result(s) with ZERO "
            "content blocks — an empty container is the D244 bad case (FR-31-4 / "
            "STOP-35: a container must CARRY its recursed children, never be empty)"
        )
    return results


def run_mechanism_b(
    rec: Recognition, section_root: Any, css_rules: dict | None = None,
    media_map: dict | None = None, exclude_ids: frozenset[int] = frozenset(),
) -> list:
    """Mechanism B: faithful port of _route_composite_interior + walk() child-resolution.

    FR-31-4 DEFAULT-CONTAINER arm (checked FIRST, additive): a section recognised
    as the DB's default container (recognise_section, DB-derived slug — never a
    literal) routes to the recurse-descent (run_container_default), NOT the generic
    accordion/tabs allow-list path below. Gated on the DB container slug so the
    generic path (accordion/tabs/form) is untouched.

    PORT SOURCE (read verbatim before any edit):
      - convert.py:4124-4308  (_route_composite_interior — composite-interior dispatch)
      - convert.py:4446-4477  (parent-scoped child-token pre-check, G1)
      - convert.py:4479-4505  (leaf-misresolution guard, G-leaf)
      - convert.py:4507-4527  (slug-None wrapper → sgs/container, C)

    DISPATCH (convert.py:4154-4156 note + is_class_section_block gate):
      - db_lookup.is_class_section_block(rec.slug) == True
          → composite-interior routing (branches A, B, C below)
      - else (generic InnerBlocks parent: accordion, tabs, form, …)
          → generic child-resolution (G1 parent-scoped → resolve_slug → G3 validate)

    COMPOSITE-INTERIOR branches (per direct child column):
      (A) Scalar-media column — db_lookup.scalar_media_attr_for(slug, element) non-None
            → find <img> descendants; use BEM modifier (--mobile/--desktop) to pick
              base_attr vs base_attr+'Mobile'; lift via scalar_media_from_img;
              emit ScalarLift(attr=target_attr, value=lifted_img_dict).
            → No img found → ContentGap (never a silent skip, Rule 4).
      (B) Content-item block column — resolve_slug_from_bem(child_classes) non-None
            → emit ChildBlock + recurse into the child (_child_content_for_node).
      (C) slug-None content wrapper (fold case) — resolve_slug_from_bem returns None
            → CSS routing is OUT OF SCOPE here (Step-7 conductor owns it).
            → TODO Step-7: slug-None column CSS routing (_route_interior_css_to_parent_slot
              + _fold_layout_into_attrs) handled by the unified conductor, NOT here.
            → Content recursion IS in scope: iterate grandchildren and recurse each.

    GENERIC path (non-class-section parent, e.g. accordion/tabs/form):
      (G1) parent-scoped child-token — db_lookup.child_block_for_parent_token(slug, element)
             wins over global alias when non-None (fixes accordion __item → sgs/accordion-item).
      (G-resolve) global resolve_slug_from_bem fallback when G1 misses.
      (G3) VALIDATION — db_lookup.accepts_allowed_blocks(rec.slug):
             None  → permissive (no restriction declared); emit child BUT log a trace note
                     so the unvalidated resolution is visible (never a silent skip).
             []    → no children allowed; emit loud ContentGap.
             [..] → child slug MUST be in the list; else loud ContentGap (never silent).

    CONSERVATION: every direct child column produces ≥1 of {ScalarLift, ChildBlock,
    ContentGap}.  Hard ContentConservationError (never bare assert — STOP-27).
    """
    # ------------------------------------------------------------------
    # FR-31-4 DEFAULT-CONTAINER arm (additive; checked BEFORE is_class_section_block
    # + the generic path). A section defaulted to the DB container by recognise_section
    # is NOT an accordion/tabs allow-list parent — it recurse-descends its children.
    # DB-driven gate (R-31-1): no slug literal. Soft-fails to the paths below when the
    # DB is absent (container_default_slug() -> None ≠ rec.slug).
    # ------------------------------------------------------------------
    if rec.slug is not None and rec.slug == db_lookup.container_default_slug():
        return run_container_default(rec, section_root, css_rules=css_rules, media_map=media_map)

    # ------------------------------------------------------------------
    # Build mobile-suffix set once per call (DB-driven, no hardcoded dict).
    # ------------------------------------------------------------------
    mobile_sfxs = _mobile_suffixes()

    # Import here to avoid a module-level circular import: lift_helpers is a
    # leaf module with no imports from converter.services.
    from converter.services.lift_helpers import scalar_media_from_img

    results: list = []
    columns_seen = 0  # conservation counter

    # ------------------------------------------------------------------
    # COMPOSITE-INTERIOR path (is_class_section_block)
    # Port of convert.py:4191-4307
    # ------------------------------------------------------------------
    if db_lookup.is_class_section_block(rec.slug):
        for child in section_root.children:
            if not isinstance(child, Tag):
                continue
            if id(child) in exclude_ids:
                # FR-31-2.6 mutual exclusion: this element was consumed as a
                # NESTED unit by the universal walk — it must not also emit as
                # a child (the unit is conserved on the nested side).
                continue
            columns_seen += 1

            cclasses: list[str] = child.get("class", []) or []
            csgs: list[str] = [c for c in cclasses if isinstance(c, str) and c.startswith("sgs-")]

            # Extract BEM __element from the child's primary sgs- class.
            # convert.py:4199-4205
            element: str | None = None
            for cls in csgs:
                bem = db_lookup.parse_sgs_bem(cls)
                if bem and bem.element:
                    element = bem.element
                    break

            if element is None:
                # No BEM element — cannot route by slot; emit ContentGap (never silent).
                # convert.py:4207-4213 falls back to generic walk(); here we gap-track.
                results.append(ContentGap(
                    _label(child),
                    "composite-interior column has no BEM __element — cannot route by slot",
                ))
                continue

            # Ask the DB: is this a scalar-media column? (convert.py:4216)
            base_attr = db_lookup.scalar_media_attr_for(rec.slug, element)

            if base_attr is not None:
                # ---- Branch A: Scalar-media column (convert.py:4218-4253) ----
                imgs = child.find_all("img")
                if not imgs:
                    # No img found → ContentGap (convert.py:4224-4229 silently skips;
                    # we emit a ContentGap per Rule 4 — no silent drops allowed here).
                    results.append(ContentGap(
                        _label(child),
                        f"scalar-media column (attr={base_attr!r}) had no <img> descendant"
                        " — media content not transferred",
                    ))
                    continue

                for img in imgs:
                    img_classes: list[str] = img.get("class", []) or []
                    img_modifier: str | None = None
                    for img_cls in img_classes:
                        img_bem = db_lookup.parse_sgs_bem(img_cls)
                        if img_bem and img_bem.modifier:
                            img_modifier = img_bem.modifier.lower()
                            break

                    # Mobile modifier → base_attr + 'Mobile'; else → base_attr.
                    # convert.py:4243-4244
                    is_mobile = (img_modifier in mobile_sfxs) if img_modifier else False
                    target_attr = f"{base_attr}Mobile" if is_mobile else base_attr

                    lifted = scalar_media_from_img(img, media_map=media_map or {})
                    results.append(ScalarLift(attr=target_attr, value=lifted))

            else:
                # ---- Branch B / C: content column (convert.py:4256-4307) ----
                # Distinguish: (B) child resolves to a block vs (C) slug-None wrapper.
                child_slug = db_lookup.resolve_slug_from_bem(csgs)

                if child_slug is not None:
                    # Branch B: content-item block emitted (convert.py:4267-4274).
                    # _child_content_for_node produces the correct ChildBlock.content:
                    # TEXT for scalar blocks (primary_content_attr set), inner WP markup
                    # for nested InnerBlocks parents (primary_content_attr None).
                    content = _child_content_for_node(
                        child, child_slug, css_rules=css_rules, media_map=media_map
                    )
                    results.append(ChildBlock(slug=child_slug, content=content))

                else:
                    # Branch C: slug-None transparent content wrapper — fold case.
                    # convert.py:4276-4306: _fold_layout_into_attrs + _route_interior_css_to_parent_slot
                    # handle the CSS mutation; CONTENT recursion iterates grandchildren.
                    # TODO Step-7: slug-None column CSS routing (_route_interior_css_to_parent_slot
                    # + _fold_layout_into_attrs) is handled by the unified conductor, NOT here.
                    grandchild_results: list = []
                    for grandchild in child.children:
                        if not isinstance(grandchild, Tag):
                            continue
                        if id(grandchild) in exclude_ids:
                            continue  # consumed as a NESTED unit (FR-31-2.6)
                        gc_rec = recognise(grandchild)
                        if gc_rec.slug is not None:
                            gc_content = _child_content_for_node(
                                grandchild, gc_rec.slug, css_rules=css_rules, media_map=media_map
                            )
                            grandchild_results.append(
                                ChildBlock(slug=gc_rec.slug, content=gc_content)
                            )
                        else:
                            grandchild_results.append(
                                ContentGap(_label(grandchild), "grandchild unrecognised in slug-None fold")
                            )
                    if grandchild_results:
                        results.extend(grandchild_results)
                    else:
                        # Empty slug-None wrapper → ContentGap (never silent).
                        results.append(ContentGap(
                            _label(child),
                            "slug-None content wrapper had no recognisable grandchildren",
                        ))

        # Conservation: every Tag child produced ≥1 result.
        result_count = sum(
            1 if isinstance(r, (ScalarLift, ContentGap)) else 1
            for r in results
            if isinstance(r, (ScalarLift, ChildBlock, ContentGap))
        )
        # Note: branch C can expand one column into N grandchild results (N ≥ 1 per the
        # empty-wrapper ContentGap above).  Conservation only requires columns_seen ≤
        # result_count (each column → ≥1 result); strict equality doesn't hold when C
        # expands. Enforce the weaker but sufficient floor: no column was silently dropped.
        if result_count < columns_seen:
            raise ContentConservationError(
                f"Mechanism B (composite-interior): {columns_seen} columns produced only"
                f" {result_count} results — at least one column was silently dropped"
            )
        return results

    # ------------------------------------------------------------------
    # GENERIC path — non-class-section InnerBlocks parent (accordion, tabs, form, …)
    # Port of convert.py:4446-4527 (walk() child-resolution section)
    # ------------------------------------------------------------------
    allowed = db_lookup.accepts_allowed_blocks(rec.slug)

    for child in section_root.children:
        if not isinstance(child, Tag):
            continue
        if id(child) in exclude_ids:
            continue  # consumed as a NESTED unit by the universal walk (FR-31-2.6)
        columns_seen += 1

        cclasses: list[str] = child.get("class", []) or []
        csgs: list[str] = [c for c in cclasses if isinstance(c, str) and c.startswith("sgs-")]

        # Extract BEM __element token (same as composite path above).
        element = None
        for cls in csgs:
            bem = db_lookup.parse_sgs_bem(cls)
            if bem and bem.element:
                element = bem.element
                break

        # G1: parent-scoped child-token pre-check (convert.py:4460-4477).
        # Takes precedence over global alias lookup.
        child_slug: str | None = None
        if rec.slug and element:
            child_slug = db_lookup.child_block_for_parent_token(rec.slug, element)

        # G-resolve: global BEM → slug fallback (convert.py:4444).
        if child_slug is None and csgs:
            child_slug = db_lookup.resolve_slug_from_bem(csgs)

        # G-atomic: a BARE content tag (a <p> body paragraph, an <h4>, …) carries no
        # parent-scoped token and no sgs class, so G1 + global-BEM both miss — but it is
        # real CONTENT, not a gap. Fall back to recognise(), which resolves an atomic tag
        # to its block (p->sgs/text, h2->sgs/heading, img->sgs/media — §2.6 / Spec 31
        # §3.B.0 universal element extraction: the same tag becomes a child block by
        # context) or an sgs-element to its scalar slot. UNIVERSAL (R-31-9): every
        # InnerBlocks parent (quote, info-box, notice-banner, accordion, …) lands its
        # bare content children instead of dropping them (the brand-quote body drop —
        # Layer A, diagnosed 2026-07-01). Only a genuine unrecognised node still gaps.
        if child_slug is None:
            fb = recognise(child)
            if fb.slug is not None and fb.kind != "unrecognised":
                child_slug = fb.slug

        if child_slug is None:
            # No resolution → ContentGap (convert.py:4517-4527 emits a wrapper container;
            # here the new engine gaps instead of emitting an anonymous container).
            results.append(ContentGap(
                _label(child),
                "generic child has no resolvable slug (G1, global BEM, and atomic-tag "
                "recognition all missed)",
            ))
            continue

        # G3: validate child_slug against the parent's accepted block list.
        # Bean-mandated validation (per task spec). convert.py:4460-4477 has no equivalent
        # — this is a new-engine strengthening of the resolution fidelity.
        if allowed is None:
            # NULL → permissive; no restriction declared. Log a trace (never silent).
            _LOG.debug(
                "Mechanism B generic G3: parent %r has NULL accepts_allowed_blocks —"
                " child %r admitted without validation (permissive)",
                rec.slug, child_slug,
            )
        elif child_slug not in allowed:
            # Non-None allow-list and child is NOT in it → loud ContentGap, never silent.
            results.append(ContentGap(
                _label(child),
                f"G3 validation failed: child slug {child_slug!r} is not in parent"
                f" {rec.slug!r} accepts_allowed_blocks={allowed!r}",
            ))
            continue

        # Emit ChildBlock. _child_content_for_node picks TEXT or inner markup per block type.
        content = _child_content_for_node(
            child, child_slug, css_rules=css_rules, media_map=media_map
        )
        results.append(ChildBlock(slug=child_slug, content=content))

    # Generic path conservation: every Tag child → ≥1 result.
    if len(results) < columns_seen:
        raise ContentConservationError(
            f"Mechanism B (generic): {columns_seen} children produced only"
            f" {len(results)} results — at least one child was silently dropped"
        )
    return results


# ---------------------------------------------------------------------------
# Mechanism Array — array-content-lift via array_item_fields schema
# ---------------------------------------------------------------------------


def run_mechanism_array(rec: Recognition, section_root: Any, media_map: dict | None = None) -> list:
    """Mechanism Array: lift array / repeater attrs from a draft DOM subtree.

    Gated by the ``array-content-lift`` capability (identical pattern to
    ``scalar-content-lift``).  Calls ``lift_array_content`` which is fully
    DB-driven via ``array_item_fields``; no block-slug literals here.

    Returns a list of ``ScalarLift`` items (one per non-empty array attr
    whose schema is seeded) plus any ``ContentGap`` items for items that
    produced zero field lifts.  An empty list is a valid no-op when:
      - the block has no array attrs with a seeded schema, OR
      - the draft has no item elements matching the item_selector.

    Conservation is enforced inside ``lift_array_content`` (STOP-27 / Rule 4).
    """
    array_attrs, gaps = lift_array_content(section_root, rec.slug, media_map=media_map or {})
    results: list = []
    for attr_name, item_list in array_attrs.items():
        results.append(ScalarLift(attr=attr_name, value=item_list))
    results.extend(gaps)
    return results


# ---------------------------------------------------------------------------
# Mechanism Styling — CSS-on-content lift via derived_selector (W3 step 2b)
# ---------------------------------------------------------------------------


def run_mechanism_styling(
    rec: Recognition, section_root: Any, css_rules: dict | None = None
) -> list:
    """Mechanism Styling: lift CSS-on-content attrs (typography / colour).

    Spec 31 §3 universal stream (identify -> content -> CSS): this is the CSS leg
    for a content block's named child elements. Wraps the already-built modular
    ``lift_styling_content`` (``converter.resolvers.styling_content``) -- the
    faithful port of ``_lift_styling_attrs_by_selector`` (convert.py:3903) with the
    B2 responsive fix (``_bp_decls`` consumed -> ``{attr}{bp_suffix}`` companions).

    The resolver SELF-GATES on the ``scalar-styling-lift`` capability and returns
    ``{}`` for any block that has not declared it (currently only ``sgs/testimonial``).
    So this is a universal, DB-driven call with no per-block carve-out: a block that
    has not opted in produces no styling keys.

    ``css_rules`` is the draft CSS rule-set dict. It defaults to ``{}`` -- with an
    empty rule-set the lift finds no declarations and returns no keys (a safe no-op),
    which is also why pre-existing callers that do not yet thread css_rules see no
    behaviour change. The LANDED recipe / pipeline passes the run's real rule-set.

    Returns a list of ``ScalarLift`` items (one per lifted styling attr). The styling
    attrs (e.g. ``quoteColour``, ``quoteFontSize``) never collide with Mechanism A's
    content attrs (e.g. ``quote``): different keys, so merging order in
    ``build_block_markup`` is irrelevant.
    """
    lifted = lift_styling_content(section_root, rec.slug, css_rules or {})
    return [ScalarLift(attr=name, value=value) for name, value in lifted.items()]


# ---------------------------------------------------------------------------
# Expected-content coverage — silent-drop guard (design §6)
# ---------------------------------------------------------------------------


def expected_content_gaps(slug: str) -> list:
    """Return ContentGaps for content-bearing attrs with no role/derived_selector.

    Flags two classes of attr whose role AND derived_selector are both absent
    (falsy) — these are never attempted by Mechanism A, so without this pass
    they would be invisible drops:

    1. attr_type == 'object'  — always flagged (structured content; no name test).
    2. attr_type == 'string'  — flagged when the attr NAME matches _CONTENT_NAME_RE
                                AND does NOT match _STYLING_RE.  This is a
                                GAP-ONLY completeness heuristic (never affects
                                routing), acceptable per R-31-1 (no block/slot
                                literals; keyed on a naming pattern, not a name
                                list or per-block carve-out).

    Universal: no name list, no per-block carve-out.
    """
    gaps: list = []
    attrs = db_lookup.block_attrs(slug)
    for attr_name, info in attrs.items():
        role = info.get("role")
        derived_selector = info.get("derived_selector")
        if role or derived_selector:
            # Mechanism A will handle it — not a silent drop.
            continue
        attr_type = info.get("attr_type")
        if attr_type == "object":
            gaps.append(
                ContentGap(
                    attr_name,
                    "structured-content attr has no role/derived_selector"
                    " — DB-data gap; flag to developer",
                )
            )
        elif attr_type == "string" and _CONTENT_NAME_RE.search(attr_name) and not _STYLING_RE.search(attr_name):
            gaps.append(
                ContentGap(
                    attr_name,
                    "content-semantic string attr has no role/derived_selector"
                    " — DB-data gap; flag to developer",
                )
            )
    return gaps


# ---------------------------------------------------------------------------
# Mechanism Leaf — named-leaf own-element content lift (W3 step B, council MF1)
# ---------------------------------------------------------------------------


def run_mechanism_leaf(rec: Recognition, node: Any, media_map: dict | None = None) -> list:
    """Lift a recognised NAMED LEAF's OWN content (e.g. sgs/button).

    A named leaf is a recognised block with a content slot but NO content-extraction
    capability (``capabilities==frozenset()``) and ``delegates_content==0``. Its content
    lives on the leaf element ITSELF — text in its own body, href on its own ``<a>``,
    variant in its own ``--modifier`` — NOT in ``.sgs-x__y`` descendants (the real draft
    ``<a class="sgs-button" href>`` has no ``.sgs-button__link`` child; council MF4).

    So this applies the SHARED ``field_extractors`` role handler to the NODE ITSELF for
    every content-role attr the block declares. An attr is a content target when it has
    BOTH a ``role`` AND a non-None ``derived_selector`` (the selector's PRESENCE marks it
    a content slot; we read element-self, not the descendant). The handler does the rest:
    ``text-content`` -> label, ``link-href`` -> url. Non-content roles
    (``select-from-enum`` / ``layout``) return None from ``extract_field_value`` and are
    skipped, so e.g. the button's ``widthType`` / ``minHeight`` are never mis-lifted.

    ``inheritStyle`` (the ``--modifier`` style preset) has ``role=None`` and is resolved
    SEPARATELY in ``build_block_markup`` (the convert.py:4994-5028 port + R6 strip).

    Port source: convert.py:3364-3366 ``_atomic_attrs_for`` sgs/button branch
    (``{label: rich-text, url: safe-href}``) — generalised DB-driven, no slug literal.
    convert.py's leaf handlers are PER-TAG and emit a TIGHT set (button -> {label, url};
    media-img -> {imageUrl, alt}; heading -> {content}). This generalises that without
    a slug literal by lifting AT MOST ONE attr per content shape, NOT every role+selector
    attr (council pre-commit MF, 2026-06-30 — the loose "all attrs" version over-lifted a
    phantom iconTitle=label onto every button and dumped element text into date/boolean
    attrs like targetDate/showDate/minDate; both confirmed live):

      - ONE primary-TEXT — the block's ``primary_content_attr`` when it is a
        ``text-content``/``content`` STRING (e.g. button.label, heading.content). Other
        text attrs (button.iconTitle, consent.consentText) are NOT primary -> skipped.
      - ONE image-object — the FIRST ``image-object``/object attr (e.g. media.imageUrl).
        media's primary is ``caption`` not the image, so the image needs its own arm.
      - ONE url — the FIRST ``link-href``/``url-href`` STRING attr (e.g. button.url).

    The role<->attr_type guard (text<->string, image<->object, link<->string) defends the
    known DB mis-seeds where a boolean/date attr carries role='text-content' (showDate,
    minDate) — they fail the type guard and are skipped, never receiving string HTML.

    Conservation (Rule 4 / STOP-27): a leaf that lifts NOTHING emits a tracked
    ``ContentGap`` (never a silent empty).
    """
    results: list = []
    primary = db_lookup.primary_content_attr(rec.slug)
    catalogue = db_lookup.block_attrs(rec.slug)
    image_lifted = False
    link_lifted = False
    for attr_name, info in catalogue.items():
        if not isinstance(info, dict):
            continue
        role = info.get("role")
        selector = info.get("derived_selector")
        attr_type = info.get("attr_type")
        if not role or not selector:
            continue
        is_text = (
            attr_name == primary
            and role in ("text-content", "content")
            and attr_type == "string"
        )
        # image-object: an image slot. attr_type='object' stores {url,id,alt}; a
        # string-typed image-object stores the URL string ONLY (sgs/media.imageUrl is
        # role=image-object + type=string — the brand/product image bug: the leaf lift
        # skipped it, emitting an EMPTY sgs/media). Accept BOTH; downcast the dict to its
        # url string for the string-typed attr. DB-driven (role+type), universal (R-31-9).
        is_image = (
            (not image_lifted)
            and role == "image-object"
            and attr_type in ("object", "string")
        )
        is_link = (
            (not link_lifted)
            and role in ("link-href", "url-href")
            and attr_type == "string"
        )
        if not (is_text or is_image or is_link):
            continue
        value = extract_field_value(node, role, media_map or {})
        if is_image and attr_type == "string" and isinstance(value, dict):
            value = value.get("url") or None  # string imageUrl wants the URL, not the object
        if value is None or value == "":
            continue
        results.append(ScalarLift(attr=attr_name, value=value))
        if is_image:
            image_lifted = True
        if is_link:
            link_lifted = True

    # ICON arm (Spec 31 §3.B.0) — a leaf whose content is an ICON carries an icon
    # SOURCE attr, which the text/image/link arms above do NOT cover, so an icon leaf
    # child (e.g. an info-box's first child) emits empty. Dispatch identically to those
    # arms: find the target attr in the DB catalogue BY ROLE and write the DB attr_name
    # — NEVER a hardcoded attr name (R-31-1). Each icon-source value attr carries an
    # `icon-<kind>` role (DB, via ATTR_CLASSIFICATION_OVERRIDES), so resolve_icon_kind's
    # kind (lucide / emoji / dashicon / wp-icon — sgs/icon's four `iconSource` sources;
    # there is NO raw-svg source) binds to its attr through the DB. `iconSource`
    # (role='identity') is the discriminator storing the resolved kind string. No slug
    # literal; universal to every icon-source leaf (R-31-9). Fires alongside link.
    icon_source_attrs = {
        info["role"]: name
        for name, info in catalogue.items()
        if isinstance(info, dict)
        and isinstance(info.get("role"), str)
        and info["role"].startswith("icon-")
    }
    if icon_source_attrs:
        kind, ic_val = resolve_icon_kind(node)
        target_attr = icon_source_attrs.get("icon-" + kind) if kind else None
        if target_attr and ic_val:
            results.append(ScalarLift(attr=target_attr, value=ic_val))
            # Discriminator: the block's `iconSource` (role='identity') stores the kind.
            disc = next(
                (n for n, i in catalogue.items()
                 if isinstance(i, dict) and i.get("role") == "identity"),
                None,
            )
            if disc:
                results.append(ScalarLift(attr=disc, value=kind))
        else:
            # An icon-source leaf whose draft icon resolved to NO supported sgs/icon
            # source (e.g. a raw <svg> the block cannot render, or an <img>). Emit a
            # LOUD gap — never a silent default-star, even when a link on the same leaf
            # was lifted and would otherwise suppress the conservation gap below. Gated
            # on the block declaring an icon-source role, so non-icon 'identity' blocks
            # (sgs/button) never reach here.
            results.append(ContentGap(
                rec.slug,
                "icon-source leaf: draft icon resolved to no supported sgs/icon source"
                " (lucide / emoji / dashicon / wp-icon) — flag to developer",
            ))

    if not any(isinstance(r, ScalarLift) for r in results):
        results.append(ContentGap(
            rec.slug,
            "named-leaf produced no content lift — element carried no extractable"
            " text/href/media for any role+selector attr (flag to developer)",
        ))
    return results


# ---------------------------------------------------------------------------
# 3-case dispatch — the public entry point
# ---------------------------------------------------------------------------


def extract_content(
    rec: Recognition,
    section_root: Any,
    media_map: dict | None = None,
    css_rules: dict | None = None,
) -> list:
    """Dispatch content extraction for a recognised composite.

    Four exhaustive cases (design §1, capability mutual exclusion):

    1. delegates_content == 0 AND scalar-content-lift capability present
       → Mechanism A (selector-driven scalar lifts) + Mechanism Styling
         (CSS-on-content, self-gated on scalar-styling-lift) + Mechanism Array
         (if also array-content-lift) + expected_content_gaps.

    ``css_rules`` is the draft CSS rule-set threaded to Mechanism Styling so the
    CSS leg of the Spec 31 §3 universal stream lands. Defaults to ``{}`` (safe no-op).

    2. delegates_content == 1
       → Mechanism B (slot-keyed child-block walk).
       Asserts the block does NOT also carry scalar-content-lift (D212 regression guard).

    3. delegates_content == 0 AND array-content-lift present (but NOT scalar-content-lift)
       → Mechanism Array only (MF-6: explicit 4th arm before the Case-3 gap so array-only
         blocks don't fall through to the loud ContentGap). D248.

    4. delegates_content == 0 AND neither scalar-content-lift nor array-content-lift
       → loud ContentGap — DB capability gap; never a silent empty.

    ⚡ STEP-5 (FR-31-2.8, 2026-07-04): the if-chain that implemented the four
    cases above is RE-EXPRESSED as the TOTAL structural-signature registry in
    ``converter/walk.py`` (``CONTENT_HANDLERS`` — ADDITIVE emission, explicit
    priorities, pre-registry MF5/D212 gates). This function now delegates to
    the ONE walker entry; the docstring's case semantics are unchanged
    (behaviour-identical re-expression — proven by the untouched suite).
    Late import through the walk module so tests monkeypatching walk internals
    intercept, mirroring the assembly.py idiom.
    """
    from converter import walk as _walk
    return _walk.walk_content(rec, section_root, media_map, css_rules)

