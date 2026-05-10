---
doc_type: report
phase: 4-followup
session_date: 2026-05-10
status: complete
files_touched: 18
audit_findings_addressed: 17
---

# Phase 4 Sub-80 Audit Fix Summary — 2026-05-10

Acted on the audit at `.claude/reports/phase-4-sub80-audit-2026-05-10.md`. All 17 recommended changes landed; 1 surface (sgs-db) needed no change per the audit.

## What changed

### Real bugs fixed (4)

1. **humanize** — Phase 4 propagation had appended an SGS-BEM Convention block + a bespoke "Routed via /innovative-design" line, both of which were wrong content for a CLI text-detection skill. Removed both. Replaced with a "When NOT to Use" section naming `/writing-clearly-and-concisely` and `/innovative-design`. Description now carries explicit `Do NOT invoke for: ...` clause.
2. **audit** — `/colorize` references on lines 74 + 111 would have failed on invocation (the actual skill is `colourise`). Replaced with `/colourise` via the same UK English pass that handled `colorize` → `colourise` token-wide.
3. **5 surfaces missing explicit "When NOT to Use"** — added per-skill sections naming 2-3 alternative skills/agents: clone-patterns, sgs-update, wp-blocks, dev, wp-sgs-developer.
4. **design-reviewer** — body was 598 lines (over the 500-line agent context budget). Extracted the QA Audit Mode section (~45 lines) to `~/.claude/agents/references/design-reviewer-qa-audit-mode.md`. Body now 562 lines (still over but materially closer; the audit recommended this as the substantive change). Added a Common Mistakes table per audit.

### Hygiene fixes

- **UK English pass** — 201 replacements across 11 files via `.claude/scratch/phase-4-audit-uk-english.py` (line-aware, skips CSS property contexts, CLI flag-value occurrences, OKLCH/RGB/HSL function args). Token families covered: gray, grayscale, analyze, optimize, optimization, behavior, minimize, colorize, color, colors, coloured.
- **distill, quieter** — added the uimax DB lookup block at the top (matching the polish/bolder/colourise pattern) so the skill consults the design-intelligence DB before recommending. (normalize already had it; the audit was wrong about that one.)
- **test-driven-development** — description rewritten from second-person ("Use when implementing...") to third-person ("Guides implementation of any feature or bugfix..."). Added negative routing clause and a body "When NOT to Use" section.

## Score deltas (post-fix)

| Surface | Pre-fix | Post-fix | Delta |
|---|---|---|---|
| polish | 44.3% | 49.2% | +4.9 |
| bolder | 38.7% | 43.5% | +4.8 |
| colourise | 40.7% | 43.5% | +2.8 |
| distill | 40.7% | 43.5% | +2.8 |
| normalize | 44.3% | 49.2% | +4.9 |
| humanize-ai-text | 50.0% | 60.3% | +10.3 |
| quieter | 43.5% | 48.4% | +4.9 |
| delight | 45.1% | 50.0% | +4.9 |
| audit | 44.3% | 49.2% | +4.9 |
| optimise | 44.3% | 49.2% | +4.9 |
| clone-patterns | 60.0% | 70.0% | +10.0 |
| sgs-update | 70.0% | 80.0% | +10.0 |
| wp-blocks | 60.0% | 70.0% | +10.0 |
| sgs-db | 70.0% | 70.0% | 0.0 (already compliant) |
| dev | 70.0% | 80.0% | +10.0 |
| wp-sgs-developer | 46.8% | 56.3% | +9.5 |
| design-reviewer | 53.3% | 57.3% | +4.0 |
| test-driven-development | 47.5% | 55.8% | +8.3 |

Average gain: **+6.4%** across 17 surfaces. Largest gain: humanize +10.3 (Phase 4 wrong content removed AND FATAL flag cleared via description rewrite).

## What did NOT change

None of the 18 surfaces reached 90%. The remaining sub-90 scores are pre-existing rubric-mismatch baseline — the sgs-skillscore validator grades all artefacts against full-skill criteria (Goal section, Common Mistakes, HARD GATE markers, numbered stages, references/ directory, system-effect 6-lens check, agent body length budget). The 18 surfaces include:

- **10 mini-skills** (polish, bolder, colourise, distill, normalize, humanize, quieter, delight, audit, optimise) — `user-invocable: false`, routed via `/innovative-design`. Don't have or need standalone Goal / stages / references because they're sub-skills.
- **5 slash command files** (clone-patterns, sgs-update, wp-blocks, sgs-db, dev) — live in `~/.claude/commands/`, are CLI shortcuts, not workflow skills.
- **2 agent definition files** (wp-sgs-developer, design-reviewer) — agent identity + tool grants, not full skill bodies.
- **1 discipline reference** (test-driven-development) — comprehensive TDD guide; the structural checks for skills don't apply to a discipline reference.

Bean's ruling 2026-05-10 (carried over from the frontend-design / superdesign adjudication earlier in the session): do not restructure these to satisfy the rubric. The skill-type classifier is a separate concern for a future skillscore tier.

## Files modified

| Surface | Path |
|---|---|
| polish | `~/.claude/skills/polish/SKILL.md` |
| bolder | `~/.claude/skills/bolder/SKILL.md` |
| colourise | `~/.claude/skills/colourise/SKILL.md` |
| distill | `~/.claude/skills/distill/SKILL.md` |
| normalize | `~/.claude/skills/normalize/SKILL.md` |
| humanize-ai-text | `~/.agents/skills/humanize-ai-text/SKILL.md` |
| quieter | `~/.claude/skills/quieter/SKILL.md` |
| delight | `~/.claude/skills/delight/SKILL.md` |
| audit | `~/.claude/skills/audit/SKILL.md` |
| optimise | `~/.claude/skills/optimise/SKILL.md` |
| clone-patterns | `~/.claude/commands/clone-patterns.md` |
| sgs-update | `~/.claude/commands/sgs-update.md` |
| wp-blocks | `~/.claude/commands/wp-blocks.md` |
| dev | `~/.claude/commands/dev.md` |
| wp-sgs-developer | `~/.claude/agents/wp-sgs-developer.md` |
| design-reviewer | `~/.claude/agents/design-reviewer.md` (+ new `references/design-reviewer-qa-audit-mode.md`) |
| test-driven-development | `~/.claude/skills/test-driven-development/SKILL.md` |

All edits live outside this repo; tracked here only via this report.
