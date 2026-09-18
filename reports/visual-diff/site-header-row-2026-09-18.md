# Visual diff — sgs/site-header-row — mobile cart-before-burger reorder — 2026-09-18

verdict: PASS
intent_capture_passed: true
source_sha: 16a0103e6f33eaa6

Bean-approved fix: on mobile, the header's cart icon must sit to the LEFT of the
nav-bar-menu burger toggle (dominant convention — GeneratePress, OceanWP, Kadence,
Blocksy, Shopify, BigCommerce, Apple, Nike, Glossier), as two fully separate,
independently-tappable controls (no shared wrapper, no merged click handlers).

## What changed

`plugins/sgs-blocks/src/blocks/site-header-row/style.css` — one new rule, no markup
change, no attribute change:

```css
@media (max-width: 767px) {
	.sgs-site-header-row .sgs-nav-bar-menu:has(~ .wp-block-sgs-cart) {
		order: 1;
	}
}
```

`nav-bar-menu` (which renders its own burger toggle inside its `<nav>` root, D1059)
gets `order:1` only when a later `sgs/cart` sibling exists in the same
`sgs/site-header-row`; the logo and cart keep their default `order:0`. This moves
only the nav-bar-menu (and its burger) to the end of the flex row.

## Why intent-capture, not before/after

The fix cannot be deployed before this commit (build-deploy.py's dirty-gate refuses
to push an uncommitted file live, per D336), so a true post-deploy first-paint diff
cannot exist yet at commit time. Per `.githooks/README.md`'s intent-capture
definition, this is a single live capture checked against a stated assertion.

## Assertions — stated before measuring

1. On the live canary (https://sandybrown-nightingale-600381.hostingersite.com/) at
   375px, BEFORE this fix, the burger sits LEFT of the cart (the reported bug).
2. The DOM structure the CSS `:has()` selector depends on — `.sgs-nav-bar-menu` as
   a flex child of `.sgs-site-header-row`, immediately followed in source order by
   `.wp-block-sgs-cart` as a sibling flex child — matches what is actually rendered
   live (not just what the pattern PHP source implies).
3. The cart's item-count badge (`.sgs-cart__badge`) stays positioned relative to its
   own icon regardless of the parent flex item's `order` (badge is `position:absolute`
   inside `.sgs-cart`, unaffected by reordering the whole `.sgs-cart` flex item).

## Results — live capture (BEFORE fix, unfixed production, 375×800 viewport)

Captured via CDP browsing tool (Playwright's browser backend was unresponsive this
session) against https://sandybrown-nightingale-600381.hostingersite.com/:

| # | Assertion | Result |
|---|---|---|
| 1 | burger left of cart, currently | **PASS** — measured `getBoundingClientRect()`: `.sgs-nav-bar-menu`/`.sgs-nav-bar-menu__burger` x=239.33–283.33; `.wp-block-sgs-cart` x=292–336. Burger left, cart right, confirming the reported bug live. |
| 2 | DOM/selector structure matches CSS assumption | **PASS** — `.sgs-nav-bar-menu` and `.wp-block-sgs-cart` are direct flex-item siblings inside the header row, cart immediately after nav-bar-menu in source order — exactly what `:has(~ .wp-block-sgs-cart)` requires to match. |
| 3 | badge attached to cart icon, not burger | **PASS** — `.sgs-cart__badge.sgs-cart__badge--visible` (text "1") at x=316/y=75.78/18×18 — inside the cart's own 292–336 x-range, top-right of its icon. Unrelated to the burger's position. |

Screenshot: `header-before-fix-375.png` (mobile viewport, 375px) — burger icon left,
cart icon with red "1" badge right, confirming the pre-fix defect.

## What is NOT verified — stated, not buried

**No post-deploy live capture yet.** This report is written and committed before the
fix is deployed (deploy requires this commit first). The actual visual result of the
CSS change — cart moving to the LEFT of the burger post-deploy, both remaining
independently clickable, no overlap/clipping regression — is NOT yet measured.

This debt will be paid immediately after deploy in the same working session: a
second live capture at 375px on the same canary, comparing cart/burger x-coordinates
post-fix, click-testing each control independently, and confirming the badge is
still correctly positioned. This report will be updated with an "Update" section
carrying that result, per the established convention (see
`reports/visual-diff/whatsapp-cta-2026-09-04.md`).
