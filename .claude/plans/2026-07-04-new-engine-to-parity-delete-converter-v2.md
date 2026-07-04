---
doc_type: phase-plan
project: small-giants-wp
title: New modular converter → parity → delete converter_v2 (the completion plan)
spec: 31 (§2 core mechanism, §12.6 remaining-work, §13.3 FR-31-2.6)
generated: 2026-07-04
status: SCOPED — awaiting Bean approval before build
---

# Completion plan — make the new modular engine the ONLY converter, then delete `converter_v2`

## Context (why this exists)

The cloning pipeline has TWO engines. The **frozen `convert.py`** (`orchestrator/converter_v2/`, 6,386 lines) is the **production default**. The **new modular engine** (`converter/`) is **opt-in** (`SGS_NEW_ENGINE=1`), LANDED-proven on the Mama's homepage, but **~7 items short of parity** and still **borrows 3 things from the frozen tree**. So the new engine **silently falls back to `convert.py::walk`** for any section it can't emit.

Bean's directive: dissect the monolithic content-extraction (`extraction.py`) into an orchestrator-chained modular walk, replace the block-level `has_inner` fork with the per-attr `emit_shape` fork (FR-31-2.6), drive the new engine to full parity, then **delete `converter_v2` entirely** and make the new engine the only path. **No build-then-rework — this plan is spec-anchored to Spec 31 §2 + §12.6 + FR-31-2.6 so the build session has zero ambiguity.**

**Non-negotiable sequencing: DELETE-LAST.** `convert.py` is the fallback the new engine leans on; it can only die *after* the new engine covers everything (Phase 5 parity). Deleting it earlier breaks production cloning.

## Target architecture (research-locked — Babel merged-visitor + registry)

Evidence: Babel `@babel/traverse`, unified/rehype, Roslyn, LLVM all use it; = Spec 31 FR-31-3's single walker.
- **ONE walker owns recursion** — unconditional descent; a node cloned into an attribute *still* has its children walked (fixes "nested element can also have children").
- **Total registry dispatch** — `node signature → handler`, each handler declaring an **explicit priority/specificity** (CSS-cascade style), NOT elif source-order.
- **Handlers are pure functions** — `(node, ctx) → {attrs_for_parent, block_markup_for_self, children_to_walk}`. No walker call, no sibling/ancestor knowledge, no shared mutable state. Each = its own script, fixture-testable.
- **Assembly is the ONE legitimate final pass** (over the result list, not a 2nd DOM walk) — grid/sibling globals only.
- Pitfall guards: handlers never recurse (they return `children_to_walk` / a skip flag); cross-node bookkeeping (gap ledger) is the walker's job; ONE `recognise()` computes the dispatch key (no per-handler re-inference).

## The per-node walker step order (incorporates Bean's point 6)

1. **`recognise(node)`** → Recognition (BEM↔blocks-table match — ALREADY EXISTS: `recognition.py:46` + `recognise_section:167`).
2. **[NEW] container-vs-composite classify** (BEFORE the emit-gate — Bean's point 6). Arbitrary holder = `sgs/container` (reached name-free via `container_default_slug()`; the ONLY true arbitrary holder — `card-grid`/`gallery`/`post-grid` are TYPED composites, premise corrected) → recurse children independently. Typed → the per-attr `emit_shape` walk. This **formalises the narrow `slug==container_default_slug()` gate into one explicit classifier** (composed signal — no single DB column does it) + a new FR (see §"Spec work").
3. **`emit_shape` gate** (per `role=content` attr): `nested` → lift into parent scalar/array; `child` → emit child InnerBlock + recurse. (`emit_shape` column DONE; the walk wiring is Phase 2.)
4. **Clone** per identity (`equivalent_block_for` → standalone_block: text/heading/media/button).
5. **Migrate content** (reuse `lift_scalar_content` / `lift_array_content` / `field_extractors`).
6. **CSS** (§3.A — reuse the built resolvers via the REGISTRY).
7. **Recurse descendants** (unconditional).
8. **Assembly** (final pass — grid-item folds, sibling arrangement).

---

## PHASES (each ends with a LANDED gate; delete-last)

### Phase 0 — DONE this session
`emit_shape` foundation: Spec 31 §13.3 FR-31-2.6; `block_attributes.emit_shape` column + `/sgs-update _populate_emit_shape` seeder (fail-loud) + `db_lookup.emit_shape_for` + `render_emits.render_reads_attr`. Verified correct on product-card/hero/accordion/testimonial. **Uncommitted** (Gate A blocks until Phase 2 lands product-card). Also this session: Spec 22 stub re-removed; product-card block → leaf (WIP, needs Phase 2 to land).

### Phase 1 — Regenerate the flow doc (cheap, unblocks everyone)
`cloning-pipeline-flow.md` references archived files → it is STALE. Regenerate from the LIVE scripts (the real chain: `sgs-clone-orchestrator.py::main` → stages 0.1/0.5/**0.7 css_router**/1/2/3/**4 convert_section**/9/gate/deploy/11.6). Deliverable: accurate flow doc + the routing decision-tree visual (companion Artifact).
- **Files:** `.claude/cloning-pipeline-flow.md`, `-stages.md`.
- **Gate:** doc matches a fresh trace of `sgs-clone-orchestrator.py`.

### Phase 2 — Modular content walk (the `emit_shape` re-architecture; FR-31-2.6 / §12.6 item 7)
The core build. Dissect `extraction.py` (1,533 lines) into the modular universal walk.
- **2a. Split the monolith:** `build_block_markup` (assembly) → own script; `_build_css_attrs` (§3.A CSS pass) → own script; content dispatch → the walker + handlers.
- **2b. The single walker + total registry:** walker owns recursion (unconditional descent); registry keyed by node signature with explicit priority. Extend the EXISTING `resolvers/__init__.py:REGISTRY` + `dispatch_table.py` pattern (already live for CSS since D250) to cover CONTENT too (content currently bypasses REGISTRY via `extract_content`).
- **2c. The handler scripts (each its own file, pure):** recognise (exists) · **container-vs-composite classifier (new, step 2 above)** · emit_shape gate (wire `emit_shape_for`+`equivalent_block_for`+`role`) · content-lift handlers (re-house `lift_scalar_content`/`lift_array_content`/`run_mechanism_leaf` logic) · CSS-route (exists).
- **2d. DELETE the block-level fork:** remove `extract_content`'s case-fork (`extraction.py:1096-1187`), the thin `run_mechanism_a/array/styling` wrappers, and Mechanism B's branch shell — they BECOME registry handlers. Keep + re-home: the 3 resolvers, `field_extractors`+`resolve_icon_kind`, `scalar_media`+`*Mobile`, the container-recursion family (`run_container_default`/`_descend_container_children`/`_route_container_child`), G3 validation, all `ContentConservationError` raises, `expected_content_gaps`.
- **2e. Guards to bake in:** a **coverage test** (every producible node-signature has a registry entry — exhaustiveness is no longer free), the **explicit-priority scheme**, the D212 invariant re-homed as a per-attr check (an attr can't be both nested+child), conservation per-node.
- **2f. `has_inner_blocks` migration (new engine only):** the ~22 new-engine files reading `has_inner_blocks` (incl. `dispatch_table.py:17` CSS-side fork, `context.py`, `recognition.py`, `orchestrator.py`, `coverage_report.py`, `leftover-bucket-router.py`, coverage-matrix) migrate to `emit_shape` / a per-attr check. (Physical column drop is Phase 6.)
- **Key files:** `converter/services/extraction.py`, `converter/recognition.py`, `converter/orchestrator.py`, `converter/dispatch_table.py`, `converter/resolvers/__init__.py`, `db_lookup.emit_shape_for` (`:2459`), `equivalent_block_for` (`:2489`).
- **Spec work:** amend Spec 31 §2.2 + §13.3 to name the container-vs-composite classifier (new FR-31-2.7) + the registry-dispatch content walk; the `emit_shape` fork is already FR-31-2.6.
- **Gate:** LANDED on the 7 Mama's sections via `SGS_NEW_ENGINE=1`; **byte-diff vs the current new-engine output = only the intended emit_shape deltas**; 374 tests + cheat-gate green; product-card lands (Gate A golden re-seeded with LANDED proof).

### Phase 3 — Extract `db_lookup` + `icon_resolver` out of `converter_v2`
The new engine hard-depends on `converter_v2.db_lookup` (~38 symbols) + `converter_v2.icon_resolver` (2 symbols), institutionalised by `converter/gates/import_ban.py`.
- Move both to a permanent home (`converter/db/` + `converter/services/icon_resolver.py`); rewire every `from orchestrator.converter_v2 import db_lookup/icon_resolver` across `converter/**`; update `import_ban.py`.
- **Gate:** `converter/` imports NOTHING from `converter_v2`; tests green.

### Phase 4 — Relocate the Stage-4 entry + seeds + rewire the 2 other consumers
`convert_section` + the `SGS_NEW_ENGINE` fork + seed helpers (`reset_pipeline_seed`, `seed_theme_json`, `seed_gap_context`, `ensure_root_section_class`) all live in `converter_v2/__init__.py`. Two other LIVE stages import `converter_v2`: `css_router.py` (Stage 0.7, `db_lookup`) + `expected_rules.py` (Stage 4, frozen `convert`).
- Relocate the entry + seeds into the orchestrator / `converter/`; rewire `css_router` + `expected_rules` (+ the oracle `import convert`) off `converter_v2`.
- **Gate:** the only remaining `converter_v2` reference is the frozen `convert.py` itself (the fallback), reachable only via the relocated fork.

### Phase 5 — Reach §2.7 parity (the §12.6 backlog — the real work, priority-ordered)
The new engine must clone EVERYTHING with NO frozen fallback. Spec 31 §12.6's own list:
1. **A1 — media-map LOADER** (#1 priority; STOP-28 gate). Without it every image except hero+trust-bar is broken. `field_extractors.py:144` accepts `media_map`; build the driver that resolves srcs → WP upload URLs.
2. **A2 — content-conservation ledger** (2nd STOP-28 gate). Extend `declare_input` to capture content routing units (currently only CSS) so a dropped scalar content node is UNACCOUNTED, not silent. `extraction.py:119-127`.
3. **CSS §5 resolver completeness** — build lifts (or EXCLUDED-with-reason) for `order`/`overflow`/`object-fit`/`position`/`flex`/`aspect-ratio`/`transform`/`filter`/`opacity`/`transition`/`background-image` (`outer_box.py:152` stub). Fix the stub `.resolve` entries (`scalar_content`/`scalar_media`/`styling_content`/`grid`) OR delete them if content-served.
4. **Pseudo-elements `::before`/`::after`** (fix the `::`-media-separator parse) + **non-device breakpoint painting** (the trust-bar "4-across" F-ii residual — logged not painted, `grid.py:66`).
5. **Re-implement the 2 frozen pre/post passes IN `converter/`:** `_absorb_transparent_wrappers` (pre-pass, `convert.py:2944`) + `ensure_root_section_class` (post-pass, `convert.py:5181`) — both currently run via the frozen module even under `SGS_NEW_ENGINE=1`. **DELETE the dead `text_leaf.py::route_text_leaf`** + its unported Protocol stubs.
6. **Top-level atomic-tag swap** section-level path (walk exception 1) — the new engine has no explicit section-level atomic path.
7. **F3 render-oracle (Playwright draft-vs-clone at 375/768/1440) + F6 DB-as-code consistency suite** — the automated LANDED gates (`gates/` currently has only `import_ban` + `no_slug_literal`).
- **Gate:** new engine LANDED-clones the WHOLE Mama's homepage; **`v3.walk` fallback never fires** (instrument the fork to assert this); computed-parity 11.6 green at all 3 breakpoints; Bean eye sign-off.

### Phase 6 — DELETE-LAST (flip + delete)
Only after Phase 5's parity gate is green.
- Flip the default: remove the `SGS_NEW_ENGINE` gate (new engine = the only path); update STOP-28.
- Delete `convert.py` + the rest of `converter_v2/`.
- Delete `block_composition.has_inner_blocks` (column + the 6 column-maintenance files: `_populate_has_inner_blocks`, `seed-composition-roles.py`, `db-consistency/check_composition.py` Check #2 + its tests) + the F6 has_inner drift-guard test.
- Regenerate `/sgs-update`; final `/qc-council`; LANDED re-verify; commit + push.

---

## Verification discipline (every phase)
Unit-test each handler with a fixture node (the whole point of the modular split) + LANDED on page 8 + computed-parity 11.6 + assert zero frozen fallback for the covered scope. `convert.py` stays byte-identical until Phase 6 (D-MODULAR). Commit path-scoped per phase (R-31-5: phases never ship as single commits).

## Spec work folded in
- FR-31-2.6 (`emit_shape` fork) — DONE (Phase 0).
- **NEW FR-31-2.7** — the container-vs-composite classifier (arbitrary holder vs typed composite; composed DB signal; runs after `recognise_section`, before the emit-gate). Write in Phase 2.
- Amend §2.2 / §13.3 for the registry-dispatch content walk (Phase 2).
- Regenerate the flow doc (Phase 1).

## Honest scope note
This is a **multi-session programme**, not one build. The new engine is LANDED-proven but the §12.6 backlog (esp. A1 media-map + A2 ledger + CSS §5) is the bulk of the work to retire `convert.py`. Phases 1–2 are the immediate front (flow doc + the modular emit_shape walk); 3–4 are refactor/decouple; 5 is the parity backlog; 6 is the flip+delete. Each phase is independently shippable + LANDED-gated, so there is no big-bang cutover.
