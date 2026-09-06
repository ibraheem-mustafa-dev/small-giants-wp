# A0 — six unverified colour rows: human-grade background-clip:text read

Precondition being tested: `background-clip:text` clips the element's ENTIRE background
painting area to the glyph shapes. If the element that receives the colour ALSO paints a
background (colour/gradient/image) on the SAME rendered element, a text gradient makes the
text invisible AND removes the visible background. Verdict is BLOCKED whenever any source
(render.php same-selector rule, render.php same-element different-selector rule, style.css
static rule, or a shared helper) paints a background on the element receiving the colour.

## Summary table

| # | Attribute | Selector | Verdict | Why |
|---|---|---|---|---|
| 1 | `sgs/form.submitColour` | `.{uid} .sgs-form__button--submit` | **BLOCKED** | Default `submitStyle='primary'` adds class `.sgs-form__button--primary`, which carries `:where(.sgs-form__button--primary){background-color:...}` — same DOM node. Also, `submitBackground`/`submitBackgroundGradient` can paint on the literal same selector in the same render.php block. |
| 2 | `sgs/modal.triggerColour` | `.{uid} .sgs-modal__trigger` | **BLOCKED** | Default `triggerStyle='primary'` adds class `.sgs-modal__trigger--primary`, which sets `background-color` in style.css — same DOM node (button carries both classes). Also `triggerBackground`/`triggerBackgroundGradient` can paint the literal same selector in the same render.php block. |
| 3 | `sgs/nav-menu.burgerColour` | `.{uid} .sgs-nav-menu__burger` | **BLOCKED** | style.css base rule is `background:none` (safe alone), but the independent `burgerBg` attribute paints `background-color` on the exact same selector (render.php:1121) when the operator sets it — same selector, same element, real conflict risk. |
| 4 | `sgs/option-picker.labelColour` | `.{uid} .sgs-option-picker__label` (a `<legend>`) | **CLEAR** | No background rule anywhere — not in render.php (only `color` + `margin-bottom` declared for this selector), not in style.css (`.sgs-option-picker__label` only sets font-size/weight/color/margin/padding). |
| 5 | `sgs/post-grid.textColourHover` | Four selectors: `.sgs-post-grid__title a`, `__excerpt`, `__meta`, `__readmore` (all under `:hover`/`:focus-within` on the ancestor card) | **CLEAR** | None of the four target elements has a background rule in style.css or render.php. (The card's own `--overlay` variant paints a background, but that's on the *card*, not on these four text descendants, and the hover-text rule only ever writes `color`.) |
| 6 | `sgs/product-card.tagTextColour` | `.{uid}.sgs-product-card__tag--trial` | **BLOCKED** | style.css has a static default `.product-card .sgs-product-card__tag--trial{background:var(--wp--preset--color--accent,#f5d050);...}` on the exact same selector — present even with zero operator input. render.php also actively paints background on the identical selector via `sgs_label_box_css_rule()` (helpers-box.php) when `tagBackgroundColour`/padding/radius are set. |

Net: 1, 2, 3, 6 → BLOCKED (need the `::after` background-layer treatment first). 4, 5 → CLEAR.

---

## Detail

### 1. `sgs/form.submitColour`

File: `plugins/sgs-blocks/src/blocks/form/render.php`

Colour paint (lines 215–232):
```
215: if ( $submit_colour || $submit_background || $submit_background_gradient ) {
223:     if ( $submit_colour ) {
224:         $sgs_form_submit_decls[] = 'color:' . sgs_colour_value( $submit_colour );
226:     if ( $submit_background || $submit_background_gradient ) {
230:         $sgs_form_submit_decls[] = sgs_background_paint_decl( $submit_background, $submit_background_gradient );
232:     $sgs_form_supports_css .= '.' . $sgs_form_uid . ' .sgs-form__button--submit{' . implode( ';', $sgs_form_submit_decls ) . '}';
```
Same selector `.{uid} .sgs-form__button--submit` can receive both `color` and a background
declaration from the SAME array/rule when `submitBackground`/`submitBackgroundGradient` are set —
already disqualifying on its own.

Independent of that, the submit button's markup (line 432) is:
```
432: class="sgs-form__button sgs-form__button--submit sgs-form__button--<?php echo esc_attr( $submit_style ); ?>"
```
`$submit_style` defaults to `'primary'` (line 47: `$submit_style = $attributes['submitStyle'] ?? 'primary';`).
style.css (lines 659–663):
```
659: :where(.sgs-form__button--primary) {
660:     background-color: var(--wp--preset--color--primary, #0f7e80);
661:     color: var(--wp--preset--color--text-inverse, #fff);
662: }
```
This targets the SAME `<button>` element (it carries both `.sgs-form__button--submit` and
`.sgs-form__button--primary`). `:where()` zeroes specificity but does not remove the
declaration — the button paints a background-colour by default under the default style.
Verdict: **BLOCKED**.

### 2. `sgs/modal.triggerColour`

File: `plugins/sgs-blocks/src/blocks/modal/render.php`

Colour paint (lines 39–47):
```
39: $trigger_rules = array();
40: if ( $trigger_colour ) {
41:     $trigger_rules[] = 'color:' . sgs_colour_value( $trigger_colour );
42: }
43: if ( $trigger_background || $trigger_background_gradient ) {
47:     $trigger_rules[] = sgs_background_paint_decl( $trigger_background, $trigger_background_gradient );
48: }
...
79: $scoped_css_rules[] = $root_sel . ' .sgs-modal__trigger{' . implode( ';', $trigger_rules ) . '}';
```
Again, `triggerBackground`/`triggerBackgroundGradient` can land on the literal same selector.

Markup (line 99):
```
99: class="sgs-modal__trigger sgs-modal__trigger--<?php echo esc_attr( $trigger_style ); ?>"
```
`$trigger_style` defaults to `'primary'` (line 18: `$trigger_style = $attributes['triggerStyle'] ?? 'primary';`).
style.css (lines 33–36):
```
33: .sgs-modal__trigger--primary {
34:     color: var(--wp--preset--color--text-inverse, #fff);
35:     background-color: var(--wp--preset--color--primary, #333);
36: }
```
Same `<button>` element carries both classes; the default variant paints a solid
background-colour. Verdict: **BLOCKED**.

### 3. `sgs/nav-menu.burgerColour`

File: `plugins/sgs-blocks/src/blocks/nav-menu/render.php`

```
1107: $burger_colour = isset( $attributes['burgerColour'] ) ? (string) $attributes['burgerColour'] : '';
1108: if ( '' !== $burger_colour ) {
1109:     $css .= $uid_sel . ' .sgs-nav-menu__burger{color:' . sgs_colour_value( $burger_colour ) . ';}';
1110: }
...
1120: $burger_bg = isset( $attributes['burgerBg'] ) ? (string) $attributes['burgerBg'] : '';
1121:     $css .= $uid_sel . ' .sgs-nav-menu__burger{background-color:' . sgs_colour_value( $burger_bg ) . ';}';
```
(Line 1121's guard is the `if ( '' !== $burger_bg )` a few lines above 1120 in the excerpt read.)

style.css base rule (lines 143–157):
```
143: .sgs-nav-menu__burger {
148:     background: none;
```
So with `burgerBg` unset, the element alone paints no background — but `burgerColour` and
`burgerBg` are independent, separately-settable attributes on the exact same selector
`.{uid} .sgs-nav-menu__burger`, both emitted straight into the same scoped `<style>` block by
this same render.php. An operator who sets both (an entirely plausible combination — coloured
icon on a coloured button) gets a background painted on the identical selector a text-gradient
recipe would also target. Verdict: **BLOCKED** — same class of conflict as rows 1 and 2, just
via a sibling attribute rather than the same conditional block.

### 4. `sgs/option-picker.labelColour`

File: `plugins/sgs-blocks/src/blocks/option-picker/render.php`

```
84: $label_colour = $attributes['labelColour'] ?? '';
...
537: $sel_label = "{$root_sel} .sgs-option-picker__label";
...
540: $legend_decls = array();
541: if ( '' !== $label_colour ) {
542:     $legend_decls[] = 'color:' . sgs_colour_value( $label_colour );
543: }
544: if ( '' !== $label_margin_bottom ) {
547:         $legend_decls[] = 'margin-bottom:' . $mb_safe;
550: if ( $legend_decls ) {
551:     $scoped_css[] = "{$sel_label}{" . implode( ';', $legend_decls ) . ';}';
```
Only `color` and `margin-bottom` are ever written to `$sel_label` — no background declaration
exists in render.php for this selector, anywhere.

Markup (line 609): `<legend id="%s" class="sgs-option-picker__label">%s</legend>` — a bare
`<legend>`, no modifier classes.

style.css (lines 48–55):
```
48: .sgs-option-picker__label {
49:     display: block;
50:     font-size: var(--wp--preset--font-size--small);
51:     font-weight: 600;
52:     color: var(--wp--preset--color--text, currentColor);
53:     margin-bottom: var(--wp--preset--spacing--20, 8px);
54:     padding: 0;
55: }
```
No `background`/`background-color`/`background-image` anywhere in this rule or any other rule
for `.sgs-option-picker__label` in the file (checked the whole file for the selector string —
only this one declaration block and no others reference it). I did not find a shared helper
call for this element either — the colour is written directly as a scalar declaration, not
routed through `sgs_button_element_style_css()` or `sgs_label_box_css_rule()`. Verdict: **CLEAR**.

Note: task background text suggested this attribute might be built as a CSS custom property
consumed in style.css — that is NOT what the code does; `labelColour` is written as a direct
`color:` declaration in render.php's own scoped `<style>`, same pattern as the others. Flagging
the discrepancy in case it reflects a different attribute than intended, but the selector and
verdict above are what the current code does.

### 5. `sgs/post-grid.textColourHover`

File: `plugins/sgs-blocks/src/blocks/post-grid/render.php`

```
169: $hover_text = ! empty( $attributes['textColourHover'] ) ? sgs_colour_value( $attributes['textColourHover'] ) : '';
...
625: if ( $hover_text ) {
626:     $post_grid_hover_text_targets = array(
627:         ' .sgs-post-grid__title a',
628:         ' .sgs-post-grid__excerpt',
629:         ' .sgs-post-grid__meta',
630:         ' .sgs-post-grid__readmore',
631:     );
632:     foreach ( $post_grid_hover_text_targets as $post_grid_hover_text_target ) {
633:         $responsive_css .= $post_grid_card_sel . ':hover' . $post_grid_hover_text_target . ','
634:             . $post_grid_card_sel . ':focus-within' . $post_grid_hover_text_target
635:             . '{color:' . $hover_text . '}';
636:     }
637: }
```
Only `color` is ever written for these four descendant selectors, under card `:hover`/
`:focus-within`.

style.css — checked every rule mentioning each of the four selectors:
```
343: .sgs-post-grid__title a {
344:     color: var( --sgs-pg-title-colour, var( --wp--preset--color--text, #1e1e1e ) );
345:     text-decoration: none;
348: .sgs-post-grid__title a:hover, ...349: ...:focus-visible { text-decoration: none; opacity: 0.85; }

357: .sgs-post-grid__excerpt {
358:     font-size: 0.9375rem; line-height: 1.6;
359:     color: var( --sgs-pg-excerpt-colour, var( --wp--preset--color--text-muted, #555 ) );
360:     margin: 0 0 12px;
361: }

288: .sgs-post-grid__meta {
289:     display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
293:     font-size: 0.8125rem;
294:     color: var( --sgs-pg-meta-colour, var( --wp--preset--color--text-muted, #555 ) );
295:     margin-bottom: 8px;
296: }

368: .sgs-post-grid__readmore {
369:     display: inline-flex; align-items: center; gap: 4px;
372:     font-size: 0.875rem; font-weight: 600;
373:     color: var( --sgs-pg-readmore-colour, var( --wp--preset--color--primary, #1a3a5c ) );
374:     text-decoration: none;
375: }
378: .sgs-post-grid__readmore:hover, ...379: ...:focus-visible { text-decoration: none; opacity: 0.85; }
```
None of these four declaration blocks (nor their `:hover`/`:focus-visible` variants) sets any
background property. The only background-bearing rule that mentions these selectors at all is
the `--overlay` card variant:
```
223: .sgs-post-grid__card--overlay .sgs-post-grid__title a,
224: .sgs-post-grid__card--overlay .sgs-post-grid__excerpt,
225: .sgs-post-grid__card--overlay .sgs-post-grid__meta,
226: .sgs-post-grid__card--overlay .sgs-post-grid__readmore {
227:     color: inherit;
```
— that rule sets `color: inherit`, not a background, and the actual background gradient
(`.sgs-post-grid__card--overlay` itself, line ~218: `background: linear-gradient(...)`) is
painted on the ancestor `.sgs-post-grid__card--overlay` box, not on these four text
descendants. A background on an ancestor does not interact with `background-clip:text` applied
to a descendant — clip only affects the box it's declared on. Verdict: **CLEAR**.

### 6. `sgs/product-card.tagTextColour`

File: `plugins/sgs-blocks/src/blocks/product-card/render.php`

```
533: $sgs_tag_box_css = sgs_label_box_css_rule(
534:     array(
538:         'background' => (string) ( $attributes['tagBackgroundColour'] ?? '' ),
540:     ),
539:     '.' . $sgs_card_uid . '.sgs-product-card__tag--trial'
541: );
543: $sgs_tag_text_colour = sgs_colour_value( (string) ( $attributes['tagTextColour'] ?? '' ) );
544: if ( '' !== $sgs_tag_text_colour ) {
545:     $sgs_tag_box_css .= '.' . $sgs_card_uid . '.sgs-product-card__tag--trial{color:' . $sgs_tag_text_colour . ';}';
546: }
```
`sgs_label_box_css_rule()` (helpers-box.php:246) is the shared box-attrs helper — it writes
padding/radius/background/full-width declarations for whatever selector it's given. Here it's
given the exact same selector, `.{uid}.sgs-product-card__tag--trial`, that the colour rule at
line 545 also targets. Even with `tagBackgroundColour` unset, the helper is called with
`'background' => ''`, which the helper (padding/radius path shown; background path not
independently re-read here but selector match alone is disqualifying given style.css below).

style.css — static default, present with zero operator configuration:
```
1054: .product-card .sgs-product-card__tag {
1055:     display: inline-flex; ...
1068: .product-card .sgs-product-card__tag--trial {
1069:     background: var( --wp--preset--color--accent, #f5d050 );
1070:     color: var( --wp--preset--color--text, #3a2e26 );
1071: }
```
The trial tag has a solid accent-colour background by default, unconditionally, on the same
selector. Verdict: **BLOCKED** — the strongest case of the six, since the conflict exists even
before any operator sets `tagBackgroundColour`.
