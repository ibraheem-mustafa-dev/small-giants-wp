---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-10-convention-rollout-execute
session_date: 2026-05-10
recommended_model: opus
next_session: Execute Phase 4 (bulk propagation across ~48 surfaces) of the convention rollout plan. See `.claude/next-session-prompt.md`.
---

# Session Handoff — 2026-05-10 (Convention Rollout — Phases 1+2+3+5 shipped)

## Completed This Session

1. **Phase 1 Foundation shipped end-to-end (~25 min).** Spec 13 (`.claude/specs/13-DRAFT-NAMING-CONVENTION.md`) locked as canonical reference for SGS-prefixed BEM. blub.db row 236 captured (pattern_key `bean-drafts-use-sgs-prefixed-bem-naming`, area=revenue-sgs, all 3 layers persisted). 6 living docs updated to reference Spec 13. `~/.claude/.lifecycle-mode-bulk.json` written (mode A, skip-grading) so Phase 4 SKILL.md edits bypass the lifecycle gate.
2. **uimax `naming_conventions` schema migrated.** New column `is_canonical_for_sgs_drafts` added; `SGS WordPress` row flagged 1; the other 15 conventions flagged 0. 46 CSVs regenerated cleanly via `update-db.py regenerate-csvs`. `naming-conventions.csv` now carries the column with `SGS WordPress` as the sole canonical row.
3. **Phase 2 DB cleanup audit shipped (audit-only, no DROPs).** Inventory reports written for both DBs (`.claude/reports/db-audit-sgs-framework-2026-05-10.md` 24 tables, `.claude/reports/db-audit-uimax-pro-max-2026-05-10.md` 47 tables). 8 empty tables identified as drop candidates. Bean pushed back ("they may be recently-made"); applied conservative-keep default per Phase 2 Step 3 — no DROPs applied. Reopen condition logged in `.claude/decisions.md` (≥2 weeks + git timestamp evidence required).
4. **Phase 3 skill rename shipped.** `~/.agents/skills/style-replicator/` → `~/.agents/skills/bean-voice-replicator/`. SKILL.md frontmatter, body sections (Goal, When NOT to use, Process with 5 numbered stages, Skills invoked, Correction Ledger Integration, Common Mistakes table, System Effect 6-Lens Check), and progressive-disclosure refactor (sections 2+3 + section 5 + section 7 worked-examples moved to `references/`). Skillscore 100% A. 3 cross-references updated (brain-dump SKILL.md + 2× email-html-builder). 0 stale `style-replicator` refs in the skill library.
5. **Phase 5 cross-platform parking shipped.** P-CP-1 (`/sgs-emit`), P-CP-2 (style translation theme.json → React/Flutter/SwiftUI), P-CP-3 (animation translation uimax animations → React-spring/Flutter/SwiftUI) appended to `.claude/parking.md` with full spec sketch + trigger + effort + source materials + dependencies. Strategic deferral logged in `.claude/decisions.md` — all 3 entries gated on M9 production-stable + ≥3 banked clones.
6. **Living docs canonicalised.** Created `.claude/decisions.md` (this session is its first entries — Phase 2 conservative-keep + Phase 5 cross-platform deferral + Spec 13 lock). Updated `.claude/state.md` with Convention rollout phase note alongside the existing M9-redo phase.

## Current State

- **Branch:** main at `2858e97d` (pushed to origin)
- **Tests:** no continuous suite. Slot-filler still 8/14 passing per prior handoff (M9-redo work paused; convention rollout is the active workstream)
- **Build:** n/a (no JS/PHP rebuild this session)
- **Uncommitted changes:** none — all 11 files committed in `2858e97d`
- **Live URL:** sandybrown-nightingale-600381.hostingersite.com unchanged from 2026-05-09 state (M9 redo deferred until convention rollout closes)

## Known Issues / Blockers

- **Pipeline enforcer absent.** `~/.claude/hooks/pipeline-enforcer.py` does not exist — Gate enforcement skipped during this handoff. Not blocking (handoff completed manually) but flagging so it gets installed before /handoff becomes mandatory-gated.
- **Lifecycle-gate skip-grading flag is not honoured by the PostToolUse skillscore hook.** When Phase 3 updated cross-references in unrelated skills (email-html-builder, brain-dump), the hook graded those skills against ≥90% threshold and reported pre-existing structural failures (missing Goal, no HARD GATE tags). Edits succeeded but the hook surfaced as "fix before proceeding" — false signal during a rename pass. Phase 4's bulk propagation will hit this repeatedly; consider widening the bulk-mode JSON's `depth: skip-grading` to actually skip the hook, or wrap the hook to honour it.
- **Phase 4-8 still pending.** Phase 4 (bulk propagation across ~48 surfaces) is the largest remaining piece (~2-3 hours per the plan). Phase 6 Mama's mockup migration, Phase 7 orchestrator rewire, Phase 8 validate+deploy are downstream.

## Next Priorities (in order)

1. **Phase 4 bulk propagation** (~2-3 hours, parallel subagents). Read `.claude/plans/phase-4-bulk-propagation.md`. Start with batch B2 (5 design-generation skills). Use `/dispatching-parallel-agents` + `/subagent-prompt` for cold prompts. Run `/qc-inline` after each batch returns; grep outputs for required-field references before merging.
2. **Phase 6 Mama's mockup migration** (after Phase 4). Convert existing kebab-semantic classes to SGS-prefixed BEM. Use `--legacy` flag for first-pass bypass; eyes-on visual-diff at 3 breakpoints.
3. **Phase 7 orchestrator rewire** (~90-150 min). Replace stages 1-2-9 hardcoded shortcuts with subprocess calls into recogniser scripts.
4. **Phase 8 validate + deploy + eyes-on review.** Live deploy to sandybrown homepage, all 3 breakpoints, operator-owns-the-proof step (lesson 221).

## Files Modified

| File | What changed |
|---|---|
| `.claude/specs/13-DRAFT-NAMING-CONVENTION.md` (new) | Canonical SGS-BEM convention spec with 9-stage determinism table, examples per role, migration policy, lingua-franca-conversion sub-rule, cross-platform alignment table, validation rule (regex + lint command + lifecycle-gate hook spec) |
| `.claude/decisions.md` (new) | 3 entries: Phase 2 conservative-keep, Phase 5 cross-platform deferral, Spec 13 lock with both KJCs |
| `.claude/reports/db-audit-sgs-framework-2026-05-10.md` (new) | 24-table audit, 4 drop candidates flagged then kept |
| `.claude/reports/db-audit-uimax-pro-max-2026-05-10.md` (new) | 47-table audit, 4 drop candidates flagged then kept |
| `.claude/state.md` | Convention rollout phase note added; existing M9-redo content preserved |
| `.claude/goals.md` | New row: convention rollout exit criteria |
| `.claude/architecture.md` | Draft naming convention block added to Overview |
| `.claude/mistakes.md` | New 2026-05-10 lesson: SGS-prefixed BEM canonical for drafts |
| `.claude/parking.md` | 3 P-CP entries appended with full sketches |
| `.claude/CLAUDE.md` | Spec count bumped 00-10 → 00-13 with note that Spec 13 is canonical |
| `CLAUDE.md` (root) | New Hard Rule subsection: Draft naming convention SGS-prefixed BEM |
| `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_bean_drafts_use_sgs_prefixed_bem_naming.md` (new) | CC auto-memory feedback file (Layer 2) |
| `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` | New entry pointing to the feedback file |
| `C:/Users/Bean/.openclaw/workspace/memory/learning/2026-05-10-bean-drafts-use-sgs-prefixed-bem-naming.md` (new) | Workspace lesson (Layer 1) |
| `~/.claude/.lifecycle-mode-bulk.json` (new) | Bulk-edit mode flag for Phase 4 propagation |
| `~/.agents/skills/style-replicator/` → `~/.agents/skills/bean-voice-replicator/` | Directory rename + SKILL.md rewrite + references/ progressive disclosure (worked-examples + voice-profile-and-protocol + platform-adaptation + voice-fingerprint-protocol) + hooks/ + scripts/ stub READMEs |
| `~/.agents/skills/brain-dump/SKILL.md` | style-replicator → bean-voice-replicator cross-ref |
| `~/.agents/skills/email-html-builder/SKILL.md` + `~/.claude/skills/email-html-builder/SKILL.md` | Same cross-ref update |
| `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` | naming_conventions table: ALTER + UPDATE; 46 CSVs regenerated |

## Notes for Next Session

- **Phase 2 drop list is parked, not abandoned.** Reopen criteria in `.claude/decisions.md` — 8 empty tables can be dropped after ≥2 weeks of no-population + git-timestamp evidence on the migration scripts that created them.
- **The skillscore hook over-reaches during cross-reference rename passes.** When you touch one line in an unrelated skill (e.g. updating a `(use X)` reference), the hook grades the whole skill against ≥90% and surfaces pre-existing structural failures. For Phase 4 batches, plan to either (a) widen `lifecycle-mode-bulk.json` to actually skip-grade per its `depth` field, or (b) accept the false-positive signals and document why the failures are pre-existing.
- **bean-voice-replicator's body still contains second-person `you` inside Section 7's example LinkedIn drafts** — moved to `references/worked-examples.md` so the validator no longer flags them. Don't `--fix` the references blindly; those examples ARE Bean's voice and second-person is the correct register.
- **The classifier-router missed the genuine violators of Spec 13** (`/sgs-clone`, `/uimax-*`, `/sgs-extraction`) because the skill-violation-map has no "naming convention / CSS / clone pipeline" cluster. Phase 4 IS the embed step for those skills, but the classifier gap is parking-worthy if you want the rule to auto-surface in future captures.
- **The lingua-franca-conversion sub-rule (Spec 13 §5) is Phase 4 batch B4 territory** — `/uimax-scrape`, `/uimax-sgs-scrape-pattern`, `/uimax-mood-board`, `/uimax-scrape-animation`, `/uimax-classify-naming` all need their bodies extended to convert source-convention class names to SGS-BEM as primary at write time. Keep source as sibling row; never silently drop.
- **Phase 4 KJC #1** (subagent-vs-inline per batch) recommendation is C: hybrid. The first slot-filler subagent build last week was rejected for hero-hardcoded output with 0 selector_strategies references — same pattern WILL repeat on 8 parallel subagents if cold prompts are not sharp. Use `/subagent-prompt` for every batch, grep outputs before merging.

## Next Session Prompt

~~~
recommended_model: opus

You are a senior SGS WordPress framework architect specialising in cross-platform CSS naming conventions, parallel subagent dispatch for bulk skill-body propagation, and the SGS Framework's downstream skill ecosystem. Today's job: ship Phase 4 of the convention rollout plan (bulk propagation of the SGS-prefixed BEM rule across ~48 surfaces).

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-10-convention-rollout-execute"

Read `.claude/handoff.md` and `.claude/plan.md` for full context, then `.claude/plans/phase-4-bulk-propagation.md` for batch breakdown.

## Where You Are

Plan: `.claude/plan.md`
Current phase: Phase 4 — Bulk propagation across ~48 surfaces (Phases 1+2+3+5 shipped 2026-05-10)
Progress: 4/8 phases complete — estimated 50%
Next task: Phase 4 batch B2 (5 design-generation skills) — first parallel subagent dispatch

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Architectural questions if Phase 4 ambiguity surfaces (e.g. how to translate Spec 13 §5 lingua-franca-conversion into a `/uimax-*` skill body) |
| `/gap-analysis` | Grade Phase 4 subagent output diffs before merging — apply lens 6 (motivation/values) check on each batch |
| `/lifecycle` | NOT inline this session — `.lifecycle-mode-bulk.json` already permits SKILL.md edits |
| `/research` | Only if a novel naming-convention question surfaces (unlikely; Spec 13 is locked) |
| `/strategic-plan` | Inline replan if a batch needs re-scoping mid-session |
| `/dispatching-parallel-agents` | Phase 4 batch dispatches (B2-B9) |
| `/subagent-prompt` | Phase 4 cold prompt drafting — every batch |
| `/qc-inline` | After every Phase 4 subagent batch returns — non-negotiable |
| `/sgs-wp-engine` | Central authority for any draft/clone/block decisions |
| `/uimax` | Verify after Phase 4 batch B4 lands the lingua-franca-conversion rule into uimax skill bodies |
| `/handoff` | Session close |

## MCP Servers & Tools

| Tool | Use for |
|---|---|
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate <SKILL.md>` | After every Phase 4 skill body edit; require ≥90% (gate failures here ARE genuine, unlike rename-pass over-reaches) |
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
- DO NOT use em-dashes anywhere (Bean preference; was 173 in plan files at session-start last time, fixed to 0; do not regress)
- DO NOT add `--resume` flags or stage-resume infrastructure (lesson 215)
- DO grep subagent outputs for required field references before merging (Phase 4 KJC #1)
- DO use `uimax_write.py` for any uimax DB write (Hard Rule 7 Rosetta Stone)
- DO run `update-db.py regenerate-csvs` after any uimax DB write
- DO run `/qc-inline` after each Phase 4 subagent batch returns
- DO NOT regress to per-block hand-coding in slot-filler.py
- The skillscore hook will surface false-positive ≥90% failures on any cross-reference edit in pre-existing under-spec skills (e.g. email-html-builder lacks Goal/HARD GATE). For Phase 4 these are likely real (you're editing the skill body itself) — fix them. For pure cross-reference renames, accept the false signal and proceed.
~~~