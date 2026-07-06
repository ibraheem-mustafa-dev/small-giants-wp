# Visual diff — sgs/multi-button — 2026-07-07

verdict: PASS
first_paint_capture_passed: true

## Change under review (D288)

Cross-axis alignment is now per-tier, and **mobile defaults to `stretch`** so cloned/authored CTAs
stack FULL-WIDTH on mobile (matching the draft's column-flex default, where `align-items` is absent →
browser default stretch). version 1.3.0 → 1.4.0.

- **render.php** — the mobile `@media(max-width:767px)` and tablet blocks now emit `align-items`;
  `$align_items_mobile` defaults to `stretch` (mobile is a flex column), `$align_items_tablet`
  inherits the base value. No `!important`, no animation/first-paint rule.
- **block.json** — new `alignItemsTablet` ("") + `alignItemsMobile` ("stretch") attrs; version bump.
- **edit.js** — the single Align-Items `SelectControl` → a responsive `ResponsiveControl`
  (desktop/tablet/mobile), so a client can override the mobile stretch default.

## Visual verification (LANDED on live page 8, computed-style)

Deployed + OPcache reset. Hero CTA group at 375 (anonymous Playwright): `.sgs-multi-button`
`flex-direction:column`, `align-items:stretch` (was `center`); both `<a>` buttons **328px** wide,
filling the content column (`ctaFullWidth:true`; were 151px content-width before). At 1440 the group
is a left-aligned row of content-width buttons (draft ≥768 = row) — unchanged. First paint: CTAs
render correctly on load. Build clean; gates exit 0.
