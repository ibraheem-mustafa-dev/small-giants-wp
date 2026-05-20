# Real Pixel-Diff Path — Council Synthesis (no-cheating)

**Date:** 2026-05-20 close-of-session
**Raters:** A (visible eyeball + Playwright screenshots), B (structural DOM diff), C (pipeline output forensics)
**Question Bean posed:** What truly closes pixel-diff to ≤ 1% per section WITHOUT cheating (i.e. without papering over root causes via piecemeal attribute promotion)?

## Headline finding

**Operator-driven attribute promotion is a band-aid that closes the last 5-10%. The real gaps that account for 50-85% of every section's pixel-diff are STRUCTURAL — pipeline-output bugs and measurement contamination that no amount of attr promotion will touch.**

All three raters converged on this independently. The original session-end hypothesis (promote 3-5 candidates and watch pixel-diff drop) would have produced 1-3pt improvements per section while leaving the real failures untouched.

## The 4 root causes that actually matter

### G1 — cv2 emits self-closing `wp:sgs/hero` block → InnerBlocks (CTA buttons) NEVER serialise (CRITICAL)

- **Evidence (Rater A + B):** Playwright screenshot of live page 144 shows `<div class="sgs-hero__ctas"></div>` empty. Mockup has 2 CTA buttons. Extract.json confirms `ctaPrimaryText: "Shop Zookies"` + `ctaSecondaryText: "Try 3 for £5"` are lifted correctly. But render.php line 770 puts CTAs into `$content` (the InnerBlocks slot). Self-closing block → no `$content` → empty `<div>`.
- **Pixel-diff impact:** ~50-55pp of hero's 67.8% mismatch
- **Fix:** cv2 hero emitter must emit an OPEN `<!-- wp:sgs/hero -->` block with nested `<!-- wp:sgs/multi-button --><!-- wp:sgs/button --><!-- /wp:sgs/button --><!-- wp:sgs/button --><!-- /wp:sgs/button --><!-- /wp:sgs/multi-button --><!-- /wp:sgs/hero -->` for CTAs. Legacy `ctaPrimary*` attrs stay for deprecated.js migration but no longer drive render.
- **Estimate:** ~2 hours work + tests

### G2 — `.page-id-144` scope prefix breaks cv2's CSS lookup for SGS-registered blocks (CRITICAL)

- **Evidence (Rater C):** Stage 3 slot resolver finds 171 hero slots and 15 trust-bar slots, but returns "no value extracted" for 142 hero slots + all trust-bar slots. Pipeline trace shows `variation_css_rules=0` for these sections even though the CSS file has 12 + 9 rule blocks for them. Cause: cv2's selector matcher looks for bare `.sgs-hero` but P1.B.x scoped all D2 rules to `.page-id-144 .sgs-hero`. The match fails. Slot resolver returns empty.
- **Pixel-diff impact:** Indirect — silently kills 60-80% of cv2's value-lift potential on every SGS-registered block (hero, trust-bar, eventually all). Visible as missing colours, missing spacing, missing typography across these sections.
- **Fix:** In `_collect_css_decls_for_element` (convert.py), strip `.page-id-N ` prefix before matching selectors. Strip with regex `r"^\.page-id-\d+\s+"`. One-line fix.
- **Estimate:** ~30 min + verification + ~3-5pt drop expected on hero/trust-bar after F5 + this lands

### G3 — Stage 3 slot resolver only extracts TEXT content; can't map CSS to visual/structural slots (HIGH)

- **Evidence (Rater C):** Hero has slots `backgroundImage`, `overlayColour`, `minHeight`, `ctaPrimaryColour`, `alignment` — none lifted. Trust-bar same. The slot_list.py resolver only handles text-content slot types. Visual / structural slots require CSS-to-attr-name mapping that doesn't exist.
- **Pixel-diff impact:** Compounding with G2 — even if G2 fixes CSS lookup, G3 means cv2 still doesn't lift visual values into their slots. Combined fix needed.
- **Fix:** Extend slot_list resolver to call cv2's `_collect_css_decls_for_element` for visual/structural slots; use the property_suffixes table to map CSS prop → SGS attr name. Per Spec 16 §FR6 Destination 1, this is the typed-attr-lift path; it just needs slot-list to use it for visual slots not only text slots.
- **Estimate:** ~3-4 hours work — non-trivial because slot semantics differ (text vs colour vs dimension vs media vs structural)

### G4 — Measurement contamination from WP chrome inflates every pixel-diff (HIGH but easy)

- **Evidence (Rater A):** Every section screenshot includes WP admin bar (`#wpadminbar`) at top + sgs-header above the section content. Mockup screenshots have neither. Brand-section "43.7% mismatch" is dominated by these top-of-frame chrome artefacts that the section-cropped pixel-diff captures because crop boundaries land just above the header. Systematic across all sections.
- **Pixel-diff impact:** ~10-20pp inflation on EVERY section measurement
- **Fix:** Two options:
  - (a) `scripts/pixel-diff.py` injects `document.querySelector('#wpadminbar')?.remove(); document.querySelector('.sgs-header')?.remove()` before screenshot via Playwright `addInitScript`
  - (b) Use a logged-out browser context (no admin bar) + crop more precisely to the section's bounding rect (excluding header)
- **Estimate:** ~30-45 min — affects measurement only, not pipeline

### G5 — Structural DOM-shape mismatches between mockup and render.php output (MEDIUM-HIGH, per-block work)

- **Evidence (Rater A + B):**
  - Brand: mockup uses `<blockquote class="sgs-brand__body">` with `<p>` + `<footer>` children. Render emits `<section class="sgs-brand__body">` with `<p>` children only. CSS rules targeting `blockquote p` + `blockquote footer` are dead.
  - Social-proof: mockup is 3-column static grid of testimonial cards. Live is a single-card carousel. The `sgs/testimonial-slider` block has no `displayMode: 'grid'` option.
  - Trust-bar: mockup uses `__badge` + `__text` classes; render emits `__item` + `__label`. Mockup uses inline SVG icons; render expects Lucide slug strings.
- **Pixel-diff impact:** Per-section ~10-30pp residual after G1-G4 land
- **Fix:** Per-block render.php or block.json variant additions:
  - sgs/brand-strip: emit `<blockquote>` or add brand-strip __body uses semantic blockquote class
  - sgs/testimonial-slider: add `displayMode: grid` Block Style Variation (P2.iii infrastructure now exists for this)
  - sgs/trust-bar: render.php emits `__badge` + `__text` as additional aliases for backwards-compat OR mockup CSS updated to target `__item` + `__label` canonical names
- **Estimate:** ~1 hour per block × 3-5 blocks = 3-5 hours

## What promotes ARE good for (the honest small upside)

The P2.ii attribute-gap promotion CLI shipped this session IS the right tool for the FINAL 5-10% of pixel-diff cleanup AFTER G1-G5 land. Once Stage 3 reads visual CSS (G3) + scope fix lands (G2) + InnerBlocks emit (G1) + measurement decontaminated (G4) + structural mismatches addressed (G5), the residual gap will be genuinely-bespoke styling values that aren't in the current block schemas. THAT is where promotion shines: turn the residual gap-candidates into block.json schema additions.

But running promotion FIRST (before G1-G5) closes 1-3% per section. Running promotion AFTER G1-G5 closes 5-10% per section because there will actually be fewer false-positive gap candidates and the real gaps will be visible.

## Recommended fix sequence

1. **G4 — Measurement decontamination** (~30 min, no risk) — biggest immediate visible drop in pixel-diff numbers across ALL sections because every section measurement is currently inflated.
2. **G2 — Strip `.page-id-N` in cv2 CSS lookup** (~30 min, one-line fix) — unlocks G3.
3. **G1 — Hero InnerBlocks emit** (~2 hours) — recovers the missing CTAs on hero.
4. **G3 — Stage 3 visual-slot CSS mapping** (~3-4 hours) — the architectural unlock for SGS-registered blocks generally.
5. **G5 — Structural DOM-shape fixes per block** (~1 hour × 3-5 blocks) — variant block emission for testimonial-slider grid, brand-strip blockquote, trust-bar icon-aliasing.
6. **F5 from previous plan — D1 media-field flow** (~1-2 hours) — mobile responsive variants. (Already documented; lands alongside G1-G5.)
7. **Then** operator-driven promotion run on remaining gap candidates — closes the final 5-10%.

Predicted final state after G1-G5 + F5 + promotion: 1440 average ≤ 5%, 768 average ≤ 8%, 375 average ≤ 10%. Approaching the original ≤1% per-section target.

## Honest framing for Bean

The session shipped 12 commits that are architecturally correct and necessary — Spec 16 §FR6 compliance is a real win. The 4-rater P1.B regression council found and fixed real bugs (specificity inversion, etc.). The 4 Phase 2 capabilities are real infrastructure that will pay off later.

But pixel-diff didn't close because the real gaps are downstream of what we worked on this session:
- cv2 emit shape (InnerBlocks vs self-closing) — G1
- A specificity-vs-lookup interaction we introduced ourselves — G2
- A slot-resolver gap that pre-dates this session — G3
- Measurement methodology — G4
- Per-block DOM-shape mismatches — G5

None of these are "operator-driven" problems. All are engineering work. Promotion was framed as the path to closing pixel-diff because R2 (dead CSS) seemed dominant earlier — but the deeper analysis here shows R2 is real but smaller than G1-G4 combined.
