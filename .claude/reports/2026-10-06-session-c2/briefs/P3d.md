---
task: P3d
lane: W3-G
wave: 3
plan: .claude/plans/2026-10-06-spec47-route-cleanup.md
---

# P3d - Tighten triage transientOf so a resting opacity 0.75 is not swallowed

## Sequencing: only after P3b (Wave 1) has landed.

The tightening is checked against a walker that **no longer reads armed poses**. Running it against the old
walker would entangle two causes, which is why QC approved this as a separate change rather than part of P3.

## Diagnosis

`scripts/computed-route/lib/triage.mjs::transientOf` currently classes a genuine resting difference as
transient. Observed: `brand-link` reads `opacity: 0.75` at rest against live `1`, and triage swallows it as
a transient animation artefact. The element is **not** animated - the value is its resting state, and it is
a real difference the route should act on.

## The fix

Tighten `transientOf` so a resting value on a **non-animated** element is not classed transient. The
transient exemption must require actual evidence of animation on that property, not merely a
plausible-looking value.

## Owned files

`scripts/computed-route/lib/triage.mjs`, tests in `scripts/computed-route/tests/triage.test.mjs`.

**Your lane also owns R1** (`canvasSettable`) in the same file - read that brief too and do both, then run
the lane's tests once. Your lane owns `tests/solve.test.mjs` as well, because R1 touches assertions there.

## Negative control

- **Red on revert:** a case with a resting `opacity: 0.75` on a non-animated element asserting it is
  **reported**, not classed transient. Reverting must turn it red.
- **Not over-suppressing:** a value that is genuinely mid-animation must **still** be classed transient.
  Prove the tightening did not simply delete the exemption - if it had, every settling animation would
  become a phantom finding and the sweep would fill with noise.
