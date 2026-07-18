# Separator visual-diff — page 13 (Indus Foods homepage) migration

**Date:** 2026-07-18
**Page:** 13 (`palestine-lives.org` homepage)
**Section:** "Our Partners Love Us!" — the `core/separator` (`is-style-wide`, alpha-channel opacity) migrated to `sgs/separator`.
**verdict: PASS**
**first_paint_capture_passed: true**

## What changed

Original `post_content` (pre-migration, `.claude/backups/page-13-content-2026-07-18-preMigration.html`):

```
<!-- wp:separator {"opacity":"css","className":"has-text-color has-alpha-channel-opacity has-surface-background-color has-background is-style-wide"} -->
<hr class="wp-block-separator has-css-opacity has-text-color has-alpha-channel-opacity has-surface-background-color has-background is-style-wide"/>
<!-- /wp:separator -->
```

Migrated (live, verified via REST re-fetch of `.content.raw` after save):

```
<!-- wp:sgs/separator {"width":100,"widthUnit":"%","opacity":100,"className":"has-text-color has-alpha-channel-opacity has-surface-background-color has-background"} /-->
```

## Live evidence (Playwright, palestine-lives.org, 1440px viewport)

`document.querySelectorAll('[class*="separator"]')[1]` (the migrated one, inside the teal "Our Partners Love Us!" band):

```json
{
  "tag": "HR",
  "cls": "sgs-separator-4dfa26cd has-text-color has-alpha-channel-opacity has-surface-background-color has-background wp-block-sgs-separator",
  "w": 1200,
  "h": 1
}
```

Computed style:

```json
{ "opacity": "1", "borderColor": "rgb(44, 62, 80)", "backgroundColor": "rgb(255, 255, 255)", "borderTopWidth": "0px" }
```

## Assessment

- Renders full content-width (1200px, matching the section's `contentWidth`), a thin horizontal divider — visually equivalent to the prior WP-core `is-style-wide` separator.
- `opacity:100` (the block's default) is visually equivalent to the prior core separator's `has-css-opacity` styling — both render as a fully-opaque, visible divider line.
- No visible regression: correct position (directly under the "Our Partners Love Us!" heading), correct width, correct colour derived from the section's dark teal background context.
- This is the only `core/separator` instance migrated in this page (lint-page.py: `core/separator x1 -> sgs/separator`).

## Note — unrelated finding surfaced during verification

A pre-existing mobile-viewport (375px) horizontal-overflow bug was found in the SAME section (the 55%/45% grid `sgs/container` wrapping the testimonial-slider + partner image) — the grid child holding `sgs/testimonial-slider` has `min-width: auto` (CSS Grid's default), so it doesn't shrink below its content's intrinsic width at the 767px mobile breakpoint, forcing the whole grid track (and `document.documentElement.scrollWidth`) out to ~894px against a 375px viewport. This is **not** a separator regression — it is a framework-level gap in `sgs/container`'s grid-mode (missing `min-width: 0` on grid items), unrelated to the separator migration, and pre-existed the WP-core-columns → `sgs/container` conversion at a smaller scale (WP core's `.wp-block-column` forces `flex-basis:100% !important` under 781px, which happened to mask the same underlying intrinsic-width problem). Reported separately below — not blocking this separator PASS.
