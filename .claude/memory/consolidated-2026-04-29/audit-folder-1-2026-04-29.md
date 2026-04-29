# Audit — Folder 1: `.claude/plans/` (excluding archive)
**Date:** 2026-04-29
**Auditor:** Claude Code (Sonnet 4.6)
**Reference plan:** 5-phase optimisation-toolkit rebuild (spec at `~/Projects/small-giants-wp/.claude/specs/2026-04-27-optimisation-toolkit-design.md`)

---

## Document Index

| # | File | What it is |
|---|------|-----------|
| 1 | `current_mission.md` | Active mission tracking for SGS Pipeline Architecture Tasks 3a→4→5 |
| 2 | `sgs-skill-system-upgrade.md` | Strategic plan: 13-unit, 7-session SGS skill system upgrade |
| 3 | `specs/01-wiki-stubs.md` | Spec: generate 57 block wiki stubs (Cerebras) |
| 4 | `specs/02-html-capture.md` | Spec: html-capture.js Playwright script (Cerebras) |
| 5 | `specs/03-wiki-sync.md` | Spec: wiki-sync subcommand for sgs-db.py (Sonnet) |
| 6 | `specs/04-mood-board.md` | Spec: mood board HTML template for sgs-discover (Cerebras) |
| 7 | `specs/05-gap-analysis-batch.md` | Spec: batch gap analysis of 17 design sub-skills (old criteria) |
| 8 | `specs/06-backlog-writer.md` | Spec: backlog writer — extracts B/C gaps from reports to backlog.md |
| 9 | `specs/07-correction-schema.md` | Spec: pipeline_corrections table + sgs-db.py commands |
| 10 | `specs/08-structural-fixes.md` | Spec: create missing hooks/, scripts/ dirs for 3 skills |
| 11 | `specs/test.txt` | Test file — just the word "test" |
| 12 | `specs/ui-ux-pro-max/README.md` | Index for ui-ux-pro-max upgrade spec bundle (2026-04-14) |
| 13 | `specs/ui-ux-pro-max/SPEC.md` | Full 21-unit technical brief for ui-ux-pro-max overnight run |
| 14 | `specs/ui-ux-pro-max/gap-register.md` | 32 gaps for ui-ux-pro-max (S/A/B/C priority with evidence) |
| 15 | `specs/ui-ux-pro-max/model-delegation-matrix.md` | Which model handles which unit + command patterns |
| 16 | `specs/ui-ux-pro-max/oc-cc-adaptations.md` | OC vs CC technical differences for ui-ux-pro-max |
| 17 | `specs/ui-ux-pro-max/overnight-execution-runbook.md` | 8-hour overnight run step-by-step |

---

## Classification Buckets

### A — "Already in our plan"

| Doc | Evidence |
|-----|---------|
| `specs/ui-ux-pro-max/gap-register.md` (partial) | The strategic gap A1 ("architecture anti-pattern: bundling flat-file DB inside a skill") was RESOLVED in the 2026-04-15 overnight run — architecture committed to bundled CLI + SQLite at 95% confidence (morning report confirms). The 7 design-brain rubrics (colourise, bolder, quieter, normalize, polish, distill, delight) shipped in 2026-04-28 are the Phase 4 foundation, building ON the committed bundled architecture. Remaining open gaps from the register (C-grade: design.csv schema broken, wrong column counts in 4 CSVs, stats command output issue) are Phase 4 inputs. |
| `specs/ui-ux-pro-max/oc-cc-adaptations.md` (partial) | Section "Invocation patterns per platform" and the "shared paths" pattern is technically current — still describes how both platforms access the CLI. Relevant reference if Phase 4 design-brain connects to OC consumers. |
| `current_mission.md` (partial) | The animation-harvest and sgs-discover R-items (R1-R12) from the pipeline audit are explicitly flagged as a known blocker in the 2026-04-28 handoff: "4 invisible skills in autopilot domain table — playwright, animation-harvest, sgs-discover, sgs-extraction. ~1h fix needed before Phase 1 starts." The specific R-items are not listed in the handoff, but the task is acknowledged. |

---

### B — "Done"

| Doc | Deliverable | Completed |
|-----|-------------|----------|
| `specs/01-wiki-stubs.md` | 57 wiki files at `~/.agents/skills/sgs-wp-engine/wiki/blocks/<slug>.md` | Session A, 2026-04-13 |
| `specs/02-html-capture.md` | `~/.agents/skills/shared-references/html-capture.js` | Session B, 2026-04-13 |
| `specs/03-wiki-sync.md` | `wiki-sync` subcommand added to `sgs-db.py` | Session A, 2026-04-13 |
| `specs/04-mood-board.md` | `~/.claude/skills/sgs-discover/references/mood-board-template.html` | Session B, 2026-04-13 |
| `specs/07-correction-schema.md` | `pipeline_corrections` table + `corrections list/add` commands in `sgs-db.py` | Session A/B, 2026-04-13 |
| `specs/08-structural-fixes.md` | `hooks/`, `scripts/` dirs with READMEs for animation-harvest, sgs-discover, build-website | Session B, 2026-04-13 |
| `sgs-skill-system-upgrade.md` — Sessions A, B, C | Wiki (57 stubs), sync script, html-capture.js, corrections table, structural fixes (A); sgs-extraction skill, keyframes table, mood board template, trend detection ref, 36 deferred gaps documented (B); 10 WP skills graded, batch avg 3.65 B (C) | 2026-04-13 |
| `specs/ui-ux-pro-max/SPEC.md` — Units 1-18 | U1 sanitise_cell patch (verified: 2 matches in core.py), U3 hardcoded paths fixed (verified: 0 remaining), U7 draft.csv archived, U11 Integration Contract + Data Dictionary, U12 7 consumer skills wired (colourise, polish, bolder, design-review, visual-qa, sgs-wp-engine, normalize — verified: 13 total wired including post-run additions), U13-U14 --json/--limit docs, U17 provenance on 29 CSVs, U18 SQLite migration (5,598 rows, 1.9 MB, 0.11ms queries). Architecture committed: bundled path, 95% confidence. Verified via `~/.claude/lifecycle-reports/2026-04-15-night.md`. | 2026-04-15 overnight run |
| `specs/ui-ux-pro-max/gap-register.md` (security + path gaps) | U1 closed S1 (CSV injection), U2+U7 closed S2 (PII/draft.csv), U3 closed CL2 (hardcoded paths), U1+U4 closed R1 (no error handling), U6 closed G1 (requirements.txt), U14 closed G2 (--limit), U11 closed G3 (data dictionary). All A-priority security + technical gaps now CLOSED. Remaining open: C-grade items (design.csv schema broken, 4 CSVs wrong column count, stats command verbose output). | 2026-04-15 overnight run |

---

### C — "Contradicts"

| Doc | How it contradicts | Material? |
|-----|-------------------|-----------|
| `specs/05-gap-analysis-batch.md` | Uses the OLD gap-analysis criteria (completeness, clarity, routing_accuracy, robustness, security, negative_routing, exemplar_quality, ecosystem_awareness — 0-5 scale with old anchors). The current plan uses **end-goal rubrics with end-result anchors** (5/5 = gold output, 1/5 = broken, mandatory Never Do, Lens 6). Running spec 05 as written would produce reports incompatible with Phase 2a's per-skill optimisation pass. The 17 target skills are correct; the evaluation framework is wrong. Specific conflict: spec 05 says "Score: 5.0 gold / 4.0 ship / 3.0 gaps" — current rubrics use behaviour-anchored statements not numeric thresholds. | **YES — high.** Running this spec would create a parallel corpus of old-style reports that contradicts the rubric-first design from 2026-04-28. |
| **(none from SPEC.md)** | The overnight run executed successfully (18/21 units shipped). U18 (SQLite migration) RAN and chose the bundled path — fully compatible with Phase 4's design-brain rebuild, which is about SKILL PIPELINE architecture, not storage layer. The 2026-04-15 morning report at `~/.claude/lifecycle-reports/2026-04-15-night.md` confirms U1-U18 closed, U19 partial (5/15 subcommands), U20-U21 deferred conditional. The original C classification of SPEC.md units 18-21 was based on a false "uncertain run status" premise — corrected here. | N/A — reclassified. See Section B and D below. |
| `current_mission.md` — Exit criterion 3 | "3 missing dispatch modes (interactive-design analysis, sgs-wp-engine block extension, visual-qa animation) either exist as defined sections / sub-skills OR animation-harvest's dispatches have been redesigned to hit live targets." The current plan's Phase 1b explicitly updates lifecycle/quality/QC skills (skill-optimiser, skill-writer, pipeline-optimiser, pipeline-writer, command-writer, gap-analysis, qc, qc-inline) with new rubric-loading methodology and utility-awareness. Animation-harvest dispatch modes are not in the Phase 1b update list; the fix is classified as a "before Phase 1 starts" blocker (~1h). These two paths diverge in how they define "fixed." | **YES — low-medium.** The current plan will fix the autopilot routing gap but may not address all three dispatch mode gaps from current_mission.md exit criterion 3. |

---

### D — "Outdated"

| Doc | Why outdated |
|-----|-------------|
| `current_mission.md` | This was the active mission doc for Tasks 3a→4→5 of the SGS pipeline architecture plan. Those tasks (complete R1-R12 audit recs, run 35-item gap analysis, build system-level fix plan) have been subsumed into the new 5-phase optimisation-toolkit plan. The 35-item gap analysis pass is now Phase 3's "three-lens gap-analysis." The system-level fix plan is Phase 3's output. The doc says "Delete this file when the mission ships" — the mission was never formally closed but has been superseded. The specific R1-R12 items for animation-harvest and sgs-discover are still outstanding but are now tracked as a pre-Phase-1 blocker in the handoff, not as a mission doc. |
| `sgs-skill-system-upgrade.md` — Sessions D, D2, E, F | Sessions D/D2 (17 design sub-skills gap analysis) and E/F (agents + bulk fix + system plan) were never run. The 17 target skills from Session D are the same as the new Phase 2a/2b targets, but the execution model has changed: instead of gap-analysis-first → fix-second, the new approach is rubric-first (Phase 1b bakes rubrics into lifecycle skills) → optimisation pass (Phase 2a). The session-based plan structure (90 min blocks, delegation via Gemini) is replaced by the optimisation-toolkit utilities approach. |
| `specs/06-backlog-writer.md` | Depends entirely on spec 05 producing old-style B/C gap reports. Since spec 05 is contradicted, this spec is also dead. The new approach tracks gaps via end-goal rubric scoring (per-criterion shortfalls), not a separate B/C classification written to `backlog.md`. |
| `specs/test.txt` | Placeholder/test file. No content. Can be deleted. |
| `specs/ui-ux-pro-max/README.md` | Index pointing to the overnight run bundle. The overnight run executed and completed (2026-04-15, 18/21 units). This doc is now a historical index for completed work. |
| `specs/ui-ux-pro-max/model-delegation-matrix.md` | Delegation matrix for the specific overnight run units (U1-U21). Superseded by Phase 4's own delegation approach. The model/cost table is historical context, not current guidance. |
| `specs/ui-ux-pro-max/overnight-execution-runbook.md` | Step-by-step for the 2026-04-15 overnight run. No evidence this ran. Superseded. |
| `specs/ui-ux-pro-max/oc-cc-adaptations.md` (partial) | The "Post-Session 3 OC integration checklist" and migration implications (MCP vs bundled) are superseded. The Phase 4 design-brain rebuild will determine the final architecture, not this doc. The technically-accurate sections (shared paths, invocation patterns) are derivable from the skill itself. |

---

## Cross-Document Patterns

### 1. Spec-execution split with no tracking of what ran

Specs 01-08 are execution briefs for Sessions A-C. Sessions A-C ran (complete by 2026-04-13). But none of the spec files say "DONE" or are dated after execution. There's no trail from spec → delivery confirmation. Pattern: this creates ambiguity when new sessions open about what's actually shipped.

**Affects:** All 8 spec files. Recommendation: close completed specs with a one-line "Completed: YYYY-MM-DD" header, or move to archive/.

### 2. Two overlapping gap analysis frameworks

The OLD framework (spec 05: completeness / clarity / routing_accuracy / robustness) and the NEW framework (22 end-goal rubrics: end-result anchors, per-criterion behaviour statements, Never Do, Lens 6) both target many of the same 17 design sub-skills (adapt, audit, bolder, clarify, colourise, critique, delight, distill, extract, harden, normalize, onboard, optimise, polish, quieter, teach-impeccable). Running both produces contradictory grades for the same skills.

**Affects:** spec 05, sgs-skill-system-upgrade Sessions D/D2, and the 17 skills' historical gap reports. Recommendation: delete spec 05 and retire the old-framework gap reports for the 11 skills that now have end-goal rubrics.

### 3. ui-ux-pro-max overnight run — CONFIRMED COMPLETED

The overnight run executed on 2026-04-15. Morning report exists at `~/.claude/lifecycle-reports/2026-04-15-night.md`. 18/21 units shipped (U15 partial, U16 + U20-U21 skipped). Verified facts:
- `sanitise_cell` in `scripts/core.py`: ✅ present (2 matches)
- Hardcoded path `python3 skills/ui-ux-pro-max` in SKILL.md: ✅ fixed (0 matches)
- Architecture decision: ✅ COMMITTED — bundled CLI + SQLite, 95% confidence
- Consumer skills wired at run time: 7 (colourise, polish, bolder, design-review, visual-qa, sgs-wp-engine, normalize). Current grep count: 13 — 6 more were wired after the overnight run in subsequent sessions.
- DB expansion: colours 161→261 (+100 Tailwind v4 verified rows), SQLite mirror 5,598 rows compiled.

Note: the 2026-04-28 handoff does NOT mention this run, which made the status look uncertain in the prior audit draft. The absence in the handoff is a handoff-gap, not evidence of non-execution.

**Affects:** Recommended actions section — the "action item before Phase 1" verification has already been answered. Phase 4 scope is cleaner: the storage architecture is decided; Phase 4 is purely about restructuring the skill into a pipeline (Blueprint schema + Designer + Council).

### 4. current_mission.md never closed

The doc says "Delete this file when the mission ships." The mission (Tasks 3a→4→5) was never formally closed. The work was subsumed into a bigger plan rather than completed on its own terms. Exit criteria 2, 3, 4, 5, 6 are unmet per available evidence.

**Affects:** workspace clarity and the animation-harvest/sgs-discover R-items which are now floating between two systems (current_mission.md and the handoff's blocker list).

---

## Recommended Actions

### Delete (6 items)

| File | Reason |
|------|--------|
| `specs/test.txt` | Placeholder, no value |
| `specs/06-backlog-writer.md` | Depends on superseded spec 05 |
| `specs/ui-ux-pro-max/model-delegation-matrix.md` | Superseded overnight run artefact |
| `specs/ui-ux-pro-max/overnight-execution-runbook.md` | Superseded overnight run artefact |
| `specs/ui-ux-pro-max/README.md` | Index to superseded bundle |
| `current_mission.md` | Per its own "delete when mission ships" rule; mission superseded |

### Archive (5 items — keep for reference but move to archive/)

| File | Reason |
|------|--------|
| `sgs-skill-system-upgrade.md` | Sessions A-C done; Sessions D-F superseded. Good historical context |
| `specs/01-wiki-stubs.md` through `specs/04-mood-board.md` | Completed specs — archive with "Completed: 2026-04-13" note |
| `specs/07-correction-schema.md` | Completed — archive |
| `specs/08-structural-fixes.md` | Completed — archive |

### Update and keep (2 items)

| File | Action needed |
|------|--------------|
| `specs/ui-ux-pro-max/gap-register.md` | Verify which gaps were closed by any overnight run work, then mark closed items. Keep as Phase 4 input. Move to `specs/` root or Phase 4 plan folder. |
| `specs/ui-ux-pro-max/oc-cc-adaptations.md` | Strip the superseded sections (migration implications, Post-Session 3 OC checklist). Retain the shared-path and invocation pattern sections as Phase 4 technical reference. |

### Replace (1 item)

| File | Action |
|------|--------|
| `specs/05-gap-analysis-batch.md` | Replace with a note pointing to the end-goal rubric approach in `~/.claude/skills/gap-analysis/references/end-goal-rubric.md`. The 17 skills are correct targets; the framework is wrong. |

### Action items before Phase 1 (not file cleanup — separate tasks)

**All verification already done during this audit:**
- ✅ sanitise_cell: present in core.py
- ✅ hardcoded paths: fixed (0 remaining)
- ✅ 13 consumer skills wired (7 at overnight run, 6 more since)
- ✅ Morning report exists with full results

**Remaining Phase 4 inputs from the gap-register (C-grade, not blockers for Phase 1):**
- `design.csv` schema broken (header=2, rows=6+) — pre-existing issue
- 4 CSVs (stack/styles/typography) have wrong column count
- `stats` subcommand bleeds bad-row content into provenance output
These 3 new gaps discovered during the overnight run are Phase 4 work, not Phase 1 blockers.
