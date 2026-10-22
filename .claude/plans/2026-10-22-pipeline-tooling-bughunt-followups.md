---
doc_type: plan
title: Pipeline tooling bug hunt, follow-ups
created: 2026-10-22
status: open
---

# Pipeline tooling bug hunt: follow-ups

The Console's bug-hunter Managed Agent (`.claude/cloud-agents/agents/bug-hunter/`, run on the Max plan's API credits) scanned the cloning-pipeline tooling on 2026-10-22 in five runs (reports: `.claude/cloud-agents/reports/2026-10-22-run{1,2,3,4,5}-bug-report.md`); every reported bug is fixed on `main` with regression tests. How to run and verify a hunt: auto memory `max-api-credits-cover-agent-sdk-not-claude-code` (its bug-hunter section). Run 5 re-scanned the two slices run 3 never read; its coverage is complete.

Decisions recorded with the fixes: rule 45 counts `writingMode` as native typography; the two bugs in the hash-pinned runtime `c60c49083997.support.js` are accepted (Spec 48A FR-48A-5); a worker run through `api-agent.py` cannot write under `.claude/` (auto memory `api-worker-cannot-write-claude-dir-protected-path`), so the main session writes `.claude/` docs.

## Open

1. **Reseed the framework DB at the next reseed.** Two code changes only take effect on a reseed, and neither needs a reseed of its own: `sync-container-wrapping-blocks.py` now lists `sgs/decorative-image` in its roster, so Stage 10 can write again; `sgs-update-v2.py::_process_gutenberg_block_dir` now updates a core block's `type` when its `render` key changes. After that reseed, confirm Stage 10 writes `block_composition` rows and `python plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` prints `VALIDATION PASS`.
2. **Not hunted: the 35 rating-2 suspicions in run 5's report** ("Not checked" list) never went to a prover. Hunt them only if a later run finds the hit rate worth it.
