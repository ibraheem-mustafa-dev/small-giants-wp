# Live verification: a full-width container keeps its grid-item stretch, 2026-09-25

verdict: PASS
intent_capture_passed: true
commit_sha: 7fea496c4 (fix(container): a container whose contentWidth is 'full' keeps its grid-item stretch)
blocks: container (the shared SGS_Container_Wrapper, so every block that routes through it)

## Method
Sandybrown, deployed with `build-deploy.py --target sandybrown --blocks-only` (120 of 120 fast gates). Probe page
`/qa-u8-patterns/` (3901, private): an outer grid container (`1fr auto`) holding two nested grid containers with three
columns each, one with `contentWidth: full` (`.u38-full`), one at the default width (`.u38-normal`). One headed Chrome
window, `getBoundingClientRect` and `getComputedStyle`.

## Cause, proven before the fix
The only rule setting position or size on `.u38-full` was `.sgs-container-<uid>{margin-inline:auto}` from
`SGS_Container_Wrapper::render` (the contentWidth centring, which fell back to the outer box because `full` renders no
content band). Removing only that margin in the tab took the box from 123px to 780px and its columns from one to two;
putting it back re-broke it.

## Results

| Check | Before (7fea496c4~1) | After | Result |
|---|---|---|---|
| `.u38-full` in its 780px track | 123 wide, centred at 329, one track | 780 wide at 0, two tracks (385.17 each; the 16rem minimum column width) | PASS |
| `.u38-normal` (control) | 388 wide | 388 wide | unchanged |
| A capped width's CSS | `.uid{margin-inline:auto}` | identical (standalone test) | unchanged |

Test: `plugins/sgs-blocks/tests/php/run-container-fullwidth-grid-standalone.php`, 12 passed, negative control against
eebb37b8f (the pre-change wrapper centres a `full` container).
