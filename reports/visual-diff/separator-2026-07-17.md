---
block: separator
date: 2026-07-17
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — NEW block `sgs/separator` — 2026-07-17

A standalone, strong divider block replacing the weak `core/separator`
framework-wide (Bean-approved 2026-07-17 over a heading-embedded separator).
Built to the LOCKED no-inline migration contract + DONE checklist.

## Why it was built

The Indus "Our Brands" underline is, in the reference (Spectra Advanced
Heading), the heading's built-in **separator element** — width **27%**,
thickness **2px**, colour gold `#D8CA50`, ~10px bottom spacing. The clone had
been faking it with a `core/separator` + custom CSS (fixed 374px, 1px). Bean
chose to build the real capability into the framework rather than keep the
band-aid.

## What it does (controls — all client-facing inspector controls)

- **Line style** — solid / dashed / dotted / double / none
- **Width** — number + unit (px OR %), responsive desktop/tablet/mobile
- **Thickness** — px, responsive
- **Colour** — DesignTokenPicker (token or hex; normalised to hex via `sgs_colour_value()`)
- **Alignment** — left / centre / right
- **Padding + Margin** — WP-native `style.spacing` box objects (base) + SGS
  `paddingTablet/paddingMobile/marginTablet/marginMobile` object attrs (tiers)
- **Content-in-middle** — none / icon (lucide / wp-icon / dashicon / emoji) / text
  (text typography via the shared `TypographyControls` + `sgs_typography_css_rule`, prefix `content`)
- **Gradient line** — toggle + two colour stops + angle (`border-image`)
- Inherits the universal animation/visibility/hover/custom-css extensions (auto-applied to every `sgs/*` block)

## Architecture / standards alignment

- Dynamic block (`render.php` emits a scoped `.{uid}` `<style>` via
  `wp_style_engine_get_styles()` for native spacing + hand-built rules for
  line/width/alignment/gradient/content; `save.js` returns null; no InnerBlocks).
- **Zero inline CSS property declarations** on the rendered subtree (contract §A);
  only `--var` values in the editor-canvas preview.
- Single line mechanism: `border-bottom-style` + `border-bottom-width` for both
  the `<hr>` root (contentMode `none`, no wrapper — single-element rule) and the
  two flanking `.sgs-separator__line` spans (content modes; genuinely-needed flex row).
- Device tiers 1023/767 only; no version bump / no deprecated.js (D270/D293);
  WPCS-clean (phpcbf); registered via the plugin's auto-scan; DB `block_composition`
  leaf row added (F6 gate).
- One gate-driven fix during build: `line-height: 1` on the content slot →
  overridable `var(--sgs-separator-content-line-height, 1)` (F3); reduced-motion
  block switched from blanket `transition-duration !important` to `transition:none`
  (matches `sgs/heading`, passes cheat-gate).

## Live verification (palestine-lives.org, page 13, CDN cleared)

Swapped page 13's `core/separator` → `sgs/separator` with the reference's exact
declared values (`width:27%`, `thickness:2`, `lineStyle:solid`, `colour:#D8CA50`,
`alignment:center`).

| Breakpoint | Separator width | Page/band overflow | Result |
|---|---|---|---|
| 1440 | 362px (27% of the 1340 content box; reference declares 27%) | band 0 | PASS |
| 768 | 180px (27% — scales) | band 0 | PASS |
| 375 | 74px (27% — scales; a fixed 374px would have overflowed) | 0 | PASS |

Rendered `<hr>`: `border-bottom: 2px solid rgb(216,202,80)` = `#D8CA50`, centred.
Matches the reference's underline (2px gold, ~heading-text width) and is now
responsive (the old fixed-px version was not).

**Bean visual sign-off (R-31-13):** cropped 1440 pair (original vs clone)
delivered for eye confirmation.
