# `/delegate` Integration Guide

How the 5 consumer skills should consult `/delegate` instead of re-implementing model selection.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Consumer skill needs to dispatch work                  │
│  (subagent-prompt / phase-planner /                     │
│   strategic-plan / dispatching-parallel-agents /        │
│   subagent-driven-development)                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │ /delegate consulted         │
         │ scripts/route.py            │
         │ + data/routing-table.json   │
         └──────────────┬──────────────┘
                        │
                        ▼
      {primary_model, primary_command,
       fallback_chain, justification}
                        │
                        ▼
         ┌─────────────────────────────┐
         │ Consumer dispatches         │
         │ (invokes the command)       │
         └──────────────┬──────────────┘
                        │ (after dispatch completes)
                        ▼
         ┌─────────────────────────────┐
         │ scripts/log-dispatch.py     │
         │ appends outcome to          │
         │ data/dispatch-log.jsonl     │
         │ (category: dispatch_log)    │
         └─────────────────────────────┘
```

## Per-consumer integration

### 1. subagent-prompt Stage 2 Choose the Model

**Current state:** Stage 2 has a 4-row manual table mapping task shape to model.

**Change to:**
- Replace the manual table with a call to `/delegate`.
- Stage 2 body: "Run `/delegate route` with the task descriptor. Use the returned primary_model + fallback_chain to populate the prompt's 'Model' declaration. Log the dispatch outcome via `scripts/log-dispatch.py` after the subagent returns."

**Input/output contract stays the same** — this is purely a decision-engine swap.

### 2. phase-planner ASSIGN MODELS (Stage 4)

**Historical state (pre-/delegate):** Model assignment rule was 4 bullets describing per-model use cases (incl. since-retired non-Claude tiers). Manual judgement per step.

**Change to:**
- Replace the 4-bullet rule with: "For each step, call `/delegate route --task-shape <shape> --input-size-kb <estimate> --expected-output-tokens <estimate>`. Use the returned primary_model for that step. Override only with recorded reasoning."

**New Step 4.5:** Surface aggregate cost estimate across all steps using `routing-table.json`'s `cost_per_1m_*_tokens` fields × per-step token estimates.

### 3. strategic-plan Phase 3 (Risk + Effort Assessment)

**Current state:** Phase 3 hardcodes Opus for Risk Assessment and Sonnet for Effort Estimation.

**Change to:**
- Opus for Risk Assessment stays (Risk needs deep reasoning by default).
- Sonnet for Effort Estimation becomes `/delegate` call with `task_shape=effort_estimation, input_size_kb=<plan-size>, expected_output_tokens=<rough>`.
- Agent Cost table appendix reads directly from `routing-table.json` instead of hardcoding per-model costs.

### 4. dispatching-parallel-agents

**Current state:** Skill says "dispatch subagents in parallel" without model guidance per branch.

**Change to:**
- Add a Step 2 "Per-branch model selection": for each independent branch, call `/delegate route` with the branch descriptor. Use returned primary_model. Parallel branches get independent routing decisions.
- Add Step 5 "Log outcomes": after each parallel branch completes, each branch calls `log-dispatch.py` with its own metadata.

### 5. subagent-driven-development

**Current state:** Dispatches 3 subagents per task (implementer, spec-reviewer, code-quality-reviewer) via the three prompt templates. No model selection documented.

**Change to:** Per-prompt template, add a comment line:
- `implementer-prompt.md`: `/delegate route --task-shape code_gen --input-size-kb <est>` (typically returns `sonnet`)
- `spec-reviewer-prompt.md`: `/delegate route --task-shape code_review --input-size-kb <diff-size>` (typically returns `sonnet`, sometimes `haiku` for small diffs)
- `code-quality-reviewer-prompt.md`: `/delegate route --task-shape code_review --input-size-kb <diff-size>` (same)

**Benefit:** when the dispatch_log shows spec-reviewer on small diffs is systematically wasted on Sonnet when Haiku would do, Bean updates the routing-table to route that shape to Haiku. The table learns; the prompts don't need to be rewritten per observation.

## Calibration feedback loop

Dispatches are logged to `~/.agents/skills/delegate/data/dispatch-log.jsonl` — one JSON object per line. Each line has `source`, `title`, `category` (`"dispatch_log"`), `tags` (a JSON-encoded array, see below), `confidence`, `created_at`, `id` (1-based line number), and `content`: a JSON-encoded string holding the fields that matter:
- `task_shape` (what was dispatched)
- `model` (what was chosen)
- `success` (did it complete successfully)
- `tokens_in` / `tokens_out` (real usage, not estimate)
- `duration_sec` (wall-clock)
- `fallback_used` (if primary failed, what backup ran)
- `error_class` (if failed: queue_exceeded, 503, timeout, etc)

**Monthly calibration review:** read the JSONL, keep rows with `category == "dispatch_log"` from the last 30 days, group by `(task_shape, model)`, compute success rate. If a `(shape, model)` pair has <80% success over ≥5 dispatches, update the routing-table to route that shape elsewhere.

**Aggregation template** (reads the same file `check-budget.py` reads):
```bash
python - <<'PY'
import json, collections
from datetime import datetime, timedelta, timezone
from pathlib import Path

path = Path.home() / '.agents/skills/delegate/data/dispatch-log.jsonl'
cutoff = datetime.now(timezone.utc) - timedelta(days=30)
groups = collections.defaultdict(list)

for line in path.read_text(encoding='utf-8').splitlines():
    if not line.strip():
        continue
    row = json.loads(line)
    if row.get('category') != 'dispatch_log':
        continue
    if datetime.fromisoformat(row['created_at']) < cutoff:
        continue
    c = json.loads(row['content'])
    groups[(c['task_shape'], c['model'])].append(c)

for (shape, model), rows in sorted(
        groups.items(),
        key=lambda kv: sum(bool(r['success']) for r in kv[1]) / len(kv[1])):
    n = len(rows)
    if n < 5:
        continue
    rate = sum(bool(r['success']) for r in rows) / n
    avg = sum(float(r.get('duration_sec') or 0) for r in rows) / n
    print(f'{shape:24} {model:10} success={rate:.2f} n={n} avg_duration={avg:.1f}s')
PY
```

### Tag prefix convention

Every `dispatch_log` row carries a `tags` array (JSON-encoded on the row) with prefixed strings. The prefix identifies the dimension — this keeps queries sharp even when tag values overlap across dimensions (e.g. "sonnet" is both a model AND a proper name).

| Prefix | Example values | What it captures |
|--------|---------------|------------------|
| `model:` | `model:haiku`, `model:sonnet`, `model:inline` | Which model was chosen by `/delegate` |
| `task:` | `task:code_gen`, `task:batch_synthesis`, `task:classification` | The task_shape from the dispatch descriptor |
| `success:` | `success:true`, `success:false` | Dispatch outcome |
| `fallback:` | `fallback:sonnet` (set only when a fallback was used) | Which primary model failed before this one took over |
| `error:` | `error:queue_exceeded`, `error:503`, `error:timeout` (set only on failure) | Error class for calibration grouping |

When filtering by tag, parse the `tags` JSON and match a whole element (`'model:sonnet' in json.loads(row['tags'])`) rather than a raw substring search over the line, to avoid false positives.

Run this monthly; any `(shape, model)` row with `success_rate < 0.8` is a calibration target.

## Rollout order

1. **Build `/delegate`** (this skill) — done first so consumers have something to consult.
2. **Update subagent-prompt Stage 2** — highest-traffic consumer; cold-prompt writing is frequent.
3. **Update phase-planner + strategic-plan + dispatching-parallel-agents + subagent-driven-development** — can be done in a single batch since they share the same change pattern (replace manual table with `/delegate` call).
4. **First calibration review** — after 2 weeks of dispatch_log data, run the query above and tune the routing-table.

## Fallback behaviour when `/delegate` is unreachable

If `route.py` fails (script missing, table corrupt, Python env broken), consumer skills should:
1. Log the failure via `log-dispatch.py` (the log append is independent of route.py).
2. Fall back to Sonnet as the default dispatch model (reliable, 1M context, the quality floor Bean expects).
3. Notify the user in-line: "⚠️ /delegate unreachable, using sonnet default. Check routing-table.json parses."
