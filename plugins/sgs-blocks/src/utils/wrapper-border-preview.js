/**
 * Editor-canvas mirror of a block wrapper's border, border colour and per-tier
 * corner radius, read from the un-prefixed borderWidth / borderStyle /
 * borderColour / borderColourGradient / borderRadius attributes.
 *
 * @package SGS\Blocks
 */

import { sgsBorderPreview } from './border-preview';

/**
 * Border, border colour and radius for a block's outer wrapper.
 *
 * @param {Object}  attributes Block attributes.
 * @param {string}  tier       Previewed device tier.
 * @param {Array}   palette    Theme colour palette.
 * @param {Object}  [options]  Forwarded to sgsBorderPreview().
 * @return {Object} React style fragment.
 */
export function wrapperBorderPreview( attributes, tier, palette, options ) {
	return sgsBorderPreview(
		{
			widthValues: attributes.borderWidth,
			styleValue: attributes.borderStyle,
			colourValue: attributes.borderColour,
			colourGradientValue: attributes.borderColourGradient,
			radiusValues: attributes.borderRadius,
		},
		tier,
		palette,
		options
	);
}
