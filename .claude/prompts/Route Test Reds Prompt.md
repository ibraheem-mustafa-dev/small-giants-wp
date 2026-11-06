Invoke /autopilot before doing anything else.

CONTEXT: 29 tests in `scripts/computed-route/tests` fail on main (2026-11-06, commit ca8171e11). They fail the same way on an untouched copy of main, so no single recent change is the obvious cause. They span Fill (`fill-band`, `fill-css-groups`, `fill-equivalents`, `fill-reach`, `fill-state`, `fill-wire`), `resolve-size-keyword`, `resolve-side-effects`, skeleton (`skeleton-rules`, `skeleton-panel-rules`, `skeleton-propose`), palette (`palette-keys`, `intake-palette-facts`), motion (`motion-behaviours`, `motion-stagger`), and single tests in `calibrate-reads-settings`, `fact-key`, `mutation-lists`, `review-motion` and `shop-parts`. Goal: a green route suite, so a new red means something again.

READ FIRST: `.claude/rules/cloning-pipeline.md`; `.claude/LEDGER.md`; the 2026-11-02 route rewind commit `0ea1a6cb2`, because several reds may be new DB rows or code meeting a rewound test or helper; auto memory `no-other-track-owns-a-fault`, `count-test-failures-from-the-summary-line`, `worktree-gotchas`.

TASKS, in order:
1. Run the suite in a fresh worktree on its own (`node --test "scripts/computed-route/tests/**/*.test.mjs"`) and group the failures by cause, not by file. Two load-sensitive live tests in `state-route.test.mjs` time out under machine load: rerun those alone before counting them.
2. Show Bean the groups with a recommendation: for each, is the test stale or the code wrong?
3. Fix the approved groups, the code where the code is wrong.
4. Treat `calibrate-reads-settings` apart. `align-self` (`sgs/button.alignSelf`, `sgs/post-grid.readMorePin`) and `mask-image` (`sgs/label.markerIcon`) are routed settings calibration never reads. Adding them changes `READ_KEY`, which makes every slot map stale and forces a full run of every block on every mirror. Put that cost to Bean before doing it.

Done = the route suite reports 0 failures, or each survivor is named with Bean's decision.

GUARDRAILS: fresh worktree with its own `npm ci`; never link or junction `node_modules` or `cache`; run the suite on its own (two at once fails timing tests); commit straight to main with explicit paths.
