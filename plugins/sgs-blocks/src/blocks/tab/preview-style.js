/**
 * Editor-canvas mirror of the tab panel wrapper's own declarations.
 *
 * render.php paints the fill, text colour, border, radius and width cap on the
 * panel root and routes the width through the shared container wrapper's
 * 'content' kind; the canvas has no server render, so this builds the same
 * values at the previewed device tier. Editor-only: the front end carries no
 * inline style.
 *
 * @package SGS\Blocks
 */
import {
	backgroundPaintPreview,
	textPaintPreview,
	tierValueOf,
	wrapperBorderPreview,
	resolveContentWidthPreview,
	contentBandPreview,
} from '../../utils';

/**
 * Wrapper and content-band styles for the tab panel canvas.
 *
 * Text paint is applied after the fill: a gradient text colour owns
 * `background-image` on the root exactly as render.php's attrMap does.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {{wrapperStyle: Object, bandStyle: Object, hasBandProps: boolean}} Styles.
 */
export function buildTabPreview( attributes, tier, palette ) {
	const style = {
		...backgroundPaintPreview( attributes.backgroundColour, attributes.backgroundColourGradient, palette ),
		...textPaintPreview( attributes.textColour, attributes.textColourGradient, palette ),
		...wrapperBorderPreview( attributes, tier, palette ),
	};
	const maxWidth = tierValueOf( attributes.maxWidth, tier );
	if ( maxWidth ) {
		style.maxWidth = maxWidth;
	}
	const { hasBandProps, bandStyle } = contentBandPreview( {
		contentWidth: resolveContentWidthPreview( tierValueOf( attributes.contentWidth, tier ) ),
		bandPadding: {},
		style,
		layout: 'stack',
	} );
	return { wrapperStyle: style, bandStyle, hasBandProps };
}
