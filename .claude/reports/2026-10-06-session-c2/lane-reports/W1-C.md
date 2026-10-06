# W1-C report: P3b (armedEntrances + triggerArmed)

## Changed
- `scripts/parity/lib/devtools.mjs`: added `armedEntrances` (in-page: finite, paused, document-timeline animations, one descriptor per target element), `scrollArmedIntoView` (in-page), `triggerArmed` (node: scrolls each armed element to mid-viewport, `settleAnimations`, re-checks, restores scroll; returns `{ armed, played, unfired }`).
- `scripts/parity/draft-live-walk.mjs`: imports `triggerArmed`; after the per-state `settleAnimations` (and after the `onlyStates` skip) it runs `triggerArmed` before any pair is read. Each unfired entrance becomes `{ kind: 'reveal-unfired', tag, id, cls, animation, top }` in `states[ name ].findings` (key only present when non-empty).
- `scripts/computed-route/tests/walker-devtools.test.mjs`: three new cases.

## reveal-unfired
Emitted per armed element still paused after its own scroll plus settle. Consumer: the walker's state record only (`findings`); nothing downstream reads `findings` yet (same as the existing `unsettled` key, which has no reader either). Wiring a reader is outside my owned files.

## Tests (all RUN, 10/10 pass, real headless Chromium, only this file)
`node --test scripts/computed-route/tests/walker-devtools.test.mjs`
- Red on revert: "MUST FAIL TO READ AT THE START FRAME" asserts the settle alone leaves opacity 0 with one armed entrance, then triggerArmed gives opacity 1 and restores scroll. Reverting removes `triggerArmed`/`armedEntrances` and the file fails.
- Not over-suppressing: "MUST NOT OVER-SUPPRESS" has no trigger; asserts `unfired.length === 1`, `played === 0`, element still opacity 0.
- No-armed page returns zeros.

## Not done
- Full `draft-live-walk.mjs` was only `node --check`ed, not run end to end.
- `armed` detection is by paused finite animation, not by the `data-sgs-animation` attribute, so non-SGS paused animations are also treated as armed.
