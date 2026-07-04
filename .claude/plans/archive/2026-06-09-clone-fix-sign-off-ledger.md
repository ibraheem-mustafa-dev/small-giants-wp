---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Clone-fix SIGN-OFF LEDGER — every issue → family → status → workstream"
created: 2026-06-09
status: Stage 0 baseline (CLONE-FIX-BUILD-PLAN.md). The authoritative close-out tracker. Re-baselined against git+canary per council C5. Update the Status column as each issue is verified fixed on the real homepage (R-22-11/R-22-13). Nothing is "done" until its row reads VERIFIED.
legend: "Family: F1 per-slot CSS routing · F1b array per-item · F2 font-family · F3 block-render default · F4 breakpoint · F5 block resolution/capability · F6a inheritance/ancestor · F7 double-emission · F8 content extraction · NEW framework/draft. Status: OPEN · SHIPPED (already fixed) · VERIFIED (fixed+live-confirmed)."
---

# Sign-off ledger

## Status summary (RE-BASELINED 2026-06-12 against live page-8 DOM)

**⚠ The "F1 padding routing" framing was a MISDIAGNOSIS.** Section padding renders correctly at every breakpoint (live-verified). Full re-baseline: [`../reports/2026-06-12-ledger-rebaseline-live-dom.md`](../reports/2026-06-12-ledger-rebaseline-live-dom.md). Captures: `pipeline-state/rebaseline-2026-06-12/live-capture-{1440,768,375}.json`.

- Total tracked: **55 issues**.
- **SHIPPED (pre-programme):** H-C2 (D192), FP-F (D191), FP-E/FP-H (D204), SP-G binding-half (D191).
- **VERIFIED (live-confirmed):** prior 8 (H-B + GF-B.1/B.3/B.4/D.1/G/H/I) **+ 12 newly-closed on the 2026-06-12 re-baseline** — H-A, H-A2, FP-A, FP-B, FP-C, FP-G, FP-J, FP-L1, BR-A, IN-A, GF-A, SP-D.2.
- **2026-06-12 P5/P7/P8 block-quality cluster CLOSED (commit 9275328c, live page-8 verified — 10 rows):** TB-A, TB-B (gap 12px + circle white), FP-N (price baseline), FP-O (cards equal), FP-I (image 220px), BR-C (ghost button via theme.json), SP-D.1 (star 15px), SP-E (quote italic/14px/text-muted + author 600), IN-D (emoji icons) → **VERIFIED**. SP-F → **VERIFIED (non-defect/false-positive)**. qc-council GO (2 cross-model raters); 21 conformance goldens re-baselined; regression sweep of VERIFIED sections clean. Mechanisms: universal grid-stretch (verticalAlign/alignItems for absent-align-items grids), maxHeight lift, named-colour bg lift, sgs/icon emoji handler, testimonial ratingSize/nameFontWeight attrs.
- **STILL-BROKEN (live-evidenced):** P1 margin (IN-B), P2 Fraunces (closed), P3 inner max-width (IN-B/H-C1), P6 text-align (IN-E/GF-B.2 — under re-verify). **1 from this cluster still open:** ~~IN-C~~ CLOSED 2026-06-12 (WS-A dual-key wrapper fallback, live-verified). ~~IN-F content~~ CLOSED 2026-06-13 (universal-lift DB-gated `scalarContentLift`, commit `1b03b8c7`, D222, live page 8 verified). BR-B = media-sideload NOT converter.
- **DESIGN/SPEC DECISION (not converter fidelity rows):** FP-D, FP-K, FP-DRAFT, TB-C, TB-C-draft, SP-A, SP-C, SP-G.
- **2026-06-12 text-CSS cluster CLOSED (commits 87cd3ba0 + 691298d7, live page-8 verified):** P1 margin (GF-C/GF-E + IN-B-margin), P2 Fraunces font (FP-M/GF-E/F) → VERIFIED. The lift was emit-correct but blocked by a 3-layer render chain (number-typed attr rejecting a unit-combined string; `esc_attr` mangling the font-family quotes; both fixed). Report: `reports/visual-diff/text-2026-06-12.md`. Lesson: `memory/feedback_converter_attr_lift_must_verify_full_render_chain`. **Still to re-probe with the same mechanism (likely-closed, not yet element-verified):** SP-B (social sub margin), the colour/text-align rows on directly-lifted text; **IN-B max-width + IN-E info-box inherited-centering are DIFFERENT mechanisms (P3/F6a), still OPEN.**

- **2026-06-14 live-verify of `a8bf5616` (the D225 converter fixes) on canary page 8 (run `mamas-munches-homepage-2026-06-14-081059`):** **IN-B max-width → VERIFIED** (live `.sgs-container__inner` = `max-width:960px`); **GF-B.2 → VERIFIED** (gift sub `text-align:left`, no center leak); **H-C1 → STAYS OPEN** — fix did not land (`subHeadlineMaxWidth` in leftover bucket + wrong layer: hero attr vs child sgs/text). 2 NEW incidental bugs on the hero sub `<p>` inline style: malformed `line-height:1.65unitless` + duplicated `margin-bottom:24px` (see residue). gridItem* (4th `a8bf5616` fix) NOT separately probed this pass.

## Ledger

| Issue | Section | Family | Owning workstream | Status |
|---|---|---|---|---|
| H-A | Hero | F7 | Stage2-F7 | **VERIFIED (2026-06-12)** — double-wrap purged; single `<section class="sgs-hero">` |
| H-A2 | Hero | F4 | Stage2-F4 | **VERIFIED (2026-06-12)** — 1-col @375, 2-col @768/1440 |
| H-B | Hero | F1 cross-node | Stage1 | **VERIFIED (c6337eac, 2026-06-11)** — GRID-PER-AREA router; live .sgs-hero__content padding 28/56/72 at 375/768/1440 |
| H-C1 | Hero | F6a (P3 per-area max-width) | Stage1 | **OPEN — `a8bf5616` fix did NOT land (live-verified 2026-06-14, run `...081059`).** Draft `.sgs-hero__sub{max-width:420px}` @desktop (index.html:307); live hero sub `<p>` (now a child `wp-block-sgs-text`) computes `max-width:none`. ROOT CAUSE: `subHeadlineMaxWidth` is in the run's **leftover bucket** (stage-9 — never extracted), AND it's a hero-level attr but the sub renders as a CHILD sgs/text block, so even if emitted it wouldn't style the child `<p>`. The `attr_for_area_property` route targets the wrong layer. 2 incidental bugs on the same `<p>`: malformed `line-height:1.65unitless` (invalid→ignored) + duplicated `margin-bottom:24px`. |
| H-C2 | Hero | F3 inert controls | — | **SHIPPED (D192)** |
| TB-A | Trust Bar | F1 cross-node + F1b (P5) | Stage1 + Stage1b | **VERIFIED (2026-06-12, 9275328c)** — live grid column-gap 12px + `.sgs-trust-bar__circle` bg `rgb(255,255,255)` white. Converter now lifts `gap:"16px 12px"` + `iconCircleBackground:"#ffffff"` |
| TB-B | Trust Bar | F1b array + F4 (P5) | Stage1b | **VERIFIED (2026-06-12, 9275328c)** — same gap+circle-bg fix as TB-A; breakpoint intact (2→4 col) |
| TB-C | Trust Bar | NEW icon-drift | DESIGN/VISUAL | NEEDS-VISUAL — emitted attrs correct (home/check/truck/star, 2026-06-07 resolver); confirm rendered SVG glyph |
| TB-C-draft | Trust Bar | NEW draft | draft edit | DRAFT-EDIT (not a fidelity row) |
| BR-A | Brand | F4 | Stage2-F4 | **VERIFIED (2026-06-12)** — 2-col desktop (450/450 @1440) |
| BR-B | Brand | F8 → MEDIA | media-sideload | OPEN — brand image renders 0×0 = sideload/404, NOT converter CSS (`distinguish-render-artefact-from-converter-emission`); route to media pipeline |
| BR-C | Brand | F3 (P5) | Stage2-F3 | **VERIFIED (2026-06-12, 9275328c)** — live outline btn: color `rgb(58,46,38)` dark, border `rgb(232,213,192)` 2px visible, bg transparent. `is-style-outline` ghost via theme.json `custom.buttonPresets.outline` (Bean-approved). Report: `reports/visual-diff/button-2026-06-12.md` |
| FP-A | Featured-prod | F6a / F3 | Stage1-F6a / Stage2-F3 | **VERIFIED (2026-06-12)** — heading `textAlign:left` |
| FP-B | Featured-prod | F1 | Stage1 | **VERIFIED (2026-06-12)** — label 12px/600; section 56/20 |
| FP-C | Featured-prod | F1 cross-node | Stage1 | **VERIFIED (2026-06-12)** — section 56/20 + gaps 7/10px = draft |
| FP-D | Featured-prod | F5 | Spec 27 (card-grid) | DESIGN — card-grid block resolution (D204 architecture); confirm under Spec 27 |
| FP-E | Featured-prod | NEW block-capability | Spec 27 (card-grid product) | **SHIPPED (D204, 2026-06-10)** — card-grid wc-product mode; was stale-OPEN, flipped on 2026-06-11 ledger walk |
| FP-F | Featured-prod | NEW rest-validation | — | **SHIPPED (D191)** |
| FP-G | Featured-prod | F3 | Stage2-F3 | **VERIFIED (2026-06-12)** — no black border on card |
| FP-H | Featured-prod | NEW block-arch-mismatch | Spec 27 | **SHIPPED (D204, 2026-06-10)** — product-card built-in-element rebuild; was stale-OPEN, flipped on 2026-06-11 ledger walk |
| FP-I | Featured-prod | F3 / NEW (P5) | Stage2-F3 | **VERIFIED (2026-06-12, 9275328c)** — live img height 220px both cards. Converter lifts draft `height:220px` → sgs/media `maxHeight:220`+`maxHeightUnit:px` (the rendered attr; `imageHeight` was dead) |
| FP-J | Featured-prod | F1 cross-node | Stage1 | **VERIFIED (2026-06-12)** — in-card spacing matches draft |
| FP-K | Featured-prod | F3 | Spec 27 | DESIGN — pack-size label now intentionally emitted (row pre-dates D204 rebuild) |
| FP-L1 | Featured-prod | F3 | Stage2-F3 | **VERIFIED (2026-06-12)** — pills grey `rgb(229,231,235)`, not primary-pink |
| FP-M | Featured-prod | F2 (P2) | Stage2-F2 | **VERIFIED (2026-06-12)** — live featured price `font-family:"Fraunces", serif`. Fix 691298d7 |
| FP-N | Featured-prod | F3 (P5) | Stage2-F3 | **VERIFIED (2026-06-12, 9275328c)** — live price-row `align-items:baseline`. Converter lifts flex align-items → container `verticalAlign:"baseline"` |
| FP-O | Featured-prod | F3 (P5) | Stage2-F3 | **VERIFIED (2026-06-12, 9275328c)** — live cards equal height (613/613). Universal grid-stretch (`.sgs-products` grid → `verticalAlign:stretch`) + FP-I image fix |
| FP-P | Featured-prod | F3 (P5) | Stage2-F3 | **OPEN — CONFIRMED REAL DEFECT, draft-vs-clone measured 2026-06-14 @1440.** DRAFT: `.sgs-button`(inline-flex) inside `.sgs-product-card__body`(flex column, align-items:stretch default) blockifies+stretches → CTA = **598px** (= body inner width), display `flex`. CLONE: CTA (`.sgs-button is-style-primary`) = **183px**, display `inline-flex`, NOT stretched (body 638px). ROOT CAUSE: the cloned product-card body doesn't reproduce the flex-column-stretch, so the CTA stays content-width. Fix layer = product-card render/CSS (F3), not converter routing. |
| FP-DRAFT | Featured-prod | NEW draft-naming | draft edit | DRAFT-EDIT (not a fidelity row) |
| IN-A | Ingredients | F6a | Stage1-F6a | **VERIFIED (2026-06-12)** — label+intro `textAlign:center` |
| IN-B | Ingredients | P1 done / P3 content-band | Stage1 | **VERIFIED (2026-06-14, `a8bf5616`, run `...081059`)** — margin already VERIFIED (691298d7). **max-width now CLOSED:** live `.sgs-container__inner` in the ingredients section computes `max-width:960px` = draft `.sgs-ingredients-section__inner{max-width:var(--content-width);--content-width:960px}` (index.html:508). The `_resolve_co_declared_var` fix resolved `var(--content-width)`→`960px` onto the content-band wrapper. Both halves of IN-B confirmed on live page 8. |
| IN-C | Ingredients | F3 (P5) | Stage2-F3 | **VERIFIED (2026-06-12, WS-A `1f107711`)** — shared container-wrapper now reads `verticalAlign ?? alignItems ?? 'start'` (dual-key fallback, NO default flip). Live page 8: feature-grid `align-items:stretch` (was start). Universal, back-compat, no rename/client re-save. |
| IN-D | Ingredients | F8 (P7) | Stage2-F8 | **VERIFIED (2026-06-12, 9275328c)** — live feature icons render emoji 🌾🍺🌿🌱 (not Lucide). New `_atomic_attrs_for` sgs/icon handler: emoji→`iconSource:emoji`+`emojiChar`; slug→`iconSource:lucide` |
| IN-E | Ingredients | F6a (P6) | Stage1-F6a | **OPEN — CONFIRMED REAL DEFECT (not misdiagnosis), draft-vs-clone measured 2026-06-14 @1440.** DRAFT: `.sgs-info-box` has NO own text-align → h4+p INHERIT `center` from `.sgs-ingredients-section__inner{text-align:center}` (index.html:508,517-531); measured draft = `center`. CLONE: feature-card h4 = `left`. The inherited-typography resolver emits `left` instead of resolving the ancestor `center`. ROOT CAUSE pending (likely the FR-22-5.1 absence-default firing `left` where the leaf should inherit the section centre, OR the converted card-container breaks the ancestor walk). Fix needs root-cause like H-C1. |
| IN-F | Ingredients | F8 (P7) | Stage2-F8 | **VERIFIED (2026-06-13, commit `1b03b8c7`, D222)** — bg FIXED (2026-06-12, 9275328c). CONTENT now lifts: a `has_inner_blocks` composite node with direct rich-text but zero child blocks emits one `sgs/text` child (DB-gated via `scalarContentLift` capability, no per-slug branch). Ingredients disclaimer text live-verified on canary page 8. |
| GF-A | Gift | F6a / F3 | Stage1-F6a / Stage2-F3 | **VERIFIED (2026-06-12)** — gift h2 `textAlign:left` = draft |
| GF-B.1 | Gift | F1 | Stage1 | **VERIFIED (2026-06-11 re-clone)** — live page-8 `.sgs-gift-section` padding = 64px 20px (draft 64/20) |
| GF-B.2 | Gift | F6a (P6) | Stage1 | **VERIFIED (2026-06-14, `a8bf5616`, run `...081059`)** — live gift sub `<p>` computes `text-align:left`; draft has NO text-align anywhere in the gift section (index.html grep clean) → left is faithful, center-leak gone. GF-B.2 selector-scope matcher (no cross-section bleed) confirmed on live page 8. |
| GF-B.3 | Gift | F4 (min-width:640) | Stage2-F4 | **VERIFIED (2026-06-11 re-clone)** — live page-8 cards grid = 1-col @mobile, 2-col 668/668 @1440 (breakpoint fires) |
| GF-B.4 | Gift | F2 | Stage2-F2 | **VERIFIED (2026-06-11 re-clone)** — live page-8 `.sgs-gift-section` font-family = Inter, sans-serif (draft Inter) |
| GF-C | Gift | P1 (number+unit split) | Stage1 | **VERIFIED (2026-06-12)** — live gift sub `margin-bottom:32px` (= draft). Fix: 691298d7. Report: `reports/visual-diff/text-2026-06-12.md` |
| GF-D.1 | Gift | F3 (bg default) | Stage2-F3 | **VERIFIED (2026-06-11 re-clone, parity2)** — gift card bg = rgb(255,255,255) (draft white); sgs/info-box default aligns |
| GF-D.2 | Gift | F3 (P4) | Stage2-F3 | **VERIFIED (2026-06-12)** — live gift label `border-radius:6px` (= draft). Fix 7867372f (label render.php emitted radius only via a pill-variant CSS var; now inline). Report: `reports/visual-diff/label-2026-06-12.md` |
| GF-E | Gift | P1+P2 | Stage1 / Stage2-F2 | **VERIFIED (2026-06-12)** — live gift price `margin-bottom:16px` + `font-family:"Fraunces", serif`. Fix 691298d7 |
| GF-F | Gift | P2 | Stage2-F2 | **VERIFIED (2026-06-12)** — live gift price `font-family:"Fraunces", serif` (same element as GF-E) |
| GF-G | Gift | F1 (absorbed gap) | Stage1 | **VERIFIED (2026-06-11 re-clone)** — live page-8 `.sgs-gift-section__cards` gap = 16px, margin-bottom = 20px (draft 16/20) |
| GF-H | Gift | F3 (multi-button auto-wrap) | Stage2-F3 | **VERIFIED (2026-06-11 re-clone)** — live page-8 send-to-ward bar = flex / wrap / space-between / gap 12px (draft match) |
| GF-I | Gift | F8 + F5 | Stage2-F8 + F5 | **VERIFIED (2026-06-11 re-clone, parity2)** — gift section content transfer 100% all 3 viewports |
| SP-A | Social Proof | F4 | DESIGN | STALE — testimonial-slider is a flex slider (works); the "1-col mobile / multi-col" grid framing no longer applies |
| SP-B | Social Proof | P1 | Stage1 | **VERIFIED (2026-06-12)** — live social sub `margin-bottom:32px` + centred + text-muted (691298d7) |
| SP-C | Social Proof | F3 (verticalAlign) | DESIGN | NEEDS-DESCRIPTION — no concrete expected value; re-describe or drop |
| SP-D.1 | Social Proof | F3 typography (P8) | Stage2-F3 | **VERIFIED (2026-06-12, 9275328c)** — live star SVG 15px. New testimonial `ratingSize` attr (default 16) drives the SVG width/height; converter lifts draft 15px |
| SP-D.2 | Social Proof | F1 | Stage1 | **VERIFIED (2026-06-12)** — star colour `rgb(245,208,80)` = accent |
| SP-E | Social Proof | F3 typography (P8) | Stage2-F3 | **VERIFIED (2026-06-12, 9275328c)** — live quote `font-style:italic`, 14px, `rgb(107,92,80)` text-muted; author weight 600. Converter lifts quoteStyle/quoteFontSize/quoteColour (wired attrs) + new `nameFontWeight` attr |
| SP-F | Social Proof | F3 (P5) | Stage2-F3 | **VERIFIED (2026-06-12)** — NOT A DEFECT (false positive). Live already renders the double-card: slide wrapper cream `rgb(251,243,220)` + 8px radius, inner card white + 12px. No code change |
| SP-G | Social Proof | F5 wrong-block | DESIGN | NEEDS-DECISION — testimonial-slider vs grid is a block-TYPE choice (Bean sign-off); binding-half SHIPPED D191 |

## Workstream load (open issues only)
- **Stage 1 (F1 cross-node + F6a):** ~18 (the biggest — H-B, FP-B/C/J/N/P, GF-B.1/B.2/C/G, SP-B/D.2, IN-B + F6a: H-C1, FP-A/K, IN-A/E/F, GF-A/E)
- **Stage 1b (array per-item):** 2 (TB-A, TB-B) — small count, but the FR-22-2.5 build is medium.
- **Stage 2-F3:** ~15 (the second-biggest — BR-C, FP-G/I/L1/N/O, IN-C, GF-D.1/D.2/H, SP-C/D.1/E/F + F6b half of FP-A/GF-A/GF-E)
- **Stage 2-F4:** 4 (H-A2, BR-A, GF-B.3, SP-A)
- **Stage 2-F2:** 3 (FP-M, GF-B.4, GF-F)
- **Stage 2-F5:** 3 (FP-D, SP-G, GF-I-half)
- **Stage 2-F7:** 1 (H-A)
- **Stage 2-F8:** ~4 (BR-B, IN-D, IN-F, GF-I-half, SP-E-half)
- **NEW / draft / Spec 27:** TB-C, TB-C-draft, FP-E, FP-H, FP-DRAFT. **⚠ MILESTONE GATE (qc-council):** FP-E (card-grid WooCommerce product capability) + FP-H (product-card built-in-elements architecture) are NOT Stage-1/2/3 work — they are a **Spec 27 block-build milestone** (multi-session: new attrs + render.php + edit.js + deprecated.js + WC query, co-ordinated with Spec 27 Phases). They **cannot be marked VERIFIED by the clone-fix waves** — they require an explicit Spec-27 session. **SEQUENCING (Bean-confirmed 2026-06-09): that session must run AFTER (a) the Spec27-28 council-mustfix wave plan (`.claude/plans/2026-06-06-spec27-28-council-mustfix-wave-plan.md`, currently AWAITING-BEAN-SIGNOFF / Wave-2 mid-build — it edits the same product-card files) AND (b) the cloning converter Stage 1.** Prompt ready at `.claude/reports/wave2/FP-E-FP-H-SPEC27-REBUILD-PROMPT.md`. Until then, FP-E/FP-H stay OPEN by design; the 55-row ledger reaching all-VERIFIED is gated on it. Do NOT let them be silently rolled into "residue".

## Stage-1 build prerequisites (council C5 — must be green BEFORE the relevant commit)
- **canonical_slot backfill — NOT A GATE (D194); DONE as metadata.** The cross-node dispatch does NOT find the parent's per-slot box attrs by `canonical_slot` — structural box CSS routes NAME-FREE via layer-prefix + `property_suffixes` (D194). F1-cross-node has **no dependency** on this backfill. The ~41 content-area rows (`contentWidth`/`contentPadding*`) are tagged `canonical_slot='content'` + `role='layout'` as convention-consistent metadata only, maintained deterministically by `/sgs-update` Stage 1 `assign-canonical.py` (the throwaway `seed-canonical-slots.py` was deleted as redundant parallel infra). Status: **DONE-as-metadata, not a pre-commit gate.** Design-gate: `WRAPPER-CSS-ROUTING-DESIGN-GATE.md`.
- **Gate identity (no doc may say `is_class_section_block` for the composite-interior carve-out).** The live gates are `db.has_scalar_media_attrs(slug)` (`convert.py:2940`) + `_is_container_mirror_block` (`:2950`); the XS-3 guard is `fold_eligible` (`_process_container_children:3857`). Corrected across all docs 2026-06-09.

## Uncaptured residue (council Completeness — must stay visible)
- **Mobile/tablet defects** — the source review was DESKTOP-ONLY. The responsiveness *failure-mode* is captured (F4 + per-device CSS vars), and universal fixes apply to all devices — but the **375/768 verification pass at Stage 3 may surface device-specific defects** not in this ledger. Add them here when found.
- **FP-F drift guard** — the binding fix shipped, but its `generate-extension-attributes.js --check` is only wired to prebuild, not CI/pre-commit. Confirm the pre-commit wiring (memory `dont-claim-a-guard-is-enforced-unless-wired`).
- Any new issue found during build/verify gets a row here — the ledger is the single close-out source.
- **NEW 2026-06-14 (H-C1 live-verify, run `...081059`) — hero sub `<p>` inline-style emit bugs:** (1) `line-height:1.65unitless` — the literal `unitless` leaked into the value (should be bare `1.65`), making it invalid → the browser drops it, so the hero sub line-height does not apply. (2) `margin-bottom:24px` emitted TWICE in the same inline `style=`. Both originate in the sgs/text styling-lift emit path on convert.py. Small, but real render defects on every cloned text block carrying a unitless line-height. Triage before the H-C1 re-fix.
- ~~**NEW 2026-06-11 (re-clone ledger walk):** **testimonial slides render EMPTY on live page 8**~~ → **RESOLVED 2026-06-12** (commits `3938a7b0` converter + `09a908fd` block-side, on main). Root cause was NOT InnerBlocks-not-rendering — it was `block_composition.has_inner_blocks=1` STALE after the D8 typed rebuild, so the converter emitted child blocks the typed render.php ignores. Fixed via the universal DB-driven scalar-lift (quote/name/stars → typed attrs, opt-in gated). **LIVE-VERIFIED on re-cloned page 8:** 3 cards, quote+name visible + 5 SVG stars (aria 5/5) at 1440/768/~500 + card chrome faithful. Reports: `reports/visual-diff/testimonial-2026-06-12.md`. **SP-C/D.1/D.2/E are now UNBLOCKED (measurable) but stay OPEN** — they are distinct fidelity rows (verticalAlign / star-size / F8) not yet measured against the draft. **⚠ SP-D.1/D.2 fix-shape SUPERSEDED:** stars now render from the `ratingStars` typed attr (5 SVGs), NOT a child `sgs/star-rating` block, so the "route font-size → child star-rating size attr" route no longer applies — star size is now a testimonial-block CSS/attr question; re-scope before measuring.
- **NEW 2026-06-11 (re-clone ledger walk):** **parity tooling has a BEM-class blind spot for converted output.** `clone-parity.js` matches elements by draft BEM class (`sgs-hero__content` etc.), but the converter correctly emits NATIVE SGS blocks (Rule 1: convert-don't-mirror), which do NOT carry those draft classes — so the differ reports them "ELEMENT MISSING" and the aggregate score is junk (`1/130`). `parity2/` (content-transfer by abstract node) is the more honest aggregate but mis-matches some nodes. **Per-row acceptance must use targeted live-DOM probes on the rendered SGS-block elements, not the BEM-class differ.** Also live-confirmed: a **global base-font drift (16→18px)** on the clone inflates every text element's fontSize/lineHeight failure — a theme/global-styles-layer issue, NOT any converter row; root-cause at the theme layer.
