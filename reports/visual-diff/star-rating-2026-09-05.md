# Visual diff — sgs/star-rating — 2026-09-05

verdict: PASS
intent_capture_passed: true
source_sha: bcb648b4d89de2e4

## What changed

Two new sibling gradient attributes: `starColourGradient` (full-star fill) and
`emptyColourGradient` (empty-star fill). Each resolves via `sgs_svg_stroke_gradient(...,'fill')`
independently, emitting its own scoped CSS rule targeting `.sgs-star-rating__star--full` /
`.sgs-star-rating__star--empty` respectively, with `<defs>` injected once per gradient via
separate injected-flags.

## 1. Assertions (stated before measuring)

- **A (both gradients UNSET):** full and empty stars render via the existing flat
  presentation-attribute `fill="…"` on the `<path>` element — no CSS class-based override needed,
  since no rule is emitted.
- **B (both gradients SET, to different colours):** `.sgs-star-rating__star--full` and
  `.sgs-star-rating__star--empty` each resolve `fill` to their OWN `url(#…)` gradient via a scoped
  CSS rule, visually distinct from each other.

Test instance: `rating: 3, maxRating: 5` so both a full star and an empty star render
simultaneously.

## 2. Live result

Live canary (sandybrown), scratch page 3296 (`className: test-sr-unset` / `test-sr-set`).

**UNSET** (`uid sgs-str-3c3f4714`) — DOM:
```html
<path class="sgs-star-rating__star--full" ... fill="var(--wp--preset--color--accent)"/>
<path class="sgs-star-rating__star--empty" ... fill="var(--wp--preset--color--border)"/>
```
No matching `sgs-str-3c3f4714` rule exists anywhere in the lifted stylesheet — confirms A.

**SET** (`uid sgs-str-7d5efe12`, `starColourGradient:
"linear-gradient(90deg,#ff0000 0%,#0000ff 100%)"`, `emptyColourGradient:
"linear-gradient(90deg,#00ff00 0%,#ffff00 100%)"`) — lifted stylesheet contains:
```css
.sgs-str-7d5efe12.wp-block-sgs-star-rating .sgs-star-rating__star--full{fill:url(#sgs-str-7d5efe12-star-grad);}
.sgs-str-7d5efe12.wp-block-sgs-star-rating .sgs-star-rating__star--empty{fill:url(#sgs-str-7d5efe12-empty-grad);}
```
Two independent gradient ids, two independent colour pairs — confirms B, and confirms the two
attributes are wired independently (neither one clobbers the other).

## 3. Why before/after doesn't apply

Both attributes are brand-new; there is no prior render path producing gradient fills to diff
against. The UNSET instance is the live control for "unchanged from before this attribute
existed", captured in the same pass as the SET instance.

## Verification method note

Same as `google-reviews-2026-09-05.md`: Playwright's browser was locked by a concurrent session,
so this used direct HTTP fetch of the rendered HTML plus the lifted CSS file
(`/wp-content/uploads/sgs-css/sgs-3116-…css`) rather than `getComputedStyle()`. Adequate for this
literal-declaration presence/absence check.
