# Design gate — FR-38-12 Flip, redirected to WooCommerce Product Collection

**Status:** BUILT + LIVE-VERIFIED, D741 (2026-08-22). Two bugs found and fixed on top of the
build below: `sgs/container` (the shop archive's own Product Collection toolbar wrapper)
tripped WooCommerce's client-nav kill-switch, and `fx-flip.js` called `MatchMedia#add()` with
a bare function where it requires `(conditions, func)`, so `Flip.from()` was registered but
never invoked. Full writeup: `.claude/decisions.md` D741. Archiving this file — its work is
done.

## Why this exists

D426 (`.claude/decisions.md`) found the original FR-38-12 pairing (`sgs/filter-search` ↔
`sgs/card-grid`) technically impossible: `filter-search` never touches a card/product and
emits no event, and `card-grid` has no `view.js` at all (server-side PHP filtering). Bean's
ruling kept FR-38-12 open as a design gate + research point, redirecting real client-side
re-filtering toward WooCommerce's native Product Filter/Collection blocks. Spec 38 §3.3 was
amended 2026-08-20 to record this. This doc is that design gate, closed with Bean's decisions
below, ready for build.

## What's being built

Animated re-layout (GSAP `Flip`) when WooCommerce's **Product Collection** block re-filters
on the frontend — cards currently on screen animate to their new positions instead of
instantly snapping, when a WooCommerce collection filter (price, attribute, rating, etc.)
changes the result set.

## Research finding that shaped this design

WooCommerce's Product Collection block re-filters via the **WordPress Interactivity API's
client-side router** (`data-wc-navigation-id` region diffing) — not a simple custom DOM
event a third party can cleanly hook. Its internal markup (`.wc-block-product-template`,
per-product `<li class="wc-block-product">`) is explicitly documented by WooCommerce as
**"private, subject to change without notice."** Hooking Flip into WC's own router internals
would tie SGS to an implementation WC has explicitly reserved the right to change.

## Decisions (Bean, 2026-08-20)

1. **Trigger mechanism: `MutationObserver`**, not WC's Interactivity API router. Watch the
   block's stable public wrapper (`.wp-block-woocommerce-product-collection` — this class
   name IS part of WC's public contract, unlike its children) for `childList`/`subtree`
   mutations. On the first mutation, capture `Flip.getState()` over the current product
   nodes; debounce until mutations settle, then `Flip.from()`. This is the same shape as
   every other SGS Tier G module (`src/shared/effects/gsap/`) — framework-agnostic, survives
   WC internal refactors, no coupling to `data-wp-interactive`/router internals.
2. **v1 scope: Product Collection only.** No core Query Loop / post archives — no client
   need identified for that yet. Revisit if/when a client build needs it.

## Mechanism (for the build)

- **New module:** `plugins/sgs-blocks/src/shared/effects/gsap/fx-flip.js` — mirrors the
  existing Tier G module shape (`init`/`cleanup`, reduced-motion gate, registry-driven
  conditional load per FR-38-3).
- **Opt-in surface:** SGS doesn't own `woocommerce/product-collection`'s block.json, so this
  can't be a per-block inspector control like other FR's. Use the same **site-level settings
  surface** as FR-38-18/19 (Lenis smoother / page transitions) — one toggle: *"Animate
  WooCommerce product re-filtering."* Default OFF.
- **Injection:** a `render_block_woocommerce/product-collection` PHP filter (WC exposes this
  hook — confirmed) adds `data-sgs-fx="flip"` to the block's root wrapper ONLY when the
  site-level setting is ON. This follows the codebase's existing `render_block` injector
  pattern (hover-effects / parallax / image-controls / `fx-shape-routes.php`) rather than
  inventing a new mechanism.
- **Frontend:** `fx-flip.js`'s `MutationObserver` target is the element carrying
  `data-sgs-fx="flip"` (the Product Collection root). It reads the DIRECT product nodes
  (`:scope li`, not a WC-specific class) so a WC markup change to class names doesn't break
  detection — only a change to "products render as list items" would, which is a safe
  assumption at the semantic HTML level WC commits to.
- **No-GSAP / reduced-motion fallback:** instant re-layout (today's behaviour, unchanged) —
  per Spec 38 §3.3's original FR-38-12 text, still correct for the redirected target.
- **Editor story:** no-preview, per Spec 38 §9's existing Flip row ("filter interaction
  doesn't exist in-canvas").
- **Canary requirement:** the sandybrown canary needs a live WooCommerce catalogue with a
  Product Collection block using an active filter (price/attribute) to test against — confirm
  this exists or build a minimal one before claiming this FR done.

## Not in scope for this build

- Core Query Loop / post archives (deferred, no client need yet)
- Any change to `sgs/filter-search` or `sgs/card-grid` (the original, now-dead pairing)
- Hooking WC's Interactivity API router directly (rejected — see Decision 1)

## Verification

Live Playwright test on sandybrown: change a Product Collection filter, confirm product
cards animate to new positions (not instant snap) with the setting ON; confirm instant
re-layout with the setting OFF; confirm reduced-motion forces instant re-layout regardless
of the setting.
