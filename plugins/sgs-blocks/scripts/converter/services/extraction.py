"""extraction.py — Stage 3 content extraction: ScalarLifts / ChildBlocks / ContentGaps.

Design ref: `.claude/plans/2026-06-26-stage3-child-shape-fork-design.md` §1/§2/§6.

Given a Recognition + a parsed bs4 section node, extract the composite's content
as a list of ScalarLift / ChildBlock / ContentGap items.  Conservation is enforced
per-mechanism as a hard ContentConservationError (never a silent drop).

No block or slot string literals anywhere (scanned by gates/no_slug_literal).
"""
from __future__ import annotations

import logging
import pathlib
import re
import sqlite3
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
    Ctx,
    Decl,
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
from converter.services.styling_helpers import collect_css_decls_for_element
from converter.services.root_supports import lift_root_supports_to_style, _LIFT_CSS_PROPS
from orchestrator.converter_v2 import db_lookup

# Emit-glue imports (stage 3 §1 walk/emit — design §1).
# Imported here so that build_block_markup lives in the same service module.
from converter.recognition import variant_attrs, recognise, recognition_for_slug, build_ctx
from converter.orchestrator import emit_block_markup, process_element
from converter.services.field_extractors import extract_field_value

# SGS DB path — used to open a read-only connection for the CSS resolver dispatch.
# Path is relative to the user's home dir (same convention as dev-setup.md).
_SGS_DB_PATH = (
    pathlib.Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
)


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
    text (which fails WP block validation). Target ladder (port of
    text_leaf.route_text_leaf's target selection, DB-driven / no slug literal):
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
    from converter.services.text_leaf import node_is_text_leaf
    from converter.services import arrangement
    from converter.services.fold_helpers import lift_content_band_max_width

    element_children = [c for c in parent.children if isinstance(c, Tag)]
    loose_text = [
        c for c in parent.children
        if isinstance(c, NavigableString) and c.strip()
    ]
    parent_arranges = arrangement.carries_arrangement(parent, css_rules or {})

    # ---- Sole pass-through fold (§2.4) --------------------------------------------
    # A non-arranging container with exactly ONE real child that is a slug-None
    # pass-through wrapper: fold its band CSS up, then descend it. (Multiple real
    # children, or a container that itself arranges its items, do NOT fold — each
    # child keeps its own block/container.)
    if not parent_arranges and len(element_children) == 1 and not loose_text:
        only = element_children[0]
        only_rec = recognise(only)
        if (
            (only_rec.slug is None or only_rec.kind == "unrecognised")
            and not node_is_text_leaf(only)
            and only.find(True) is not None
        ):
            _band: dict = {}
            if lift_content_band_max_width(only, css_rules or {}, _band):
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


def run_mechanism_b(rec: Recognition, section_root: Any, css_rules: dict | None = None, media_map: dict | None = None) -> list:
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
    capability (``capabilities==frozenset()``) and ``has_inner_blocks==0``. Its content
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
        is_image = (not image_lifted) and role == "image-object" and attr_type == "object"
        is_link = (
            (not link_lifted)
            and role in ("link-href", "url-href")
            and attr_type == "string"
        )
        if not (is_text or is_image or is_link):
            continue
        value = extract_field_value(node, role, media_map or {})
        if value is None or value == "":
            continue
        results.append(ScalarLift(attr=attr_name, value=value))
        if is_image:
            image_lifted = True
        if is_link:
            link_lifted = True

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

    1. has_inner_blocks == 0 AND scalar-content-lift capability present
       → Mechanism A (selector-driven scalar lifts) + Mechanism Styling
         (CSS-on-content, self-gated on scalar-styling-lift) + Mechanism Array
         (if also array-content-lift) + expected_content_gaps.

    ``css_rules`` is the draft CSS rule-set threaded to Mechanism Styling so the
    CSS leg of the Spec 31 §3 universal stream lands. Defaults to ``{}`` (safe no-op).

    2. has_inner_blocks == 1
       → Mechanism B (slot-keyed child-block walk).
       Asserts the block does NOT also carry scalar-content-lift (D212 regression guard).

    3. has_inner_blocks == 0 AND array-content-lift present (but NOT scalar-content-lift)
       → Mechanism Array only (MF-6: explicit 4th arm before the Case-3 gap so array-only
         blocks don't fall through to the loud ContentGap). D248.

    4. has_inner_blocks == 0 AND neither scalar-content-lift nor array-content-lift
       → loud ContentGap — DB capability gap; never a silent empty.
    """
    # MF5 — None has_inner_blocks guard. Per context.py, has_inner_blocks is None
    # ONLY when kind=='unrecognised' (slug also None); recognised blocks always carry
    # an int (derive_has_inner_blocks). If a None reaches here the Recognition is
    # unrecognised/corrupt — fail LOUD (Rule 4), never a misleading "no capability"
    # gap and never a silent empty. Routed BEFORE caps (capabilities_for needs slug).
    if rec.has_inner_blocks is None:
        return [ContentGap(
            rec.slug or "<unrecognised>",
            "extract_content reached with has_inner_blocks=None — recognition is"
            " unrecognised/corrupt; route via unrecognised_gap upstream",
        )]

    caps = db_lookup.capabilities_for(rec.slug)

    # CAPABILITY TAGS queried against the DB capability set — NOT block or slot names.
    # The no_slug_literal gate tracks block_slug/variant/slot idents, not capability strings.
    SCALAR_LIFT = "scalar-content-lift"
    ARRAY_LIFT = "array-content-lift"

    if rec.has_inner_blocks == 0 and SCALAR_LIFT in caps:
        results = run_mechanism_a(rec, section_root, media_map) + expected_content_gaps(rec.slug)
        # Case 1 + styling arm (W3 step 2b): lift CSS-on-content (typography/colour)
        # for the block's named child elements. Self-gated on scalar-styling-lift,
        # so a no-op for blocks that have not opted in (universal, DB-driven).
        results = results + run_mechanism_styling(rec, section_root, css_rules)
        # Case 1 + array arm: if the block also opts into array-content-lift,
        # merge array lifts alongside the scalar lifts (MF-6 / D248).
        if ARRAY_LIFT in caps:
            results = results + run_mechanism_array(rec, section_root, media_map)
        return results

    if rec.has_inner_blocks == 1:
        # Capability mutual exclusion: a scalar-content-lift block must NEVER enter
        # Mechanism B — guards against the D212 empty-block regression where the
        # quote attr would be emitted as a child InnerBlock the typed render ignores.
        # raise, NOT assert: a bare `assert` is stripped under `python -O`, which would
        # silently disable this regression guard (a Rule-4 silent-drop hole). D247.
        if SCALAR_LIFT in caps:
            raise ContentConservationError(
                "scalar-content-lift block routed to Mechanism B — D212 regression guard"
            )
        results = run_mechanism_b(rec, section_root, css_rules=css_rules, media_map=media_map)
        # Case 2 + array arm (D248 fix): a has_inner_blocks=1 composite can ALSO
        # carry array attrs (cta-section.stats, hero.badges, quote.body) alongside
        # its child InnerBlocks. array-content-lift is independent of the D212
        # scalar-content-lift guard, so merge array lifts into the Mechanism B
        # results. Without this, every has_inner_blocks=1 array block (the 3 of 9)
        # silently dropped its array attr — the dispatch routed past the resolver.
        if ARRAY_LIFT in caps:
            results = results + run_mechanism_array(rec, section_root, media_map)
        return results

    # Case 3: has_inner_blocks == 0, no scalar-content-lift, but array-content-lift
    # present — run the array arm alone (MF-6 explicit 4th arm before the gap case).
    if rec.has_inner_blocks == 0 and ARRAY_LIFT in caps:
        return run_mechanism_array(rec, section_root, media_map)

    # Named-leaf arm (W3 MF1): a recognised leaf with a content slot but NO
    # content-lift capability (e.g. sgs/button) lifts its OWN element's content via
    # the shared field_extractors. Trigger is a DB SIGNAL (primary_content_attr
    # present), NOT recognition kind — sgs/button is kind='named' (resolved via its
    # sgs-button BEM root class), not kind='atomic'. Spacers/separators/decorative
    # leaves (primary_content_attr None) fall through to the Case-4 loud gap, so
    # element-self lifting never manufactures phantom content for them.
    if (
        rec.has_inner_blocks == 0
        and SCALAR_LIFT not in caps
        and ARRAY_LIFT not in caps
        and db_lookup.primary_content_attr(rec.slug) is not None
    ):
        return run_mechanism_leaf(rec, section_root, media_map)

    # Fourth case: has_inner_blocks == 0 AND neither capability.
    # Loud, never silent — a DB-capability gap to surface and track.
    return [
        ContentGap(
            rec.slug,
            "block has no content-extraction capability"
            " (not scalar-content-lift, not array-content-lift, not InnerBlocks)"
            " — DB-capability gap; flag to developer",
        )
    ]


# ---------------------------------------------------------------------------
# CSS-pass helper — Spec 31 §3.A unification
# ---------------------------------------------------------------------------


def _build_css_attrs(
    rec: Recognition,
    node: Any,
    css_rules: dict,
    is_root: bool,
) -> dict:
    """Run the CSS branch (Spec 31 §3.A) for one node and return the attr dict.

    Steps:
      1. Build a Ctx from the Recognition + node via the recognition.build_ctx adapter.
      2. Collect CSS declarations from the node's css_rules via
         collect_css_decls_for_element → base_decls + bp_decls.
      2a. [ROOT-SUPPORTS LIFT] Before assembling the Decl list, call
          lift_root_supports_to_style to emit padding/background-color/border-radius
          etc. as native WP ``style.*`` attrs (and per-device custom attrs).
          PORT SOURCE: convert.py:774-956.
      2b. [PARTITION] Remove from base_decls/bp_decls every CSS property that the
          native lift already consumed (those in _LIFT_CSS_PROPS AND in the block's
          supports). This prevents double-handling: the same property must not flow
          through BOTH the native style.* path AND the process_element dispatch.
          Merge order: native style.* attrs first, then process_element overwrites
          (they target different attr keys so collisions are not expected in practice).
      3. Assemble a list[Decl] from the PARTITIONED decls.
      4. If non-empty, dispatch through process_element and return merged result.
      5. If empty (no css_rules matched), return native attrs only (or {}).

    Conservation errors from process_element PROPAGATE (never swallowed) — a
    leaked/unrouted declaration must fail loud (Rule 4 / STOP-27).

    Opens a read-only SQLite connection to the SGS DB per call.  The connection
    is opened with check_same_thread=False and closed in a finally block so it
    is always released even when process_element raises.

    Returns {} when:
      - css_rules is empty / no rules matched the node, OR
      - the DB file does not exist (test environments without the real DB).
    This keeps the pre-existing content-only behaviour as the no-CSS-rules
    fallback — no regression for callers that omit css_rules.
    """
    if rec.slug is None:
        return {}

    # Open DB connection (read-only; tests that mock db_lookup don't need the file).
    conn: sqlite3.Connection | None = None
    try:
        if _SGS_DB_PATH.exists():
            conn = sqlite3.connect(str(_SGS_DB_PATH), check_same_thread=False)
        else:
            # DB absent (CI / test environment) — CSS pass is a no-op.
            return {}

        ctx = build_ctx(rec, node, is_root=is_root, conn=conn)

        base_decls, bp_decls = collect_css_decls_for_element(node, css_rules)

        # ---- Step 2a: root-supports native style.* lift (convert.py:774-956) ----
        # Emits padding/background-color/border-radius etc. as WP style.* attrs
        # and per-device custom attrs (paddingTopTablet, etc.) when the block's
        # DB supports record allows them.
        native_attrs: dict = lift_root_supports_to_style(node, rec.slug, css_rules, conn)

        # ---- Step 2b: partition — remove lift-consumed props from the Decl stream ----
        # Any CSS property that (a) is in _LIFT_CSS_PROPS AND (b) was actually
        # consumed by the native lift (i.e. appears as a key somewhere under
        # native_attrs["style"] or as a responsive custom attr) must NOT also be
        # dispatched through process_element, or the same value lands twice on
        # different attr paths.
        #
        # Implementation: remove _LIFT_CSS_PROPS from both base_decls and each
        # bp_decls tier.  _LIFT_CSS_PROPS is a frozenset of the CSS property names
        # the lift rules handle (padding-top, background-color, border-radius, etc.
        # plus the shorthand keys padding/margin/background/border).  Properties
        # NOT in _LIFT_CSS_PROPS (e.g. max-width, grid-template-columns, color
        # variants handled by process_element's own resolvers) are unaffected and
        # continue to the Decl list unchanged.
        #
        # This partition is safe even when lift_root_supports_to_style returned {}
        # (block has no matching supports): removing the props from base_decls means
        # process_element never sees unsupported native-style props either, which
        # is the correct behaviour (they have no custom-attr destination).
        partitioned_base = {
            prop: val
            for prop, val in base_decls.items()
            if prop not in _LIFT_CSS_PROPS
        }
        partitioned_bp = {
            bp_suffix: {
                prop: val
                for prop, val in tier_decls.items()
                if prop not in _LIFT_CSS_PROPS
            }
            for bp_suffix, tier_decls in bp_decls.items()
        }

        # ---- Step 3: assemble Decl list from partitioned decls ----
        decls: list[Decl] = [
            Decl(property=prop, value=val, tier="Base")
            for prop, val in partitioned_base.items()
        ]
        for bp_suffix, tier_decls in partitioned_bp.items():
            for prop, val in tier_decls.items():
                decls.append(Decl(property=prop, value=val, tier=bp_suffix))

        # ---- Step 4/5: dispatch and merge ----
        # Native style.* attrs are emitted first; process_element writes to different
        # keys (maxWidth, gridTemplateColumns, etc.) so collisions are not expected.
        # Content ScalarLifts (step 3 in build_block_markup) overwrite both if needed.
        merged: dict = dict(native_attrs)
        if decls:
            result = process_element(ctx, decls)
            merged.update(result.attrs())

        return merged

    finally:
        if conn is not None:
            conn.close()


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
    _css_rules = css_rules or {}

    # §3.A — CSS pass: route every CSS declaration through the resolver dispatch.
    # Returns {} when css_rules is empty / DB absent (safe no-op).
    css_attrs: dict = _build_css_attrs(rec, section_root, _css_rules, is_root)

    # §3.B — Content pass: ScalarLifts + ChildBlocks + ContentGaps.
    results = extract_content(rec, section_root, media_map, _css_rules)

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
        for _cls in (_node_classes or []):
            if not isinstance(_cls, str):
                continue
            _bem = db_lookup.parse_sgs_bem(_cls)
            if _bem is None or not _bem.modifier:
                continue
            _mod = _bem.modifier.lower()
            if _mod in _presets:
                attrs["inheritStyle"] = _mod
                break
            # 'ghost' is the draft's term for the outline preset. A bare branch (NOT a
            # dict literal) so the cheat-gate Check #9 suffix-dict detector cannot flag it.
            if _mod == "ghost":
                attrs["inheritStyle"] = "outline"
                break

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
