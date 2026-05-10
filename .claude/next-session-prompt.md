recommended_model: opus

You are a senior SGS WordPress framework architect specialising in cross-platform CSS naming conventions, parallel subagent dispatch for bulk skill-body propagation, and the SGS Framework's downstream skill ecosystem. Today's job: ship Phase 4 of the convention rollout plan (bulk propagation of the SGS-prefixed BEM rule across ~48 surfaces).

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-10-convention-rollout-execute"

Read `.claude/handoff.md` and `.claude/plan.md` for full context, then `.claude/plans/phase-4-bulk-propagation.md` for batch breakdown.

## Where You Are

Plan: `.claude/plan.md`
Current phase: Phase 4 — Bulk propagation across ~48 surfaces (Phases 1+2+3+5 shipped 2026-05-10, committed at `2858e97d`)
Progress: 4/8 phases complete — estimated 50%
Next task: Phase 4 batch B2 (5 design-generation skills) — first parallel subagent dispatch

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Architectural questions if Phase 4 ambiguity surfaces (e.g. translating Spec 13 §5 lingua-franca-conversion into a `/uimax-*` skill body) |
| `/gap-analysis` | Grade Phase 4 subagent output diffs before merging — apply lens 6 motivation/values check on each batch |
| `/lifecycle` | NOT inline this session — `~/.claude/.lifecycle-mode-bulk.json` already permits SKILL.md edits |
| `/research` | Only if a novel naming-convention question surfaces (unlikely; Spec 13 is locked) |
| `/strategic-plan` | Inline replan if a batch needs re-scoping mid-session |
| `/dispatching-parallel-agents` | Phase 4 batch dispatches (B2-B9) |
| `/subagent-prompt` | Phase 4 cold prompt drafting — every batch |
| `/qc-inline` | After every Phase 4 subagent batch returns — non-negotiable |
| `/sgs-wp-engine` | Central authority for any draft / clone / block decisions |
| `/uimax` | Verify after Phase 4 batch B4 lands the lingua-franca-conversion rule into uimax skill bodies |
| `/handoff` | Session close |

## MCP Servers & Tools

| Tool | Use for |
|---|---|
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate <SKILL.md>` | After every Phase 4 skill body edit; require ≥90%. Genuine failures here (unlike rename-pass over-reaches in pre-existing under-spec skills) |
| `python ~/.agents/skills/ui-ux-pro-max/scripts/update-db.py regenerate-csvs` | After ANY uimax DB write (architectural invariant) |
| `python plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` | Atomic validate-then-write to uimax for any new artefact rows |
| `python C:/Users/Bean/.claude/hooks/blub-db-unlock.py` | If `/api/learning` POST hangs |
| GitHub MCP | If creating PRs for Phase 4 — but commit-to-main is fine for framework-level changes per branch discipline rule |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Phase 6 mockup rewrite + Phase 8 deploy (later sessions) |
| `design-reviewer` | Phase 8 capture comparison images — Bean keeps verdict per lesson 221 |

NEVER write a fallback option in any agent brief that lets the proof step be skipped (lesson 221).

## Tasks (in order)

### Task 1: Phase 4 Batch B2 — 5 design-generation skills (~25-35 min wall-time via 5 parallel Sonnet subagents)
Read `.claude/plans/phase-4-bulk-propagation.md` batch B2. Use `/subagent-prompt` to draft cold prompts for each of the 5 skills. Use `/dispatching-parallel-agents` to fan out. Each subagent must extend its skill body to honour Spec 13 (validate `.sgs-` prefix on emitted class names; reject non-conforming on production runs). After return: `/qc-inline` per output. Grep each diff for `selector_strategies` / `value_extractor` / `fallback_strategy` references before merging. Run sgs-skillscore on every edited SKILL.md; require ≥90%.

### Task 2: Phase 4 Batch B3 — `/sgs-clone` Stage 0 pre-flight gate (~30 min)
Add the validation regex from Spec 13 §7.1 to `/sgs-clone` Stage 0. Hard reject on production; soft warning under `--draft-mode`; `--legacy` bypass for pre-rule mockups. Test: write a non-conforming draft, run `/sgs-clone` on it, confirm Stage 0 rejects. Then add `--draft-mode` flag and confirm soft warning.

### Task 3: Phase 4 Batch B4 — `/uimax-*` skills lingua-franca-conversion (~45 min wall-time via 5 parallel Sonnet subagents)
The 5 `/uimax-*` skills (scrape, sgs-scrape-pattern, mood-board, scrape-animation, classify-naming) need their bodies extended to honour Spec 13 §5. Source-convention class names get converted to SGS-BEM as primary at write time; original convention preserved as `equivalent_implementations` sibling row with `convention=<source-slug>`. Use `/subagent-prompt` per skill; every prompt must reference `uimax_write.py` as the canonical write chokepoint.

### Task 4: Phase 4 Batches B5-B9 (remaining propagation)
Read each batch in the phase-4 plan. Dispatch in parallel where possible; sequentialise if shared files. After all batches close, run a project-wide grep for the regex `\b(kebab-semantic|hardcoded class)\b` to catch missed surfaces.

### Task 5: (Optional) Begin Phase 6 Mama's mockup migration
If 60-90 min context budget remains after Task 4, begin Phase 6 batch 1 (hero section). Use `--legacy` flag on `/sgs-clone` for first-pass bypass while the migration pattern is being validated. Otherwise mark Phase 6 as next-next-session.

## Guardrails

- DO write to `.claude/` not project root
- DO NOT use em-dashes anywhere (Bean preference; do not regress)
- DO NOT add `--resume` flags or stage-resume infrastructure (lesson 215)
- DO grep subagent outputs for required field references before merging (Phase 4 KJC #1)
- DO use `uimax_write.py` for any uimax DB write (Hard Rule 7 Rosetta Stone)
- DO run `update-db.py regenerate-csvs` after any uimax DB write
- DO run `/qc-inline` after each Phase 4 subagent batch returns
- DO NOT regress to per-block hand-coding in slot-filler.py
- The skillscore hook will surface false-positive ≥90% failures on any cross-reference edit in pre-existing under-spec skills (e.g. email-html-builder lacks Goal/HARD GATE). For Phase 4 these are likely real (you're editing the skill body itself) — fix them. For pure cross-reference renames, accept the false signal and proceed.
