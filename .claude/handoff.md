---
doc_type: handoff
project: small-giants-wp
generated: 2026-07-13
session: D326 — sgs/adaptive-nav SHIPPED; core/navigation replaced; WC block-hooks injection gone by construction
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
