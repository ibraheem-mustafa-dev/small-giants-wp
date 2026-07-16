# Fix 9 — page-8 inline-styles register (Spec 32 §6.1), read-only

**Date:** 2026-07-12. **Method:** live enumeration of every `[style]` element on sandybrown page 8, each inline declaration classified vs Spec 32 §6.1 (permitted = a CSS custom-property VALUE `--x:…` / the `sgsCustomCss` residual band; forbidden = an inline property declaration like `padding:…`/`color:…`).

## Headline
- **99** elements carry an inline `style` attribute.
- **~78** carry ONLY permitted custom-property values (`--x:…`) — these are per-instance override vars (Spec-32 compliant by design).
- **21** carry a forbidden inline property declaration.
- **ALL 21 are non-SGS** — NOT ONE `wp-block-sgs-*` block emits a forbidden inline declaration. **Every SGS block on page 8 is 100% Spec-32 compliant.**

## The 21 violations — classified by source (none are SGS's contract)
| Source group | Count | Examples | Verdict |
|---|---|---|---|
| **Footer template part (WP core blocks + global styles)** | ~13 | `wp-block-group` footer padding, `wp-block-heading` font-weight:700 + margins, `wp-block-list` padding-left/line-height, `wp-block-site-logo` margin, `wp-block-button__link` border-radius:8px, `wp-block-column` flex-basis, "send to ward" group border-top | WP core inlines theme.json global-styles per block. Header/footer are OUTSIDE the clone-fidelity contract (memory `clone-fidelity-excludes-header-footer`). Not SGS. |
| **Header template part (WP core nav)** | ~2 | top nav-bar group border-bottom + padding; `nav`/`ul` font-weight:600 | Same — WP core + theme global styles on the header. Not SGS. |
| **WooCommerce blocks (third-party)** | ~4 | `woocommerce-customer-account` font-size, `wc-block-mini-cart` font-size, `mini-cart__badge` bg+colour, `mini-cart-contents` bg | Third-party WooCommerce block markup; SGS does not author these. Not SGS. |
| **A11y utility** | 1 | `.screen-reader-text` span: `position:absolute; clip-path:inset(50%); …` | The standard WP visually-hidden utility — a legitimate, required a11y pattern, not a styling violation. |
| **Body** | 1 | `body{padding-right:0px}` | WP scrollbar-compensation. Not SGS. |

## Diagnosis
The Spec-32 no-inline contract is **fully held across every SGS block** on page 8 (label, container, hero, heading, text, button, product-card, info-box, feature-grid, trust-bar, testimonials, option-picker, etc. — all render their styling into scoped `<style>` blocks). The residual inline styles are entirely:
1. **WP-core template-part chrome** (the header + footer, built from core blocks whose theme.json global-styles WordPress inlines by design) — and header/footer are explicitly excluded from the cloning-fidelity contract.
2. **Third-party WooCommerce** cart/account blocks.
3. **A legitimate a11y utility** + a body scrollbar rule.

## Recommendation (Bean picks scope)
- **No SGS Spec-32 work is warranted here** — the SGS block library is compliant. There is no converter/render source in SGS emitting a forbidden inline declaration.
- If a fully inline-free header/footer is ever wanted, that is a **theme template-part** project (rebuild the header/footer parts as SGS blocks or strip core global-styles inlining) — a separate track from the block library, and gated behind whether header/footer even matter for the clone (they don't today).
- The WooCommerce + a11y + body items are out of scope by nature (third-party / required a11y / WP-core).

## ADDENDUM — the `<style>` TAGS (Bean-flagged, 2026-07-12) — the real finding

The `style="…"` attribute check above is the NARROW question. Bean correctly flagged the broader one: the per-block scoped `<style>` TAGS the no-inline migration emits.

**Live facts (page 8):** 144 `<style>` tags total — 37 in `<head>`, **107 in the body**, of which **83 are SGS block-scoped** (`.sgs-hero-XXX`, `.sgs-lbl-XXX.wp-block-sgs-label`, `.sgs-btn-XXX.sgs-button`, `.sgs-pc-N …`, per-instance). **~33KB of CSS embedded in the HTML body across ~100 tags.**

**Classification vs Spec 32:** a `<style>` TAG is NOT an inline `style="…"` ATTRIBUTE — Spec 32 §6.1(b) explicitly sanctions "the block's own scoped `<style>`" as THE no-inline mechanism (matches WP core's `layout` support output). So by the contract as written these are COMPLIANT. **BUT** ~100 embedded `<style>` tags / 33KB is genuine bloat + non-cacheable (re-downloads every page) — a legitimate architectural concern, not a Spec-32 violation.

**The WP-native fix (deferred — Bean parked it):** the WordPress Style Engine "store" (`wp_style_engine_get_styles($css, ['context' => …])` + `wp_enqueue_stored_styles()`) collects every block's rules into ONE footer `<style>` block instead of ~100 scattered ones — how core avoids the scatter. SGS currently uses the per-block `['selector' => …]` echo mode. Switching to the store is a FRAMEWORK-WIDE, design-gated change (every block's render.php registers into the store rather than echoing) → research + design first. Parked to a fresh session (`P-STYLE-TAG-CONSOLIDATION`).

