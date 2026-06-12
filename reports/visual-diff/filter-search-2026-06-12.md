# Visual diff — sgs/filter-search — 2026-06-12

verdict: PASS
first_paint_capture_passed: true

block: sgs/filter-search
change: NEW block (Spec 30 P2 FR-30-6) — a type-to-find search input nested inside a
  woocommerce/product-filter-attribute group. Server-side renders the input ONLY when the
  attribute has more than 15 visible terms (Baymard 16+ threshold); below threshold it renders
  nothing. view.js narrows the core WooCommerce chip list client-side (textContent match,
  `hidden` attribute — never innerHTML, never display:none-in-JS) and announces the narrowed
  count via an `aria-live` status region; 0 matches shows a visible "No matching options".
  Term count is visibility-scoped via `get_terms(hide_empty=true)` so draft-only terms (count=0)
  never appear. Filtering itself stays 100% core WooCommerce — this block only shows/hides chips.
canary: sandybrown-nightingale-600381.hostingersite.com/shop/ — live-tested against seeded
  fixtures: Ingredient attribute (16 visible terms + 1 draft-only "Saffron" on a draft product)
  and Allergen attribute (15 terms). Fixtures added to the template for the live test, then
  removed; the committed template wires filter-search on Flavour (12) + Size (4), both below
  threshold (graceful no-render).
verified_by: live Playwright on the deployed canary (R-22-11) + curl SSR DOM inspection
bean_eyeball: OWED (R-22-13 co-authoritative final sign-off at phase close)

## What changed (plain English)
When a filter has a long list of options (16 or more — e.g. a big ingredient list), a little
"type to filter" box appears above the options. As you type, the list narrows to matching
options and a screen-reader message says how many are shown; if nothing matches it says "No
matching options". Lists with 15 or fewer options don't get the box (they're short enough to
scan). Draft/hidden products' options never show up.

## Live verification (canary /shop/, seeded 16-term + 15-term fixtures)

| Check | Result | Verdict |
|---|---|---|
| First paint — input renders for 16-term attr (Ingredient) | exactly 1 `.sgs-filter-search__input`, nested in `[data-attribute-id="14"]` group | PASS |
| Boundary — 15-term attr (Allergen) renders NO input | Allergen group (`data-attribute-id="15"`) has no input | PASS |
| Boundary — 12-term (Flavour) + 4-term (Size) render NO input | committed template groups carry no input | PASS |
| Visibility-scope — draft-only term absent | "Saffron" (draft-only, count=0) not in page or chips (`saffronInChips=false`) | PASS |
| view.js bound | `dataset.sgsFilterSearchReady=1`; 16 chips read | PASS |
| Narrowing — type "oat" | only "Oat" visible; status "1 of 16 options shown" | PASS |
| Narrowing — type "a" | 12 visible; status "12 of 16 options shown" | PASS |
| Empty state — type "zzz" | 0 visible; status + visible message "No matching options" | PASS |
| Clear query | all 16 chips restored; status cleared; empty message hidden | PASS |
| Mobile 375px (drawer) | input height 49px, `min-height:44px`, font 18px (no iOS zoom), inside filter drawer | PASS |
| Console errors | 0 (only pre-existing favicon 404, unrelated) | PASS |

## Cross-family QC (haiku rater — findings are hypotheses, fact-checked)
PHP escaping CLEAN · XSS (textContent/hidden only, no innerHTML) CLEAN · visibility-scope
(hide_empty) CLEAN · threshold boundary (render when count>=threshold) CLEAN · WCAG
(label + aria-live + aria-describedby) CLEAN · robustness LOW (silent graceful degradation on
missing DOM/WC funcs — correct progressive-enhancement pattern, no change). No security or logic
defects.

**Result: PASS. first_paint_capture_passed: true.** Boundary (16 shows / 15 hides), draft-only
visibility scoping, client narrowing + count announce + empty state, and a 44px mobile input are
all live-verified on the deployed canary.
