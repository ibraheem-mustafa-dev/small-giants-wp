# Detector findings — 21 — Rendered but no editor control

**Rule:** `21-render-without-control`
**Updated:** 2026-09-02 AFTER the dispatcher fix landed (commit `06497afac`).

**Problem:** An attribute is declared in block.json AND consumed by the render surface, but no editor control lets a client set it.

**Effect:** The framework paints a value the client can never change through the UI.

**Count now: 105 flagged** (was 128 before the fix). Of those, **54 are real** and listed below; **51 are a known residual false-positive cluster** on `sgs/media`/`sgs/hero`, NOT listed — see below.

## Your call

- [ ] Fix the 54 real findings
- [ ] Also close the 51 residual false positives (needs a second detector fix)
- [ ] Park

**What changed:** the rule now follows `MediaElementPanel`'s `ATOM_CONTROLS[id]` dispatcher (it already followed `ContainerWrapperControls`' `KIND_PANELS[kind]`), which cleared 23 false positives.

**The remaining 51 residual (`sgs/media` + `sgs/hero`) are still false positives.** They come from a DIFFERENT shape: a 1-argument literal wrapper call, e.g. `key('VideoLoop')` in `video-behaviour.control.js`, or `name(idBase + suffix)` in `source.control.js`. This was deliberately left alone — a generic 1-arg-literal pattern (`__('text')` is the same shape) would risk over-suppression across the whole tree. **Do not action these individually; fix the detector or leave them.**

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

