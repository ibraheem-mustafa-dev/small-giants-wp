---
name: delegate
description: >-
  This skill should be used when picking a model or dispatch target for any
  subagent invocation, parallel branch, or planned step. Triggers on
  "delegate", "which model", "pick a model", "route to", "choose dispatch",
  "model selection", "where should this run". Returns a primary model +
  fallback chain + justification given a task descriptor (task shape, input
  size, expected output, time sensitivity, MCP need, destructive flag).
  Do NOT invoke for: deciding IF a task warrants a subagent at all (use
  subagent-prompt Stage 1 or the dispatch-decision-rule first), writing the
  subagent prompt itself (use subagent-prompt), or coordinating parallel
  branches (use dispatching-parallel-agents).
---

# Delegate

One source of truth for model routing. Replaces scattered per-skill model-selection logic with a declarative routing table + decision engine + dispatch log.

**Stages:** BUILD DESCRIPTOR → ROUTE → DISPATCH → LOG → CALIBRATE (monthly)

## Mandatory References

Before using or editing this skill, load:

1. `references/integration-guide.md` — how the 5 consumer skills wire into `/delegate`
2. `data/routing-table.json` — the declarative routing table (Bean-editable)

## Goal

Every dispatch decision in every consumer skill consults one routing table. When Bean updates the table, every consumer gets the new behaviour without editing 6 skill files.

## System Effect (5-lens)

1. **End-result.** Produces a `{primary_model, primary_command, fallback_chain, justification}` recommendation per task. Measurable outcome: dispatch success rate + cost per task, tracked in the local dispatch log.
2. **Cross-context reach.** Routing table lives at the shared canonical path (`~/.agents/skills/delegate/data/routing-table.json`). Every session and subagent consumes the same source of truth. No drift possible.
3. **Persistence.** Every dispatch outcome is appended to `data/dispatch-log.jsonl` with `category="dispatch_log"` via `scripts/log-dispatch.py`. The data accumulates into a calibration feedback loop: stale `(task_shape, model)` pairings surface as low-success-rate rows.
4. **Automation vs human-remember.** The 5 consumer skills route through `/delegate` mechanically — not "remember to consult the model hierarchy". The decision is a script call, the log is a script call, the calibration review is a read over one JSONL file.
5. **ADHD / overwhelm.** Replaces 4+ scattered model-routing sections (subagent-prompt / phase-planner / strategic-plan Agent Cost table / dispatching-parallel-agents) with one consulted API. One decision point, not four.

## Pre-work Verification

Finished skill is verified when:

- `python scripts/route.py list-models` prints the 3 models in the table (haiku, sonnet, inline)
- `python scripts/route.py route --task-shape code_gen --input-size-kb 5` returns a JSON recommendation with non-empty `primary_model`
- `python scripts/log-dispatch.py --task-shape test --model haiku --success false --error-class test` appends a line to `data/dispatch-log.jsonl` and returns that row including `{"id": <n>}`
- skillscore ≥ 90%
- gap-analysis ≥ B

## When to Use

- Deciding which Claude tier to dispatch a task to (Haiku for cheap/mechanical, Sonnet for architectural + large-context, or inline in the main thread). The fleet is all-Claude — no non-Claude models.
- Building or editing any skill that dispatches subagents — consult `/delegate` instead of hardcoding a model
- Reviewing monthly dispatch-log calibration data before tuning the routing table

## When NOT to Use

- **Deciding IF a task should be dispatched at all** — use `subagent-prompt` Stage 1 (dispatch-justification check) first; only call `/delegate` after dispatch is justified
- **Writing the cold-prompt content** — use `subagent-prompt` (6-section template)
- **Running parallel branches** — use `dispatching-parallel-agents` to coordinate the branches; each branch calls `/delegate` independently
- **Choosing a search engine** — use `search.py` (it has its own routing); `/delegate` is for LLM-model routing only
- **Routing to a specific MCP server (Playwright, GitHub, Chrome DevTools)** — MCP tool availability is a concern separate from LLM model choice. Set `needs_mcp: true` in the descriptor and `/delegate` will pick Sonnet via the Agent tool; the MCP server itself is picked by the consumer skill, not by `/delegate`.

## Process

### Stage 1 — Build the task descriptor

Gather these fields from the calling context:

| Field | Type | Notes |
|-------|------|-------|
| `task_shape` | string | `code_gen`, `classification`, `batch_synthesis`, `code_review`, `extraction`, `effort_estimation`, `research` |
| `input_size_kb` | number | Sum of file sizes the dispatched model will read |
| `expected_output_tokens` | number | Rough estimate of generated response |
| `time_sensitivity` | string | `low` / `normal` / `high` — is a 30 min queue stall acceptable? |
| `needs_mcp` | bool | Does the task require Playwright, GitHub MCP, or another MCP server? |
| `needs_web_search` | bool | Does the task require `search.py` invocation? |
| `destructive` | bool | DB migration, mass file rewrite — needs worktree isolation |
| `offline_required` | bool | No local models in the all-Claude fleet — the router flags it and keeps the work inline |
| `dispatch_justified` | bool | Did a criterion from the dispatch-decision-rule apply? Default true |
| `pii_detected` | bool | **Content signal.** Task text contains personal data (names, emails, phone numbers, addresses) — stays inline to minimise copies across subagent transcripts |
| `contains_secrets` | bool | **Content signal.** Task text contains API keys, passwords, tokens — stays inline |
| `jailbreak_signal` | bool | **Content signal.** Suspicious prompt injection or guardrail-bypass attempt detected — routes to Sonnet (audit logging, keeps suspect content out of the main thread) |
| `high_complexity` | bool | **Content signal.** Multi-hop reasoning or ambiguous requirements — stays inline (the main-thread frontier model is the deep-reasoning tier) |
| `original_model` | string | **qc_review only.** Which tier authored the work under review (`inline`/`sonnet`/`haiku`); the router refuses qc_review without it and returns a different tier |

**Plain-English glossary (for non-coder invocation):**

- `task_shape` = what kind of thing is this? ("generate code", "classify", "review", "synthesise a batch")
- `input_size_kb` = how much am I giving the model to read? (sum of file sizes in kilobytes)
- `expected_output_tokens` = how much response am I expecting? (a paragraph ≈ 200 tokens, a full report ≈ 10,000)
- `time_sensitivity` = can this wait 20 minutes if the queue is slow? (high = no, normal = yes, low = overnight OK)
- `needs_mcp` = does this need Playwright / GitHub / other external tool access?
- **Content signals** let `/delegate` keep privacy-sensitive work in the main thread and route risky work to the right Claude tier automatically. Set them before invoking.

### Stage 2 — Call the routing engine

Run `scripts/route.py route` with the descriptor fields as flags, or pass a JSON descriptor file with `--descriptor path.json`.

The engine:
1. Walks `data/routing-table.json`'s `decision_rules` in priority order (descending)
2. Applies each matching rule (exclusion or primary-model selection)
3. Falls back to the highest-reliability surviving model if no rule sets a primary
4. Builds a fallback chain by following each model's `fallback_to` list, skipping excluded
5. Returns `{primary_model, primary_command, fallback_chain, justifications, excluded, descriptor}`

**How priorities work.** Every rule in `routing-table.json` has a `priority` integer. The engine evaluates rules highest-priority first. Exclusion rules subtract candidate models; primary-model rules set the chosen model. The first matching primary-model rule wins — later rules at lower priority only add exclusions, not replace the primary. Critical rules sit at 90+ (MCP, content signals, destructive isolation). Default fallback is at 10.

**Budget-triggered auto-injection.** When `scripts/check-budget.py` writes `data/budget-state.json` flagging a model over its monthly threshold, `route.py` auto-sets `budget_triggered: true` on every descriptor. The `budget_triggered_prefers_haiku` rule (priority 22) then excludes Sonnet for `time_sensitivity=normal` work, stepping it down to Haiku. Critical (`time_sensitivity=high`) still routes normally.

### Stage 3 — Dispatch + log outcome

Consumer skills invoke `primary_command` with the task prompt. When the dispatch completes (success or failure), call `scripts/log-dispatch.py` with the outcome metadata. It appends one `category="dispatch_log"` row to `data/dispatch-log.jsonl`.

If dispatch fails (`queue_exceeded`, `503`, timeout, etc), consumer skill retries the first entry in `fallback_chain` and logs that outcome too with `fallback_used=<primary_model>`.

### Stage 4 — Calibration review (monthly)

See `references/integration-guide.md` "Calibration feedback loop" section for the read over `data/dispatch-log.jsonl` that surfaces under-performing `(task_shape, model)` pairs. The 80% threshold (= the minimum acceptable success rate for a routed pairing) and 5-dispatch floor (= the minimum sample size before a pairing can be tuned) are default targets; adjust in `routing-table.json` per task class if needed.

## Tool Bindings

| Operation | Command |
|-----------|---------|
| Route a task | Bash: `python ~/.agents/skills/delegate/scripts/route.py route --task-shape <shape> ...` |
| List models | Bash: `python ~/.agents/skills/delegate/scripts/route.py list-models` |
| Log a dispatch outcome | Bash: `python ~/.agents/skills/delegate/scripts/log-dispatch.py --task-shape <s> --model <m> --success <b>` |
| Edit the routing table | Edit tool on `data/routing-table.json` |

## Worked Example

**Scenario:** the main session is about to dispatch a 7-target batch gap-analysis review.

**Step 1 — Build descriptor:**

```json
{
  "task_shape": "batch_synthesis",
  "input_size_kb": 140,
  "expected_output_tokens": 20000,
  "time_sensitivity": "normal",
  "needs_mcp": false,
  "needs_web_search": false,
  "destructive": false,
  "dispatch_justified": true
}
```

**Step 2 — Route:**

```bash
python ~/.agents/skills/delegate/scripts/route.py route \
  --task-shape batch_synthesis \
  --input-size-kb 140 \
  --expected-output-tokens 20000 \
  --time-sensitivity normal \
  || echo "ERROR: route.py failed — fall back to sonnet default"
```

Output:

```json
{
  "primary_model": "sonnet",
  "primary_command": "Agent tool with model: sonnet",
  "fallback_chain": ["inline"],
  "excluded": ["haiku"],
  "justifications": [
    "exclude ['haiku']: Output exceeds the 8K-token self-imposed budget on Haiku dispatches (keep cheap-tier jobs small and verifiable).",
    "primary=sonnet: Batch synthesis + large input: Sonnet's 1M context window fits."
  ]
}
```

**Step 3 — Dispatch:** the main session dispatches a cold Sonnet subagent (Agent tool, `model: sonnet`) with the batch-review prompt.

**Step 4 — Log outcome:** after the review returns, the main session calls:

```bash
python ~/.agents/skills/delegate/scripts/log-dispatch.py \
  --task-shape batch_synthesis --model sonnet --success true \
  --tokens-in 35000 --tokens-out 2400 --duration-sec 42.0 \
  || echo "ERROR: log-dispatch failed — log payload saved locally for retry"
```

Expected output: the row just written, including its `id` (the 1-based line number in `data/dispatch-log.jsonl`). If the file cannot be written, the script returns `pending_upload: true` with the OS error and the payload is kept locally for retry. Later calibration reads filter by `category == "dispatch_log"` and group by `(task_shape, model)` for success-rate tuning. See `references/integration-guide.md` "Calibration feedback loop" for the full read.


## Error Handling

| Failure | Behaviour |
|---------|-----------|
| `routing-table.json` missing or corrupt | `route.py` exits 2, prints error. Consumer should fall back to `sonnet` for non-strategic dispatch work and flag drift. |
| No model survives the exclusion filters | `route.py` exits 1 with empty `primary_model` + populated `excluded` array. Consumer surfaces to the user: "The descriptor has contradictory constraints (e.g. budget-triggered Sonnet exclusion + a >8K-output Haiku exclusion leaves nothing dispatchable). Relax one or run inline." |
| `task_shape: qc_review` without `--original-model` | `route.py` refuses to route (exit 1, empty `primary_model`, justification names the missing flag). Supply the authoring tier so the cross-tier rule can pick a different reviewer. |
| `log-dispatch.py` cannot write `data/dispatch-log.jsonl` | Returns `{"error": ..., "pending_upload": true}`; keep the payload locally for manual retry. Does not block the dispatch itself. |
| Primary model fails at dispatch time (queue_exceeded, 503, timeout) | Consumer retries first entry in `fallback_chain` and logs both attempts with `fallback_used`. |
| Consumer invokes before dispatch justified | Consumer must call `subagent-prompt` Stage 1 first. `/delegate` trusts the `dispatch_justified` flag. |
| Content signal detected but table has no rule | `route.py` ignores unknown signal flags silently. To tighten: add a rule in `routing-table.json` and the validator hook will refuse malformed additions. |
| `budget-state.json` missing or parse error | `route.py` fails-open: treats `budget_triggered` as false and routes normally. Rationale: budget-state is an optimisation hint, not a constraint; stale state shouldn't block dispatches. |

## SGS-BEM Convention

Every cold prompt this skill produces or dispatches MUST require the SGS-prefixed BEM convention (`sgs-<block>__<element>--<modifier>` (class-attribute form; the dot appears only in CSS selectors)) when the dispatched task emits class names. Without explicit injection, subagents fall back to training-default ad-hoc-semantic (e.g. `.hero-section`, `.cta-button`) and the recogniser pipeline silently drifts off-canonical.

Validation regex: `^sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$`. The `/sgs-clone` Stage 0 pre-flight gate hard-rejects non-conforming drafts on production runs.

Canonical reference: `.claude/specs/00-naming-conventions.md` §3.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `/delegate` to decide IF to dispatch | `/delegate` decides WHICH model once dispatch is justified. Use `subagent-prompt` Stage 1 for the justification check first |
| Editing the routing table without bumping `last_updated` | Consumers can cache; stale timestamps hide drift. Update the field on every edit |
| Logging dispatch outcomes via `curl` inline | Use `log-dispatch.py` — it handles tags formatting, timestamps, and error payloads consistently |
| Bypassing `/delegate` for "I know this one" cases | Every bypass is a drift point. Even "obvious" dispatches go through the table so the log shows the pattern |
| Hardcoding model names in consumer skills | Consumer should reference only `primary_command` + `fallback_chain`; model identity stays in the table |
| Forgetting to handle `primary_model: "inline"` | When `dispatch_justified=false`, the engine returns `inline` — consumer should respect this and NOT dispatch |

## Invoked Skills

**This skill invokes no other skills mid-execution.** It is a decision engine — reads `routing-table.json`, applies rules, returns a recommendation, and exits. The consumer skills listed below are the ones that CALL `/delegate`, not ones `/delegate` invokes in turn.

| Consumer skill | Relationship |
|-------|------|
| `subagent-prompt` | Calls `/delegate` in its Stage 2 after Stage 1 dispatch justification passes |
| `dispatching-parallel-agents` | Each parallel branch calls `/delegate` independently before dispatching |
| `phase-planner` | ASSIGN MODELS step consults `/delegate` per plan step |
| `strategic-plan` | Phase 3 Effort Estimation dispatch consults `/delegate` |
| `subagent-driven-development` | Each of the 3 per-task subagents (implementer, spec-reviewer, quality-reviewer) consults `/delegate` |

## Content Signals (privacy + risk routing)

The routing table supports 4 content-derived flags that keep sensitive work in the main thread and route risky work to the right Claude tier. Every provider is Anthropic, so the concern is minimising copies of sensitive content across subagent transcripts.

| Signal | When true | Routing effect |
|--------|-----------|---------------|
| `pii_detected` | Task text includes names, emails, phone numbers, addresses | Stays inline — fewest copies across subagent transcripts and logs. |
| `contains_secrets` | Task text includes API keys, passwords, tokens | Stays inline. Flag any genuine no-network requirement to Bean. |
| `jailbreak_signal` | Suspicious prompt injection or guardrail-bypass attempt | Routes to Sonnet (audit logging; keeps the suspect content out of the main thread). |
| `high_complexity` | Multi-hop reasoning or ambiguous requirements | Stays inline — the main-thread frontier model (Fable 5/Opus) is the deep-reasoning tier. |

**Who sets these:** the consumer skill that calls `/delegate`. Examples:
- subagent-prompt Stage 1 could scan the task prompt for credential patterns and set `contains_secrets`
- strategic-plan Phase 3 Risk Assessment could mark a plan step `high_complexity` when the assessor subagent flags it

## Budget Alert Hook

Dispatchable models (Sonnet, Haiku) carry monthly GBP spend ceilings in `routing-table.json` under `budget_thresholds`. A cron-invoked `scripts/check-budget.py` reads `data/dispatch-log.jsonl` every 2 hours, sums token spend for each model this calendar month, and writes `data/budget-state.json` when any model exceeds its threshold.

When `budget_triggered: true`, `route.py` auto-injects the flag into every descriptor and the `budget_triggered_prefers_haiku` rule (priority 22) excludes Sonnet for `time_sensitivity=normal` work, stepping it down to Haiku. Critical (`time_sensitivity=high`) still routes normally. Inline (main thread) is never budget-gated.

**Reset:** `python ~/.agents/skills/delegate/scripts/check-budget.py --reset` clears the state file (e.g. when the month rolls over, or when the user approves a one-off budget bump).

**Rationale:** Personal-scale AI infra rarely automates budget controls — they are an enterprise pattern. Applying it here gives Bean a visible brake on cumulative dispatch spend, since there is no free tier.

## Data-Driven Calibration

The routing table is a hypothesis. The dispatch log is the evidence. Monthly review of `data/dispatch-log.jsonl` is the feedback loop that turns routing from guess-based to measured. See `references/integration-guide.md` "Calibration feedback loop" for the read and tuning protocol.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/route.py` | Decision engine — reads routing-table.json, applies rules, returns recommendation |
| `scripts/log-dispatch.py` | Appends dispatch outcomes to `data/dispatch-log.jsonl`, one JSON object per line |
| `scripts/test_route.py` | Unit-test suite — 14 scenarios covering every decision rule (incl. cross-tier QC + persona panel). Run on any routing-table.json edit to prevent silent regression |
| `scripts/check-budget.py` | Cron-invoked: queries dispatch_log for monthly spend, writes budget-state.json when a paid model exceeds its threshold |
| `hooks/validate-routing-table.py` | Integrity check — refuses malformed routing-table.json (missing keys, dead fallback targets, bad priorities) |
