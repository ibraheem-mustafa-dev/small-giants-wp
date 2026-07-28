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

## Round 2 — Bean's eye findings (same day), all fixed + re-measured

1. **Off-centre (Bean-caught):** the "centre on the bar" CSS never worked — every
   `.sgs-nav-menu__item` is `position:relative` (needed for the indicator), so
   the wrap's containing block was the ~100px MENU ITEM; the centred rect always
   overflowed and edge-pinned to the item (screenshot 1 left-glued, screenshot 2
   right-glued). Fix: geometry moved to JS (`repositionPanel` — the panel can
   only ever open with JS), centred on the **viewport** (bar-centred was tried
   first and measured still lopsided, 28px vs 292px, because the bar shrink-wraps
   off-centre; the drafts centre on the header container = viewport).
   **Measured after: 160px/160px at 1440 on BOTH navs; 28px/28px at 1100.**
   Hover safety re-verified after the geometry change (slow diagonal survives on
   both navs).
2. **Floating "View all Brands" (Bean-caught):** the CF-15 viewall link rendered
   as a bare line above the panel chrome. Now SUPPRESSED whenever the panel
   contains an `sgs/button` (every aside starter does) — the panel's own CTA is
   the destination affordance; a button-less panel keeps the crawlable fallback,
   rendered after the panel body. Deliberate CF-15 deviation (Bean ruling): the
   viewall is no longer "the first link inside the panel".
   Fixture aside button set to "View all Brands" → /brands/.
3. **Drawer width (Bean ruling — architecture, not a cap):** the drawer menu now
   FILLS available width (`width:100%` + `align-items:stretch` in drawer
   context). Measured: bar/nav/panel all 330px in a 375 drawer (was 95px,
   content clipping). Full-width items, labels at the natural left edge.

verdict: PASS (round-2 fixes measured; R-31-13 sign-off pending on the new trio)

## Round 3 — Bean's eye, four draft-fidelity defects (all measured before + after)

Geometry from round 2 SIGNED OFF by Bean ("The 3 screenshots all look good") —
R-31-13 met for centring, view-all removal and drawer width.

| # | Finding (Bean) | Measured BEFORE | Root cause | Measured AFTER |
|---|---|---|---|---|
| 1 | "no border/outline ... even though the Indus draft has one" | border WAS present: `1px solid rgba(58,46,38,0.12)` | not absent — 12% alpha is below the perceptual floor on a light panel | `0.22` alpha, reads as the draft's hairline |
| 2 | headings "look like general h2 tags", draft's are label-like | `H2, 36px, weight 700, Fraunces serif, no transform` | BUILD-SPEC §3's eyebrow spec was **never built** — the only rule targeting `$heading_sel` was the headings-OFF hidden case | `11px / 500 / uppercase / 1.54px tracking / ui-monospace / muted / mb 16px` = the drafts' exact values |
| 3 | "both headings touch the top ... and the left side of the panel" | `padding: 0px` (aside had 24px) | **STOP-D328 shape bug**: `panelPadding` default was the SCALAR `{desktop:'28px'}` but render.php emits it with `box => true`, which reads four sides → silently dropped | `padding: 24px`; group x 161→185, y 222→246 |
| 4 | separator "barely visible" + aside same colour as panel | aside `background: rgba(0,0,0,0)` (identical to panel), separator 1px @ 12% | aside never adopted the `--sgs-mm-card` role the drafts give it; separator inherited the same invisible alpha | bg `rgba(255,255,255,.6)`, radius 12px, separator `2px` accent @45% |

**1b — the "View all" fallback (Bean ruling, supersedes my round-2 fix).**
Round 2 suppressed it when a CTA exists but left the no-CTA fallback rendering
AFTER the panel — still OUTSIDE the panel's border, and in the header nav it
was overlapped by the trigger's hover underline. Bean: *"this 'accessible'
fallback should not ever be outside of the mega menu. It's not accessible that
way anyway."* Correct now: `sgs/mega-panel` exposes an
`sgs_mega_panel_footer_html` slot; `sgs/nav-menu` registers it immediately
before that panel's `do_blocks()` and removes it straight after (so it cannot
leak into the next mega item), and the CTA test reads the panel's STORED
`post_content` for a `wp:sgs/button` marker — checkable BEFORE render, unlike
the rendered-HTML test it replaces. Live: `viewallOutsidePanel: false`,
`viewallInsidePanel: false` (this fixture's panel HAS a CTA, so it is correctly
suppressed entirely); the aside button reads "View all Brands".

verdict: PASS (round-3 measured; Bean's eye on the round-3 crop pending)
