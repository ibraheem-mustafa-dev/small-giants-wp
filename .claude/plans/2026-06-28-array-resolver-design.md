---
doc_type: design
project: small-giants-wp
thread: cloning-pipeline / content-UNIFY (D246)
stage: Array resolver (Spec 31 §3.B4 / Spec 22 FR-22-2.5)
generated: 2026-06-28
status: DRAFT — design fork open, awaiting Bean decision then design-gate council + sign-off
decision_ref: D248/D249 (TBA at build commit)
---

# Array / Repeater Resolver — Design (Spec 31 §3.B4 + Spec 22 FR-22-2.5)

**Bean instruction (2026-06-28):** don't chop arrays out — rebuild with the correct,
rule-compliant functionality. First check the specs; the correct behaviour is specified, so
build to spec (not from scratch). Must follow all Spec 31 rules, match no known cheat, overlap
with no existing functionality.

## 1. Finding — the correct behaviour IS specified

- **Spec 31 §3.B4:** "Array/repeater (`attr_type=array`) — sibling-class DOM traversal of the
  array container; emit one child block per item; per-item attrs lift via B1's role-aware mechanism."
- **Spec 22 FR-22-2.5** (the detail, DB-driven, name-free):
  1. array attr `canonical_slot` populated → item's content type (e.g. `packSizes` → `button`).
  2/3. resolve `canonical_slot` → `standalone_block` (Tier A).
  4. `canonical_slot` NULL → resolve via each item's BEM signature → `slots` aliases →
     `standalone_block` (Tier B).
- **Helper already built (DB-driven, no slug literals):** `db_lookup.array_item_slot_for(slug,
  attr)` (db_lookup.py:2906) — Tier A returns the slot; Tier B returns None for the BEM fallback;
  config arrays (role=layout: allowedTypes/elementOrder/headingLevels) return None and are skipped.
- **Status:** PARTIAL — helper exists, the per-item emit loop was never wired. `ARRAY_LIFT_PATTERNS`
  is already GONE from convert.py (grep: 0 hits). **The new engine has ZERO array handling** —
  greenfield, no overlap. The `_atomic_attrs_for` slug literals are the *atomic-tag* content path
  (h1/img), NOT arrays — frozen/baselined, out of scope.

## 2. The trigger set (DB-confirmed array-typed sgs/* content attrs)

Tier A (canonical_slot populated): `cta-section.buttons`→button, `cta-section.stats`→number,
`icon-list.items`→items, `card-grid.items`→items, `process-steps.steps`→step,
`pricing-table.plans`→card, `brand-strip.logos`→logo, `hero.badges`→items, `quote.body`→text,
`social-icons.icons`→icon, form-field `options`. Tier B (NULL canonical_slot, content role):
`product-card.packSizes`. Config (role=layout) → skipped.

## 3. THE DESIGN FORK (Bean decision needed — determines scope + what the council reviews)

FR-22-2.5 says "emit one child block per item." But for a cloned block to RENDER those items,
the target block must READ them. Two ways:

### Option A — Converter populates the array ATTR (lift items into the array value)
The resolver finds the item elements, lifts each item's content (via B1) into a dict, and writes
the whole list to the block's existing array attr (e.g. `packSizes=[{...},{...}]`). The block
renders from its existing array attr — **no block migration, no deprecated.js, no render.php
change.** Self-contained converter work only.
- **Pro:** small, low-blast, ships fast, no per-block migration, no save-shape change.
- **Con:** strictly this is "array-attr lift", not the literal "emit child block per item" wording;
  the items aren't independently editable as blocks in the editor.

### Option B — Converter emits child InnerBlocks per item (the literal FR-22-2.5 wording)
Each item becomes a real child block (`sgs/button` etc.). **Requires migrating each target block
from array-attr → InnerBlocks for that area** (has_inner_blocks is currently 0 for these areas per
FR-22-2.5's status note) — render.php + save.js + a `deprecated.js` shim PER target block.
- **Pro:** items are first-class editable blocks; matches the literal spec wording + the B3/B4
  "child block" framing; unifies with the walker (B3).
- **Con:** large — a per-block InnerBlocks migration for ~8 blocks (cta-section/icon-list/card-grid/
  process-steps/pricing-table/brand-strip/hero/social-icons/product-card), each with deprecated.js
  + a live round-trip test. High blast radius. Many of these blocks ALREADY ship their items as
  InnerBlocks today via other paths — needs per-block verification of current save shape first.

**Recommendation:** **Option A** for THIS build — it is the rule-compliant, no-cheat, no-overlap,
self-contained resolver Bean asked for, ships now before W3, and carries zero per-block migration
risk. Option B (full InnerBlocks migration) is a larger programme that belongs with the W3 walker
(B3/B4 share the child-emit machinery) — fold it into the post-W3 roadmap, not this pass.
*(Caveat to verify per block: if a target block ALREADY reads InnerBlocks for its items today, then
for that block Option A's "write the array attr" would be the wrong target — confirm each block's
current render contract before lifting. This per-block contract check is a build-time gate.)*

## 4. Resolver shape (DB-driven, name-free — both options share this front half)

`lift_array_content(node, slug) -> dict` (new resolver, e.g. converter/resolvers/array_content.py):
- capability/skip gate: for each `attr_type='array'` attr in `block_attrs(slug)`, skip when
  role=='layout' (config arrays) — DB-driven, no name list.
- locate item elements via the attr's `derived_selector` (sibling-class traversal); count them.
- resolve item block: `slot = array_item_slot_for(slug, attr)`; Tier A → `standalone_block_for(slot)`;
  Tier B (None) → per-item BEM → `bem_element_to_canonical_slot` → `standalone_block_for`.
- per-item attrs: reuse the ported B1 `lift_scalar_content` on each item subtree (role-aware).
- Option A: assemble `attrs[arrayAttr] = [item_dict, ...]`. Option B: `emit_block_markup` per item.
- conservation: items_seen == emitted + gaps (raise ContentConservationError on mismatch — STOP-27,
  never assert). An item that resolves to no slot → loud ContentGap, never silent.

## 5. Rules compliance

- R-22-1 (no hardcoded dicts/slug literals): all routing via `array_item_slot_for` /
  `standalone_block_for` / `block_attrs` / `slots`. No `ARRAY_LIFT_PATTERNS`, no `if slug==`.
- R-22-9 (universal): one resolver, triggered by `attr_type=array`, fires for every qualifying block.
- No cheat overlap: greenfield in the new engine; reuses B1 (already shipped), not a new content engine.
- STOP-27: conservation guard `raise`s, never `assert`. Rule 4: zero silent drops (loud gaps).

## 6.5 DESIGN-GATE COUNCIL RESULT (2026-06-28, 3 raters, fact-checked) — NO-GO AS SPECIFIED

3 cross-perspective raters (spec-faithfulness / correctness red-team / rules-cheat). Verdict:
**Option A is the RIGHT approach (rule-compliant, no overlap, no cheats), but the §4 resolver
shape has 4 real holes — 2 FATAL — that MUST be fixed before any build.** All fact-checked by
the orchestrator against the live DB + render.php (STOP-15). Must-fix register:

| # | Sev | Finding (fact-checked) | Fix |
|---|-----|------------------------|-----|
| **MF-1** | **FATAL** | **Per-attr render-contract trap.** `cta-section.buttons` → render.php reads `$attributes['buttons']` **0 times** (CONFIRMED via grep — it's a legacy attr; buttons render via InnerBlocks/`$content` after FR-22-6). Writing the array attr is a silent NO-OP. `cta-section.stats` on the SAME block reads fine (1×) — so a per-BLOCK `has_inner_blocks` gate CANNOT distinguish them. | The scope gate MUST be **per-ATTR**: only lift an array attr when render.php actually reads `$attributes[attr]`. Enumerate the real in-scope set this way (drop `cta-section.buttons`; keep `stats`/`icon-list.items`/`card-grid.items`/`hero.badges`/`brand-strip.logos` — all confirmed read 1×). |
| **MF-2** | **FATAL** | **Selector shape mismatch.** 3 `derived_selector`s name a CONTAINER not the item: DB has `.sgs-card-grid__items`/`.sgs-icon-list__items`/`.sgs-hero__items`, but render emits `sgs-card-grid__item`/`sgs-icon-list__item` (singular, CONFIRMED). `find_all(container_class)` returns 0/1, not N items. | DB-correct the 3 rows to item-level selectors via the `ATTR_CLASSIFICATION_OVERRIDES` channel + dated migration + reseed (STOP-24) — a DATA fix, not resolver code. |
| **MF-3** | HIGH | **Per-item B1 reuse is broken.** `lift_scalar_content(item_node, item_slug)` is capability-gated on `scalar-content-lift`; item slugs (`sgs/button`/`label`/`icon`/`card`…) **do NOT have it** (CONFIRMED — DB query returned zero). It returns `{}` → every item's content silently dropped. | Build a capability-BYPASSED per-item extractor (read the item element's own attrs' `derived_selector`s relative to the item node), OR add `scalar-content-lift` to item blocks (DB migration + verify per-item selectors). Pick + specify before build. |
| **MF-4** | HIGH | **packSizes Tier B unbuildable + DB/docstring contradiction.** `product-card.packSizes` has `canonical_slot=NULL` AND `derived_selector=NULL` → resolver cannot locate items. Yet `db_lookup.py:2927` docstring claims `array_item_slot_for('sgs/product-card','packSizes')→'button'` — contradicts the live DB (NULL). Latent STOP-23 trap. | Reconcile: if `button` is correct, migrate `canonical_slot='button'` + populate `derived_selector`; else fix the docstring + DEFER packSizes to Option B. |
| MF-5 | MED | **Trigger too loose.** "attr_type=array minus role=layout" lets role=`None` config/ID arrays (`productIds`/`handpickedIds`/`visibleAxes`/`allowedTypes`…) slip through (CONFIRMED — many array attrs have role=None, not 'layout'). | Add an explicit **opt-in `array-content-lift` capability** (block.json `supports.sgs.arrayContentLift`), seeded ONLY for the genuine content-array roster — the proven B1/B2 opt-in pattern. |
| MF-6 | MED | Needs an explicit 4th arm in `extract_content`'s dispatch (else array-only blocks fall to the Case-3 ContentGap). | Add the array arm before the Case-3 fallback. |
| MF-7 | LOW | Conservation: config-skip must happen BEFORE `items_seen` increments; Tier-B miss = loud ContentGap (counted), never silent `continue`. | Structure the loop per STOP-27/Rule 4. |
| MF-8 | DOC | Update Spec 22 FR-22-2.5 `built_status` to "Option A interim; Option B child-emit deferred to W3"; add a DEFERRED parking entry for Option B. | At build commit. |

**Net:** the build is NOT "one resolver file" — it needs DB migrations (selectors + packSizes), a new
opt-in capability + seed, a capability-bypassed per-item extractor, a per-attr render-contract gate,
then the resolver + dispatch arm + LANDED. A material pre-build revision (STOP-19 territory).

## 6.6 Revised design (post-council — the corrected approach to build)
1. **Enumerate the real scope** by per-attr render-contract grep: keep only array attrs render.php
   reads (`cta-section.stats`, `icon-list.items`, `card-grid.items`, `hero.badges`,
   `brand-strip.logos`, + any others confirmed read). Drop render-no-op attrs (`cta-section.buttons`).
2. **DB migrations (override channel + reseed, STOP-24):** fix the 3 Shape-B selectors to item-level;
   resolve packSizes (`canonical_slot`+`derived_selector` or defer); add `array-content-lift`
   capability seeded to the in-scope roster.
3. **Per-item extractor** (capability-bypassed), not B1-as-is.
4. **Resolver** `converter/resolvers/array_content.py` gated by `array-content-lift`; Tier A via
   `array_item_slot_for`→`standalone_block_for`; loud gaps; conservation `raise`.
5. **Dispatch arm** in `extract_content`; **gates + STOP-23 council on built code + LANDED**.

## 6. Gates
- no-slug-literal + import-ban gates green.
- Tests from canonical cwd (STOP-16); failure-path proven.
- Pre-commit `/qc-council` on the BUILT resolver (STOP-23).
- LANDED (STOP-21) on a draft section that exercises an array (e.g. cta-section buttons or
  icon-list items) — live computed-style/innerText, draft-vs-clone.
- Option B only: deprecated.js per migrated block + live round-trip (no "unexpected content").
