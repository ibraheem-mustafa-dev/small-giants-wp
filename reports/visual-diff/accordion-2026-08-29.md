# Visual diff — sgs/accordion — 2026-08-29

verdict: PASS
intent_capture_passed: true
source_sha: not-a-staged-hash (see "On source_sha" below)

Covers commits `542e256aa` (rename + Shape-B migration) and `7d2de4e72` (border-colour
mechanism fix). Both were committed with the scoped bypass
`SGS_VISUAL_GATE_SKIP=accordion` because the capture proving them needs the code live on the
canary, which needs the commits to exist first. **This report is that debt being paid.**

## What changed

`sgs/accordion` declared a `style` ATTRIBUTE (the bordered/flush/card preset), which shadows
WordPress's reserved `style` object. Everything WP would have stored there was silently
discarded — the block's border, colour, typography **and spacing** supports had never
rendered. The preset is now `accordionStyle`, and border width/style/colour moved to
block-private attributes with their own `render.php` emission (Shape B).

## Assertions — stated before measuring

1. A palette-token border colour paints the resolved token colour on the block, not
   `transparent` and not the raw slug.
2. Border width and style paint from the block-private attributes.
3. **Negative control:** `borderStyle: "none"` paints no border at all — no width, no style.
4. Spacing stored in the native `style` object now survives to render, where it was
   previously discarded.

## Live results — measured on the canary

Measured with `node scripts/qa/check-border-roundtrip.js --blocks sgs/accordion`, which
authors a positive instance and a negative control on a throwaway page and reads computed
styles from the live DOM. Its own `--self-test` passes 16/16, including "checker FAILS when
the NEGATIVE CONTROL paints a border", so a pass here is not vacuous.

```
PASS  sgs/accordion
      [.wp-block-sgs-accordion <div>] border painted from attributes, control clean.
      Observed: positive[4px solid rgb(230, 138, 149)]
              · control [0px none rgb(58, 46, 38)]
              · expected colour rgb(230, 138, 149)

PASS 1 · FAIL 0 · NOT RUN 0 · SKIPPED 0
```

| Assertion | Result |
|---|---|
| 1 — token colour resolves and paints | ✅ `rgb(230, 138, 149)` — `"primary"` resolved live |
| 2 — width + style paint from attrs | ✅ `4px solid` |
| 3 — negative control paints nothing | ✅ `0px none` |
| 4 — native spacing survives | ✅ see below |

Assertion 4, measured separately on the canary against real stored content. Post 1583 stores
`{"style":{"spacing":{"padding":{"top":"40px","bottom":"40px","left":"24px","right":"24px"}}}}`:

```
BEFORE:  prepare_attributes_for_render() -> style = 'bordered'      (padding DISCARDED)
AFTER :  prepare_attributes_for_render() -> style = {"spacing":{"padding":{...}}}
         padding SURVIVES: YES (40px)
```

**The colour assertion failed on the first attempt, which is why it is worth stating.** The
initial implementation modelled its colour leg on `sgs/product-card`, which calls
`sgs_border_states_css()`. That helper always routes through `sgs_border_gradient_css()`, even
for a flat colour, and that primitive sets `border-color:transparent` and paints on a masked
`::before` ring — so the probe read `border-color = rgba(0, 0, 0, 0)`. Probing the helper's
only two callers in the same run showed `sgs/product-card` and `sgs/container` reporting the
identical value, confirming it as the helper's shape rather than an accordion typo.
`7d2de4e72` emits `border-color` directly for a flat colour and reserves the ring for an
actual gradient.

⚠ **Not fixed here, recorded for whoever owns those blocks:** `sgs/product-card` and
`sgs/container` carry that same transparent-border-colour defect, and product-card's negative
control additionally paints (`2px solid` where `0px none` is expected).

## Why before/after doesn't apply

The "before" state was dead code. The native border path could never render — every
`$attributes['style']['border']…` read evaluated a non-numeric string offset against the
string `"bordered"` and returned `false`. A before/after diff would compare a working border
against a border that was structurally incapable of painting, which proves nothing a single
live capture doesn't. Confirmed rather than assumed: `rest_validate_value_from_schema()`
rejects an object against `{"type":"string"}`, and the canary returned `style = 'bordered'`
for a post storing a spacing object.

Theme risk was nil: `theme/sgs-theme/patterns/faq-section.php:16` is a bare
`<!-- wp:sgs/accordion -->` with no attributes, and a census of the canary found **zero**
stored posts carrying a string-valued `style` (32 posts contain the block; 4 carry the object
form, which is assertion 4 above). Nothing could regress because nothing was working.

## On source_sha

`visual-report-sha.py` hashes the **staged index copy** of the block's `src/` files, so it can
detect a report written against different source than the commit it accompanies. Both
accordion commits had already landed before this capture was possible, so nothing is staged
under `src/blocks/accordion/` and the tool correctly reports "no staged files". Recording a
hash here would mean inventing one.

The equivalent provenance, which is checkable:

| | |
|---|---|
| Source commits | `542e256aa`, `7d2de4e72` |
| Deployed from | `c45b4f5dc` (both are ancestors) |
| Gates at deploy | 69/69 fast, 4/4 full |
| Probe page | id 3075, auto-deleted at end of run |
