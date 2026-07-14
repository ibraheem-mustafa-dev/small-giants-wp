---
report: FR-S9-9 — 3 header behaviours as no-code block-inspector controls + theme-system retirement
block: sgs/site-header
date: 2026-07-14
verdict: PASS
first_paint_capture_passed: true
---

# FR-S9-9 — header behaviours (sticky / transparent-on-scroll / shrink) + contrast-safe, no-code

## What changed
Added 4 attrs to `sgs/site-header` (`headerSticky`, `headerTransparent`, `headerShrink`, `contrastSafe`
enum none|scrim|shadow|force-solid) + a "Header behaviour" ToolsPanel in the block inspector (Settings tab).
A new bridge `Sgs_Header_Behaviours::resolve_active_header_behaviour()` reads those attrs off the active
header template part (via the existing `SGS_Nav_Menu_Source::get_header_content()` DB-first resolver) at
`body_class` time and emits INDEPENDENT flag classes (`sgs-header-behaviour-sticky/-transparent/-shrink/
-contrast-{mode}`). view.js toggles `is-header-scrolled` (transparent) + a new independent `is-header-shrunk`
(shrink). header-behaviours.css rewritten to independent-flag selectors + a scroll-driven shrink
(`animation-timeline: scroll()` + class fallback, never writing `--sgs-header-height`) + contrast-safe scrim.

**RETIRED the parallel theme-side header-mode system** (D330): `theme/sgs-theme/inc/class-header-behaviour.php`
+ `header-behaviour.js` + `header-modes.css` + `header-editor-panel.js` deleted; functions.php registration +
enqueue removed; the mode-specific rules stripped from `core-blocks-critical.css`. This removes the duplicate
`--sgs-header-height` publisher + competing `position` rules the qc-council flagged. Plugin 0.1.2→0.1.3;
theme 1.5.15→1.5.16.

## qc-council (2 cross-model raters) — pre-build, NO-GO-as-scoped → corrected
The council caught: (a) the hidden theme-side system (forced the retirement into this build); (b) a
`--sgs-header-height` CSS-write race (→ scroll-driven shrink instead); (c) `text-shadow` isn't WCAG-conformant
(→ scrim/force-solid are the contract modes); (d) scrim needs `pointer-events:none` + z-index; (e) shrink needs
its own state class; (f) literal attr keys for the dead-control guard. All corrections applied.

## Live evidence (sandybrown, full cache clear incl. Hostinger CDN, plugin ver 0.1.3)
- **Bridge:** `headerSticky:true` on the block → body carries `sgs-header-behaviour-sticky` (attr→class proven);
  test config `headerTransparent+headerShrink+contrastSafe:scrim` → all 3 independent flags emitted.
- **Sticky:** `position:sticky`, header pinned at `top:0` after 400px scroll. `--sgs-header-height:121px`
  (ONE publisher — plugin view.js), `scroll-padding-top:121px` (WCAG 2.4.11).
- **Transparent:** `position:absolute`, `background:rgba(0,0,0,0)` at rest → `rgb(251,243,220)` (surface) after
  scroll; `is-header-scrolled` toggled by view.js.
- **Shrink:** `is-header-shrunk` toggled by view.js; header `padding-top` reduced to 0 on scroll.
- **Contrast-scrim:** `::before` `content:""`, `pointer-events:none`, gradient background, `position:absolute`,
  `inset:0` (renders over the header, clicks pass through).
- **Theme retirement:** old `header-behaviour.js` = 0, `header-modes.css` = 0 in served HTML (no double
  publisher / no competing rules).
- **Console:** 0 errors. **Overflow:** `scrollWidth ≤ innerWidth` (no overflow).
- **Shipped default:** `headerSticky:true` (sticky is the modern standard; operators change per-block in the
  inspector). No inline `style=""` for behaviour state (all via body class → CSS custom-property / class flip).

## Build gates
dead-control guard 0 net-new (literal attr keys consumed by the includes/ resolver); control-ux clean;
webpack compiled; conformance/F5 gates pre-existing-only; box-family guard pass. HeaderBehavioursTest.php
rewritten to 13 multi-flag tests (PHPUnit not runnable in-env — no vendor/composer — logic hand-traced).

## Deferred / parked (not blocking)
- `tools/recogniser/*.py` hardcodes the OLD single-slug header-behaviour shape + writes a `sgs_header_rules`
  option the plugin no longer reads → belongs to **Spec 33 Part 2** (header/footer clone pipeline, which must
  write block attrs). Parked, not in scope this session.
- The 3 inert alt-header template-part stubs (header-sticky/transparent/shrink.html + patterns) re-embed the
  default (no behaviour) → operator-confusing but non-conflicting. Parked for a theme.json cleanup.
- Editor UI is build-verified (block.json attrs + ToolsPanel + dead-control-guard pass) + attr-round-trip
  proven via the live bridge; a full Site-Editor click-through of the toggles is a light follow-up.

## Verdict
PASS — all 3 behaviours + contrast-scrim work no-code via the block inspector, driven by the plugin body-class
layer; the parallel theme system is retired (single publisher); 0 console errors; no inline style.
