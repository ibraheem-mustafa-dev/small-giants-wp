# Visual diff — sgs/testimonial-slider — 2026-09-02

verdict: PASS
intent_capture_passed: true
source_sha: 8246a20e1a85e2c0

## What changed

Deleted the dead `testimonials` attribute (`type: array`, `default: []`) from `block.json`.
This block migrated to `InnerBlocks` (operators add/remove/reorder `sgs/testimonial`
children); `render.php` explicitly counts `$inner_blocks` instead
(`$total_testimonials = count( $inner_blocks )`, with a code comment stating "data is
preserved without requiring the scalar testimonials array"). Confirmed via grep that the
attribute was never read as `attributes.testimonials`/`$attributes['testimonials']`
anywhere in `edit.js` or `render.php` — only mentioned in prose comments. Per this
project's no-deprecations policy (pre-production, no live content to migrate), a dead
attribute is deleted outright rather than given a pointless control.

## Assertion

Removing an attribute nothing reads has zero rendering effect on any existing instance —
the InnerBlocks-based slider content and count logic are entirely independent of it.

## Live capture — sandybrown canary, REST-created probe instance

Probe: one `sgs/testimonial-slider` with one `sgs/testimonial` InnerBlocks child (quote +
name), rendered normally (no decorative-related payload — this change isn't about
decorative images).

| Measure | Result |
|---|---|
| Child testimonial's quote text present | ✅ |
| Child testimonial's name present | ✅ |
| `sgs-testimonial-slider` wrapper class present | ✅ |

## Risk

Removing a confirmed-dead attribute has no rendering risk. Not a decorative-image fix (this
block's report-18 finding was a detector false positive, traced to prose mentions of the
word "testimonials" in comments, not a real gap) — included in this batch because its
`block.json` changed and the deploy gate scopes visual-diff reports per touched block.
