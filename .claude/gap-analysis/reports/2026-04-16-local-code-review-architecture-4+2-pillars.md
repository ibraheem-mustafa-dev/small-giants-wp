# Gap Analysis — Local Code Review Architecture (4+2 Pillars)

**Date:** 2026-04-16
**Target type:** plan (cross-subproject design expressed in two spec artifacts)
**Artifacts evaluated:**
- `c:/Users/Bean/Projects/small-giants-wp/.claude/specs/2026-04-16-local-code-review-architecture.md` (v2.0, CC-side)
- `A:/.openclaw/.claude/subprojects/ssb/specs/2026-04-16-code-review-automation-and-learning.md` (v1.0, OC/SSB-side)

## Evaluation: Local Code Review Architecture
**Grade: B (3.5 / 5)**

**Strongest criterion:** Feasibility + Dependency mapping — 4.0. Every referenced capability exists, cross-spec references are explicit, phasing is realistic.

**Weakest criterion:** Effort estimation — 2.5. CC-side has rough estimates; SSB-side has none. Dashboard endpoint work unscoped. Gemini Flash registry-walk effort not bounded.

## Scores by criterion

| Criterion | Score | Evidence |
|---|---|---|
| Feasibility | 4.0 | Pillars 1-3 installable in <1 hr. Pillar 5 maps cleanly to existing Automation Engine patterns (Jinja2 inputs, code-blocks, sqlite writes). Pillar 4 explicitly deferred — anti-over-build. |
| Completeness | 3.5 | Covers all Bean's stacks + all contexts + CC/OC split. Weak on **feedback loop**: FR-010 documents a 3-step ritual but has no mechanism to ensure Bean follows through. Phase 2 soak uses parking.md — too loose for evidence. |
| Risk identification | 3.5 | CC: 3 open questions. SSB: 5 risks + mitigations. **Missing:** tool-conflict resolution (SonarLint says X, Semgrep says not-X), blub.db growth (13 projects × 100 findings × 365 days ≈ 475k rows/yr — probably fine but unstated), dashboard UI scope as dependency of Phase 5. |
| Dependency mapping | 4.0 | Explicit chains: Pillar 5 needs projects table metadata; Pillar 6 needs 4 weeks of Pillar 5 data. Cross-spec refs present. Minor gap: morning-briefing flow dependency flagged but unresolved. |
| Effort estimation | 2.5 | CC-side: "~1 hour" Phase 1, "1 week" soak. **SSB-side: zero estimates.** Gemini Flash registry: no token budget. Dashboard work (3 endpoints + page): not sized. This is the biggest gap. |

**Weighted average with Bean persona (1.3× on feasibility + completeness):** 3.53 → B

## 5-Lens System Effect Check (HARD GATE)

| Lens | Verdict | Reasoning |
|---|---|---|
| 1. End-result | **PASS** | Drives zero-token daily review across 13 projects + compounding pattern learning feeding back to pre-emption. Clear outcome. |
| 2. OC ↔ CC connectivity | **PASS** | Explicit split: CC Pillars 1-4 in-editor, OC Pillars 5-6 automation + blub.db. Named bridge via `/code-review status` command reading dashboard API. State flows both ways. |
| 3. blub.db persistence | **PASS** | `code_review_findings` table schema fully specified, FK to `projects`, fingerprint dedup. Nightly flow writes there. Dashboard reads there. No session-local findings state. |
| 4. Automation vs remember | **PASS** | Pillar 5 IS the automation. Cron-scheduled flow, morning briefing integration, Telegram only for CRITICAL. Bean doesn't remember — it runs. |
| 5. ADHD / overwhelm | **PASS WITH RISK** | Daily: 2 commands (`/diagnostics`, `/lint`). Nightly: auto-runs, one briefing. **BUT:** until Pillar 6 (Phase 7) ships, raw findings from 13 projects × 6 tools may flood Bean. Industry baseline: Ghost Security 2026 found **91% false-positive rate in SAST for AI-generated code**. Spec acknowledges risk (SSB risk register) but mitigation is explicitly deferred. Close to veto. Not vetoed because: start-state is unknown severity, severity filtering (CRITICAL-only Telegram) limits damage, 4-week soak is finite. |

**No grade cap applied. No veto triggered.**

## Categorical failures

None.

## All gaps (graded by opportunity value)

| # | Gap | Severity | Opportunity grade |
|---|---|---|---|
| 1 | SSB spec missing effort estimates for Pillar 5 phases | Real | **A** — blocks future-session kickoff without a Bean-interactive arbitration step. Small fix. |
| 2 | No feedback loop beyond "record in parking.md" | Real | **A** — structural enforcement opportunity per today's correction: a `review-soak-gate` flow could auto-tally findings into blub.db weekly, removing the remember-to-log burden. |
| 3 | Tool-conflict resolution undefined (SonarLint vs Semgrep disagreement) | Real | **B** — edge case but will happen. Add: "fingerprint dedup collapses conflicting findings; dashboard shows both tools' verdicts." |
| 4 | blub.db bloat not calculated | Mild | **C** — 475k rows/year; with indexes, SQLite handles millions. Still worth stating. |
| 5 | Dashboard UI work (3 endpoints + `/code-review` page) unscoped | Real | **B** — dependency for Phase 5 acceptance; needs to appear on blub-dashboard-v2 roadmap. |
| 6 | Morning-briefing flow dependency unresolved | Real | **B** — named as "check flows/; defer if absent" — that's a flag, not a plan. |
| 7 | Gemini Flash registry-walk delegation has no prompt spec | Mild | **C** — deferred to Phase 5 kickoff; fine to leave. |
| 8 | `/lint` dry-run mode (`--check-only`) listed as open question | Real | **B** — Phase 5 flow needs this; resolve before Phase 5 starts. |
| 9 | Pillar 4 deferral criterion is qualitative ("specific gap identified") | Mild | **C** — could be tightened to "N gaps repeated N times" but qualitative is defensible for a solo dev. |

B/C gaps written to project backlog: `c:/Users/Bean/Projects/small-giants-wp/.claude/parking.md` (gaps 3, 4, 5, 6, 7, 8, 9).

## Opportunities (what this could become)

### 1. Findings → Auto-Generated Semgrep Rules (S-grade candidate)
**Description:** When Bean fixes the same pattern 10+ times, auto-generate a custom Semgrep rule that catches the pattern pre-emptively. Conversely, when Bean dismisses the same rule 10+ times, auto-suppress globally via `.semgrepignore` or custom config.
**Connects to:** Pillar 6 pattern-learning (Phase 7), SSB memory consolidation, blub.db fix-patterns table, morning briefing.
**Non-obvious:** Yes — no commercial SAST tool does this. Adjacent field (ML on code edit history) applied to local SAST.
**Showpiece potential:** **HIGH** — "my AI learned to lint my bugs before I write them" is LinkedIn-demo-worthy.
**S-grade hits:** USP, innovative, competitive moat, marketing showpiece.
**Status:** Candidate. Research dispatch skipped (Phase 7 work, too early — needs Pillar 5 data first).

### 2. Weekly Soak Report as Auto-Engine Flow
**Description:** A `review-soak-weekly` flow tallies new findings, dismissed findings, and fixed findings per project per week, producing a dashboard card. Replaces "Bean records gaps in parking.md" with mechanical surveillance.
**Connects to:** SSB morning briefing, kanban_cards (auto-create fix tasks for repeat offenders).
**Non-obvious:** Moderately — most shops track CI pass/fail; tracking review-as-a-process is less common.
**Showpiece potential:** medium — a trend graph of "signal vs noise per tool" would be demonstrable.

### 3. Cross-Project Deduplication of Findings
**Description:** Same rule triggered in 5 projects → one pattern alert (+links), not 5 separate findings. Uses the SSB pattern-learning layer to compound evidence.
**Connects to:** Pillar 6, dashboard UI.
**Non-obvious:** Moderately — Snyk and friends do this at org level, but not at individual-dev multi-project scale.
**Showpiece potential:** medium.

## S-grade screen

| Category | Criterion | Hit? |
|---|---|---|
| Functional | USP | ✓ (via auto-rule-gen opportunity) |
| Functional | Innovative | ✓ (via auto-rule-gen opportunity) |
| Functional | Cross-system | ✓ (CC + OC + blub.db + automation engine) |
| Impact | Competitive moat | ✓ (personal-history-trained linting) |
| Impact | Revenue/time multiplier | ~ (indirect — prevents bugs ≠ revenue directly) |
| Impact | Marketing showpiece | ✓ (auto-rule-gen is demonstrable) |

**5 of 6 hit**. S-grade candidate flagged. Not confirmed — requires Phase 7 build. Research deferred.

## Recommendations (actionable now)

1. **(A)** Add effort estimates to SSB spec Pillar 5: schema migration ~30 min, flow build ~2 hr, dashboard endpoints ~3 hr, page UI ~2 hr. Subtotal: ~7-8 hr for Phase 5.
2. **(A) REVISED 2026-04-16 after Bean pushback.** Replace FR-010 "document the 3-step ritual" with **skill composition** — `/dev commit` invokes `/diagnostics` as a chained Step 0 via the Skill tool, then invokes `commit-commands:commit`. Structural enforcement without a hook. Skill runtime guarantees the step runs per-invocation but state does not survive the session, so nothing leaks across sessions (unlike the lifecycle-gate grading-pending hook that has fired 6+ times this session against the same file). **Original recommendation (PostToolUse hook) retracted** — reflexively reached for a hook when skill composition is sufficient and safer. Triage rule for future hook-vs-skill-step decisions: a hook is justified only when (a) the check must run regardless of which skill/tool invoked the action AND (b) the state is genuinely cross-session. For pre-commit verification, neither holds — skill step is correct.
3. **(B)** Add tool-conflict handling to SSB spec: fingerprint dedup groups conflicting findings, dashboard surfaces all tools' verdicts per finding.
4. **(B)** Scope the dashboard UI work as a Phase 5 sub-task with ~5 hr estimate or split into a sibling spec for blub-dashboard-v2.
5. **(B)** Resolve the morning-briefing dependency: read `A:/.openclaw/flows/` tonight to see if `morning-briefing` exists; if not, flag as dependency for SSB Phase 5 kickoff.
6. **(B)** Resolve `/lint --check-only` in the CC spec before SSB Phase 5 starts (Phase 5 flow needs it).
7. **(C)** Add one-liner on blub.db growth: "475k rows/year conservative estimate; indexes present; SQLite handles millions."
8. **(S-flag)** Document the auto-rule-generation opportunity in SSB Phase 7 placeholder — ensures it's surfaced when Phase 7 starts.

## Persona divergence

Bean (primary): B (3.53).
Future SSB Phase 5 session (cold pickup): would score **C (3.1)** — missing effort estimates + unresolved morning-briefing dependency hurt a cold session more than they hurt Bean today.
**Delta: 0.43** — under threshold (1.0), no flag. Both recommendations 1 and 5 address the SSB-session gap.

## Topics

`code-review-architecture`, `multi-stack-review`, `effort-estimation-gap`, `sast-noise-crisis`, `auto-rule-generation-opportunity`, `blub-db-persistence`, `ssb-phase-5`, `ssb-phase-7`

## Research trace

**External (2):**
1. `"local code review pipeline failure modes multi-language solo developer 2026"` — weak hits; top relevant: Orchids 2026 LLM-for-coding comparison mentions distinct failure modes across models.
2. `"nightly code scan false positive noise fatigue developer workflow 2026"` — **HIGH VALUE.** Ghost Security 2026 benchmark: 91% false-positive rate in SAST for AI-generated code. Aikido Top 13 Code Vulnerability Scanners 2026 benchmarks accuracy/low-FP as primary axis.

**Internal (5):**
1. correction-ledger grep for "code-review|diagnostics|lint|phpstan|semgrep": empty — no prior corrections on this domain.
2. adjacent skills in library: pr-reviewer, receiving-code-review, requesting-code-review, audit, site-reviewer, skill-auditor, agent-auditor — confirms niche (daily local review) is unfilled.
3. past gap-analysis reports: only `2026-04-08-pipeline-audit.md` — no prior evaluation of this architecture.
4. evaluation history: last plan eval was `ui-ux-pro-max-upgrade` at 3.96 (B); no severe inflation.
5. workspace memory: no prior code-review research.

**Baseline established:** 2026 consensus is that multi-SAST architectures face severe noise crises (91% FP in AI-gen code); accuracy/low-FP is the primary competitive axis; local-first + hybrid LLM+SAST is the emerging best practice. Bean's architecture aligns with best practice (local-first) but has deferred the noise-reduction layer (Pillar 6) — this is the dominant risk.
