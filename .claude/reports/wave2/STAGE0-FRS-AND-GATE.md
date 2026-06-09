---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Stage 0 — FR drafts (F6a, F4, FR-22-19 retirement) + conformance gate design"
created: 2026-06-09
status: PROPOSAL — draft FRs to be ratified into Spec 22 + a conformance-gate design. Written BEFORE the build (architecture-council requirement: new converter behaviour must be documented as a spec rule first, not invented in code). Design-gate with Bean before merging into Spec 22.
---

# Stage 0 — spec rules + conformance gate

These are drafts. They get reviewed + merged into `specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` (assigning real FR numbers) before the workstreams that depend on them build. Written spec-shaped (requirement + PASS/FAIL) to match Spec 22's style.

---

## FR draft 1 — Inherited / absent-value resolution (F6a) → proposed `FR-22-5.1`

**Requirement.** When a content leaf's *effective* value for an inheritable property (`text-align`, `color`, `font-family`, `line-height`) derives from an **ancestor** selector rather than the leaf's own, OR is **absent** (browser default) where a block's own default would otherwise override it, the converter resolves the property to an **explicit** value on the leaf's block attrs. Inheritable properties only; resolved via an ancestor-chain walk in `_collect_css_decls_for_element`.

**PASS.**
- Draft `.sgs-X__inner { text-align:center }` + a leaf heading with no own `text-align` → the emitted `sgs/heading` carries `textAlign:'center'`.
- Draft with NO `text-align` anywhere on a heading (browser default = left) AND the block's own CSS default is `center` (`heading/style.css:7` `:where(){text-align:center}`) → the emitted heading carries explicit `textAlign:'left'`.

**FAIL.** A heading renders centred when the draft's effective alignment is left (or vice-versa) because the converter only read the leaf's own selector.

**Scope note (R-22-9).** Universal — applies to every content leaf, every inheritable property. NOT a text-align carve-out. Pairs with the draft-authoring convention (text classes SHOULD declare explicit alignment) as the forward path; this FR is the converter's resolution for drafts that don't.

---

## FR draft 2 — Draft-driven responsive breakpoints (F4) → proposed `FR-22-5.2`

**Requirement.** The converter reads the draft's **actual** `@media` breakpoints rather than snapping to fixed constants (`_BREAKPOINT_RULES` at `db_lookup.py:1233-1239`; `_GRID_DESKTOP_BP=1024` + `_GRID_TABLET_BP=600` at `convert.py:3317-3318`). Each detected breakpoint maps to the block's existing responsive attr tier (`+Tablet`/`+Mobile`, the FR-22-21 step-4 companions). A breakpoint with no matching attr tier is logged as an `attribute_gap_candidate` (D3) — never emitted as inline `@media` (R-22-6).

**PASS.**
- A draft using `@media (min-width:640px)` has its 640 rule lifted (today it's silently discarded — `min-width:640` absent from `_BREAKPOINT_RULES`, `db_lookup.py:1233-1239`).
- A draft using `min-width:768` for a 2-col grid maps to the **desktop** attr (today `768 < _GRID_DESKTOP_BP=1024` misbuckets it to tablet, leaving desktop at the mobile base — the H-A2/BR-A bug).

**FAIL.** A draft breakpoint outside the fixed set is dropped; or a `min-width` value lands on the wrong device tier.

**Note.** This replaces fixed thresholds with draft-derived ranges. The H-A2 output bug (cause unverified by static read) should be traced under this FR — the fix is "read the draft's breakpoints", which subsumes the threshold-misbucket regardless of the exact current cause.

---

## FR draft 2b — Cross-node interior box-CSS → parent per-slot attr group → proposed `FR-22-5.3`

**built_status: MERGED INTO SPEC 22 (2026-06-10)** — this draft is now canonical as `FR-22-5.3` in `specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` (verbatim mechanism + PASS/FAIL + the 2026-06-10 parent-scoped resolution clause). Spec 22 is the authoritative copy; this draft is retained for audit trail only. Build is Stage-1 Commit 2.

**Requirement.** When an interior element's CSS is not consumed by the element's own block, the converter routes its **box/layout** properties (padding, margin, max-width, gap) to the **owning composite's per-slot attr group**, resolved DB-driven:
1. Child BEM element → `canonical_slot` (`slots` table).
2. **Fork on a SLOT-KEYED predicate FIRST** (the FR-22-5 D1 rule, CONTENT fork ONLY) — `slot_has_equivalent_block(block_slug, slot_name)` querying `block_attributes WHERE block_slug=? AND canonical_slot=? AND role IN (<content-bearing roles>)`. **NOT `equivalent_block_for(block, slot)`** — that function is attr-keyed (`WHERE attr_name=?`, `db_lookup.py:1995`), so a slot name returns `None` always and the fork silently never fires (qc-council fatal catch). TRUE → the CSS attributes to the CHILD block (existing D1 path, NOT the parent); FALSE → lift to the parent's box attrs. **The box-CSS DESTINATION is found NAME-FREE — by layer-prefix + box-property `property_suffixes` (D194), NOT by matching `canonical_slot`.** The slot-keyed predicate is only the content-fork test; `canonical_slot` plays no part in selecting the box-CSS destination attr.
3. **EXCLUDE `display` / `grid-template-*`** — those stay on the layout engine (lifting them cross-node as inline beats `@media` and collapses grids; the GAP-3 rule, `convert.py:2791-2799`). Box CSS → block attrs only (R-22-6: responsive values in attrs, never inline).
4. **Flag-not-drop (FR-22-21 step 6 + FR-22-2.4):** no matching parent attr → log `attribute_gap_candidate` + `unresolved_equivalent_block.log`; the slot becomes a gap-candidate to add the attr to the composite. Never silent-drop, never per-block special-case (R-22-9).
5. **Parent-scoped child-token resolution (added 2026-06-10; Bean-confirmed — the table ALREADY EXISTS, use it):** before the global `slots` alias lookup resolves an interior element's token, consult the existing **`blocks.parent_block`** table (forced-parentage, 18 rows — NO new table/column needed): if the current owning block has a registered child block whose identity matches the element's role, the child block wins over the global alias (e.g. `sgs/accordion` `__item` → `sgs/accordion-item`, NOT the `card`-alias → `sgs/info-box`; `sgs/form` `__step` → `sgs/form-step`, NOT `sgs/process-steps` — both collisions confirmed live 2026-06-10). Constraints (adversarial-council 2026-06-10, 4-persona): pure DB lookup keyed `(parent_block, element_token)` — never a Python per-slug branch; parent context = nearest RESOLVED ancestor slug; parent-scoped match takes precedence over the global alias, traced either way; never threaded into the `lru_cache`d `_resolve_slug_from_bem_tuple` core (cache key is the class tuple only); audit all 18 `blocks.parent_block` pairs at build; consider removing the over-broad `"item"` entry from the `card` slot aliases as root-cause hygiene. **Sibling signal — OPTIONAL nesting (Bean-raised 2026-06-10, DB-verified):** `block_composition.accepts_allowed_blocks` is the schema's home for "blocks that MAY nest inside this one without being dependent" — the column EXISTS but is 0/29 populated (the allowedBlocks lists live in each block's edit.js, which `/sgs-update` doesn't scrape). Once populated it can (a) further discriminate interior resolution and (b) validate emitted nesting. NOT a Commit-2 dependency — `blocks.parent_block` alone resolves both confirmed collisions; populating accepts_allowed_blocks is a gap-candidate `/sgs-update` enhancement (parked: P-ACCEPTS-ALLOWED-BLOCKS-POPULATION).

**DB dependency:** NONE on `canonical_slot` (D194). The per-slot box attrs (`contentPadding*`, `contentWidth`, `mediaPadding*`, …) are reached NAME-FREE via layer-prefix + their box-property `property_suffixes` rows (already present). The ~41 content-area rows are tagged `canonical_slot='content'` + `role='layout'` as convention-consistent **metadata only** (maintained deterministically by `/sgs-update` Stage 1 `assign-canonical.py`); the former "Commit-0a `seed-canonical-slots.py` pre-gate" is **OBSOLETE as a build gate** — the cross-node commit does not require it. Design-gate: `WRAPPER-CSS-ROUTING-DESIGN-GATE.md`.

**PASS test:** hero `contentPadding*` set from `.sgs-hero__content` padding (today lands on the outer section); trust-bar `contentWidth` set from `.sgs-trust-bar__inner` max-width (today absent). A `.sgs-X__Y` whose `equivalent_block_for(X,Y)` is non-NULL attributes to the child block, NOT the parent's `Y`.
**FAIL test:** box CSS dropped for a non-equivalent interior slot; OR a child-block slot's CSS mis-routed to a parent scalar attr (the FR-22-5 D1 FAIL case); OR `display`/`grid-template` lifted cross-node as inline.

---

## FR draft 3 — FR-22-19 retirement (carve-out supersession) → amend `FR-22-19`

**Requirement.** The TWO per-composite interior-routing carve-outs in `walk()` — `_route_composite_interior` (def `convert.py:2404`) gated by `db.has_scalar_media_attrs(slug)` (`:2940`), and `_is_container_mirror_block(slug)` (`:2950`, def `:908`) → `_process_container_children` (`:3834`) — are **superseded** by the universal per-slot CSS routing (F1 cross-node) + the array path (FR-22-2.5). Composite interiors route content AND CSS via the universal dispatch keyed on `role`/`canonical_slot`/`attr_type` — with **no** per-composite gate (`has_scalar_media_attrs` / `_is_container_mirror_block`) in the routing path. NB: `is_class_section_block` is the VOTER's slug-resolution helper (FR-22-16), NOT this gate — do not target it.

**Migration (R-22-3 / R-22-4).**
- The sole-element-child guard `fold_eligible = len(element_children) == 1` (`_process_container_children:3857`) that prevents the +13pp XS-3 regression (`__inner` fold firing on multi-child grids) MUST be preserved in the universal path (qc-council confirmed this guard already exists and defuses the XS-3 mechanism).
- Remove `_route_composite_interior` ONLY after the universal path is **live-DOM-verified** to route every composite interior (content + CSS) correctly. Per-section pixel-diff on the removal commit; rollback only if genuinely non-universal (not if the draft's score dips — the deliverable is the universal converter, not the score).

**PASS.** Neither the `has_scalar_media_attrs`-gated `_route_composite_interior` branch (`:2940`) nor the `_is_container_mirror_block` branch (`:2950`) remains as a separate per-composite path in the `walk()` emit chain — every composite emits its interior via the one universal dispatch; live DOM unchanged-or-better. (A `grep is_class_section_block`=0 test is meaningless — that string is only in stale docstrings + the unrelated voter helper.)

**FAIL.** Any composite still routed via a per-slug / per-KIND branch.

---

## Conformance gate design (D178's missing cure)

D178: the recurring defects are "good docs + undelivered/mis-wired code, with **no spec↔code conformance gate** to catch it." Two complementary gates — both wired to something that RUNS (memory `dont-claim-a-guard-is-enforced-unless-wired`):

### Gate A — converter golden-fixture regression (the primary D178 cure)
A small set of draft fixtures (one per family-representative section) with **expected emitted attrs**. The gate runs the converter and asserts the emit matches the golden file. Catches "mis-wired/undelivered code" — the exact D178 failure mode where the spec is right but the code silently doesn't deliver.
- **Where:** a `pytest` test (`tests/test_converter_conformance.py`) over `tests/fixtures/conformance/*.json` (draft → expected-attrs).
- **Runs:** pre-commit hook on `convert.py`/`db_lookup.py` edits + (when CI exists) CI. Until CI exists, the pre-commit wiring IS the floor — state that honestly.
- **Seeded from:** the sign-off ledger — each VERIFIED issue gets a fixture asserting its fix stays fixed (regression lock).

### Gate B — F3 hardcoded-render-default guard (`check-hardcoded-render-defaults.js`)
Mirrors the shipped `check-dead-controls.js`. Fails `npm run build` when a block's `render.php`/`style.css` emits a layout/visual **constant** for a property the block declares an **attr** for (the F3 failure class — `flex-wrap:wrap`, `verticalAlign:start`, `starSize:24`, etc.).
- **Where:** `plugins/sgs-blocks/scripts/check-hardcoded-render-defaults.js`, wired into prebuild like the dead-control guard.
- **Catches:** new F3 hardcodes at build time so F3 doesn't re-open on the next section.

### Build order for the gates
- **Gate A first** — it's the D178 cure and locks every fix as it lands (the ledger feeds its fixtures).
- **Gate B alongside the F3 workstream** — it's that workstream's structural defence.

**Decision needed from Bean:** Gate A's fixture granularity — one fixture per section (7) to start, expanding per VERIFIED issue? (Recommended: yes — start with the 7 section fixtures, add a regression fixture each time an issue moves to VERIFIED.)
