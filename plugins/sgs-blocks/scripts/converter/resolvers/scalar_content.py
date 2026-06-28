"""scalar_content.py — modularised ``_lift_scalar_attrs_by_selector`` (convert.py:3781).

Faithful port of the universal DB-driven multi-scalar lift for G3-attrs content blocks,
ported per Spec 31 §1/§3.B1 (D246). Behaviour is IDENTICAL to the original; the only
structural difference is:

  - ``media_map: dict`` is an explicit parameter (no module global).
  - Helper functions are imported from ``converter.services.lift_helpers`` rather
    than being closures inside convert.py.
  - The dispatch-table WIRING (integrating this callable into the resolver
    dispatch) is a SEPARATE follow-on wave — for now this module exposes the
    faithful callable ``lift_scalar_content`` and retains the existing ``resolve``
    stub so the dispatch table and existing tests are untouched.

Source reference: convert.py:3781 (``_lift_scalar_attrs_by_selector``).
Spec refs: FR-22-2, FR-22-5 D1, R-22-1, R-22-9.
"""
from __future__ import annotations

from typing import Any

from bs4 import Tag

from converter.models import GAP, GapOrigin
from converter.services.field_extractors import extract_field_value
from orchestrator.converter_v2 import db_lookup


# ---------------------------------------------------------------------------
# Faithful port of _lift_scalar_attrs_by_selector (convert.py:3781)
# ---------------------------------------------------------------------------

def lift_scalar_content(node: Tag, slug: str, media_map: dict) -> dict:
    """Universal DB-driven multi-scalar lift for a G3-attrs content block.

    Generalises the single-attr graceful fallback in _atomic_attrs_for
    (~line 3079) to N scalar attrs keyed by each attr's ``derived_selector``.
    For every content/rating attr the block declares (block_attrs(slug)), find
    the FIRST descendant of ``node`` matching that attr's BEM class selector and
    lift its value into the attr — text via rich_text_content, star-count via
    aria-label / glyph count. An attr whose selector matches nothing emits NO
    key, which makes this a strict NO-OP for grid/gallery blocks (they carry no
    content derived_selectors) and for absent draft elements (e.g. ratingScale's
    .sgs-testimonial__rating, missing on page 8).

    Selection rule (the no-op floor):
      - attr MUST have a non-empty derived_selector, AND
      - role in {'text-content','content'} with attr_type 'string'  → text lift
        OR role == 'rating' with attr_type 'number'                 → star lift
        OR role == 'image-object' with attr_type 'object'           → media lift
      - any other role/type combination is skipped (no key emitted).

    showRating coupling: if the block declares a ``showRating`` boolean attr and
    a ratingStars-style number attr was lifted with value > 0, set showRating
    True (DB-attr-driven, no slug literal).

    Args:
        node:      The resolved block's root Tag node (draft DOM subtree).
        slug:      The resolved SGS block slug (e.g. 'sgs/testimonial').
        media_map: Caller-supplied basename→entry dict (pass ``{}`` when no
                   media-map was loaded for this run).

    Returns:
        dict of lifted scalar attrs (possibly empty). No garbage keys.
    """
    if not slug.startswith("sgs/"):
        return {}
    # COUNCIL-MANDATED OPT-IN GATE (R-22-1 data-driven / R-22-9 universal mechanism):
    # hard NO-OP (STOP-E) for every block that has NOT declared the
    # 'scalar-content-lift' capability (block.json supports.sgs.scalarContentLift).
    # The role+derived_selector trigger alone matches ~50 blocks (date/URL/title
    # attrs) — only opted-in blocks may dump draft text/stars into their attrs.
    if "scalar-content-lift" not in db_lookup.capabilities_for(slug):
        return {}
    catalogue = db_lookup.block_attrs(slug)
    if not catalogue:
        return {}

    lifted: dict = {}
    lifted_rating_positive = False
    for attr_name, info in catalogue.items():
        if not isinstance(info, dict):
            continue
        selector = info.get("derived_selector")
        if not selector or not isinstance(selector, str):
            continue
        role = info.get("role")
        attr_type = info.get("attr_type")

        is_text = role in ("text-content", "content") and attr_type == "string"
        is_rating = role == "rating" and attr_type == "number"
        # image-object: object-typed attr with role='image-object' — find the first
        # <img> descendant inside the matched element and lift via
        # scalar_media_from_img (same helper used by _route_composite_interior).
        # Covers blocks like sgs/team-member where the photo is a scalar object attr
        # not an InnerBlock. R-22-1 (DB-driven via role column) / R-22-9 (universal
        # — fires for any G3 block with a scalar image attr). 2026-06-13.
        is_media_object = role == "image-object" and attr_type == "object"
        if not (is_text or is_rating or is_media_object):
            continue

        # A derived_selector is one OR MORE comma-separated BEM class selectors
        # ('.sgs-x__y' or '.sgs-x__text, .sgs-x__quote'); multi-selector support
        # handles the draft naming-space drift (page-8 `__text` vs canonical
        # `__quote`). Resolve each to a bare class name and find the FIRST matching
        # descendant (first non-None wins). Single-class selectors work identically.
        # find(class_=...) keeps the BeautifulSoup surface consistent (no CSS engine).
        element = None
        for part in selector.split(","):
            class_name = part.strip().lstrip(".")
            if not class_name:
                continue
            element = node.find(class_=class_name)
            if element is not None and isinstance(element, Tag):
                break
            element = None
        if element is None:
            continue  # no class matched → emit no key (grid no-op / absent draft elem)

        if is_text:
            # Delegate to shared field_extractors (Spec 31 §3.B.0 shared lib).
            value = extract_field_value(element, "text-content", media_map)
            if value:
                lifted[attr_name] = value
        elif is_media_object:
            # Delegate to shared field_extractors — same handler as array items.
            value = extract_field_value(element, "image-object", media_map)
            if value is not None:
                lifted[attr_name] = value
        else:  # is_rating
            # Delegate to shared field_extractors — "rating" = STAR-count role.
            stars = extract_field_value(element, "rating", media_map)
            if stars is None:
                stars = 0
            lifted[attr_name] = stars
            if stars > 0:
                lifted_rating_positive = True

    # showRating coupling — only when the block declares the attr and a positive
    # rating was lifted. DB-driven (presence of the attr in the catalogue).
    if lifted_rating_positive and "showRating" in catalogue:
        sr_info = catalogue.get("showRating")
        if isinstance(sr_info, dict) and sr_info.get("attr_type") == "boolean":
            lifted["showRating"] = True

    return lifted


# ---------------------------------------------------------------------------
# Existing resolve stub — untouched so dispatch table + existing tests pass.
# The step-3 stage gate will replace this with the real dispatch integration.
# ---------------------------------------------------------------------------

def resolve(decl: Any, ctx: Any) -> GAP:
    return GAP(
        origin=GapOrigin.UNIMPLEMENTED_STUB,
        property=decl.property,
        tier=decl.tier,
        detail="scalar_content resolver not built yet (slice stub)",
    )
