# Visual diff — sgs/option-picker — 2026-09-05

verdict: PASS
intent_capture_passed: true
source_sha: 029d2e5de4afc7c0

## What changed

New `pillTextColourGradient` sibling to the existing `pillTextColour`. Scoped to `$sel_pill`
(`root_sel + .sgs-option-picker__pill`, 3 classes) which out-specifies the per-variant `style.css`
default, plus the `@supports not (background-clip:text)` fallback. Resting state only — the hover
state (`--sgs-op-text-hover`) still wins on `:hover` per specificity (4 vs 3), so the gradient is
never expected to show on hover.

Bean specifically flagged this block as needing real verification across at least 2 of its 3
`pillStyle` variants (`outlined`/`filled`/`ghost`).

## 1. Assertions (stated before measuring)

Per variant tested:
- **A (gradient UNSET):** pill text renders the flat `pillTextColour` (or, when that is also
  empty/default, falls through to the per-variant `style.css` default — no override rule at all).
- **B (gradient SET):** pill text's scoped CSS rule shows the gradient trio, in the RESTING
  (non-hover) state.

Variants tested: **`outlined`** and **`filled`** (2 of 3, per Bean's requirement).

## 2. Live result

Live canary (sandybrown), scratch page 3296, 4 instances: `test-op-unset-outlined`,
`test-op-set-outlined`, `test-op-unset-filled`, `test-op-set-filled` (each `optionItems: [{key:a,
label:"Small"},{key:b,label:"Medium"}]`, `pillTextColour` left at its empty default; SET instances
additionally carry `pillTextColourGradient: "linear-gradient(90deg,#ff0000 0%,#0000ff 100%)"`).

| Variant | Instance | uid | Rule in lifted stylesheet |
|---|---|---|---|
| outlined | UNSET | `sgs-op-06a9753e` | **none** — no `06a9753e` rule anywhere; falls through to the `outlined` variant's own `style.css` default |
| outlined | SET | `sgs-op-a3cbd8ef` | `.sgs-op-a3cbd8ef.wp-block-sgs-option-picker .sgs-option-picker__pill{background-image:linear-gradient(90deg,#ff0000 0%,#0000ff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;}` + fallback `{background-image:none;color:#ff0000;}` |
| filled | UNSET | `sgs-op-9bc4e0f3` | **none** — same fall-through behaviour |
| filled | SET | `sgs-op-c8df96ac` | identical gradient trio + fallback, scoped to `sgs-op-c8df96ac` |

Confirms A (no override when both flat and gradient are unset — the per-variant default owns the
pill text colour) and B (gradient trio present, identically shaped, on BOTH tested variants) — the
mechanism is variant-agnostic, exactly as the `$sel_pill` selector construction implies (it does
not vary by `pillStyle`).

`ghost` (the third variant) was not tested — the selector construction (`$sel_pill` built from
`root_sel + .sgs-option-picker__pill`, no `pillStyle`-conditional branching in the gradient code
path) gives no reason to expect it to differ, but this is noted rather than asserted as verified.

## 3. Why before/after doesn't apply

`pillTextColourGradient` is a brand-new attribute; no prior render path produced a gradient pill
to diff against. The UNSET instances are the live control, captured in the same pass as the SET
instances.

## Verification method note

Playwright's browser was locked by a concurrent session throughout this verification wave, so
this used direct HTTP fetch of the rendered page plus the lifted CSS file
(`/wp-content/uploads/sgs-css/sgs-3116-…css`) rather than `getComputedStyle()`. Adequate here: the
claim is a literal scoped declaration's presence/absence, not a cascaded value. The hover-state
precedence claim (gradient never shows on `:hover`) was NOT independently re-verified beyond
reading the code's own specificity comment — no interactive hover was performed, since the
resting-state selector match already answers assertions A and B as stated.
