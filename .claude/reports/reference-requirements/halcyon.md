---
doc_type: report
project: small-giants-wp
title: Halcyon mega menu (Claude Design draft) - reference capture
plan_row: W3B-3a
captured: 2026-09-20
data: halcyon.json
---

# Halcyon (Claude Design draft, Bean's own) - requirements capture

Source: `sites/Mega-menu design/Mega Menu.dc.html` with `support.js` and `_feature.dc.html`. Rendered from a byte-identical scratchpad copy over a local static server, measured in Chromium at 375, 768 and 1440 (height 900). Variants: presets Columns, Cards, Minimal x themes Light, Dark, six in all (`columns-light` ... `minimal-dark`). The props were set through the runtime's own hook, `window.__dcSetProps(window.__dcRootName(), {preset, theme})`, which is what the Tweaks panel uses; no file was edited. The six variants give 156 rows and 894 cells (576 `static`, 318 `interaction-capture`), plus six `not_measured` entries listed in the JSON.

## What each surface is

- **Header shell.** Full-bleed (1440 wide, 73 tall = 72 bar + 1px border), radius 0, inner container capped at 1240 with 28px padding. Fill is translucent: Light `#fcfbf8` alpha .86, Dark `#141419` alpha .82, with `saturate(1.4) blur(18px)`. Logo left, nav, then a Sign in link and a Get started button (accent `#5b6ef5`).
- **Bar.** Five buttons in a row: Products, Solutions, Resources, Company (each with a caret) and Pricing (no panel). 15px / 500 / -0.15px Instrument Sans, 72px tall, 2px gaps. The nav is not centred on the viewport (57px left of centre) because the row is `space-between`.
- **Panels.** All four are `mega`: 1120px wide, centred on the viewport (160px each side), 10px below the header, radius 20, `saturate(1.5) blur(24px)`, plus a full-viewport scrim (`#0a0a0c` alpha .28, blur 2px) that closes on click. Width never differs per panel. Heights depend on preset: Columns 296 (Solutions 356), Cards 472 (613), Minimal 554 (718). Columns and Cards have a 340px feature rail; Minimal has a 400px preview pane that follows the hovered link (measured). The Columns/Cards feature card does not follow hover; its glow follows the pointer (`--mx/--my` measured).
- **Trigger and close (desktop).** Hover or keyboard focus opens; no click, no close button, no burger. Closes on leaving the header (measured 174-188ms after mouseleave, source 170ms), Escape, or a backdrop click.
- **Trigger and close (768, 375).** A 44x44 burger (two 18x1.5 lines, radius 12) opens the overlay; a separate 44x44 close button sits 4px right of it. Same size, not morphing, no animation between the two.
- **Drawer.** The overlay is full-screen (fixed, z 300, opaque `#f5f3ee` / `#0d0d10`), 72px top row, single-open accordion of the same items with a `+` that rotates 45deg, and the two CTAs at the end of the scroll body. Its geometry is identical across all six variants.
- **Footer.** None (`absent`).

## What surprised me (source says X, render shows Y)

1. **Sticky does not stick.** The source declares `position:sticky;top:0` on the header, but the header scrolls away (top = -600 at scrollY 600, all three tiers). The cause is proven: the root wrapper has `overflow-x:hidden`, which becomes the sticky scroll container; flipping that to `visible` at runtime gives top = 0.
2. **The panel and overlay entry animations never run.** The source has a 340ms panel entry and a staggered 460ms child entry (and a 420ms overlay stagger). The runtime calls `componentDidUpdate(prevProps)` with one argument, the draft reads `ps.active` from a second, so it throws (a console error on every update) before `animatePanel`. Measured: zero animations, panel opacity 1 on its first frame. The design that Bean sees in Claude Design may animate; this render does not.
3. **Escape does not close the mobile overlay** (`closeAll` only clears the desktop panel). There is no scroll lock (the page scrolled 400px under the open overlay), no focus trap (Tab reaches the page behind), no dialog or `inert`.
4. **Panel links cannot be reached by Tab.** Tabbing from Company goes to Pricing, which closes the panel. Nothing has `aria-expanded`.
5. **Pricing on mobile opens an empty 16px accordion panel** (the `hasPanel` guard covers the `+` but not the open state).
6. **A global `a:hover{opacity:.7}` stacks on every panel link hover.**
7. Light/Dark change colours only; preset changes only the desktop panel. The mobile overlay does not vary by variant.

## Interaction values

Sliding pill: 38px tall, radius 11, tracks item x and width (CSS 0.38s `cubic-bezier(.16,.84,.32,1)`; measured about 266ms to within 1px), and it moves onto Pricing even though Pricing has no panel. Label magnet: `translateX((mouseX - itemCentre) * 0.16)`, measured 0.160 on every item, 0.2s ease-out, resets on leave. Panel-to-panel switching is an instant swap with no cross-fade. Breakpoint: below 940px is mobile (939 burger, 940 nav, verified); 768 is mobile.

## Not measured

See `not_measured` in the JSON: no photos exist (the feature blocks are striped placeholders); touch input was not driven; the accent prop was left at its default; the entry stagger cannot be measured as a value because it does not run.

## Re-run

Serve the folder copies (`python -m http.server 8731` in `halcyon/`, `8732` in `indus/`), then from the scratchpad `w3b3a` folder: `node capture.mjs halcyon; node supp.mjs halcyon; node typo.mjs halcyon; node grace.mjs halcyon; node build.mjs halcyon`.
