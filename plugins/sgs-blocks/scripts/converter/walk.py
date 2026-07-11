"""walk.py — the single walker entry + TOTAL structural-signature registry.

Spec 31 §13.3 FR-31-2.7 (container-vs-composite classifier) + FR-31-2.8 (the
registry + destination contract). EXECUTION Step 5 (D274).

WHAT THIS IS
    ONE walker entry point (``walk_content``) that computes the dispatch key
    ONCE per node (FR-31-2.8.1) and dispatches the node's content extraction
    through a TOTAL registry keyed by STRUCTURAL signature — never a block
    slug (FR-31-2.8.2; a slug-keyed entry is an R-31-9 carve-out, gated by
    ``gates/no_slug_literal.py`` which scans this file).

    Emission is ADDITIVE (FR-31-2.8.3): EVERY matching handler fires, in
    explicit priority order (CSS-cascade style, never elif source-order) and
    their results compose. This is what preserves today's composed mechanism
    arms — Case-1 = scalar + styling + array; Case-2 = child-blocks + array
    (the D248 guard) — a one-handler-per-node registry would re-introduce the
    hero.badges silent drop.

    This Step-5 registry expresses the PRE-emit_shape dispatch semantics
    (``delegates_content`` + capability flags) EXACTLY — a behaviour-identical
    re-expression of the retired ``extract_content`` if-chain. EXECUTION
    Step 6 swaps the ``delegates_content`` signature axis for the per-attr
    ``block_attributes.emit_shape`` walk (FR-31-2.6) inside this same
    registry; the signature dataclass carries the axis explicitly so that
    swap is a data change, not a re-architecture.

RECURSION OWNERSHIP (FR-31-2.8.1)
    Every node — section root, child, grandchild — re-enters through this ONE
    entry (children route via ``build_block_markup`` → ``extract_content`` →
    ``walk_content``); there is no second content dispatch. The Step-6
    emit_shape walk adds the unconditional descent for nested-attr children
    (a node cloned into an attribute still has its children walked).

PRE-REGISTRY GATES (loud, never signatures — FR-31-2.8.1)
    * ``unrecognised`` / corrupt recognition (MF5 ``delegates_content is None``) is
      routed BEFORE the registry — a loud ContentGap, never a dispatch key.
    * The D212 mutual-exclusion (``delegates_content==1`` + scalar-content-lift) is a
      VALIDITY CONSTRAINT: it raises (never a registry entry), and the
      coverage test excludes it from the producible-signature space.

Handlers late-bind into ``services.extraction`` through the module attribute
(the same mechanism as ``assembly.py``) so existing monkeypatch-based tests
keep intercepting the mechanisms.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from converter.db import db_lookup

from converter.context import Recognition


# ---------------------------------------------------------------------------
# FR-31-2.7 — the container-vs-composite classifier (recognition-stage key
# computation, NOT a walker conditional — R-31-3's three-exception contract
# holds; this runs when the dispatch key is computed).
# ---------------------------------------------------------------------------

def classify_node(rec: Recognition) -> str:
    """'holder' | 'composite' — a COMPOSED signal of DB facts, never a literal.

    An ARBITRARY HOLDER recurses its children independently (FR-31-4 container
    default); a TYPED COMPOSITE enters the per-attr content walk. The ONLY
    true arbitrary holder is the DB's container-default block (reached
    name-free via ``container_default_slug()`` — ``card-grid``/``gallery``/
    ``post-grid`` are TYPED composites, D272 premise correction). ``blocks.
    tier`` + ``block_composition`` membership already shaped the Recognition
    upstream (``recognise``/``recognise_section``), so the composed signal
    here is the recognised slug against the DB default (R-31-1; STOP-38/41 —
    no slug/slot/role literal).
    """
    if rec.slug is not None and rec.slug == db_lookup.container_default_slug():
        return "holder"
    return "composite"


# ---------------------------------------------------------------------------
# The structural signature — the ONE dispatch key (FR-31-2.8.2)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class NodeSignature:
    """Structural DB facts ONLY — never a block slug (FR-31-2.8.2).

    ``delegates_content`` is the Step-5 (pre-FR-31-2.6) child-shape axis;
    EXECUTION Step 6 replaces it with the per-attr ``emit_shape`` walk. ``kind``
    is the Recognition kind (named | atomic | scalar — ``unrecognised`` is a
    PRE-registry gate, never a signature).
    """
    kind: str
    classify: str        # holder | composite (FR-31-2.7)
    delegates_content: int  # 0 | 1 — Step-6 swaps this axis for per-attr emit_shape
    scalar_lift: bool    # scalar-content-lift capability (DB)
    array_lift: bool     # array-content-lift capability (DB)
    content_leaf: bool   # primary_content_attr present OR an icon-source role attr


def signature_for(rec: Recognition) -> NodeSignature:
    """Compute the dispatch key ONCE per node (FR-31-2.8.1), from DB facts.

    Caller guarantees rec is recognised (kind != 'unrecognised') and
    ``delegates_content`` is not None (the MF5 pre-registry gate runs first).
    """
    caps = db_lookup.capabilities_for(rec.slug)
    attrs = db_lookup.block_attrs(rec.slug)
    icon_bearing = any(
        isinstance(i, dict)
        and isinstance(i.get("role"), str)
        and i["role"].startswith("icon-")
        for i in attrs.values()
    )
    content_leaf = (
        db_lookup.primary_content_attr(rec.slug) is not None or icon_bearing
    )
    # Capability TAGS queried against the DB capability set — NOT block/slot
    # names (the no_slug_literal gate tracks slug/variant/slot idents).
    return NodeSignature(
        kind=rec.kind,
        classify=classify_node(rec),
        delegates_content=int(rec.delegates_content or 0),
        scalar_lift="scalar-content-lift" in caps,
        array_lift="array-content-lift" in caps,
        content_leaf=content_leaf,
    )


# ---------------------------------------------------------------------------
# Handlers — late-bound wrappers over the existing mechanism functions.
# Uniform call shape (rec, node, media_map, css_rules) -> list.
# ---------------------------------------------------------------------------

def _ext():
    """Late-bound extraction module (monkeypatch-transparent, same idiom as
    assembly.py — tests patching extraction.run_mechanism_* keep working)."""
    from converter.services import extraction as ext
    return ext


def _run_container_default(rec, node, media_map, css_rules) -> list:
    return _ext().run_container_default(rec, node, css_rules=css_rules, media_map=media_map)


def _run_styling_content(rec, node, media_map, css_rules) -> list:
    return _ext().run_mechanism_styling(rec, node, css_rules)


def _run_array_content(rec, node, media_map, css_rules) -> list:
    return _ext().run_mechanism_array(rec, node, media_map)


# ---------------------------------------------------------------------------
# FR-31-2.6 — the universal per-attr content walk (EXECUTION Step 6).
# Replaces the delegates_content/capability block-level dispatch (Mechanisms A/B/leaf
# as EXCLUSIVE cases). The lift PROCESSORS are RE-HOMED, not rewritten:
# lift_scalar_content (B1), run_mechanism_b's child resolution (B3 + G1/G3 +
# scalar-media art-direction), run_mechanism_leaf (element-self lift).
# ---------------------------------------------------------------------------

def run_universal_content_walk(rec, node, media_map, css_rules) -> list:
    """ONE walk for every typed composite, per-attr emit_shape-forked.

    Spec 31 §13.3 FR-31-2.6: per content routing unit — (1) IDENTITY
    (`equivalent_block_for` anchors the processing), (2) `emit_shape` —
    `nested` → lift into the parent's scalar attr; `child` → child InnerBlock
    + recurse; (3) guards re-homed, none dropped.

    Legs (ADDITIVE within the walk, mutual-exclusion per unit):

    NESTED leg 1 — selector-driven (B1 RE-HOMED): ``lift_scalar_content``
        now fires for EVERY typed block (the block-level scalar-content-lift
        capability gate dies — a per-attr fact replaces it), filtered so an
        attr seeded ``emit_shape='child'`` is NEVER scalar-lifted (the D212
        invariant re-homed per-attr: an attr cannot be both nested and child).

    NESTED leg 2 — element-driven (the D275 brick): every descendant whose
        BEM class belongs to THIS block's own family and carries an
        ``__element`` token resolves via ``db_lookup.content_attr_for_element``
        (match-strength ranked). A ``nested`` hit lifts the element's value by
        its role through the SHARED ``field_extractors`` (§3.B.0). First value
        per attr wins (B1's first-non-None contract); an element consumed here
        is EXCLUDED from child routing (mutual exclusion per unit).
        This leg is what lands product-card: `primary_content_attr` was
        ambiguous for the card, so the leaf arm could never pick — the
        per-element router resolves __name/__price/__cta to their attrs.

    CHILD leg — a block whose SOURCE delegates a ``$content`` region
        (``rec.delegates_content``, derived fresh from the save-marker +
        render ``$content`` read — the block-level fact that legitimately
        survives FR-31-2.6; what died is using it to EXCLUDE the nested legs)
        routes its unconsumed children through the retained Mechanism-B
        resolution: scalar-media columns (``*Mobile`` art-direction), G1
        forced-parentage, global BEM, atomic fallback, G3
        ``accepts_allowed_blocks`` validation (NULL = permissive + trace).

    LEAF fallback — a node with no lift and no children but a declared
        primary-content or icon-source attr lifts its OWN element via
        ``run_mechanism_leaf`` (icon-bearing-leaf gating retained verbatim —
        the keep-list item).

    ``expected_content_gaps`` fires alongside leg 1 for blocks carrying the
    scalar-content-lift capability (parity with the retired Case-1; universal
    content completeness is the A2 ledger, EXECUTION Step 11).
    """
    ext = _ext()
    results: list = []
    lifted_attrs: set[str] = set()
    consumed_ids: set[int] = set()

    caps = db_lookup.capabilities_for(rec.slug)

    # ---- NESTED leg 1 — selector-driven B1, per-attr child-shape filtered ----
    from converter.context import ContentGap, ScalarLift
    from converter.resolvers.scalar_content import lift_scalar_content
    for attr, value in lift_scalar_content(node, rec.slug, media_map=media_map or {}).items():
        if db_lookup.emit_shape_for(rec.slug, attr) == "child":
            continue  # D212 per-attr: a child-shaped attr is never scalar-lifted
        results.append(ScalarLift(attr=attr, value=value))
        lifted_attrs.add(attr)
    if "scalar-content-lift" in caps:
        results.extend(ext.expected_content_gaps(rec.slug))

    # ---- NESTED leg 2 — element-driven per-attr walk (content_attr_for_element) ----
    own_block_name = (rec.slug or "").split("/", 1)[-1]
    from converter.services.field_extractors import extract_field_value

    def _family_element(el) -> str | None:
        for cls in (el.get("class", []) or []):
            if isinstance(cls, str):
                bem = db_lookup.parse_sgs_bem(cls)
                if bem and bem.element and bem.block == own_block_name:
                    return bem.element
        return None

    def _typed_value_for_role(el, role, attr_type, media_map):
        """Role-driven, type-guarded extraction shared by BOTH content-
        routing arms below (family-element leg 2 + the foreign-identity
        arm). Returns (value, alt_value) — alt_value carries the CG-8
        image-alt companion text only, else None.

        The row's REAL role is passed through to the shared
        ``field_extractors.extract_field_value`` (§3.B.0 single-source role
        library) — never a hardcoded literal (the D279 QC fix: this arm used
        to always call ``extract_field_value(el, "text-content", ...)`` even
        when the DB row's role was ``'content'``; field_extractors now
        treats 'content' as a first-class alias of 'text-content', so the
        real role round-trips correctly).

        The STRING-attr type guard (Rule 4 / STOP-27) is preserved verbatim:
        a string attr accepts only text/content-shaped roles. The 'identity'
        branch is a DELIBERATE exception, NOT a hardcode bug: a string
        identity attr (e.g. productName) is the block's identifying TEXT,
        whereas field_extractors' role=='identity' branch means ICON-SLUG
        resolution (an unrelated, overloaded semantic used by icon-source
        leaves) — passing 'identity' straight through here would silently
        break every string identity attr.
        """
        media_map = media_map or {}
        if role in ("text-content", "content") and attr_type == "string":
            return extract_field_value(el, role, media_map), None
        if role == "identity" and attr_type == "string":
            return extract_field_value(el, "text-content", media_map), None
        if role in ("url-href", "link-href"):
            return extract_field_value(el, role, media_map), None
        if role in ("image-object", "rating"):
            value = extract_field_value(el, role, media_map)
            alt_value = None
            if role == "image-object" and attr_type == "string" and isinstance(value, dict):
                # CG-8: capture the alt BEFORE downcasting to the bare URL —
                # a string image attr wants the URL, but the dict's alt text
                # must not be silently discarded (a11y). Lifted onto the
                # block's declared image-alt companion attr by the caller,
                # DB-driven (R-31-1).
                alt_value = value.get("alt") or None
                value = value.get("url") or None  # string image attr wants the URL
            return value, alt_value
        return None, None

    # Tokens OWNED by the block's array item schema — the array arm lifts
    # those units (trust-bar badge labels, icon-list items…); leg 2 must not
    # double-lift the first item's field into a top-level attr.
    array_owned_tokens: set[str] = set()
    for a_name, a_info in db_lookup.block_attrs(rec.slug).items():
        if isinstance(a_info, dict) and a_info.get("attr_type") == "array":
            slot = db_lookup.array_item_slot_for(rec.slug, a_name)
            if slot:
                array_owned_tokens.add(slot)
            array_owned_tokens.update(db_lookup.array_item_field_names(rec.slug, a_name))

    for el in node.find_all(True):
        element = _family_element(el)
        if element is None:
            # ---- FOREIGN-IDENTITY arm (D279): a child that does NOT ----
            # ---- belong to this block's own BEM family. --------------
            # Its OWN classes may carry a BARE BLOCK-ROOT class (BemParse
            # with element=None — a genuine "this element IS a <foreign
            # block>" declaration, e.g. `sgs-button`/`sgs-button--primary`)
            # that resolves — via the SAME multi-class BEM→slug path every
            # other child-routing call site uses (db_lookup.
            # resolve_slug_from_bem, e.g. extraction.py's Mechanism-B child
            # resolution) — to a DIFFERENT, DB-registered block. When that
            # resolved identity is EXACTLY what one or more of THIS block's
            # own content attrs declare (db_lookup.equivalent_block_for),
            # the element is the built-in content those attrs want, not a
            # dropped foreign node. Example: a plain <a class="sgs-button
            # sgs-button--primary"> inside sgs/product-card resolves to
            # sgs/button, which IS product-card's ctaText/ctaUrl identity
            # (FR-31-2.6).
            #
            # GATED to bare-root candidates ONLY (never resolve_slug_from_bem's
            # Path-2 __element slot-fallback) — an __element-suffixed class
            # belonging to a DIFFERENT block family (e.g. a draft author
            # reusing the PARENT's `sgs-accordion__heading` class inside an
            # `sgs/accordion-item`) is NOT a foreign-identity declaration; it
            # is content the CHILD leg's own slot-fallback child-routing
            # already owns. Regression caught live (D279 QC): without this
            # gate, `sgs-accordion__heading` (element='heading', not a bare
            # root) resolved via Path 2 to 'sgs/heading' and hijacked the
            # accordion-item's title into a scalar lift, silently dropping
            # the child heading BLOCK the golden conformance fixture expects.
            own_classes = [c for c in (el.get("class", []) or []) if isinstance(c, str)]
            has_bare_root_candidate = any(
                (_bem := db_lookup.parse_sgs_bem(_cls)) is not None
                and _bem.element is None
                and _bem.block is not None
                for _cls in own_classes
            )
            if not has_bare_root_candidate:
                continue  # no bare-root class — the CHILD leg's own routing owns this
            identity_slug = db_lookup.resolve_slug_from_bem(own_classes)
            if identity_slug is None:
                continue  # no foreign registration — true no-op (Case 7)
            # AMENDMENT 3 — array-ownership guard: an ancestor of `el`, up to
            # (excluding) this composite's OWN root `node`, that belongs to
            # an array-owned unit (a repeater item) owns this element. Leg 2
            # must never reach inside a repeater to steal one of its fields
            # into a top-level scalar attr (e.g. a button-classed link
            # nested inside a card-grid's repeated item must not leak into
            # the PARENT composite's ctaText/ctaUrl).
            owned_by_array = False
            for anc in el.parents:
                if anc is None or anc is node:
                    break
                anc_element = _family_element(anc)
                if anc_element is not None and anc_element in array_owned_tokens:
                    owned_by_array = True
                    break
            if owned_by_array:
                continue
            for attr_name, attr_emit_shape, attr_role, attr_type in (
                db_lookup.content_attrs_for_identity(rec.slug, identity_slug)
            ):
                # AMENDMENT 4 — first-wins per attr (a 2nd matching foreign
                # element for this parent instance must never overwrite an
                # attr leg 2 already filled).
                if attr_emit_shape != "nested" or attr_name in lifted_attrs:
                    continue  # 'child' units route below via the CHILD leg
                value, alt_value = _typed_value_for_role(el, attr_role, attr_type, media_map)
                if value is None or value == "":
                    continue  # strict no-op (B1 contract) — A2 ledger owns completeness
                results.append(ScalarLift(attr=attr_name, value=value))
                lifted_attrs.add(attr_name)
                # AMENDMENT 4 — consumed_ids: so run_mechanism_b's
                # exclude_ids correctly protects composites with real
                # children from double-emitting this element as a child.
                consumed_ids.add(id(el))
                if alt_value:
                    alt_attr = db_lookup.image_alt_companion_for(rec.slug, attr_name)
                    if alt_attr and alt_attr not in lifted_attrs:
                        results.append(ScalarLift(attr=alt_attr, value=alt_value))
                        lifted_attrs.add(alt_attr)
            # STYLE-PRESET MIRROR (Spec 31 §13.5): lift the nested element's style
            # --modifier onto the parent's OWN string style-preset attr that mirrors
            # the foreign identity's inheritStyle — e.g. sgs/product-card `ctaStyle`
            # mirroring the nested sgs/button --primary/--secondary, exactly as a
            # STANDALONE sgs/button clones inheritStyle (services/assembly.py step 5,
            # via the SHARED db_lookup.preset_style_for_element — ONE impl, R-31-9).
            # These attrs are role 'behaviour' (NOT content), so equivalent_block_for/
            # content_attrs_for_identity DELIBERATELY exclude them (FR-31-2.2) — hence
            # style_preset_attrs_for_identity, which reuses the SAME
            # canonical_slot→standalone_block map minus the content-role filter.
            # Gated DB-drivenly on the identity being a preset-style block (declares a
            # string inheritStyle); no attr-name/slug literal (R-31-1).
            if (
                db_lookup.block_attrs(identity_slug)
                .get("inheritStyle", {})
                .get("attr_type") == "string"
            ):
                _preset = db_lookup.preset_style_for_element(own_classes, identity_slug)
                if _preset is not None:
                    for _style_attr in db_lookup.style_preset_attrs_for_identity(
                        rec.slug, identity_slug
                    ):
                        if _style_attr in lifted_attrs:
                            continue
                        results.append(ScalarLift(attr=_style_attr, value=_preset))
                        lifted_attrs.add(_style_attr)
                        consumed_ids.add(id(el))
            continue
        if element in array_owned_tokens:
            continue  # the array arm owns this unit (§3.B4)
        # LEAF-MOST guard: an element with same-family element DESCENDANTS is
        # a structural wrapper (__body/__inner) — its subtree text must never
        # be swallowed into one attr; its leaf descendants lift individually.
        if any(_family_element(d) for d in el.find_all(True)):
            continue
        hit = db_lookup.content_attr_for_element(rec.slug, element)
        if hit is None:
            continue
        attr_name, emit_shape, role, attr_type = hit
        if emit_shape is None:
            # A CONTENT-role attr with UNSEEDED emit_shape is a tracked GAP,
            # never a silent skip (Rule 4 — the emit_shape_for docstring's
            # promise, made real here per the D277 QC). Unreachable today:
            # every sgs/* content-role row is seeded (139/139); the only NULL
            # rows are core/* blocks, unseeded BY DESIGN (no block source in
            # this repo) and unreachable via slots.standalone_block. This
            # guard fires only if a future block ships with an unseeded row.
            results.append(ContentGap(
                where=f"{rec.slug}.{attr_name}",
                detail=(f"content-role attr matched element '{element}' but "
                        f"emit_shape is unseeded (role={role}) — run "
                        f"/sgs-update to seed; unit NOT lifted"),
            ))
            continue
        if emit_shape != "nested" or attr_name in lifted_attrs:
            continue  # 'child' units route below; first value per attr wins
        value, alt_value = _typed_value_for_role(el, role, attr_type, media_map)
        if value is None or value == "":
            continue  # strict no-op (B1 contract) — A2 ledger owns completeness
        results.append(ScalarLift(attr=attr_name, value=value))
        lifted_attrs.add(attr_name)
        consumed_ids.add(id(el))
        # CG-8: lift the collapsed dict's alt text onto this image attr's DB-
        # declared companion (block_attributes.role='image-alt' +
        # alt_companion_attr=attr_name) — never a hardcoded attr name (R-31-1).
        # Strict no-op: no companion declared, or the draft carried no alt.
        if alt_value:
            alt_attr = db_lookup.image_alt_companion_for(rec.slug, attr_name)
            if alt_attr and alt_attr not in lifted_attrs:
                results.append(ScalarLift(attr=alt_attr, value=alt_value))
                lifted_attrs.add(alt_attr)

    # ---- CHILD leg — $content-region blocks route unconsumed children (B3) ----
    if rec.delegates_content == 1:
        results.extend(ext.run_mechanism_b(
            rec, node, css_rules=css_rules, media_map=media_map,
            exclude_ids=frozenset(consumed_ids),
        ))

    # ---- LEAF fallback — element-self lift (icon-bearing gating retained) ----
    # EXACT retired-arm predicate: hi==0 ∧ no scalar-lift ∧ NO ARRAY-LIFT ∧
    # (primary | icon). The no-array clause matters: an array block (trust-bar)
    # emits its content via the SEPARATE array handler — the walk's own empty
    # result must NOT trigger a whole-node primary-text lift (which would
    # swallow every badge label into `title`, the Step-6 repro).
    from converter.context import ChildBlock
    if not any(isinstance(r, (ScalarLift, ChildBlock)) for r in results):
        attrs = db_lookup.block_attrs(rec.slug)
        icon_bearing = any(
            isinstance(i, dict) and isinstance(i.get("role"), str)
            and i["role"].startswith("icon-")
            for i in attrs.values()
        )
        if (rec.delegates_content == 0
                and "scalar-content-lift" not in caps
                and "array-content-lift" not in caps
                and (db_lookup.primary_content_attr(rec.slug) is not None or icon_bearing)):
            results.extend(ext.run_mechanism_leaf(rec, node, media_map))

    return results


def _run_universal_walk(rec, node, media_map, css_rules) -> list:
    return run_universal_content_walk(rec, node, media_map, css_rules)


@dataclass(frozen=True)
class Handler:
    """One registry entry: an explicit priority + a signature predicate + the
    mechanism it runs. ADDITIVE — every matching handler fires (FR-31-2.8.3)."""
    name: str
    priority: int
    matches: Callable[[NodeSignature], bool]
    run: Callable[..., list]


# The TOTAL registry. Predicates key on STRUCTURAL signature fields only —
# a slug-keyed entry here is an R-31-9 carve-out the no_slug_literal gate
# (scanning this file) rejects. Priorities are EXPLICIT (CSS-cascade style):
# results concatenate in priority order, reproducing the retired if-chain's
# result order exactly (Case-1: scalar+gaps, styling, array; Case-2: child
# blocks, array).
CONTENT_HANDLERS: list[Handler] = [
    # FR-31-2.7: the arbitrary holder recurse-descends its children (FR-31-4).
    Handler("container_default", 10,
            lambda s: s.classify == "holder",
            _run_container_default),
    # FR-31-2.6 (EXECUTION Step 6): the universal per-attr emit_shape walk —
    # fires for EVERY typed composite; the nested/child fork is per-attr
    # (emit_shape), the $content child leg + leaf fallback live inside it.
    # This REPLACES the block-level child_blocks / scalar_content /
    # named_leaf / content_gap_floor case entries (the retired delegates_content +
    # capability dispatch; the floor is now walk_content's conservation floor).
    Handler("universal_walk", 20,
            lambda s: s.classify == "composite",
            _run_universal_walk),
    # CSS-on-content styling lift (§3.B2) — SELF-GATED on the
    # scalar-styling-lift capability inside lift_styling_content, so the
    # registry predicate no longer carries the block-level capability gate.
    Handler("styling_content", 31,
            lambda s: s.classify == "composite",
            _run_styling_content),
    # Array/repeater lift (§3.B4) — composes with EITHER shape (D248: Case-1
    # scalar+array AND Case-2 child-blocks+array both hold).
    Handler("array_content", 40,
            lambda s: s.array_lift,
            _run_array_content),
]


def handlers_for(sig: NodeSignature) -> list[Handler]:
    """Every matching handler, in explicit priority order (ADDITIVE)."""
    return sorted(
        (h for h in CONTENT_HANDLERS if h.matches(sig)),
        key=lambda h: h.priority,
    )


# ---------------------------------------------------------------------------
# The walker entry
# ---------------------------------------------------------------------------

def walk_content(
    rec: Recognition,
    node: Any,
    media_map: dict | None = None,
    css_rules: dict | None = None,
) -> list:
    """The ONE content-dispatch entry (FR-31-2.8.1).

    Pre-registry gates (loud, never signatures) → compute the signature ONCE
    → ADDITIVE handler emission in priority order. Behaviour-identical to the
    retired extract_content if-chain (proven by the untouched full suite).
    """
    from converter.context import ContentConservationError, ContentGap

    # MF5 pre-registry gate: delegates_content is None ONLY for an
    # unrecognised/corrupt Recognition — loud ContentGap, never a dispatch.
    if rec.delegates_content is None:
        return [ContentGap(
            rec.slug or "<unrecognised>",
            "extract_content reached with delegates_content=None — recognition is"
            " unrecognised/corrupt; route via unrecognised_gap upstream",
        )]

    # D212 VALIDITY CONSTRAINT (raise, never a registry entry / bare assert —
    # STOP-27): a scalar-content-lift block must NEVER carry child InnerBlocks
    # dispatch — the child emission would be ignored by the typed render.
    caps = db_lookup.capabilities_for(rec.slug)
    if rec.delegates_content == 1 and "scalar-content-lift" in caps:
        raise ContentConservationError(
            "scalar-content-lift block routed to Mechanism B — D212 regression guard"
        )

    sig = signature_for(rec)
    matched = handlers_for(sig)
    if not matched:
        # Registry totality bug — the coverage test proves this unreachable;
        # if it ever fires, fail LOUD (Rule 4), never an empty return.
        raise ContentConservationError(
            f"no CONTENT_HANDLERS entry matched signature {sig} — the registry "
            f"lost totality (coverage test should have caught this)"
        )

    results: list = []
    for h in matched:
        results.extend(h.run(rec, node, media_map, css_rules))

    # CONSERVATION FLOOR (Step 6, Rule 4 / R-31-9): the universal walk has no
    # capability gate, so a childless no-content leaf (e.g. a divider) walks
    # its (empty) child list and legitimately produces zero results. When
    # EVERY arm (walk / array / styling) produced nothing, emit ONE
    # explanatory ContentGap instead of [] — preserving the "extract_content
    # never returns empty" invariant universally without reintroducing a
    # per-capability branch.
    if not results:
        results.append(ContentGap(
            rec.slug,
            "no content arm produced a result — the node carried no extractable"
            " content units for this block (no nested-attr match, no $content"
            " children, no array schema, no primary/icon leaf content); tracked,"
            " never a silent empty",
        ))
    return results
