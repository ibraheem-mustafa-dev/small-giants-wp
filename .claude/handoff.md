---
doc_type: handoff
project: small-giants-wp
thread: single thread (cloning pipeline). This D271 entry = a one-off side session (block/converter infrastructure), NOT cloning progress.
session_date: 2026-07-04
---

# Session Handoff — 2026-07-04 (D273-D274 — scope FACT-CHECKED + plan APPROVED + EXECUTION Steps 1-2 done)

## Completed This Session
1. **Fact-check (D273, Bean-directed):** the D272 scope verified against the running scripts + DB + a real clone. A1 media-map claim FALSE (orchestrator loads the JSON, threads the dict to `lift_helpers.resolve_media_url:133-168`; LANDED — all 6 page-8 images HTTP 200). **Frozen fallback = ZERO Mama's sections** (measured probe of the `converter_v2/__init__.py:419-443` fork). Parity baseline content 77% / CSS 47/49/54. Grid resolver LIVE (not a stub); styling_content unregistered; container-flex lifted; atomic path exists; deletion surface extended (4 importlib loaders + gate/oracle path refs). DB verified reliable throughout (emit_shape 105 nested/33 child; parent_block 18; container_kind 31-roster; only transform/filter/transition lack property_suffixes rows).
2. **Quick fixes (`3d7e7d42`, 2-rater GO/GO):** pseudo-element `::`-sentinel parse bug FIXED (`styling_helpers.py:225` — STOP-43 repro on rt-pseudo-before + a discriminating comma-case regression test); dead `route_text_leaf`+Protocol stubs deleted; dead test-only `media_map.py` loader deleted; Spec 31 stale A1/has_inner prose corrected.
3. **Completion plan corrected + qc-council-hardened (`a281d0a3`, `9552a77b`):** 3-rater council (forensics GO — all 6 corrections held; spec-lawyer + buildability conditional NO-GO with a close-list). Rater claims fact-checked per Bean — TWO false claims caught (recognition.py IS gate-scanned per `no_slug_literal.py:60`; the D1 rater disagreement resolved by tracing: **D1 is a DEAD output** — nothing reads the router's `d1` dict). Folded: post-lift variant-fingerprint step, Ctx-destination contract scope, additive registry emission, Phase-3 re-export shim, MF-3/MF-4, metamorphic tests, Phase-6 cheat-gate re-pointing.
4. **Bean approvals (D274):** delete-last / 6-phase / FR-31-2.7 approved; scope = **SINGLE-session target** (subagent transcripts don't consume main context; HANDOFF gates = insurance only). L2 one-cascade requirement confirmed VITAL (the reduced band-fold seams proven lossy in code — plan 2e2). Subagent model corrected: PARALLEL coding subagents interfere/revert each other; SOLO is optimal (memory + MEMORY.md updated).
5. **Plans folder swept (`a8a107a2`):** all 12 pre-2026-07 plan/design docs read end-to-end then archived to `plans/archive/`; fact-checked residuals parked as `P-W3-ARCHIVE-RESIDUALS` (!important sweep Check#3=30 measured; FP-P open for the CLONED path only — typed `.btn` CTAs stretch via `product-card/style.css:1045`; BR-B/IN-E likely closed, flip on next ledger walk); LIVE-plan pointers repointed (CLAUDE.md ×2, .claude/CLAUDE.md, docs-registry).
6. **EXECUTION plan written (`741d650d`):** `.claude/plans/2026-07-04-converter-completion-EXECUTION.md` — 16 steps / 6 phases / QA gates A-B-C (each HANDOFF-safe), solo-Sonnet dispatch for mechanical steps + inline for architectural, per-step Spec-31/R-31/cheat-gate/DB citations + a session-wide invariants block for every subagent prompt.
7. **EXECUTION Step 1 DONE (`af9c9ede`):** `cloning-pipeline-flow.md` + `-stages.md` REGENERATED from the live scripts (solo Sonnet agent); /qc PASS (18 citation spot-checks + completeness walk); 2-rater council vs Spec 31 + the plan; a THIRD false agent claim caught (essence_match_detector EXISTS — lazy-loaded by `convert.py:216-226`). Fixes: D1 dead-output note, emit_shape framing, +REGISTER Bean-eye caveat, gap-ledger DB attribution (sgs-framework.db, 2,443 rows), band-fold reduced-pipeline caveat, Phase-6 forward marker.
8. **EXECUTION Step 2 DONE — architecture locked into Spec 31 (`dd5a60c6`, `9fa55a84`):** NEW **FR-31-2.7** (container-vs-composite classifier — composed DB signal at recognition, never a 4th walker branch) + **FR-31-2.8** (registry + destination contract: one walker owns recursion / structural-signature keying never slug / ADDITIVE emission with explicit priority / destination-parametric Ctx = the ONE cascade / MF-3+MF-4 binding). Staleness sweep for the session-start full read: §1 stage row + R-31-4 (pixel-diff purged → 11.6), §2.2 two-variant-mechanisms clarification, frontmatter, §12.2.1 A2 pointer, §12.3/§12.7 pseudo rows, §12.6 D274 status block, FR-31-2.6/Axis-3 present-tense fixes; root CLAUDE.md R-31-4 headline.
9. **Parallel session landed D275** (addendum below — product-card purge + `content_attr_for_element` brick, pushed): Phase 2's product-card landing now has its first brick + a clean typed-only block.

## Current State
- **Branch:** `main` at `7f58a95c` — 0 ahead of origin (everything pushed incl. D275).
- **Tests:** 374 pass + 1 skip + 2 xfail (canonical cwd `plugins/sgs-blocks/scripts`); cheat-gate 73 baselined / 0 NEW.
- **Build:** n/a this session (docs + converter scripts only; the D275 session deployed the plugin).
- **Uncommitted:** `converter/tests/test_extraction.py` (parallel-session WIP, untouched), `reports/phase4-*.txt` + mockup capture files (pre-existing), `.claude/Route-To-Completion.md` (untracked, Bean's).
- **Outcome (Gate 3.5):** items 1-8 OUTCOME ACHIEVED. The programme overall = FOUNDATION SHIPPED, OUTCOME (parity + delete converter_v2) NOT YET HIT — next session executes Steps 3-16.

## Known Issues / Blockers
- Page-8 product cards render content-EMPTY (D275, expected until Phase 2 — NOT a regression).
- A2 content ledger = the ONLY remaining STOP-28 gate (EXECUTION Step 11).
- `test_extraction.py` carries uncommitted parallel-session modifications — reconcile before Phase-2 edits touch it.

## Next Priorities (in order)
1. **EXECUTION Step 3** — Ctx destination contract (inline, architectural; FR-31-2.8.4).
2. **Steps 4-8 + QA Gate A** — the Phase-2 core (monolith split, walker+registry, emit_shape wiring, the ONE cascade, has_inner migration); lands product-card + 0-fallback + parity rise.
3. **Steps 9-16** — Phases 3-6 per the EXECUTION plan (single-session target; close at a gate if context pressure hits).

## Files Modified
| File | What changed |
|---|---|
| `plugins/sgs-blocks/scripts/converter/services/{styling_helpers,text_leaf,extraction}.py` | pseudo `::` fix; dead-code deletion; comment repoint |
| `plugins/sgs-blocks/scripts/converter/services/media_map.py` + `converter/tests/test_media_map.py` | DELETED (dead test-only loader) |
| `plugins/sgs-blocks/scripts/converter/tests/test_minwidth_cross_device_tier.py` | production-sentinel fixture keys + 3 pseudo regression tests |
| `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` | FR-31-2.7/2.8 + corrections + full staleness sweep |
| `.claude/plans/2026-07-04-new-engine-to-parity-delete-converter-v2.md` + `2026-07-04-converter-completion-EXECUTION.md` | D273 corrections + council fixes; NEW execution plan |
| `.claude/cloning-pipeline-flow.md` + `cloning-pipeline-stages.md` | REGENERATED from live scripts + council fixes |
| `.claude/{decisions,parking,docs-registry,CLAUDE}.md`, root `CLAUDE.md`, `.claude/plans/archive/*` | D273/D274; P-W3-ARCHIVE-RESIDUALS; pointers; 12 docs archived |

## Notes for Next Session
- **Fact-check every rater/agent claim before acting (STOP-15 extended):** FIVE false claims caught this session purely by tracing ground truth (media-map, atomic path, recognition.py scan, D1 "fix the spec", essence "does not exist"). When two raters disagree, resolve by tracing yourself.
- Solo coding subagent = optimal; NEVER 2+ concurrent writers (refined STOP-39).
- Frozen fallback fires for ZERO sections — Phase 5 is CSS completeness + untested shapes, not section coverage.
- `convert.py` byte-identical until EXECUTION Step 16 (D-MODULAR); commits path-scoped (PowerShell piped `git commit -F -`).

---

# LATER SESSION ADDENDUM — 2026-07-04 (D275: product-card legacy InnerBlocks PURGE + FR-31-2.6 resolver brick)

**What happened (additive to the entry below; full record = decisions.md D275):**
1. **Root cause of Bean's bad clone run proven:** the product-card "child-block capability removal" had never landed in ANY file (git clean; `allowedBlocks`, `<InnerBlocks.Content/>` save, render.php `$content` bridge all intact) — and the converter derives has_inner FRESH from those source markers (`services/has_inner.py`), so the /wp-blocks DB edits were a no-op. Ran live: derived=1 → InnerBlocks emission → the "legacy InnerBlocks layout" editor warning.
2. **Purged at source** (`src/blocks/product-card/`): block.json `allowedBlocks` deleted; index.js `save → null` (+ import gone); render.php typed branch = builtin render ONLY (FP-H bridge deleted per its own retirement clause); edit.js legacy UI + warning removed; style.css stale comments fixed. F6 build gate itself confirmed the flip; `sgs-update-v2.py --stage 1` resynced (`hib_updated=1`, derived=0).
3. **Deployed to sandybrown + page 8 re-cloned:** cards emit ZERO children + render via the built-in path live. **BUT content attrs (`productName`/`priceLarge`/`ctaText`) emit EMPTY** — trace: `primary_content_attr → ambiguous`. That routing = the FR-31-2.6 per-attr walk = completion-plan Phase 2 ("lands product-card"); deliberately NOT built inline. **Page-8 cards render bare until Phase 2 — NOT a regression** (pre-purge emission was text-block soup).
4. **First Phase-2 brick built:** `db_lookup.content_attr_for_element(block_slug, bem_element)` per the TDD contract (`test_content_attr_resolver.py` 3/3 green — match-strength ranking: exact canonical_slot/attr_name > slot-alias > first-row tie-break; FR-31-2.2 content-role allowlist). INERT until Phase 2 wires it. 281 converter tests green.
5. **Docs updated:** decisions D275, state.md top one-liner, parking FP-P premise update, next-session-prompt additive notes (Task-2 sequencing: Phase-2 walk BEFORE Layer-B typography), CLAUDE.md ×3 (plan DRAFT→APPROVED D274 drift + plugin roster row), memory converse-lesson + index compaction.
6. **NOTE:** `block_composition.has_inner_blocks` column still physically exists + F6 reads it (retired-as-signal only; physical drop = plan Phases 2f/6) — kept in sync.

---

# Session Handoff — 2026-07-04 (emit_shape foundation + converter-rebuild SCOPING)

## ⚠️ READ FIRST — the scope produced this session is DOCUMENTATION-DERIVED and MUST be fact-checked against the RUNNING SCRIPTS before it is trusted or built from.
Bean's closing directive: *"start next session fact-checking everything — there's a lot of assumption / overly trusting documentation."* PROOF it's needed: this session's parity-gap inventory claimed **"media-map loader NOT started, images broken except hero+trust-bar"** (sourced from Spec 31 §12.6 + code comments). **Bean says that is WRONG — the current clone LOADS media.** So the parity-gap inventory (and any claim from Spec 31 §12 / code comments / the stale flow doc) is a HYPOTHESIS. Next session's FIRST job = verify every load-bearing claim by READING the scripts + running a real clone, following the walker's actual logic + routing — NOT by trusting docs.

## Completed This Session
1. **`emit_shape` foundation BUILT + verified + committed** — Spec 31 §13.3 FR-31-2.6 (per-attr nested-vs-child fork replacing block-level `has_inner`). `block_attributes.emit_shape` column + `/sgs-update _populate_emit_shape` seeder (source-derived via `render_reads_attr`, fail-loud) + `db_lookup.emit_shape_for` + `render_emits.render_reads_attr`. Verified on product-card(9 nested)/hero(content=child,badges=nested)/accordion.title/testimonial(ratingStars number-type fix). Additive + INERT (not wired into the walk).
2. **Spec 31 → FR-31-2.6** across §13.3/§3.B/§2/§4. `equivalent_block_for` reframed as the IDENTITY resolver (not the fork); role = the content filter. Spec 22 redirect stub re-removed.
3. **6-persona adversarial-council + fact-check** — Bean corrected several over-claims of mine (I re-surfaced his own design as flaws). Design: kill Mechanism A/B + `has_inner`, one universal per-attr walk.
4. **research-check (architecture)** — evidence-locked: single walker owns recursion (unconditional descent) + TOTAL registry dispatch of pure per-type handlers + EXPLICIT priority + assembly as the one final pass = Babel merged-visitor = FR-31-3.
5. **Full SCOPING** (5 read-only agent traces): the real active flow (the flow doc is STALE), the `converter_v2` deletion surface, the parity-gap inventory (UNVERIFIED — see READ FIRST), container-vs-composite, the routing-paths map.
6. **Deliverables:** completion phase-plan `.claude/plans/2026-07-04-new-engine-to-parity-delete-converter-v2.md` (6 phases, delete-last) + a routing decision-tree Artifact.

## Current State
- **Branch:** main (post-commit — see git log).
- **Tests:** 373 pass + cheat-gate green (product-card golden = old-composite baseline after revert).
- **Uncommitted:** product-card WIP leaf conversion was REVERTED (needs the walk — Phase 2 redoes it). `emit_shape` column seeded in the DB; `has_inner=1` (resynced).

## Known Issues / Blockers
- **Parity-gap inventory UNVERIFIED** (media-loading claim contradicted by Bean — see READ FIRST).
- `converter_v2`/`convert.py` is still the production default + the new engine's fallback — delete-last (only after §2.7 parity, Phase 5).
- `emit_shape` walk NOT wired — product-card does not yet clone via the new fork.

## Next Priorities (in order)
1. **FACT-CHECK the scope against the running scripts + a real clone** — re-verify the parity backlog (media-map, the "stub" resolvers, which sections actually fall back to frozen `v3.walk`). Correct the phase-plan's Phase-5 backlog to what the scripts ACTUALLY do.
2. **Approve the phase-plan** once fact-checked (4 open decisions: delete-last / 6-phase shape / FR-31-2.7 classifier / multi-session scope).
3. **Phase 1** — regenerate the stale `cloning-pipeline-flow.md` from the live scripts.
4. **Phase 2** — the modular universal walk (dissect `extraction.py`; single walker + registry + pure handlers; wire the emit_shape fork; delete Mechanism A/B). Lands product-card.

## Files Modified
| File path | What changed |
|---|---|
| `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` | FR-31-2.6 across §13.3/§3.B/§2/§4 |
| `.claude/specs/22-...md` | Deleted (redirect stub re-removed) |
| `plugins/sgs-blocks/scripts/sgs-update-v2.py` | `_populate_emit_shape` seeder (Stage-1 sub-step D) |
| `plugins/sgs-blocks/scripts/converter/services/render_emits.py` | `render_reads_attr` |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` | `emit_shape_for` accessor |
| `.claude/plans/2026-07-04-new-engine-to-parity-delete-converter-v2.md` | NEW — the completion phase-plan |

## Notes for Next Session
- `equivalent_block_for` is the IDENTITY resolver (attr→canonical_slot→standalone_block), NOT the fork — `emit_shape` is the fork; they're complementary (Bean corrected my earlier framing).
- `card-grid` is a TYPED composite; the ONLY true arbitrary-child container is `sgs/container` (fix in the FR-31-2.7 classifier).
- ONE live engine path behind `SGS_NEW_ENGINE=1`: CSS branch IS wired through `REGISTRY` (D250); content is NOT (goes through `extract_content`). "Two registries" = one live + one aspirational; the "not swapped live" docstring is stale.
- Coding subagents cascade-fail here (STOP-39) — read-only analysis/research/Explore agents work; build INLINE.

---

---

> Older session entries (D271 and earlier) archived to `memory/handoff-archive-2026-07.md` (2026-07-04 rotation — doc-balloon rule).
