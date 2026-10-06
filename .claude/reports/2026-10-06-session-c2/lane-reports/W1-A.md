# W1-A report (H2 then H1)

## H2 - done
- `plugins/sgs-blocks/includes/helpers-tokens.php::sgs_transition_vars`: the digit-stripping is replaced by a refusal. Accepted: non-negative int, integral non-negative float, string of digits only. Everything else ("0.25s", "0.3", "1s", "250ms", "-5", " 250", fractional floats) falls back to the default 300ms. Zero survives.
- `scripts/computed-route/lib/resolve.mjs`: new `timeToMs` (exported) and `TIME_PROPS` branch in `formatValue` (transition/animation duration and delay). Seconds convert to integer ms (0.25s -> 250), ms pass through, a non-time or a list is refused (error). A string-only setting receives the number as text ("250"), matching the existing unit-setting convention.
- Tests: `plugins/sgs-blocks/tests/php/run-transition-vars-standalone.php` (new): 12 refusal cases assert the DEFAULT is emitted (not a stripped number), plus pass-through cases for "250", 250, 250.0, "0", 0, "1000", plus an in-file strip stub proving the refusal cases would go red. `scripts/computed-route/tests/resolve.test.mjs`: two tests (conversion, red if the branch is removed; over-suppression: 250ms, 0s, refusal of -1s / lists / keywords).
- Commands: `php plugins/sgs-blocks/tests/php/run-transition-vars-standalone.php`; `node --test scripts/computed-route/tests/resolve.test.mjs`.
- Output: PHP "Transition vars: all passed"; resolve 29 pass / 0 fail. With the TIME_PROPS branch disabled: 27 pass / 2 fail (red on revert confirmed).

## H1 - done in my files, needs a caller wire-up (see concern)
- `scripts/computed-route/lib/entrance.mjs::entranceStart` now takes a 4th arg `rects` (default `g.rects`): { width: { y, h } } of the live element at scrollY 0. It writes only if every measured width has `y` < viewport height (`FIRST_VIEWPORT_HEIGHT` 812, or `rect.vh`). Missing rects = unknown = no write. New export `groupRects( report, g )` reads `run.pairs[g.pair].live.box` (the walker's snapshot box, y includes scrollY).
- Tests (`tests/entrance.test.mjs`): below-fold armed entrance writes nothing (also mixed-width and no-geometry cases); first-viewport entrance still writes; `groupRects` unit test; existing positive controls now pass `TOP` rects so they stay non-vacuous.
- Output: 4 pass / 0 fail; with the viewport check removed: 3 pass / 1 fail (red on revert confirmed).
- Combined run of both route test files: 33 pass / 0 fail. `node --check` and `php -l` clean.

## Concern (important)
Diff rows carry no geometry, and the two callers (`scripts/computed-route/solve.mjs`, `lib/triage.mjs`) are outside my files and pass only `(g, node, perWidth)`. Until they set `g.rects = groupRects( report, g )` (or pass it as the 4th argument), `entranceStart` fails closed and NEVER writes, including the genuine first-screen case. That is safe but silences the feature. Recommended follow-up: one line in each caller (or in `solve-rows.mjs::writableGroups`). Not done because those files are not mine.
