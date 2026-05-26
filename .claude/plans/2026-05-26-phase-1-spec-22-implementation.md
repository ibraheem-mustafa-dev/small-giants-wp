---
doc_type: phase-plan
project: small-giants-wp
phase: phase-1-spec-22-implementation
generated: 2026-05-26
supersedes: .claude/plans/archive/2026-05-25-phase-1-universal-extraction-superseded-by-spec-22.md
canonical_spec: .claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md
primary_goal: |
  Implement Spec 22 (SGS Cloning Pipeline — Universal Block-Equivalent Extraction).
  Acceptance: per-section pixel-diff ≤5% across 3 viewports (375 / 768 / 1440) for
  every body section. Phase 1.5 stretch: bridge to ≤1% via noise-floor diagnosis.
empirical_baseline: pipeline-state/mamas-munches-homepage-2026-05-26-012625/stage-11-pixel-diff.json (mean 63.0%; brand 53.2/50.9/46.0; product-card 75.0/72.6/87.9; full table per FR-22-7 enumeration)
---

# Phase 1 — Spec 22 implementation

## Status

DRAFT. Plan ratified when Spec 22 status flips from `draft` → `active` (gated on Commit 0.0 cross-doc sync per Spec 22 §16).

## Pre-conditions

Before starting Phase 1 work the next session MUST confirm:

1. **Spec 22 active.** Frontmatter `status: active` AND §16 ratification checklist all 4 boxes ticked.
2. **Canonical docs read.** Spec 22 end-to-end. Architecture.md decisions #14 + #15 (post Commit 0.0 rewrite). Spec 00 §3.1 (BEM canonical signal — link target now Spec 22). Companion specs: 20 + 21.
3. **DB integrity check.** `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` returns expected row counts. `slot_synonyms.standalone_block` populated where role is content-bearing (FR-22-2.3 sanity).
4. **Branch on `main`.** Phase 1 work commits to main per project CLAUDE.md branch discipline.
5. **Build clean.** `cd plugins/sgs-blocks && npm run build` exits 0.
6. **Sandybrown canary reachable.** Page 144 `/rc-fix-verification-mamas-munches/` returns 200 via WP REST API check.
7. **Pre-rewrite DB snapshot exists** at `pipeline-state/_snapshots/sgs-framework-pre-spec22.db` (Commit 0.1 prerequisite — enables genuine rollback per F-RA-2).

## Parking lot

Items surfaced during Phase 1 that don't belong in the active step sequence:

- **P-LEGACY-GAP-CANDIDATES-MIGRATION** — 1,480 legacy rows in sgs-framework.db `attribute_gap_candidates`. Spec 22 FR-22-8.1 makes them read-only; migration to uimax is out-of-scope (parked).
- **P-PIXEL-DIFF-VERTICAL-ANCHOR-FIX** — the 60px chrome-bleed on hero-clone-poc measurement (Phase 1.5 territory).
- (add entries as they surface during execution)

## What this phase does (one paragraph)

Implements Spec 22's universal block-equivalent extraction architecture. Stage 4 of the cloning pipeline (`convert.py`) is rewritten as a single-path walker with exactly 3 permitted exceptions (atomic-tag swap, top-level chrome skip, top-level container wrap — FR-22-3). Per-block branches retire: `lift_subtree_into_block_attrs`, `_lift_inner_blocks`, F1 fallback, 9-branch walk(), ARRAY_LIFT_PATTERNS, hardcoded ATOMIC_TAG_MAP. New foundation: `equivalent_block_for()` in `converter_v2/db_lookup.py` with 3-tier derivation from existing `slot_synonyms` data. `wp-blocks.py` extended as unified data CLI. Hybrid blocks (8-15 estimated, set empirically by Phase 0.4 audit) get render.php migration to `echo $content` for block-equivalent slots. Acceptance: per-section ≤5% pixel-diff × 3 viewports + Bean visual sign-off.

## Skills + tooling

**SGS WordPress domain skills (MUST be invoked when touching framework code):**
- `/sgs-wp-engine` — SGS Framework workflow + sgs-db.py knowledge base. Invoke at session start before ANY work in `plugins/sgs-blocks/` or `theme/sgs-theme/`.
- `/wp-block-development` — block.json + render.php + deprecations. For `src/blocks/<slug>/` edits.
- `/wp-plugin-development` — plugin architecture + hooks + Settings API. For `plugins/sgs-blocks/sgs-blocks.php` + `includes/` edits.
- `/wordpress-router` — first-line if unsure which WP skill applies.

**Session-wide skills:** `/autopilot` (SessionStart auto-injects), `/brainstorming`, `/research`, `/strategic-plan`, `/lifecycle`, `/gap-analysis`, `/qc-council` (pre-commit gate per blub.db 255), `/qc-inline`, `/verify-loop`, `/delegate`, `/subagent-driven-development`, `/dispatching-parallel-agents`, `/capture-lesson`, `/sgs-clone --debug-trace`, `/handoff`.

**DB query tools:**
- `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` — sgs-framework.db (block schemas + attrs + slot_synonyms + property_suffixes)
- `python ~/.claude/hooks/wp-blocks.py` — current dual-DB CLI (sgs-framework.db + uimax db); Phase 0.2 extends with 6 new subcommands
- `/uimax` skill — query uimax db directly. SGS-WP-relevant tables: `naming_conventions`, `attribute_gap_candidates`, `recognition_log`, `animations`, `component_libraries`, `patterns`.

**Pre-rewrite code lives in:** `plugins/sgs-blocks/scripts/orchestrator/converter_v2/` (NOT `plugins/sgs-blocks/scripts/orchestrator/`). Key files: `convert.py` (the walker; lift_subtree at L3387; F1 helper at L3916; ATOMIC_TAG_MAP at L698; ARRAY_LIFT_PATTERNS at L1008), `db_lookup.py` (extended in Phase 0.1 with `equivalent_block_for()`).

**`assign-canonical.py` lives at:** `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` (NOT in orchestrator/). Wired via `sgs-update-v2.py:stage_1_sgs_codebase_scan()` tail per D50.

## Canonical references (read in order before starting)

1. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — the spec end-to-end, especially §3 FRs + §7 phases + §15 council findings table
2. `.claude/architecture.md` decisions #4 + #12 + #14 + #15 (post Commit 0.0 rewrite)
3. `.claude/specs/00-naming-conventions.md` §3.1 — BEM canonical signal
4. `.claude/cloning-pipeline-flow.md` + `.claude/cloning-pipeline-stages.md` — stage map (post Commit 0.0 update)
5. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — diagnostic artefacts
6. `pipeline-state/mamas-munches-homepage-2026-05-26-012625/` — empirical baseline (mean 63.0%)
7. Recent feedback files in `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/` — `feedback_phases_never_ship_as_single_commits.md` (blub.db 288) + `feedback_grep_verify_handoff_diagnostic_premises.md` (output-only inference trap)

## Binding rules (every commit obeys all R-22-1 through R-22-13)

Per Spec 22 §6. Highlights gating every commit:

- **R-22-1** — DB-first, no hardcoded dicts; the only permitted dict-like constant is `SKIP_TOP_LEVEL_TAGS` (3 entries)
- **R-22-3** — Three permitted walker exceptions, no others (atomic-tag swap / chrome-skip / top-level container wrap)
- **R-22-4** — Pixel-diff measurement gates every commit; commit message cites predicted vs actual delta
- **R-22-5** — Phases never ship as single commits; Phase 1 walker rewrite is split into 5 commits
- **R-22-9** — Universal mechanisms, no per-block hyperfocus
- **R-22-11** — Verify rendered output, not internal metrics
- **R-22-12** — `/qc-council` pre-commit gate enforced via `pipeline-stage-gate.py` hook
- **R-22-13** — Bean visual sign-off is co-authoritative with pixel-diff

## Commit cadence

Each commit follows the cadence per R-22-5 / blub.db 288:

1. **Implement** (via `/subagent-driven-development` for non-trivial work; model picked via `/delegate`)
2. **Pre-commit gate** (`/qc-council` for high-leverage commits marked ⚡; `/qc-inline` for low-risk)
3. **Living-docs updates** per Spec 22 §8 cross-doc impact list
4. **Measurement** — `/sgs-clone --deploy-target page:144 --debug-trace` + Stage 11 pixel-diff capture
5. **Commit message** citing predicted vs actual delta
6. **`/verify-loop`** 2-attestation per load-bearing claim

### Phase 0 — Foundation (DB + tooling + cross-doc sync)

| # | Sub-task | Model | Skills | Predicted impact | Risk |
|---|---|---|---|---|---|
| 0.0 | **Cross-doc sync — the ratification gate.** Archive Spec 16, update architecture.md (decisions #14/#15/#17/#19), cloning-pipeline-flow.md + stages.md Stage 4, Spec 00 §3.1 link, decisions.md (D78-D83), parking.md (close 6, add P-LEGACY-GAP-CANDIDATES-MIGRATION), docs-registry.yaml, state.md, root CLAUDE.md, .claude/CLAUDE.md, plugins/sgs-blocks/CLAUDE.md, skill files. ~11 docs touched. No code change. | Inline (main thread) | `/docscore` per touched doc | Spec 22 status flips draft → active | LOW (docs only) |
| 0.1 | **DB enrichment + golden corpus.** Extend `/sgs-update assign-canonical.py` to backfill `canonical_slot` across the 1,214 NULL rows. Verify `slot_synonyms` coverage for content-bearing roles. Golden corpus at `.claude/specs/22-golden-corpus.json` (10-15 representative SGS blocks × expected canonical_slot/role per attr). Backfill script regression-tests against golden corpus. **Pre-rewrite DB snapshot** to `pipeline-state/_snapshots/sgs-framework-pre-spec22.db`. | Sonnet via `/delegate` | `/qc-council` ⚡ pre-commit; sgs-db verification | Tier B + Tier C usage drives toward zero | MEDIUM (semantic correctness depends on backfill quality) |
| 0.2 | **wp-blocks.py extension.** Add 6 new subcommands per Spec 22 FR-22-8 (`equivalent-block`, `recognition-log --write`, `naming-convention`, `gap-candidate --write`, `animation`, `component-library-match`). Adversarial test corpus: positive cases (block-equivalent attrs return correct slug) + negative cases (behavioural attrs return null) + edge cases (hyphen-compound BEM elements). | Sonnet via `/delegate` | `/qc-council` ⚡; unit tests | Single CLI interface for converter data queries | MEDIUM (single point of failure for walker — adversarial tests mitigate) |
| 0.3 | **pixel-diff.py hardening.** Fix the 60px vertical-anchor offset identified in hero-clone-poc validation. Detect chrome at top of SGS screenshot, crop before comparison. Add `--wait-fonts` flag. | Sonnet | `/qc-inline`; regression test on hero-clone-poc (page 29) | Measurement script reports honest pixel-diff (down from 54.5% to expected ≤5% on visually-matching content) | LOW |
| 0.4 | **Hybrid-block audit.** Query `equivalent_block_for()` against every block × every attr. Filter via FR-22-2.2 role-exclusion. Produce roster at `.claude/reports/2026-05-26-hybrid-block-roster.md`. Sets Phase 2 scope (estimated 8-15 blocks). | Haiku via `/delegate` (mechanical) | sgs-db verification; `/qc-inline` | Phase 2 scope locked empirically | LOW |

### Phase 1 — Walker rewrite (5 commits per R-22-5)

| # | Sub-task | Model | Skills | Predicted delta | Risk |
|---|---|---|---|---|---|
| 1.1 | **Pre-rewrite snapshot.** Archive current `convert.py` to `_retired/convert_pre_spec22.py`. No behavioural change. Living-docs note pending rewrite. | Inline | `/qc-inline` | No change | LOW |
| 1.2 | **Atomic-tag map migration.** Replace hardcoded `ATOMIC_TAG_MAP` (convert.py:698-704) with DB-driven `db.atomic_tag_map()` per Spec 22 Appendix B (§14). 2-tier resolution: `slot_synonyms.html_semantic_tag` then `blocks.replaces` reverse-walk. | Sonnet via `/delegate` | `/qc-inline`; `/sgs-clone --debug-trace` | No pixel-diff change (structural cleanup) | LOW |
| 1.3 | **ARRAY_LIFT_PATTERNS retirement + array-of-objects resolution.** Implement FR-22-2.5. Delete `ARRAY_LIFT_PATTERNS` dict. Walker treats array attrs as sibling-class container; per-item resolution via FR-22-1 BEM signature. | Sonnet via `/subagent-driven-development` | `/qc-council` ⚡; per-section measurement | social-proof + featured-product show modest improvement (array attrs now resolve universally) | MEDIUM |
| 1.4 | **Universal walker (THE core rewrite).** Delete `lift_subtree_into_block_attrs` (convert.py:3387), `_lift_inner_blocks` (convert.py:1350), F1 fallback (convert.py:3916), 9-branch walk(), per-block hardcoded branches (convert.py:1532, 1550). Implement single-path walker per FR-22-3 + Appendix A. New `equivalent_block_for()` + `resolve_slug_from_bem()` + `lift_behavioural_attrs()` + `emit_sgs_container_wrapping()` in `converter_v2/db_lookup.py`. LRU cache. | Sonnet via `/subagent-driven-development` (one implementer + 2 reviewers) | `/qc-council` ⚡ pre-commit (multi-rater); `/verify-loop`; `/sgs-clone --debug-trace` full Stage 11 | brand drops substantially toward ≤5%; product-card double-render closes (-30 to -50pp from current); other body sections drop ~5-15pp | ⚡ HIGH |
| 1.5 | **Phase 1 measurement + halt/proceed decision.** Full-page `/sgs-clone --auto-section --debug-trace`. Every body section measured. If all 7 sections × 3 viewports ≤5%, Phase 1 closes; proceed to Phase 2. If any section > 5%, halt + diagnose (Phase 1.5 territory if structural; per-block fix if isolated). | Inline | `/qc-council` ⚡ Stage 5 multi-rater | Phase 1 acceptance gate evaluated | ⚡ HIGH (gate evaluation) |

### Phase 2 — Hybrid block render.php migration (parallel-session-eligible per FR-22-6.1)

Roster from Phase 0.4 audit. One commit per block.

| # | Sub-task | Model | Skills | Predicted delta | Risk |
|---|---|---|---|---|---|
| 2.1 | **sgs/product-card render.php migration.** Deprecate image / productName / description / packSizes / priceLarge / priceNote attrs (ctaText/ctaUrl already deprecated). render.php emits `echo $content` for block-equivalent slots. deprecated.js v2 covers all 6 attr shapes. Editor smoke test. | Sonnet (parallel-eligible per FR-22-6.1) | `/qc-council` ⚡; editor smoke test | product-card pixel-diff drops further toward ≤1% | MEDIUM |
| 2.N | **Per-block migrations for the rest of the audit roster** (~7-14 more blocks). Each commit per FR-22-6 procedure. Hero / cta-section / mobile-nav need their own design-pass commit before render.php edit (170+ attrs each). | Sonnet via `/dispatching-parallel-agents` per FR-22-6.1 coordination protocol | `/qc-council` ⚡ per block; per-section measurement | Hybrid roster empties | MEDIUM |
| 2.Z | **Cross-client validation.** Run Spec 22 walker against Indus Foods homepage. Any new slot_synonyms / naming_conventions rows added are checked against Mama's pipeline to verify no regression. | Inline | `/qc-council`; cross-client smoke test | Cross-client gaps surfaced + DB rows added | MEDIUM |

### Phase 3 — Legacy cleanup (sequential AFTER Phase 2 closes per FR-22-6.1)

| # | Sub-task | Model | Skills | Predicted delta | Risk |
|---|---|---|---|---|---|
| 3.1 | **Subprocess-call cleanup.** Delete legacy converter-helper subprocess calls across `sgs-clone-orchestrator.py` + `wp-pre-merge-gate.py`. All callers route through unified `wp-blocks.py` per FR-22-8. | Haiku via `/delegate` | `/qc-inline`; grep verification | No pixel-diff change (cleanup only) | LOW |
| 3.2 | **Archive `essence_match_detector.py`** to `_retired/`. | Haiku via `/delegate` | `/qc-inline` | No change | LOW |
| 3.3 | **Bulk-delete `_retired/` folder** once Phase 4 acceptance closes (reversible via git history). | Haiku via `/delegate` | `/qc-inline` | LoC -200 to -500 in tracked code | LOW |

### Phase 4 — Acceptance gate

| # | Sub-task | Model | Skills | Predicted delta | Risk |
|---|---|---|---|---|---|
| 4.1 | **Mama's full-page acceptance.** `/sgs-clone --auto-section`. Every body section measured. Phase 4 closes when every body section ≤5% × 3 viewports per FR-22-7 AND Bean visual sign-off accepted. | Inline | `/qc-council` ⚡ Stage 5 | All 7 body cells × 3 viewports ≤5% | ⚡ HIGH (gate evaluation) |
| 4.2 | **Cross-client validation.** Same gate on Indus Foods + helping-doctors (where available). Regression check against Mama's. | Inline | `/qc-council`; cross-client measurement | Spec 22 validated cross-client | MEDIUM |
| 4.3 | **Phase 4 close `/qc-council` Stage 5 + `/handoff`.** | Inline + multi-rater council | `/qc-council`; `/handoff`; living-docs update across all touched docs | Phase 1 of Spec 22 closed | ⚡ HIGH |

### Phase 5 — decisions.md + mistakes.md pruning (post-acceptance)

| # | Sub-task | Model | Skills | Predicted delta | Risk |
|---|---|---|---|---|---|
| 5.1 | **decisions.md walk.** Each D-entry referencing retired Spec 16 surfaces: prune if entirely about retired surface + no longer load-bearing; modernise if underlying decision still relevant. | Sonnet via `/delegate` | `/qc-inline`; `/docscore` | Stale entries cleaned | LOW |
| 5.2 | **mistakes.md walk.** Same treatment. | Sonnet via `/delegate` | `/qc-inline`; `/docscore` | Stale entries cleaned | LOW |

## Phase 1 acceptance gate

**Per-section ≤5% × 3 viewports for all 7 body sections (21 cells must each hit ≤5%).** Plus Bean visual sign-off on cropped-pair artefacts.

Per blub.db row 256 — mean averaging hides hidden failures. Each cell measured independently against 2026-05-26 baseline:

| Section | 375 baseline | 768 baseline | 1440 baseline | Phase 1 target |
|---|---|---|---|---|
| hero | 86.5% | 64.1% | 69.6% | ≤5% × 3 |
| trust-bar | 37.0% | 24.6% | 33.1% | ≤5% × 3 |
| featured-product | 75.0% | 72.6% | 87.9% | ≤5% × 3 |
| brand | 53.2% | 50.9% | 46.0% | ≤5% × 3 |
| ingredients-section | 53.2% | 41.1% | 54.0% | ≤5% × 3 |
| gift-section | 55.1% | 44.8% | 47.6% | ≤5% × 3 |
| social-proof | 75.2% | 72.6% | 70.2% | ≤5% × 3 |

Plus: NO section regresses >2pp from baseline at Commit 1.4 measurement; ≥5 of 7 sections drop ≥40pp toward target; hero attribute-count parity gate evaluated at Commit 1.4 (cheat removal must not regress hero).

## Phase 1.5 (subsequent phase — stretch goal)

After Phase 4 closes at ≤5%, Phase 1.5 diagnoses the residual ~4pp of pixel-diff noise:
- pixel-diff.py vertical-anchor fix (the 60px chrome offset from hero-clone-poc).
- Chrome cropping for live-page screenshots.
- Font-load timing (wait for document.fonts.ready).
- Theme.json-token vs inline-value cascade rendering precision.
- Image-dimension rounding noise.

Phase 1.5 work is empirically scoped after Phase 1 measurements arrive. May ship as amendment to Spec 22 or sibling spec.

## Pre-empts (carried from prior Phase 1 plan + Spec 22 risks)

1. **Phase 0.1 backfill mis-tags behavioural attr as block-equivalent.** Golden corpus catches at Commit 0.1 regression test.
2. **Phase 1.4 walker rewrite drops sections.** Pre-rewrite DB snapshot at Commit 0.1 enables true rollback. Stage 11 measurement at Commit 1.4 catches immediately.
3. **Hybrid block render.php migration breaks existing posts.** deprecated.js shim per FR-22-6 step 4.
4. **Parallel Phase 2 agents collide on render-helpers.php.** FR-22-6.1 coordination protocol forbids shared-file edits.
5. **Phase 3 cleanup ships before Phase 2 closes.** FR-22-6.1 enforces sequencing.
6. **Phase 1 ≤5% gate not met by Commit 1.5.** R-22-13 Bean visual sign-off provides co-authoritative closure path; sections stuck at 6-8% but visually matching may still provisionally close pending Phase 1.5 measurement fix.

## Dispatch bindings (verbatim in every Agent cold prompt)

Per `feedback_dispatched_agents_no_commit_authority.md` (blub.db row 240):

- **Binding A — NO commit authority.** Agent returns uncommitted artefacts.
- **Binding B — `/sgs-clone` per sub-change** (NOT bundled). Stage 11 auto-captures.
- **Binding C — Living-docs + /capture-lesson inline per change.** Update mistakes/decisions/parking/cloning-pipeline-flow/architecture as work fires.
- **Binding D — TodoWrite breakdown + per-sub-task status.**
- **Binding E (Phase 2 only) — No shared-file edits.** Per FR-22-6.1: agents may not edit `includes/render-helpers.php`, `includes/lucide-icons.php`, or any other shared include. Halt + return "needs shared helper: X" if required.

## What success looks like (one line)

After Phase 1 close: every body cell on Stage 11 measures ≤5%, the universal walker is shipped per Spec 22 with exactly 3 permitted exceptions, the hybrid-block roster is empty, all 20 catalogued Spec 16 cheats are removed, `convert.py` is reduced ~50-60% in LoC, and `/sgs-clone` produces deterministic ≤5% per-section output on any client mockup with a clear path to ≤1% via Phase 1.5.
