# testimonial-slider — visual-diff report (2026-08-06)

```
verdict: PASS
first_paint_capture_passed: true
```

**Block:** `sgs/testimonial-slider`
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

**Change:** Deleted unused transition locals AND removed the abandoned `nameFontSize` attribute (no editor control, no consumer anywhere; cleared by a full-repo D338 grep).

**Why first paint is unaffected:** The deleted locals were never read. `sgs_transition_vars( $attributes )` (includes/helpers-tokens.php:761-775) receives the RAW attributes array and still emits `--sgs-transition-duration` / `--sgs-transition-easing` itself. `nameFontSize` had no consumer at all, so nothing ever rendered from it.

**Live evidence, captured AFTER deploy to the sandybrown canary**
(`build-deploy.py --target sandybrown --blocks-only --payload plugins/sgs-blocks`,
post-deploy verify returned HTTP 200 with SGS markers present):

URL: https://sandybrown-nightingale-600381.hostingersite.com/routing-audit-clone-2026-08-02/

Playwright live DOM: **24** instances, 7,312 chars innerText, `--sgs-transition-duration` = **300ms** still emitted, and `nameFontSize` appears **nowhere** in the rendered HTML.

**Limits of this check:** desktop width, single canary page, asserting the SPECIFIC
observable the change touches rather than a multi-breakpoint pixel diff. That is the
appropriate instrument here — every change in this batch is either a deletion of an
unread local variable, an ARIA attribute, an enum matching an allow-list PHP already
enforces, or a data attribute a built frontend already reads.

```
verdict: PASS
first_paint_capture_passed: true
```
