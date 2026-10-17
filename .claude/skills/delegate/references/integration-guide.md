# `/delegate` Integration Guide

How the consumer skills consult `/delegate` instead of re-implementing model selection.

## Architecture

```
Consumer skill needs to dispatch work
(subagent-prompt / dispatching-parallel-agents / subagent-driven-development /
 qc / qc-council / handoff / phase-planner / strategic-plan)
                       │
                       ▼
         .claude/skills/delegate/scripts/route.py
         + data/routing-table.json
                       │
                       ▼
 {primary_model, primary_command (with effort), effort, fallback_chain,
  justifications, requires, fanout, brief_must_include}
                       │
                       ▼
 Consumer dispatches: Agent tool (haiku / sonnet / opus at the returned effort),
 claude --cloud for the cloud tier, or keeps the work inline
```

## Per-consumer contract

Every consumer does the same three things:

1. **Route** with a descriptor: `python .claude/skills/delegate/scripts/route.py route --task-shape <shape> ...`.
2. **Dispatch** with `primary_command`, which already carries the effort, and paste every `brief_must_include` line into the brief word for word.
3. **Respect the fan-out budget** in `fanout`: at most 3 subagents at once, about 12 in a session, and work inline past the soft cap unless the next piece is a genuinely independent, sizeable track.

### Typical shapes by consumer

| Consumer | Dispatch | Typical shape | Typical answer |
|---|---|---|---|
| `subagent-prompt` Stage 2 | any cold brief | as the task requires | Sonnet, medium |
| `dispatching-parallel-agents` | each branch | `find_list` for lookups, `code_gen` / `debugging` for fixes | Haiku for lookups, Sonnet for fixes |
| `subagent-driven-development` | implementer | `code_gen` | Sonnet, medium |
| `subagent-driven-development` | task reviewer | `qc_review --original-model sonnet` | Opus, high |
| `qc` | fresh-code review | `code_review` (add `--code-only --expected-minutes N` for a large diff) | Sonnet, or cloud for a long review |
| `qc-council` | raters | `persona_panel`, or `find_list` for code-path and history raters | Sonnet; Haiku for the lookup raters |
| `handoff` | doc reconciliation | `--code-only --expected-minutes 30` | cloud |
| `handoff` | independent check | `qc_review --original-model inline` | Sonnet |
| `phase-planner` | each plan step | as the step requires | per step |
| `strategic-plan` | risk assessment | `--high-complexity` | Opus, high |

## Fallback when `/delegate` is unreachable

If `route.py` fails (script missing, table corrupt), dispatch to Sonnet at medium effort, still include the three brief lines and the fan-out budget, and tell Bean: "/delegate unreachable, using Sonnet at medium effort. Check that routing-table.json parses."
