# Autonomous Invocation Context Format

When brainstorming is invoked by another skill or autonomous agent (not a human), the caller should pass a JSON context block:

```json
{
  "topic": "What to design",
  "existing_research": "path/to/research.md or null",
  "constraints": ["list of known constraints"],
  "desired_output": "spec | exploration-graph | both",
  "skip_visual_companion": true
}
```

## Behaviour when context block is present

- Skip the mode-selection gate
- Skip the visual companion offer
- Skip all clarifying questions answerable from the context
- Proceed directly to Stage 3 (Propose Approaches)

## Exploration mode auto-exit

If `desired_output` is `exploration-graph`: enter exploration mode and run to graph completion without requiring exit phrases. Treat reaching 20 nodes or completing 3 periodic summaries as the natural end condition.
