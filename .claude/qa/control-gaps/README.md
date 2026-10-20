# Control gaps: canary test page trees

Trees for `scripts/wp-build-page.js` (one page each, never a motion fixture). Build with, per tree:

`node scripts/wp-build-page.js --env-file .claude/secrets/sandybrown.env --env-key <KEY> --tree .claude/qa/control-gaps/<file>.json --create page --title "QA <gap>" --slug qa-<gap>`

Run the same command with `--dry-run` first (it opens the editor headlessly and saves nothing). Delete each test page in the same command that finishes with it. The trees were checked statically (block exists, parent rules, every attribute name, type, enum and array-item key against `plugins/sgs-blocks/src/blocks/<block>/block.json`); `--dry-run` has not been run, so the editor-side validation is still to do.

| Tree | Live line served | Probes (375, 768, 1440 unless stated) |
|---|---|---|
| `g1-pin.json` | G1 | Scroll 800px at 1440: pinned column `getBoundingClientRect().top` equals header bottom + 24px. At 768 and 375 computed `position` is `static`. The drawer case (`top: 0px` inside `sgs/nav-drawer`) is tested with the site drawer, not this page. Needs the canary header to be sticky. |
| `g2-g11-text.json` | G2, G11 | G2: the two big `sgs/text` blocks: `webkitTextStrokeWidth` 2px at 1440 and 768, 1.5px at 375; `color` is `rgba(58, 42, 34, 0)`; real pointer hover changes the stroke colour from `#0A7EA8` to `#D8CA50`. The plain text is the negative control (stroke width 0px). G11: the three `sgs/icon-list` blocks' links: `textDecorationLine`, `textDecorationColor`, `textUnderlineOffset`, `textDecorationThickness` at rest and under real hover (Always: line always, `#EE8088` to `#3A2A22`, 6px, 3px; Shows on hover: none at rest, underline on hover, `#0A7EA8` to `#D8CA50`, 4px, 2px; third list has no colour so no `text-decoration-color` rule). Editor canvas for G2 and G11. |
| `g5-g13-layer.json` | G5, G13 | G13: image layer rotated 8deg holds the label; "Baked to order" layer (no image, width Fit the content) has its rotation and `pointer-events:auto` and is in the accessibility tree; with an image the content box equals the image box. G5: the arrow label (rest rotate -6): `::after` and `.sgs-label__edge` both masked, pixel at the notch centre shows the section behind, outline 2±0.5px at three points; Chromium, Firefox, WebKit. Editor: both layers save and reload cleanly. Cropped screenshot pairs for Bean (G5, G13). |
| `g7-g8-formats.json` | G7, G8 | Heading, text, quote body, timeline description, collapsible-text, product-card description and accordion title each hold a highlight and a photo. Stripe `::before` height is 0.2 x font size, wider than the word by twice the overhang, colour matches the slug (accent, primary, default); photo 1.55em x 0.78em ±1px, `naturalWidth > 0`; `document.querySelectorAll('[class*="wp-block-sgs-"] [style]').length === 0`; `scrollWidth === innerWidth` at 375; the accordion title has no `<a>`. Editor canvas plus keyboard use of both popovers; token proof (snapshot `thickness` 0.3em then restore in the same command). Cropped screenshot pair against the draft H1. |
| `g9-g10-form.json` | G9, G10 | G9: step 2 file field, `setInputFiles` with a 120-character file name: `preview.scrollWidth <= preview.clientWidth` and `documentElement.scrollWidth <= innerWidth`, again on step 3 (review). G10: the tiles' descriptions (second one long, third empty so no span) and both choice flows (compact and showcase) option descriptions: computed `font-size` and `color`, the showcase case overridable from 14px, accessible name includes the description. Editor canvas for G10. |

G3 (scrollbars) needs no tree: use any page plus a headed Chrome screenshot, and the open drawer.

## G6 buybox sticky bar

Product page: `https://sandybrown-nightingale-600381.hostingersite.com/product/classic-lactation-cookies/` (post 3990, variable product, published). Fallback: `https://sandybrown-nightingale-600381.hostingersite.com/product/sgs-single-variant-fixture/` (post 1125, published). Probes: at 375 scroll past the Add button, the bar is at `bottom:0`, clicking it shows the basket toast and changes the cart count, it never covers a focused control at the page end; at 768 and 1440 the bar is hidden; reduced motion gives no transition; Tab to the bar button shows a visible focus ring and the target is at least 44px.

## Notes

- Photo used by G5, G7, G8 and G13: attachment 23, `https://sandybrown-nightingale-600381.hostingersite.com/wp-content/uploads/2026/05/cookies-stacked.jpeg`.
- Highlight markup is `<span class="sgs-highlight [sgs-highlight--slug]">`; photo markup is `<img class="sgs-inline-photo wp-image-23" src alt/>` (empty alt is the decorative default), as the formats in `plugins/sgs-blocks/src/blocks/extensions/inline-formats/index.js` register them.
- Rest rotate -6 on the arrow label is written as `sgsMotion.elements.root.hover.state.values.restRotate` (the shape in `.claude/specs/38A-SGS-MOTION-MODEL.md` §6.2).
- Text colour at opacity 0 is the 8-digit hex `#3A2A2200`.
