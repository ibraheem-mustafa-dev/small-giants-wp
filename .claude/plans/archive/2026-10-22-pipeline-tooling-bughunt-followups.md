---
doc_type: plan
title: Pipeline tooling bug hunt, follow-ups
created: 2026-10-22
status: closed
---

# Pipeline tooling bug hunt: follow-ups

The Console's bug-hunter Managed Agent (`.claude/cloud-agents/agents/bug-hunter/`, run on the Max plan's API credits) scanned the cloning-pipeline tooling on 2026-10-22 in five runs (reports: `.claude/cloud-agents/reports/2026-10-22-run{1,2,3,4,5}-bug-report.md`); every reported bug is fixed on `main` with regression tests. How to run and verify a hunt: auto memory `max-api-credits-cover-agent-sdk-not-claude-code` (its bug-hunter section). Run 5 re-scanned the two slices run 3 never read; its coverage is complete.

Decisions recorded with the fixes: rule 45 counts `writingMode` as native typography; the two bugs in the hash-pinned runtime `c60c49083997.support.js` are accepted (Spec 48A FR-48A-5); a worker run through `api-agent.py` cannot write under `.claude/` (auto memory `api-worker-cannot-write-claude-dir-protected-path`), so the main session writes `.claude/` docs.

## Closed

1. **Reseed:** cancelled as a task. Both changes are in code on `main` (the roster passes its dry run), so whichever session next reseeds the framework DB carries them with no extra step; a dedicated reseed would cost a detached worktree and a regenerated-files commit for no earlier benefit.
2. **Run 5's 35 unproven rating-2 suspicions:** cancelled. They are the agent's lowest-confidence guesses, its provers over-confirm, and five runs have already drained the files with a real fix history.
