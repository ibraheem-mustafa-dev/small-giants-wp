/**
 * sgs/icon-list — the editor canvas's per-element styles at the previewed
 * device tier, as render.php's scoped rules paint them: the root's fill and
 * corner radius, and each element's typography family (heading, item row,
 * item text, description) plus the item text colour.
 *
 * @package SGS\Blocks
 */

import {
	backgroundPaintPreview,
	textPaintPreview,
	typographyPreviewStyle,
	borderRadiusLonghands,
} from '../../utils';

/**
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier from `usePreviewTier()`.
 * @param {Array}  palette    Theme colour palette.
 * @return {{ root: Object, heading: Object, item: Object, text: Object, description: Object }} Styles per element.
 */
export function iconListPreview( attributes, tier, palette ) {
	const root = backgroundPaintPreview( attributes.backgroundColour, attributes.backgroundColourGradient, palette );
	Object.assign( root, borderRadiusLonghands( attributes.borderRadius, tier ) );
	return {
		root,
		heading: typographyPreviewStyle( attributes, 'heading', tier ),
		item: typographyPreviewStyle( attributes, 'item', tier ),
		text: {
			...typographyPreviewStyle( attributes, 'textEl', tier ),
			...textPaintPreview( attributes.textColour, attributes.textColourGradient, palette ),
		},
		description: typographyPreviewStyle( attributes, 'description', tier ),
	};
}
