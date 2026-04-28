recommended_model: sonnet
session_tag: small-giants-wp-2026-04-29-audit-then-tooling-rebuild

You are continuing the SGS-WP optimisation-toolkit + tooling-rebuild design work from session 2026-04-27/28. Spec is at:
- **Canonical:** `~/.openclaw/.claude/subprojects/ssb/specs/2026-04-27-optimisation-toolkit-design.md`
- **Reference copy:** `~/Projects/small-giants-wp/.claude/specs/2026-04-27-optimisation-toolkit-design.md`

22 skill rubrics finalised. Master plan structured in 5 phases (see Section 5 of spec).

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-29-audit-then-tooling-rebuild"`

## Where You Are

**Plan:** SGS-WP master plan Steps 3+4 (tooling rebuild) — 5 phases sequential
**Current phase:** **Pre-Phase 1** — audit existing planning docs FIRST (cleans up the workspace before Phase 1 starts)
**Progress:** 22/180 rubrics shipped (12% — the high-priority ones); spec design complete; Phase 1 not yet started
**Next task:** Audit task below (Task 1) — must run BEFORE any Phase 1 work

---

## TASK 1 (DO THIS FIRST — BEFORE ANYTHING ELSE)

Audit the existing planning + spec docs in two folders to identify what's already captured in our current plan, what's done, what contradicts our plan, and what's outdated. Bean wants this before we move forward — no clean-up of old files until we know where we stand.

### CRITICAL CONSTRAINTS
- Do folders **SEQUENTIALLY** (folder 1 fully completed + QC'd BEFORE starting folder 2)
- Read **EACH document IN FULL** — no skimming. The full read is non-negotiable per Bean. If a doc is >500 lines, read in chunks but cover every line.
- Per document, classify content into 4 buckets:
  - **A) "Already in our plan"** — covered by current spec / phasing
  - **B) "Done"** — work already completed (note where the deliverable is)
  - **C) "Contradicts"** — disagrees with current spec / phasing in a material way
  - **D) "Outdated"** — superseded by newer decisions, no longer applicable
- After each folder finishes, `/qc` the findings before presenting to Bean
- Surface findings to Bean folder-by-folder, not all at once

### Folder 1 (do first):
`C:/Users/Bean/Projects/small-giants-wp/.claude/plans/`
**Exclude:** anything inside `.claude/plans/archive/`

### Folder 2 (do AFTER folder 1 + Bean approval):
`C:/Users/Bean/Projects/small-giants-wp/docs/plans/`
**Exclude:** anything inside `docs/plans/archive/`

### Output per folder
Write `audit-folder-N-2026-04-29.md` at the project root:
- Document index (filename + 1-line summary of what each doc is about)
- Per-document table: A/B/C/D classifications with quotes/line-refs
- Cross-document patterns (multiple docs say X — clean up duplicates)
- Recommended actions (which to delete, which to merge into spec, which to update in place)

### QC step (before delivering folder 1 findings to Bean)
Invoke `/qc` on the `audit-folder-1-2026-04-29.md` report itself. QC scenarios should check:
- Did every doc actually get read in full? (Verify by quote density per doc — a doc cited fewer than 3× is suspect)
- Are A/B/C/D classifications justified by quoted evidence?
- Are there any docs the audit missed?

Only proceed to folder 2 after Bean approves folder 1 findings.

---

## After Task 1 — return to Phase 1 of the spec

`~/.openclaw/.claude/subprojects/ssb/specs/2026-04-27-optimisation-toolkit-design.md` — Section 5 (Phasing).

### Phase 1a — Build optimisation-toolkit utilities

Build in this order:
1. `canary_split.py` (foundational — every other utility's "must improve" gate depends on it)
2. In parallel: `dspy_signature.py`, `certainty_calc.py`, `few_shot_injector.py`

Location: `~/.agents/skills/shared-references/optimisation-toolkit/`

Each utility ships with: smoke test (`tests/smoke.py`, no LLM call required), API contract docstring, return shape consistent with adoption-gate validation.

### Phase 1b — Update lifecycle + quality + QC skills (BLOCKING)

Skills to update: `skill-optimiser`, `skill-writer`, `pipeline-optimiser`, `pipeline-writer`, `command-writer`, `gap-analysis`, `qc`, `qc-inline`.

Each gets:
- New rubric-loading methodology baked in (load `references/end-goal-rubric.md` at Stage 0; if missing, generate inline with user sign-off; gap-analysis lens 6 always uses a custom rubric)
- Knowledge of toolkit utilities — explicit stage that considers which utilities fit what's being built/graded
- Lifecycle skills especially: utility-fit stage during creation/edit

**Method:** manual edit + cross-tier QC peer review (NOT self-apply). Bean's call (2026-04-28) — adding utility-awareness changes the skill's behaviour, needs external validation.

---

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/autopilot` | FIRST — establishes routing + ADHD support for the session |
| `/qc` | Mandatory after each audit folder (Task 1 step) |
| `/skill-optimiser` | Phase 2a — per-skill optimisation pass on the 22 with rubrics |
| `/lifecycle` | MANDATORY before any skill/agent/pipeline edit |
| `/brainstorming` | If design questions surface during Phase 1b |
| `/gap-analysis` | Mandatory in Phase 3 (3-level: system, pipeline, skill) |
| `/handoff` | End of session |
| `/research-check` | Quick verification when skill-design questions arise |
| `/capture-lesson` | New rules surfaced in audit |

## MCP Servers & Tools

| Tool | What for |
|------|----------|
| `python ~/.claude/hooks/local-search.py "q"` | Memory recall before any new work |
| `python ~/.claude/hooks/search.py "q"` | Web research for Phase 1b methodology decisions |
| Direct sqlite3 on `blub.db` | Reading skill_registry, embeddings, gap-analysis history |
| Gemini CLI (Flash + Pro) | Cross-tier QC peer review during Phase 1b updates |

## Agents to Delegate To

| Agent | When |
|-------|------|
| Sonnet (via `/delegate`) | Phase 1a utility build (mechanical), Phase 2b rubric drafts for remaining tools |
| Opus (via `/delegate`) | Phase 1b lifecycle-skill updates (system-level work — switch session model) |
| Cerebras / Gemini Flash | Cross-tier QC peer review during Phase 1b |

---

## Guardrails

- Phase 1b is BLOCKING — Phase 2 cannot start until lifecycle/qc/gap-analysis updated
- Phase 2b triage filter — skip auxiliary tools that don't meaningfully affect end results
- Phase 3a includes ordering/placement as third lens (alongside coverage + duplicates)
- design-brain rebuild goes FIRST in Phase 4 — it gates all other pipeline rebuilds (Blueprint schema + Designer + Council must be production-ready first)
- 22 rubrics are LOCKED — don't re-edit during this session unless an audit-task finding forces it
- If `/uimax` INGEST writes are needed during Phase 1, note that command doesn't exist yet — defer to Phase 4 design-brain rebuild
- Estimates default LOW per `time-estimates-default-low-not-high` rule (blub.db row 159)

## Open Questions — ALL RESOLVED (2026-04-28)

1. ~~Design-brain timing~~ → **Design-brain FIRST in Phase 4**, gates all other pipeline rebuilds
2. ~~Steps 3+4 execution model~~ → **Sonnet subagent (draft rubric inline + gap-analysis) → Gemini Flash QC → Opus inline synthesises + presents to Bean.** 3a + 3d stay fully Opus. Parallelism cap: 3 Sonnet subagents. Phase 3 ~3h total.
3. ~~Top-task template industries~~ → **Construction, B2B wholesale/trade, accountant, healthcare/dental (+ Snooza assistive-equipment sub-row), gifting ecommerce/wellness brand (Mama's Munches).** 100 seed rows at Phase 3 DB build time.

---

## After Phase 1 completes

Move to Phase 2 of the spec (rubrics universe — optimise the 22, draft remaining tools with triage filter, draft 13 pipeline rubrics).
