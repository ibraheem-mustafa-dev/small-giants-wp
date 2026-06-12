# FR-30-9 Schema — LOCKED BUILD CONTRACT (post-council)

**Companion to** `FR-30-9-schema-design-gate.md` (§A–§E = original audit + risk register). **This file is authoritative — build from here.** Where they differ, this file wins.

5-persona adversarial council (2026-06-12) returned NO-GO on v1. All load-bearing findings fact-checked against live code (CONFIRMED: accordion FAQPage emitter real at `accordion/render.php:99-105`; 3 existing Organization/LocalBusiness nodes — review-schema + google-reviews + trustpilot + testimonial; 3 VAT strings at `class-llms-txt-products.php` L199/L201/L210; `sgs_org_schema` does NOT exist; `build/blocks/product-faq/render.php` carries the wiring). This contract resolves every convergent + fatal finding. Build it verbatim.

## F1 — `returnPolicyCountry` (UNANIMOUS must-fix: empty-value guard)
Add to BOTH the PDP `hasMerchantReturnPolicy` object and the Organization `hasMerchantReturnPolicy`.
```php
$raw = (string) get_option( 'woocommerce_default_country', '' );
$cc  = strtoupper( strtok( $raw, ':' ) );            // 'GB:ENG' -> 'GB'; '' -> ''
if ( preg_match( '/^[A-Z]{2}$/', $cc ) ) {
    // inject returnPolicyCountry = $cc; else OMIT the key entirely — NEVER emit returnPolicyCountry:""
}
```
- PDP attach point: `class-product-schema.php` L146-153, where `$returns = get_option('sgs_configurator_returns')` is attached. Shape guard (required): only inject when `is_array($returns)`; if empty/non-array, attach nothing (do not fabricate a return policy). Inject is runtime/in-memory ONLY — never write back to the option (no migration needed).
- Org-level: same `$cc`, same guard, on the org `hasMerchantReturnPolicy`.

## F2 — New `includes/class-org-website-schema.php` (Organization + WebSite)
**Emit context (LOCKED — was "decide in red-team"): FRONT PAGE ONLY.** `is_front_page()` true, `is_admin()` false, `is_feed()` false, `! wp_is_json_request()`, `! is_404()`. One Organization + one WebSite node, home page only. Kills paginated-duplicate nodes AND the full-page-cache-across-auth-context risk (a single front-page node is all Google needs; matches Yoast).

**SEC-9 detect-and-defer (must-fix: widen from 2 plugins to the market).** Expand the detector. Drop the brittle `class_exists('RankMath')`; `RANK_MATH_VERSION` is the canonical constant. Detect:
```php
defined('WPSEO_VERSION')            // Yoast
|| defined('RANK_MATH_VERSION')     // Rank Math
|| defined('SEOPRESS_VERSION')      // SEOPress
|| defined('AIOSEO_VERSION')        // All in One SEO
|| function_exists('the_seo_framework')             // The SEO Framework
|| class_exists('SlimSEO\\Plugin', false)           // Slim SEO
|| defined('SQ_VERSION');           // Squirrly
```
ANY SEO plugin active -> defer entirely (emit neither node; the plugin owns site-identity schema). Add a dismissible `manage_options` admin notice telling the operator to fill the SEO plugin's Organization settings.

**Organization fields (emit ONLY data that exists — `sameAs`/`contactPoint` SCOPED OUT, see F5):**
- `@type`: `Organization`; `@id`: `home_url('/') . '#organization'` (stable canonical key vs the existing review-block nodes).
- `name`: `get_bloginfo('name')` — if empty string, OMIT the whole emitter.
- `url`: `home_url('/')`.
- `logo`: custom-logo attachment URL -> site-icon fallback -> OMIT.
- `address`: `PostalAddress` from `woocommerce_store_address`/`_2`/`woocommerce_store_city`/`woocommerce_store_postcode`/country(`$cc`). Each sub-field only if non-empty; if ALL empty, OMIT the whole `address`. Guard the address block on `function_exists('WC')`.
- `hasMerchantReturnPolicy`: reuse `sgs_configurator_returns` + F1 country, `is_array()` guard. OMIT if absent.
- `hasShippingService`: reuse `sgs_configurator_shipping`, `is_array()` guard, attach verbatim. OMIT if absent.

**WebSite node:** `@type`:`WebSite`; `@id`: `home_url('/') . '#website'`; `name` (omit if empty); `url`: `home_url('/')`; `publisher`: `{'@id': home_url('/') . '#organization'}`; `alternateName` (omit if none). **NO `SearchAction`.**

**Encoder (UNANIMOUS must-fix — no bare json_encode):** the new file MUST encode via the SAME HEX-flag set as `Product_Schema::encode()` (`JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE`). Preferred: extract a shared `Sgs_Schema::encode_jsonld(array $data)` static helper (one encoder, zero drift) and have `Product_Schema::encode()` delegate to it; if too broad this step, COPY the exact flag set with a comment pointing to the canonical. NEVER use `esc_attr`/`esc_html` as the JSON-LD escape.

**Single-emit guard:** a `private static bool $emitted` flag so the node emits once.

## F3 — Store-page `noindex` (`wp_head` emitter, priority 1)
**Negative guard FIRST (must-fix — never noindex the money pages):**
```php
if ( is_front_page() || is_shop() || is_product() || is_product_category() || is_product_tag() ) { return; }
if ( ! function_exists('is_cart') ) { return; } // WC inactive
if ( is_cart() || is_checkout() || is_account_page() || is_wc_endpoint_url() ) {
    echo '<meta name="robots" content="noindex,nofollow">' . "\n";
}
```
**SEC-9 nuance (must-fix M5):** account + WC-endpoint noindex fires REGARDLESS of SEO plugin (SGS-owned sensitive surfaces — Yoast does NOT noindex `/my-account/orders/` or `/lost-password/?key=...`). Only the cart/checkout pair may defer if an SEO plugin is active. Front-end only.

## F4 — FAQPage: REVERSED to KEEP + HARDEN (research 2026-06-12 + spec carve-out)
The plan's "delete `sgs_emit_faq_page_jsonld()`" is WRONG. Google dropped the FAQ *rich result* (7 May 2026) but FAQPage stays a valid schema type with live value for AI search (ChatGPT/Perplexity/AI Overviews) + Bing + Google page-understanding. Spec FR-30-9 carves out: "FR-27-F2's AI-citation FAQ blocks keep their non-Google framing." `product-faq` IS that block (D202).
- **`product-faq`:** KEEP UNCHANGED. Do NOT delete `sgs_emit_faq_page_jsonld()`, do NOT touch `render.php:90-91` or the require.
- **`accordion`:** KEEP feature; make it honest + safe.
  - `accordion/edit.js` L120-128: retitle the toggle from "FAQ Schema (SEO) / search engine rich results" to AI/Bing framing (e.g. "FAQ structured data — helps AI search engines and Bing cite your Q&A. Google removed the FAQ rich result May 2026; this is for AI/Bing/knowledge, not a Google SERP feature.").
  - `accordion/render.php` L96-107: harden the encoder — add `JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT` to the `wp_json_encode` at L105, and `wp_strip_all_tags()` the answer text before it enters `acceptedAnswer.text` (currently embeds raw rendered HTML — invalid FAQPage + XSS defence gap).
- **Acceptance change:** the "0 FAQPage" gate is RETIRED. Replace with: (a) both FAQPage emitters use the full HEX-flag set; (b) no FAQPage copy is framed as a Google rich result; (c) `</script><script>alert(1)</script>` in an accordion answer renders inert.

## F5 — `sameAs`/`contactPoint` SCOPED OUT this step (must-fix: no UI = empty forever)
`sgs_org_schema` does not exist (no UI, no writer). This step does NOT read it. Organization emits only from data that exists (F2). Parking follow-up: "Org `sameAs`/`contactPoint` need an operator settings UI (WC Settings tab -> social URLs + contact point; `register_setting` with `sanitize_callback` esc_url_raw per URL + `show_in_rest=false`) before they can emit." The Organization node is valid without them.

## F6 — `BreadcrumbList` (audit only)
Audit whether PDP/Shop `BreadcrumbList` is already emitted (WC core / theme / SEO plugin). If absent AND nothing else owns it, MAY add — only if cheaply confirmed. If WC core or an SEO plugin emits breadcrumbs, DO NOT duplicate. Report; do not force-build.

## F7 — aggregateRating (UNCHANGED — DMCC-honest)
Keep `build_aggregate_rating()` gated on WC-native `get_review_count()>=1`. Fixture 540 has 0 -> omits (correct). Never stub the Trustpilot 4.1 score.

## F8 — VAT label (LOCKED: simple store-level gate — Bean 2026-06-12)
Gate the "(inc. VAT)" segment on `get_option('woocommerce_calc_taxes')==='yes'`. Patch ALL THREE strings in `class-llms-txt-products.php`: L199, L201, L210. One helper to avoid drift:
```php
$vat = 'yes' === get_option('woocommerce_calc_taxes') ? ' (inc. VAT)' : '';
// 'Price' . $vat . ': '   and   'Price range' . $vat . ': '
```
(Per-product zero-rate precision deferred — simple gate chosen; canary is `'no'`. Residual zero-rated-on-VAT-registered edge noted in the FR-30-13 go-live checklist.)

## F9 — Acceptance (REVISED — live-probed, not assertion output)
1. Local JSON-LD shape validator (define it: `scripts/validate-jsonld.mjs` or a `wp eval` json_decode + required-key assertion) -> 0 structural errors on PDP/shop/front-page shapes. PLUS deployed PDP + home through Google Rich Results Test / schema.org validator -> 0 errors AND >=1 eligible item (Merchant listing on PDP, Organization on home). External test = ship gate; local = fast pre-gate.
2. Draft/scheduled product as guest -> 0 ProductGroup (live-probed). PLUS a published page embedding a draft-product card, guest AND author-preview -> 0 ProductGroup for the draft.
3. `noindex,nofollow` present on cart, checkout, `/my-account/`, AND a WC endpoint (`/my-account/orders/`); ABSENT on home, shop, a PDP, a product category (both directions).
4. grep live source: 0 `SearchAction`. (FAQPage 0-gate RETIRED — F4.)
5. `returnPolicyCountry` present + valid 2-letter in PDP + Organization; ABSENT (not "") when `woocommerce_default_country` blank.
6. Yoast (or a stub defining `WPSEO_VERSION`) active -> 0 SGS Organization/WebSite on front page. No SEO plugin -> exactly 1 each, stable `@id`s.
7. XSS: `</script><script>alert(1)</script>` in an accordion answer AND in `sgs_configurator_returns` -> inert.
8. `build/` parity: after `npm run build`, grep `build/blocks/accordion/render.php` confirms the HEX flags shipped.
9. VAT: `woocommerce_calc_taxes='no'` -> bare "Price:"/"Price range:" on all 3 paths; `'yes'` -> "(inc. VAT)".

## F10 — Structural gate (should-fix, build if cheap)
`scripts/check-jsonld-hex-flags.js` (sibling of `check-dead-controls.js`, prebuild-wired): fail the build if any `wp_json_encode(...)` feeding `<script type="application/ld+json">` lacks `JSON_HEX_TAG`. The structural defence (R-22-12) that would have caught the accordion gap. If out of scope this session, record as parking.

## F11 — Files (path-scoped commit set)
- NEW `plugins/sgs-blocks/includes/class-org-website-schema.php` (+ require/hook in the plugin bootstrap)
- `plugins/sgs-blocks/includes/class-product-schema.php` (F1 + shared encoder delegate)
- store-page noindex emitter (F3 — new include or appended to an existing head emitter)
- `plugins/sgs-blocks/includes/configurator-head.php` (expand SEO-plugin detector or add a sibling helper)
- `plugins/sgs-blocks/src/blocks/accordion/{render.php,edit.js}` (F4) + `build/` after rebuild
- `plugins/sgs-blocks/includes/class-llms-txt-products.php` (F8 ×3)
- (optional) `plugins/sgs-blocks/scripts/check-jsonld-hex-flags.js` + package.json prebuild (F10)
- NOT touched: `product-faq/*` (F4 keep), never-stage artefacts, the cloning thread's files.
