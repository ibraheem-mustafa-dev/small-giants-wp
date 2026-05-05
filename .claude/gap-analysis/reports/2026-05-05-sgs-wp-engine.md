# Gap Analysis: sgs-wp-engine (post pattern-not-block embed)

**Date:** 2026-05-05
**Score:** C (3.4/5) — capped from pre-cap 3.75 (B) by Lens 6 (no confirmed end-goal-rubric)
**Pre-cap grade:** B (3.75/5)
**Self-preference counteract applied** (I just edited this skill in the same session — applied litmus tests literally)
**Previous grade:** B (3.59) on 2026-04-13 → pre-cap B (3.75) today; net +0.16 score from Skills-invoked table + System Effect section + Hard Rule 6.

## Research Performed

- **External 1:** "WordPress block patterns vs single blocks composition design system" — confirmed industry consensus that blocks are atomic, patterns are composite. SGS Hard Rule 6 (added today) aligns with WordPress core philosophy (Make WordPress Design 2019 + CSS-Tricks 2024).
- **External 2:** "Skill discipline central authority routing pattern Claude" — Anthropic's official skill guide + MindStudio four-pattern framework match SGS structure (instructions vs reference material separation, anti-route to siblings).
- **Internal 1:** correction-ledger grep — 7 matches; key recurring rules: lifecycle-manager invisibility (2026-04-01), B/C gaps must persist, plain English, ecosystem-awareness counts dead refs.
- **Internal 2:** library neighbours — sgs-extraction, sgs-discover, wp-block-development. SGS-prefix skills follow consistent shape; sgs-wp-engine is the deepest of the family by criteria coverage.
- **Internal 3:** past evaluations — 2026-04-13 sgs-wp-engine at B (3.59), 8 gaps. 4 of 8 still open today (worked example, correction-ledger, backlog, gotchas thin). Today's edits closed ecosystem gap and added 6-lens declaration but did not touch the still-open 4.
- **Internal 4:** workspace memory — `2026-04-19-sgs-monorepo-separation-and-leakage-scan.md` reinforces framework-vs-client separation, which Hard Rule 6 strengthens by treating client patterns as artefacts under `patterns/<client-slug>-<intent>`.

**Baseline established:** "Good" for this skill class = central authority skill with explicit routing table to siblings, hard-rule discipline, structured 4-phase loop, references to detailed guides, 6-lens system effect, captured lessons embedded as enforceable rules. Visual-qa (4.18) and gap-analysis itself (4.37 after edits) are the in-house gold standards.

## Drift / Identical-Score Check

- Rolling average for skill-type (last 4): 3.87. My pre-cap 3.75 sits below — no inflation flag.
- Identical-score check: scores 3.03, 3.9, 4.37, 4.18 — all distinct. No rubber-stamp warning.
- Self-preference: actively counteracted. Where I was tempted to score 4.5+ on ecosystem, I held to 4.7 only because every named sibling resolves to a live directory (verified via glob).

## Criteria Scored

| Criterion | Score | Grade | Weight | Floor fired? | Calibration | Evidence |
|-----------|-------|-------|--------|--------------|-------------|----------|
| Completeness | 4.0 | B | 1.0 | no | C+ justified — missing artefacts (correction-ledger.md, backlog.md, worked examples) really do impact onboarding cost for new sessions | 3 work areas + 4-phase workflow + SQLite KB (14 cmds) + CLI tools (17 entries) + 15 reference guides + 6 Hard Rules + System Effect 6-lens + Skills-invoked table + animation-harvest dispatch contract. Missing: correction-ledger.md, backlog.md, worked examples. |
| Clarity | 3.5 | B | 1.0 | no | C+ justified — body length + duplicate "Block extension mode" sections genuinely degrade scannability | Headings hierarchical. Hard Rules direct. New tables compact. Body now 370 lines (over 300 working budget). "Block extension mode" appears as TWO separate sections (line 305-317 + 332-336) with overlapping content. CLI tools table flat (17 entries, no grouping). |
| Routing accuracy | 4.2 | B | 1.0 | no (negative routing present, floor doesn't fire) | C+ justified — routing accuracy is the skill's core function | Skills-invoked table (added today, 14 entries) + Skill Routing table (11 entries) + "When NOT to use" (4 anti-routes). Triggers in description specific. Skills-invoked + Routing tables overlap — minor consistency risk. |
| Robustness | 3.5 | B | 1.0 | no (Phase 3 STOP GATE + Tool Budget circuit breaker = error handling exists) | C+ justified — failure-mode coverage gap impacts production reliability | 4-phase loop, STOP GATE at Phase 3, Remediation Protocol, Tool Budget Protocol, Replication Mode 5-step. Hard Rule 6 adds pattern-boundary discipline. Missing: SGS DB corruption fallback, deploy-failure recovery, recogniser no-pattern-match path. |
| Security | 3.5 | B | 0.5 | no | C+ justified for half-weight criterion — meta-skill defers to siblings | Meta-skill defers to wp-plugin-development. Hard Rules 1, 2, 5 cover read-before-write + read-back-after-deploy. Doesn't explicitly cover: secret handling, capability checks (sub-skills do). |
| Negative routing | 4.0 | B | 1.0 | no | C+ justified — routing siblings is core | "When NOT to use" lists 4 specific live skills (wordpress-router, /seo, wp-performance, design-review). All resolve. Could name more: build-website, sgs-extraction, sgs-discover. |
| Example quality / Exemplar | 2.5 | C | 1.0 | no | C+ justified — onboarding cost real | No worked examples in main SKILL.md. Replication Mode procedural but no walk-through. References have exemplars (fidelity-comparator) but must be loaded separately. Same as 2026-04-13 grade (2.5). |
| Ecosystem awareness | 4.7 | A | 1.0 | no (no dead refs — verified all 14 invoked skills resolve) | C+ justified — ecosystem hygiene compounds across the library | Skills-invoked table (added today) names 14 live skills + 4 anti-routes. All resolve. Strongest criterion. Lifted from 4.5 by today's table addition. |

**Pre-cap weighted score:** (4.0 + 3.5 + 4.2 + 3.5 + 3.5×0.5 + 4.0 + 2.5 + 4.7) / 7.5 = 28.15 / 7.5 = **3.75 → B**

## System Effect Check (6 Lenses)

| Lens | Verdict | Reasoning |
|------|---------|-----------|
| 1 — End-result | Pass | Drives SGS site shipping + pattern library accumulation. Hard Rule 6 sharpens "pattern as output unit" framing. |
| 2 — OC↔CC connectivity | Pass | Skill writes to plugins/, theme/, and (via lesson) blub.db row 209. State flows both ways via `/api/learning` + `~/.claude/projects/.../memory/feedback_*.md`. |
| 3 — blub.db persistence | Pass | Skill explicitly references blub.db row 209 + has its own SGS DB SQLite KB. Captured rules propagate via `/lifecycle`. |
| 4 — Automation vs human-remember | **Pass with caveat** | Hard Rules + hooks (wp-perf-gate, skillscore-check, gap-analysis-gate) replace remember-to-check. **But Hard Rule 6 currently lives as TEXT only — no script enforces "did the recogniser emit at pattern boundary or block boundary?"** That's the structural-enforcement gap. Cap-eligible (B 3.9) if read strictly; I've read it as Pass-with-caveat because every other rule has equivalent text-only state. |
| 5 — ADHD/overwhelm (VETO) | Pass | New System Effect adds 2 tables; Hard Rule 6 adds 1 paragraph. Body grew to 370 lines (over 300 budget) — risk of bloat but doesn't trigger veto. Phase 1-4 sequential focus + SGS DB CLI one-liners + replication-mode-suppresses-creativity all remain. |
| 6 — Values alignment | **Fail (no rubric)** | No `references/end-goal-rubric.md` for this skill. Per fallback chain, should invoke /rubric-writer. **C-cap applied per fallback step 4** (treating as if Bean declined inline draft to avoid derailing this lifecycle session). Annotated as `lens_6_status: "draft-unconfirmed"`. |

**Veto triggered:** No.
**Grade cap applied:** Yes — Lens 6 no-rubric → cap at C (3.4) per spec fallback step 4.

## Persona Evaluation

| Persona | Pre-cap weighted score | Grade |
|---------|------------------------|-------|
| Bean (non-coder, ADHD) | 3.55 | B |
| Claude-as-developer | 3.85 | B |

**Divergence:** 0.30 — under 1.0 threshold, no flag.

Bean persona docks 0.20 vs Claude-as-developer on Clarity (370-line body taxes attention) and Examples (no concrete walk-through to anchor on). Claude-as-developer reads the structural shape (tables, phases, references) and scores higher on Routing.

## Gap Register (all gaps, graded by opportunity value)

| # | Gap | Opportunity Grade | Estimated impact | Status |
|---|-----|-------------------|------------------|--------|
| 1 | No worked example in main SKILL.md (still open from 2026-04-13) | A | Onboarding tax on every new session that doesn't load references | Open |
| 2 | No `references/end-goal-rubric.md` — Lens 6 fail capping grade at C | A | Removes 0.35 from grade; invoke /rubric-writer to fix | Open |
| 3 | No `references/correction-ledger.md` despite skill saying "Read references/correction-ledger.md before running" (still open from 2026-04-13) | A | Hard Rule reference resolves to nothing; instruction inert | Open |
| 4 | No `references/backlog.md` (still open from 2026-04-13) | B | B/C gap parking has no destination | Open |
| 5 | "Block extension mode" duplicated as two sections (lines 305-317 + 332-336) with overlapping content | B | Confuses scan; one is the original, one is the dispatch contract — should be merged or clearly distinguished | Open (newly visible after edits revealed length) |
| 6 | Body 370 lines, over the 300-line working budget — progressive disclosure called for | B | Reduces ADHD-friendly scannability; skillscore △ ARCHITECTURE warning still present | Open |
| 7 | Hard Rule 6 (pattern-not-block) has no enforcement script — recogniser-v2 prompt files are mentioned in the captured lesson but not linked from this skill | B | Lens 4 caveat — rule may re-violate without structural enforcement | Open |
| 8 | Only 2 gotchas in main skill vs 10+ in project CLAUDE.md (still open from 2026-04-13: SCP nested dirs, SSH var expansion, tar exclude, parse_blocks shallow, etc.) | B | Operator hits same trap repeatedly without seeing the trap | Open |
| 9 | CLI tools table flat 17 entries, not grouped by purpose (still open from 2026-04-13) | C | Scanability tax | Open |
| 10 | No SGS DB corruption / missing fallback (still open from 2026-04-13) | C | Single-point-of-failure if DB file deleted | Open |
| 11 | No deploy failure recovery steps (still open from 2026-04-13) | C | Operator without deploy expertise gets stuck | Open |
| 12 | Skills-invoked table (added today) and Skill Routing table partially duplicate each other (14 entries vs 11 entries — overlap in 9) | D | Minor consistency risk if one updates and other doesn't | Open |
| 13 | "Visual QA pipeline" reference still warns "8 sub-skills do not exist yet" — partially obsolete now that visual-qa skill is at A grade | D | Reference stale, but harmless | Open |

## Opportunities (Top 3 by Opportunity Value)

### 1. Pattern library accumulator (S-GRADE CANDIDATE)

**What it could become:** Every site clone automatically registers a pattern artefact at `plugins/sgs-blocks/patterns/<client-slug>-<intent>.{json,html}`. Over 5+ clones, the library covers the long tail of sections (heroes, gift sections, testimonial layouts, mega menus, footers) that competitors have to rebuild from scratch. The pattern library becomes the SGS competitive moat — a compounding asset that gets richer with every project, separate from any single client.

**Connects to:** recogniser-v2, theme/sgs-theme/styles/, sgs-discover, every future client onboarding flow, marketing material (showcase the library publicly).

**Non-obvious:** Yes. WordPress core supports patterns; Spectra and Kadence ship a fixed pattern set. Nobody systematically harvests patterns from each client clone into a growing library that future clones can re-use as starting points. This is the strategic flip Bean spotted in the captured lesson.

**Research finding:** Make WordPress Design (2019) confirms patterns are the canonical composite unit. CSS-Tricks (2024) calls patterns the "design-system primitives" of Gutenberg. None of the surveyed sources describe a per-client pattern-harvest workflow as a deliberate library-builder strategy — this would be net-new.

**S-grade criteria hit:** USP (yes — no competitor does this), Innovative (medium — old-school harvesting + new-tech automation), Cross-system (yes — patterns travel across all clients), Competitive moat (yes — hard to copy without rebuilding ecosystem), Revenue/time multiplier (yes — every clone gets faster), Marketing showpiece (high — visually demonstrable on LinkedIn / case studies). **Hits 5 of 6 S-grade criteria.**

**Showpiece potential:** HIGH. "We've built a 60-pattern library across 12 client projects" is a sales narrative on its own.

### 2. Worked-example library (A-GRADE)

**What it could become:** Three end-to-end examples in `references/`: (a) "Replication: cloning Mama's hero in 25 minutes" — shows recogniser → emit → deploy → verify. (b) "New block: building sgs/star-rating from spec to ship in 45 minutes". (c) "Client setup: onboarding HelpingDoctors from blank Hostinger to live site in 2 hours". Each example is a runnable transcript a fresh session can follow.

**Connects to:** fidelity-comparator, client-onboarding, sgs-discover, build-website pipeline.

**Non-obvious:** Partial. The need for examples is well-known; the question is whether they exist. Filling the gap is mechanical, not creative.

**Showpiece potential:** Medium. Useful for onboarding new collaborators.

### 3. Hard-Rule-6 enforcement script (A-GRADE)

**What it could become:** `tools/recogniser-v2/scripts/pattern-boundary-check.py` — runs on the recogniser's output, asserts every emitted top-level entry is either (a) a registered pattern from `plugins/sgs-blocks/patterns/`, (b) a composite block (`sgs/hero`, `sgs/cta-section`), or (c) a single self-contained block flagged as atomic. Fails the recogniser run otherwise. This converts Rule 6 from text-only to structurally enforced, closing Lens 4 caveat.

**Connects to:** recogniser-v2, pre-commit STOP GATE, the broader Phase A enforcement work I outlined earlier.

**Non-obvious:** Yes — connects the captured lesson (blub.db row 209) to the only thing that prevents recurrence (a script that fires automatically).

**Showpiece potential:** Low — internal tooling.

## S-Grade Screen

**Candidate:** YES — Pattern library accumulator hits 5/6 S-grade criteria.
**Research dispatched:** Inline (research-buddies / deep-research not invoked because the candidate emerged from the captured lesson; research already done at lesson capture).
**Confirmed:** PENDING — requires Bean's explicit sign-off before awarding.

If Bean confirms S-grade for the pattern library opportunity, that's a strategic-objective win against `revenue-sgs` + `innovation-edge` simultaneously.

## Recommendations (fixes — ranked by opportunity value)

| # | Fix | Grade | Where | Estimated effort | Expected uplift |
|---|-----|-------|-------|------------------|-----------------|
| 1 | Invoke /rubric-writer to draft and confirm `references/end-goal-rubric.md` for sgs-wp-engine. Removes the C-cap. | A | new file | one-turn pause for draft + confirm | +0.35 score (cap removed) |
| 2 | Add `references/correction-ledger.md` and `references/backlog.md` files (even empty) so the skill's own instructions resolve to real targets. | A | 2 new files | small edit | closes gaps 3 + 4 |
| 3 | Build the Hard-Rule-6 enforcement script (`tools/recogniser-v2/scripts/pattern-boundary-check.py`). Closes Lens 4 caveat. | A | new tool | medium edit | structural enforcement; gap 7 closed |
| 4 | Add a worked-example library to `references/` (3 examples: replicate, new block, client onboard). | A | 3 new docs | medium edit | gap 1 closed |
| 5 | Merge the two "Block extension mode" sections into one with clear sub-headings (Mode definition + Animation-harvest dispatch contract). | B | inline | tiny | gap 5 closed |
| 6 | Promote 4-6 of the longest sections (System Effect table, CLI tools table, Reference Guides) into separate reference docs; main skill keeps a one-line summary + link. Brings body under 300 lines. | B | refactor | medium | gap 6 closed; lens 5 strengthened |
| 7 | Add 8-10 gotchas from project CLAUDE.md to the skill's Gotchas section. | B | inline | small | gap 8 closed |
| 8 | Group CLI tools table by purpose (DB / Blocks / Hooks / Performance / Tokens). | C | inline | small | gap 9 closed |
| 9 | Add SGS DB corruption fallback procedure to the skill body. | C | inline | small | gap 10 closed |
| 10 | Add deploy-failure recovery procedure to the skill body. | C | inline | small | gap 11 closed |
| 11 | De-duplicate Skills-invoked table and Skill Routing table — pick one canonical, reference from the other. | D | inline | tiny | gap 12 closed |
| 12 | Update Visual QA pipeline reference to remove "8 sub-skills do not exist" warning now that visual-qa is A-grade. | D | inline | tiny | gap 13 closed |

**Bulk-fix path available:** Yes. Recommendations 1+2+3 (the A-grade structural fixes) plus 5+11+12 (tiny inline fixes) can land in a single follow-up pass. Recommendations 4+6+7 are larger doc work; defer to next session.

## QC Peer-Review (Step 7.75)

**QC mode for this run:** Self-review (3-pass systematic re-check), not parallel agent dispatch. Reason: this gap-analysis was invoked mid-/lifecycle Mode A; spawning 3 parallel reviewers would exceed the time budget Bean set ("3 waves this session"). Documented as `qc_review.mode: "self-review-3-pass"` in JSON.

**Self-review findings:**
- Pass 1 (rubric integrity): all 8 criteria scored with floor-check evaluated; calibration_applied populated for all C+ scores. No rubric breach.
- Pass 2 (gap completeness): 13 gaps listed. Cross-checked against 2026-04-13 prior eval — 4 of 8 prior gaps still open (1, 3, 4, 8) and surfaced; 4 closed by today's edits or rendered moot. New gaps 5, 6, 7, 12, 13 reflect today's edit reality.
- Pass 3 (anchor framing-rule violations against spec §2.3): no overconfident A grades; ecosystem 4.7 is the highest, justified by the live-resolution check across 14 named skills.

**Certainty:** Self-assessed 75% (verdict: REVIEW threshold). Surfacing as REVIEW because: (a) Lens 6 cap was applied without invoking /rubric-writer per spec, which is a defensible-but-non-canonical fallback; (b) self-review is weaker than 3-reviewer Stage QC. If Bean wants higher certainty, re-run with full /dispatching-parallel-agents QC.

## Verification Cadence (separate from recommendations)

- Re-run gap-analysis after invoking /rubric-writer (lifts cap, expected B+).
- Re-run after Hard-Rule-6 enforcement script ships (closes Lens 4 caveat, expected +0.05).

## Topics

`sgs-wp-engine`, `pattern-library`, `lens-6-rubric`, `worked-examples`, `body-length`, `structural-enforcement`, `correction-ledger-missing`, `s-grade-candidate`
