---
block: container
date: 2026-07-18
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — shared `SGS_Container_Wrapper` Facet A (empty `style=""`) — 2026-07-18

Framework-wide inline-zero rollout (Spec 32 FR-32-4 as amended 2026-07-18 / D345),
**Facet A — Bean-approved design-gate** (Rule 7 shared-mechanism change). Covers
`sgs/container` and every composite that renders through `SGS_Container_Wrapper`.

## What changed (`includes/class-sgs-container-wrapper.php`)

Both `get_block_wrapper_attributes()` call sites (the pre-uid first pass at ~833
AND the operative rebuild at ~1398) unconditionally passed
`'style' => implode(';', $styles) . ';'`. When `$styles` is empty — the common case
for a content-KIND composite (and header/footer) with no inline-eligible values —
this produced `';'`, which `safecss_filter_attr()` sanitises to empty but WordPress
still emits as an empty `style=""` attribute, because the key was present.

Fix: build the wrapper-attrs array with the `style` key **only when `$styles` is
non-empty**. When non-empty (a section/layout composite carrying `--var` values —
e.g. hero) the output is byte-identical; that `--var` inline case is deliberately
left for Facet B. Applied identically to both call sites.

## Live verification — palestine-lives.org homepage

| Check | Before | After |
|---|---|---|
| page-wide empty `style=""` | 15 | **0** |
| affected roots (container, multi-button, site-header/footer/-row, adaptive-nav) | `style=""` present | attribute absent |
| `sgs/container` computed layout (display/padding/max-width) | — | unchanged (flex; empty style carried nothing) |
| `sgs/hero` (non-empty `$styles`, Facet B) | inline `--var` present | **unchanged** (byte-identical) — no regression |
| composites still render (hero ×5, container ×5) | — | yes |

## first_paint_capture_passed

Desktop screenshot (`facetA-button-cta-postD345.png`) — the service-card section
(containers + CTAs + info-boxes) and the "Why Choose Indus Foods?" band render
correctly at first paint; no layout shift from removing the empty `style` attrs.

*(This report also stands as the record for `sgs/multi-button`, whose empty
`style=""` was produced by this same shared wrapper and is cleared by this fix —
no per-block edit to multi-button was needed.)*
