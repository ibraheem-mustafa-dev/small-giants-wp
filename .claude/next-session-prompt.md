---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-14-step-5-rosetta-stone
recommended_model: sonnet
last_verified: 2026-05-14
update_triggers:
  - "/handoff run with a clear next-task"
registry_entry: docs-registry.md row 6
---

You are a senior WordPress block-pipeline integration engineer continuing Phase 6 v2 of the SGS deterministic draft-to-SGS cloning pipeline. Steps 6 (small wins), 7 (full E2E + pixel-parity measurement), and 8 (commit + close) remain. The pipeline is now fully wired through Step 5; Step 7 is the first run that will measure parity with everything live.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-14-step-5-rosetta-stone"

recommended_model: sonnet

Read `.claude/handoff.md` and `.claude/state.md` for full context, then work through these priorities. **Multi-rater QC panel (Sonnet strict + Haiku sanity + Gemini Flash third-eye) BEFORE every commit per `feedback_qc_before_commit.md` — locked rule from Step 5 onwards.**

## Where You Are

Plan: `.claude/plans/phase-6-pattern-fidelity-v2.md`
Current phase: Phase 6 v2 — Steps 4a–4k + 4-QC + 5 ✅ COMPLETE; Steps 6/7/8 remain
Progress: 12 / 15 plan rows shipped (80%)
Next task: Step 6a — theme.json caching at Stage 0

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Any architectural choice surfaces during Step 6 or Step 7 triage |
| `/gap-analysis` | Pre-commit grading on Step 6c (new `composer_fallback.py` module) |
| `/lifecycle` | Only if a skill/agent/pipeline file needs changing |
| `/research` | Unfamiliar API/library question |
| `/strategic-plan` | NOT needed — v2 plan already exists |
| `/sgs-wp-engine` | SGS DB queries via `sgs-db.py`; touch tests on retired DB tables |
| `/qc-inline` | After each Step 6 sub-task before the 3-rater panel |
| `/visual-qa` | Step 7's pixel-parity measurement at 375/768/1440 viewports |
| `/handoff` | At session close |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright MCP | Step 7 multi-viewport screenshot capture for pixel-parity measurement |
| github MCP | Only if reviewing pre-Step-5 commit history |
| `~/.claude/hooks/local-search.py` | Pre-Step-6 check for any retired-table references in the codebase before DROP |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Step 7 deploy + WP REST page creation for Mama's mockup if needed |
| `code-reviewer` (feature-dev) | Sonnet rater in the 3-rater panel before each commit |

## Research Approach

Not required for Step 6 (well-scoped mechanical changes). For Step 7, if pixel-parity fails at a specific viewport and the cause isn't obvious from the screenshots, invoke `/research-check` against the specific CSS / layout pattern that's drifting. Don't speculate — measure first, search second.

---

## Task 1: Step 6a — theme.json caching (~10 min)

Load `theme.json` + variation overlay ONCE at Stage 0 of `/sgs-clone` into a shared `run_ctx` dict. Downstream stages (4.5 token_resolver, 4.5 variation_router, 4c supports_writer, +REGISTER) read from `run_ctx['theme_json']` instead of re-reading from disk. Mutations from Step 4b's `_reflect_new_token_in_theme_json` already work on the in-memory dict — caching at Stage 0 means a single source of truth across the whole run. Update `cloning-pipeline-flow.md` Stage 0 block to note the cache.

**Verification:** existing 109 tests stay green; drift validator 0/1349; tooling-map drift-check passes. Run 3-rater panel before commit.

## Task 2: Step 6b — Retire 5 dead DB tables (~15 min)

DROP TABLE for `sections_detected`, `extraction_cache`, `block_opportunities`, `weaknesses`, `animations` (sgs-framework.db ONLY — leave `uimax.animations` intact). Update `/sgs-update` Stage 1 to stop recreating them. Run `python ~/.claude/hooks/local-search.py "sections_detected extraction_cache block_opportunities weaknesses"` first to confirm no live readers exist. Update `db-tables-map.md` to mark the 5 tables RETIRED.

**Verification:** sgs-db.py query against the dropped tables errors as expected; `/sgs-update` Stage 1 runs without recreating them; existing tests stay green. 3-rater panel before commit.

## Task 3: Step 6c — Extract compose_atomic_pattern to composer_fallback.py (~10 min)

Create `plugins/sgs-blocks/scripts/orchestrator/composer_fallback.py`. Move `compose_atomic_pattern` + its helpers (`_emit_core_heading`, `_emit_core_paragraph`, `_emit_sgs_button`, `_BUTTON_HINT_RE`) out of `sgs-clone-orchestrator.py`. Orchestrator imports via the existing lazy-load pattern. Function name + signature unchanged. Add to `tooling-map.md`.

**Verification:** the deferred-fallback path in `stage_4_5_6_7_8_extract` still produces atomic block markup for unmatched sections; existing 109 tests stay green. 3-rater panel before commit.

## Task 4: Step 7 — Full E2E + measure pixel parity (~30 min)

Run:
```bash
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --auto-section --client mamas-munches --page homepage \
  --media-map sites/mamas-munches/research/sandybrown-media-map.json \
  --mode draft --no-promote-new-blocks \
  --clone-url "https://sandybrown-nightingale-600381.hostingersite.com/<test-page>/"
```

Capture pixel-diff at 375 / 768 / 1440 via `/visual-qa` Quick mode. Hard pass: ≤1% diff at all 3 viewports. Verify all 14 modules show evidence of having fired (gap-writer rows; token_resolver hits; Rosetta Stone validator fired on every uimax write; no regression in hero golden test). If acceptance fails, triage which module didn't fire as expected — fix incrementally, don't retreat to the v1 framing. 3-rater panel before any fix commit.

## Task 5: Step 8 — Commit + close Phase 6 (~15 min)

Final commit on `main` if all Step 7 gates passed: `feat(spec-15-p6-v2-8): Phase 6 closed — pixel-parity gate green at 3 viewports`. Update `state.md`: `current_phase: phase-extra-1-cross-platform-output-extension`. Update `phase-6-pattern-fidelity-v2.md` Step 8 row ✅. Run `/handoff` to write the next session's prompt for Phase-extra 1.

## Guardrails

- 3-rater panel BEFORE every commit (locked rule). Local 4-gate (pytest + drift-validator + drift-check + AST) is the floor, not the ceiling.
- DO NOT reintroduce IP-firewall framing in any new code. Trigger phrases to self-check: license / IP / copyright / provenance / redistribution / firewall between / promotion path / external_patterns.
- DO NOT add `--resume` flags, stage-resume infrastructure, or partial-run continuation to any pipeline script. Sessions are atomic; the handoff/next-session-prompt flow is the only session-bridging mechanism.
- DO update `tooling-map.md` + `cloning-pipeline-flow.md` + `decisions.md` in the SAME commit as each Step 6 sub-task per docs-registry §3.
- If pixel parity fails at Step 7 and root cause isn't obvious, `/qc-inline` FIRST before adding fallback code. Surface anomalies; don't paper over.
