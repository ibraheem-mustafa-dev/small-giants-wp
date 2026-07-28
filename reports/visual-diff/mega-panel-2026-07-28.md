# Visual diff — mega-panel — 2026-07-28 (Gate-3 live verification)

Supersedes `mega-panel-2026-07-27.md` (`verdict: INCOMPLETE` — panel 1745 was empty,
nothing renderable). This run is against a POPULATED panel on a real page.

Fixture: canary page **1842** (`/gate3-mega-nav/`), panel **1745** (2 mega-groups +
aside, `staggerOnOpen:true`), menu **100** (Home · Brands(mega) · Recipes · Contact —
mega at position 2, NOT last). Three nav instances on the page (site header, page
body `Gate3`, drawer).

## Verified live (sandybrown, 2026-07-28, post-deploy, cache purged each run)

Every effect check named its OBSERVABLE SIGNAL from the effect module's own
`setProperty` contract BEFORE looking (D396 discipline):

| Effect | Signal | Result |
|---|---|---|
| Staggered reveal | `--sgs-stagger-delay/opacity` on groups/aside at open | **PASS** — 0ms/28ms/56ms, opacity 0→computed 1 settled; panel `y:-8px scale:.99→identity` |
| Sliding indicator | `--sgs-nav-indicator-x/-w`, transition incl. `width`, pure translate | **PASS** — x=68.83px w=101.17px, `transform,width,opacity` @.38s/.38s/.25s, radius 8px intact (no scaleX smear) |
| Magnet label | `--magnet-x` tracks pointer ±, resets on leave | **PASS** — +2.34px / −2.45px / 0px |
| Caret flip | computed transform none→matrix(-1,0,0,-1) | **PASS** — 180°, .3s |
| Cursor spotlight | `--mx/--my` track pointer; ::before radial re-centres | **PASS** — 19.76%/19.84% → 79.76%/79.78% |
| Card hover-lift (`cards` style) | `.sgs-mega-group` translateY(-3px); ::after shadow opacity 0→1 | **PASS** — matrix(1,0,0,1,0,-3), afterOpacity 0→1, transition `transform` only |

Also verified: `first_paint_capture_passed: true` for this scope — full-viewport
captures taken with the panel OPEN at 1440 (page nav + header nav) and 375 (drawer),
retained in the session scratchpad (`eye-1/2/3-*.png`) and shown to Bean.

## Defects FOUND + FIXED this run (all live-proven before and after)

1. **Panel anchored to its `<li>` → rendered 101×1371px (unusable sliver).** The
   drafts anchor a centred 1120px band. Fixed: wrap centres on the BAR
   (`left:50% / translateX(-50%) / width:min(1120px, 100vw − 56px)`), reposition
   pins to the bar edge on viewport overflow (`--sgs-mm-tx`). Measured after:
   **1120×451**, groups 345px side-by-side, aside 340px. Header-nav pin case:
   panel 93..1213 in a 1440 viewport.
2. **Open panel painted UNDER later content** (`.entry-content` and footer rows all
   carry z-index:1; later context wins) → hover hit-tested the footer → bridge
   mouseleave → close. THE "unhoverable mega" root cause. Fixed twice-over:
   site-header base `z-index:100` (matches sticky/transparent + the drafts) +
   an in-content `:has()` bump emitted per instance. Verified live on BOTH navs:
   400ms slow-diagonal hover into the panel survives; leaving closes.
3. **In-drawer mega OVERLAID the items below it.** Now `position:static;width:100%`
   inside a drawer — accordion push proven (Recipes y=152→1354).

## NOT closed — stated plainly

- **Drawer width**: the in-drawer panel inherits the drawer menu's 95px shrink-wrapped
  list (pre-existing drawer layout, `align-items:flex-start` on the drawer body) —
  content clips. Widening changes the verified drawer's look → **Bean's decision**,
  not silently changed.
- Bean's R-31-13 eye sign-off: pending (screenshot pair delivered this session).

verdict: PASS (code + live behaviour; R-31-13 eye sign-off pending)
first_paint_capture_passed: true
