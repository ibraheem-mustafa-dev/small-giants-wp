---
block: brand-strip
date: 2026-07-17
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff / DONE-checklist — sgs/brand-strip no-inline migration — 2026-07-17

Bringing `sgs/brand-strip` to the locked block-migration DONE standard
(`.claude/plans/block-migration-DONE-checklist.md`), on top of the
already-uncommitted feature additions (imageEffect, showNames, per-logo
link/name, logoGap, tileBorder*, tileShadow; greyscale attribute removed as
unused, confirmed correct by Bean).

## What changed

1. **`pauseOnHover` editor control (new, D-pending)** — block.json boolean
   attr (default `true`); `edit.js` ToggleControl inside the "Infinite
   scroll" panel; `render.php` emits `sgs-brand-strip--no-pause` on the root
   when `false`; `view.js` gates the mouseenter/mouseleave pause listeners
   behind the absence of that class.
2. **Live bug found + fixed while verifying #1: pause-on-hover never
   actually worked.** `.sgs-brand-strip__track--paused { animation-play-state:
   paused; }` is a single-class selector (specificity 0,1,0). It was losing
   the cascade to `.sgs-brand-strip--scrolling .sgs-brand-strip__track--ready
   { animation: … infinite; }` (0,2,0), whose `animation` SHORTHAND resets
   every unspecified sub-property — including `animation-play-state` — back
   to its initial value ("running") whenever it wins. Proven live: the class
   toggled correctly (JS was fine) but `getComputedStyle(track)
   .animationPlayState` stayed `"running"` with `.sgs-brand-strip__track--
   paused` present. Fixed at source: the paused selector is now
   `.sgs-brand-strip--scrolling .sgs-brand-strip__track--ready.sgs-brand-
   strip__track--paused` (0,3,0), guaranteed to win. Re-verified live:
   `animationPlayState` now reads `"paused"` on hover, `"running"` on
   mouseleave.
3. **Logo-name caption typography controls (new)** — `nameFontSize` +
   `nameFontSizeUnit`/`Tablet`/`Mobile` + `nameFontWeight` (shared
   `TypographyControls` component, prefix `name`) + `nameColour`
   (`DesignTokenPicker`), gated behind "Show logo names". Replaces the
   previously fixed `0.8125rem` `.sgs-brand-strip__name` default — clients
   can now set/override it per element and per device tier. `style.css`'s
   literal became `font-size: var(--sgs-name-font-size, 0.8125rem)` (the
   `check-hardcoded-render-defaults.js` F3 pattern used by `sgs/trust-bar`
   — the var is never actually emitted by render.php; the fallback keeps the
   component's own constant, and the client override wins via the scoped
   `<style>` rule's higher selector specificity, same mechanism as every
   other migrated block).
4. **Editor-canvas preview parity** — the caption `<span>` in `edit.js`'s
   canvas preview now reflects `nameFontSize`/`nameFontWeight`/`nameColour`
   (base tier only, matching the container/quote precedent).

## Audit findings

- **Dead/duplicate controls: 0 found.** Ran `check-dead-controls.js --check`
  before and after — `0 net-new dead controls across 78 blocks`. Manual
  cross-check of every block.json attr against render.php/edit.js/view.js
  consumption confirmed the same: every attribute this block declares is
  both controlled in the editor and consumed on render. No control was
  removed because none was dead.
- **Responsive/box-family consolidation: already done pre-existing.**
  padding/margin/borderRadius were already `{top,right,bottom,left}` /
  `{topLeft,…}` objects with Tablet/Mobile tiers via the shared
  `ResponsiveBoxControl`/`ResponsiveBorderRadiusControl` — no flat
  per-side/per-corner triplicate controls existed to consolidate.
  `fadeWidth`/`logoGap`/`tileBorderWidth`/`maxHeight` are legitimate
  keep-scalar single values (contract §C — not box families), and
  `maxHeight` already scales responsively via the universal
  `--sgs-logo-scale` CSS custom property (0.8 tablet / 0.565 mobile) rather
  than per-tier flat attrs — the correct, universal pattern, left untouched.

## 11 end conditions — verified LIVE on Indus page 13 (`https://palestine-lives.org/?p=13`)

Test instance: the page's existing live `sgs/brand-strip` block (12 logos,
scrolling), attributes temporarily set via `wp.data.dispatch('core/block-
editor').updateBlockAttributes()` (editor dispatch, not raw post_content —
per project rule) to an ASYMMETRIC set, verified at 1440/768/375, then
reverted to the page's original attribute values.

Asymmetric test values: base padding 12/24/36/48px, base margin 6/18/30/42px,
base border-radius 3/9/15/21px (TL/TR/BL/BR); tablet padding 10/20/30/40px,
margin 5/15/25/35px, radius 2/8/16/24px; mobile padding 4/8/12/16px, margin
2/6/10/14px, radius 1/4/9/18px; `nameFontSize` 22px / tablet 18 / mobile 13,
`nameFontWeight` 700, `nameColour` `#0A7EA8`; `pauseOnHover` false then true.

1. **Zero inline — PASS.** `getAttribute('style')` on root: only
   `--var:value` custom-property declarations (`--sgs-transition-duration`,
   `--sgs-scroll-speed`, `--sgs-logo-max-height`, `--sgs-hover-border`), zero
   real property declarations. `inlineViolations` scan across every
   descendant of the block subtree: `[]` (empty). `audit-inline-styling.js
   --check`: `PASS — 0 inline styling violations across 78 blocks + the
   shared wrapper` (brand-strip included, `INLINE-via-render: 0`,
   `via-wrapper: no`).
2. **Supports skip-serialised + CLASS-scoped — PASS.** `color`/`spacing`/
   `__experimentalBorder` all carry `__experimentalSkipSerialization` in
   block.json (pre-existing, unchanged). Scoped rule selector confirmed live
   in the deployed stylesheet:
   `.sgs-brandstrip-02c89380.wp-block-sgs-brand-strip{border-radius:3px 9px
   21px 15px;padding:12px 24px 36px 48px;margin:6px 18px 30px 42px;}` — the
   uid (`sgs-brandstrip-02c89380`) is present as a CLASS on the root element
   (confirmed via `el.className`), not only in the selector.
3. **Box families are objects — PASS.** padding/margin (4-side) and
   border-radius (4-corner) are object-shaped at base + Tablet + Mobile
   tiers; `check-box-family-guard.py`: `All checks passed — 0 violations`.
4. **Device tiers only — PASS.** Tablet = `@media(max-width:1023px)`,
   Mobile = `@media(max-width:767px)` (confirmed by live computed values
   changing correctly at the 768/375 breakpoints below). No other
   breakpoint hardcoded in the block; `sgsCustomCss` (universal extension,
   unaffected) remains the only route for a custom breakpoint.
5. **No useless wrapper — PASS (composite, keeps its structure).**
   `sgs/brand-strip` is a marquee composite whose track/set/item divs are
   load-bearing structure for the infinite-scroll mechanism (not a single-
   semantic-element block) — it was already block-private (never used
   `SGS_Container_Wrapper`), so there is no wrapper to remove.
6. **F3 hardcode drained — PASS.** No brand-strip entries in
   `hardcoded-render-defaults-baseline.json` before or after.
   `check-hardcoded-render-defaults.js` flagged one NEW finding this
   session (`style.css:222 font-size:0.8125rem` — created by adding the
   `nameFontSize` control) and it was fixed immediately (see change #3
   above); re-run confirms 0 brand-strip findings.
7. **Client controls intact — PASS.** `check-dead-controls.js`: `0 net-new
   dead controls across 78 blocks`. New pauseOnHover/name-typography/
   nameColour controls all wired end-to-end and verified rendering live.
8. **Security — PASS.** Free-text/keyword values already routed through
   `sgs_css_length` (`[^A-Za-z0-9.%]` strip) and `sgs_colour_value()`; the
   new `nameColour` reuses `sgs_colour_value()`; `nameFontWeight` reuses the
   existing `sgs_typography_css_rule()` helper's own
   `preg_replace('/[^a-z0-9]/i','',…)` sanitiser. `<style>` blob unchanged —
   still `wp_strip_all_tags`.
9. **No churn — PASS.** No version bump (block.json version left at
   `0.2.0`), no `deprecated.js` added.
10. **LANDED + recognised, asymmetric verified — PASS.**
    - **1440 (desktop, `align:full`):** padding `12/24/36/48px`, margin
      `6/18/30/42px` (top/right/bottom/left individually confirmed —
      `marginRight:"18px"`, `marginLeft:"42px"`), border-radius
      `3/9/15/21px` (TL/TR/BL/BR), `nameFontSize:"22px"`,
      `fontWeight:"700"`, `color:"rgb(10, 126, 168)"` — **all match set
      values exactly.**
    - **768 (tablet):** padding `10/20/30/40px`, margin `5/15/25/35px`,
      radius `2/8/16/24px`, `nameFontSize:"18px"` — **all match.**
    - **375 (mobile):** padding `4/8/12/16px`, margin `2/6/10/14px`,
      radius `1/4/9/18px`, `nameFontSize:"13px"` — **all match.**
    - **Known site-wide caveat (not a brand-strip defect, not fixed here):**
      on a NON-aligned instance (no `align:wide|full`), the theme's global
      `.is-layout-constrained > :where(:not(.alignleft):not(.alignright)
      :not(.alignfull)) { margin-left:auto!important; margin-right:auto
      !important; }` rule overrides any block's custom margin-left/right —
      confirmed by toggling `align` on/off on the SAME test instance:
      unaligned → margin-left/right collapsed to `69.75px`/`69.75px`
      (auto-centred); `align:full` → margin-left/right rendered the exact
      set values (`42px`/`18px`). This is a universal WP-core `!important`
      layout-constraint rule affecting every non-aligned block on the site,
      not something introduced by or specific to this migration. Per
      CLAUDE.md's no-`!important`/design-gate rule this was NOT patched —
      flagging it as a site-wide gap-candidate rather than silently fixing
      scope beyond this block. brand-strip's own style.css already documents
      that it is DESIGNED for `align:wide|full` usage (its static-mode row
      packs tiles into near-full-width), so this does not affect the
      block's intended real-world usage.
    - **Recognition / no `ConservationError`:** not re-run this session
      (would require a fresh `/sgs-clone` pass against a mockup containing a
      brand-strip section — out of scope for a control-completion pass with
      no draft change; the existing live instance round-tripped through
      `wp.data` save/reload with zero console errors and zero block-recovery
      prompts, confirming the attribute schema is self-consistent).
11. **Gate + record — PASS.** `check-dead-controls.js`, `check-box-family-
    guard.py`, `check-hardcoded-render-defaults.js`, `audit-inline-styling.js
    --check`, the converter golden-fixture conformance test (`180 passed, 1
    skipped`) all green in the `build-deploy.py` prebuild pipeline. This
    report exists with `verdict: PASS` + `first_paint_capture_passed: true`.
    Deploy verified via `build-deploy.py`'s own fail-closed HTTP check
    (`[verify] HTTP 200 … markers present`) plus this session's independent
    live Playwright verification above.

## Pause-on-hover proof (explicit ask)

- `pauseOnHover:false` → hovering the strip does **not** add
  `sgs-brand-strip__track--paused`; root carries `sgs-brand-strip--no-pause`.
- `pauseOnHover:true` (default) → hovering the strip adds the paused class
  AND (post-fix) `getComputedStyle(track).animationPlayState === "paused"`;
  `mouseleave` removes the class and restores `"running"`.
- `prefers-reduced-motion: reduce` — pre-existing, unchanged: `view.js`
  bails before adding any clones/listeners when the media query matches, and
  `style.css`'s `@media (prefers-reduced-motion: reduce)` sets
  `animation: none` on the `--ready` track — the marquee never animates in
  the first place, so pause-on-hover is moot (freeze already guaranteed at
  the CSS layer).

## Dead/duplicate controls removed

None. `check-dead-controls.js` reported 0 findings both before and after
this session's changes; a manual attribute-by-attribute cross-check
(block.json ↔ edit.js controls ↔ render.php/view.js/style.css consumption)
found every existing control wired end-to-end.

## Conditions not fully met / flagged

- **End condition 10's "page-8 re-clone runs clean" sub-clause** was not
  re-run (no draft/mockup change occurred this session — only editor
  control additions to an already-deployed block; a re-clone pass has
  nothing new to test against). Flagged rather than asserted.
- **Site-wide `!important` layout-constraint margin override** (see
  condition 10 above) is a genuine cross-block gap-candidate, not fixed here
  — it needs a design-gated theme-level decision (Rule 7, CLAUDE.md), not a
  per-block workaround.

## Files changed

- `plugins/sgs-blocks/src/blocks/brand-strip/block.json`
- `plugins/sgs-blocks/src/blocks/brand-strip/render.php`
- `plugins/sgs-blocks/src/blocks/brand-strip/edit.js`
- `plugins/sgs-blocks/src/blocks/brand-strip/view.js`
- `plugins/sgs-blocks/src/blocks/brand-strip/style.css`
