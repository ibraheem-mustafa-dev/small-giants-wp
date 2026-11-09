# Value helpers: how each treats a resolved CSS value (`var(--x)`, `calc()`)

Shared predicate: PHP `includes/helpers-css-safety.php::sgs_resolved_css_value`, JS `src/utils/resolved-css-value.js::resolvedCssValue` (plus its `CSS_FUNCTION_START` pattern). A value that is exactly one `var()`, `calc()`, `min()`, `max()` or `clamp()` call passes unchanged; one carrying `;`, `{`, `}`, `<`, `>`, `=`, a backslash, a comment opener, `url(`, `expression(`, `@import`, unbalanced parentheses or text outside the call is refused. Tests: `tests/php/run-resolved-css-value-standalone.php` (103 assertions, negative controls and a helper contract) and `tests/js/resolved-css-value.test.js` (45 tests).

| Helper | File | var(--x) / calc() today | Verdict |
|---|---|---|---|
| sgs_font_size_value | includes/helpers-tokens.php | var() was slugged to `var(--wp--preset--font-size--var--wp...)`; only clamp( passed | WRONG, fixed (predicate) |
| sgs_font_family_sanitise | includes/helpers-typography.php | allowlist stripped the parentheses: `var--wp--preset--font-family--heading` | WRONG, fixed (var() passes, hostile refused whole) |
| sgs_icon_length_value | includes/helpers-icon.php | only `var(--wp--preset--spacing\|font-size--slug)` passed; calc(), clamp() and other var() returned '' | NARROW, fixed (predicate) |
| iconLengthValue twin | src/blocks/icon/icon-state.js | same narrow var-preset-only test | NARROW, fixed (predicate) |
| fontSizeVar | src/utils/tokens.js | wrapped everything: `var(--wp--preset--font-size--var(--x))` | WRONG, fixed (shared presetVar) |
| spacingVar | src/utils/tokens.js | same wrap | WRONG, fixed |
| shadowVar | src/utils/tokens.js | same wrap | WRONG, fixed |
| borderRadiusVar | src/utils/tokens.js | same wrap | WRONG, fixed |
| transitionVar | src/utils/tokens.js | same wrap | WRONG, fixed |
| colourVar | src/utils/tokens.js | passed through via CSS.supports, which jsdom lacks, so unreliable outside a browser | RIGHT in browsers, made independent of CSS.supports (predicate first) |
| stripeColourVar and five inline colour templates | src/blocks/timeline/edit.js | always wrapped in `var(--wp--preset--color--${x})`: a hex or var() colour was mangled | WRONG, fixed (colourVar) |
| colour resolvers (two) | src/blocks/product-card/edit.js | passed var(, hex, rgb, hsl; wrapped named colours and oklch() as slugs | PARTLY WRONG, fixed (colourVar) |
| hasOwnUnit in typographyPreviewStyle | src/utils/typography-preview.js | passed var/calc/clamp by regex without validation; min(), max() missed | PARTLY WRONG, fixed (predicate) |
| sgs_colour_value | includes/helpers-tokens.php | var( passes with breakout check | RIGHT |
| sgs_shadow_value | includes/helpers-tokens.php | var( passes with breakout check | RIGHT |
| sgs_css_length_value | includes/helpers-css-safety.php | the hardened validator; var, calc, min, max, clamp pass | RIGHT (the predicate delegates to it) |
| sgs_responsive_sanitise_css_value, sgs_responsive_format_atom_value | includes/helpers-responsive.php | delegate to sgs_css_length_value | RIGHT |
| sgs_container_gap_value, sgs_container_scroll_row_length | includes/helpers-container.php, container-scroll-row-css.php | delegate to sgs_css_length_value | RIGHT |
| sgs_typography_css_rule (line height, letter spacing) | includes/helpers-typography.php | string tiers go through the responsive sanitiser | RIGHT; font size now right through sgs_font_size_value |
| nav-menu font-size transform | includes/nav-menu-css.php | calls sgs_font_size_value | RIGHT after the fix |
| SGS_Container_Wrapper | includes/class-sgs-container-wrapper.php | lengths through sgs_css_length_value / responsive sanitiser; bare digits only are slugs | RIGHT |
| sgs_css_gradient_value, sgs_gradient_resolve_value | includes/helpers-tokens.php, helpers-gradient-tone.php | gradient functions only; `var(--wp--preset--gradient--x)` resolved | RIGHT |
| sgs_sanitise_colour | includes/shape-dividers.php | slug test fails on `var(`, which takes the var() branch | RIGHT |
| sgs_shadow_layers, sgs_shadow_hover_value and JS composeShadow, shadowHoverValue | includes/helpers-shadow-*.php, src/utils/shadow-*.js | the slug test excludes `(`; a var() goes to the layer parser (read, not run) | RIGHT by reading |
| gapVar, cssLengthValue, bare-length, feature-grid and trust-bar gap | src/utils/*.js, src/blocks/*/edit.js | wrap digits only; anything else passes through (preview style objects, not a stylesheet) | RIGHT |
| fontFamilyCssValue | src/utils/typography-preview.js | slug test excludes parentheses; var() passes | RIGHT |
| glyphSizePx | src/utils/font-size-preset.js | reads a font-size preset var; other functions return the fallback | RIGHT |
| sgs_motion_easing_css, motion tokenCss / colourCss and PHP twins | includes/helpers-motion-easing.php, motion field types | take schema-validated token names, never a stored CSS value | N/A |
| SgsLengthControl, SgsBoxControl, SgsGapControl | src/components | store `var(--wp--preset--...)` and read it back | RIGHT |

Counts: 29 rows (several name a family of helpers), 13 wrong or narrow helpers fixed.

## Font size picker (sgs/heading)

The shared picker exists: `src/components/TypographyControls.js` renders core `FontSizePicker` (theme.json presets plus custom), and sgs/heading uses it through TypographyControls (tier-object `fontSize`, `fontSizeUnit`). A chosen preset is stored as its SLUG in the tier. Built in the shared component: the choice is now written to the active device only (previously it overwrote the desktop tier and wiped tablet and mobile), and a stored `var(--wp--preset--font-size--x)` (what a clone writes) is read back as that preset. Both surfaces now resolve either form (`sgs_font_size_value`, `fontSizeVar`, `typographyPreviewStyle`).
