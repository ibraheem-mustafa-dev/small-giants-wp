# Visual diff — sgs/container — 2026-09-08

verdict: PASS
intent_capture_passed: true
source_sha: f6d3dd95055aef2a

## What changed

`sgs/container`'s `layout` attribute default: `"flex"` → `""`.

Plus the two editor-side halves of the same default, which were out of sync with it:
- `LayoutPanel.js` destructured `layout = 'flex'`, so the control displayed "Flex"
  as selected even on a block whose stored value was empty.
- `LAYOUT_OPTIONS` offered only Flex / Stack / Grid — there was no way for a
  client to *choose* no-layout at all. It now leads with **Default** (value `""`).

`""` emits no `display`, leaving the container in CSS normal flow (WordPress's
`is-layout-flow`): children are block-level boxes that fill the width and stack.

## Why the previous default was wrong

WordPress substitutes a schema default when an attribute is ABSENT, before
render.php runs. The converter faithfully writes no `layout` when the draft
declares none — so "the draft specified nothing" and "the author chose a flex
row" arrived at the renderer as the same thing. That collapse destroyed the
absence the converter had correctly preserved.

D742 (2026-08-22) set the flex default on the reasoning that CSS's own
flex-direction default is `row`. That reasoning holds for a container that
declares flex-with-no-direction; it does not hold for one that declares no
layout at all.

`sgs/container` was also the ONLY general-purpose container defaulting to flex.
Its eleven siblings (accordion, card-grid, cta-section, feature-grid,
form-field-tiles, google-reviews, hero, multi-button, pricing-table, tabs,
trustpilot-reviews) all default to `""`; purpose-specific blocks correctly
declare their purpose (form=stack, gallery/post-grid/trust-bar/site-footer-row=
grid, site-header-row/site-footer=flex). This restores consistency rather than
introducing a new convention.

## Assertions — stated before measuring

1. A container that declares no layout renders `display: block`, not flex.
2. Its block-level children fill the container's width instead of shrink-wrapping.
3. A draft that DOES declare `display:flex`/`display:grid` still round-trips —
   the converter's explicit emission must be unaffected.
4. Nothing regresses in the wider page: parity must not fall.

## Live results — measured on the canary (page 2742), 1440px, after re-clone

The gift section's content band and its five children:

```
                              BEFORE (flex default)   AFTER (flow default)
band itself                   flex, 960               block, 960
  label  "Give the gift…"     241px  @left 233        960px @left 232
  heading "A gift she'll…"    366px  @left 473  <--   960px @left 232
  paragraph "For baby…"       511px  @left 233        960px @left 232
  cards container             960px  @left 233        960px @left 232
  "Send to ward" strip        592px  @left 233        960px @left 232
```

Assertions 1 and 2 hold. Note the heading's before-left of **473 = 233 + 241** —
it was sitting BESIDE the eyebrow label on the same wrapped flex line, not under
it. That was a live, unreported layout defect the same default caused.

The strip's own contents now span properly: text starts at x=251, the "Find out
more" link ends at x=1174, across a 958px bar with `justify-content:space-between`
— the spread-apart look the draft's own CSS specifies, which is only possible at
full width.

Assertion 3 — converter emission is unchanged, counted across both runs'
`extract.json`:

```
BEFORE: 12 x layout:"grid"  +  8 x layout:"flex"   (20 total)
AFTER : 12 x layout:"grid"  +  8 x layout:"flex"   (20 total)
```

The draft's real `display` declarations still transfer explicitly. The default
only governs containers where the converter deliberately writes nothing.

Assertion 4 — whole-page computed parity vs the draft, same measurement the
pipeline runs itself:

```
overall CSS   76%  ->  80%  ->  81%
1440px        79%  ->  83%  ->  84%
content       97%  ->  99%  ->  99%
```

(three successive runs: original, after the extraction fixes, after this change)

All four assertions hold.

## Scope

Shared schema default — affects every `sgs/container` instance on every site that
does not explicitly declare a layout. That is the intent: those are precisely the
containers whose drafts declared nothing.
