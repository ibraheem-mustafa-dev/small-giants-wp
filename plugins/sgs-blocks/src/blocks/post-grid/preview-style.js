/**
 * Editor-canvas mirrors for the post grid's wrapper and card paint.
 *
 * render.php hands the block's width, border and radius to the shared container
 * wrapper (which caps the content band) and writes the card gradient as a
 * custom property; the canvas has no server render, so these build the same
 * values for the previewed device tier. Editor-only: the front end carries no
 * inline style.
 *
 * @package SGS\Blocks
 */
import {
	resolveResponsiveTier,
	resolveContentWidthPreview,
	contentBandPreview,
	wrapperBorderPreview,
	isCssGradient,
} from '../../utils';

/**
 * Root style and content band for the post grid canvas.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {{rootStyle: Object, bandStyle: Object, hasBandProps: boolean}} Styles.
 */
export function postGridWrapperPreview( attributes, tier, palette ) {
	const rootStyle = wrapperBorderPreview( attributes, tier, palette );
	const maxWidth = resolveResponsiveTier( attributes.maxWidth, tier )?.value;
	if ( maxWidth ) {
		rootStyle.maxWidth = maxWidth;
	}
	const { hasBandProps, bandStyle } = contentBandPreview( {
		contentWidth: resolveContentWidthPreview( resolveResponsiveTier( attributes.contentWidth, tier )?.value ),
		bandPadding: {},
		style: rootStyle,
		layout: 'stack',
	} );
	return { rootStyle, bandStyle, hasBandProps };
}

/**
 * The card gradient custom property style.css reads (`--sgs-card-bg-gradient`).
 *
 * @param {string} gradient `cardBgColourGradient` value.
 * @return {Object} Style fragment; empty unless the value is a real gradient.
 */
export function cardGradientPreview( gradient ) {
	return isCssGradient( gradient )
		? { '--sgs-card-bg-gradient': gradient }
		: {};
}
