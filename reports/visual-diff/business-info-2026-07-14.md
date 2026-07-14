---
report: sgs/business-info showLabel/iconOnly + FR-S9-8 per-device content adaptation
date: 2026-07-14
session: D331 (FR-S9-8 — per-device content adaptation, last Spec 17 §S9 build)
target: https://sandybrown-nightingale-600381.hostingersite.com/
blocks_changed: [sgs/business-info]
verdict: PASS
first_paint_capture_passed: true
---

# sgs/business-info — labelCollapse (responsive icon collapse, FR-S9-8)

New `labelCollapse` enum (`none`|`mobile`|`tablet`|`all`, default `none`) — one
per-instance setting that hides the text label and collapses the item to just
its icon from a chosen breakpoint down (`mobile` = icon-only ≤767, `tablet` =
≤1023, `all` = always). The label is always emitted in
`.sgs-business-info__label` and clipped via scoped `@media` CSS at the chosen
tier; a clipped label stays in the a11y tree so an icon-only phone/email link
keeps its accessible name (WCAG name-required) — no aria-label needed. Editor: a
single "Collapse label to icon" SelectControl (Display Options panel). Attr +
control + render landed together (dead-control + control-ux gates green — the
single enum is NOT a responsive family, so no device-switcher is required).

**Bean feedback (2026-07-14, incorporated + re-verified):** (1) replaced the
initial static `showLabel` boolean + per-tier duplicate elements with this ONE
responsive `labelCollapse` setting so a single element adapts itself. (2) Header
row fix — the "Call" button was in the middle row and forced a wrap (logo alone
on row 1); moved it to the BOTTOM row so **logo + cart + burger sit together on
the top row** and the Call sits on the bottom row (live: top offsets logo 16 /
burger 27 / cart 27 same row; Call top 83 below). (3) The "contact button" is a
`business-info` display style, not a theme hack — added a first-class **"Button"
block style** (`block.json` styles + block-private `style.css`, theme tokens,
`is-style-button`), client-selectable from the Styles panel, composes with
`labelCollapse`. Removed the old `.sgs-header-call` theme-CSS. Live: renders
identically (primary bg, 44px, `tel:`), `.sgs-header-call` gone, 0 console errors.

This block is the core primitive of the FR-S9-8 Indus slim-bar reference pattern
authored in `parts/header.html` + `framework-header-default.php`:
desktop = icon-only phone/email/social utility strip; ≤1024 = a prominent "Call"
button (a `sgs/business-info` phone styled via `.sgs-header-call`, reads Site
Info → working `tel:`) + the contact hidden via per-tier visibility, with the
email/social moved into the mobile drawer.

## Live verification (sandybrown, full cache-clear incl. Hostinger CDN)

| Check | Evidence | Verdict |
|---|---|---|
| labelCollapse=all email → mailto + accessible name | `<a href="mailto:Zainab@mamasmunches.com">`, `.sgs-business-info__label` clipped ≤2px, accName preserved | PASS |
| labelCollapse=all phone → tel + accessible name | `<a href="tel:01214960123">`, label clipped ≤2px, accName "0121 496 0123" | PASS |
| Call button (business-info phone) bottom row ≤1024 | `tel:01214960123`, 44px touch, primary bg, hidden `display:none` at ≥1024; on the bottom row (logo+cart+burger stay on the top row) | PASS |
| Per-tier visibility 767/1023 | hide-mobile `max-width:767`, hide-tablet `768–1023` (aligned to canonical SGS_Breakpoints, R-31-1) — hide classes now injected on the wrapper div | PASS |
| Move-to-drawer | email (`mailto:`) + socials (instagram) render inside the open drawer's custom zone, absent from the collapsed header row | PASS |
| No header overflow | `scrollWidth ≤ innerWidth` at 320/375/768/1024/1440 (header); the 1024 page overflow is the accepted testimonial slider carousel, not the header | PASS |
| No inline style / console | 0 inline `style=""` on the subtree; 0 console errors | PASS |
| No hardcoded client data | every value flows from the Site Info store; theme-token colours only | PASS |

**Universal device-visibility bug fixed (this session):** the `render_block`
visibility filter grabbed the first tag — which for any no-inline block (leading
scoped `<style>`) was the `<style>`, then lifted to `<head>` by the CSS
collector, so the hide class vanished. Fixed to skip leading `<style>`/`<script>`
and target the first visible wrapper. Affects every block that emits a leading
scoped `<style>` — proven live on the header business-info items.

**D332 addendum (Bean rule):** the labelCollapse clip is now also gated on the
icon being shown (`$show_icon`) — collapsing the label with no icon would leave
the item empty, so with no icon the clip is a no-op and the label always shows.
Same rule applied to sgs/button.

first_paint_capture_passed: true — header renders correctly on first paint at
every tier (see `assets/fr-s9-8-header-1440-clean.png` desktop icon-strip and
`assets/fr-s9-8-header-375-v2.png` mobile logo+cart+burger top row + centred
Call button on the bottom row).
