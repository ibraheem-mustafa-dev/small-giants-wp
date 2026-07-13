---
doc_type: design-gate
project: small-giants-wp
title: Header/Footer container standardisation (core/group → sgs/container) + responsive reflow
date: 2026-07-13
status: AWAITING-BEAN-SIGN-OFF
governing_specs:
  - specs/17-HEADER-FOOTER-ARCHITECTURE.md (owner — template-part architecture)
  - specs/31-UNIVERSAL-CLONING-PIPELINE.md §13.6 (composite-mirror / container roster)
  - specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md (no-inline styling contract)
enforced_constraint: .claude/hooks/no-header-footer-block.py (header/footer NEVER Gutenberg blocks)
supersedes: the emergency CSS band-aid (Bean chose the proper fix, no stopgap)
---

# Design-gate — Header/Footer container standardisation + responsive reflow

## 1. Plain-English summary (what + why)

**What:** The site header (and footer) is currently built from a WordPress **`core/group`** wrapper with **inline CSS** baked into the markup, sitting inside the theme's header template part. We replace that `core/group` with **`sgs/container`** — our own, superior, pipeline-understood container block — configured to arrange the header's child blocks (logo, nav, account, cart) responsively. The header stays a **template part** (never a block — that's a hard rule); only the *wrapper inside it* changes.

**Why:**
1. **Fixes a live WCAG 2.2 AA failure.** Below ~400px the header overflows the viewport (proven live: 384px content in a 320px viewport = 64px sideways scroll; the account + cart icons escape the right edge). WCAG SC 1.4.10 (Reflow) requires no horizontal scroll at 320px. The current header has **no responsive rule below 480px**, so nothing adapts.
2. **Removes inline CSS + div-soup.** `sgs/container` emits a scoped `<style id="uid">` block (no inline `style=""`), driving responsive padding/gap via **block attributes** — aligning the header with the Spec 32 no-inline contract that every SGS block already meets. (The header was the exception only because it was a `core/group`, not an SGS block — Bean's blocks are clean.)
3. **Pipeline consistency.** The cloning pipeline already reroutes `core/group`→`sgs/container` (DB-driven). Standardising the theme's own header/footer on `sgs/container` closes the last gap where the framework used `core/group`.

## 2. Hard constraint honoured (non-negotiable)

**Header/footer are TEMPLATE PARTS, never Gutenberg blocks.** Enforced by `.claude/hooks/no-header-footer-block.py` (hard-blocks `src/blocks/(header|footer|nav)/`) + memory `header-footer-are-template-parts-not-blocks` (captured 3×). This design creates **no new block**. It edits:
- `theme/sgs-theme/parts/header.html` + `patterns/framework-header-default.php` (template-part markup — allowed)
- `theme/sgs-theme/parts/footer.html` + `footer-minimal.html` + footer patterns (allowed)
- `plugins/sgs-blocks/assets/css/header-behaviours.css` (behaviour CSS layer — allowed)
- optionally `plugins/sgs-blocks/src/blocks/container/` (the EXISTING container block, if a capability gap is found — allowed; not header/footer/nav)

None of these trip the hook. `sgs/container` is an existing, registered, universal block being *used*, not a header block being *created*.

## 3. The architecture (FR-style requirements)

### FR-HF-1 — Header wrapper: `core/group` → `sgs/container`
The "Main Navigation" row (currently `core/group` with inline `padding` + `border-bottom` + the outer "Site Header" group) becomes `sgs/container` instances:
- **Outer** container: full-bleed, `backgroundColor: surface`, zero base padding, renders the header band.
- **Inner "row"** container: `layout:flex`, `justifyContent:space-between`, `flexWrap:nowrap`, holds logo (left) + `.sgs-header-actions` (right); carries the responsive padding + 1px bottom border as **container attributes** (not inline CSS).
- Child blocks unchanged: `wp:site-logo`, `wp:sgs/mobile-nav-toggle`, `wp:navigation`, `wp:woocommerce/mini-cart`, `wp:sgs/mobile-nav` overlay. WC customer-account remains auto-injected into `.sgs-header-actions`.
- **Authoring note (verified):** `sgs/container` requires `justifyContent:"flex-end"` (not core's `"right"`) and an explicit `flexWrap:"nowrap"` (its default is `wrap`).

**Acceptance:** rendered header carries NO inline `style=""` padding/border on the wrapper (all in the container's scoped `<style>`); content + visual layout identical to today at ≥768px; `parts/header.html` and `patterns/framework-header-default.php` updated together (they are byte-identical duplicates).

### FR-HF-2 — Best-practice responsive values (researched, not inherited)
Values from Material 3 / Bootstrap / Tailwind / WP core / NN/g / Baymard / Kadence research (2026-07-13):

| Property | Value |
|---|---|
| Header height (target) | 72–80px desktop, 56–64px mobile (≈16px vertical padding around 44–48px targets) |
| Horizontal padding | desktop 32–48px (or centred to ~1200px max-width), tablet/mobile **16px** |
| Inter-element gap | desktop 24px, mobile **8px** |
| Nav-collapse breakpoint | **768px** → burger overlay (existing `sgs/mobile-nav`); desktop ≥1024px |
| Reflow floor | **320px** (WCAG), graceful to ~280px |
| Touch targets | 44×44px min (burger, account, cart) — WCAG 2.5.5/2.5.8 |
| Device tiers | SGS standard **768 / 1024** (container emits @max-width:1023 tablet, @max-width:767 mobile) |

Mapped to container attributes: base `padding` (desktop) + `paddingTablet` + `paddingMobile` (16px sides), `gap`/`gapTablet`/`gapMobile` (8px), optional `maxWidth`+centre.

### FR-HF-3 — Sub-400px reflow (the emergency fix, as built-in behaviour)
`sgs/container`'s responsive tiers are 767/1023 — it has no sub-400 tier, and it cannot hide an auto-injected WooCommerce child. So the header-specific reflow lives in the **header behaviour CSS layer** (`header-behaviours.css`), the same place sticky/transparent already live:
- `@media (max-width:400px)`: hide `.sgs-header-actions .wp-block-woocommerce-customer-account` — **account stays reachable via the overlay "My account" link (verified present live).** Logo kept full-size.
- Combined with the container's `paddingMobile:16px` + `gapMobile:8px`, this yields **scrollWidth 308 ≤ 320px** (proven by live DOM simulation), no overflow to 300px, graceful to 280px.

**Acceptance:** live Playwright at 320/360/375/384/300/280 — `scrollWidth ≤ innerWidth`, no header element past the edge, cart + burger one-tap ≥44px, account reachable in the burger menu.

### FR-HF-4 — Footer wrapper: `core/group` → `sgs/container`
Footer parts (`footer.html` outer + bottom-bar groups; `footer-minimal.html`) move to `sgs/container` on the same principle. Footer best-practice: top 80px / bottom 40px desktop (40/24 mobile), 3-column links → 1 column below 768px, separate bottom bar (~20px vertical padding). Footer's non-group inline styles (columns/buttons) are out of scope for this gate (separate Spec 32 block work).

### FR-HF-5 — Composite-mirror + no-inline compliance
`sgs/container` already renders through the shared wrapper machinery + emits scoped CSS (Spec 31 §13.6 / Spec 32 / D293). This gate reuses that — it does NOT add a divergent header/footer styling path. Any capability the old `core/group` had that `sgs/container` lacks (see Gap-check §5) is added to `sgs/container` universally (R-31-9), never as a header carve-out.

### FR-HF-6 — Behaviour-layer + integration non-regression
- Existing sticky / transparent / shrink behaviour (body-class layer, `class-sgs-header-behaviours.php`) + `--sgs-header-height` ResizeObserver + scroll-padding-top anchor fix (WCAG 2.4.11) must all still work.
- `sgs_header`/`sgs_footer` CPT template (`[['core/group']]`, Spec 17 FR-S3-4) → evaluate switching to seed an `sgs/container` starting block (open decision §6).
- Cloning pipeline Part 2 (`P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER`) emits `sgs/container`-wrapped header/footer when built (deferred).

## 4. Universality (R-31-9, no carve-out)
Header/footer are shared across every page + every client. Every value here is a framework token/size; no hardcoded client value. Logo/colours/copy flow from Site Info bindings + theme tokens (Spec 17 §S4). Must verify on ≥2 client contexts (mamas-munches + indus-foods).

## 5. GAP-CHECK — capability parity (must pass before build is "done")
Enumerate every capability the current `core/group` header/footer provides and prove `sgs/container` reproduces each — no silent drop:

| Capability (current core/group) | sgs/container equivalent | Verify |
|---|---|---|
| `backgroundColor: surface` (band) | `supports.color.background` | computed bg colour matches |
| Padding (per-side, responsive) | base `padding` + `paddingTablet`/`paddingMobile` (scoped) | computed padding each tier |
| `border-bottom: 1px surface-alt` | `__experimentalBorder` bottom | computed border matches |
| flex space-between / nowrap row | `layout:flex` + `justifyContent:flex-end`+`flexWrap:nowrap` | computed flex matches |
| max-width / centring (if used) | `maxWidth` + margin-inline auto | computed matches |
| skip-link (WP core) intact | unchanged (FR-S1-4) | one `#wp-skip-link` in DOM |
| Semantic landmark | outer `<header class=wp-block-template-part>` (container renders `<section>` inside — acceptable; open decision §6) | axe: one banner landmark |

Any row that fails = a capability gap → add to `sgs/container` universally (never a header hack), re-verify.

## 6. OPEN DECISIONS for Bean (design-gate sign-off resolves these)
1. **Sub-400 account behaviour** — behaviour-layer CSS `@media(max-width:400px)` hide (recommended, minimal) vs adding a native sub-400 tier to `sgs/container` (heavier, universal). *Rec: behaviour layer.*
2. **`<section>` vs `<div>`** — `sgs/container` renders `<section>`; inside the `<header>` landmark that's acceptable, but do we want to allow the container a `<div>` tag option for chrome contexts? *Rec: accept `<section>` for v1; add a `div` tag option to `sgs/container` only if a11y review flags it.*
3. **Reusable preset** — configure the container inline in the pattern (simplest) vs register a **`sgs/container` block variation "Site Header / Site Footer"** (a rule-allowed block *variation*, not a new block) with the header/footer defaults baked in, so operators + the pipeline get correct defaults in one click. *Rec: block variation — cleanest for clients + pipeline emission.*
4. **Footer scope now or next** — do FR-HF-4 (footer) in this programme, or ship header first then footer? *Rec: header first (fixes the live WCAG issue), footer immediately after.*
5. **CPT template swap** (FR-HF-6) — switch the `sgs_header` CPT seed template to `sgs/container` now, or defer to the pipeline Part 2 work? *Rec: defer to Part 2.*

## 7. S-TIER QC + VERIFICATION REGIME (Bean's requirement — future-proof)
No phase closes until ALL pass, live, on the real page (STOP-21: deploy + OPcache + `wp litespeed-purge all` + Hostinger CDN clear + `style.css`/`block.json` version bump BEFORE measuring — LiteSpeed v7.8.1 active):

**A. Responsive / reflow (Playwright, live):** widths **320 / 360 / 375 / 414 / 768 / 1024 / 1280 / 1440**. At each: `document.documentElement.scrollWidth ≤ window.innerWidth`; no header/footer element `getBoundingClientRect().right > innerWidth+1`; screenshot each. Plus 300 + 280 graceful.

**B. WCAG 2.2 AA (axe-core + manual):** SC 1.4.10 Reflow at 320px + 400% zoom on 1280; 2.5.5/2.5.8 touch targets (burger/account/cart ≥44px); 1.4.11 non-text contrast on icons ≥3:1; 2.4.1 skip-link present + working; one `banner`/`contentinfo` landmark each; keyboard-reachable burger→menu→account/cart; focus-visible rings.

**C. No-inline / scoped-CSS (computed, live):** the header/footer wrapper has NO inline `style=""` padding/border/gap; the values live in the container's scoped `<style id="uid">`; computed padding/gap/height match the FR-HF-2 table at each tier.

**D. Capability parity (Gap-check §5):** every row proven — no dropped capability vs the old `core/group`.

**E. Universality (R-31-9):** verified on **mamas-munches AND indus-foods** contexts (different logo/palette) — no hardcoded value, both render correctly; grep the changed files for client literals (zero).

**F. Behaviour-layer non-regression:** sticky/transparent/shrink still fire; `--sgs-header-height` still published by ResizeObserver; anchor links land below the sticky header (WCAG 2.4.11); dark mode renders correctly.

**G. Editor / operator (the "tech-illiterate client" gate):** block editor shows the container + inspector controls; operator can edit logo/nav; NO "Invalid block" warnings; Site Editor "Replace" picker still lists the framework header patterns.

**H. Content parity:** logo + nav items + account + cart present + unchanged vs current header; footer columns/contact/social/copyright unchanged.

**Gate tooling:** `/visual-qa` (breakpoint matrix) + `/qc` (end-to-end) + `/a11y-audit` (axe) + `/gap-analysis` (grade vs WCAG + this spec) + optional `/adversarial-council` pre-mortem before build. Visual-diff report at repo-root `reports/visual-diff/` if a block's CSS changes (STOP-67).

## 8. Phasing (post sign-off — NOT started this session)
- **P1 — Header:** FR-HF-1/2/3/5 + full §7 QC on the live header. Fixes the WCAG failure. (~1 focused session.)
- **P2 — Footer:** FR-HF-4 + §7 QC. (~1 session.)
- **P3 — Preset + pipeline:** the container variation (open decision 3) + CPT template + pipeline Part 2 emission. (Gated separately.)

## 9. Guardrails
- No new header/footer/nav block (hook + memory). No hardcoded client values. Composite-mirror (no divergent path). No block version bumps/deprecations pre-production (D293). STOP-CSS-VER-CACHE-BUST + STOP-21 + STOP-VERIFY-CACHE-LAYER-INSTALLED on every live check. Path-scoped commits, branch `main`, verify D-ceiling, no co-author.

## 10. This session's end-state
This document, presented for Bean's design-gate sign-off. Open decisions §6 resolved by Bean. No code, no deploy. On approval → fold FR-HF-* into Spec 17 as a new section, then execute P1.
