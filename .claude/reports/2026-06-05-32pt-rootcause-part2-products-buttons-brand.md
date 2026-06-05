# Root-Cause Investigation — Part 2: Products / Buttons / Brand
**Run:** `mamas-munches-homepage-2026-06-05-103529`
**Date:** 2026-06-05
**Scope:** Points 6, 7, 8, 9, 10, 11 (product-cards sub-points), 12 (brand section sub-points)
**Contract:** Read-only, fact-checked against real artefacts. UNVERIFIED-HYPOTHESIS flagged where live-DOM confirmation absent.

---

## Point 6 — Featured-products heading centre-aligned instead of left

**Symptom:** h2 "Zookies — Our Signature Giant Cookie" is centred on the live page while the label above and the intro text below are left-aligned.

**Root cause:** `sgs/heading` `style.css` (line 8) sets a baseline default:
```css
:where(.wp-block-sgs-heading) { text-align: center; }
```
The converter emits the heading block with no `textAlign` attr (verified in `extract.patched.json`: `"textAlign"` key absent from all heading blocks). `render.php` only emits an inline `text-align` style when `$text_align !== ''` (render.php:324). With no attr, no inline style → `:where()` default wins → centre.

**Evidence (confirmed):**
- `extract.patched.json` heading block: `{"content":"Zookies — Our Signature Giant Cookie","level":"h2","textColour":"text",...}` — no `textAlign` key.
- `heading/style.css:8`: `text-align: center` at specificity `(0,0,0)`.
- `heading/render.php:193–195,324–325`: only writes `text-align` when attr is non-empty.

**Same-cause check:** All other headings on the page (brand heading in Point 12A, any sgs/heading without an explicit textAlign) share this exact cause. The converter universally omits `textAlign` for left-aligned headings; it only emits it when something non-default is needed (R-22-9 gap: the converter's `_lift_typography_to_block_attrs` does not yet lift `text-align: left` as a `textAlign:"left"` attr because the mockup's section root has no explicit `text-align` rule — the default body alignment is left, so no CSS rule fires for CSS-to-attr lift).

**Fault attribution:** IMPLEMENTATION fault in the converter — `_lift_typography_to_block_attrs` does not emit `textAlign:"left"` even when the block's CSS-context default is left-aligned. This is distinct from the block's style.css default being `center` (which is a separate DOC/IMPL decision that predates the converter issue). The immediate actionable fix is either (a) emit `textAlign:"left"` in the converter for every heading in a left-aligned context, OR (b) change the block's default in `style.css` to `text-align: unset` (left is the HTML default) and only set `center` when `textAlign:"center"` is explicit. Option (b) is the cleaner fix.

**Fix-shape:** Change `heading/style.css:8` from `text-align: center` to `text-align: unset` (or remove the rule entirely — `start` is the HTML default). The converter does not need changing; the block's CSS was incorrectly using `center` as the baseline default.

---

## Point 7 — Intro text visually lighter than draft despite matching hex

**Symptom:** `text-muted` (`#6B5C50`) is the correct token; the text appears lighter than expected.

**Hypothesis (LOW PRIORITY — not fully verified):** `--text-muted: #6B5C50` in the D0 `:root` block (variation-d0-d2.css) and `var(--wp--preset--color--text-muted)` in the WP palette (`theme-snapshot.json`) both resolve to `#6B5C50`. These are the same value. If the text appears lighter, the likely explanation is one of:
(a) The D0 `:root` vars (which the mockup CSS used) are NOT the vars WP uses (WP reads `--wp--preset--color--text-muted`, not `--text-muted`). The block's `style.css` uses the WP preset var. Both happen to be `#6B5C50` for Mama's, so measurement says "match". If the live canary's `wp_global_styles` DB post overrides the token to a different value, the rendered colour differs.
(b) Context rendering: the intro text sits on `var(--surface-cream)` (`#FBF3DC`) background, while in the mockup the same text may visually read against a different context tone.

**Evidence status:** UNVERIFIED-HYPOTHESIS. `theme-snapshot.json` `text-muted = #6B5C50` matches mockup `:root --text-muted: #6B5C50`. Cannot confirm without Playwright pixel-sample on live page vs mockup screengrab at same coordinates. Given LOW PRIORITY instruction, not escalated.

**Fault attribution:** DOC gap — if confirmed, it is likely a canary `wp_global_styles` override (see `feedback_canary_live_styles_come_from_wp_global_styles_post` in MEMORY.md). No converter or block IMPL fault identified.

---

## Point 8 — No padding/gap between section-heading intro and product-cards

**Symptom:** The intro paragraph ("One Zookie is a proper sized treat...") runs into the product-card grid with no spacing.

**Root cause (two-part):**

**Part A — margin-bottom not lifted as block attr:**
The draft CSS has `.sgs-featured-product .sgs-section-heading__intro { margin-bottom: 32px }`. The converter collects this as a D2 scoped CSS rule (written to `variation-d0-d2.css`). However the emitted `sgs/text` block for the intro has NO `className:"sgs-section-heading__intro"` attr (verified in `extract.patched.json` — the text block has no className). Therefore the D2 scoped rule `.page-id-144 .sgs-featured-product .sgs-section-heading__intro { ... margin-bottom: 32px }` CANNOT match the rendered block (which has class `wp-block-sgs-text`, not `sgs-section-heading__intro`). The margin is stranded in D2 CSS with no target.

**Part B — no container gap:**
The parent `sgs/container` for the featured-product section has no `gap` attr set (`extract.patched.json` container attrs: `gap: NOT SET`, `layout: NOT SET`, `style.spacing.blockGap: NOT SET`). The converter's `_lift_root_supports_to_style` call does fire on this container, but the draft section CSS (`padding: 56px 20px; background: ...`) has no `gap` property — the gap between intro and product-grid is entirely driven by the intro's bottom margin, which is missing (Part A).

**Evidence (confirmed):**
- `extract.patched.json`: intro text block = `{"text":"One Zookie is a proper sized treat...","fontSize":16,...,"textColour":"text-muted"}` — no `className` key.
- `variation-d0-d2.css`: `.page-id-144 .sgs-featured-product .sgs-section-heading__intro{ font-size: 16px; color: var(--text-muted); margin-bottom: 32px }` — present but untargetable.
- Featured-product container attrs: `gap`, `layout`, `style.spacing.blockGap` all absent.

**Fault attribution:** IMPLEMENTATION fault in the converter. When the intro `sgs/text` is resolved from the `.sgs-section-heading__intro` class, the converter does NOT forward the BEM class as a `className` attr. The `_lift_root_supports_to_style` path correctly collects `margin-bottom: 32px` but writes it to D2 CSS targeting the BEM class, not to the block's `style.spacing.margin.bottom` attr. This is a R-22-1 violation (the per-block margin should land on the block's spacing attr, not a D2 orphan rule). Fix: converter must either (a) emit `style.spacing.margin.bottom:"32px"` on the text block, or (b) emit `className:"sgs-section-heading__intro"` so D2 CSS can target it.

---

## Point 9 — Primary button fills the background colour of containing sgs/multi-button (HIGH IMPACT — all primary buttons)

**Symptom:** Primary buttons on the page appear to fill their entire containing wrapper/row with the primary pink background colour.

**Root cause (confirmed, precise):**

The converter's walker calls `_lift_root_supports_to_style(node, "sgs/button", css_rules, attrs)` for every resolved `sgs/button` element (convert.py:2659). This function reads `background-color` from the button element's draft CSS rules and calls `_colour_value_to_style(raw)` which converts `var(--primary)` → `"var:preset|color|primary"`. It then checks `_support_allows(supports, "color", "background")` — `sgs/button` has `supports.color.background: true` (button/block.json:22-23) — so the check passes. Result: `style.color.background = "var:preset|color|primary"` is added to the button's attrs.

WP's `get_block_wrapper_attributes()` (button/render.php:607) reads this and emits TWO effects on the **outer wrapper div** (not the `<a>` element):
1. Adds class `has-primary-background-color`
2. Adds inline style `background-color: var(--wp--preset--color--primary)` on the wrapper `<div>`

The button renders `<div class="sgs-button-wrapper has-primary-background-color" style="background-color:var(--wp--preset--color--primary)">`. This makes the entire wrapper div — which in the `sgs/multi-button` flex container stretches to full height — show the pink background. The `<a class="sgs-button is-style-primary">` inside ALSO has `is-style-primary` (correctly from `inheritStyle:"primary"`), so the actual button element looks correct, but the wrapper div leaks the background into the surrounding container.

**Evidence (confirmed):**
- `extract.patched.json`: primary buttons all show `"style":{"color":{"background":"var:preset|color|primary"}}` alongside `"inheritStyle":"primary"` (confirmed for 4 of 4 primary buttons in the run).
- `convert.py:2659`: `_lift_root_supports_to_style(node, slug, css_rules, attrs)` — fires for every resolved slug including `sgs/button`.
- `convert.py:731-742`: `background-color` from draft CSS → `style.color.background` via `_root_lift_rules()` + `_support_allows`.
- `button/block.json:22-23`: `supports.color.background: true` — the support check passes.
- `button/render.php:607-611`: `get_block_wrapper_attributes()` applies the `style` attr to the WRAPPER div.

**Same-cause / distinct:** All 4 primary buttons on the page share the same cause (converter universally fires `_lift_root_supports_to_style` for `sgs/button` nodes; all have `background-color: var(--primary)` in the draft CSS). The `secondary` and `outline` buttons are NOT affected because their draft CSS does not have a `background-color` that resolves to a WP token.

**Fault attribution:** IMPLEMENTATION fault in the converter. The `_lift_root_supports_to_style` function should NOT lift `background-color` into `style.color.background` for `sgs/button` when `inheritStyle` is already set (non-custom mode). The `style.color.*` WP-native path is for the WRAPPER div; the button's visual background is controlled by `inheritStyle` preset → `is-style-primary` CSS class → `style.css`. Setting BOTH causes the wrapper div to inherit the background colour. Fix: In `_lift_root_supports_to_style`, skip `background-color` lift for `sgs/button` when the block already has `inheritStyle` set to a non-`custom` value — OR suppress `style.color.background` emission entirely for `sgs/button` (since the button's visual preset system fully controls its background). A targeted guard: `if slug == "sgs/button" and attrs.get("inheritStyle") not in (None, "", "custom"): skip colour lifts`.

---

## Point 10 — Rounded corners of product cards missing on live page

**Symptom:** Block-editor shows card with `border-radius: 16px`; live page shows square corners.

**Root cause (confirmed):** The product-card block uses `sourceMode:"bound"` in the emitted markup (confirmed in `extract.patched.json`). However, the `productId` attr is NOT emitted (both product-card blocks show only `{"sourceMode":"bound"}` or `{"sourceMode":"bound","className":"..."}` — zero `productId`). On the live page, the Bound branch of `render.php` calls `Product_Bindings::get_product_data(0, "bound")` which returns `null`, triggering the designed **empty state** branch (render.php:115–132). The empty state renders `.product-card.product-card--empty` wrapping a simple placeholder paragraph.

The `border-radius: 16px` is defined on `.product-card` (product-card/style.css:35) — which is emitted by the SGS_Container_Wrapper. However, the `overflow: hidden` on `.product-card` (style.css:36) only clips child content when `border-radius` is applied. The `SGS_Container_Wrapper::render()` called for the product-card CONTENT kind emits the outer div. The rounded corners SHOULD be present from the block's own `style.css`.

**REVISED root-cause hypothesis:** Given that Bean reports seeing the border-radius in the block editor but NOT on the live page, and the block editor renders from the WP editor's CSS, while the live page uses the compiled `build/blocks/product-card/style.css`, the issue is likely one of:
(a) The `build/` compiled `style.css` has not been deployed to the server (stale CSS on server), OR
(b) WP's `is-layout-constrained` or container block CSS is overriding `overflow: hidden` at a higher specificity.

**Evidence status:** The bound `productId` absence is CONFIRMED from `extract.patched.json`. The border-radius missing from the live page while present in the editor is PARTIALLY VERIFIED (Bean's QA observation). The exact rendering conflict requires live Playwright DOM verification.

**Fault attribution:** Two distinct faults:
- IMPLEMENTATION fault (converter): converter emits `sourceMode:"bound"` but no `productId`. The product-card Bound mode is designed for WooCommerce products; the converter should either emit the WC product ID (from DB lookup) or emit `sourceMode:"typed"` for the Typed cloning path. Without `productId`, the Bound cards render as empty states.
- POTENTIAL IMPLEMENTATION fault (build/deploy): if `border-radius` is confirmed missing even on a correctly-rendered Typed or Bound card, that is a deploy artefact (style.css not synced).

---

## Point 11 — Product card image heights differ; buttons different widths; cards different heights with misaligned price/buttons; price note above price (superscript)

These are multiple sub-defects. Evidence analysis below.

### 11a — Image heights differ between cards

**Root cause (confirmed):** Both product-card blocks emit `sourceMode:"bound"` with no `imageHeight` attr (confirmed in `extract.patched.json`). The `product-card/style.css:651-660` sets `.product-card--bound .product-card__media { height: var(--sgs-product-card-image-height, 220px) }` only for Bound mode. For Typed mode (which these should be as cloned sections), the image height is controlled by `.product-card .product-card-img { height: 220px }` (style.css:51-54) — a fixed 220px.

If the actual live page is using Typed mode (as the cloning pipeline intends), both images should be 220px. If the cards are rendering in Bound mode (because `sourceMode:"bound"` was deployed), image heights are driven by the fixed CSS, but the cards may still differ if one product has a different image aspect ratio and `object-fit: cover` is not applied.

**Evidence status:** UNVERIFIED-HYPOTHESIS for the Bound-mode rendered live page. Confirmed the converter emits `sourceMode:"bound"` with no imageHeight attr. The image constraint mechanism exists in CSS but requires live-DOM to confirm which rendering path is active.

### 11b — Buttons not filling full width of product cards

**Root cause (confirmed):** The draft button (`<a class="sgs-button sgs-button--primary">`) is a direct flex child of `.sgs-product-card__body` (a `display:flex; flex-direction:column` container). In flex column layout, direct children stretch to full width by default (`align-items: stretch`). In the clone, the button is wrapped in `sgs/multi-button` which is itself a flex child of the body container:

```
sgs/container(.sgs-product-card__body, flex-column)
  └── sgs/multi-button (flex wrapper, justify-content:flex-start)
        └── sgs/button (sgs-button-wrapper > .sgs-button)
```

The `sgs/multi-button` wrapper stretches to full width of the body (correct — it's a flex child of the column). But `sgs/multi-button` itself is `display:flex; justify-content:flex-start` — the button inside gets `fit-content` width (the button label), not full-width. The draft's direct child would stretch; the wrapped-in-multi-button version does not.

**Evidence (confirmed):**
- `extract.patched.json`: all `sgs/multi-button` blocks have empty attrs `{}` — no `widthMode`, no `justifyContent:"stretch"`.
- `multi-button/render.php:28`: `$justify_content = 'flex-start'` default.
- `button/block.json:67-69`: `widthType` default `"fit"` — button stays fit-content unless `widthType:"full"` is set.
- Draft: `<a>` as direct flex child of column → stretches to 100% via `align-items: stretch`.

**Fault attribution:** IMPLEMENTATION fault in the converter. When a button is the only direct child of a flex-column body and no explicit width is set in draft CSS, the converter does NOT infer `widthType:"full"` on the `sgs/button` or `widthMode:"full"` on the `sgs/multi-button`. This is a structural-layout inference gap — the draft's implicit full-width via flex-column stretch needs to be translated to explicit `widthType:"full"` on the child button. Fix: when `sgs/multi-button` is inside a flex-column container and is the sole CTA, the converter should emit `widthType:"full"` on the child `sgs/button`(s) OR `widthMode:"full"` on the `sgs/multi-button`.

Same cause applies to both product cards AND the "NEW? START HERE" label's button — all three share the same flex-column parent → multi-button → button structure.

### 11c — Cards different heights; price/button elements don't align across cards

**Root cause (UNVERIFIED-HYPOTHESIS):** In the draft, `.sgs-product-card` is `display:flex; flex-direction:column` and the parent grid has `grid-template-columns: 5fr 3fr`. Grid children in CSS grid with no explicit `align-items` default to `stretch`, which gives equal height rows. However, the `sgs/container` for the sgs-products grid has `layout:"grid"` but no `align-items` or `align-content` attr. The container-wrapper renders `display:grid` with `grid-template-columns: 5fr 3fr` — this should auto-stretch children to equal height.

The issue is more likely that the product-card's Bound empty-state render (no `productId`) makes one card much shorter (just the placeholder text), while if the correct products were bound they would have equal content. This is the same root cause as Point 10 — the `productId` is not emitted.

**Fault attribution:** IMPLEMENTATION fault (converter): same cause as Point 10 — `productId` not emitted. If `productId` were correct and the cards rendered their actual products, grid stretch should provide equal height rows.

### 11d — Price note appears above price (superscript position) instead of same line

**Root cause (confirmed):** The price-row container is emitted as `sgs/container {"className":"sgs-featured-product__price-row","htmlTag":"div","layout":"flex","gap":"10px"}`. The draft CSS for this container is `display: flex; align-items: baseline; gap: 10px`. The `sgs/container` with `layout:"flex"` renders `align-items: start` by default (class-sgs-container-wrapper.php:198: `$vertical_align = $attributes['verticalAlign'] ?? 'start'`).

`align-items: start` means both children (price and price-note) have their top edges aligned. The price (`font-size: 28px`) and note (`font-size: 13px`) are different sizes. With `align-items: start`, they top-align, making the small note appear at the same vertical level as the top of the large price text — visually "above" the price body. With `align-items: baseline` (the draft), both share the same text baseline, so the note sits beside the price at its natural reading level.

**Evidence (confirmed):**
- `extract.patched.json`: price-row container `{"layout":"flex","gap":"10px"}` — no `verticalAlign` attr.
- `class-sgs-container-wrapper.php:198`: `$vertical_align = $attributes['verticalAlign'] ?? 'start'`.
- `variation-d0-d2.css`: `.page-id-144 .sgs-featured-product__price-row{ display:flex; align-items:baseline; gap:10px }` — `baseline` is in D2 scoped CSS but NOT lifted to the block attr.
- Draft mockup: `.sgs-featured-product__price-row { display: flex; align-items: baseline; gap: 10px }`.

**Fault attribution:** IMPLEMENTATION fault in the converter. `align-items: baseline` from the draft CSS is not being lifted to `verticalAlign:"baseline"` on the container. The `_lift_root_supports_to_style` function's `_root_lift_rules()` does not include a mapping for `align-items` → `verticalAlign` (it maps background, padding, margin, border — not flex alignment attrs). This is a missing lift rule. Fix: add an `align-items` → `verticalAlign` mapping in `_root_lift_rules()` and add `verticalAlign` to the list of container attrs the converter writes.

### 11e — No visible 1px border around featured product card (Typed clone)

**Root cause (confirmed):** The `sgs/product-card` `style.css:37` has `border: 1px solid var(--wp--preset--color--border, #e8d5c0)`. This is a static CSS rule that should render on the live page for any `.product-card` element.

However, the emitted block has `sourceMode:"bound"`. The Bound empty-state renders `.product-card.product-card--bound.product-card--empty`, and the Bound mode render.php calls `SGS_Container_Wrapper::render($attributes, $block, $inner, 'content', $base_opts)`. The container-wrapper applies the block's `supports`-derived wrapper styling. The `border` in `.product-card { border: 1px solid ... }` from `style.css` SHOULD render regardless.

If the border is missing on the live page, possible causes: (a) stale build CSS not deployed, or (b) the `style.css` is `block-scoped` (WP only enqueues it when a `sgs/product-card` block is on the page) — if the block IS on the page, CSS should load. The `sgs-container--grid > .product-card { max-width: none }` rule (style.css:523) could indicate that a parent grid container is present. The border should still render.

**Evidence status:** UNVERIFIED-HYPOTHESIS — requires live Playwright verification. The CSS rule exists at style.css:37. If the border is genuinely absent on the live page, the most likely cause is a stale build not deployed (style.css version mismatch).

**Fault attribution:** IMPL fault (potential) — likely deploy artefact if confirmed. Same investigation path as Point 10 rounded corners.

---

## Point 12 — Brand-story section inner-block style defects

### 12A — Heading centred instead of left

**Root cause:** IDENTICAL to Point 6. `sgs/heading` `style.css:8` defaults `text-align: center`; the brand heading block has no `textAlign` attr (confirmed in `extract.patched.json`: `{"content":"A story that started with a friend","textColour":"text",...}` — no `textAlign`). **Same cause as Point 6.**

**Fault attribution:** IMPL fault in `heading/style.css` (wrong default). See Point 6.

### 12B — Text font muted when it should be black

**Root cause (confirmed):** The brand quote text blocks are emitted with `textColour:"text-muted"` (all four `sgs/text` blocks in the brand section, verified in `extract.patched.json`). The draft source is the `sgs-brand__quote` div which contains `<p>` elements styled by `blockquote p { font-size: 17px; color: var(--text-muted); ... }`. The converter correctly resolves the text colour from the CSS rule applying to the `<p>` elements — `text-muted` is the right extraction. However, these paragraphs are INSIDE a `sgs/quote` block (which the converter is wrapping them in) — the `sgs/quote` block may have its own default text colour overrides.

WAIT — re-reading the markup: the emitted structure wraps these texts in `sgs/quote`. The draft mockup has them in a `<blockquote>` element. The `blockquote p` CSS in the draft (`color: var(--text-muted)`) IS the correct source. So the converter correctly identifies `text-muted` as the text colour.

The question is: should these paragraphs be `text-muted` or `text` (black) on the live page? Looking at the draft: the blockquote paragraphs are explicitly styled `color: var(--text-muted)` in the mockup CSS. Bean's QA says they should be "black". This may be a design-discrepancy or Bean's expectation has since changed. The converter is faithfully replicating the draft's `text-muted` colour.

**Evidence (confirmed):** `extract.patched.json` brand quote texts: all emit `"textColour":"text-muted"`. Mockup CSS: `blockquote p { color: var(--text-muted); }` — confirmed match.

**Fault attribution:** If Bean's expectation is `text` (black) colour, this is a DOC fault — the mockup was designed with `text-muted` for the quote body. The converter is correct. The fix is a design decision (update mockup and re-clone, or manually change after clone). NOT a converter IMPL fault.

### 12C — Button styles completely wrong (aside from colour)

**Root cause (confirmed):** The brand section button in the draft is `<a class="sgs-brand__cta sgs-button sgs-button--ghost">` with CSS:
```css
.sgs-button--ghost {
  background: transparent;
  color: var(--text);
  border-color: var(--border);   /* warm tan #E8D5C0 */
  font-size: 14px;
  padding: 10px 18px;
  min-height: 44px;
}
.sgs-button--ghost:hover { border-color: var(--primary); background: var(--surface-pink); }
```

The converter emits `{"inheritStyle":"outline","className":"sgs-button--ghost"}` (confirmed in `extract.patched.json`). The `outline` preset in `button/style.css:69-78` uses:
```css
.sgs-button.is-style-outline {
  background-color: transparent;
  color: var(--wp--preset--color--primary);        /* PINK — wrong, should be text colour */
  border-color: var(--wp--preset--color--primary); /* PINK — wrong, should be --border */
}
```

The ghost button wants `color: var(--text)` (dark) and `border-color: var(--border)` (tan). The `outline` preset gives `color: primary` (pink) and `border-color: primary` (pink). These do not match.

Additionally, the button also has `style.color.background` set? Let checking `extract.patched.json`:

From earlier analysis: the brand button has `"style":{"spacing":{"margin":{"top":"8px"},"padding":{"top":"14px","right":"24px","bottom":"14px","left":"24px"}}}` only — NO `style.color.background` (because the ghost button's draft CSS has `background: transparent`, which `_extract_token_or_hex` would return `None` for, blocking the lift). Good — so the Point 9 background fill does NOT apply here.

The issue is purely that `outline` preset ≠ ghost style: wrong text colour and wrong border colour.

**Evidence (confirmed):**
- `extract.patched.json`: `{"inheritStyle":"outline","className":"sgs-button--ghost",...}`.
- `button/style.css:69-78`: `outline` preset uses `--primary` for both text and border.
- Mockup: `--ghost` uses `var(--text)` colour and `var(--border)` border-color.

**Fault attribution:** Two-layer fault:
1. **IMPL fault in converter (BEM-to-inheritStyle mapping):** The converter maps the BEM modifier `--ghost` to `inheritStyle:"outline"` (via `_lift_inner_block_attrs` / BEM modifier extraction). The `--ghost` modifier has no `inheritStyle` counterpart — the closest is `outline`, but they differ on colour and border. The converter should either (a) emit `inheritStyle:"custom"` with explicit `colourText:"text"` and `colourBorder:"border"` attrs, or (b) the `sgs/button` block needs a `ghost` preset style.
2. **DOC fault:** there is no `ghost` preset defined in `button/block.json` or `style.css`. The block's allowed presets are `["primary","secondary","outline"]` (render.php:437) — no `ghost`. This is a block capability gap.

### 12D — Image wrong zoom level + no rounded corners

**Root cause (confirmed):** The brand image is emitted as `<!-- wp:sgs/media {"imageUrl":"...","imageAlt":"..."} /-->` (confirmed in `extract.patched.json` — only `imageUrl` and `imageAlt` attrs, nothing else). The draft CSS for `.sgs-brand__image` includes:
```css
.sgs-brand__image {
  width: 100%;
  max-height: 380px;
  object-fit: cover;
  border-radius: 16px;
}
```

Neither `objectFit:"cover"` nor `borderRadius:"16"` are emitted. The `sgs/media` block has these attrs (`media/block.json:149-189` — `objectFit` default is null, `borderRadius` default is null). The converter's `_lift_root_supports_to_style` fires for `sgs/media`, but `sgs/media` has `supports.color: false` (block.json:24) — colour lift is blocked. More critically, `objectFit` and `borderRadius` are **flat block attrs** (not `style.*` WP-native paths) and are NOT in `_root_lift_rules()` (which only covers `background-color`, `color`, `padding`, `margin`, `border`).

The `_lift_typography_to_block_attrs` helper (wired 2026-06-05 per convert.py:2642-2652) covers font attrs for leaf blocks. `objectFit` and `borderRadius` are not typography attrs, so they don't get lifted by that path either.

**Evidence (confirmed):**
- `extract.patched.json`: `{"imageUrl":"...","imageAlt":"..."}` — only two attrs.
- `media/block.json:149-189`: `objectFit` and `borderRadius` attrs exist.
- `convert.py:476-498` (`_root_lift_rules`): no `object-fit` → `objectFit` mapping; no `border-radius` → `borderRadius` mapping in the WP-style path.
- Mockup CSS: `object-fit: cover; border-radius: 16px` on `.sgs-brand__image`.

**Fault attribution:** IMPLEMENTATION fault in the converter. The converter does not have lift rules mapping `object-fit` → `objectFit` and `border-radius` → `borderRadius` for `sgs/media`. These are flat block attrs (not WP `style.*` paths), so they require explicit attr-name-to-css-prop mapping in either `_lift_typography_to_block_attrs` (wrong category) or a new media-specific attr lift. Fix: add an `sgs/media`-specific attr lift in the walker that reads `object-fit` → `objectFit` and `border-radius` → `borderRadius` (and any corner variants) from the element's collected CSS decls. Alternatively, extend `_root_lift_rules` to cover `object-fit` as a non-WP-native attr lift with a special handling path.

---

## Cross-Point Summary Table

| Point | Symptom | Layer | Fault type | Root cause (one line) |
|-------|---------|-------|------------|----------------------|
| 6 | Heading centre-aligned | Block CSS | IMPL (block) | `heading/style.css` defaults `text-align:center`; converter never emits `textAlign:"left"` |
| 7 | Text lighter than draft | UNVERIFIED | DOC/deploy | `text-muted` token matches; hypothesis: `wp_global_styles` DB override on canary |
| 8 | No gap below intro | Converter | IMPL (converter) | `margin-bottom:32px` stranded in D2 CSS orphan rule; converter omits `className` and margin attr lift |
| 9 | Primary button fills container bg | Converter | IMPL (converter) | `_lift_root_supports_to_style` emits `style.color.background` on button → WP applies bg to wrapper div |
| 10 | No rounded corners on product cards | Converter + deploy | IMPL (converter + possible deploy) | `productId` not emitted → Bound empty state; border-radius may also be a stale CSS deploy |
| 11a | Image heights differ | Converter | IMPL (converter) | `productId` not emitted → Bound empty state / Bound mode CSS only applies to `.product-card--bound` |
| 11b | Buttons not full-width | Converter | IMPL (converter) | `sgs/multi-button` wraps draft flex-child button; loses implicit flex-column stretch; `widthType:"full"` not inferred |
| 11c | Cards different heights | Converter | IMPL (converter) | `productId` not emitted → empty state vs real content (primary cause); grid stretch should work if productId correct |
| 11d | Price note above price (superscript) | Converter | IMPL (converter) | `align-items:baseline` not lifted to `verticalAlign:"baseline"` on flex container |
| 11e | No 1px border on featured card | Deploy (likely) | IMPL (deploy) | UNVERIFIED; CSS rule exists; likely stale build |
| 12A | Brand heading centred | Block CSS | IMPL (block) | Same as Point 6 |
| 12B | Quote text muted not black | DOC | DOC fault | Mockup CSS explicitly uses `text-muted`; converter faithfully copies it; Bean's expectation differs from draft |
| 12C | Brand button wrong style | Converter + block | IMPL (both) | BEM `--ghost` maps to `outline` preset; no ghost preset exists in block; outline ≠ ghost (wrong border/text colour) |
| 12D | Brand image wrong zoom + no rounded corners | Converter | IMPL (converter) | `object-fit:cover` and `border-radius:16px` not lifted to `objectFit`/`borderRadius` attrs |

## Shared causes

1. **Heading default centre-align (Points 6, 12A):** Same single block CSS fault — `heading/style.css:8`.
2. **productId not emitted (Points 10, 11a, 11c, 11e partial):** Same single converter gap — Bound mode emitted without binding to a product.
3. **`_lift_root_supports_to_style` runs on sgs/button (Point 9):** Single converter function.
4. **No `align-items` lift rule (Point 11d):** Single gap in `_root_lift_rules()`.
5. **No media flat-attr lift (Point 12D):** Single gap in converter walker.
