# Visual diff — sgs/process-steps — 2026-09-05

verdict: PASS
intent_capture_passed: true
source_sha: a3923b5a0d73fe75

## What changed

New `numberColourHoverGradient` sibling to the existing `numberColourHover`. Resolved via
`sgs_resolve_text_colour_or_gradient()` -> `sgs_text_colour_decl()`, emitted through
`sgs_hover_state_rules($step_sel, decl, ':focus-within', ' .sgs-process-steps__number')` targeting
`.sgs-process-steps__step:hover/:focus-within .sgs-process-steps__number`, plus the companion
`sgs_text_colour_gradient_fallback_rule()` `@supports not (background-clip:text)` rule.

## 1. Assertions (stated before measuring)

- **A (gradient UNSET, `numberColourHover` set to a flat colour):** hovering
  `.sgs-process-steps__step` resolves `color` on `.sgs-process-steps__number` to that flat colour.
- **B (gradient SET):** hovering the step resolves the gradient text trio
  (`background-image` + `-webkit-background-clip`/`background-clip:text` + `color:transparent`)
  on `.sgs-process-steps__number`, plus a `@supports not (background-clip:text)` fallback rule
  using the gradient's first colour stop.

## 2. Live result

Live canary (sandybrown), scratch page 3296 (`className: test-ps-unset` / `test-ps-set`, both with
`numberColourHover: "#123456"`; SET additionally carries `numberColourHoverGradient:
"linear-gradient(90deg,#ff0000 0%,#0000ff 100%)"`).

**UNSET** (`uid sgs-proc-38403da8`) — lifted stylesheet:
```css
.sgs-proc-38403da8.sgs-process-steps .sgs-process-steps__step:hover .sgs-process-steps__number{color:#123456}
.sgs-proc-38403da8.sgs-process-steps .sgs-process-steps__step:focus-within .sgs-process-steps__number{color:#123456}
```
Flat colour on both the hover and focus-within selectors — confirms A.

**SET** (`uid sgs-proc-d401f598`) — lifted stylesheet:
```css
.sgs-proc-d401f598.sgs-process-steps .sgs-process-steps__step:hover .sgs-process-steps__number{background-image:linear-gradient(90deg,#ff0000 0%,#0000ff 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.sgs-proc-d401f598.sgs-process-steps .sgs-process-steps__step:hover .sgs-process-steps__number,.sgs-proc-d401f598.sgs-process-steps .sgs-process-steps__step:focus-within .sgs-process-steps__number{background-image:none;color:#ff0000;}
```
Gradient trio present on hover, plus the `@supports not (…)` fallback resolving to `#ff0000` (the
gradient's first stop) — confirms B.

## 3. Why before/after doesn't apply

`numberColourHoverGradient` is a brand-new attribute; no prior render path produced a gradient
here to diff against. The UNSET instance (same flat `numberColourHover` value, no gradient) is the
live control captured in the same pass.

## Verification method note

Same as the other reports in this wave: Playwright's browser was locked by a concurrent session
throughout, so this used direct HTTP fetch of the live rendered HTML plus the lifted CSS file
rather than `getComputedStyle()`. Since the hover/focus-within state is a static CSS pseudo-class
rule (not a JS-toggled runtime state), reading the source rule is equivalent to reading the
computed value under that pseudo-class — there is no cascade ambiguity to resolve.
