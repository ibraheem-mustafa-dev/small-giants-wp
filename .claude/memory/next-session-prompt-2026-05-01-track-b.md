recommended_model: sonnet
session_tag: small-giants-wp-2026-05-01-track-b-pipeline-rubrics

You are a senior pipeline-rubric author specialising in v2-format end-goal rubrics for the SGS WordPress framework. Your goal this session is to finalise P2 (signoff pending), draft P3 (mockup→SGS) and P6 (QA→deploy) rubrics, then run a final QC pass across all 6.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-01-track-b-pipeline-rubrics"

## Where You Are

3 of 6 pipeline rubrics confirmed (P4, P7, P1). 1 of 6 drafted but Stage QC pending (P2). 2 of 6 not started (P3, P6).

Read in this order:
1. `.claude/handoff-track-b.md` (this Track B session's summary — full context)
2. `.claude/handoff.md` (parallel recogniser session — for P3 grounding only, do NOT act on its tasks)
3. `~/.claude/pipelines/.rubrics/audit-redesign-proposal.md`, `build-website.md`, `new-client-build.md`, `wp-to-sgs-migration.md` — pattern-match for style + framing
4. `~/.claude/skills/rubric-writer/SKILL.md`
5. `~/.claude/skills/gap-analysis/references/end-goal-rubric.md`

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | What each pipeline UNIQUELY owns; where its end-state differs from siblings |
| `/gap-analysis` | After all 6 confirmed — grade each against the v2 spec to catch drift |
| `/lifecycle` | Only if a rubric edit needs to flow into a sibling skill / pipeline JSON |
| `/research` | Skip unless a knowledge gap surfaces — rubrics ground in toolset spec + handoffs |
| `/strategic-plan` | Skip — work is sequential and small |
| `/rubric-writer` | Mandatory for each new rubric draft |

## MCP Servers & Tools

| Tool | What to use it for |
|------|--------------------|
| Gemini Flash CLI (`gemini -p ... --model gemini-3-flash-preview`) | Stage QC reviewer — INLINE rubric content into prompt (sandbox blocks paths outside project) |
| Sonnet via Agent tool (`general-purpose` agent) | Stage QC reviewer — skill-eval + domain-practitioner personas |

## Agents to Delegate To

| Agent | When |
|-------|------|
| general-purpose (Sonnet) | Stage QC reviewer dispatch for P2/P3/P6 rubrics |

## Do NOT Use

- Cerebras qwen agent (`~/.claude/agents/cerebras-agent/agent.py`) — three consecutive failures this session (queue saturation, random file-ops, zero-byte outputs). Dropped from panel.

## Tasks

### Task 1: Finalise P2 (WP→SGS Migration)
Read `~/.claude/pipelines/.rubrics/wp-to-sgs-migration.md`. Build reviewer prompt with rubric INLINED. Dispatch Sonnet + Gemini Flash in parallel. Apply unambiguous fixes + expert-call on ambiguous. Set `bean_signoff: confirmed`.

### Task 2: Draft + sign off P3 (Draft → SGS, mockup input)
Save path: `~/.claude/pipelines/.rubrics/draft-to-sgs.md`. P3 uniquely owns: static mockup → fully responsive interactive site, PRESERVING designer intent while INVENTING missing viewports + states. Ground in `.claude/handoff.md` recogniser case study — validation errors, fidelity diff %, partial-success — do not speculate.

### Task 3: Draft + sign off P6 (QA → deploy pre-ship gate)
Save path: `~/.claude/pipelines/.rubrics/qa-to-deploy.md`. Cross-cutting — Council 4-reviewer pattern, rendered-DOM verification, every QA gate. Check parking entry P-3 to decide block-validation handling (Never Do vs criterion). Speed is part of the rubric (<5 min ideal).

### Task 4: Final QC pass
Read all 6 confirmed rubrics back-to-back. Catch contradictions, overlapping criteria, anchor-style drift. Apply expert-call edits as needed.

### Task 5: Update rubrics index
Create `~/.claude/pipelines/.rubrics/README.md` — one-line summary per rubric, canonical save paths, link to toolset spec.

## Guardrails

- Property-level (tool-agnostic) framing for every infrastructure anchor
- World-state anchors only — process language gets rewritten
- 6–10 criteria per rubric; 4 Lens 6 anchors; Never Dos grounded in real failure modes
- Inline rubric content into reviewer prompts
- Apply unambiguous fixes + expert-call on ambiguous in same turn (no decision-menu turn-burning per Bean's "you're the expert here" mandate)
- Parallel recogniser session's docs are NOT this session's responsibility
- All rubric files at `~/.claude/pipelines/.rubrics/` (global path, outside this repo)
