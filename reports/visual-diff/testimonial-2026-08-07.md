---
block: sgs/testimonial
date: 2026-08-07
source_sha: e4554304d34b5d6e
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: chrome-devtools-mcp against the live sandybrown canary (Playwright reserved for a co-active session)
deployed_build: deploy 2026-08-07, deployed files md5-verified against local build
change: (1) four rest-state colour fallbacks deleted, painted tokens de-specified via :where(); (2) art-direction tiers on the author photo (appended later same day)
---

## Live measurement
Homepage, 9 sgs/testimonial instances. **0 elements below 4.5:1**.

## Negative control
One deletion candidate here named '--wp--preset--color--heading', which is NOT a palette slug and therefore always fell through to the 'text' fallback — deleting it is provably a no-op, not a colour change.

---

# Part 2 — art-direction tiers on the author photo (appended 2026-08-07)

⚠ This file already existed and documented the colour-fallback change above. It was very
nearly overwritten wholesale — the date-keyed-path collision this project has been bitten
by before. The original text is untouched; the `source_sha` was added so the file certifies
the block's staged content, which now includes BOTH changes.

## What changed

`avatarMediaTablet` / `avatarMediaMobile`, object-typed to match `avatarMedia` (a flat value
on an object-typed attr is silently coerced to the default, dropping the whole thing).
Because `sgs_render_media()` takes no class argument, each tier gets its OWN
`.sgs-testimonial__avatar--{tier}` WRAPPER rather than a modifier on the `<img>`.

Editor gains one `<ResponsiveControl>`-wrapped `MediaPanel`, gated on an author photo
existing (an override for a photo that is not there is a dead control).

Deliberately NOT `sgs_render_media()`'s existing `mobile_url` `<picture>` path: mobile-only,
no tablet step, and not the BEM tier modifier the cloning pipeline's draft vocabulary reads.

## Measured — first paint per width, computed visibility

Surface: /art-direction-tier-probe/ (page 2178), `avatar-spotlight` variant. Viewport set,
then a FRESH navigation per width. Toggles descend from `$root_sel`, a single compound token.

| measured innerWidth | nodes in DOM | visible | which tier |
|---|---|---|---|
| 1364 | 3 | 1 | `--desktop` |
| 818 | 3 | 1 | `--tablet` |
| 364 | 3 | 1 | `--mobile` |

**PASS** for Part 2.

## Limits of Part 2

- Captured on `avatar-spotlight`. The other six variants share the avatar emit path but were
  not captured individually.
- Hidden tiers report an empty `currentSrc` (lazy, never fetched) — which is why the
  assertion is on `display`, not on `currentSrc`.
