# Wave-1 Fact-Finder — Social Proof Batch 2
**Issues:** SP-E, SP-F, SP-G
**Date:** 2026-06-08
**Status:** Fact-complete (see coverage checklist at end)

---

## SP-E — Avatar placeholder "?" shown instead of hiding the image area

**Issue (verbatim):**
"They don't have profile images set so that the block should be able to have the profile image not show instead of leaving a question mark in a circle. Looks very untrustworthy and not consistent with the draft."

---

### DRAFT facts
- Source: `sites/mamas-munches/mockups/homepage/index.html` lines 995–1009
- Each `<article class="sgs-testimonial">` in the draft contains ONLY:
  - `<div class="sgs-testimonial__stars">`
  - `<p class="sgs-testimonial__text">`
  - `<p class="sgs-testimonial__author">`
- **No avatar or profile image element of any kind is present in any of the 3 draft testimonial articles.** No `<img>`, no avatar placeholder, no initials element.
- The draft CSS (lines 641–659) defines `.sgs-testimonial__stars`, `.sgs-testimonial__text`, `.sgs-testimonial__author` — zero rules for any avatar or footer element.

---

### CLONE facts
- Source: `sites/mamas-munches/mockups/homepage/current-clone-page-source.html` lines 1007, 1015, 1023
- All 3 slides contain an identical footer: `<footer class="sgs-testimonial__footer"><div class="sgs-testimonial__avatar"><span class="sgs-testimonial__avatar-initials" aria-hidden="true">?</span></div></footer>`
- The `?` character (literal question mark) is rendered in all 3 slides.
- The testimonial block attributes stored in the block comment carry no `name` attr on the converter-generated posts (the `$attributes['name']` scalar is empty on FR-22-6 InnerBlocks posts — the name is now in InnerBlocks, not the scalar attr).
- No `avatar` or `authorMedia` object is set in any of the 3 emitted testimonial blocks (no image URL present in any of the 3 slide renders).

---

### DB facts
- `sgs/testimonial` block — `block.json` line 70–76: `"avatar": {"type": "object"}` + `"authorMedia": {"type": "object", "default": null}`. Both default to null/absent.
- `block_attributes` table: `attr_name='authorMedia'` default `None`; `attr_name='avatar'` default `None`.

---

### BLOCK/RENDER location facts
- File: `plugins/sgs-blocks/src/blocks/testimonial/render.php`
- Lines 44–46: `$avatar = $attributes['avatar'] ?? null;` / `$author_media = $attributes['authorMedia'] ?? null;`
- Lines 130–161: Avatar rendering logic — three branches:
  1. Line 132–137: if `$author_media['url']` is non-empty → render `sgs_render_media()`
  2. Line 138–143: elseif `$avatar['url']` is non-empty → render `<img>`
  3. Lines 144–160: else → render initials placeholder
     - Line 147: `$name = wp_strip_all_tags( $attributes['name'] ?? '' );`
     - Line 157–159: if `$initials` is empty string → `$initials = '?';`
     - Line 160: `$avatar_inner = '<span class="sgs-testimonial__avatar-initials" aria-hidden="true">' . esc_html( $initials ) . '</span>';`
- Line 163: `$avatar_html = '<div class="sgs-testimonial__avatar">' . $avatar_inner . '</div>';`
- Line 164: `$footer_html = '<footer class="sgs-testimonial__footer">' . $avatar_html . '</footer>';`
- Line 201: `$inner_html = $content . $footer_html . $schema_html;`
- **The footer with avatar is ALWAYS appended to inner_html regardless of whether any image or name is set.** There is no conditional gate that suppresses the `$footer_html` when both `$avatar['url']` and `$author_media['url']` are empty AND `$name` is empty. The `?` fallback fires because: (a) no avatar/authorMedia URL set by the converter; (b) `$attributes['name']` is empty on FR-22-6 InnerBlocks posts (name is now a child InnerBlock `sgs/text`, not the scalar attr).

---

### SPEC/DOC refs
- `plugins/sgs-blocks/src/blocks/testimonial/block.json` line 73: comment `"_comment_authorMedia": "Migrated 2026-05-05 (Gap H-3) — avatar retained for deprecation. New instances should use authorMedia."`
- `plugins/sgs-blocks/src/blocks/testimonial/render.php` line 6 (comment): "The block card shell (wrapper, hover CSS vars, style class, avatar footer) is rendered here."
- `plugins/sgs-blocks/src/blocks/testimonial/render.php` line 146 (comment): "No image — render initials placeholder as decorative fallback. Name comes from scalar attr (legacy) or is empty on new InnerBlocks posts."
- `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` lines 2281–2287: block description "optional avatar" — confirms avatar is optional, no spec text on suppressing the footer entirely.

---

## SP-F — Slide card background colour set to surface token instead of white/transparent

**Issue (verbatim):**
"Each testimonial card has this weird outer colour set via '.sgs-testimonial-slider__slide--card {background: var(--wp--preset--color--surface, #fff} background-color:rgb(251, 243, 220);' - Colour doesn't need to be set at all since it's white; the same colour as the section background colour."

---

### DRAFT facts
- Source: `sites/mamas-munches/mockups/homepage/index.html` lines 641–659 (CSS block)
- `.sgs-testimonial { background: white; border-radius: 12px; padding: 20px; border: 1px solid var(--border) }` (line 756 of the clone's page-scoped CSS block, which mirrors the draft's equivalent)
- The draft CSS sets background on `.sgs-testimonial` (the card article), NOT on any slide wrapper. No `.sgs-testimonial-slider__slide--card` rule appears in the draft markup or CSS.
- The draft `<div class="sgs-testimonial-slider">` is a plain CSS grid with no card-wrapper element.

---

### CLONE facts
- Source: `sites/mamas-munches/mockups/homepage/current-clone-page-source.html` line 999
- The slider wrapper carries class `sgs-testimonial-slider--card` (not a per-slide class — this is on the outermost slider div).
- Each slide div carries class `sgs-testimonial-slider__slide sgs-testimonial-slider__slide--card` (lines 999, 1007, 1015, 1023).
- No inline `background-color` style on the slide divs themselves — the colour is applied by the stylesheet rule only.
- The section (`sgs-social-proof`) has class `has-surface-alt-background-color` (clone line 987). From the CSS custom properties block (clone line 387): `--wp--preset--color--surface-alt: #FFF9F0`.
- From the same CSS custom properties block (clone line 387): `--wp--preset--color--surface: #FBF3DC`.
- Python verification: `rgb(251, 243, 220)` = `#FBF3DC` = exactly `--wp--preset--color--surface`.
- The `.sgs-testimonial-slider__slide--card` CSS rule resolves to `background: var(--wp--preset--color--surface, #fff)` — the `#fff` fallback is NOT what is rendered; the resolved value is `#FBF3DC` because `--wp--preset--color--surface` IS defined in this theme as `#FBF3DC`.

---

### DB facts
- Not applicable — this is a CSS/design-token fact. No DB rows govern this colour.

---

### BLOCK/RENDER location facts
- File: `plugins/sgs-blocks/src/blocks/testimonial-slider/style.css` lines 44–51:
  ```css
  /* Card style — hover shadow-lift added per Group J spec (duration: medium) */
  .sgs-testimonial-slider__slide--card {
      background: var(--wp--preset--color--surface, #fff);
      border-radius: var(--wp--custom--border-radius--medium, 8px);
      box-shadow: var(--wp--preset--shadow--md);
      padding: var(--wp--preset--spacing--40);
      transition: box-shadow var(--wp--custom--duration--medium, 300ms) var(--wp--custom--easing--default, cubic-bezier(0.4, 0, 0.2, 1));
  }
  ```
- File: `plugins/sgs-blocks/src/blocks/testimonial-slider/render.php` lines 60–61 and 126–130:
  - `$card_style = $attributes['cardStyle'] ?? 'card';`
  - Line 127: each slide div gets class `sgs-testimonial-slider__slide sgs-testimonial-slider__slide--%s` where the format arg is `esc_attr( $card_style )` = `"card"` by default.
- The `--card` modifier is set unconditionally when `cardStyle` attr defaults to `"card"`.
- This is a FRAMEWORK-LEVEL stylesheet rule, not a clone-generated inline style.

---

### SPEC/DOC refs
- `plugins/sgs-blocks/src/blocks/testimonial-slider/style.css` line 44 comment: "Card style — hover shadow-lift added per Group J spec (duration: medium)"
- `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` line 2351: `cardStyle` attribute default `"card"` confirmed.
- The `--wp--preset--color--surface` token for this client variation is `#FBF3DC` (a warm cream/parchment), not white. Confirmed from clone line 387 CSS custom property block.

---

## SP-G — Wrong block used: sgs/testimonial-slider instead of sgs/trustpilot-reviews; extra child blocks inserted; "Error loading block: Invalid parameter(s): attributes"

**Issue (verbatim):**
"I checked the block editor and found that the testimonial blocks have extra child blocks inserted a star rating and extra text block for the name of the reviewer in addition to the base testimonial block content which [has] a built in image for a reviewer pfp/avatar and an sgs/text child block for the testimonial text. This is the wrong block! This is supposed to be using the sgs/trustpilot-reviews blocks since we scraped the trustpilot reviews page for these and inserted them to test it out properly. The testimonial block and slider is not made to represent proper 3rd party reviews. However similar to the product-card block when set to take content from a specific product it gives this error message: 'Error loading block: Invalid parameter(s): attributes'. This is a routing and block error."

---

### DRAFT facts
- Source: `sites/mamas-munches/mockups/homepage/index.html` lines 994–1010
- The draft section class is `sgs-social-proof`. The testimonial container class is `sgs-testimonial-slider`. Individual testimonial items use `<article class="sgs-testimonial">`.
- Each draft testimonial article has: `sgs-testimonial__stars`, `sgs-testimonial__text`, `sgs-testimonial__author` — text-only, no `sgs-trustpilot` BEM classes anywhere in the draft.
- The draft contains NO `sgs-trustpilot-*` BEM classes. The presence of a Trustpilot branding bar (`sgs-social-proof__trustpilot-bar`) is purely a CTA/link row, not a review display.

---

### CLONE facts
- Source: `sites/mamas-munches/mockups/homepage/current-clone-page-source.html` lines 999–1023
- **Block emitted:** `sgs/testimonial-slider` (class `wp-block-sgs-testimonial-slider` present, line 999). NOT `sgs/trustpilot-reviews`.
- **Child blocks inside each slide:**
  - `sgs/star-rating` (class `wp-block-sgs-star-rating`, line 1000 of clone)
  - `sgs/text` ×2 (the quote text `wp-block-sgs-text`, line 1005; and the reviewer name `wp-block-sgs-text`, line 1006)
  - `sgs/testimonial` as the slide wrapper (class `wp-block-sgs-testimonial`, line 999)
- The converter emitted `sgs/testimonial-slider` containing `sgs/testimonial` children, each of which (via FR-22-6 InnerBlocks) contains an `sgs/star-rating` child and two `sgs/text` children (one for quote, one for name).
- **The `sgs/trustpilot-reviews` block is NOT present anywhere in the clone.**
- Class anomaly: each `sgs/testimonial` carries class `sgs-testimonial--Array` (clone lines 999, 1007, 1015) — the style modifier is stringified from a PHP `Array` value, indicating the `style` attribute was passed as an array rather than a string.

---

### DB facts

**Slot routing (why converter chose sgs/testimonial-slider):**
- `slots` table: `slot_name='testimonial-slider'`, `scope='element'`, `aliases=[]`, `standalone_block='sgs/testimonial-slider'`
- `slots` table: `slot_name='testimonial'`, `scope='element'`, `aliases=[]`, `standalone_block='sgs/testimonial'`
- `slots` table: `slot_name='review'`, `scope='element'`, `aliases='["review-row", "review-item", "review-card"]'`, `standalone_block='sgs/testimonial'`
- **There is NO slot mapping for any BEM class to `sgs/trustpilot-reviews`.** The `slots` table has no entry with `standalone_block='sgs/trustpilot-reviews'`.

**Block composition:**
- `block_composition` table: `sgs/testimonial`, `has_inner_blocks=1`, `composition_role='content-block'`
- `block_composition` table: `sgs/testimonial-slider`, `has_inner_blocks=1`, `composition_role='content-block'`
- `block_composition` table: `sgs/trustpilot-reviews`, `has_inner_blocks=0`, `composition_role='content-block'`

**Block descriptions (DB):**
- `sgs/testimonial` description: "Single testimonial card with quote, name, role, optional avatar, and star rating."
- `sgs/testimonial-slider` description: "Carousel of testimonials with CSS scroll-snap and optional autoplay."
- `sgs/trustpilot-reviews` description: "Display Trustpilot reviews in the official Trustpilot visual style. Reviews can be entered manually or synced from a Trustpilot business profile (sync available in next-session build)."

**sgs/trustpilot-reviews attributes (from DB / block.json):**
- `dataSource` enum: `["inline", "synced", "placeholder"]` — no product/CPT binding modes.
- `reviews` attr: `type: "array"`, `default: []`, `items: {"type": "object"}` (no sub-schema on items).
- `variant` enum: `["carousel", "grid", "list", "mini", "mini-carousel"]`.
- No `sourceMode` attribute exists on `sgs/trustpilot-reviews` in block.json or DB. The block does NOT have product-binding modes.

---

### SPEC/DOC refs
- `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` lines 2276–2334: `sgs/testimonial` = "Single testimonial card with quote, name, role, optional avatar, and star rating." Purpose is manually authored / converter-populated individual testimonials.
- `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` lines 2337–2401: `sgs/testimonial-slider` = "Carousel of testimonials with CSS scroll-snap and optional autoplay." Purpose is a carousel wrapper for `sgs/testimonial` children.
- `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` lines 2656–2736: `sgs/trustpilot-reviews` = "Display Trustpilot reviews in the official Trustpilot visual style." Attributes include `dataSource` (inline/synced/placeholder), `reviews` array, `trustScore`, `totalReviews`, `showTrustpilotLogo`, `showVerifiedBadge`. Purpose is third-party Trustpilot review display.
- `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` lines 6427–6447 (slots table): `testimonial` slot → `sgs/testimonial`; `testimonial-slider` slot → `sgs/testimonial-slider`. **No slot maps to `sgs/trustpilot-reviews`.**

---

### PIPELINE/BLOCK location refs

**Routing (why testimonial BEM → sgs/testimonial-slider, not sgs/trustpilot-reviews):**
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` lines 338–376: `standalone_block_for(canonical_slot)` — resolves `testimonial-slider` → `sgs/testimonial-slider` and `testimonial` → `sgs/testimonial` via `slots` table `standalone_block` column. No route to `sgs/trustpilot-reviews` exists via any slot alias.
- `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines 2920–2944: G3 gate — for blocks with `has_inner_blocks=0` (including `sgs/trustpilot-reviews`), the walker skips children. For `sgs/testimonial-slider` and `sgs/testimonial` (both `has_inner_blocks=1`), the walker emits children normally.

**"Invalid parameter(s): attributes" error origin for sgs/trustpilot-reviews:**
- `plugins/sgs-blocks/src/blocks/trustpilot-reviews/edit.js` lines 401–404: the editor uses `<ServerSideRender block="sgs/trustpilot-reviews" attributes={attributes} />` — this makes a `POST` request to the WP REST endpoint `/wp/v2/block-renderer/sgs/trustpilot-reviews`.
- The WP REST block renderer validates all attributes against the block's `block.json` schema before calling render.php.
- `plugins/sgs-blocks/src/blocks/trustpilot-reviews/block.json` lines 64–69: `"reviews": {"type": "array", "default": [], "items": {"type": "object"}}` — items schema is `{"type": "object"}` with no defined `properties`.
- **No `sourceMode` attribute exists** in `sgs/trustpilot-reviews` block.json. The block has no product or CPT binding mode. The error is NOT analogous to the product-card's `sourceMode='wc-product'` path. Bean's description "similar to the product-card block when set to take content from a specific product" describes a behavioural similarity (editor error on load), but the mechanism differs: `sgs/trustpilot-reviews` has no product-binding attribute at all.
- **The exact file:line origin of "Invalid parameter(s): attributes" is in WP core REST server code**, not in the SGS plugin source. No instance of that string exists in `plugins/sgs-blocks/src/` (confirmed: zero matches). The WP core path is `wp-includes/rest-api/class-wp-rest-server.php` → `rest_validate_value_from_schema()`. It fires when the `attributes` parameter sent to the block-renderer REST endpoint fails schema validation. The specific trigger (which attribute fails, and why) cannot be determined from static analysis alone — it requires a live REST request trace. **BLOCKED: exact failing attribute + REST request body cannot be confirmed without live request capture.**

**sgs/trustpilot-reviews render.php — no product/sourceMode binding:**
- `plugins/sgs-blocks/src/blocks/trustpilot-reviews/render.php` lines 33–34: only `$variant` and `$data_source` are read as top-level routing attrs. `$data_source` enum: `inline/synced/placeholder`. No product, CPT, or sourceMode routing.

---

## Coverage checklist

| Item | Status |
|------|--------|
| SP-E: Draft — avatar/profile image presence | fact-complete |
| SP-E: Clone — `?` placeholder markup (exact lines) | fact-complete |
| SP-E: Block — avatar render logic (render.php lines) | fact-complete |
| SP-E: Block — why `?` fires on InnerBlocks posts (scalar `name` empty) | fact-complete |
| SP-F: Draft — card background rule | fact-complete |
| SP-F: Clone — slide--card class assignment (exact line) | fact-complete |
| SP-F: CSS source — `.sgs-testimonial-slider__slide--card` rule (style.css lines 44–51) | fact-complete |
| SP-F: Token resolution — `--wp--preset--color--surface` = `#FBF3DC` = `rgb(251,243,220)` | fact-complete |
| SP-F: Section background — `--wp--preset--color--surface-alt` = `#FFF9F0` (not the same as slide background) | fact-complete |
| SP-G: Draft — no trustpilot BEM classes, no avatar elements | fact-complete |
| SP-G: Clone — sgs/testimonial-slider emitted (not sgs/trustpilot-reviews) | fact-complete |
| SP-G: Clone — child block structure (sgs/star-rating + sgs/text ×2 per slide) | fact-complete |
| SP-G: Clone — `sgs-testimonial--Array` class anomaly | fact-complete |
| SP-G: DB — slot routing maps (no slot → sgs/trustpilot-reviews) | fact-complete |
| SP-G: DB — block_composition has_inner_blocks facts | fact-complete |
| SP-G: DB — sgs/trustpilot-reviews has no sourceMode attr | fact-complete |
| SP-G: Pipeline — why converter routes to sgs/testimonial-slider (db_lookup.py lines) | fact-complete |
| SP-G: "Invalid parameter(s): attributes" error origin | **blocked-with-reason**: error string not present in plugin source; originates in WP core REST server `rest_validate_value_from_schema()`; exact failing attribute requires live REST request capture |
