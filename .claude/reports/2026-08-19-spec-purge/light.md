# 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:14
RULE: EXCLUDE
BEFORE: "v1 2026-06-03: initial - Option A architecture."
AFTER:  N/A
NOTE:   Frontmatter `revision_history:` entry — provenance metadata, excluded per contract.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:18
RULE: EXCLUDE
BEFORE: "v5 2026-06-05: RECONCILED TO REAL IMPLEMENTATION after Phase 2 completed. COURSE-CHANGE (Bean, 2026-06-04): ... ONLY FR-27-R4/R5/F2 (the \"Cluster D\" capstone) remain unbuilt."
AFTER:  N/A
NOTE:   Frontmatter `revision_history:` entry — provenance metadata, excluded per contract.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:19
RULE: EXCLUDE
BEFORE: "v6 2026-06-09: FR-27-F2 research-corrected pre-build (D197, gold-standard research pack ...)"
AFTER:  N/A
NOTE:   Frontmatter `revision_history:` entry — provenance metadata, excluded per contract.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:20
RULE: EXCLUDE
BEFORE: "supersedes_notes: \"Supersedes Spec 24 FR-24-13/14 + Spec 25 §design-principle-6 + feature-map rows. ...\""
AFTER:  N/A
NOTE:   Frontmatter `supersedes_notes:` — explicitly excluded by contract as provenance metadata.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:51
RULE: K4
BEFORE: "Specs 24 and 25 are superseded by this document. Do not edit them."
AFTER:  DELETE
NOTE:   Same fact ("Spec 24/25 superseded, do not edit") is restated at line 629 ("**Absorbs (retired):** Spec 24 ..., Spec 25 ... Do not edit those files.") with more detail (names the two specs' subject matter). Keep line 629 as canonical, cut this earlier bare duplicate.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:94
RULE: EXCLUDE
BEFORE: "**SGS-specific config always lives in custom meta (updated - supersedes Spec 25 §principle-6).** `_sgs_variation_sets` ... This supersedes the original Spec 25 principle-6 position that said `_sgs_sku_matrix` lives in custom meta \"regardless of WC\". See D149/D151 and the configurator chapter below."
AFTER:  N/A
NOTE:   Design-principles section — this is the substantive rule statement (not a restatement of it elsewhere); functions as the source explanation the other `_sgs_sku_matrix` mentions point back to. Kept as-is.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:101
RULE: EXCLUDE
BEFORE: "Merged from Spec 25's feature-map table and the configurator's phasing. Rows superseded by the configurator chapter are marked."
AFTER:  N/A
NOTE:   Live guard rail describing how to read the table below it — no dead text dragged.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:105
RULE: EXCLUDE
BEFORE: "`sgs/product-card` Typed mode (**BUILT-IN-ELEMENT renderer, ZERO InnerBlocks** — superseded the v1.3.0 InnerBlocks-shell) | SHIPPED | ..."
AFTER:  N/A
NOTE:   Single, compact parenthetical explaining current architecture's origin; not a restated dead-text block.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:122
RULE: K4
BEFORE: "| `_sgs_sku_matrix` (multi-SKU variable pricing) | SUPERSEDED - dropped; WC variations are the matrix; see principle 6 above | - | D144 (superseded) | FR-24-14, superseded by FR-27 |"
AFTER:  "| `_sgs_sku_matrix` (multi-SKU variable pricing) | SUPERSEDED — see principle 6 | - | D144 (superseded) | FR-24-14, superseded by FR-27 |"
NOTE:   One of 5 restatements of the same `_sgs_sku_matrix`-is-dropped fact (94/122/225/347/365/442). Canonical negative-control statement kept at line 225; this table cell's explanatory clause is redundant with it and is trimmed to a pointer.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:123
RULE: EXCLUDE
BEFORE: "| WC variable-product per-variant pricing/stock via WC-native variations | SUPERSEDED - this is now the primary path (FR-27-A1); the DEFERRED label is retired | - | D151 | FR-27-A1 |"
AFTER:  N/A
NOTE:   Different fact from `_sgs_sku_matrix` (this is the WC-native-variations DEFERRED-label retirement); single occurrence in the live doc, compact status row.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:127
RULE: EXCLUDE
BEFORE: "... E3 OG + sitemap-lastmod + breadcrumb-block-placement (325b521f) — image-sitemap clause DESCOPED (53b85d7c); F1 SSR no-JS audit passed ..."
AFTER:  N/A
NOTE:   Compact status tag inside a large achievement-log row; the full explanation lives at line 518. Low-value to touch.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:193
RULE: EXCLUDE
BEFORE: "discount-type label (cosmetic-only, save-time-rejected if it contains a numeric percentage) (`postmeta`)"
AFTER:  N/A
NOTE:   "rejected" used as ordinary technical/validation vocabulary, not a supersession note.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:225
RULE: EXCLUDE
BEFORE: "**`_sgs_sku_matrix` is dropped (superseded).** For WC products, WC variations are the matrix. The `_sgs_sku_matrix` key was planned (Spec 24 FR-24-14) but is not built and will not be built. See principle 6 above."
AFTER:  N/A
NOTE:   This is the canonical negative-control statement kept by the K4 group at 122/347/365/442 — deliberately retained findable, not touched.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:275
RULE: EXCLUDE
BEFORE: "**AMENDED (Bean sign-off 2026-06-10, FP-H design gate — APPROVED):** the card is a BUILT-IN-ELEMENT block in ALL modes ..."
AFTER:  N/A
NOTE:   This is the live current architecture description (not a stale claim plus a note); the amendment banner introduces the CURRENT rule, no dead text dragged.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:325
RULE: K5
BEFORE: "> **⚠ SUPERSEDED FOR CLONING (2026-06-06):** The `sourceMode='bound'` converter path described below is a **TEST CHEAT** ... **ONLY the live WC configurator modes (`sourceMode='wc-product'` / `'sgs-cpt'`) are legitimate bound modes.** For cloning, `sgs/trust-bar` MUST be converted to **Typed mode** with a populated `items[]` array. The factual record below is preserved for historical context."
AFTER:  "> **RETIRED FOR CLONING (2026-06-06):** `sgs/trust-bar`'s Bound mode (converter emitting `sourceMode='bound'` by echoing badge InnerBlocks into `$content`) was a convert-not-mirror violation and was purged (`.claude/reports/2026-06-06-bound-mode-purge-plan.md`). Cloning now converts `sgs/trust-bar` to Typed mode with a populated `items[]` array. Live WC configurator modes (`wc-product`/`sgs-cpt`, `sgs/product-card`) are unrelated and unaffected."
NOTE:   Whole FR-24-10 section (lines ~323-335) is a tombstone for a purged mechanism, kept "for historical context" with the dead design (Bound-mode-for-cloning) still described in full below the banner. Collapse the section to this one paragraph; drop the detailed walkthrough of the dead design. Companion site: line 335.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:331
RULE: EXCLUDE
BEFORE: "`deprecated.js` keeps the v2 cert-bar + v3 rename entries; a new entry handles the mode attr default."
AFTER:  N/A
NOTE:   `deprecated.js` is a real filename (WP block deprecation registry) — literal live use, explicitly excluded by contract.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:335
RULE: K5
BEFORE: "Status: SHIPPED (commit `d6358f32`, 2026-06-01). `render.php` branches on the explicit `sourceMode` (typed = curated repeater / bound = converter's badge InnerBlocks); ~~converter sets `sourceMode='bound'` on cloned trust-bars~~ — **the bound-emit converter path is a cheat; see superseding note above.**"
AFTER:  "Status: Typed-mode-only for cloning (bound-emit converter path purged — see the retirement note above). `render.php` still branches on `sourceMode` for the live WC configurator, but the converter never emits `sourceMode='bound'`."
NOTE:   Second half of the same FR-24-10 tombstone as line 325 — collapse together, one replacement paragraph covers both sites.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:347
RULE: K4
BEFORE: "**FR-24-14 -- Phase-1 slot-conflict priority.** First type wins; SKU matrix deferred. `_sgs_sku_matrix` is superseded entirely for WC products (see principle 6). For CPT-only (no-WC) products, multi-variant pricing remains a Phase-2 candidate but the `_sgs_sku_matrix` key is removed from the data model."
AFTER:  "**FR-24-14 -- Phase-1 slot-conflict priority.** First type wins. For CPT-only (no-WC) products, multi-variant pricing remains a Phase-2 candidate, but the `_sgs_sku_matrix` key is removed from the data model (WC products: see principle 6)."
NOTE:   Part of the 5x `_sgs_sku_matrix` restatement (94/122/225/347/365/442). Keeps the unique CPT-only Phase-2 clause, drops the redundant re-explanation of the WC-side supersession already stated at line 225.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:365
RULE: K4
BEFORE: "2. SKU matrix deferred and now superseded for WC products."
AFTER:  "2. SKU matrix — superseded for WC products (see principle 6 / line 225)."
NOTE:   Part of the 5x `_sgs_sku_matrix` restatement; D144 ratified-decisions list item shortened to a pointer rather than re-explaining.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:442
RULE: K4
BEFORE: "- Rebuilding WC cart/checkout/payments/tax/shipping; mirroring WC commerce data; a combinatorial `_sgs_sku_matrix` in custom meta (superseded); per-instance content migration (clean slate)."
AFTER:  "- Rebuilding WC cart/checkout/payments/tax/shipping; mirroring WC commerce data; a combinatorial `_sgs_sku_matrix` in custom meta; per-instance content migration (clean slate)."
NOTE:   Part of the 5x `_sgs_sku_matrix` restatement. Non-goals list already conveys "not building this" — the "(superseded)" tag is redundant with line 225 and is dropped.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:448
RULE: K1
BEFORE: "**WC authoritative; SGS holds a seeded read-through CACHE reconciled server-side (reframed 2026-06-03 per the adversarial-council).** ... The old slogan \"never mirrored\" made maintainers under-build freshness; the correct framing is \"WC is authoritative; SGS reconciles its seeded cache against WC on every render + at add-to-cart\"."
AFTER:  "**WC authoritative; SGS holds a seeded read-through CACHE reconciled server-side.** No DURABLE custom store of WC commerce data (presentation/config only in term meta / variation postmeta / block attributes). The SSR-seeded manifest (per-variation price/sale/stock literals in `data-wp-context`) IS a short-lived read-through cache — the freshness defence is the render-time `get_date_modified()` staleness guard (FR-27-G6), not an assumption that nothing can go stale."
NOTE:   Rejected-approach-plus-why (K1): drops the "old slogan ... made maintainers under-build freshness" narration, keeps the corrected framing and the FR-27-G6 rule it drives.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:479
RULE: EXCLUDE
BEFORE: "**WIRE FORMAT PINNED LIVE (WC 10.8.1 — corrects the earlier `pa_`-slug guess):** `attribute` is the WC attribute DISPLAY NAME ..."
AFTER:  N/A
NOTE:   Minimal 4-word aside, no old wire-format text reproduced at length; already compact provenance, not rot.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:480
RULE: EXCLUDE
BEFORE: "a tampered request (fake price / OOS / foreign ID / attribute-mismatch / parent-id / empty-variation / draft) is rejected or server-priced"
AFTER:  N/A
NOTE:   "rejected" is ordinary security/validation vocabulary, not a supersession note.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:483
RULE: EXCLUDE
BEFORE: "Done when: draft/foreign ID, disabled variation, unregistered/mismatched attribute all rejected; per-object cap enforced."
AFTER:  N/A
NOTE:   Same as 480 — ordinary validation vocabulary.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:489
RULE: EXCLUDE
BEFORE: "Done when: sell-out-after-load is blocked gracefully; a cart-flood is capped+cooled; a sale-end purges the cached page; a manifest older than 1 h refreshes before add-to-cart."
AFTER:  N/A
NOTE:   Literal live technical use ("stale-manifest fixtures" nearby) — explicitly excluded category per contract.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:507
RULE: EXCLUDE
BEFORE: "**FR-27-B3 -- Per-unit (derived) + discount-label (cosmetic) + server-rendered % off. [SHIPPED ceb4e04a/5fe7cfd5 ...]**"
AFTER:  N/A
NOTE:   "save-time-rejected" (validation term) is the matched trigger; ordinary technical vocabulary, no supersession content.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:517
RULE: EXCLUDE
BEFORE: "cache-purge on the FR-27-G6 hooks so the page never serves a stale price."
AFTER:  N/A
NOTE:   Literal live use of "stale" — explicitly excluded.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:518
RULE: EXCLUDE
BEFORE: "**DESCOPED (Bean, 53b85d7c 2026-06-05):** the per-variation `<image:image>` XML sitemap clause is RETIRED — WP_Sitemaps has no clean image namespace, Google deprecated image sitemaps, and the E1 ProductGroup schema already exposes every variation image."
AFTER:  N/A
NOTE:   Canonical, single detailed explanation of the image-sitemap descope; lines 127 and 568 are compact tags that reference this, not full restatements — kept as the source of truth.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:524
RULE: EXCLUDE
BEFORE: "**STATUS (2026-06-05): R1/R2/R3 + PREFLIGHT were PULLED FORWARD into Phase 2 (as \"Cluster C\") and are SHIPPED** ... The original framing (\"build when a 2nd shop client lands\") was superseded by Bean's 2026-06-04 decision to complete the whole spec before launch."
AFTER:  N/A
NOTE:   Compact single-occurrence status note explaining a scope change; the quoted old framing is 8 words, not a dragged-along block.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:537
RULE: EXCLUDE
BEFORE: "Done when: a brief produces a confirmable full-price diff then a real WC product; a `<script>`/URL-injection brief is neutralised; over-length/over-rate rejected."
AFTER:  N/A
NOTE:   Ordinary validation vocabulary ("rejected").

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:545
RULE: EXCLUDE
BEFORE: "**FR-27-I3 -- Spec 24/25 reconciliation (completed in this document).** Spec 24 + Spec 25 are folded into this spec (Spec 27 v4). They are retired. `render.php`: WC variations present means ignore `_sgs_variation_sets` for commerce."
AFTER:  N/A
NOTE:   This is the FR-27-I3 requirement definition itself (with unique render.php behaviour + test), not a bare restatement of the 51/629 fact — legitimate structural content.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:549
RULE: EXCLUDE
BEFORE: "~~`speakable`~~ **(DESCOPED 2026-06-09, D197 — still \"(BETA)\", news-publishers/US-English/Google-Home only, never applicable to e-commerce; zero ROI)**"
AFTER:  N/A
NOTE:   Strikethrough used correctly to mark one descoped item within a larger enumeration of what's included; the struck text is one word, immediately explained — not rot.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:568
RULE: EXCLUDE
BEFORE: "Cluster C authoring/go-live (pulled forward from Phase R): FR-27-R1, R2, R3, PREFLIGHT. (FR-27-I3 = Spec 24/25 doc-fold, done.) Image-sitemap clause of E3 descoped."
AFTER:  N/A
NOTE:   Compact status tag within an acceptance-summary list; full explanation lives at line 518.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:579
RULE: EXCLUDE
BEFORE: "4. A tampered add-to-cart (fake price/OOS/foreign ID/attr-mismatch/disabled) is rejected or server-priced via the proxy; a cart-flood is capped+cooled; a sale-end purges the cached page (G1/G2/G6)."
AFTER:  N/A
NOTE:   Ordinary validation vocabulary ("rejected") in an acceptance-criteria list.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:583
RULE: EXCLUDE
BEFORE: "8. *(Phase 2)* Spec 24 + 25 folded into this spec; principle-6 superseded (I3, completed in v4)."
AFTER:  N/A
NOTE:   Terse acceptance-criteria checklist item referencing already-explained facts (lines 94/225/629) — normal for a Definition-of-Done list, not narrative rot.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:622
RULE: EXCLUDE
BEFORE: "UK Consumer Rights Act 2015 (misleading-price exposure on stale sale display)."
AFTER:  N/A
NOTE:   External legal citation + literal "stale" usage — both explicitly excluded categories.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:629
RULE: EXCLUDE
BEFORE: "**Absorbs (retired):** Spec 24 (query-driven content cards), Spec 25 (WooCommerce experience layer). Do not edit those files."
AFTER:  N/A
NOTE:   Canonical statement kept by the K4 decision at line 51 — this is the survivor, deliberately untouched.

### 27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md:631
RULE: EXCLUDE
BEFORE: "**Key decisions:** D144 (option-picker ratification), D148 ..., D-pending (Option A ratified; WC source of truth; no mirror; clean-slate; MVP-first re-scope; closed-loop moat; AI-builder = roadmap)."
AFTER:  N/A
NOTE:   K6 test: a one-line decision-log reference to "Option A ratified" with no deliberation of rejected options dragged along — guard rail, not rot.

## Counts
IN SCOPE: 8   (CUT: 0, CONDENSE: 8)
ESCALATE: 0
EXCLUDE:  30

---

# 18-SGS-FLOATING-UI.md

### 18-SGS-FLOATING-UI.md:28
RULE: K4
BEFORE: "Phase 5b (commit `60220b13` + paint-fix `0ef032fe`) shipped ~~`Sgs_Header_Customiser` + `Sgs_Footer_Customiser`~~ (RETRACTED — never existed) + `Sgs_Site_Info_Customiser` as direct structural clones of `Sgs_Floating_UI_Customiser`."
AFTER:  "Phase 5b (commit `60220b13` + paint-fix `0ef032fe`) shipped `Sgs_Site_Info_Customiser` as a direct structural clone of `Sgs_Floating_UI_Customiser`."
NOTE:   Same fact ("`Sgs_Header_Customiser`/`Sgs_Footer_Customiser` never existed") is stated in full at the line-26 banner (kept, not itself a grep hit) and restated here and at line 236. Drop the fake class names from this sentence — leaving them struck mid-sentence makes it "half-true" per dispatch guidance.

### 18-SGS-FLOATING-UI.md:32
RULE: EXCLUDE
BEFORE: "Provides a Customiser-based floating UI layer that replaces the retired `sgs/back-to-top` and `sgs/reading-progress` Gutenberg blocks."
AFTER:  N/A
NOTE:   Plain description of a real, single historical fact — no dead text dragged, functions as background context for the section.

### 18-SGS-FLOATING-UI.md:85
RULE: EXCLUDE
BEFORE: "**Status:** DEFERRED — needs its own design gate before any build. Parked as ..."
AFTER:  N/A
NOTE:   Live current status, not a correction of a prior stale claim.

### 18-SGS-FLOATING-UI.md:236
RULE: K4
BEFORE: "| Spec 36 §Customiser migration (formerly Spec 17) | ~~`Sgs_Header_Customiser`, `Sgs_Footer_Customiser`~~ (RETRACTED 2026-07-16 — never existed) + `Sgs_Site_Info_Customiser` | `postMessage` transport, `wp_options` backing, capability gate, sanitiser pattern |"
AFTER:  "| Spec 36 §Customiser migration (formerly Spec 17) | `Sgs_Site_Info_Customiser` | `postMessage` transport, `wp_options` backing, capability gate, sanitiser pattern |"
NOTE:   Third restatement of the same never-existed-classes fact (banner at 26, sentence at 28). Table cell simplifies to the real class only.

### 18-SGS-FLOATING-UI.md:264
RULE: EXCLUDE
BEFORE: "### Legacy theme-side floating UI retired"
AFTER:  N/A
NOTE:   Heading over a legitimate one-off changelog describing a real deletion (985 lines, file list) — accurate historical record, not a stale claim with a correction bolted on; not duplicated elsewhere.

## Counts
IN SCOPE: 2   (CUT: 0, CONDENSE: 2)
ESCALATE: 0
EXCLUDE:  3

---

# 30-SGS-WOOCOMMERCE-PAGE-TYPES.md

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:38
RULE: EXCLUDE
BEFORE: "... and schema emitters that still target retired Google features."
AFTER:  N/A
NOTE:   "retired" describes an external Google feature, not this spec's own content — no dead in-doc text dragged.

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:53
RULE: EXCLUDE
BEFORE: "**`FAQPage` schema for rich results** — Google dropped FAQ rich results 2026-05 (FR-27-F2's AI-citation framing is unaffected; this spec adds none)."
AFTER:  N/A
NOTE:   Literal historical fact about an external product change, single occurrence, guard-rail function (explains why this spec adds no FAQPage schema).

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:56
RULE: EXCLUDE
BEFORE: "**Abandoned-cart recovery emails** — explicitly out of scope for this spec (clients will ask; the answer is \"later phase / extension territory\")."
AFTER:  N/A
NOTE:   "Abandoned" is part of the literal e-commerce feature name ("abandoned cart"), not a correction/rejection note.

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:145
RULE: EXCLUDE
BEFORE: "**Home (pre-decided v1.1, was builder's-choice):** a sibling output of the configurator/option-picker rendering, NOT a `product-card` attribute — preserving D204's price-never-overridable invariant."
AFTER:  N/A
NOTE:   Live current rule with a brief provenance aside; no dead text reproduced at length.

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:159
RULE: EXCLUDE
BEFORE: "Static/baked review content is BANNED everywhere (UK DMCC Act in force 2026-04-06: fake/undisclosed-incentivised reviews illegal; the displaying trader is liable; ≤£300k or 10% turnover)."
AFTER:  N/A
NOTE:   External legal citation + live current rule — excluded category.

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:176
RULE: C1
BEFORE: "1. ~~**P1 — Working PDP + cart loop:** FR-30-0/1/2/7/4.~~ **SHIPPED** (D210, 2026-06-11). Bean R-22-13 signed off. FR-30-12 pipeline gate unblocked."
AFTER:  "1. **P1 — Working PDP + cart loop:** FR-30-0/1/2/7/4. **SHIPPED** (D210, 2026-06-11). Bean R-22-13 signed off. FR-30-12 pipeline gate unblocked."
NOTE:   —

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:177
RULE: C1
BEFORE: "2. ~~**P2 — Differentiators:** FR-30-8 (price coupling + value-ladder), FR-30-10 (reviews), FR-30-17 notify-me + Turnstile (D217), gallery variation-aware swap (D218).~~ **SHIPPED** (D213–D220, 2026-06-12). Merged to main via isolated temp-worktree cherry-pick."
AFTER:  "2. **P2 — Differentiators:** FR-30-8 (price coupling + value-ladder), FR-30-10 (reviews), FR-30-17 notify-me + Turnstile (D217), gallery variation-aware swap (D218). **SHIPPED** (D213–D220, 2026-06-12). Merged to main via isolated temp-worktree cherry-pick."
NOTE:   —

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:178
RULE: C1
BEFORE: "3. ~~**P3 — Shop:** FR-30-3 archive UX shell, FR-30-6 searchable filter, FR-30-5 product search.~~ **SHIPPED** (D213/D214, 2026-06-11/12). Live-verified on canary."
AFTER:  "3. **P3 — Shop:** FR-30-3 archive UX shell, FR-30-6 searchable filter, FR-30-5 product search. **SHIPPED** (D213/D214, 2026-06-11/12). Live-verified on canary."
NOTE:   —

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:179
RULE: C1
BEFORE: "4. ~~**P4 — Schema:** FR-30-9 (Organization/WebSite/noindex/returnPolicyCountry). FR-30-13 go-live checklist.~~ **SHIPPED** (D215 + D220, 2026-06-12). Go-live checklist at `.claude/go-live-checklist.md` (31 items)."
AFTER:  "4. **P4 — Schema:** FR-30-9 (Organization/WebSite/noindex/returnPolicyCountry). FR-30-13 go-live checklist. **SHIPPED** (D215 + D220, 2026-06-12). Go-live checklist at `.claude/go-live-checklist.md` (31 items)."
NOTE:   —

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:184
RULE: C1
BEFORE: "1. ~~FR-30-7 read-path~~ — CLOSED v1.1: the shipped SEC-1 manifest + cart proxy IS the path (Reuse Inventory). No `@woocommerce/block-data` research needed."
AFTER:  "1. FR-30-7 read-path — CLOSED v1.1: the shipped SEC-1 manifest + cart proxy IS the path (Reuse Inventory). No `@woocommerce/block-data` research needed."
NOTE:   —

### 30-SGS-WOOCOMMERCE-PAGE-TYPES.md:185
RULE: C1
BEFORE: "2. ~~FR-30-8 home~~ — CLOSED v1.1: sibling output of the configurator rendering, not a product-card attribute (preserves the D204 price invariant)."
AFTER:  "2. FR-30-8 home — CLOSED v1.1: sibling output of the configurator rendering, not a product-card attribute (preserves the D204 price invariant)."
NOTE:   —

## Counts
IN SCOPE: 6   (CUT: 6, CONDENSE: 0)
ESCALATE: 0
EXCLUDE:  5

---

# 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:15
RULE: EXCLUDE
BEFORE: "2026-07-13 — v1.1.0 (D320/D321/D322): the FOLLOW-UP set SHIPPED — Part 1 COMPLETE (13/13 FRs). **FR-33-12 (D320):** ..."
AFTER:  N/A
NOTE:   Frontmatter `status_history:` entry (line is inside the `---`...`---` block, lines 1-49) — provenance metadata, excluded per contract.

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:24
RULE: EXCLUDE
BEFORE: "the 0.85 identity-claim floor) — raising it to claim the slug directly was tried and reverted"
AFTER:  N/A
NOTE:   Frontmatter `status_history:` entry (v1.2.1, inside lines 1-49) — provenance metadata, excluded per contract.

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:34
RULE: EXCLUDE
BEFORE: "Mama's own surface hex) instead of a missing/collided slot. FR-33-2's rule table text is amended to"
AFTER:  N/A
NOTE:   Frontmatter `status_history:` entry (v1.2.1, inside lines 1-49) — provenance metadata, excluded per contract.

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:36
RULE: EXCLUDE
BEFORE: "surface/dark-theme discard decision, a related but DIFFERENT mechanism — corrects an earlier"
AFTER:  N/A
NOTE:   Frontmatter `status_history:` entry (v1.2.1, inside lines 1-49) — provenance metadata, excluded per contract, despite superficially matching the C5 self-historiography pattern (the dispatch hint flagged this site; overridden here because it sits inside the frontmatter block, which the contract excludes wholesale). The body-text sibling of this same correction, at line 224, IS in scope — see that entry.

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:216
RULE: EXCLUDE
BEFORE: "if the signal is ambiguous, the background is gap-logged for one-glance confirmation, never silently dropped (a legit dark-branded site must survive)."
AFTER:  N/A
NOTE:   Literal live use of "dropped" describing current behaviour — excluded category.

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:224
RULE: C5
BEFORE: "> **Related, not the same mechanism (2026-08-01 cross-reference):** this FR governs which background COUNTS as the theme's `surface`. It does NOT govern whether a distinct `surface-alt` gets derived — that is FR-33-2's role table + the `_synthesise_surface_alt` fallback in `palette.py` (see the 2026-08-01 status_history entry). A prior version of this note mis-cited FR-33-6 as covering surface-alt derivation; corrected here — FR-33-2 is the sole owner of that mechanism."
AFTER:  "> **Related, not the same mechanism:** this FR governs which background COUNTS as the theme's `surface`. It does NOT govern whether a distinct `surface-alt` gets derived — that is FR-33-2's role table + the `_synthesise_surface_alt` fallback in `palette.py`. FR-33-2 is the sole owner of that mechanism."
NOTE:   Agent self-historiography ("A prior version of this note mis-cited...corrected here") deleted; forward rule (which FR owns which mechanism) kept.

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:248
RULE: EXCLUDE
BEFORE: "dropped (mirrors the block pipeline's `attribute_gap_candidates`). Intra-palette ΔE merges log the"
AFTER:  N/A
NOTE:   Literal live use of "dropped" describing a real gap-logging mechanism — excluded category.

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:290
RULE: EXCLUDE
BEFORE: "**Done when:** a `/sgs-clone` run with a stale/absent generated snapshot fails-closed with a clear"
AFTER:  N/A
NOTE:   FR-33-12's fail-closed-on-stale-snapshot rule — explicitly named as excluded in the contract's EXCLUDE list.

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:364
RULE: EXCLUDE
BEFORE: "| FR-33-12 | orchestrator fail-closed gate | stale snapshot → fail; fresh → proceed | vs `(client,hash)` key | — |"
AFTER:  N/A
NOTE:   Same FR-33-12 stale-snapshot rule in table form — excluded category.

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:396
RULE: EXCLUDE
BEFORE: "**R2 must not match on the URL** — both live Astra sites point the link at Bean's LinkedIn (stale, predates the website), so a URL match would miss them ..."
AFTER:  N/A
NOTE:   Literal live use of "stale" describing real site data — excluded category.

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:404
RULE: EXCLUDE
BEFORE: "The emitted block renders `.sgs-business-attribution` with the framework URL — never the draft's stale LinkedIn href."
AFTER:  N/A
NOTE:   Same as 396 — literal live use of "stale".

### 33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md:405
RULE: C5
BEFORE: "`/ui-ux-pro-max` enforces the classifier on every NEW draft it generates, so R2 stays a legacy path rather than the norm. *(This previously cited a parking slug `P-UIMAX-ENFORCE-CREDIT-CLASSIFIER` that existed in NEITHER `parking.md` nor `memory/parking-archive.md` — a phantom citation, the same class as `P-CLONING-DEPLOY-BLOCKED-SHARED-TREE`, removed 2026-07-30. The pointer is struck rather than re-homed; if this becomes real deferred work it needs a genuine parking entry.)*"
AFTER:  "`/ui-ux-pro-max` enforces the classifier on every NEW draft it generates, so R2 stays a legacy path rather than the norm. (No live parking entry exists for this; if it becomes real deferred work it needs a genuine parking entry.)"
NOTE:   Self-historiography about the removed phantom citation deleted; forward rule (no open parking slug, needs a real one if ever scoped) kept.

## Counts
IN SCOPE: 2   (CUT: 0, CONDENSE: 2)
ESCALATE: 0
EXCLUDE:  10

---

# 19-SGS-CLI-COMMANDS.md

### 19-SGS-CLI-COMMANDS.md:97
RULE: EXCLUDE
BEFORE: "Writes a single value. Reserved or invalid key names are rejected with a warning."
AFTER:  N/A
NOTE:   "rejected" is ordinary CLI-validation vocabulary.

### 19-SGS-CLI-COMMANDS.md:111
RULE: EXCLUDE
BEFORE: "| `Failed to set 'X' — key may be reserved or invalid` | Key rejected by `set_internal()` | Check allowed keys in `Sgs_Site_Info` |"
AFTER:  N/A
NOTE:   Same as 97 — ordinary CLI-error-table vocabulary.

### 19-SGS-CLI-COMMANDS.md:162
RULE: EXCLUDE
BEFORE: "> **Note (2026-05-21):** Template parts are **brand-agnostic** — they are NOT coupled to the WP style-variation system (which is deleted per Decision 18). ... The auto-trigger via `save_post_wp_global_styles` is removed (FR-S2-1 retired)."
AFTER:  N/A
NOTE:   Live current-behaviour note (single, distinct mechanism — FR-S2-1's auto-trigger), no dead text dragged, not restated elsewhere.

### 19-SGS-CLI-COMMANDS.md:287
RULE: EXCLUDE
BEFORE: "Flips the seeding safety guard (FR-S7-3, retired with Spec 17 — no Spec 37 successor) to armed (with a 0-second cooldown) ..."
AFTER:  N/A
NOTE:   Distinct mechanism (FR-S7-3 guard) from the 162/350/419 retirements — single occurrence, functional description.

### 19-SGS-CLI-COMMANDS.md:350
RULE: K5
BEFORE: "### 4.14 `wp sgs theme-mod restore` (RETIRED 2026-05-21 — see `.claude/plans/2026-05-21-architecture-staging.md` §6.6)\n\n`wp sgs theme-mod restore` and `Sgs_Variation_Picker` are DELETED by Decision 18. The WP style-variation system is removed; there is no legacy `active_theme_style` theme_mod to restore. Per-site branding is managed via `push-theme-snapshot.py` (see §7 below)."
AFTER:  "| Command / class | Retired | Reason | Replacement |\n|---|---|---|---|\n| `wp sgs theme-mod restore` / `Sgs_Variation_Picker` | 2026-05-21 (Decision 18) | WP style-variation system deleted; no legacy `active_theme_style` theme_mod to restore | `push-theme-snapshot.py` (§7) |\n| `Sgs_Variation_REST` (`sgs/v1/active-variation`) | 2026-05-21 (Decision 18) | variation system deleted | Stage 10 of `/sgs-clone` calls `push-theme-snapshot.py` |"
NOTE:   K5 tombstone section. Collapse this and the FR-27-style paragraph at line 419 (a different retired mechanism, same Decision 18 cause) into one small retired-commands table.

### 19-SGS-CLI-COMMANDS.md:382
RULE: EXCLUDE
BEFORE: "# wp sgs theme-mod restore — RETIRED 2026-05-21 (Decision 18, variation system deleted)"
AFTER:  N/A
NOTE:   One-line comment inside the quick-reference cheatsheet code block, telling a scanning reader the command doesn't exist — same legitimate function as a roster's "DEAD — never cite" entry. Left as-is rather than folded into the K5 table (different document location/purpose).

### 19-SGS-CLI-COMMANDS.md:419
RULE: K5
BEFORE: "**Sgs_Variation_REST** (commit `8ceb8787`): REST surface at `sgs/v1/active-variation` (POST + GET; `manage_options` gated) — **RETIRED 2026-05-21 (Decision 18)**. The variation system is deleted. This endpoint is no longer needed; Stage 10 of `/sgs-clone` now calls `push-theme-snapshot.py` instead."
AFTER:  DELETE
NOTE:   Folded into the single retired-commands table proposed at line 350.

## Counts
IN SCOPE: 2   (CUT: 0, CONDENSE: 2)
ESCALATE: 0
EXCLUDE:  5

---

# 00-naming-conventions.md

### 00-naming-conventions.md:18
RULE: EXCLUDE
BEFORE: "The `sgs-theme/` namespace is deprecated — do not use it for new patterns."
AFTER:  N/A
NOTE:   Live naming rule — explicitly excluded by contract ("the `sgs-theme/` deprecated-namespace naming rule").

### 00-naming-conventions.md:50
RULE: C5
BEFORE: "> **Roster corrected 2026-07-20 (Spec 36 Phase-1 close).** This line previously named `sgs/adaptive-nav` \"plus the reused `sgs/mobile-nav` off-canvas drawer\". **`sgs/mobile-nav` no longer exists** — it was deleted at D336/Task 1 (2026-07-14), so the citation was stale for six days. `sgs/adaptive-nav` is **superseded** by the Spec 36 rebuild and is reference-only: it remains REGISTERED but dormant purely as the rollback path, and is deleted once the Indus header is re-authored (FR-36-18). Do not cite either as the current nav block."
AFTER:  "> **`sgs/mobile-nav` no longer exists** (deleted D336/Task 1, 2026-07-14). `sgs/adaptive-nav` is superseded by the Spec 36 rebuild and is reference-only: REGISTERED but dormant, kept solely as the rollback path until the Indus header is re-authored (FR-36-18). Do not cite either as the current nav block."
NOTE:   Self-historiography ("this line previously named...so the citation was stale for six days") deleted; forward rule (mobile-nav doesn't exist, adaptive-nav is dormant rollback-only) kept.

### 00-naming-conventions.md:81
RULE: EXCLUDE
BEFORE: "Looks up the canonical slot via `slots` table (count is DB-authoritative ...; replaces retired `slot_synonyms` post-D111 2026-05-30) ..."
AFTER:  N/A
NOTE:   Compact single-occurrence technical provenance aside, no dead text dragged.

### 00-naming-conventions.md:91
RULE: EXCLUDE
BEFORE: "**Canonical vocabulary** lives in `sgs-framework.db.slots` (post-D99 replacement for retired `slot_synonyms`) and is documented in [Spec 22 §3 FR-22-1 + FR-22-2] ..."
AFTER:  N/A
NOTE:   Same fact-shape as line 81 but about a different table lineage detail; legitimate live technical description.

### 00-naming-conventions.md:126
RULE: EXCLUDE
BEFORE: "(Enabled 2026-07-10 by D299 removing the stale converter exclusion that dropped state styling; the same convention drives every state-bearing block, not just pickers — R-31-9.)"
AFTER:  N/A
NOTE:   Live technical description of a real code change; "stale"/"dropped" used in their ordinary technical sense.

### 00-naming-conventions.md:168
RULE: EXCLUDE
BEFORE: "`sgs_pattern_slug_resolved` — fires after a deprecated slug is resolved via the shim"
AFTER:  N/A
NOTE:   "deprecated" describes the shim's live, ongoing function (resolving deprecated slugs) — literal live use, excluded category.

## Counts
IN SCOPE: 1   (CUT: 1, CONDENSE: 0)
ESCALATE: 0
EXCLUDE:  5

---

# 20-CLONE-FIDELITY-MEASUREMENT.md

### 20-CLONE-FIDELITY-MEASUREMENT.md:13
RULE: EXCLUDE
BEFORE: "2026-07-03 — v1.0.0 SHIPPED (D259). Replaces the retired Spec 20 (log surfacing) + Spec 21 (artefact inventory); both archived to memory/specs-archive/."
AFTER:  N/A
NOTE:   Frontmatter `status_history:` entry (lines 1-26) — provenance metadata, excluded per contract.

### 20-CLONE-FIDELITY-MEASUREMENT.md:22
RULE: EXCLUDE
BEFORE: "20-STRUCTURED-PIPELINE-LOG-SURFACING.md (SUPERSEDED — input-side log surfacing; the logs it surfaces are debug-only, not the fidelity signal, per FR-20-7)"
AFTER:  N/A
NOTE:   Frontmatter `absorbs:` list entry — provenance metadata, excluded per contract.

### 20-CLONE-FIDELITY-MEASUREMENT.md:23
RULE: EXCLUDE
BEFORE: "21-PIPELINE-STATE-ARTEFACTS.md (SUPERSEDED — the artefact inventory + the pixel-diff/leftover-buckets diagnostic sequence are demoted to debug-only, per FR-20-7)"
AFTER:  N/A
NOTE:   Frontmatter `absorbs:` list entry — provenance metadata, excluded per contract.

### 20-CLONE-FIDELITY-MEASUREMENT.md:154
RULE: EXCLUDE
BEFORE: "A draft element with NO content-matched clone element (dropped or restructured so its content differs)"
AFTER:  N/A
NOTE:   Literal live use of "dropped" describing a measurement category, not a stale claim.

### 20-CLONE-FIDELITY-MEASUREMENT.md:185
RULE: EXCLUDE
BEFORE: "**Done when:** CLAUDE.md rule 4a states \"don't trust the input-side drop-logs as a fidelity signal\"; Spec 31 §7b references this spec as the fidelity instrument; and the retired Spec 20/21 files are archived (not live)."
AFTER:  N/A
NOTE:   Live acceptance criterion for FR-20-7, not a correction of dead text.

### 20-CLONE-FIDELITY-MEASUREMENT.md:244
RULE: EXCLUDE
BEFORE: "image as PRESENT at its real dimensions, not dropped; and the guard is documented in the source"
AFTER:  N/A
NOTE:   Literal live use of "dropped" describing a measurement/guard behaviour.

### 20-CLONE-FIDELITY-MEASUREMENT.md:249
RULE: EXCLUDE
BEFORE: "> **Tools for the columns below.** The *number* comes from `scripts/parity/computed-parity.js` (Stage 11.6 ...); clear the CDN first ... or you measure a stale `?ver`."
AFTER:  N/A
NOTE:   Live tooling guidance note, literal use of "stale" in its ordinary caching sense.

### 20-CLONE-FIDELITY-MEASUREMENT.md:262
RULE: EXCLUDE
BEFORE: "| FR-20-11 | source header documents the lazy-load force + settle | a below-fold lazy image paints only after scroll → reported PRESENT at real size, not dropped | vs the D314 story-image false-negative | a fixture with a below-fold `loading=lazy` image |"
AFTER:  N/A
NOTE:   Table row, literal live use of "dropped" — same pattern as 154/244.

## Counts
IN SCOPE: 0   (CUT: 0, CONDENSE: 0)
ESCALATE: 0
EXCLUDE:  8

---

# 26-SGS-GLOBAL-STYLES-AND-THEMING.md

### 26-SGS-GLOBAL-STYLES-AND-THEMING.md:14
RULE: EXCLUDE
BEFORE: "specs/01-SGS-THEME.md            # §Per-site theme.json Model — D156 superseded by this spec"
AFTER:  N/A
NOTE:   Frontmatter `references:` list entry (lines 1-27) — provenance metadata, excluded per contract.

### 26-SGS-GLOBAL-STYLES-AND-THEMING.md:31
RULE: EXCLUDE
BEFORE: "> **Supersedes Spec 01 §\"Per-site theme.json Model\" D156 \"Live-style precedence\".** That entry's \"override precedence\" framing was wrong. The correct model (this spec): the `wp_global_styles` user layer IS where a site's global styles live; `theme.json` is only the factory-default seed. When this spec ships, update Spec 01 to point here."
AFTER:  N/A
NOTE:   Compact correction (one sentence naming the wrong framing, one sentence giving the correct model, one live action item) — already at the K1 target length, functions as a guard rail rather than dragged-along rot.

### 26-SGS-GLOBAL-STYLES-AND-THEMING.md:40
RULE: EXCLUDE
BEFORE: "**Fork tax + a retired mechanism.** ... WP style variations — the canonical per-client mechanism — were retired (Decision 18) to fix what was actually a deploy-scoping bug, not a mechanism flaw."
AFTER:  N/A
NOTE:   Single-occurrence, informative historical context for the problem statement — not restated elsewhere in this spec.

### 26-SGS-GLOBAL-STYLES-AND-THEMING.md:157
RULE: K1
BEFORE: "**FR-26-D1 — Canary contamination — RESOLVED / MOOT (verified 2026-06-03, do NOT clear post 7).** The council's recommendation was \"clear `wp_global_styles` post 7 so `theme.json` renders.\" **Verification inverted that:** the canary's `theme.json` already carries Mama's FULL brand palette (`theme:primary`, `theme:surface-pink`, `theme:accent`, …) AND the WCAG CSS (len ~2273), and post 7 MIRRORS the same tokens — because this session's Mama's WCAG work (D157-adjacent) wrote BOTH layers, which synced them. So the canary already renders Mama's brand correctly from both layers; the colour-contamination the council feared was real *before* this session but is **already resolved**. **Clearing post 7 is therefore unnecessary AND risky** (no render benefit; the canary is shared with the cloning thread) — do NOT do it. The cloning pixel-diff is NOT colour-contaminated currently."
AFTER:  "**FR-26-D1 — Canary contamination — RESOLVED/MOOT (verified 2026-06-03). Do NOT clear `wp_global_styles` post 7** — its tokens already match `theme.json` (Mama's brand palette + WCAG CSS byte-for-byte), so clearing would lose the render with no benefit; the cloning pixel-diff is not colour-contaminated. This sync is coincidental (both layers were hand-written the same session) and will RE-DIVERGE on the next `push-theme-snapshot` or Site-Editor edit — FR-26-D2 is the durable fix."
NOTE:   Rejected-recommendation-plus-why (K1): drops the "council recommended X, verification inverted that" narrative walkthrough, keeps the live "do NOT clear post 7" instruction and the residual-risk pointer to FR-26-D2 (load-bearing — explains why this isn't fully closed).

### 26-SGS-GLOBAL-STYLES-AND-THEMING.md:185
RULE: EXCLUDE
BEFORE: "(**replace, not merge** — read on the canary's own WP 7.0.2 core via `ssh … grep -n 'settings' wp-includes/rest-api/endpoints/class-wp-rest-global-styles-controller.php`, 2026-08-07; cite the assignment, not the line number — it moves between releases), so omission also CLEARS a stale user-layer copy."
AFTER:  N/A
NOTE:   Live verification citation + literal "stale" use — guard rail, not a correction of dead text.

## Counts
IN SCOPE: 1   (CUT: 0, CONDENSE: 1)
ESCALATE: 0
EXCLUDE:  4

---

# 00-OVERVIEW.md

### 00-OVERVIEW.md:172
RULE: EXCLUDE
BEFORE: "6. [Build Order](./archive/06-BUILD-ORDER.md) — Dependencies, sequence, and phasing (ARCHIVED 2026-07-28 — historical; live sequencing = `.claude/LEDGER.md`)"
AFTER:  N/A
NOTE:   Legitimate archived-link annotation pointing readers to the archive + the live status doc — roster-style function, not dead text with a note.

## Counts
IN SCOPE: 0   (CUT: 0, CONDENSE: 0)
ESCALATE: 0
EXCLUDE:  1

---

# README.md

### README.md:11
RULE: EXCLUDE
BEFORE: "Specs are versioned, status-tracked artifacts that document architectural commitments. Each spec carries `doc_type: spec`, a numeric `spec_id`, and a `status` from the enum below. Retired specs move to `.claude/specs/archive/`."
AFTER:  N/A
NOTE:   Roster function — introduces the status enum. Explicitly excluded ("its status-tag enum").

### README.md:18
RULE: EXCLUDE
BEFORE: "- `deferred` — paused, not cancelled"
AFTER:  N/A
NOTE:   Status-tag enum entry — explicitly excluded.

### README.md:19
RULE: EXCLUDE
BEFORE: "- `cancelled` — abandoned"
AFTER:  N/A
NOTE:   Status-tag enum entry — explicitly excluded.

### README.md:20
RULE: EXCLUDE
BEFORE: "- `retired` — superseded by a newer spec; moved to archive/"
AFTER:  N/A
NOTE:   Status-tag enum entry — explicitly excluded.

### README.md:34
RULE: EXCLUDE
BEFORE: "| 06 | [06-BUILD-ORDER.md](archive/06-BUILD-ORDER.md) | Dependencies + phasing — ARCHIVED 2026-07-28, historical build phasing; superseded by `.claude/LEDGER.md` for live sequencing. Do not cite. | archived |"
AFTER:  N/A
NOTE:   Archived-index row — explicitly excluded.

### README.md:40
RULE: EXCLUDE
BEFORE: "| 17 | ~~17-HEADER-FOOTER-ARCHITECTURE.md~~ | **DELETED 2026-07-21** — superseded by **Spec 37** (Header/Footer Builder); Site-Info store + nav FRs folded into **Spec 36**. | DELETED → 37 |"
AFTER:  N/A
NOTE:   DELETED index row (strikethrough is the roster's own dead-file marker) — explicitly excluded.

### README.md:44
RULE: EXCLUDE
BEFORE: "| 21 | _(retired — archived to `../memory/specs-archive/21-PIPELINE-STATE-ARTEFACTS.md`; superseded by Spec 20 — input-side artefacts are debug-only, not the fidelity signal)_ | — | archived |"
AFTER:  N/A
NOTE:   Archived index row — explicitly excluded.

### README.md:49
RULE: EXCLUDE
BEFORE: "| 29 | ~~29-CONTAINER-EQUIVALENT-BLOCKS.md~~ | **FOLDED into Spec 31 §13.6 and archived 2026-07-28** ... | archived → 31 §13.6 |"
AFTER:  N/A
NOTE:   DELETED/archived index row — explicitly excluded.

### README.md:54
RULE: EXCLUDE
BEFORE: "| 33 | [33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md](33-DRAFT-GLOBAL-STYLES-EXTRACTOR.md) | **Draft global-styles / token extractor** ... Part 1 COMPLETE (13/13 FRs); **Part 2 ... NOT started.** | complete (Part 1) |"
AFTER:  N/A
NOTE:   Live status row for a current spec, not a dead-spec entry — roster doing its job, no stale claim.

### README.md:56
RULE: EXCLUDE
BEFORE: "| 34 | ~~34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md~~ | **DELETED 2026-07-19 (P2.5 Phase 6 purge)** — nav is fully specified in **Spec 36** ... | DELETED → 36 |"
AFTER:  N/A
NOTE:   DELETED index row — explicitly excluded.

### README.md:57
RULE: EXCLUDE
BEFORE: "| 35 | [35-BLOCK-INSPECTOR-UX-STANDARD.md](35-BLOCK-INSPECTOR-UX-STANDARD.md) | ... **The 2026-07-28 \"build surface complete\" claim did not hold — Spec 35's own Part M flagged it as a self-contradiction on 2026-07-30 ...** ... | active |"
AFTER:  N/A
NOTE:   This cell is a live guard rail warning readers not to trust a past "complete" claim and pointing to LEDGER.md as the current source — it is doing exactly the job an EXCLUDE-worthy guard rail does, not dragging dead content forward as fact.

### README.md:64
RULE: EXCLUDE
BEFORE: "These spec numbers are retired. Each entry verified against this README's own rows and `ls .claude/specs/` at 2026-07-28 — none of these files exist live in `.claude/specs/` (only in `archive/` or `../memory/specs-archive/`, or deleted outright)."
AFTER:  N/A
NOTE:   Header sentence for the `## DEAD — never cite` roster — explicitly excluded.

### README.md:66
RULE: EXCLUDE
BEFORE: "- **13** — retired; no live file, no row above (pre-dates this roster's tracked history — not otherwise documented in this pass)."
AFTER:  N/A
NOTE:   DEAD-never-cite roster entry — explicitly excluded.

### README.md:67
RULE: EXCLUDE
BEFORE: "- **15** — retired; superseded by **31** (the converter) and **00-naming-conventions** (BEM). No live file."
AFTER:  N/A
NOTE:   DEAD-never-cite roster entry — explicitly excluded.

### README.md:69
RULE: EXCLUDE
BEFORE: "- **21** (`21-PIPELINE-STATE-ARTEFACTS.md`) — archived to `../memory/specs-archive/`, superseded by **20**. Row above already marked archived."
AFTER:  N/A
NOTE:   DEAD-never-cite roster entry — explicitly excluded.

### README.md:73
RULE: EXCLUDE
BEFORE: "**Not dead — verify before citing as retired:** Spec **29** is mid-move to archived (see its row above — the source file was still live, `status: current`, at the time of this pass; confirm before relying on either state). Spec **06** was archived by this same pass (2026-07-28) — its row above reflects the new `archive/` location."
AFTER:  N/A
NOTE:   Part of the same DEAD-list section, a genuinely useful caveat (not itself dead text) — excluded.

### README.md:84
RULE: EXCLUDE
BEFORE: "| [go-live-checklist.md](go-live-checklist.md) | Pre-launch WooCommerce gate per Spec 30 §FR-30-13 — run once per client before real payments. Moved into `specs/` (confirmed 2026-07-28: `.claude/go-live-checklist.md` no longer exists, `.claude/specs/go-live-checklist.md` is present; link verified resolving). | active |"
AFTER:  N/A
NOTE:   Live index row confirming a moved file resolves correctly — roster doing its job.

### README.md:96
RULE: EXCLUDE
BEFORE: "Files prefixed `legacy-` are historical reference for systems substantively replaced. All four have been moved to `.claude/plans/archive/`:"
AFTER:  N/A
NOTE:   Header sentence for the legacy-file index — roster function.

### README.md:98
RULE: EXCLUDE
BEFORE: "- [`legacy-2026-03-17-header-system-design.md`](../plans/archive/legacy-2026-03-17-header-system-design.md) — superseded by Spec 17 (now Spec 37)"
AFTER:  N/A
NOTE:   Legacy-file index row — roster function.

### README.md:99
RULE: EXCLUDE
BEFORE: "- [`legacy-2026-03-25-mobile-nav-attributes.md`](../plans/archive/legacy-2026-03-25-mobile-nav-attributes.md) — superseded by Spec 17 mobile-nav work (now Spec 36)"
AFTER:  N/A
NOTE:   Legacy-file index row — roster function.

## Counts
IN SCOPE: 0   (CUT: 0, CONDENSE: 0)
ESCALATE: 0
EXCLUDE:  20

---

# TOTAL (all 10 files)
IN SCOPE: 22  (CUT: 9, CONDENSE: 13)
ESCALATE: 0
EXCLUDE:  91
ROWS:     113
