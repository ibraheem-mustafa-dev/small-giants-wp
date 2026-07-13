---
block: sgs/mobile-nav
date: 2026-07-13
change: P0 drawer-bug fix (unclickable mobile-nav drawer)
verdict: PASS
first_paint_capture_passed: true
site: sandybrown-nightingale-600381.hostingersite.com (canary)
files_changed:
  - plugins/sgs-blocks/src/blocks/mobile-nav/view.js
---

# Visual-diff / verification — sgs/mobile-nav drawer fix (P0)

## Change
`view.js` `init()` now re-parents `#sgs-mobile-nav` to `<body>` (sibling of `.wp-site-blocks`) before any open. **No visual/markup change** — the drawer renders identically; the DOM parent moves so the background-freeze (`inert` on `.wp-site-blocks`) no longer disables the drawer's own subtree.

## Root cause (proven live, controlled A/B)
The drawer opened but every link/button was unclickable (`elementFromPoint` → `BODY`). The open handler set `inert` on `.wp-site-blocks` to freeze the background for the modal — but the drawer was a **descendant** of `.wp-site-blocks`, so `inert` disabled the drawer too. The Popover top-layer paints it (looks open) but `inert` follows the DOM tree, not the paint tree. A/B: removing `inert` restored clickability.

## Fix verification (live, 375×812, after deploy + OPcache + LiteSpeed + CDN purge)
Served JS: `view.js?ver=61dfcc36947957ed4151` (new content-hash).

| Check | Before | After |
|---|---|---|
| Drawer re-parented to `<body>` | no (inside `.wp-site-blocks`) | **yes** (`parentIsBody: true`) |
| Drawer opens | yes | yes |
| On-screen links reachable (`elementFromPoint`) | **0/15 (all → BODY)** | **15/15 reachable** (`allReachable: true`) |
| Background frozen while open (`inert`) | yes | **yes (preserved)** |
| ESC closes | yes | **yes (no regression)** |
| `inert` removed on close | yes | **yes** |

Sample reachable elements after fix: Close menu, Cart, Checkout, nav items — all hit-test to themselves.

## First-paint capture
`mobile-nav-drawer-fix-2026-07-13-open.png` — open drawer, links visible + verified interactive.

## Scope note
Pure JS behaviour fix to an existing block; no markup, CSS, or block.json change. Not a design change. Verified on the real homepage per STOP-21 (deploy + full cache clear before measuring). Part of the approved Header/Footer/Nav system design-gate, phase P0.
