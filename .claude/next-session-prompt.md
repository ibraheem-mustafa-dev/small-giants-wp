---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-25-phase-1-universal-extraction-start
generated: 2026-05-25
parent_session: small-giants-wp-2026-05-25-qc-council-session
primary_goal: "Start Phase 1 of the universal-extraction backbone for the cloning pipeline. First commit MUST be the F1 spike (single-section validation on brand) before any Phase 0 cheat removal or Phase 1B full dispatch. Acceptance: per-section ≤30% × 3 viewports for all 7 body sections (mean baseline 63.2%; hero 17% extracted; brand sgs/quote self-closing with empty body[])."
---

# Next session — Phase 1 universal-extraction backbone (start with F1 spike)

**Invoke `/autopilot` before anything else.**

## STOP — read these 6 docs in order BEFORE any code work

1. **`.claude/reports/2026-05-25-qc-council-issue-register.md`** — canonical reference. ~110 items across Sections A-R. Most important sections to read end-to-end:
   - **Section R (R1-R5)** — consolidated plan with `blocks.replaces` audit + nesting audit + brand `sgs/quote` worked example
   - **Section P (P1-P27)** — 27 binding design principles from Bean's prior-session messages
   - **Section Q (Q1-Q20)** — comprehensive cheat inventory with file:line + replacement path
   - **Section J (J1-J6)** — methodology lessons from the 3-round council
   - **Section L15** — hero is NOT a clean reference (achieves ≤1% via hardcoded cheats per Bean 2026-05-25)
   - **Section O** — total inventory summary

2. **`.claude/plans/2026-05-25-phase-1-universal-extraction.md`** — THIS PHASE PLAN. 19-commit sequence with model routing + skills + predicted deltas + risk per commit. Includes the F1 spike (Commit 7) as the pre-dispatch HARD GATE.

3. **`.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`** — Spec 16. Read §FR1/FR2/FR3/FR4 routing topology; §14 G1-G5 gaps + closure status; §15 universal walker spec.

4. **`.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md`** — Spec 21 diagnostic artefacts map. Critical for understanding what every pipeline-state JSON/JSONL contains.

5. **`pipeline-state/mamas-munches-homepage-2026-05-25-101222/`** — empirical baseline. Read in order:
   - `summary.log` (30 sec)
   - `stage-11-pixel-diff.json` (mean 63.2%; per-section/viewport numbers)
   - `extract.json` per_section_results (brand sgs/quote at b5 — self-closing, no body[])
   - `trace.jsonl` (11 `inner_blocks_no_children` soft-fail traces)
   - `leftover-buckets.json` (500 extraction_failed events)
   - `stage-2.json` (Stage 2 matches; hero conf=1.0; everything else container fallback)
   - `stage-9.json` (coverage: hero 17%; others 0%)

6. **Recent feedback files in `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/`** — start with `feedback_phases_never_ship_as_single_commits.md` (blub.db row 288). Then per MEMORY.md index.

## 11 binding rules (THE rules — most important ones from Section P + captured lessons)

These gate every commit in Phase 1. Read full text in Section P of the register OR the linked feedback files:

1. **Universally-applicable mechanisms** (P1) — no per-block hyperfocus
2. **Empirical-check before architectural conclusion** (P2) — `/sgs-clone --debug-trace` then read artefacts before proposing fix-shapes
3. **All div classes are blocks; just some nested inside others** (P15) — THE structural primitive in operator language
4. **Pipeline must achieve ≤1% deterministically; allowed manual work = block functionality extension + pipeline scripts only** (P17)
5. **Universal flat-scanning preserves hierarchy + accurately assigns CSS rules and content to direct owner** (P18)
6. **Empty InnerBlocks array → walk direct child div descendants** (P7) — the F1 fallback in actionable form
7. **One fix at a time with /verify-loop** (P20)
8. **Don't agree, disagree, or propose without evidence. Find it first.** (P26)
9. **Read full spec before proposing architectural fix-shape** (blub.db 285) — state the primitive in plain English BEFORE proposing
10. **Check sgs-db block capability before evaluating** (blub.db 286)
11. **Phases never ship as single commits** (blub.db 288) — every major task commits separately with /qc-council + measurement + predicted/actual delta in message

Plus the 6 binding rules from the 2026-05-24 systematic-debugging retrospective in `.claude/handoff.md`.

## Tooling table (mandatory references in plan execution)

| Tool | When |
|---|---|
| `/qc-council` | Pre-commit gate on HIGH-leverage commits (marked ⚡ in the phase plan) — blub.db row 255 |
| `/qc-inline` | Per-file checks during implementation |
| `/verify-loop` | 2-attestation per load-bearing claim |
| `/systematic-debugging` | Root-cause investigation if any commit regresses |
| `/subagent-driven-development` | Implementer + 2 reviewers pattern for non-trivial commits |
| `/dispatching-parallel-agents` | F1F + 1G parallel work across composites/blocks |
| `/subagent-prompt` | Cold prompts (embed all 4 Dispatch Bindings A/B/C/D verbatim) |
| `/delegate` | Picks model per task (Haiku mechanical / Sonnet architectural / Cerebras+Gemini Flash validation) |
| `/capture-lesson` | New architectural rules surfaced |
| `/sgs-clone --deploy-target page:144 --debug-trace` | After every commit (Binding B per blub.db 240) |
| `/sgs-update` Stage 1 | role='content' DB sync (Phase 0C) |
| `/docscore` | Auto-runs on every doc Write/Edit per PostToolUse hook |
| `/handoff` | Phase 1 close |
| Playwright MCP | Live-page DOM verification for G1 (hero CTAs) |
| `python ~/.claude/hooks/wp-blocks.py dump` | Schema enumeration BEFORE any "missing X" claim — blub.db 272 |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | DB query CLI |

## First action — F1 spike (Commit 7 of the phase plan)

**Per blub.db row 276 (council fix-shape proposals are HYPOTHESES not specs) — F1 needs smallest-pipeline-slice validation before Phase 1 dispatch.**

1. Read `_lift_inner_blocks` at convert.py:1350-1517 end-to-end. Understand the empty-return at line 1430.
2. Implement a minimal ~20-line F1 fallback inline at line 1430:
   - When `_db_children(parent_slug)` returns empty, walk node's direct child elements (divs AND semantic tags)
   - For each child, call back into `walk(child, ...)` so the universal walker (FR2 atomic-tag + class-based routing) handles them
   - Return the list of emitted markup
3. **Single-section run:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --section brand --deploy-target page:144 --debug-trace`
4. **Measure:** per-section pixel-diff on brand at 375/768/1440 vs baseline (73.8/59.4/50.0).
5. **HARD GATE:**
   - If brand drops ≥20pp at 1440 (≤30%) → F1 validated. Proceed to Phase 0 + full Phase 1.
   - If brand drops <10pp at 1440 OR regresses → HALT. Diagnose. Per blub.db 285, state the architectural primitive in plain English again; verify it's invoked correctly. Surface to Bean before any further work.
6. **Capture the spike result** — append actual numbers + verdict to `.claude/reports/2026-05-25-qc-council-issue-register.md` (new Section S) so the empirical baseline is recorded.

## Phase 1 acceptance gate (refresher)

Per-section ≤30% × 3 viewports for all 7 body sections (21 cells, each must hit ≤30% independently). NO section regresses >5pp. ≥5 of 7 sections drop ≥10pp. Hero attribute-count parity maintained across Phase 0 cheat removal. Full table in `.claude/plans/2026-05-25-phase-1-universal-extraction.md`.

## Where things sit now

- **Old phase-1 plan archived:** `.claude/plans/archive/2026-05-24-phase-1-structural-recovery-superseded-by-phase-1-universal-extraction.md`
- **New phase-1 plan canonical:** `.claude/plans/2026-05-25-phase-1-universal-extraction.md`
- **Goals updated:** `.claude/goals.md` — per-section ≤1% pixel-diff is the primary near-term goal until met
- **Decisions logged:** `.claude/decisions.md` D73 (binding rule) + D74 (Phase 1 scope) + D75 (qc-council verdict)
- **Lesson captured:** blub.db row 288 + `feedback_phases_never_ship_as_single_commits.md`
- **Empirical baseline:** `pipeline-state/mamas-munches-homepage-2026-05-25-101222/` (mean 63.2%, page 144 sandybrown)

## Drift correction history (2026-05-25)

This session caught + corrected:
- Earlier-day prescription to extend `_slot_attr_prefix` was empirically falsified (D71); reverted across Spec 16 + Phase 1 plan + this prompt
- "References to a block that no longer exists" (Tier 1 cheating per Bean 2026-05-25) — sgs/trust-bar retired (D72); badge→sgs/label synonym was wrong
- "Hero already at ≤1%" framing was wrong — hero clones via hardcoded cheats (Section L15); architecture is NOT yet proven by hero
- "Wrapper-context noise floor" claim was wrong per Bean — HTML/CSS/JS translates cleanly through PHP; the diff is converter bugs

Don't repeat any of these. Read Section L15 + L9 + P9 + K17 in the register if any of the above feels new.

## After Phase 1 closes

Phase 1.5 (per-section ≤1% closure) opens. Then Phase 2 (header/footer cloner). See `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md` for Phase 2 scope (parked until Phase 1.5 hits ≤1%).
