# Contact: why the independent check read 106 rows and the walker 27

Session B input from A5. Data: `sites/eye-care-ward-end/build/qa/sweep/2026-10-05/a5/independent-contact.json`
(`diffs`, 106), `sites/eye-care-ward-end/build/qa/triage/contact.json` (27 verdicts), sweep `contact.byClass`
(`unresolved` 10, `derived` 17).

## The headline overstates the disagreement about four times over

The two tools count different things, so 106 against 27 was never a like-for-like comparison.

| Step | Rows | Why |
|---|---|---|
| Independent check, raw | 106 | one row per (ref, property, **width**), at 375/768/1440 |
| Deduplicated to (ref, property) | **39** | the sweep counts one distinct issue per element and property, whatever the width |
| Less the PA-4 artefact | −3 distinct (9 raw) | off-screen screen-reader text read as painted (values near ±9999); `auto-collect.mjs::srOnly` makes the walker skip it |
| Less presence rows | −3 distinct | `prop: "found"`, blocks the draft lacks; Spec 47 §3.2/§3.3's presence read is not built, so the walker cannot report them |
| Comparable | **33** | against the walker's **27** |

So the real residual is **6 distinct rows**, not 79.

## The residual is entirely padding, which the walker does not report on Contact at all

The walker's 27 Contact verdicts carry **no padding property of any kind** (`content` 1, `margin-bottom` 1,
`color` 6, `border-top-color` 2, `h` 5, `w` 2, and 9 anchored position rows). The independent check reports
`padding.right` on 7 refs (16 raw rows), `padding.left` (9) and `padding.top` (3).

**A row-level set difference between the two tools is not meaningful**, because their position vocabularies differ:
the walker reports position as an anchored offset against a named pair (`y-after-gen-contact-15`,
`y-from-detail-grid`) and the independent check as an absolute `box.y`/`box.x`. No mapping between the two exists, so
only the family comparison above is sound.

## What the padding values suggest, and what would settle it

The largest padding rows read draft against live as `cr-ref-contact-6` 119 against 0, `cr-ref-contact-16` 151
against 0 and `cr-ref-contact-20` 363 against 28 (at 768). A 363px padding-right is not plausible as authored
padding, so the likely mechanism is that the independent check is reading the draft's gutter padding against a live
layout that centres with `max-width` and automatic margins instead — in which case these are check artefacts in the
same family as PA-4, not divergences the walker is missing.

**That is a hypothesis, not a finding.** It rests on the implausibility of the values, which is not proof. What
settles it: one live read on Contact at 768 of `cr-ref-contact-20`'s computed `padding-right`, `max-width` and
`margin-inline`, against the draft element's own, with the winning rule's origin. One browser job, no writes. Until
that runs, the 6-row residual stays open and the independent check's padding family stays unproven in both
directions.

## Consequence for the sweep

None of this changes the sweep's 27 or the register's Contact verdicts, and A5 already recorded that none of the 106
contradicts Contact's clean items (126/137 width, 127/138, N44 top padding). The two measurable follow-ups are PA-4
(the sr-only artefact, 3 distinct rows) and the padding question above.
