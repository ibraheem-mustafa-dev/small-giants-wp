---
doc_type: ledger
filename_glob: LEDGER.md
required_sections: []
freshness_days: 7
---

# LEDGER Template

## Purpose

`.claude/LEDGER.md` says where the project stands right now. It holds status only: the next session's instructions go in the prompt `/handoff` pastes, how and in what order in the plans, and history in git. It is replaced, never appended, and stays under 24,576 bytes.

## Shape

One section per front (a track of work that sessions pick up). Each front holds:
- **State:** the actual position in plain English, with branch/hash, build and deploy status where relevant.
- **Blockers:** open blockers only, each naming the task it blocks.
- **Resume from:** the governing plan's path and section.

## Scoring Criteria

### Structural (40%)
- Under the byte cap
- Headings in order; no dead links

### Completeness (30%)
- No stubs or placeholders
- Every front has a state and a plan pointer

### Quality (20%)
- Plain English; UK spelling
- No task lists, orchestration or next-session prompts; no history notes

### Freshness (10%)
- Updated within 7 days

## Example (minimal-but-passing)

```markdown
# my-project: LEDGER

## Checkout redesign
**State:** payment step built and deployed to staging (main @ a1b2c3d); build green.
**Blockers:** Stripe live keys (blocks plan step 4, go-live).
**Resume from:** `.claude/plans/2026-09-20-checkout-plan.md` §3.
```

## Common Mistakes

| Mistake | Fix |
|---|---|
| Appending session notes | Replace the front's state; git keeps history |
| A blocker with no task | Name the task, or delete it if nothing depends on it |
| Next steps written here | They go in the plan and the pasted prompt |
