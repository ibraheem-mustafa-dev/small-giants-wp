# Gap Analysis — research-check skill (post-rewrite)

**Date:** 2026-04-17
**Target:** `~/.agents/skills/research-check/SKILL.md` — full rewrite absorbing light-research-team as `--tier extended`
**Target type:** skill
**Context:** Session 2026-04-17 continuation. Skill was 73% (C) before rewrite; 91% (A-) on skillscore post-rewrite. Evaluator is author — self-preference counter applied.

## Evaluation: research-check (rewrite)
**Grade: B (4.1 / 5)**

**Strongest criteria:** negative routing + ecosystem_awareness + security — 5.0 / 5.0 / 4.5
**Weakest criterion:** robustness — 3.5 (missing subagent-failure recovery)

## Scores

| Criterion | Score | Evidence |
|---|---|---|
| completeness | 4.0 | Goal + 5-Lens + Invokes + Mandatory Refs + 5 numbered Stages + mermaid + 2 HARD-GATEs + completion criteria + pipeline output. Default-tier agent prompts still inline (~80 lines), could be moved to references/default-tier.md. |
| clarity | 4.0 | Stage-numbered process, decision table for mode selection, mermaid flow. Body 271 lines — over 250 working budget, under 500 hard limit. |
| routing accuracy | 4.0 | Dual-mode triggers in description; explicit anti-route for `/search` overlap. Auto-select table covers 6 dimensions of question shape. |
| robustness | 3.5 | Bash-blocked fallback (WebSearch), dashboard-unreachable fallback (pending_blub_post). Missing: subagent-returns-empty, token-budget-exhausted mid-Fred. |
| security | 4.5 | Keys from `$OPENCLAW_DIR/.env` with local-only comment; no destructive commands; localhost POST only; query goes through `search.py` (no raw shell interpolation). |
| negative routing | 5.0 | Description names 5 sibling skills; "When NOT to Use" names 6. All named skills verified live. |
| exemplar quality | 4.0 | Two explicit output templates (default delivery + Fred synthesis); Pipeline Handoff block mandated; Fred's revenue-model + kill-criterion output distinctive. |
| ecosystem awareness | 5.0 | All 6 anti-route targets (research-duo, research-buddies, research-couple, research-council, deep-research, `/search`) resolve to live skills. |

**Weighted average:** 4.25. **Self-preference counter:** settled at **4.1** accounting for pre-existing architecture debt (no hooks/ or scripts/ dirs; body near budget ceiling).

## 5-Lens System Effect (HARD GATE)

| Lens | Verdict | Reasoning |
|---|---|---|
| 1. End-result | PASS | Drives decision-ready research answers; findings compound via mandatory persistence gate |
| 2. OC ↔ CC | PASS | memory MCP + dashboard POST + markdown file — Blub queries CC-written entities, CC reads OC-written workspace files |
| 3. blub.db persistence | PASS | Stage 4 HARD GATE mandates memory entity + markdown + POST; no session-local state |
| 4. Automation vs remember | PASS | mode-declaration + persistence both enforced structurally (HARD-GATE tags + skillscore hook), not prose rules |
| 5. ADHD / overwhelm | PASS | Default 2min / Extended produces ONE Fred synthesis (not 4 raw reports); auto-select announces mode before dispatching — one shot to override before 10-min run |

**No cap applied. No veto.**

## Categorical Failures

None.

## All Gaps (graded by opportunity value)

| # | Gap | Criterion | Opportunity grade |
|---|---|---|---|
| 1 | No subagent-failure recovery path (empty return, timeout, refusal) | robustness | **B** — real scenario, easy fix, prevents silent empty outputs |
| 2 | No token-budget-exhausted handling for mid-Fred synthesis | robustness | **C** — rare, Opus 200k context usually sufficient |
| 3 | Default-tier agent prompts inline (~80 lines) | completeness / body size | **B** — move to `references/default-tier.md`, body drops under 200 lines |
| 4 | No hooks/ directory for HARD-GATE enforcement | architecture | **B** — HARD-GATE tags `mode-declaration` + `persistence` warrant PostToolUse hooks |
| 5 | No scripts/ directory | architecture | **C** — no obvious validation utility needed yet |
| 6 | References to `$OPENCLAW_DIR` environment variable without explicit validation | robustness | **C** — if env missing, markdown save silently fails |
| 7 | No versioning in memory entity names | persistence | **D** — edge case when same topic re-researched on same day |

B/C gaps logged to backlog: `~/.agents/skills/research-check/references/backlog.md`.

## Opportunities (what this could become)

### 1. Agent-Failure Recovery Discipline
**Description:** Add explicit recovery paths when a Sonnet researcher returns empty / errors / refuses. Options: re-dispatch with narrowed scope, skip that persona and continue, degrade to default tier from extended.
**Connects to:** research-buddies, research-couple, deep-research (same pattern applies)
**Non-obvious:** Yes — most research skills in the library punt this to "user handles"
**Showpiece:** low — internal robustness, not demoable

### 2. Auto-Select Telemetry
**Description:** Persist every `mode-declaration` (mode chosen + reason + topic + whether user overrode) to blub.db. Over weeks, analyse accuracy: did auto-default picks get upgraded to extended by Bean? Use data to refine the Stage 1 decision table.
**Connects to:** skill-optimiser (consumes accuracy data), batch-gap-analysis (patterns across research invocations), dashboard Insights widget
**Non-obvious:** Yes — most skills don't self-measure routing accuracy
**Showpiece:** medium — "my research skill tracks its own auto-select accuracy and adapts" demoable
**S-grade criteria:** innovative, competitive moat

### 3. Fred-as-Pattern (S-grade candidate)
**Description:** Fred's revenue-model + kill-criterion synthesis is a reusable pattern beyond research. Extract as `decision-synthesizer` skill — invoked by strategic-plan, brainstorming, internal-debate, any N→1 synthesis task. Forces every synthesis to include a cost/revenue claim + an exit condition.
**Connects to:** strategic-plan, brainstorming, internal-debate, SSB Phase 7 pattern learning
**Non-obvious:** Yes — Fred is currently an inline agent in extended-tier.md, not a reusable primitive
**Showpiece:** medium-high — "every recommendation in my system comes with a kill criterion" is demonstrable
**S-grade criteria:** USP, innovative, cross-system, revenue/time multiplier, marketing showpiece

## S-grade screen

| Category | Criterion | Hit via research-check alone? | Hit via Opportunity 3? |
|---|---|---|---|
| Functional | USP | no | yes (Fred-as-pattern) |
| Functional | Innovative | partial (auto-select) | yes |
| Functional | Cross-system | partial (memory MCP) | yes (every pipeline invokes) |
| Impact | Competitive moat | no | yes |
| Impact | Revenue/time | no | yes |
| Impact | Marketing showpiece | no | yes |

**5 of 6 hit via Opportunity 3**. S-grade candidate confirmed. Research dispatch SKIPPED — premature without Phase 7 pattern-learning data. Confirmed: pending human sign-off on extracting Fred as its own skill.

## Recommendations (actionable now)

1. **(B)** Add subagent-failure recovery to Stage 2 and Stage 3: explicit `on_empty_return`, `on_error`, `on_refusal` paths. One line per path.
2. **(B)** Move default-tier agent prompts (The Answer + The Optimiser) to `references/default-tier.md`. Body drops to ~190 lines, under 250 budget.
3. **(B)** Add `hooks/mode-declaration.py` and `hooks/persistence.py` as PostToolUse stubs enforcing the two HARD-GATE tags. Closes the architecture gap.
4. **(C)** Validate `$OPENCLAW_DIR` before writing markdown — if missing, abort with clear error rather than silent fail.
5. **(S-flag)** Park Fred-as-pattern opportunity — extract to `decision-synthesizer` skill when SSB Phase 7 starts.

## Persona divergence

- Bean (ADHD solo dev): 4.27
- Future CC session (cold pickup): 4.27
- research-pipeline agent (downstream consumer): 4.24

**Delta: 0.03** — under threshold (1.0). No flag. Skill reads consistently across all three personas.

## Topics

`research-tiering`, `progressive-disclosure`, `mode-selection-auto`, `robustness-gap`, `fred-synthesis-pattern`, `skill-rewrite`, `light-research-team-merge`

## Research trace

**External (2):**
1. `"research agent tiering best practices LLM multi-agent 2026"` — gurusup.com/blog confirms "model tiering" (Haiku triage → Sonnet core → Opus synthesis) is production consensus. research-check's model assignments match this pattern exactly.
2. `"progressive disclosure skill flag mode auto-select llm agent 2026"` — Medium article (Marta Fernández García, Feb 2026) on progressive disclosure + ArXiv 2602.12430 on Agent Skills architecture — both frame thin SKILL.md + references/ split as the 2026 pattern. Research-check now implements this: 271 lines in SKILL.md, 237-line extended-tier.md reference.

**Internal (4):**
1. Sibling research skills list (`ls ~/.agents/skills/research-*`): buddies, check, council, couple — all 4 still exist and named in anti-routes.
2. Correction ledger grep for "research|tier|mode-select": no prior patterns (no regression risk).
3. Past research-check evaluations: none — this is the first.
4. Workspace memory for research-skill topics: no prior entries — baseline comes from external search only.

**Baseline:** 2026 best practice for research-family skills is (a) progressive disclosure via mode flags, (b) model tiering per phase (Haiku/Sonnet/Opus), (c) persistence to single source of truth, (d) named-skill anti-routes with live-skill verification. Research-check rewrite matches all four.
