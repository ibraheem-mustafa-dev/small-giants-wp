---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-13
session: D326 — sgs/adaptive-nav SHIPPED; core/navigation replaced; WC block-hooks injection gone by construction
---

# Session Handoff — 2026-07-13 (D325 — Track B: footer + business-info + Tier-1 pipeline)

> Parallel footer track (ran alongside Track A's D326 adaptive-nav on the same working tree). Track A's D326 handoff is preserved below. The shared next front (FR-S9-6) is in `next-session-prompt.md`.

## Completed This Session
1. **P3 `sgs/site-footer` + dedicated `sgs/site-footer-row` SHIPPED + live** (FR-S9-3). Grid columns collapse 3→1 at mobile (explicit `gridTemplateColumnsMobile:"1fr"` — an explicit base ratio suppresses the `sgs-cols-mobile-1` shorthand, D228). Empty-row zero-output, `<footer>` landmark, no inline styles. `footer.html` → ≤3-line `wp:pattern` delegation (FR-S1-2); `sgs_footer` CPT template lock added. Commits `944dad03`+`5ae5bfaf`.
2. **Business data via `sgs/business-info` block, not bindings (Bean steer).** Added 8 draggable inserter VARIATIONS (Phone/Email/Address/Opening Hours/Social Links/Copyright/Tagline/Map), each reading live from Site Info. Footer rewired off `sgs/site-info` paragraph bindings onto the block. Commit `3015add4`.
3. **Fixed the `sgs/site-info` binding source (3 pre-existing latent bugs it had NEVER worked through):** never-called boot; invalid `can_user_edit_value` arg (WP rejects the whole registration → returns false); `array $block` type-hint on `get_value` (WP passes `WP_Block` → TypeError → HTTP 500, caught live, fixed). Kept as an alternative channel. Commit `5ae5bfaf`.
4. **`sgs/cart` `hideWhenEmpty` toggle** (`a6c08ff3`) + **`Org_Website_Schema` `sameAs`+`contactPoint`+address from Site Info** (`66ecd8d3`).
5. **Tier-1 pipeline business-info auto-fill (Bean ask):** `scripts/sync-business-info.py` extracts high-confidence fields (email `mailto:`/phone `tel:`/socials known-domain/copyright `©`) from a draft → POSTs to the NEW capability-gated `POST /sgs/v1/site-info` (`class-sgs-site-info-rest.php`, `edit_theme_options`, key-allowlisted, **fill-if-empty — never overwrites**). Live-verified on sandybrown. Commit `d1b688b9`.
6. **Wired Tier-1 to run AUTOMATICALLY in the pipeline (Bean ask, mid-handoff):** `orchestrator/upload_and_patch.py` now runs `sync-business-info.py` at the Part-1 deploy moment (Spec 33 FR-33-14 companion), same `--client`+push gating as the theme-snapshot push, NON-FATAL. Static-verified (compiles + draft glob resolves); full-pipeline run pending a real `/sgs-clone`.

## Current State
- **Branch:** `main` — footer/cart/schema/binding/business-info/Tier-1 at `c5903c7a` (+ pipeline-wiring + these doc updates pending this handoff's commit).
- **Tests:** no suite; `npm run build` passes all prebuild gates. `php -l` clean on all new PHP.
- **Build:** passes. **Deploy:** all live on sandybrown; site healthy (200 after a brief self-inflicted 500 from the binding type-hint, fixed same-session).

## Known Issues / Blockers
- **Tier-2 business-info (tagline/address/hours — semantic guesses) is OPEN** — needs a review-not-auto-write flow (parallels Spec 33 FR-33-5 advisory Pass B).
- **Tier-1 pipeline wiring is static-verified only** — a full `/sgs-clone` integration run hasn't exercised the `upload_and_patch.py` business-info block end-to-end.

## Next Priorities (in order)
1. **Shared FR-S9-6 responsive-override engine** (the joint next front — see Track A's D326 handoff + `next-session-prompt.md`; footer + header + nav are all flat-tier).
2. **Tier-2 business-info review flow** (tagline/address/hours suggestions the operator confirms).
3. **Full-pipeline `/sgs-clone` run** to exercise the auto business-info fill end-to-end.

## Files Modified
| File | What changed |
|------|-------------|
| `plugins/sgs-blocks/src/blocks/site-footer/*` + `site-footer-row/*` (NEW) | The footer block pair (grid columns) |
| `plugins/sgs-blocks/src/blocks/business-info/block.json` | 8 per-type inserter variations |
| `plugins/sgs-blocks/src/blocks/cart/*` | `hideWhenEmpty` toggle |
| `plugins/sgs-blocks/includes/class-sgs-site-info.php` | `known_keys()` + `build_sanitisers()` refactor |
| `plugins/sgs-blocks/includes/class-sgs-site-info-binding.php` | 2 registration-fatal bugs fixed |
| `plugins/sgs-blocks/includes/class-sgs-site-info-rest.php` (NEW) | Capability-gated `POST /sgs/v1/site-info` |
| `plugins/sgs-blocks/includes/class-org-website-schema.php` | `sameAs`/`contactPoint`/address from Site Info |
| `plugins/sgs-blocks/sgs-blocks.php` | Boot binding source + REST endpoint |
| `plugins/sgs-blocks/scripts/sync-business-info.py` (NEW) | Tier-1 extractor + push |
| `plugins/sgs-blocks/scripts/orchestrator/upload_and_patch.py` | Auto-run Tier-1 at Part-1 deploy |
| `theme/sgs-theme/{parts/footer.html,patterns/framework-footer-default.php,style.css}` | Footer wiring (business-info blocks) |
| `.claude/{decisions,plans/2026-07-13-header-builder-remaining-work}.md` + `specs/{17,33}.md` + `docs-registry.yaml` | Doc reconciliation |

## Notes for Next Session
- **`sgs/site-info` binding lesson (memory `verify-block-binding-registration-on-live-registry`):** a WP binding source that "exists" in code can be entirely dead — verify on the LIVE registry, never pass `can_user_edit_value` (invalid in WP core), and `get_value` param 2 is a `WP_Block` not `array`.
- **Grid mobile-collapse gotcha:** an explicit base `gridTemplateColumns` suppresses the `sgs-cols-mobile-N` shorthand (D228) — mobile collapse needs an explicit `gridTemplateColumnsMobile`.
- **Business data flows ONLY through Site Info** now (block variations + schema + the Tier-1 REST fill all read/write the one store) — no hardcoded client data anywhere.

---

# Session Handoff — 2026-07-13 (D326)

## Completed This Session
1. **Built + shipped `sgs/adaptive-nav`** (Spec 17 §S9 / FR-S9-4) — the SGS navigation block. Using it in the header IN PLACE OF `core/navigation` removes the anchor WooCommerce hooks its mini-cart + customer-account onto, so the stray-injection (D324 root-cause) stops **by construction** — no filter. Commit `fbd93308` on `main`, pushed.
2. **Shared `SGS_Nav_Menu_Source`** (`includes/class-sgs-nav-menu-source.php`, NEW) resolves ONE `wp_navigation` menu that drives BOTH the desktop bar AND the `sgs/mobile-nav` drawer (drawer's `get_nav_blocks()` delegates to it; page-list synthetic fallback for bar↔drawer parity). Live-proven: the drawer renders the SAME menu as the bar.
3. **`SGS_Adaptive_Nav_Renderer`** (`includes/class-sgs-adaptive-nav-renderer.php`, NEW) server-renders every link as real `<a href>` (crawlable + AI-visible; **no AJAX lazy-load**). Submenus → CSS-hidden mega-panels using the ARIA APG **disclosure** pattern (not `role=menu`). No `SiteNavigationElement` schema (research-backed).
4. **render.php owns the collapse tier** (single source of truth) — emits scoped breakpoint rules for the bar AND the header burger, replacing the two fixed hacks removed this session (`site-header/style.css` 768px nav-hide + `mobile-nav-toggle/style.css` 782px rule). view.js: overflow → "More" disclosure + Cluster never-overflow base (`flex-wrap:wrap` + `min-width:0`).
5. **LIVE-VERIFIED on sandybrown** (caches cleared, theme 1.5.12): WC mini-cart + customer-account GONE, `core/navigation` gone, 7 crawlable links + submenu, collapse tier correct 320-1440, header never overflows (an overflow probe confirmed all page overflow is the accepted testimonial slider, `inHeader:false`), cart 44px, drawer opens (P0 re-parent intact) from the SAME source, mega-panel disclosure works, 0 console errors. 3 reports at `reports/visual-diff/` (adaptive-nav / mega-menu / mobile-nav-toggle, verdict PASS).
6. **3 live-QC bugs caught + fixed (STOP-21):** view.js `insertBefore` DOMException; the More overflow measured the list's own overflowing width (fixed → `nav.clientWidth`); the subagent's `.sgs-adaptive-nav__nav{display:contents}` stretched the header to 2763px (fixed with the Cluster constraint).
7. **DB registered** `sgs/adaptive-nav` = layout / content-block (sync `EXPECTED["layout"]` + seed INSERTS + `/sgs-db` verified). `sgs/mega-menu` re-parented to allow `sgs/adaptive-nav`. Decisions D326 + state + parking (`P-ADAPTIVE-NAV-P2B` + `P-DRAWER-MOVABLE-OVERFLOW-DROPZONE`), commit `a661eb2a`.

## Current State
- **Branch:** `main` at `a661eb2a` (docs) — code at `fbd93308`.
- **Tests:** no suite run; `npm run build` passes all prebuild gates (dead-control, F3, cheat-gate, box-family, conformance).
- **Build:** passes.
- **Uncommitted changes:** parking.md (this exchange's `P-DRAWER-MOVABLE-OVERFLOW-DROPZONE` + the FR-S9-6 correction) — commit pending in this handoff.
- **Deploy:** adaptive-nav LIVE on sandybrown; a representative `wp_navigation` menu (id 1467) exists on the canary so the header shows a real menu.

## Known Issues / Blockers
- **The FR-S9-6 responsive-override model was NEVER built by either track** (ground-truth checked: all 5 row/nav blocks are flat-tier, `object-model=0`). The footer track deferred it too. So it's a FRESH shared build, not a copy — the next-session front.
- Ground-truth-check discipline: my earlier note "adopt the footer track's shared engine" was a false premise (corrected in parking) — verify on-disk before assuming a parallel track built something.

## Next Priorities (in order)
1. **Build the shared FR-S9-6 `{desktop,tablet,mobile}` responsive-override engine ONCE** + wire `sgs/site-header-row` + `sgs/site-footer-row` + `sgs/adaptive-nav` to it (all identical flat-tier now — build-once, no divergence). Do NOT `ksort` the shared-wrapper uid.
2. **P2b polish** (`P-ADAPTIVE-NAV-P2B`): drawer accordion→drill-down animation; `sgs/mega-menu` `role=menu`→disclosure alignment.
3. **Movable drawer overflow drop-zone** (`P-DRAWER-MOVABLE-OVERFLOW-DROPZONE`, FR-S9-8): a freely-positionable marker the operator places anywhere in the drawer; the nav menu renders there. Desktop keeps its "More" dropdown.

## Files Modified
| File | What changed |
|------|-------------|
| `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php` (NEW) | Shared one-menu resolver (bar + drawer) |
| `plugins/sgs-blocks/includes/class-sgs-adaptive-nav-renderer.php` (NEW) | Desktop bar renderer (APG disclosure mega-panels) |
| `plugins/sgs-blocks/includes/class-mobile-nav-renderer.php` | `get_nav_blocks()` delegates to the shared resolver |
| `plugins/sgs-blocks/src/blocks/adaptive-nav/*` (NEW, 8 files) | The nav block (block.json/render.php/edit.js/save.js/view.js/style.css/editor.css/index.js) |
| `plugins/sgs-blocks/src/blocks/site-header/style.css` + `mobile-nav-toggle/style.css` | Removed the 2 fixed collapse hacks (adaptive-nav owns the tier) |
| `plugins/sgs-blocks/src/blocks/mega-menu/block.json` | Re-parent: allow `sgs/adaptive-nav` |
| `theme/sgs-theme/parts/header.html` + `patterns/framework-header-default.php` | Swap `core/navigation` → `sgs/adaptive-nav` |
| `plugins/sgs-blocks/scripts/{seed-composition-roles,sync-container-wrapping-blocks}.py` | Register adaptive-nav (committed with D325) |
| `reports/visual-diff/{adaptive-nav,mega-menu,mobile-nav-toggle}-2026-07-13.md` (NEW) | Live-QC reports (verdict PASS) |
| `.claude/{decisions,state,parking}.md` | D326 + P2b/drop-zone parking |

## Notes for Next Session
- **The footer track (D325) runs in parallel on the SAME working tree** — its commits can sweep your uncommitted edits to shared files (it swept my seed/sync/theme edits into D325). Commit path-scoped, promptly.
- **`nav.clientWidth` is the constrained-width reference** for overflow measurement (the list's own width is the overflowing content width — useless). The bar uses a Cluster base (`flex-wrap:wrap` + `min-width:0`) so it never overflows even without JS.
- **Whole-page `scrollWidth` is polluted by the testimonial slider** (off-screen carousel slides, a known accepted exception). Measure per-element `inHeader` to judge the header's own overflow, not the page's.
- A representative `wp_navigation` menu (id 1467) is on the canary; the framework-default header markup carries NO `ref` (each install uses its own menu via the resolver fallback).

## Next Session Prompt
See `.claude/next-session-prompt.md` (orchestration plan for the shared responsive-override engine).
