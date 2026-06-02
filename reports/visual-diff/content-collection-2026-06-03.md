---
doc_type: report
block: sgs/content-collection
generated: 2026-06-03
verdict: PASS
first_paint_capture_passed: true
canary_page: /cart-increment-test/ (page 514) + REST block-renderer
---

# Visual diff — sgs/content-collection (NEW block, Phase E)

## verdict: PASS
## first_paint_capture_passed: true
Fully server-rendered (own WP_Query); each item rendered as a Bound `sgs/product-card`; no client JS needed for layout (CSS `--columns` grid).

## Evidence (live, canary)
- **Grid render:** `newest` rule on `sgs_product` → renders CPT 522 as a Bound product-card (with option-picker pills) inside `.sgs-content-collection__grid`. Responsive 1→2→3 columns (375/768/1024).
- **Empty state (FR-24-6):** `handpicked` with no IDs → renders `.sgs-content-collection__empty` "No item…" placeholder, never blank. Server-rendered.
- **Security:** `contentType` whitelisted (`sgs_product`/`product` + filter) before WP_Query; `handpickedIds`/`categoryTerm`/`count` sanitised + clamped; meta-cache primed (no N+1).

## Review
QC-council clean (security verified by 2 raters); `npm run build` green; `php -l` clean. Dynamic block (`save:()=>null`) — no deprecation. block.json 1.1.0.
