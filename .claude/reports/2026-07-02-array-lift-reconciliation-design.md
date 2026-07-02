# Design brief for adversarial-council — Universal grid-driven / slot-driven array-content lift

**Author:** cloning-pipeline engineer. **Date:** 2026-07-02. **Status:** ⛔ SUPERSEDED — the 6-persona council returned NO-GO on the slot-driven-as-primary approach (see `2026-07-02-array-lift-council-synthesis.md`), and Bean redirected to a DB-based array mechanism (the existing FR-31-2.5 `array_item_slot_for`, verified unwired). The D4(c) `circle` alias below was WRONG (mistook the `icon-circle` style/shape for an element; the draft uses `__icon` which already resolves) and is retracted. Retained only as a record of the rejected approach.

## END-GOAL (what success looks like)

Any SGS-BEM draft's **uniform grid section** — the trust-bar's 4 badges, the ingredients' info-boxes, the featured-product cards, a card-grid's cards — clones **faithfully** onto the real homepage (sandybrown page 8) via **ONE universal mechanism**: grid detection (L3) + canonical-slot/alias field resolution, with **zero hardcoded selectors**, **zero client copy baked into any block**, and **Spec 31 internally consistent**. LANDED = live computed-style/innerText vs the draft + Bean's eye (R-31-11/13).

## THE PROBLEM (proven this session, file:line + DB)

1. **The array-content-lift resolver is hardcode-prone.** `converter/resolvers/array_content.py` (`lift_array_content`, ~:157-262) is 100% driven by per-block `array_item_fields` rows seeded from `block.json supports.sgs.arrayItemSchema` — explicit BEM class-string selectors. It never consults the `slots`/`aliases` vocabulary. If a draft class ≠ the declared selector, the field is silently missed. Declaring a block's item selectors this way **bakes one draft's markup into the block** (the exact hardcode we are eliminating).
2. **Spec 31 contradicts itself on trust-bar (and the whole "Scalar" class).** §2.7 (canonical worked examples) says trust-bar's `__inner` folds (carries the grid) and its **"4 `__badge` items → grid items → InnerBlocks."** §2.9 Axis-3 classifies **trust-bar as "Scalar" (has_inner_blocks=0 → typed scalar attrs)** — the opposite. §2.8 says §2.7 is canonical and §2.9/§13 "must not contradict it." So the spec is inconsistent; the build followed the subordinate (§2.9) model.
3. **DB/block reality = the scalar model.** `block_composition`: `sgs/trust-bar` `has_inner_blocks=0`, `container_kind=section`, `wraps_block=sgs/container`. render.php is a `foreach($items)` repeater (no InnerBlocks). `block_attributes`: one `items` row (`attr_type=array`, `role=content`, `derived_selector=.sgs-trust-bar__items`). So trust-bar is a scalar `items[]` block, not InnerBlocks.
4. **A framework-neutrality violation masked the failure.** `trust-bar` block.json's `items` **attribute default** is literal Mama's Munches copy (*Handmade in Birmingham / Registered Food Business / Free UK Delivery Over £35 / Loved by Breastfeeding Mums*). Every fresh trust-bar on ANY client renders this. It is ALSO why the clone *looked* like "4 correct columns" — the converter lifted nothing; the block rendered its Mama's default (which coincidentally matches the Mama's draft). The phantom all-caps first row came from the failed scalar path falling to the named-leaf arm, which read the whole section text into `title`.

## THE PROPOSED DESIGN (reconciles §2.7 and §2.9; Bean-directed)

**Core idea (Bean):** the `items[]` array is just the **destination shape for UNIFORM grid items**, processed as an L3 step. §2.5 already collapses uniform grid-item *CSS* into the container (`gridItem*` defaults); extend the SAME "uniform → collapse" rule to *content*: when a grid's items are all the same shape (icon + text), their content collapses into one `items[]` array (one entry per item) instead of N separate InnerBlocks. Item detection and field extraction stay universal; only the destination differs by child-shape.

**D1 — Spec reconciliation (§2.9 Axis-3 amended to match §2.7).** A Scalar-child-shape container with an `attr_type=array` content attr is not a *contradiction* of the grid model — it is the grid model with a **collapse-to-array destination**. The child-shape fork (§13.3 / Axis-3) chooses ONLY the destination: `has_inner_blocks=1` → N InnerBlocks; `has_inner_blocks=0` + array attr → one `items[]` array; `has_inner_blocks=0` + scalar attrs → scalar lift. Recognition + grid detection + per-item field extraction are identical across all three.

**D2 — Item detection is grid-driven (universal, not a hardcoded itemSelector).** The grid element is the level carrying `display:grid`/`display:flex` (the folded `__inner` for trust-bar, per §2.4). Its **direct children** are the grid items. No per-block `itemSelector` string.

**D3 — Field extraction is slot/alias-driven (universal, not hardcoded field selectors).** For each grid item, for each field-name in the block's `items` schema (the field names already declared in `block.json attributes.items.properties` — e.g. `icon`, `label`, `url`, `media`), find the item's child element whose BEM element token resolves — via the EXISTING `db_lookup.canonical_slot_for(token)` / `recognise_helpers.bem_element_to_canonical_slot(node)` — to the **same canonical slot** as the field-name, then extract with the slot's default role through the shared `field_extractors.extract_field_value(el, role, media_map)`. This reuses the Stage-2 recognition machinery unchanged. `.sgs-trust-bar__text`→text slot→text-content; `.sgs-trust-bar__icon`→icon slot→icon-slug — verified against the live DB, zero per-block config.

**D4 — the only NEW universal data artefacts (none per-block hardcoded):**
- (a) Seed each array block's `items.properties` field-names into the DB (source = block.json, via sgs-update-v2.py) so the resolver reads the field list from the DB, not block.json at runtime.
- (b) A ~6-entry **slot → default-extraction-role** map (text/heading/label→text-content, icon→icon-slug, media/image→image-object, link→url-href, badge→text-content) — universal, derived/seeded once.
- (c) Add `circle` as an alias of the `icon` slot (render.php emits `__circle` as the icon wrapper). `iconSvg`/`pending` stay correctly gap-pending (render-companion fields with no draft element — same treatment as hero's existing gap-pending fields).

**D5 — Framework cleanup.** Replace `trust-bar`'s `items` attribute **default** with generic, framework-neutral placeholders (or empty). Genericise the `product-card` `example` preview. Audit the other "Scalar"-class blocks (testimonial, team-member, option-picker) for the same client-copy-in-default pollution.

## MANDATORY GROUND-TRUTH FOR EVERY REVIEWER (do NOT guess)

- **Read Spec 31 IN FULL** — especially §2.0–2.9 (the core mechanism, layers, fold/recurse, worked examples, the four axes), §13.3 (content fork FR-31-2 family), §12 (build state / stage map). Quote section numbers.
- **Query the DB tables** (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."`): `block_composition` (has_inner_blocks/container_kind/wraps_block), `block_attributes` (the `items` array attr + roles + derived_selector), `slots` (+`aliases` column, scope='element'), `array_item_fields`, `block_capabilities`, `roles`. Verify every claim against a real row.
- **Read the code** (file:line): `converter/resolvers/array_content.py`, `converter/services/field_extractors.py`, `converter/recognition.py`, `converter/services/recognise_helpers.py`, `orchestrator/converter_v2/db_lookup.py` (canonical_slot_for/standalone_block_for/block_for_slot_token), `converter/services/extraction.py` (the extract_content dispatch ~:965-1075).

## CONSTRAINTS ON THE REVIEW (reject findings that violate these)

- **"Deprecation / migration ceremony" is NOT a valid blocker.** The SGS theme is NOT live anywhere (Bean-confirmed, repeatedly). Block-shape changes need NO `deprecated.js`, NO existing-post migration. Any finding whose severity rests on "existing posts will break / needs a deprecation" is OUT OF SCOPE — do not raise it.
- **No generic hand-waving.** Every finding must cite a Spec 31 section, a DB row, or a file:line. "This might not generalise" without a named counter-example is not a finding.
- **Universality is the bar (R-31-9), both directions:** flag both under-generalisation (a per-block carve-out) AND over-generalisation (firing where it shouldn't).
- The reconciliation must not re-introduce a hardcoded per-block selector or dict (R-31-1), nor client copy in a base block.

## WHAT TO STRESS-TEST (find what breaks)

1. Does the "uniform grid items → array" collapse hold for ALL current array blocks (trust-bar, card-grid, icon-list, hero badges, pricing-table, process-steps, brand-strip, social-icons, cta-section, quote), per their real DB shapes + any real draft/fixture? Where does it break (non-uniform items, multiple fields → same slot, missing field, nested items)?
2. Is the field-name → canonical-slot match unambiguous for every block's `items.properties`? Name every collision (two fields → one slot) and every field-name with no canonical slot.
3. Does grid-driven item detection work when the grid sits on a folded `__inner` vs the root vs a nested own-container (§2.4)? Where does "direct children of the grid element" pick the wrong nodes?
4. Is the slot→role default map complete + correct for every field role the current blocks need? What's missing?
5. Does D1 (child-shape chooses destination) correctly route InnerBlocks vs array vs scalar for every block in `block_composition`, or are there blocks it mis-routes?
6. Any regression risk to the ~8 blocks already using `array_item_fields`/`arrayContentLift` if we switch them from explicit selectors to slot-driven resolution?
