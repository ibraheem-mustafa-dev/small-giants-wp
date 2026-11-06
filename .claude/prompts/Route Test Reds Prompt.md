Invoke /autopilot before doing anything else.

CONTEXT: 29 tests in `scripts/computed-route/tests` fail on main (2026-11-06, commit ca8171e11). They fail the same way on an untouched copy of main, so no single recent change is the obvious cause. They span Fill (`fill-band`, `fill-css-groups`, `fill-equivalents`, `fill-reach`, `fill-state`, `fill-wire`), `resolve-size-keyword`, `resolve-side-effects`, skeleton (`skeleton-rules`, `skeleton-panel-rules`, `skeleton-propose`), palette (`palette-keys`, `intake-palette-facts`), motion (`motion-behaviours`, `motion-stagger`), and single tests in `calibrate-reads-settings`, `fact-key`, `mutation-lists`, `review-motion` and `shop-parts`. Goal: a green route suite, so a new red means something again.

READ FIRST: `.claude/rules/cloning-pipeline.md`; `.claude/LEDGER.md`; the 2026-11-02 route rewind commit `0ea1a6cb2`, because several reds may be new DB rows or code meeting a rewound test or helper; auto memory `no-other-track-owns-a-fault`, `count-test-failures-from-the-summary-line`, `worktree-gotchas`.

TASKS, in order:
1. Run the suite in a fresh worktree on its own (`node --test "scripts/computed-route/tests/**/*.test.mjs"`) and group the failures by cause, not by file. Two load-sensitive live tests in `state-route.test.mjs` time out under machine load: rerun those alone before counting them.
2. Decide each group yourself from the code, the spec and git history: is the test stale or the code wrong? Report the verdicts with their evidence. Ask Bean only about a real product choice those sources cannot answer.
3. Fix every group, the code where the code is wrong.
4. Treat `calibrate-reads-settings` as a small build, not a re-measure of everything. Three settings are routed but never read: `sgs/button.alignSelf`, `sgs/post-grid.readMorePin` (`align-self`) and `sgs/label.markerIcon` (`mask-image`). Adding them to the global read list changes `READ_KEY` and makes every slot map stale, so do not. Let a block's read also cover its own routed properties that the global list lacks, leaving `READ_KEY` alone, and make `longhands()` accept them. Incremental calibration (Spec 48 FR-48-93) then measures only those settings, because they have no fingerprint yet. Never hand-write slot map rows: a row must come from a reading. A paint gaining a new property will force one full run of those 3 blocks, which is acceptable. Run those 3 blocks on a free `local-*` mirror; this is the one calibration this session does.

Done = the route suite reports 0 failures, or each survivor is named with Bean's decision.

GUARDRAILS: fresh worktree with its own `npm ci`; never link or junction `node_modules` or `cache`; run the suite on its own (two at once fails timing tests); commit straight to main with explicit paths.
