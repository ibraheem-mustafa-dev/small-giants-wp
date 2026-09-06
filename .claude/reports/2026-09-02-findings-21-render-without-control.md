# Detector findings — 21 — Rendered but no editor control

**Rule:** `21-render-without-control`
**Updated:** 2026-09-02, twice — once AFTER the dispatcher fix landed (commit `06497afac`), and
again same day after the residual false-positive cluster below was closed.

**Problem:** An attribute is declared in block.json AND consumed by the render surface, but no editor control lets a client set it.

**Effect:** The framework paints a value the client can never change through the UI.

**Residual false-positive cluster — ✅ RESOLVED 2026-09-02.** The 1-argument literal wrapper
shape (`key('VideoLoop')` in `video-behaviour.control.js`, `name(idBase + suffix)` in
`source.control.js`) is now detected structurally: the rule finds local arrow-function wrappers
that thin-forward their own parameter into an already-recognised builder-call shape
(`const key = ( base ) => mediaStoredAttrName( blockSlug, prefix, base )`), then resolves both
direct-literal calls (`key('VideoLoop')`) and the one-hop-further concatenation form
(`name(idBase + suffix)`, tracing `idBase`'s literal values back to its own call sites). This
stays narrow by construction — `__('text')` can never match, because `__` is imported, never
locally defined as that wrapper shape — so it does not reopen the over-suppression risk that
kept this parked. Verified with a before/after live scan: **46 false positives eliminated, zero
new findings introduced.** The cluster turned out to span **three** blocks, not two —
`sgs/before-after` (8) was also affected, alongside `sgs/media` (26) and `sgs/hero` (12).

**Count now: 68 flagged, 0 residual false positives.** Of those, the original **54 real findings
below are unchanged** (re-diffed verbatim against this report's list — every one still present).
The other **14 are newly-appeared findings** on `sgs/hero` (12), `sgs/media` (1) and
`sgs/testimonial-slider` (1) — genuinely new since this report was written on 2026-09-02 (the
framework gained attributes on those blocks in the interim), **unrelated to the residual fix and
not yet triaged** — see the new appendix at the end of this file. Treat them as an addition to
the backlog, not as validated the way the original 54 were.

## Your call

- [x] ~~Also close the 51 residual false positives (needs a second detector fix)~~ — done
- [ ] Fix the 54 real findings below
- [ ] Triage the 14 newly-appeared findings in the appendix (not yet verified against
      decisions.md/specs the way the original 54 were)
- [ ] Park

---

### sgs/heading (8)

- `boxShadow` — plugins/sgs-blocks/src/blocks/heading/block.json
- `boxShadowHover` — plugins/sgs-blocks/src/blocks/heading/block.json
- `scaleHover` — plugins/sgs-blocks/src/blocks/heading/block.json
- `customWidth` — plugins/sgs-blocks/src/blocks/heading/block.json
- `customWidthUnit` — plugins/sgs-blocks/src/blocks/heading/block.json
- `transitionDuration` — plugins/sgs-blocks/src/blocks/heading/block.json
- `transitionEasing` — plugins/sgs-blocks/src/blocks/heading/block.json
- `textWrap` — plugins/sgs-blocks/src/blocks/heading/block.json

### sgs/text (8)

- `boxShadow` — plugins/sgs-blocks/src/blocks/text/block.json
- `boxShadowHover` — plugins/sgs-blocks/src/blocks/text/block.json
- `scaleHover` — plugins/sgs-blocks/src/blocks/text/block.json
- `customWidth` — plugins/sgs-blocks/src/blocks/text/block.json
- `customWidthUnit` — plugins/sgs-blocks/src/blocks/text/block.json
- `inheritStyle` — plugins/sgs-blocks/src/blocks/text/block.json
- `transitionDuration` — plugins/sgs-blocks/src/blocks/text/block.json
- `transitionEasing` — plugins/sgs-blocks/src/blocks/text/block.json

### sgs/card-grid (6)

- `transitionDuration` — plugins/sgs-blocks/src/blocks/card-grid/block.json
- `transitionEasing` — plugins/sgs-blocks/src/blocks/card-grid/block.json
- `scaleHover` — plugins/sgs-blocks/src/blocks/card-grid/block.json
- `imageZoomHover` — plugins/sgs-blocks/src/blocks/card-grid/block.json
- `grayscaleHover` — plugins/sgs-blocks/src/blocks/card-grid/block.json
- `staggerDelay` — plugins/sgs-blocks/src/blocks/card-grid/block.json

### sgs/cta-section (5)

- `body` — plugins/sgs-blocks/src/blocks/cta-section/block.json
- `backgroundColour` — plugins/sgs-blocks/src/blocks/cta-section/block.json
- `backgroundColourHover` — plugins/sgs-blocks/src/blocks/cta-section/block.json
- `transitionDuration` — plugins/sgs-blocks/src/blocks/cta-section/block.json
- `transitionEasing` — plugins/sgs-blocks/src/blocks/cta-section/block.json

### sgs/team-member (5)

- `scaleHover` — plugins/sgs-blocks/src/blocks/team-member/block.json
- `imageZoomHover` — plugins/sgs-blocks/src/blocks/team-member/block.json
- `grayscaleHover` — plugins/sgs-blocks/src/blocks/team-member/block.json
- `transitionDuration` — plugins/sgs-blocks/src/blocks/team-member/block.json
- `transitionEasing` — plugins/sgs-blocks/src/blocks/team-member/block.json

### sgs/info-box (4)

- `transitionDuration` — plugins/sgs-blocks/src/blocks/info-box/block.json
- `transitionEasing` — plugins/sgs-blocks/src/blocks/info-box/block.json
- `scaleHover` — plugins/sgs-blocks/src/blocks/info-box/block.json
- `grayscaleHover` — plugins/sgs-blocks/src/blocks/info-box/block.json

### sgs/site-footer (4)

- `alignContent` — plugins/sgs-blocks/src/blocks/site-footer/block.json
- `flexDirection` — plugins/sgs-blocks/src/blocks/site-footer/block.json
- `flexWrap` — plugins/sgs-blocks/src/blocks/site-footer/block.json
- `tagName` — plugins/sgs-blocks/src/blocks/site-footer/block.json

### sgs/buybox (3)

- `showLadder` — plugins/sgs-blocks/src/blocks/buybox/block.json
- `framingMode` — plugins/sgs-blocks/src/blocks/buybox/block.json
- `decoyEnabled` — plugins/sgs-blocks/src/blocks/buybox/block.json

### sgs/gallery (3)

- `grayscaleHover` — plugins/sgs-blocks/src/blocks/gallery/block.json
- `staggerDelay` — plugins/sgs-blocks/src/blocks/gallery/block.json
- `shadowHover` — plugins/sgs-blocks/src/blocks/gallery/block.json

### sgs/form (2)

- `requireLogin` — plugins/sgs-blocks/src/blocks/form/block.json
- `rateLimit` — plugins/sgs-blocks/src/blocks/form/block.json

### sgs/form-field-file (1)

- `uploadText` — plugins/sgs-blocks/src/blocks/form-field-file/block.json

### sgs/form-field-tiles (1)

- `selectedStyle` — plugins/sgs-blocks/src/blocks/form-field-tiles/block.json

### sgs/icon-list (1)

- `dividers` — plugins/sgs-blocks/src/blocks/icon-list/block.json

### sgs/product-card (1)

- `showPickers` — plugins/sgs-blocks/src/blocks/product-card/block.json

### sgs/testimonial (1)

- `staggerDelay` — plugins/sgs-blocks/src/blocks/testimonial/block.json

### sgs/trustpilot-reviews (1)

- `reviewsAverage` — plugins/sgs-blocks/src/blocks/trustpilot-reviews/block.json

---

## Appendix — 14 newly-appeared findings (2026-09-02, not in the original 54, not yet triaged)

Surfaced only by the live re-scan run to verify the residual fix above — not independently
validated against decisions.md/specs the way the original 54 were. List them here rather than
drop them silently (per this project's own "no skipping" rule).

### sgs/hero (12)

- `splitImageMobile` — plugins/sgs-blocks/src/blocks/hero/block.json
- `borderColourHover` — plugins/sgs-blocks/src/blocks/hero/block.json
- `borderColourHoverGradient` — plugins/sgs-blocks/src/blocks/hero/block.json
- `transitionDuration` — plugins/sgs-blocks/src/blocks/hero/block.json
- `transitionEasing` — plugins/sgs-blocks/src/blocks/hero/block.json
- `alignContent` — plugins/sgs-blocks/src/blocks/hero/block.json
- `justifyContent` — plugins/sgs-blocks/src/blocks/hero/block.json
- `flexDirection` — plugins/sgs-blocks/src/blocks/hero/block.json
- `flexWrap` — plugins/sgs-blocks/src/blocks/hero/block.json
- `gridAutoRows` — plugins/sgs-blocks/src/blocks/hero/block.json
- `gridTemplateRows` — plugins/sgs-blocks/src/blocks/hero/block.json
- `justifyItems` — plugins/sgs-blocks/src/blocks/hero/block.json

### sgs/media (1)

- `captionFontSizeUnit` — plugins/sgs-blocks/src/blocks/media/block.json

### sgs/testimonial-slider (1)

- `testimonials` — plugins/sgs-blocks/src/blocks/testimonial-slider/block.json

