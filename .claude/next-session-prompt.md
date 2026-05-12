---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-12-spec-15-phase-3.5
recommended_model: opus
---

You are a senior WordPress block developer specialising in the SGS Framework, Gutenberg blocks, and Spec 15's deterministic draft-to-SGS converter. This session continues Phase 4 (draft convention enforcement + long-tail close).

## Execution Strategy — Opus orchestrator + per-branch delegation

You're on **Opus** for the bigger context window + ability to run `/qc-inline` between steps. **DO NOT do leaf work on Opus** — that's expensive. Instead:

- **`/delegate`** — call before every dispatch to pick the cheapest model that succeeds (Sonnet / Haiku / Cerebras). Never hardcode model.
- **`/dispatching-parallel-agents`** — fanout-friendly work: build the two lints in parallel (4.1 + 4.2), the 3-rater QC panel (4.7), per-block long-tail batches (4.6a).
- **`/subagent-driven-development`** — implementer + spec-reviewer + quality-reviewer pattern for step 4.5a/b skill updates (where /lifecycle gates apply).
- **`/qc-inline`** — run BETWEEN steps inline. Opus has the context to verify without re-loading. Saves dispatch overhead on the verification half.

Cost shape: Opus orchestrates (~10% of tokens); leaves go to Sonnet/Haiku (~90%).

## Where You Are

Plan: `.claude/plans/spec-15-master-execution-plan.md`
Current phase: Phase 4 — Draft convention enforcement + long-tail close
Progress: Phase 1, 2, 3, 3.5 shipped — ~50% of Spec 15 milestones
Next task: Phase 4 step 4.1 — Implement Stage 0.1 BEM lint at `plugins/sgs-blocks/scripts/lints/bem-lint.py`

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-12-spec-15-phase-3.5"`

Read `.claude/handoff.md` and `.claude/CLAUDE.md` for full context. Living plan at `.claude/plans/spec-15-master-execution-plan.md` §Phase 4.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Design-mode for BEM regex edge cases + token-snap policy decisions |
| `/gap-analysis` | Grade lint scripts + final Phase 4 deliverables before commit |
| `/lifecycle` | Required gate for step 4.5a/b SKILL.md edits |
| `/research` | Auto-routes; `/research-check` for quick lookups (e.g. git-hooks patterns) |
| `/strategic-plan` | Confirm Phase 4 step ordering before writing code |
| `/sgs-wp-engine` | SGS Framework operations + QA pipeline |
| `/wp-block-development` | Block work during long-tail close if surfaced |
| `/qc-inline` | Run BETWEEN steps in main thread — Opus has context to verify without re-dispatch |
| `/delegate` | Per-branch model picker — call before every dispatch |
| `/dispatching-parallel-agents` | Fanout 4.1+4.2 lints, QC panel, long-tail batches |
| `/subagent-driven-development` | Implementer + 2 reviewers for 4.5a/b skill updates |
| `/handoff` | End-of-session handoff generation |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `playwright` MCP | Render Mama's mockup + capture lint output for step 4.6 + 4.6b |
| Python sqlite3 | DB queries against sgs-framework.db for long-tail close (step 4.6a) |
| Git CLI | Per-step direct-to-main commits per always-merge-to-main rule |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Block PHP/JS work during long-tail close if surfaced |
| 3-rater QC panel (Sonnet + Haiku + Gemini Flash) | Step 4.7 — BEFORE commit per qc-before-commit rule |

## Research Approach

Phase 4 work is mostly mechanical lint + DB work. Skip research unless pre-commit hook implementation hits an unfamiliar git-hooks pattern — then `/research-check` for a quick lookup.

---

## Task 1: Phase 4 step 4.1 — BEM lint

Build `plugins/sgs-blocks/scripts/lints/bem-lint.py`. Validate every HTML class against Spec 13 regex (`^\.sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$`). Report violations with line numbers. /qc-inline: Mama's mockup expect 0; deliberately-malformed `.hero-copy` expect 1; mixed file expect violations only on bad classes.

## Task 2: Phase 4 step 4.2 — Token-usage lint

Build `plugins/sgs-blocks/scripts/lints/token-lint.py`. Reads CSS values; calls Phase 1 value-matcher; flags un-snappable values. /qc-inline: 5 inputs (3 palette colours, 1 arbitrary hex, 1 non-token spacing).

## Task 3: Phase 4 step 4.3–4.4 — Wire + pre-commit hook

Wire both lints into `/sgs-clone` Stage 0 with three modes (strict / draft-mode / legacy). Add `.git/hooks/pre-commit` firing on `sites/*/mockups/` changes.

## Task 4: Phase 4 step 4.5a + 4.5b — Skill updates

Update `~/.agents/skills/ui-ux-pro-max/SKILL.md` (primary draft-design — hard rule for SGS-BEM + theme.json tokens) and `~/.claude/skills/innovative-design/SKILL.md` (router — propagate to dispatch targets). Reference Spec 15 §3 + §8. Gate via `/lifecycle`.

## Task 5: Phase 4 step 4.6a + 4.6b — Long-tail close + lint retro

Walk 37 residual gap candidates. Canonicalise OR flag `instance-data-not-canonicalisable`. Target queue 37→≤10. Then run BEM + token lints on Mama's mockup; cross-reference gap-candidate flags; canonicalise matches. Report delta.

## Guardrails

- Drift validator must stay PASS after every step: `python plugins/sgs-blocks/scripts/drift-validator/validate.py`
- Hero `--verify-against tests/golden/hero-extraction-baseline.json` must stay PASS
- assign-canonical row-select is locked to (canonical_slot IS NULL AND role IS NULL AND derived_selector IS NULL) — do not loosen
- buttonSecondary stays canonical; do not recreate `secondaryCta` as a separate slot
- 3-rater QC panel BEFORE commit per qc-before-commit rule
- Direct commits to main per always-merge-to-main rule
