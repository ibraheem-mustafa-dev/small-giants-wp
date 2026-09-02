# Visual diff — sgs/product-card — 2026-09-02

verdict: PASS
intent_capture_passed: true
source_sha: 38ce7bd917971ddc

## What changed

Added `imageDecorative` (boolean, default `false`), scoped to TYPED mode only
(`sourceMode: 'typed'`) — a live WooCommerce/CPT product photo (bound mode) is genuine
shopping content a shopper needs, and can never be marked decorative. The control sits
inside the existing "Content overrides" ToolsPanel's image `ToolsPanelItem`, gated the same
way that panel already gates typed-mode-only controls. `render.php`'s typed-mode image
render path (`includes/product-card-builtin-render.php`, not the block's own render.php —
this block's typed rendering lives in a dedicated helper file) blanks the alt and adds
`aria-hidden="true"` when set.

## Assertion

An unset card renders byte-identical (`imageDecorative` defaults false). Bound-mode cards
never expose the control at all — confirmed by the same gate that already scopes the rest
of that ToolsPanelItem to typed mode.

## Live capture — sandybrown canary, REST-created probe instance

Probe: one `sgs/product-card` instance, `sourceMode: 'typed'`, `imageDecorative: true`.

| Measure | Result |
|---|---|
| Rendered `<img class="sgs-product-card__image">` alt | `""` ✅ |
| `aria-hidden="true"` on the same `<img>` | ✅ |

## Risk

No markup change for existing content — `imageDecorative` defaults false. No WooCommerce/
bound-mode logic, variant configurator, or pricing-ladder code touched (confirmed by scoped
diff review).
