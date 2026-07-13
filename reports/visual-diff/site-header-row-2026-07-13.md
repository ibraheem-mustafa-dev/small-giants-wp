---
block: sgs/site-header-row
date: 2026-07-13
session: P1 — Header/Footer/Nav system (Spec 17 §S9, D323)
verdict: PASS
first_paint_capture_passed: true
site: sandybrown canary (Mama's Munches homepage)
companion_report: reports/visual-diff/site-header-2026-07-13.md
---

# Visual-diff / live-verify — `sgs/site-header-row` (P1)

`sgs/site-header-row` is the never-overflow **Cluster** row rendered inside
`sgs/site-header`; it is verified as part of the same live test as its parent
(see the companion report for the full breakpoint table + screenshots). This
report records the row-specific acceptance.

## Row-specific acceptance (live, sandybrown, after full cache clear)
- **Never-overflow Cluster (FR-S9-7):** the middle row wraps rather than
  overflowing — verified 320/375/414/768/1440 (`scrollWidth <= innerWidth`,
  0 header descendants past the viewport edge at every width). `min-width:0`
  on children + `flex-shrink:0` on the logo + the wrapper's `flex-wrap:wrap`
  default carry the guarantee.
- **Empty-row zero-output (FR-S9-2):** the top and bottom rows have no inner
  blocks → render.php returns `''`; live DOM shows **only 1** `.sgs-site-header-row`
  node (the middle row). Empty rows produce no DOM node and no computed padding.
- **No inline style (Spec 32):** the row wrapper's inline `style=""` attribute
  is **(none)** on the live DOM; layout/gap/justify come from the shared
  `SGS_Container_Wrapper` scoped `<style>` (composite-mirror, R-31-9). Gate B
  (`check-hardcoded-render-defaults`) clean — no hardcoded flex/gap/align
  constants in style.css.
- **Touch targets:** the toggle + cart controls inside the row measure 44×44
  at 320px (WCAG 2.5.8).
- **Distribution:** at 1440 the middle row's `justifyContent: space-between`
  places the logo left (@24px) and cart right (@1401px).

## Gates
- Build: dead-control 0, hardcoded-render-defaults 0 net-new, db-consistency PASS.
- DB: `block_composition` row present, `container_kind='layout'`,
  `composition_role='content-block'`; roster validation PASS.

## Known delta (deferred, shared with the header report)
- Flat `space-between` distribution → cleaner logo-left/actions-right grouping
  deferred to FR-S9-8 (per-device/palette phase). Not an overflow issue.

## Verdict: **PASS** — the never-overflow Cluster + empty-row zero-output +
no-inline all verified live; the row is the mechanism that fixes the header
overflow by construction.
