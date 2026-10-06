# W3-H report (R2, R3, R4)

Files touched: scripts/computed-route/lib/issue-classes.mjs, lib/sweep.mjs, tests/sweep.test.mjs. (solve-report.mjs and register-sweep.test.mjs unchanged; triage.mjs untouched.)

## R2 (done)
- New in `lib/issue-classes.mjs`: `normalisePath`, `normalisedIssueKey`. `issueKey` is unchanged (test asserts its exact format).
- Rule: remove every `:nth-of-type(...)` and `:nth-child(...)` (any argument) from the path component only; ref/pair, kind and key untouched.
- Call site: new `lib/sweep.mjs::sweepDelta(prev, next)` (aggregate results or row arrays) counts occurrences per normalised key and returns { closed, opened, kept }. Counting, not set membership, means siblings differing only by position stay separate findings (losing one is a close). No sweep-over-sweep delta existed before; no existing caller changed.
- Tests: positional change gives zero closed/opened; different element, property or ref stay distinct; sibling loss counted; issueKey format asserted.

## R3 (done, option 1)
- `lib/sweep.mjs::reportStatus(solveDir, surface, sweepStart?)` returns { file, stale }. Stale reasons: `incomplete-run` (newest run dir has no solve-report.json, so the served report is an older run) and `predates-sweep` (report mtime before sweepStart). `latestReport` unchanged (triage uses it).
- `aggregate` takes `entry.stale`, outputs `stale: { surface: {reason, report, newestRun} }`; counts unchanged.
- Tests: incomplete dir flagged; current report and all-fresh sweep give `stale: {}`.

## R4 (done)
- `walkerCaveats(source)` and `readWalkerCaveats(reportPath)` read `states[*].findings` and `states[*].unsettled`. The walker persists `states` only in `draft-cache-<widths>.json` beside solve-report.json (report.json carries no states), so the reader uses those. Live-side findings are not persisted anywhere and cannot be surfaced without a walker or solve.mjs change.
- `aggregate` takes `entry.caveats`, outputs `caveated: { surface: [ {kind, state, width, detail} ] }`, only for surfaces with any; counts unchanged.
- Tests: reveal-unfired and unsettled surfaced, F/total/byClass identical; clean result gives no caveat.

## Command
`node --test scripts/computed-route/tests/sweep.test.mjs scripts/computed-route/tests/register-sweep.test.mjs` -> 35 pass, 0 fail. `node --check` clean on both libs.

## Not done: wiring (outside my set)
`scripts/computed-route/sweep.mjs` (the CLI) must call `reportStatus` (with its start time as sweepStart), `readWalkerCaveats` and pass `stale`/`caveats` into `aggregate`, and print them. Until then none of R3/R4 reaches the output. Not in the allowed list or the collision gate list I could see.
