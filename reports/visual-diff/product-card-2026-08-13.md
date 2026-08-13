---
doc_type: reference
title: "Visual-diff report — product-card · tagBorderRadius accepts any CSS unit"
block: product-card
date: 2026-08-13
property: tagBorderRadius
verdict: PASS
first_paint_capture_passed: true
source_sha: 200da3b616e97fa0
---

# product-card — `tagBorderRadius` migrated from a px-only number to a CSS-length string

**Verdict: PASS**, by shared-mechanism equivalence with `sgs/label`, measured on
the same live deploy. See `reports/visual-diff/label-2026-08-13.md` for the
primary capture.

## Why this block's evidence is the label capture

`sgs/product-card`'s trial tag and `sgs/label` render their box through **one
shared emitter**, `sgs_label_box_css_rule()` (`includes/helpers-box.php`) —
deliberately, so the two produce byte-identical box CSS (the composite-mirror
requirement, R-31-9). Verified at source this session: that function has exactly
**two** callers, `label/render.php:273` and `product-card/render.php:373`.

The change under test is *in that shared emitter*. Measuring it once through
`sgs/label` exercises the identical code path this block uses. Both callers were
changed in the same commit, in the same way, and both `block.json` carry the same
`"type": [ "string", "number" ]` declaration.

⚠ **This is a stated equivalence argument, not a second independent capture of a
`product-card` instance on the page.** It is recorded plainly rather than
presented as one, because writing N reports from one block's capture — without
saying so — is a fabrication this repo has an incident of. The equivalence rests
on the two-caller fact above, which is checkable in one grep.

## What was measured, and where

- **Page:** https://sandybrown-nightingale-600381.hostingersite.com/t1b-border-radius-unit-probe/ (page 2363)
- **Deploy:** `--blocks-only`, `--payload`-scoped, isolated worktree.
  `payload-verify` matched all 83 live `block.json`. No `--allow-dirty`.
- **Result:** legacy int `16` -> `border-radius:16px`; `"1.5rem"` ->
  `border-radius:1.5rem`; `"0.5rem"` -> `border-radius:0.5rem`; `0` -> no
  declaration. PHP diagnostics: **0**.

## Why the change is deliberate (`--expect-change` reason)

The shared emitter did `intval( $radius ) . 'px'`, truncating every non-px unit
(`intval('1.5rem')` is `1`), and the zero-is-absent guard used `intval()`, so any
sub-1 rem/em value was dropped entirely. Both now handle real CSS lengths.

## ⛔ A REAL BUG THIS CAPTURE CAUGHT

The first deployed revision declared these attrs `"type": "string"`, which made
WordPress silently discard the stored legacy **number** and fall back to the
default — so existing instances would have lost their radius with no error and a
fully green build. Fixed with the union type and re-verified. Full account in the
`label` report.

## Residual, stated honestly

This block's own `ctaFontSize` (a bare unitless `NumberControl`) and
`pickerLabelFontSize` are the SAME defect class and are **not** fixed here —
they are rows 3-9 of the W3-d worklist and get their own capture.
