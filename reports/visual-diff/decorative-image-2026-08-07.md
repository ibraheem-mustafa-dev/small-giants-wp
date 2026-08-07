---
block: sgs/decorative-image
date: 2026-08-07
source_sha: 0eb650c49945fbac
change: art-direction image tiers (imageId/Url + Tablet/Mobile) + one ResponsiveControl-wrapped picker
surface: https://sandybrown-nightingale-600381.hostingersite.com/art-direction-tier-probe/ (page 2178)
method: live DOM capture on the deployed canary at FIRST PAINT - viewport set, then a fresh navigation per width (no resize-after-load), computed visibility
verdict: PASS
first_paint_capture_passed: true
---

# sgs/decorative-image — visual diff, 2026-08-07

## What changed

`imageIdTablet` / `imageUrlTablet` / `imageIdMobile` / `imageUrlMobile`, rendered as
sibling `<img>`s carrying `sgs-decorative-image--{tier}` modifiers and toggled by
breakpoint from the block's own scoped `<style>`. Editor gains one
`<ResponsiveControl>`-wrapped `MediaPicker`, shown only for image media (the
`decorMedia` video branch returns before tiers are built, so a control there would
be dead).

## NAKED MODE — the trap this block sits in

This block has **no wrapper element**: `sgs_responsive_image()` emits the `<img>` AS
the block root. So the tier siblings each carry the `$uid` class themselves and the
toggles are COMPOUND selectors (`.{uid}.sgs-decorative-image--mobile`), not
descendant. A descendant selector would have matched nothing.

Selectors are built from `'.' . $uid` — a bare single-class token — never from
`$root_sel` or any list.

## Measured — computed visibility, not markup presence

Markup presence scores a false pass, so every row below is
`getComputedStyle(node).display`, and the width is `window.innerWidth` as measured in
the page, NOT the requested viewport size (a 800px request measured 727px once, which
would have silently tested mobile while labelled tablet).

| measured innerWidth | nodes in DOM | visible | which tier |
|---|---|---|---|
| 1364 | 3 | 1 | `--desktop` |
| 818 | 3 | 1 | `--tablet` |
| 364 | 3 | 1 | `--mobile` |

Each tier resolved to a DIFFERENT image file, confirmed by `currentSrc`, so the
result cannot be explained by all three tiers pointing at one asset.

## Limits of this capture

- Tested with all three tiers set. The partial cases (tablet only, mobile only) are
  covered by the emit logic being per-tier and independent, but were NOT captured live.
- The editor control was not exercised in wp-admin; it is verified only by the
  dead-control gate proving the attrs are consumed and the frontend rendering them.
