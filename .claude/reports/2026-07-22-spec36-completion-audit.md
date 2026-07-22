# Spec 36 (SGS Navigation System) — Completion Audit vs LIVE CODE + DB

**Date:** 2026-07-22 · **Method:** read-only. Every FR checked against actual `plugins/sgs-blocks/src` + `includes` + block.json/render.php + git log. Spec Status lines were NOT trusted. Live-DOM/axe items marked UNVERIFIABLE.

**Headline finding:** Spec 36 is FAR more built than a "from-scratch, not started" read of the spec implies. Phase-1 (MVP) is essentially DONE in code: `sgs/nav-menu` flat bar, `sgs/nav-drawer` modal, shared `store('sgs/nav')`, cart badge fix, logo basics, site-info store. Phase-2/3 (mega RENDER, dropdowns, priority+/bottom-tab modes, mini-cart, converter emit) are NOT-BUILT. The `sgs_mega_menu` CPT is REGISTERED (surprise vs spec's "does not exist yet" build-note) but its panels are NOT yet rendered into the bar.

## Completion table

| FR | Title | Claimed | Verified | Evidence | Gap | Cost | Deps |
|----|-------|---------|----------|----------|-----|------|------|
| 36-1 | Menu data = native WP menus (classic primary) | SIGNED-OFF | **DONE** (MVP scope) | `class-sgs-nav-menu-source.php:76-79` resolves `sgs/nav-menu`+`core/navigation`; nav-menu walks menu → `render.php:177` flat `<li><a>`; commit `4a4c220a` | Block-menu `wp_navigation` = Phase-3 (out of MVP scope) | — | none |
| 36-2 | Block+CPT+plumbing roster | — | **DONE** (roster exists) | Blocks present: nav-menu, nav-drawer, cart, product-search, filter-search, responsive-logo, business-info, social-icons; CPT `class-sgs-mega-menu-cpt.php`; store `src/shared/nav-interactivity/store.js` | Per-piece behaviours vary (rows below); roster itself complete | — | none |
| 36-3 | CPT model consistent w/ P2 | — | **PARTIAL** | CPT registered `class-sgs-mega-menu-cpt.php:100` (`show_in_nav_menus:true`, force-publish `:185`); loaded `sgs-blocks.php:332-333` | 5 starter-template layouts + picker + `templateLock:contentOnly` NOT built (0 hits); pack-factory unbuilt | SONNET | 36-5 |
| 36-4 | Desktop disclosure (dropdown+mega) | — | **NOT-BUILT** | `nav-menu/render.php:47-48` — "every submenu/mega-menu item collapses to ONE flat item… no dropdowns/mega this phase" | No `<button aria-expanded>` disclosure, no dropdown, no hover-intent/safe-triangle | SONNET | 36-7 |
| 36-5 | Mega CPT + native-menu association | — | **PARTIAL** | CPT + `resolve_panel_for_menu_item()` `:274` + force-publish + degrade-to-plain-link `:17,180`; commit `cc640511` | Real-position RENDER into bar NOT wired (0 hits in nav-menu render); inline `<ServerSideRender>` authoring not built; classic-attach spike unrun | SONNET | 36-3, 36-4 |
| 36-6 | Drawer — full-screen modal container | — | **PARTIAL** | `<dialog>` root + `showModal`, × close as FIXED CHROME sibling `render.php:273-281`; settings surface built: `drawerBg/toggleCloseColour/drawerAlign/drawerGap/drawerPadding/edge/width/submenuModel` (block.json) | "Show header" PER-ROW toggle NOT built (no attr); drill-down + `<details>` no-JS fallback wired-but-inert (`:111`) | SONNET | 36-7 |
| 36-7 | Shared nav plumbing utility | — | **DONE** (2 of 3 call-sites) | `store('sgs/nav')` `store.js:587`; D323 reparent `:106-120`; inert/focus/scroll-lock `:8`; call-sites nav-menu + nav-drawer | 3rd call-site (mega) pending Phase-2; D340 bounce compensation present in comments—verify at build | — | none |
| 36-8 | Responsive collapse + 3 modes + per-device vis | g:reuse built ext | **PARTIAL** | burger→drawer built (`render.php:243` burger + `drawerRef` `:216`); `collapsePoint` attr + non-device breakpoint `:484`; responsive-visibility ext + `labelCollapse` built | priority+"More" overflow + bottom-tab-bar modes NOT built; link-count notice NOT built | SONNET | 36-4 (overflow needs measure) |
| 36-24 | Per-device content + settings | — | **PARTIAL** | Responsive-Visibility ext (`extensions/responsive-visibility.js` + `includes/device-visibility.php`) BUILT; `labelCollapse` BUILT (business-info, button) | `lint-responsive-controls.py` structural gate NOT built (0 hits); tri-state = optional/deferred | PYTHON-SCRIPT (gate) | none |
| 36-9 | Nav→header decoupling | — | **PARTIAL** (MVP-adequate) | `--sgs-header-height` published `header-behaviours/view.js:70`; body classes `is-header-scrolled/shrunk` `:123` | Drawer partial-width binding to var "lands in Phase 2" (`nav-drawer/style.css:331`); full-screen modal (default) needs none → MVP OK | HAIKU | 36-6 |
| 36-9a | Referential integrity + orphan lifecycle | — | **PARTIAL** | Mega trashed→plain-link degrade + trash-lifecycle preserved `class-sgs-mega-menu-cpt.php:178-180` | Dangling-`drawerRef` editor Notice + admin "referencing items" notice + §8 integrity sweep NOT verified/built | SONNET | 36-5 |
| 36-10 | Disclosure vs dialog | — | **PARTIAL** | Drawer = native `<dialog showModal>` DIALOG contract built (`nav-drawer/render.php`) | Dropdown/mega DISCLOSURE contract not built (no dropdowns yet); cart/search auto-swap not built | SONNET | 36-4, 36-19, 36-20 |
| 36-11 | WCAG (2.1 AA + 2.2) | — | **PARTIAL** / live-DOM for full | `aria-current` client-side computed `nav-menu/view.js:43-48` (LiteSpeed-safe); accessible names on burger `render.php:243` + × `:280`; 44px burger `:481` | Full axe=0 on open drawer/mega, focus-not-obscured, forced-colors survival = live-DOM | UNVERIFIABLE-NEEDS-LIVE-DOM | 36-16 |
| 36-12 | Operator a11y feedback informational-only | — | **NOT-BUILT** | No link/column-count Notice in nav-menu/nav-drawer edit.js (0 hits) | Editor informational notices unbuilt (Nav Health = Phase 3 anyway) | HAIKU | none |
| 36-13 | No inline styling (Spec 32) | built+live 2026-07-20 | **DONE** | nav-menu emits scoped `#uid` `<style>` (`render.php` §4 css block); drawer block-private `<dialog>` documented D294 | AST no-inline gate pass = verify at build; code shows scoped serialisation | — | none |
| 36-14 | Control-completeness (Part L) | — | **PARTIAL** | nav-menu/nav-drawer edit.js + rich block.json attr sets; `<ServerSideRender>` preview pattern in use | Full Part-L completeness across the 5 utility pieces varies; `templateLock:contentOnly` unbuilt | SONNET | per-piece |
| 36-15 | Emittable / converter emit | deferred by design | **NOT-BUILT** (by design) | Spec: pipeline built AFTER nav; high-level only, no sub-design owed | Converter mega/nav emit path not written (Phase-2/3; NOT a Phase-1 blocker) | OPUS | 36-4,36-5 |
| 36-16 | Acceptance live-QC gate | — | **UNVERIFIABLE-NEEDS-LIVE-DOM** | §8: axe, elementFromPoint sweep, 375/768/1440, wp-perf-gate | Needs rendered DOM + Playwright + Bean's eye | UNVERIFIABLE-NEEDS-LIVE-DOM | all |
| 36-17 | Crawlable, schema-friendly, fast | — | **PARTIAL** | Bar/dropdown links server-rendered `<ul><li><a href>` no-AJAX `render.php:177,251`; `<nav aria-label>` | Mega-panel rich CONTENT crawl pending (no mega render yet); schema via seo-schema | HAIKU | 36-5 |
| 36-18 | Cutover for live production instances | MECHANISM PROVEN (D361) | **PARTIAL** (as recorded) | Session: canary Mama's re-authored `b41352fc`; Indus generic proof header #360 live | Real BRANDED Indus header deferred to Spec 33 Part 2 cloning; FR-37-21 deletion gated on real cutover | OPUS | 33-Part2 |
| 36-19 | Cart (extend) — header cart | Phase-1 badge fix | **PARTIAL** | `role="status"`+`aria-live=polite`+`aria-atomic` on badge `cart/render.php:205-207` (Phase-1 DONE) | Mini-cart preview/flyout/drawer + Store-API AJAX = Phase-2 build (unbuilt) | SONNET | 36-10 |
| 36-20 | Search (extend) — predictive combobox | Phase-2 extend | **PARTIAL** | Full combobox shipped: `role=combobox`+`listbox`+live region `product-search/render.php:227,269` | product-preview + displayModes + dimmed overlay extends = Phase-2 (unbuilt) | SONNET | 36-10 |
| 36-21 | Social icons (extend) | Phase-2 | **PARTIAL** | `rel="noopener noreferrer"`+`target=_blank`+`aria-label` `social-icons/render.php:355` | Auto accessible-name generation + one-source (header+footer+drawer) rendering = Phase-2 | SONNET | 36-25 |
| 36-22 | Logo (extend) — logo OBJECT | basics Phase-1 | **PARTIAL** (+open defect) | per-device desktop/tablet/mobile images `responsive-logo/render.php:41-43`, link-home `:47` | **DEFECT (spec §1):** falls back to `get_theme_mod('custom_logo')` `:60-65`, NOT site-info → different source than contact/social; lockup+favicon+variants Phase-3 | SONNET | 36-23 |
| 36-23 | Business-info / site-info store | Phase-2 | **PARTIAL** (MUST mostly DONE) | `Sgs_Site_Info` store + `tel:`/`mailto:` `business-info/render.php:110-131`; `sgs/site-info` binding `class-sgs-site-info-binding.php`; admin `class-sgs-site-info-admin.php` | live open/closed hours state, multi-location, utility-bar zone = SHOULD/Phase-2 | SONNET | none |
| 36-25 | Structured-data-once | Phase-3 explicit | **PARTIAL** | `source: site-info` binding partially present (social/business-info consume Site Info) | Fully-explicit single-source render across all placements + logo object = Phase-3 | SONNET | 36-21,36-22,36-23 |

## Summary counts

- **DONE:** 4 — FR-36-1, 36-2, 36-7, 36-13
- **PARTIAL:** 15 — FR-36-3, 36-5, 36-6, 36-8, 36-24, 36-9, 36-9a, 36-10, 36-11, 36-14, 36-17, 36-18, 36-19, 36-20, 36-21, 36-22, 36-23, 36-25 *(note: 17 PARTIAL rows — see table; 36-11 straddles PARTIAL/live-DOM)*
- **NOT-BUILT:** 3 — FR-36-4, 36-12, 36-15
- **UNVERIFIABLE-NEEDS-LIVE-DOM:** 1 (FR-36-16); FR-36-11 needs live-DOM for full closure

### Claimed-DONE that code does NOT fully support (flags)
- **FR-36-5** carries build-momentum implying done; the mega CPT + resolver are built but **panels are NOT rendered into the bar at all** — the headline "mega renders at real position" is structurally unbuilt. Treat as PARTIAL, not done.
- **Spec §8a build-note "the `sgs_mega_menu` CPT does NOT exist yet (build-new)"** is now STALE — the CPT is registered + loaded (`sgs-blocks.php:332`, commit `cc640511`). Correct the build-note.
- **FR-36-22** silently inherits the logo-source defect (custom_logo, not Site Info) — spec §1 flags it; code confirms `responsive-logo/render.php:60-65`.

## Suggested parallel-batch grouping for the /plan

**Foundation is done (Phase 1).** Remaining work orders as:

- **BATCH A (parallel, independent) — utility-piece extends, each own block, no cross-deps:**
  FR-36-19 (mini-cart), FR-36-20 (search extends), FR-36-21 (social one-source), FR-36-23 (site-info SHOULDs). All SONNET, disjoint files, run concurrently.
- **BATCH B (parallel, small/mechanical):**
  FR-36-12 (editor notices, HAIKU), FR-36-24 lint gate (PYTHON-SCRIPT), FR-36-9 drawer var binding (HAIKU). Independent.
- **CHAIN C (sequential — the mega spine):**
  FR-36-3 (starter templates/picker) → FR-36-4 (desktop disclosure/dropdown) → FR-36-5 (mega render at real position) → FR-36-10 (disclosure contract) → FR-36-8 (priority+/bottom-tab needs the disclosure primitive) → FR-36-17 (mega content crawl) → FR-36-9a (integrity sweep). SONNET; each depends on the prior. FR-36-6 "show header" toggle can slot in parallel to this chain (own block).
- **AFTER C passes gate-2:** FR-36-15 (converter emit) + FR-36-18 (real branded cutover) + FR-36-25 (structured-data-once explicit) — OPUS/Phase-3, gated on Spec 33 Part 2.
- **GATE-ONLY (cannot be coded, run last):** FR-36-16 + FR-36-11 full audit = live Playwright/axe pass + Bean's eye.
