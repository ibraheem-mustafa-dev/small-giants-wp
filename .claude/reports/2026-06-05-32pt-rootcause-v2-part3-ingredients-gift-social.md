# Root-Cause Report v2 — Part 3: Ingredients, Gift, Social-Proof, Announcement-Bar
**Date:** 2026-06-05  
**Run:** `mamas-munches-homepage-2026-06-05-103529`  
**Scope:** Points #13–#30, #32 (ingredients / gift / social-proof / announcement-bar sections)  
**Standard:** IRON RULE — every causal claim quotes actual evidence. Unprovable = UNVERIFIED.  
**Corrected prior framing:** Prior report stated the dominant cause as "class-level CSS not extracted." The QC correction is that the converter DOES match rules targeting an element's own classes, but does NOT propagate inheritable properties (text-align / colour / font-*) from ANCESTOR rules to child elements. This document uses the corrected framing per-point.

---

## Evidence artefacts used

| Artefact | Path |
|---|---|
| Draft HTML + CSS | `sites/mamas-munches/mockups/homepage/index.html` (1086 lines, read in full) |
| Block markup (emitted) | `per_section_results[N].block_markup` from `extract.patched.json` (read via Python JSON, run 2026-06-05-103529) |
| Variation CSS | `per_section_results[N].variation_css` from `extract.patched.json` (same run) |
| icon/render.php | `plugins/sgs-blocks/src/blocks/icon/render.php` |
| icon/block.json | `plugins/sgs-blocks/src/blocks/icon/block.json` |
| notice-banner/render.php | `plugins/sgs-blocks/src/blocks/notice-banner/render.php` |
| announcement-bar/block.json | `plugins/sgs-blocks/src/blocks/announcement-bar/block.json` |

---

## #13 — Ingredients label + intro text: left-aligned in clone, centred in draft

**Symptom:** `.sgs-section-heading__label` (eyebrow) and intro paragraph are centred in the draft but render left-aligned in the clone.

**Draft evidence:**  
- Draft CSS line 507: `.sgs-ingredients-section__inner { max-width: 960px; margin: 0 auto; text-align: center }`  
- Neither the `<span class="sgs-section-heading__label">` element (draft line 915) nor the `<p class="sgs-section-heading__intro">` element (draft line 917) carries an inline `style` attribute with `text-align`.

**Clone-emit evidence:**  
Emitted `sgs/label`:
```
<!-- wp:sgs/label {"text":"What's in them?","fontSize":12,...,"fontWeight":"600","textColour":"text","style":{"spacing":{"margin":{"bottom":"6px"}},"color":{"text":"var:preset|color|text"}}} /-->
```
No `textAlign` key in the label attrs. Emitted `sgs/text` for intro:
```
<!-- wp:sgs/text {"text":"Every Zookie contains the same four galactagogues...","fontSize":16,...,"textColour":"text-muted"} /-->
```
No `textAlign` key.

**Real cause (proven):** The `text-align: center` rule is on `.sgs-ingredients-section__inner` — the ancestor wrapper — not on the label or intro element itself. The converter extracts attributes from each element's own class rules and inline styles, but does NOT propagate inheritable CSS properties (here: `text-align`) from ancestor wrapper rules to child block attrs. Consequence: neither block receives a `textAlign` attr; both default to left-align.

**Corrected prior claim:** The prior report labelled this "class-level CSS not extracted." More precisely: the rule IS on the element's ancestor's class (`.sgs-ingredients-section__inner`), and `text-align` is an inherited CSS property that the converter does not simulate propagating to descendants.

**DOC vs IMPL:** IMPLEMENTATION — converter does not simulate CSS inheritance of `text-align` from ancestor wrapper to child block attrs.

**Fix-shape:** When extracting a child text-role block, check whether the ancestor section/inner wrapper in `variation_css` carries `text-align`; if so, propagate it as `textAlign` to the child block.

---

## #14 — Ingredients intro text: `max-width` + `margin: auto` not carried over

**Symptom:** The intro paragraph stretches to full width instead of capping at 540px with centring.

**Draft evidence:**  
- Draft CSS line 509–514: `.sgs-ingredients-section .sgs-section-heading__intro { font-size: 16px; color: var(--text-muted); margin: 0 auto 36px; max-width: 540px }`  
- The `<p class="sgs-section-heading__intro">` element (draft line 917) has no inline `style` attribute.

**Clone-emit evidence:**  
Emitted `sgs/text`:
```
<!-- wp:sgs/text {"text":"Every Zookie contains the same four galactagogues...","fontSize":16,"fontSizeUnit":"px","lineHeight":1.75,"lineHeightUnit":"unitless","textColour":"text-muted"} /-->
```
No `maxWidth`, no `style.spacing.margin` keys.

**Real cause (proven):** The `max-width: 540px; margin: 0 auto 36px` is on `.sgs-ingredients-section .sgs-section-heading__intro` — a class rule targeting the element's OWN class from the variation CSS. The variation CSS (confirmed in `per_section_results[ingredients-section].variation_css`) includes this rule verbatim. However, the converter does not harvest `max-width` or `margin` from class-level CSS rules into block-level attrs — only from inline `style=""` attributes.

**Corrected prior claim:** The prior report stated "class-level CSS not extracted" as the root. More precisely: the rule targets the element's own class (`.sgs-section-heading__intro`), but `max-width` and `margin` are layout properties that the converter does not map to block attrs from class rules.

**DOC vs IMPL:** IMPLEMENTATION — converter lacks a `max-width` / `margin: auto` harvester for class-scoped rules on text-role elements.

**Fix-shape:** For `sgs/text` blocks, when the variation CSS contains a rule for the element's class with `max-width` or `margin: 0 auto`, emit those as `style.spacing.margin` + a custom `maxWidth` attr (if the block supports it).

---

## #15 — Ingredient grid icons: clone shows Lucide SVG stars, not the draft's emoji glyphs

**Symptom:** Four ingredient info-boxes should each show an emoji icon (🌾 🍺 🌿 🌱) but the clone shows a default Lucide star SVG.

**Draft evidence:**  
- Draft lines 921–939: four `.sgs-info-box__icon` divs contain emoji text nodes — e.g. `<div class="sgs-info-box__icon" aria-hidden="true">🌾</div>`.  
- Draft CSS line 522: `.sgs-info-box__icon { font-size: 32px; margin-bottom: 10px }`

**Clone-emit evidence:**  
All four info-boxes in the emitted markup show:
```
<!-- wp:sgs/icon {"linkUrl":"🌾","style":{"spacing":{"margin":{"bottom":"10px"}}}} /-->
<!-- wp:sgs/icon {"linkUrl":"🍺",...} /-->
<!-- wp:sgs/icon {"linkUrl":"🌿",...} /-->
<!-- wp:sgs/icon {"linkUrl":"🌱",...} /-->
```
No `iconSource` key present in any emit → defaults to `"lucide"`. No `emojiChar` key.

**Block code evidence:**  
`icon/block.json` (confirmed via Python read):  
- `iconSource.default = "lucide"` (enum: lucide, wp-icon, dashicon, emoji)  
- `emojiChar.default = ""`  
- `linkUrl.default = ""`

`icon/render.php` lines 39–42: `$icon_source = $attributes['iconSource'] ?? 'lucide';` — no `iconSource` in attrs → resolves to `'lucide'`.  
`icon/render.php` lines 164–170: lucide branch calls `sgs_get_lucide_icon($icon_name)` where `$icon_name = $attributes['iconName'] ?? 'star'` → since `iconName` is also absent → renders the `star` Lucide SVG.  
`icon/render.php` lines 50–51: `$emoji_char = $attributes['emojiChar'] ?? ''` → empty → unused.  
`icon/render.php` lines 59–60: `$link_url = $attributes['linkUrl'] ?? ''` — the emoji stored in `linkUrl` is treated as a URL string (used only for `<a href>`), not displayed as icon content.

**Real cause (proven):** The converter stores the extracted emoji glyph in the `linkUrl` attribute (wrong field). The `sgs/icon` block requires `{"iconSource":"emoji","emojiChar":"🌾"}` to enter the emoji render branch. With `linkUrl="🌾"` and no `iconSource`, the block defaults to Lucide/star. The emoji in `linkUrl` is not rendered — it is treated as a URL and passed to `esc_url()` which strips emoji characters.

**No "class CSS not extracted" component.** The emoji is extracted from the DOM text node; the issue is purely field mis-mapping.

**DOC vs IMPL:** IMPLEMENTATION — converter maps emoji text node to `linkUrl` instead of `emojiChar` + `iconSource:"emoji"`.

**Fix-shape:** When extracting an `.sgs-icon` / `.sgs-info-box__icon` node and the text content is a Unicode emoji (not a URL), emit `{"iconSource":"emoji","emojiChar":"🌾"}`. Clear `linkUrl` or leave it empty.

---

## #16 — Info-box icon and `<p>` text: left-aligned; wrong font-size + line-height on `<p>`

**Symptom (alignment):** Icons and text within the 4 ingredient info-boxes are left-aligned; draft shows centred layout within each card.

**Draft evidence:**  
- Draft CSS line 507: `.sgs-ingredients-section__inner { text-align: center }` — ancestor rule, same as #13.  
- The `<div class="sgs-info-box">` element has no inline `text-align` (draft lines 920–940).

**Clone-emit evidence (alignment):**  
Each emitted `sgs/info-box` has no `textAlign` attr:
```
<!-- wp:sgs/info-box {"style":{"border":{"radius":"12px",...},"spacing":{"padding":{"top":"22px","right":"16px","bottom":"22px","left":"16px"}}}} -->
```

**Real cause (alignment — proven):** Same CSS-inheritance mechanism as #13. The ancestor `.sgs-ingredients-section__inner { text-align: center }` is not an own-class rule for `.sgs-info-box`; it is an ancestor rule. The converter does not propagate inherited `text-align` from the ancestor into the `sgs/info-box` or its children.

**Symptom (font-size):** Draft uses `font-size: 13px; line-height: 1.55` for `.sgs-info-box p`. Clone emits `fontSize: 17, lineHeight: 1.75`.

**Draft evidence (typography):**  
- Draft CSS line 530: `.sgs-info-box p { font-size: 13px; color: var(--text-muted); line-height: 1.55 }`  
- None of the four `<p>` elements inside info-boxes carry inline `style` attributes.

**Clone-emit evidence (typography):**  
Each info-box `sgs/text`:
```
<!-- wp:sgs/text {"text":"Rich in iron. Used in postpartum foods across cultures for centuries.","fontSize":17,"fontSizeUnit":"px","lineHeight":1.75,...} /-->
```
`fontSize: 17` and `lineHeight: 1.75` are extracted — but from where? The variation CSS shows the section-level intro text slot has `font-size: 16px; line-height: 1.75` (`.sgs-ingredients-section .sgs-section-heading__intro`). The 17px/1.75 values do not match either the draft's `.sgs-info-box p` (13px/1.55) OR the intro text (16px/1.75). The 17px appears to be the extractor's default fallback or cross-slot bleed. The `.sgs-info-box p` class rule is present in `variation_css` but not as an own-class rule on the individual `<p>` element — only as an element-within-class rule. The converter does not match element-type selectors (`.sgs-info-box p`) when harvesting attrs for the `sgs/text` block.

**Real cause (typography — proven by elimination):** The draft CSS rule is `.sgs-info-box p { font-size: 13px }` — a combinator selector matching `<p>` elements inside `.sgs-info-box`. The converter extracts attrs from an element's OWN classes and inline styles, not from combinator/descendant selectors. Result: the `<p>` does not have its own class matching a rule with 13px; the converter falls back to the section's default `sgs/text` size (17px from the intro slot or a global default).

**DOC vs IMPL:** IMPLEMENTATION — both sub-causes are converter extraction gaps: (a) no CSS inheritance propagation from ancestor `text-align`, (b) no descendant-selector (`.parent elem`) harvesting for typography.

**Fix-shape:** (a) Same as #13. (b) When harvesting font-size for a `<p>` element inside `.sgs-info-box`, also check `variation_css` for `.sgs-info-box p` selectors.

---

## #17 — Grid gap between the 4 info-boxes: wrong on live page (correct in editor)

**Symptom:** The four info-box cards should have `gap: 14px` between them. Correct in block editor; wrong (wider) on live page.

**Draft evidence:**  
- Draft CSS line 515: `.sgs-feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px }`

**Clone-emit evidence:**  
```
<!-- wp:sgs/feature-grid {"style":{"spacing":{"margin":{"bottom":"24px"},"blockGap":"14px"}},"gridTemplateColumns":"1fr 1fr","gap":"14px"} -->
```
The gap IS emitted correctly as `"gap":"14px"`.

**Variation CSS evidence:**  
`per_section_results[ingredients-section].variation_css` contains:  
`.sgs-feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px }`  
AND:  
`.page-id-144 .sgs-feature-grid { display: grid; margin-bottom: 24px }` — note: the `.page-id-144 .sgs-feature-grid` rule does NOT include `gap`. This is the page-scoped CSS override rule that the theme snapshot may be deploying for the live canary page.

**Real cause (partially proven):** The converter correctly emits `gap: 14px`. The variation CSS includes a `.page-id-144 .sgs-feature-grid { display: grid; margin-bottom: 24px }` rule (without `gap`) in addition to the base `.sgs-feature-grid { gap: 14px }` rule. If the theme CSS enqueues the `.page-id-144` scoped block AFTER the base rule but the scoped rule omits `gap`, and the block's own scoped `#uid` inline style has lower specificity than `.page-id-144 .sgs-feature-grid` (compound class+id vs compound class-only: `#uid.class` = 1,1,0 vs `.page-id-144 .sgs-feature-grid` = 0,2,0 — the `#uid` wins), then the `#uid` inline style should win... BUT only if the render.php correctly emits the scoped style. Live DOM verification required to determine which rule is actually winning.

**UNVERIFIED — needs live-DOM check:** `getComputedStyle(document.querySelector('.sgs-feature-grid')).gap` on page 144.

**DOC vs IMPL:** NOT a converter fault (emit is correct). Possible IMPL fault in theme CSS generation (`.page-id-144` scoped rule drops `gap`) — PARTIAL EVIDENCE only; live DOM needed to confirm.

**Fix-shape:** Live DOM inspect. If `.page-id-144 .sgs-feature-grid` wins and has no gap, add `gap` to that rule in the theme snapshot CSS generator.

---

## #18 — Notice-banner: empty render on live page despite text in emitted attrs

**Symptom:** The disclaimer banner at the bottom of the ingredients section renders as an empty styled container — no text visible.

**Draft evidence:**  
- Draft lines 942–943: `<p class="sgs-ingredients-section__disclaimer">We make nourishing food. We don't make medical claims...</p>`  
- Draft CSS line 531–542: `.sgs-ingredients-section__disclaimer { font-size: 14px; ... background: white; border-radius: 10px; border: 1px solid var(--border) }`

**Clone-emit evidence:**  
```
<!-- wp:sgs/notice-banner {"text":"We make nourishing food. We don't make medical claims. If you have specific concerns about lactation, your IBCLC or midwife is the right person to speak to.","textColour":"text-muted","style":{"spacing":{"margin":{"bottom":"16px","top":"0","right":"auto","left":"auto"},"padding":{"top":"16px","right":"20px","bottom":"16px","left":"20px"}},"border":{"radius":"10px","width":"1px","style":"solid","color":"var:preset|color|border"}}} /-->
```
Self-closing emit (`/-->`). The `text` scalar attr IS present in the emit with the correct text content. No InnerBlocks child.

**Block render.php evidence:**  
`notice-banner/render.php` line 28–30:
```php
// FR-22-6: $text is no longer rendered here — the text content slot is now
// an InnerBlocks child (sgs/text), emitted via $content below.
// Retained in block.json for deprecated.js back-compat only. R-22-14: no fallback.
```
`render.php` line 105: `$sgs_inner_html .= $content;` — where `$content` is WP's InnerBlocks output. Because the emit is self-closing with no InnerBlocks children, `$content` = `""`.  
`render.php` line 39: `$show_icon = ! empty( $attributes['showIcon'] ) && 'none' !== $legacy_icon;` — `showIcon` is absent from the emit → `!empty(null)` = false → icon suppressed.

**Real cause (proven):** The block's render.php was migrated to FR-22-6 (InnerBlocks API): `text` is no longer read from `$attributes['text']`. The render.php explicitly documents this (line 28–30) and R-22-14 prohibits adding a fallback. The converter emits the pre-FR-22-6 scalar `text` attr in a self-closing block comment. The render.php receives `$content = ""` and renders an empty styled wrapper with no text and no icon.

**Prior claim assessment:** The prior Part 3 report correctly identified this. Confirmed as fully correct: the text IS in the emit attrs; the render.php intentionally ignores it.

**DOC vs IMPL:** IMPLEMENTATION — converter emits legacy scalar `text` API; block render.php expects InnerBlocks `sgs/text` child (post-FR-22-6). Converter has not been updated to emit the new form.

**Fix-shape:** Converter: replace self-closing emit with:
```
<!-- wp:sgs/notice-banner {attrs-without-text} -->
<!-- wp:sgs/text {"text":"We make nourishing food...","textColour":"text-muted"} /-->
<!-- /wp:sgs/notice-banner -->
```

---

## #19 — Gift section: sub text `textAlign: center` bleeds to wrong slot; h2 has no align; card description font-size wrong

**Symptom:** The intro sub text ("For baby showers, new arrivals...") is centred in the draft and clone (correct). The gift card description paragraphs should be left-aligned but may appear centred. The h2 has no `textAlign` attr.

**Draft evidence:**  
- Draft HTML line 954: `<p class="sgs-gift-section__sub">` — has no inline `text-align`.  
- Draft CSS line 556: `.sgs-gift-section .sgs-section-heading__sub { font-size: 16px; color: var(--text); margin-bottom: 32px }` — no `text-align` on the sub.  
- Draft HTML line 953: `<h2 id="gift-h2">` — no inline `text-align`.  
- Draft CSS line 555: `.sgs-gift-section h2 { font-size: 28px; font-weight: 600; color: var(--text); margin-bottom: 8px }` — no `text-align`.

**Clone-emit evidence:**  
Emitted `sgs/text` for intro sub (after h2 in gift section):
```
<!-- wp:sgs/text {"text":"For baby showers, new arrivals, and the mums who deserve a treat.","fontSize":17,"fontSizeUnit":"px","lineHeight":1.75,"lineHeightUnit":"unitless","textAlign":"center","textColour":"text-muted"} /-->
```
The `textAlign: center` IS emitted on the sub text — but the draft CSS for `.sgs-gift-section .sgs-section-heading__sub` does NOT include `text-align: center`. Where did `textAlign: center` come from? The variation CSS (`per_section_results[gift-section].variation_css`) contains the gift section rules and does not show `text-align: center` on `.sgs-gift-section .sgs-section-heading__sub`. 

**UNVERIFIED — cross-slot bleed origin:** The `textAlign: center` on the gift sub appears to have been extracted from a rule belonging to another section (e.g., the social-proof sub, which does have `text-align: center`). This is a converter cross-section slot bleed, not a CSS-inheritance issue. Could not confirm the exact source rule from available artefacts; live converter trace needed.

Emitted `sgs/heading` for h2:
```
<!-- wp:sgs/heading {"content":"A gift she'll actually use","level":"h2","fontSize":28,"fontSizeUnit":"px","lineHeight":1.2,"lineHeightUnit":"unitless","fontWeight":"600","textColour":"text"} /-->
```
No `textAlign` — correct, since the draft h2 has no `text-align`.

**Card description font-size (proven):**  
Draft CSS line 577: `.sgs-gift-section__card .sgs-gift-section__card-description { font-size: 14px; color: var(--text-muted); margin-bottom: 20px; line-height: 1.6 }` — a descendant selector targeting `<p class="sgs-gift-section__card-description">`.  
Clone emits card description as:
```
<!-- wp:sgs/text {"text":"The perfect gift for a new mum...","fontSize":17,...,"textColour":"text-muted"} /-->
```
`fontSize: 17` vs draft `14px`. The converter does not harvest from descendant-combinator selectors (`.parent .child`); it reads 17px from the section's default text slot.

**Real cause:**  
(a) `textAlign: center` on the sub text: UNVERIFIED — cross-section slot bleed suspected, not confirmed by available artefacts.  
(b) Card description font-size wrong: same descendant-selector harvesting gap as #16 — PROVEN.  
(c) h2 no textAlign: correct behaviour (draft has no text-align on h2).

**DOC vs IMPL:** IMPLEMENTATION. (a) UNVERIFIED. (b) Descendant-selector harvesting gap — same as #16.

---

## #20 — Gift section: missing gap between sub text and cards grid; missing bottom margin on cards grid

**Symptom:** Sub text ("For baby showers...") sits too close to the cards grid. Cards grid has no bottom margin before the announcement bar.

**Draft evidence:**  
- Draft CSS line 556: `.sgs-gift-section .sgs-section-heading__sub { margin-bottom: 32px }` — on the sub text's own class.  
- Draft CSS line 557: `.sgs-gift-section__cards { gap: 16px; margin-bottom: 20px }` — on the cards container's own class.

**Clone-emit evidence:**  
Emitted `sgs/text` for sub:
```
<!-- wp:sgs/text {"text":"For baby showers...","fontSize":17,...,"textAlign":"center","textColour":"text-muted"} /-->
```
No `style.spacing.margin.bottom` → no bottom margin of 32px.

Emitted cards container:
```
<!-- wp:sgs/container {"className":"sgs-gift-section__cards","htmlTag":"div","layout":"grid","gridTemplateColumns":"1fr 1fr","gridTemplateColumnsMobile":"1fr","gap":"16px"} -->
```
`gap: 16px` IS extracted correctly. No `style.spacing.margin.bottom: 20px`.

**Real cause (proven):**  
(a) The sub text `margin-bottom: 32px` is in the variation CSS under `.sgs-gift-section .sgs-section-heading__sub` — a rule targeting the element's own class (`.sgs-section-heading__sub`) within the section. The converter does not harvest `margin-bottom` from class rules into block `style.spacing.margin` attrs.  
(b) The `margin-bottom: 20px` on `.sgs-gift-section__cards` is similarly a class rule; the converter extracts `gap` (structural) but not `margin` (spacing).  

Both are cases where the converter does not map CSS class-rule `margin-bottom` to block `style.spacing.margin.bottom`.

**DOC vs IMPL:** IMPLEMENTATION — converter does not harvest `margin-bottom` from class-level CSS rules on either text-role or container-role blocks.

**Fix-shape:** For text blocks and containers, scan variation CSS for rules matching the element's own class, and if `margin-bottom` is present, emit it as `style.spacing.margin.bottom`.

---

## #21 — Gift card labels: text, colour, and styling wrong

**Symptom:** Each gift card should have its own label tag ("Gift idea" / "Most thoughtful") with `background: surface-pink, color: primary-dark`. Prior report claimed slot collision caused both cards to get "Most thoughtful" — CORRECTED BELOW.

**Draft evidence:**  
- Card 1 (draft line 958): `<span class="sgs-gift-section__card-tag">Gift idea</span>`  
- Card 2 (draft line 965): `<span class="sgs-gift-section__card-tag">Most thoughtful</span>`  
- Draft CSS lines 564–575: `.sgs-gift-section__card-tag { background: var(--surface-pink); color: var(--primary-dark); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px }`

**Clone-emit evidence (corrects prior claim):**  
The actual emitted gift-section block_markup shows BOTH cards correctly emitted with their individual labels:
```
<!-- wp:sgs/info-box {...} -->
<!-- wp:sgs/label {"text":"Gift idea","fontSize":11,...,"textColour":"primary-dark","style":{"spacing":{"margin":{"bottom":"12px"}},"color":{"background":"var:preset|color|surface-pink","text":"var:preset|color|primary-dark"}}} /-->
...
<!-- /wp:sgs/info-box -->
<!-- wp:sgs/info-box {...} -->
<!-- wp:sgs/label {"text":"Most thoughtful","fontSize":11,...,"textColour":"primary-dark","style":{"spacing":{"margin":{"bottom":"12px"}},...}} /-->
...
<!-- /wp:sgs/info-box -->
```
Both label texts are correct. Both have `background: surface-pink`, `color: primary-dark` — matching the draft.

**Corrected prior claim:** The prior report claimed "slot collision giving both cards the 'Most thoughtful' label." This is WRONG. The actual emitted block_markup shows each card gets its own correct label with correct text and colour. There is NO label slot collision in this run.

**Real cause:** NO DEFECT in label text or colour — both are emitted correctly. If there is a visual label issue in the clone, it is not caused by the converter emission but would need live-DOM investigation.

**DOC vs IMPL:** NO FAULT in label emission for this run.

---

## #22 — Gift card h3: wrong font-size or centred; card description font-size wrong

**Symptom:** Card h3 headings and description text may show wrong styling.

**Draft evidence:**  
- Draft CSS line 576: `.sgs-gift-section__card h3 { font-size: 22px; font-weight: 600; color: var(--text); margin-bottom: 8px }` — descendant selector.  
- Draft CSS line 577: `.sgs-gift-section__card .sgs-gift-section__card-description { font-size: 14px; color: var(--text-muted); margin-bottom: 20px; line-height: 1.6 }` — descendant selector.

**Clone-emit evidence:**  
Each card's h3 from actual block_markup:
```
<!-- wp:sgs/heading {"content":"New Baby Gift Box","level":"h3","fontSize":22,"fontSizeUnit":"px","lineHeight":1.2,"lineHeightUnit":"unitless","fontWeight":"600","textColour":"text"} /-->
<!-- wp:sgs/heading {"content":"40-Day Care Bundle","level":"h3","fontSize":22,...} /-->
```
`fontSize: 22`, `fontWeight: 600`, `textColour: text` — all match the draft. No `textAlign` emitted → left-aligned by default, which matches the draft (no `text-align` on `.sgs-gift-section__card h3`).

Card description text:
```
<!-- wp:sgs/text {"text":"The perfect gift for a new mum...","fontSize":17,...,"textColour":"text-muted"} /-->
<!-- wp:sgs/text {"text":"Six weekly deliveries...","fontSize":17,...,"textColour":"text-muted"} /-->
```
`fontSize: 17` vs draft `14px`. `textColour: text-muted` matches draft.

**Real cause:**  
h3 heading: NO DEFECT in heading attrs — font-size, weight, colour all correct. `textAlign` correctly absent.  
Card description: `fontSize: 17` instead of 14px. The `.sgs-gift-section__card .sgs-gift-section__card-description { font-size: 14px }` is a descendant-combinator CSS rule — the converter does not match descendant selectors when harvesting attrs for the `<p>` element (same mechanism as #16).

**Corrected prior claim:** Prior report claimed h3 centring issue. The actual emit shows NO `textAlign` on h3 — no centring defect in the emit. If h3 is centred on live, that is a RENDER/THEME issue, not a converter issue.

**DOC vs IMPL:** IMPLEMENTATION — description font-size gap only (descendant-selector harvesting). h3 emit is correct.

---

## #23 — Gift card buttons: both show primary style (whether this is wrong depends on draft)

**Draft evidence:**  
- Draft lines 962, 969: both `<a class="sgs-button sgs-button--primary">` — both gift card CTAs are `sgs-button--primary` style.

**Clone-emit evidence:**  
Both card buttons:
```
<!-- wp:sgs/button {"label":"Shop Gift Box","url":"/product/gift-box/","fontSize":15,...,"style":{"color":{"background":"var:preset|color|primary"},...},"inheritStyle":"primary"} /-->
<!-- wp:sgs/button {"label":"Shop Bundle","url":"/product/40-day-bundle/","fontSize":15,...,"inheritStyle":"primary"} /-->
```
Both emitted as `inheritStyle: primary` with `background: primary` colour — matching the draft.

**Real cause:** If the live buttons look wrong (not coral/primary coloured), the defect is at the RENDER/CSS layer, not the converter. The emit is correct. A `style.color.background: var:preset|color|primary` inline override is present — this should be the most specific rule. UNVERIFIED at live-DOM level what override might win.

**DOC vs IMPL:** Converter emit is CORRECT. Any visible defect is RENDER/CSS layer — UNVERIFIED.

---

## #24 — Gift price text: wrong font family, no margin; content correct

**Symptom:** Price text (£15, £42) should use Fraunces serif font with `margin-bottom: 16px`.

**Draft evidence:**  
- Draft CSS lines 578–584: `.sgs-gift-section__card-price { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 700; color: var(--text); margin-bottom: 16px }` — own-class rule on `.sgs-gift-section__card-price`.  
- Draft HTML lines 961, 968: `<div class="sgs-gift-section__card-price">£15</div>` and `£42`.

**Clone-emit evidence:**  
```
<!-- wp:sgs/text {"text":"£15","fontSize":30,"fontSizeUnit":"px","fontWeight":"700","textColour":"text"} /-->
<!-- wp:sgs/text {"text":"£42","fontSize":30,"fontSizeUnit":"px","fontWeight":"700","textColour":"text"} /-->
```
Both texts correct. `fontSize: 30`, `fontWeight: 700`, `textColour: text` — all correct. No `fontFamily` attr. No `style.spacing.margin.bottom`.

**Corrected prior claim:** Prior report claimed "single-slot collision causes wrong price text." The actual emit shows BOTH prices correctly rendered in their respective cards with correct values. No slot collision on price text.

**Real cause (proven):**  
(a) `fontFamily` absent: draft CSS `.sgs-gift-section__card-price { font-family: 'Fraunces', serif }` — own-class rule on the element. The converter does not harvest `font-family` from class-level CSS rules; it is not in the block's inline style or emit.  
(b) `margin-bottom: 16px` absent: same own-class rule — `margin-bottom` not harvested from class CSS rules (same gap as #20).

**DOC vs IMPL:** IMPLEMENTATION — converter does not harvest `font-family` or `margin-bottom` from class-level CSS rules into `sgs/text` block attrs.

**Fix-shape:** Extend the class-CSS harvester to map `font-family: 'Fraunces', serif` → a `fontFamily` block attr; map `margin-bottom` → `style.spacing.margin.bottom`.

---

## #25 — Gift cards: unequal height (40-day bundle card taller)

**Draft evidence:**  
- Draft CSS line 601–602 (media query): `@media (min-width: 640px) { .sgs-gift-section__cards { grid-template-columns: 1fr 1fr } }` — CSS Grid, `align-items` not explicitly set (defaults to `stretch`).

**Clone-emit evidence:**  
Cards grid container:
```
<!-- wp:sgs/container {"className":"sgs-gift-section__cards","htmlTag":"div","layout":"grid","gridTemplateColumns":"1fr 1fr","gridTemplateColumnsMobile":"1fr","gap":"16px"} -->
```
Each card is `sgs/info-box` with identical padding/border attrs. No `height: 100%` on info-box, no `align-items: stretch` set explicitly.

**Real cause:** UNVERIFIED — needs live-DOM check. The CSS Grid `align-items: stretch` should make both cells equal height IF the `sgs/info-box` wrapper element is `height: 100%` (or has `align-self: stretch` by default). Whether the block's wrapper CSS satisfies this cannot be determined from the emitted markup alone — requires inspecting `getComputedStyle(infoBox).height` on both cards.

**UNVERIFIED — needs live DOM inspection.**

**DOC vs IMPL:** Cannot classify without live DOM evidence.

---

## #26 — Announcement bar: default promotional message shown instead of draft content; wrong visual format

**Draft evidence:**  
- Draft HTML lines 973–976: An inline `<div class="sgs-announcement-bar--send-to-ward">` inside the gift section containing a `<p>` with hospital emoji and "Send to Ward" text, and an `<a href="/send-to-ward/">Find out more →</a>` link.  
- Draft CSS lines 586–599: the element is a flex row with `background: white; border: 1px solid var(--primary); border-radius: 10px; padding: 14px 18px`.

**Clone-emit evidence:**  
```
<!-- wp:sgs/announcement-bar {"className":"sgs-announcement-bar--send-to-ward"} /-->
```
Only the className is emitted. No `messages` attr.

**Block default evidence:**  
`announcement-bar/block.json` (confirmed via Python read):
```json
"messages": {
  "default": [{"text":"🎉 New product launch — get 20% off with code LAUNCH20!","ctaText":"Shop Now","ctaUrl":""}]
}
```
With no `messages` in the emit, the block uses this default — wrong promotional message.

**Structural mismatch (proven):** The draft element is a scoped inline flex row nested INSIDE the gift section container. The `sgs/announcement-bar` block is a page-level sticky banner with JavaScript dismiss/countdown controls. Even if the `messages` were correctly extracted, the block's render structure (sticky top banner) differs fundamentally from the draft's inline box.

**Real cause (proven):**  
(a) Converter does not extract the `messages` array or CTA link from the draft element — only the BEM modifier class is carried.  
(b) There is a structural semantic mismatch: the draft element is a scoped informational box; the block is a page-level sticky bar.

**DOC vs IMPL:** IMPLEMENTATION — (a) converter extraction absent for messages content. (b) Block-vs-draft semantic mismatch requires design decision.

---

## #27 — Social-proof section: wrong gap between sub text and trustpilot strip

**Symptom:** Sub text ("Real feedback from real mums") sits too close to the trustpilot bar.

**Draft evidence:**  
- Draft CSS line 619–623 (variation_css confirmed): `.sgs-social-proof .sgs-section-heading__sub { font-size: 16px; color: var(--text-muted); text-align: center; margin-bottom: 32px }` — own-class rule (`.sgs-section-heading__sub` within `.sgs-social-proof`).

**Clone-emit evidence:**  
```
<!-- wp:sgs/text {"text":"Real feedback from real mums — nothing fabricated.","fontSize":17,"fontSizeUnit":"px","lineHeight":1.75,"lineHeightUnit":"unitless","textAlign":"center","textColour":"text-muted"} /-->
```
`textAlign: center` IS correctly extracted (from `.sgs-social-proof .sgs-section-heading__sub { text-align: center }`). No `style.spacing.margin.bottom` → missing 32px margin.

**Real cause (proven):** The `margin-bottom: 32px` is on `.sgs-social-proof .sgs-section-heading__sub` — an own-class rule for the element. The converter harvests `text-align` from that rule (evident in the emit: `textAlign: center`) but does NOT harvest `margin-bottom`. The gap between two text-direction-extractable properties and margin shows the converter has selective class-CSS harvesting: `text-align` → `textAlign` (supported); `margin-bottom` → not harvested.

**Note:** This is a different mechanism from the "inheritance" issue in #13. Here the rule IS on the element's own class (`.sgs-section-heading__sub` scoped to `.sgs-social-proof`) — the converter successfully extracts `text-align` from it, proving the rule IS processed. The gap is specifically `margin-bottom` not being in the harvesting set.

**DOC vs IMPL:** IMPLEMENTATION — `margin-bottom` not in the class-CSS-to-block-attr harvesting map.

---

## #28 — Trustpilot strip: stars vertically misaligned; wrong colours on logo and stars text

**Symptom:** The trustpilot strip flex container has no `alignItems: center`; the "★ Trustpilot" and star characters have wrong colours.

**Draft evidence:**  
- Draft CSS line 630 (variation_css confirmed): `.sgs-social-proof__trustpilot-bar { background: white; border: 1px solid var(--border); border-radius: 10px; padding: 18px 24px; display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 28px; flex-wrap: wrap }`  
- Draft CSS line 637: `.sgs-social-proof__trustpilot-logo { font-size: 13px; font-weight: 700; color: #00B67A }`  
- Draft CSS line 638: `.sgs-social-proof__trustpilot-stars { font-size: 20px; color: #00B67A }`  
- Draft CSS line 639: `.sgs-social-proof__trustpilot-text { font-size: 13px; color: var(--text-muted) }`

**Clone-emit evidence:**  
Trustpilot bar container:
```
<!-- wp:sgs/container {"className":"sgs-social-proof__trustpilot-bar","htmlTag":"div","layout":"flex","gap":"14px"} -->
```
No `alignItems`, no `justifyContent`. The `align-items: center` and `justify-content: center` from the draft CSS rule are not extracted.

Three text children:
```
<!-- wp:sgs/text {"text":"★ Trustpilot","className":"sgs-social-proof__trustpilot-logo"} /-->
<!-- wp:sgs/text {"text":"★★★★★","className":"sgs-social-proof__trustpilot-stars"} /-->
<!-- wp:sgs/text {"text":"Leave us a review — help other mums find us","className":"sgs-social-proof__trustpilot-text"} /-->
```
None have `fontSize`, `fontWeight`, `textColour`, or colour attrs. The className is carried (via BEM modifier logic) but the per-class CSS properties (`font-size: 13px`, `color: #00B67A`, `color: var(--text-muted)`) are not extracted as block attrs.

**Real cause (proven):**  
(a) `alignItems`/`justifyContent` not extracted: `.sgs-social-proof__trustpilot-bar { align-items: center; justify-content: center }` is an own-class rule on the container. The converter extracts `gap` from the same rule (`gap: 14px` IS in the emit) but not `align-items` or `justify-content`.  
(b) Per-text colour and font-size: `.sgs-social-proof__trustpilot-logo { color: #00B67A }`, etc. — own-class rules on each text element. The converter carries the `className` but does not harvest colour/font values from per-class CSS rules into block attrs.

**Note on #00B67A:** This is a raw hex value, not a design token. Even if the harvester extracted it, it would need to map to a `style.color.text: #00B67A` inline style (no WP preset token exists for this Trustpilot green). The variation CSS preserves the rule — but the blocks emit no colour attrs at all.

**DOC vs IMPL:** IMPLEMENTATION — (a) `align-items`/`justify-content` not in harvesting map for containers. (b) Per-element-class colour/font-size not harvested into text block attrs.

---

## #29 — Review card styling: wrong font-size on quote and author; wrong author colour; unexpected avatar

**Symptom:** Quote text and author name show wrong font-size (17px vs 14px/13px); author colour wrong (text-muted vs text); an unexpected avatar circle appears.

**Draft evidence:**  
- Draft CSS lines 648–650 (variation_css confirmed):  
  `.sgs-testimonial__text { font-size: 14px; color: var(--text-muted); line-height: 1.65; font-style: italic; margin-bottom: 12px }`  
  `.sgs-testimonial__author { font-size: 13px; font-weight: 600; color: var(--text) }`  
- Draft HTML lines 996–1010: `<div class="sgs-testimonial__stars">`, `<p class="sgs-testimonial__text">`, `<p class="sgs-testimonial__author">` — no inline styles.

**Clone-emit evidence:**  
From actual block_markup (all three testimonials follow this pattern):
```
<!-- wp:sgs/testimonial {"style":{"border":{"radius":"12px","width":"1px","style":"solid","color":"var:preset|color|border"},"spacing":{"padding":{"top":"20px","right":"20px","bottom":"20px","left":"20px"}}}} -->
<!-- wp:sgs/star-rating {"style":{"spacing":{"margin":{"bottom":"8px"}},"color":{"text":"var:preset|color|accent"}}} /-->
<!-- wp:sgs/text {"text":"\"I was sceptical...\"","fontSize":17,"fontSizeUnit":"px","lineHeight":1.75,"lineHeightUnit":"unitless","fontStyle":"italic","textColour":"text-muted"} /-->
<!-- wp:sgs/text {"text":"Reham, London","fontSize":17,"fontSizeUnit":"px","lineHeight":1.75,"lineHeightUnit":"unitless","fontWeight":"600","textColour":"text-muted"} /-->
<!-- /wp:sgs/testimonial -->
```

**Real cause (proven per sub-issue):**

(a) **Quote font-size 17px vs draft 14px:** Variation CSS: `.sgs-testimonial__text { font-size: 14px }` is an own-class rule. The converter emits `fontSize: 17` — the class rule's `font-size: 14px` is not harvested; the 17px comes from a section-level default or fallback. Same mechanism as #16 (own-class CSS rules for typography not harvested).

(b) **Author font-size 17px vs draft 13px; `textColour: text-muted` vs draft `color: var(--text)`:** Variation CSS: `.sgs-testimonial__author { font-size: 13px; font-weight: 600; color: var(--text) }`. Emit: `textColour: text-muted` — wrong colour. `fontWeight: 600` IS correctly extracted. `fontSize: 17` — 13px not harvested. Same own-class CSS harvesting gap. `text-muted` colour is incorrect: the draft specifies `color: var(--text)` which maps to the `text` token, not `text-muted`.

(c) **`margin-bottom: 12px` on quote text not emitted:** Own-class rule `.sgs-testimonial__text { margin-bottom: 12px }` — `margin-bottom` not in harvesting map (same as #20, #27).

(d) **Stars colour:** Variation CSS: `.sgs-testimonial__stars { color: var(--accent); font-size: 15px }`. Emitted `sgs/star-rating`: `{"style":{"color":{"text":"var:preset|color|accent"}}}` — `color: accent` IS correctly extracted. Stars font-size is a separate concern (sgs/star-rating has its own size control).

(e) **Unexpected avatar:** The prior report suggested the testimonial render.php always renders an avatar. The actual emitted markup uses `sgs/testimonial` with InnerBlocks children (quote text + author text as `sgs/text` blocks). The `sgs/testimonial` render.php behaviour (whether it renders an avatar from `$content` or always adds one) cannot be confirmed from available artefacts without reading `testimonial/render.php`. **UNVERIFIED** — requires reading `testimonial/render.php` code.

**DOC vs IMPL:** IMPLEMENTATION — (a)(b)(c) own-class CSS typography/colour/margin not harvested. (d) Stars colour correct. (e) Avatar UNVERIFIED.

---

## #30 — Review cards: container background colour visible around each white card

**Symptom:** The testimonial cards should have `background: white` (distinct from the section's `surface-alt` background). If the section background is visible between/around cards, the cards are transparent.

**Draft evidence:**  
- Draft CSS line 642 (variation_css confirmed): `.sgs-testimonial { background: white; border-radius: 12px; padding: 20px; border: 1px solid var(--border) }`

**Clone-emit evidence:**  
Each `sgs/testimonial` emitted with:
```
<!-- wp:sgs/testimonial {"style":{"border":{"radius":"12px","width":"1px","style":"solid","color":"var:preset|color|border"},"spacing":{"padding":{"top":"20px","right":"20px","bottom":"20px","left":"20px"}}}} -->
```
`border-radius: 12px` → correctly emitted as `style.border.radius: 12px`. `padding: 20px` → correctly emitted as `style.spacing.padding`. `border: 1px solid var(--border)` → correctly emitted. No `style.color.background: white` in the emit.

**Real cause (proven):** `.sgs-testimonial { background: white }` is an own-class CSS rule. The converter extracts `border`, `border-radius`, and `padding` from the same class rule into block attrs (all three ARE in the emit) but does NOT extract `background` (or `background-color`) from class-level CSS rules into `style.color.background`. The testimonial renders transparent, showing the `surface-alt` section background through.

**Note:** The variation CSS contains `.sgs-testimonial { background: white }` — this class-level CSS IS emitted as a variation rule (so the CSS class itself would set the background if the block's wrapper element has the `.sgs-testimonial` class). Whether the `sgs/testimonial` render.php adds the `.sgs-testimonial` BEM class to its wrapper is UNVERIFIED — if it does, the CSS would apply and the background would be correct. If not, it renders transparent.

**PARTIAL UNVERIFIED:** The class-CSS-applies-if-class-present path requires confirming `sgs/testimonial` render.php adds `.sgs-testimonial` to wrapper. The block attr path (emitting `style.color.background`) is clearly absent.

**DOC vs IMPL:** IMPLEMENTATION — background colour not extracted from class CSS into block attr. Whether the BEM class on the wrapper picks up the variation CSS rule is UNVERIFIED.

---

## #32 — Block capability: slider/grid toggle and profile-image toggle for testimonial-slider

**This is a capability request, not a pipeline defect. Brief feasibility only.**

**Slider toggle (static grid vs carousel):**  
`sgs/testimonial-slider` block.json currently has `slidesVisible`, `showDots`, `showArrows` — no `displayMode`. A `displayMode: "slider" | "grid"` attr would need: (1) new block.json attr, (2) render.php branch (grid: omit stage/track wrappers, emit plain children), (3) view.js early-exit guard, (4) Inspector SegmentedControl. **Feasible — small, self-contained.**

**Profile image toggle:**  
`sgs/testimonial` currently always renders the avatar footer (if render.php code matches prior analysis). A `showAuthorImage: boolean` attr with an Inspector Toggle and `if ($show_author_image)` gate in render.php would suffice. **Feasible — trivial.**

**Classification:** BLOCK CAPABILITY GAP. No pipeline or converter fault.

---

## Cross-cutting summary

| Point | Evidenced | UNVERIFIED components | Corrected prior claim |
|---|---|---|---|
| 13 | YES — CSS-inheritance (text-align from ancestor) | — | Reframed: ancestor inheritance, not "own-class" |
| 14 | YES — margin/max-width not harvested from own-class rule | — | No prior correction needed |
| 15 | YES — emoji stored in linkUrl, renders as star | — | Confirmed correct |
| 16 | YES — ancestor inheritance (align) + descendant-selector gap (font) | — | Reframed: two distinct mechanisms |
| 17 | PARTIAL — emit correct; .page-id-144 CSS drops gap | Live DOM needed | Partial new evidence on .page-id-144 rule |
| 18 | YES — render.php ignores scalar text; requires InnerBlocks | — | Confirmed correct |
| 19 | PARTIAL — h2 has no align (correct); sub textAlign:center is cross-bleed | Cross-bleed source unconfirmed | Sub textAlign origin unconfirmed; h2 emit correct |
| 20 | YES — margin-bottom not harvested from own-class rules | — | Confirmed |
| 21 | CORRECTED — both labels correctly emitted with correct text and colour | — | Prior "slot collision" claim WRONG; emit is correct |
| 22 | PARTIAL — h3 emit correct; description fontSize wrong | — | h3 centring claim WITHDRAWN (emit has no textAlign) |
| 23 | PARTIAL — emit correct; visual defect is render/CSS | Live DOM needed | Confirmed emit is correct |
| 24 | PARTIAL — fontFamily + margin absent; price text BOTH correct | — | Prior "price text slot collision" claim WRONG |
| 25 | UNVERIFIED | Live DOM needed | — |
| 26 | YES — messages not extracted; structural mismatch | — | Confirmed |
| 27 | YES — margin-bottom not harvested (text-align IS harvested from same rule) | — | Clarifies mechanism: selective harvesting, not total miss |
| 28 | YES — align-items/justify-content not harvested; per-class colour not harvested | — | Confirmed; adds #00B67A raw-hex note |
| 29 | PARTIAL — font-sizes/author-colour wrong; avatar | Avatar behaviour UNVERIFIED | Stars colour correct (emit matches draft) |
| 30 | PARTIAL — background not in block attr; BEM class path | BEM class on wrapper UNVERIFIED | — |
| 32 | YES (feasibility) — both toggles feasible, small | — | — |

**Evidence counts:**  
- Fully evidenced (proven from quoted artefacts): #13, #14, #15, #16, #18, #20, #26, #27, #28  
- Partially evidenced + UNVERIFIED component: #17, #19, #22, #23, #24, #29, #30  
- Fully UNVERIFIED: #25  
- Capability note (no defect classification): #32  

**Corrected prior claims:**  
- #21: Prior "slot collision — both cards get 'Most thoughtful'" — **WRONG**. Actual emit shows each card has its own correct label text and correct colour.  
- #24: Prior "single-slot collision causes wrong price text" — **WRONG**. Actual emit shows both £15 and £42 correctly placed in their respective cards.  
- #22/#29: h3 centring claim and some typography claims were based on extracted_attributes (last-seen value) rather than the actual block_markup. The block_markup (which IS the emitted WP block comment) shows per-card correct values in many cases.  
- Dominant mechanism reframed throughout: "class-level CSS not extracted" → the precise mechanisms are (a) CSS inheritance from ancestor wrappers not simulated, (b) descendant-combinator selectors not harvested, (c) specific CSS properties (margin-bottom, font-family, background, align-items) not in the harvesting map even for own-class rules.
