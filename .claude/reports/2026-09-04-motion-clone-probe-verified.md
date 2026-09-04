# Motion-clone probe (re-run) — fx* attrs now survive cloning

**Date:** 2026-09-04
**Supersedes evidence in:** `.claude/worktrees/agent-aec5c9a0b11ee6dc8/reports/2026-08-01-motion-clone-probe.md` (the original probe; that verdict — "zero of the grammar's attributes survive cloning" — stood until today's three-part fix).
**Mode:** Real pipeline. `converter.entry.convert_section()` run directly against hand-authored SGS-BEM HTML, no deploy. Same method the 2026-08-01 probe used, so results are directly comparable.

## What changed since 2026-08-01 (D949 + D951)

1. **D949 — writer.** `fx*` attrs (`fxTrigger`, `fxPath`, `fxShape`, …) are added to a block's schema entirely client-side via `fx.js`'s `registerBlockType` filter and never appear in any `block.json`, so Stage 1's block.json-driven attribute discovery never created a `block_attributes` row for them. New Stage 1 sub-step seeds the missing rows from `generated-fx-qualifying-blocks.json` (the same eligibility source `fx.js` itself uses). Applied to `sgs-framework.db`: 908 new rows across 32 blocks.
2. **D949 — reader.** `lift_behavioural_attrs`'s `data-sgs-<X>` matching used exact string equality against a kebab-case remainder, which can never equal a camelCase attr name (`fx-trigger` vs `fxTrigger`). Fixed to try both forms.
3. **D951 — the piece D949 missed.** Even with (1) and (2) fixed, a fresh probe run still showed zero fx attrs in the emitted markup. Grepped `converter/` for `lift_behavioural_attrs(` — the only match was the `def` line itself. The function was never called anywhere in the live walker. D949's commit message claimed otherwise, sourced from a docstring comment describing INTENT rather than a verified grep — that claim was wrong and is corrected here. Wired one additive call into `build_block_markup` (`converter/services/assembly.py`, step 3a1), `setdefault`-merged so an explicit variant/CSS/content value still wins on collision.

## Draft 1 — `sgs/cta-section`-shaped (same draft as the original probe)

```html
<section class="sgs-cta-section" data-sgs-fx="split-reveal" data-sgs-fx-trigger="scroll"
     data-sgs-fx-duration="0.6" data-sgs-fx-ease="power2.out">
  <div class="sgs-cta-section__content">
    <h2 class="sgs-cta-section__title">Get started today</h2>
    <p class="sgs-cta-section__text">Some body copy for the CTA.</p>
  </div>
</section>
```

**2026-08-01 result:** `<!-- wp:sgs/cta-section {"align":"full","className":"sgs-test-cta-section"} -->` — all four fx attrs dropped silently.

**2026-09-04 result:**
```
<!-- wp:sgs/cta-section {"align":"full","fx":"split-reveal","fxDuration":"0.6","fxEase":"power2.out","fxTrigger":"scroll","className":"sgs-probe2-cta-section"} -->
<!-- wp:sgs/heading {"content":"Get started today","level":"h2","textWrap":"wrap"} /--><!-- wp:sgs/text {"text":"Some body copy for the CTA."} /-->
<!-- /wp:sgs/cta-section -->
```
All four fx attrs present. Content (`heading`/`text`) still clones correctly — no regression. `content_gaps: []`.

## Draft 2 — `sgs/image-sequence`-shaped, with real content this time

```html
<section class="sgs-image-sequence" data-sgs-fx="scrub" data-sgs-fx-trigger="scroll"
     data-sgs-fx-start="top 80%" data-sgs-fx-end="+=150%" data-sgs-fx-scrub="true"
     data-sgs-fx-pin="true">
  <div class="sgs-image-sequence__canvas">
    <img class="sgs-image-sequence__frame" src="frame1.jpg" alt="">
  </div>
</section>
```

**Result:**
```
<!-- wp:sgs/container {"fx":"scrub","fxEnd":"+=150%","fxPin":"true","fxScrub":"true","fxStart":"top 80%","fxTrigger":"scroll","className":"sgs-probe2-image-sequence"} -->
<!-- wp:sgs/media /-->
<!-- /wp:sgs/container -->
```
BEM recognition resolved this minimal test markup to `sgs/container` + `sgs/media` rather than `sgs/image-sequence` (a recognition-layer detail unrelated to this fix — the test HTML wasn't a full match for image-sequence's real contract). Notably this makes the proof **stronger, not weaker**: all six fx attrs correctly lifted onto whichever block the walker actually resolved, confirming the fix is universal (works via `rec.slug`/`section_root` regardless of which block resolves), not hardcoded to any one slug. The `content_gaps` entry is about the media node having no real image content in this minimal draft — unrelated to fx.

## Verification

- Gate A (converter conformance): 13/13 pass, unchanged.
- Full converter + scripts suite: 837/839 pass — same 2 pre-existing failures as before any of this session's changes (`test_multi_button_has_button`, `test_hero_headline_has_wp_kses_post_on_h1`), confirmed unrelated by reading the actual source files those tests scrape.
- No new gate findings (`cheat-gate`, F5 coverage-conservation, F6 variant-discriminator — all baselined-only, 0 new).

## Verdict

**FR-38-22 (wave-D Step 12, "motion survives a clone") is genuinely closed.** All three pieces — DB rows, kebab-case matching, and the actual wiring into the live walker — are in place and verified against the real `convert_section()` path, not a synthetic unit test in isolation.

## Still open / out of scope for this fix

- Rule 4's skip-with-reason reporting for a `data-sgs-fx-*` attribute that has NO destination on the resolved block (e.g. an effect-specific param on a block that doesn't declare it) — not built. Today such a value is silently absent rather than reported as skipped. Named in the original probe's verdict (item c); not addressed by D949/D951.
- No live-canary deploy was performed — this is pipeline-level proof (`convert_section()` against real code), not a Playwright/live-DOM check on `sandybrown`. Per R-31-13, that step still wants Bean's eye before the client-facing claim is made in the spec.
