# Visual diff — sgs/product-card — 2026-08-23

verdict: PASS
intent_capture_passed: true
source_sha: 816e9daf

> Retires the MANUAL SKIP logged in `manual-skips.log` for this block on 2026-08-23.
> The skip was taken because the "after" state could not be observed before deploying,
> and deploying required the commit. The after-capture below is that missing half, taken
> post-deploy. **The claim made in the skip reason — "front end provably unaffected" — is
> now measured, not asserted.**

## What changed

`sgs/product-card`'s `ctaFontSize` was declared `{"type":"number","default":null}`.

A `null` default puts the attribute **in** the block's attribute object, so
`ServerSideRender` serialises it into the block-renderer query string as
`attributes[ctaFontSize]=` — an empty string — and the REST schema rejects `""` for a
number-typed param:

```json
{"code":"rest_invalid_param","params":{"attributes":"[ctaFontSize] is not of type number."}}
```

Six product cards on `archive-product.html` → six HTTP 400s → not one card rendered in
the Site Editor. The front end was never affected, because `render.php` receives real
attributes from saved post content rather than a serialised query string.

Fix: drop the `null` default, and change the two editor writes that cleared the attribute
back to `null` (`resetAll` and the `ToolsPanelItem` `onDeselect`) to clear to `undefined`.
Without that second half, the first client to press Reset would have re-broken it.

## Assertion under test

1. **Editor:** Product Archive renders every `sgs/product-card` with zero error banners
   and zero console errors.
2. **Front end:** `/shop/` is unchanged — this is an editor-side REST validation fix and
   must move nothing a visitor sees.

## Capture — front end, `/shop/`, same viewport, before vs after deploy

| Measure | Before (pre-deploy) | After (post-deploy, cache-bypassed) |
|---|---|---|
| `.product-card` count | 5 | 5 |
| Card heights (px) | 443 / 408 / 425 / 399 / 399 | 443 / 408 / 425 / 399 / 399 |
| CTA count | 5 | 5 |
| CTA computed `font-size` | 15px | 15px |
| CTA computed `font-weight` | 600 | 600 |

**IDENTICAL: true** (asserted by direct object comparison in-page, not by eye).

## Capture — Site Editor, `sgs-theme//archive-product`

| Measure | Before | After |
|---|---|---|
| `sgs/product-card` nodes | 6 | 6 |
| Cards rendering anything | **0** | **6** |
| "Error loading block" banners | present (2 visible, 4 blank zero-height cards) | **0** |
| `.block-editor-warning` | 0 | 0 |
| Console errors | 1 × 500 (unrelated: `wc/store/v1/.../collection-data`) + 6 × 400 | **none** |
| `block-renderer/sgs/product-card` 400s | 6 | 0 |

## Positive / negative control

Run live against the canary block-renderer with a real product (`1125`):

| Sent | Status | Emitted style |
|---|---|---|
| attribute absent | 200 | no `font-size` |
| `ctaFontSize=20` | 200 | `font-size:20px` |
| `ctaFontSize=44` | 200 | `font-size:44px` |
| `ctaFontSize=` (what the editor sent) | **400** | — |

The 20/44 pair is the positive control: it proves the setting is live and that
`render.php` really does consume it, which a grep for `font-size` in `render.php` had
wrongly suggested it did not. The empty-string row is the negative control: it reproduces
the exact defect on demand.

## Known-and-not-fixed

- The cards now render the **"No product selected"** placeholder, not real products.
  That is correct behaviour for this arrangement and NOT a remaining bug in the block:
  `woocommerce/product-template` supplies no post to the card in the editor, and
  `ServerSideRender` cannot forward block context in any case. Whether the template should
  use this arrangement at all is the open design question (remediation plan Task 5).
- 17 attributes across `sgs/audio`, `sgs/hero`, `sgs/media` and `sgs/quote` share the
  `type:number` + `default:null` shape. None can fire this today — those blocks have no
  `ServerSideRender` preview — so they are named here rather than changed unverified.
