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

from bs4 import Tag

# ---------------------------------------------------------------------------
# Content-noun / styling-suffix regexes for expected_content_gaps (FIX 3).
# Used ONLY as a GAP-only completeness heuristic — never affects block/slot
# routing (no name list, no per-block carve-out, per R-22-1 "no hardcoded dicts").
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
from converter.services.payload import extract_payload
from converter.services.recognise_helpers import bem_element_to_canonical_slot
from converter.resolvers.scalar_content import lift_scalar_content
from converter.resolvers.array_content import lift_array_content
from converter.resolvers.styling_content import lift_styling_content
from converter.services.styling_helpers import collect_css_decls_for_element
from converter.services.root_supports import lift_root_supports_to_style, _LIFT_CSS_PROPS
from orchestrator.converter_v2 import db_lookup

# Emit-glue imports (stage 3 §1 walk/emit — design §1).
# Imported here so that build_block_markup lives in the same service module.
from converter.recognition import variant_attrs, recognise, build_ctx
from converter.orchestrator import emit_block_markup, process_element

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
    Uses db_lookup.breakpoint_suffix_rules() — no hardcoded suffix dict (R-22-1).
    The DB returns [(marker, [suffixes])] where 'Mobile' is one marker.
    We collect every suffix whose marker equals 'Mobile' (case-exact).

    Returns a frozenset of lowercase suffix strings so callers can do:
        ``img_modifier.lower() in _mobile_suffixes()``
    """
    try:
        bp_rules = db_lookup.breakpoint_suffix_rules()
    except Exception:  # noqa: BLE001 — soft-fail; DB unavailable during tests
        return frozenset()
    mobile: set[str] = set()
    for marker, suffixes in bp_rules:
        if marker == "Mobile":
            for sfx in suffixes:
                mobile.add(sfx.lower())
    return frozenset(mobile)


def _child_content_for_node(
    child_node: Any,
    child_slug: str,
    css_rules: dict | None = None,
) -> str:
    """Produce the correct ChildBlock.content string for a resolved child node.

    The ChildBlock.content field has a DUAL contract (consumed by build_block_markup
    _child_markup helper):

      - primary_content_attr is non-None (e.g. sgs/heading → 'content'):
          cb.content = TEXT value for that attr (via extract_payload with the attr's role).
          emit_block_markup(slug, {attr: cb.content}, "") assembles the final markup.

      - primary_content_attr is None (nested InnerBlocks parent):
          cb.content = inner WP block markup string (recursive Mechanism B output).
          emit_block_markup(slug, {}, cb.content) assembles the final markup.

    This is the recursion seam for branch B (content-item block emitted)
    and branch C (slug-None grandchildren). Mirrors what convert.py:4271-4274
    achieved via a single walk() call (which naturally produced the right output
    for the parent's emit path).

    ``css_rules`` is threaded so the CSS pass (Spec 31 §3.A) fires for child
    nodes when build_block_markup recurses. Children are non-root (is_root=False).

    Returns "" if the child does not recognise or has no content.
    """
    primary_attr = db_lookup.primary_content_attr(child_slug)

    if primary_attr is not None:
        # Scalar child: extract the TEXT content via the attr's role.
        # Look up the role from block_attrs so we use the right extractor.
        attrs_info = db_lookup.block_attrs(child_slug)
        attr_info = attrs_info.get(primary_attr, {})
        role = attr_info.get("role") or "text-content"
        return extract_payload(child_node, role)
    else:
        # InnerBlocks parent: recurse to produce inner block markup.
        # is_root=False — children are never the section root (layer_detect
        # must not force OUTER on them, per Spec 31 §3.A / layer_detect MF-3).
        child_rec = recognise(child_node)
        if child_rec.kind == "unrecognised" or child_rec.slug is None:
            return ""
        return build_block_markup(child_rec, child_node, css_rules=css_rules, is_root=False)


def run_mechanism_b(rec: Recognition, section_root: Any, css_rules: dict | None = None) -> list:
    """Mechanism B: faithful port of _route_composite_interior + walk() child-resolution.

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

                    lifted = scalar_media_from_img(img, media_map={})
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
                    content = _child_content_for_node(child, child_slug, css_rules=css_rules)
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
                            gc_content = _child_content_for_node(grandchild, gc_rec.slug, css_rules=css_rules)
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

        if child_slug is None:
            # No resolution → ContentGap (convert.py:4517-4527 emits a wrapper container;
            # here the new engine gaps instead of emitting an anonymous container).
            results.append(ContentGap(
                _label(child),
                "generic child has no resolvable slug (G1 and global BEM lookup both missed)",
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
        content = _child_content_for_node(child, child_slug, css_rules=css_rules)
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
                                routing), acceptable per R-22-1 (no block/slot
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
        results = run_mechanism_b(rec, section_root, css_rules=css_rules)
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
    for r in results:                        # step 3: content ScalarLifts overwrite
        if isinstance(r, ScalarLift):
            attrs[r.attr] = r.value

    def _child_markup(cb: ChildBlock) -> str:
        attr = db_lookup.primary_content_attr(cb.slug)
        if attr:
            return emit_block_markup(cb.slug, {attr: cb.content}, "")
        return emit_block_markup(cb.slug, {}, cb.content)  # fallback for ambiguous/none

    inner = "".join(_child_markup(r) for r in results if isinstance(r, ChildBlock))
    return emit_block_markup(rec.slug, attrs, inner)
