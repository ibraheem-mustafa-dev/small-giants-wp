---
doc_type: parking
project: small-giants-wp
last_updated: 2026-06-06 (pruned — P-TRUSTBAR-BOUND-GRID + P-PRODUCT-CARD-PILL-SWAP-DORMANT moved to memory/parking-archive.md)
---

> **STANDARD PRACTICE (Bean-locked 2026-06-02):** this doc holds ONLY parked work — entries with `**Status:** OPEN | PARTIAL | BLOCKED | DEFERRED`. The MOMENT a task is **CLOSED / RESOLVED / DROPPED / SUPERSEDED**, MOVE it (verbatim, with completion date) to `memory/parking-archive.md` — do NOT leave it here. Enforce this every `/handoff` (Gate 4.5). Keeps parking concise + purposeful; prevents the balloon that hit 1,400+ lines.

## 2026-06-05 — theme thread: Spec 27/28 adversarial-council must-fix backlog (post-D179)

> **P-SPEC27-28-COUNCIL-MUSTFIX-WAVE** — NEW 2026-06-05 (6-persona adversarial-council on the shipped Cluster C + Spec 28 P1 + docs; every item below FACT-CHECKED against real code/git by a verifier subagent — 2 council claims were REFUTED and are NOT listed). **Status: PARTIAL — Wave 1 (9 items: #3 #6 #7 #8 #10 #11 #12 #15 #16 #18) + Wave 2 (8 items: #1 #4 #5 #9 #13 #14 #19 #20) SHIPPED + live-verified + pushed 2026-06-06 (D180; commits `04e62cdd`, `34e7e427`). A 3-team adversarial red-team then found + fixed 5 more gaps + a PREFLIGHT false-positive (lean-subset drift).** REMAINING: **Wave 3** = #2 (PREFLIGHT publish-block invisible in the block editor — add a `PluginPrePublishPanel` calling `GET /preflight` + auto-set variesBy at provisioning) + #17 (file-cohesion split render-helpers.php → colour/configurator-pricing/value-ladder/svg-kses; cart-proxy split — and CENTRALISE the lean-seed stripper so render.php / PREFLIGHT / the size test stop drifting). DEFERRED (recorded D180): Spec 28 single-on-sale anchor (needs P3 linked single-unit SKU); ex-plus-vat trade-mode ladder/header basis label (opt-in, unused on canary); Cyrillic-homoglyph deny-list (operator self-authored — accepted residual). Then continue Spec 27/28 to 100% (excl. the cloning HTML-draft product page). **Bucket:** Framework / shop layer.
>
> **MUST-FIX (before a real paying client uses the value ladder / shop):**
> 1. **Value-ladder has NO authoring UI (C1/C2/C3 VERIFIED).** `framingMode`/`decoyEnabled` have no controls in `product-card/edit.js`; `_sgs_base_price_pence`/`_sgs_decoy_enabled` are READ-only meta ("UI is P3", `class-configurator-meta.php:187`). With no base price set, `sgs_saving_display` returns '' for every row (`render-helpers.php:746-748,883`) → savings SILENT by default; a non-coder can't enable them without WP-CLI. **Fix:** add a `framingMode` SelectControl + `decoyEnabled` ToggleControl to edit.js (gated to non-typed mode) + a validated `_sgs_base_price_pence` product field.
> 2. **PREFLIGHT publish-block is INVISIBLE in the block editor (P1 VERIFIED).** It surfaces only via `admin_notices` (`class-product-preflight.php:181`) which Gutenberg doesn't render; `grep preflight src/` = 0. A client's product silently reverts to Draft with no reason. **Fix:** a `PluginPrePublishPanel`/`@wordpress/notices` JS integration calling the existing `GET /sgs/v1/products/{id}/preflight`; + an actionable `no_variesby` message (link to the term screen) + auto-set a sensible `variesBy` at provisioning.
> 3. **Live £0 Store-API add-to-cart bypass (P2 VERIFIED — self-documented `TODO FR-MISSING-3`, `class-cart-proxy.php:966-986`).** The `woocommerce_add_to_cart_validation` filter may not cover the Block Store-API path; `woocommerce_is_purchasable` is NOT overridden (grep=0). **Fix:** override `woocommerce_is_purchasable` → false when `wc_get_price_to_display() <= 0` (blocks every add path at once).
> 4. **LEGAL — fabricated reference price (Consumer-Law MF-1; C4 VERIFIED).** `_sgs_base_price_pence` sanitises with `absint` ONLY — no check a real single is sold at it → "save X% vs buying singly" is an unsubstantiated comparison (DMCC 2024 / CPRs). **Fix:** validate at save (≥ smallest-pack per-unit + a "this single is genuinely available" confirmation) OR derive from a real single-unit SKU; suppress the "vs buying singly" tail when no single exists.
> 5. **LEGAL — "Best value" on a non-cheapest pack (Consumer-Law MF-2; C5 VERIFIED).** Decoy mode targets the 2nd-largest row (`render-helpers.php:955-957`) but the badge says the literal words "Best value" (`render.php:653`) while a cheaper-per-unit pack is visible — a DMCC misleading action. **Fix:** when `decoy_enabled`, use a non-superlative label ("Popular choice"); reserve "Best value" for the actually-cheapest-per-unit row.
>
> **SHOULD-FIX:**
> 6. Rate-limit counts REQUESTS not variations (P5 VERIFIED) — one `/provision` writes up to 300 against 1 token (~18k writes/min @ 60 req). Budget by variations created. `class-product-authoring-security.php:143`.
> 7. `can_edit_product` returns a bare bool → REST 401 not 403 (P4 VERIFIED). Return a `WP_Error` 403. `class-product-authoring-security.php:51-54`.
> 8. `_sgs_test_fail_after` visible in the public OPTIONS schema (P3 VERIFIED; dead code, low risk) — gate its registration behind `WP_DEBUG`/`SGS_TESTING`. `class-product-provisioning-args.php:135-145`.
> 9. termLabel size-axis detection is English-only `/size/i` + first-axis fallback (P10 VERIFIED) — breaks on "Roast"/"Größe". Let the operator pick the pack-size axis, or detect by unitDivisor-correlation. `render.php:417`.
> 10. Health cron checks only the 50 OLDEST products (`ORDER BY ID ASC LIMIT 50`, P7 VERIFIED) — new products never checked. Rotate/randomise selection or hook `woocommerce_update_product`. `class-product-preflight.php:514`.
> 11. `no_image` preflight passes a WC PLACEHOLDER image (P8 VERIFIED) — replicate render.php's `woocommerce-placeholder` URL check in the preflight loop. `class-product-preflight.php:374-376`.
> 12. Rollback `wp_delete_post($vid,true)` return unchecked (P9 VERIFIED) — non-atomic; check + surface "manual cleanup: variation IDs X,Y" rather than a clean "rolled back". `class-product-provisioning.php:742-743`.
> 13. "vs sale price" tail can mismatch the saving's denominator (C6 PARTIAL) — the saving is vs the single-item anchor, not the sale price; make the tail describe the actual denominator. `render-helpers.php:786-792`.
> 14. **LEGAL** — cosmetic discount-label strips digits/% but NOT price-claim WORDS (C7: by-design as a code matter, but a legal product-decision) — add a deny-list (half/free/cheapest/lowest/guaranteed/bogof/save/off/deal/sale/discount) + length cap. `class-configurator-meta.php:298-307`.
> 15. slug-rename warning transient TTL = 60s, too tight (Support S1) → `DAY_IN_SECONDS`. `class-configurator-edit-safety.php:41`.
> 16. variation-delete warning dual-fires on trash + permanent-delete (Support S2) — gate on trash-vs-permanent + clearer copy ("restore from the WooCommerce Trash"). `class-configurator-edit-safety.php:204-227`.
> 17. File-cohesion debt — `render-helpers.php` = 1514 lines, `class-cart-proxy.php` = 988 (C8 VERIFIED, both over the 300 guideline). Split render-helpers into colour / configurator-pricing / value-ladder / svg-kses.
>
> **MISSING (add whole dimensions):**
> 18. No test asserting the lean-seed `data-wp-context` stays ≤24KB — the exact regression that bit Cluster B (`3a1e95df`). Add a size-assert (current baseline 22408B).
> 19. No substantiation/audit trail for a price claim (Lawyer MISSING) — timestamp + provenance when `_sgs_base_price_pence` is set (DMCC expects an evidence file).
> 20. No VAT-basis guard: the consumer-facing ladder per-unit can be ex-VAT when `tax_mode==='ex-plus-vat'` (Lawyer SF-1) — force the consumer ladder to inc-VAT, or label the basis. `render-helpers.php:858-864`.
>
> **REFUTED by the fact-check (do NOT action):** "unmanaged-stock qty uncapped" (a hard 50-cap exists, `class-cart-proxy.php:608`); "discount-label sanitiser is broken" (digit/% strip is intentional SEC-4 scope — only the LEGAL word-deny-list #14 is worth doing).
>
> **STRATEGIC (Ship-PM, single-voice but load-bearing):** the real first-shop blocker is the CONVERTER (cloning D178: typography/grid/hero don't lift), NOT more shop capability. Do NOT pull Spec 28 P2/P3/P4 forward ahead of the converter. The shop LAYER is complete; a first client's actual page can't be produced until the converter is faithful.

## 2026-06-04 — theme thread: Spec 27 Phase 2 (D168)



> **P-BADGE-SLOT-ROUTE-TO-LABEL** — NEW 2026-06-04 (theme thread, alongside FR-27-B3). **Status: OPEN** (pipeline/converter — cloning thread). The `label` slot already routes to `sgs/label` and now recognises the cosmetic-badge family (`discount-label`/`discount-badge`/`value-badge`/`savings-label`/`sale-badge`/`ribbon-label` — added this session to `seed-slot-synonyms.py`; DB + Spec 02 regenerated; documented Spec 00 §3.1.1). **Remaining gap:** a SEPARATE `slots` row `badge` exists with `standalone_block = NULL` and alias `pill` — and `pill` ALSO lives on the `label` slot, so a bare `__badge` element routes nowhere and `pill` is ambiguous across two slots. Wiring the bare `badge` slot → `sgs/label` and de-duping the `pill` overlap is a recognition-ROUTING change (not a pure additive alias), so it needs the cloning thread's per-row `/sgs-clone --debug-trace` measurement gate (R-22-4) + a multi-DB audit (`feedback_comprehensive_db_audit_before_data_layer_changes`) to confirm it doesn't regress any client's clone. Deliberately NOT done inline in the theme thread. **Fix:** in the cloning thread, either set `badge` slot `standalone_block='sgs/label'` (and resolve which slot owns `pill`) or merge `badge` into `label`; re-measure page-144 + a second client before commit. **Bucket:** Pipeline / converter.

> **P-CONFIGURATOR-PRICE-FORMAT-LOCALE** — NEW 2026-06-04 (D168, surfaced by the TAX-UI qc-council). **Status: DEFERRED** (framework / i18n). The configurator's client price formatter (`view.js formatPrice` → `toLocaleString(undefined, …)`) uses the browser/OS locale's thousand + decimal separators, while the PHP SSR (`wc_price` via `sgs_configurator_format_minor`) uses WooCommerce's configured `woocommerce_price_thousand_separator` / `_decimal_separator`. For UK en-GB + prices <£100 these match exactly (Mama's case), so it does not bite the current canary. But for any price ≥£1000 OR a non-UK browser locale OR a non-default WC separator, the SSR string and the on-swap string can diverge (e.g. `£1,234.00` vs `£1.234,00`) — an SSR==swap parity break. **Fix:** seed `thousandSeparator`/`decimalSeparator` (from `wc_get_price_thousand_separator()`/`wc_get_price_decimal_separator()`) + the price format into the manifest/context and format manually in `view.js` instead of `toLocaleString(undefined,…)`. Pre-existing (predates TAX-UI; TAX-UI did not widen it). **Bucket:** Framework / i18n.

## 2026-06-02 — cloning thread: container/wrapper standardisation programme (D152)

> **P-CONTAINER-WRAPPER-STANDARDISATION** — NEW 2026-06-02 (D152); **WS-1 A1+A2 SHIPPED 2026-06-03 (D159); WS-4 BLOCK-SIDE COMPLETE 2026-06-04 (D166+D167) — whole 29-block roster mirrors `sgs/container` via the shared helper (4 section / 14 layout / 11 content); modal + mobile-nav excluded `containerMirror:false`; content-collection registered as 29th; architecture resolved — docs-are-truth, KIND-scoped full mirror, no per-block trim; blub.db 312.** **Status: PARTIAL** (pipeline/converter — PROGRAMME). REMAINING: (a) **/sgs-update Stage-11 auto-apply** upgrade (§FR-22-21.2 — currently report-only); (b) the **post-WS-4 converter Method-2 work** (the block-side mirror does NOT fix page-clone fidelity — converter still routes `.sgs-hero` classes to `sgs/container` not the composite BLOCK @conf 0.10): the **routing fix** (`.sgs-hero`→`sgs/hero` before container fallback), the **converter-lift** (transfer mockup CSS onto now-mirrored attrs — memory `universal-lift-was-premature-not-falsified`), **#6 notice-banner content-synthesis**, **#4a grid-lift**, **image sideload (#5 + hero/product imgs)**, **#8 slider live-4-card residual verify**. (c) WS-2/WS-3 de-cheat debt.
>
> **PROGRESS (2026-06-04 PM, D167):** WS-4 BLOCK-SIDE COMPLETE. **hero SHIPPED** (commit `bacbde57` — section KIND, C3 double-emit guard, `overlayColour`→`backgroundOverlayColour` rename, split via extra_styles + `wrap_inner:false`; both variants render 0 fatals on live `do_blocks`). **product-card SHIPPED** (commits `f68bdc6f` + perf `82fd3b45` — content KIND, configurator preserved, verified on real page 589 with `sourceMode='wc'`; helper gained additive `extra_attr_html` opt). **mobile-nav EXCLUDED** (commit `391e6cb1` — `containerMirror:false`, Popover/dialog shell + own drawer model; same grounds as modal). **content-collection REGISTERED** (29th roster block, layout KIND — commit `40a9e03d`). **cta-section** = conforming SECTION reference (PASS). `/sgs-update` reconciled: block_attributes 2110→2739; roster 29; 0 orphans. STILL REMAINING: Stage-11 auto-apply upgrade + the full Method-2 converter work (next session).
>
> **PROGRESS (2026-06-03, D159):** **WS-1 A1 (contentWidth attr + guarded `__inner` render wrapper, guard `'' === $layout`) + A2 (slug-None section widthMode-from-own-max-width: absent→full/alignfull escapes the WP `:not(.alignfull)` 1200 cap, present→custom+customWidth; fold lifts folded `__inner` max-width→contentWidth) SHIPPED + live-DOM verified** (4 target sections 1200/inner-dropped → 1425 full-bleed / content 1040|960 centred; brand 1000 unchanged; hero/trust-bar unchanged). 3-rater /qc-council design-gate; visual-diff `reports/visual-diff/container-2026-06-03.md` PASS. **REMAINING WS-1c (NOT built):** A3 custom-width centring, A4 raw-px gap (`render.php:150`), A5 min-height, A6 gridItem*. **A7 likely MOOT** — `_lift_core_block_style` has ZERO call sites (dead code); A2 inlined its own max-width→widthMode logic, so the "fold must call _lift_core_block_style" framing is stale — verify before actioning. **WS-4 SHARPENED (Bean directive D159.2):** composites' built-in wrappers DRIFTED from `sgs/container` over time (each mirrors a different older version) — remove each composite's drifted wrapper, replace with an EXACT mirror of the current `sgs/container`, then add an `/sgs-update` step that walks `block_composition` and re-mirrors every composite's wrapper to the latest `sgs/container` on container update/version-bump. hero "forced-to-left-half" + trust-bar "badges-in-1-column" are drift symptoms.
>
> **PROGRESS (2026-06-03 PM, D163):** **WS-1c A3 + A4 built (UNCOMMITTED, build-clean + diff-verified, needs Gate-B visual-diff to commit):** A3 custom-width `margin-inline:auto` centring; A4 raw-px gap passthrough via new `sgs_container_gap_value()` (slug→var, "16px"→literal). **Composite-diff SCANNER ready** (`sync-container-wrapping-blocks.py` extended to deterministic MISSING/ADDED/ALTERED + INDEX roll-up — the WS-4 input; surfaced 29th block `sgs/content-collection` to register). **WS-4 SCOPE CONFIRMED = ALL ~29 composites KIND-scoped, NOT 4** (Bean corrected twice: SECTION 3 [modal excluded] + LAYOUT ~14 [incl content-collection] + CONTENT ~11 [incl product-card=#4b, notice-banner=#6]). **A5/A6 + the generic-lift idea CHANGED:** a "generic CSS→attr converter-lift" (to subsume A5/A6) was **FALSIFIED by a 3-rater /qc-council** — (a) wrong path: the only real min-height (hero 520px) is COMPOSITE-INTERIOR, not a slug-None container path → 0-delta no-op on canary; (b) blind DB-suffix fingerprint mis-maps (overloaded sgs/container suffixes — needs canonical_slot precision = a CURATED `_root_lift_rules` extension); (c) min-height `--has-min-height` flex-centre render-trap (align-gate needed). **A6** → folds into WS-4 as a lift-only, layout=grid-gated sub-mechanism with its OWN council (gift trial-card must not be clobbered). **A7 MOOT** confirmed. New STOP #47-50. **DEDUP AUDIT (Bean-inserted): NO block merges** — overlap is plumbing-level → shared helpers + the container-mirror; content-collection=register-not-merge; #6=notice-banner option-a; bloat is a mirror problem not a merge problem. See D163.
>
> **Scope — universal, not section-level.** This fix applies to every wrapper element in the draft HTML at any nesting depth, every `sgs/container` instance at any depth, and every composite block with a built-in `sgs/container` wrapper (all three KINDs: section/layout/content). The four Mama's Munches sections are the measurement gate, not the scope. Faithful transfer also covers a property's absence (no `max-width` → full-width, overriding the theme default).
>
> **5-workstream plan** (`.claude/plans/2026-06-02-container-wrapper-standardisation.md`): **WS-1** sgs/container 3-layer completion — content-width attr (A1) + outer max-width transfer + kill hardcoded widthMode:full band-aid (A2) + custom-width centring (A3) + raw-px gap (A4) + min-height (A5) + gridItem* (A6) + dead max-width→widthMode fold path (A7: `convert.py:1034–1040`, same logic must fire on container paths not atomic-only); **WS-2** converter/router truth — D1 layer written-not-consumed (seed_d1_sidecar stub, ~43 assignments stranded in `css-d1-assignments.json`; B1) + `_fold_eligible` sole-child gate drops ALL fold attrs for multi-child sections, not just max-width (B2, `convert.py:2830`) + grid-template-columns typed (B3) + D3 dual-write (B4) + verbatim-CSS-fallback anti-pattern: `css_router.py:433–437` dumps unscoped page-wide CSS on import failure, operator-invisible (B5); **WS-3** de-cheat — hardcoded lists→DB (_CAPABILITY_PRIORITY/_BREAKPOINT_RULES/_infer_role; C3-C5) + _GLOBAL_BARE_TAGS/_CHROME_TOP_ELEMENTS hardcoded vocabulary = R-22-1 violation, move to DB or document as permitted exception (C6) + trust-bar static-grid CSS (C2 = P-TRUSTBAR-BOUND-GRID root cause) + de-Mama's the deploy script (C7) + cta-section layout enum collision (C8); **WS-4** composite standardisation + auto-propagation — shared PHP helper composites call + a propagation writer + /sgs-update wiring (D1-D3; largest); **WS-5** docs. **WS-1 gates WS-4.** Canonical procedure: Spec 22 §FR-22-21. Empirical proof (run `mamas-munches-144-2026-06-01-123104`): the fold deletes `__inner` + strands its max-width in variation-d0-d2.css; leftover-buckets names maxWidth/widthMode extraction_failed; composite confidence 1.0 (tier=class-section) vs container 0.0 (deferred-no-match); featured-product 91.9%@1440. **Workstream A (block_composition roster + container_kind column + sync rewrite + trust-bar/modal containerKind) SHIPPED `0d746073`** as the propagation substrate (DB layer done; KIND-scoped diff writer + PHP helper are WS-4 remaining work). Build deferred to fresh sessions (programme-sized, sensitive); /qc-council per converter/block commit; Bean visual sign-off per fidelity milestone (R-22-13).
> **Bucket:** Pipeline / converter

> **P-CLONE-PAGE-VISUAL-TRIAGE** — NEW 2026-06-03 (D159.3). **Status: OPEN** (pipeline/converter — TRIAGE REGISTER). Bean's full-page visual QA of canary page 144 (after WS-1 A1+A2) surfaced 8 issues. **NONE is a WS-1 A1/A2 regression** (the section-container widthMode/contentWidth change doesn't touch these blocks; #3/#4 root-cause-verified pre-existing). Root-cause each via `/systematic-debugging` against the run artefacts (`pipeline-state/mamas-munches-mamas-homepage-ws1-2026-06-03-060940/` — extract.json/trace/leftover-buckets) + draft-vs-clone live-DOM (R-22-11), DB-first (R-22-1), universal (R-22-9). Issues: **#1 hero** forced into left half, right empty, image not full-bleed (padded, ¼ width) — composite-wrapper DRIFT (WS-4) + image-sideload 404. **#2 trust-bar** all badges folded into 1 left column instead of one grid-item each — composite drift / P-TRUSTBAR-BOUND-GRID (WS-4/C2). **#3 featured-product** "Zookies" heading centred while label/text correctly left — VERIFIED origin `.wp-block-sgs-heading` itself (the `__inner` computes text-align:start; draft heading = `start`); PRE-EXISTING heading-alignment routing bug. **#4 product-cards** wrong proportion — VERIFIED the grid IS correct 640/384 (5fr 3fr) but the cards shrink to 380/380 (don't fill cells) + trial image square not horizontal — product-card max-width/justify + image-fit, PRE-EXISTING. **#5 brand** image wrong size/zoom, no rounded corners, height ≠ left content — media styling not transferred + image 404. **#6 ingredients `__disclaimer`** → empty notice-banner (lost all text, gained an icon the draft didn't have, wrong border colours) — `disclaimer`→sgs/notice-banner routing (D141) drops content. **#7 `sgs-announcement-bar`** converted but content completely different (lost outline, icon, box bg, button) — announcement-bar conversion bug. **#8 reviews slider** very different — testimonial-slider conversion. Image sideload (dry-run 404) compounds #1/#5 visually — separate known gap (P-CSS-TRANSFER-FIDELITY / media-map). **PROGRESS (2026-06-03 PM, D163):** **#3 BUILT (uncommitted)** — heading+label textAlign-parity + heading control gaps + label `attr()` fix (block-quality, R-22-9). **#8 BUILT (uncommitted)** — slider fill-width track + always-rotating nav + pause-in-controls; STILL needs live "verify on real 4-card slider THEN commit". **#6 fix-shape grounded** — notice-banner block.json source-fix (so /sgs-update re-derives content-block/1) + universal converter sgs/text-child synthesis + showIcon-from-draft (option-a per dedup audit: notice-banner keeps semantic identity). **#1/#2 + #4b = now block-side-mirrored (WS-4 complete) but page-fidelity still requires the Method-2 converter work** (routing fix `.sgs-hero`→`sgs/hero` + converter-lift — the converter still emits `sgs/container` @conf 0.10, not the composite blocks). **#7 = converter bug (announcement-bar), still open**. **#4a grid-lift: REINSTATED (premature, NOT falsified — D163 Bean correction); post-WS-4 converter-lift work; align-items gated. Pending (Method 2).** **#3/#4 origin** re-confirmed (heading-block / product-card-internal). **PROGRESS (2026-06-05, D178) — Status now PARTIAL:** **#1 hero SHIPPED** (routes `sgs/hero`@1.0, 2-col + 520 min-height + image loads; H1 now 58px via typography lift `642cad61`). **#2 trust-bar SHIPPED** (de-hardcoded to universal grid `e75db509` — badges horizontal row live). **#3 heading-align SHIPPED** (textAlign parity `5712c97e`). **#4 product-cards SHIPPED** (fill 640/384 via grid bridge `c97f85f1` + D5 cap-scope `b3e3b284`). **#5 brand** image sideload SHIPPED (real upload `51e9ab13`); media-stretch residual open. **STILL OPEN:** #6 ingredients `__disclaimer`→notice-banner content-synthesis; #7 announcement-bar conversion (modifier-carry `107723be` partial); #8 social-proof carousel-vs-static (Bean: fine for now). **Bucket:** Pipeline / converter.

## 2026-06-02 — theme thread wave 1–3 deferred follow-ups

> **P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES** — NEW 2026-06-03. **Status: OPEN** (infra/tooling). `push-theme-snapshot.py` writes the per-client snapshot to `theme.json` on disk only — it does NOT update the live `wp_global_styles` post (the Site-Editor USER layer, ID 7 on sandybrown) which SUPERSEDES theme.json wherever both define a property. So a snapshot push silently fails to change live styles; this session's Mama's WCAG override only took once also POSTed to `/wp-json/wp/v2/global-styles/7` via REST. **Fix:** extend `push-theme-snapshot.py` to also update the `wp_global_styles` post (or document the two-step requirement). **FR-26-D2 SHIPPED 2026-06-03 (commit c468af7a, D161): the push-write half is done** — the script now POSTs `/wp/v2/global-styles/{id}` (deterministic post-ID, app-pwd auth, trailing cache flush), live-verified reversibly on canary post 7. Remaining: the pull round-trip (FR-26-A3) + the pre-deploy user-edit guard (FR-26-A4) -> Status downgraded to **PARTIAL**. Memory: `canary-live-styles-come-from-wp-global-styles-post`. **Bucket:** Infra / tooling.

> **P-PRODUCT-CARD-PHASE-DE** — UPDATED 2026-06-03. **Status: OPEN** (framework). Product-card Phase A (option-picker) + Phase B (variation-sets meta + panel + custom-fields fix) + Phase C (Bound mode WC/CPT wrapper+bridge, D151) + **Phase E (`sgs/content-collection` query block, Spec 24 FR-24-4/5/6, version 1.1.0) ALL SHIPPED + deployed to sandybrown canary.** Remaining: **Phase D** = clone-emit (converter outputs `sgs/option-picker` for a pill group — TRUTH-SPEC + slot_synonyms/slots + converter, per D144.4; design proposal in `.claude/scratch/2026-06-02-phase-d-pill-emit-design.md` is SUPERSEDED BY BUILD — actual implementation kept option-picker as content-block + used G3-attrs path with `allow_text_fallback=False`, see scratch note). **Plus a Phase-2 data-model task (see P-PRODUCT-CARD-PILL-SWAP-DORMANT):** pill→price/image swap is wired but dormant. Full design: Spec 24 §FR-24 + D144/D149/D151.

> **P-PRODUCT-PAGE-MOCKUP-NOT-SGS-BEM** — NEW 2026-06-03. **Status: OPEN** (framework). `sites/mamas-munches/mockups/product/index.html` uses bare `pill-group`/`pill` classes (no `sgs-` prefix). Stage 0 hard-rejects non-conforming mockups on production runs. Must be migrated to SGS-BEM before the product-page clone can emit `sgs/option-picker` blocks. The homepage mockup already conforms. No code change required — edit the HTML file only.
> **Bucket:** Content / client asset

> **P-AUTO-CONTRAST-LIGHT-PRIMARIES** — NEW 2026-06-03. **Status: DEFERRED** (framework). Framework default button and pill text is white, which is WCAG-safe for saturated primaries (the majority of client brands). Light-pastel primaries (e.g. Mama's Munches pink) need a per-client override to ensure contrast. Truly universal auto-contrast — correct text colour for ANY primary with zero per-client override — requires either CSS `contrast-color()` (browser support maturing 2026; not yet safe for broad production use) or a build-time luminance calculation step. Current workaround: document the per-client override in the client's `theme-snapshot.json`. Feature decision for Bean.
> **Bucket:** Framework / design-system

> **P-PRODUCT-CARD-COSMETIC-POLISH** — NEW 2026-06-03. **Status: OPEN** (framework). Two minor cosmetic gaps surfaced during QC (P2/P3 priority): (1) WooCommerce placeholder image shown when a product has no featured image — needs a graceful no-image state (hide `<img>` or show a styled empty placeholder instead of the WC default broken image). (2) `priceNote` font size renders at 13px — should be 14px per design. Neither is a blocker for the Bound mode launch.
> **Bucket:** Feature build

> **P-CART-DRAWER-PHASE2** — NEW 2026-06-02. **Status: DEFERRED** (framework). `sgs/cart` v1 is count+link only; the slide-in drawer is gated behind the `displayMode` attr (`link` default | `drawer`). Build the drawer in Phase 2: `role="dialog" aria-modal` + focus trap + ESC + focus-return + `prefers-reduced-motion`. Do NOT wrap/extend `woocommerce/mini-cart` (shallow controls, DOM-subtree + token-inheritance issues — see the cart cold-prompt).

> **P-BLOCK-DESIGN-POLISH** — NEW 2026-06-02. **Status: DEFERRED** (content). Two lower-priority design upgrades from Bean's brain-dump: (1) cta-section → rich template-patterns with stats/social-proof filler (like the hero presets), not just alignment variants; (2) notice-banner → per-type icon+CSS bundles as ideal defaults (then customisable). Plus the heading/text dormant-variant tweak (drop heading `hero`? — Bean decision).

## 2026-06-01 — FR-22-6 null-save→InnerBlocks migration gap (theme thread, wave 1)

> **P-FR226-NULL-SAVE-MIGRATION** — NEW 2026-06-01. **Status: DEFERRED** (Bean's prior moot disposition stands — see P-D1 below). Generalises P-D1-INFOBOX-EXISTING-POST-MIGRATION from info-box to the whole FR-22-6 roster. **The gap:** an FR-22-6 block whose new `save()` is `<InnerBlocks.Content/>` (empty when there are no inner blocks) can VALIDATE against a null-save-era post's empty/self-closing stored markup — so WordPress treats the block as valid and **never walks the deprecation chain**, meaning the FR-22-6 `migrate()` (which converts the old scalar `text`/`heading`/etc. → a child block) **does not fire** and the scalar content is dropped on the frontend (render.php now `echo $content`, R-22-14 removed the scalar fallback). The FR-22-6 deprecation entries (info-box v4 — SHIPPED 2026-05-31; notice-banner v3 — shipped this session) have **no `isEligible`**, so they only run when the block is otherwise invalid. **Affected:** info-box (already shipped), notice-banner (shipped this session), + any genuine Wave-2 single-`text` blocks when migrated (NB: the previously-listed "Wave-2A roster" social-proof/featured-product/gift-section/footer/header was a CATEGORY ERROR corrected 2026-06-02 — those are mockup SECTION classes, not SGS blocks; the real targets must be re-derived from the block roster). **NOT a regression vs shipped behaviour** — notice-banner exactly mirrors the shipped info-box pattern. **Resolution options (when a real production SGS site exists):** (a) WP-CLI batch existing-post migration per R-22-14 (Bean's chosen path), OR (b) add an `isEligible` to the FR-22-6 deprecation entry that returns true when the scalar content attr is non-empty AND no inner blocks exist, forcing the deprecation walk. Verify on a real old-shape post before declaring fixed (R-22-11). Found during the wave-1 notice-banner migration review; render-verified clean on the canary (no live old posts to break). Full detail: notice-banner + option-picker visual-diff reports (2026-06-01), decisions (this session).

## 2026-06-02 — CSS-transfer fidelity (the pipeline's core job; 4 gaps)

> **P-CSS-TRANSFER-FIDELITY** — NEW 2026-06-02 (D136). A draft-vs-clone computed-style audit proved the cloning pipeline does NOT faithfully transfer the draft's CSS — the framework IMPOSES values the draft never had + DROPS draft structure. **4 primary gaps:** (1) imposed `max-width:1200` on full-bleed sections — fix = theme-CSS `.entry-content > .wp-block-sgs-container{max-width:none}` (full-bleed by position); (2) the FR-22-4.1 fold DROPS the `__inner` content wrappers (max-width:960) — fix = preserve the two-level structure; (3) hero gradient overlay (`#C56A7A→#E68A95`) imposed over the draft's solid pink; (4) `grid-template-columns` not transferred (trust-bar 266×4 → uneven; brand 122/782 → 450/450). **2 finer gaps (added 2026-06-03):** (5) `css_router.py:433–437` verbatim-CSS-fallback dumps unscoped page-wide CSS on import failure — operator-invisible (gap B5, WS-2); (6) `_lift_core_block_style` max-width→widthMode logic is dead for container paths (atomic-only, `convert.py:1034–1040`) — the fold must call the same logic (gap A7, WS-1). The principle (Bean, locked): faithful CSS transfer is the pipeline's whole point; converter detect-mode band-aids are the wrong layer (2 rejected). Static-div editor bug already fixed (committed). The `widthMode:'full'` slug-resolved band-aid (e27ff591) is PARTIAL — superseded by the faithful-transfer fix. Note: pixel-diff scores are informational per FR-22-18 — structural faithfulness is the primary gate, not pixel %. Full detail: decisions D136 + `.claude/next-session-prompt.md`. **PROGRESS (2026-06-05, D178):** Gap (2) `__inner` content-width drop — RESOLVED (contentWidth attr + fold lift, `2f86d9e6`). Gap (3) hero gradient — RECLASSIFIED, NOT a converter bug: the converter correctly emits flat pink on the inner `sgs/hero`; the gradient is the hero block's OWN default CSS (hero/style.css, client palette vars) painting over it (D172). Fix block-side if undesired — do NOT chase as a converter-lift gap. Gap (4) grid-template-columns — RESOLVED for nested wrappers (`display:grid→layout:"grid"` bridge `c97f85f1`; products/trust-bar__inner/gift-cards lift their grid). Gap (6) `_lift_core_block_style` dead — superseded: typography now lifts via `_lift_typography_to_block_attrs` incl. descendant/responsive (`642cad61`). Residual OPEN: gap (1) imposed max-width on full-bleed (theme-CSS); gap (5) verbatim-CSS-fallback (B5/WS-2).
> **Status:** PARTIAL
> **Bucket:** Pipeline / converter

---

## 2026-06-01 — FR-22-20 universal variant detection (hero SHIPPED; rollout needs modifier-class mechanism)

> **P-FR2220-VARIANT-DETECTION** — D133 Bean-directed; **slot-fingerprint mechanism SHIPPED + LIVE-DOM-VERIFIED for the hero 2026-06-02 (D134).** Commits 1-5 done (`1a48c602`→`55f42e1b`): `blocks.variant_attr` column + `variant_slots` table + hero `supports.sgs.variantAttr`/`variants` + /sgs-update population + converter `detect_variant` (emit-path enrichment, qc-council-validated, 1 bug fixed) + hero `$is_split` band-aid REVERTED. Live canary 144: hero carries `sgs-hero--split` via the clean gate, 1 `.sgs-hero__content`, media column + 2 split-images render. **OPEN — the rollout (D135):** the slot-fingerprint mechanism fits ONLY content-distinct, modifier-LESS variants (hero). The stylistic/behavioural MAJORITY (gallery layout, heading/label/text variantStyle, divider/mobile-nav variant — same content, different CSS/animation) have ZERO discriminating slots → slot-fingerprint never fires. They carry a BEM modifier class (`sgs-gallery--masonry`) instead, which the existing `lift_behavioural_attrs` modifier path (db_lookup.py:2066-2109) does NOT map to the variant enum. **Next step = a complementary `detect_variant_from_modifier` mechanism** (resolved block has `variant_attr` + draft node BEM modifier matches a value in that attr's enum → set it); needs brainstorming/spec + a canary test target (Mama's has no stylistic-variant section with a modifier, so no live-DOM gate exists yet) before build (R-22-11, STOP #32 — don't ram a new mechanism without a verification target). product-card's slot-`variants` mapping is ALSO gated on its parked variation-sets design (D129, see P-PRODUCT-CARD-FULL-DUAL-MODE). Do NOT declare non-functional slot-`variants` on stylistic blocks. Full record: decisions D134-D135 + Spec 22 §FR-22-20.
> **Status:** PARTIAL (hero slot-fingerprint SHIPPED+verified; modifier-class rollout mechanism OPEN — needs spec + test target)
> **Bucket:** Pipeline / converter

---

## 2026-05-31 (pm) — wrapper-perfection follow-ups (Wave-2/A-1 + product-card)

> **P-VERIFY-WAVE2-A1** — VERIFIED 2026-05-31 (fresh build+deploy+re-clone, run `mamas-munches-homepage-2026-05-31-223313`). Pixel mean 64.60→63.49 (−1.11pp, informational only). STRUCTURAL: ~1/7→~6/7 sections correct. brand 2-col ✓; featured/ingredients/gift/social headings + content ✓; per-device attrs lifted. **TWO findings surfaced (open):** (1) **HERO migration PARTIAL** — still 2 `.sgs-hero__content` wrappers + 2 images (height 1820); root cause: hero render.php wraps `$content` in `<div class="sgs-hero__content">` AND the converter emits a `sgs/container.sgs-hero__content` InnerBlock → duplicate wrapper; AND both art-direction `__split-image--mobile/--desktop` render (the mobile/desktop show/hide CSS not applying). FIX next session: hero shell should NOT re-wrap in `.sgs-hero__content` (let the InnerBlock be the content column), and the split-image mobile/desktop toggle must apply. (2) **trust-bar now block-routed** — after rename + /sgs-update, section `.sgs-trust-bar` resolves to the `sgs/trust-bar` BLOCK (Req-3 block-override active ✓), renders 4 badges, but it's the un-migrated HYBRID (reads scalar `items`) → see P-TRUST-BAR-HYBRID-MIGRATION.
> **Status:** PARTIAL (6/7 structural; hero + trust-bar-hybrid open) · **Bucket:** Pipeline / converter · **Trigger:** next session.

> **P-BLOCK-CAPABILITY-NOTES-IN-REFERENCE** — NEW 2026-05-31. The DB attr-list can't convey a block's CSS MECHANISM (e.g. sgs/container per-grid-item via `--sgs-gi-*` custom-prop defaults + per-child specificity override) — which caused a wrong "no per-item customisation" assertion this session. FIX: add a "capability/mechanism note" per block to `02-SGS-BLOCKS-REFERENCE.md` (regenerated by /sgs-update) so capability is queryable without reading edit.js. (Pairs with STOP #26.)
> **Status:** OPEN · **Bucket:** Docs / DB · **Trigger:** opportunistic.

> **P-PRODUCT-CARD-FULL-DUAL-MODE** — NEW (Bean brain-dump 2026-05-31; plan BEFORE building). Build the full product-card next session. Three parts: (1) **atomic "pill" block** — pack-size/option pills as a SEPARATE reusable atomic block (NOT sgs/button: no link, different behaviour); exclusive selection, persistent "selected" styling, click changes price/photo/etc. (2) **variation-sets logic on the card** — a product can have MULTIPLE variation types (size, flavour); each can change different OR the same card areas (size→price; flavour→picture+price); card recognises how many variation types exist, whether each changes anything, and what content each changes — all PULLED FROM the sgs_product CPT settings (block stays simple, reads the product's declared variations + content-impact map). (3) **Spec 24 dual-mode** (Typed=clone InnerBlocks FR-24-9; Bound=CPT Block-Bindings FR-24-2/3). **The variation-sets logic is a NEW requirement beyond current Spec 24 FRs — write it into Spec 24 (or a sub-spec) FIRST.** Defer until specced + the atomic pill block exists.
> **Status:** OPEN (plan next session) · **Bucket:** Feature build / Spec · **Trigger:** next session, after Wave-2 verification.

> **P-A1-PHASE2-SLOT-RESPONSIVE-TYPOGRAPHY** — NEW. A-1 lifted responsive padding/margin/gap/columns/grid → per-device attrs, but SLOT-LEVEL responsive typography (e.g. `headlineFontSizeTablet`, per-slot font-size/colour at breakpoints) is still dropped to variation-CSS-only — needs the slot-prefix path wired into the universal walker (the deprecated `_lift_styling_attrs` logic has the slot-prefix derivation). Also minors: A-1 `min-width>1024` breakpoint edge (supra-1024 maps to desktop-all-sizes); add `_trace` on 3+ breakpoint drops; B-1 `replaces` comma-split contract guard.
> **Status:** OPEN · **Bucket:** Pipeline / converter · **Trigger:** after Wave-2 + trust-bar migration.

## 2026-05-31 — FR-22-6 converter content-routing + Spec 24 follow-ups

> **P-FR2241-FOLD-IMPLEMENTATION** — UPDATED 2026-05-31. **FR-22-4.1 recursive fold IMPLEMENTED + structurally verified on branch `feat/fr22-4-1-universal-wrapper` (commit after `8f900750`).** Three evidence-driven fixes (each root-caused via trace + live-DOM, not pixel): (1) recursive **fold** — a slug-None sgs-wrapper that is the SOLE element child of an emitted container folds its layout onto the parent's native attrs (no new div); multiple children = structural items, each own container; (2) **sole-shell gate** — fixed brand +44→ (folding a grid COLUMN like `__content` collapses N-col layouts; restores the `_absorb_transparent_wrappers` 1-child guard); (3) **wrapper-div leak** — `_emit_section_container` now emits InnerBlocks directly (matching `sgs/container` save.js `<InnerBlocks.Content/>`); the static `<div class=wp-block-sgs-container>` placeholder was leaking into the dynamic block's `$content` as an extra nesting level, breaking grid-on-section. **VERIFIED live DOM (R-22-11/R-22-13):** trust-bar = 4 icon+text badge grid items (was 1 collapsed label); brand = 2-col side-by-side (`__content` left x=233 + `sgs/media` right x=743); social-proof testimonials+stars render; no structural regressions. Plus leaf-with-element-children guard (D115 blind spot). **Pixel-diff +1.70pp (66.30 vs 64.60) — fidelity NOT structure:** dominated by (a) missing sideloaded images (brand right column empty, hero), (b) trust-bar renders 2-col not the mockup's responsive 4-col (only BASE grid-template-columns lifted to native attr, not the `@media` 4-col), (c) hero composite block shows BOTH art-direction images + internal layout, (d) header +32@768 = NOISE (theme template part, not converter output). /qc-council (cross-family Sonnet+Haiku) on the diff: no canary-blocking bugs; CSS-loss on folded shells is a generality gap (native-lift covers the canary; no worse than baseline drop) — documented. **DO NOT MERGE to main until pixel-acceptance** (P-FR226).
> **NEXT levers (in order):** (1) real image sideload (Stage 4i dry-run → the biggest remaining pixel mover; brand/hero/product images); (2) lift RESPONSIVE grid-template-columns (`@media` 4-col) onto native attrs / variation CSS so trust-bar is 4-col; (3) hero art-direction (hide mobile img on desktop) + composite internal layout; (4) migrate `sgs/info-box` hybrid (gift cards). Follow-up cleanups: dead `css` param in `_emit_section_container`; extract leaf-guard helper (duplicated in walk() + _process_container_children); walk() docstring "3 branches" note.
> _Superseded original note:_ FR-22-4.1 Phase 1 (own-container-for-all) regressed +2.46pp via over-nesting; WIP `8f900750` preserved that attempt + evidence. Two changes in `convert.py` `walk()`: (1) **leaf-with-element-children guard** — a node resolving to a LEAF block (sgs/label/text/icon) that has sgs-classed element children is a mis-resolution → treat as slug-None wrapper. **VALIDATED + KEEP**: fixes trust-bar badges (4 icon+text units, was 1 collapsed `sgs/label`) + product-card/info-box card bodies. Universal (R-22-9), closes the D115 leaf-misresolution blind spot. (2) **un-gated own-container emit** — every sgs-classed slug-None wrapper → own `sgs/container`. **REGRESSED**: over-nests. Measurement (canary 144 vs main baseline run `102445`): mean 64.60→67.06. WINS: gift-375 −12.7, featured-1440 −8.1, trust-bar badges render. **REAL regression: brand-1440 +33.2 — 2-col grid collapsed** (extra container broke parent→grid-item; verified live DOM + screenshot). header-768 +36.7 = NOISE (theme template part, not converter output — `header.sgs-header` absent from page content). social-proof-1440 +21.1 = reflow noise (renders fine, textLen 623). **Root cause:** own-container-for-all over-nests transparent direct-descendant shells, breaking layouts that depend on a direct parent→grid relationship — confirms council Finding + the spec FAIL-test on duplicate nesting. **The FR-22-4.1 FOLD is REQUIRED, not optional.** **Refined design for the next focused step:** KEEP the leaf-guard; replace own-container-for-all with the FOLD — a slug-None sgs-classed wrapper that is a DIRECT descendant of an emitted container (the section, or a rule-4 own-container) folds its CSS up onto that container (no new container div) via the generalised `_absorb_transparent_wrappers` pre-pass (relax `_is_absorbable_wrapper` lines 1014-1024 to absorb grid/spacing wrappers, AND carry the merged className onto the emitted container in `emit_sgs_container_wrapping` so its CSS applies); NON-direct wrappers + standalone grid wrappers keep their own container (rule 4). HARD subtlety to handle: a `__inner` with `max-width`+`margin:0 auto` over a full-width-background section must lift to `widthMode`/content-constraint (NOT constrain the container's own width / background) — see `_lift_root_supports_to_style` max-width→widthMode at convert.py ~946. Measure per-section live-DOM (R-22-11/STOP #24) + roll back fast.
> **Status:** OPEN (WIP preserved on branch; canary 144 currently has the regressed WIP deployed — next step re-deploys main baseline then implements the fold)
> **Bucket:** Pipeline / converter
> **Trigger:** Next focused step. Use `/subagent-driven-development` or main-thread Opus with the council findings + this evidence; the leaf-guard code in `8f900750` is the validated starting point.

> **P-CONVERTER-CONTENT-ROUTING-FIX** — NEW 2026-05-31. **G1 + G2 SHIPPED (commit 1fcb0742 on branch, D117) — content + side-by-side layout now RENDER (live-DOM verified).** G1 = FR-22-2 leaf content-routing + the `attr_type` fallback-bug fix. G2 = FR-23-6 depth-2 grid-wrapper preservation (council-designed; formalised as §FR-22-4.1 per D118 — the canonical container rule all future container-routing implementations MUST follow). Remaining for full pixel-acceptance: see P-FR226-FIDELITY-AND-MERGE.
> **Status:** PARTIAL (renders correctly; pixel-acceptance pending)
> **Bucket:** Pipeline / converter

> **P-FR226-FIDELITY-AND-MERGE** — NEW 2026-05-31. Branch `feat/fr22-6-content-render` renders content+layout correctly but isn't pixel-acceptance-passing (sections 60–83%). To reach acceptance + merge to main: (a) wire real image sideload (Stage 4i is dry-run → no product images); (b) migrate `sgs/info-box` FR-22-6 hybrid (gift-section card content renders sparse — info-box reads scalar attrs); (c) exact styling; (d) generate passing visual-diff reports for product-card/testimonial/testimonial-slider; (e) merge branch→main (visual-diff gate then passes). The container migrations (c9c6544d) + converter fix (1fcb0742) wait on this. **Container-routing implementation target is §FR-22-4.1 (D118)** — any further container/wrapper work in this branch MUST follow the four-step precedence order rather than re-deriving ad-hoc rules.
> **Status:** OPEN
> **Bucket:** Pipeline / converter
> **Trigger:** Next session. Highest-value: image sideload (likely biggest pixel-diff lever) + info-box hybrid.

> **P-PRODUCT-CPT-DEPLOY-SEED** — NEW 2026-05-31. `sgs_product` CPT + `seed-mamas-products.php` are built + committed (branch c9c6544d) but NOT deployed/seeded. To create the 2 reference products: deploy the plugin + create the entries (work around the `wp eval-file` content-guard hook — use `wp post create` over SSH or wp.data via Playwright). Also decide per-site opt-in gating for the CPT (currently registers unconditionally). ~15 min.
> **Status:** OPEN
> **Bucket:** Feature build
> **Trigger:** Alongside the converter fix or Spec 24 Phase A. Bean asked for the 2 product pages.

## 2026-05-29 — sgs/trust-bar merge + rename follow-ups

> **P-TRUST-BAR-MERGE-VALIDATION** — NEW 2026-05-29, updated 2026-05-31 (block renamed from trust-badges → trust-bar). `trust-bar/deprecated.js` v3 handles rename alias `sgs/trust-badges` → `sgs/trust-bar`; v2 handles cross-block migration of `sgs/certification-bar` → `sgs/trust-bar`. Not yet validated against a live post containing a `sgs/certification-bar` block. Validation procedure: (1) create a test page on dev with a `sgs/certification-bar` block (text-only variant with 3 label badges); (2) deploy updated plugin; (3) open the page in the block editor and confirm the block auto-migrates to `sgs/trust-bar` with `badgeStyle: 'text-only'` and all labels intact; (4) confirm the frontend renders the pill badge shape correctly; (5) test an image-badge migration from a cert-bar `image-and-text` instance; (6) run `/sgs-update` to populate trust-bar attrs in block_attributes DB. ~20 min.
> **Status:** OPEN
> **Bucket:** Testing / QA
> **Trigger:** Next deploy of sgs-blocks to dev site (palestine-lives.org).

---

## 2026-05-29 — sgs/media video extension follow-ups

> **P-MEDIA-VIDEO-VALIDATION** — NEW 2026-05-29. `sgs/media` extended to image+video (D97). Not yet validated on a live page. Validation procedure: (1) create a test page on dev with one sgs/media block set to mediaType=video + a YouTube URL, one with a direct MP4 URL, one with videoSource=internal selecting a WP library video; (2) deploy updated plugin; (3) confirm each renders correctly on the frontend; (4) confirm an existing image-only post still renders identically (backwards-compat via mediaType default + deprecated.js v1 migrate); (5) run `/sgs-update --stage 1` to populate the 12 new video attrs in block_attributes and resolve the ghost `sgs/media.videoUrl` row. ~20 min validation run.
> **Status:** OPEN
> **Bucket:** Testing / QA
> **Trigger:** Next deploy of sgs-blocks to dev site (palestine-lives.org). Run `/sgs-update --stage 1` immediately after deploy.

---

## 2026-05-28 — sgs/svg-background retirement follow-ups

> **P-SVG-BACKGROUND-MIGRATION-VALIDATION** — NEW 2026-05-28. `container/deprecated.js` v2 entry handles cross-block migration of `sgs/svg-background` → `sgs/container` with `bgSvg*` attrs. Not yet validated against a live post containing a `sgs/svg-background` block — no such post exists on dev/staging as the block was never deployed to production. Validation procedure: (1) create a test page on dev with a `sgs/svg-background` block containing SVG markup + animation settings; (2) redeploy the updated plugin; (3) open the page in the block editor and confirm the block auto-migrates to `sgs/container` with correct `bgSvg*` attrs populated; (4) confirm the SVG renders on the frontend with the correct animation class.
> **Status:** OPEN
> **Bucket:** Testing / QA
> **Trigger:** Next deploy of sgs-blocks to dev site (palestine-lives.org). ~15 min validation run.

---

## 2026-05-27 — Phase 1.5 close + Phase 2 reorder follow-ups

> **P-TEMP-HEADER-HIDE-REMOVAL** — NEW 2026-05-27. Bucket: content. Commit `9a1bb252` deployed a TEMP CSS override in `sites/mamas-munches/theme-snapshot.json` hiding the malformed sticky header on Mama's canary page 144 (Fix 1's correctly-wrapped header surfaces the mockup's intended `position: sticky` CSS but the wrapped content is still Phase 2-territory broken). Override removal condition: Phase 2 sibling spec (header/footer cloner per `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md`) ships. CSS rule + removal condition cited in the file's comment.
> **Status:** DEFERRED
> **Trigger:** Phase 2 sibling spec (header/footer cloner) ships; verify by re-deploying theme-snapshot via push-theme-snapshot.py + checking live canary header renders correctly.

---

> **2026-05-27 note (D85 — role-exclusion DB-derive + Tier C deletion):** `P-D85-ROLE-EXCLUSION-DB-DERIVE` and `P-TIER-C-DELETE-OR-PROVE` closed-as-completed (no separate parking entries existed; tracked here for completeness). The two hardcoded frozensets (`_CONTENT_BEARING_ROLES`, `_ROLE_EXCLUSION_ALLOWLIST`) in `db_lookup.py` are gone — replaced by DB-driven `_content_bearing_roles()` / `_styling_behaviour_roles()` querying the new `slot_synonyms.role_classification` column (idempotent migration at module load). Tier C derivation deleted from `equivalent_block_for()` per qc-council Rater B + Bean directive. Spec 22 §FR-22-2.1 / §FR-22-2.3 / §15 amended. Re-introduction of a role-derived tier gated on `P-SGS-UPDATE-ROLE-DETECTION-IMPROVE` (closed for role detection itself, but a follow-up parking entry can be re-opened if Tier C inputs accumulate).

<!-- ACTIVE — open parking items only. Resolved entries → memory/parking-archive.md with completion date in heading. -->

> **2026-05-26 note (Spec 22 supersedes Phase 1 plan):** Cloning-pipeline entries listed below as superseded by the 2026-05-25 phase plan are now further superseded by **Spec 22** (Universal Block-Equivalent Extraction). The canonical phase plan is `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md`. Closed/dissolved entries: `P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP` (dissolved — IS Spec 22), `P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES` (dissolved — Spec 22 makes universal-emit default), `P-FR1-VARIATION-BUF-CONSISTENCY` (dissolved — FR1 fast path retired), `P-MATCH-JSON-GATE-REDEFINITION` (FR-22-12 preserves Stage 2 artefact production), `P-G1-HERO-INNERBLOCKS` (closed by Spec 22 FR-22-3 universal walker), `P-G3-STAGE-3-VISUAL-SLOT-MAPPING` (closed by FR-22-5 D1 routing + FR-22-2.2 role-exclusion), `P-G5-PER-BLOCK-DOM-SHAPE-FIXES` (closed by FR-22-3 universal walker — no per-block branches). Other cloning entries (P-DUPLICATE-HEADER, P-INGREDIENTS-1440-REGRESSION, P-PIXEL-DIFF-VERTICAL-ANCHOR-FIX) are Phase 1.5 / Phase 2 work. New entry: `P-LEGACY-GAP-CANDIDATES-MIGRATION` (1,480 legacy sgs-framework.db `attribute_gap_candidates` rows; Spec 22 FR-22-8.1 makes table read-only; migration to uimax parked).

> **P-LEGACY-GAP-CANDIDATES-MIGRATION** — 1,480 legacy rows in `sgs-framework.db.attribute_gap_candidates` (Spec 16 era). Spec 22 FR-22-8.1 makes this table read-only; all new D3 writes go to uimax's `attribute_gap_candidates` (91 rows, with confidence + provenance columns). Migration of the 1,480 legacy rows is out-of-scope for Spec 22. **Trigger:** post-Spec-22 close, when Phase 1.5 considers cleaning up legacy data surfaces.
> **Status:** DEFERRED

## Spec 22 walker — deferred routing work

**P-SUBHEADING-ROUTING-TO-SGS-HEADING** — NEW 2026-05-28; **D99 syntax-updated 2026-05-29.** Walker D99 + sgs/heading γ-rebuild (Track B 2026-05-28) make it possible to route mockup subheadings to `sgs/heading{headingRole:'subheading'}` instead of the current `sgs/text` emission. **Why this isn't done yet:** updating the slots-table row for subheading (`UPDATE slots SET standalone_block='sgs/heading' WHERE slot_name='subheading' AND scope='element'`) without walker support would cause `equivalent_block_for(parent, 'subheading')` to emit `sgs/heading` with default `headingRole='heading'` — rendering subheading content as an h-tag instead of a paragraph. The walker must learn to set `headingRole='subheading'` when emitting for a subheading-classified canonical_slot. Mechanism options: (a) a walker-level derive rule inferring `headingRole` from the canonical_slot identity at emission time; OR (b) a new DB column `slots.standalone_block_default_attrs` (JSON) carrying per-slot default attr overrides. Option (a) is cheaper; option (b) is more universal. Currently the slots row for subheading still has `standalone_block='sgs/text'`. NOTE 2026-05-29 D99: original entry referenced `slot_synonyms.subheading.standalone_block` column; updated to `slots WHERE slot_name='subheading' AND scope='element'` syntax for current architecture.
> **Status:** BLOCKED
> **Trigger:** Phase 1.4 walker rewrite shipping — pick mechanism (a) or (b) at that decision point.

**P-TEAM-MEMBER-SCHEMA-ORG-SAMEAS-RESTORATION** — NEW 2026-05-27 (Phase 1.3b regression). The pre-1.3b `sgs/team-member.render.php` emitted Schema.org `Person` JSON-LD with a `sameAs` array populated from the flat `socialLinks[].url` values. Phase 1.3b converted `socialLinks` to a child `sgs/social-icons` InnerBlocks slot — the social URLs are now inside child block markup, not accessible as flat attrs from team-member's render.php. The `sameAs` Schema.org array was REMOVED rather than parsed back from `$content`. **Effect:** team-member blocks no longer emit `sameAs` Schema.org structured data → SEO regression for any team-member pages relying on Schema.org Person markup. **Resolution options:** (a) parse `$content` via `parse_blocks()` in team-member render.php and walk the child sgs/social-icons block's `icons` attr to extract URLs — cheapest, most localised; (b) move Schema.org JSON-LD emission into sgs/social-icons render.php with a `context: 'person'` flag passed down via block ancestry; (c) server-side meta marker on team-member that the new sgs/social-icons render.php reads up-tree. Option (a) is recommended.
> **Status:** OPEN
> **Bucket:** SEO / structured-data regression
> **Trigger:** Phase 2 (post Phase 1.5) OR sooner if any team-member-using client surfaces an SEO Schema audit issue.

## Cloning pipeline (cv2 / orchestrator / DOM walker / pixel-diff)

_60 entries._


**P-DUPLICATE-HEADER-EXPOSED-BY-INLINE-CSS-FIX** — NEW 2026-05-25 (after D70 Stage 10 inline-CSS shipped). With variation-d0-d2.css now deployed inline per-page, the mockup's `<header class="sgs-header">` block in cv2 output renders visually for the first time — appearing BELOW the framework's `<header>` template part (rendered on every page by `theme/sgs-theme/parts/header.html`). Visible regression: header section pixel-diff at 375px jumped from 25.4% → 84.8% (+59.4pp) in run mamas-munches-homepage-2026-05-25-060541. Sister sections (768, 1440) only +0.9 / -2.3pp because framework header dominates the viewport there. **Resolution:** Phase 2 — header + footer specialised cloner. Gated on Phase 1.5 hitting per-section ≤1% (per `.claude/plans/2026-05-25-phase-1-universal-extraction.md` + `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md`). The specialised cloner emits to wp_template_part shape, not page-content shape, and dedupes against framework header. Until then the live page carries both headers on mobile. **PARTIAL 2026-06-01 (D141):** the converter's chrome-skip extension now skips top-level `<header>`/`<footer>`/`<nav>` whose BEM segment is itself chrome — so freshly-cloned pages no longer EMIT the duplicate `<header class="sgs-header">` into page content. Full closure still needs the Phase 2 header/footer cloner (template-part shape).
**Status:** OPEN
**Trigger:** Phase 2 kickoff.


**P-INGREDIENTS-1440-REGRESSION-AFTER-INLINE-CSS** — NEW 2026-05-25 (after D70). Stage 11 ingredients-section at 1440px regressed from 31.5% → 53.9% (+22.4pp) post-fix while same section dropped -22pp at 375 and -20pp at 768 (clear net win at the other two viewports). Hypothesis A: a desktop rule in variation-d0-d2.css overrides framework defaults at 1440 with a partial cascade conflict. Hypothesis B: screenshot-timing — page wasn't fully painted when Playwright captured. Hypothesis C: a desktop-specific rule in variation CSS doesn't match the live DOM shape exactly. **Trigger:** trace investigation — pixel-diff/section.sgs-ingredients-1440x900/diff.json + mockup.png + sgs.png + heatmap.png in run mamas-munches-homepage-2026-05-25-060541. Re-run /sgs-clone to rule out timing artefact first.
**Status:** OPEN



**P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES** — NEW 2026-05-24 (scoped narrow). Step 1.6 (G1 closure) ships OPEN-block emit for `sgs/hero` only this phase, plus FR1 branch-(b) pattern-reference emission in Step 1.5. All other composite blocks (info-box, product-card, card-grid, etc.) continue to emit self-closing. **Why scoped narrow:** no DB column today cleanly identifies "container-shaped composite block" — `blocks.parent_block`, `block_supports`, `patterns.block_composition`, `block_attributes.output_signature` each describe partial facets but none excludes info-box / product-card from a "container-outer + InnerBlocks" definition. Investigated candidates: (a) add `is_pattern_shaped` boolean to `blocks`, hand-curated; (b) new `/sgs-update` stage that static-analyses each `render.php` for `<InnerBlocks />` inside an outer container element; (c) manual `block.json` annotation under `supports.sgs.containerShaped: true`.
**Status:** DEFERRED
**Trigger:** After Phase 1 ships AND Stage 11 per-section pixel-diff results show empirical evidence of WHICH other composite blocks visibly need OPEN-block emit from body sections emitting self-closing today.


**P-MATCH-JSON-GATE-REDEFINITION** — NEW 2026-05-24 (KJC required). The Phase 1 plan Step 1.7 gate condition (c) says "match.json shows 0 of the 5 originally-falling-through body sections still emitting sgs/container at confidence < 0.5". This gate is structurally impossible to meet with a Stage 4 walker pre-pass alone — match.json is produced by Stage 2 confidence_matrix, which runs before Stage 4. Three options: (A) redefine gate to use leftover-buckets `unrecognised_section` count (already at 0 post commit `124e1d06` — cheapest, factually correct); (B) add post-Stage-4 confidence refinement pass that infers confidence from block_markup; (C) update Stage 2 confidence_matrix to query DB child-block presence for unregistered section slugs.
**Status:** DEFERRED
**Trigger:** Bean decision needed before Step 1.7 QA gate evaluation. Present options A/B/C at that session start — Option A is recommended (cheapest, factually correct).


**P-WALKER-PREPASS-REGRESSION-TRIAGE** — HIGH — blocks Step 1.7 closure. Commit `124e1d06` causes visual regressions in featured-product (375: +53.2pp, 768: +34.7pp) and ingredients-section (all viewports: +23.6 to +33.8pp) while improving brand (-6 to -28.7pp) and gift-section (-12 to -31.9pp). Root cause: the pre-pass guard correctly prevented `composite_element` from claiming BEM-element wrappers as `sgs/text` — but the structurally correct output (individual blocks) renders further from the mockup visually because per-block CSS hasn't been lifted yet (Step 1.7.5).
**Status:** OPEN
**Bean decision (pick one, ~2 min):**
1. **Proceed to Step 1.7.5** _(recommended)_ — accept regressions as structural correctness; Steps 1.7.5+1.7.6 CSS lift will close them. Net direction is right.
2. **Revert `124e1d06`** — safer if Steps 1.7.5/1.7.6 are delayed >1 session; keeps the baseline clean at the cost of re-landing the pre-pass commit later.
3. **CSS-lift first** — add CSS-lift for the regressing sections before Step 1.7 is closed; most thorough but adds ~1-2 hrs before the gate clears.


**P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER** — The clone pipeline treats header and footer markup the same as page body. Headers and footers are template-parts on the WP target (`wp_template_part` post type), not page content. The pipeline needs a dedicated stage that (a) detects header/footer sections in the source mockup, (b) extracts them once per site rather than per page, (c) emits to template-part shape (not page-content shape), (d) handles the unique template-part wrapper classes (`wp-block-template-part`, `area="header"` / `area="footer"`). Without this handler the h/f markup either duplicates per page, drops silently, or malforms into a page-body block tree. **Trigger:** before the next multi-page clone run.
**Status:** OPEN


**P-G2-PAGE-ID-SCOPE-STRIP** — PARTIAL-RESOLVED 2026-05-23 (Wave B2). Original hypothesis (scope-prefix blocks cv2 lookup) is CLOSED: Playwright confirmed 0 `.page-id-N` scoped rules detected at the live render; the scope-strip at convert.py:3013-3015 is working. NEW finding: trust-bar emits empty `value` slot + label carrying all text → visual duplication artefact. **Closure path for the residual:** rolled into P-WAVE-2-RESHAPE — `slot_list.py` querying `property_suffixes` for non-text slots resolves this universal-extraction gap.
**Status:** PARTIAL


**P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP** — G1 + G3 + G5 reframed as ONE wiring gap, not three separate problems. The SGS-framework.db has all the mapping data needed (`property_suffixes` 117 rows, `slot_synonyms` 89 rows, `block_attributes` 1755 rows, `modifier_suffixes` 19 rows, plus pattern composition data on `patterns.block_composition` JSON column) but cv2 doesn't query all of it consistently. Wave 2 = one architectural change wiring the DB tables into the walker's emit shape, NOT three per-block fixes. See decisions.md Decision 26. **Trigger:** Wave 2 of next session.
**Status:** OPEN


**P-FR1-VARIATION-BUF-CONSISTENCY** — PARTIAL-RESOLVED 2026-05-22 commit `8ceb8787` (Wave 2 Change 1) for the FR1 fast path (block-root branch, `convert.py:3839-3867`). **/qc-council 2026-05-23 found two sibling call-sites with the same pattern still open:** (a) **essence-match tier** at `convert.py:3926` — lifts then returns at `3936-3937` without `variation_buf.append`; (b) **composite-element-to-standalone-block** at `convert.py:3970` — lifts then returns at `3990-3991` without `variation_buf.append`. Same one-line fix applies to both. **Trigger:** Task 4 Wave 2 reshape — pair with G1+G3+G5 wiring fix. ~10 min for the two sibling sites once Wave 2 starts.
**Status:** PARTIAL


**P-CLONING-PIPELINE-FLOW-DOC-DRIFT** — 2026-05-21 reality check found that the entry-point chain "verified 2026-05-13" predates the 2026-05-20 architectural rewrite (`css_router.py`, `essence_match_detector.py`, `stage_attribute_promotion.py` added but ASCII chain not refreshed). Plus G2 Step 1+2 changes (orchestrator-side CSS merge into `_section_css` + cv2 scope strip) aren't documented yet.
**Status:** OPEN
**Trigger:** Before the next architectural pipeline change that modifies the stage boundary or script chain. G2 Step 1+2 changes (commit `affca3f1`) are the immediate outstanding update.


**P-G1-HERO-INNERBLOCKS** — cv2 emits self-closing `wp:sgs/hero` block. Render.php uses `$content` (InnerBlocks) for CTAs — empty when block is self-closing. Live page 144 hero CTAs ARE INVISIBLE. ~50pp of hero's 67.8% pixel-diff. **STATUS: Phase 3 infrastructure shipped (`79158da5`) but live-page-144 end-to-end verification PENDING — that is the actual closure step.** Decision 12 adds adjacent-slot grouping; hero CTAs should emit as nested InnerBlocks via `blocks.parent_block` lookup, but no Playwright run on the live URL has confirmed the CTAs render.
**Status:** OPEN
**Trigger:** Before next pixel-diff session on hero (~15 min Playwright verification run on page 144). Pair with P-G3-STAGE-3-VISUAL-SLOT-MAPPING in the same run.


**P-G3-STAGE-3-VISUAL-SLOT-MAPPING** — Stage 3 `slot_list.py` only extracts text-content slots. Visual/structural slots (backgroundImage, overlayColour, minHeight, ctaPrimaryColour, alignment) return "no value extracted" even when mockup CSS has the values. **STATUS: Phase 3 + Phase 6 infrastructure shipped (`79158da5` + `d307c8b0`) but live-page-144 end-to-end verification PENDING — that is the actual closure step.** Decision 12's `_lift_inner_blocks` rewrite reads `slot_synonyms.standalone_block` via `db.standalone_block_for()`; Phase 6 backfills `block_supports` gaps that expose visual slot controls. No live verification has confirmed visual slots now resolve.
**Status:** OPEN
**Trigger:** Same Playwright run as P-G1-HERO-INNERBLOCKS (page 144, before next pixel-diff session). Pair both verifications in one 15-min run to amortise overhead.


**P-G4-MEASUREMENT-DECONTAMINATION** — `scripts/pixel-diff.py` screenshots include WP admin bar + sgs-header. Mockup screenshots have neither. Systematic +10-20pp inflation on EVERY section measurement. Fix: Playwright `addInitScript` removes `#wpadminbar` + `.sgs-header` before screenshot. **PARTIAL-RESOLVED 2026-05-28** by Spec 22 Phase 0.3 work on `scripts/pixel-diff.py`: chrome-detect (`#wpadminbar` + first `header.wp-block-template-part`) + chrome-hide (`visibility:hidden` pre-screenshot, only on `is_sgs=True` captures of sticky/fixed chrome) + new `--wait-fonts` flag. Empirical: hero-clone-poc 1440 54.5% → 10.3% (-44.2pp); Mama's hero 1440 69.6% → 60.8% (-8.8pp). Most non-chrome-affected cells unchanged. Trust-bar / brand-1440 / hero-768 / hero-375 dimensions baseline unchanged.
**Status:** PARTIAL — closed for sticky template-part-header overlay (the primary 60px chrome bleed). Residual: cv2-emitted `<header class="sgs-header">` body content is NOT hidden (correctly — it's part of the comparison surface, gated on `.wp-block-template-part` class check). **Note (D88 2026-05-27 — /qc-council Task 5 Rater A correction):** Mama's brand-375 +2.4pp shift (53.2% → 55.6%) is NOT flake — three byte-identical-PNG re-runs confirmed determinism. It's a REAL methodology shift from the 83px sticky-chrome hide at 375. Implication: every chrome-affected Mama's cell partially-stale on 2026-05-26 mean 63.0% baseline; Wave B (2026-05-27) re-capture confirmed at full-page scale: new baseline `pipeline-state/mamas-munches-144-2026-05-26-122349/stage-11-pixel-diff.json` overall mean 62.99% → 58.91% (-4.08pp); Spec 22 body cells aggregate 57.83% → 57.14%. Hero 1440 -8.8pp confirmed. brand-375 +2.4pp persists (0 chrome detected on this cell; wait_fonts=true; effect is wait_fonts-stabilisation not chrome-hide — net honest, not regressed). 23/23 captured cells had chrome-detected + wait_fonts=true telemetry. 2 footer captures failed (Wave B halted reporting per brief threshold; main session accepted per D88 context). Phase 1.5 stretch goal owns any further measurement-script tuning.
**P-G5-PER-BLOCK-DOM-SHAPE-FIXES** — Per-block mismatches between mockup and render output:

- brand-strip: mockup `<blockquote>` vs render `<section>`
- testimonial-slider: mockup 3-col static grid vs render single-card carousel (needs Block Style Variation `displayMode: grid` via P2.iii infrastructure)
- trust-bar: mockup `__badge` + `__text` + inline SVG vs render `__item` + `__label` + Lucide slugs
**Trigger:** Wave 3 of next session (G5), parallel subagents per block.
**Status:** OPEN

**P-F5-D1-MEDIA-FIELD-RESPONSIVE-FLOW** — D1 sidecar preserves `media` field but reader at `convert.py:_load_d1_assignments` only merges base values. Responsive variants (`@media (min-width: 1024px)` → `Desktop` attr) never flow. Hero 375 mobile +13.3pt regression from this. Fix: map media-condition → breakpoint slug → responsive-variant-attr name. **Trigger:** Wave 3 of next session (F5), parallel with G5.
**Status:** OPEN


**P-P1Bx-COMMA-MEDIA-INNER** — P1.B.x's `_scope_media_rule()` only scopes the first part of comma-grouped inner selectors. `@media (...) { .sgs-hero, .sgs-cta { ... } }` produces `.page-id-144 .sgs-hero, .sgs-cta { ... }` — `.sgs-cta` left unscoped. Low-frequency edge case. **Trigger:** next css_router maintenance pass.
**Status:** OPEN


**P-P1Bx-NESTED-SUPPORTS** — Nested `@supports` inside `@media` produces invalid CSS. Recurse the scope-injection OR pass through unchanged. Low-frequency. **Trigger:** next css_router maintenance pass.
**Status:** OPEN


**P-P2II-CSS-VALUE-RE-TIGHTEN** — `_CSS_VALUE_RE = re.compile(r"^[^;{}<>\"]*$")` in `stage_attribute_promotion.py` permits single quotes, backticks, parentheses. Defence-in-depth (esc_attr() in PHP is real guard) but worth tightening. **Trigger:** next P2.ii maintenance pass.
**Status:** OPEN


**P-P2III-ESSENCE-MATCH-TIER-GATE** — `essence_match_variation` tier in cv2 walker only fires when `target == "sgs/container"`. Theoretical edge case: an existing-but-stub block at slug X with a sibling concept Y wouldn't trigger the variation tier. Low-priority. **Trigger:** first real-world variation-detection run.
**Status:** DEFERRED


**P-LEGACY-FILES-PHYSICAL-DELETION** — `tools/recogniser-v2/extract.py` + `extract_strategies.py` + `overrides/hero.py` (1942 LOC) remain on disk; unreachable from orchestrator. Physical deletion deferred until universal extraction handles hero via D1/D3 (no per-block legacy).
**Status:** OPEN
**Trigger:** Phase 1 G5 (per-block DOM-shape fixes) verification PASSES on hero universal-handling at all 3 viewports. "Wave 3" in earlier entry text = current Phase 1 G5 wave.


**P-TEST-POLLUTION-HYGIENE** — `test_licensed_in_description_rejected` fails after `test_staged_merge` (now N/A after Wave 2b revert, but underlying state-leak pattern likely affects other cross-file runs).
**Status:** DEFERRED
**Trigger:** Revisit on first cross-file pytest ordering failure. No active failure observed since Wave 2b revert.



**P-WAVE-4-DOC-FOLLOWUPS** — Sonnet /qc raters surfaced: `/research-buddies` skill missing from dispatch chain; Wave 3 Indus heritage-strip not in flow doc body; `+DEPLOY`/`+PARITY` tails could use dedicated stage blocks; FR36/FR37/FR40 status incomplete in Spec 16 §12.9.
**Status:** OPEN
**Trigger:** Next doc-op session specifically targeting Spec 16 §12.9 and cloning-pipeline-flow.md. "Phase 4" in the original trigger = `.claude/plans/2026-05-24-phase-4-skill-optimisation.md` — check that plan's scope before opening this entry.


### P-DETECT-INNER-ELEMENT-WIDTHS — `_detect_client_layout_widths` misses `__inner` element widths (~20 min)
**Status:** OPEN


**What:** Today's orchestrator re-run wrote `theme/sgs-theme/styles/mamas-munches.json:settings.layout = {contentSize: 1000px, wideSize: 1000px}` — both keys carry the same value because only one block-root selector (`.sgs-brand { max-width: 1000px }`) matched. The mockup actually authors content widths on `__inner` elements: `.sgs-header__inner: 1280px`, `.sgs-trust-bar__inner: 1100px`, `.sgs-featured-product__inner: 1040px`, `.sgs-ingredients-section__inner: 960px`, `.sgs-gift-section__card-inner: 960px`, `.sgs-social-proof__inner: 960px`. The current SGS-BEM-block-root regex correctly rejects these (per Section T of common-wp-styling-errors.md), but in doing so loses real layout-width signal.

**Fix shape:** extend `_detect_client_layout_widths` to ALSO accept `^\.sgs-[a-z][a-z0-9]*(-[a-z0-9]+)*__inner$` selectors (the canonical SGS-BEM "inner wrapper" element name). Universal-benefit: `__inner` is a convention name, not a client-specific class. The function still rejects `__title`, `__lead`, `__card`, etc — only `__inner` counts as a layout-width signal.

**Trigger:** next session's intra-section closure work — picking up after this session's framework shipment.

### P-FOOTER-WRAPPER-CLASS-MISSING — sgs/footer render.php doesn't emit `.sgs-footer` on wrapper (~10 min)
**Status:** OPEN


**What:** Pixel-diff against page 144 (canary — page 131 was deleted) selecting `.sgs-footer` at 1440 returns 98.7% diff — but the cause isn't the footer rendering badly; it's that `.sgs-footer` matches a stray `<h2 class="...sgs-footer-label">` heading on the page, NOT the actual `<footer>` wrapper. The sgs/footer block's render.php emits the `<footer>` element without adding `sgs-footer` as its block-root class. Selector-by-prefix mismatches cause this collision.

**Fix shape:** audit sgs/footer (and sgs/header — same issue suspected; header diff 24% may also be wrong-element-matched) render.php to add `sgs-<block-name>` class to the wrapper alongside any existing `wp-block-sgs-<name>`. Re-measure with the corrected wrapper class to get a real footer diff.

**Trigger:** before any further pixel-diff measurement on `.sgs-footer` or `.sgs-header` — selector reliability gate.

### P-HEADER-WRAPPER-CLASS-AUDIT — sgs/header same suspected pattern (~10 min)
**Status:** PARTIAL


**What:** Similar to footer. Header at 24% (clean baseline) is suspiciously low given the visual rendering shows substantial differences. Possible that the selector is matching only a partial header sub-tree. Confirm by checking what `.sgs-header` matches on page 144 (canary page — page 131 was deleted).

**Fix shape:** read first `<*[class*=sgs-header]>` element on page 144; if it's not a `<header>` wrapper, apply the same fix as P-FOOTER-WRAPPER-CLASS-MISSING. **Closure criterion:** Playwright confirms `.sgs-header` matches a `<header>` wrapper element on page 144.

**Trigger:** alongside P-FOOTER-WRAPPER-CLASS-MISSING.

### P-SGS-ATOMIC-RICH-TEXT-AUDIT — SGS atomic emissions (sgs/heading, sgs/text, sgs/button, sgs/quote) don't preserve inline rich-text (~60 min)
**Status:** OPEN


**What:** XS-9 (2026-05-30 D104) added rich-text preservation for `<br>`, `<strong>`, `<em>`, `<a>` etc. in core/* atomic-tag swaps (core/heading, core/paragraph, core/quote, core/button). SGS atomic emissions retain `node.get_text(strip=True)` behaviour pending render.php audit because their content escape policy is unknown — applying rich-text without confirming `wp_kses_post()` wrap on render could either (a) lose tags to `esc_html()` escaping or (b) introduce XSS.

**Empirical evidence the gap matters:** Mama's hero H1 (`<h1>Made for the mum<br>who needs it most</h1>`) is processed via sgs/heading atomic-tag swap, so XS-9 fix doesn't reach it. Hero pixel-diff unchanged at 67.76% pre/post XS-9 measurement.

**Fix shape:**
1. Read render.php for sgs/heading, sgs/text, sgs/button, sgs/quote
2. Identify which use `esc_html()` (strip tags) vs `wp_kses_post()` (preserve safe HTML) on content
3. For blocks using `esc_html()`: either (a) migrate to `wp_kses_post()` per WP standards then enable rich-text preservation in `_atomic_attrs_for`, OR (b) leave them as plain-text emissions
4. For blocks already using `wp_kses_post()` (if any): extend XS-9 `_rich_text_content` helper coverage to those slugs
5. Document the per-block decision in `.claude/specs/02-SGS-BLOCKS.md`

**Trigger:** Wave 6 of the diagnostic register fix sequence OR when hero pixel-diff needs to drop below ~50% (sgs/heading rich-text restoration is one of the constraints).

### P-PIXEL-DIFF-PER-SECTION-NOISE-FLOOR — confirm ±2pp variability (~30 min)
**Status:** OPEN


**What:** XS-8/9/10 measurement run (2026-05-30) showed sgs-social-proof pixel-diff moved +2.04pp despite block_markup being byte-identical pre/post (verified). This indicates inherent per-section pixel-diff variability of ~±2pp from font rendering / screenshot timing / browser state. Need to formalise this noise floor so future fix-cycles correctly attribute small per-section deltas.

**Fix shape:**
1. Run /sgs-clone 3-5 times on identical code state
2. Compute per-section pixel-diff variance across runs
3. Document the ±N noise floor in .claude/specs/21-PIPELINE-STATE-ARTEFACTS.md Stage 11 section
4. Update diagnostic register methodology: per-section deltas within noise floor are reported as "no significant change" not "improvement/regression"

**Trigger:** Before Wave 4 (XS-3) measurement cycle, since wrapper-slot fixes are predicted to produce per-section deltas large enough to need noise floor calibration to distinguish signal from variance.

### P-HEADING-DEFAULTS-NORMALISE-FOR-SERIF — `headlineLetterSpacing: -0.01em` default not universal (~20 min)
**Status:** OPEN


**What:** Rater 1 finding. sgs/heading render.php fallback default `headlineLetterSpacing: -0.01em` actively hurts readability on loose serif faces (DM Serif Display, Playfair). Sans-serif display (Inter, Montserrat) benefits from -0.01 tracking; serifs don't.

**Approach:** Change default to empty string in render.php (no inline style emitted unless explicitly set). Same audit for `headlineLineHeight: 1.2` etc. — defaults should be `null`/empty so theme/inherited values win. Per-attribute audit + update.

**Trigger:** First serif-typography client OR when adding a non-Inter style variation.


### P-BORDER-STYLE-ENUM-PARITY — sgs/heading vs sgs/quote borderStyle enum mismatch (~5 min)
**Status:** OPEN


**What:** Rater 4 finding. quote allows `["none","solid","dashed","dotted","double"]`. heading only allows 4 (no "double"). Setting `borderStyle: double` on heading silently downgrades to `none`.

**Approach:** Standardise to the 5-value set across heading + text + quote + future. One-line edit in each block.json.



### P-WP-AUTOP-INTERACTION — Audit how WP `wpautop` interacts with sgs/text emission (~30 min)
**Status:** DEFERRED

**Trigger:** Revisit if a real test failure surfaces showing double-wrap on sgs/text content — currently theoretical only.

**What:** Rater 4 theoretical risk. WP's `wpautop` filter wraps bare text in `<p>` — if sgs/text emits `<p>` content, double-wrap risk.

**Approach:** Test scenario; if real, add `wpautop` opt-out in block render.


### P-WP-UNIQUE-ID-CACHE-COLLISION — Anchor scoping under fragment cache (~30 min)
**Status:** DEFERRED

**Trigger:** Revisit if a production collision is observed (fragment-cached ID mismatch manifests as a broken style scope). Currently theoretical.

**What:** Rater 4 theoretical. `wp_unique_id()` is per-request sequential. Fragment cache combining requests could mismatch scoped `<style>` ID with rendered element ID.

**Approach:** Use content-derived hash (e.g. `md5` of block JSON) for scoped IDs instead of sequential counter. Stable across cache fragments.

### P-HEADING-TRANSITION-ATTRS — Add transitionDuration + transitionEasing attrs to sgs/heading hover (~15 min)
**Status:** OPEN


**What:** Rater 4 finding (partially false — attrs don't exist today). sgs/heading hover transition is hardcoded `300ms ease`. Non-configurable; should expose attrs for parity with hover-controls extension.

**Approach:** Add `transitionDuration` (number, default 300) + `transitionEasing` (string, default "ease") to block.json. Render.php reads them. Same for sgs/text + sgs/quote.

### P-WRAPPER-ATTR-LEADING-SPACE-AUDIT — Sweep `<element<?php echo` across all dynamic blocks (~45 min)
**Status:** OPEN


**What:** sgs/heading rendered malformed HTML `<divstyle="..."` when WP's block-supports filter injected a style attr via regex without leading space. Fixed today via explicit space: `<div <?php echo $wrapper_attrs; ?>>`. The same pattern likely exists in other dynamic blocks (sgs/info-box, sgs/feature-grid, sgs/testimonial, sgs/card-grid, sgs/container, sgs/hero, sgs/button, sgs/cta-section, sgs/media, sgs/text) — any wrapper tag rendered as `<tag<?php echo $wrapper_attrs; ?>>` without explicit leading space is at risk when block-supports adds inline-style attrs.

**Approach:** grep for `<\w+<\?php echo \\\$wrapper_attrs` across all `plugins/sgs-blocks/src/blocks/*/render.php`. For each match, insert a literal space before the `<?php` opener.

**Trigger:** Next time a dynamic block adds WP-native `supports.spacing` / `supports.color` AND the converter emits it. Or any time someone reports a section that renders shorter than expected on the frontend (could be premature `</tag>` close from malformed parent).

Captured 2026-05-17 from /qc-inline finding 1 (HIGH).

### P-FR1-PLUS-GRID-DOUBLE-LIFT-REGRESSION — Add regression scenario for FR1 + grid container interaction (~30 min)
**Status:** OPEN


**What:** `_lift_root_supports_to_style` for sgs/container is now called from BOTH the FR1 block-root path (line ~1956) AND the css_driven_container path (line ~2422). A node that's BOTH a block root AND has display:grid would route through both branches. The lift uses `_set_in` with never-overwrite semantics → theoretically idempotent, but never exercised end-to-end.

**Approach:** craft a synthetic mockup snippet where a sgs/X-rooted block also has `display: grid` in its mockup CSS. Run through converter. Assert `attrs["style"]` doesn't get clobbered by the second pass.

**Trigger:** Before shipping any further `_lift_root_supports_to_style` changes (immediate gate). The synthetic test scenario is the acceptance criterion — write it once, run it on every lift commit thereafter.

Captured 2026-05-17 from /qc-inline finding 4 (LOW).

### P-MEASUREMENT-CONTEXT-PARITY — Pixel-diff baseline has 30%+ wrapper-context noise floor
**Status:** OPEN


**What:** Brand pixel diff stayed at ~36/13/39% across multiple variations even after universal lift + Path B (sgs/media + sgs/text) + naked-img figure removal + real image upload. Root cause is NOT converter quality — it's wrapper-context noise in the measurement.

**Evidence (2026-05-17):** `.sgs-brand` crop dimensions at 1440 viewport:
- post 66 (mockup baseline): 780 × 791
- post 65 (SGS converter output): 1000 × 705

Different DOM wrapper contexts: post 66 is plain mockup HTML inside WP content area; post 65 has SGS sgs/container parent applying its own padding/max-width. The 30%+ floor cannot be closed without rendering both sides in identical contexts.

**Approach options:**
1. **Standalone-page renderer** — both mockup and converter output rendered as bare HTML pages (no WP theme chrome), pixel-diff between those. New infrastructure (~2-4 hrs).
2. **Identical-wrapper mode** — modify post 66 to wrap mockup HTML in the same SGS-container DOM as post 65. Brittle; depends on the section-shape Bean is cloning. (~1 hr).
3. **Reduced-noise selector** — pixel-diff a finer-grained selector (e.g. just `.sgs-brand__image` element) rather than the whole section. Eliminates wrapper noise but loses cross-element context.

**Trigger:** Next brand+hero walkdown session OR when Bean reviews the 2026-05-17 close.

Captured: 2026-05-17.

### P-IMAGE-UPLOAD-INTO-PIPELINE — Promote upload_and_patch.py into the orchestrator (~30 min)
**Status:** OPEN


**What:** The 2026-05-17 session built `reports/brand-walkdown-2026-05-19/upload_and_patch.py` as a one-shot fix to upload mockup images + patch block_markup. The orchestrator's stage-4i media-sideload runs in `--dry-run` mode by default; live upload is never triggered through the canonical pipeline.

**Approach:** Add `--upload-media` flag to `sgs-clone-orchestrator.py`. When set:
- Pass `upload=True` to `sideload_batch`
- Add a post-sideload "URL rewrite" step that maps relative paths in `extract.json:block_markup` to the uploaded WP attachment URLs
- Save patched extract as authoritative for post-deploy `register_to_wp`

**Trigger:** Any client deploy or live-data run where the converter must produce a working page.

Captured: 2026-05-17.

### P-CORE-STYLE-MAP-DB-MIGRATION — Migrate `_CORE_BLOCK_STYLE_MAP` to DB-driven lookup (~1.5 hrs)
**Status:** OPEN


**What:** The new `_lift_core_block_style()` helper in `convert.py` (commit landing 2026-05-19) uses a 26-entry module-level dict `_CORE_BLOCK_STYLE_MAP` mapping CSS properties to WP core-block `style.*` paths. This is data, not logic — should live in the canonical sgs-framework.db, not inline.

**Why DB-first:** Binding rule blub.db row 260 (2026-05-17) — hardcoded lookup dicts must check DB first. The existing `property_suffixes` (117 rows) covers the SGS-flat-attr mapping (`color → colour`, `font-size → fontSize`, etc.). Core-block style paths (`color → ["color","text"]`, `font-size → ["typography","fontSize"]`) are a parallel but distinct mapping. Either: (a) add a new column to property_suffixes (`core_block_style_path`, JSON-encoded), OR (b) add a new sibling table `core_block_style_paths` (css_property, style_path JSON, kind, image_only bool).

**Trigger:** Next converter iteration touching core-block lift OR a `/sgs-update` refresh that should propagate to both maps OR rater feedback on subsequent commits flags the duplicate.

**Approach:**
1. Schema migration adding `core_block_style_paths` table (CSV-seeded for idempotency)
2. New `db_lookup.core_block_style_path_for(css_prop)` returning `(path, kind, image_only)`
3. Replace module-level `_CORE_BLOCK_STYLE_MAP` with lazy DB call (lru_cache on first use)
4. Mark Bean's row-260 lesson satisfied

Captured: 2026-05-19 by QC rater 2 (Haiku DB-schema lens).

### P-COVERAGE-METRIC-CORE-STYLE — Extend `attribute_coverage` to count core-block nested style paths (~30 min)
**Status:** OPEN


**What:** `scripts/pixel-diff.py compute_attribute_coverage` does suffix-anchored match on SGS-flat-attr keys (`headlineFontSize`, `image.url`, etc.). The new universal-lift helper emits nested `style.color.text`, `style.typography.fontSize`, `image.style.scale` etc. — the coverage matcher doesn't recognise these paths as covering CSS rules.

**Evidence:** 2026-05-19 brand walkdown: post-lift extract has +4 new nested style objects (image.style, heading.style, paragraph.style, button.style). Coverage% still reads 18.75% — unchanged from pre-lift baseline. The lift IS happening (verified in extract.json); the metric is blind to it.

**Approach:** Add a second matcher to `compute_attribute_coverage` that walks nested `*.style` dicts and matches each leaf's path tail (e.g. `style.color.text` covers `color` rules, `style.typography.fontSize` covers `font-size`, `style.dimensions.maxHeight` covers `max-height`). Reuse `_CORE_BLOCK_STYLE_MAP` from convert.py as the ground truth.

**Trigger:** Next session's brand+hero re-measurement OR before any handoff that claims coverage% as evidence.

Captured: 2026-05-19 inline during brand walkdown.

### P-PARENT-QUALIFIED-TAG-LIFT — Smarter SGS-class guard allowing parent-qualified tag selectors (~45-60 min)
**Status:** OPEN


**What:** The 2026-05-19 commit's `_lift_core_block_style` SGS-class guard rejects lift on any node without an `sgs-` class. This correctly blocks the tag-blast-radius bug (rater 3 finding: `p { color: #333 }` corrupting every paragraph globally). However, it ALSO rejects parent-qualified tag selectors like `.sgs-brand__body p { font-size }` — the inner `<p>` has no SGS class but the matching selector IS class-qualified via the ancestor.

**Evidence:** Post-fix shakeout 2026-05-19 shows -1 attr per non-canary section vs subagent's permissive run (brand 40 vs 41, featured-product 53 vs 54, ingredients 28 vs 29, gift 43 vs 44, social-proof 17 vs 18). The lost attr per section is the parent-qualified tag-selector lift.

**Approach:** Modify `_collect_css_decls_for_element` (or add a sibling fn) to RETURN the matched selectors alongside declarations. Then in `_lift_core_block_style`, after collecting decls, filter to only those whose matched selector has at least one `.sgs-*` class token anywhere in the selector chain. This allows `.sgs-brand__body p` (has ancestor sgs class) while rejecting bare `p` (no sgs class anywhere).

**Trigger:** Next session's brand+hero re-measurement when the -1 attr/section gap proves to bite OR P-COVERAGE-METRIC-CORE-STYLE shipping reveals which specific rules are lost.

Captured: 2026-05-19 post-fix verification.

### P-TAG-SELECTOR-LIFT — Lift CSS from tag-only selectors targeting atomic children (~30-45 min)
**Status:** OPEN


**What:** `_lift_core_block_style` reads CSS via `_collect_css_decls_for_element` which matches by class + parent-qualified class selectors. Pure tag selectors (`blockquote p`, `blockquote footer`, `h1, h2, h3 { font-family }`, `img { max-width }`, `a { color }`) aren't picked up because the node's classes don't match.

**Why this matters for brand:** mockup CSS has 5 tag-only rules that affect brand subtree visibility:
- `*, *::before, *::after { box-sizing; margin; padding }`
- `h1, h2, h3 { font-family; line-height }`
- `img { max-width; display }`
- `a { color; text-decoration }`
- `blockquote { font-style }` + `blockquote p { ... }` + `blockquote footer { ... }`

After universal-class filter (the 5 above are universal → don't count), the blockquote-children rules are still missing. They drop brand's effective coverage by 3 rules (blockquote, blockquote p, blockquote footer).

**Approach:** Add a second pass in `_lift_core_block_style` that queries CSS rules for selectors matching the node's tag name + ancestor chain. Limit ancestor chain to 3 levels to avoid combinatorial blowup. Reuse mapping infrastructure.

**Trigger:** Next walkdown where blockquote / tag-styled content is visible OR P-COVERAGE-METRIC-CORE-STYLE shows tag-selector residual.

### P-PHASE9-REDEPLOY-BASELINE — Refresh sandybrown post 65 with post-lift converter output (~20 min)
**Status:** OPEN


**What:** Pixel-diff baseline (post 65 at sandybrown-nightingale-600381.hostingersite.com) was last refreshed 2026-05-17. The 2026-05-19 commit adds new `style.*` attrs into emitted block markup. Until post 65 is redeployed with the new markup, pixel-diff% won't reflect the visible improvement.

**Approach:** Re-run `/sgs-clone` full-page mode → take new extract.json's block_markup for the brand section → update WP post 65 via REST or wp-admin → take fresh screenshots. Standard redeploy workflow.

**Trigger:** Next session's brand+hero re-measurement.

### P-COVERAGE-SCOPE-FILTER — Add `selector_scope` field to expected-rules baseline (~30 min)
**Status:** OPEN


**What:** Coverage% currently treats every CSS rule in `expected-rules-<boundary>.jsonl` as a candidate for SGS-attr matching. Universal selectors (`*, *::before, *::after`), generic-tag selectors (`h1, h2, h3`, `img`, `a`), and pseudo-only-state selectors (`:hover` against generic tags) have no SGS-attr equivalent by design. Including them in the denominator deflates coverage% on every section. Real impact: brand reads 18.75% coverage today (dry-run 2026-05-18); with universal filter applied it would read ~30%. The qualitative verdict ("real debugging needed") doesn't change — but the metric will be more accurate.

**Approach:** Add `selector_scope` field to each baseline row. Values: `universal` (matches `*`, `:root`, `html`, `body`), `tag_generic` (bare tag selectors with no class), `block_scoped` (matches `.sgs-*`). Coverage computation reports `block_scoped` only; the other two surface as separate non-counted lines. Cross-block attr aggregation (rules targeting nested blocks should compare against the child's attrs) is a harder second-order refinement — park separately.

**Trigger:** Bean asks "coverage% feels low" OR cross-cutting batch in a future session OR raters at next session's council debate cite metric noise as a problem.

### P-PHASE9-5 — Empty-DB defensive assertion (Adversarial A1)
**Status:** OPEN


**What:** `db_lookup.css_property_suffixes()` returns `[]` silently if the `property_suffixes` table is empty or DB file is missing (sqlite3 auto-creates an empty file on connect). The lifter then extracts zero CSS-driven attrs across the entire pipeline with no error raised.

**Approach:** Add `assert len(rows) > 0` at module load. Or fail-fast with a clear `RuntimeError` message naming the canonical DB path + `/sgs-update` recovery command. ~5 line fix.

### P-PHASE9-6 — RETIRED_BLOCK_REMAP future-block-registration guard (Adversarial C1)
**Status:** OPEN


**What:** `RETIRED_BLOCK_REMAP = {"heritage-strip": "brand"}` silently locks pattern routing even if `sgs/brand` is later registered as a real block. The remap fires unconditionally; Tier 2 always picks the pattern over the block.

**Approach:** Add a module-load assertion that no `RETIRED_BLOCK_REMAP` value collides with a currently-registered block slug (via `db.registered_block_slugs()`). Or invert the priority: check `block_exists()` first, only remap when the block is actually gone.


### P-PHASE9-NITS-BATCH — Fresh-eyes nits in convert.py / db_lookup.py
**Status:** DEFERRED

**Trigger:** Batch these during the next convert.py general maintenance pass — no functional impact, pure readability.

- **P-PHASE9-8:** `convert.py:_css_prop_to_suffix()` and `_breakpoint_suffixes()` are thin wrappers with no transformation. Inline the calls at the 3 call sites; drop the wrapper functions. ~10 lines removed.
- **P-PHASE9-9:** `db_lookup._kind_for(suffix, role)` is opaque on cold read. Rename to `_value_kind_for_suffix()`. Update the 1 call site.

### P-PHASE8-14 — Section-collapses-into-leaf-block guard
**Status:** OPEN


**What:** Multi-rater /qc panel (fresh-eyes lens) flagged an adversarial scenario: a section whose class accidentally matches a leaf-level block name (e.g. `<section class="sgs-product-card">` rather than `<section class="sgs-products"><div class="sgs-product-card">…</div>…</section>`). Stage 2 matches the registered `sgs/product-card` at confidence 1.0. The block-root fast path fires at the section root. `lift_subtree_into_block_attrs` collapses the entire multi-component section into a single product-card block with whatever the first descendant's attrs were. No bucket captures this — silent collapse.

**Trigger:** Real client mockup hits the pattern, OR Phase 8 closure work uses an adversarial test to demonstrate the gap.

**Approach:** Add a new check `route_section_complexity_mismatch` (or extend `route_wrong_block_type`): when Stage 2 matches a registered LEAF block (no InnerBlocks slot in block.json) at confidence ≥ threshold AND the section DOM contains > N child elements OR descendant depth > D, emit `structural_mismatch_or_orphan` with `source="section_collapsed_into_leaf_block"` and severity `high`. Need to read block.json `supports` to determine "is this a leaf vs composite block". ~25 lines + DB lookup.

### P-PHASE8-15 — severity_totals key in orchestrator router-failure fallback
**Status:** OPEN


**What:** Multi-rater /qc panel (ecosystem lens) noted the orchestrator's bucket-router subprocess-fail fallback initialiser hardcodes `{"leftover_buckets": {}, "totals": {}, "total_count": 0}` — no `severity_totals` key. If the router subprocess fails (non-zero exit) AND a downstream consumer eventually reads `severity_totals`, it'll throw KeyError. No consumer reads it yet, but future operator-review HTML / handoff regen may.

**Trigger:** First downstream consumer of `severity_totals` is wired in.

**Approach:** Add `"severity_totals": {}` to the fallback init dict at `sgs-clone-orchestrator.py:1606`. 1 line.

### P-PHASE8-9 — Slot-synonym expansion: tile / panel / feature / module / item
**Status:** OPEN


**What:** The 2026-05-16 walker fix added `card → sgs/info-box` via `slot_synonyms.standalone_block`. Multi-rater /qc panel (fresh-eyes lens) recommended also registering the four next-most-common BEM element names that map to info-box compositions in real-world client mockups: `tile`, `panel`, `feature`, `module`, `item`.

**Trigger:** Next client onboarding hits one of these element names AND surfaces as an unmatched gap in `pipeline-state/<run>/leftover-buckets.json`, OR Phase 8 closure work touches a section with these names.

**Approach:** INSERT rows into `slot_synonyms` (sgs-framework.db) with `canonical_slot` = one of the names, `standalone_block` = `sgs/info-box`. Mirror as aliases on the existing `card` row if structurally equivalent. ~5 min per synonym.

### P-PHASE8-10 — Standalone-block column validation on walker startup
**Status:** DEFERRED


**What:** Multi-rater /qc panel (architecture lens) raised a deferred concern: a bad row in `slot_synonyms.standalone_block` (e.g. `text → sgs/paragraph`, `media → sgs/image`) would route every leaf-text element through the composite path, conflicting with `ATOMIC_TAG_MAP`. No load-time validation today.

**Trigger:** Next time someone proposes adding a synonym for a tag covered by `ATOMIC_TAG_MAP`, OR the converter exhibits unexpected routing under DB extension.

**Approach:** In `db_lookup._slot_to_standalone_block()`, reject any row where the standalone_block matches a value in `ATOMIC_TAG_MAP.values()`. Emit stderr warning + drop the row from the map. ~10 lines.

### P-PHASE8-2 — Per-block render.php audits
**Status:** OPEN


**What:** Many lifted styling attrs aren't honoured by block render.php. The converter lifts `headlineFontSizeTablet` correctly but the block's render.php doesn't emit a `@media (min-width:768px) { .sgs-Xxx__headline { font-size:N }}` rule for it. Audit 6-8 blocks (hero, product-card, info-box, heritage-strip, testimonial-slider, feature-grid, card-grid, cta-section).

**Trigger:** Phase 8 section-by-section closure — each section's per-section diff above 1% drives an audit of its block's render.php.

**Approach:** for each block:
1. List all *Tablet / *Mobile / *Desktop variant attrs in block.json
2. Confirm render.php emits matching media-query CSS for each
3. Confirm CSS uses `:not([style*="<prop>"])` fallback pattern per SGS standard

**Effort:** ~30 min per block × 6-8 = 3-4 hours.

### P-PHASE8-3 — Remove hyperspecific block_slug guards in `lift_subtree_into_block_attrs`
**Status:** OPEN


**What:** `if block_slug == "sgs/hero":` at line 1016 and `if block_slug == "sgs/heritage-strip":` at line 1048 are pre-existing technical debt the multi-model QC panel surfaced as "in scope of NEEDS-REFACTOR but not new". Refactor to BEM-modifier-driven generic lift via a DB-backed `block_image_slots` table (subagent 5's 2026-05-15 design).

**Trigger:** Either Phase 8 closure work hits a non-Mama's hero, OR the heritage-strip pattern refactor (P-PHASE8-1) makes the heritage guard dead code.

**Approach:** see 2026-05-15 subagent 5 report in conversation transcript. ~70-80 lines + DB seed.

### P-PHASE8-4 — `convert_page.py` line 198 still hardcodes `extracted_attributes: {}`
**Status:** OPEN


**What:** During the 2026-05-15 styling-lift work, the implementer fixed `convert_section()` in `__init__.py` to populate extracted_attributes via brace-depth extraction. The parallel `convert_page.py` function still has the hardcoded empty dict. If the orchestrator routes through convert_page.py instead of convert_section, Stage 9 sees empty extracted_attributes.

**Trigger:** Next session start (Phase 8 will run convert_page.py at orchestrator invocation; surface this as one of the first investigations).

**Approach:** apply the same brace-depth extractor logic. ~15 lines.

### P-PHASE8-5 — Pack-size pills not rendering on featured-product cards
**Status:** OPEN


**What:** Lift code in `_extract_attr_value` and the lift_subtree loop correctly emits `packSizes` array in the converter's WP block markup for Zookies card. Render.php has `if ( ! $is_trial && ! empty( $pack_sizes ) )` gate. Pills don't render visibly on the deployed page. Audit the `$is_trial` computation — likely the variantStyle being lifted as "standard" doesn't quite match what render.php expects.

**Trigger:** Phase 8 section-by-section closure hits `.sgs-featured-product`.

**Approach:** open `plugins/sgs-blocks/src/blocks/product-card/render.php`, trace `$is_trial`, confirm the variantStyle enum mapping. ~15 min.

### P-PHASE8-6 — Section-internal nav mapping
**Status:** OPEN


**What:** `<nav>` is in `SKIP_TOP_LEVEL_TAGS` so the top-level header skip works. But nested navs (inside non-header sections) currently pass-through their children as bare `<a>` tags that render as `<p>Shop</p><p>About</p>…` paragraphs. Map nested `<nav>` to `core/navigation` or `sgs/mega-menu`.

**Trigger:** Phase 8 work hits a section with nested nav, OR a new client mockup needs section-internal navigation.

**Approach:** add `<nav>` to ATOMIC_TAG_MAP routing to `core/navigation` with a child-link lifting helper. ~30 lines.

### P-PHASE8-7 — `_BREAKPOINT_SUFFIXES` non-standard breakpoint silent-drop
**Status:** OPEN


**What:** The styling-lifter's `_BREAKPOINT_SUFFIXES` table covers 5 industry-standard breakpoints (min-width 768/1024/1280, max-width 767/640). Non-standard breakpoints (e.g. `min-width: 900px` or `min-width: 576px`) are silently ignored — the responsive attr family doesn't get lifted.

**Trigger:** Phase 8 work hits a mockup with non-standard breakpoints, OR a CC/QC reviewer flags this gap.

**Approach:** add a stderr warning when a media-query selector matches a known class but the breakpoint isn't in the table. Long-term: read breakpoints from theme.json or a new config rather than a hardcoded set. ~30 min.

### P-MM-1 — Create 4 gap-candidate patterns for Mama's homepage
**Status:** OPEN


**What:** Four mockup sections have no matching pattern yet: `featured-product`, `products` (4× `sgs/product-card` grid), `gift-section` (3 cards: 1 trial + 2 gifts), `social-proof` (containing `sgs/testimonial-slider` + trustpilot bar). Each needs a pattern file under `theme/sgs-theme/patterns/` following the same shape as `ingredients-section.php` and `header-mamas-munches.php`.

**Trigger:** Phase 8 starts. Patterns get created inline as `/sgs-clone` Stage 7 (composition emit) surfaces them — per the "make new blocks inline, never defer with placeholder" rule.

**Spec:** TRUTH-SPEC at `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` documents the slot bindings for each. The renamed mockup HTML at `sites/mamas-munches/mockups/homepage/index.html` is the visual source of truth.

**Effort:** ~10-15 min per pattern (use ingredients-section.php as scaffold; replace inner blocks per slot table).

### P-MM-2 — Decide on sgs/section-heading block
**Status:** OPEN


**What:** Mama's mockup has cross-section utility classes `.sgs-section-heading__label`, `.sgs-section-heading__intro`, `.sgs-section-heading__sub` appearing inside 4 different parent sections. Currently a CSS-only convention. Decide whether to formalise as a dedicated `sgs/section-heading` block so the recogniser can match it as a real block, or leave as a utility convention.

**Trigger:** Phase 8 — if the recogniser flags these classes as orphan elements during Stage 6 (CSS classify), promote to a block. Otherwise stay as utility.

**Effort:** ~30-45 min if creating the block (block.json + edit.js + save.js + render.php + style.css). Zero if leaving as utility.

### P-MM-3 — Add cart element to header-mamas-munches pattern
**Status:** OPEN


**What:** Current `theme/sgs-theme/patterns/header-mamas-munches.php` uses `core/site-logo` + `core/navigation` + `sgs/mobile-nav-toggle` + `sgs/mobile-nav`. The renamed mockup has cart button + cart badge that the pattern doesn't model. Structural drift between mockup and pattern.

**Trigger:** Phase 8 live-deploy parity check. The cart element needs an SGS block or a core block addition to the pattern.

**Spec:** TRUTH-SPEC documents `.sgs-header__cart` + `.sgs-header__cart-badge` slots. There is no SGS cart block currently — likely a `sgs/cart-link` or similar to create.

**Effort:** ~20-30 min (extend the pattern + new block if needed).

### P-PH8-1 — Hero parity test file scaffold
**Status:** OPEN


**What:** Phase 6 Step 6 specified running `python -m pytest plugins/sgs-blocks/scripts/recogniser/tests/test_slot_filler.py::test_hero_filled_slots_match_baseline_count -v` as a sanity check. The test file doesn't exist yet — Phase 8 deliverable.

**Trigger:** Phase 8 starts. The test verifies that `/sgs-clone`'s slot-filler produces ≥50 attributes on the hero section matching `plugins/sgs-blocks/scripts/recogniser/tests/fixtures/hero-baseline.json` (50-attr baseline).

**Spec:** Test file location is the canonical path. Pytest collects from project root. Baseline fixture already exists at `fixtures/hero-baseline.json` (per Phase 6 plan entry-context list — verify before referencing).

**Effort:** ~30-45 min.

---

### P-11-M9 — REOPENED 2026-05-09 (false-claim ship, milestone never actually validated)
**Status:** OPEN


**Status as of 2026-05-09 (this session):** The M9 milestone was claimed shipped by the previous session but was NOT actually validated. The orchestrator extension code shipped (commit dcb185b). The 6521-file foundation committed. But the multi-section orchestrator NEVER RAN on the live site. The wp-sgs-developer subagent was given a brief that contained a fallback ("hero-only deploy is acceptable") and took it; only the M8 hero markup was redeployed to the homepage post. Operator never opened the live URL before claiming success. Live result: hero+footer only, debug WordPress nav, empty footer fields, hero not a clean clone of post 29. Lesson captured as `dont-delegate-the-test-of-unproven-work` (blub.db row 221). M9 must be redone fresh — see next session prompt.

**Critical reframe for the redo:** The end goal is the PIPELINE, not the homepage. The homepage being a perfect clone is the OUTCOME of a working pipeline. When discrepancies are found in the next session, the fix is to identify the failing pipeline component and fix it, then rerun — NEVER patch the artefact directly. Manual SQL edits to fix the WordPress nav menu, manual content fills for the footer, hand-edited block markup are all forbidden. If the pipeline cannot produce a clean clone, the pipeline is incomplete and that is what gets fixed.

**Captured:** 2026-05-09 (M7-M10 session close), reopened 2026-05-09

**Status update 2026-05-09 session:** M7 + M8 COMPLETE.
- M7: 6 sibling skills shipped via /lifecycle Mode A, all >=B grade. Skill scoreboard at evaluation-history.json. Rubric files all carry `bean_signoff: confirmed_via_m7_brief_2026-05-08`.
- M8: minimal orchestrator at plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py. Hero smoke at 100% PoC parity (50/50 attrs match manual baseline). Visual-diff report at reports/visual-diff/hero-2026-05-09.md.
- M9: deferred to next session (this entry).
- M10: handoff + narrow commit (M7/M8 artefacts only) shipped this session. Foundation commit blocked.

**What's left (M9 only):**
- Multi-section orchestrator extension to walk all 9 sections of Mama's homepage in one run (the current orchestrator is single-section)
- Live deploy OVERWRITING the sandybrown homepage (Bean instruction 2026-05-09 — deploy target is the live homepage post, not a sibling post). Snapshot existing `post_content` first for rollback. Post 29 stays preserved as manual hero PoC reference.
- Multi-frame Playwright capture at 0/200/500/1000/3000 ms across 375/768/1440 viewports
- mockup-parity-validator.js per section
- screenshot-diff-helper.js per Q1-Q4 delta flagged
- 13 remaining block visual-diff reports written to reports/visual-diff/<block>-<date>.md (button, container, data-display, icon, icon-block, icon-list, media, mega-menu, mobile-nav, notice-banner, post-grid, process-steps, trust-bar, whatsapp-cta)
- Pre-commit STOP GATE unblocks once all 14 visual-diff reports present (hero + 13 listed)
- 690-file foundation commit lands (currently uncommitted on main since 2026-05-08)
- Bucket-2 session unblocks for Tasks 10-12 dogfood loop

**Source docs (M9 only — M7+M8 complete):**
- `.claude/handoff.md` — most recent session digest
- `.claude/next-session-prompt.md` — full M9 task brief with skills/MCP/agents tables
- **Note:** `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` was deleted (Spec 12 retired). Successor is Spec 15 (`.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`) + Spec 16 (`.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`).

**Effort:** ~3 hours wall-time remaining (M9 main-thread + foundation commit).

**Resume trigger:** When Bean has a focused window for the M9 build session.

---

### P-9 — Bucket 2 new blocks + timeline rework
**Status:** OPEN

**Depends on:** P-11-M9 must ship first (pipeline stability prerequisite). If P-11-M9 is substantially delayed, demote this to DEFERRED.

**Captured:** 2026-05-07

**What:** Three new SGS blocks + one rework of an existing block:

| Item | Source | Effort |
|---|---|---|
| `sgs/empty-state` block | gap candidate `empty-state-float` from animation gap audit | 25-40 min |
| `sgs/toggle` block | gap candidate `toggle-slide` from animation gap audit | 40-60 min |
| `sgs/testimonial-slider` block | gap candidate `swipe-to-dismiss` from animation gap audit | 90-120 min |
| `sgs/timeline` rework | Bean 2026-05-07: "design / lack of variety / animations are pretty awful" | 60-120 min |

Total estimate: 3.5-5.5 hrs.

**Strategic dogfood opportunity:** if `/sgs-clone` is shipped + stable when this session runs, design the static layers as HTML/CSS mockups first, then run `/sgs-clone` on each as a real-world stress test. Manually layer the interactive concerns (slider gestures, toggle state) on top.

**Specialised next-session-prompt:** `.claude/next-session-prompt-bucket-2-blocks-and-timeline.md`.

**Resume trigger:** After P-11 ships.

---

## Framework + SGS surface (blocks / theme / specs / Header-Footer)

_21 entries._

**P-SGS-UPDATE-V2-COGNITIVE-COMPLEXITY-REFACTOR** — PARTIAL-RESOLVED 2026-05-24 (3 of ~9 functions shipped this session; 6 remain). SonarLint surfaced 9 functions in `plugins/sgs-blocks/scripts/sgs-update-v2.py` (2,400-line `/sgs-update` orchestrator) with Cognitive Complexity above the 15 allowed.
**Status:** PARTIAL


**Shipped 2026-05-24:**
- **Proposal A** — `stage_5_slot_synonym_auto_seed` cc 29 → ~10 (commit `4c5aaa5c`). 3 helpers: `_match_slot_to_block`, `_apply_high_confidence_match`, `_build_synonym_report`. Cross-model review (Sonnet + Haiku) APPROVE. Polish follow-up: contains-candidates slice moved from helper into coordinator for API consistency (commit `<polish>`).
- **Proposal B** — `stage_4_style_variation_sync` cc 85 → ~9 (commit `8127f880`). 4 helpers: `_write_token_row`, `_build_token_candidates` (promoted from nested), `_process_client_snapshot`, `_write_stage4_report`. Cross-model review found 2 real issues + 1 false-positive; all real issues fixed before commit (dead `_CUSTOM_KEY_BLACKLIST` deleted, `_write_stage4_report` docstring corrected). Haiku's "double-count" was a misdiagnosis — original DID increment `client_inserted` for conflict-inserted when `existing_prefixed is None`.
- **Proposal C** — `_mode_b_refresh_upstream` cc 142 → ~28 (commit `c0fb9639`). 4 source-helpers: `_scrape_source_1_gutenberg`, `_scrape_source_2_hooks`, `_scrape_source_3_wpcli`, `_scrape_source_4_since`. Sources 5-10 kept as the existing shared loop. `new_rows` mutated by reference, per-source commit cadence preserved. Live-network smoke test confirmed Stage 2 return dict byte-identical to baseline. Cross-model review APPROVE. Polish follow-up: `base64` import promoted to module level (commit `<polish>`).

**Remaining for follow-on session:**
- 6 cc warnings not yet investigated. SonarLint line numbers drifted after 3 refactors + polish; re-locate by function name. Approximate function names from the latest sonarlint scan: `stage_1_sgs_codebase_scan` (~cc 73), an early helper near line 571 (~cc 96), `stage_3_wpcli_handbook_refresh` (~cc 27), `stage_7_*` / `stage_8_*` (each ~cc 18), and one more. Run `python plugins/sgs-blocks/scripts/sgs-update-v2.py --dry-run` then re-read the IDE diagnostics for current line numbers.

**Implementation discipline (binding, validated this session):** (1) /subagent-driven-development one proposal at a time per Bean 2026-05-24 — no parallel dispatch on the same file (blub.db row 240 + 254). (2) Each refactor commit gated by 2-rater cross-model review minimum (Sonnet + Haiku via Agent tool). (3) Each refactor's commit-gate: predicted post-fix Stage-N return dict matches baseline dict; report-file body byte-equal (timestamp line excluded); for Mode B `--refresh-upstream --dry-run` source-success / source-fail counts identical pre/post. Do not commit on divergence. (4) Fix ALL issues even non-blocking before commit per Bean 2026-05-24. (5) Implementer must re-locate functions by name (line numbers drift after each commit).

**Trigger to action (remaining 6):** dedicated session after current doc-op programme closes. Open with `python plugins/sgs-blocks/scripts/sgs-update-v2.py --dry-run` + re-read IDE diagnostics to get current line numbers, then dispatch parallel-agents-then-/qc-inline per the 2026-05-24 pattern. Apply same `/subagent-driven-development` discipline — one function at a time, full commit gate before next.



**P-HEADER-FOOTER-SITE-SUFFIX-NAMING-CONVENTION** — NEW 2026-05-24 (clone pipeline convention). Headers + footers produced from drafts by the clone pipeline MUST be saved as `sgs/header-<client-slug>` / `sgs/footer-<client-slug>` (e.g. `sgs/header-mamas-munches`, `sgs/footer-mamas-munches`, `sgs/footer-indus-foods`). Bare `sgs/header` / `sgs/footer` are framework defaults, never site-specific. **Existing misnamed patterns:** `sgs/mamas-munches-header` + `sgs/mamas-munches-footer` use the inverted order (`<client>-<role>` instead of `<role>-<client>`). Phase 2 header/footer cloner should: (a) author headers/footers under the canonical convention, (b) rename the misnamed mamas-munches pair, (c) add a `/sgs-update` Stage 9 drift rule that fails when a `sgs/header-*` / `sgs/footer-*` pattern doesn't follow the canonical order. Spec 17 §S6 enforces this convention for framework defaults already; this entry extends it to client-derived patterns.
**Status:** OPEN



### P-S17-B — Pattern versioning on `wp_template_part` records (~2 hrs)
**Status:** OPEN


**What:** Pipeline cannot detect "what version of this pattern is currently live vs the version I'm about to write." Re-clone idempotence (FR-S7-4) protects against overwriting OPERATOR edits, but doesn't help when the pipeline regenerates the same pattern with intentional updates.

**Fix shape:** Add `_sgs_pattern_version` post meta alongside `_sgs_cloned_from_pattern_slug`. Pipeline compares version on re-run; if newer, overwrite; if same, skip.

**Trigger:** After v1 ships and the first pipeline regeneration scenario surfaces (likely when an SGS client requests a refresh).

**Source:** Spec 17 council, Seat 4 Round 2.

### P-S17-C — Complex nested-component patterns (~4-6 hrs)
**Status:** OPEN


**What:** v1 assumes one pattern per page section (header, footer, hero, etc.). Real mockups have 5+ levels of container > row > column > component nesting. The current 1:1 mapping breaks for designs with composite layouts.

**Fix shape:** Pattern composition registry — patterns can reference other patterns. Spec the depth limit, recursion guard, and inserter UX.

**Trigger:** When a client mockup contains a nesting structure the v1 mapping cannot represent.

**Source:** Spec 17 council, Seat 4 Round 2.

### P-S17-D — Live preview on variation picker (~3-4 hrs)
**Status:** OPEN


**What:** FR-S5-2's variation picker is a dropdown + Activate button. Operator can't see what the variation will do until they activate. The Site Editor's Styles panel has live preview; the SGS picker does not.

**Fix shape:** Either (a) replicate Site Editor's preview mechanism via iframe, OR (b) replace the dedicated picker with a deep-link into the Site Editor Styles panel. Option (b) is the v1.1 default — option (a) is a v2 idea.

**Trigger:** First operator complaint or usability test that flags the missing preview.

**Source:** Spec 17 council, Seat 2 walkthrough #2.

### P-S17-E — Public browseable pattern library marketing page (~1-2 days)
**Status:** DEFERRED

**Trigger:** When SGS has 20+ client-facing patterns OR a sales lead explicitly asks "what do my header options look like?"

**What:** Frost (the block theme) hosts `frostwp.com/patterns` — a public page listing every header/footer/section pattern with screenshots. Useful for sales conversations: agency can show a prospective client "here are 12 header shapes that work with this framework" before they commit.

**Fix shape:** Static page generated from the pattern registry (auto-screenshot via Playwright or hand-curated). Hosted on smallgiantsstudio.co.uk or a subdomain.

**Source:** Research brief idea #7.

### P-S17-F — Deeper PII export safety beyond GDPR exporter (~2-3 hrs)
**Status:** OPEN


**What:** v1 ships the basic `wp_privacy_personal_data_exporters` integration in FR-S4-1. The council surfaced a richer concern: per-key sensitivity flags, export-policy controls (e.g. "VAT number always excluded from any export channel"), and audit logging of who exported what.

**Fix shape:** Extend Site Info schema with a `sensitivity` flag per well-known key (`public` | `business-internal` | `restricted`). Export channels respect the flag.

**Trigger:** When SGS hosts a client with regulated data (medical, legal, financial) OR a GDPR audit requirement surfaces.

**Source:** Spec 17 council, Seat 3 Round 2.

### P-S17-G — Down-migrations + rollback in the migration framework (~4-6 hrs)
**Status:** DEFERRED

**Trigger:** Before the first data-destructive migration is added. Build rollback capability then, not speculatively now.

**What:** FR-S7-2's migration framework is one-way. If a future migration breaks something and the framework is rolled back, attribute data may be in an unrecoverable state. Top WP plugins (WooCommerce, Yoast) ship down-migration support.

**Fix shape:** Each migration callable in `plugins/sgs-blocks/includes/migrations/{version}.php` gains an optional `down()` method. CLI gets `wp sgs migrations rollback --to=<version>`.

**Source:** Spec 17 council, Seat 3 Round 1.


---


### P-17 — Shared universal icon picker component (framework-wide upgrade)
**Status:** OPEN


**Captured:** 2026-05-08 (during sgs/icon-list expansion review)

**What:** Every SGS block that exposes an icon picker control hardcodes its own ~8-item dropdown. Meanwhile the framework actually supports a much richer icon universe: **Lucide (1,963 SVG icons)** + **emojis treated as icons** (uimax `icon_libraries` has 12 emoji families flagged `is_emoji=1` with full Rosetta Stone equivalents) + any **other icon sets installed** (Heroicons, Phosphor, Tabler, Font Awesome — registerable via a future `sgs_register_icon_set` hook). Operators editing `sgs/icon-list`, `sgs/icon`, `sgs/icon-block`, `sgs/info-box`, `sgs/process-steps`, `sgs/multi-button`, `sgs/whatsapp-cta`, `sgs/notice-banner`, `sgs/trust-bar`, etc. all see different tiny dropdowns and never reach any of the broader universe.

**Why this matters strategically:** every clone we do that uses an icon-rich design (services pages, feature grids, process steps, food/restaurant menus) currently risks the operator picking "the closest of 8" instead of "the right icon out of thousands". Recogniser quality also suffers — it can't propose accurate icon mappings if the editor can't render them. Branded emoji-as-marker is a real client request (food sites, lifestyle brands, kids/education sites) that SGS structurally supports today but no operator can actually reach via the UI.

**Spec — universal `<IconPicker>` component (NOT lucide-specific):**

1. **New shared component:** `plugins/sgs-blocks/src/components/IconPicker.js`
   - **Source-agnostic interface** — accepts a `value` shaped as `{ source: 'lucide' | 'emoji' | 'heroicons' | '<custom>', value: '<icon-id-or-glyph>' }` and emits the same shape via `onChange`
   - **Source switcher tabs** at top: Lucide / Emoji / [other registered sets] / Recent / Favourites
   - **Search field** (debounced ~150ms) — searches across the active source by name + tag list. Cross-source search optional (toggle: "Search all sources").
   - **Virtual-scrolling grid** (`react-window` or equivalent) — only renders visible cells. Critical for Lucide (1,963 icons) and the emoji set (~3,500 standard Unicode emojis).
   - **Category sidebar per source:**
     - Lucide: commerce / food / transport / nature / interface / arrows / weather / health / etc.
     - Emoji: smileys / animals / food / activities / travel / objects / symbols / flags
     - Other sets: whatever taxonomy the set declares
   - **Favourites** — pinned icons saved per-site in `wp_options` (max 36, mixed sources).
   - **Recently used** — last 16 used in this editor session (sessionStorage).
   - **Selected preview** at the top with the source label so operator knows what's picked.
   - **Keyboard navigation** (arrow keys + Enter) and 44×44 touch targets per WCAG.

2. **Icon-set registry** (PHP + JS):
   - PHP-side: `sgs_register_icon_set( $args )` — params: `slug`, `label`, `icons` (array of `{id, name, tags, category, svg_or_glyph}`), `kind` (`'svg'` / `'emoji'` / `'font-icon'`)
   - JS-side: `wp.hooks.applyFilters('sgs.icon-picker.sources', defaultSources)` — third-party plugins can extend
   - Built-in registrations:
     - `lucide` (kind=svg) — sourced from existing `includes/lucide-icons.php` (regenerated with tag/category metadata if missing)
     - `emoji-keycap`, `emoji-people`, `emoji-food`, etc. (12 families, kind=emoji) — sourced from uimax `icon_libraries WHERE is_emoji=1`
     - Future: heroicons / phosphor / tabler — opt-in installs

3. **Render-side handling** — the `value` shape carries `source` so the renderer knows whether to:
   - For `source: 'lucide'` → output inline SVG via `sgs_get_lucide_icon()` (existing path)
   - For `source: 'emoji'` → output the glyph directly (needs `aria-label` from the icon's name for screen readers)
   - For `source: '<custom>'` → look up the registered renderer for that set
   
   Render helper: new `sgs_render_icon( $value )` in `includes/render-helpers.php` that switches on source and returns the right HTML.

4. **Migration path** — every block currently exposing an icon-picker control:
   - `sgs/icon-list` (single icon + per-item icon + pattern entries)
   - `sgs/icon`
   - `sgs/icon-block`
   - `sgs/info-box`
   - `sgs/process-steps`
   - `sgs/multi-button` (icon-before-label / icon-after-label)
   - `sgs/whatsapp-cta` (icon override)
   - `sgs/notice-banner` (state icon)
   - `sgs/trust-bar` (per-item icon)
   - `sgs/social-icons` (already partially solves this for social platforms — keep as-is OR fold in)
   - any block that hardcodes its own icon dropdown
   
   Replace each block's bespoke dropdown with `<IconPicker value={...} onChange={...} />`. **Schema change:** existing string-typed icon attributes (e.g. `icon: 'check'`) need migration to the object shape (`{ source: 'lucide', value: 'check' }`). Each migration carries a deprecation that maps old string values to the lucide source. ~15-20 min per block including build verification + deprecation.

5. **Lucide registry expansion** — `includes/lucide-icons.php` is auto-generated. If the current file doesn't carry tag/category metadata, regenerate with metadata included. Confirm the generator script during work.

6. **Emoji registry** — already in uimax. Build a one-time importer that pulls `uimax.icon_libraries WHERE is_emoji=1` plus the standard Unicode emoji set into a JSON manifest at `includes/emoji-icons.json` for the picker to consume offline.

7. **Performance budget** — virtual-scrolling means only rendered cells eat DOM. The full Lucide SVG payload should NOT be loaded on editor mount; lazy-fetch chunks (e.g. by category) on demand. Emoji glyphs are essentially free (single Unicode characters). Render `<svg>` inline only for visible Lucide cells (~20-40 × ~1KB each = ~30KB DOM at any time).

**Effort:** ~3-4 hrs for the shared component + source-registry + emoji import + Lucide metadata regen. ~15-20 minutes per migrated block × ~10 blocks = ~3-4 hrs migration including deprecations. Total **~6-8 hrs realistic** (revised up from initial 4-6 estimate to reflect the broader scope).

**Resume trigger:** standalone session (not a blocker for any active path). Could run before bucket-2 (so the 3 new bucket-2 blocks land using IconPicker from day one) or after bucket-2 (so existing blocks get the upgrade once and bucket-2 ships without it).

**Why this slipped:** original sgs/icon-list spec asked for 8 icons; nobody widened the universe since. Caught 2026-05-08 when the icon-list expansion subagent reported "Editor icon library limited to 8 editor presets" as a known limitation. Bean immediately surfaced the broader missing-functionality (emoji-as-icons + other registered sets) — captured fully here in this revised entry.

---

### P-19 — Broader saved-defaults system audit + WP-native migration
**Status:** OPEN


**Captured:** 2026-05-08 (during icon-list 3-mode design review)

**What:** SGS has a saved-defaults system (`includes/class-block-defaults.php` + `withSaveAsDefault` HOC + the 2026-05-08 unified slot-aware routes added by Fixes-1+2) that lets operators save block-attribute snapshots as site-wide defaults. Bean's insight 2026-05-08: this DUPLICATES WordPress's native Site Editor → Styles → Blocks panel (`wp_global_styles` overlay on theme.json) for visual styling, and the use cases the SGS system covered are mostly handled better by WP-native mechanisms.

The icon-list refactor (2026-05-08) removes saved-defaults usage from icon-list specifically and replaces it with a sessionStorage `useLastUsedAttributes` hook + 5 block patterns. The broader system stays in place because OTHER blocks may still use `withSaveAsDefault` — auditing + migrating each is out of scope for the icon-list refactor.

**Spec:**

1. **Audit (~30 min):**
   - Grep `plugins/sgs-blocks/src/blocks/` for `withSaveAsDefault` usage — list every consumer
   - Grep for `<BlockDefaultsPanel>` direct usage — should be 0 after icon-list refactor
   - For each consumer, classify what's being saved:
     - **Visual only** (colour, typography, spacing, border) → migrate to native WP Site Editor → Styles → Blocks panel; delete saved-defaults usage
     - **Structural** (mode, type, behaviour switches) → replace with `useLastUsedAttributes` sessionStorage hook + canonical block patterns
     - **Mixed** → split: visual goes native, structural goes sessionStorage + patterns

2. **Per-block migration (~10-20 min each):** remove HOC wrap; for visual no further action; for structural, import `useLastUsedAttributes` + register 3-5 patterns; add deprecation if attribute schema changed.

3. **Once all consumers migrated:**
   - Delete `withSaveAsDefault` HOC from `extensions/block-defaults.js`
   - Delete `<BlockDefaultsPanel>` shared component
   - Delete the slot-aware REST routes (`/block-defaults/{block}?slot=...`)
   - Delete the legacy single-slot routes (`/defaults` body-param + `/defaults/{block}` orphan)
   - Drop `class-block-defaults.php` entirely (or keep as a stub for one release cycle if read-time fallback needed)

4. **Documentation:** update CLAUDE.md to capture the model — visual styling = WP Global Styles, structural starting-state = block patterns, per-operator memory = sessionStorage, per-instance customisation = inspector. Project-wide design principle so new blocks don't reintroduce parallel saved-defaults infrastructure.

**Effort:** Audit ~30 min. Per-block migration ~10-20 min × N consumers. Cleanup ~30 min. Total likely 3-6 hours depending on N.

**Resume trigger:** framework polish pass; not blocking any active work; could fold into bucket-2 or its own session.

**Why this matters:** every parallel system the framework maintains is ongoing maintenance cost. WordPress Global Styles is well-understood by operators (it's where they already go) and well-maintained by core. Centralising on it reduces SGS surface area and makes the framework feel native to WordPress rather than "yet another plugin with its own conventions."

---

---


### P-S16-1: sgs/label `source: "html"` selector breadth
**Status:** OPEN

Source binding selector on text attr is `.wp-block-sgs-label` (the root). If save.js is ever modified to wrap content in a child element, round-trip break. Revisit when adding sgs/heading composite block (Phase 2) — same RichText shape, same potential trap.
Source: Sonnet QC 2026-05-14

### P-S16-2: `attr(data-X)` CSS responsive font-size pattern is systemic
**Status:** OPEN

Used in sgs/label + sgs/hero + sgs/info-box. Near-zero browser support for `attr()` outside `content:`. Switch all three to inline CSS custom properties at save time in a future cleanup pass.
Source: Sonnet QC 2026-05-14

### P-S16-3: variantStyle enum hardcoded in converter
**Status:** OPEN

`["standard","trial","gift"]` hardcoded in convert.py:lift_subtree_into_block_attrs. Move to live DB read via block_attributes.enum_values.
**Trigger:** Spec 16 Phase 3 wave (next converter iteration touching lift_subtree).

### P-S16-4: Pre-emit JSON serialisation validation
**Status:** OPEN

Source text with newlines / unescaped quotes / control chars could break the JSON serialisation in block markup. Currently no pre-emit validator.
**Trigger:** Spec 16 Phase 3 wave (same converter pass as P-S16-3). Batch these together.
Source: Gemini Flash QC 2026-05-14

### P-S16-5: Nested block-roots edge case (block inside block)
**Status:** OPEN

sgs-product-card inside sgs-featured-product would trigger lift_subtree on the outer block but its descendant walk would consume the inner block's slots into outer attrs. Add recursion guard.
**Trigger:** Spec 16 Phase 3 wave OR when a real client mockup hits this nested pattern (check leftover-buckets first).
Source: Sonnet QC architectural review 2026-05-14

### P-S16-6: Indus Foods + helping-doctors converter validation
**Status:** OPEN

Spec 16 §9 item 7 (closure criterion): run converter on second client without code changes. Indus Foods and helping-doctors mockups exist but haven't been tested yet.
**Trigger:** After Mama's pipeline reaches ≤1% per-section pixel-diff across 375/768/1440 (Phase 1 G1-G5 structural gaps closed). Estimated ~30 min once stable. "Mama's Phase 4" in older entry text = current Phase 1 structural recovery work.

### P-S17-W2-ADMIN-SPLIT: Split class-sgs-site-info-admin.php (502 lines → ~250 + ~80 + existing fields companion)
**Status:** OPEN

Wave 2 Task 1 + Fix Bundle A1 grew the file from 377 → 502 lines while shipping 4 QC fixes (W1 show_in_rest, W2 social-labels i18n, W3 repeater JS, U3 deprecated-blocks notice). 502 lines is 67% over the 300-line PHP cap from `plugins/sgs-blocks/CLAUDE.md`. Subagent justified the overflow as tight coupling to admin lifecycle constants.

Proposed split: extract `maybe_show_deprecated_blocks_notice()` + `handle_dismiss_floating_ui_notice()` + the 2 dismiss-related constants + the admin-post hook wire into a new `class-sgs-site-info-admin-notices.php` (~80 lines). Main class drops to ~420 lines — still over but defensibly closer.

Trigger: next time anything else gets added to `class-sgs-site-info-admin.php` (new section, new field type, new admin action) OR when Wave 3 starts. Until then, the file works fine; the cap is a maintainability target, not a runtime constraint.
Source: 4-rater /qc panel 2026-05-19 (R3 architecture, A1 + A2 findings; subagent justified inline).


### P-S17-FONT-COLLECTION-NOTICE: WP_Font_Collection sanitize_and_validate_data fires _doing_it_wrong on every WP-CLI invocation
**Status:** OPEN

**Captured 2026-05-20.** `wp_register_font_collection('sgs-google-fonts', [..., 'src' => '<URL>'])` triggers `WP_Font_Collection::sanitize_and_validate_data` with the registration metadata (which has no `font_families` — those live in the JSON at `src`, intended to lazy-load). WP 6.5+ validator complains "missing or empty property: font_families".

**Impact:** WP_DEBUG_DISPLAY is already `false` on staging so the notice is NOT user-visible in admin or frontend. Only appears in WP-CLI output (which respects different display rules). Functionally harmless — fonts work in the editor when the JSON URL is fetched.

**Options when un-parking:**
1. Register with `font_families` inline (load 2.5MB JSON via file_get_contents into a transient on first access) — heavy on cold cache
2. Move registration from `init` to `current_screen` / `enqueue_block_editor_assets` so it only fires in editor context — clean
3. Wait for WP core to fix the eager-validation regression — uncontrolled

**Recommendation:** Option 2 next time we touch this file. Hook is currently `init` — switching to a hook fired only in the block-editor admin path silences CLI noise and avoids loading 1923 entries on every request.

Touch point: `plugins/sgs-blocks/includes/class-font-collection.php`.
Source: Session 2026-05-20 sandybrown smoke test (Spec 17 live verification).

### P-S18-TRANSPARENT-PATTERN-IS-STUB: framework-header-transparent currently delegates 100% to default pattern
**Status:** OPEN

**Captured 2026-05-20.** `theme/sgs-theme/patterns/framework-header-transparent.php` is `<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->` with an inline future-work note: "v1.1: variant-specific markup + transparent-over-hero behaviour."

**Impact:** the conditional-rule engine cannot be verified end-to-end at the rendered-output layer for the transparent variant — both default and transparent rules produce byte-identical HTML. Resolver verification works in isolation (`Sgs_Header_Rules::evaluate()` returns 13151 bytes correctly), but the visible-distinction acceptance criterion from Spec 17 ("transparent header renders on homepage when rule fires") is untestable.

**To un-park:** implement the transparent overlay variant per Spec 18 v1.1:
- Sticky positioning with translucent background (likely `position: absolute; top: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(...)`)
- A distinguishing wrapper class so visual diff tests can verify which variant fired
- Once shipped, re-run the acceptance check by adding a rule with `is_front_page` condition and curling `/` to see the transparent classes appear.

**Sibling patterns to audit at same time:** `sgs/framework-header-shrink`, `sgs/framework-header-sticky`, `sgs/framework-header-centred`, `sgs/framework-header-minimal` — check whether they're real variants or stubs delegating to default too.

Source: Session 2026-05-20 sandybrown smoke test (Task 1 acceptance criterion 4).

### P-TIMELINE-ADVANCED-VISUAL-EFFECTS: sgs/timeline needs textured / themed line + progressive-fill effects
**Status:** DEFERRED
**Trigger:** MIC (Muslims in Construction) client requests the bricks timeline effect, OR any other client specifically requests a textured timeline. Do not build speculatively.

**Captured 2026-05-20.** Bean's directive (originally requested before Phase 2A, re-flagged at session end): the sgs/timeline block shipped in Phase 2A Branch D supports orientation (vertical default / horizontal), alignment, scroll-reveal via IntersectionObserver, and prefers-reduced-motion honour. But the LINE itself + per-entry backgrounds need advanced visual treatment Bean specifically asked for:

**Required effects on the timeline LINE:**
1. **Pulsing** — animated stroke or filter pulse on `.sgs-timeline__connector`
2. **Texture / theme** — operator-selectable connector style beyond `line / dashed / dotted`:
   - Vine (organic curved + leaves at intervals via SVG pattern or background-image)
   - Tree (trunk + branches at each entry node)
   - Connected bricks falling into place 1-by-1 as scroll progresses (MIC — Muslims in Construction client primary use case)
   - General colour / gradient fill that progresses with scroll position
3. **Per-entry background fill** — as user scrolls past each entry node, that entry's `.sgs-timeline__content` background fills with a colour or gradient. Operator chooses the source colour / gradient per entry OR globally per timeline.

**Implementation sketch (for the future session):**
- Add `connectorTexture` attribute (enum: 'plain' | 'pulse' | 'vine' | 'tree' | 'bricks' | 'gradient-fill') — extends existing connectorStyle
- Add `connectorFillSource` (string: token slug for colour OR gradient slug)
- Add `entryFillOnReveal` (boolean) — toggle per-entry background fill on reveal
- Add `entryFillSource` (string: token slug or per-entry override)
- view.js extends: in addition to .is-revealed toggle, track scroll position relative to each connector segment and animate fill-percentage via CSS custom property `--sgs-timeline-fill-progress` updated on rAF
- SVG-based connector renders: replace solid `<div class="sgs-timeline__connector">` with `<svg>` per connector segment when texture != plain, allowing pattern fills + path animation
- Bricks variant: each entry segment is a series of small block elements stagger-animated with transform translateY → 0 + opacity 0 → 1 on reveal

**Client driving the request:** MIC (Muslims in Construction) — wants the timeline-of-bricks visual for their journey/process page.

**Acceptance when this lands:**
- Each connector texture rendered correctly at 375 / 768 / 1440 viewports
- `prefers-reduced-motion` disables texture animation, falls back to plain solid line
- Per-entry background fill animates only on scroll progression past entry node
- Bricks variant renders distinct brick units (not a single texture)
- WCAG: animations honour reduced-motion; decorative SVG textures have `aria-hidden="true"`

**Also update blocks spec:** `.claude/specs/02-SGS-BLOCKS.md` needs an sgs/timeline section that documents these expanded effects as the canonical scope (currently only sgs/process-steps is documented as "horizontal timeline").

Source: Bean's 2026-05-20 directive — captured at end of Phase 2A massive session before cloning-pipeline resumption.

---

### P-WP70-REGISTER-BLOCK-VARIATION-MISSING — polyfill load-bearing forever

**Status:** BLOCKED
**Why:** `register_block_variation()` does NOT exist as a top-level PHP function in WP 7.0. Session A's commit `cc541e94` migrated all 13 SGS variation files to the `get_block_type_variations` filter. That polyfill is load-bearing and must not be removed by a future "WP 7.0 cleanup" refactor.
**Acceptance when this lands:**
- Watch WP 7.1+ release notes for a `register_block_variation()` top-level function. If/when introduced, the migration filter can be retired.

## Skills, agents, pipelines (lifecycle + QC + meta-tooling)

_4 entries._

**P-BATCH-GA-14-SKILLS** — Run `/batch-gap-analysis` (full `/gap-analysis` protocol per target, sequential, in main conversation per blub.db row 176) on the 14 WP/SGS skills revised during Phase 7. Targets: the 10 original WP-family skills (`wp-block-development`, `wp-block-themes`, `wp-interactivity-api`, `wp-plugin-development`, `wp-rest-api`, `wp-wpcli-and-ops`, `wp-performance`, `wp-abilities-api`, `wp-site-extraction`, `wp-project-triage`) plus `sgs-wp-engine`, `wordpress-router`, `sgs-extraction`, `sgs-clone`. **Estimated:** ~3 hours dedicated session.
**Status:** OPEN
**Trigger:** After P-11-M9 ships AND G1-G5 structural gaps close (skills reference those pipeline components — grading against stale code is pointless). Do NOT run before both those milestones land.


**P-SUBAGENT-DRIVEN-DEV-SKILLSCORE-DEBT** — NEW 2026-05-23. `~/.agents/skills/subagent-driven-development/SKILL.md` scores 84% (below 90% threshold). Pre-existing issues surfaced when the line-319 xref fix triggered the skillscore hook: (a) no numbered process stages found, (b) skill doesn't declare which skills it invokes, (c) no hooks/ directory, (d) no scripts/ directory, (e) body 317 lines (over 300 working budget — needs progressive disclosure). Cleanup routes through /lifecycle per project CLAUDE.md. **Trigger:** Task 6 skill-optimiser session (mode 2 = gap analysis + research) is the natural home — bundle with /batch-gap-analysis pass on 14 WP/SGS skills.
**Status:** OPEN


**P-QC-COUNCIL-PHASE-B-BACKPORTS** — qc-trio gap-analysis identified 5 backports from /qc-council into /qc + /qc-inline. Phase A shipped this session via Sonnet subagent — branch `feat/qc-skills-backport-from-qc-council` commit `e340cde` in `~/.agents/skills/`. Phase B = optional follow-ups for hard-iteration-cap + persona-disagreement-carry-forward + rationalisation-table integration. Lower priority since the trio is already at 92-94% skillscore. **Trigger:** next skill-optimisation session.
**Status:** OPEN



### P-OPS-1 — Skill-type classifier in sgs-skillscore v3
**Status:** OPEN


**What:** 24 of 45 Phase 4 surfaces sit below 90% on skillscore because the validator grades commands, agents, mini-skills, and discipline references against full-skill criteria. A `--type` flag or auto-detection (command files in `~/.claude/commands/`, agent files in `~/.claude/agents/`, mini-skills via `user-invocable: false` frontmatter) would lift these scores out of rubric-mismatch baseline.

**Trigger:** Bean explicitly opens scope for a skillscore upgrade, or a pattern emerges where rubric-mismatch is masking a real regression. Not urgent.

**Spec:** Add `type` field detection to `sgs-skillscore.py validate`. Type tiers: full-skill (current rubric), command (CLI shortcut — relaxed), agent (identity file — different criteria), mini-skill (sub-skill routed via parent — minimal rubric), reference (discipline doc — minimal rubric).

**Effort:** ~60-90 min (rubric design + implementation + re-grade all 45 Phase 4 surfaces as regression check).

## Infrastructure (hooks, deploy, hosting, third-party integrations)

_3 entries._

**P-PHASE-5B-THEMEJSON-CONSUMPTION-PURITY** — NEW 2026-05-23 (architectural cleanup). The Customiser :root CSS custom property emission ships at `class-sgs-header-renderer.php:73-78` + `class-sgs-footer-renderer.php:68`. Current paint via inline `<style id="sgs-header-customiser">` is functionally correct but architecturally less pure than consuming via theme.json `styles.color.background = var(--sgs-header-bg)`. **Trigger:** WP-7-architecture-polish session, low priority. NOT blocking on any client work.
**Status:** OPEN


### P-4 — Trustpilot 4-review scrape (Mama's Munches)

**Status:** OPEN

**Trigger:** ~15-20 min task via Playwright MCP. Pick it up mid-clone session when the testimonials section is reached top-down.

**What:** Capture the 4 real reviews from `https://uk.trustpilot.com/review/mamasmunches.com` — quote, first name, star rating, date — into `sites/mamas-munches/research/trustpilot-reviews.json`. Then either render as static `sgs/testimonial` cards (matching mockup design) and add the free Trustpilot Mini widget for live star count, or skip and use the placeholder testimonials already in `reports/mamas-munches-page-content.html`.

**Method:** Use the inline Playwright MCP browser (already authenticated, no anti-bot has blocked us mid-session). If still blocked, fall back to manual paste from a logged-in browser tab.

**Effort:** 15-20 min once Playwright reaches the page.

---

### P-6-LUCIDE-REST-ENTRY-POINT — research WP 7.0 icon-collection registration API

**Status:** BLOCKED
**Why:** `class-sgs-lucide-icons-rest.php` checks `function_exists('wp_register_icon_collection')` — that function doesn't exist in WP 7.0 even though `WP_REST_Icons_Controller` class does. The registration entry point is somewhere else — likely a class method on `WP_REST_Icons_Controller` (candidate: `register_collection()`).
**Acceptance when this lands:**
- Correct registration API name identified from WP 7.0 source (`wp-includes/rest-api/endpoints/class-wp-rest-icons-controller.php`)
- `class-sgs-lucide-icons-rest.php` updated to actually register the SGS Lucide collection
- Playwright confirms editor icon picker loads from native REST endpoint
- `sgs_get_lucide_icon()` shim can then be retired (separate follow-up commit)

## Cross-platform emit pathway (M9+ — deferred until production-stable)

_3 entries._

### P-CP-1 — `/sgs-emit` (cross-platform component emitter)
**Status:** DEFERRED
**Trigger:** M9 production-stable + ≥3 successful clones banked. Do not start before then.


**What it does:** Read a `/sgs-clone` result (composition + filled slots + recognised SGS blocks) and emit equivalent component code for non-WP platforms. Targets in priority order: React (web SPA), React Native (mobile), Flutter (mobile), SwiftUI (iOS native), Web Components (framework-agnostic). Emit pathway uses `role-templates.json` direction:generate entries plus uimax `equivalent_implementations` payloads to map SGS blocks to platform-idiomatic components.

**Trigger:** Vague — client request for non-WP platform. Specific named use cases as recognition aids: Bean & Tub mobile app (RN); Indus Foods mobile reskin (RN or Flutter); any SGS Studio v2 mobile component. Soak ~3 months after M9 production-stable.

**Effort estimate:** ~8-12 hours initial scaffold + ~4-6 hours per platform target for first smoke test.

**Source materials:**
- uimax `stack_*` tables (Angular, Astro, Flutter, HTML/Tailwind, Jetpack Compose, Laravel, Next.js, Nuxt, React, React Native, shadcn, Svelte, SwiftUI, Three.js, Vue — 49–60 rows each)
- `role-templates.json` direction:generate entries (post-Phase 4)
- uimax `equivalent_implementations` payloads on every artefact (Rosetta Stone)
- Spec 13 (`.claude/specs/13-DRAFT-NAMING-CONVENTION.md`) — SGS-BEM is what makes cross-platform structural alignment feasible at all

**Dependencies:** M9 production-stable (so the clone pipeline is reliable before we extend it); ≥3 successful clones banked (test data); Phase 4 propagation complete (so `/sgs-clone` body honours Spec 13 lingua-franca rule).

### P-CP-2 — Style translation (theme.json → React/Flutter/SwiftUI styles)
**Status:** DEFERRED
**Trigger:** P-CP-1 in flight OR client request for style-only cross-platform port. Do not start before M9 production-stable.


**What it does:** Read `theme.json` palette + spacing + typography tokens (or uimax `design_tokens` table directly) and emit equivalent style objects for: React (CSS-in-JS objects, styled-components ThemeProvider props, Tailwind config), Flutter (`ThemeData` + per-component overrides), SwiftUI (custom modifier extensions on `View`), Web Components (CSS custom property block). Honours DTCG token format already in uimax.

**Trigger:** Vague — P-CP-1 in flight OR client request for style-only port (e.g. design system migration). Specific named: HelpingDoctors EHR app theme port from web to mobile.

**Effort estimate:** ~6-8 hours per target platform.

**Source materials:**
- uimax `design_tokens` table — 5,164 DTCG-format rows as of 2026-05-10
- Rosetta Stone payloads on token rows
- `theme.json` v3 (per-client style variations in `theme/sgs-theme/styles/`)

**Dependencies:** Not strictly required after P-CP-1 but synergistic — emit + translate ship together for full app-component parity. Deferred until M9 production-stable.

### P-CP-3 — Animation translation (uimax animations → React-spring / Flutter / SwiftUI)
**Status:** DEFERRED
**Trigger:** P-CP-1 + P-CP-2 in flight AND animation-rich app port requested. Do not start before M9 production-stable.


**What it does:** Translate CSS keyframe animations captured in uimax `animations` table to: React-spring config (`useSpring` calls + `config` objects), Flutter `AnimationController` + `Tween` setups, SwiftUI `.animation()` and `withAnimation { }` form. Reads via `equivalent_implementations` Rosetta Stone payloads on each animation row.

**Trigger:** Vague — P-CP-1 + P-CP-2 in flight, animation-rich app port requested. Specific named: Bean & Tub mobile splash/transitions; HelpingDoctors EHR loading states.

**Effort estimate:** ~4-6 hours per platform target.

**Source materials:**
- uimax `animations` table — 63 rows (post 2026-05-10 5-column migration: `is_gap_candidate`, `gap_reason`, `sgs_block`, `sgs_animation_attribute`, `equivalent_implementations`)
- Rosetta Stone payloads on animation rows

**Dependencies:** `animations` table needs ≥30 cross-platform-mapped rows (current 63 rows, but mapping coverage to verify before emit work begins). M9 will surface more animations via `/uimax-scrape-animation` runs. Cross-link to P-CP-1 and P-CP-2.

---

## Other (uncategorised — manual triage needed)

_2 entries._

### P-10 — `svg-morph` animation gap candidate (DEFERRED INDEFINITELY)
**Status:** DEFERRED


**Captured:** 2026-05-07

**Why deferred:** Requires GSAP MorphSVGPlugin — paid Club GSAP library. Misaligned with SGS open-source default.

**Resume trigger:** Only if a paid client specifically needs SVG morphing AND they're willing to fund Club GSAP licensing. Otherwise leave the uimax `animations` row flagged `is_gap_candidate=1` with a note pointing here.

**Alternative path:** Anime.js morphing helpers, custom SMIL fallbacks, hand-coded path interpolation. None match GSAP MorphSVG's polish but all are licence-free.

---

### P-2 — Phase 2.5 / G2.5 deferred work
**Status:** BLOCKED

**Blocker:** Waiting for Phase 2 G2 gate to close. The referenced `.claude/plans/phase-2-rubrics-universe.md` has been deleted — G2 gate status unverified. Verify current G2 status in `.claude/plans/` before opening this entry.

See G2.5 section in the Phase 2 plan. Triggered by Phase 2 G2 gate close + tooling spec finalisation.

- Track 2 optimiser passes (4 skills): /extract, /harden, /ethics-gate, /interactivity-capture
- Structural debt content fixes (3 agents): design-reviewer, seo-auditor, sgs-extraction
- seo-technical content fixes (3 A-grade rubric gaps + ai-crawler-management opportunity)
- 9 deletion-bound migration notes (Phase 4 design-brain DB schema dependency)

---

