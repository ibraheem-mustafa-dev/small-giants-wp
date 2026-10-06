---
task: P3c
lane: W2-D
wave: 2
plan: .claude/plans/2026-10-06-spec47-route-cleanup.md
---

# P3c - Record loops and exclude infinitely-animated properties from style and hover rows

## Diagnosis

Properties driven by an **infinite** animation have no resting value: whatever the walker reads is a timing
accident. `unfinishedAnimations` cannot settle them (an infinite animation has no finite `endTime`), so they
are read mid-flight and compared as though stable. `animation-name` is compared too, which is a
name-identity check rather than a painted-output check and so reports differences that are not visual.

## The fix

1. Record **`loops`** - the set of properties animated by an infinite animation on each side.
2. **Exclude those properties from style and hover rows**, since no stable value exists to compare.
3. **Stop comparing `animation-name`.**

## Owned file

`scripts/parity/lib/collect.mjs` (same lane as P3a, P2b3 and P1 - this file is the hub and cannot be split).

## Negative control

- **Red on revert:** a case with a property driven by an infinite animation asserting it produces **no** row.
  Reverting must turn it red.
- **Not over-suppressing:** a **finite** animation's final value must still be compared normally, and a
  property that merely *sits beside* an infinite animation on the same element must still be compared. Prove
  `loops` is scoped to properties the infinite animation actually drives - an over-broad `loops` would hide
  real differences on `sgs/brand-strip`, which is precisely the block under investigation.

Expected to clear 2 F rows (marquee dynamic).
