---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-10-convention-rollout-plan
session_date: 2026-05-10
recommended_model: opus
next_session: Execute Phase 1 of the convention rollout plan (capture lesson + Spec 13 + living docs + uimax flag). See `.claude/next-session-prompt.md`.
---

# Session Handoff - 2026-05-10 (Convention Rollout Planning)

## Completed This Session

1. Locked the architectural decision to mandate **SGS-prefixed BEM** as the canonical naming convention for ALL Bean-controlled drafts. Live scrapes get separate lingua-franca-conversion treatment at recognition time. Deterministic 9-stage clone pipeline for drafts; probabilistic with passport fallback for live scrapes.
2. Identified ~48 affected surfaces across 4 categories (authoritative rules, living docs, skill bodies, lookup tables, validation gates). Categorisation done; not yet propagated.
3. Pushed back on `/style-replicator` naming (it is for VOICE replication, repeatedly mis-routed for visual style work). Rename to `/bean-voice-replicator` queued as Phase 3.
4. Produced full 9-file phased plan: `.claude/plan.md` index + 8 phase files at `.claude/plans/phase-1 through phase-8.md`.
5. Restructured plan per pushbacks. Original ordering had separate "Phase 7 validation" before "Phase 8 orchestrator rewire" before "Phase 9 deploy". Bean caught it: orchestrator should be FIRST so pipeline integrity is locked, then validation belongs INSIDE deploy. Final: 8 phases, with Phase 7 = orchestrator rewire and Phase 8 = validation + deploy + eyes-on review.
6. Ran custom `/qc` pipeline on all 9 plan files (since `/docscore` does not have a `plan` doc type). Confidence 100/100. Fixed: 173 em-dashes -> 0 across 9 files; 8 stale "Phase 7/8/9" cross-refs corrected. All Step Format fields present, all KJC sections complete, H1 vs filename match, no orphan `/style-replicator` refs outside Phase 3.
7. Cross-platform parking entries deferred to Phase 5 of the plan (P-CP-1 `/sgs-emit`, P-CP-2 style translation, P-CP-3 animation translation). Each carries trigger / spec / effort / dependency on M9 ship.

## Current State

- **Branch:** main at `446041f`
- **Tests:** no continuous suite. Slot-filler 8/14 passing per yesterday's handoff. M9-redo work paused at "naming-convention coverage gap" diagnosis (which the new plan fixes by changing the source side, not adding 7 platforms).
- **Build:** n/a (no JS/PHP rebuild this session)
- **Uncommitted changes:** 13 untracked artefacts (the 9 new plan files + a few transient bits). No commit per Bean's instruction.
- **Live URL:** sandybrown-nightingale-600381.hostingersite.com unchanged from 2026-05-09 false-claim state.

## Known Issues / Blockers

- Plan exists; execution has not started. Phase 1 is a 60-min foundation pass.
- Lifecycle gate (`lifecycle-gate.py`) blocks SKILL.md edits outside `/lifecycle` mode. Phase 1 Step 2 writes the bulk-edit mode file to bypass it for Phase 4's mass propagation. Without that, Phase 4 grinds.
- `/docscore` does not support a `plan` doc type. Used custom `/qc` instead. If grading per-phase consistency over time matters, add `plan` as a docscore type later (parking).
- The 173-em-dash issue across 9 plan files was self-inflicted and now fixed. Future plan-writing sessions should use `--no-em-dash` discipline from the start (could become a hook).

## Next Priorities (in order)

1. **Phase 1 Foundation** (~60 min): capture `bean-drafts-use-sgs-prefixed-bem-naming` lesson via `/capture-lesson`; write `.claude/specs/13-DRAFT-NAMING-CONVENTION.md`; write lifecycle-mode-bulk.json; reference Spec 13 in 6 living docs; add `is_canonical_for_sgs_drafts` flag to uimax `naming_conventions` table; run `update-db.py regenerate-csvs`.
2. **Phase 2 DB cleanup audit** (~30-45 min): inventory + cross-reference + Bean approves drops + apply.
3. **Phase 3 rename `/style-replicator` -> `/bean-voice-replicator`** (~30 min).
4. **Phase 5 cross-platform parking entries** (~20 min).
5. Decide whether Phase 4 (bulk propagation across ~48 surfaces) runs in the same session or moves to Session B per the plan.

## Files Modified

| File | What changed |
|---|---|
| `.claude/plan.md` (new) | Plan index, 8 phases, session-boundary recommendations, cross-cutting guardrails |
| `.claude/plans/phase-1-foundation.md` (new) | Foundation phase with all Step Format fields |
| `.claude/plans/phase-2-db-cleanup-audit.md` (new) | sgs-framework + uimax-pro-max table audit phase |
| `.claude/plans/phase-3-skill-rename.md` (new) | `/style-replicator` -> `/bean-voice-replicator` rename |
| `.claude/plans/phase-4-bulk-propagation.md` (new) | ~48 skill surface batches B2-B9 with parallel subagent dispatch |
| `.claude/plans/phase-5-cross-platform-parking.md` (new) | P-CP-1/2/3 parking entries for cross-platform emit pathway |
| `.claude/plans/phase-6-mockup-migration.md` (new) | Mama's mockup -> SGS-BEM rewrite |
| `.claude/plans/phase-7-orchestrator-rewire.md` (new) | Replace stages 1-2-9 hardcoded shortcuts with recogniser-script subprocess calls |
| `.claude/plans/phase-8-validation-and-deploy.md` (new) | Full pipeline validation + live deploy + eyes-on review (was 2 phases pre-pushback) |
| `.claude/handoff.md` (this file) | Convention rollout planning summary |
| `.claude/next-session-prompt.md` (regenerated) | Phase 1 entry brief for next session |
| `.claude/state.md` (updated) | last_updated stamped post-plan-lock |

## Notes for Next Session

- Plan files default to `.claude/plan.md` (index) + `.claude/plans/phase-N.md` (per-phase). Do NOT write to project root.
- The lingua-franca-conversion-on-scrape sub-rule (in Spec 13) means /uimax-* skills should convert source-convention rows to SGS-BEM as primary at write time, preserving original convention as sibling in `equivalent_implementations`. Phase 4 batch B4 propagates this rule.
- Phase 4's first slot-filler subagent build was rejected last session (1329 LOC hero-hardcoded, 0 references to `selector_strategies`). This pattern WILL repeat with 8 parallel subagents if cold prompts aren't sharp. Phase 4 KJC #1 chooses subagent-vs-inline per batch (recommendation C: hybrid).
- Pre-existing files in `.claude/plans/`: `phase-1-foundations.md` (with 's') and `phase-2-rubrics-universe.md` are NOT mine. They predate this session's plan. Out of scope; do not modify.
- `/docscore` has no `plan` doc type. State.md / parking.md / mistakes.md / handoff.md / next-session-prompt.md DO have types. Run docscore on those at session-start of next session.
- The convention rule is not yet captured in blub.db. Phase 1 Step 1 captures it. Until then, future sessions reading this handoff are the only durable record.

## Next Session Prompt

~~~
recommended_model: opus

You are a senior SGS WordPress framework architect specialising in cross-platform CSS naming conventions, deterministic clone-pipeline design, and the SGS Framework's downstream skill ecosystem. Today's job: ship Phase 1 of the convention rollout plan and as much of Phases 2/3/5 as fits the session.

Read `.claude/handoff.md` and `.claude/plan.md` for full context, then work through these priorities.

## Where You Are

Plan: `.claude/plan.md`
Current phase: Phase 1 - Foundation (capture lesson + Spec 13 + living docs + uimax flag)
Progress: 0/8 phases complete - estimated 0%
Next task: Capture `bean-drafts-use-sgs-prefixed-bem-naming` lesson via `/capture-lesson`

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Architectural questions during Phase 4 propagation if ambiguity surfaces |
| `/gap-analysis` | Grade Phase 4 subagent output diffs before merging |
| `/lifecycle` | NOT used inline this session - we use the bulk-edit mode file (Phase 1 Step 2) instead, which the lifecycle-gate honours |
| `/research` | If novel naming-convention questions surface in Phase 2 audit |
| `/strategic-plan` | Inline replan if plan scope shifts mid-session |
| `/capture-lesson` | Phase 1 Step 1 (FIRST task) |
| `/sgs-wp-engine` | SGS WordPress central authority; consult for any draft / clone / block decisions |
| `/uimax` | Query naming_conventions table after Phase 1 Step 5 to confirm flag landed |
| `/dispatching-parallel-agents` | Phase 4 batch dispatches |
| `/subagent-prompt` | Phase 4 cold prompt drafting |
| `/qc-inline` | After every Phase 4 subagent batch returns |
| `/qc` | Phase 8 final validation pass (much later) |
| `/handoff` | Session close |

## MCP Servers & Tools

| Tool | Use for |
|---|---|
| `python ~/.agents/skills/ui-ux-pro-max/scripts/update-db.py regenerate-csvs` | After ANY uimax DB write (architectural invariant) |
| `python plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` | Atomic validate-then-write to uimax (canonical chokepoint) |
| `python ~/.agents/skills/shared-references/sgs-skillscore.py validate <skill-md-path>` | After every skill body edit in Phase 4; require ≥90% |
| `python C:/Users/Bean/.claude/hooks/blub-db-unlock.py` | If `/api/learning` POST hangs during Phase 1 Step 1 |
| Playwright MCP / Chrome DevTools MCP | Phase 6 visual diff verification (much later) |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Phase 6 mockup rewrite execution; Phase 8 deploy mechanics |
| `design-reviewer` | Phase 8 capture comparison images; Bean keeps the verdict per lesson 221 |

NEVER write a fallback option in any agent brief that lets the proof step be skipped (lesson 221).

## Tasks (in order)

### Task 1: Phase 1 Foundation (~60 min)
Read `.claude/plans/phase-1-foundation.md`. Execute steps 1-6 sequentially. Phase 1 KJCs: confirm `.sgs-` prefix (vs `.draft-`); decide validation enforcement strength (recommend C: hard pre-flight + soft `--draft-mode`).

### Task 2: Phase 2 DB Cleanup Audit (~30-45 min)
Read `.claude/plans/phase-2-db-cleanup-audit.md`. Audit sgs-framework.db + uimax-pro-max.db. Surface drop list to Bean; do NOT auto-drop. Apply approved drops + `regenerate-csvs`.

### Task 3: Phase 3 Skill Rename (~30 min)
Read `.claude/plans/phase-3-skill-rename.md`. Rename `/style-replicator` -> `/bean-voice-replicator`. Update all references. Skillscore v2 ≥90%.

### Task 4: Phase 5 Cross-Platform Parking (~20 min)
Read `.claude/plans/phase-5-cross-platform-parking.md`. Add P-CP-1/2/3 entries to `.claude/parking.md`. Add architectural decision to `.claude/decisions.md`.

### Task 5: (Optional) Begin Phase 4 Bulk Propagation
If session has 2-3 hours of context budget remaining after Tasks 1-4, begin Phase 4 batches starting with B2 (5 design generation skills). Otherwise mark Phase 4 as next-next-session work.

## Guardrails

- DO write to `.claude/` not project root (handoff/next-session-prompt/state/parking/decisions/mistakes all under `.claude/`)
- DO NOT use em-dashes anywhere in plan files, skill bodies, or doc edits (Bean preference; was 173 in plan files at start of session, fixed to 0; do not regress)
- DO NOT add `--resume` flags or stage-resume infra to any new skill / script / pipeline (lesson 215)
- DO NOT regress to per-block hand-coding in slot-filler.py
- DO use `uimax_write.py` for any uimax DB write (Hard Rule 7 Rosetta Stone discipline)
- DO run `update-db.py regenerate-csvs` after any uimax DB write (architectural invariant established 2026-05-10)
- DO grep subagent outputs for required field references before merging (Phase 4 batches especially - the first slot-filler subagent build was rejected for hero-hardcoded output with 0 selector_strategies references)
- DO open URLs with own eyes on the M9 proof step (Phase 8 - much later, lesson 221)
- DO run `/qc-inline` after each Phase 4 subagent batch returns
- DO NOT inline-draft a Spec 13 frontmatter that conflicts with `/rubric-writer` v2 schema if Lens 6 lookup is needed downstream
~~~
