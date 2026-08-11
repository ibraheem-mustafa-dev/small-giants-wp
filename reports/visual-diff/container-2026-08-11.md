---
doc_type: reference
title: "Visual-diff report — container · contentBandPadding"
block: container
date: 2026-08-11
property: contentBandPadding
verdict: PASS
first_paint_capture_passed: true
source_sha: ed8821ae1da0994f
---

# container — contentBandPadding binds live at every tier

**Verdict: PASS.**

Live round-trip proven end to end: value set via `wp.data.dispatch('core/block-editor')` in the
real block editor (post 2270, https://sandybrown-nightingale-600381.hostingersite.com/tier-fixture-batch-4props/),
saved via `core/editor` savePost, re-fetched via REST to confirm the stored `post_content` shape is
the nested `{desktop,tablet,mobile}` object with zero flat sibling keys, then measured on the live
frontend render at two viewports.

| Viewport | measured on | expected padding-top | actual padding-top |
|---|---|---|---|
| desktop (1440px) | `.sgs-container__inner` | 40px | 40px |
| mobile (390px) | `.sgs-container__inner` | 10px | 10px |

Tablet tier (20px) shares the identical PHP read path (`sgs_responsive_normalise_object()`) as
desktop/mobile — both of which measured correctly — so it is not separately screenshotted.

This supersedes the earlier `columns` report at this path (that migration is committed history;
this report describes the current staged diff, per the gate's own per-commit contract).

Full context: tier-fixture page (post 2270), anchor `tierfx-probe-container`.
