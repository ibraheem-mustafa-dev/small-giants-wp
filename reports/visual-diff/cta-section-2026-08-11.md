---
doc_type: reference
title: "Visual-diff report — cta-section · contentBandPadding"
block: cta-section
date: 2026-08-11
property: contentBandPadding
verdict: PASS
first_paint_capture_passed: true
source_sha: bc38898c8110917c
---

# cta-section — contentBandPadding binds live at every tier

**Verdict: PASS.**

Same tier-fixture page (post 2270) and method as the container report: probe values injected
directly into `post_content` via REST (sanctioned for sgs/* blocks — plugins/sgs-blocks/CLAUDE.md),
matching the figures already live-editor-proven on the container instance on the same page.
cta-section renders through the same `SGS_Container_Wrapper::render()` band-layer path as
container — the element measured carries the identical class.

| Viewport | measured on | expected padding-top | actual padding-top |
|---|---|---|---|
| desktop (1440px) | `.sgs-container__inner` | 40px | 40px |
| mobile (390px) | `.sgs-container__inner` | 10px | 10px |

This supersedes the earlier `columns` report at this path (that migration is committed history;
this report describes the current staged diff, per the gate's own per-commit contract).

Full context: tier-fixture page (post 2270), anchor `tierfx-probe-cta-section`.
