---
block: sgs/adaptive-nav
date: 2026-07-13
session: P2 — adaptive-nav (Spec 17 §S9 / FR-S9-4)
verdict: PASS
first_paint_capture_passed: true
canary: sandybrown-nightingale-600381.hostingersite.com (WP 7.0, LiteSpeed v7.8.1)
screenshots: [nav-375.png, nav-768.png, nav-1440.png]
---

# Visual-diff / live-QC — sgs/adaptive-nav (P2)

New SGS navigation block that renders a desktop bar from ONE `wp_navigation` menu source
and collapses to the `sgs/mobile-nav` drawer at a configurable tier. It **replaces
`core/navigation` in the header**, which removes the anchor WooCommerce hooks its
mini-cart + customer-account onto — the stray-injection fix, by construction.

All checks run on the REAL canary homepage, caches cleared first (OPcache + `wp
litespeed-purge all` + Hostinger CDN + theme Version 1.5.11→1.5.12), per STOP-21.

## Headline outcome — the WooCommerce Block-Hooks injection is GONE
Verified on the real header markup (inline `<style>`/`<script>` stripped so only rendered
elements are inspected):

| Element | Result |
|---|---|
| `core/navigation` (`wp-block-navigation`) | **absent** ✓ (replaced by adaptive-nav) |
| WooCommerce `mini-cart` element | **absent** ✓ (the lone `wc-block-mini-cart` string in the page is a CSS selector, not an element) |
| WooCommerce `customer-account` | **absent** ✓ |
| `sgs/adaptive-nav` + `<nav aria-label="Primary">` | present ✓ |
| `sgs/cart` (intended SGS cart) | present ✓ |
| burger toggle | present ✓ |

## SEO / GEO / a11y — server-rendered, crawlable
- The `<nav>` carries **16 crawlable `<a href>`** with a page-list fallback, or the real
  menu's items when set — all in the initial server HTML, CSS-hidden panels, **no AJAX
  lazy-load** (AI crawlers don't run JS). `aria-current="page"` on the active link.
- Submenu → **mega-panel using the ARIA APG disclosure pattern** (`<button aria-expanded
  aria-controls>`, not `role=menu`). Verified click → `aria-expanded="true"` + panel
  visible + correct child links (Ingredients, Our Promise).
- Unique `aria-label="Primary"` on the bar's `<nav>`; the drawer keeps its own label.

## Reflow sweep 320→1440 (representative 7-item menu)
`document.documentElement.scrollWidth` catches the pre-existing **testimonial-slider
carousel** (off-screen slides, a known accepted exception) — an overflow probe confirmed
**every** overflowing element is `inHeader:false` (the slider). **No header/nav element
overflows at any width** (320/360/375/414/768/1024/1280/1440). Cart stays 44×44 throughout.

## Collapse tier (configurable, single source of truth)
adaptive-nav emits the scoped breakpoint rules for BOTH the bar and the header burger
(replacing the old fixed 768px + 782px hacks). Live:

| Width | bar | burger | correct? |
|---|---|---|---|
| 320–414 | `display:none` | `display:flex` | ✓ nav in drawer, burger shown (matches draft) |
| 768–1440 | `display:flex` | `display:none` | ✓ bar shown, no burger |

## Drawer (one-source integration + P0 fix intact)
At 375, burger → drawer: `open:true`, **`isBodyChild:true`** (P0 re-parent-to-`<body>`
still correct), populated from the SAME menu source as the bar (labels: Shop, Our Story →
Ingredients/Our Promise + "View all", Send to Ward, Gift Ideas, FAQs), submenu accordion,
9/12 links reachable via `elementFromPoint` (the 3 are collapsed submenu children).

## Overflow "More" menu
Correctly **dormant** when items fit (7 short items ≥768); measures against the
constrained container (`nav.clientWidth`) and relocates overflow into a "More" disclosure
when items exceed the available width.

## Console
0 console errors / page errors on load + interaction.

## Deferred to P2b (documented, NOT silently dropped)
- **Drawer accordion → drill-down animation** — the drawer renders submenus as accessible
  accordions today (functional); the drill-down slide + back-link UX is a coordinated
  refactor of the recently-P0-fixed drawer, deferred to avoid regression risk.
- **`sgs/mega-menu` `role=menu` → disclosure alignment** — its trigger is already a correct
  disclosure; only the panel `role="menu"` (paired with its arrow-key roving keyboard model)
  deviates. Aligning it is a coordinated render + keyboard-model refactor of a working
  block. adaptive-nav's OWN submenu→mega-panel path uses the disclosure pattern correctly.
- **FR-S9-6 `{desktop/tablet/mobile}` responsive-override model** — coordinated with the
  parallel footer track's shared engine (analyse-then-adopt); this block uses the P1
  flat-tier attrs meanwhile.
