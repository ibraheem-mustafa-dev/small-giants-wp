"""array_content.py — Array / repeater content lift (Spec 31 §3.B4 / §13.3 FR-31-2.5).

DB-RECOGNITION lift (2026-07-02 rewrite — replaces the hand-declared
``array_item_fields`` mechanism, which the spec's own §3.B.0 (binding
consequence 1) named an R-31-9 violation — no §3.B.0.1 subsection exists; the
citation was corrected 2026-08-01). NO hand-declared per-block selectors
anywhere: item detection is
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

Matching layers per draft child (Bean's design, verified on real data):
  L1 — name/slot match: child's canonical slot == a field's canonical slot.
  L2 — role fallback:   else child's content role == an unmatched field's role,
       when that role is unique among the item's remaining fields.
  L3 — tag-shape match: else the child's ATOMIC TAG identity (§2.6's shared
       ``html_tag_to_core_block`` map, ``<h3>``->``sgs/heading``) == the field's
       identity (``canonical_slot``->``standalone_block``). Covers a conforming
       draft that writes item fields as BARE TAGS rather than BEM-classed
       elements — L1/L1b/L2 all require a BEM token, so those items lifted
       nothing. Ties resolve by document order against ``field_order``.

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
import re
from typing import Any

from bs4 import Tag

from converter.context import ContentConservationError, ContentGap
from converter.services.field_extractors import extract_field_value
from converter.services.recognise_helpers import bem_element_to_canonical_slot
from converter.db import db_lookup
from converter.services import icon_resolver

_ARRAY_LIFT_CAP = "array-content-lift"

# A BEM element class: sgs-<block>__<element>[--<modifier>]. Capture <element>.
_BEM_ELEMENT_RE = re.compile(r"^sgs-[a-z0-9-]+__([a-z0-9-]+?)(?:--[a-z0-9-]+)*$")


def _bem_token(node: Tag) -> str | None:
    for c in (node.get("class") or []):
        m = _BEM_ELEMENT_RE.match(c)
        if m:
            return m.group(1)
    return None


def _slot_extraction_role(slot: str | None) -> str | None:
    """Derive the field_extractors role for a canonical slot, DB-driven.

    slot -> standalone block -> that block's content-bearing attr role.
    Two documented normalisations for slots whose block role isn't a
    field_extractors handler:
      - the ``icon`` slot's block (sgs/icon) carries role='identity' → extract as
        'icon-slug' (the shared icon handler).
      - the ``link`` slot's block (sgs/button) → 'url-href' (nearest <a href>).

    Disambiguation (fixed 2026-09-05, load-bearing): most target blocks have
    exactly ONE content-bearing attr (e.g. sgs/label's ``text``, sgs/icon's
    ``iconSource``), so "the first one found" was harmless. A POLYMORPHIC
    target block that carries MORE THAN ONE content-bearing attr — e.g.
    sgs/media, which has BOTH ``imageUrl`` (role='image-object',
    canonical_slot='image') AND ``videoUrl`` (role='content',
    canonical_slot='video') — is genuinely ambiguous: returning whichever one
    the DB happens to return first (row-insertion order) silently routed a
    ``media``/``image`` array field to ``videoUrl``'s role ('content' → rich
    text), which finds no text on an ``<img>`` and drops the value, instead of
    ``imageUrl``'s role ('image-object'). Fixed by preferring the candidate
    whose OWN ``canonical_slot`` matches ``slot`` when more than one
    content-bearing candidate exists.

    This must NOT unconditionally require an exact canonical_slot match: a
    slot name and the target block's own generic content attr can legitimately
    use DIFFERENT canonical-slot tokens for the SAME concept (e.g. the
    ``label`` slot resolves to sgs/label, whose only content-bearing attr is
    ``text`` with canonical_slot='text', not 'label' — there is no second
    candidate to disambiguate against, so the mismatch is harmless and the
    old "return the only candidate" behaviour is preserved via the fallback
    below). The exact-match preference only matters, and is only applied,
    when the target block actually has more than one candidate to choose
    between.
    """
    if not slot:
        return None
    block = db_lookup.standalone_block_for(slot)
    if not block:
        return None
    content_roles = db_lookup._content_bearing_roles()
    candidates = [
        (info.get("role"), info.get("canonical_slot"))
        for info in (db_lookup.block_attrs(block) or {}).values()
        if info.get("role") in content_roles
    ]
    if not candidates:
        return None
    # Prefer the candidate that OWNS this slot (its own canonical_slot
    # matches) — this is what disambiguates sgs/media's image vs video.
    for role, cslot in candidates:
        if cslot == slot:
            # Return the block's own content role verbatim — the shared
            # field_extractors dispatches it (incl. 'identity' → icon-slug, in
            # the extractor, not here: 'role' is a no_slug_literal-guarded name).
            return role
    # No candidate's canonical_slot matches the incoming slot (the common,
    # unambiguous case — a single-content-attr block whose attr's generic
    # canonical_slot token differs from the slot alias that led here).
    # Preserve prior behaviour: return the first content-bearing role found.
    return candidates[0][0]


def _item_field_schema(slug: str, array_attr: str) -> list[tuple[str, str | None, str | None]]:
    """The block's item field schema for an array attr: [(field_key, slot, role)].

    Field NAMES come from the DB (``array_item_schema``, seeded from the block's
    block.json ``items.properties`` by sgs-update-v2.py — the block's data model).
    Each field's (slot, extraction-role) is DERIVED from the DB. Fields that
    resolve to no content role (e.g. ``pending`` boolean, ``iconSvg`` companion)
    return role=None and are skipped by the lifter.
    """
    schema: list[tuple[str, str | None, str | None]] = []
    for field_key, declared_role in db_lookup.array_item_field_schema(slug, array_attr):
        slot = db_lookup.canonical_slot_for(field_key)
        # FR-31-2.1a: the block DECLARES the field's extraction role in block.json
        # (read from array_item_schema.role); prefer it. Fall back to the DB
        # name->slot->role derivation only when the field declares no role (so
        # self-resolving fields — icon/label/text — are unchanged).
        role = declared_role or _slot_extraction_role(slot)
        schema.append((field_key, slot, role))
    return schema


def _find_item_nodes(node: Tag) -> tuple[list[Tag], list[Tag]]:
    """Structural item detection (§2.4 sibling-class traversal): the LARGEST group
    of ≥2 direct-sibling elements that share the same BEM element token, anywhere
    in the subtree. That repeating group is the array's items (e.g. the 4
    ``__badge`` siblings under ``__inner``). No hand-declared item selector.

    Returns ``(items, below_threshold)``. ``below_threshold`` holds every LONE
    BEM-classed child that a sibling-group scan saw but rejected purely for being
    a group of one — the raw material for the dropped-single-item warning in
    ``lift_array_content``. It is empty whenever a real repeater WAS found (in
    that case nothing was dropped for this subtree).

    The ``>= 2`` threshold is deliberately UNCHANGED. It is false-positive
    protection: at ``>= 1`` any lone BEM-classed child would be lifted as a
    one-item array the draft never had, and on a fidelity pipeline an invented
    array is worse than an omission. This function now merely REPORTS what the
    threshold rejected; it never lowers it.
    """
    best: list[Tag] = []
    below: list[Tag] = []
    # Include `node` itself: items can be DIRECT children of the root (icon-list
    # <ul> → <li> items, card-grid/social-icons), not only under a nested wrapper
    # (trust-bar __inner). find_all(True) excludes the root, so probe it too.
    for parent in [node, *node.find_all(True)]:
        groups: dict[str, list[Tag]] = {}
        for kid in parent.find_all(recursive=False):
            if not isinstance(kid, Tag):
                continue
            tok = _bem_token(kid)
            if tok:
                groups.setdefault(tok, []).append(kid)
        for group in groups.values():
            if len(group) >= 2:
                if len(group) > len(best):
                    best = group
            else:
                below.append(group[0])
    return (best, []) if best else ([], below)


def _kebab_to_camel(token: str) -> str:
    """'savings-badge' -> 'savingsBadge'."""
    parts = token.split("-")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def _norm(s: str) -> str:
    return re.sub(r"[-_]", "", s).lower()


def _field_owns_token(field_key: str, bem_token: str) -> bool:
    """FR-31-2.1a Tier-B, per item: a field OWNS a draft child when the child's
    BEM element token is a prefix of the field key (normalised, name-free) — the
    element word matches, the property word (Text/Url) is the remainder that the
    declared role then extracts. child ``__cta`` -> ``ctaText``/``ctaUrl``;
    ``__ribbon`` -> ``ribbonText``; ``__savings-badge`` -> ``savingsBadgeText``;
    exact match too (``__name`` -> ``name``). No global-vocab lookup, no selector."""
    fk = _norm(field_key)
    ct = _norm(_kebab_to_camel(bem_token))
    return bool(ct) and (fk == ct or fk.startswith(ct))


# Roles that read a specific attribute/descendant (safe to self-extract from a
# flat item root); text-content is EXCLUDED (it would concatenate a structured
# item's children).
_FLAT_SELF_ROLES = frozenset({"icon-slug", "identity", "url-href", "link-href",
                              "image-object", "rating"})


@functools.lru_cache(maxsize=1)
def _tag_map() -> dict[str, str]:
    """The shared DB tag->block map (Spec 31 §2.6 / §3.B.0 consequence 2).

    Cached because L3 consults it per (field x item) and the accessor opens a
    sqlite connection per call. Same DB data every other extraction path uses —
    NOT an array-private copy (that duplication is the R-31-9 violation §3.B.0
    names by this file's name)."""
    return db_lookup.atomic_tag_map()


def _tag_identity(node: Tag) -> str | None:
    """A bare content tag's atomic block identity: <h3> -> sgs/heading."""
    return _tag_map().get((node.name or "").lower())


@functools.lru_cache(maxsize=512)
def _field_identity(fslot: str | None) -> str | None:
    """A field's block identity: canonical_slot -> slots.standalone_block.

    Returns None for a slot that routes to no block (e.g. the bare ``badge``
    slot, parking ``P-BADGE-SLOT-ROUTE-TO-LABEL``) — such a field simply never
    matches at L3 rather than competing for an unrelated child."""
    if not fslot:
        return None
    return db_lookup.standalone_block_for(fslot)


def _match_child(
    field_key: str,
    fslot: str | None,
    frole: str,
    children: list[tuple[Tag, str | None, str | None, str | None]],
    used: set[tuple[int, str]],
    item_node: Tag,
    is_flat: bool,
) -> Tag | None:
    """Match one field to one item child: L1 exact canonical-slot name ->
    L1b BEM-element-segment (longest token wins) -> L2 unique-role fallback ->
    L1c flat-item self-extraction -> L1d leaf-item text -> L3 tag-shape identity
    (bare-tag item fields, §2.6). ``used`` holds ``(id(child), role)`` so one
    element may serve TWO fields by DIFFERENT roles (an ``<a class="__cta">`` ->
    ``ctaText`` via text-content AND ``ctaUrl`` via url-href) but never twice."""
    # L1 — exact canonical-slot name match
    for ch, cslot, _cr, _ct in children:
        if (id(ch), frole) not in used and fslot is not None and cslot == fslot:
            return ch
    # L1b — BEM-element-segment match (disambiguates same-role fields)
    best: Tag | None = None
    best_len = 0
    for ch, _cs, _cr, ctoken in children:
        if (id(ch), frole) in used or not ctoken:
            continue
        if _field_owns_token(field_key, ctoken) and len(ctoken) > best_len:
            best, best_len = ch, len(ctoken)
    if best is not None:
        return best
    # L2 — role fallback (a single unused child carrying this role)
    cand = [
        ch for ch, _cs, crole, _ct in children
        if (id(ch), frole) not in used and crole == frole
    ]
    if len(cand) == 1:
        return cand[0]
    # L1c — flat-item self-extraction: a single-element item (a social icon
    # ``<a>`` carries platform via data-lucide AND url via href on ITSELF, with no
    # content children). Only for a FLAT item (no BEM-classed content children)
    # and an attribute/descendant-reading role (never text-content on a non-leaf).
    if is_flat and (id(item_node), frole) not in used and frole in _FLAT_SELF_ROLES:
        return item_node
    # L1d — leaf-item text self-extraction: a plain-text LEAF item (a size/flavour
    # pill ``<button>8-pack</button>`` whose only content is its OWN text, no
    # element descendants) carries its label as its own text-content. text-content
    # is excluded from _FLAT_SELF_ROLES because on a STRUCTURED item it would
    # concatenate that item's children — but a true leaf has none, so its text IS
    # the field value (safe + correct). Universal: any block whose array items are
    # flat text chips (size/flavour pills, tag lists), never a per-block carve-out.
    if (
        frole == "text-content"
        and item_node.find(True) is None
        and (id(item_node), frole) not in used
    ):
        return item_node
    # L3 — TAG-SHAPE identity match (Spec 31 §2.6 + §3.B.0 consequence 2).
    # A CONFORMING draft may write an item's fields as bare content tags
    # (``<div class="…__item"><h3>Card One</h3><p>body</p></div>``) instead of
    # BEM-classed elements — §2.6 states those resolve to their atomic block via
    # the shared tag map. Every tier above needs a BEM token (L1/L1b directly; L2
    # derives the child's role FROM that token), so a bare tag matched nothing and
    # the whole repeater lifted zero items. Match the child's TAG identity against
    # the field's own identity (canonical_slot -> standalone_block) instead.
    #
    # Ambiguity (two unmatched fields sharing one identity) resolves by DOCUMENT
    # ORDER, Bean-approved 2026-07-31: the schema is iterated in ``field_order``
    # and this tier returns the first still-unused child in document order, so the
    # Nth child of an identity lands on the lowest-``field_order`` unmatched field
    # of that identity.
    #
    # STRICTLY ADDITIVE (the D308 zero->one shape, MF-4-safe): it runs only after
    # every earlier tier returned nothing, so it cannot change any field that
    # already resolved — no existing block's lift can regress.
    fident = _field_identity(fslot)
    if fident:
        for ch, _cs, _cr, _ct in children:
            if (id(ch), frole) not in used and _tag_identity(ch) == fident:
                return ch
    return None


def _lift_item(
    item_node: Tag,
    schema: list[tuple[str, str | None, str | None]],
    media_map: dict,
) -> dict:
    """Lift one item into a field dict via the 3-layer match (slot, BEM-segment,
    role). Children whose BEM class resolves to no slot are KEPT (their token
    still drives the L1b segment match — e.g. ``__name`` has no canonical slot)."""
    children: list[tuple[Tag, str | None, str | None, str | None]] = []
    for ch in item_node.find_all(True):
        if not isinstance(ch, Tag):
            continue
        cslot = bem_element_to_canonical_slot(ch)
        crole = _slot_extraction_role(cslot)
        ctoken = _bem_token(ch)
        children.append((ch, cslot, crole, ctoken))

    # A FLAT item has no BEM-classed content children (a social icon <a> carries
    # its fields on itself) — enables L1c self-extraction in _match_child.
    is_flat = not any(ctoken for _c, _cs, _cr, ctoken in children)

    item: dict = {}
    used: set[tuple[int, str]] = set()
    raw_svg_fallback: str | None = None
    for field_key, fslot, frole in schema:
        if frole is None:
            continue
        match = _match_child(field_key, fslot, frole, children, used, item_node, is_flat)
        if match is None:
            continue
        value = extract_field_value(match, frole, media_map)
        if value is not None:
            item[field_key] = value
            used.add((id(match), frole))
        elif raw_svg_fallback is None and match.find("svg") is not None:
            # An icon child that resolved to no slug (e.g. a filled <polygon>
            # star) — preserve its raw SVG verbatim (icon_resolver Rule 2) into
            # the block's raw-svg field.
            raw_svg_fallback = str(match.find("svg"))
            used.add((id(match), frole))

    # Paired raw-svg companion: a schema field the block declares for a raw-svg
    # fallback (role None + a name that names an svg) receives the preserved SVG.
    if raw_svg_fallback:
        for field_key, _fslot, frole in schema:
            if frole is None and field_key not in item and "svg" in field_key.lower():
                item[field_key] = raw_svg_fallback
                break
        # Spec 31 §3.B.0 — styling follows the recognised element: a SOLID glyph
        # (e.g. a filled polygon star) sets the block's per-icon ``fillStyle`` so
        # the clone renders it filled instead of the uniform outline. Capability-
        # gated (R-31-9): fires only when the block declares a ``fillStyle`` field.
        if icon_resolver.is_filled_glyph(raw_svg_fallback) and any(
            fk == "fillStyle" for fk, _s, _r in schema
        ):
            item["fillStyle"] = "filled"
    return item


def _candidate_relevant_to_schema(
    candidate: Tag,
    schema: list[tuple[str, str | None, str | None]],
) -> bool:
    """Does this lone BEM-classed child belong to THIS array attr's OWN item
    schema (approved smaller fix, 2026-09-04 /qc-council, replacing the
    originally-proposed ``consumed_ids`` thread through ``walk.py`` — that
    variable lives in a different function's stack frame and would have made
    the deliberately flat/additive/stateless handler dispatch stateful for no
    reason)?

    Scopes the below-threshold report so an element a DIFFERENT leg already
    lifted correctly (product-card's ``__cta``, lifted by ``ctaText`` as a
    scalar) never appears in an unrelated array attr's drop diagnostic —
    measured live: a ``packSizes`` report on a product-card with a media +
    heading + cta listed ALL THREE as ``candidate_elements``, none of which
    ``packSizes`` has any field for.

    Matches by SHAPE ONLY — the same L1 (canonical-slot identity) and L3
    (tag-shape identity) tiers ``_match_child`` uses to bind a real item's
    field, plus L1b (BEM-token ownership). Deliberately EXCLUDES the L2
    role-fallback tier: a bare content-role match (e.g. ``text-content``) is
    too permissive for a single isolated candidate with no sibling fields to
    disambiguate against — role-only matching is exactly what the trust-bar
    docstring above already documents as unreliable (a lone ``__badge``, its
    ``__inner`` wrapper AND its ``__label`` child all satisfy ``text-content``
    under the item schema). Requiring a token/slot/identity match instead of a
    role match is what keeps an irrelevant text node (the CTA's own label)
    from masquerading as a lost item of an unrelated array.
    """
    ctoken = _bem_token(candidate)
    cslot = bem_element_to_canonical_slot(candidate)
    cident = _tag_identity(candidate)
    for field_key, fslot, _frole in schema:
        if fslot is not None and cslot == fslot:
            return True
        if ctoken and _field_owns_token(field_key, ctoken):
            return True
        fident = _field_identity(fslot)
        if fident is not None and cident == fident:
            return True
    return False


def _warn_items_below_threshold(
    slug: str,
    attr_name: str,
    candidates: list[Tag],
) -> None:
    """Report an array attr that lifted NOTHING because no sibling group reached 2.

    Routed through ``services/assembly._fold_trace`` — the same ``[fold-gap]``
    WARNING logger the band-fold and per-area-fold gaps already use — so the drop
    lands in the run log operators ALREADY read, rather than inventing a second
    channel nobody watches. Imported lazily inside the call because ``assembly``
    sits above the resolvers in the import order (``extraction`` imports both);
    a module-level import here would invert that layering for no gain.

    Bean's scope narrowing (2026-08-07) is applied at the BLOCK level, exactly as
    he specified: this only ever runs past ``lift_array_content``'s
    ``array-content-lift`` capability gate and a populated
    ``array_item_field_schema`` with at least one content-bearing field — i.e.
    only for a block that DECLARES it holds a repeater. A block that legitimately
    stands alone (a single ``sgs/quote``, a lone badge block) returns at the
    capability gate and never reaches here. Both conditions are read from the
    block's own declaration — no slug list, no carve-out (R-31-1 / R-31-9).

    It deliberately does NOT name WHICH child was the lost item. That is not
    knowable: with one member there is no repetition to detect, which is the very
    reason the ``>= 2`` threshold exists. Measured on the live DB — a lone
    trust-bar ``__badge``, its ``__inner`` wrapper and its ``__label`` child ALL
    lift ``{'label': 'Handmade'}`` under the item schema, because ``text-content``
    matches any text-bearing node. Any per-candidate claim would therefore be a
    guess dressed as a finding. The warning states only what is true: this array
    lifted zero items while BEM-classed children were present.
    """
    from converter.services.assembly import _fold_trace

    _fold_trace(
        "array_items_below_threshold",
        owning_block=slug,
        array_attr=attr_name,
        candidate_elements=sorted(
            {_bem_token(c) for c in candidates if _bem_token(c)}
        ),
        reason=(
            "no sibling group reached the >= 2 repeat threshold, so this array"
            " lifted ZERO items — a draft carrying exactly one of them drops it"
            " entirely. The threshold is retained deliberately (lowering it would"
            " invent an array from any lone child). Check the draft against the"
            " clone for a missing single item."
        ),
    )


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

    item_nodes, below_threshold = _find_item_nodes(node)

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
            # SILENT-LOSS SURFACE (2026-08-07). Conservation above is
            # items_seen == filled + item_gaps, which is trivially 0 == 0 + 0 when
            # the threshold saw no group — so a draft carrying exactly ONE
            # testimonial / badge / pill dropped it with nothing in the run log.
            #
            # Warn only for a candidate that WOULD have filled this array's fields:
            # a composite's ordinary singleton wrapper (hero's __content / __media)
            # lifts nothing under the item schema and must not generate noise, or
            # the warning becomes something operators learn to ignore. The lift is
            # a dry run — its result is DISCARDED, so no item is invented and the
            # emitted attrs are byte-identical to before this block existed.
            relevant_candidates = [
                c for c in below_threshold
                if _candidate_relevant_to_schema(c, schema)
            ]
            if relevant_candidates:
                _warn_items_below_threshold(slug, attr_name, relevant_candidates)
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
