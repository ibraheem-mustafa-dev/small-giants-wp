# Phase 1 design — universal recursion completeness (K1 nested-container fold + K2 bare-tag atomic-swap)

**Status:** DESIGN-GATE candidate (Rule 7 / STOP-19). Root cause PROVEN; fix shape below is a HYPOTHESIS for adversarial-council + Bean approval BEFORE code. No code yet.

## Spec-31 conformance justification (Bean gate — every change fixes a proven script↔spec deviation)
Both fixes are the pipeline script being INCONSISTENT with Spec 31, with the deviation visible in the code:
- **K2 deviation:** Spec 31 §13.2 **FR-31-3 exception 1** + Appendix A walker (`if not sgs_classes and node.name in atomic_tag_map(): -> emit atomic block`) + Appendix B require a bare (non-sgs) content tag to atomic-swap to its block. `_descend_container_children` implements this ONLY for sgs-classed leaves (gate L330 `if csgs and …`); a bare tag falls to the ContentGap branch → dropped. **Script contradicts FR-31-3 exception 1.**
- **K1 deviation:** Spec 31 §13.2 **FR-31-4.1** requires a direct-descendant slug-None *layout* wrapper to fold its grid/flex CSS into a container (own or parent). `_descend_container_children` **explicitly defers this** — its own docstring (L297-298) says "Interior wrapper LAYOUT CSS-fold … is OUT OF SCOPE here (Step-7 conductor owns it, scope A)" and it unwraps + drops the CSS. **Script deliberately deviates from FR-31-4.1; this design closes that deferral.**

No change here is a preference or a copy of the old engine — each is making the script do what Spec 31 already specifies.

## The one universal function under change
`converter/services/extraction.py :: _descend_container_children` (L302-345) — the FR-31-4.1 recurse-descent for a default `sgs/container` section. It runs for EVERY slug-None container at any depth (top-level default sections + nested wrappers reached by recursion). The `run_mechanism_b` generic child path (L569-651) shares the same leaf-handling and must get the same K2 fix.

Current per-child branches:
1. `recognise(child)` resolves a block → emit ChildBlock (recurse content). ✓ keep
2. `csgs and node_is_text_leaf(child)` → `_emit_content_leaf` (atomic-swap via `atomic_tag_map`). **← only fires for sgs-classed leaves (K2 gap)**
3. slug-None wrapper WITH element children → **DESCEND / unwrap (flatten)**. **← drops layout wrappers (K1 gap)**
4. else → ContentGap.

## K2 — bare (non-sgs-classed) content leaves are dropped

**Proven:** branch 2's gate `if csgs and node_is_text_leaf(child)` excludes bare tags; a bare `<p>`/`<h4>`/`<a>` with text has no element children → branch 3's `child.find(True) is None` → falls to branch 4 → ContentGap → dropped. Live evidence: brand section shows only the sgs-classed `__headline`; the 4 bare `<p>` quote paragraphs are absent.

**The DB already has the mapping.** `blocks.replaces`: `sgs/text`↦`core/paragraph`, `sgs/heading`↦`core/heading`, `sgs/button`↦`core/button`, `sgs/media`↦`core/image`, `sgs/quote`↦`core/quote`. `_emit_content_leaf` already resolves rung (a) via `db_lookup.atomic_tag_map()` (L245) which per Spec 31 Appendix B is the `blocks.replaces` reverse-walk (Tier 1) → sgs equivalent, then `html_tag_to_core_block` (Tier 2). So `_emit_content_leaf` on a bare `<p>` already yields `sgs/text` — it is simply never CALLED for bare tags.

**Fix shape:** widen branch 2 to also route a **bare content leaf** (a node with NO sgs-classes whose tag resolves via `atomic_tag_map` to a text-capable/media block AND that has no block-recognisable element children) through `_emit_content_leaf`. Non-sgs *layout* wrappers (with element children) still descend (FR-31-11 pass-through) — only content leaves swap. `_emit_content_leaf`'s existing empty-guard (L242: no text AND no img → gap, not empty block) is preserved.

**Emoji → sgs/icon (open sub-question for the council):** `<div class="sgs-info-box__icon">🌾</div>` is sgs-classed → already routes to branch 2 → rung (b) `block_for_slot_token('icon')` → `sgs/icon`. But the payload is an emoji glyph, not an icon slug. The `sgs/icon` block has an emoji-picker mode. Needs the field-extractor to store the emoji into the icon block's emoji attr (role handling), possibly a small DB/role addition. FLAG: is this in Phase 1 (K2) or deferred to the info-box element-rebuild (Phase 3, where info-box gets `mediaType=emoji`/`mediaEmoji` scalar attrs)? Recommend: Phase 1 handles the generic bare-tag text/media swap; emoji-in-icon rides with the info-box rebuild (Phase 3) since element-based info-box stores the emoji as its own scalar attr.

## K1 — nested layout wrappers are unwrapped, their grid/flex CSS dropped

**Proven:** branch 3 flattens a slug-None wrapper's children into the parent and drops the wrapper. Deferred deliberately (docstring L297-298: "Interior wrapper LAYOUT CSS-fold ... OUT OF SCOPE here, Step-7"). Live/draft evidence: `.sgs-gift-section__cards {display:grid; grid-template-columns:1fr→1fr 1fr}` (draft 558/603) and `.sgs-social-proof__trustpilot-bar {display:flex; background/border/radius/padding}` (draft 626) — real layout wrappers, flattened → children lose grid/flex + box.

**Fix shape:** before branch 3's unwrap, test the wrapper's own CSS (resolve its BEM selector in `css_rules`): if it carries `display:grid`/`display:flex` OR box CSS (background/border/border-radius/padding/min-height/box-shadow), treat it as a **nested `sgs/container`** — recognise it as the container default (the same `recognise_section`→`run_container_default`/`build_block_markup` machinery used at top level, now applied at depth) so it emits an `sgs/container` ChildBlock whose CSS is lifted by the existing CSS-branch resolvers (outer_box/grid) and whose children recurse as its InnerBlocks/grid items. A transparent wrapper (no layout/box CSS) keeps the current unwrap.

**FR-31-4.1 precedence nuance the council MUST probe — fold-into-parent vs own-container.** The spec (§13.2:436) says a *direct-descendant* slug-None grid/flex wrapper FOLDS its CSS into the parent container (parent absorbs the grid, items become grid items). BUT that is only safe when the wrapper is the section's SOLE structuring child. The gift section = `[heading, __cards[cards]]`: folding `__cards`'s grid onto the section container would make the heading a grid item too (WRONG). So the safe universal rule = a layout wrapper becomes its OWN nested `sgs/container` (preserving sibling structure); fold-into-parent is a narrow optimisation ONLY when the wrapper is the container's sole element child. Council to confirm this is correct and universal, and that "own nested container" cannot regress the top-level default sections (which have no such wrapper) or the composite sections (recognised before this branch).

## What Phase 1 fixes (acceptance)
Gift cards render in their 2-col grid; social-proof trustpilot bar renders as a flex box with its border/radius/padding; brand quote paragraphs + attribution present; ingredient card text present; images inside these recovered containers render from WP URLs (via the already-working `resolve_media_url`). All LANDED on page 8, draft-vs-clone + Bean eye. No block changes, no per-block branches.

## Risks for the council to attack
1. **K1 layout-detection false positives** — a wrapper with only a stray `padding` shouldn't necessarily become a container. What CSS signature set correctly separates "layout wrapper" from "transparent wrapper"? (grid/flex is unambiguous; box-only is the grey zone.)
2. **K1 recursion termination / double-container** — applying container-default at depth must terminate and must not double-wrap an already-`sgs/container`-recognised node.
3. **K2 over-swap** — a bare `<div>` or non-content bare tag must NOT become a content block; only atomic-tag-map text/media-capable leaves swap; layout wrappers still descend.
4. **Conservation guard interaction** — `run_container_default`'s empty-container `raise` (L364) must still hold; K1/K2 must not manufacture empty containers or double-count.
5. **Cheat-gate / R-31-9** — the fix stays DB-driven (atomic_tag_map, css signature), zero `if slug ==`, no `!important`, no mirror-emit.
6. **Metamorphic** — BEM-synonym rename + source-order permutation still produce equivalent output; no reliance on class-name literals.
