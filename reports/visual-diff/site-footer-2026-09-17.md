# Visual diff — sgs/site-footer — 2026-09-17

verdict: PASS
intent_capture_passed: true
source_sha: 285d6d553ff58a40

## What changed

`editor.css` gained two new rules for the FR-37-47 Starter Look preset control's Inspector
sidebar chrome (`.sgs-starter-look__help`, `.sgs-starter-look__grid`) — deliberately unscoped
since they never appear inside `.editor-styles-wrapper` (they live in the Inspector sidebar,
not the canvas).

## Assertion

`.sgs-starter-look__grid` should render as a wrapping flex row with an 8px gap (so the 8
starter-look buttons wrap sensibly at sidebar width instead of overflowing or stacking one per
line), and `.sgs-starter-look__help` should render flush to the panel top with reduced opacity
(a subdued helper line under the panel heading).

## Live result — sandybrown canary, sgs_footer post 1654, root block selected, Styles tab

| Property | Asserted | Measured |
|---|---|---|
| `.sgs-starter-look__grid` `display` | `flex` | **`flex`** ✅ |
| `.sgs-starter-look__grid` `flex-wrap` | `wrap` | **`wrap`** ✅ |
| `.sgs-starter-look__grid` `gap` | `8px` | **`8px`** ✅ |
| `.sgs-starter-look__help` `margin-top` | `0px` | **`0px`** ✅ |
| `.sgs-starter-look__help` `opacity` | `0.75` | **`0.75`** ✅ |
| Buttons rendered inside `.sgs-starter-look__grid` | 8 (all registered footer starter looks) | **8** ✅ |

## Why before/after doesn't apply

The panel these classes style (`StarterLookPresetControl`'s "Starter look" section) did not
exist before this feature — there is no meaningful "before" state to diff against. The
question is only whether the shipped rules produce the intended layout, which the live capture
above confirms directly.

## Risk

Editor-sidebar-only CSS, gated behind `.sgs-starter-look__*` class names owned exclusively by
this one component; no interaction with any frontend-rendered selector.
