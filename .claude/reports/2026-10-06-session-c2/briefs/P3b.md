---
task: P3b
lane: W1-C
wave: 1
plan: .claude/plans/archive/2026-10-06-spec47-route-cleanup.md
---

# P3b - armedEntrances + triggerArmed: settle armed entrances before the resting read

## Diagnosis

The same filter that enables H1 also corrupts resting reads generally.
`scripts/parity/lib/devtools.mjs::unfinishedAnimations` filters on
`( 'running' === a.playState || a.pending ) && ... Number.isFinite( endTime )`, so a **paused** pose and an
**infinite** animation are both invisible to the settle. The walker declares the page settled while an armed
element sits at its start frame (`opacity: 0, translate: 0 26px`, per `animation-observer.js::keyframes`),
and every property read off that element is a measurement of an un-played animation.

## The fix

Add `armedEntrances` + `triggerArmed` to the walker:

1. Detect armed entrances (elements holding an un-played entrance pose).
2. **Scroll them into view and let them settle** before taking the resting read.
3. **Emit `reveal-unfired`** when an armed entrance never plays, so a genuinely broken reveal surfaces as a
   finding instead of being silently read at its start frame.

That third point is the important one: the fix must not merely hide the artefact, it must report the case it
cannot resolve.

## Owned files

`scripts/parity/lib/devtools.mjs`, `scripts/parity/draft-live-walk.mjs`, tests in
`scripts/computed-route/tests/walker-devtools.test.mjs`.

**You own `draft-live-walk.mjs` for this wave only.** W2-E takes it in Wave 2, so leave it in a clean,
committed state.

## Negative control

- **Red on revert:** a case where an armed, paused entrance is read at rest and the fix settles it first -
  asserting the settled value, not the start-frame value. Reverting must turn it red.
- **Not over-suppressing:** an entrance that genuinely never fires must emit **`reveal-unfired`**, not be
  silently reported as settled. Assert that signal exists; without it the fix converts a real defect into a
  clean pass, which is the worse failure.

Expected to clear ~3 F rows.
