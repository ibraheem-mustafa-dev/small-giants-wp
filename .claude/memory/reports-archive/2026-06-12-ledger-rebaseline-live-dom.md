---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Ledger re-baseline against LIVE page 8 DOM (2026-06-12)"
created: 2026-06-12
status: Re-baseline complete. Supersedes the stale F1-padding framing. Source of truth for which rows are real.
method: "3-breakpoint live computed-style capture (1440/768/375) of sandybrown homepage + per-row classification by 3 family subagents + main-agent F4 verification. Captures at pipeline-state/rebaseline-2026-06-12/live-capture-{1440,768,375}.json."
---

# Ledger re-baseline — live DOM, 2026-06-12

## Headline

The handoff's premise — "Stage 1 converter mis-routes section padding → 0/52 rows closed" — is a **misdiagnosis**. Section padding renders **correctly at every breakpoint** (featured 56/20, ingredients/gift/social 64/20, all = draft; hero per-area 72/64; delivered via WP-native spacing). The ledger was **stale**. Re-baselined against the 2026-06-11 re-clone: **~13 OPEN rows are already fixed (close them), ~22 are genuinely broken (clustered into 8 fix-patterns), ~7 need a design/spec decision (not converter bugs).**

## CLOSE — VERIFIED on live page 8 (were OPEN; now confirmed fixed)

| Row | What | Live evidence |
|---|---|---|
| H-A | F7 double-wrap purged | single `<section class="sgs-hero">`, no outer container |
| H-A2 | F4 hero grid breakpoint | 1-col @375, 2-col @768/1440 |
| FP-A | heading left-align | `textAlign:left` |
| FP-B | label styles | 12px/600, section 56/20 |
| FP-C | section spacing | 56/20, gaps 7/10px = draft |
| FP-G | no black border on card | no dark border present |
| FP-J | in-card spacing | gaps match draft |
| FP-L1 | pack pills not primary-pink | grey `rgb(229,231,235)` |
| BR-A | brand 2-col desktop | `450px 450px` @1440 |
| IN-A | label/intro centred | `textAlign:center` |
| GF-A | gift h2 left | `textAlign:left` (matches draft) |
| SP-D.2 | star colour | `rgb(245,208,80)` = accent |
| (TB breakpoint) | 4→2 col switch | 2-col @375, 4-col @768+ (gap/bg residual → TB-A/B stay open) |

## STILL-BROKEN — clustered into fix-patterns (live-evidenced)

**P1 — `margin-bottom` on sub/text NOT transferred (universal spacing gate).** IN-B (draft 36px→live 0), GF-C (32→0), SP-B (32→0), GF-E (16→0). One converter mechanism closes all four.

**P2 — price/heading text renders `Inter` not `Fraunces` (F2 font-family).** FP-M, GF-E, GF-F — price `£…` elements `fontFamily:Inter` vs draft `Fraunces, serif`.

**P3 — inner-element `max-width` not extracted (F6a).** IN-B (intro 540px→`none`), H-C1 (subHeadline 420px→`none`).

**P4 — `border-radius` missing on sub-elements (F3).** GF-D.2 (pill `0`→draft 6px); info-box/card radii.

**P5 — render-default mismatches (F3 / block-quality).** BR-C (outline button border transparent + text pink not dark), SP-F (slide-card cream bg + 8px radius double-card effect), TB-A/B (gap 7px→draft 12px; circle bg cream→white), FP-N (price-row `align:start`→`baseline`), FP-I (card image height not 220px; 468/433px unequal), FP-P (CTA not full-width; 182px in 833px body), FP-O (cards unequal height), IN-C (feature-grid `alignItems:start`→stretch).

**P6 — `text-align` leak/miss (F6a).** IN-E (info-box left→draft centred), GF-B.2 (gift sub `center` leak→draft start).

**P7 — content/icon extraction (F8).** IN-D (emoji 🌾🍺🌿🌱 → Lucide SVG), IN-F (notice-banner EMPTY + wrong info-blue bg). **BR-B (brand image 0×0) is a MEDIA-SIDELOAD/404 issue, NOT converter CSS** (memory `distinguish-render-artefact-from-converter-emission`) — route to media pipeline, not converter.

**P8 — testimonial typography (F3).** SP-D.1 (star 18px→draft 15px), SP-E (quote not italic + wrong size/colour; author weight 700→600).

## NEEDS DESIGN/SPEC DECISION (not converter bugs — do NOT treat as fidelity rows)

- FP-D — card-grid block resolution (D204 architecture; needs Spec-27 confirm)
- FP-K — pack-size label now intentionally emitted (row pre-dates D204 rebuild)
- FP-DRAFT / TB-C-draft — draft BEM naming edits
- TB-C — icon glyphs: emitted attrs are CORRECT (home/check/truck/star post 2026-06-07 resolver); needs a visual/SVG check, not computed-style
- SP-C — "verticalAlign" claim has no concrete expected value; re-describe or drop
- SP-G — testimonial-slider vs grid is a block-TYPE design choice (Bean sign-off), not a measurement
- SP-A — slider is flex (works as a slider); the "1-col mobile" framing was stale

## Highest-leverage next work (universal converter mechanisms, Rule-3 clean)

1. **P1 margin-bottom transfer** — one mechanism, closes 4 rows. Likely the "spacing-support gate" (margin-bottom not harvested from class CSS into a block attr).
2. **P2 Fraunces font-family transfer to text/price** — closes 3 rows.
3. **P3 inner max-width extraction** — closes 2 rows.
P5/P8 are block-quality/F3 (block defaults + render), better handled as a block-quality pass than converter routing. P7 splits: IN-D/IN-F = converter content extraction; BR-B = media sideload.
