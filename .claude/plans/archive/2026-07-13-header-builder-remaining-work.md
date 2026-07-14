---
doc_type: phase-plan
project: small-giants-wp
title: Header builder — state + remaining work (post P1)
date: 2026-07-13
status: ACTIVE — P1 blocks shipped; header design in progress; adaptive-nav (P2) is the next dedicated session
governing_specs:
  - .claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md §S9 (FR-S9-1..11)
  - .claude/plans/2026-07-13-header-footer-nav-system-design-gate.md
draft_ground_truth: sites/mamas-munches/mockups/Claude App Design - Responsive Homepage and Product Page/mamas-munches-mockup.html (.mm-header)
---

# Header builder — where we are + what's left

## 1. Plain-English state

The SGS header is now a **block-based, Site-Editor-native** system (Bean's chosen architecture — NOT a Customiser builder; a block theme's single editing place IS the Site Editor, where global styles also live). Two blocks are built:
- **`sgs/site-header`** (section KIND) — the header shell, 3 optional rows (top/middle/bottom), empty row = zero output.
- **`sgs/site-header-row`** (layout KIND) — a per-row cluster; delegates to `SGS_Container_Wrapper` (composite-mirror).

**The original emergency (sub-400px WCAG 1.4.10 overflow) is FIXED and live-verified** (320→1440, `scrollWidth ≤ innerWidth`, 0 overflow).

## 2. What's committed vs on-disk

| State | What | Where |
|---|---|---|
| **Committed + pushed** (`a1433f82`) | P1 v1: both blocks, overflow fix, DB reconcile, visual-diff reports | git `main` |
| **On disk + deployed to sandybrown (uncommitted)** | P1 v2: the DRAFT-FAITHFUL header — `sgs/cart` (not woocommerce/mini-cart), `sgs/responsive-logo` (not core/site-logo), icons grouped (`core/group.sgs-header-icons`), nav→drawer collapse below 768 via `sgs/site-header/style.css`, `overlayMenu:"never"` on the nav, theme `Version` 1.5.10 | working tree + canary |

**Decision (Bean, 2026-07-13):** commit v2 (it's the correct direction), but the header is NOT visually final — see the open items below.

## 3. Draft ground-truth (match this — do NOT guess)

`sites/mamas-munches/mockups/.../mamas-munches-mockup.html` `.mm-header` = flex `space-between`, 3 children: **logo | nav | icons(cart+burger)**.
- **`.mm-nav { display:none }` by default**, `display:flex` at `.vw-768`/`.vw-1440` (nav trims to 14px/gap 20 at 768; gap 32 at 1440).
- **`.icon-hamburger` hidden at 768+** (burger only < 768).
- **Cart always visible** (in `.mm-header-icons`).
- Net: **<768 = logo · cart+burger (nav in drawer); ≥768 = logo · nav · cart (no burger).**

## 4. THE root issue still open — WooCommerce Block Hooks (PROVEN, not assumed)

**Cause (verified in WC source on the server):** WooCommerce registers `woocommerce/mini-cart` + `woocommerce/customer-account` as **hooked blocks anchored to `core/navigation`** (`WC src/Blocks/BlockTypes/MiniCart.php:72` + `CustomerAccount.php:35` → `'anchor' => 'core/navigation'`, via `add_filter('hooked_block_types', …, 9)`; `BlockHooksTrait.php:11` docblock: *"auto-inject the mini-cart block into headers after navigation"*). WP's Block Hooks API therefore **auto-inserts a WC mini-cart + a customer-account (account icon) right after our nav** in the header — the stray "second cart + account icon" Bean saw. Not in our markup, not a DB template-part (none exist), not the nav menu (page-list only). Root cause = the header uses `core/navigation`.

**Two fixes considered:**
- (Symptom layer) a `hooked_block_types` filter suppressing those two blocks for the `core/navigation` anchor — VALIDATED (`/wp-hooks`: native WP filter, sig `$hooked_block_types,$relative_position,$anchor_block_type,$context`). **REVERTED per Bean** — he wants the architecture fix, not a workaround.
- (Architecture layer — CHOSEN) **build `sgs/adaptive-nav` and use it INSTEAD of `core/navigation`.** WC anchors to `core/navigation`; our own nav block is not that anchor, so the injection never fires. This was always P2 (FR-S9-4).

## 5. Remaining work — roadmap

### P2 (next dedicated session) — `sgs/adaptive-nav` (FR-S9-4, Opus-modelled)
The root fix for §4 AND the proper nav. Full research + design + build (do NOT rush — aesthetics + CRO critical):
- ONE menu source → desktop nav bar that collapses to a burger at a configurable tier (Desktop/Tablet/Mobile/**custom-px**), opening the existing `sgs/mobile-nav` drawer (P0 fix already live).
- Mega-menu: per-item nestable content; on mobile → drill-down + back-link; AJAX lazy-load for heavy content.
- Desktop overflow → auto-collapse into a "more" menu (intrinsic never-overflow for nav).
- GOV.UK-grade a11y contract wired to the drawer (focus trap, ESC, `aria-expanded`, progressive enhancement).
- **Using it in the header removes `core/navigation` → the WC mini-cart/customer-account injection stops by construction** (no filter needed). Then remove the nav-visibility CSS hack in `sgs/site-header/style.css` (adaptive-nav owns its own responsive collapse).
- Research first (competitor nav builders — Bricks/Elementor/Blocksy/Kadence advanced-header, per the design-gate). Validate hooks with `/wp-hooks`.

### The Site-Editor "dedicated section" vision (Bean, 2026-07-13)
Set the header builder up as a **clear, dedicated, guided place in the Site Editor** — the equivalent of Astra/Spectra's builder UX but block-native: header-type presets in the Replace picker, clearly-labelled rows, an overflow→drawer drop-zone, a device switcher, sticky/transparent presets. This is the FR-S9-6 editor-UX + FR-S9-8 per-device work, framed as one coherent "Header" building experience. Document + design this as its own gate before building the editor UX.

### Smaller deferred items (each a named follow-up)
- **Cart empty-state toggle** (Bean): **SHIPPED D325** — `sgs/cart` gained a `hideWhenEmpty` per-instance attr (hides the whole element until count>0, JS-driven post-hydration since SSR count is always 0). Distinct from `showZero` (badge only). (Non-WC cart-free default variant still OPEN.)
- **`sgs/responsive-logo` per-breakpoint images** — the block supports desktop/tablet/mobile logo IDs; currently falls back to the site `custom_logo`. Wire the per-breakpoint logo assets for Mama's when available. **STILL OPEN** — no per-breakpoint logo assets on disk (only a generic logo + one research SVG).
- **1px bottom divider** — the old header had a `1px surface-alt` bottom border; dropped in the MVP (the block's colour/border re-emit is uniform, not per-side). Add per-side border support to the header render, or a theme rule.
- **Desktop nav distribution** — currently the 3-child `space-between` gives logo | nav(centre) | icons(right) which matches the draft; verify once adaptive-nav replaces core/navigation. (adaptive-nav SHIPPED D326.)
- **P3 `sgs/site-footer`** (FR-S9-3) — **SHIPPED + LIVE D325.** Built `sgs/site-footer` (section KIND) + a DEDICATED `sgs/site-footer-row` (layout KIND, grid columns — up to 6 → 1 at mobile via `gridTemplateColumnsMobile`) rather than extending the shared header-row (file-disjoint from Track A). Live-verified 3-col desktop/tablet → 1-col mobile, empty-row zero-output, `<footer>` landmark, no inline styles. FR-S1-2 thin `footer.html` delegation; `sgs_footer` CPT template lock added.
- **Business data via `sgs/business-info` block, not bindings (Bean steer, D325):** the footer's data fields use `sgs/business-info` with a draggable inserter VARIATION per data type (Phone/Email/Address/Opening Hours/Social Links/Copyright/Tagline/Map), each reading live from the Site Info store. The `sgs/site-info` block-binding source was ALSO fixed + booted (was never registered — 3 latent bugs) and kept.
- **Tier-1 pipeline business-info auto-fill (Bean ask, D325):** `scripts/sync-business-info.py` extracts high-confidence fields (email `mailto:`, phone `tel:`, socials known-domain, copyright `©`) from a draft → POSTs to the NEW capability-gated `POST /sgs/v1/site-info` (fill-if-empty, never overwrites). Live-verified. **Tier 2 (tagline/address/hours — semantic guesses) OPEN — needs a review-not-auto-write flow.**
- **Org JSON-LD (D325):** `Org_Website_Schema` now emits `sameAs` (socials) + `contactPoint` (phone/email) + Site-Info address fallback from the same store.
- **P4 per-device adaptation** (FR-S9-8) + transparent-on-scroll toggle (FR-S9-9). **OPEN.**
- **P5 cloning-pipeline Part 2** (FR-S9-11) — draft header/footer rows → the new blocks. **OPEN** (Tier-1 business-data auto-fill is a first slice of pipeline→site population).
- **Site-Editor header-builder editor-UX design-gate** (FR-S9-6/8, Track B Task 2) — **NOT done; OPEN.**

## 6. SGS-first block audit (Bean's steer — use SGS blocks, not WP core)
| Header element | Now | Target |
|---|---|---|
| Logo | `sgs/responsive-logo` ✅ (falls back to site logo) | keep; wire per-breakpoint images |
| Cart | `sgs/cart` ✅ (was woocommerce/mini-cart) | keep; add hide-when-empty toggle |
| Nav | `core/navigation` (INTERIM) | → `sgs/adaptive-nav` (P2) — also kills the WC injection |
| Icons group | `core/group` | acceptable (no lightweight SGS group block; `sgs/container` is heavyweight) — revisit if an SGS primitive appears |
| Burger | `sgs/mobile-nav-toggle` ✅ | keep |
| Drawer | `sgs/mobile-nav` ✅ (P0 fix live) | hardened in P2 a11y contract |

## 7. Guardrails (carry forward)
Composite-mirror (delegate to `SGS_Container_Wrapper`, no divergent path). No inline `style=""` (Spec 32). No block version bumps as deprecations (D270/D293). Deploy → LiteSpeed + OPcache + CDN clear before any live measure (STOP-21). Verify on the REAL page (live DOM). `/wp-hooks` validate before using any hook. Path-scoped commits on `main`, verify D-ceiling, no co-author. Bump `theme/sgs-theme/style.css` Version on any pattern/theme-CSS change.
