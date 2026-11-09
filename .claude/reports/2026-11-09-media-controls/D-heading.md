# D-heading: does an unsized sgs/heading inherit the stylesheet size?

**Answer: no framework bug blocks inheritance when no size is set.** The 16px was caused by a different bug: a `var(--wp--preset--font-size--hero)` value stored in a size field is mangled by `sgs_font_size_value()`.

## 1. Unsized headings inherit correctly

- `plugins/sgs-blocks/src/blocks/heading/block.json`: `fontSize` is `{type: object, default: {}}`. `fontSizeUnit` defaults to `px` but is only read when a number is present.
- `heading/style.css` deliberately sets no `font-size`, `font-weight`, `line-height` or colour on the heading (see the D338 comment). Only `.wp-block-sgs-heading--subheading` carries `font-size: 16px`, and that applies to the subheading role only, not to h1-h6.
- `heading/render.php` calls `sgs_typography_css_rule($attributes, '', $root_sel, ...)` (`includes/helpers-typography.php`). With `fontSize = {}`, the helper emits no font-size declaration, so the theme's `h1`/`h2` element rule (`styles.elements.h1-h6` in global styles) applies.
- Live check on the eye-care-test home page, 1440px and 375px, using real Chrome and CDP `CSS.getMatchedStylesForNode`:
  - Headings with no size set match only `h2 => clamp(32px, 27.0704px + 1.3146vw, 46px)`. The h1 element rule is clamp(34px, 29.0704px + 1.3146vw, 48px).
  - Several sgs/heading h2s carried their own `.sgs-hdg-xxxx.wp-block-sgs-heading => 46px` at 1440 and 32px at 375. I have not checked their saved attributes; they may hold explicit values.
  - The hero h1 (`.sgs-hdg-a2b9bd93`) has an explicit scoped size: 63.36px at 1440, 42px at tablet and 40px at mobile.
  - `.sgs-hero__headline` uses `var(--wp--preset--font-size--hero)` in the hero block's own CSS. The hero block is a composite that supplies a size for its own headline, shadowing the theme h1 rule, but only inside the hero.
- Other shadowing I saw: `.sgs-cart__panel-heading` sets 22px and 1.1rem in the cart block's CSS, and the mega-menu h3 columns set 11.5px or 26px. These are per-block choices, not a bug in sgs/heading.

## 2. Why the stored value gave 16px

- The saved value was `{"desktop":"var(--wp--preset--font-size--hero)","tablet":42,"mobile":40}`.
- `sgs_typography_css_rule` runs the string tier through `sgs_font_size_value()` (`includes/helpers-tokens.php`). That function accepts only `^\d+(.\d+)?(px|em|rem|...)$` or `clamp(...)`.
- Anything else is treated as a bare slug: lowercased, then stripped with `preg_replace('/[^a-z0-9-]/', '')`. That removes the parentheses and the colon-free punctuation, giving `var--wp--preset--font-size--hero`.
- The emitted rule is `font-size: var(--wp--preset--font-size--var--wp--preset--font-size--hero)`. That custom property is undefined, so the declaration is invalid at computed-value time, `font-size` falls back to inherited, and h1 renders at the body's 16px at 1440.
- Tablet and mobile (numeric) still emitted correctly (42px and 40px).

## 3. Smallest correct fix

- (a) No manual size means the stylesheet value at every width. This already works. Keep `fontSize` default `{}` and keep style.css free of a size. Do not add a default to block.json.
- (b) Make a token value survive. Add one branch to `sgs_font_size_value()` before the slug fallback. If the value matches `^var\(--wp--preset--font-size--[a-z0-9-]+\)$`, return it unchanged. Optionally also accept `clamp()` with `var()` inside (already handled by the clamp branch).
- Fix it in that one helper so that every block's size field is repaired, not just heading.
- The editor's size picker already stores a plain slug string (`onFontSizePresetChange` in `TypographyControls.js`). Slugs are the supported path, so an editor picking a theme size stores `hero` and not `var(...)`. The `var(...)` form only arrives from cloned or hand-written saves. The helper fix covers it.
- The editor canvas preview (`buildPreviewFontSize`) wraps any string with `fontSizeVar()`. That produces `var(--wp--preset--font-size--var(--wp...))` for a pasted `var(...)` string. Apply the same guard there: if the string already starts with `var(`, use it as is.
- For an editor picking a stylesheet size token: offer the theme's font-size presets in the picker. These come from `theme.json`. It does not expose the h1/h2 element clamp, which is not a preset. The "inherit" choice is simply clearing the size.

## 4. Editor canvas versus theme

- The block's `style.css` does not set a size, so the canvas also falls back to the theme element rule. Global styles carry `styles.elements.h1`, which is applied to the editor canvas as `:root :where(h1)`.
- A `fontSize` default in block.json would shadow that on the canvas and on the front end. There is none in sgs/heading, so the two agree.
- Scripts and raw output: `E:/sgs-tmp/ec-r11/media/h/d-head.mjs`.
