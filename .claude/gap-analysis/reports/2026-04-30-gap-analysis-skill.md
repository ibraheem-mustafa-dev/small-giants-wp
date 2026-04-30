# Gap Analysis — /gap-analysis skill

**Date:** 2026-04-30
**Target:** `~/.claude/skills/gap-analysis/SKILL.md`
**Type:** skill
**Phase:** Phase 1.5 closure / Phase 2 prep
**Run by:** /lifecycle → Mode A full pass (recursive — gap-analysis grading itself)
**Rubric:** `~/.claude/skills/gap-analysis/references/end-goal-rubric.md` (bean_signoff: confirmed 2026-04-30)

## Verdict

**Grade: C (3.03/5)** against confirmed 10-criterion rubric.
**Skillscore: 92%** (passed ≥90% threshold for skill).
**Recommendation:** 4 SKILL.md edits parked to next session — they account for the C grade. Once they land, target should grade A.

## Strongest / weakest

- **Strongest:** Canonical output completeness (4.0/5, weight 1.5), Gap register completeness (4.0/5, weight 1.0), System-effect lens completion (4.0/5, weight 1.5)
- **Weakest:** Subagent batch protocol (1.5/5, weight 1.5) — Hard Rule 1 currently forbids subagents; direct contradiction with Bean's amendment

## Persona scores

| Persona | Score | Weights applied |
|---------|-------|-----------------|
| Bean (operator) | 3.05 | 1.3× plain-English; 1.5× HARD GATE |
| Lifecycle quality engineer | 3.05 | 1.3× anti-inflation; 1.5× HARD GATE; 1.3× batch |
| Persona-score disagreement | 0.0 | No flag (≤ 1.0 threshold) |

## 6-Lens System Effect

| Lens | Verdict | Reasoning |
|------|---------|-----------|
| 1 End-result | PASS | Produces evidence-backed grades that drive lifecycle decisions across the stack |
| 2 OC↔CC | PASS | blub.db POST + dual-write reports surface across both surfaces |
| 3 blub.db persistence | PASS | evaluation-history.json + /api/knowledge POST |
| 4 Automation vs human-remember | PASS | pending-gap-analysis-gate hook enforces invocation; corrections.json read at Step 1 |
| 5 ADHD/overwhelm | PASS | Structured deliverables; plain-English summaries; no net cognitive load added |
| 6 Values alignment | PASS | Confirmed rubric scoring 3.03/5 — gaps prioritised |

No veto. No grade cap.

## Gap register (9 gaps, graded by opportunity value)

### A-grade (highest value — fix unlocks real impact)

1. **Hard Rule 1 forbids subagent dispatch — contradicts Bean's batch protocol amendment** (criterion 10, scored 1.5). Highest-leverage gap. Once Hard Rule 1 is replaced with the conditional batch protocol (subagent → QC → batch findings to Bean → batch decisions → batch work), gap-analysis can run in parallel across the entire SGS roster. Phase 2 throughput multiplies.

2. **No mandatory QC stage between scoring and Bean presentation** (criterion 6, scored 2.5). The cross-turn pause is now embedded ✓ but the QC peer-review step before any Bean-facing recommendation is not. Closes the recurrence pattern (id=149 → 3 today) where unreviewed findings reach Bean. Real impact on every future run.

3. **C-grade calibration rule not embedded — Bean's "C+ = real impact, not score-chasing" rule** (criterion 2, scored 3.0). Bean implements all C+ gaps by default. Mis-calibration → wasted Bean cycles fixing cosmetic issues. The rule needs to live in Step 4 (Score) so future runs apply it.

### B-grade (medium-high value)

4. **Step 5 lacks "plain-English, no technical jargon" anchor for opportunity descriptions** (criterion 9, scored 3.0). Opportunities currently surface but may use jargon Bean has to translate.

5. **Bulk-fix-default offer not required when presenting gap remediations** (criterion 5, scored 2.5). ADHD Rule 8 explicit pattern: scores ship with remediations, bulk-fix path as default. Fix-time + uplift estimates per gap missing.

6. **Per-criterion reasoning preservation not enforced (audit-trail at 6 months)** (criterion 1, scored 3.5). Sources cited but reasoning lost on re-read. Future Bean re-reads grade and cannot reconstruct WHY.

7. **Floor-application "did floors fire?" check not enforced** (criterion 3, scored 3.0). Step 4 defines floor conditions; doesn't enforce verification that they actually capped the score when triggered.

### C-grade (low-medium)

8. **Folder mode coverage delegated to references doc — main flow doesn't grade aggregate output** (criterion 4, scored 4.0). Folder-mode runs work but holistic verdict is graded informally.

### D-grade (cosmetic)

9. **Description has scope-creep "and" clauses** (skillscore-flagged). Doesn't change outcomes.

## Opportunities (plain English — Bean's Change 3 applied)

1. **Bulk gap-analysis across the SGS roster** — A-grade. Once subagent batch protocol lands, Bean runs gap-analysis on every skill in the SGS library at once, gets a unified batch report, makes all decisions in one sitting instead of one-at-a-time. Hours saved scale linearly with skill count. Connects to: Phase 2 work (12 skills + 50 tools + 13 pipelines). Showpiece: medium-high — this kind of workflow is hard for competitors to replicate without an integrated lifecycle stack.

2. **Quality gate that enforces itself** — A-grade. Adding the mandatory QC stage means Bean never sees an unreviewed recommendation. The lifecycle stack becomes self-policing rather than depending on Bean catching shortcuts (like the two we caught today). Connects to: every consumer skill, every pipeline. Showpiece: low — invisible infrastructure but compounding effect.

3. **Disciplined C-grade scoring** — A-grade. Once the C-grade calibration rule is embedded, every C+ gap carries justified real-world impact. Bean's default-implement behaviour becomes leverage instead of treadmill. Compounds: better calibration today saves more Bean time tomorrow. Connects to: every Phase 2 fix loop.

## S-Grade screen

| Category | Criterion | Hit? |
|----------|-----------|------|
| Functional | USP — unique approach | **Yes** (subagent batch + integrated QC) |
| Functional | Innovative | **Yes** (parallel quality gating across an integrated lifecycle stack) |
| Functional | Cross-system value | **Yes** (feeds entire lifecycle stack) |
| Impact | Competitive moat | **Yes** (hard for competitors to replicate without integrated infra) |
| Impact | Revenue/time multiplier | **Yes** (bulk gap-analysis = order-of-magnitude speedup) |
| Impact | Marketing showpiece | No (internal infrastructure) |

**Hits 5 of 6 criteria.** Candidate: **YES**, contingent on the 4 parked SKILL.md edits landing. Awaiting human confirmation post-implementation. Logged as future S-grade target — re-screen after next-session edits.

## Recommendations (priority-ordered next actions)

1. **A — Replace Hard Rule 1 with batch protocol** (criterion 10). Allow subagent dispatch IF (a) every output passes QC; (b) full findings reach Bean before any work begins; (c) batch flow honoured. Edit `~/.claude/skills/gap-analysis/SKILL.md` Hard Rules section. ~10 min.
2. **A — Add Step 7.75 mandatory QC stage** (criterion 6). New stage between Step 7 (JSON output) and Step 8 (human summary) that runs Stage QC peer-review panel on canonical outputs before Bean sees them. ~15 min.
3. **A — Add C-grade calibration discipline to Step 4** (criterion 2). One paragraph: "C+ grades are earned only when fixing the gap has real impact on the end-result. NOT for missing-section / missing-tag / formatting compliance. Reason: Bean implements all C+ by default — every C+ commits his time." ~5 min.
4. **A — Add plain-English anchor to Step 5** (criterion 9). One paragraph: "Opportunities described in plain human language; assume no technical knowledge. Frame in business value, user experience, time saved — not technical mechanism." ~5 min.
5. **B — Add bulk-fix-default offer requirement** (criterion 5). Step 4/Step 8: every remediation list ships with fix-time, expected uplift, priority order, and a bulk-fix path offered as default. ~10 min.
6. **B — Add per-criterion reasoning preservation** (criterion 1). Step 7 JSON schema: each criterion's `evidence` field expands to include `reasoning_chain` so 6-month re-reads stay legible. ~5 min.
7. **B — Add floor-application verification** (criterion 3). Step 4 add explicit "for each criterion, did floor conditions fire when triggered? Y/N + reason" check. ~5 min.
8. **C — Promote folder-mode aggregate verdict to main flow** (criterion 4). Currently in references/folder-mode.md only. ~10 min.
9. **D — Trim description "and" clauses** — cosmetic, deprioritise.

**Estimated total effort to close A+B gaps:** ~60 min in a focused next-session pass.

## Parking note

All 4 A-grade SKILL.md edits parked to `.claude/parking.md` for next session. They are logged as P-1 (highest priority Phase 2 dependency).

## Research trace

- **External (Brave search):** "gap analysis skill quality criteria 2026", "ai skill rubric peer review pattern" — confirmed multi-perspective rubric review is emerging best practice; QC stage on AI-generated output increasingly standard.
- **Internal:**
  - correction-ledger grep: id=149 `gap-analysis-skill-inconsistency` recurrence 3 (logged this session)
  - library neighbour `/skill-optimiser` already has Stage 1 rubric-load logic
  - past evaluations: no prior /gap-analysis-on-itself runs
- **Reviewer panel (3 personas):** Spec-framework reviewer (5/12 anchor §2.3 violations + scope gaps), Lifecycle practitioner (failure modes the rubric misses + weight rebalance), Bean operator (production vs consumption gap, ADHD Rule 8, drift surfacing).
- **Bean's 4 follow-up directives:** subagent batch protocol, mandatory QC stage, plain-English opportunities, C-grade calibration discipline. All integrated into v3 rubric.

**Baseline:** A strong lifecycle quality-gate skill in 2026 must support parallel batch grading, enforce its own checkpoints (HARD GATEs honoured cross-turn), produce reviewable canonical outputs (JSON + reports + history + API POST), and surface upgrades not just defects (opportunity engine). Grade calibration must reflect downstream commitment — if a target grade triggers fixes by default, the bar for the grade must reflect real impact.

## Topics

`gap-analysis`, `lifecycle-grading`, `subagent-batch-protocol`, `mandatory-qc-stage`, `c-grade-calibration`, `plain-english-opportunities`, `bulk-fix-default`, `audit-trail-defensibility`, `floor-application`, `phase-2-dependency`
