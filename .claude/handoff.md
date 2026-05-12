---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-12-spec15-ratified-plan-v0.3
session_date: 2026-05-12
recommended_model_next: opus
recommended_model_score: 9/12 (novelty 3 + adversarial 2 + context 2 + design 2)
---

# Session Handoff — 2026-05-12 (Spec 15 ratified + master execution plan v0.3 multi-rater pass/ship)

## Completed This Session

1. **Spec 14 P3 + P4 shipped** in opening hours: P3 4-layer catalogue (commits e0f26ec5 + 10819cbb + 833fed21 — 38 compositions, 20 roles, 67 blocks with canonical slots derived; QA gate 9/9 pass; ghost-row deletion bug caught + reversed by Bean) + P4 extract.py refactor (commit 8e2e427a — 1569→630 LOC, hero override extracted to overrides/hero.py, regression baseline preserved bit-exact).

2. **Spec 15 written** at `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` (871 lines). Unified architecture: end-goal deterministic draft→SGS converter + QA pipeline. Absorbs Specs 12+13+14 in full. Five architectural layers L0-L5. FR1-FR26 preserved from Spec 14 + FR27-FR40 new for canonicalisation work.

3. **6 Q decisions locked** (Spec 15 §12B): `subheading` lowercase + `buttonSecondary` noun-first; DB-as-source-of-truth + optional block.json override; WP block deprecation for polymorphic media; WP precedence blocks>elements>root; defer override schema to Phase 6; 1% visual parity tolerance with 0.5-1% surfaced for review.

4. **Multi-rater /qc panel ran 4 times** (Spec 15 v0.1 → v0.2 + plan v0.2 → v0.3). Sonnet pattern emerged as strict critic that catches what Haiku/Gemini Flash skim past. v0.2 had Sonnet partial/78 with 4 concrete autonomy gaps; all 4 fixed in v0.3 where Sonnet flipped to pass/91 + Gemini Flash pass/100.

5. **Asset inventory + lifecycle** added as Spec 15 §12E. Every file/script/data/skill tagged BUILT/PLANNED/TO-RETIRE/DATA-SOURCE/REFERENCE. Surfaces 6 overlap classes for cleanup (v1 recogniser scripts, fingerprint-builder outputs, ATTR_TO_CSS dict, TRUTH-SPEC.md, master plan, v1 fingerprints data).

6. **Migration executed**: `.claude/specs/12-*.md`, `13-*.md`, `14-*.md` + `.claude/plans/master-spec14-build-plan.md` → `.claude/scratch/absorbed/` with absorption headers preserving commit-history continuity. Living docs (CLAUDE.md + state.md) updated to point at Spec 15 as truth.

7. **Master execution plan v0.3** at `.claude/plans/spec-15-master-execution-plan.md` (612 lines). Phases 1-5 each step has: model assignment, time estimate, success criteria, /qc-inline verification command. Phase 1 has 7 ready-to-paste concrete subagent prompts. Phase 5 sub-phases (5a-5f) list inline entry preconditions. Session timer Step 0 pinned as mandatory.

8. **Verification discipline established** (plan §Verification Discipline): 4 rules — subagent reports are claims-not-evidence (always /qc-inline), multi-rater /qc at phase end (≥2/3 pass to ship), 6 named stop conditions, recovery paths per dispatch failure mode. Includes session timer init for SC6 mechanical testability.

9. **Next-session-prompt rewritten** at `.claude/next-session-prompt.md` for Phase 1 cold-start. Step 0 timer init + cold reads (~10 min) + 9-step Phase 1 execution + skills/tools/done-when.

## Current State

- **Branch:** main at a68f6221
- **Tests:** n/a (Phase 1 will introduce the first pytest suite at step 1.7)
- **Build:** n/a (no build pipeline yet for the framework-scripts side)
- **Uncommitted changes:** decisions.md append pending (this gate)
- **Deploy status:** unchanged from previous session (palestine-lives.org live; Spec 15 Phase 1 work has not touched production yet)

## Known Issues / Blockers

- **Gemini Pro 3.1 excluded from QC panels** — 503 retry loop unresolved upstream. Plan uses Haiku + Sonnet + Gemini Flash trio.
- **Cerebras 12-tool-round ceiling** is a known cap for the 2 Cerebras dispatches in Phase 1; fallback to Sonnet is documented in Rule 4 of the verification discipline.

## Next Priorities (in order)

1. **Phase 1 Step 0 (mandatory)** — initialise session timer via the 3-line bash block in `.claude/next-session-prompt.md`. Without this Rule 3 SC6 (step-exceeds-3×-estimate halt) is structurally inert.

2. **Phase 1 Steps 1.1 + 1.2 (Cerebras)** — DB schema migration (3 CREATE TABLE + 6 ALTER COLUMN) + vocab seed (20 + 32 + 16 rows). Paste-ready prompts in plan §"Ready-to-dispatch prompts for Phase 1".

3. **Phase 1 Steps 1.3 + 1.4 (Sonnet)** — behavioural static analyser (render.php + save.js → output_signature) + canonical_slot/role/derived_selector backfill for 1343 attrs. Seeds from v1 fingerprints.json `attr_extractors`.

4. **Phase 1 Steps 1.5 + 1.6 (Sonnet)** — token value-matcher (ΔE2000 colour + percent-deviation spacing) + default-inheritance lookup against theme.json styles.elements / styles.blocks.

5. **Phase 1 Step 1.7 + 1.8 + 1.9** — pytest suite + feature-branch PR + multi-rater /qc panel. Gate ≥2/3 pass before PR merge.

## Files Modified

| File | What changed |
|---|---|
| `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` | NEW — 871 lines, unified architecture spec v0.2 APPROVED |
| `.claude/plans/spec-15-master-execution-plan.md` | NEW — 612 lines, phase-by-phase execution plan v0.3 multi-rater pass/ship |
| `.claude/next-session-prompt.md` | Rewritten for Phase 1 cold-start with Step 0 timer init |
| `.claude/state.md` | current_phase → `spec-15-phase-1-foundation`; current_step rewritten |
| `.claude/CLAUDE.md` | Specs row points at Spec 15 as truth doc |
| `.claude/decisions.md` | Appended 2026-05-12 section: 6 locked decisions + verification discipline + asset inventory approach + multi-rater QC pattern |
| `.claude/scratch/absorbed/12-DRAFT-TO-SGS-PIPELINE.md` | MOVED from `.claude/specs/` with absorption header |
| `.claude/scratch/absorbed/13-DRAFT-NAMING-CONVENTION.md` | MOVED with absorption header |
| `.claude/scratch/absorbed/14-CLONING-PIPELINE-CATALOGUE.md` | MOVED with absorption header |
| `.claude/scratch/absorbed/master-spec14-build-plan.md` | MOVED from `.claude/plans/` |
| `plugins/sgs-blocks/scripts/fingerprint-builder/audit-attr-vocabulary.py` | NEW — v1 audit script |
| `plugins/sgs-blocks/scripts/fingerprint-builder/audit-attr-vocabulary-v2.py` | NEW — multi-suffix decomposition audit |
| `reports/attr-vocabulary-audit-2026-05-12.md` | NEW — 9 drift clusters surfaced |
| `reports/attr-vocabulary-audit-v2-2026-05-12.md` | NEW — 32 property suffixes + 16 modifier suffixes confirmed |
| `tools/recogniser-v2/extract.py` + `extract_strategies.py` + `utils.py` + `overrides/hero.py` + `overrides/__init__.py` | Spec 14 P4 ship — extract.py refactored 1569→630 LOC |
| `tests/golden/hero-extraction-baseline.json` | Spec 14 P4 — 74-attr hero baseline |

## Notes for Next Session

- **Bean's pushback during this session caused 3 real wins**: (a) ghost-row deletion of sgs/media + sgs/data-display was Bean catching me deleting his planned blocks — restored as status='planned'; (b) "this should be one architecture not three sideways specs" drove the Spec 15 unification; (c) "never trust subagent reports" drove the /qc-inline rule baked into every step.

- **Sonnet caught real autonomy gaps in plan v0.2 that other raters missed.** Trust Sonnet's `partial` over a 2-of-3 `pass` majority when Sonnet's analysis is concrete. The verification discipline (Rule 2) codifies this.

- **`/subagent-prompt` skill is the canonical method for Phase 2-5 dispatches** — don't hand-write the prompts. Phase 1 prompts are pre-written in the plan because they're the entry point; later phases use the skill.

- **Don't trust v1 fingerprints.json `block_type` field** — stale (P1 captured correction). It's still useful as a seed for `attr_extractors` data in Step 1.4. Use sgs-framework.db `blocks.type` for static/dynamic classification.

## Next Session Prompt

~~~
recommended_model: opus

You are a senior WordPress block + framework developer specialising in the SGS Framework. You build Gutenberg blocks, draft-to-SGS conversion tooling, and the multi-database mapping layer (sgs-framework.db + uimax) that links SGS-BEM canonical drafts to deterministic block.json + theme.json + cross-platform output. This session ships Spec 15 Phase 1 — Foundation: three new vocabulary tables, block_attributes extension, behavioural static analyser, token value-matcher, default-inheritance lookup.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-12-spec15-ratified-plan-v0.3"

## Where You Are

Plan: `.claude/plans/spec-15-master-execution-plan.md` (v0.3, multi-rater pass/ship)
Current phase: Phase 1 — Foundation
Progress: 0 / 5 phases complete (Spec 14 P1-P4 shipped count as already-delivered toward Phases 1-3 of Spec 15)
Next task: Phase 1 Step 0 — initialise session timer (mandatory before any dispatch)

## Step 0 — MANDATORY before any dispatch

```bash
mkdir -p .claude/scratch
date +%s > .claude/scratch/spec-15-session-start.txt
echo "Session start: $(date -Iseconds)" > .claude/scratch/spec-15-session-log.txt
```

Without this, the per-step 3×-estimate halt condition is structurally inert.

## Cold-start reads (~10 min)

1. `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` — focus on §3 (convention), §5 (rosetta stone), §11 (phases), §12E (asset inventory)
2. `.claude/plans/spec-15-master-execution-plan.md` — entire plan, especially "Ready-to-dispatch prompts for Phase 1" + Verification Discipline rules
3. `.claude/state.md` — current_phase = `spec-15-phase-1-foundation`

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | architectural decisions inside Phase 1 (rare — most should be locked in spec) |
| `/gap-analysis` | grade vocabulary table seed data against spec §3.4-3.6 verbatim |
| `/lifecycle` | only if any skill/agent/pipeline needs editing (don't expect to in Phase 1) |
| `/research` | only if /library-docs fallback to research-check needed for ΔE2000 lib edge cases |
| `/strategic-plan` | NOT needed — execution plan is already detailed; follow it |
| `/delegate` | MANDATORY before every Agent dispatch — returns model + fallback chain |
| `/subagent-prompt` | Use for Phase 2-5 cold prompts (Phase 1 prompts already pre-written in plan) |
| `/sgs-db` | inspect sgs-framework.db during steps 1.1-1.4 |
| `/wp-blocks` | query block.json schemas in step 1.3 |
| `/uimax` | inspect uimax design_tokens + naming_conventions |
| `/qc` | Phase 1 end at step 1.9 — multi-rater panel against Phase 1 deliverable |
| `/qc-inline` | MANDATORY after every subagent dispatch — verify the artefact, don't trust the report |
| `/handoff` | session close |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Python sqlite3 (stdlib) | DB migrations + queries in steps 1.1-1.4 |
| `colormath` lib (`pip install colormath`) | ΔE2000 colour distance in step 1.5 |
| BeautifulSoup4 | render.php + save.js parsing in step 1.3 static analyser |
| Playwright (CLI) | default-inheritance Playwright probe verification in step 1.6 |
| Pytest | unit tests in step 1.7 |
| `gh pr create` | open Phase 1 feature-branch PR after step 1.8 |
| Cerebras agent CLI | bounded code-gen for steps 1.1 + 1.2 (paths in plan §Ready-to-dispatch prompts) |
| Gemini Flash CLI | persona panel raters in step 1.9 multi-rater /qc |

## Agents to Delegate To

| Agent | When |
|-------|------|
| Sonnet subagent (general-purpose) | Steps 1.3 / 1.4 / 1.5 / 1.6 / 1.7 — code-gen with judgement |
| Haiku subagent (general-purpose) | Step 1.9 multi-rater /qc panel — one of three raters |
| Cerebras agent | Steps 1.1 + 1.2 — deterministic SQL + seed |

## Research Approach

Not expected in Phase 1. The spec + plan are detailed enough that no research needed. If `colormath` library has unexpected behaviour in step 1.5, drop to `/research-check` for a quick library-docs lookup before dispatching.

---

## Task 1: Step 0 + Step 1.1

Run the session timer init bash block. Then `/delegate route --task-shape code_gen --input-size-kb 4 --expected-output-tokens 2000` to confirm Cerebras routing. Paste the Step 1.1 prompt from plan §Ready-to-dispatch prompts. Run /qc-inline after Cerebras returns: query PRAGMA table_info for the 3 new tables + the 6 extended block_attributes columns.

## Task 2: Step 1.2 (Cerebras vocab seed)

Same dispatch pattern. /qc-inline: SELECT COUNT(*) from each table, expect 20 / 32 / 16. Spot-check 3 random rows.

## Task 3: Step 1.3 (Sonnet static analyser)

Use the pre-written prompt from plan §Ready-to-dispatch prompts. Dispatch via Agent tool model=sonnet. Post-dispatch /qc-inline: pick 3 blocks (hero, info-box, trust-bar), manually identify expected output_signature for one attribute each, query DB for what was written, diff. Also count rows with NULL output_signature; expect <5%.

## Task 4: Steps 1.4 + 1.5 + 1.6

Same dispatch + /qc-inline pattern. After step 1.4, run `audit-attr-vocabulary-v2.py` to confirm zero drift violations.

## Task 5: Steps 1.7 + 1.8 + 1.9 + handoff

Pytest suite (step 1.7) — run pytest with -v --cov; assert exit 0 + ≥80% coverage. Feature-branch PR (step 1.8) via gh pr create. Multi-rater /qc panel (step 1.9): Sonnet + Haiku + Gemini Flash in parallel; gate ≥2/3 pass/ship before PR merge. Then `/handoff` for Phase 2 cold-start.

## Guardrails

- Step 0 timer init is MANDATORY first. Without it SC6 is inert.
- Never trust subagent self-reports. Always /qc-inline the actual artefact.
- Multi-rater /qc at phase end with ≥2/3 pass gate. Sonnet's dissent overrides 2 other raters when concrete.
- Branch discipline: `feat/spec-15-p1-foundation` + PR. Commit format `feat(spec-15-p1): foundation — vocabulary tables + behavioural analyser`.
- Don't delete v1 fingerprints.json — it's Phase 1's seed data per Spec 15 §12E.
- Don't delete overrides/hero.py — Phase 3 territory, only after canonical-slot data validates against the hero regression baseline.
- UK English in code + comments + docs. No emojis. No mocking in tests.
- /delegate before every dispatch.
~~~

---

# Session Handoff — 2026-05-11 (Spec 14 approved + P1/P2 shipped + P3-P10 plans QC'd)

## Completed This Session

1. **Spec 14 v2.1 APPROVED** at `.claude/specs/14-CLONING-PIPELINE-CATALOGUE.md` (744 lines, 34 FRs). Two QC rounds (6 reviewers each), 14+ critical fixes folded in. Both NO-GO verdicts from round 1 closed. Title: "SGS Cloning Pipeline — Autonomous Draft-to-WordPress Conversion".

2. **Flow chart** at `.claude/cloning-pipeline-flow.md` — one-page visual for cold-session orientation.

3. **Phase 1 shipped** (commit `f467bc72`):
   - Reconciled architecture.md L151 + state.md L52 + /sgs-clone SKILL.md (9 references) against disk reality
   - Captured 9 static-block golden snapshots at `tests/golden/static-block-snapshots/` (6 pure-static + 3 hybrid; sgs-db as authoritative source, NOT v1 fingerprints which is frozen/stale)
   - FR18 decisions: 2 scripts retired (heuristic-fallback-builder, computed-style-passport), 2 built later (recursion-guard at P2, critical-fix-verification at P10)
   - Process lesson: 3 fabrications caught this session (critical-fix "broader scope" framing; recursion-guard "inline / existing"; v1 fingerprints data treated as authoritative). Captured in mistakes.md + decisions.md.

4. **Phase 2 shipped** (commit `15f4d6cf`):
   - uimax `component_libraries.is_gap_candidate` column added (FR7) — 211 rows default 0
   - `attribute_gap_candidates` + `functionality_gap_candidates` tables created with `status` lifecycle (FR8)
   - `plugins/sgs-blocks/scripts/recogniser/recursion-guard.py` shipped (140 LOC; self-test 3/3 PASS)
   - uimax DB backup at `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db.bak-spec14-p2`

5. **P3-P10 phase plans committed** at `.claude/plans/` (10 files, ~2,400 lines total):
   - master-spec14-build-plan.md (cross-phase view + parallelisation + risks)
   - phase-2-schema-and-recursion-guard.md (executed)
   - phase-3-catalogue-build.md, phase-4-extract-refactor.md, phase-5-gap-detection.md, phase-6-staged-scaffolding.md, phase-7-lingua-franca.md, phase-8-wp-integration-wiring.md, phase-9-autonomy-and-visual-qa.md, phase-10-acceptance-harness.md

6. **QC fleet on plans** (6 reviewers — Sonnet practical / Sonnet adversarial / Sonnet ecosystem / Haiku clarity / Gemini Flash / Gemini Pro): 0 unconditional GO, 1 NO-GO (Sonnet adversarial), 5 GO-WITH-CHANGES. **12 critical fixes applied inline before P2 commit:**
   - **rsync `--delete` catastrophe** (would wipe canonical framework) → per-file additive merge in P9 FR21
   - P4 || P8 parallel collision on extract.py → serialised in master dep map
   - P5 || P7 collision on orchestrator → serialised
   - Visual-qa threshold undefined → P9 Step 0 adds `visual_qa_config.json`
   - P10 idempotency check recursive deadlock → SQL query instead
   - Pipeline-state bloat at 50 clones → 30-day archive policy in FR15 pre-flight
   - P2 `__init__.py` race → verify existence (confirmed shipped phase 7)
   - DB pending-row leak on crash → stale-pending recovery (>24h → discarded) at pre-flight
   - P3 recursion-guard not wired → added to Step 6 DOM walk
   - Media orphan on visual-qa FAIL → cleanup attachments on FAIL branch
   - P3 file_path may be NULL → pre-flight resolves all paths
   - P4 golden file via file:// → local HTTP server for accurate cascade

## Current State

- **Branch:** main at `15f4d6cf`
- **Tests:** P1 QA gates PASS; P2 QA gates PASS; recursion-guard self-test 3/3
- **uimax schema:** migrated and backed up; 211 component_libraries rows have new column at default 0
- **Plans committed:** 10 plan files at `.claude/plans/` — execution-ready for cold-session pickup

## Next Priorities

1. **P3 — 4-layer catalogue build** (~5-6 hr). Plan at `.claude/plans/phase-3-catalogue-build.md`. Largest single phase; embarrassingly parallel via Step 6's 8-batch Sonnet fanout across 67 blocks.
2. P4 — extract.py refactor (~3-4 hr). Depends on P3.
3. P5 — gap detection (~2 hr). Depends on P3; can parallel with P4.
4. P6 — staged scaffolding (~6-8 hr; 4 sub-phases). Depends on P3, P4, P5.
5. P7 — lingua-franca conversion (~2 hr). After P5.
6. P8 — WP integration wiring (~4-5 hr). After P4.
7. P9 — autonomy + visual-qa gate (~3-4 hr). After P6 + P7 + P8.
8. P10 — acceptance harness (~45 min). After P9.

Total remaining: 22-28 hr across multiple sessions.

## Files Modified This Session

| File | What changed |
|---|---|
| `.claude/specs/14-CLONING-PIPELINE-CATALOGUE.md` | New; v2.1 approved; 744 lines |
| `.claude/cloning-pipeline-flow.md` | New; one-page visual ref |
| `.claude/plans/master-spec14-build-plan.md` | New |
| `.claude/plans/phase-1-doc-recon-and-snapshots.md` | New; executed |
| `.claude/plans/phase-2-...md` through `phase-10-...md` | New (9 plans) |
| `.claude/architecture.md` L151 | Reconciled (foundation-toolkit false claim removed) |
| `.claude/state.md` | current_phase advanced to spec-14-phase-3-catalogue-build |
| `.claude/decisions.md` | FR18 decisions + scopes + revisions logged |
| `.claude/parking.md` | Retired-scripts navigation entry added |
| `~/.claude/skills/sgs-clone/SKILL.md` | 9 references reconciled (outside repo) |
| `tests/golden/static-block-snapshots/` | 9 snapshot files + _manifest.json |
| `plugins/sgs-blocks/scripts/recogniser/recursion-guard.py` | New (140 LOC); self-test 3/3 PASS |
| uimax DB at `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` | Migrated; backup at `.bak-spec14-p2` |

## Notes for Next Session

- Plans are written for cold-session pickup — read `master-spec14-build-plan.md` + `phase-3-catalogue-build.md` and execute Steps 1-9 sequentially. Each step has all required fields.
- Step 6's fanout pattern: 8 parallel Sonnet subagents, ~8 blocks each, using `/subagent-prompt` to write the cold prompts. Don't try to do all 67 blocks inline — that's 67× the work.
- v1 fingerprints data (`tools/recogniser/data/fingerprints.json`) is FROZEN and stale; sgs-db is authoritative. Use v1 for `required_features` / `optional_features` semantic markers only.
- Hero baseline lives at `HERO_FINGERPRINT_SELECTORS` in `tools/recogniser-v2/extract.py`. P3 Step 7 verifies hero Layer 3 entry is a superset of this constant.
- P4 captures the golden hero extraction baseline BEFORE the refactor; that's a separate `tests/golden/hero-extraction-baseline.json` file (don't confuse with the static-block snapshots from P1).
- Process lesson: grep before claiming code exists. Caught three fabrications this session.

## Next Session Prompt

Loaded at `.claude/next-session-prompt.md` — opens directly onto P3 with the cold-start orientation list + invoke checklist + done-when criteria.
