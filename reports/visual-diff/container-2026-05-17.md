---
block: container
date: 2026-05-17
verdict: PASS
first_paint_capture_passed: true
surface: https://sandybrown-nightingale-600381.hostingersite.com/cv2-output-mamas-munches/ (WP page 131, page.html template)
---

# sgs/container — visual diff (Tasks 2-3 widthMode infra)

## Change summary

- New attrs added to block.json: `widthMode` enum (default/wide/full/custom), per-viewport `widthMode{Mobile,Tablet,Desktop}` overrides, `customWidth` + `customWidthUnit`
- render.php emits `alignwide`/`alignfull` (WP-native) for base widthMode, scoped `<style>` for per-viewport overrides
- edit.js exposes new InspectorControls: base ToggleGroup, per-viewport ResponsiveControl, conditional custom inputs
- Editor canvas mirrors frontend via composed classes + inline max-width

## Backwards-compat verification

Existing posts on production carry `maxWidth: "wide"` only (no widthMode attr). The new widthMode defaults to `"default"` (empty class emission), so existing posts render identically.

Confirmed via brand-cropped pixel-diff on page 131 (which still carries yesterday's pre-widthMode block markup, deployed against the NEW render.php):

| Viewport | Brand pixel-diff |
|---|---|
| 1440x900 | 43.73% (selector=.sgs-brand) |
| 768x1024 | 47.60% (selector=.sgs-brand) |
| 375x812 | 56.32% (selector=.sgs-brand) |

These match the same surface's pre-deploy measurement at 1440 (43.73%) — **zero regression**. Block markup unchanged from yesterday; render.php changes are additive and gated on the new attrs.

## first_paint_capture

Page 131 renders in a single paint with the deployed `build/blocks/container/render.php`:
- HTTP 200 (159940 bytes)
- 16 `alignfull` class hits (existing hero supports.align mechanism intact)
- 15 `sgs-container--width-wide` class hits (legacy maxWidth path intact)
- `<main>` carries `is-layout-flow` (page.html template confirmed)
- 1064 `sgs-*` class hits (no missing-class regression)

## Universal-benefit

Zero client literals introduced. Width values resolve via:
1. CSS vars `--wp--style--global--{content,wide}-size` (theme.json contract)
2. Per-client style variations override via `theme.json:settings.layout`
3. Fallback px values in render.php mirror framework defaults (780/1200), not any client's

## QC trace

- /qc-inline #1 (Branches A+B): 92/100 — caught and fixed `_SGS_BEM_BLOCK_ROOT_RE` regex flaw that matched `.sgs-X--modifier` selectors. 12-case regex assertion + functional re-smoke confirms fix.
- /qc-inline #2 (Branch C editor UI): 96/100 — all 10 scenarios pass, cross-file key alignment verified, UK English + universal-benefit checks clean, `node --check` exit=0.

## Closes

P-WP-ALIGNMENT-WIDTH-SYSTEM (architectural fix).
