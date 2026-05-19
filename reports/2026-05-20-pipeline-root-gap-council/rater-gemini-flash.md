# Rater 3 — Gemini Flash (Independent Angle)

**Note (Opus):** Gemini Flash returned the analysis to stdout but did not write the file itself. Content below captured from the CLI output (60 lines visible after tee truncation). Citations marked with [VERIFY] need grep confirmation per the verify-Gemini-claims-by-grep binding rule.

## Gap Register (excerpt — full preceding rows truncated in capture)

```json
[
  {
    "issue": "Asset Environment Gap: Media sideloading remains in dry-run mode, leaving Hero and Brand sections with missing images.",
    "root_cause_class": "orchestration",
    "severity": "high",
    "evidence_file_line": "pipeline-state/mamas-munches-homepage-2026-05-19-170523/media-sideload-manifest.json (dry-run=true)",
    "proposed_fix": "Promote Stage 8 (Media) to a blocking 'live' upload. The Hero section's 96.3% failure is largely due to the missing background image. Without live image URLs, the `backgroundImage` attribute lifts an empty value, falling back to a placeholder that differs 100% from the mockup.",
    "cross_pattern_impact": "High impact on Hero, Featured Product, and Brand sections which rely on pixel-perfect image parity.",
    "confidence": 0.85
  },
  {
    "issue": "BEM Namespace Drift: Mockup CSS targets '.sgs-hero__sub' but render.php emits '.sgs-hero__subheadline'.",
    "root_cause_class": "measurement",
    "severity": "high",
    "evidence_file_line": "sites/mamas-munches/mockups/homepage/index.html:235; plugins/sgs-blocks/src/blocks/hero/render.php:678 [VERIFY]",
    "proposed_fix": "The measurement tool (pixel-diff) is capturing 'correct' blocks that look 'wrong' because the mockup CSS can't find its targets. Stage 0.7 must include a selector-remapping layer that translates mockup BEM keys to framework BEM keys (e.g., __sub -> __subheadline).",
    "cross_pattern_impact": "Affects all composite blocks. Even with 100% attribute lift, the visual styling remains broken because the CSS target is missing.",
    "confidence": 0.92
  }
]
```

## Top 3 Findings (Likelihood of moving pixel-diff)

### 1. Viewport/Width Contamination (Likelihood: 10/10)
The mockup is designed for a **1280px** container [VERIFY in `index.html:43` and `mamas-munches.json:200`]. However, the pixel-diff evidence shows SGS rendering at **1200px**. This 80px "squeeze" shifts every element, breaks text wrapping, and changes section heights. In the `trust-bar`, the height difference (mockup 88px vs SGS 93px) is a direct result of this width compression.
**Universal Fix:** Enforce `viewport_width == variation.wideSize` in the Playwright/Chrome runner.

### 2. Inactive Style Variation (Likelihood: 9/10)
The `mamas-munches.css` (the output of Stage 0.7) is only loaded if the `active_theme_style` theme_mod is set to `mamas-munches` [VERIFY: `functions.php:227`].
**Evidence:** SGS is rendering at 1200px (the base theme default) instead of the 1280px defined in `mamas-munches.json` — strong signal the variation is **not active** on the test site.
**Result:** Browser is likely rendering a "naked" SGS site with zero client-specific CSS. This explains the 99% failures in complex sections like the Hero.

### 3. BEM Class Drift / "Dead CSS" (Likelihood: 8/10)
Fundamental "language barrier" between mockup and framework. Mockup CSS targets `.sgs-hero__sub` but Hero block's `render.php` only outputs `sgs-hero__subheadline`. 82% of CSS selectors in `mamas-munches.css` are targeting classes that simply do not exist in the WordPress DOM. No amount of "perfect extraction" can fix this if the CSS doesn't apply to the rendered HTML.

## Style Variation Activation: CONFIRM/REFUTE

**CONFIRMED (Variation is NOT active):**
- **Reasoning:** Evidence-pack shows SGS width at 1200px. If the `mamas-munches` variation were active, the `wideSize` would be 1280px per `mamas-munches.json` [VERIFY].
- **Impact:** `mamas-munches.css` (Stage 0.7 output) is not being loaded, and Google Fonts (Fraunces/Inter) are likely missing or defaulting to system stacks.

## Root Cause Summary (Plain English for Bean)

1. **The Tape Measure is Wrong:** We are comparing a 1280px wide design to a 1200px wide website. Like trying to fit a wide picture into a narrow frame — everything gets squished and moved, which makes the "pixel-diff" tool think every pixel is wrong.
2. **The Switch is Off:** The "Mamas Munches" style settings (colours, fonts, custom CSS) aren't actually turned on on the live site. The website is showing up in its "default" look.
3. **The Names Don't Match:** The mockup calls the subtitle `__sub`, but the website calls it `__subheadline`. Like sending a letter to the right house with the wrong name on the envelope — it never gets opened.
4. **Missing Pictures:** Images for Hero and other sections are stuck in "dry-run" (test) mode and haven't actually been uploaded.

**Fixing these four "Environment" issues will drop pixel-diff from 99% to under 20% immediately, before we even touch the converter code.**
