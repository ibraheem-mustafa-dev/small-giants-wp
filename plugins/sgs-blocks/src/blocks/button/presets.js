/**
 * SGS Button — style preset seed values (framework defaults).
 *
 * NOTE (2026-07-07): the sgs/button block itself no longer uses this file — it
 * now uses WordPress-native block VARIATIONS (declared in block.json) for its
 * primary/secondary/outline presets, and the cloning converter routes each
 * client's real colours from that client's theme-snapshot `buttonPresets`.
 *
 * This module is retained ONLY as the framework-default seed for
 * `sgs/product-card`'s built-in CTA "Apply preset" control (a sub-element that
 * cannot be a block variation). It will be relocated/removed when the
 * product-card CTA is migrated to the same snapshot-driven model.
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
