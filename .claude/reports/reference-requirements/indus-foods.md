---
doc_type: report
project: small-giants-wp
title: Indus Foods mega menu (Claude Design draft) - reference capture
plan_row: W3B-3a
captured: 2026-09-20
data: indus-foods.json
---

# Indus Foods (Claude Design draft, Bean's own) - requirements capture

Source: `sites/Indus Foods Mega Menu Design/Indus Foods Mega Menu.dc.html` with `support.js`, `image-slot.js`, `_feature.dc.html` and `uploads/`. Rendered from a byte-identical scratchpad copy over a local static server, measured in Chromium at 375, 768 and 1440 (height 900). Variants: `sectors-cards` and `sectors-list` (the `sectorsStyle` prop, set through `window.__dcSetProps`, the runtime's own override hook). 56 rows, 326 cells: 202 `static`, 124 `interaction-capture`.

## What each surface is

- **Header shell.** Full-bleed white, 1440 x 79 (76 bar + a 3px `#d8ca50` bottom border), radius 0, no blur, inner container capped at 1240. Logo, nav, and one CTA, Request Catalogue (`#0a7ea8` fill).
- **Bar.** Seven buttons: Home, About, Sectors, Brands, Trade, Blog, More. About, Sectors, Brands, Trade and More have a caret; **Home and Blog are panel-less** (absent dropdown/mega rows). Items are 42px tall inside the 76px bar, radius 11, 15px / 600 Plus Jakarta Sans.
- **Item state.** Only panel-owning items get feedback: tint `rgba(10,126,168,.12)` plus text colour swap `#1e2a3c` to `#0a7ea8`, 0.22s. Home and Blog show nothing on hover (measured). Label magnet factor 0.140.
- **Panels** (all 12px below the header, radius 12, white, no blur, a `rgba(20,25,35,.25)` blur-2px viewport scrim; all centred on the viewport, width differs per panel):
  - About and Trade are `dropdown`s, 620px: numbered link list (01, 02 ...) plus a 300px feature rail (`#075e80` and `#0a7ea8`) with an image slot.
  - More is a `dropdown`, 300px, two links, no rail.
  - Sectors is `mega`, 1080px: **Cards** = four 245px cards with fills `#d8ca50`, `#0a7ea8`, `#075e80`, `#eaf4f7` (radius 18, hover lifts 6px with a shadow), height 340; **List** = a two-column list of rows (hover tint), height 205.
  - Brands is `mega`, 1080px: a 4-column grid of 10 logo slots and a 300px Own Brands rail. (It matches "item-centred" by the numbers only because Brands sits near the centre; the mechanism is viewport-centred, noted in the row.)
- **Trigger and close.** Same as Halcyon on desktop: hover or focus opens, 170ms grace (measured 173-188ms), Escape, backdrop click; no close button, no `aria-expanded`. Panel links are reachable by Tab only for the last item, More; a Tab out of the panel leaves it open (no blur handler).
- **Mobile (below 960, so 768 and 375 are mobile).** Burger 44x44; the overlay is full-screen `#0a7ea8`, with a 64px top row, the close button (38x38, **under the 44px target**, offset 11px right and 6px up from the burger), a CTA row (Become A Trade Customer pill plus round Email and Call buttons), a single-open accordion of all seven items (Home and Blog have no caret) and four fixed social circles at the end of the scroll body.
- **Footer.** None (`absent`).

## What surprised me (source says X, render shows Y)

1. **Sticky does not stick** (same cause as Halcyon: root wrapper `overflow-x:hidden`, proven by flipping it at runtime).
2. **Entry animations never run.** The source has `if (!ps) return;` in `componentDidUpdate`, and the runtime only passes `prevProps`, so it always returns early: zero animations, panel opaque on its first frame. The 460ms stagger and 420ms overlay stagger are dead here.
3. Escape does not close the overlay; no scroll lock; Tab escapes the overlay to the page behind (including two `image-slot` elements).
4. Home and Blog on mobile open an empty accordion panel (height 0).
5. **The three `uploads/*.png` are not used by the design** (`grep -c "uploads/"` gives 0); they are screenshots of the live Indus site. Every `image-slot` is an empty placeholder, so no logo or photo could be measured.
6. The overlay is identical across both variants; `sectorsStyle` only changes the desktop Sectors panel.

## Not measured

See `not_measured` in the JSON: no images or logos exist; touch input was not driven; the accent prop stayed at its default `#d8ca50`.

## Re-run

Serve the folder copies (`python -m http.server 8731` in `halcyon/`, `8732` in `indus/`), then from the scratchpad `w3b3a` folder: `node capture.mjs indus; node supp.mjs indus; node typo.mjs indus; node grace.mjs indus; node build.mjs indus`.
