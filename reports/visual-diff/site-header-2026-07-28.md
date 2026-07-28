# Visual diff — site-header — 2026-07-28 (base z-index for site chrome)

Change: ONE base rule on `.sgs-site-header` — `position:relative; z-index:100` —
so site chrome paints above page content at rest, not only when a
sticky/transparent behaviour is active (those already set the same value,
`header-behaviours.css:41,57`; the draft designs' header is `z-index:200`).

## Why (live-proven defect, canary page 1842)

An at-rest header's open mega panel was painted OVER by later page content:
`.entry-content` and every footer row carry `z-index:1`, and at equal z the later
DOM context wins. Hit-testing (`elementFromPoint`) reached the FOOTER heading
("T1TOP A") through the visually-open panel, which fired `mouseleave` on the
nav's hover bridge and closed the panel 170ms later — the mega was unhoverable.

## Verification (live, post-deploy, cache purged)

- Injection A/B before landing: WITH the rule a 400ms slow-diagonal hover from
  the header trigger into the panel survives; WITHOUT it the panel closes.
  Re-verified after the real deploy on both the header nav and the page nav.
- Full-viewport capture at 1440 with the header mega OPEN
  (`eye-2-header-mega.png`, session scratchpad) — panel paints above page
  content and the footer; header row itself unchanged at rest.
- No layout change: the rule adds no size/spacing; `position:relative` was
  already the computed value on the live header (measured before the change).
- Sticky / transparent / hide-on-scroll behaviours unaffected — they already
  apply `z-index:100` at higher specificity with `!important` position rules;
  this only covers the at-rest state they never covered.

verdict: PASS
first_paint_capture_passed: true
