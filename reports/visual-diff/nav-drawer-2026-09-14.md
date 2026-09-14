# Visual diff — sgs/nav-drawer — 2026-09-14

verdict: PASS
intent_capture_passed: true
source_sha: 804a8c2024799d5b

## What changed

D1060 (drawer colour defaults) Part A — `plugins/sgs-blocks/src/blocks/nav-drawer/block.json`
+ `render.php` (this block) + the shared `plugins/sgs-blocks/includes/nav-menu-submenu-css.php`
+ `nav-menu-submenu-link-css.php`:

1. `drawerBg` default changed from `primary` to `surface` (block.json `attributes.drawerBg.default`
   + `example.attributes.drawerBg`, and the PHP fallback in `render.php`).
2. The hardcoded drawer `color:inherit` rule (previously plain CSS, beating any client
   `itemColour` setting) is now wrapped in `:where(...)` — zero specificity, so a client's
   colour setting wins per D1060 ruling 4.
3. The drawer submenu panel's `background:` shorthand (which reset `background-image`, killing
   `submenuBgGradient`) is now split into `background-color:var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface, ...))`
   + `background-image:var(--sgs-nm-submenu-bg-gradient, none)`, and the hardcoded `padding:0`
   on that panel rule is removed.
4. `nav-menu-submenu-css.php`'s gradient fallback (I1) now also checks
   `'' === $sgs_nm_submenu_bg_source_gradient` before overwriting, so a client-set gradient
   survives the 2026-09-12 fallback; the mega-trigger reset (A3b) is scoped in `:where()`.

## Capture type: `intent_capture_passed`, not `first_paint_capture_passed`

The change is a set of colour/specificity DEFAULTS — there is no single static "before" screenshot
that isolates them from the surrounding drawer content. The real question is "does the default
now resolve to the `surface` token, and does a client override now win instead of losing to the
hardcoded rule" — answered by reading the live computed styles and the live lifted CSS text, not
by a pixel diff.

## Assertions (stated before measuring)

1. The live lifted CSS for the drawer submenu panel declares
   `background-color:var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface, ...))` — the
   `surface` token is the fallback, not `primary`.
2. The drawer's top-level `.sgs-nav-menu__link` colour rule is wrapped in `:where(...)` in the
   live CSS, so it carries zero specificity.
3. A drawer top-level item's computed `background-color` at rest is transparent
   (`rgba(0, 0, 0, 0)`), per D1060 ruling 2.
4. The drawer submenu panel rule no longer contains `padding:0` (only the pre-existing, unrelated
   list-reset rule in a different selector still sets it — out of scope for this change).
5. `background-image:var(--sgs-nm-submenu-bg-gradient, none)` is present on the panel rule (the
   gradient variable is no longer discarded by a `background:` shorthand).
6. `check-render-undefined-vars` (PHPStan level 1) passes clean on the touched render templates
   — no new undefined variable was introduced by the `:where()` rewrap.

## Live result (sandybrown canary, homepage `/`, 390×844 mobile viewport, transitions disabled)

1. **PASS** — live lifted CSS
   (`/wp-content/uploads/sgs-css/sgs-3603-6b2346f00597a2f20924dd611ac90c61.css`) contains:
   `.sgs-nav-drawer .sgs-nav-menu-4323aaf9 .sgs-nav-menu__submenu{box-shadow:none;min-width:0;
   border:0;background-color:var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface,
   color-mix(in srgb, currentColor 6%, transparent)));background-image:var(--sgs-nm-submenu-bg-gradient,
   none);border-radius:0;margin:0;}` — `surface` token confirmed as the fallback, `primary` gone.
2. **PASS** — live CSS contains
   `:where(.sgs-nav-drawer .sgs-nav-menu-4323aaf9 .sgs-nav-menu__subtoggle,...__link,...__caret svg){color:inherit;}`
   — zero-specificity wrapper confirmed present for both live nav-menu instances on the page
   (uids `4323aaf9` and `8f48dc13`).
3. **PASS** — Playwright, mobile viewport, drawer opened via burger click, transitions disabled
   before reading: `getComputedStyle(drawerLink).backgroundColor === 'rgba(0, 0, 0, 0)'`
   (transparent at rest).
4. **PASS** — grepped the panel rule text directly; no `padding:0` present in it. (A separate,
   pre-existing `.sgs-nav-menu__submenu{list-style:none;margin:0;padding:0;...}` list-reset rule
   still exists elsewhere in the sheet — this is the unwired `submenuPadding` control, tracked
   separately under D1060 ruling 7 / Step 2 scaffold, not part of this change.)
5. **PASS** — `background-image:var(--sgs-nm-submenu-bg-gradient, none)` present verbatim in the
   panel rule (see assertion 1's quoted rule).
6. **PASS** — `python scripts/check-render-undefined-vars.py --check` → `OK — no new undefined
   variables in any block render template (PHPStan level 1, 18 baselined)`.

## Negative control

Before the fix, the drawer's `color:inherit` rule was a plain (non-`:where()`) CSS rule beating
any client `itemColour` value at equal-or-lower specificity — this was the root cause D1060 set
out to fix (see `.claude/reports/2026-09-14-nav-menu-split-decisions-review.md`). The live rule is
now confirmed wrapped in `:where(...)`, which is the structural proof the fix is present, not just
absence-of-error.
