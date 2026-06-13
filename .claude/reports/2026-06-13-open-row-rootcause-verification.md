---
doc_type: report
project: small-giants-wp
thread: cloning-pipeline
title: "OPEN clone-fix ledger rows — root-cause RE-VERIFICATION (ledger diagnoses are hypotheses; confirmed-or-corrected against ground truth)"
created: 2026-06-13
method: 7 parallel /dispatching-parallel-agents (sonnet), read-only, evidence-first (draft mockup CSS + 2026-06-12 live-DOM rebaseline + pipeline-state extract.json + render.php + Spec 22). NO fixes. Each confirmed or CORRECTED the ledger's diagnosed root cause.
status: ROOT CAUSES VERIFIED. Next = design fixes (shared-mechanism ones are Rule-7 design-gated).
---

# OPEN-row root-cause re-verification (2026-06-13)

Bean directive: verify whether each OPEN ledger row's ORIGINAL diagnosis is correct; if not, find the real cause. Result: **4 of 8 ledger diagnoses were WRONG or PARTIAL.** Static evidence was conclusive for most; 3 flagged a live-probe tiebreaker.

| Row | Ledger said | VERDICT | ACTUAL root cause (cited) | Layer | Fix direction | Live-probe? |
|-----|-------------|---------|---------------------------|-------|---------------|-------------|
| **H-C1** | per-area max-width not extracted | **CORRECT** | Draft `.sgs-hero__sub{max-width:420px}` @768 (LITERAL, not var). Hero HAS `subHeadlineMaxWidth` attr + render.php consumes it. Converter never emits it — `_route_area_css_to_block_attrs` EXCLUDES `max-width` (convert.py:2307). | impl-bug | Add a leaf-element `max-width`→owning-block per-area-attr mapping (mirror how `subHeadlineMarginBottom` already works). | no |
| **IN-B** | can't lift `var(--content-width)` to a number maxWidth | **WRONG** | Content-layer detection DOES fire; converter emits `contentWidth:"var(--content-width)"`. Bug 1: converter passes the raw `var()` string instead of resolving the CO-DECLARED literal (`--content-width:960px` on the same element). Bug 2 (separate): `.sgs-section-heading__intro{max-width:540px}` literal inner-element constraint not extracted (P3/F6a). | impl-bug (var not resolved) + spec-gap (inner-elem maxWidth) | Resolve a co-declared `var()` to its literal in the contentWidth lift; implement inner-element maxWidth extraction. | no |
| **FP-P** | F3 block-render default (CTA not full-width) | **PARTIAL** (right layer, wrong sub-cause) | Draft CTA is full-width via COLUMN-FLEX-PARENT STRETCH, not a `width:100%`. Converter emits no `widthType`→default `"fit"`→render `inline-flex`→182px. The full-width signal was never EXTRACTED (F8), not a hardcoded default overriding an extracted value. | F8 extraction-gap | Detect button-in-column-flex-container → emit `widthType:"full"`, OR a slot-default for CTA-role buttons in product-card bodies. | no |
| **IN-E** | card overrides section to left (suspect misdiagnosis) | **WRONG** (ledger note wrong; it IS a defect) | info-box has NO `text-align` rule → it INHERITS `center` from `.sgs-ingredients-section__inner{text-align:center}`. Correct value = CENTER. If converter emits `left`, the walk stops at the resolved-block boundary before reaching `__inner`'s center (container-wrapper-lift gap, FR-22-21). | impl-bug (F6a / container-wrapper lift) | Transfer `text-align:center` from `__inner` to the section container's block attr (not the leaf resolver). | **YES** (confirm live info-box renders center vs start) |
| **GF-B.2** | F6a center leak (draft has none) | **CORRECT** + ROOT CAUSE PINNED | `_collect_css_decls_for_element` matches the SCOPED selector `.sgs-social-proof .sgs-section-heading__sub{text-align:center}` as if it were single-class `.sgs-section-heading__sub` → social-proof center BLEEDS into the gift section. **⚠ Broad class: any ancestor-scoped compound selector can leak cross-section.** | impl-bug (CSS selector-scope matching) | Make `_collect_css_decls_for_element` respect ancestor-scoped compound selectors (only match when the ancestor is actually present). | no |
| **SP-C** | testimonial verticalAlign | **NOT-A-DEFECT — DROP** | Draft `.sgs-testimonial` sets no align-items/vertical-align/align-self; block has zero `%lign%` attrs. Rebaseline already flagged "no concrete expected value." | n/a | Drop the row from the ledger. | no |
| **SP-D.1** | star-size (re-scope) | **STILL-A-DEFECT** | Draft `.sgs-testimonial__stars{font-size:15px}`; stars now render as SVGs sized by `ratingSize` (default 16). Converter doesn't harvest the star font-size into `ratingSize`. | impl-bug (extraction mapping) | Converter harvests `.sgs-testimonial__stars` font-size:15px → `ratingSize:15` (an extraction map, NOT a CSS default; `ratingSize`=SVG width/height, css_property=NULL — confirmed D223). | YES (confirm current emit) |
| **SP-E** | F8 content-extraction | **STILL-A-DEFECT** (narrower) | Remaining gaps after D223: `quoteStyle:'italic'` + `nameFontWeight:'600'` (render default 700) not emitted. D223 closed quoteFontSize/colour/lineHeight. Overlaps the D223 deferred gaps. | impl-bug (extraction) | Extend testimonial harvest to emit `quoteStyle:italic` + `nameFontWeight:600`; confirm what D223 already closed. | YES |
| **BR-B** | media-sideload/404, NOT converter | **WRONG** | Converter emits `imageUrl` but NOT `imageId` — the media-map (`sandybrown-media-map.json`) HAS `id:24` for `Halimahs.jpeg`. Without `imageId`, render.php can't call `wp_get_attachment_image_src()` → no intrinsic width/height → 0×0 before load. Also `.sgs-brand__image{max-height:380px}` not lifted to `maxHeight`. | converter-emit-gap (+ maybe missing maxHeight lift) | Emit `imageId` from `_MEDIA_MAP[basename]['id']` in the `sgs/media` path (convert.py:2951); verify maxHeight CSS lift. | YES (confirm url 404s vs resolves) |
| **FP-E** | Spec-27 gated | **SHIPPED** (working) | card-grid `wc-product` mode shipped (D204); block.json + render.php route correctly. | n/a | — | — |
| **FP-H** | Spec-27 gated | **SHIPPED** | product-card built-in-element renderer shipped (D204). | n/a | transition bridge (`echo $content`) still active-temporary. | — |
| **FP-D** | (the real open Spec-27 item) | **DESIGN-CLOSE** | card-grid block resolution — needs a design-decision close now Spec 27 is built: confirm converter routes featured-product → `sgs/card-grid wc-product`, then flip DESIGN→VERIFIED. | design-decision | confirm emit + live render, record, flip ledger. | YES |

## Headlines
1. **Ledger diagnoses were wrong/partial on IN-B, FP-P, IN-E, BR-B** — building to those would have wasted waves. (Validates Bean's "verify root cause first" directive + R-22-7 "diagnoses are hypotheses".)
2. **GF-B.2 surfaced a BROAD bug:** `_collect_css_decls_for_element` doesn't respect ancestor-scoped compound selectors → cross-section CSS leaks. This likely explains other "leak" rows and is a high-value universal fix (Rule-7 — it's a shared CSS-matching mechanism).
3. **SP-C drops** (not a defect). **SP-D.1/SP-E** are precise testimonial extraction-mapping fixes (overlap the D223 deferred gaps).
4. **Spec 27/30 built → nothing gated:** FP-E/FP-H shipped; FP-D is a design-decision close, not a build.

## Shared-mechanism fixes (Rule-7 design-gate BEFORE build)
- GF-B.2 — CSS selector-scope matching in `_collect_css_decls_for_element` (affects ALL clones).
- IN-E — container-wrapper text-align transfer (FR-22-21, affects all section containers).
- IN-B Bug 1 — co-declared `var()` resolution in the contentWidth lift (affects all content-bands).
These three touch shared mechanisms → `/adversarial-council` or `/qc-council` on the approach before building. H-C1, FP-P, SP-D.1, SP-E, BR-B are more localised (per-block extraction maps).
