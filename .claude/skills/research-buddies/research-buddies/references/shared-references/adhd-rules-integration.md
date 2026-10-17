# ADHD Rules 1–14 Integration (shared reference)

Source of rules: `~/.claude/rules/adhd-collaboration.md`. This shared reference is consumed by skills that produce planning artefacts (strategic-plan, phase-planner, spec-writer, project-init) so the rule-to-checkpoint mapping has a single source of truth.

## The 14 rules → planning checkpoints

| Rule | Where it fires in planning skills |
|------|-----------------------------------|
| 1 — Full map, then ranked options (also covers negotiated decisions) | Phase Header / Plan Header shows full plan or full phase map upfront; high-level decisions and the KJC section follow Options → Recommendation → Why, Bean picks from the menu and never invents |
| 2 — Smallest first action | First `[SESSION-START]` step (or first action in any plan) has `Time: ≤5 min` and `Deps: none` |
| 3 — Re-entry after a gap | Cold-Entry field on every SESSION-START names state + plan + reasons (USP) |
| 4 — Motivation on 7+ day projects | Plan Header / Phase Header USP line is the motivation surface (top benefit, next action, impact); restated at each SESSION-START via Cold-Entry |
| 5 — Verify before calling it done | Every step's Test block Happy layer IS the verification statement; pre-declared before Action |
| 6 — Scope check after 5+ file edits | QA gates every 3–5 steps act as scope checkpoints |
| 7 — Structural fixes for reliability questions | HARD GATEs (phase scope required, all Test layers filled, Check field commandable) enforced by skillscore + docscore, not "I'll try harder" |
| 8 — Refuse vague briefs | HARD GATE: phase / plan scope must be named (outcome + deliverable) — otherwise route out |
| 9 — Research before recommending | Research Pre-Gate fires when unknowns exist — no recommendation without grounded research. Use `/research-check` (2-Sonnet tier) → escalate to `/research-buddies` or `/research-council` |
| 10 — Mirror brain dumps | If input is a long brain-dump-shaped spec, invoke `/brain-dump` BEFORE Stage 1 |
| 11 — Scores ship with fixes | Docscore grade + readiness scores + any failing criteria listed with fix paths, priority-ordered, defaulting to the bulk-fix path |
| 12 — Closure over cheerfulness | Plans ship with both "done" criteria AND open threads tracked in the relevant plan/spec plus a LEDGER.md pointer — never vague |
| 13 — Mark wins genuinely | Each step's Outcome becomes the "win" message; QA gate passes are running-count opportunities |
| 14 — Session sprawl | `[SESSION-START]` + `[HANDOFF]` markers + ~40-tool-call rule of thumb prevent sprawl. Default: dispatch parallel subagents from current session over recommending fresh-session switches |

Self-contained questions and Problem → Effect → Solution explanations (formerly rules 9 and 17) live in `~/.claude/CLAUDE.md`'s Communication section, not in the numbered rule set.

## Consumers

Skills that should reference (not duplicate) this file:
- `strategic-plan` — overall plan-level integration
- `phase-planner` — phase-level integration
- `spec-writer` — spec/scoping integration
- `project-init` — onboarding integration

When editing one of these skills, point to this shared reference rather than duplicating the table.
