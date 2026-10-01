# Full-Bleed Pattern Replacement (Gap H-7)

**Date:** 2026-05-05
**Status:** Framework default. Per-instance overrides retired.

## The problem

Hero block CSS previously relied on a negative-margin trick to escape the parent's
side padding:

```css
section.sgs-hero { margin: 0 -24px; }
```

This only renders edge-to-edge when the parent's content-area padding is exactly
24px. Any non-default page template, custom container padding, or post-content
wrapper at 16px / 0 / clamp() value left an 8-16px gap on each side.

Workaround for Mama's Munches (commit `22df0a6`) was a per-instance override
keyed on `body.page-id-29` — fragile, doesn't scale to other client sites,
needs duplicating on every page that hosts a hero.

A second iteration used `--wp--style--root--padding-right` from `theme.json`,
output as inline `<style>` from `functions.php`. Better, but still padding-relative,
and gated on the `.has-global-padding` class (some templates strip it).

## The fix

Viewport-aware full-bleed lives in
`plugins/sgs-blocks/src/blocks/hero/style.css`:

```css
section.sgs-hero {
  width: var(--viewport-width, 100vw);
  margin-left: calc((100% - var(--viewport-width, 100vw)) / 2);
  margin-right: calc((100% - var(--viewport-width, 100vw)) / 2);
  max-width: none;
}
```

Width is the viewport. Margins pull the element outward by half the diff between
its parent's content width (`100%`) and the viewport, centring the bleed
regardless of parent padding.

## Why `100vw` alone fails

On Windows desktop browsers (Chrome, Edge, Firefox) the vertical scrollbar is
persistent and reserves ~15px of screen real estate. CSS `100vw` returns the
full window width *including* that reserved strip, so a `width: 100vw` element
overflows the visible viewport by ~15px and triggers a horizontal scrollbar.
Mac (overlay scrollbars) and mobile (touch, no persistent scrollbar) are not
affected.

## Why the `viewport-width.js` upgrade fixes it

`theme/sgs-theme/assets/js/viewport-width.js` reads
`document.documentElement.clientWidth` (which excludes the scrollbar) and
writes that pixel value to `:root` as `--viewport-width`. The CSS uses
`var(--viewport-width, 100vw)` so:

- **Default (no JS or pre-paint):** `100vw` — correct on Mac and mobile.
- **JS loaded:** measured client width — correct on Windows desktop.

The script debounces resize events at 150ms and is enqueued with `defer` from
`functions.php` (handle `sgs-viewport-width`).

## Files involved

| File | Change |
|---|---|
| `plugins/sgs-blocks/src/blocks/hero/style.css` | Adds the full-bleed rule |
| `theme/sgs-theme/assets/js/viewport-width.js` | New helper |
| `theme/sgs-theme/functions.php` | Enqueues the helper, removes the legacy `.has-global-padding > .wp-block-sgs-hero` inline rule |
| `theme/sgs-theme/styles/mamas-munches.json` | Removes the `.page-id-29` per-instance override (now redundant) |

## Note for future operators

This pattern is now framework-default. **Do not reintroduce per-page or
per-client variation overrides for hero full-bleed.** If a hero on some
client site appears to break out incorrectly, debug the framework rule —
check for parent containers with `overflow: hidden`, `transform`, or
`contain` set, all of which establish a containing block that breaks viewport
sizing. Fix at framework level, not in the variation JSON.

If a future block needs the same edge-to-edge behaviour, copy the four-line
rule (`width` / `margin-left` / `margin-right` / `max-width`) — `viewport-width.js`
already runs site-wide so the variable is available everywhere.
