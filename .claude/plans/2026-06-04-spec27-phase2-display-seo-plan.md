---
doc_type: phase-plan
project: small-giants-wp
thread: sgs-theme
plan_id: spec27-phase2-display-seo
spec: .claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md
created: 2026-06-04
status: PLANNED — ready to build. Phase 1 SHIPPED (D165). This plan covers the remaining buildable scope of Spec 27 (Phase 2) in execution detail + Phase R as a gated roadmap. Completing Phase 2 = Spec 27 acceptance criteria 7-8 met; Phase R (acceptance 9) is intentionally deferred behind a 2nd-shop-client trigger.
plan_label: "[PLAN: opus] — E1 JSON-LD + F1 SSR + auto-contrast are architectural/schema-exact; the rest is Sonnet implementation under an Opus orchestrator."
---

# Spec 27 Phase 2 — Display + SEO + AI-visible — Build Plan

**USP:** This is the half of the moat that makes the shop *discoverable*. Phase 1 lets Mama's sell; Phase 2 makes Google show the product with rich variant pricing, lets AI search engines read the whole catalogue (no-JS), adds the swatches/galleries/per-unit pricing that close the visible-quality gap with Kadence/Spectra, and ships the go-live safety check. It turns "structural closed-loop moat — partial" into the full claim.

**Plan label:** [PLAN: opus] (Sonnet does the mechanical build per unit; Opus orchestrates, designs the schema/SSR, fact-checks every subagent claim against live ground truth, runs the QC gates, self-reviews visible units with /ui-ux-pro-max + /playwright before declaring done).

**Docscore:** self-assessed A− against the phase-plan template (all 16 step fields present; QA gates commandable; KJC + pre-emptive decisions; entry context + tooling index). Re-run /docscore at first execution session.

**Aggregate effort estimate (AI-agent wall-time, non-coder, Claude builds + Bean QCs):** ~3–4 sessions for Phase 2. Critical path ≈ 150 min build + per-unit deploy/live-verify + 2 Bean sign-off gates. Phase R = multi-session, off critical path (gated).

## Phase success criteria (done when — Spec 27 acceptance 7-8)

- [ ] Google **Rich Results Test passes** the ProductGroup + per-variation Offers (brand / identifier / priceValidUntil-or-omitted / shipping / returns), 0 errors (unmapped-axis warnings OK) (E1).
- [ ] `curl` of the page with **JS disabled** shows price, availability, and the JSON-LD in the initial HTML — AI crawlers see the full catalogue (F1).
- [ ] Colour/image **swatches** render, are keyboard+SR accessible, and pill text auto-contrasts to ≥4.5:1 against any client palette (B2 + I2).
- [ ] Per-unit "£/unit" displays (derived live, never stored as a price) + server-computed "% off" + a cosmetic discount label (B3).
- [ ] Per-variation **gallery** swaps on selection with a variation→parent→placeholder fallback chain (A4).
- [ ] OOS vs nonexistent combinations are visually + SR-distinct and announced (C2).
- [ ] Canonical URLs correct; `?attribute_*` → canonical to parent; opt-in indexable variation promotion (E2).
- [ ] BreadcrumbList + product OG tags + a product XML sitemap (with per-variation `<image:image>`) present; price/sitemap purge on a price/stock/sale change (E3).
- [ ] **Go-live PREFLIGHT** flags £0 / no-image / draft / over-cap variations before publish (PREFLIGHT).
- [ ] **Tax-display-mode UI** (NEW): respects the WC price suffix; optional ex-VAT-with-VAT-amount display for trade; UK B2C default = single inc-VAT price (Price Marking Order). card==cart holds in every mode.
- [ ] Bean R-22-13 visual sign-off on the visible layer; **human NVDA/VoiceOver pass** completed (carry-over from Phase 1 — the last WCAG step before public marketing).

## Entry context (read before starting)

- `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md` §"Phase 2" FRs + §"Per-variation presentation meta" + §Acceptance 7-8 — the canonical requirements.
- `.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` — swatch/pill colours derive from these tokens; auto-contrast = build-time luminance (D161). Read before I2/B2.
- `plugins/sgs-blocks/includes/class-product-manifest.php` — the seeded manifest (already has pctOff + tax fingerprint); B3/A4 extend it.
- `plugins/sgs-blocks/includes/class-product-bindings.php` — the `sgs-product/field` resolver; E1/B3 read here.
- `plugins/sgs-blocks/src/blocks/product-card/{render.php,view.js,style.css}` + `option-picker/` — the visible layer (B2/A4/C2/tax-UI).
- `.claude/reports/sgs-configurator-moat-evidence.md` — Claim 5 (closed-loop) completes when Phase 2 SEO ships; FR-27-J1 needs an evidence row per new claim.
- Canary: page 589 / fixture 540 (48 SKUs). Creds `.claude/secrets/sandybrown.env`. Build via PowerShell; deploy by explicit-path scp + opcache reset.

## References

- Spec 27 §"Research evidence" — Google product-variants + `variesBy` closed-enum (Feb 2024), Merchant brand/GTIN/priceValidUntil/shipping/returns, AI-crawlers-no-JS (May 2026), FAQPage/llms 2026. Current as of 2026-06-03 (5 research agents + 2 councils).
- Memory `js-budget-measures-executed-not-prefetched`, `wp-interactivity-directives-wipe-ssr-when-bound-to-js-getters`, `canary-live-styles-come-from-wp-global-styles-post`, `scope-shared-block-changes-to-unused-variant`.
- This session (2026-06-04): tax verified card==cart under UK 20% VAT; manifest tax-fingerprint cache-bust shipped (9e26de74); executed-JS budget met (73KB).

## Tooling Index

| Type | Name | Used in |
|------|------|---------|
| skill | /delegate | per-unit model pick |
| skill | /brainstorming | B2 swatch UX, tax-UI mode design (design gates) |
| skill | /library-docs | E1/E3 — current Google Merchant + schema.org reference before designing |
| skill | /research-check | E1 — confirm 2026 Merchant variant-schema requirements at build time |
| skill | /seo-schema | E1/E2/E3 — JSON-LD generation + Rich-Results validation (+ seo-schema agent) |
| skill | /ui-ux-pro-max + /playwright | MANDATORY self-review of B2/A4/tax-UI before "done" |
| skill | /qc-council | before any commit touching the resolver/schema-emitter/SSR/SGS-block (blub.db 255) |
| skill | /qc-inline | per-unit inline checks |
| skill | /systematic-debugging | any bug — root-cause first |
| agent | general-purpose (sonnet) | the per-unit mechanical build (NO commit authority) |
| agent | design-reviewer | swatch/gallery visual + WCAG |
| agent | seo-schema | Merchant JSON-LD validation |
| agent | performance-auditor | re-check INP/CLS after galleries (A4) |
| mcp | playwright | live render / axe / Rich-Results render / schema-in-DOM checks |
| cli | wp-cli (via SSH) + token-gated webroot runner | fixture meta (swatch term_meta, gallery postmeta, variesBy) |
| external | Google Rich Results Test / Merchant preview | E1/E3 validation |

---

## Work units + dependency graph

```
TAX-UI (price suffix + ex-VAT mode) ─┐  (small, UK-relevant, early visible win)
I2 (theme tokens + auto-contrast) ───┼─→ B2 (swatches) ─┐
                                     │                   ├─→ [QA-VIS: Bean R-22-13 + ui-ux-pro-max + axe]
B3 (per-unit / %off / label) ────────┤                   │
A4 (per-variation gallery) ──────────┤                   │
C2 (OOS vs nonexistent) ─────────────┘                   │
                                                          ▼
E1 (ProductGroup+hasVariant JSON-LD) ─→ E2 (canonical) ─→ E3 (breadcrumb/OG/sitemap/purge) ─→ F1 (all-commerce-SSR)
                                                          │
                                          [QA-SEO: Rich Results 0 errors + curl-no-JS]
                                                          ▼
PREFLIGHT (go-live check) ─→ human NVDA/VoiceOver pass ─→ [SHIP GATE: Spec 27 acceptance 7-8 + Bean sign-off]
```

**Critical path:** I2 → B2 → QA-VIS → E1 → E2 → E3 → F1 → QA-SEO → PREFLIGHT → ship.
**Parallel-eligible:** TAX-UI ∥ B3 ∥ A4 ∥ C2 (all touch different render/manifest regions; coordinate the shared `product-card/render.php` by explicit-path commits + Bound-scoped classes — memory `scope-shared-block-changes-to-unused-variant`).

---

### Step 1 — TAX-UI: WC price-suffix + tax-display mode
  Model:       sonnet (after an inline design micro-gate on the mode set)
  Action:      Add a `taxDisplayMode` card attr (`auto` [follow WC] | `inc-suffix` | `ex-plus-vat`). `auto` = current behaviour (bare `wc_get_price_to_display`). `inc-suffix` appends WC's `woocommerce_price_display_suffix` (rendered via `wc_price()`-parity, the `{price_including_tax}`/`{price_excluding_tax}` placeholders honoured). `ex-plus-vat` (trade) shows the ex-VAT price + a separate "+ £X.XX VAT" line, both seeded as literals (SSR-safe, no JS getter). UK B2C default = `auto` with the shop set to inc-tax → single inc-VAT price (Price Marking Order compliant).
  Files:       `src/blocks/product-card/{block.json,render.php,view.js,edit.js,style.css}`, `includes/class-product-manifest.php` (seed both inc + ex literals + the suffix string when mode≠auto)
  Inputs:      Spec 27 §"Hard constraints" tax rules; this session's card==cart verification; WC option `woocommerce_price_display_suffix`
  Outcome:     A card can show a bare inc-VAT price (default), an "inc. VAT" suffix, or "£9.99 + £2.00 VAT" — all SSR, all card==cart, selectable per-card in the inspector
  Exec:        PARALLEL with steps 2,3,4
  Deps:        none
  Marker:      SESSION-START
  Time:        ~30 min
  Tooling:     /brainstorming (mode set), /wp-block-development, /qc-inline, Playwright
  On-Fail:     revert the block.json/render.php edit by explicit-path `git checkout`; the `auto` mode is the safe baseline (already shipped)
  Cold-Entry:  this plan; Spec 27 §tax; `class-product-manifest.php` (already seeds inc literals via wc_get_price_to_display); the 2026-06-04 tax commit 9e26de74
  Prompt:      "Add a per-card `taxDisplayMode` attribute to sgs/product-card (Bound/wc-product branch ONLY — never touch Typed/page-144). Values auto|inc-suffix|ex-plus-vat. Seed the inc-VAT and ex-VAT display literals + the WC price suffix into the per-instance data-wp-context (SSR; default == literal — the SSR-wipe rule). Render bare inc price for `auto`, append the WC suffix for `inc-suffix`, show ex price + a separate '+ £X VAT' line for `ex-plus-vat`. All via seeded context keys, no JS getter. Inspector control in edit.js. Bound-scoped CSS only. Return uncommitted + the live test result (card==cart in all 3 modes under a 20% VAT fixture)."
  Test:
    Happy:       mode=inc-suffix → card shows "£11.99 inc. VAT"; mode=ex-plus-vat → "£9.99 + £2.00 VAT"; both == cart
    Edge:        tax disabled → ex-plus-vat shows no VAT line (graceful); suffix option empty → inc-suffix == auto
    Fail:        binding to a JS-only getter → SSR wipe (the trap) → assert default context key == SSR literal
    Integration: Store API cart line price == displayed inc price across all modes

### Step 2 — I2: theme-token swatch colours + build-time auto-contrast
  Model:       sonnet
  Action:      Derive swatch/pill background colours from Spec 26 tokens (read the live `wp_global_styles` post, NOT just theme.json — memory `canary-live-styles-come-from-wp-global-styles-post`). Implement build-time luminance auto-contrast: at render, compute WCAG relative luminance of each swatch/pill background; pick `#000`/`#fff` text for ≥4.5:1. (CSS `contrast-color()` is a later progressive layer — D161.)
  Files:       `src/blocks/option-picker/{render.php,style.css}`, a shared `includes/render-helpers.php` luminance helper
  Inputs:      Spec 26 tokens; D161 auto-contrast decision
  Outcome:     Swatch pill text always meets 4.5:1 against any client palette with zero per-client override
  Exec:        SEQUENTIAL (gates B2)
  Deps:        none
  Marker:      (none)
  Time:        ~25 min
  Tooling:     /library-docs (WCAG luminance formula), /qc-inline, Playwright axe
  On-Fail:     fall back to the framework default (white-on-saturated, dark-on-pastel per-client override) — the shipped Phase-1 behaviour
  Prompt:      (dispatch) "Add a build-time WCAG-luminance auto-contrast helper (sRGB→relative-luminance→pick #000/#fff for ≥4.5:1) and apply it to sgs/option-picker swatch/pill text. Swatch background colours read from the merged global-styles (custom origin) value, not raw theme.json. Bound-scoped. Return uncommitted + an axe contrast pass on a pastel + a saturated palette."
  Test:
    Happy:       pastel-pink swatch → black text 4.5:1+; navy swatch → white text
    Edge:        mid-luminance grey (the 4.5:1 boundary) → correct pick
    Fail:        missing token → framework default, no crash
    Integration: client-palette restyle via wp_global_styles → swatch text re-contrasts

### Step 3 — B2: colour/image swatches via WC attribute term meta
  Model:       sonnet
  Action:      Add `_sgs_swatch_color` (sanitize_hex_color) + `_sgs_swatch_image_id` (absint + wp_attachment_is_image) term meta. Option-picker renders a colour chip / image swatch when present, text pill otherwise. Typed mode carries optional swatch fields on `optionItems`. Authoring: a term-meta UI (or a documented WP-admin term-edit field for Phase 2; full authoring is Phase R).
  Files:       `src/blocks/option-picker/{block.json,render.php,edit.js,style.css}`, `includes/` term-meta registration
  Inputs:      Step 2 auto-contrast; Spec 27 §"Per-variation presentation meta"
  Outcome:     Size pills stay text; Flavour shows colour/image swatches; keyboard+SR accessible; image validated with graceful fallback
  Exec:        SEQUENTIAL after Step 2
  Deps:        Step 2
  Marker:      (none)
  Time:        ~35 min
  Tooling:     /brainstorming (swatch UX), design-reviewer, /qc-inline, Playwright axe
  On-Fail:     no swatch meta → text pills (current behaviour); never a broken image slot
  Prompt:      (dispatch) "Add colour/image swatch support to sgs/option-picker via WC attribute term_meta (_sgs_swatch_color sanitize_hex_color; _sgs_swatch_image_id absint+wp_attachment_is_image+wp_get_attachment_image_src with fallback). Render colour chip / image swatch when set, text pill otherwise. Visually-hidden radio + label preserved (a11y). Auto-contrast text (Step 2 helper) on colour swatches. Bound-scoped. Return uncommitted + axe-0 + a missing-image fallback test."
  Test:
    Happy:       term with _sgs_swatch_color → colour chip; with image id → image swatch
    Edge:        invalid/deleted image id → falls back to text pill, no broken img
    Fail:        non-hex colour at save → rejected (sanitize_hex_color)
    Integration: swatch select still drives the manifest swap + availability grey-out

### QA Gate — Visible display layer
  Model:   inline (Opus self-review) + design-reviewer + Bean
  Exec:    SEQUENTIAL
  Deps:    steps 1,2,3,4,5 complete + deployed to canary
  Check:   `axe-core run scoped to .product-card--bound = 0 violations`; Playwright 3-breakpoint (375/768/1440) screenshots; `/ui-ux-pro-max` rubric ≥ A−; card==cart in every tax mode; swatch contrast ≥4.5:1 measured
  Pass:    axe 0; no h-scroll @375; swatches+gallery+per-unit render; Bean R-22-13 visual sign-off granted
  Fail:    log the gap, fix the owning unit, redeploy, re-gate (green automated gates ≠ design-complete — D165; expect the human review to catch UX gaps)
  Marker:  QA

### Step 4 — B3: per-unit £/unit (derived) + server %off + cosmetic discount label
  Model:       sonnet
  Action:      Add `_sgs_unit_divisor` (variation/CPT postmeta, range-validate 1–9999). At render, derive £/unit = live WC display price ÷ divisor (NEVER stored as a price). Seed `pctOff` per variation server-side from regular/sale (guard regular>0, cap 95). Add a cosmetic discount-type label (`postmeta`, save-time-reject if it contains a numeric %).
  Files:       `includes/class-product-manifest.php` (seed perUnitMinor + pctOff literals), `src/blocks/product-card/{render.php,view.js}`
  Inputs:      manifest (already seeds pctOff in U4); Spec 27 FR-27-B3
  Outcome:     Card shows "£1.04 per bar" + "30% off" (server-computed) + an optional label; all derived/seeded, none stored as price
  Exec:        PARALLEL with steps 1,5
  Deps:        none
  Marker:      (none)
  Time:        ~25 min
  Tooling:     /qc-inline, Playwright
  On-Fail:     omit per-unit line if no divisor; %off already shipped in U4 (safe baseline)
  Prompt:      (dispatch) "Add per-unit pricing to the configurator: _sgs_unit_divisor postmeta (absint, 1-9999). Derive £/unit at render = wc_get_price_to_display ÷ divisor, seed as a literal per variation (no JS getter). Ensure server %off (pctOff) guards regular_price>0 (no /0) and caps at 95. Add a cosmetic discount-label postmeta, sanitize_text_field, REJECT on save if it matches /\\d+\\s*%/. Bound-scoped. Return uncommitted + sale/divisor/label fixture results."
  Test:
    Happy:       divisor 12 on a £12.48 pack → "£1.04 per unit"; sale → "% off" server-computed
    Edge:        regular_price 0 → no %off, no /0; divisor 0/10000 → rejected
    Fail:        label "20% off" typed → save rejected (no fake-discount injection)
    Integration: per-unit recomputes on pill swap from seeded literals (no XHR)

### Step 5 — A4: per-variation gallery + fallback chain
  Model:       sonnet
  Action:      `_sgs_variation_gallery` (variation postmeta, JSON array of absint image ids). On selection, swap the gallery from seeded ids; prefetch on first card interaction (pointerenter/focusin), never on change (per the manifest payload spec). Fallback chain: variation gallery → variation image → parent image → placeholder.
  Files:       `src/blocks/product-card/{render.php,view.js,style.css}`, `includes/class-product-manifest.php`
  Inputs:      manifest; Spec 27 FR-27-A4 + §Manifest payload prefetch rule
  Outcome:     Selecting a variation swaps its gallery; missing gallery degrades gracefully; CLS 0 on swap
  Exec:        PARALLEL with steps 1,4
  Deps:        none
  Marker:      (none)
  Time:        ~30 min
  Tooling:     performance-auditor (CLS after galleries), /qc-inline, Playwright
  On-Fail:     no gallery meta → single variation/parent image (current behaviour)
  Prompt:      (dispatch) "Add per-variation gallery to sgs/product-card: _sgs_variation_gallery variation postmeta (JSON array of absint ids, validated). Swap gallery on selection from seeded ids; prefetch on first card interaction (pointerenter/focusin) NOT on change. Fallback: variation gallery → variation image → parent image → placeholder. Reserve image height (CLS 0). loading=eager+fetchpriority=high on the default; lazy on others. Bound-scoped. Return uncommitted + a gallery-swap + fallback-chain test + CLS measurement."
  Test:
    Happy:       variation with 3 gallery ids → swaps to first on select
    Edge:        variation with no gallery → parent image; parent none → placeholder
    Fail:        non-image id in array → skipped, no broken slot
    Integration: gallery swap + price swap + availability all fire on one select, 0 XHR, CLS 0

### Step 6 — C2: OOS vs nonexistent distinct + announced
  Model:       sonnet
  Action:      In the availability engine, distinguish "exists but out of stock" (show, aria-disabled, "(sold out)") from "combination does not exist" (show, aria-disabled, "(unavailable)"); distinct SR text; both announced via the existing aria-live.
  Files:       `src/blocks/product-card/view.js`, `option-picker/render.php`
  Inputs:      Phase-1 U5 availability engine; Spec 27 FR-27-C2
  Outcome:     A shopper (and a screen reader) can tell "sold out" from "not a real combo"
  Exec:        PARALLEL with steps 1,4,5
  Deps:        none
  Marker:      (none)
  Time:        ~15 min
  Tooling:     /qc-inline, Playwright axe + SR-text inspection
  On-Fail:     fall back to the single "(unavailable)" state (current Phase-1 behaviour)
  Prompt:      (dispatch) "Refine the configurator availability engine to distinguish OOS (variation exists, inStock=false → '(sold out)') from nonexistent (no such combo → '(unavailable)'). Distinct SR labels; both aria-disabled + announced via the existing aria-live. Bound-scoped. Return uncommitted + axe + SR-label test for both states."
  Test:
    Happy:       12-coffee (exists, OOS) → "(sold out)"; an impossible combo → "(unavailable)"
    Edge:        a combo that sells out post-load → re-sync flips it to "(sold out)"
    Fail:        SR label missing → axe/SR check fails the gate
    Integration: distinct states survive a pill swap + the 409 re-sync

### Step 7 — E1: ProductGroup + hasVariant Merchant JSON-LD (SSR)
  Model:       inline (Opus designs the schema shape) → sonnet (emit) → seo-schema (validate)
  Action:      Emit SSR `ProductGroup` (productGroupID, variesBy from operator-set `_sgs_variesby_value` term_meta mapped to the closed enum color/size/material/pattern/suggestedAge/suggestedGender; unmapped axes omitted from variesBy but kept as free-text; brand; aggregateRating when reviews exist; AggregateOffer low/high + offerCount=true total) + `hasVariant` (≤50 children, each sku + identifier [gtin13←global_unique_id else mpn←SKU else identifier_exists:false] + absolute image ≥250px + isVariantOf + nested Offer [price, priceCurrency at request time, priceValidUntil=scheduled-sale-end-or-OMITTED, availability, canonical url, itemCondition NewCondition]) + shippingDetails + hasMerchantReturnPolicy. `wp_json_encode` (HEX flags); all url via esc_url + same-origin. ≤16KB cap.
  Files:       NEW `includes/class-product-schema.php`, `render.php` (emit in `<head>`/body SSR), `class-product-bindings.php` (read)
  Inputs:      Spec 27 FR-27-E1 (verbatim shape); /library-docs current Merchant requirements; the fixture's variesBy term_meta
  Outcome:     Rich Results Test passes ProductGroup + per-variation Offers, 0 errors
  Exec:        SEQUENTIAL (E2/E3/F1 depend on it)
  Deps:        QA-VIS passed (visible layer stable)
  Marker:      SESSION-START
  Time:        ~45 min
  Tooling:     /library-docs, /research-check (confirm 2026 Merchant variant rules), /seo-schema + seo-schema agent, /qc-council (pre-commit), Google Rich Results Test, Playwright (schema-in-DOM)
  On-Fail:     emit nothing rather than invalid schema (invalid JSON-LD is worse than none); roll back the emitter
  Cold-Entry:  this plan; Spec 27 §E1 (the full shape); `class-product-bindings.php`; the fixture 540 variation data; the moat sheet (Claim 5 closes here)
  Prompt:      (dispatch to sonnet AFTER the inline schema-shape gate) "Implement includes/class-product-schema.php emitting the ProductGroup+hasVariant JSON-LD exactly per Spec 27 FR-27-E1 [paste the FR]. Read all commerce data from wc_get_product (never custom meta); variesBy from _sgs_variesby_value term_meta mapped to the closed enum (unmapped → free-text, not variesBy). priceValidUntil = scheduled-sale-end date or OMITTED (never a fabricated rolling date). All url esc_url + same-origin; wp_json_encode with JSON_HEX_* flags; ≤50 hasVariant children with AggregateOffer.offerCount = true total; ≤16KB. SSR in the initial HTML. Return uncommitted + the raw JSON-LD + a Rich Results Test result."
  Test:
    Happy:       Rich Results Test → ProductGroup valid, per-variation Offers valid, 0 errors
    Edge:        scheduled sale → priceValidUntil present; no sale → priceValidUntil OMITTED
    Fail:        unmapped axis → kept as free-text property, no invalid variesBy enum value
    Integration: currency at request time; offerCount = full 48 even though ≤50 children emitted

### Step 8 — E2: canonical + indexable escape-hatch
  Model:       sonnet (haiku-shape but keep with E-series)
  Action:      `?attribute_*` URLs emit `rel=canonical` → parent; no indexable thin variation pages by default; a per-variation `indexVariationUrl` block attr (default false) promotes a high-intent variation; canonical hreflang-neutral.
  Files:       `render.php` (canonical link), `block.json` (indexVariationUrl attr)
  Inputs:      Spec 27 FR-27-E2
  Outcome:     No duplicate-content thin pages; opt-in promotion works
  Exec:        SEQUENTIAL after E1
  Deps:        E1
  Marker:      (none)
  Time:        ~15 min
  Tooling:     /seo-technical, Playwright (canonical tag check)
  On-Fail:     default canonical-to-parent only (drop the opt-in promotion)
  Prompt:      (dispatch) "Add canonical handling to the configurator page: ?attribute_* → rel=canonical to the parent product URL; default no indexable variation pages; a per-variation indexVariationUrl block attr (default false) that, when true, sets a self-canonical + index for that high-intent variation. Return uncommitted + canonical-tag tests for default + opt-in."
  Test:
    Happy:       ?attribute_size=12-pack → canonical points to parent
    Edge:        indexVariationUrl=true → self-canonical + indexable
    Fail:        malformed attribute param → canonical to parent, no error
    Integration: canonical consistent with the E1 Offer url

### Step 9 — E3: BreadcrumbList + OG + product sitemap + freshness purge
  Model:       sonnet
  Action:      BreadcrumbList JSON-LD; og:type=product + price/availability OG tags; an SGS-generated product XML sitemap with `<image:image>` per variation image (mandatory SGS-generated OR a Playwright-verified Yoast/RankMath integration — not "documented delegation"); Last-Modified + cache-purge on the FR-27-G6 hooks so feed + page never serve a stale price.
  Files:       NEW `includes/class-product-sitemap.php` (register_rest_route or sitemap provider), `render.php` (breadcrumb/OG), purge hooks (shared with G6)
  Inputs:      Spec 27 FR-27-E3; the G6 purge-hook set (already wired in U6/U8)
  Outcome:     Breadcrumb + OG valid; product sitemap lists variation images; price/sitemap purge on change
  Exec:        SEQUENTIAL after E2
  Deps:        E2
  Marker:      (none)
  Time:        ~35 min
  Tooling:     /seo-sitemap, /seo-schema, /wp-rest-api, Playwright (sitemap fetch + OG), Google Rich Results (breadcrumb)
  On-Fail:     ship breadcrumb+OG even if sitemap slips (sitemap is the heavier sub-unit)
  Prompt:      (dispatch) "Add to the configurator: BreadcrumbList JSON-LD; og:type=product + product:price:amount/availability OG tags; an SGS-generated product XML sitemap with image:image per variation image (filtered to publish + visible). Hook Last-Modified + purge on the existing G6 stock/sale/price hooks. Return uncommitted + breadcrumb/OG validation + a sitemap fetch + a purge-on-price-change test."
  Test:
    Happy:       sitemap lists product + variation images; OG tags present; breadcrumb valid
    Edge:        draft/hidden product → excluded from sitemap
    Fail:        price change → sitemap + page Last-Modified update (no stale)
    Integration: OG price == E1 Offer price == on-page price

### QA Gate — SEO / AI-discovery
  Model:   inline + seo-schema agent
  Exec:    SEQUENTIAL
  Deps:    steps 7,8,9 complete + deployed
  Check:   Google Rich Results Test → 0 errors on ProductGroup+Offers+Breadcrumb; `curl -s <page> | grep -c 'application/ld+json'` ≥1 AND shows price+availability with JS off; sitemap validates; canonical correct
  Pass:    Rich Results 0 errors; JSON-LD + price + availability in no-JS HTML (F1); sitemap valid
  Fail:    fix the owning E-unit; never ship invalid schema
  Marker:  QA

### Step 10 — F1: all-commerce-in-SSR (verify + close gaps)
  Model:       inline (audit) → sonnet (fix any gaps)
  Action:      Audit the no-JS HTML: price, availability, copy, and JSON-LD must all be in the initial server response. Close any gap where a value only appears after JS (the manifest default literals already SSR; confirm JSON-LD + availability text are SSR too).
  Files:       `render.php`, `class-product-schema.php`
  Inputs:      Spec 27 FR-27-F1; AI-crawlers-no-JS research
  Outcome:     `curl` (no JS) shows price + availability + JSON-LD
  Exec:        SEQUENTIAL after E3
  Deps:        E1, E3
  Marker:      (none)
  Time:        ~15 min
  Tooling:     curl, Playwright (JS-disabled), /qc-inline
  On-Fail:     identify the JS-only value, move it to SSR seed
  Test:
    Happy:       curl shows default price + "in stock" + ld+json
    Edge:        OOS default variation → "out of stock" in no-JS HTML
    Fail:        a value JS-only → flagged + moved to SSR
    Integration: no-JS HTML matches the JS-rendered default state

### Step 11 — PREFLIGHT: go-live + setup check
  Model:       sonnet
  Action:      An admin (+ agent-callable) check before a configurator product is publishable: WC ≥9.8; every variation price >0 (no £0); each ≥1 image; published not draft; manifest ≤cap; JSON-LD passes a local Rich-Results check. Surface a client-legible "ready / N issues" report on the product edit screen.
  Files:       NEW `includes/class-configurator-preflight.php`, admin_notices hook
  Inputs:      Spec 27 FR-27-PREFLIGHT; the M-C6 go-live-guard slice
  Outcome:     A misconfigured product (£0/no-image/draft/over-cap) surfaces each issue before it sells
  Exec:        SEQUENTIAL (last build unit)
  Deps:        E1 (JSON-LD check), B2/A4 (image checks meaningful)
  Marker:      (none)
  Time:        ~25 min
  Tooling:     /wp-plugin-development, /qc-inline, Playwright (admin screen)
  On-Fail:     report-only (never block publish hard in Phase 2 — advisory)
  Prompt:      (dispatch) "Build includes/class-configurator-preflight.php: an admin-notice (+ a callable method) on the sgs/product edit screen counting variations with £0 price / no image / Draft status / manifest over cap, plus a local JSON-LD validity check. Show a client-legible 'ready / N issues' list. Advisory (does not hard-block publish in Phase 2). Return uncommitted + a deliberately-misconfigured-product test surfacing each issue."
  Test:
    Happy:       a clean product → "ready"; a £0 variation → "1 issue: variation X has no price"
    Edge:        draft product → "not published" flagged
    Fail:        no variations → graceful "not a configurator product" message
    Integration: the check reads the same WC data the live card does (no drift)

### Step 12 — Human NVDA/VoiceOver pass (carry-over) + moat-evidence update
  Model:       Bean (human AT) + inline (record)
  Action:      Bean (or a commissioned tester) runs a real NVDA + VoiceOver pass over the configurator (the one a11y step automation can't do). Record the result in the moat-evidence sheet; update FR-27-J1 claims for the new Phase-2 features (swatches/gallery/schema) with their evidence + durability rating; flip Claim 5 (closed loop) to fully-evidenced.
  Files:       `.claude/reports/sgs-configurator-moat-evidence.md`
  Inputs:      the deployed Phase-2 card; the Phase-1 axe/keyboard/structure evidence
  Outcome:     The WCAG 2.2 AA claim is backed by human-AT evidence (pre-public-marketing requirement met)
  Exec:        SEQUENTIAL (ship gate)
  Deps:        all build units + both QA gates
  Marker:      HANDOFF
  Time:        ~30 min (Bean-driven)
  Tooling:     NVDA (Windows) / VoiceOver (Mac), /handoff
  On-Fail:     log any AT gap as a fix unit; do not make the public WCAG claim until clean
  Test:
    Happy:       NVDA announces label+state+price/stock on every interaction; VoiceOver parity
    Edge:        swatch + gallery + per-unit announced correctly
    Fail:        any AT gap → recorded + fixed before the public claim
    Integration: human-AT result matches the axe/keyboard/structure automated evidence

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Swatch authoring UI in Phase 2 — full custom term-meta UI, or rely on WP-admin term-edit fields?
  - **Options:** [A] minimal: register the term_meta + a documented WP-admin term-edit field (B2 just renders) / [B] a custom swatch-picker UI in the option-picker inspector / [C] defer all authoring to Phase R
  - **Recommendation:** [A] for Phase 2 (render + WP-admin field); full authoring UI is Phase R (FR-27-R3)
  - **Why:** Phase 2's job is DISPLAY; the configurator must *render* swatches now, but the friendly authoring belongs with the Phase-R authoring controller. [A] ships the visible win without building authoring twice.
  - **Cost of wrong choice:** building a swatch UI now that Phase R supersedes = wasted build
  - **Who decides:** Bean (it's a scope/UX call)

- **Decision:** Product sitemap — SGS-generated, or integrate Yoast/RankMath?
  - **Options:** [A] SGS-generated XML sitemap (own provider) / [B] Playwright-verified Yoast/RankMath integration / [C] document delegation (spec forbids this)
  - **Recommendation:** [A] SGS-generated (self-contained, no plugin dependency — fits the "no plugin-stitching" moat)
  - **Why:** the spec explicitly rejects "documented delegation"; SGS-generated keeps the closed loop and works on any install
  - **Cost of wrong choice:** a plugin dependency undermines the closed-loop moat claim
  - **Who decides:** architect (Opus) — recommend [A]

- **Decision:** tax-display-mode default
  - **Options:** [A] `auto` (follow WC, single inc-VAT for UK B2C) / [B] `inc-suffix` default / [C] per-client
  - **Recommendation:** [A] `auto` (Price Marking Order compliant out of the box; trade clients opt into ex-plus-vat)
  - **Why:** UK B2C law requires inc-VAT prominent; `auto` + shop-set-to-inc = compliant with zero config
  - **Cost of wrong choice:** a non-compliant default = legal exposure for consumer shops
  - **Who decides:** Bean (confirmed this session — single inc-VAT default)

### Pre-emptive decisions (Hidden Decisions pass — reasoned inline; gemini-flash/cerebras were unavailable in recent sessions, so Opus ran the pass)

- **Decision:** Where does the JSON-LD live — `<head>` or body, and one block or page-level?
  - **Recommendation:** emit in the card's `render.php` (body is fine for JSON-LD; crawlers parse both) scoped to the bound product; page-level only if multiple configurator cards (then merge to one ProductGroup per product). Avoids duplicate ProductGroup if the same product appears twice.
  - **Why:** prevents a mid-step pause on "duplicate schema" when a page has 2 cards of the same product.

- **Decision:** `variesBy` when the shop's attribute isn't in Google's closed enum (e.g. "Pack size" isn't a standard enum value)?
  - **Recommendation:** map size→`size`; flavour has NO Google enum → OMIT from `variesBy`, keep as a free-text variant property (per FR-27-E1). Do NOT invent an enum value (invalid schema).
  - **Why:** the most likely mid-build pause; pre-answered by the spec.

- **Decision:** does enabling swatches/gallery change the executed-JS budget (73KB, just won)?
  - **Recommendation:** gallery prefetch fires on first interaction (not load) and is image bytes not JS; swatch CSS is tiny. Re-run the executed-JS measurement (initiatorType='script') after A4 — budget must stay ≤150KB. (Memory `js-budget-measures-executed-not-prefetched`.)
  - **Why:** prevents silently regressing the perf claim.

- **Decision:** is the fixture (540) missing data the Phase-2 units need?
  - **Recommendation:** YES — fixture-v2 needed: add `_sgs_swatch_color`/`_sgs_swatch_image_id` on flavour terms, `_sgs_variation_gallery` on a few variations, `_sgs_variesby_value` on the axes, `_sgs_unit_divisor`, GTIN (`global_unique_id`) on some variations. Build a `seed-48-sku-fixture-v2.php` extension as Step 0 of the first execution session (≤15 min).
  - **Why:** every Phase-2 unit tests against this data; missing it blocks the QA gates.

---

## Phase R — Roadmap (GATED: build when a 2nd shop client lands)

Not on the critical path. Until the trigger, the fixture is authored via WC's classic metabox. Fully specified in Spec 27 §"Phase R" — summarised here so the path to 100% of Spec 27 is visible (ADHD Rule 1 full-map):

- **FR-27-R1** — SGS authoring controller (`/sgs/v1/`) wrapping `WC_Product_Variable`/`Variation` set_*()+save() + explicit post-write side-effects; golden-master diff vs the native editor every WC major. Model: opus→sonnet.
- **FR-27-R2** — attribute/term provisioning + cartesian generation + bulk edit + upsert key + transactional rollback. Model: sonnet.
- **FR-27-R3** — presentation authoring (swatch/label/divisor/gallery/subset) + edit-safety (delete-with-orders, rename warnings). Model: sonnet. (Supersedes the Phase-2 minimal swatch-authoring KJC [A].)
- **FR-27-R4** — agency slug-templates (`sgs_product_template` CPT, export/import, provision-then-link). Model: sonnet.
- **FR-27-R5** — AI-builder shop setup from a brief (untrusted-LLM-output hardening: pa_ slug regex, sanitise, URL-reject, length caps, rate-limit). Model: opus(safety)→sonnet.
- **FR-27-F2** — AI-citation levers: FAQPage JSON-LD, llms.txt/llms-full.txt (publish+visible filtered, noindex, rate-limited), Merchant feed (GTIN, item_group_id), speakable. Model: sonnet.

**Trigger:** a 2nd shop client signs (Spec 27 §"Scope"). When it nears, run `/phase-planner` on Phase R with the real client's catalogue as the fixture.

**Completing Phase 2 = Spec 27 acceptance 7-8 met.** Phase R = acceptance 9-10. The thread reaches "100% of Spec 27 buildable-now" at the Phase-2 ship gate; Phase R is intentionally business-gated, not abandoned.

---

## Execution handoff

- **First session:** Step 0 (fixture-v2 seed, ≤15 min) → then the parallel visible group (TAX-UI ∥ B3 ∥ A4 ∥ C2) + the sequential I2→B2, to the Visible QA gate + Bean R-22-13 sign-off.
- **Second session:** the SEO chain E1→E2→E3→F1 to the SEO QA gate (E1 is the Opus design-gate + seo-schema validation).
- **Third session:** PREFLIGHT + the human NVDA/VoiceOver pass + moat-evidence update → ship gate.
- Per-unit: Sonnet builds (no commit authority) → Opus fact-checks live → /qc-council before any commit touching the resolver/schema-emitter/SSR → deploy by explicit-path → Bean sign-off on visible units. Use `/subagent-driven-development` for the parallel visible group.
