# Root-Cause Report — Part 3: Ingredients, Gift, Social-Proof, Announcement-Bar
**Date:** 2026-06-05  
**Run:** `mamas-munches-homepage-2026-06-05-103529`  
**Scope:** Points 13–32 (ingredients / gift / social-proof / announcement-bar sections)

---

## Evidence artefacts read

| Artefact | Used for |
|---|---|
| `extract.json` per_section_results — ingredients-section | Points 13–18 emit + attr extraction |
| `extract.json` per_section_results — gift-section | Points 19–26 emit + attr extraction |
| `extract.json` per_section_results — social-proof | Points 27–30 emit |
| `sites/mamas-munches/mockups/homepage/index.html` | Draft CSS + HTML ground truth |
| `plugins/sgs-blocks/src/blocks/icon/block.json` + `render.php` | Points 15, 16 icon source logic |
| `plugins/sgs-blocks/src/blocks/info-box/block.json` | Points 15, 16, 17, 21–25 |
| `plugins/sgs-blocks/src/blocks/feature-grid/block.json` + `render.php` | Point 17 gap logic |
| `plugins/sgs-blocks/src/blocks/notice-banner/block.json` + `render.php` | Point 18 InnerBlocks / showIcon |
| `plugins/sgs-blocks/src/blocks/announcement-bar/block.json` + `render.php` | Point 26 messages |
| `plugins/sgs-blocks/src/blocks/testimonial-slider/render.php` | Points 28–30, 32 |
| `plugins/sgs-blocks/src/blocks/testimonial/render.php` + `block.json` | Points 29, 30, 32 |
| `plugins/sgs-blocks/src/blocks/star-rating/block.json` | Point 28 |
| `plugins/sgs-blocks/src/blocks/label/render.php` + `block.json` | Point 21 |

---

## Point 13 — Ingredients section label + intro text are left-aligned, not centred

**Root cause:** CONVERTER — incomplete CSS-to-attribute extraction.

The draft's centring is applied via `.sgs-ingredients-section__inner { text-align: center; }` — a CSS rule scoped to the wrapper class, not an inline `style` or per-element `text-align` attribute on the label or intro-text elements. The converter extracts `text-align` only from inline `style` attributes on individual elements. Since neither `sgs-section-heading__label` nor `sgs-section-heading__intro` carry inline `text-align`, neither `label.textAlign` nor `text.textAlign` appear in the extracted attributes (confirmed: the `extracted_attributes` dict has no `textAlign` key for the ingredients section at all). The emitted `sgs/label` and `sgs/text` blocks therefore render with their block defaults (left-aligned).

**Evidence:** Confirmed — `extracted_attributes` for ingredients-section contains no `textAlign` key. Draft CSS line 507: `.sgs-ingredients-section__inner { text-align: center; }` is a class-level rule, not inline.

**Fault classification:** IMPLEMENTATION — converter does not propagate inherited CSS text-align from an ancestor wrapper class into child block attrs. Distinct from point 14.

**Fix-shape:** Converter needs to detect when a section's inner wrapper has a wrapper-level `text-align` rule in the variation CSS and apply it as a `textAlign` attr on all text-role children, OR the section-level container needs a `textAlign` wrapper control that cascades.

---

## Point 14 — Max-width / margin not carried over to the ingredients intro text

**Root cause:** CONVERTER — same class-level CSS extraction gap as point 13, different property.

The intro text `max-width: 540px; margin: 0 auto` is on `.sgs-section-heading__intro` in the mockup CSS (line 509–514), not as an inline style on the `<p>` element. The converter extracts CSS properties from inline `style` attributes only. The `<p class="sgs-section-heading__intro">` element has no inline style, so `max-width` and `margin` are never extracted into the `text.` slot attrs.

**Evidence:** Confirmed — the emitted `sgs/text` for the intro has only `fontSize`, `lineHeight`, `lineHeightUnit`, `textColour` (all extracted from inline or computed CSS). No `maxWidth`, no margin.

**Fault classification:** IMPLEMENTATION — same root as point 13 (class-level CSS not extracted). SAME cause family as point 13 but DISTINCT property (max-width vs text-align). Both are converter extraction gaps for class-scoped CSS.

**Fix-shape:** CSS-class-to-attr harvester needs to cover `max-width` + `margin: auto` on text-role elements. OR: add a `maxWidth`/`margin` pair to the `sgs/text` block and teach the converter to extract them.

---

## Point 15 — Icons in the ingredients grid are default stars, not the draft's emojis

**Root cause:** CONVERTER + BLOCK ATTRIBUTE MISMATCH — emoji stored in wrong attribute.

The converter extracts the emoji from `.sgs-info-box__icon` (which contains `🌾`, `🍺`, `🌿`, `🌱`) and places it in `icon.linkUrl` (confirmed in extract.json: `"linkUrl":"🌾"`). The `sgs/icon` render.php reads `$icon_source = $attributes['iconSource'] ?? 'lucide'` — since `iconSource` is not set, it defaults to `lucide` and renders a Lucide SVG star (default icon name `star`). The emoji value in `linkUrl` is interpreted as a URL and used for the link wrapper only — it never reaches the icon rendering path. The actual emoji field is `emojiChar` (block.json line 61), and `iconSource` must be set to `"emoji"` for the render.php to enter the emoji branch.

**Evidence:** extract.json block_markup shows `<!-- wp:sgs/icon {"linkUrl":"🌾",...} /-->` with no `iconSource` or `emojiChar` set. icon/render.php lines 39–42, 50–54, 131–171 confirm the code path: `iconSource` defaults to `"lucide"`, emoji branch only fires when `iconSource === "emoji"`.

**Fault classification:** IMPLEMENTATION — converter incorrectly maps emoji glyph to `linkUrl` instead of `emojiChar` + `iconSource:"emoji"`.

**Fix-shape:** Converter: when extracting an `.sgs-icon` node and the content is a Unicode emoji (not a URL), emit `{"iconSource":"emoji","emojiChar":"🌾"}` instead of `{"linkUrl":"🌾"}`.

---

## Point 16 — Icons and `<p>` text in the ingredients grid are left-aligned, not centred; `<p>` text styling didn't carry over

**Root cause (alignment):** Same as point 13 — class-level `text-align: center` on `.sgs-ingredients-section__inner` not extracted into child block attrs. The info-box itself has no `textAlign` in its emitted attrs.

**Root cause (text styling — font-size 17px vs 13px, line-height 1.75 vs 1.55):** The draft's `.sgs-info-box p` rule (CSS lines 530) sets `font-size: 13px; line-height: 1.55` at class level. The converter emitted `"fontSize":17,"lineHeight":1.75` for the `sgs/text` inside info-box — these come from the extractor picking up the CONTAINER-LEVEL text defaults (or the intro text slot) rather than the per-`<p>` class rule, which again is a class-scoped CSS extraction gap.

**Evidence:** extract.json block_markup: `sgs/text {"text":"Rich in iron...","fontSize":17,"fontSizeUnit":"px","lineHeight":1.75,...}`. Draft CSS line 530: `.sgs-info-box p { font-size: 13px; color: var(--text-muted); line-height: 1.55; }`.

**Fault classification:** IMPLEMENTATION — both are class-level CSS extraction gaps. SAME root family as points 13/14 but materialising differently (alignment + typography).

**Shared/distinct:** Alignment sub-cause is SHARED with point 13. Typography sub-cause is DISTINCT but same mechanism (class-rule not extracted).

---

## Point 17 — Grid gaps not carried over between the 4 info-boxes (visible in editor, NOT on live page)

**Root cause:** BUILD DEPLOYMENT — the feature-grid's inline `<style>` tag is not rendering on the live page, or the gap value is being overridden.

The converter correctly emits `"gap":"14px"` on the `sgs/feature-grid` block. `feature-grid/render.php` reads `$gap = isset($attributes['gap']) ? absint($attributes['gap']) : 24;` — `absint("14px")` = 14 in PHP, so the scoped `<style>` tag emits `gap: 14px` for the instance UID. In the block editor, the edit.js renders the gap from block attributes directly (React inline style), so the editor shows the correct gap. On the live page the scoped `<style>` is emitted inline by render.php — this should work on the server. The symptom "visible in editor, NOT on live page" is consistent with one of: (a) the live page is serving a cached version that pre-dates the latest clone POST being saved, (b) the scoped `<style>` is being stripped by a caching or minification layer, or (c) a theme/global CSS rule for `.sgs-feature-grid` is winning over the scoped `#uid` rule.

**Evidence (UNVERIFIED-HYPOTHESIS for live-page behaviour):** The emitted markup is `{"style":{"spacing":{"blockGap":"14px"}},"gap":"14px"}`. The render.php code path is verified correct (absint coercion returns 14). Live-page DOM observation is needed to confirm which CSS rule wins.

**Fault classification:** Likely IMPLEMENTATION (render layer or caching). NOT a converter emission fault — the gap IS emitted. Possibly a conflicting global `.sgs-feature-grid { gap: 24px }` in style.css overriding the scoped `#uid` rule (specificity: `#id.class` = 1,1,0 vs `.class` = 0,1,0 — the `#uid` selector should win). Most likely a cache layer issue.

**Fix-shape:** Playwright live DOM check: read `getComputedStyle(document.querySelector('.sgs-feature-grid')).gap` after force-clearing page cache (wp litespeed-purge / opcache reset).

---

## Point 18 — Notice-banner looks nothing like the draft disclaimer; no content inside it

**Root cause:** CONVERTER emission fault + BLOCK render architecture mismatch (emit-vs-render reconciliation).

**Emit investigation:** The converter emits:
```
<!-- wp:sgs/notice-banner {"text":"We make nourishing food...","textColour":"text-muted","style":{...border...}} /-->
```
The `text` attr IS in the emit — so a prior artefact analysis saying "text IS in the emit" is confirmed correct.

**Render investigation:** `notice-banner/render.php` (post FR-22-6 migration, 2026-06-02) no longer reads `$attributes['text']`. The render comment at line 28–30 states: *"FR-22-6: $text is no longer rendered here — the text content slot is now an InnerBlocks child (sgs/text), emitted via $content below."* The block is emitted as self-closing (`/-->`), so there are **zero InnerBlocks**, so `$content` is an empty string. The render.php emits an empty banner wrapper with no text.

**showIcon issue:** `$show_icon = ! empty($attributes['showIcon']) && 'none' !== $legacy_icon;` — `showIcon` is not in the emitted attrs, so it is null → `!empty(null)` = false → icon is suppressed. The banner therefore renders with no icon AND no text — just a styled empty container.

**Reconciliation verdict:** Both earlier claims are now verified:
- "text IS in the emit" — TRUE (it's in the block comment attrs)
- "doesn't have the content inside it" — TRUE on the rendered page (render.php ignores `text` attr; requires InnerBlocks child `sgs/text`)

The fault is a **converter–block API contract break**: the converter emits the legacy scalar `text` attr, but the block's render.php has migrated to InnerBlocks and no longer reads that attr (R-22-14: no fallback allowed). The converter has not been updated to emit the new InnerBlocks form.

**Evidence:** render.php lines 28–30, 83–84, 101–108. extract.json: block markup shows self-closing emit with `text` scalar attr.

**Fault classification:** IMPLEMENTATION — converter emits pre-FR-22-6 API (scalar `text`) but block render.php expects post-FR-22-6 API (InnerBlocks `sgs/text` child). DOC fault as well: FR-22-6 migration spec requires updating the converter to emit the new InnerBlocks form, which was not done.

**Distinct from all other points.**

**Fix-shape:** Converter: replace `<!-- wp:sgs/notice-banner {attrs-without-text} /-->` self-closing emit with:
```
<!-- wp:sgs/notice-banner {attrs-without-text} -->
<!-- wp:sgs/text {"text":"<notice text>","textColour":"text-muted",...} /-->
<!-- /wp:sgs/notice-banner -->
```
This is the InnerBlocks form the render.php expects.

---

## Point 19 — Gift section heading + text centre-aligned instead of left; text styling + size inconsistent

**Root cause:** CONVERTER extraction error — wrong slot collision.

The gift section has:
- An outer intro `sgs/text` ("For baby showers...") which has inline `text-align: center` in the draft → correctly extracted as `textAlign: center` on the `text.` slot
- Two gift card `<p class="sgs-gift-section__card-description">` elements which should be LEFT-aligned (no inline text-align)

The converter's slot extractor resolves only ONE `text` slot per section. The extracted attrs show `text.textAlign = 'center'` — this belongs to the INTRO text but has leaked into the last `text` slot resolution. The two card description paragraphs (which are left-aligned) do not have `text-align: center` inline, but the gift cards' `sgs/info-box` inherits the outer `sgs/container`'s content, so the card content blocks get emitted WITHOUT `textAlign` (correct). The h2 heading (section-level) is emitted without `textAlign` at all — but the gift section CSS shows `.sgs-gift-section h2` which is also class-scoped (not inline), so the heading defaults to left-align in the block but the draft shows it left-aligned. If Bean reports the heading as CENTER-aligned on the live clone, this may be a WP theme CSS rule (`entry-content h2 { text-align: center; }`) or an inheritance from the parent container emitting a `textAlign`.

**Evidence:** `extracted_attributes` for gift-section: `textAlign = 'center'` (outer text) and `text.textAlign = 'center'`. The heading has no `textAlign` in the emitted block markup. Font-size discrepancy: draft `.sgs-gift-section__card-description { font-size: 14px }` but emitted `sgs/text` at `fontSize: 17` — class-level rule not extracted (same mechanism as point 16).

**Fault classification:** IMPLEMENTATION (converter). Shared root with 13/14/16 for font-size. The centre-alignment of the h2/card text on live may also have a RENDER/THEME layer component (theme CSS cascading).

---

## Point 20 — No padding / gap between the gift text and the gift-idea blocks

**Root cause:** CONVERTER — missing inner-container gap/margin extraction.

The draft has `.sgs-gift-section__cards { gap: 16px; margin-bottom: 20px }` (class-level CSS, line 557). The converter correctly extracts the grid gap (confirmed: `container.gap = '16px'` in extracted attrs — and the emitted `sgs/container` for the cards grid has `"gap":"16px"`). However, `margin-bottom: 20px` on the cards grid is a class-level rule and is not extracted into the block attrs.

The sub-gap between the section's text block ("For baby showers...") and the cards container is also class-level (`margin-bottom: 32px` on `.sgs-gift-section .sgs-section-heading__sub`, line 556). Neither margin is captured by the converter.

**Evidence:** Emitted `sgs/text` for "For baby showers..." has no margin attrs. Emitted `sgs/container` for cards grid has no `margin-bottom`. Draft CSS lines 556–557.

**Fault classification:** IMPLEMENTATION — class-level margin extraction gap. SAME root as points 13/14 (class-scoped CSS not reaching block attrs). Distinct sub-effect.

---

## Point 21 — Label styling in both gift cards is completely wrong

**Root cause:** CONVERTER — single-instance slot collision losing first card's label; wrong `backgroundColour` for label.

The two gift cards each have a `sgs/label` (slot `label`). The converter's per-section slot extractor resolves ONE `label` slot value, taking the last seen instance. Confirmed: `extracted_attributes` shows `label.text = 'Most thoughtful'` (card 2's label) — card 1's "Gift idea" is silently overwritten. The emitted `sgs/label` in card 1 is therefore "Most thoughtful" (wrong text) or the converter may emit both cards with the last-seen label attrs. In any case, BOTH cards get the same label derived from the last extraction.

Additionally, the label's `backgroundColour` is set to `var:preset|color|surface-pink` (extracted from the card's pink background), which may or may not match the draft. The draft label (`.sgs-gift-section__card-tag`) uses `background: var(--surface-pink)` — so the colour itself is correct — but the visual appearance may be off if the `sgs/label` block's render emits it differently than the draft's `<span>` element.

**Evidence:** `extracted_attributes` — `label.text = 'Most thoughtful'` (not 'Gift idea'). `label.style = {'spacing':{'margin':{'bottom':'12px'}},'color':{'background':'var:preset|color|surface-pink','text':'var:preset|color|primary-dark'}}`.

**Fault classification:** IMPLEMENTATION — converter's single-slot-per-section extraction model cannot handle multi-card sections where each card has its own label. This is a fundamental converter limitation: it treats repeated slots as a single slot and takes the last value.

**Distinct from other points** — this is a structural converter limitation, not a CSS extraction gap.

---

## Point 22 — The `<h3>` in the gift card is centred instead of left; font-size + colour wrong in card-description

**Root cause (centring):** UNVERIFIED-HYPOTHESIS. The emitted `sgs/heading` for h3 in the card has no `textAlign` attr. If it renders centred on the live page, the cause is likely WP theme CSS or a parent `text-align: center` propagating from the outer container's style. The outer `sgs/container` for the gift section does not have `textAlign` set. Needs live DOM inspection.

**Root cause (font-size/colour):** Same single-slot collision as point 21. The extracted `heading.fontSize = 22`, `heading.fontWeight = '600'`, `heading.textColour = 'text'` come from the LAST info-box (card 2). Both cards get the same h3 attrs regardless of their individual CSS (which is consistent anyway — `.sgs-gift-section__card h3 { font-size: 22px; font-weight: 600; color: var(--text) }` matches the emit).

The "card-description" font-size issue: the draft uses `font-size: 14px` for `.sgs-gift-section__card-description` but the emitted `sgs/text` for the description (from the card body text slot) is `fontSize: 17` — class-level CSS not extracted (same as point 16).

**Evidence:** `extracted_attributes` for gift-section — `heading.fontSize = 22`, `heading.textColour = 'text'` correct for h3. `text.fontSize = 30` (price text — see point 24) but the body description text was extracted as part of the outer section's text slot (17px), not the card's 14px class-rule.

**Fault classification:** IMPLEMENTATION. Font-size is SHARED root with 13/14/16 (class-level CSS gap). Centring is UNVERIFIED pending live DOM check.

---

## Point 23 — Both gift buttons have the same broken primary-button styling (cross-ref part2 point 9)

**Root cause:** SAME CAUSE as part-2 point 9 — the container background colour fills the button element due to `inheritStyle: 'primary'` + the container's `background: var(--surface-pink)` bleeding through the button's transparent background.

The converter correctly emits `"inheritStyle":"primary"` on both buttons (confirmed: `button.inheritStyle = 'primary'` in extracted attrs). The `inheritStyle: primary` preset sets the button background to `var(--wp--preset--color--primary)` via CSS, but the parent `sgs/container` (gift section) has `background: var(--surface-pink)`. If the primary button's CSS does not set an explicit opaque background (relying on a CSS var fallback), the container's background may bleed.

**Evidence:** extract.json button emit: `"style":{"color":{"background":"var:preset|color|primary"}},"inheritStyle":"primary"`. This is identical in structure to the part-2 point 9 pattern. The `background` colour IS set inline on the button — so the button should have an opaque primary background. The "broken" appearance is more likely that the button's style.css has a `background-color` override being shadowed by the `is-style-primary` class removing the inline style. UNVERIFIED-HYPOTHESIS pending live DOM style inspection.

**Verdict:** SAME CAUSE as part-2 point 9 if the root there was identified as a CSS specificity/override issue. If part-2's root was a different mechanism, these may differ. Recommend reading the part-2 findings to verify before treating as identical.

**Fault classification:** BLOCK CSS (render layer). NOT a converter fault — the emit is correct.

---

## Point 24 — Gift price text is wrong font + wrong padding

**Root cause:** CONVERTER — single-slot collision gives wrong price; no padding extracted.

**Wrong price text:** `extracted_attributes` shows `text.text = '£42'` and `text.fontSize = 30`, `text.fontWeight = '700'` — these belong to card 2's price. Card 1's price `£15` is overwritten by the last-instance extraction. The emitted block_markup shows `<!-- wp:sgs/text {"text":"£15",...} -->` for card 1 and `<!-- wp:sgs/text {"text":"£42",...} -->` for card 2 (the converter actually emits BOTH cards' markup using the SAME slot attrs). The text content (£15 vs £42) appears to be correctly placed, but the style attrs applied are from the last extraction.

**Wrong font:** Draft uses `font-family: 'Fraunces', serif` on `.sgs-gift-section__card-price` (line 578). This is a class-level CSS rule → not extracted → emitted `sgs/text` has no `fontFamily` attr → renders in the theme's default body font.

**Wrong padding:** Draft `.sgs-gift-section__card-price { margin-bottom: 16px }` (line 583) is class-level → not extracted.

**Evidence:** Draft CSS lines 578–584. `extracted_attributes` — `text.fontWeight = '700'`, `text.fontSize = 30` (correct) but no `fontFamily`, no margin.

**Fault classification:** IMPLEMENTATION — class-level CSS gap (SHARED root with 13/14/16 for font and padding). Content collision is SHARED root with point 21 (single-slot extraction).

---

## Point 25 — Both gift cards should be the same height but the '40 day care bundle' is taller

**Root cause:** BLOCK LAYOUT — the two cards have different amounts of body text, and `sgs/info-box` does not enforce equal-height columns by default.

The draft uses CSS Grid (`grid-template-columns: 1fr 1fr`) on `.sgs-gift-section__cards` with `align-items: stretch` (implicit in grid). The inner cards would naturally stretch to equal height in the grid if their container is a grid. The emitted `sgs/container` for the cards grid has `"layout":"grid","gridTemplateColumns":"1fr 1fr"` — this should produce equal-height cells. However, the `sgs/info-box` within each cell may not be `height: 100%` by default.

The 40-day bundle card also has more description text ("Six weekly deliveries for the 40-day postnatal window. One of the most thoughtful gifts you can give a new mum.") vs the gift box ("The perfect gift for a new mum. A mix of Zookies and Classics in a gift box, ready to send.") — but in a CSS Grid both cells stretch to match the tallest, so content difference alone should not cause height difference IF the info-box is `height: 100%`.

**Evidence (UNVERIFIED-HYPOTHESIS):** The info-box render.php uses `SGS_Container_Wrapper::render()` with `content` kind. If the wrapper does not set `height: 100%` or `align-self: stretch`, the taller card's natural height wins. Needs live DOM inspection: `getComputedStyle(infoBox).height` on both cards.

**Fault classification:** BLOCK CSS (info-box / container-wrapper). UNVERIFIED pending live DOM check.

---

## Point 26 — Announcement-bar: nothing in common between draft and clone; clone shows DEFAULT content + totally wrong format

**Root cause:** CONVERTER — only `className` is emitted; no `messages` array; no `text`/CTA content; block renders its default content.

The emitted markup is:
```
<!-- wp:sgs/announcement-bar {"className":"sgs-announcement-bar--send-to-ward"} /-->
```

The `announcement-bar/block.json` declares `messages` with a default of:
```json
[{"text":"🎉 New product launch — get 20% off with code LAUNCH20!","ctaText":"Shop Now","ctaUrl":""}]
```

Since no `messages` attr is in the emit, the render.php uses this default, displaying the wrong promotional message. The draft's actual content is `"🏥 Heading to hospital? Ask us about our Send to Ward delivery."` with a "Find out more →" link to `/send-to-ward/`.

Additionally the draft renders the announcement-bar as a `<div class="sgs-announcement-bar--send-to-ward">` (an inline styled box within the gift section), NOT as the full-width sticky `sgs/announcement-bar` block. The block renders as a sticky top-of-page banner with JavaScript controls, while the draft is a simple flex row inside the gift section.

**Evidence:** extract.json block_markup: `<!-- wp:sgs/announcement-bar {"className":"sgs-announcement-bar--send-to-ward"} /-->`. Draft mockup HTML line 973–976. `announcement-bar/block.json` messages default.

**Fault classification:** IMPLEMENTATION (converter) — the announcement-bar content extraction is absent. The converter correctly detects the BEM class and carries the modifier (`sgs-announcement-bar--send-to-ward`) via the D7 BEM-modifier-carry rule, but does not extract the `messages` array or the CTA link. Additionally, there is a STRUCTURAL mismatch: the draft's send-to-ward element is a scoped inline box (not a full-width sticky bar), but the block renders as a page-level sticky bar — this is a fundamental block-vs-draft semantic mismatch that the BEM-modifier CSS alone cannot fix.

**Distinct from all other points.**

---

## Point 27 — Gap between social-proof sub and the trustpilot strip is wrong

**Root cause:** CONVERTER — class-level CSS margin not extracted.

The draft's `.sgs-social-proof .sgs-section-heading__sub { margin-bottom: 32px }` (CSS line 619–623) is a class-level rule. The emitted `sgs/text` for the social-proof subtitle has no `style.spacing.margin.bottom` attr. The trustpilot bar container also has `margin-bottom: 28px` in the draft (CSS line 634), which is not extracted.

**Evidence:** extract.json social-proof block_markup — `sgs/text` for "Real feedback from real mums" has `{"text":"...","fontSize":17,...}` with no margin. Draft CSS lines 619, 634.

**Fault classification:** IMPLEMENTATION — class-level CSS margin extraction gap. SHARED root with points 13/14/16/20 (same mechanism).

---

## Point 28 — Stars in the trustpilot strip sit LOWER than the trustpilot logo and text — vertical misalignment

**Root cause:** BLOCK CSS / CONVERTER — the trustpilot-bar is emitted as three separate `sgs/text` blocks inside an `sgs/container` with `layout:"flex"`, but no `alignItems` attr is set, defaulting to `stretch` instead of `center`.

The emitted markup:
```
<!-- wp:sgs/container {"className":"sgs-social-proof__trustpilot-bar","htmlTag":"div","layout":"flex","gap":"14px"} -->
<!-- wp:sgs/text {"text":"★ Trustpilot",...} /-->
<!-- wp:sgs/text {"text":"★★★★★",...} /-->
<!-- wp:sgs/text {"text":"Leave us a review...",...} /-->
<!-- /wp:sgs/container -->
```

The draft's `.sgs-social-proof__trustpilot-bar { align-items: center }` (CSS line 625–635) is a class-level rule — not extracted into the container's attrs. Without `alignItems: center` on the flex container, the three text blocks align by their top/baseline rather than vertically centred, causing the stars (which may have different line-height or font-size) to appear lower.

**Evidence:** Draft CSS line 630: `align-items: center` on `.sgs-social-proof__trustpilot-bar`. Emitted container has `"layout":"flex","gap":"14px"` with no `alignItems`. `sgs/container` block.json supports `alignItems` attr.

**Fault classification:** IMPLEMENTATION — class-level CSS extraction gap (align-items not extracted). SHARED root with points 13/14/16/20/27.

---

## Point 29 — Styling of content (stars, text, name) inside the reviews is completely off

**Root cause (multiple causes):**

1. **Stars colour:** The emitted `sgs/star-rating` uses default `starColour: "accent"`. The draft uses `var(--accent)` for `.sgs-testimonial__stars` (CSS line 648). These should match if `--accent` = the same token. If the theme's `accent` token differs from the draft's `var(--accent)` value, the colour will be off. UNVERIFIED — requires live colour comparison.

2. **Text font-size/line-height:** The draft's `.sgs-testimonial__text { font-size: 14px; line-height: 1.65 }` (CSS line 649) is class-level. The emitted `sgs/text` quote block has `fontSize: 17px, lineHeight: 1.75` — extracted from the section-level text defaults (same class-level extraction gap as points 13/14/16).

3. **Author name styling:** Draft `.sgs-testimonial__author { font-size: 13px; font-weight: 600; color: var(--text) }` (CSS line 650). Emitted `sgs/text` for the author name has `fontSize: 17px, fontWeight: 600, textColour: text-muted` — font-size wrong (class-level gap), colour wrong (text-muted vs text).

4. **Profile images:** The draft's testimonials have no author photos. The `sgs/testimonial` render.php always renders an avatar footer (`$footer_html` at line 163). With no `avatar` or `authorMedia` attr in the emit, it renders initials from the `$attributes['name']` scalar — but `name` is also not in the emitted `sgs/testimonial` block (post-FR-22-6, name is an InnerBlocks child). So the initials default to `?`. This produces an unexpected `?` avatar circle on every card.

**Evidence:** extract.json social-proof block_markup. Draft CSS lines 648–650. testimonial/render.php lines 130–163.

**Fault classification:** IMPLEMENTATION — multiple layers: (a) class-level CSS gap (text styling), (b) converter emitting pre-FR-22-6 testimonial schema (name/quote attrs as scalars, not InnerBlocks), (c) block-always-renders-avatar design.

---

## Point 30 — Each review block in the slider has a CONTAINER background colour wrapping around the white box

**Root cause:** BLOCK CSS — the `sgs/testimonial-slider` block's container wrapper or its parent `sgs/container` (social-proof outer) has a background colour, which is visible between/around the white testimonial cards.

The emitted `sgs/testimonial-slider` has `{"style":{"spacing":{"blockGap":"12px"}},"gridTemplateColumns":"1fr","gap":"12px"}`. The testimonial cards each emit `{"style":{"border":{"radius":"12px","width":"1px","style":"solid","color":"var:preset|color|border"},"spacing":{"padding":{"top":"20px","right":"20px","bottom":"20px","left":"20px"}}}}` — white background is not explicitly set on the card.

The draft's `.sgs-testimonial { background: white; border-radius: 12px; ... }` (CSS line 642–645) sets `background: white` on the card. In the emitted `sgs/testimonial`, the `background: white` is a class-level CSS rule not extracted as a block attr. The `sgs/testimonial` render.php uses `SGS_Container_Wrapper` for the outer wrapper — without an explicit background set, the card is transparent, showing the social-proof section's `surface-alt` background through it. The visual result is that the `surface-alt` background colour wraps visibly around each card's border.

**Evidence:** Draft CSS line 642: `.sgs-testimonial { background: white }`. Emitted `sgs/testimonial` has `style.border.*` and `style.spacing.*` but no `style.color.background`. Class-level CSS rule not extracted.

**Fault classification:** IMPLEMENTATION — class-level CSS extraction gap for `background: white` on the testimonial card. SHARED root with points 13/14/16 etc.

---

## Point 32 — Block-capability request: toggle OFF the slider and the review profile images in testimonial-slider/reviews block settings

**This is a capability request, not a pipeline bug. Root-cause analysis of feasibility:**

**Slider toggle (disable sliding behaviour, show all cards in a static grid):**

The `sgs/testimonial-slider` block already has a `slidesVisible` attr (default 1) and `showDots`/`showArrows` booleans. However, there is no "disable slider — show as grid" toggle. The block renders via view.js (carousel JS) and PHP render. A static grid mode would need:
- A new `displayMode: "slider" | "grid"` attr in block.json
- render.php: when `grid`, omit the `data-autoplay`, `data-slides` context attrs and the `sgs-testimonial-slider__stage`/`__track` wrapper structure; emit plain `display: grid` children
- view.js: early-exit when `data-display-mode="grid"` to skip all scroll-snap and autoplay logic
- Inspector control: a SegmentedControl toggle in the sidebar

**Feasibility:** Yes, straightforward. The PHP render.php already conditionally builds the DOM structure; adding a new branch for `grid` mode is self-contained. The view.js early-exit is a 5-line guard.

**Profile images toggle:**

The testimonial render.php ALWAYS renders `$footer_html` (containing the avatar). The avatar section currently shows: real image (if `authorMedia` set) → legacy avatar → initials placeholder (`?` when no name). A toggle to hide all author media would need:
- A new `showAuthorImage: boolean` attr (default `true`) on `sgs/testimonial`
- render.php: gate `$footer_html` on the attr
- Inspector control: Toggle control in each testimonial's sidebar (or on the slider parent)

**Feasibility:** Yes, trivial. One attr + one `if` gate in render.php. Recommend placing the control on the SLIDER parent rather than each child testimonial (cleaner UX).

**Where the toggles live:**
- Slider-vs-grid toggle: `sgs/testimonial-slider` Inspector → Layout panel
- Profile image toggle: `sgs/testimonial-slider` Inspector → Style panel (applies to all children) OR per-`sgs/testimonial` block

**Fault classification:** BLOCK CAPABILITY GAP — not a pipeline fault. IMPL fault classification: new attrs need adding to block.json and render.php. Both changes are small and non-breaking.

---

## Cross-cutting summary

| Point | Layer | Cause family | Shared root |
|---|---|---|---|
| 13 | Converter | Class-level CSS not extracted (text-align) | A |
| 14 | Converter | Class-level CSS not extracted (max-width/margin) | A |
| 15 | Converter | Wrong attribute field for emoji (linkUrl vs emojiChar) | B |
| 16 | Converter | Class-level CSS not extracted (text-align + font) | A |
| 17 | Build/Cache (UNVERIFIED) | Gap emitted correctly; live-page override | C |
| 18 | Converter + Block | Converter emits pre-FR-22-6 scalar text; render.php expects InnerBlocks | D |
| 19 | Converter | Class-level CSS (h2 centring UNVERIFIED); slot collision (typography) | A + E |
| 20 | Converter | Class-level CSS (margin/gap) | A |
| 21 | Converter | Single-slot extraction overwrites card 1 label with card 2 | E |
| 22 | Converter | Single-slot collision (h3 attrs); class-level CSS (description font) | A + E |
| 23 | Block CSS | Primary button styling (same as part-2 pt9) | F |
| 24 | Converter | Class-level CSS (fontFamily/margin); single-slot collision | A + E |
| 25 | Block CSS (UNVERIFIED) | info-box height in grid | G |
| 26 | Converter | messages array not extracted; structural mismatch (scoped box vs page banner) | H |
| 27 | Converter | Class-level CSS margin not extracted | A |
| 28 | Converter | Class-level align-items not extracted | A |
| 29 | Multiple | Class-level CSS (text styling) + always-render-avatar + slot collision | A + E + I |
| 30 | Converter | Class-level background:white not extracted | A |
| 32 | Block capability gap | No slider/image toggle exists | — |

**Root cause family A (11 points: 13,14,16,20,22,24,27,28,29,30) — class-level CSS not extracted.** A single converter enhancement (propagate class-scoped CSS rules to child block attrs) would close the majority of visible defects.

**Root cause family E (4 points: 21,22,24,29) — single-slot extraction in multi-card sections.** Requires converter to handle repeated slot instances per section (emit one info-box or testimonial per card, each with its own extracted attrs).

**Root cause D (1 point: 18) — converter–block API contract break on notice-banner InnerBlocks migration.** Isolated fix.

**Root cause B (1 point: 15) — emoji in wrong attribute field.** Isolated 2-line fix.

**Root cause H (1 point: 26) — announcement-bar content not extracted.** Isolated fix + structural mismatch needs design decision.
