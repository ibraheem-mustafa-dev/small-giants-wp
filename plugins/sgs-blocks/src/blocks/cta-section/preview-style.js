/**
 * Editor-canvas mirrors for the call-to-action section's wrapper declarations.
 *
 * render.php hands the block's attributes to the shared container wrapper, which
 * prints the text colour, typography, border, spacing, size and gap into a
 * scoped stylesheet and caps the content in a band; the canvas has no server
 * render, so these build the same values for the previewed device tier.
 * Editor-only: the front end carries no inline style.
 *
 * @package SGS\Blocks
 */
import {
	typographyPreviewStyle,
	textPaintPreview,
	spacingPreview,
	tierLengthPreview,
	resolveBoxTierPreview,
	resolveResponsiveTier,
	resolveContentWidthPreview,
	contentBandPreview,
	wrapperBorderPreview,
} from '../../utils';

/**
 * Wrapper style fragment and content band for the CTA canvas.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @param {Array}  palette    Theme colour palette.
 * @param {Object} style      The wrapper style built so far (grid keys migrate to the band when one exists).
 * @return {{bandStyle: Object, hasBandProps: boolean}} Content band.
 */
export function applyCtaWrapperPreview( attributes, tier, palette, style ) {
	Object.assign(
		style,
		typographyPreviewStyle( attributes, '', tier ),
		textPaintPreview( attributes.textColour, attributes.textColourGradient, palette ),
		wrapperBorderPreview( attributes, tier, palette ),
		spacingPreview( { padding: attributes.padding, margin: attributes.margin }, tier )
	);
	const minHeight = tierLengthPreview( attributes.minHeight, tier );
	if ( minHeight ) {
		style.minHeight = minHeight;
	}
	const maxWidth = resolveResponsiveTier( attributes.maxWidth, tier )?.value;
	if ( maxWidth ) {
		style.maxWidth = maxWidth;
	}
	const gap = tierLengthPreview( attributes.gap, tier );
	if ( gap ) {
		style.gap = gap;
	}
	const { contentBandPadding } = attributes;
	const { hasBandProps, bandStyle } = contentBandPreview( {
		contentWidth: resolveContentWidthPreview( resolveResponsiveTier( attributes.contentWidth, tier )?.value ),
		bandPadding: resolveBoxTierPreview( contentBandPadding?.desktop, contentBandPadding?.tablet, contentBandPadding?.mobile, tier ),
		style,
		layout: attributes.layout,
	} );
	const rows = attributes.gridTemplateRows;
	if ( 'grid' === attributes.layout && 'string' === typeof rows && rows.trim() ) {
		( hasBandProps ? bandStyle : style ).gridTemplateRows = rows.trim();
	}
	return { bandStyle, hasBandProps };
}
