# Spec 28 P3 — visual QC-council pass (2026-06-09)

3 adversarial raters (sonnet operator-empathy + sonnet design/WCAG + haiku consistency) on live canary screenshots, orchestrated per /qc-council persona pattern. Screenshots in this directory; `product-preview-FIXED.png` = the post-fix state for Bean's R-22-13 eye.

## Functional defects the pass caught BEFORE the raters (browser-only bugs)

1. **Settings tab missing entirely** — `WC_Settings_Page` is admin-lazy; a `class_exists` guard at `woocommerce_loaded` silently unregistered the tab. FIXED: registration + lazy require moved inside the `woocommerce_get_settings_pages` filter callback.
2. **"Generate preview" button dead** — the inline JS prints in the page HEAD (woocommerce_admin handle) before the button exists; no DOM-ready guard → silent no-bind. FIXED: readyState-guarded init.

## Rater findings — FIXED this session

| Finding | Rater | Fix |
|---|---|---|
| FAIL-AA: `#e65100` @11px = 3.79:1 (need 4.5:1) | design | `#bf360c` @12px (5.8:1) |
| FAIL-AA: `#f9a825` border = 1.97:1 (need 3:1, SC 1.4.11) | design | `#e65100` (3.79:1) |
| BLOCKER: pence inputs read as pounds (silent 5p pack price) | operator | "p" suffix ON each input + rewritten help ("499p locks that pack at £4.99") |
| BLOCKER: summary line is dev jargon ("k source: default") | operator | plain English ("discount strength from site default · .99 price endings on") |
| BLOCKER: "no live prices" warning buried at end of a wall of text + referenced a non-existent button | operator + consistency | disclosure restructured to bullets, bold no-live-prices line FIRST, "Apply" button reference removed |
| INCONSISTENT: 4 feature names across surfaces | consistency | ONE canonical name "SGS Smart Bulk Pricing" (tab, h1, category label) |
| INCONSISTENT: strength option wording differs per surface | consistency | identical ranges on settings select + category select + product radios |
| INCONSISTENT: cascade semantics asymmetric | consistency | category help notes product-level override; product help says "site or category" |
| DESIGN: 4 override inputs wrap mid-label <900px | design | flex-wrap container, whole-unit wrapping |
| CONFUSING: "Charm rounding" jargon | operator | settings label "**.99 price endings**"; summary says ".99 price endings on" |
| CONFUSING: no link between the two SGS sections | operator | connector line under the h4 ("Uses the single-unit price you entered in the SGS Value Ladder section above…") |
| GAP: table headers lacked units/denominator | consistency | "Pack price (£)" + "Saving vs single" |

All fixes deployed + re-verified live (click-through: preview generates, fixture rows exact, new copy in the rendered a11y tree).

## DEFERRED (recorded, non-blocking — parking candidate)

- WC idiom refactor: use `woocommerce_wp_radio()`/two-column `.options_group` layout for the radios/checkboxes; proper section treatment for the h4s (DESIGN).
- 44px touch targets for radios/checkboxes/preview button (tablet admin use).
- Emoji (⚠️/🔒) as the secondary non-colour indicator — fragile on old OS/screen-readers; guardrail_note text already carries the meaning.
- Preview table max-width 640px inset look at 1440px (NIT).
- Settings "Default pack sizes" comma-string → chip/tag input (operator F6; current placeholder shows the exact format).
- Persistent admin notice near the WP Update button repeating "preview only" (operator F3 second half — the bold disclosure bullet + status line cover the main risk).
- "(approximate range)" callout on strength percentages (NIT).
