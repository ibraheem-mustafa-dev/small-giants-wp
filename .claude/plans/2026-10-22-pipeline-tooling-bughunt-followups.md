---
doc_type: plan
title: Pipeline tooling bug hunt, follow-ups
created: 2026-10-22
status: open
---

# Pipeline tooling bug hunt: follow-ups

The Console's bug-hunter Managed Agent (`.claude/cloud-agents/agents/bug-hunter/`, run on the Max plan's API credits) scanned the cloning-pipeline tooling on 2026-10-22 in four runs (reports: `.claude/cloud-agents/reports/2026-10-22-run{1,2,3,4}-bug-report.md`). 80 of the 90 reported bugs are fixed on `main` with regression tests (commits 63b6ec3dc, f7901273e, 47d936894); the old-shape migration and `scripts/computed-route/split-cache.mjs` were retired. How to run and verify a hunt: auto memory `max-api-credits-cover-agent-sdk-not-claude-code` (its bug-hunter section).

Each item below is independent. None blocks other work.

1. **Re-hunt run 3's unread slices.** Readers and reviewers both failed on run 3's slices 5 and 18 (named in the run-3 report), so that code was never scanned. Re-run the agent on just those files (`.claude/cloud-agents/agents/bug-hunter/run3-files.txt`, slice membership in the report), capped at $15.
2. **The allowedBlocks scraper misses `const allowedBlocks = [...]`.** `sgs-update-v2.py::scrape_allowed_blocks` returns None for `sgs/multi-button`'s edit.js, so `tests/test_allowed_blocks_scrape.py::TestIntegrationRealBlocks::test_multi_button_has_button` fails on `main`. Teach the opening regex that form, make the test pass, then reseed through `.claude/queue.md`. A None from the scraper must keep meaning "leave the stored value" (it cannot tell absent from unparseable).
3. **`sgs/decorative-image` fails the container roster check.** `plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` detects it as a content container but its expected roster lacks it, so Stage 10 of every reseed writes nothing until one of the two is corrected.
4. **`_process_gutenberg_block_dir` sets `blocks.type` on first insert only** (`INSERT OR IGNORE`). The stored core types are right today; decide whether `type` should also update on drift.
5. **Rule 45 scope:** `plugins/sgs-blocks/scripts/inspector-scan/rules/45-typography-full-replacement.js` lists neither `writingMode` nor WordPress core's `__experimentalWritingMode`; decide whether writing mode counts as native typography.
6. **Two bugs in a generated file:** run 4 #5 and #20 sit in `scripts/computed-route/data/runtimes/c60c49083997.support.js`, a hash-pinned copy of an external dc-runtime build. Fix upstream in that build or record them as accepted.
7. **Two fixes are proven by reading only:** `scripts/computed-route/lib/state-map.mjs::vocabStateFor` (pseudo-token stem) and `scripts/computed-route/trace-check.mjs` (null `near` key). Their tests pass on the old code too; give each a test that exercises the real code.
8. **The API worker cannot write under `.claude/`:** the handoff worker (`~/.claude/skills/delegate/scripts/api-agent.py`, run in the main checkout) had its Write tool denied, while workers editing source files in worktrees did not. Prove the cause (protected `.claude/` paths, or the project's plan-mode default) before changing the worker; until then the main session writes `.claude/` docs.
