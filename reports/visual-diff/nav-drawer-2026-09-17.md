# Visual diff — sgs/nav-drawer — 2026-09-17

verdict: PASS
intent_capture_passed: true
source_sha: 5bd4ca50cda35cd3

## What changed

`editor.css` gained two new rules for the FR-37-47 Starter Look preset control's Inspector
sidebar chrome (`.sgs-starter-look__help`, `.sgs-starter-look__grid`) — deliberately unscoped
since they never appear inside `.editor-styles-wrapper` (they live in the Inspector sidebar,
not the canvas).

## Assertion

`.sgs-starter-look__grid` should render as a wrapping flex row with an 8px gap, and
`.sgs-starter-look__help` should render flush to the panel top with reduced opacity (a subdued
helper line under the panel heading) — same shared rules as `sgs/site-header` and
`sgs/site-footer`, since `nav-drawer` is the third of the three CPT root blocks this control is
wired into.

## Live result — sandybrown canary, sgs_drawer post 3593 ("SGS Framework Menu Drawer — Default"), root block selected, Styles tab

| Property | Asserted | Measured |
|---|---|---|
| `.sgs-starter-look__grid` `display` | `flex` | **`flex`** ✅ |
| `.sgs-starter-look__grid` `flex-wrap` | `wrap` | **`wrap`** ✅ |
| `.sgs-starter-look__grid` `gap` | `8px` | **`8px`** ✅ |
| `.sgs-starter-look__help` `margin-top` | `0px` | **`0px`** ✅ |
| `.sgs-starter-look__help` `opacity` | `0.75` | **`0.75`** ✅ |
| Buttons rendered inside `.sgs-starter-look__grid` | all registered drawer starter looks | **2** ✅ |

## Why before/after doesn't apply

The panel these classes style (`StarterLookPresetControl`'s "Starter look" section) did not
exist before this feature — there is no meaningful "before" state to diff against. The
question is only whether the shipped rules produce the intended layout, which the live capture
above confirms directly.

## Risk

Editor-sidebar-only CSS, gated behind `.sgs-starter-look__*` class names owned exclusively by
this one component; no interaction with any frontend-rendered selector.
