# FR-30-5 — SGS Product Search — Design Gate + Build Contract

**Status:** Design gate COMPLETE (Step 7a). Verdict: **GO — conditional** on the must-fixes below being built in from the start. This is the build contract for Step 7b — the sonnet implementer builds to THIS, verbatim.
**Date:** 2026-06-12 · **Thread:** sgs-theme · **Spec:** Spec 30 §FR-30-5
**Gate inputs:** /adversarial-council (6 personas) + the shipped `class-cart-proxy.php` hardened-REST pattern.

## End goal
A guest typing ≥2 chars into a shop search box gets product suggestions (title + thumbnail + permalink only), with **zero data leakage** — this codebase shipped a draft-product leak before (merchant feed); a repeat is unacceptable.

## Council headline (convergent — flagged by 2+ adversaries independently)
1. **Rate-limit on `REMOTE_ADDR` behind a CDN is broken (5/6).** Either every visitor collapses into one bucket (whole-shop search dies at 30/min total — deploy-blocker) or, if you trust `X-Forwarded-For`, it's spoofable to zero protection.
2. **The static string-presence guard is theatre (4/6).** Grepping the file for `tax_query`/`publish` passes while the guard is logically dead (overwritten var, early `return`, string in a comment, or empty exclusion list → `NOT IN ([])` matches everything).
3. **Single-layer query-only filtering fails OPEN (2/6 deep reviewers).** If `wc_get_product_visibility_term_ids()` returns `[]` (WC not loaded at boot order, term renamed on a WC update), the query returns EVERYTHING — drafts included.
4. **`esc_like` is NOT injection protection (2/6).** It only escapes LIKE wildcards; the value must still go through `$wpdb->prepare()` as a bound param.
5. **The two-pass `posts_where` query engine is over-scoped AND a landmine (3/6).** A global `posts_where` hook leaks into other queries; the `%q%` substring pass is an unindexed full-table scan (CPU-pin DoS). Collapse to one query + PHP sort.

**Effort honesty (ship-PM + cynic):** the plan's 30min design + 60min build is ~3× low. Realistic build = **~2.5–3 hours** — likely its own session.

## ARCHITECTURE (revised per council)

**Endpoint:** `GET /sgs/v1/product-search?q={query}` — `final class Product_Search_REST` (namespace `SGS\Blocks`), `includes/class-product-search-rest.php`. Lazy-load inside `woocommerce_loaded` + parse-time `class_exists('WooCommerce')` guard; route on `rest_api_init`. `permission_callback => '__return_true'` (declared explicitly). Arg `q`: `sanitize_text_field` + `validate_callback` (non-string + length reject).

**Query — SINGLE pass (cut the two-pass):** one `WP_Query`, `fields=>'ids'`, then hydrate only {id,title,permalink,thumbnail}:
`post_type=product, post_status='publish'` (STRING never array — pinned+asserted), `has_password=false, s=>q, fields=>ids, posts_per_page=20` (over-fetch→cap 10), `no_found_rows=true, update_post_meta_cache=false, update_post_term_cache=false, tax_query=[visibility], ignore_sticky_posts=true`. Then PHP `usort`: titles starting with the query (lowercased) float to top, tie-break title ASC; cap 10. No custom `posts_where`, no global hook, no `%q%` scan.

**Visibility exclusion — fail CLOSED + WC's real rule:**
`if (!function_exists('wc_get_product_visibility_term_ids')) return 503;` → `$vis = wc_get_product_visibility_term_ids();` → `$exclude = array_filter([$vis['exclude-from-search'] ?? 0]);` → if `woocommerce_hide_out_of_stock_items === 'yes'` and `$vis['outofstock']` add it → **`if (empty($exclude)) return 503;`** (FAIL CLOSED — never run an unfiltered query) → `tax_query NOT IN $exclude` on `product_visibility`/`term_taxonomy_id`.

**Result-level RE-GATE — defence in depth (most important add):** after the query, re-validate EACH id independently — `get_post_status===publish` && `!post_password_required($id)` && `wc_get_product($id)->is_visible()`; (rate-limited) log any REJECTED id as a near-miss canary (means the query-level filter missed).

**Response — FIXED:** exactly `{id:int,title:string,permalink:url,thumbnail:url}`, NO price/meta/stock/variation. `title = wp_strip_all_tags(html_entity_decode(get_the_title($id),ENT_QUOTES))`; client renders via `textContent`. `thumbnail` falls back to `wc_placeholder_img_src('woocommerce_thumbnail')` (never null/''). `WP_REST_Response`. **`Cache-Control: no-store, no-cache` on EVERY response** (prevents CDN cache-poison + reverse-leak of a just-hidden product).

**Input guards:** reject `mb_strlen<2`→400 AND `>64`→400 (after `sanitize_text_field`); non-string `q`→400. The `s=>` search is WP-parameterised (no hand-built `posts_where` → SQLi closed by construction; any future raw `$wpdb` MUST use `prepare()`, not `esc_like` alone).

**Rate limiting — real IP + global breaker:** real client IP = trusted-proxy-validated `CF-Connecting-IP` else `REMOTE_ADDR` (NEVER raw `X-Forwarded-For`); probe the canary at build for what's actually present; IPv6 bucket by /64; hash the key (no raw IP stored). Per-IP ≤30/60s fixed-window anchor (don't slide TTL — M4/BUG2) → 429 + `Retry-After`. **GLOBAL circuit breaker** site-wide ceiling (default 2000/min) → 503 + `Retry-After` served cheaply pre-DB (the real backstop vs botnet/shared-IP). Storage: `wp_cache_*` if persistent object cache else transient.

**No-JS fallback:** `<form role=search method=get action={home_url}>` + `name=s` + hidden `post_type=product` → `/?s={q}&post_type=product`. VERIFY at build the block theme's `search` template scopes to `post_type=product` (block-theme default mixes types) + escapes `get_search_query()`.

**A11y:** combobox — `role=search`→`role=combobox`+`aria-autocomplete=list`+`aria-controls`→`role=listbox`/`option` focusable links; keyboard Arrow/Enter/Escape; 44px; `role=status aria-live=polite` for count + errors. (Combobox roles non-negotiable; `aria-activedescendant` vs roving-focus is the implementer's choice — whichever passes axe + keyboard.)

**Client + error states:** debounce 300ms, min-2-char, ABORT in-flight on new keystroke. Empty (200 `results:[]`) → hide listbox + `role=status` "No products found". 429/503 → human message + `aria-live` + read `Retry-After`. Never a blank/raw dropdown.

## THE NAMED ENFORCEMENT RUNNER (replace the grep theatre)
A **behavioural** leak test — `tests/php/ProductSearchLeakTest.php` (or `scripts/product-search-leak-check.php`): seeds 5 negative controls (draft / private / publish-password / exclude-from-search / outofstock) PLUS 1 positive control; hits the real endpoint; **FAILS** if any negative-control id appears OR the positive control is absent (empty ≠ pass); asserts response keys are exactly `{id,title,permalink,thumbnail}`. Wire into `npm prebuild` AND `.git/hooks/pre-commit` (no CI in this repo). Dependency manifest (FR-30-0b): record `wc_get_product_visibility_term_ids()`, `product_visibility`, slugs `exclude-from-search`/`outofstock`, `is_visible()`, WC band 10.8.1, fail-closed expectation.

## ACCEPTANCE (QA Gate C — security rater MANDATORY; any guard fail = NO commit)
1. ≥2-char surfaces matches prefix-first (tie-break title ASC). 2. Seeded draft NEVER appears AND positive control DOES (empty≠pass). 3. Password/private/exclude-from-search/(hide-OOS)outofstock absent. 4. >30/min/IP→429+Retry-After; global ceiling→503. 5. `<img onerror>` title inert (textContent). 6. No-JS Enter→`/?s={q}&post_type=product` product-scoped (theme verified). 7. No price/meta/variation/stock in response. 8. `Cache-Control: no-store` on 200 AND 429. 9. 65+ chars→400, 1 char→400, `q[]=x`→400. 10. axe 0 + keyboard combobox at 375/768/1440, 44px. 11. Leak test FAILS the build when a negative control is made to leak (prove-it-fails). 12. `<150ms` = server-side p95 warm on a 500 published-simple-product fixture (staging).

## Build sequencing (Step 7b)
REST class (lazy-load + permission + length/scalar guards) → visibility tax_query + fail-closed + result re-gate → fixed response + no-store → real-IP rate-limit + global breaker → behavioural leak test wired to prebuild → block (combobox + debounce + abort + error states) → no-JS form + theme scope verify → live QA Gate C → `/sgs-update` → path-scoped commit. Deferrable: did-you-mean, operator-tunable rate-limit, admin 429 log.

## Open host-probe (at build start)
REMOTE_ADDR vs CF-Connecting-IP on the canary? CDN caching `?q=`? Theme `search` template scope + escape?

## Per-persona grades
WP/WC internals C- · Abuse D+ · Cynic D+ · Spec-lawyer C+ · Support C+ · Ship-PM C+. Convergent verdict: GO once the five headline must-fixes are in the contract (now folded in above).
