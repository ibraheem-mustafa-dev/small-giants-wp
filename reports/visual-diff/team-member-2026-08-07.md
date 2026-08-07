---
block: sgs/team-member
date: 2026-08-07
source_sha: 4f99705672d4c354
change: responsive photo tiers (photo / photoTablet / photoMobile) + shadow preset rename
surface: https://sandybrown-nightingale-600381.hostingersite.com/sgs-ad-probe-1830/ (page 2175)
method: live DOM + computed-style capture at first paint (Playwright, deployed canary)
verdict: PASS
first_paint_capture_passed: true
---

# sgs/team-member — visual diff, 2026-08-07

Covers TWO changes that landed together:

1. **Responsive photo tiers** (the art-direction track) — `block.json` declares
   `photo` / `photoTablet` / `photoMobile` and drops `memberMedia`; `render.php`
   emits a `<picture>` with `<source media>` alternates.
2. **Shadow preset rename** — `md` -> `raised` in `style.css`, and the `render.php`
   preset allowlist.

## Why both are in one report

`render.php` landed in commit 43b5d44c ahead of its `block.json`, leaving main in
a half state: the PHP read `$attributes['photoTablet']` while the block did not
declare it, and WordPress silently DISCARDS an undeclared attribute — so the
feature was inert on main with nothing failing. This report verifies the
completed pair, which is the only state worth certifying.

## Why a probe page exists

`sgs/team-member` is on no published canary page. Rather than stamp a field
nobody measured, page 2175 was created with an instance exercising all three
photo tiers and a renamed shadow preset.

## Measurement

First paint, no interaction:

| check | result |
|---|---|
| block rendered (non-zero box) | `true` |
| `<picture class="sgs-team-member__photo-picture">` present | `true` |
| `<source media>` emitted | `["(max-width:767px)", "(max-width:1023px)"]` |
| source order | narrowest first — correct; the browser takes the first match |
| `<img>` visible (clientWidth > 0) | `true` |
| computed `box-shadow` | `rgba(0, 0, 0, 0.1) 0px 4px 12px 0px` |
| console errors | none |

## Result

Both tier `<source>` elements are emitted with the right media queries in the
right order, and the base `<img>` still paints — so a member with no tier
override degrades to the desktop image rather than disappearing. The declared
attributes now match what `render.php` reads, closing the half state.

The shadow paints exactly what `--wp--preset--shadow--md` produced before the
rename (`0 4px 12px rgba(0,0,0,0.1)`), so the rename is visually inert here too.

**PASS**

## Scope note

`sgs/before-after` — the same track's sibling block — is NOT covered. It did not
render on the probe page and none of it is committed to main, so it remains
unlanded and unverified.
