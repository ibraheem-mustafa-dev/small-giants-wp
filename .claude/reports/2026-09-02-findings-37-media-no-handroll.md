# Detector findings — 37 — Hand-rolled media control

**Rule:** `37-media-no-handroll`
**Updated:** 2026-09-02 AFTER the media-context gate landed (commit `06497afac`).

**Problem:** A block hand-writes a media CSS property or declares a media-shaped attribute without adopting `supports.sgs.mediaElements`, instead of using the shared media-atom layer.

**Effect:** One-off media handling per block, duplicating what the shared atom system provides.

**Count now: 71** (was 77). The `direct-css-write` half is now gated on the enclosing CSS selector actually being a media element, which cleared 7 false positives; one was then restored on review (`sgs/container`'s Ken-Burns rule genuinely animates a background image).

## Your call

- [ ] Continue the atom-migration rollout
- [ ] Park

**Menu:** `sgs/media` and `sgs/before-after` already migrated (D817/D821). This is the tracked remaining backlog — real work, not detector noise.

---

## Direct CSS write (hand-rolled property) — 28

### sgs/cta-section (4)

- CSS property `background-size` — `plugins/sgs-blocks/src/blocks/cta-section/render.php`
- CSS property `background-position` — `plugins/sgs-blocks/src/blocks/cta-section/render.php`
- CSS property `background-size` — `plugins/sgs-blocks/src/blocks/cta-section/style.css`
- CSS property `background-position` — `plugins/sgs-blocks/src/blocks/cta-section/style.css`

### sgs/container (2)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/container/style.css`
- CSS property `background-size` — `plugins/sgs-blocks/src/blocks/container/style.css`

### sgs/mega-panel (2)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/mega-panel/render.php`
- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/mega-panel/style.css`

### sgs/nav-drawer (2)

- CSS property `background-size` — `plugins/sgs-blocks/src/blocks/nav-drawer/render.php`
- CSS property `background-position` — `plugins/sgs-blocks/src/blocks/nav-drawer/render.php`

### sgs/product-card (2)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/product-card/style.css`
- CSS property `object-position` — `plugins/sgs-blocks/src/blocks/product-card/style.css`

### sgs/trust-bar (2)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/trust-bar/render.php`
- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/trust-bar/style.css`

### sgs/brand-strip (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/brand-strip/style.css`

### sgs/buybox (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/buybox/style.css`

### sgs/card-grid (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/card-grid/style.css`

### sgs/cart (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/cart/style.css`

### sgs/gallery (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/gallery/style.css`

### sgs/google-reviews (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/google-reviews/style.css`

### sgs/image-sequence (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/image-sequence/style.css`

### sgs/info-box (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/info-box/style.css`

### sgs/mega-aside (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/mega-aside/style.css`

### sgs/option-picker (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/option-picker/style.css`

### sgs/post-grid (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/post-grid/style.css`

### sgs/product-search (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/product-search/style.css`

### sgs/team-member (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/team-member/style.css`

### sgs/testimonial (1)

- CSS property `object-fit` — `plugins/sgs-blocks/src/blocks/testimonial/style.css`

## Declared without mediaElements support — 43

### sgs/trust-bar (7)

- attribute `badgeImageObjectFit` — `plugins/sgs-blocks/src/blocks/trust-bar/block.json`
- attribute `backgroundOverlayColour` — `plugins/sgs-blocks/src/blocks/trust-bar/block.json`
- attribute `backgroundOverlayOpacity` — `plugins/sgs-blocks/src/blocks/trust-bar/block.json`
- attribute `backgroundOverlayOpacityTablet` — `plugins/sgs-blocks/src/blocks/trust-bar/block.json`
- attribute `backgroundOverlayOpacityMobile` — `plugins/sgs-blocks/src/blocks/trust-bar/block.json`
- attribute `backgroundOverlayColourHover` — `plugins/sgs-blocks/src/blocks/trust-bar/block.json`
- attribute `backgroundOverlayBlendMode` — `plugins/sgs-blocks/src/blocks/trust-bar/block.json`

### sgs/container (6)

- attribute `backgroundOverlayColour` — `plugins/sgs-blocks/src/blocks/container/block.json`
- attribute `backgroundOverlayOpacity` — `plugins/sgs-blocks/src/blocks/container/block.json`
- attribute `backgroundOverlayOpacityTablet` — `plugins/sgs-blocks/src/blocks/container/block.json`
- attribute `backgroundOverlayOpacityMobile` — `plugins/sgs-blocks/src/blocks/container/block.json`
- attribute `backgroundOverlayColourHover` — `plugins/sgs-blocks/src/blocks/container/block.json`
- attribute `backgroundOverlayBlendMode` — `plugins/sgs-blocks/src/blocks/container/block.json`

### sgs/cta-section (6)

- attribute `backgroundOverlayColour` — `plugins/sgs-blocks/src/blocks/cta-section/block.json`
- attribute `backgroundOverlayOpacity` — `plugins/sgs-blocks/src/blocks/cta-section/block.json`
- attribute `backgroundOverlayOpacityTablet` — `plugins/sgs-blocks/src/blocks/cta-section/block.json`
- attribute `backgroundOverlayOpacityMobile` — `plugins/sgs-blocks/src/blocks/cta-section/block.json`
- attribute `backgroundOverlayColourHover` — `plugins/sgs-blocks/src/blocks/cta-section/block.json`
- attribute `backgroundOverlayBlendMode` — `plugins/sgs-blocks/src/blocks/cta-section/block.json`

### sgs/multi-button (6)

- attribute `backgroundOverlayColour` — `plugins/sgs-blocks/src/blocks/multi-button/block.json`
- attribute `backgroundOverlayOpacity` — `plugins/sgs-blocks/src/blocks/multi-button/block.json`
- attribute `backgroundOverlayOpacityTablet` — `plugins/sgs-blocks/src/blocks/multi-button/block.json`
- attribute `backgroundOverlayOpacityMobile` — `plugins/sgs-blocks/src/blocks/multi-button/block.json`
- attribute `backgroundOverlayColourHover` — `plugins/sgs-blocks/src/blocks/multi-button/block.json`
- attribute `backgroundOverlayBlendMode` — `plugins/sgs-blocks/src/blocks/multi-button/block.json`

### sgs/physics-canvas (6)

- attribute `backgroundOverlayColour` — `plugins/sgs-blocks/src/blocks/physics-canvas/block.json`
- attribute `backgroundOverlayOpacity` — `plugins/sgs-blocks/src/blocks/physics-canvas/block.json`
- attribute `backgroundOverlayOpacityTablet` — `plugins/sgs-blocks/src/blocks/physics-canvas/block.json`
- attribute `backgroundOverlayOpacityMobile` — `plugins/sgs-blocks/src/blocks/physics-canvas/block.json`
- attribute `backgroundOverlayColourHover` — `plugins/sgs-blocks/src/blocks/physics-canvas/block.json`
- attribute `backgroundOverlayBlendMode` — `plugins/sgs-blocks/src/blocks/physics-canvas/block.json`

### sgs/site-footer (6)

- attribute `backgroundOverlayColour` — `plugins/sgs-blocks/src/blocks/site-footer/block.json`
- attribute `backgroundOverlayOpacity` — `plugins/sgs-blocks/src/blocks/site-footer/block.json`
- attribute `backgroundOverlayOpacityTablet` — `plugins/sgs-blocks/src/blocks/site-footer/block.json`
- attribute `backgroundOverlayOpacityMobile` — `plugins/sgs-blocks/src/blocks/site-footer/block.json`
- attribute `backgroundOverlayColourHover` — `plugins/sgs-blocks/src/blocks/site-footer/block.json`
- attribute `backgroundOverlayBlendMode` — `plugins/sgs-blocks/src/blocks/site-footer/block.json`

### sgs/site-header (6)

- attribute `backgroundOverlayColour` — `plugins/sgs-blocks/src/blocks/site-header/block.json`
- attribute `backgroundOverlayOpacity` — `plugins/sgs-blocks/src/blocks/site-header/block.json`
- attribute `backgroundOverlayOpacityTablet` — `plugins/sgs-blocks/src/blocks/site-header/block.json`
- attribute `backgroundOverlayOpacityMobile` — `plugins/sgs-blocks/src/blocks/site-header/block.json`
- attribute `backgroundOverlayColourHover` — `plugins/sgs-blocks/src/blocks/site-header/block.json`
- attribute `backgroundOverlayBlendMode` — `plugins/sgs-blocks/src/blocks/site-header/block.json`

