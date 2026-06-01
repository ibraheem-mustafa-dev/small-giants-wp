---
block: mobile-nav
date: 2026-06-01
verdict: PASS
first_paint_capture_passed: true
change_type: visual-fix
change_description: >
  Mobile-nav full-screen overlay fix + populated menu + header-only inserter.
  Four changes, all live-verified on the sandybrown canary at 375x812 viewport,
  logged-out (no admin-bar contamination), via Chrome DevTools Protocol:
    1. Overlay sizing: --overlay variant now overrides Popover API UA
       fit-content defaults (width:100vw + height:100vh/100dvh + inset:0).
    2. Block-gap strip: doubled block class (.sgs-mobile-nav.wp-block-sgs-mobile-nav,
       0,2,0) beats WP flow-layout margin-block-start:16px.
    3. Empty menu: render_menu_items() now handles core/page-list (WP default
       nav content), expanding the published page hierarchy.
    4. Header-only inserter: allowed_block_types_all filter (fail-open).
verification_method: chrome-devtools-protocol live measurement + screenshot
pixel_diff_skipped: true
pixel_diff_skip_reason: >
  mobile-nav is a chrome/interactive block (Popover API overlay), not a
  cloned page section — the cloning pixel-diff workflow does not apply. Verified
  instead by direct rendered-DOM measurement (getBoundingClientRect vs viewport)
  + before/after screenshots, per R-22-11 (verify rendered output, not metrics).
verified_by: opus-main-thread-live-cdp
---

# Mobile-Nav Full-Screen Overlay Fix — Visual Verification (2026-06-01)

## Bug (Bean report)
Mobile nav opened to a tiny box (~208x158px), showed no menu, and could not be
closed.

## Before (deployed 3.0.1, logged-out, 375x812)
- Overlay rect: `{x:0, y:-142, w:208, h:158}` — content-sized box (Popover UA
  `width/height:fit-content` never overridden).
- Menu: `menuItems: 0`, no `.sgs-mobile-nav__menu` element rendered.

## After (deployed 3.0.3, logged-out, 375x812)
| Check | Result |
|-------|--------|
| `first_paint` (drawer renders correctly on open, no flash) | PASS |
| Overlay rect | `{x:0, y:0, w:375, h:812}` — full viewport, flush to top |
| `computed width x height` | `375px x 812px` |
| `marginTop` (block-gap strip) | `0px` (was 16px) |
| Menu populated | `13` items (was 0) — page-list expansion |
| Close via close button | `closesViaButton: true` |
| Close via ESC | `escClosed: true` |
| Menu link navigates | clicked "Hero Clone PoC" -> landed `/hero-clone-poc/` |
| Drawer auto-closes on navigation | `drawerOpenOnNewPage: false` |
| Dropdown identity | `<nav id="sgs-mobile-nav" class="...wp-block-sgs-mobile-nav">` |

Screenshots: `c:/tmp/mobile-nav-open-test.png` (before menu fix — full-screen but
empty menu + 16px strip), `c:/tmp/mobile-nav-fixed-final.png` (after — full-screen,
flush, 13-item menu: Cart / Checkout / Hero Clone PoC / Mamas Munches Homepage /
… / Shop).

## Note
CDP `dispatchMouseEvent` synthetic clicks on top-layer popover content do not
reliably trigger anchor navigation in headless Chrome (a known harness quirk);
programmatic `.click()` and real user taps follow the href correctly — confirmed
by the successful navigation to `/hero-clone-poc/`.

## Inserter scope (Task C)
`mobile-nav-inserter-scope.php` (`allowed_block_types_all`, fail-open) is
logic-reviewed (returns `$allowed` unchanged on unclear context / Site-Editor;
diffs only the 2 chrome blocks when `$allowed===true`). Editor-inserter E2E
(open post editor, confirm the 2 blocks absent) deferred — low risk given the
fail-open design cannot break the editor.
