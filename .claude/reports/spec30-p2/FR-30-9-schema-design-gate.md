# FR-30-9 Schema — Build Contract + Design Gate (Step 9a)

**Date:** 2026-06-12 · **Thread:** sgs-theme · **Plan:** `2026-06-11-spec30-p2-differentiators-shop-schema.md` Step 9
**Status:** v2 LOCKED build contract — `/adversarial-council` (5 personas) run 2026-06-12, all load-bearing findings fact-checked against live code, must-fixes folded into **§F (authoritative — build from §F)**. Verdict was NO-GO on v1; §F resolves every convergent + fatal finding. Draft-leak history: this codebase shipped a draft→public JSON-LD leak, closed D204.

> **BUILD FROM §F.** §A–§E are the original audit + risk register (kept for context). §F is the corrected, authoritative build contract after the council + the FAQPage research reversal. Where they differ, §F wins.

---

## A. Audit of SHIPPED emitters (read live 2026-06-12 — PASS, no rewrite)

| Emitter | File | Verdict |
|---|---|---|
| PDP `ProductGroup` + `AggregateOffer` + `hasVariant` | `class-product-schema.php` (589 L) | **PASS.** Manifest-sourced inc-VAT prices only (SEC-1/2; CI grep-asserts no `wc_get_price_*`/`get_children`). Per-Offer `price`/`priceCurrency`/`availability`/`url`/`itemCondition`; `priceValidUntil` only when `saleEndDate` stored; `brand`/`sku`/`gtin{8,12,13,14}`/`mpn`/`identifier_exists`; `aggregateRating` gated on `get_review_count()>=1`; 16KB size-cap trims filler nodes keeping low+high anchors. |
| PDP gate path | `configurator-head.php` (288 L) | **PASS.** `sgs_get_bound_configurator_product_ids()` filters every ID through `is_publicly_listable()` (L77–85) BEFORE `Product_Schema::build_script()`. Single-product-focus gate (L143–148): ProductGroup emits only when exactly ONE distinct connected product. OG defers to Yoast/RankMath (SEC-9); ProductGroup does NOT defer (SEO plugins don't emit it for the configurator). |
| Shop `ItemList` (URL+position only) | `class-product-item-list.php` (233 L) | **PASS.** `is_publicly_listable()` (L159–180) is the single draft/private/hidden guard — belt 1 `get_post_status()==='publish'`, belt 2 `wc_get_product()->is_visible()` (excludes `catalog_visibility=hidden`). SEC-9 defer to Yoast/RankMath. No per-item Product node. |

**Audit conclusion:** the draft-leak guard is centralised and correct. The net-new work below must NOT add a redundant guard in `build_script()` (qc-council MEDIUM) and must NOT introduce a NEW leak vector.

## B. NET-NEW builds (grep-confirmed absent codebase-wide)

### B1 — `returnPolicyCountry` (PDP + Organization)
- **Source:** `get_option('woocommerce_default_country')` → **split on `:`** (WC stores `GB` or `GB:state` — take the country segment only). Override: if `sgs_configurator_returns` already carries a `returnPolicyCountry`, keep it.
- **PDP home:** inject into the `hasMerchantReturnPolicy` object at `class-product-schema.php` L146–153 (the `$returns = get_option('sgs_configurator_returns')` attach point) — add `returnPolicyCountry` to that array if absent.
- **Org home:** same value on the org-level `hasMerchantReturnPolicy`.

### B2 — Sitewide `Organization` + `WebSite` emitter (NEW file `includes/class-org-website-schema.php`)
- **Organization:** `name` (`get_bloginfo('name')`), `url` (`home_url('/')`), `logo` (custom-logo attachment URL → fallback site icon → omit), `sameAs` (operator social URLs — from a `sgs_org_schema` option; omit if none), `contactPoint` (omit if none), `address` (`PostalAddress` from `woocommerce_store_address`/`_address_2`/`_city`/`_postcode`/`woocommerce_default_country` split — omit any empty field), org-level `hasMerchantReturnPolicy` + `hasShippingService` (reuse `sgs_configurator_returns`/`sgs_configurator_shipping`).
- **WebSite:** `name`, `url`, `alternateName` (omit if none). **NO `SearchAction`** (grep-gate 0).
- **Emit context:** `wp_head` priority 11. Gate: `is_admin()` false, `is_feed()` false, front-end only. Emit once per page (static identity — `is_front_page()` is the natural home, but Google accepts sitewide; decide in red-team).
- **SEC-9 detect-and-defer:** **OPEN RISK — Yoast/RankMath ALSO emit Organization + WebSite.** Must defer (skip emit) when `sgs_configurator_seo_plugin_active()` is true, or we double-emit the two nodes SEO plugins already own. (The shipped ProductGroup does NOT defer because plugins don't emit it — Organization/WebSite are the OPPOSITE: plugins DO emit them.)

### B3 — Store-page `noindex` (NEW `wp_head` emitter)
- **Condition:** `is_cart() || is_checkout() || is_account_page() || is_wc_endpoint_url()`. Emit `<meta name="robots" content="noindex,nofollow">`.
- **SEC-9:** if an SEO plugin is active it owns the robots meta — defer (skip) to avoid a conflicting/duplicate tag. (Yoast already noindexes cart/checkout by default.)
- **Guard:** WC must be active (`function_exists('is_cart')`); front-end only.

### B4 — Remove rich-result `FAQPage`
- **KJC-4 = Option A** (strip schema, keep the block + on-page Q&A — Google dropped FAQ rich results 2026-05-07; the block's AI-citation/Bing framing stays).
- Remove the `add_action('wp_footer','sgs_emit_faq_page_jsonld',90)` + its `has_action` guard at `product-faq/render.php` L90–91.
- **DO NOT** delete `product-faq-schema.php` while keeping its `require_once` at `render.php:29` → PHP fatal (qc-council). Safe path: drop the add_action wiring; either neuter the schema file (keep the function defined, never hooked) OR delete the file AND remove the require together. Chosen: **delete the add_action only**; leave the file + require intact (zero fatal risk, function just never fires). Grep-gate: 0 `FAQPage` in live page source.

## C. aggregateRating source decision (KJC, DMCC-sensitive)
- Ground truth: fixture 540 has **0 WC-native reviews**; the 5 live reviews are **Trustpilot** (TrustScore 4.1). `build_aggregate_rating()` reads `get_review_count()` (WC-native) → returns null → **no aggregateRating emits.** That is CORRECT and DMCC-honest: we do not have WC-native review data to cite, and stubbing Trustpilot's score into schema without the verified-review provenance is the exact DMCC exposure to avoid.
- **Decision:** keep the WC-native `get_review_count()` gate as-is. aggregateRating omits on 540 (and any product without synced WC reviews) — never stubbed. If/when a verified-review→WC-review bridge ships, the gate emits automatically. **No change to `build_aggregate_rating()` this step.**

## D. Acceptance (live-probed, not assertion output)
1. Local JSON-LD validator: 0 errors on PDP / shop / sitewide shapes.
2. Draft/scheduled product fetched **as guest** → 0 JSON-LD (drafts 404 to guests + `is_publicly_listable` belt).
3. cart/checkout/account each carry `noindex,nofollow` (live DOM probe).
4. grep live source: 0 `SearchAction`, 0 rich-result `FAQPage`.
5. `returnPolicyCountry` present in PDP `hasMerchantReturnPolicy` + Organization.
6. With Yoast/RankMath simulated active → Organization/WebSite/noindex DEFER (no double-emit).

## E. Risk register for the red-team (attack these)
- **R1 (HIGH):** Organization/WebSite double-emit when an SEO plugin is active. Is SEC-9 defer wired for the NEW emitter, or only asserted?
- **R2 (HIGH):** noindex misfire — a mis-scoped conditional noindexing shop/PDP/home, or fighting an SEO plugin's robots tag.
- **R3 (MED):** `returnPolicyCountry` malformed — `GB:state` not split; empty default_country emitting `returnPolicyCountry: ""`.
- **R4 (MED):** FAQPage removal fatals the block (require/define mismatch).
- **R5 (MED):** Organization emitter pulling un-sanitised option data (`sgs_org_schema` sameAs URLs, store address) into inline `<script>` — XSS via JSON-LD if not HEX-flag-encoded.
- **R6 (LOW-MED):** Organization emitting on non-front contexts (feeds, REST, sitemaps, 404, preview) or duplicating across paginated pages.
- **R7 (DMCC):** any path that stubs the Trustpilot 4.1 score into aggregateRating without WC-native provenance.
- **R8-PLACEHOLDER (see §F8 for the LOCKED VAT contract).**
- **R8-ORIG (VAT-honesty — Bean 2026-06-12):** "inc. VAT" labels must NOT be hardcoded — UK VAT only applies above the ~£90k registration threshold; most early clients (incl. the canary, `woocommerce_calc_taxes='no'`) charge NO VAT. The price NUMBER is fine (follows WC tax settings); the LABEL is the risk. **In-scope structured-data fix for this step:** `class-llms-txt-products.php:199-210` hardcodes `"Price (inc. VAT): "` on every product in the AI-search llms.txt output — gate the "(inc. VAT)" segment on `get_option('woocommerce_calc_taxes')==='yes'` (bare "Price:" otherwise). Schema must NEVER emit `valueAddedTaxIncluded:true` (it currently emits none — keep it that way). **Out of scope here / parked:** the `product-card` `tax_mode` display-label framing (FR-30-8, already merged) — revisit as a focused display-layer pass + an FR-30-13 go-live item. See memory `inc-vat-not-default-gate-on-vat-registered`.
