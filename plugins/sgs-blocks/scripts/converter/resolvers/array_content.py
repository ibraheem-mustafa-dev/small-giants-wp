"""array_content.py — Array / repeater content lift (Spec 31 §3.B4, D248).

PATH A (Bean 2026-06-28): lift each item's content directly into the block's
existing array attr (``attrs[arrayAttr] = [item_dict, ...]``).  Zero per-block
code; the field keys / selectors / roles are DATA in the ``array_item_fields``
DB table, seeded from ``block.json supports.sgs.arrayItemSchema`` by
sgs-update-v2.py Stage 1.

Capability gate: a block MUST carry ``array-content-lift`` in
``block_capabilities`` to be processed (MF-5 / R-31-1 / R-31-9 opt-in pattern,
identical to ``scalar-content-lift``).  Config arrays (role=layout) are never
in the schema, so no explicit role-filter is needed in this resolver.

Conservation (STOP-27 / Rule 4):
  - items_seen == filled_items + item_gaps — hard ``raise ContentConservationError``,
    never ``assert`` (``-O`` strips assert, Rule 4 hole).
  - An item with ZERO non-gap-pending fields lifted → loud ``ContentGap``, never
    silent skip.  An item with ≥1 non-gap-pending field resolved counts as
    "filled" even if it also has gap-pending fields.
  - A field whose selector matches nothing in the item element → omit the key
    (the block's render.php per-field default applies); this is NOT a gap because
    the field is optional in the rendered output.

Gap-pending fields (role='gap-pending'):
  - These fields are NOT lifted — the role has no handler yet (icon slugs,
    url-href, boolean flags, nested arrays, etc.).
  - Instead, a ``ContentGap`` is emitted for each gap-pending field across all
    items, with the ``gap_reason`` from the DB row (seeded from block.json
    ``gapReason``).  These field-level gaps go into a SEPARATE ``field_gaps``
    list and are returned alongside item-level gaps.
  - Gap-pending fields are EXCLUDED from item conservation counting — an item
    is still "filled" if it has ≥1 real (non-gap-pending) field resolved.

No block-slug literals (scanned by gates/no_slug_literal.py):
  - the resolved array attrs come from db_lookup.block_attrs() (attr_type='array')
  - the per-item schemas come from db_lookup.array_item_fields()
  - the capability gate uses db_lookup.capabilities_for()
  all three are DB-driven; the resolver names no block.
"""
from __future__ import annotations

from typing import Any

from bs4 import Tag

from converter.context import ContentConservationError, ContentGap
from converter.services.field_extractors import extract_field_value
from orchestrator.converter_v2 import db_lookup


# ---------------------------------------------------------------------------
# Capability tag constant (NOT a block slug — the no_slug_literal gate tracks
# slug/variant/slot idents, not capability strings, per the gate's docstring).
# ---------------------------------------------------------------------------
_ARRAY_LIFT_CAP = "array-content-lift"


# ---------------------------------------------------------------------------
# Per-item field extractor (capability-bypassed per MF-3)
# ---------------------------------------------------------------------------

def _lift_field(item_node: Tag, field_selector: str, role: str, media_map: dict) -> Any:
    """Lift one field from an item element by its selector + role.

    Returns the lifted value (str / dict / int) or ``None`` when the selector
    matched nothing inside the item.  A ``None`` return means the key is
    OMITTED from the item dict (not a gap — the field is optional).

    This helper is capability-bypassed: it operates directly on the item sub-
    element, without the ``scalar-content-lift`` DB gate that ``lift_scalar_content``
    applies (item blocks like ``sgs/button`` / ``sgs/label`` / ``sgs/icon`` do NOT
    carry the scalar-content-lift capability, so re-using that function would
    return ``{}`` for every item — MF-3 hole).

    Role→value dispatch is DELEGATED to ``field_extractors.extract_field_value``
    (Spec 31 §3.B.0 shared library).  Only the element-finding logic (class-
    selector lookup + item-IS-element check) lives here.

    Legacy DB rows may carry role ``"number"`` for the star-count role; this
    is mapped to ``"rating"`` before dispatch so both labels reach the same
    handler in the shared lib.
    """
    # Selector is a BEM class (with or without leading '.'); strip the dot for
    # BeautifulSoup's class= lookup (same pattern as lift_scalar_content).
    class_name = field_selector.strip().lstrip(".")
    if not class_name:
        return None

    element = item_node.find(class_=class_name) if item_node.get("class") and \
        class_name not in (item_node.get("class") or []) else None
    # Also check if the item node itself carries the class (item IS the field element)
    if element is None:
        if class_name in (item_node.get("class") or []):
            element = item_node
        else:
            element = item_node.find(class_=class_name)

    if element is None or not isinstance(element, Tag):
        return None

    # Map legacy "number" role → canonical "rating" so both reach the same
    # star-count handler in the shared lib.  No other remapping needed.
    resolved_role = "rating" if role == "number" else role

    return extract_field_value(element, resolved_role, media_map)


# ---------------------------------------------------------------------------
# Item extractor
# ---------------------------------------------------------------------------

def _extract_item(
    item_node: Tag,
    field_rows: list[dict],
    media_map: dict,
    attr_name: str,
    idx: int,
) -> tuple[dict, list]:
    """Lift all non-gap-pending fields for one item element.

    Returns ``(item_dict, field_gaps)`` where:
      - ``item_dict``   — key→value for all resolved non-gap-pending fields
        (possibly empty when no selector matched).
      - ``field_gaps``  — list of ``ContentGap`` for each gap-pending field
        in this item (one gap per gap-pending field key, regardless of whether
        the selector matched).

    Returns ``(None, [])`` when ``item_node`` is not a Tag (safety guard).
    """
    if not isinstance(item_node, Tag):
        return None, []  # type: ignore[return-value]
    item_dict: dict = {}
    field_gaps: list = []
    for frow in field_rows:
        field_key = frow["field_key"]
        field_selector = frow["field_selector"]
        role = frow["role"]
        if role == "gap-pending":
            reason = frow.get("gap_reason") or f"{field_key} has no lift handler"
            field_gaps.append(
                ContentGap(
                    f"{attr_name}[{idx}].{field_key}",
                    reason,
                )
            )
            continue
        value = _lift_field(item_node, field_selector, role, media_map)
        if value is not None:
            item_dict[field_key] = value
    return item_dict, field_gaps


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def lift_array_content(
    node: Tag,
    slug: str,
    media_map: dict | None = None,
) -> tuple[dict, list]:
    """Lift array / repeater attrs for a block from its draft DOM subtree.

    Returns ``(attrs_dict, gaps_list)`` where:
      - ``attrs_dict`` maps ``arrayAttr → [item_dict, ...]`` (possibly multiple
        array attrs per block).
      - ``gaps_list``  is a list of ``ContentGap`` items for items that produced
        zero field lifts (loud, never silent).

    Capability gate: if the block does NOT carry ``array-content-lift``, both
    return values are empty (no-op, no exception).

    Conservation invariant (STOP-27): for each array attr,
    ``items_seen == filled_items + item_gaps``.  Gap-pending field gaps are
    accumulated separately and appended to ``gaps_list`` AFTER the item-level
    conservation check passes.  Violation → ``raise ContentConservationError``.

    Gap-pending fields (role='gap-pending') are NOT lifted — they emit one
    ``ContentGap`` per field×item with the ``gap_reason`` from the DB.  An
    item with ≥1 real field resolved still counts as "filled" in conservation.

    No block-slug literals — all routing is via DB accessors.
    """
    _media = media_map or {}

    # Capability gate (MF-5 / R-31-1 opt-in pattern, mirrors scalar_content.py).
    if _ARRAY_LIFT_CAP not in db_lookup.capabilities_for(slug):
        return {}, []

    attrs = db_lookup.block_attrs(slug)
    if not attrs:
        return {}, []

    result_attrs: dict = {}
    all_gaps: list = []

    for attr_name, info in attrs.items():
        if not isinstance(info, dict):
            continue
        if info.get("attr_type") != "array":
            continue

        # Look up the per-item field schema for this attr.
        field_rows = db_lookup.array_item_fields(slug, attr_name)
        if not field_rows:
            # No schema authored for this array attr yet — skip silently.
            # (This is a DB-data gap, not a conservation violation.)
            continue

        # item_selector: all field rows for the same attr share the same item_selector
        # (seeded from the single arrayItemSchema[attr].itemSelector value).
        item_selector = field_rows[0]["item_selector"]
        item_class = item_selector.strip().lstrip(".")
        if not item_class:
            continue

        item_nodes = node.find_all(class_=item_class)
        items_seen = len(item_nodes)

        filled: list[dict] = []
        item_gaps: list = []
        field_gaps: list = []

        for i, item_node in enumerate(item_nodes):
            item_dict, fgaps = _extract_item(item_node, field_rows, _media, attr_name, i)
            field_gaps.extend(fgaps)
            if item_dict is None:
                # Non-Tag node — conservative: count as an item gap.
                item_gaps.append(
                    ContentGap(
                        f"{attr_name}[?]",
                        "item node is not a Tag — cannot extract fields",
                    )
                )
            elif len(item_dict) == 0:
                # Zero non-gap-pending fields lifted → loud ContentGap (Rule 4 / STOP-27).
                item_gaps.append(
                    ContentGap(
                        f"{attr_name}[{len(filled) + len(item_gaps)}]",
                        "item element matched the selector but no non-gap-pending"
                        " fields were extracted"
                        " — check arrayItemSchema field selectors vs draft classes",
                    )
                )
            else:
                filled.append(item_dict)

        # Conservation invariant (STOP-27): item-level only; field_gaps are separate.
        # raise, never assert (-O strips assert, Rule 4 hole).
        if items_seen != len(filled) + len(item_gaps):
            raise ContentConservationError(
                f"lift_array_content: {slug}.{attr_name} — "
                f"{items_seen} items_seen != "
                f"{len(filled)} filled + {len(item_gaps)} item_gaps"
            )

        if filled:
            result_attrs[attr_name] = filled
        all_gaps.extend(item_gaps)
        all_gaps.extend(field_gaps)

    return result_attrs, all_gaps
