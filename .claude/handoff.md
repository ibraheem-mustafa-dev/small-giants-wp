---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-10-phase-7-orchestrator
session_date: 2026-05-10
recommended_model_next: sonnet
---

# Session Handoff — 2026-05-10 (Phases 4 + 6 closed)

## Completed This Session
1. Phase 4 B2 (5 design-generation skills) + B3-B9 (40 surfaces via deterministic Python helper) — full SGS-prefixed BEM convention propagation to 45 surfaces. All have Spec 13 path + SGS-BEM Convention H2 + blub.db row 236 marker. Commit `a13aad47`.
2. Phase 4 bespoke per-skill integration notes added to 27 surfaces (B3 cross-links + B5/B7 mechanism notes + B8 agent split). Commit `5ae45698`.
3. Phase 4 sub-80 audit subagent ran (Sonnet, background) and returned 17 recommended changes; **all 17 actioned**. 201 UK English replacements across 11 files via line-aware Python script; humanize wrong content removed; audit `/colorize` typo fixed; 5 "When NOT to Use" sections added; design-reviewer QA Audit Mode extracted to `references/`. Commit `6182a3c0`.
4. Phase 6 deterministic mockup relabel — Mama's mockup migrated to SGS-BEM. 138 class-attribute rewrites + 145 CSS/JS line changes per file across `index.html` + `annotated-index.html`. Pre-migration archived to `homepage-archive-2026-05-10/`. Commit `67744f61`.
5. TRUTH-SPEC.md created at `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` — section-by-section binding manifest documenting which mockup wrapper maps to which SGS block/pattern + slot-to-class mappings.
6. Visual diff at 3 breakpoints (375 mobile, 768 tablet, 1440 desktop) via Playwright + PIL — **0.000% pixel difference at every breakpoint**. Proves the rename is pure aliasing.
7. Existing 3 Mama patterns audited (header-mamas-munches, footer-mamas-munches, ingredients-section) — all conform, no sync needed.
8. Two lessons captured to CC auto-memory: classes map to PATTERNS not blocks during mockup migration (with attached process rule: make new blocks inline, never defer with placeholder).

## Current State
- **Branch:** main at `67744f61` (handoff commit will add one more)
- **Tests:** no test suite for skill propagation; Phase 6 verified by Spec 13 §7.1 regex (85/85 pass) + visual diff (0.000% at 3 breakpoints)
- **Build:** n/a (skill/mockup work, no build step)
- **Uncommitted changes:** plan.md edit + phase-6 file rename + handoff/next-session-prompt updates (will commit immediately after)
- **Plan progress:** 7 of 8 phases complete (87.5%)

## Known Issues / Blockers
- Hero parity test file `plugins/sgs-blocks/scripts/recogniser/tests/test_slot_filler.py` does not exist yet — Phase 8 deliverable, blocks Phase 6 Step 6 sanity check (recorded, not a Phase 6 blocker).
- 4 gap-candidate patterns flagged for Phase 8 creation: `featured-product`, `products`, `gift-section`, `social-proof`. Mockup is now Spec-13-conforming so these patterns can be built deterministically once the orchestrator is wired.
- 24 of 45 Phase 4 surfaces sit below skillscore 90% — all rubric-mismatch baseline (commands / agents / mini-skills graded as full skills). Bean's standing ruling: do not restructure.

## Next Priorities (in order)
1. **Phase 7 — orchestrator rewire (stages 1-2-9 hardcoded shortcuts in `/sgs-clone`).** Stage 1 currently uses regex grep + `DEFAULT_SECTION_MAP`; should call `per-section-convention-voter.py`. Stage 2 hardcodes `block_name`; should call `confidence-matrix.score_candidates`. Stage 9 emits thin inline HTML; should call `leftover-bucket-router` + write recognition_log + call `simple_html_review_report.py`.
2. **Phase 8 — pipeline validation.** Run `/sgs-clone` (default mode, no `--legacy`) on the newly Spec-13-conforming Mama mockup. Stage 0 gate should pass. Create the 4 gap-candidate patterns inline as the pipeline surfaces them. Visual parity check + live deploy + Bean eyes-on review (lesson 221 — Bean owns the proof step).
3. **Skill-type classifier in sgs-skillscore (deferred backlog).** 24 surfaces graded as full skills but are commands / agents / mini-skills / discipline references. A skill-type tier would lift their scores from rubric-mismatch noise. Not in current scope but worth tracking.

## Files Modified
| File | What changed |
|---|---|
| `~/.claude/skills/*/SKILL.md` (16 mini-skills + commands + agents + discipline ref) | UK English fixes (201 replacements) + "When NOT to Use" sections + humanize wrong-content removal + audit `/colorize` typo fix |
| `~/.claude/skills/{distill,quieter}/SKILL.md` | Added uimax DB lookup block (matches sibling pattern) |
| `~/.claude/agents/design-reviewer.md` | Extracted QA Audit Mode (~45 lines) to `references/design-reviewer-qa-audit-mode.md`; added Common Mistakes table |
| `~/.claude/agents/wp-sgs-developer.md` | Added "When NOT to Use" naming design-reviewer, performance-auditor, seo-auditor + negative routing in description |
| `~/.agents/skills/humanize-ai-text/SKILL.md` | Removed wrong Phase 4 SGS-BEM block + bespoke false routing claim; added When NOT to Use |
| `sites/mamas-munches/mockups/homepage/index.html` + `annotated-index.html` | 138 class-attr rewrites + 145 CSS/JS line changes per file (deterministic rename) |
| `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` | Created — section binding manifest |
| `sites/mamas-munches/mockups/homepage-archive-2026-05-10/` | New directory — pre-migration mockup snapshot |
| `.claude/plan.md` | Phases 4 + 6 marked complete; phase-6 plan filename updated |
| `.claude/state.md` | Frontmatter advanced to phase-7-orchestrator-rewire |
| `.claude/plans/phase-6-mockup-migration{,-complete}.md` | Renamed per completion convention |
| `.claude/reports/phase-4-propagation-summary-2026-05-10.md` + `phase-4-sub80-audit-2026-05-10.md` + `phase-4-sub80-audit-fix-summary-2026-05-10.md` + `phase-6-mockup-migration-2026-05-10.md` | Session reports |
| `~/.claude/projects/.../memory/feedback_classes_map_to_patterns_not_blocks.md` + `MEMORY.md` index | New behavioural-rule capture |

## Notes for Next Session
- Phase 7 wires together EXISTING dispatcher functions. None are novel — they're in `tools/recogniser-v2/` and `plugins/sgs-blocks/scripts/recogniser/`. Read them before refactoring stage 1/2/9.
- The mockup is now Spec-13-conforming. `/sgs-clone` Stage 0 gate should PASS (no `--legacy` flag needed) once the orchestrator can actually execute the pipeline. Verify this as the first acceptance check in Phase 7.
- Spec 13's lingua-franca-conversion sub-rule (§5) covers live scrapes; the new Mama mockup is Bean-controlled so that sub-rule doesn't apply — straight regex validation only.
- Lesson captured 2026-05-10: classes map to PATTERNS not blocks during mockup migration. If you find yourself asking "which block does this class belong to" at section level, check `theme/sgs-theme/patterns/*.php` FIRST before assuming a missing block.

## Next Session Prompt

~~~
You are a senior SGS WordPress framework engineer specialising in the `/sgs-clone` pipeline orchestration, dispatcher modules (per-section-convention-voter, confidence-matrix, leftover-bucket-router), and deterministic stage wiring. Today's job: Phase 7 — rewire the orchestrator stages 1-2-9 from hardcoded shortcuts to proper dispatcher calls.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-10-phase-7-orchestrator"

recommended_model: sonnet

Read `.claude/handoff.md`, `.claude/state.md`, and `.claude/plans/phase-7-orchestrator-rewire.md` first.

## Where You Are

Plan: `.claude/plan.md`
Current phase: Phase 7 — Orchestrator rewire
Progress: 7/8 phases complete — estimated 87.5%
Next task: Read the current orchestrator stages 1-2-9 and the three dispatchers (per-section-convention-voter.py, confidence-matrix, leftover-bucket-router) before refactoring. Identify the exact call signatures expected.

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | If dispatcher call signatures don't match orchestrator expectations — design-mode to reconcile |
| `/gap-analysis` | Grade refactor output before merge — confirm orchestrator delegates correctly |
| `/lifecycle` | NOT needed unless adding new skills/agents |
| `/research` | Probably not — the dispatchers and orchestrator are internal; no external research needed |
| `/strategic-plan` | If Phase 7 reveals broader rewire needs across more stages, replan inline |
| `/sgs-clone` | The target pipeline being rewired |
| `/sgs-wp-engine` | Block/pattern lookup for any pattern creation that surfaces |
| `/qc-inline` | After each stage rewire to confirm pipeline still runs end-to-end |
| `/handoff` | Session close |

## MCP Servers & Tools

| Tool | Use for |
|---|---|
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate <SKILL.md>` | Validate any skill edits made during the rewire |
| Playwright (CLI or MCP) | Visual parity check after running the rewired pipeline on Mama's mockup |
| GitHub MCP | If creating PRs (commit-to-main fine per branch discipline) |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | NOT this session — Phase 7 is orchestrator/dispatcher wiring, not WP build |

## Tasks (in order)

### Task 1: Inspect the current orchestrator + 3 dispatchers (~15-20 min)
Read `/sgs-clone` skill body to understand the 9-stage pipeline shape. Then locate the orchestrator script (likely in `tools/recogniser-v2/` or `plugins/sgs-blocks/scripts/recogniser/`). Read stage 1 (regex grep + `DEFAULT_SECTION_MAP`), stage 2 (hardcoded `block_name`), stage 9 (inline HTML emit). Then locate and read: `per-section-convention-voter.py`, `confidence-matrix.score_candidates`, `leftover-bucket-router`, `simple_html_review_report.py`. Note exact call signatures + return shapes.

### Task 2: Stage 1 rewire — call per-section-convention-voter (~20-30 min)
Replace the regex grep + `DEFAULT_SECTION_MAP` shortcut with a call to `per-section-convention-voter.py`. Preserve the same return shape so downstream stages still work. Smoke-test by running the orchestrator on Mama's renamed mockup (Stage 0 gate should pass; no `--legacy` needed).

### Task 3: Stage 2 rewire — call confidence-matrix.score_candidates (~20-30 min)
Replace the hardcoded `block_name` with `confidence-matrix.score_candidates`. Each section's top-scored block becomes the block name. Smoke-test.

### Task 4: Stage 9 rewire — call leftover-bucket-router + simple_html_review_report (~25-35 min)
Replace inline HTML emit with: write recognition_log + call leftover-bucket-router + call simple_html_review_report.py. Smoke-test the pipeline end-to-end on Mama's mockup. Capture coverage report output.

### Task 5: Phase 7 closeout (~15 min)
Write `.claude/reports/phase-7-orchestrator-rewire-<date>.md`. Mark Phase 7 complete in plan.md. Advance state.md to Phase 8.

## Guardrails
- DO NOT use em-dashes
- DO NOT add `--resume` or stage-resume infrastructure (lesson 215)
- DO NOT delegate the eyes-on proof step to a subagent (lesson 221) — once the rewired pipeline runs on Mama's mockup, Bean reviews the output
- Mama's mockup is now Spec-13-conforming — Stage 0 gate should PASS without `--legacy`. If it doesn't, you've broken something
- Classes map to PATTERNS not blocks at section level (lesson captured 2026-05-10 — check `theme/sgs-theme/patterns/*.php` before assuming a missing block)
~~~
