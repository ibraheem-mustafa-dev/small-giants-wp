---
task: P2a
lane: W2-E
wave: 2
plan: .claude/plans/archive/2026-10-06-spec47-route-cleanup.md
---

# P2a - Twin-containment gate: judgePairScope, enforced by lintConfig before a browser opens

## Diagnosis

**Hand pairs are never judged today; generated pairs are.** That asymmetry is why P2b2's `about-step-*`
mispair survived in a committed config with its own `accept` note describing the bug.

This was deferred once, for a real reason: it needs new capture (word indices inside each pair element) and
its exact count cannot be known without a check-only run across the 17 surfaces. Bean has now asked for it.

**The obvious gate was ruled out on evidence - do not re-propose it.** A box-ratio signal flags 40 pairs of
which at least 12 are legitimate (a phone link 91 vs 109 wide, a submit button 166 vs 335). Box ratio is not
a safe discriminator.

## The fix

A **twin-containment** signal: a matched word inside one pair element whose twin lies **outside** the other
element. That is the shape of a genuine mispair and it does not fire on a legitimate size difference.

1. New `scripts/computed-route/lib/pair-scope.mjs` exporting **`judgePairScope`**.
2. Computed in `runPairing` (`scripts/computed-route/pairs.mjs`).
3. Captured in `scripts/computed-route/lib/pairs-page.mjs` (the word indices it needs).
4. **Enforced by `lintConfig`** in `scripts/parity/lib/lint.mjs`, so it **exits 1 before a browser opens** -
   no host, no browser, no wasted walk.

## Dependencies

- **Takes `scripts/parity/draft-live-walk.mjs` only after W1-C has released it** (Wave 1 owns it). It is
  committed and clean before you start.
- **Needs W1-B's corrected `about-step` config as its positive control** - the gate must flag the old
  mispair shape and pass the corrected one.

## Negative control

- **Red on revert:** `tests/pairs.test.mjs` + `tests/lint.test.mjs` cases asserting the pre-P2b2
  `about-step` mispair shape is **refused at lint with exit 1**. Reverting must turn it red.
- **Not over-suppressing:** the **12 known-legitimate** pairs the box-ratio gate would have wrongly flagged
  must **pass** - include the phone link (91 vs 109) and the submit button (166 vs 335) explicitly. A gate
  that refuses legitimate pairs blocks real walks and will be switched off.

Expected: 6 pairs refused at lint rather than silently reclassified.
