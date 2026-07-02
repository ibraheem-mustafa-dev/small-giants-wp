"""array_content.py — Array / repeater content lift (Spec 31 §3.B4 / §13.3 FR-31-2.5).

DB-RECOGNITION lift (2026-07-02 rewrite — replaces the hand-declared
``array_item_fields`` mechanism, which the spec's own §3.B.0.1 named an R-31-9
violation). NO hand-declared per-block selectors anywhere: item detection is
structural (sibling-class DOM traversal, §2.4) and each item's fields are matched
to the block's own item schema by the shared recognition machinery
(``bem_element_to_canonical_slot`` → ``canonical_slot_for`` → role), with the
role-fallback layer for a draft child whose element name doesn't match a field
name but whose ROLE does (Bean 2026-07-02: a badge caption classed ``__text``
carries ``text-content`` functionality, so it fills the ``label`` field which is
also ``text-content``).

The block's item field NAMES come from its own ``block.json`` ``items.properties``
(the block's declared data model — read at convert-time exactly as
``has_inner.py`` reads ``save.js``/``render.php``; NOT a hardcoded selector).
Each field's (slot, extraction-role) is DERIVED from the DB:
``canonical_slot_for(field_name)`` → ``standalone_block_for(slot)`` →
``block_attributes.role``. A draft child's slot + role are derived the same way.

Two matching layers per draft child (Bean's design, verified on real data):
  L1 — name/slot match: child's canonical slot == a field's canonical slot.
  L2 — role fallback:   else child's content role == an unmatched field's role,
       when that role is unique among the item's remaining fields.

Output shape = Tier B (scalar array-of-dicts): ``attrs[arrayAttr] = [item_dict…]``,
one dict per item keyed by the block's field names — what the block's render.php
``foreach($items)`` reads. (Tier A "one child block per item" — array_item_slot_for
canonical_slot populated — is a future branch; no current block uses that shape.)

Capability gate: a block MUST carry ``array-content-lift`` (opt-in, R-31-1).
Conservation (STOP-27 / Rule 4): items_seen == filled + item_gaps, hard ``raise``.

No block-slug literals (gates/no_slug_literal.py): array attrs from
``block_attrs(attr_type='array')``; field names from the block's own block.json;
all resolution via ``db_lookup`` / ``recognise_helpers`` DB accessors.
"""
from __future__ import annotations

import functools
import json
import re
import sqlite3
from pathlib import Path
from typing import Any

from bs4 import Tag

from converter.context import ContentConservationError, ContentGap
from converter.services.field_extractors import extract_field_value
from converter.services.recognise_helpers import bem_element_to_canonical_slot
from orchestrator.converter_v2 import db_lookup

_ARRAY_LIFT_CAP = "array-content-lift"

# scripts/converter/resolvers/array_content.py -> plugins/sgs-blocks/
_PLUGIN_DIR = Path(__file__).resolve().parents[3]
_BLOCKS_DIR = _PLUGIN_DIR / "src" / "blocks"

# A BEM element class: sgs-<block>__<element>[--<modifier>]. Capture <element>.
_BEM_ELEMENT_RE = re.compile(r"^sgs-[a-z0-9-]+__([a-z0-9-]+?)(?:--[a-z0-9-]+)*$")


@functools.lru_cache(maxsize=1)
def _content_roles() -> frozenset[str]:
    """The content-bearing role names, DB-derived (roles.classification), used to
    pick a slot's EXTRACTION role from its standalone block's attrs. DB-driven,
    not a hardcoded vocabulary (R-31-1)."""
    conn = sqlite3.connect(db_lookup.SGS_DB)
    try:
        rows = conn.execute(
            "SELECT role_name FROM roles WHERE classification = 'content-bearing'"
        ).fetchall()
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)


def _bem_token(node: Tag) -> str | None:
    for c in (node.get("class") or []):
        m = _BEM_ELEMENT_RE.match(c)
        if m:
            return m.group(1)
    return None


def _slot_extraction_role(slot: str | None) -> str | None:
    """Derive the field_extractors role for a canonical slot, DB-driven.

    slot -> standalone block -> its content-bearing attr role. Two documented
    normalisations for slots whose block role isn't a field_extractors handler:
      - the ``icon`` slot's block (sgs/icon) carries role='identity' → extract as
        'icon-slug' (the shared icon handler).
      - the ``link`` slot's block (sgs/button) → 'url-href' (nearest <a href>).
    """
    if not slot:
        return None
    block = db_lookup.standalone_block_for(slot)
    if not block:
        return None
    content_roles = _content_roles()
    for name, info in (db_lookup.block_attrs(block) or {}).items():
        role = info.get("role")
        if role in content_roles:
            # Return the block's own content role verbatim — the shared
            # field_extractors dispatches it (incl. 'identity' → icon-slug, in the
            # extractor, not here: 'role' is a no_slug_literal-guarded name).
            return role
    return None


def _item_field_schema(slug: str, array_attr: str) -> list[tuple[str, str | None, str | None]]:
    """The block's item field schema for an array attr: [(field_key, slot, role)].

    Field NAMES come from the block's own block.json ``items.properties`` (the
    block's data model — same convert-time block.json read as has_inner.py).
    Each field's (slot, extraction-role) is DERIVED from the DB. Fields that
    resolve to no content role (e.g. ``pending`` boolean, ``iconSvg`` companion)
    return role=None and are skipped by the lifter.
    """
    block_dir = _BLOCKS_DIR / slug.split("/")[-1]
    bj = block_dir / "block.json"
    if not bj.exists():
        return []
    try:
        data = json.loads(bj.read_text(encoding="utf-8", errors="replace"))
    except (ValueError, OSError):
        return []
    attr = (data.get("attributes", {}) or {}).get(array_attr, {}) or {}
    props = ((attr.get("items", {}) or {}).get("properties", {}) or {})
    schema: list[tuple[str, str | None, str | None]] = []
    for field_key in props:
        slot = db_lookup.canonical_slot_for(field_key)
        role = _slot_extraction_role(slot)
        schema.append((field_key, slot, role))
    return schema


def _find_item_nodes(node: Tag) -> list[Tag]:
    """Structural item detection (§2.4 sibling-class traversal): the LARGEST group
    of ≥2 direct-sibling elements that share the same BEM element token, anywhere
    in the subtree. That repeating group is the array's items (e.g. the 4
    ``__badge`` siblings under ``__inner``). No hand-declared item selector."""
    best: list[Tag] = []
    for parent in node.find_all(True):
        groups: dict[str, list[Tag]] = {}
        for kid in parent.find_all(recursive=False):
            if not isinstance(kid, Tag):
                continue
            tok = _bem_token(kid)
            if tok:
                groups.setdefault(tok, []).append(kid)
        for group in groups.values():
            if len(group) >= 2 and len(group) > len(best):
                best = group
    return best


def _lift_item(
    item_node: Tag,
    schema: list[tuple[str, str | None, str | None]],
    media_map: dict,
) -> dict:
    """Lift one item into a field dict via the 2-layer match (slot, then role)."""
    # Pre-resolve each direct-descendant content child's (slot, role) once.
    children: list[tuple[Tag, str | None, str | None]] = []
    for ch in item_node.find_all(True):
        if not isinstance(ch, Tag):
            continue
        cslot = bem_element_to_canonical_slot(ch)
        if cslot is None:
            continue
        crole = _slot_extraction_role(cslot)
        children.append((ch, cslot, crole))

    item: dict = {}
    used: set[int] = set()
    raw_svg_fallback: str | None = None
    for field_key, fslot, frole in schema:
        if frole is None:
            continue
        match: Tag | None = None
        # L1 — name/slot match
        for ch, cslot, _crole in children:
            if id(ch) in used:
                continue
            if fslot is not None and cslot == fslot:
                match = ch
                break
        # L2 — role fallback (child's content role == this field's role)
        if match is None:
            role_candidates = [
                ch for ch, _cs, crole in children
                if id(ch) not in used and crole == frole
            ]
            if len(role_candidates) == 1:
                match = role_candidates[0]
        if match is not None:
            value = extract_field_value(match, frole, media_map)
            if value is not None:
                item[field_key] = value
                used.add(id(match))
            elif raw_svg_fallback is None and match.find("svg") is not None:
                # An icon child that resolved to no slug (e.g. a filled <polygon>
                # star the fingerprint index can't match) — preserve its raw SVG
                # verbatim (icon_resolver Rule 2) into the block's raw-svg field.
                raw_svg_fallback = str(match.find("svg"))
                used.add(id(match))

    # Paired raw-svg companion: a schema field the block declares for a raw-svg
    # fallback (role None + a name that names an svg) receives the preserved SVG.
    if raw_svg_fallback:
        for field_key, _fslot, frole in schema:
            if frole is None and field_key not in item and "svg" in field_key.lower():
                item[field_key] = raw_svg_fallback
                break
    return item


def lift_array_content(
    node: Tag,
    slug: str,
    media_map: dict | None = None,
) -> tuple[dict, list]:
    """Lift array / repeater attrs for a block from its draft DOM subtree.

    Returns ``(attrs_dict, gaps_list)`` — ``attrs_dict`` maps ``arrayAttr →
    [item_dict, …]``; ``gaps_list`` holds a ``ContentGap`` per item that matched
    the structural item pattern but produced zero fields (loud, never silent).
    """
    _media = media_map or {}

    if _ARRAY_LIFT_CAP not in db_lookup.capabilities_for(slug):
        return {}, []

    attrs = db_lookup.block_attrs(slug)
    if not attrs:
        return {}, []

    item_nodes = _find_item_nodes(node)

    result_attrs: dict = {}
    all_gaps: list = []

    for attr_name, info in attrs.items():
        if not isinstance(info, dict) or info.get("attr_type") != "array":
            continue
        schema = _item_field_schema(slug, attr_name)
        if not schema or not any(role for _k, _s, role in schema):
            # No content-bearing item fields for this array attr — not this
            # resolver's concern (e.g. a config array). Skip, not a gap.
            continue
        if not item_nodes:
            continue

        filled: list[dict] = []
        item_gaps: list = []
        for i, item_node in enumerate(item_nodes):
            item_dict = _lift_item(item_node, schema, _media)
            if item_dict:
                filled.append(item_dict)
            else:
                item_gaps.append(
                    ContentGap(
                        f"{attr_name}[{i}]",
                        "item matched the structural sibling pattern but no field"
                        " resolved by slot-name or role-fallback",
                    )
                )

        # Conservation (STOP-27): items_seen == filled + item_gaps. raise, never assert.
        if len(item_nodes) != len(filled) + len(item_gaps):
            raise ContentConservationError(
                f"lift_array_content: {slug}.{attr_name} — "
                f"{len(item_nodes)} items != {len(filled)} filled + {len(item_gaps)} gaps"
            )

        if filled:
            result_attrs[attr_name] = filled
        all_gaps.extend(item_gaps)

    return result_attrs, all_gaps
