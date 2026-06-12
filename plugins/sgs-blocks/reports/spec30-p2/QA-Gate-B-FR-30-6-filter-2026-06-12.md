# QA Gate B (filter half) — FR-30-6 searchable attribute filter

**Date:** 2026-06-12
**Thread:** sgs-theme (Spec 30 P2)
**Canary:** sandybrown-nightingale-600381.hostingersite.com (WC 10.x / WP 7.0)
**Block:** `sgs/filter-search` — placed live in `templates/archive-product.html`
sidebar (`attributeId:2` = pa_flavour, `attributeId:1` = pa_size)
**Verifier:** main agent (live probes + seeded fixtures, not a subagent self-report)

## Verdict: PASS — all FR-30-6 Done-when items live-verified on /shop/

The type-to-find filter auto-shows only at **≥16 visible terms**, narrows the core
WC chips with an ARIA-announced count, and excludes draft-only terms. Verified by
seeding the real placed block (pa_flavour) across the 16/15 boundary, then cleaning
the canary back to its original 12-term state.

## Mechanism (from `filter-search/render.php`)
- Threshold = `max(2, threshold ?? 16)`; `count($terms) < $threshold` → renders
  nothing (the boundary).
- Term count via `get_terms(['taxonomy'=>$tax,'hide_empty'=>true])` — WP's
  `term_taxonomy.count` is incremented for **published** posts only, so draft-only
  terms (count=0) are excluded. No unscoped `get_terms()`.
- `view.js` narrows `.wc-block-product-filter-chips__item` within the nearest
  `.wp-block-woocommerce-product-filter-attribute` by toggling `hidden` only —
  the **core filtering mechanism (URL params) is untouched**.

## Ground truth (canary, pre-seed)
- `pa_flavour` (attr 2): 12 terms, all published-attached (count=3 each).
- `pa_size` (attr 1): 17 terms total, 4 published-attached.
- ⇒ Both below 16 → filter-search correctly renders **no input** in the clean state.
  Boundary fixtures were required (plan Step 6 Tooling anticipated this).

## Per-item evidence (seeded against the live placed pa_flavour block)

### Boundary — 16 shows, 15 hides · PASS
- Seeded 5 new `fr306-test-*` flavour terms + 1 published fixture product (1148);
  attached 4 → **pa_flavour published count = 16**. `/shop/` rendered exactly one
  filter-search input, aria-label **"Search Flavour options"** (pa_size at 4 still
  rendered none).
- Detached 1 → **count = 15** → `/shop/` input **absent** (0 instances). Boundary
  confirmed: input iff visible-term-count ≥ 16.

### Draft-only term excluded · PASS
- Created a **draft** product (1149), attached the 5th term `fr306-test-5`.
- `pa_flavour` published count **stayed 15** (term.count for `fr306-test-5` = 0);
  `/shop/` input remained absent. A draft-only term neither counts toward the
  threshold nor appears.

### Narrowing + ARIA announce · PASS (live, Playwright CLI, 1440px)
- Restored to 16; flavour filter rendered **16 chips** (`data-total=16`).
- Typed **"test"** → narrowed to exactly **4 visible chips** (the FR306 Test terms);
  live region announced **"4 of 16 options shown"**.
- Typed **"zzqxnope"** → **0 visible**, live region **"No matching options"**,
  visible `.sgs-filter-search__empty` message shown.
- **Zero console errors.** Core chips only `hidden`-toggled — core filtering intact.

## Cleanup (canary restored)
Deleted fixture products 1148 + 1149 and all 5 `fr306-test-*` terms. `pa_flavour`
back to **12 terms** (total + published), `/shop/` input gone. Canary returned to
its pre-test state.

## FR-30-6 status: DONE-when MET (live evidence)
1. 16-term renders input / 15-term renders none — ✅ boundary
2. typing narrows + announces count — ✅ "4 of 16 options shown"
3. draft-only term absent — ✅ (count stays 15, term.count 0)
4. narrowed option filters identically to core — ✅ (view.js toggles `hidden` only)
5. visibility-scoped term population — ✅ (`hide_empty=true`, no unscoped get_terms)
