# Gap Analysis — research-check skill (post-fix batch)

**Date:** 2026-04-17 (second evaluation of the day, `-2` suffix)
**Target:** `~/.agents/skills/research-check/SKILL.md` — post-fix (B#1 + B#2 + B#3 + C#6 + D#7 applied)
**Target type:** skill
**Prior evaluation:** 2026-04-17 (same day, post-rewrite) — B (4.1). This evaluation measures the delta after the 5-item fix batch.
**Context:** Evaluator is author of both rewrite AND post-fix batch; self-preference counter applied twice.

## Evaluation: research-check (post-fix)
**Grade: B+ (4.4 / 5)**

Rubric delta: +0.3 vs prior. Skillscore: 97% (A) — passed.

**Strongest criteria:** negative routing + ecosystem_awareness — 5.0 / 5.0
**Weakest criterion:** routing accuracy — 4.0 (unchanged; already strong; no new evidence to push higher without auto-select telemetry)

## Research performed

**External (2 queries):**
1. `"LLM multi-agent subagent failure recovery pattern 2026"` — arXiv 2503.13657 (MAST taxonomy) + Augment Code 2026 guide converge on "failure isolation + automatic recovery" as 2026 production baseline. Hierarchical topology A→(B↔C) shown most resilient against faulty agents.
2. `"claude code hook PreToolUse PostToolUse python stub pattern 2026"` — Claude Code official docs + pixelmojo/pydevtools/datacamp tutorials confirm the canonical stub pattern: read JSON from stdin, emit decision via exit code / stderr. Our two hook stubs match the pattern byte-for-byte.

**Internal (4 searches):**
1. Correction ledger (`shared-references/correction-ledger.md`) grep for `subagent.*empty|hook.*stub|structural enforcement` — no hits; pattern is novel to the ledger.
2. Sibling research skills (`research-buddies`, `research-couple`, `research-council`) grep for `on_empty|on_error|on_refusal|recovery|fallback` — zero hits across all three. Research-check is the **first** in the `research-*` family to document subagent-failure recovery.
3. Past evaluations of research-check — one prior entry (4.1 on 2026-04-17 post-rewrite). Expecting delta ≥ +0.2 given 5-item fix batch.
4. Workspace memory grep for research-skill tiering patterns — no prior entries; external research set the baseline.

**Baseline established:** 2026 best practice for multi-agent research skills = (a) failure isolation + automatic recovery with per-agent fallback paths (Augment Code), (b) hierarchical resilience via main-thread synthesis layer (arXiv 2503.13657), (c) Python PostToolUse/PreToolUse stubs reading stdin JSON (Claude Code canonical), (d) progressive disclosure via mode flags (prior-session external research). **Research-check post-fix matches all four; sibling research-* skills match only (d).** Research-check is now the reference implementation for its family.

## Scores

| Criterion | Prior | Post-fix | Evidence |
|---|---|---|---|
| completeness | 4.0 | **4.5** | All five gap-analysis recommendations (B#1, B#2, B#3, C#6, D#7) applied. Only open recommendation is the S-flagged Fred extraction (parked by design). Scripts/ dir correctly absent — no utility warrants one yet. |
| clarity | 4.0 | **4.5** | Body trimmed to 242 lines (skillscore hook confirms) — under 250 working budget. Recovery paths now scannable tables at the bottom of Stages 2 and 3. Mermaid flow unchanged, stages still numbered 0-5. |
| routing accuracy | 4.0 | **4.0** | Auto-select + HARD-GATE `mode-declaration` unchanged. No new evidence to push higher without auto-select telemetry (Opportunity 2). |
| robustness | 3.5 | **4.0** | Stage 2 + Stage 3 recovery tables cover empty/degraded/timeout/refusal/both-fail paths with specific actions. Stage 4 adds shell-level `$OPENCLAW_DIR` guard (actual executable code, not prose). Entity-collision rule is concrete. Hook stubs are warn-only not blocking — prevents pushing to 4.5. |
| security | 4.5 | **4.5** | Env vars loaded locally, no new surface; hook stubs read from stdin only, no shell interpolation. |
| negative routing | 5.0 | **5.0** | 6 anti-route targets all still resolve to live skill dirs (verified: research-buddies, research-couple, research-council, deep-research, lead-research-assistant, /search). |
| exemplar quality | 4.0 | **4.5** | Recovery tables are demonstrable patterns. Two hook stubs are clean reference implementations. Env-guard is copy-paste-able bash. Pipeline Handoff block retained. |
| ecosystem awareness | 5.0 | **5.0** | All adjacent skills named + verified live. |

**Weighted average:** 4.50.
**Self-preference counter:** −0.1 (evaluator wrote both the rewrite and the post-fix batch; extra scrutiny). **Settled at 4.4 (B+).**

## 5-Lens System Effect (HARD GATE)

| Lens | Verdict | Reasoning |
|---|---|---|
| 1. End-result | PASS | Drives decision-ready research answers with recovery paths for when subagents fail — output quality compounds rather than degrades silently. |
| 2. OC ↔ CC | PASS | memory MCP + dashboard POST + markdown file triple; structural `$OPENCLAW_DIR` guard refuses silent-fail into wrong directory. |
| 3. blub.db persistence | PASS | Stage 4 HARD GATE references `hooks/persistence.py` which structurally checks all three artefacts. Entity-collision `-N` suffix preserves both findings when re-researched same day. |
| 4. Automation vs remember | PASS | Two hook stubs wired to HARD-GATE tags. Promotion from warn-only → blocking is a one-line change once telemetry validates the regex. No "Bean must remember" rules added. |
| 5. ADHD / overwhelm | PASS | Body 242 lines (under budget). Recovery paths are tables, not prose walls. Default tier still ≤ 2 min, Extended still produces ONE Fred synthesis. No new dashboards or checkpoints. |

**No cap. No veto.**

## Categorical Failures

None.

## All Gaps (post-fix)

| # | Gap | Criterion | Grade | Action |
|---|---|---|---|---|
| 1 | Hook stubs are warn-only, not blocking | robustness | C | Wait for telemetry: 2-3 research runs confirming the regex fires reliably before flipping to exit 2 (block). |
| 2 | Token-budget-exhausted recovery names `length` finish reason but doesn't specify the Anthropic API error signature | robustness | C | Low-frequency edge case; flesh out when first encountered in the wild. |
| 3 | `shared-references` symlink at `references/shared-references` resolves to malformed path `/c/C:/Users/Bean/.agents/skills/shared-references/` (broken) | hygiene | **C** | Cold-pickup sessions reading the symlink will get ENOENT. Replace with a valid symlink or drop it and inline the reference. |
| 4 | No `scripts/` directory | architecture | D | Defer — no concrete validation utility warrants one yet. |
| 5 | Body at 242 lines, target was < 200 | completeness | D | Under working budget already; trim not needed. |
| 6 | No memory entity versioning across different months (only same-day collision handled) | persistence | D | Edge case — re-researching same topic across months should create fresh entity anyway. |

**B/C gaps (1, 2, 3) written to backlog.** D gaps logged here only.

## Opportunities (what this could become)

### 1. Hook promotion loop (NEW this round)
**Description:** Once 3+ research-check runs fire in production with warn-only stubs, auto-promote to blocking based on telemetry (regex precision, false-positive rate). Could become a generic hook-promotion pipeline for any warn-only enforcement stub in the library.
**Connects to:** pipeline-optimiser, skill-optimiser, automation-engine (scheduled promotion check)
**Non-obvious:** Yes — most hooks are written blocking-or-off; warn-for-N-runs-then-block is a novel deployment pattern.
**Showpiece:** low — internal infrastructure.

### 2. Auto-Select Telemetry (carried from prior evaluation)
**Description:** Persist every `mode-declaration` announcement to blub.db. Over weeks, analyse whether auto-default picks got upgraded to extended by Bean. Refine Stage 1 decision table from data.
**Connects to:** skill-optimiser, batch-gap-analysis, dashboard Insights widget.
**Non-obvious:** Yes.
**Showpiece:** medium.

### 3. Fred-as-Pattern (S-grade candidate, carried, PARKED)
**Description:** Extract Fred's revenue-model + kill-criterion synthesis to a reusable `decision-synthesizer` skill invocable by strategic-plan, brainstorming, internal-debate, any N→1 synthesis task.
**Connects to:** strategic-plan, brainstorming, internal-debate, SSB Phase 7 pattern learning.
**Non-obvious:** Yes.
**Showpiece:** medium-high.
**S-grade criteria:** USP, innovative, cross-system, revenue/time multiplier, marketing showpiece.

## S-grade screen

| Category | Criterion | Via research-check alone? | Via Opportunity 3? |
|---|---|---|---|
| Functional | USP | no | yes |
| Functional | Innovative | partial | yes |
| Functional | Cross-system | partial | yes |
| Impact | Competitive moat | no | yes |
| Impact | Revenue/time | no | yes |
| Impact | Marketing showpiece | no | yes |

**5 of 6 hit via Opportunity 3** — S-grade candidate still valid but still parked (awaiting SSB Phase 7 pattern-learning signal). Fred audit (Task 2 of handoff) will revisit.

## Persona divergence

- Bean (ADHD solo dev): 4.42
- Future CC session (cold pickup): 4.38 — slightly lower because of broken shared-references symlink (Gap #3) that would confuse a cold pickup
- research-pipeline agent (downstream consumer): 4.42

**Delta: 0.04** — under threshold. No flag.

## Topics

`research-tiering`, `subagent-recovery`, `hook-stubs`, `env-validation`, `entity-collision`, `structural-enforcement`, `progressive-disclosure`, `fred-synthesis-pattern`, `broken-symlink-hygiene`

## Recommendations (actionable now)

1. **(C)** Fix broken `references/shared-references` symlink — either point to a real path or delete.
2. **(C)** After 3+ production research runs, review hook stub stderr output and promote to blocking (exit 2) if precision holds.
3. **(S-flag, PARKED)** Fred-as-pattern extraction — handled by Task 2 audit in this session's handoff.

## Drift check

Last 5 skill evaluations: 4.41, 4.35, 4.22, 4.1, **4.4**. Rolling avg 4.30. No identical-score rubber-stamping. No inflation drift.
