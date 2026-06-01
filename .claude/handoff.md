# Session Handoff — 2026-06-01 (FR-22-19 composite scalar-media + trust-bar dual-mode + cta-section FR-22-6: SHIPPED + LIVE-DOM VERIFIED)

## What shipped this session (branch `feat/fr22-4-1-universal-wrapper`; 6 commits; NOT merged to main)
A full design→build→verify cycle, all on the feature branch:

1. **Hero composite scalar-media (§FR-22-19)** — `83a55820` + `5859c42d` + `b83cd312`. The hero double-wrapper + missing split-image are FIXED + **live-DOM verified** on canary 144: exactly **1** `.sgs-hero__content` (was 2), the media column + **2 art-directed `.sgs-hero__split-image`** (mobile/desktop) render. Mechanism: a new `scalar-media` role (styling-behaviour → `equivalent_block_for` returns NULL → walker lifts the img to the scalar attr instead of a child block); `_route_composite_interior` gated by **`has_scalar_media_attrs(slug)`** (covers hero + testimonial-slider; excludes cta/info-box/product-card); content-column folds slug-None wrappers but emits slug-resolved children as their block. render.php `$is_split` now fires on present split media.
2. **Trust-bar dual-mode (§FR-24-10)** — `d6358f32`. `sourceMode` typed/bound; render.php branches on the explicit mode (R-22-14 clean — never `empty($content)`); Bound `echo $content`; Typed curated repeater unchanged; save→InnerBlocks.Content; deprecated v4/v3/v2 keep existing trust-bars Typed. **Live-verified:** Bound renders the 4 cloned badges; pixel −5.2 to −6.7pp (strongest measured win).
3. **cta-section FR-22-6** — `d6358f32`. Full migration: render echoes $content; edit.js heading+text+buttons InnerBlocks template; deprecated v5 migrate + `isEligible`. Editor-verified (not on Mama's homepage).
4. **Converter sourceMode step** — `d6358f32`. Sets `sourceMode='bound'` on any block declaring a `sourceMode` attr when emitting cloned InnerBlocks (DB-driven, no slug literal).
5. **Product-card + `sgs/option-picker` DESIGN** — `.claude/reports/2026-06-01-product-card-option-picker-design.md` + Spec 24 §FR-24-11..17 stub (research-buddies + brainstorming; needs Bean's 6 decisions before build).

## How it was verified (the methodology held)
- **3-rater qc-council** (functional / rules / evidenced-progress) on the design fix-shape (rejected H2, locked H-conv — would have retired the hero's 169-attr image pipeline) AND on the fresh full-page clone run.
- **Live-DOM (R-22-11)** on deployed page 144 (run `mamas-munches-144-2026-06-01-035323`): hero ✓, trust-bar Bound ✓, 3 `sgs/testimonial` intact ✓, no regressions ✓.
- All new code PASS R-22-1/2/3/9/14 + FR-22-2.2 (qc-council). 2 qc-found gaps fixed same session (hero `$is_split` media; spec role-name image-pipeline→scalar-media).
- **Bean's two corrections improved the mechanism** before it shipped: "preserve full functionality" → H-conv over H2; "testimonial-slider is a composite" → the `has_scalar_media_attrs` gate (covers it + resolved the cta-section over-fire risk).

## Current state
- **Branch:** `feat/fr22-4-1-universal-wrapper`, 6 commits ahead, **NOT merged**. main clean.
- Canary 144 = the shipped + verified state. Pixel-diff mean 62.6% (informational per FR-22-18; images dry-run 404 until sideload).
- DB: `scalar-media` role + the 3 reclassified attr rows + trust-bar `sourceMode` row (indexed by /sgs-update Stage 1).

## REMAINING (priority — see next-session-prompt.md + decisions D132)
1. **Real image sideload (media-map)** — biggest remaining pixel-diff lever (hero/product/brand images are dry-run 404s).
2. **Merge-prep → main:** split `d6358f32` per-block (R-22-5) + Bean visual sign-off (R-22-13).
3. **`isEligible`** on hero/info-box deprecations (copy cta-section v5 pattern).
4. **Phase-2 scalar-attr extraction** (476 leftover styling/layout attrs — fidelity, not structure).
5. **Investigate:** featured-product 375 +11.1pp (likely noise); stage-4j charmap-stdout bug; `_atomic_attrs_for` per-slug R-22-1 carry-over.
6. **product-card + option-picker build** (pending Bean's 6 decisions).

## Next Session Prompt
See `.claude/next-session-prompt.md` — updated to the SHIPPED+VERIFIED state + the remaining priorities; STOP catalogue #1-#32 + reading list + ritual preserved verbatim (D101). decisions D130-D132 carry the full record.
