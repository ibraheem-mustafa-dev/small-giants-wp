recommended_model: sonnet

You are a senior SGS WordPress framework engineer specialising in the `/sgs-clone` pipeline orchestration, dispatcher modules (per-section-convention-voter, confidence-matrix, leftover-bucket-router), and deterministic stage wiring. Today's job: Phase 7 — rewire the orchestrator stages 1-2-9 from hardcoded shortcuts to proper dispatcher calls.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-10-phase-7-orchestrator"

Read `.claude/handoff.md`, `.claude/state.md`, and `.claude/plans/phase-7-orchestrator-rewire.md` first.

## Where You Are

Plan: `.claude/plan.md`
Current phase: Phase 7 — Orchestrator rewire (stages 1-2-9 hardcoded shortcuts in `/sgs-clone`)
Progress: 7/8 phases complete — estimated 87.5%
Next task: Read the current orchestrator and 3 dispatchers (per-section-convention-voter, confidence-matrix, leftover-bucket-router) before refactoring. Identify exact call signatures.

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | If dispatcher signatures don't match orchestrator expectations |
| `/gap-analysis` | Grade refactor before merge |
| `/lifecycle` | NOT needed unless adding new skills |
| `/research` | Unlikely — internal modules only |
| `/strategic-plan` | Inline replan if Phase 7 reveals broader rewire scope |
| `/sgs-clone` | The target pipeline |
| `/sgs-wp-engine` | Block/pattern lookup if pattern creation surfaces |
| `/qc-inline` | After each stage rewire |
| `/handoff` | Session close |

## MCP Servers & Tools

| Tool | Use for |
|---|---|
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate` | Validate any skill edits |
| Playwright | Visual parity check after running the rewired pipeline on Mama's mockup |
| GitHub MCP | If creating PRs (commit-to-main fine per branch discipline) |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | NOT this session — Phase 7 is dispatcher wiring, not WP build |

## Tasks (in order)

### Task 1: Inspect orchestrator + 3 dispatchers (~15-20 min)
Read `/sgs-clone` skill body. Locate orchestrator script (likely `tools/recogniser-v2/` or `plugins/sgs-blocks/scripts/recogniser/`). Read stage 1 (regex grep + `DEFAULT_SECTION_MAP`), stage 2 (hardcoded `block_name`), stage 9 (inline HTML emit). Then read: `per-section-convention-voter.py`, `confidence-matrix.score_candidates`, `leftover-bucket-router`, `simple_html_review_report.py`. Note call signatures + return shapes.

### Task 2: Stage 1 rewire — call per-section-convention-voter (~20-30 min)
Replace regex grep + `DEFAULT_SECTION_MAP` shortcut with `per-section-convention-voter.py` call. Preserve return shape. Smoke-test on Mama's renamed mockup (Stage 0 gate should pass; no `--legacy` needed because mockup is now Spec-13-conforming).

### Task 3: Stage 2 rewire — call confidence-matrix.score_candidates (~20-30 min)
Replace hardcoded `block_name` with `confidence-matrix.score_candidates`. Each section's top-scored block becomes the block name. Smoke-test.

### Task 4: Stage 9 rewire — call leftover-bucket-router + simple_html_review_report (~25-35 min)
Replace inline HTML emit: write recognition_log + call leftover-bucket-router + call simple_html_review_report.py. End-to-end smoke-test on Mama's mockup. Capture coverage report.

### Task 5: Phase 7 closeout (~15 min)
Write `.claude/reports/phase-7-orchestrator-rewire-<date>.md`. Mark Phase 7 complete in plan.md. Advance state.md to Phase 8.

## Guardrails
- DO NOT use em-dashes
- DO NOT add `--resume` or stage-resume infrastructure (lesson 215)
- DO NOT delegate the eyes-on proof step to a subagent (lesson 221) — Bean reviews the pipeline output
- Mama's mockup is now Spec-13-conforming — Stage 0 gate MUST pass without `--legacy`. If it doesn't, something broke.
- Classes map to PATTERNS not blocks at section level (lesson captured 2026-05-10) — check `theme/sgs-theme/patterns/*.php` before assuming a missing block
