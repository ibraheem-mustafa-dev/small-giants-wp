# Visual diff — nav-drawer — 2026-07-28 (seeded drawer nav defaults)

Change: `nav-drawer/edit.js`'s content TEMPLATE now seeds its `sgs/nav-menu`
child with vertical-appropriate defaults (`gap: 4px`, a 1px `border-subtle`
divider between items). Editor-side template only — no render.php, no CSS, no
markup change.

## Why

The drawer holds its OWN `sgs/nav-menu` instance — own uid, own scoped styles,
own inspector — so its menu was ALWAYS independently stylable from the header
bar. Verified live: page nav `sgs-nav-menu-4b7c46c9` vs drawer nav
`sgs-nav-menu-53a6fe97`. But the seeded copy rendered with identical defaults
to a horizontal bar, so nothing signalled to an operator that it was theirs to
change (Bean 2026-07-28). Seeding vertical-appropriate values makes the
capability discoverable and gives a sane stacked starting point. Colours are
deliberately left UNSET so the drawer's own background still shows through.

## Safety — D393 checked explicitly, not assumed

`useInnerBlocksProps` here passes `templateLock: false` (`edit.js:131`), so WP
applies the template ONLY to a genuinely empty container
(`shouldApplyTemplate = length === 0 || lock === 'all' || 'contentOnly'`). This
block is NOT in the D393 class: an existing drawer's children are never
re-applied or re-matched by array position, so no stored content can be
overwritten by this change. Confirmed live on the existing canary drawer
(created before the change): its items show `border-top: 0px` — i.e. the new
seed did NOT retro-apply, exactly as intended.

## Live verification (canary page 1842, 375px)

- Drawer closed → open: `open` false→true, height 0→780, 13 focusables.
- Drawer nav fills its width: drawer 375 / nav 330 / bar 330 (the round-2
  full-width fix, unregressed).
- Nav container controls unset ⇒ no visual change: `background rgba(0,0,0,0)`,
  `border-width 0px`.
- axe on the OPEN drawer: 0 violations (guarded run — see
  `nav-menu-2026-07-28.md`; a scoped axe on a CLOSED drawer passes vacuously).

verdict: PASS
first_paint_capture_passed: true
