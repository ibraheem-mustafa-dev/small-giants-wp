# decorative-image — visual-diff report (2026-08-06)

```
verdict: PASS
first_paint_capture_passed: true
```

**Block:** `sgs/decorative-image`
**Date:** 2026-08-06
**Target:** sandybrown canary via `build-deploy.py --target sandybrown --blocks-only
--payload plugins/sgs-blocks` (payload-scoped dirty gate; never `--allow-dirty`).


---

## APPENDED 2026-08-06 — Spec 35 Task A (dead-control backlog / enum declarations)

> ⚠ **A SECOND, INDEPENDENT CHANGE to this block landed the same day, from a different
> work track.** Anything above this line documents that other change. The gate keys on
> `<block>-<date>.md` carrying `verdict: PASS`, which is DATE-keyed and not CHANGE-keyed —
> so a same-day report written for an unrelated change satisfies it. This section is
> appended so the file genuinely covers both. (Worth fixing in Task F: the gate should
> bind evidence to a diff, not to a date.)

**Change:** WIRED `overflow` — previously a client could set it and nothing happened. Emitted into the block's existing scoped `<style>` (never inline, Spec 32), allow-listed to visible|hidden|clip|scroll|auto.

**Why first paint is unaffected:** This is the ONE change in the batch that CAN alter appearance (clipping), so it was verified by computed style on two instances set to different values rather than by inference.

**Live evidence, captured AFTER deploy to the sandybrown canary**
(`build-deploy.py --target sandybrown --blocks-only --payload plugins/sgs-blocks`,
post-deploy verify returned HTTP 200 with SGS markers present):

URL: https://sandybrown-nightingale-600381.hostingersite.com/a4-visual-diff-canary-2026-08-06/

Playwright computed style, two instances: `overflow` = **hidden** and **visible** respectively. The values differ per instance, proving the attribute now genuinely drives CSS. Verified on a purpose-made canary because the block had **zero** live instances anywhere on the canary.

**Limits of this check:** desktop width, single canary page, asserting the SPECIFIC
observable the change touches rather than a multi-breakpoint pixel diff. That is the
appropriate instrument here — every change in this batch is either a deletion of an
unread local variable, an ARIA attribute, an enum matching an allow-list PHP already
enforces, or a data attribute a built frontend already reads.

```
verdict: PASS
first_paint_capture_passed: true
```
