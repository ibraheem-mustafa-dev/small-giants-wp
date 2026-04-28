---
doc_type: handoff
project: small-giants-wp
last_updated: 2026-04-28
session_date: 2026-04-27 → 2026-04-28 (optimisation-toolkit + tooling-rebuild design)
recommended_model: sonnet (next session)
session_tag: small-giants-wp-2026-04-28-optimisation-toolkit-spec
---

# Session Handoff — 2026-04-28 (Optimisation-toolkit spec + 22 rubrics shipped)

## Completed This Session

1. **Cross-cutting optimisation-toolkit audit + classification** — 161 SKILL.md files classified across 5 parallel Sonnet+Pro batches. Multi-role audit data at `c:/Users/Bean/Projects/small-giants-wp/.scratch/skill-batches/all-skills-classified-v2.json` (155 unique skills with primary + secondary roles + qualification tags). 6 BRAINS confirmed: ui-ux-pro-max, superdesign, sgs-wp-engine, vercel-react-best-practices, marketing-skills, marketing-ideas.

2. **22 end-goal rubrics drafted, reviewed, finalised** — every rubric uses end-result anchors (5/5 + 1/5), skill-specific criteria only, weights 1.0-1.5, mandatory Never Do (runtime/output anti-patterns), optional Lens 6 anchors. Frontmatter has target_type, target_path, last_reviewed, bean_signoff, domain.
   - **3 pilots:** capture-lesson (8 criteria), critique (10 — phase_3_merge_target ui-ux-pro-max), qc (11 — global scope across artefact types)
   - **5 high-confidence:** phase-planner (9), subagent-prompt (9), interactivity-capture (8), ethics-gate (8), /handoff command (9 — saved to `~/.claude/commands/.rubrics/handoff.md` to avoid auto-discovery as command)
   - **7 medium:** extract (9), harden (8), adapt (8 — merge target), project-consolidate (9), autopilot (11 — 2 new criteria for failure_recognition_and_recovery + completion_loop_discipline), strategic-plan (9 — explicit estimate-defaults-LOW + dashboard sync), architecture-doc (8 — reconciled with industry-standard scope-narrowing post research-check)
   - **7 design-brain spec input:** colourise, bolder (8 with motion criterion), quieter (with explicit easing/duration), normalize, polish, distill, delight — all at `small-giants-wp/.claude/specs/design-brain/<name>.rubric.md`, all flagged `phase_3_merge_target: ui-ux-pro-max design brain (uimax modify --mode <X>)`

3. **5-phase tooling-rebuild structure designed.** Maps to Steps 3+4 of the SGS-WP 5-step master plan:
   - Phase 1a — Build toolkit utilities (canary_split → 3 in parallel)
   - Phase 1b — BLOCKING — update lifecycle + qc + gap-analysis skills (utility-aware, manual edit + cross-tier QC peer review, NOT self-apply)
   - Phase 2a — Per-skill optimisation pass on the 22 with rubrics
   - Phase 2b — Draft rubrics for remaining tooling with TRIAGE FILTER (skip auxiliary)
   - Phase 2c — Draft end-goal rubrics for all 13 pipelines
   - Phase 3 — Three-lens gap-analysis (coverage + duplicates + ordering/placement) at system + pipeline + critical-skill levels
   - Phase 4 — Pipeline rebuild as ONE unit (design-brain goes FIRST — Blueprint schema + Designer + Council must ship before any other pipeline formalisation begins, as they insert as new stages into every other pipeline)
   - Phase 5 — Track A framework + Track B 5 priority clients

4. **Captured 3 global rules** (each shipped to all 3 persistence layers per the new 5-surface rule):
   - `end-goal-rubric-per-skill-mandatory` (blub.db row 182) — every skill/pipeline/command must have `references/end-goal-rubric.md`; lens 6 always reads it
   - `no-low-value-perfectionism-must-improve-results` (blub.db row 161) — every spec/design/rubric/format addition must justify with measurable improvement
   - `capture-lesson-must-write-to-project-mistakes-and-lessons-files` (blub.db row 188) — capture-lesson now persists to 5 surfaces (workspace + CC auto-memory + blub.db + project mistakes.md OR lessons.md by category)

5. **Reconciled architecture-doc rubric with industry-standard framing.** /research-check confirmed Bean's intuition: scope-narrowing (whole-system vs feature/component) is the canonical distinction — arc42 / C4 / IEEE 42010 / IEEE 1016 all agree. AS-IS vs TO-BE is a flavour attribute that applies to either. This specific skill is AS-IS-flavoured (empty-project HARD GATE + staleness detection + disk verification gates). C1 5/5 + Lens 6 anchors updated; 3 QC tweaks applied.

6. **Design spec assembled** — full optimisation-toolkit + tooling-rebuild design at:
   - **Canonical:** `~/.openclaw/.claude/subprojects/ssb/specs/2026-04-27-optimisation-toolkit-design.md`
   - **Reference copy:** `~/Projects/small-giants-wp/.claude/specs/2026-04-27-optimisation-toolkit-design.md`

## Current State

- **Branch:** N/A (small-giants-wp project work — git state unchanged this session; all work was in spec design + rubric files outside the project)
- **Tests:** N/A (design work)
- **Build:** N/A
- **Live deploy:** N/A — Phase 1 of the rebuild has not started yet

## Known Issues / Blockers

- **Phase 1b update of lifecycle/qc/gap-analysis skills is BLOCKING** Phase 2. Until those skills are utility-aware + rubric-loading-methodology-baked-in, the per-skill optimisation pass cannot use the new toolkit consistently.
- **`/uimax` INGEST command does not exist** — design intelligence compounding can't start until Phase 4 design-brain rebuild builds it.
- **4 invisible skills in autopilot domain table** — playwright, animation-harvest, sgs-discover, sgs-extraction. ~1h fix needed before Phase 1 starts.
- **2 of 5 priority clients (Mama's Munches + CMX Group) have no `sites/<slug>/` dir** — run `/project-init` per client (Pipeline 12), ~30 min each.
- **Hot-lead pressure** — CMX (proposal needed), Snooza/Ophir (live engagement), Indus Phase 2 (blocked on /quoter rebuild). May force re-decisioning if Phase 1+2 drag.

## Next Priorities (in order)

1. **Audit existing planning docs FIRST** (Task 1 in NEXT-SESSION-PROMPT). Two folders, sequentially, full reads, QC each before moving on.
2. **Phase 1a — toolkit utilities** (after audit). Parallel Sonnet subagents for canary_split → 3 utilities.
3. **Phase 1b — lifecycle/qc/gap-analysis skill updates.** BLOCKING. Switch to Opus for system-level work.
4. **Phase 2a-c — rubrics universe.** 22 optimised, remaining tooling spec'd with triage filter, all 13 pipelines spec'd.

## Files Modified

| File | What changed |
|------|--------------|
| 22 × `<skill>/references/end-goal-rubric.md` | New — finalised rubrics across `~/.agents/skills/` and `~/.claude/skills/` |
| `~/.claude/commands/.rubrics/handoff.md` | New — /handoff command rubric in non-auto-discovery subfolder |
| `~/Projects/small-giants-wp/.claude/specs/design-brain/` | New dir with 7 design-action rubrics (colourise, bolder, quieter, normalize, polish, distill, delight) |
| `~/.openclaw/.claude/subprojects/ssb/specs/2026-04-27-optimisation-toolkit-design.md` | New — canonical design spec |
| `~/Projects/small-giants-wp/.claude/specs/2026-04-27-optimisation-toolkit-design.md` | New — reference copy |
| `c:/Users/Bean/Projects/small-giants-wp/.scratch/extracted-rubrics-2026-04-27.md` | New — extracted rubric data from 25 historical gap-analysis reports |
| `c:/Users/Bean/Projects/small-giants-wp/.scratch/rubric-drafting-methodology.md` | New — methodology doc used by all 19 rubric-drafting subagents |
| `c:/Users/Bean/Projects/small-giants-wp/.scratch/skill-batches/all-skills-classified-v2.json` | New — multi-role audit of 155 skills |
| `~/.openclaw/workspace/memory/learning/2026-04-27-no-low-value-perfectionism.md` | New rule capture |
| `~/.openclaw/workspace/memory/learning/2026-04-27-end-goal-rubric-per-skill-mandatory.md` | New rule capture |
| `~/.openclaw/workspace/memory/learning/2026-04-27-capture-lesson-five-surface-persistence.md` | New rule capture |
| `~/Projects/small-giants-wp/.claude/memory/handoffs/2026-04-21-framework-completion-handoff.md` | Archived previous session's handoff |
| `~/Projects/small-giants-wp/.claude/memory/handoffs/2026-04-21-framework-completion-next-session-prompt.md` | Archived previous session's next-session-prompt |

## Notes for Next Session

- **The audit task is non-negotiable per Bean** — full reads, QC between folders, no parallel processing of folders. If you're tempted to skim, don't.
- **Phase 1b is BLOCKING** — don't try to start Phase 2 work even if "the rubrics are ready". The skills that grade them must be updated first or you'll bake current-flawed-grading into the optimised outputs.
- **Phase 2b triage** — when drafting rubrics for the remaining ~158 tools, filter aggressively. Skip pure utilities (one-off CLI wrappers, dev diagnostics, internal-only tools) that don't affect client deliverables. Tag each kept rubric with which pipeline(s) it serves.
- **Phase 3a includes ordering/placement as third lens** — not just coverage + duplicates. Per Bean's 2026-04-28 call: "changing when/where certain skills are used could make them much more impactful." Surface re-ordering candidates in addition to merge/delete candidates.
- **Design-brain goes FIRST in Phase 4** — resolved 2026-04-28. Blueprint schema + Designer modes + Council must be production-ready before ANY other pipeline formalisation. The Blueprint JSON is a new stage that inserts into every other pipeline; rebuilding them before design-brain ships means doing them twice.
- **Phase 3 execution model** — resolved 2026-04-28. Sonnet subagent (draft rubric inline + gap-analysis combined) → Gemini Flash QC → Opus inline synthesises + presents to Bean. 3a (system-level) + 3d (sign-off) stay fully Opus. Parallelism cap: 3 Sonnet subagents. Rubrics are built inline during the cycle — no separate Phase 2c pre-drafting pass needed.
- **Top-task template industries** — resolved 2026-04-28. 5 confirmed: construction (CMX), B2B wholesale/trade (Indus Foods), accountant, healthcare/dental (Snooza as `assistive-equipment` sub-row — consultative/funded, NOT standard ecommerce), gifting ecommerce/wellness brand (Mama's Munches — occasion-driven, gifting + subscription, NOT generic shop-now). 100 seed rows at Phase 3 DB build time.
- **Estimates default LOW** per the time-estimates rule. Don't pad rebuild work with software-dev calibration if it's mechanical or AI-heavy.
- **The 22 rubrics are locked** — don't re-edit unless an audit-task finding forces it. Rubric quality has been calibrated; further tweaks risk perfectionism.

## Next Session Prompt

See `NEXT-SESSION-PROMPT.md` at project root.
