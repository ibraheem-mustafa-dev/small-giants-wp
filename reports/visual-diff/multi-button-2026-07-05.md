# Visual diff — sgs/multi-button — 2026-07-05

verdict: PASS
first_paint_capture_passed: true

## Change under review

`render.php` only (H6, block-side only, no shared-file edit):

1. Responsive bands normalised from the non-standard 769/1024/768px to the
   device-tier standard 767/1023px (mobile `max-width:767px`, tablet
   `max-width:1023px and (min-width:768px)`).
2. `SGS_Container_Wrapper::render()` call changed `kind='layout'` ->
   `kind='content'`. This block already owns display/flex-wrap/gap/
   justify-content/align-items/flex-direction responsively via its own
   scoped `#uid.sgs-multi-button` `<style>`; `kind='layout'` was ALSO making
   the shared wrapper emit its own (non-responsive) inline
   `flex-direction`/`justify-content`/`flex-wrap`/`gap`, which — being an
   inline style — permanently overrode the block's own responsive rules at
   every viewport regardless of `@media`. `kind='content'` keeps the
   width/contentWidth capability mirror (an already-exercised pattern:
   sgs/quote, sgs/testimonial, sgs/product-card, sgs/tab, sgs/info-box) and
   drops the colliding flex/grid + gap emission.

## Evidence (live page 8, sandybrown, re-cloned + redeployed 2026-07-05 22:21)

- Playwright computed-style check on `.sgs-multi-button` (hero CTAs), BEFORE
  fix: `flex-direction: row` constant at 375/767/768/769/1023/1024/1440px
  (bug — never stacked). AFTER fix: `column` at 375/767px, `row` at
  768/769/1023/1024/1440px — matches the draft's base (`column`, gap 10px) +
  `@media (min-width:768px)` (`row`, gap 12px) rule exactly, including the
  768px boundary.
- Screenshot of `.sgs-multi-button` at 375px: two buttons stacked vertically,
  correct.
- Screenshot at 768px: two buttons render as separate rows in this specific
  instance (Shop Zookies / Try 3 for £5) — flex-direction is confirmed `row`
  via computed style, but the two buttons wrap onto separate lines because
  they render wider/taller than the draft's equivalents at this width (a
  BUTTON SIZING difference, not a flex-direction defect — the draft's two
  buttons at 768px fit side-by-side in a narrower 288px box because its own
  button padding/line-wrap is smaller). Flagged as a residual for a future
  session; out of scope for this flex-direction fix (H6) and not caused by
  it — `flex-wrap` behaviour is identical to the draft, only the buttons'
  own intrinsic width differs.
- Screenshot at 1440px: unchanged from before (buttons were already correct
  at desktop widths; only the mobile/tablet boundary was affected).
- Zero console errors on any of the three loads.
- Test suite: 822 passed / 1 skipped (`orchestrator/test_css_router.py`,
  `converter/tests`, `cheat-gate/tests`, `tests/test_converter_conformance.py`,
  `ledger/tests`). Gates: `cheat-gate/run.py --check` (33 baselined, 0 new),
  `no_slug_literal.py`, `import_ban.py`, `check_raw_sqlite.py`,
  `check-dead-controls.js --check` (0 net-new) all green.
