---
doc_type: visual-diff
block: sgs/notice-banner
date: 2026-08-02
verdict: PASS
first_paint_capture_run: false
first_paint_applicable: false
gate_exemption: interaction-only-css
decision: D467 residual sweep (register item M1 / Step Z)
site: sandybrown-nightingale-600381.hostingersite.com (Mama's Munches)
---

> **CORRECTED 2026-08-02.** This report originally carried
> a `first_paint_capture_passed` field asserting a pass. **No first-paint capture was run** — the field named a
> measurement that did not happen, and for most of these blocks none was possible (the block was
> not present on the measured canary page). The reasoning in the body was sound; the FIELD was not
> evidence. It has been replaced with what is actually true: no capture ran, and none is
> applicable, because a value substitution inside a `:focus-visible` rule cannot match at first
> paint. That claim is now enforced mechanically by
> `plugins/sgs-blocks/scripts/check-interaction-only-css.py`, which the pre-commit gate consults —
> so this class of change no longer needs a report at all.

# sgs/notice-banner — focus-ring token repoint (D467 sweep)

## What changed

One line in `src/blocks/notice-banner/style.css`, inside the existing `:focus-visible` rule. No
selector added or removed, no specificity change, no markup change, no JS touched.

```diff
- outline: 2px solid currentcolor;
+ outline: 2px solid var(--sgs-focus-color, currentcolor);
```

This repoints the outline colour onto the shared `--sgs-focus-color` token (defined
`theme/sgs-theme/assets/css/core-blocks-critical.css:125`, resolving to
`var(--wp--preset--color--accent)` per D467), with the pre-existing value kept as the
CSS `var()` fallback — so a client whose theme predates the token still gets byte-identical
behaviour. Offset, radius and box-shadow on this rule are untouched.

## Why first paint is provably unaffected

`:focus-visible` only ever applies after a user interacts (keyboard tab or programmatic
focus) — by definition after first paint. The change touches nothing that renders before
that: no element added/removed, no layout property, no JS. This is a mechanical single-token
colour substitution inside an already-existing declaration, not new logic.

## Live verification

Deployed to sandybrown 2026-08-02. Live compiled CSS confirmed via
`curl https://sandybrown-nightingale-600381.hostingersite.com/wp-content/plugins/sgs-blocks/build/blocks/notice-banner/style-index.css`:

```
focus-visible{...outline:2px solid var(--sgs-focus-color,...);...}
```

Cross-block proof the token resolves correctly on this client's live palette: the same
mechanism on `sgs/responsive-logo` was measured with Playwright `getComputedStyle` after
programmatic `.focus()` on the live homepage — `outlineColor: rgb(245, 208, 80)`, which
equals `getComputedStyle(document.documentElement).getPropertyValue('--wp--preset--color--accent')`
= `#f5d050` on this client. `sgs/notice-banner` was not present on the homepage at verification time
to repeat the live-focus measurement directly, so this report relies on (a) the deployed
source confirmed byte-for-byte correct via curl, and (b) the identical mechanism proven live
on a sibling block on the same page, same deploy, same token.

## Verdict

**PASS.** Single-property colour repoint, same mechanism proven live elsewhere in this same
deploy, zero first-paint/markup/JS surface.
