# Visual diff — sgs/cta-section — 2026-08-15

verdict: PASS
first_paint_capture_passed: true
editor_capture_passed: true
source_sha: bea8b4a4fa536188

## What changed

`render.php` + `block.json`. Two selector corrections, no markup change.

1. `block.json` `selectors.typography` — was eight entries all pointing at
   `.sgs-cta-section__headline`; now a single `root` pointing at
   `.wp-block-sgs-cta-section`.
2. `render.php` — the scoped typography emitter and the text-align emitter both
   targeted `$root_sel . ' .sgs-cta-section__headline'`; both now target `$root_sel`.
3. `edit.js` — added a min-height control (editor-only, no render impact).

## Why it is not a regression

**`.sgs-cta-section__headline` is never rendered.** Verified against the live canary DOM:
the block emits `.sgs-cta-section__content > h2.wp-block-sgs-heading`. The FR-22-6 migration
moved the headline into an InnerBlocks `sgs/heading` child; the selectors were never updated.

So every rule these selectors produced was landing on nothing. **Before this change all eight
native typography controls were silent no-ops** — a client set one, it saved, nothing moved.
There is no previously-working appearance to regress: the change can only move pixels that
were previously frozen.

## First-paint capture — live canary, computed styles

Probe: two `sgs/cta-section` instances, container set to `textAlign:right`, one with an unset
`sgs/heading` child and one with the child setting its own value.

| Case | container text-align | child text-align | Result |
|---|---|---|---|
| A — child unset | `right` | `right` | container default inherited ✅ |
| B — child sets own | `right` | `right` | see caveat |

**Before the fix, the same probe rendered `center` on both** (the emitted rule targeted the dead
class, so `.sgs-cta-section--centred` won). Confirmed independently by Bean's own eye on the
first probe before any measurement was taken.

## Measured limits — recorded, not hidden

- **font-size does NOT reach a heading child.** Container computed 38.76px, unset child 33.09px.
  Cause is not this block: `sgs/heading` emits no base font-size (D338). The winner is
  theme.json `styles.elements.h2.typography.fontSize`, a declaration on the element, and a
  declaration beats an inherited value. Inheritance therefore carries only properties theme.json
  does not declare on the element — `text-align` among them.
- **Case B is inconclusive.** The probe set `style.typography.fontSize` on the child, but
  `sgs/heading` reads its own `fontSize` attribute, so the child never had a competing value to
  assert. The child-wins half of the rule is sound in CSS (declaration beats inheritance) but is
  NOT empirically proven by this capture. Stated rather than claimed.

## Gates

`check-dead-controls` 0 · `check-shared-panel-schema` 0 · `check-control-ux` 0 ·
`check-element-manifest-conformance` 0 · `npm run build` 0 · `php -l` clean · WPCS 0 errors.

## Sibling audit

Same defect found and fixed in `sgs/info-box` (`.sgs-info-box__heading`) and
`sgs/notice-banner` (`.sgs-notice-banner__text`) — both documented in their own source as
migrated to InnerBlocks children, with the CSS deleted and the selector left behind.
`sgs/pricing-table` and `sgs/testimonial-slider` were flagged by the audit heuristic and
verified as FALSE POSITIVES — both genuinely render their classes.
