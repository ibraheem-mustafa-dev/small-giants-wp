---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-14-docs-registry-plus-step-4a
recommended_model: sonnet
last_verified: 2026-05-14
update_triggers:
  - "/handoff run with a clear next-task"
registry_entry: docs-registry.md row 6
---

You are a senior WordPress block-pipeline integration engineer continuing Phase 6 v2 of the SGS deterministic draft-to-SGS cloning pipeline. Mechanical wiring of pre-built modules into /sgs-clone orchestrator following the v2 plan exactly.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-14-docs-registry-plus-step-4a"

## Where You Are

Plan: `.claude/plans/phase-6-pattern-fidelity-v2.md`
Current phase: Phase 6 v2 - Step 4 module wiring (mechanical integration)
Progress: Step 4a (token_resolver) SHIPPED 2026-05-14; 12 steps remaining (4b-4k + Step 5 + Step 6 + Step 7 + Step 8)
Next task: commit prior-session work + start Step 4b (variation_router)

## Cold-Start Reading Order (per docs-registry §5)

Read in this order before doing anything else:

1. `.claude/state.md` - current phase + blockers
2. `.claude/handoff.md` - what just happened (2026-05-14 session)
3. `.claude/docs-registry.md` §3 update-trigger matrix + §5 cold-start order + §7 enforcement hooks
4. `.claude/cloning-pipeline-flow.md` - annotated visual flow (Stage 4.5 token_resolver now ✓)
5. `.claude/plans/phase-6-pattern-fidelity-v2.md` - active execution plan
6. `.claude/decisions.md` - last 2 entries (Step 4a + phase numbering)
7. On-demand: `.claude/tooling-map.md` (module APIs), `.claude/db-tables-map.md` (DB R/W), `.claude/skills-commands-map.md` (skill chain)

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural choice surfaces mid-wiring |
| `/gap-analysis` | After each step before marking complete |
| `/lifecycle` | Only if a skill/agent/pipeline file needs changing |
| `/research` | Unfamiliar API/library question |
| `/strategic-plan` | NOT needed - v2 plan already exists |
| `/sgs-wp-engine` | SGS DB queries via sgs-db.py |
| `/qc-inline` | After each wire-in for per-step verification |
| `/handoff` | At session close |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright MCP | Stage 8 visual QA verification when running full E2E in Step 7 |
| github MCP | Only if reviewing pre-Phase-5 history |

## Agents to Delegate To

| Agent | When |
|-------|------|
| wp-sgs-developer | Wiring needs deeper WP-block work than v2 plan describes |
| code-reviewer | After Step 4 completes, before Step 7 E2E |

## Tasks

### Task 1: Commit prior-session work (FIRST ACTION)

~14 files modified/new from 2026-05-14 session are uncommitted on `main` at `ed3942eb`. Use /commit-commands:commit. Message: `feat(spec-15-p6-v2): docs-registry + drift-check hook + Phase 6 v2 plan + Step 4a token_resolver wired`. Push to main per framework CLAUDE.md rule.

### Task 2: Step 4b - wire variation_router

Per `.claude/plans/phase-6-pattern-fidelity-v2.md` row 4b. Module at `plugins/sgs-blocks/scripts/orchestrator/variation_router.py`. Public API: `add_token(client_slug, role, slug, value)`. Insertion point: inside the token_resolver loop in sgs-clone-orchestrator.py (after section_token_resolutions iteration added in Step 4a). Call variation_router.add_token() when `is_gap_candidate=true` AND raw_value parses as a valid token-shape value. Soft-fail on exception. Add a `new_tokens_written` list of (role, slug) pairs to per_section_results.

Per-step verification (ALL must stay green):
- `python -m pytest plugins/sgs-blocks/scripts/orchestrator/test_variation_router.py -x`
- `python plugins/sgs-blocks/scripts/drift-validator/validate.py`
- `python .claude/hooks/tooling-map-drift-check.py`
- `python -c "import ast; ast.parse(open('plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py', encoding='utf-8').read())"`

### Task 3: Update truth docs in the SAME commit as the wire-in

Per docs-registry §3 update-trigger matrix, "Wire an unwired module into the live path" requires:

- `tooling-map.md` variation_router row: TESTS-ONLY -> YES with insertion-point detail
- `cloning-pipeline-flow.md` Stage 4.5 block: variation_router ✗ -> ✓ with wiring detail
- `decisions.md` append new entry for 2026-05-14 Step 4b

Commit message: `feat(spec-15-p6-v2-4b): wire variation_router into Stage 4.5 token-snap gap path`.

### Task 4: If time, continue to Step 4c

Wire `supports_writer` (+ `inheritance` transitive) before Stage 6 emission. Per v2 plan row 4c. Same verification + same doc-update discipline. Separate commit.

## Guardrails

- DO NOT skip pytest + drift-validator + drift-check + AST check after any wire-in
- DO NOT bundle multiple wire-ins into one commit - one module per commit for bisect isolation
- DO NOT inline new logic in sgs-clone-orchestrator.py - use the module's public API per "deterministic not inline" rule (Phase 6 v2 frontmatter)
- DO update tooling-map.md + cloning-pipeline-flow.md + decisions.md in the SAME commit as the wire-in (docs-registry §3 trigger)
- Theme.json + variation overlay already loaded in stage_4_5_6_7_8_extract (lines ~656-680). REUSE the `theme_json` variable already in scope - do NOT re-load.
- Hard pass criterion for Phase 6: ≤1% pixel diff at 375/768/1440. Don't lose sight during 11 remaining wire-ins.
- If you hit unexpected behaviour mid-wiring, run /qc-inline FIRST before adding fallback code. Surface anomalies; don't paper over.
