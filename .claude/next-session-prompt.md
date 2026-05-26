---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-27-spec-22-phase-0-1-foundation
generated: 2026-05-26
parent_session: small-giants-wp-2026-05-26-spec-22-ratification
primary_goal: "Start Spec 22 Phase 0 (Foundation). Phase 0.1 (DB enrichment + golden corpus + pre-rewrite DB snapshot) is the first work — gates Phase 1 walker rewrite per R-22-5."
first_action_eta: "15 minutes (read Spec 22 §3 FR-22-2 + Phase 1 plan Phase 0.1 commit; then start golden corpus design inline)"
---

# Next session — Spec 22 Phase 0.1 (DB enrichment + golden corpus)

You are a senior SGS Framework architect implementing Spec 22 (Universal Block-Equivalent Extraction). Your domain: cloning-pipeline foundation work — DB enrichment of `block_attributes.canonical_slot` backfill, the `equivalent_block_for()` 3-tier derivation specified in Spec 22 §FR-22-2, the unified `wp-blocks.py` data CLI per FR-22-8, and the pixel-diff.py measurement-methodology hardening that closes Phase 1.5's noise floor.

## State recap

Spec 22 ratified yesterday (2026-05-26, commit `d9bd1c00` on main). It replaces Spec 16 in full — single universal walker with exactly 3 permitted exceptions, BEM-only recognition, block-equivalent attrs become child blocks via DB lookup, hybrid block render.php migration pattern, ≤5% Phase 1 acceptance + ≤1% Phase 1.5 stretch. 4-rater /gap-analysis council validated the architecture (48 findings, all addressed/dropped/recalibrated). Phase 1 plan at `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md` — 5-commit walker rewrite. Phase 0 (Foundation) gates Phase 1: 4 commits — 0.1 DB enrichment, 0.2 wp-blocks.py extension, 0.3 pixel-diff.py hardening, 0.4 hybrid-block audit. Empirical baseline `pipeline-state/mamas-munches-homepage-2026-05-26-012625/` mean 63.0%. Visual proof-of-concept at `/hero-clone-poc/` page 29 (script reports 54.5% due to 60px chrome-bleed; visual content matches mockup).

## Mandatory READING

Before doing any work, read in order:
1. This file (you're here)
2. `.claude/state.md` (current pipeline state + Spec 22 ratification status)
3. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — focus on FR-22-2 (block-equivalent attrs), FR-22-2.1 (3-tier derivation), FR-22-2.3 (Tier C uses existing slot_synonyms — NO new table), FR-22-8 (wp-blocks.py unified CLI), FR-22-8.1 (cross-DB invariants), FR-22-9 (uimax SGS-WP-relevant tables), §7 Phase 0 commits, §16 ratification gate
4. `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md` — Phase 0 commits 0.1-0.4 + 5-commit walker rewrite cadence
5. `.claude/cloning-pipeline-flow.md` + `.claude/cloning-pipeline-stages.md` — stage map (Spec 22 is canonical; Spec 16 retired 2026-05-26)

**Domain references (read BEFORE invoking the relevant skill):**
- `~/.claude/skills/sgs-wp-engine/SKILL.md` — read at the moment of touching SGS framework code (before invoking `/sgs-wp-engine`)
- `~/.claude/rules/wp-project-tooling.md` — WP-specific skill + agent + MCP tool tables (auto-loaded by global CLAUDE.md)
- `~/.claude/rules/measurement-vs-eye.md` — the binding rule behind R-22-13 (Bean visual sign-off co-authoritative). Phase 0.3 pixel-diff hardening references this directly.

**Live state (always check BEFORE conjecturing about pipeline causes):**
- `pipeline-state/<latest-run>/leftover-buckets.json` — orchestrator gap classification (binding rule blub.db row 254 — MANDATORY first read on any pipeline-quality investigation)
- `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` — DB row counts sanity (sgs-framework.db)
- `python ~/.claude/hooks/wp-blocks.py health` — verify both sgs-framework.db AND uimax db are reachable from the converter's data layer

## Tool bindings

**Session-wide skills (always available):** `/autopilot` (SessionStart auto-injects), `/brainstorming` (design-mode for golden corpus structure), `/research` (auto-routes — use `/research-check` for any quick lookup), `/strategic-plan`, `/lifecycle` (any skill/agent edits), `/gap-analysis`, `/qc-council` (pre-commit gate per blub.db 255), `/qc-inline`, `/verify-loop`, `/delegate`, `/subagent-driven-development`, `/dispatching-parallel-agents`, `/capture-lesson`, `/handoff`.

**SGS WordPress domain skills (MUST be invoked for any WP / SGS work):**
- `/sgs-wp-engine` — SGS Framework workflow + block dev + mockup-to-blocks + sgs-db.py knowledge base. **Invoke at session start before touching plugins/sgs-blocks/.**
- `/wp-block-development` — Gutenberg block.json + render.php + deprecations. Use when touching `src/blocks/<slug>/`.
- `/wp-plugin-development` — Plugin architecture + hooks + Settings API + security. Use for `plugins/sgs-blocks/sgs-blocks.php` + `includes/`.
- `/wordpress-router` — Classify a WP repo and route to the right WP skill. First-line when unsure.
- `/wp-rest-api` — `register_rest_route` + controllers + schema validation (relevant if Phase 0.2 wp-blocks.py extends to REST endpoints).

**DB query tools:**
- `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py <command>` — query sgs-framework.db (619+ block attributes; supports `block <slug>`, `tokens`, `stats`, `sql "<query>"`, `dump`).
- `python ~/.claude/hooks/wp-blocks.py <command>` — current dual-DB CLI (queries both sgs-framework.db AND uimax db). Phase 0.2 EXTENDS this with 6 new subcommands (Task 4).
- `/uimax` skill — query uimax db directly (the SGS-WP-relevant tables: `naming_conventions`, `attribute_gap_candidates`, `recognition_log`, `animations`, `component_libraries`, `patterns`). Useful for verifying Spec 22 FR-22-9 cross-DB invariants before Task 4.
- `/sgs-db` slash command — shortcut to query sgs-framework.db.

**Pipeline tools:**
- `/sgs-clone --debug-trace` — Stage 11 pixel-diff measurement after each commit (binding rule blub.db 256 — per-section cropped via `--selector .sgs-{section}`, never full-page).
- `/sgs-update` — DB sync from source-of-truth files (Stage 1 invokes `behavioural-analyser/assign-canonical.py` per D50; Phase 0.1 extends that script).

**Live verification:**
- Playwright MCP — live-page DOM verification (Phase 0.3 hardening; hero-clone-poc regression test).
- `python ~/.claude/hooks/wp-blocks.py dump` — schema enumeration BEFORE any "missing X" claim (binding rule blub.db 272, R-22-8).

## First action

Read Spec 22 §3 FR-22-2 (block-equivalent attrs) + FR-22-2.1 (three-tier derivation) + §7 Commit 0.1 specification end-to-end. Then design the golden corpus structure inline (main thread, Opus): 10-15 representative SGS blocks × expected canonical_slot + role per attr. Use `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block <slug>` to read current state of each candidate block. Output: `.claude/specs/22-golden-corpus.json` draft for Bean review BEFORE dispatching Sonnet for the assign-canonical.py extension. ETA: ~20 min for golden-corpus design.

---

## Task 1 — Design golden corpus for canonical_slot backfill regression test

**What:** Hand-author a golden corpus JSON at `.claude/specs/22-golden-corpus.json` listing 10-15 representative SGS blocks × expected `canonical_slot` + `role` per content-bearing attr. Used as regression test for the extended `assign-canonical.py` script. If extended-script output diverges from golden corpus, halt Phase 0.1 before Phase 1 dispatch.
**Why:** F-RA-1 critical finding — without semantic validation, Phase 0.1 backfill could mis-tag behavioural attrs as block-equivalent (e.g. variantStyle wrongly assigned canonical_slot=text), causing the universal walker to emit child blocks where scalar attrs belong. Pixel-diff alone can't detect this; only golden-corpus comparison does.
**Estimated time:** 20-30 min.

**Orchestration:**
- Execution: inline (main thread, Opus)
- Brief: read Spec 22 §FR-22-2.1 + §7 Phase 0.1; query DB for hero / product-card / quote / info-box / heading / button / text / media / counter / brand (the 10 highest-traffic SGS blocks); for each, list every attr where derivation should/shouldn't fire and document the expected (canonical_slot, role, equivalent_block) triple.
- Context: empirical state — 1,032 of 2,246 attrs have canonical_slot populated; 1,142 are triple-NULL (canonical_slot + derived_selector + role all NULL). The golden corpus picks 10-15 blocks covering the full distribution.
- Depends on: none
- Parallel with: none (foundational)
- /qc gate after: `/qc-inline` — does the corpus cover content-bearing attrs (image, description, heading, body, etc.) AND behavioural attrs (variantStyle, trialTag, anchor) for at least one block each?

**Acceptance:** corpus file exists, contains 10-15 blocks × 10-20 attrs each, every (attr, expected) pair derived from actual DB query + Bean visual review of any ambiguous cases.

## Task 2 — Extend `/sgs-update assign-canonical.py` for canonical_slot backfill

**What:** Extend `assign-canonical.py` to populate `canonical_slot` across the 1,214 NULL rows where derivation tiers (slot_synonyms join, BEM-element from derived_selector, role-to-block via slot_synonyms.role) succeed. Add regression test that runs the extended script against the golden corpus from Task 1 — must produce zero diff.
**Why:** Spec 22 FR-22-2.1 — the universal walker reads `canonical_slot` at runtime to resolve equivalent_block. Without backfill, Tier B + Tier C fire constantly and walker emits unresolved-log instead of correct child blocks. Long-term invariant: Tier B + Tier C usage drives toward zero.
**Estimated time:** 2-3 hours.

**Orchestration:**
- Execution: delegated subagent
- Model: Sonnet via `/delegate` (mechanical script extension; well-scoped)
- Dispatch pattern: `/subagent-driven-development` (one implementer + 2 reviewers — code-reviewer agent + Bean visual check on diff)
- Brief: extend `assign-canonical.py` with 3-tier derivation logic per Spec 22 FR-22-2.1. Add `--dry-run` flag (lists what would change without writing). Add `--golden-corpus <path>` flag that compares dry-run output against the golden corpus and exits non-zero on diff.
- Context: assign-canonical.py lives at `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` (NOT under `orchestrator/`). Current behaviour: populates canonical_slot for rows where attr name matches slot_synonyms.aliases — wired via `sgs-update-v2.py:stage_1_sgs_codebase_scan()` tail (per D50). Extension: add Tier B (BEM-element from derived_selector match against aliases) + Tier C (role-to-block via slot_synonyms.role + standalone_block columns — NO new table, query existing data). `db_lookup.py` lives at `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` (the new `equivalent_block_for()` function lands here).
- Depends on: Task 1 (golden corpus)
- Parallel with: none (Task 3 + 4 can run in parallel AFTER this lands)
- /qc gate after: `/qc-council` multi-rater (Sonnet + Haiku + Gemini Flash + Cerebras) per blub.db 255 — this is converter-adjacent infrastructure.

**Acceptance:** dry-run against golden corpus produces zero diff. Real run on full 1,214 NULL rows reports per-tier counts (Tier A direct join / Tier B BEM extraction / Tier C role mapping / unresolvable). Bean visual review of unresolvable list.

## Task 3 — Pre-rewrite DB snapshot

**What:** Copy `~/.claude/skills/sgs-wp-engine/sgs-framework.db` to `pipeline-state/_snapshots/sgs-framework-pre-spec22.db` BEFORE any Task 2 backfill runs.
**Why:** F-RA-2 critical finding — cold replacement walker rewrite (Phase 1.4) reads canonical_slot. If Task 2 backfill is wrong AND walker is broken, rollback requires reverting BOTH code (git revert) AND DB (snapshot restore). Without the snapshot, the legacy walker reads the modified DB state and produces UNTESTED combination behaviour.
**Estimated time:** 5 min.

**Orchestration:**
- Execution: inline (main thread; trivial filesystem op)
- Brief: `mkdir -p pipeline-state/_snapshots/ && cp ~/.claude/skills/sgs-wp-engine/sgs-framework.db pipeline-state/_snapshots/sgs-framework-pre-spec22.db && echo "Snapshot SHA256: $(sha256sum pipeline-state/_snapshots/sgs-framework-pre-spec22.db)"`
- Depends on: none (precedes Task 2)
- Parallel with: Task 1 design (Task 1 doesn't write to DB)
- /qc gate after: none (filesystem op)

**Acceptance:** snapshot file exists with SHA256 recorded in commit message. Snapshot is read-only.

## Task 4 — wp-blocks.py extension (Phase 0.2)

**What:** Extend `~/.claude/hooks/wp-blocks.py` with 6 new subcommands per Spec 22 FR-22-8: `equivalent-block <slug> <attr>`, `recognition-log --write`, `naming-convention <regex>`, `gap-candidate --write`, `animation <slug> <attr>`, `component-library-match <query>`. Adversarial test corpus per F-RA-3.
**Why:** Unified data CLI for the converter — Spec 22 walker calls `equivalent_block_for()` per node per attr. Performance threshold committed in FR-22-8: ≤2ms cache-warm, ≤20ms cold per call.
**Estimated time:** 3-4 hours.

**Orchestration:**
- Execution: delegated subagent
- Model: Sonnet via `/delegate` (extension of existing dual-DB script; ~150 LoC)
- Dispatch pattern: `/subagent-driven-development`
- Brief: read current `~/.claude/hooks/wp-blocks.py` (line 41 already opens both DBs); add 6 new subcommand handlers + arg parsers. Each handler queries the appropriate DB and returns JSON. Add LRU cache for `equivalent-block` (most-called subcommand at walker runtime).
- Context: 5 of the 6 subcommands query uimax tables (recognition_log, naming_conventions, attribute_gap_candidates, animations, component_libraries). `equivalent-block` queries sgs-framework.db via `db_lookup.equivalent_block_for()` (function to be added in Task 2-companion work). FR-22-8.1 cross-DB invariants apply.
- Depends on: Task 2 (assign-canonical.py extension provides the db_lookup foundation)
- Parallel with: Task 5 (pixel-diff.py hardening is independent of wp-blocks.py)
- /qc gate after: `/qc-council` multi-rater + adversarial test corpus (positive cases — block-equivalent attrs return correct slug; negative cases — behavioural attrs return null; edge cases — hyphen-compound BEM elements).

**Acceptance:** all 6 subcommands functional. Adversarial test corpus passes. Performance benchmark: 1000 cache-warm `equivalent-block` calls complete in ≤2 seconds total.

## Task 5 — pixel-diff.py vertical-anchor hardening (Phase 0.3)

**What:** Patch `scripts/pixel-diff.py` to fix the 60px vertical body-anchor offset that produced 54.5% pixel-diff on the visually-matching hero-clone-poc page. Detect WP chrome (admin bar + template-part header) and crop SGS screenshot before comparison. Add `--wait-fonts` flag that waits for `document.fonts.ready` before screenshot capture.
**Why:** Phase 1.5 stretch goal depends on the measurement script honestly reporting visual parity. Without this, the ≤1% Phase 1.5 gate is unreachable even when content matches mockup.
**Estimated time:** 2-3 hours.

**Orchestration:**
- Execution: delegated subagent
- Model: Sonnet via `/delegate` (script extension; Playwright API work)
- Dispatch pattern: `/subagent-driven-development`
- Brief: read current `scripts/pixel-diff.py` (the BODY-ANCHOR logic + Playwright capture path); add chrome-detection by reading computed style of `#wpadminbar` + `.sgs-header` (or any element with `wp-block-template-part` class). Crop screenshot to exclude detected chrome before pixel comparison. Add `--wait-fonts` flag using `await page.evaluate('document.fonts.ready')` before screenshot.
- Context: the 60px offset was identified 2026-05-26 on `/hero-clone-poc/`. The `BODY-ANCHOR mockup_y=0  sgs_y=60` log line is the artefact — body-anchor detection succeeded but the SGS image starts 60px lower due to chrome rendering.
- Depends on: none (independent of Tasks 1-4)
- Parallel with: Task 4 wp-blocks.py extension
- /qc gate after: `/qc-inline` + Playwright regression test on hero-clone-poc (page 29) — pixel-diff should drop from 54.5% to ≤5% on visually-matching content.

**Acceptance:** hero-clone-poc pixel-diff at 1440 reports ≤5% (target ≤1%) after fix. Other pipeline runs unaffected (no regression on Mama's homepage Stage 11 numbers).

## Task 6 — Hybrid-block audit (Phase 0.4)

**What:** Query `equivalent_block_for()` against every block × every attr. Filter via FR-22-2.2 role-exclusion (content-bearing roles only). Produce roster at `.claude/reports/2026-05-26-hybrid-block-roster.md`. Sets Phase 2 scope (estimated 8-15 blocks, not 63 raw).
**Why:** Spec 22 Phase 2 (hybrid block render.php migration) needs an empirically-scoped roster. Hand-curated list violates R-22-1 (DB-first).
**Estimated time:** 30-45 min.

**Orchestration:**
- Execution: delegated subagent
- Model: Haiku via `/delegate` (pure DB query + roster generation; mechanical)
- Dispatch pattern: single agent
- Brief: write SQL query that joins `block_attributes` + `slot_synonyms` + filters by role-exclusion rule from FR-22-2.2 (content-bearing roles: text-content, image-object, content, link-href, identity). Output markdown table at `.claude/reports/2026-05-26-hybrid-block-roster.md`: block_slug | hybrid_attr_count | example_attrs.
- Depends on: Task 2 (canonical_slot backfill must be complete for the query to be meaningful)
- Parallel with: Task 4 + Task 5 (only depends on Task 2)
- /qc gate after: `/qc-inline` — Bean visual review of roster; expect 8-15 blocks; if >20 or <5, the role-exclusion rule needs revisiting.

**Acceptance:** roster file exists; Bean confirms count is within 8-15 range; roster locks Phase 2 scope.

---

## Dependency graph

```
Task 3 (DB snapshot — 5 min, inline)
  ↓
Task 1 (golden corpus — 20-30 min, inline Opus)
  ↓
Task 2 (assign-canonical.py extension — 2-3hrs, Sonnet, /qc-council)
  ↓
  ├─ Task 4 (wp-blocks.py extension — 3-4hrs, Sonnet, /qc-council)  ┐
  ├─ Task 5 (pixel-diff.py hardening — 2-3hrs, Sonnet, /qc-inline)  ├─ PARALLEL
  └─ Task 6 (hybrid-block audit — 30-45 min, Haiku, /qc-inline)     ┘
  ↓
Commit per task with /qc-council gate + Stage 11 measurement (where applicable)
  ↓
Phase 0 closes; Phase 1 walker rewrite begins at Commit 1.1 (next session)
```

Total wall-time estimate for Phase 0: ~8-10 hours across 1-2 sessions.

## Methodology guardrails (do not skip)

- **DB-first, no hardcoded dicts** (R-22-1) — all lookups via DB tables. Tier C role-to-block derives from existing `slot_synonyms.role + standalone_block` columns; no Python dict.
- **BEM is the only recognition signal** (R-22-2). HTML tag is rendering-shape only.
- **Pixel-diff gates every commit** (R-22-4). `/sgs-clone --debug-trace` Stage 11 pre/post; commit message cites predicted vs actual delta. Per-section cropped via `--selector .sgs-{section}`, NEVER full-page (blub.db row 256).
- **Phases never ship as single commits** (R-22-5). Each Phase 0 task gets its own commit. /qc-council pre-commit gate on Tasks 2 + 4 (converter-adjacent).
- **Output-only inference is a trap** (R-22-6). Verify mockup HTML + extract.json + live DOM at each milestone — three-direction verification.
- **Council fix-shapes are hypotheses, not specs** (R-22-7). Multi-rater proposals require empirical pre/post measurement before subagent dispatch.
- **Schema enumeration before "missing X"** (R-22-8). Query `sgs-framework.db` via `/sgs-db` first.
- **Universal mechanisms, no per-block hyperfocus** (R-22-9). Every fix passes "does this apply to all 68 SGS blocks?"
- **Verify rendered output, not internal metrics** (R-22-11). Live Playwright DOM is canonical.
- **/qc-council pre-commit gate enforced via `pipeline-stage-gate.py` hook** (R-22-12). No prompt-only enforcement.
- **Bean visual sign-off is co-authoritative with pixel-diff** (R-22-13). Script numbers + Bean's eye + visual cropped-pair BOTH consulted.
- **Output Spec 22 compliance check**: when in doubt about an architectural shape, re-read Spec 22 §3 FRs end-to-end. The 13 FRs + 13 binding rules are the contract.

## Guardrails — what must not break

- Spec 22 status MUST remain `active` post Phase 0 commits. Any Phase 0 commit that causes /qc-council to fail rolls back IMMEDIATELY.
- `block_attributes.canonical_slot` MUST NOT be mis-tagged on behavioural attrs (variantStyle, trialTag, anchor) — golden corpus regression test catches this.
- Pre-rewrite DB snapshot (Task 3) MUST exist before Task 2 writes any new canonical_slot data. No exceptions.
- Spec 16 references in NEW commits MUST be explicit historical-context only (e.g. "Spec 16 §X was the predecessor, retired 2026-05-26"). Bare references treated as canonical are blockers.
- WP_DEBUG_DISPLAY must stay `false` on sandybrown staging — debug notices contaminate every pixel-diff (binding rule, 2026-05-18).
- All converter / pipeline commits use `--converter-v2` flag on /sgs-clone runs (binding rule, 2026-05-18).
