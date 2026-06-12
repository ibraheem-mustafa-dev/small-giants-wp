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
- **STILL-BROKEN (live-evidenced, clustered into 8 fix-patterns P1–P8):** ~22 — none are section-padding. P1 margin-bottom transfer (IN-B/GF-C/SP-B/GF-E), P2 Fraunces font (FP-M/GF-E/F), P3 inner max-width (IN-B/H-C1), P4 border-radius (GF-D.2), P5 render-defaults (BR-C/SP-F/TB-A/B/FP-I/N/O/P/IN-C), P6 text-align (IN-E/GF-B.2), P7 content/icon extraction (IN-D/IN-F; BR-B = media-sideload NOT converter), P8 testimonial typography (SP-D.1/SP-E).
- **DESIGN/SPEC DECISION (not converter fidelity rows):** FP-D, FP-K, FP-DRAFT, TB-C, TB-C-draft, SP-A, SP-C, SP-G.
- **2026-06-12 text-CSS cluster CLOSED (commits 87cd3ba0 + 691298d7, live page-8 verified):** P1 margin (GF-C/GF-E + IN-B-margin), P2 Fraunces font (FP-M/GF-E/F) → VERIFIED. The lift was emit-correct but blocked by a 3-layer render chain (number-typed attr rejecting a unit-combined string; `esc_attr` mangling the font-family quotes; both fixed). Report: `reports/visual-diff/text-2026-06-12.md`. Lesson: `memory/feedback_converter_attr_lift_must_verify_full_render_chain`. **Still to re-probe with the same mechanism (likely-closed, not yet element-verified):** SP-B (social sub margin), the colour/text-align rows on directly-lifted text; **IN-B max-width + IN-E info-box inherited-centering are DIFFERENT mechanisms (P3/F6a), still OPEN.**

## Ledger

| Issue | Section | Family | Owning workstream | Status |
|---|---|---|---|---|
| H-A | Hero | F7 | Stage2-F7 | **VERIFIED (2026-06-12)** — double-wrap purged; single `<section class="sgs-hero">` |
| H-A2 | Hero | F4 | Stage2-F4 | **VERIFIED (2026-06-12)** — 1-col @375, 2-col @768/1440 |
| H-B | Hero | F1 cross-node | Stage1 | **VERIFIED (c6337eac, 2026-06-11)** — GRID-PER-AREA router; live .sgs-hero__content padding 28/56/72 at 375/768/1440 |
| H-C1 | Hero | F6a (P3 per-area max-width) | Stage1 | OPEN — live `maxWidth:none`; subHeadline max-width is a hero per-area attr (`subHeadlineMaxWidth`), not sgs/text.maxWidth — needs per-area extraction, not the leaf-lift opt-in (7867372f). Verify draft value (var vs literal) |
| H-C2 | Hero | F3 inert controls | — | **SHIPPED (D192)** |
| TB-A | Trust Bar | F1 cross-node + F1b (P5) | Stage1 + Stage1b | OPEN — gap live 7px≠draft 12px; circle bg cream≠white (converter emits no gap/iconCircleBackground → block defaults) |
| TB-B | Trust Bar | F1b array + F4 (P5) | Stage1b | OPEN — breakpoint OK (2-col@375→4-col@768+); same gap/circle-bg gap as TB-A |
| TB-C | Trust Bar | NEW icon-drift | DESIGN/VISUAL | NEEDS-VISUAL — emitted attrs correct (home/check/truck/star, 2026-06-07 resolver); confirm rendered SVG glyph |
| TB-C-draft | Trust Bar | NEW draft | draft edit | DRAFT-EDIT (not a fidelity row) |
| BR-A | Brand | F4 | Stage2-F4 | **VERIFIED (2026-06-12)** — 2-col desktop (450/450 @1440) |
| BR-B | Brand | F8 → MEDIA | media-sideload | OPEN — brand image renders 0×0 = sideload/404, NOT converter CSS (`distinguish-render-artefact-from-converter-emission`); route to media pipeline |
| BR-C | Brand | F3 (P5) | Stage2-F3 | OPEN — outline button border transparent + text pink≠dark |
| FP-A | Featured-prod | F6a / F3 | Stage1-F6a / Stage2-F3 | **VERIFIED (2026-06-12)** — heading `textAlign:left` |
| FP-B | Featured-prod | F1 | Stage1 | **VERIFIED (2026-06-12)** — label 12px/600; section 56/20 |
| FP-C | Featured-prod | F1 cross-node | Stage1 | **VERIFIED (2026-06-12)** — section 56/20 + gaps 7/10px = draft |
| FP-D | Featured-prod | F5 | Spec 27 (card-grid) | DESIGN — card-grid block resolution (D204 architecture); confirm under Spec 27 |
| FP-E | Featured-prod | NEW block-capability | Spec 27 (card-grid product) | **SHIPPED (D204, 2026-06-10)** — card-grid wc-product mode; was stale-OPEN, flipped on 2026-06-11 ledger walk |
| FP-F | Featured-prod | NEW rest-validation | — | **SHIPPED (D191)** |
| FP-G | Featured-prod | F3 | Stage2-F3 | **VERIFIED (2026-06-12)** — no black border on card |
| FP-H | Featured-prod | NEW block-arch-mismatch | Spec 27 | **SHIPPED (D204, 2026-06-10)** — product-card built-in-element rebuild; was stale-OPEN, flipped on 2026-06-11 ledger walk |
| FP-I | Featured-prod | F3 / NEW (P5) | Stage2-F3 | OPEN — card image height ≠ 220px (live 468/433px, unequal) |
| FP-J | Featured-prod | F1 cross-node | Stage1 | **VERIFIED (2026-06-12)** — in-card spacing matches draft |
| FP-K | Featured-prod | F3 | Spec 27 | DESIGN — pack-size label now intentionally emitted (row pre-dates D204 rebuild) |
| FP-L1 | Featured-prod | F3 | Stage2-F3 | **VERIFIED (2026-06-12)** — pills grey `rgb(229,231,235)`, not primary-pink |
| FP-M | Featured-prod | F2 (P2) | Stage2-F2 | **VERIFIED (2026-06-12)** — live featured price `font-family:"Fraunces", serif`. Fix 691298d7 |
| FP-N | Featured-prod | F3 (P5) | Stage2-F3 | OPEN — price-row `align:start`≠`baseline` |
| FP-O | Featured-prod | F3 (P5) | Stage2-F3 | OPEN — product cards unequal height (no grid-stretch) |
| FP-P | Featured-prod | F3 (P5) | Stage2-F3 | OPEN — CTA not full-width (182px in 833px body) |
| FP-DRAFT | Featured-prod | NEW draft-naming | draft edit | DRAFT-EDIT (not a fidelity row) |
| IN-A | Ingredients | F6a | Stage1-F6a | **VERIFIED (2026-06-12)** — label+intro `textAlign:center` |
| IN-B | Ingredients | P1 done / P3 content-band | Stage1 | **PARTIAL (2026-06-12)** — margin VERIFIED (live intro `margin-bottom:32px` + `margin:0 auto` centring, 691298d7). **max-width CORRECTED:** draft is `max-width:var(--content-width)` (a content-band, NOT literal 540px) — can't lift to a number `maxWidth` attr; needs content-band/contentWidth handling (P3 literal-max-width opt-in shipped 7867372f but doesn't apply to a var). STILL OPEN |
| IN-C | Ingredients | F3 (P5) | Stage2-F3 | OPEN — feature-grid `alignItems:start`≠stretch (unequal card heights) |
| IN-D | Ingredients | F8 (P7) | Stage2-F8 | OPEN — emoji 🌾🍺🌿🌱 → Lucide SVG (wrong field extracted) |
| IN-E | Ingredients | F6a (P6) | Stage1-F6a | OPEN-SUSPECT-MISDIAGNOSIS — P6 inherited-typography now resolves on the leaf path (7867372f), but feature-card text emits `textAlign:left` because it genuinely computes left (card overrides section centre). Re-check the DRAFT's actual computed text-align before treating as a defect |
| IN-F | Ingredients | F8 (P7) | Stage2-F8 | OPEN — notice-banner EMPTY + info-blue bg≠white |
| GF-A | Gift | F6a / F3 | Stage1-F6a / Stage2-F3 | **VERIFIED (2026-06-12)** — gift h2 `textAlign:left` = draft |
| GF-B.1 | Gift | F1 | Stage1 | **VERIFIED (2026-06-11 re-clone)** — live page-8 `.sgs-gift-section` padding = 64px 20px (draft 64/20) |
| GF-B.2 | Gift | F6a (P6) | Stage1 | OPEN — gift sub `textAlign:center` leak (draft has none) |
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
| SP-D.1 | Social Proof | F3 typography (P8) | Stage2-F3 | OPEN — star `fontSize:18px`≠draft 15px. **Fix-shape SUPERSEDED** (stars now typed `ratingStars` SVG, not child block) — testimonial-block CSS/attr question |
| SP-D.2 | Social Proof | F1 | Stage1 | **VERIFIED (2026-06-12)** — star colour `rgb(245,208,80)` = accent |
| SP-E | Social Proof | F3 typography (P8) | Stage2-F3 | OPEN — quote `fontStyle:normal`≠italic, size/colour off; author weight 700≠600 |
| SP-F | Social Proof | F3 (P5) | Stage2-F3 | OPEN — slide wrapper cream bg + 8px radius (double-card effect; card itself is white/12px) |
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
- ~~**NEW 2026-06-11 (re-clone ledger walk):** **testimonial slides render EMPTY on live page 8**~~ → **RESOLVED 2026-06-12** (commits `3938a7b0` converter + `09a908fd` block-side, on main). Root cause was NOT InnerBlocks-not-rendering — it was `block_composition.has_inner_blocks=1` STALE after the D8 typed rebuild, so the converter emitted child blocks the typed render.php ignores. Fixed via the universal DB-driven scalar-lift (quote/name/stars → typed attrs, opt-in gated). **LIVE-VERIFIED on re-cloned page 8:** 3 cards, quote+name visible + 5 SVG stars (aria 5/5) at 1440/768/~500 + card chrome faithful. Reports: `reports/visual-diff/testimonial-2026-06-12.md`. **SP-C/D.1/D.2/E are now UNBLOCKED (measurable) but stay OPEN** — they are distinct fidelity rows (verticalAlign / star-size / F8) not yet measured against the draft. **⚠ SP-D.1/D.2 fix-shape SUPERSEDED:** stars now render from the `ratingStars` typed attr (5 SVGs), NOT a child `sgs/star-rating` block, so the "route font-size → child star-rating size attr" route no longer applies — star size is now a testimonial-block CSS/attr question; re-scope before measuring.
- **NEW 2026-06-11 (re-clone ledger walk):** **parity tooling has a BEM-class blind spot for converted output.** `clone-parity.js` matches elements by draft BEM class (`sgs-hero__content` etc.), but the converter correctly emits NATIVE SGS blocks (Rule 1: convert-don't-mirror), which do NOT carry those draft classes — so the differ reports them "ELEMENT MISSING" and the aggregate score is junk (`1/130`). `parity2/` (content-transfer by abstract node) is the more honest aggregate but mis-matches some nodes. **Per-row acceptance must use targeted live-DOM probes on the rendered SGS-block elements, not the BEM-class differ.** Also live-confirmed: a **global base-font drift (16→18px)** on the clone inflates every text element's fontSize/lineHeight failure — a theme/global-styles-layer issue, NOT any converter row; root-cause at the theme layer.
