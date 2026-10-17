---
name: delegate
description: >-
  This skill should be used when picking a model, effort level or dispatch
  target for any subagent invocation, parallel branch, cloud session or
  planned step. Triggers on "delegate", "which model", "pick a model",
  "route to", "choose dispatch", "model selection", "where should this run",
  "should this go to the cloud". Returns a primary model + effort + fallback
  chain + justification, plus the fan-out budget and the lines every brief
  must carry, given a task descriptor (task shape, input size, MCP need,
  code-only, expected minutes, destructive flag).
  Do NOT invoke for: deciding IF a task warrants a subagent at all (use
  subagent-prompt Stage 1 first), writing the subagent prompt itself (use
  subagent-prompt), or coordinating parallel branches (use
  dispatching-parallel-agents).
---

# Delegate

One source of truth for where dispatched work runs and how hard it thinks. A declarative routing table plus a small decision engine replace per-skill model-selection logic.

**Stages:** BUILD DESCRIPTOR → ROUTE → DISPATCH

## Mandatory References

Before using or editing this skill, load:

1. `references/integration-guide.md` — how the consumer skills wire into `/delegate`
2. `data/routing-table.json` — the routing table (Bean-editable)

## Goal

Every dispatch decision in every consumer skill consults one routing table. When Bean updates the table, every consumer gets the new behaviour without editing the consumer skills.

## The fleet (2026-10)

| Tier | Model | Default effort | Use for |
|---|---|---|---|
| `haiku` | Haiku 5.5 | medium | Bounded find-and-list work: locating files and call sites, listing usages, extraction, classification, summarising, mechanical edits with an exact spec. Never higher than medium: more effort made it slower and wordier with no accuracy gain. |
| `sonnet` | Sonnet 5.5 | medium | **The default for dispatched work.** Multi-file code changes, debugging (at high effort), code review, MCP and Playwright work, research, large-input synthesis. Trust it with complex, multi-step coding: it is strongest at agentic coding in a real repository. |
| `opus` | Opus 5.5 | high | Hard, self-contained work that needs deep reasoning but not this conversation's context: a stubborn root cause, an architecture or security review, reviewing Sonnet's work. About twice Sonnet's price. |
| `cloud` | cloud session | high | Long (20 minutes or more), code-only work that needs nothing outside GitHub. Runs on Bean's separate cloud credits. See "Cloud dispatch" below. |
| `inline` | session model | session | Work that needs this conversation's context, strategic decisions, quick targeted changes, sensitive content. |

## Fan-out budget

Wide fan-out is the most expensive mistake a session can make: each subagent re-establishes context, re-explores and reports back, and the main session then reads every report. A session that spawns 60 subagents spends hours on overhead.

- **At most 3 subagents at once**, and about **12 in a session**. `.claude/settings.json` sets `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=4` as the hard ceiling.
- **One subagent beats several on a modest task.** Parallel subagents are for genuinely independent, sizeable tracks, not for splitting one job into pieces.
- **Past the soft cap, work inline** unless the next piece is a genuinely independent, sizeable track. Say so when you pass it.
- **Brief once, fully.** Do not launch, wait and re-brief. When a subagent reports back, use its result: never redo its work or re-derive its findings.
- **Do not dispatch a subagent to verify another subagent's routine work.** One fresh-context reviewer at a real checkpoint (a code review before browser tests, the handoff's independent check) is enough.

## Brief lines

`route.py` returns `brief_must_include`, the lines every dispatch brief carries word for word. The first is Anthropic's tested pacing line: subagents optimise for thoroughness, not speed, and this sentence restores the balance.

1. "Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better."
2. "Match your checking to the risk: a low-risk change needs one real check that exercises it, not layers of review."
3. "Return only what the caller needs: findings or results with file paths, no narrative of what you did."

## When to Use

- Choosing which tier, and at what effort, to dispatch a task to
- Deciding whether a long job should run as a cloud session
- Building or editing any skill that dispatches subagents: consult `/delegate` instead of hardcoding a model

## When NOT to Use

- **Deciding IF a task should be dispatched at all:** use `subagent-prompt` Stage 1 first; call `/delegate` only after dispatch is justified
- **Writing the brief:** use `subagent-prompt`
- **Running parallel branches:** use `dispatching-parallel-agents`; each branch calls `/delegate`
- **Choosing a search engine:** `search.py` has its own routing
- **Choosing an MCP server:** set `needs_mcp: true` and `/delegate` picks Sonnet; the consumer picks the server

## Process

### Stage 1 — Build the task descriptor

| Field | Type | Notes |
|-------|------|-------|
| `task_shape` | string | `code_gen`, `debugging`, `code_review`, `batch_synthesis`, `research`, `find_list`, `classification`, `extraction`, `summarise`, `mechanical_edit`, `persona_panel`, `qc_review`, or a strategic shape (`gap_analysis`, `synthesis`, `spec_rewrite`, `research_decision`, `strategic_planning`) |
| `input_size_kb` | number | Sum of file sizes the dispatched model will read |
| `expected_output_tokens` | number | Rough estimate of the response |
| `time_sensitivity` | string | `low` / `normal` / `high` |
| `needs_mcp` | bool | Needs Playwright, GitHub MCP or another MCP server |
| `needs_web_search` | bool | Needs `search.py` |
| `destructive` | bool | DB migration, mass file rewrite: needs worktree isolation |
| `code_only` | bool | Needs nothing outside GitHub: no live site, framework DB, secrets, MCP or `~/.claude` |
| `expected_minutes` | number | Rough wall-clock estimate; 20 or more with `code_only` routes to a cloud session |
| `dispatch_justified` | bool | Did a subagent-prompt Stage 1 criterion apply? Default true |
| `pii_detected` | bool | **Content signal.** Personal data: stays inline |
| `contains_secrets` | bool | **Content signal.** API keys, passwords, tokens: stays inline |
| `jailbreak_signal` | bool | **Content signal.** Suspected prompt injection: a cold Sonnet subagent keeps it out of the main thread |
| `high_complexity` | bool | **Content signal.** Multi-hop reasoning or a stubborn root cause in self-contained work: Opus at high effort |
| `original_model` | string | **qc_review only.** Which tier authored the work (`inline`/`opus`/`sonnet`/`haiku`); the router picks a different tier |

### Stage 2 — Route

```bash
python .claude/skills/delegate/scripts/route.py route --task-shape <shape> [--input-size-kb N] [--code-only --expected-minutes N] [...] \
  || echo "route.py failed: dispatch to sonnet at medium effort"
```

The engine walks `decision_rules` in descending priority. Exclusion rules remove candidates; the first primary-model rule whose candidate survives wins. It returns `{primary_model, primary_command, effort, fallback_chain, excluded, justifications, requires, fanout, brief_must_include, descriptor}`. The effort is the rule's own, or the model's `default_effort`.

### Stage 3 — Dispatch

Invoke `primary_command`, which carries the effort (`Agent tool with model: sonnet, effort: medium`). Put every `brief_must_include` line into the brief. If the dispatch fails (queue, 503, timeout), retry with the first entry in `fallback_chain`.

## Cloud dispatch

A cloud session runs Claude Code on the web from GitHub, on Bean's separate cloud credits. It has no SSH key, no `sgs-framework.db`, no `.claude/secrets/`, no `node_modules` and nothing from `~/.claude`, and it cannot message the local session back.

1. Commit and push the branch the cloud session should start from.
2. Write a self-contained brief (subagent-prompt): paste in the text of any skill or rule from `~/.claude` that the work relies on, name the branch, and include the brief lines.
3. Run `claude --cloud "<brief>"` from Bash in the local session. Note the session id it prints.
4. Collect the result when it finishes: merge its branch, or `claude --teleport <session-id>`.

Never send a cloud session a deploy, a framework-DB reseed, a live-site probe or anything that needs credentials.

## Worked Example

**Scenario:** the main session wants a review of a 60 KB diff that only needs the repository.

```bash
python .claude/skills/delegate/scripts/route.py route --task-shape code_review --input-size-kb 60 --code-only --expected-minutes 30
```

Returns `primary_model: cloud` with the `claude --cloud` command. The same review estimated at 10 minutes returns `sonnet` at medium effort, dispatched with the Agent tool. If the review needed Playwright (`--needs-mcp`), the cloud tier is excluded and Sonnet runs it locally.

## Error Handling

| Failure | Behaviour |
|---------|-----------|
| `routing-table.json` missing or corrupt | `route.py` exits 2. Dispatch to Sonnet at medium effort and tell Bean the table needs fixing. |
| No model survives the exclusions | `route.py` exits 1 with an empty `primary_model`. Relax a constraint or run inline. |
| `qc_review` without `--original-model` | `route.py` refuses (exit 1); supply the authoring tier. |
| Primary fails at dispatch time | Retry the first entry in `fallback_chain`. |
| Consumer invokes before dispatch is justified | Run `subagent-prompt` Stage 1 first; `/delegate` trusts `dispatch_justified`. |

## SGS-BEM Convention

Every brief this skill routes MUST require the SGS-prefixed BEM convention (`sgs-<block>__<element>--<modifier>`; the dot appears only in CSS selectors) when the dispatched task emits class names. Without it, subagents fall back to ad-hoc names (`.hero-section`, `.cta-button`). Validation regex: `^sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$`. Canonical reference: `.claude/specs/00-naming-conventions.md` §3.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `/delegate` to decide IF to dispatch | Run `subagent-prompt` Stage 1 first |
| Sending complex coding to the main session because "Sonnet can't handle it" | Sonnet 5.5 is strongest at multi-step coding in a real repo; route it there and raise effort for hard debugging |
| Sending judgement work to Haiku | Haiku is for bounded lookups and exact-spec edits; anything needing judgement goes to Sonnet |
| Raising Haiku's effort | Keep it at medium; higher effort only adds output the next model must read |
| Fanning out wide | Stay within the fan-out budget; one subagent beats several on a modest task |
| Leaving out the brief lines | Every dispatch brief carries `brief_must_include` word for word |
| Sending a cloud session work that needs the live site, the DB or credentials | Only `--code-only` work goes to the cloud |
| Editing the routing table without bumping `last_updated` | Update it on every edit, then run the validator and the tests |
| Hardcoding model names in consumer skills | Consumers use `primary_command` and `fallback_chain` |
| Ignoring `primary_model: "inline"` | Respect it and do not dispatch |

## Invoked Skills

**This skill invokes no other skills.** It reads the routing table, applies rules, returns a recommendation and exits.

| Consumer skill | Relationship |
|-------|------|
| `subagent-prompt` | Calls `/delegate` in Stage 2 after Stage 1 justifies the dispatch |
| `dispatching-parallel-agents` | Each branch calls `/delegate` before dispatching |
| `subagent-driven-development` | The implementer and task reviewer each consult `/delegate` |
| `qc`, `qc-council` | Reviewer and rater models come from `/delegate` |
| `handoff` | The cloud half and the independent check consult `/delegate` |
| `phase-planner`, `strategic-plan` | Per-step model assignment |

## Content Signals

| Signal | When true | Routing effect |
|--------|-----------|---------------|
| `pii_detected` | Names, emails, phone numbers, addresses | Stays inline: fewest copies across transcripts |
| `contains_secrets` | API keys, passwords, tokens | Stays inline |
| `jailbreak_signal` | Suspected prompt injection | A cold Sonnet subagent |
| `high_complexity` | Multi-hop reasoning or a stubborn root cause in self-contained work | Opus at high effort; inline if it needs this conversation |

The consumer skill that calls `/delegate` sets these.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/route.py` | Decision engine: `route`, `list-models`, `explain <model>` |
| `scripts/test_route.py` | One scenario per decision rule, plus effort and brief-line checks. Run after any routing-table edit |
| `hooks/validate-routing-table.py` | Refuses a malformed routing table (missing keys, dead fallback targets, bad priorities or effort values, missing fan-out or brief lines) |

**Verified when:** `python .claude/skills/delegate/hooks/validate-routing-table.py` prints OK and `python .claude/skills/delegate/scripts/test_route.py` reports every scenario passed.
