---
doc_type: report
block: sgs/product-card
generated: 2026-06-03
verdict: PASS
first_paint_capture_passed: true
canary_page: /cart-increment-test/ (page 514)
---

# Visual diff — sgs/product-card (session 6 QC fixes + WCAG)

## verdict: PASS
## first_paint_capture_passed: true
Bound mode SSRs concrete price/image/title (no-JS safe); `data-wp-*` are enhancement only.

## Evidence (live, canary)
- **Bound WC card (513):** renders title + price + image + add-to-cart; add-to-cart → `POST /wc/store/v1/cart/add-item` 201 → `sgs/cart` badge increments, no reload, no `wc-ajax`.
- **No-JS add-to-cart:** the CTA is now an `<a href="<product permalink>">` (degrades without JS); `data-wp-on--click` + `preventDefault` intercepts when JS active. Pending-guard disables on in-flight.
- **WCAG (Mama's pink):** `.btn-primary` rest text computed = `rgb(58,46,38)` on pink `rgb(230,138,149)` = **5.28:1 PASS** (was white 2.49:1). Verified via computed style on page 514.
- **Card max-width:** standalone card capped via `--sgs-product-card-max-width` (overridable); cardMaxWidth control accepts raw CSS, injection-rejecting regex verified (`999px;}body{...}` rejected, `420px` accepted).
- **Box-shadow boundary** added (card visible on cream); body `gap` via spacing token.

## Review
3-rater QC-council + all findings fixed; security regex anchored + self-tested; `npm run build` green; `php -l` clean. No save() change → no deprecation.
