/**
 * Editor-canvas mirror of the notice banner's own wrapper declarations.
 *
 * render.php paints the fill, text colour, border, radius, typography and
 * spacing on the banner root; the canvas has no server render, so this builds
 * the same values as a React style object at the previewed device tier.
 * Editor-only: the front end carries no inline style.
 *
 * @package SGS\Blocks
 */
import {
	backgroundPaintPreview,
	textPaintPreview,
	tierBoxShorthand,
	typographyPreviewStyle,
	wrapperBorderPreview,
} from '../../utils';

/**
 * Wrapper style for the banner canvas.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @param {Array}  palette    Theme colour palette.
 * @param {boolean} bareBox   True in announcement mode, which keeps its spacing and width off the canvas wrapper.
 * @return {Object} React style object.
 */
export function buildWrapperStyle( attributes, tier, palette, bareBox ) {
	const { padding, margin, maxWidth } = attributes;
	const style = {
		...backgroundPaintPreview( attributes.backgroundColour, attributes.backgroundColourGradient, palette ),
		...textPaintPreview( attributes.textColour, attributes.textColourGradient, palette ),
		...wrapperBorderPreview( attributes, tier, palette ),
		...typographyPreviewStyle( attributes, '', tier ),
	};
	if ( ! bareBox ) {
		const paddingPreview = tierBoxShorthand( padding, tier );
		if ( paddingPreview ) {
			style.padding = paddingPreview;
		}
		const marginPreview = tierBoxShorthand( margin, tier );
		if ( marginPreview ) {
			style.margin = marginPreview;
		}
		if ( maxWidth ) {
			style.maxWidth = maxWidth;
		}
	}
	return style;
}
