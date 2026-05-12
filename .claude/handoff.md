---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-12-spec-15-phase-4-shipped
session_date: 2026-05-12
recommended_model: opus
---

# Session Handoff — 2026-05-12 (Spec 15 Phase 4 + 4.5 shipped)

## Completed This Session

1. **Phase 4 — Draft convention enforcement (commit `8599faf3`).** Stage 0.1 BEM-compliance lint + Stage 0.5 token-usage lint integrated into `/sgs-clone` orchestrator with three modes (strict halts, draft warns, legacy bypasses). Pre-commit hook fires on `sites/*/mockups/*.{html,htm,css}` with `SGS_LINT_STRICT=1` env var for hard-gate mode, auto-resolving the client variation from the staged path. `/ui-ux-pro-max` + `/innovative-design` SKILL.md updated with HARD RULE for SGS-BEM + theme.json tokens. 37 long-tail gap candidates closed to 0 (7 new canonical slots: header, feature, bar, star, tab, quote, role; 11 mobile-nav `show*` → `boolean-visibility`; 11 instance-config flagged). FR38 + FR39 closed.

2. **Phase 4.5 — Additive token discovery + Font Library (commit `55a6d73e`).** Mid-phase architectural pivot per operator framing "cloning preserves intentional bespoke detail — small differences ARE the design". Token lint rewritten as additive: non-token values become `NewTokenCandidate` rows in `TokenWritePlan`, written to client variation via `apply_write_plan()`. `--no-new-tokens` flag preserves legacy verdict mode for back-compat. `max-width` / `min-width` route to a dedicated `_snap_max_width()` matcher against `settings.layout.contentSize` + `wideSize` + `settings.custom.maxWidth.*`. Variation overlay merges client tokens before discovery so existing tokens dedupe. Font Library scaffold registers all 1,923 uimax `google_fonts` as `wp_register_font_collection( 'sgs-google-fonts' )` with zero frontend cost (theme.json untouched; Issue #39332 avoided). First real use on Mama's mockup: 3 → 0 candidates with variation overlay (Fraunces deduped to slug `heading`), then 2 new tokens written (spacing-28 + narrow-420). Idempotent re-apply 0 added.

3. **Phase 4.5 fixes from 3-rater QC panel (commit `3c2c07b7`).** Sonnet (strict critic) returned fix-then-ship with 2 ship-blockers + 6 concerns. Fixed: orchestrator `v.class_token` AttributeError (Violation dataclass field is `token`); missing `--variation` CLI flag (pre-commit hook would have produced systematic false-positive candidates); `_in_skip_tag` dead code in bem-lint.py; stale max-width docstring; innovative-design / ui-ux-pro-max routing contradiction. Plus shorthand line/col precision (per-part Occurrence with adjusted col), border / outline shorthand routing (`_discover_border_shorthand` handles per-word dispatch), `.htaccess` gzip + 30-day cache directives.

4. **Phase 4.5 polish from `/qc-inline` pass (commit `a9b9b1c3`).** Two final items: Stage 0.5 logs explicit fallback when `--client X` supplied but variation JSON missing; parser-aware column tracking replaces the `len(prop) + 2` whitespace heuristic — `_flush_decl` captures the value's exact column offset, the declarations tuple becomes 5-tuple `(prop, val, line, col, value_col_offset)`, every per-part shorthand column lands pixel-exact regardless of whitespace variation.

5. **Living-doc closeout (commit `1173792a`).** Spec 15 §11 Phase 4 + 4.5 sections marked SHIPPED with full success-criteria checklists. Master execution plan extended with full actuals table (~3 hr inline + ~7 min parallel fanout vs 4 hr estimate) + lessons fed forward to Phase 5. `state.md` advanced to `spec-15-phase-5-clone-pipeline-e2e` with full phase_4_summary. `decisions.md` captures the additive-mode design principle. `plugins/sgs-blocks/CLAUDE.md` Backend Integrations extended with Font Library Collection row. Auto-memory updated: new `feedback_cloning_preserves_intentional_bespoke_detail.md` indexed in MEMORY.md.

## Current State

- **Branch:** main at `1173792a`
- **Tests:** 11/11 token-lint self-tests pass; 5/5 BEM-lint self-tests pass
- **Build:** n/a (Python lint scripts; PHP `php -l` clean on `class-font-collection.php`)
- **Uncommitted changes:** none (handoff/next-session-prompt updates land in this commit)
- **Drift validator:** PASS (0 violations across 1,343 attrs)
- **Hero baseline:** `tests/golden/hero-extraction-baseline.json` PASS preserved end-to-end
- **Spec 15 progress:** Phases 1, 2, 3, 3.5, 4, 4.5 shipped; Phase 5 next

## Known Issues / Blockers

- Skillscore rubric mismatch: command files (`~/.claude/commands/*.md`), agent files (`~/.claude/agents/*.md`), and reference-style mini-skills (polish, bolder, colourise, distill, etc.) graded against full-skill criteria. 24 of 45 files sit below 90% — pre-existing baseline noise, not caused by Phase 4 edits. Future fix: skill-type classifier in sgs-skillscore.

## Next Priorities (in order)

1. **Phase 5 sub-phase 5a — Gap detection** (~1-2 hr). Wire `/sgs-clone` Stage 9 (coverage report) to write `attribute_gap_candidates` + `functionality_gap_candidates` (FR8 tables, schema exists from Spec 14 P2). Drift validator must stay PASS.

2. **Phase 5 sub-phase 5b — Staged scaffolding** (~2 hr). Block scaffolding output lands in a staging directory; operator review interface (FR15) writes ambiguous-case prompts back to `recognition_log`. Use `/wp-block-development` for new block-type emission patterns.

3. **Phase 5 sub-phase 5c — Lingua-franca conversion** (~1-2 hr). External scrape sources enter via `/uimax-sgs-scrape-pattern`. Source classes preserved as siblings in `equivalent_implementations`; SGS-BEM primary written. Per Spec 15 §8.1 + Rosetta Stone Hard Rule.

4. **Phase 5 sub-phase 5d — WP integration wiring** (~2 hr). Stage 7 block-comment markup serialisation with InnerBlocks (FR12); Stage 6 block.json schema validation (FR6). Use `/wp-block-themes` for theme.json contract validation.

5. **Phase 5 sub-phase 5e + 5f — Autonomy + visual QA + acceptance harness** (~2-3 hr). Visual parity ≤ 1% pixel diff at 3 viewports via Playwright; regions > 0.5% surfaced as thumbnails. Acceptance harness: 5 canonical-mutation-boundary checks green + ≥ 90% block attribute coverage on Mama's mockup.

## Files Modified

| File | What changed |
|---|---|
| `plugins/sgs-blocks/scripts/lints/bem-lint.py` | NEW — BEM-compliance lint, 3 modes, 5 self-tests |
| `plugins/sgs-blocks/scripts/lints/token-lint.py` | NEW — additive token discovery, TokenWritePlan, apply_write_plan, variation overlay, max-width matcher, border-shorthand, 11 self-tests |
| `plugins/sgs-blocks/scripts/lints/__init__.py` | NEW |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | Stage 0.1 + 0.5 wiring with 3 modes + client variation auto-resolution + explicit fallback log |
| `plugins/sgs-blocks/includes/class-font-collection.php` | NEW — registers WP 6.5+ Font Library collection |
| `plugins/sgs-blocks/scripts/build-font-collection.py` | NEW — idempotent manifest builder from uimax google_fonts |
| `plugins/sgs-blocks/assets/font-collections/google-fonts.json` | NEW — 1,923 fonts manifest |
| `plugins/sgs-blocks/assets/font-collections/.htaccess` | NEW — gzip + 30-day cache |
| `plugins/sgs-blocks/sgs-blocks.php` | 3-line Font_Collection wiring |
| `plugins/sgs-blocks/CLAUDE.md` | Font Library Collection row + notes |
| `theme/sgs-theme/styles/mamas-munches.json` | spacing-28 + narrow-420 tokens written |
| `.git/hooks/pre-commit` | Stage 0.1 + 0.5 section + variation auto-resolution (NOT versioned) |
| `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` | Phase 4 + 4.5 SHIPPED; FR38 + FR39 closed |
| `.claude/plans/spec-15-master-execution-plan.md` | Phase 4 + 4.5 actuals table + lessons forward |
| `.claude/state.md` | Advanced to Phase 5; phase_4_summary written |
| `.claude/decisions.md` | Additive-mode principle captured |
| `.claude/parking.md` | P-S15-STYLEVAR-GEN + P-S15-PAIRINGS-PICKER parked |
| `.claude/reports/phase-4-5-token-discovery-2026-05-12.md` | NEW phase report |
| `~/.agents/skills/ui-ux-pro-max/SKILL.md` | HARD RULE for SGS-BEM + theme.json tokens |
| `~/.claude/skills/innovative-design/SKILL.md` | Routing role clarified |
| `~/.claude/projects/.../memory/feedback_cloning_preserves_intentional_bespoke_detail.md` | NEW |
| `~/.claude/projects/.../memory/MEMORY.md` | Indexed new feedback file |
| `~/.claude/skills/sgs-wp-engine/sgs-framework.db` | 7 new slots; 26 attrs canonicalised; 11 mobile-nav re-roled |

## Notes for Next Session

- **Use Opus as orchestrator + delegate leaves.** Phase 5 sub-phases will dispatch heavily to Sonnet/Haiku/Cerebras per `/delegate`. Opus handles strategic gates, multi-rater QC synthesis, architectural decisions; leaf work goes to lower-cost models.
- **Multi-rater QC BEFORE commit.** Per `feedback_qc_before_commit.md`. Sonnet caught 2 ship-blockers this session that the main-thread inline checks missed.
- **The additive-mode pivot is locked.** Captured to auto-memory. Any new lint, matcher, or token-related infrastructure on the clone pipeline defaults to ADDITIVE. Don't reintroduce snap-to-nearest verdict mode by default.
- **Phase 5 deliverables go DIRECT to main per `feedback_always_merge_to_main.md`.** No feature branches unless cross-cutting. Per-sub-phase commits: `feat(spec-15-p5-<sub>): <description>`.
- **Parallel fanout works well for independent sub-tasks.** Phase 4.5 shipped ~30 min faster via parallel Sonnet dispatch.

## Next Session Prompt

~~~
You are a senior WordPress block developer + Python pipeline engineer specialising in the SGS Framework, Gutenberg blocks, and Spec 15's deterministic draft-to-SGS converter. This session ships Phase 5 — Clone pipeline E2E (the largest single phase, ~8-10 hr).

Read `.claude/handoff.md`, `.claude/state.md`, and `.claude/CLAUDE.md` for full context. The plan is at `.claude/plans/phase-5-clone-pipeline-e2e.md` (6 sub-phases: 5a Gap detection → 5b Staged scaffolding → 5c Lingua-franca → 5d WP integration → 5e Autonomy + visual QA → 5f Acceptance harness).

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-12-spec-15-phase-4-shipped"`

## Where You Are

Plan: `.claude/plans/phase-5-clone-pipeline-e2e.md`
Current phase: Phase 5 — Clone pipeline E2E (the largest single phase)
Progress: Phases 1, 2, 3, 3.5, 4, 4.5 shipped — 6 of 7 phases complete (~83%)
Next task: Phase 5 sub-phase 5a — Gap detection wiring

## Execution Strategy — Opus orchestrator + per-branch delegation

**You are on Opus.** Opus owns orchestration, multi-rater QC synthesis, architectural decisions, mid-flight pivots, `/qc-inline` between sub-phases. Opus does NOT do leaf code-gen.

**Cost shape:** Opus orchestrates ~10% of tokens; subagent leaves take ~90%.

### Dispatch primitives (when to use which)

- **`/delegate`** — call BEFORE every dispatch. Returns the cheapest model that will succeed (Sonnet / Haiku / Cerebras / Gemini Flash). Never hardcode model. Surface the recommendation in chat.
- **`/subagent-driven-development`** — implementer + spec-reviewer + quality-reviewer triad for any new module / new code surface.
- **`/dispatching-parallel-agents`** — fanout when 2+ tasks are independent (different files, no shared state). Per `feedback_parallel_dispatch_shared_files.md` — NEVER run two subagents on the same file.
- **`/subagent-prompt`** — write the cold prompt BEFORE every Agent dispatch. 7-section template (Role / Task / Context / Instructions / Output / Criteria / KJCs) mandatory for non-trivial dispatches.
- **`/qc-inline`** — run BETWEEN sub-phases against the actual artefact. Subagent reports are claims, not evidence.

### Model routing per Phase 5 sub-phase

| Sub-phase | Primary subagent model | Pattern | Why this model |
|---|---|---|---|
| **5a Gap detection** | Sonnet (implementer) + Haiku (spec-reviewer) | `/subagent-driven-development` triad | Sonnet builds module; Haiku validates against FR8 schema |
| **5b Staged scaffolding** | Sonnet (implementer + quality-reviewer) | Triad + **fanout per block-type** via `/dispatching-parallel-agents` | Per-block-type scaffold builds are independent — 3-5 way Sonnet fanout cuts wall time. Cerebras-eligible per scaffold if simple |
| **5c Lingua-franca** | Sonnet (implementer) + Gemini Flash (multi-convention classification) | Triad + Gemini Flash rater | Gemini Flash's 1M context ideal for whole scrape samples + cross-convention dictionaries |
| **5d WP integration** | Sonnet (implementer); wp-blockmarkup + wp-devdocs MCPs validate | Triad with WP-aware reviewer; **2-way fanout**: markup serialisation + block.json validation independent | Sonnet for WP-specific code-gen; MCPs are verifiers not subagents |
| **5e Visual QA** | design-reviewer agent + Gemini Flash (vision rater) | `/dispatching-parallel-agents` for design-reviewer + Gemini Flash + Python pixel-diff | Gemini Pro Vision EXCLUDED (503 retry). Gemini Flash handles vision at 1M context; design-reviewer owns human-eye criteria |
| **5f Acceptance harness** | 3-rater panel: Sonnet + Haiku + Gemini Flash | `/dispatching-parallel-agents` for panel + Cerebras for mechanical SQL (FREE) | Multi-rater BEFORE commit per `feedback_qc_before_commit.md` |

### Reserved fallbacks

- **Gemini Pro 3.1** EXCLUDED until 503 retry loop fixed.
- **Cerebras** (qwen-3-235b, FREE, 12 tool rounds, 16K output cap): bounded SQL migrations, single-file mechanical edits. Not for review.
- **Haiku** primary for fast sanity / schema validation; secondary reviewer in triads.

### When NOT to dispatch

Per `feedback_dont_delegate_the_test_of_unproven_work.md` — if the milestone is to PROVE something works (live deploy, hero baseline, drift validator), Opus owns the proof step. Never delegate; never accept agent text reports as evidence.

### Verification cadence per sub-phase (MANDATORY)

Three-layer verification on every Phase 5 sub-phase. Skipping any layer breaks the contract from `feedback_qc_before_commit.md` + master plan Verification Discipline Rules 1 + 2.

- **Layer 1 — `/qc-inline` after every subagent dispatch.** Subagent reports are claims, not evidence. Run `/qc-inline` against the actual artefact (file contents, DB row state, test stdout, screenshot).
- **Layer 2 — `/qc-inline` at end of every sub-phase** against the sub-phase's success criteria. Confidence ≥ 90 to advance. Drift validator + hero baseline must stay PASS.
- **Layer 3 — 3-rater `/qc` panel BEFORE every commit.** `/dispatching-parallel-agents` to Sonnet (strict) + Haiku (sanity) + Gemini Flash (vision / breadth). ≥ 2/3 `pass/ship` to commit. Sonnet `partial` or `fail` treated as real — apply fixes inline, re-run until clean, THEN commit.
- **Phase 5 final gate (after 5f only) — full `/qc` PIPELINE, not /qc-inline.** Durable per-stage artefacts in `pipeline-state/qc/<run_id>/` because the Phase 5 deliverable surface is too large for inline.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural decisions per sub-phase (5a-5f) |
| `/gap-analysis` | Grade each sub-phase deliverable before commit |
| `/lifecycle` | If any sub-phase requires skill / agent / pipeline edits |
| `/research-check` | Quick lookups (Playwright pixel-diff APIs, WP block markup serialisation) |
| `/strategic-plan` | Confirm sub-phase 5a-5f ordering before kickoff |
| `/sgs-wp-engine` | SGS Framework operations + QA pipeline (mandatory for SGS work) |
| `/wp-block-development` | Block emission patterns in sub-phase 5b + 5d |
| `/wp-block-themes` | theme.json contract validation in sub-phase 5d |
| `/visual-qa` | Sub-phase 5e visual parity check at 3 viewports |
| `/qc-inline` | Between sub-phases — Opus has context to verify inline |
| `/qc` | Full pipeline output review at sub-phase 5f (acceptance harness) |
| `/delegate` | Per-branch model picker — call before every dispatch |
| `/dispatching-parallel-agents` | Fanout independent sub-phase work |
| `/subagent-driven-development` | Implementer + 2 reviewers for new sub-phase modules |
| `/handoff` | End-of-session handoff generation |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `playwright` MCP | Multi-viewport screenshots + pixel-diff for sub-phase 5e visual parity |
| `wp-blockmarkup` MCP | Validate WP block-comment markup serialisation in sub-phase 5d |
| `wp-devdocs` MCP | Verify WP hook + filter signatures during sub-phase 5d wiring |
| `mcp__a11y__audit_webpage` | Sub-phase 5e a11y audit on generated output |
| Python sqlite3 | DB queries against sgs-framework.db for gap detection (5a) |
| Git CLI | Per-sub-phase direct-to-main commits per always-merge-to-main rule |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Block emission + theme.json contract work in 5b + 5d |
| `design-reviewer` | Visual parity review in 5e against the live draft |
| 3-rater QC panel (Sonnet + Haiku + Gemini Flash) | Sub-phase 5f acceptance harness — BEFORE final commit per qc-before-commit rule |

## Research Approach

Phase 5 is mostly architectural + integration work. Skip broad research unless sub-phase 5e (visual parity) needs Playwright pixel-diff library research — then `/research-check` for the current API. For sub-phase 5d, `/library-docs` for WP block-markup serialisation if the existing `wp-blockmarkup` MCP doesn't cover an edge case.

---

**Every task below ends with the 3-layer verification cadence (Layer 1 mid-dispatch /qc-inline + Layer 2 end-of-sub-phase /qc-inline + Layer 3 3-rater /qc panel before commit). Only sub-phase 5f swaps Layer 3 for the full /qc pipeline.**

## Task 1: Phase 5 sub-phase 5a — Gap detection

Sonnet (implementer) + Haiku (spec-reviewer) via `/subagent-driven-development`. Wire `/sgs-clone` Stage 9 to write `attribute_gap_candidates` + `functionality_gap_candidates` (FR8). Layer 1 `/qc-inline` after Sonnet returns. Layer 2 `/qc-inline` against 5a success criteria. Layer 3 3-rater `/qc` panel before `feat(spec-15-p5a-gap-detection): <desc>` commit.

## Task 2: Phase 5 sub-phase 5b — Staged scaffolding

Sonnet triad via `/subagent-driven-development` + **per-block-type fanout** via `/dispatching-parallel-agents` (3-5 way Sonnet, independent files). Staging dir + FR15 operator interface + recognition_log writes. Layer 1 `/qc-inline` per parallel branch. Layer 2 + 3 as above, commit `feat(spec-15-p5b-staged-scaffolding): <desc>`.

## Task 3: Phase 5 sub-phase 5c — Lingua-franca conversion

Sonnet triad + Gemini Flash rater for multi-convention classification breadth (1M context). External scrape sources → `/uimax-sgs-scrape-pattern` → SGS-BEM primary + source-convention siblings in `equivalent_implementations`. Per Spec 15 §8.1. Layer 1-3 verification, commit `feat(spec-15-p5c-lingua-franca): <desc>`.

## Task 4: Phase 5 sub-phase 5d — WP integration wiring

Sonnet triad with WP-aware reviewer + **2-way fanout**: Stage 7 markup serialisation (FR12) and Stage 6 block.json schema validation (FR6) are independent. `wp-blockmarkup` MCP for markup roundtrip; `wp-devdocs` MCP for hook signatures. Layer 1-3 verification, commit `feat(spec-15-p5d-wp-integration): <desc>`.

## Task 5: Phase 5 sub-phase 5e — Autonomy + visual QA

`/dispatching-parallel-agents` for design-reviewer agent + Gemini Flash vision rater + Python pixel-diff (independent branches). Visual parity ≤ 1% pixel diff at 3 viewports via Playwright; regions > 0.5% surfaced as thumbnails. Gemini Pro Vision EXCLUDED — Gemini Flash handles vision. Layer 1 includes Opus personally inspecting ≥ 3 surfaced regions per `feedback_dont_delegate_the_test_of_unproven_work.md` — visual proof is operator-owned. Layer 2 + 3 as above, commit `feat(spec-15-p5e-visual-qa): <desc>`.

## Task 6: Phase 5 sub-phase 5f — Acceptance harness + final QC

Cerebras for mechanical SQL writes. 5 canonical-mutation-boundary checks + ≥ 90% block attribute coverage on Mama's mockup. **Layer 3 here is the FULL `/qc` PIPELINE, not `/qc-inline`** — the Phase 5 deliverable surface is large enough to warrant durable per-stage artefacts in `pipeline-state/qc/<run_id>/`. Multi-rater (Sonnet + Haiku + Gemini Flash). Commit `feat(spec-15-p5f-acceptance-harness): <desc>` then `/handoff` to close Phase 5.

## Guardrails

- Drift validator must stay PASS after every sub-phase: `python plugins/sgs-blocks/scripts/drift-validator/validate.py`
- Hero `--verify-against tests/golden/hero-extraction-baseline.json` must stay PASS
- Additive token discovery default — do NOT reintroduce snap-to-nearest verdict mode (captured in auto-memory)
- Mama's mockup token state must stay clean — re-discovery with variation overlay should return 0 candidates
- 3-rater QC panel BEFORE each sub-phase commit per qc-before-commit rule
- Direct commits to main per always-merge-to-main rule, format: `feat(spec-15-p5-<sub>): <description>`
~~~
