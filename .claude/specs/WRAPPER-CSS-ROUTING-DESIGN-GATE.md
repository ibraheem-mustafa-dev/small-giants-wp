---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Design-gate: wrapper CSS routing — canonical_slot vs name-free layer routing"
created: 2026-06-09
status: DONE 2026-06-09 (D194). DB tagging IMPLEMENTED + all spec/plan/doc impact-map edits APPLIED (uncommitted; /qc + /adversarial-council gated). seed-canonical-slots.py deleted (redundant — /sgs-update covers it).
supersedes_conception: "Commit 0a canonical_slot backfill as the cross-node routing key (STAGE1-DESIGN.md / STAGE0-FRS-AND-GATE.md FR-22-5.3 draft)"
inputs:
  - Bean design session 2026-06-09 (this thread)
  - 5 parallel file-scan agents (specs 02/06/29, pipeline-flow/stages, architecture, dev-setup, decisions, wave2 reports, the 3 plans, the python scripts + docs-registry)
  - live DB queries (sgs-framework.db via wp-blocks dump + direct sqlite)
---

# Design-gate: how draft wrapper CSS routes to container/block attributes

## Context — why this doc exists

The session opened on a hand-off task ("Commit 0a — canonical_slot backfill": tag ~41 `contentWidth`/`contentPadding*` rows with a `canonical_slot`, add a `content`/`inner` slot, prove a round-trip). Bean challenged the premise. Investigation against the live DB + the spec + the converter confirmed the challenge: **the backfill was solving the wrong problem with the wrong column.** This doc records what the column is actually for, the correct routing mechanism, and every place in the repo that must change to make the docs internally consistent again.

## The headline finding — two conflicting design lineages

| Lineage | Date | How draft wrapper CSS finds its destination attr | Matches our conclusion? |
|---|---|---|---|
| **Method-2 converter-lift plans** (`plans/archive/2026-06-04-method2-converter-lift-design.md` + `-PHASE-PLAN.md`) | 2026-06-04 | **Name-free.** Curated `property_suffixes` map (R-22-1, DB-driven), CSS-signature layer detection, ONE code site passing attrs into `emit_sgs_container_wrapping`. Explicitly rejects a hardcoded dict AND canonical_slot routing. | **YES** |
| **Wave-2 Stage docs** (`reports/wave2/STAGE1-DESIGN.md`, `STAGE0-FRS-AND-GATE.md` FR-22-5.3 draft, `SIGN-OFF-LEDGER.md`) | 2026-06-09 (council-ratified D193) | **canonical_slot-keyed.** A new `slot_has_equivalent_block()` predicate + "lift box CSS to the parent's per-slot attr group (match `canonical_slot` + property_suffixes)" → requires the 41-row Commit-0a backfill as a build gate. | **NO** |

The two were never reconciled. The newer (Wave-2) lineage reintroduced `canonical_slot` as a routing key. **Our session sides with Method-2.** This gate's job is to make that explicit and de-conflict the docs.

Direct precedent for the name-free side: **D85** (`seed-slot-synonyms.py:117-123`) already *removed* `inner`/`content`/`body-row` from the slot aliases because they "were causing wrapper divs (`__inner`, `__content`, `__body-row`) to wrongly collapse into sgs/text." Name-matching fake wrappers is a known, fixed failure mode.

## What `canonical_slot` actually is (evidence-grounded)

`block_attributes.canonical_slot` is a **per-block, per-attr pointer into the `slots` vocabulary**, distinct from the `slots` table itself (which is the global `slot_name → standalone_block` map). Its ONE behavioural job (FR-22-2.1, `db_lookup.py:1995 equivalent_block_for`): decide whether an attr is **content** (emit a child InnerBlock) or **scalar** (lift a value). It is **gated by `role`** — the running code (`db_lookup.py:2034-2054`) only emits a child block when `role` is in the content-bearing allowlist.

Live data proving the convention (how same-type CSS is categorised today):

| Attr | canonical_slot | role | Meaning |
|---|---|---|---|
| `mediaPaddingTop` (hero) | `media` | layout | padding on the media **area** |
| `headlineMarginBottom` (hero) | `heading` | layout | margin on the heading **area** |
| `innerPadding` (product-card) | `inner` | layout | padding on the inner content-cap **area** |
| `paddingTop` (button/heading/quote) | NULL | NULL | the block's **own root** box |
| `gridItemPadding` (container) | NULL | NULL | container's own grid-item default |
| **`contentPaddingTop` (hero)** | **NULL** | **NULL** | the gap — content area, untagged |
| **`contentWidth` (28 blocks)** | **NULL** | **NULL** | the gap — content cap, untagged |

**Convention: a box/layout attr scoped to a sub-AREA carries `canonical_slot` = that area (always an area name: media/heading/text/inner…), `role='layout'`. NULL = the block's own root box.** `spacing` would be the only property-type value among area-names — it breaks the pattern.

## Decisions (proposed — gate these)

- **DEC-1 — `canonical_slot` is NOT the structural-CSS routing key.** `contentWidth`/`contentPadding*`/`mediaPadding*`/`gridItem*` route by **layer-prefix + `property_suffixes`**, name-free. (Aligns Method-2.)
- **DEC-2 — No fake-wrapper class name (`__inner`/`__content`/`__card-inner`) enters the `slots` table as an alias.** Fold is structural: slug-None direct descendant (FR-22-4.1) + CSS-signature layer detection. (Aligns D85.)
- **DEC-3 — The 3-layer model (FR-22-21) is the canonical mechanism.** Layer is detected by CSS signature + structural position, not by name:

  | Layer | Detected by | Container attr prefix | Example attrs |
  |---|---|---|---|
  | OUTER box | the section-root element itself (emitted as the container) | native `style.spacing.*`, background, border, `widthMode`/`customWidth` | `paddingTop`, `backgroundColor`, `customWidth` |
  | CONTENT-WIDTH (inner) | slug-None direct child whose CSS is `max-width` + `margin:auto` (± padding) | `content` | `contentWidth`, `contentPadding*` |
  | GRID / PER-ITEM | the level with `display:grid`/columns | `gridTemplateColumns`/`gap`/`gridItem` | `gridTemplateColumns`, `gap`, `gridItemPadding` |

- **DEC-4 — Tier A corrected.** Child-block vs scalar vs array = `canonical_slot` **+ `role` + `attr_type`** read together (the running code already gates on `role`; the spec's FR-22-2.1 omits this). `canonical_slot` alone is necessary-not-sufficient.
- **DEC-5 — Commit 0a (canonical_slot backfill) is removed as a build GATE.** The cross-node routing does not depend on it. Any tagging of the content* rows is **cosmetic metadata consistency only** (see open decision below), never a prerequisite for F1-cross-node.

## The one OPEN decision for Bean — naming the content-area label (if we tag at all)

Because `canonical_slot` is no longer the routing key (DEC-1), tagging the 41 content* rows is purely about matching the existing `media`/`inner` convention. Ranked menu:

1. **`content` + `role='layout'` (RECOMMENDED).** Semantically accurate (it IS the content area), matches the attr prefix (`content*`). Needs a bare `content` element-slot row (NO aliases → cannot cause the D85 collapse; a `canonical_slot` *value* is never matched against draft classes). Collision-safe.
2. **`inner` + `role='layout'`.** Re-uses the existing slot already used by `innerPadding`. No new row. But prefix mismatch (`content*` labelled `inner`) and you flagged it doesn't fit.
3. **Leave NULL (no backfill).** Simplest, zero drift risk. Accepts that content* is untagged while `media*`/`inner*` are tagged — a minor inconsistency in the other direction.
4. **`spacing`. NOT recommended** — property-type, breaks the area-name convention; would be the lone odd value.

`spacing` (your suggestion) is option 4 — I'd steer away from it for the convention reason. My pick is **option 1 (`content`)**.

### RESOLVED 2026-06-09 (D194) — option 1 chosen + implemented (DB-only, uncommitted)

Bean chose **`content` + `role='layout'`**. Implemented:
- Added a bare `content` element-slot (`scope='element'`, `aliases=[]`, `standalone_block=NULL`) via `seed-slot-synonyms.py` (`NEW_CANONICAL_ROWS`).
- The 41 `contentWidth`/`contentPadding*`/`contentMaxWidth*` rows are tagged `content`/`layout` in the one physical `sgs-framework.db` (`.claude` + `.agents` paths = same file via NTFS junction; uimax DB holds neither table).
- **`/sgs-update` is the deterministic mechanism — NO manual seed script.** `assign-canonical.py` (run by `/sgs-update` Stage 1) tags these rows `content`/`layout` once the `content` slot + `Width`/`Padding`→`layout` `property_suffixes` rows exist (all present). The throwaway `seed-canonical-slots.py` was **deleted as redundant** parallel infra (the DB values persist; `/sgs-update` maintains + extends them).
- **Accepted side effect:** `assign-canonical` then labelled 20 other same-stem rows `content` — 6 layout/enum (correct), 13 `text-content` (core/* off-roster + `sgs/heading content`). Inert because `content` has no `standalone_block` — the convention's dual-use pattern (mirrors how `media` labels both `mediaPadding*`/layout and media-URL/image-object).
- **GUARD (recorded):** `content` must never gain a `standalone_block` without re-auditing those 13 `text-content` rows — else they'd start emitting child blocks.
- **No 3-layer canonical split** (Bean): OUTER=NULL, CONTENT=`content`, GRID=existing `gap`/`column`/`gridItem*` — layers are converter-side routing, not DB values.
- **No draft `content-width` rename** (Bean clarified): the draft's direct-descendant inner-wrapper `max-width`+`margin:auto` IS the source mapped to `contentWidth` (FR-22-21 step 3); `max-width` stays, the mapping is documented not renamed.
- `assign-canonical.py` unchanged; preserves explicit values (live-verified). No pixel-diff gate (metadata-only).
- Files for review: `seed-slot-synonyms.py` (modified — added `content` to `NEW_CANONICAL_ROWS`), `sgs-framework.db` (not git-tracked). (`seed-canonical-slots.py` was created then deleted — redundant.)

## Comprehensive impact map (ADD / CHANGE / REMOVE / OBSOLETE)

> **STATUS 2026-06-13 (D222):** The name-free layer router is now FULLY IMPLEMENTED in `convert.py`. The last `verticalAlign` literal removed (commit `c5ecb4eb`); align now resolves purely via `db.attr_for_layer_property()` + `property_suffixes` rows (no attr-name literals in the align/grid path). The items below record the original change-list; most were applied at D194/D222. Wave-2 reports referenced here (STAGE1-DESIGN, STAGE0-FRS-AND-GATE, SIGN-OFF-LEDGER) are in `reports/wave2/` — treat as historical.

### Specs

| Doc | Lines | Action | What |
|---|---|---|---|
| `specs/22-…EXTRACTION.md` FR-22-2.1 | 128-148 | **CHANGE** | Tier A: state it's gated by `role` + read with `attr_type` (DEC-4), not "canonical_slot NOT NULL → InnerBlock" alone. |
| `specs/22` FR-22-21 | 639-669 | **ADD** | The layer→prefix table (DEC-3) + one line: fake-wrapper names are irrelevant; layer detected by CSS signature. |
| `specs/22` FR-22-3 note | ~227 | **CHANGE** | `inner` slot row: "consumption deferred" → "Tier-B draft-name consumption abandoned (D85/DEC-2); row persists only as a `canonical_slot` value." |
| `specs/02-SGS-BLOCKS.md` | 165, 181 | **CHANGE+ADD** | Clarify `__inner` is a fake wrapper that folds structurally; routing is name-free; `canonical_slot` is content-routing metadata, inert for layout. |
| `specs/29-CONTAINER-EQUIVALENT-BLOCKS.md` | 30, 52, +new §9 | **CHANGE+ADD** | Add "name-free layer detection" section; clarify the mockup inner wrapper folds by CSS signature; cross-ref `container_kind` gates panel exposure only, not routing. |
| `specs/06-BUILD-ORDER.md` | — | **NONE** | Roadmap only; correctly cites the standardisation plan. |
| `specs/02-SGS-BLOCKS-REFERENCE.md` | — | **NONE** | Auto-generated; no hand edits. |

### Pipeline / architecture docs

| Doc | Action | What |
|---|---|---|
| `cloning-pipeline-flow.md` (Cross-cutting principles, 123-131) | **NONE / minor** | Already cites FR-22-21 correctly. Optionally add the layer→prefix table cross-ref. |
| `cloning-pipeline-stages.md` Stage 3/4 (233-269) | **CHANGE** | Stage-3/4 DB annotation lists `block_attributes(canonical_slot, role, …)` as routing inputs — note `canonical_slot` is the CONTENT fork only; structural box CSS routes via `property_suffixes`. Add per-Bean: name the DB+table+columns where currently thin (Stage 0 theme.json source, Stage 10 API-only). |
| `architecture.md` (Decision 14/16) | **CHANGE (small)** | Note `canonical_slot` is content-fork metadata, not the layout router; cross-ref DEC-1/DEC-3. |
| `dev-setup.md` (579-587) | **CHANGE (small)** | `assign-canonical.py` note: clarify it writes `sgs-framework.db` only and does NOT touch the structural box attrs' routing. |
| `decisions.md` | **ADD** | Append **D194** = this design gate (DEC-1…DEC-5 + the naming choice once Bean picks). Latest is D193. |

### Wave-2 reports (the lineage that reintroduced the conflict)

| Doc | Lines | Action | What |
|---|---|---|---|
| `STAGE1-DESIGN.md` | 15, 26 (Commit 0a), 47-51 | **CHANGE / mark OBSOLETE** | Remove "decision key = canonical_slot" framing; mark Commit 0a OBSOLETE as a gate; the cross-node fork keeps `slot_has_equivalent_block` for the CONTENT decision only, destination via layer-prefix+property_suffixes. |
| `STAGE0-FRS-AND-GATE.md` FR-22-5.3 draft | 44-58 | **CHANGE** | Reframe: canonical_slot is metadata; the box-CSS destination is layer-prefix+property_suffixes (DEC-1/DEC-3). FR-22-19 retirement clause (61-71) unaffected. |
| `SIGN-OFF-LEDGER.md` | 91-92 | **CHANGE** | The "canonical_slot backfill — OPEN (pre-commit gate)" item → reclassify NOT-A-GATE; link this doc. |
| `STAGE1-HANDOFF-PROMPT.md` | 21-23 | **CHANGE (small)** | F1-cross-node dispatch keyed on `role`/`attr_type` + layer-prefix, not canonical_slot as the destination finder. |
| `CLONE-FIX-BUILD-PLAN.md` | 50-51 | **CHANGE (small)** | F1-consolidate/F1-cross-node note: destination routing is name-free (align Method-2); drop the Commit-0a dependency. |
| `CANONICAL-SLOT-BACKFILL-PROMPT.md` | whole | **OBSOLETE** | Mark superseded by this doc. |

### Plans

| Doc | Action | What |
|---|---|---|
| `plans/archive/2026-06-04-method2-converter-lift-design.md` | **NONE (already correct)** | This IS the name-free design; it's the reference. |
| `plans/archive/2026-06-04-method2-converter-lift-PHASE-PLAN.md` | **NONE (already correct)** | MF-A `property_suffixes` runtime map, MF-C one-site param-pass — matches DEC-1/DEC-3. |
| `plans/archive/2026-06-03-cloning-fidelity-triage-and-composite-remodel.md` | 31, 65 | **CHANGE (small)** | Replace "canonical_slot precision" language with "property_suffixes + layer detection"; the universal-lift lands on mirrored wrapper attrs name-free. |

### DB + Python scripts

| Target | Action | What |
|---|---|---|
| `block_attributes` (41 rows: `contentWidth` ×28, `sgs/hero.contentPadding*`) | **DEPENDS on the open decision** | If option 1: set `canonical_slot='content'`, `role='layout'` in BOTH DBs. If option 3: leave NULL. Either way, NOT a routing dependency. |
| `slots` table | **ADD (only if option 1)** | One bare `content` element-slot row (`standalone_block=NULL`, NO aliases) via `seed-slot-synonyms.py` pattern (writes both DBs). |
| `scripts/seed-canonical-slots.py` | **DELETED (redundant)** | `/sgs-update`'s `assign-canonical.py` tags these rows deterministically once the `content` slot + `property_suffixes` exist — no manual seed needed (Bean principle: no parallel infra). The values persist; `/sgs-update` maintains them (`WHERE canonical_slot IS NULL` + COALESCE preserve explicit values — `assign-canonical.py:485,555-559`). |
| `assign-canonical.py` | **NONE** | Already incremental-safe; do not change. |
| `converter_v2/` (F1-cross-node build) | **build later (separate gate)** | Implement layer-prefix + `property_suffixes` destination finder; NOT in this doc's scope. |

### Registry

| Target | Action | What |
|---|---|---|
| `.claude/docs-registry.yaml` | **ADD** | Register this doc (`reports/wave2/WRAPPER-CSS-ROUTING-DESIGN-GATE.md`, doc_type reference, canonical_spec → spec 22). |

## What stayed the same vs the original session prompt

- **Same GOAL:** cross-node CSS finds the right destination attr on the parent container/composite.
- **Different MECHANISM:** layer-prefix + `property_suffixes` (name-free) instead of canonical_slot tags + slot-name matching.
- **Removed:** the Commit-0a backfill *as a build gate*; the `content`-slot-alias add; the round-trip-through-canonical_slot proof.

## Open items carried out of this session

- **O1 (resolved here):** content* rows → option 1/3 per Bean's pick (no longer "null vs fill" in the dark).
- **O2:** per-step DB/table/column annotations in pipeline-flow/stages + naming spec (folded into the impact map above).
- **O3 (resolved here):** the layer→prefix attr categorisation = DEC-3 table.
- **O4:** apply the impact-map edits after this gate is approved.

## Verification (once edits land)

1. Spec 22 FR-22-2.1 names `role` + `attr_type`; FR-22-21 carries the layer→prefix table — grep confirms.
2. No wave-2 doc still calls `canonical_slot` the structural routing key — grep `canonical_slot` across `reports/wave2/` returns only metadata framing.
3. If tagged: `SELECT canonical_slot, role FROM block_attributes WHERE attr_name LIKE 'content%'` returns the chosen label + `layout` in BOTH DBs; `/sgs-update` re-run leaves them intact.
4. `decisions.md` has D194; `docs-registry.yaml` has this doc.
