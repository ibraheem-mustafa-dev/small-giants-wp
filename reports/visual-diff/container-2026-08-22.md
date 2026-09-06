# Visual diff — sgs/container — 2026-08-22

verdict: PASS
intent_capture_passed: true
source_sha: fd499ab4e46672da

## What changed

`supports.align: ["wide","full"]` removed from `src/blocks/container/block.json`.

## The assertion under test

**Removing `align` changes nothing visually**, because neither value was doing
anything. No before-state is needed: the assertion is that the aligned and
unaligned renderings are already identical.

## Live capture (canary, 1454px viewport)

A throwaway probe page was published with two `sgs/container` sections identical
in every attribute except `align`. Its parent chain was
`DIV.entry-content.wp-block-post-content` — precisely the parent the theme's
`.wp-block-post-content > .alignfull` / `.entry-content > .alignfull` selectors
require, so the rules had every opportunity to fire.

| element | left | width | margin-left | margin-right |
|---|---|---|---|---|
| A — `align:"full"` | 369 | 245 | 0px | 0px |
| B — no align | 369 | 245 | 0px | 0px |
| A with `.alignfull` stripped at runtime | 369 | 245 | 0px | 0px |

Byte-identical across all three states. Probe page deleted after measurement.

## Why it is inert

- **`full`:** core's breakout is
  `margin-left: calc(var(--wp--style--root--padding-left) * -1)`. That custom
  property is EMPTY at `:root` (it is `1.5rem` on `.wp-site-blocks` only), so the
  `calc()` is invalid, the declaration is dropped, and computed `margin-left`
  is `0px`. The theme's own `.alignfull` rules set `margin-block: 0` only —
  vertical gap removal, never width.
- **`wide`:** its only rule across 2,012 loaded selectors is
  `.is-layout-constrained > .alignwide`, and `sgs/container` never emits
  `.is-layout-constrained` — 0 such elements exist on the page. D725 deleted
  core's constrained layout from every template, making that rule unreachable.

## Negative control

The same CSSOM scan was first run with a walker that guarded on
`if (r.cssRules)`. Because CSS Nesting gives every `CSSStyleRule` a truthy but
empty `CSSRuleList`, it recursed into nothing and examined **zero** selectors
while reporting a confident `0`. It was caught only because `.alignfull` — known
to have 8 rules — also returned 0. The corrected walker guards on
`r.cssRules.length` and examines 2,012 selectors with the control passing.

## Residual risk

None to rendering. The 38 stripped authorings were framework-owned repo files;
the canary database holds **0** `align` authorings on any published post or page,
so no stored content depends on the attribute.
