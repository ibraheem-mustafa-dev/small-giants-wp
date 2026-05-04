# Hero PoC — QC report (measured deltas vs Mama's mockup)

**Date:** 2026-05-04
**Mockup:** `sites/mamas-munches/mockups/homepage/index.html` lines 245-313
**SGS render:** sandybrown post 29 (`https://sandybrown-nightingale-600381.hostingersite.com/?page_id=29`)
**Viewports measured:** 1440px desktop, 375px mobile
**Screenshots:** `qc-mockup-1440-hero.png`, `qc-sgs-1440-hero.png`, `hero-poc-FINAL2-1440.png`, `hero-poc-FINAL4-375.png` (mobile)

## Verdict

**FAIL — pixel-faithful clone NOT achieved.** 13 measured deltas at 1440, 6 at 375. Several are critical (text colour wrong on buttons — accessibility + brand fidelity) and several are recogniser blind spots (1280px+ tier rules silently dropped, inline styles on mockup HTML never extracted).

The PoC validated the architecture (recogniser → block markup → render works end-to-end), but the visual fidelity gate didn't close. This is the same failure mode as the original PoC — declared "done" based on structure, not on measured visual match.

---

## Critical (brand fidelity / accessibility)

| # | Element | Property | Mockup | SGS | Δ | Cause | Severity |
|---|---------|----------|--------|-----|---|-------|----------|
| C1 | `.sgs-button.is-style-primary` | text colour | `rgb(58, 46, 38)` charcoal | `rgb(255, 255, 255)` white | wrong | Mama's `theme.json buttonPresets.primary.text = "#ffffff"`. Mockup uses charcoal text on coral. | Major — wrong brand colour, also affects WCAG contrast (charcoal/coral 4.7:1 vs white/coral 2.5:1) |
| C2 | `.sgs-button.is-style-secondary` | text colour | `rgb(58, 46, 38)` charcoal | `rgb(230, 138, 149)` coral | wrong | Mama's `buttonPresets.secondary.text = var(--wp--preset--color--primary)`. Mockup uses charcoal text on transparent + coral border. | Major — same. Coral-on-pink is sub-AA contrast. |
| C3 | `.sgs-hero__headline` | font-size at 1440 | 52px | 46px | -6px | Mockup mixes CSS rule `46px` with inline `style="font-size:52px"` on the `.hero-desktop h1` element. Recogniser reads CSS rules only; never sees the inline override. Same breakpoint also has `.hero-copy h1 { font-size: 58px }` in `@media (min-width: 1280px)` — also missed. | Major — headline is the primary visual element |
| C4 | `.sgs-hero__content` (`.hero-copy` in mockup) | padding at 1440 | `72px 64px` | `56px 48px` | wrong | Mockup uses `.hero-copy { padding: 56px 48px }` at base + `.hero-copy { padding: 72px 64px }` at `(min-width: 1280px)`. Recogniser only extracted base value. Same blind spot as C3. | Major — affects content density at desktop |
| C5 | `.sgs-hero__content` | background | transparent | transparent | wrong | Mockup has `.hero-copy { background: var(--surface-pink) }` so the content panel matches the hero outer. SGS only sets bg on the hero outer wrapper. When content has its own bg, it's a defence against parent bg fallback; visually identical here BUT structurally different. | Minor — visual match identical, structural mismatch only |
| C6 | `.sgs-hero__content` | max-width | none | `780px` | extra | SGS adds `max-width: 780px` to `.sgs-hero__content` from a framework default. Mockup has no max-width. At 1440 with `padding: 56px 48px`, both would render the same width — but the constraint is foreign to the mockup. | Minor — visual same at this viewport, framework leak |

---

## Important (typography rhythm / sizing)

| # | Element | Property | Mockup | SGS | Δ | Cause | Severity |
|---|---------|----------|--------|-----|---|-------|----------|
| I1 | `.sgs-hero__headline` | line-height | 59.8px (1.15) | 50.6px (1.1) | -9.2px | Mama's variation `styles.elements.h1.typography.lineHeight = 1.2` was changed to `1.1` somewhere; mockup uses 1.15. Theme.json elements.h1 needs `lineHeight: 1.15`. | Important |
| I2 | `.sgs-hero__headline` | margin-bottom | 16px | 10.72px | -5px | Mama's variation `elements.h1` likely sets margin via `em` or theme spacing token; SGS resolves to 10.72px not 16px. | Important |
| I3 | `.sgs-hero__subheadline` | font-weight | 400 | 500 | wrong | Mama's variation default body fontWeight is 500; mockup sub uses 400. The sub-headline isn't picking up subHeadlineFontWeight (recogniser didn't extract — mockup CSS doesn't specify sub font-weight, defaults to body). | Important |
| I4 | `.sgs-hero__subheadline` | margin-bottom | 28px | 16px | -12px | Sub uses default block spacing token, mockup explicitly sets 28px. Need sub-margin-bottom block attribute (currently missing). | Important |
| I5 | `.sgs-hero__label` | line-height | 19.2px (1.6) | 14.4px (1.2) | -4.8px | block.json default for `labelLineHeight` is 1.2, mockup uses 1.6. Recogniser missed because mockup's `.section-label` rule has `line-height: 1.2` BUT `display: block` causes it to inherit body line-height — actual computed is 1.6 from inheritance, not from the rule. The rule says 1.2 but it's not the active value. Recogniser extracted the rule value (1.2) instead of the computed value. | Important — content rhythm off |

---

## Layout / sizing (1440)

| # | Element | Property | Mockup | SGS | Δ | Cause | Severity |
|---|---------|----------|--------|-----|---|-------|----------|
| L1 | hero | height | 713px | 769px | +56px | Combined effect of C4 (padding too small forces content to be more compact) and content not filling min-height | Important |
| L2 | hero | grid columns | `712.5px 712.5px` | `696.5px 696.5px` | -16/col | Hero has parent margin on SGS site (admin bar?). Visual difference negligible. | Minor |
| L3 | photo wrapper | height | 713px | 697px | -16px | Same as L2 | Minor |
| L4 | desktop image | height | 713px | 697px | -16px | Image fills wrapper; same as L3 | Minor |

---

## Mobile (375)

| # | Element | Property | Mockup | SGS | Δ | Cause | Severity |
|---|---------|----------|--------|-----|---|-------|----------|
| M1 | `.sgs-hero__content` | padding at 375 | `28px 20px 40px` | `56px 48px` | wrong | Mockup uses `.hero-content { padding: 28px 20px 40px }` for mobile. SGS uses desktop `contentPadding 56/48` because `contentPaddingTop/Right/Bottom/LeftMobile` weren't extracted from the mockup OR the inline-style override is winning. Actually, looking at extractor output: contentPaddingTopMobile=28, RightMobile=20, BottomMobile=40, LeftMobile=20 — these WERE extracted. So they ARE in the markup. But render measurement at 375 shows `56px 48px`. **Bug in render.php — mobile content padding inline-style isn't winning over desktop**. | Major |
| M2 | `.sgs-hero__subheadline` | font-size at 375 | 16px | 18px | +2px | Mockup uses `.hero-content .hero-sub { font-size: 16px }` at mobile. SGS uses desktop value. Mobile sub font-size override (`subHeadlineFontSizeMobile: "16px"`) is in the markup but not winning. Same render.php inline-vs-mobile-override bug as M1. | Important |
| M3 | `.sgs-hero__subheadline` | margin-bottom at 375 | 24px | 16px | -8px | Same root cause as I4 (sub-margin not configurable) | Important |
| M4 | `.sgs-hero__headline` | margin-bottom at 375 | 14px | 10.72px | -3.28px | Mama's variation default at mobile, mockup explicit | Important |
| M5 | btnP | height at 375 | 56px | 50px | -6px | Mockup uses `.btn { min-height: 48px }` BUT padding `14px 24px` + line-height makes it 56px effective. SGS uses 50px. Off by exactly the line-height difference. | Minor |
| M6 | btnP/btnS text colour | charcoal vs white/coral | charcoal | white/coral | Same as C1/C2 | Major (same bug at mobile) |

---

## Recogniser blind spots (root causes for several deltas)

The recogniser-v2 extracts CSS rules but misses these signal types:

1. **Inline `style="..."` on mockup elements.** The mockup `.hero-desktop h1` has `style="font-family:'Fraunces',serif;font-size:52px;font-weight:700;color:var(--text);line-height:1.15;margin-bottom:16px;letter-spacing:-1px"`. Same on `.hero-desktop .hero-sub`. None of these inline styles are extracted. They override the CSS rules, so the visible mockup uses the inline values, not the CSS values. **Fix:** recogniser should read `getComputedStyle()` of each target element via Playwright OR parse inline `style=` attrs from BS4.

2. **`@media (min-width: 1280px)` and other large-desktop tiers.** The recogniser only handles base + tablet + mobile. Mockup has 1280px overrides (h1 → 58px, padding → 72px 64px) that are silently dropped. **Fix:** add a "large-desktop" breakpoint tier to block.json + render.php + recogniser. OR consume these values when extracting at 1440 (since 1440 is in the 1280+ tier on the mockup).

3. **Computed-style vs declared-style.** When a rule says `line-height: 1.2` but the element inherits `1.6` from a parent, the recogniser extracts the declared value. The visible value is the inherited one. **Fix:** use `getComputedStyle()` inside Playwright instead of CSS-rule parsing, OR resolve cascade in BS4.

---

## Mama's variation gaps (separate from recogniser)

Independent of the recogniser, the Mama's variation buttonPresets are wrong vs the mockup:

- `buttonPresets.primary.text` should be `var(--wp--preset--color--text)` (charcoal), currently `#ffffff`
- `buttonPresets.secondary.text` should be `var(--wp--preset--color--text)` (charcoal), currently `var(--wp--preset--color--primary)` (coral)
- `buttonPresets.primary.hover-background` and `secondary.hover-background` may need re-checking against the mockup hover declarations

These don't need framework fixes — just edit `theme/sgs-theme/styles/mamas-munches.json`.

## Framework gaps revealed

1. **`subHeadlineMarginBottom` attribute missing.** Sub-headline spacing isn't configurable per-instance. Add to block.json + render.php.
2. **Render.php mobile-attribute precedence bug.** Inline desktop style on `.sgs-hero__content` element wins over `@media (max-width:767px)` rule in scoped CSS. Same issue as the splitColumnRatio fix earlier today, but for `padding`. Need `!important` on mobile content-padding overrides OR move desktop padding to scoped CSS @media (min-width:768px) instead of inline style.
3. **Hero element max-width: 780px on `.sgs-hero__content`** — leaks from somewhere in style.css or theme.json. Find and remove (mockup has no max-width).

---

## Severity breakdown

| Severity | Count | Items |
|----------|-------|-------|
| Major | 7 | C1, C2, C3, C4, M1, M2, M6 |
| Important | 9 | I1, I2, I3, I4, I5, L1, M3, M4, secondary occurrences |
| Minor | 5 | C5, C6, L2, L3, L4, M5 |

Visual-fidelity match: ~70% structural, ~50% pixel-accurate. The PoC clearly demonstrates the architecture works but did NOT achieve pixel-faithful clone. To close the gap to ≥95%, all Major issues must be fixed.

## Action plan

### Quick wins (~30 min, no architecture change)
- Fix Mama's variation buttonPresets text colours (C1, C2, M6) — 1 JSON edit
- Find and remove the framework max-width leak on `.sgs-hero__content` (C6) — style.css edit
- Add `!important` to mobile content-padding @media rule in render.php (M1, M2)

### Framework additions (~1h)
- Add `subHeadlineMarginBottom` + `subHeadlineMarginBottomMobile` attributes (I4, M3)
- Add `headlineMarginBottom` + `headlineMarginBottomMobile` attributes (I2, M4)
- Add `largeDesktopBreakpoint` support OR rename desktop attrs to be the 1280+ tier
- Fix Mama's `elements.h1.typography.lineHeight` to 1.15 (I1)

### Recogniser improvements (~2-3h)
- Read computed styles via Playwright on target elements rather than CSS rules only (fixes I5 + extracts inline styles too)
- Parse inline `style=` attrs from mockup elements (C3)
- Add 1280+ tier extraction with mapping to new largeDesktop attributes (C4)

### Re-test
- Re-run recogniser, redeploy, re-measure. Target: 0 Major deltas, ≤2 Important.

---

## Files to update

- `theme/sgs-theme/styles/mamas-munches.json` — buttonPresets text colour fix; elements.h1 lineHeight 1.15
- `plugins/sgs-blocks/src/blocks/hero/block.json` — add subHeadlineMarginBottom* + headlineMarginBottom* + (optionally) largeDesktop attrs
- `plugins/sgs-blocks/src/blocks/hero/render.php` — wire new attrs, add !important on mobile content-padding overrides
- `plugins/sgs-blocks/src/blocks/hero/style.css` — find and remove max-width leak on .sgs-hero__content
- `tools/recogniser-v2/extract.py` — computed-style extraction, inline-style parsing, 1280+ tier handling
