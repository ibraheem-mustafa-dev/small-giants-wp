---
doc_type: reference
version: "1.0"
spec_ref: specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md §FR-30-13
created: 2026-06-12
purpose: Repeatable pre-launch gate run before any SGS client shop takes real money.
scope: Run once per client, top-to-bottom. Every item must be ✅ or a recorded conscious N/A before the shop accepts live payments.
---

# SGS WooCommerce Shop — Go-Live Checklist

**Version:** 1.0  
**Spec source:** `specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md` §FR-30-13  
**Applies to:** every SGS client shop before first live payment is taken.

---

## How to use

1. Copy a new row into the [Per-Client Run Log](#per-client-run-log) below.
2. Work through every section top-to-bottom on the target environment (not local, not canary — the live client domain).
3. Every item must reach ✅ Pass **or** carry a recorded conscious N/A (with reason) in the Notes column before going live. A single ☐ that is not N/A = **blocked**.

Example URL used in probes: `https://sandybrown-nightingale-600381.hostingersite.com` (canary). Replace with the live client domain.

---

## Section 1 — Payments & Legal

| ID | What to verify | Named probe | Pass criteria | Status |
|----|----------------|-------------|---------------|--------|
| PL-1 | Payment gateway is in **LIVE mode** (not sandbox/test) | Gateway dashboard → confirm "Live" mode enabled. OR place a real low-value transaction (e.g. £0.01) via the actual checkout and refund it immediately. | A live (not sandbox) transaction succeeds and appears in the gateway's live transaction log. | ☐ |
| PL-2 | WooCommerce coming-soon mode is **off** | `wp option get woocommerce_coming_soon` via SSH: `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73 "wp option get woocommerce_coming_soon --path=~/domains/<client-domain>/public_html"` | Returns `no`. WC 10+ defaults to `yes`, which silently hides all store pages. | ☐ |
| PL-3 | VAT-registration state matches price labelling | `wp option get woocommerce_calc_taxes` (same SSH pattern). If `no`: `curl -s https://<client-domain>/shop/ \| grep -i "inc. vat"` — expect zero matches. If `yes`: confirm "inc. VAT" labels render on the PDP price display. | Labelling matches the client's actual VAT-registration status. UK threshold is ~£90k turnover — never assume a new shop is VAT-registered. (Memory: `inc-vat-not-default-gate-on-vat-registered`.) | ☐ |
| PL-4 | Cookie-consent / PECR compliance in place if any capture or analytics is active | Manual: is the notify-me e-mail capture or any analytics pixel (GA4, Facebook Pixel, etc.) live on the site? If yes: is a consent mechanism present and operational before any tracking fires? | PECR-compliant (explicit opt-in before non-essential tracking fires) **or** no active capture/analytics — confirmed and recorded. | ☐ |
| PL-5 | Privacy-policy page is published and assigned in WP | `wp option get wp_page_for_privacy_policy` (SSH). Then: `wp post get <returned-ID> --field=post_status` | Returns a non-zero page ID whose `post_status` is `publish`. Required for the notify-me consent link via `get_privacy_policy_url()`. | ☐ |

---

## Section 2 — Structured Data & SEO (FR-30-9)

| ID | What to verify | Named probe | Pass criteria | Status |
|----|----------------|-------------|---------------|--------|
| SE-1 | `returnPolicyCountry` populated on PDP and Organisation schema | `curl -s https://<client-domain>/product/<any-published-slug>/ \| grep -o '"returnPolicyCountry"[^,}]*'` | Non-empty value (`"returnPolicyCountry":"GB"` or equivalent) appears at least once in the PDP response. Also present inside the `Organization` node on the front page (run the same grep against the homepage). | ☐ |
| SE-2 | Organisation schema completeness | `curl -s https://<client-domain>/ \| grep -o '"@type":"Organization"[^<]*'` — then validate the full JSON-LD block via `python -c "import sys,json,re; body=sys.stdin.read(); blobs=[json.loads(m) for m in re.findall(r'<script[^>]*type=\"application/ld\+json\"[^>]*>(.*?)</script>', body, re.S)]; [print(b) for b in blobs if b.get('@type')=='Organization'" <<< "$(curl -s https://<client-domain>/)"` | `logo`, `url`, `address.streetAddress` (or a recorded reason they are blank — e.g. client refused to supply address). `sameAs` recommended if the client has social profiles. | ☐ |
| SE-3 | Draft products **absent** from all schema | `curl -s https://<client-domain>/product/<any-draft-product-slug>/` (a product in draft status) | HTTP 404 or redirect (not 200), and zero JSON-LD in the response body. Draft products must never surface in schema. | ☐ |
| SE-4 | Cart, checkout, and account pages are `noindex` | For each page: `curl -s https://<client-domain>/cart/ \| grep -o 'noindex'` ; repeat for `/checkout/` and `/my-account/` | Each returns `noindex` in the response (either in a `<meta name="robots">` tag or an `X-Robots-Tag` header). | ☐ |
| SE-5 | `SearchAction` absent from sitewide schema | `curl -s https://<client-domain>/ \| grep -o '"SearchAction"'` | Zero matches. `SearchAction` was removed per FR-30-9; its presence would be a regression. | ☐ |
| SE-6 | `FAQPage` schema **present and hardened** where FAQ/accordion content exists, with honest on-page framing | `curl -s https://<client-domain>/product/<slug-with-faq-or-accordion-content>/ \| grep -o '"@type":"FAQPage"'` — expect a match where FAQ content is present (absence is fine on pages with no FAQ/accordion content). Also confirm the emitted schema is HEX-encoded and inspect the visible FAQ copy. | `FAQPage` is emitted on every page that uses the `product-faq` / `accordion` blocks, is HEX-encoded (hardened), and no on-page copy claims a "Google rich result". Framing must reference AI-search (ChatGPT/Perplexity/AI Overviews) + Bing visibility only. Per D215 (2026-06-12): Google dropped the FAQ *rich result*, but `FAQPage` remains valid schema consumed by AI search + Bing, so the framework KEEPS it. | ☐ |

---

## Section 3 — Product Data & Content

| ID | What to verify | Named probe | Pass criteria | Status |
|----|----------------|-------------|---------------|--------|
| PD-1 | No published products are missing a SKU | SSH: `wp post list --post_type=product --post_status=publish --field=ID --format=ids \| xargs -n1 wp post meta get --key=_sku` — look for any empty/blank lines | All published products return a non-empty SKU. Missing SKUs cause Google to silently downgrade merchant listings. Record any gaps and fill or consciously accept. | ☐ |
| PD-2 | No published products are missing a GTIN / barcode | SSH: `wp post list --post_type=product --post_status=publish --field=ID --format=ids \| xargs -n1 -I{} bash -c 'echo "Product {}: $(wp post meta get {} _global_unique_id)"'` | All products have a `_global_unique_id` value, **or** the absence is consciously accepted (e.g. handmade items without a barcode — record the reason). | ☐ |
| PD-3 | Per-unit denomination strings contain no placeholder text | Open every variable product's PDP on the live site; inspect the buybox `perUnitDenomination` display (e.g. "per 100g", "per kg"). | No string reads "placeholder", "TBC", "TODO", or similar. Real denominations are present for every variable product. | ☐ |
| PD-4 | Statutory content present for the client's vertical | **Food clients (e.g. Mama's Munches):** manual — open each published product's PDP and confirm allergen information appears in the FR-30-2 content slot (the designated statutory content area). **Other verticals:** confirm equivalent regulatory content is in place (e.g. returns/delivery info for general retail). | Content confirmed present and readable on the live site, or a recorded reason why it is N/A for this vertical. | ☐ |
| PD-5 | Per-variation gallery images and alt text populated | Open a PDP for each variable product; select each variation and confirm: (a) the main gallery image swaps, (b) the image `alt` attribute is non-empty (inspect the DOM: `document.querySelector('.wc-block-product-image img').alt`). | Gallery swaps on variation selection; all displayed images have a non-empty `alt` (the framework falls back to the product name automatically, but client-supplied alt is preferred for SEO). | ☐ |
| PD-6 | Review source connected with real content or empty-state deliberate | Open the PDP reviews section on the live site. Check Trustpilot sync status in WP Admin → SGS Settings → Reviews. | Either ≥1 genuine synced review is visible **or** the empty-state inspector toggle is deliberately set to "hidden"/"Reviews coming soon" (not a broken layout gap). Static/baked review text must be absent everywhere (UK DMCC Act — displaying trader is liable). | ☐ |

---

## Section 4 — Interactive Features (this build)

| ID | What to verify | Named probe | Pass criteria | Status |
|----|----------------|-------------|---------------|--------|
| IF-1 | Cloudflare Turnstile keys are REAL (not Cloudflare's public test keys) — **if notify-me capture or any SGS form is active** | WP Admin → Settings → SGS → Turnstile: confirm Site Key and Secret Key are NOT `1x00000000000000000000AA` (always-passes test key) or `2x00000000000000000000AB` (always-blocks test key). Then load an out-of-stock PDP and confirm the Turnstile widget visually renders in the notify-me form. | Real per-domain keys from `dash.cloudflare.com` are configured; the widget renders on an out-of-stock PDP. N/A if notify-me is not active for this client. | ☐ |
| IF-2 | option-picker → cart wiring functions end-to-end | On a variable in-stock product: (a) select a valid variation via the option-picker pills; (b) click "Add to cart"; (c) open the mini-cart. | The selected variation appears in the mini-cart with the correct title, variation label, and price. No silent wrong-item add. | ☐ |
| IF-3 | 409 availability conflict state renders correctly | Using WP Admin, temporarily set a variation stock to 0 (or use a pre-zero'd test variation); attempt to add it to cart on the live PDP. | A human-readable inline error message appears (ARIA live); the Add to Cart button re-enables; the cart is unchanged. Restore stock after the test. | ☐ |
| IF-4 | No SGS code POSTs directly to `/wc/store/v1/*` write endpoints | `grep -r "wc/store/v1/cart" plugins/sgs-blocks/src/ plugins/sgs-blocks/build/ \| grep -v "add-item\|class-cart-proxy"` — run locally against the deployed codebase | Zero matches. All cart writes must go through `/sgs/v1/cart/*` (the shipped proxy with availability/IDOR/legal guards). Any direct `/wc/store/v1` write found here is a hard blocker. | ☐ |

---

## Section 5 — Responsive & Accessibility

| ID | What to verify | Named probe | Pass criteria | Status |
|----|----------------|-------------|---------------|--------|
| RA-1 | FR-30-11 responsive audit script passes GREEN on the **live client site** | The committed audit script exists at `scripts/wc-pages-responsive-audit.js`. Run against the live client domain: `node scripts/wc-pages-responsive-audit.js --base https://<client-domain> --out .claude/reports/go-live/<client-slug>` — this runs at 375/768/1440px across PDP, shop, cart, and checkout, checks horizontal overflow, 44px touch targets, axe-core WCAG 2.2 AA, and executed-JS weight. | Exit code 0; zero axe violations; zero horizontal overflow; executed JS ≤50KB per page; screenshots saved to `--out` directory and reviewed. Report linked in the run log below. | ☐ |
| RA-2 | Bean R-22-13 visual sign-off | Share 3-breakpoint (375/768/1440px) screenshots of every customer-facing surface: (a) shop archive, (b) PDP — gallery, configurator, price ladder, reviews, (c) cart, (d) checkout, (e) search results (if FR-30-5 is active), (f) notify-me form on an out-of-stock PDP. Screenshots are generated by the audit script in RA-1 or captured manually via Playwright. | Bean reviews and approves all screenshots before go-live sign-off is recorded. This is a co-authoritative gate (R-22-13: script + Bean's eye; numbers alone do not close). | ☐ |

---

## Section 6 — Pre-Launch Final Checks

| ID | What to verify | Named probe | Pass criteria | Status |
|----|----------------|-------------|---------------|--------|
| FL-1 | WooCommerce version is inside the tested band (FR-30-0) | SSH: `wp plugin get woocommerce --field=version` | Version is within the declared tested band in the dependency manifest (FR-30-0b). If outside: the dashboard notice appears and has been read + accepted by Bean before proceeding. | ☐ |
| FL-2 | Payment gateway declares block support at its installed version (FR-30-0c) | WP Admin → WooCommerce → Status → Installed Plugins — locate the gateway plugin (e.g. WooCommerce Payments / Stripe). Confirm its version is listed in the FR-30-0 gateway matrix as block-supported. | Gateway matrix in FR-30-0c has a verified ✅ for this client's gateway plugin + version. If not recorded, run the pre-flight now and record the result. | ☐ |
| FL-3 | OPcache flushed after final deploy | SSH: write a one-shot OPcache reset file, curl it, delete it immediately: `echo '<?php opcache_reset(); ?>' > ~/domains/<client-domain>/public_html/opcache-reset-$(date +%s).php; curl -s https://<client-domain>/opcache-reset-<timestamp>.php; rm ~/domains/<client-domain>/public_html/opcache-reset-<timestamp>.php` | Script returns without a 404. OPcache cleared so all deployed PHP is live. | ☐ |
| FL-4 | Theme version bumped and CSS cache-busted | Check the deployed `theme/sgs-theme/style.css` `Version:` field is greater than the previously deployed version (any style.css change requires a bump — CDN caches on the `?ver` URL). | `wp theme get sgs-theme --field=version` (SSH) returns a version string greater than the previous deployment. Any un-bumped CSS deploy is a hard blocker (lesson: `theme-css-busts-off-theme-style-css-version`). | ☐ |

---

## Per-Client Run Log

| Client | Live domain | Launch date | Run by | Result | Notes / blocked items |
|--------|-------------|-------------|--------|--------|-----------------------|
| Mama's Munches | _(to be confirmed)_ | ☐ TBC | ☐ TBC | ☐ PASS / BLOCKED | — |

---

## Notes

- **Spec source:** `specs/30-SGS-WOOCOMMERCE-PAGE-TYPES.md` §FR-30-13 (v1.1, 2026-06-11).
- **FR-30-11 audit script:** `scripts/wc-pages-responsive-audit.js` — committed and confirmed present in the repo. Run it against the live client domain (not the canary) for the RA-1 gate.
- **Memory bindings (do not skip):**
  - `inc-vat-not-default-gate-on-vat-registered` — never assume a new shop is VAT-registered; gate "(inc. VAT)" labels on `woocommerce_calc_taxes==='yes'`.
  - `ship-gate-needs-human-eye-not-just-automated-gates` — green automated gates (axe/script) are necessary but not sufficient; Bean's visual sign-off (RA-2) is co-authoritative.
  - `guard-on-one-path-is-not-a-guard` — IF-4 exists because a direct `/wc/store/v1` write path bypasses the proxy's IDOR/legal guards even when the main path is hardened.
  - `theme-css-busts-off-theme-style-css-version` — FL-4 exists because Hostinger CDN caches block CSS 7 days on the `?ver` URL; a deploy without a version bump serves stale CSS silently.
- **D215 (2026-06-12) — FAQPage retained:** SE-6 verifies `FAQPage` is PRESENT (not absent). Google dropped the FAQ rich result, but `FAQPage` remains valid schema consumed by AI search (ChatGPT/Perplexity/AI Overviews) + Bing, so the framework keeps it via the hardened HEX-flagged `product-faq` / `accordion` emitters. On-page copy must frame FAQs as AI-search/Bing visibility, never as a Google rich result. (Only the `SearchAction` removal — SE-5 — stands from the original FR-30-9 schema cull.)
- **N/A policy:** an item may be recorded as N/A only with a written reason. Examples of valid N/A: IF-1 when notify-me is not active; PD-1/PD-2 for a handmade product without a barcode (state why). An N/A without a reason is treated as ☐ (incomplete).
- **Blocked = not live:** a single ☐ that is not a recorded N/A means the shop does **not** take real money. No exceptions.
