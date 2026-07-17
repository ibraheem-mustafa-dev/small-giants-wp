# P1B Regression — Rater C: Pixel-Diff Per-Cell Forensics

**Rater angle:** pixel-diff forensics (dimension shifts, heatmap analysis, CSS root-cause)  
**Evidence base:** diff.json × 5 snapshot dirs + heatmap.png comparison + mamas-munches.css audit  
**Date:** 2026-05-20

---

## Root Cause (Lead Finding)

The P1B regression is caused by a **CSS specificity inversion** introduced by the four-destination router (commit `05fb38a4`). The D2 base rules were correctly scoped to `.page-id-144`, but the responsive `@media` overrides were emitted **unscoped** — identical to D0 rules. This means at any breakpoint where a `@media` rule should override a base rule, the scoped base rule wins because `.page-id-144 .sgs-X` has specificity (0,2,0) while `.sgs-X` inside `@media` has specificity (0,1,0). The override never fires.

Confirmed: the regression was fully present in `pixel-diff-post-P1B-no-dedup` (captured at 23:47 UTC), proving it is not a dedup artefact — it is a routing artefact.

---

## Per-Cell Delta Table

| Cell | P1A SGS height | P1B SGS height | Δ height | P1A mismatch% | P1B mismatch% | Δ pts | Visual cause |
|------|---------------|---------------|---------|--------------|--------------|-------|-------------|
| brand-1440x900 | 679px | 679px | 0px | 43.71% | 68.50% | **+24.8** | Image column order inverted (image pinned left by `order:-1`, cannot be overridden) |
| brand-768x1024 | 828px | 828px | 0px | 47.76% | 64.15% | **+16.4** | Same order inversion, compound with text-column layout shift at 768px |
| social-proof-1440x900 | 576px | 668px | +92px | 57.17% | 70.74% | **+13.6** | Section grew taller; testimonial slider stayed 1-col instead of switching to 3-col grid (unscoped `@media 640px { .sgs-testimonial-slider { grid-template-columns: repeat(3,1fr) } }` overridden by scoped base) |
| hero-1440x900 | 761px | 521px | **-240px** | 67.84% | 78.02% | **+10.2** | Desktop hero image collapsed to `display:none` — unscoped `@media 768px { .sgs-hero__split-image--desktop { display:block } }` loses to scoped `.page-id-144 .sgs-hero__split-image--desktop { display:none }` |
| social-proof-768x1024 | 576px | 667px | +91px | 73.67% | 83.74% | **+10.1** | Same 1-col testimonial lock as 1440; section height inflates because stacked cards overflow |
| featured-768x1024 | 804px | 794px | -10px | 58.75% | 63.84% | **+5.1** | Product grid locked to 1-col (unscoped `@media 768px { .sgs-products { grid-template-columns: 5fr 3fr } }` overridden); secondary-card falls below primary |

All dimension data sourced from `diff.json` fields `sgs_dimensions`, `aligned_dimensions`, `mismatch_percent`.

---

## Top 3 Regressions by Severity

### 1. Brand section — image order inversion (brand-1440: +24.8pt, brand-768: +16.4pt)

**Post-C heatmap:** left half sparse mismatches (text overlay), right half dense image noise — image is on the RIGHT (correct).  
**Post-P1B heatmap:** both halves are solid red blocks — image has moved to LEFT, text column visible separately on right. The entire two-column layout is mirrored versus the mockup.

**Evidence in sgs.png:** post-P1A shows text LEFT / image RIGHT. Post-P1B shows image LEFT / text RIGHT.

**CSS cause:**
- Line 109: `.page-id-144 .sgs-brand__image { ... order: -1 }` — specificity (0,2,0)  
- Line 112: `@media (min-width: 768px) { .sgs-brand__image { order: 0; max-height: 440px; height: 440px } }` — specificity (0,1,0)  

At 1440px, the base scoped rule (higher specificity) wins. `order:-1` persists. Image is pinned to grid position 0 (first), pushing text column right. The `height: 440px` also fails to apply, so the image height falls back to `max-height: 380px` from the base rule.

**Fix:** scope the `@media` override to `.page-id-144 .sgs-brand__image` (or raise its specificity to match).

---

### 2. Hero section — desktop image invisible, section collapses (hero-1440: +10.2pt)

**Post-C heatmap:** right half is dense image noise (cookie photo visible) with a full-width header nav bar at top. Hero was 761px tall.  
**Post-P1B heatmap:** right half is near-solid red but faint image ghosts visible. The hero section shrunk to 521px; the page title "RC-Fix Verification" is now visible above the hero in the SGS screenshot, indicating the hero lost ~240px of height. The left content column slipped downward, the header nav wrapped to 3 rows.

**Evidence in sgs.png:** post-P1A shows the split-image (cookies) filling the full right column. Post-P1B shows a flat pink background — the desktop image is hidden.

**CSS cause:**
- Line 61: `.page-id-144 .sgs-hero__split-image--desktop { display: none }` — specificity (0,2,0)  
- Line 68: `@media (min-width: 768px) { .sgs-hero__split-image--desktop { display: block; height: 100%; ... } }` — specificity (0,1,0)  

At 1440px the scoped `display:none` wins. Desktop image never renders. Without an image in the media grid area, `min-height:520px` on the hero (line 65, also unscoped) also fails to apply — the hero collapses to content height only (~521px).

Same pattern fires on 7 further hero `@media` rules (lines 65–74): `grid-template-columns`, `min-height`, `padding`, `font-size`, `flex-direction` on CTAs — all lost.

**Fix:** scope lines 65–74 to `.page-id-144 .sgs-hero` / `.page-id-144 .sgs-hero__*`.

---

### 3. Social-proof — testimonial slider locked to 1-col (social-proof-1440: +13.6pt, social-proof-768: +10.1pt)

**Post-C heatmap (1440):** three testimonial card columns visible; sparse mismatches concentrated on colour/typography differences. SGS was 576px tall.  
**Post-P1B heatmap (1440):** all three card positions are solid red blocks (cards stacked vertically, not side-by-side). Section grew to 668px because of stacking. Aligned region shrank from 533px to 333px (200px loss) because SGS gained height the mockup does not have.

**Evidence in sgs.png:** post-P1A shows three testimonial cards side-by-side. Post-P1B shows a single-card slider view — the 3-column grid rule never fired.

**CSS cause:**
- Line 150: `.page-id-144 .sgs-testimonial-slider { display: grid; grid-template-columns: 1fr; gap: 12px }` — specificity (0,2,0)  
- Line 155: `@media (min-width: 640px) { .sgs-testimonial-slider { grid-template-columns: repeat(3, 1fr) } }` — specificity (0,1,0)  

At 1440px and 768px the scoped 1-column rule wins.

**Fix:** scope line 155 to `.page-id-144 .sgs-testimonial-slider`.

---

## Likely CSS-Rule-Level Causes — Full List

| mamas-munches.css line | Unscoped @media rule | Scoped base overriding it | Effect |
|---|---|---|---|
| 65 | `.sgs-hero { grid-template-columns: 1fr 1fr; min-height: 520px }` | line 56 `.page-id-144 .sgs-hero { grid-template-columns: 1fr }` | Hero stays 1-col at 768px+ → no side-by-side |
| 68 | `.sgs-hero__split-image--desktop { display: block }` | line 61 `.page-id-144 .sgs-hero__split-image--desktop { display: none }` | **Desktop image invisible → hero collapses** |
| 112 | `.sgs-brand__image { order: 0; height: 440px }` | line 109 `.page-id-144 .sgs-brand__image { order: -1 }` | **Image order inverted — brand layout mirrored** |
| 105 | `.sgs-products { grid-template-columns: 5fr 3fr }` | line 90 `.page-id-144 .sgs-products { grid-template-columns: 1fr }` | Products stay stacked at 768px |
| 155 | `.sgs-testimonial-slider { grid-template-columns: repeat(3,1fr) }` | line 150 `.page-id-144 .sgs-testimonial-slider { grid-template-columns: 1fr }` | **Testimonials stay 1-col → section grows taller** |
| 111 | `.sgs-brand { grid-template-columns: 1fr 1fr }` | line 107 `.page-id-144 .sgs-brand { grid-template-columns: 1fr }` | Brand stays 1-col (amplifies order issue) |

---

## Recommended Fixes

**Fix 1 (covers all regressions): Scope every `@media` rule inside D2 to `.page-id-N`.**

The css_router.py D2 emission loop scopes base rules correctly via `f".page-id-{page_id} {selector}"` but does not apply the same transform to rules inside `@media` blocks. The fix is a single change in css_router.py: when emitting a D2 `@media` block, prefix each selector inside the block with `.page-id-{page_id}`.

Expected result: all 6 cells return to P1A mismatch levels (brand-1440: 43.7%, hero-1440: 67.8%, etc.).

**Fix 2 (belt-and-braces): Add a css_router regression test.**

After applying Fix 1, verify that `@media (min-width: 768px) { .sgs-brand__image { order: 0 } }` is emitted as `@media (min-width: 768px) { .page-id-144 .sgs-brand__image { order: 0 } }`. Add this as a unit test on css_router.py to prevent future regressions.

**Do not change the dedup logic** — confirmed by `pixel-diff-post-P1B-no-dedup` showing identical mismatch% to `pixel-diff/` — dedup is not the cause.

---

*Evidence files: `pixel-diff-post-P1A-patched/*/diff.json`, `pixel-diff-post-P1B-no-dedup/*/diff.json`, `pixel-diff/*/diff.json`, heatmap.png visual comparison, `theme/sgs-theme/styles/mamas-munches.css` lines 56–175.*
