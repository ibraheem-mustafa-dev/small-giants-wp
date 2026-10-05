/**
 * Editor-canvas mirror of the box a block paints on its own root element:
 * padding and margin at the previewed device tier, the border (style, width,
 * colour, gradient) and the per-tier border radius.
 *
 * @package SGS\Blocks
 */

import { spacingPreview } from './spacing-preview';
import { wrapperBorderPreview } from './wrapper-border-preview';

/**
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier from usePreviewTier().
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} React style fragment for the block's root element.
 */
export function boxPreview( attributes, tier, palette ) {
	const style = spacingPreview( { padding: attributes.padding, margin: attributes.margin }, tier );

	Object.assign( style, wrapperBorderPreview( attributes, tier, palette ) );

	return style;
}
