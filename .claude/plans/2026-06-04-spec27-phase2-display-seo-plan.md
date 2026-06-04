---
doc_type: phase-plan
project: small-giants-wp
thread: sgs-theme
plan_id: spec27-phase2-to-completion
spec: .claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md
created: 2026-06-04
revision: v2 (2026-06-04) — rebuilt after an adversarial-council pass (6 personas) + a codebase audit of what SEO/schema already exists + Bean's scope decisions. v1 was committed 89b00fa5; this supersedes it.
status: PLANNED — ready to build. Phase 1 SHIPPED (D165). This is the path to 100% of Spec 27 before launch (Bean: not launching until the whole spec is complete, so build ORDER is not load-bearing and the council's "defer SEO / ship-increment" re-scope is intentionally NOT adopted). Authoring UI is UN-GATED (in scope now) so no client/agency ever edits raw meta. The AI-builder (FR-27-R5) + AI-citation/feed (FR-27-F2) remain flagged for an explicit launch-or-after decision (see §Scope decisions).
---

# Spec 27 → 100% — Display, SEO, Authoring & Go-Live — Build Plan (v2)

**USP:** This finishes the shop: Google shows the product with per-variant prices, AI search engines read the whole catalogue, clients author swatches/galleries/pricing in friendly editor boxes (never raw fields), and a hard go-live check stops a £0 product ever selling. It turns the "closed-loop" moat from *partial* to *complete* — the thing that wins shop clients.

**Plan label:** [PLAN: opus] — Sonnet does the mechanical build per unit; Opus orchestrates, designs the schema/SSR, fact-checks every subagent claim against live ground truth, runs the QC gates, self-reviews visible units with /ui-ux-pro-max + /playwright before declaring done.

**Docscore:** self-assessed A− against the phase-plan template. Re-run /docscore at first execution session.

**What changed from v1 (why this revision exists):** a 6-persona adversarial-council graded v1 D–C+ (good document, weak on precision/security/operability) and a codebase audit found the SEO half is ~30-40% already built. v2 (a) fixes the 5 build-breakers, (b) bakes in 9 security/compliance amendments, (c) un-gates the authoring UI so nothing ships as raw-meta, (d) reuses the existing breadcrumb + rating schema, (e) adds detect-and-defer for sites running Yoast/RankMath. Full council register archived at the end.

## Already built (codebase audit 2026-06-04 — do NOT rebuild)

| Thing | Status | Reuse in |
|---|---|---|
| `sgs/breadcrumbs` block emitting `BreadcrumbList` JSON-LD | ✅ built ([breadcrumbs/render.php:138](plugins/sgs-blocks/src/blocks/breadcrumbs/render.php#L138)) | E3 = **place the block on the product template + validate**, not build |
| `review-schema.php` (Review/Rating/Person/LocalBusiness) + star-rating/google-reviews/trustpilot/team-member schema | ✅ built | E1 `aggregateRating` **reuses these patterns**, not from scratch |
| Default price + stock server-rendered into HTML (Phase-1 manifest) | ✅ built | F1 = only the **JSON-LD-in-SSR** half remains |
| Manifest tax-fingerprint cache key (catches tax-config AND rate changes) | ✅ built (9e26de74) | covers the "tax-rate change → stale price" gap the council raised |
| ProductGroup/hasVariant/Offer product schema | ❌ not built | E1 (greenfield, but assembly not invention) |
| Product XML sitemap w/ variation images; OG tags; canonical-to-parent | ❌ not built | E3/E2 (greenfield; WP core gives only a basic sitemap + basic canonical) |
| Swatches / per-unit / gallery / preflight / authoring UI | ❌ not built | this plan |

## Phase success criteria (done when)

- [ ] **Google Rich Results Test passes** ProductGroup + per-variation Offers (brand/identifier/priceValidUntil-or-omitted/shipping/returns), 0 errors (E1).
- [ ] `curl` with **JS disabled** shows price + availability + JSON-LD in the initial HTML (F1).
- [ ] Colour/image **swatches** render, are keyboard+SR accessible, pill text auto-contrasts ≥4.5:1 (B2 + I2) — **authored via a friendly editor control, never raw meta**.
- [ ] Per-unit "£1.04 **per bar**" (client-set unit label, derived live) + server "% off" + a digit-stripped cosmetic label (B3) — **authored via editor controls**.
- [ ] Per-variation **gallery** with variation→parent→placeholder fallback (A4) — **authored via editor controls**.
- [ ] OOS vs nonexistent distinct + announced (C2).
- [ ] Canonical correct (`?attribute_*` → parent), built from server-side attributes, **never `add_query_arg`** (E2); **defers to an active SEO plugin** if present.
- [ ] Breadcrumb (place existing block) + product OG tags (always inc-VAT) + product sitemap with per-variation images (E3) — sitemap via **WP core `WP_Sitemaps` provider**, **detect-and-defer if Yoast/RankMath active**.
- [ ] **Hard** go-live PREFLIGHT: a £0 / no-image / draft / unmapped-variesBy product **cannot be published** (blocks via `transition_post_status`); proxy independently rejects a £0 add-to-cart (PREFLIGHT + FR-27-G1 amend).
- [ ] **Tax-display-mode UI** (auto inc-VAT default = UK B2C compliant; inc-suffix; ex-plus-vat trade with a B2C-misuse warning). card==cart in every mode; schema/OG price ALWAYS inc-VAT.
- [ ] **Authoring (un-gated Phase R: R1/R2/R3)** — clients/agency provision attributes+variations + author swatch/label/divisor/gallery/variesBy via friendly UI; edit-safety warnings on term-slug rename + delete-with-orders. **Zero raw-meta editing.**
- [ ] Bean R-22-13 visual sign-off + a clean **human NVDA/VoiceOver pass** (a marketing-claim gate — decoupled from the code-ship gate).
- [ ] **Escape-audit** table passed for every new data→HTML path (security gate).

## Scope decisions (Bean to confirm; not silently chosen)

1. **AI-builder (FR-27-R5) + AI-citation/llms.txt/Merchant-feed/FAQ (FR-27-F2)** — these were deliberately demoted to "roadmap ambition" in D161 (the OC-Protector stall-trap call you made). "100% of Spec 27 before launch" technically includes them. **Recommendation: keep R5 + F2 as the FINAL cluster, built last, and decide at that point whether the first client launches without them** (a client shop is fully functional + discoverable without the AI-builder; the AI-builder is a setup convenience, not a shopper-facing feature). Flagged, not dropped.
2. **Demand analytics** (the council's "real moat" — "combos customers tried but couldn't buy") — not in Spec 27 (it's an Open Question + a sibling-spec non-goal). The Interactivity store already has the data. **Recommendation: small new FR, build it in the visible cluster** — it's cheap and it's the one genuinely hard-to-copy advantage. Your call to include or leave parked.

---

## Build sequence + dependency graph

Order is a sensible build flow, not a hard gate (you're completing everything pre-launch). QA gates still apply.

```
STEP 0  fixture-v2  +  class-configurator-meta.php (ALL meta registered once: sanitise + show_in_rest + variesBy closed-enum + unit_label + ranges)
   │           +  render-configurator-head.php partial (schema/OG/canonical live here — keeps them OFF the shared product-card/render.php)
   ▼
CLUSTER A — visible layer (each ships render + EDITOR CONTROL together; serialised on product-card/render.php)
   TAX-UI → I2 auto-contrast → B2 swatches(+UI) → B3 per-unit+label(+UI) → A4 gallery(+UI) → C2 → [demand-analytics?]
   ▼  [ESCAPE-AUDIT gate]  →  [QA-VIS gate: axe-0 + ui-ux-pro-max + Bean R-22-13]
CLUSTER B — SEO/discovery (lives in render-configurator-head.php)
   E1 (reads MANIFEST, reuses rating schema, price always inc-VAT) → E2 canonical → E3 breadcrumb-place + OG + sitemap(WP_Sitemaps+detect-defer) → F1 verify
   ▼  [QA-SEO gate: Rich Results 0 errors + curl-no-JS]
CLUSTER C — authoring + go-live safety (un-gated Phase R)
   R1 authoring controller + R2 attribute/variation provisioning + R3 presentation-authoring UI + edit-safety → PREFLIGHT (hard block) → post-launch schema-health cron
   ▼  [QA-AUTHORING gate: golden-master diff vs native editor + a non-coder authors a product end-to-end with zero raw-meta]
CLUSTER D — advanced (DECISION-GATED, build last)
   R4 agency slug-templates → R5 AI-builder → F2 llms.txt/Merchant-feed/FAQ
   ▼
HUMAN NVDA/VoiceOver pass (marketing-claim gate, decoupled) → LAUNCH
```

**Concurrency protocol (build-breaker fix):** `product-card/render.php` is a single file touched by TAX-UI/B2/B3/A4/C2. These are **serialised, not parallel** — one Sonnet agent at a time, Opus reviews + commits by explicit path between each, re-reads the file before dispatching the next. Schema/OG/canonical do NOT touch it — they live in the new `render-configurator-head.php` partial (Step 0). This is the documented fix for the "5 agents corrupt one render.php" risk (memory `dont-fan-out-many-heavy-agents-at-once`).

---

### Cross-cutting security & compliance amendments (apply to every step that touches them)

These came from the council (Abuse + Support + Cynic, several convergent). Each step below references them by number.

- **SEC-1 — Single source of truth.** E1/E3/OG read the **manifest** (`Product_Manifest::build()`), never re-read WC independently. Add `sku`+`gtin` to the manifest combo array (one place). A CI grep asserts `class-product-schema.php` contains zero `wc_get_price_to_display`/`get_children`. (Cynic #1; prevents Google Merchant price-mismatch suspension.)
- **SEC-2 — Schema/OG price ALWAYS inc-VAT,** via `wc_get_price_to_display()` forced to `incl`, deterministic per product per shop currency, **independent of `taxDisplayMode` and the request tax context.** (Abuse M3.)
- **SEC-3 — Manifest output escaping.** Every value seeded into `data-wp-context` uses `wp_json_encode(..., JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT)`; image URLs `esc_url()` first; alt/text `sanitize_text_field()` first. (Abuse M1.)
- **SEC-4 — Discount label: strip ALL digits at save** (`preg_replace('/\d/','',$label)`) + cap 40 chars + plain-text only. Regex `/\d%/` is bypassable (Unicode `％`, "percent", entities) → fake-discount / UK Trading-Standards exposure. (Abuse M2 + Support — the single most-likely real abuse.)
- **SEC-5 — £0 guard, two layers.** PREFLIGHT **hard-blocks** publish (`transition_post_status` → revert to draft + `_sgs_preflight_issues` meta + REST error) on any £0/no-image variation; AND the add-to-cart proxy rejects `wc_get_price_to_display() ≤ 0` with HTTP 422 `price_not_set` (amend FR-27-G1). (Abuse M6 + Support — "50 orders at £0 at midnight".)
- **SEC-6 — Sitemap hardening.** `WP_Sitemaps` provider (not a raw REST route); filter `post_status='publish'` AND `catalog_visibility NOT IN (hidden,search)` via `wc_get_products()`; `methods=>'GET'` only; `set_transient` 6h + purge on the FR-27-G6 hooks; `<lastmod>` = MAX(parent, all-variation modified). (Abuse M4 + Cynic #3.)
- **SEC-7 — Canonical: never `add_query_arg`.** Build as `esc_url(get_permalink($id).'?'.http_build_query($validated_attrs))` where attrs come from the variation's own `get_attributes()` server-side, never `$_GET`. Validate each `?attribute_*` key is a real taxonomy + value a real term before reflecting anywhere. (Abuse M5 — classic WP reflected-XSS.)
- **SEC-8 — variesBy validated at SAVE** against the closed enum (color/size/material/pattern/suggestedAge/suggestedGender) in `class-configurator-meta.php`; unmapped axes emit as `additionalProperty` `PropertyValue` (defined shape), never an invented enum value or silent drop. (Spec-Lawyer MF-5 + Support MF-2.)
- **SEC-9 — Detect-and-defer.** If Yoast or RankMath is active (`defined('WPSEO_VERSION') || class_exists('RankMath')`), SGS registers NO sitemap/OG/canonical (they already emit product schema/sitemaps/OG) — SGS only adds the variant-specific JSON-LD those plugins lack. Prevents duplicate, conflicting tags on real client sites. (Cynic #3 + Competitor M1.)

---

### STEP 0 — Foundations: fixture-v2 + meta registry + head partial
  Model:       sonnet
  Action:      (a) `seed-48-sku-fixture-v2.php` — extend fixture 540 with `_sgs_swatch_color`/`_sgs_swatch_image_id`/`_sgs_variesby_value` (terms), `_sgs_variation_gallery`/`_sgs_unit_divisor`/`_sgs_unit_label` (variations), `global_unique_id` GTIN on some variations. (b) NEW `includes/class-configurator-meta.php` — register EVERY configurator term_meta + postmeta in ONE place with `sanitize_callback` + `show_in_rest` + the SEC-8 variesBy enum validation + divisor `absint`>0 + label digit-strip (SEC-4). Phase-R authoring writes through THESE keys — no new keys, no migration. (c) NEW `src/blocks/product-card/render-configurator-head.php` partial (empty scaffold) included by render.php — schema/OG/canonical will live here, OFF the shared render.php (concurrency protocol).
  Files:       `scripts/seed-48-sku-fixture-v2.php`, `includes/class-configurator-meta.php`, `sgs-blocks.php` (wire it), `src/blocks/product-card/render-configurator-head.php` + render.php include
  Outcome:     Every Phase-2/R meta key is registered+sanitised in one file; the fixture has data for every downstream unit; schema/OG/canonical have a home that isn't the shared render.php
  Exec:        SEQUENTIAL (everything depends on it); Marker: SESSION-START; Time: ~25 min
  Cold-Entry:  this plan; Spec 27 §"Per-variation presentation meta"; the existing class-product-cpt.php meta registration pattern
  Test:  Happy: each meta key readable via get_term_meta/get_post_meta after seeding · Edge: variesBy="flavor" (not in enum) rejected at save · Fail: label "20% off" → digits stripped to " off" · Integration: render-configurator-head.php loads with no output (empty scaffold)

### Cluster A — visible layer (serialised on render.php; each unit = render + editor control)

**STEP 1 — TAX-UI** (`taxDisplayMode`: auto|inc-suffix|ex-plus-vat). Inspector control + a **B2C-misuse warning** on ex-plus-vat ("Trade/B2B only — UK B2C law requires the inc-VAT price prominent"). Seeds inc+ex literals (SEC-3). PREFLIGHT later warns if ex-plus-vat is set on an inc-tax (retail) shop. Model: sonnet · ~30 min · Test: 3 modes card==cart under a 20% VAT fixture; ex-plus-vat assertion = `ex£ + VAT£ == inc cart line`.

**STEP 2 — I2 auto-contrast.** Build-time WCAG luminance → black/white pill text ≥4.5:1; swatch colour from `_sgs_swatch_color` directly (Spec-26 tokens are build-deferred — read the hex, not a not-yet-existing token table; token integration is a later upgrade). Model: sonnet · ~25 min · gates B2.

**STEP 3 — B2 swatches + editor UI.** Colour/image swatches via the Step-0 term_meta. **Editor control = a `WC term-edit field` (hex colour picker + media button) rendered via the `{taxonomy}_edit_form_fields` hook** — NOT raw custom-fields (un-gated authoring; honours "clients never touch code"). SEC-3 escaping on any seeded swatch URL. Model: sonnet + design-reviewer · ~40 min · Test: axe-0 + missing-image fallback + a non-coder sets a swatch colour via the term screen.

**STEP 4 — B3 per-unit + unit label + %off + cosmetic label.** £/unit derived at render = price ÷ `_sgs_unit_divisor`, displayed with `_sgs_unit_label` ("per bar", not "per unit"). %off server-computed (guard regular>0, cap 95). Cosmetic label digit-stripped (SEC-4). **Editor controls** for divisor + unit label + label in the variation/inspector panel. Model: sonnet · ~30 min · Test: divisor 12 + label "bar" → "£1.04 per bar"; label "20 percent off" → digits stripped; divisor 0 rejected.

**STEP 5 — A4 per-variation gallery + editor UI.** Gallery ids in variation postmeta; swap on select; prefetch on first interaction; variation→parent→placeholder fallback; seed image width/height so swap is **CLS 0** (not just ≤0.1). **Editor control** = a media-gallery picker in the variation panel. SEC-3. Re-run the executed-JS budget (≤150KB) + context-size (≤24KB) after this. Model: sonnet + performance-auditor · ~35 min · Test: gallery swap + fallback chain + CLS 0 + budget re-check.

**STEP 6 — C2 OOS vs nonexistent** distinct + announced (sold-out vs unavailable, distinct SR text). Model: sonnet · ~15 min.

**STEP 7 (optional, Bean-decision) — Demand analytics.** Emit a lightweight event per selection/grey-out/OOS to a privacy-safe counter (`_sgs_combo_attempts` aggregate) + a tiny admin "top unbuyable combos" surface. The store already has the data. Model: sonnet · ~30 min · only if Bean includes it.

### ESCAPE-AUDIT gate (security)
  Check: a table — every new value [field → source → sanitise-at-save → escape-at-render → output context (HTML attr/text/JSON-LD/OG)] — reviewed via /qc-council before any Cluster-A commit. Pass: every row has a save-sanitise AND a render-escape; no value reaches output unescaped. (Abuse "missing escape-audit gate".)

### QA-VIS gate
  Check: axe-core 0 on `.product-card--bound`; Playwright 375/768/1440; /ui-ux-pro-max ≥A−; card==cart all tax modes; swatch contrast ≥4.5:1; a non-coder authored a swatch+gallery+divisor via the editor (zero raw meta). Pass: + Bean R-22-13 sign-off. (Green automated gates ≠ design-complete — D165.)

### Cluster B — SEO/discovery (in render-configurator-head.php)

**STEP 8 — E1 ProductGroup+hasVariant JSON-LD.** Reads the **manifest** (SEC-1), reuses `review-schema.php` rating patterns for `aggregateRating`, price **always inc-VAT** (SEC-2). `variesBy` validated enum + unmapped→`additionalProperty` (SEC-8). `priceValidUntil` via `$variation->get_date_on_sale_to()?->date('Y-m-d')` else OMIT. `hasVariant` ≤50 selected as **actual-low + actual-high + sample** (offerCount = true total computed from the FULL manifest). Image ≥250px (use `'medium'`+ check, fallback parent). `shippingDetails`/`hasMerchantReturnPolicy` from a `wp_options` setting (NOT fabricated). `wp_json_encode` HEX flags; `mb_strlen < 16384` asserted; emit nothing if invalid. Cache the schema (reuses manifest freshness). Model: inline(design)→sonnet→seo-schema(validate) · ~45 min · /qc-council pre-commit · Test: Rich Results 0 errors; >50-variation edge (offerCount>children, low+high present); 0-review omits aggregateRating cleanly; 16KB asserted.

**STEP 9 — E2 canonical** (SEC-7, SEC-9). `?attribute_*` → canonical to parent, built from server-side attrs; per-variation `indexVariationUrl` = a single integer attr (variation id; 0=none) with a cap check. Defers if SEO plugin active. Model: sonnet · ~15 min.

**STEP 10 — E3 breadcrumb + OG + sitemap.** Breadcrumb = **place the existing `sgs/breadcrumbs` block** on the product template + validate (not build). OG `product:price:amount` always inc-VAT (SEC-2). Sitemap via `WP_Sitemaps` provider (SEC-6) + detect-and-defer (SEC-9). Model: sonnet · ~30 min (sitemap is the only real build) · Test: breadcrumb valid; OG inc-VAT; sitemap excludes hidden/draft, GET-only, lastmod=MAX; defers when Yoast active.

**STEP 11 — F1 all-commerce-in-SSR.** Audit no-JS HTML = price+availability (already SSR) + JSON-LD (new). Close any JS-only value. Model: inline audit→sonnet · ~15 min · Test: `curl` shows price+availability+ld+json.

### QA-SEO gate
  Check: Rich Results Test 0 errors (ProductGroup+Offers+Breadcrumb); `curl | grep ld+json` ≥1 with price+availability in no-JS HTML; sitemap validates; canonical correct; defers when an SEO plugin is active. Pass: all green.

### Cluster C — authoring + go-live safety (un-gated Phase R: R1/R2/R3)

**STEP 12 — R1+R2 authoring controller + provisioning.** `/sgs/v1/` controller wrapping `WC_Product_Variable`/`Variation` set_*()+save() + post-write `wc_delete_product_transients()` + attribute-lookup regen + `woocommerce_update_product`; per-object `edit_post` + nonce + rate-limit + multisite guard; attribute/term provisioning + cartesian generate + bulk edit + upsert key + transactional rollback (track created ids, delete on failure). Golden-master diff vs native editor. Model: opus(design)→sonnet · ~ a session · /qc-council · Test: 48-SKU provision+generate byte-identical to native; injected-failure rolls back; shared-taxonomy subset add doesn't break siblings.

**STEP 13 — R3 presentation-authoring UI + edit-safety.** Friendly inspector/term UIs for swatch/label/divisor/gallery/variesBy (writes the Step-0 keys). Edit-safety: `edit_term` hook warns on a `pa_*` slug change ("breaks existing links + Google may error" — SEO blast radius is in Phase 2, so the warning ships now, not Phase R); delete-variation-with-orders warning + orphan cleanup. Model: sonnet · ~40 min · Test: author a full product with zero raw-meta; rename-slug warning fires; delete-with-orders warns.

**STEP 14 — PREFLIGHT (hard) + post-launch health.** Hard block (SEC-5) on £0/no-image/draft/over-cap(24KB)/no-valid-variesBy-mapping via `transition_post_status` + REST error + admin notice. Invocable from a weekly WP-cron that re-checks JSON-LD validity + fires an admin notice on degradation (Support MF-3). Model: sonnet · ~30 min · Test: £0 variation can't publish (reverts to draft); cron flags a post-launch break.

### QA-AUTHORING gate
  Check: golden-master diff (controller output == native editor); a non-coder (or Opus simulating one) authors a complete configurator product — attributes, variations, swatches, gallery, pricing, variesBy — touching ZERO raw meta and ZERO WP-CLI. Pass: product sells + shows rich results, authored entirely through UI.

### Cluster D — advanced (DECISION-GATED — confirm before building)

**STEP 15 — R4 agency slug-templates** (`sgs_product_template` CPT, export/import, provision-then-link). Model: sonnet.
**STEP 16 — R5 AI-builder** (brief→attributes/values/swatches→full-price confirm diff→provision via R1/R2; untrusted-LLM hardening: pa_ slug regex, sanitise, URL-reject, length caps, rate-limit). Model: opus(safety)→sonnet.
**STEP 17 — F2 AI-citation + feed** (FAQPage, llms.txt/llms-full.txt publish+visible-filtered+noindex+rate-limited, Merchant feed GTIN/item_group_id reading only wc_get_product, SSRF-safe). Model: sonnet.

> **Cluster D is the §Scope-decision flag.** A first client shop is fully functional, sellable, accessible, and Google-discoverable at the end of Cluster C. R5/F2 are setup-convenience + AI-citation ambition. Decide at the Cluster-C gate whether launch waits for D or D follows the first shop.

### HUMAN NVDA/VoiceOver pass (decoupled marketing-claim gate)
  Bean (or a commissioned tester) runs a real screen-reader pass + updates the moat-evidence sheet. **Gates the public WCAG marketing claim, NOT the code ship** — schedule it independently so it never blocks a build session. Script: tab through pickers (announce label+state+price), select OOS (announce "sold out"), add-to-cart (announce success), gallery swap (announce new image), repeat on VoiceOver/Safari.

---

## Honest effort (smallest-plausible, Opus+Sonnet, Bean QC)

| Cluster | Estimate |
|---|---|
| Step 0 + Cluster A (visible + authoring controls) | ~1.5 sessions |
| Cluster B (SEO — smaller than v1: breadcrumb+rating reused) | ~1 session |
| Cluster C (authoring controller + provisioning + preflight) | ~1.5–2 sessions (R1/R2 is the heaviest real build) |
| Cluster D (R4/R5/F2 — IF in scope) | ~2–3 sessions (R5 AI-builder is multi-step) |
| Human AT pass | ~30 min Bean-time, decoupled |

**To a complete, sellable, discoverable, client-authorable shop (Clusters A–C): ~4–5 sessions.** Cluster D adds ~2–3 if launch-blocking.

---

## Key Judgement Calls

- **AI-builder (R5) + F2 launch-blocking?** Options: build before launch / launch after Cluster C and follow up. Rec: **launch-after-C** (shop is complete without it; R5 was your own D161 defer). Who decides: Bean.
- **Demand analytics in scope?** Options: build it (Step 7) / leave parked. Rec: **build it** — cheapest genuine moat, data already flows. Who decides: Bean.
- **Sitemap when an SEO plugin is present** — resolved: detect-and-defer (SEC-9), no KJC needed.

### Pre-emptive decisions (from the council's hidden-decisions + the audit)
- Schema lives in `render-configurator-head.php`, one ProductGroup per product even if two cards on a page (de-dupe by product id) — avoids duplicate schema.
- Image ≥250px = use WC `'medium'` (300px) with a dimension check, fallback parent.
- `shippingDetails`/returns come from a `wp_options` setting authored once (Cluster C), never fabricated.
- New `block.json` attrs (taxDisplayMode, indexVariationUrl, swatch/gallery refs) need a `deprecated.js` entry + the FR-27-I-MVP schema-compat test updated — fold into each unit.

---

## Adversarial-council register (v1 → v2, archived)

6 personas, grades: Cynic C+ / Competitor C+ (eng A−) / Spec-Lawyer D+ / Ship-PM C+ / Abuse C+ / Support D.

**Convergent findings → how v2 resolves them:**
1. *Over-scope / "100% = stall trap" (Ship-PM+Competitor+Cynic)* → Bean confirmed completing all pre-launch is intentional; re-scope NOT adopted; sensible order kept; AT pass decoupled; R5/F2 flagged.
2. *Authoring violates "no raw meta" (Support+Cynic+Competitor+Spec-Lawyer)* → authoring UI UN-GATED into Cluster A + C (R3); Step-0 single meta registry; zero raw-meta acceptance gate.
3. *Single source of truth re-opened (Cynic+Abuse)* → SEC-1 (schema reads manifest) + SEC-2 (always inc-VAT).
4. *Sitemap OR + fights Yoast (Spec-Lawyer+Cynic)* → SEC-6 (WP_Sitemaps) + SEC-9 (detect-defer); OR removed.
5. *PREFLIGHT advisory lets £0 sell (Abuse+Support)* → SEC-5 hard block + proxy 422.
6. *render.php concurrency (Spec-Lawyer+Cynic)* → serialised + render-configurator-head.php partial.
7. *variesBy free-text undefined (Spec-Lawyer+Support)* → SEC-8 (enum at save + additionalProperty emit).
8. *Discount-label regex bypass (Abuse+Support, most-likely abuse)* → SEC-4 (strip digits).

**Single-voice-but-kept:** Step 0 fixture-v2 numbered (Spec-Lawyer); priceValidUntil fetch API (Spec-Lawyer, Step 8); unit-label companion field (Support, Step 4); demand-analytics deal-winner (Competitor, Step 7 decision); post-launch schema-health cron (Support, Step 14).
