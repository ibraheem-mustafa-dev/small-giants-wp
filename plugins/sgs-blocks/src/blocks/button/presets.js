/**
 * SGS Button — style preset seed values.
 *
 * These are the attribute values COPIED into a button's own attributes when
 * an operator picks a preset in the "Style preset" dropdown and clicks
 * "Apply preset". They are NOT a locked style class — once applied, every
 * value is a normal, fully-editable block attribute.
 *
 * Token slugs mirror the previous `.is-style-*` CSS custom-property
 * fallbacks in style.css (now removed) so re-applying a preset reproduces
 * the same visual result the old locked system gave by default.
 *
 * @package SGS\Blocks
 */

export const BUTTON_PRESETS = {
	primary: {
		colourBackground: 'primary',
		colourText: 'text-inverse',
		colourBorder: 'primary',
		colourBackgroundHover: 'text',
		colourTextHover: 'text-inverse',
		colourBorderHover: 'text',
		borderStyle: 'solid',
		borderWidthTop: 2,
		borderWidthRight: 2,
		borderWidthBottom: 2,
		borderWidthLeft: 2,
		borderRadiusTL: 10,
		borderRadiusTR: 10,
		borderRadiusBR: 10,
		borderRadiusBL: 10,
		fontWeight: '600',
	},
	secondary: {
		colourBackground: '',
		colourText: 'primary',
		colourBorder: 'primary',
		colourBackgroundHover: 'primary',
		colourTextHover: 'text-inverse',
		colourBorderHover: 'primary',
		borderStyle: 'solid',
		borderWidthTop: 2,
		borderWidthRight: 2,
		borderWidthBottom: 2,
		borderWidthLeft: 2,
		borderRadiusTL: 10,
		borderRadiusTR: 10,
		borderRadiusBR: 10,
		borderRadiusBL: 10,
		fontWeight: '600',
	},
	outline: {
		colourBackground: '',
		colourText: 'text',
		colourBorder: 'border-subtle',
		colourBackgroundHover: 'surface-alt',
		colourTextHover: 'text',
		colourBorderHover: 'primary',
		borderStyle: 'solid',
		borderWidthTop: 1,
		borderWidthRight: 1,
		borderWidthBottom: 1,
		borderWidthLeft: 1,
		borderRadiusTL: 10,
		borderRadiusTR: 10,
		borderRadiusBR: 10,
		borderRadiusBL: 10,
		fontWeight: '600',
	},
};
