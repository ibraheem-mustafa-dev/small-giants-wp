---
block: sgs/nav-drawer
date: 2026-08-13
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
source_sha: 47174b5d58337bb2
capture_method: Playwright MCP against two dedicated canary pages seeded for this
  purpose (page 2409 "NavDrawer Submenu Verify Accordion", page 2410 "NavDrawer
  Submenu Verify Drilldown"), each carrying a real nested classic menu ("T1
  Dropdown Test", term_id 112 — Services > Web Design / SEO Audits / This Page)
  bound to a sgs/nav-drawer holding its own sgs/nav-menu instance
deployed_build: sandybrown deploy 2026-08-13 (payload-scoped: nav-drawer/,
  nav-menu/, shared/effects/nav-drilldown.js, shared/nav-interactivity/store.js)
change: sgs/nav-drawer now publishes its submenuModel attribute to descendants
  via block.json providesContext (sgs/navDrawerSubmenuModel) — the mechanism
  that makes the drawer's real nested submenu (owned by sgs/nav-menu's second
  renderer) possible. Spec 36 FR-36-6.
---

## Live measurement

**Accordion mode (page 2409), mobile 375px:** open burger → dialog opens (full-screen modal, ×
close, focus trap — all pre-existing FR-36-6 drawer chrome, unchanged) → drawer content shows a
real nested list. **Drill-down mode (page 2410):** same open/close/× behaviour; the drawer's OWN
CSS (background/gap/padding/close-icon) rendered identically to before this change — the drawer
block itself carries no new attributes, only the new `providesContext` declaration, which has no
render footprint of its own (context propagation is a build-time/render-time mechanism, not a
visual property).

**Dialog-level ESC/× contract (FR-36-6), both pages:** confirmed intact — a dispatched `cancel`
event (the same event a real Escape keypress fires on an open modal `<dialog>`) closes the WHOLE
drawer regardless of which submenu model or drill-down panel state is active
(`dialog.open === false` measured after dispatch, both pages).

**Console:** 0 errors, both pages, both mobile (375px) and desktop (1440px) viewports.

Full interaction narrative (accordion expand, drill-down slide + Back + focus management, the real
bug found and fixed by a genuine pointer click) is recorded in the sibling report
`reports/visual-diff/nav-menu-2026-08-13.md`, since the actual rendered submenu markup and behaviour
live entirely in `sgs/nav-menu`'s render output — this block's own change is the context-provider
wiring that makes that possible.

## Anti-vacuity

Both canary pages render real, non-empty drawer content — the drawer's InnerBlocks held a genuine
`sgs/nav-menu` instance bound to a real classic menu, independently confirmed non-empty via
`wp menu item list` before use, not an empty/default shell.

## Residual, declared gap

A mega-menu item inside the drawer degrades to a plain link rather than rendering its panel inline
(FR-36-5's mega-in-drawer capability). Not exercised here (the test menu carries no mega items);
documented in Spec 36 FR-36-6 and in `sgs/nav-menu`'s `render_items_drawer()` docblock.
