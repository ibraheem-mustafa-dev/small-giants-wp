---
doc_type: reference
title: "Visual-diff report — physics-canvas · contentBandPadding"
block: physics-canvas
date: 2026-08-11
property: contentBandPadding
verdict: PASS
first_paint_capture_passed: true
source_sha: 891cd1f00a5a7526
---

# physics-canvas — contentBandPadding binds live at every tier

**Verdict: PASS.**

Same tier-fixture page (post 2270) and method as the container report: probe values injected
directly into `post_content` via REST, matching the figures already live-editor-proven on the
container instance on the same page. physics-canvas renders through the same
`SGS_Container_Wrapper::render()` band-layer path as container.

| Viewport | measured on | expected padding-top | actual padding-top |
|---|---|---|---|
| desktop (1440px) | `.sgs-container__inner` | 40px | 40px |
| mobile (390px) | `.sgs-container__inner` | 10px | 10px |

This supersedes the earlier `maxWidth` report at this path (that migration is committed history;
this report describes the current staged diff, per the gate's own per-commit contract).

Full context: tier-fixture page (post 2270), anchor `tierfx-probe-physics-canvas`.
