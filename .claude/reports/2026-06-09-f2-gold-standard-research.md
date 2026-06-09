# FR-27-F2 gold-standard research — llms.txt / Merchant feed / FAQPage (2026-06-09)

Researched by a dispatched sonnet agent (Rule 16) before the F2 build. Full sources inline. Feeds the F2 build brief directly.

## Verdict table (spec reality-check)

| Spec item | Reality check | Verdict |
|---|---|---|
| llms.txt with `X-Robots-Tag: noindex` | Confirmed correct (John Mueller, July 2025) | **PASS — keep** |
| llms.txt rate-limited endpoint | Reasonable; no conflict | **PASS** |
| Self-generated XML feed (no official plugin) | Agency consensus agrees; official "Google for WooCommerce" plugin has persistent OAuth/sync complaints | **PASS** |
| FAQPage from a block | **Google FAQ rich results FULLY deprecated 2026-05-07 (all sites — supersedes the 2023 health/govt narrowing).** Markup still parsed by Google, still rendered by Bing, still aids AI-citation extraction. Implementation fine; client-facing value copy must say "AI search citation + Bing visibility", NEVER "Google rich results" | **PARTIAL — build, reframe copy** |
| `speakable` | Still "(BETA)", news-publishers/US-English/Google-Home only, never applicable to e-commerce; Mueller hints at formal deprecation | **DESCOPE — zero ROI** |

## 1. llms.txt + llms-full.txt

- Canonical: https://llmstxt.org/ (de-facto convention, not a standard). Site root. **Content-Type `text/plain`** (not text/markdown), UTF-8 no BOM.
- Shape: `# Site Name` H1 (required) → blockquote summary <200 words (the part AI quotes about the brand — product range, USP, delivery region) → H2 sections of markdown link lists with one-line descriptions.
- `llms.txt` = curated navigation index (<~50KB): category/collection indexes + policy pages + FAQ — **NOT individual product pages**. `llms-full.txt` = full content expansion (cap <~200K tokens / ~700KB).
- **Anti-cloaking rule: llms.txt is a map TO existing pages, never content that isn't on the site.**
- Adoption honesty: server-log audits show most AI crawlers ignore it (GPTBot occasional; ClaudeBot/PerplexityBot/Google-Extended effectively no). ~10% domain adoption. Build it cheap + automated (regenerate on `woocommerce_update_product` per spec), don't oversell it.
- Maintenance drift is the real risk — stale prices in llms-full.txt surfaced by an AI is worse than absence. Automate from live WC data, never hand-edit.

## 2. Google Merchant Center feed (self-generated)

- Format: **XML RSS 2.0 with `g:` namespace**. Serve at a stable URL, `Content-Type: application/xml`, transient-cached (daily minimum refresh; hourly if stock moves).
- Variable products: parent is NOT an item; **each variation is an item with `g:item_group_id` = parent ID** (maps 1:1 to schema.org `productGroupID` — must agree with on-page schema).
- Required per variant: id, item_group_id, title (with variant differentiators), description, **link (MUST deep-link to the pre-selected variant URL — our SEC-7 canonical variant URLs are exactly this)**, image_link (variant-specific preferred), availability, price (`24.99 GBP` format — MUST exactly match landing page AND JSON-LD), brand, condition, colour/size when those are the variant axes, shipping (required for UK).
- GTIN: include real GTINs per variant when they exist; when absent submit `<g:identifier_exists>false</g:identifier_exists>`. **Never fabricate a GTIN** (Google cross-checks; account suspension).
- `sale_price` + `sale_price_effective_date` (ISO-8601 range) for sales.
- Top rejection causes (in order): price mismatch with landing page; availability mismatch; parent-URL (non-deep-link) variant links; image policy (watermarks/text/placeholders, ≥100×100, 750×1000 recommended); missing shipping.
- **Alignment with our architecture: the spec's "feed agrees with on-page schema, read only from the manifest" rule (SEC-1/SEC-2) is precisely the defence against the #1 rejection cause. Feed price MUST come from the same manifest the JSON-LD uses.**

## 3. FAQPage + speakable

- FAQPage: one `FAQPage` per page, all Q&A in one `mainEntity` array, sibling of (never nested in) Product schema, JSON-LD in head, no promotional language in answers (policy still enforced).
- Value story 2026: Bing rich results + AI-citation extraction. Google parses but renders nothing (since 2026-05-07).
- Editor tooltip copy for the `sgs/product-faq` block: "improves AI search citation and Bing visibility" — not "adds FAQ rich results in Google".
- `speakable`: descoped (evidence above).

## Sources

llmstxt.org; codersera.com/blog/llms-txt-complete-guide-2026; longato.ch/llms-recommendation-2025-august (log audit); stanventures.com/news/noindex-llms-txt-google-recommendation-3674; llms-txt.io/blog/llms-txt-and-llms-full-txt; support.google.com/merchants/answer/14987622 + /7052112 + /6324478; storegrowers.com/google-merchant-center-feed-attributes; trustedwebeservices.com/blog/common-google-merchant-center-errors; developers.google.com/search/docs/appearance/structured-data/faqpage (2026-05-07 deprecation) + /speakable; elementera.com/blog/google-has-removed-faq-rich-results; joost.blog/faq-schema-cycle.
