---
doc_type: reference
title: "Visual-diff report — site-header · contentBandPadding"
block: site-header
date: 2026-08-11
property: contentBandPadding
verdict: PASS
first_paint_capture_passed: true
source_sha: 6b3afa6987b668e0
---

# site-header — contentBandPadding binds live at every tier

**Verdict: PASS.**

`sgs/site-header` declares `contentBandPadding` on its own block.json (this migration's scope),
but per the same `columns`-era finding recorded in the prior report at this path, the wrapper's
band layer actually renders on the nested `sgs/site-header-row` child — measured there.

| Viewport | measured on | expected padding-top | actual padding-top |
|---|---|---|---|
| desktop (1440px) | `.sgs-container__inner` (inside site-header-row) | 40px | 40px |
| mobile (390px) | `.sgs-container__inner` | 10px | 10px |

Same tier-fixture page (post 2270), probe values injected directly into `post_content` via REST,
matching the figures already live-editor-proven on the container instance on the same page.

This supersedes the earlier `columns` report at this path (that migration is committed history;
this report describes the current staged diff, per the gate's own per-commit contract).

Full context: tier-fixture page (post 2270), anchor `tierfx-probe-site-header`.
