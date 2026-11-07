/**
 * The sgs/timeline entry card and milestone picture in the editor canvas: the twin of the card
 * and media rules render.php prints (background gradient, border, radius, shadow, widest card,
 * text-to-image gap, picture shape).
 *
 * @package SGS\Blocks
 */

import { colourVar, sgsBorderPreview, resolveShadowPreviewComposed, tierValueOf } from '../../utils';

const RATIO_RE = /^\s*(\d+(?:\.\d+)?)\s*(?:\/\s*(\d+(?:\.\d+)?)\s*)?$/;

/**
 * A length as CSS: a bare number is pixels, as the front end prints it.
 *
 * @param {*} raw Stored length.
 * @return {string|undefined} The CSS length, or undefined when unset.
 */
function lengthOf( raw ) {
	if ( undefined === raw || null === raw || '' === raw ) {
		return undefined;
	}
	return /^-?\d+(\.\d+)?$/.test( String( raw ) ) ? `${ raw }px` : String( raw );
}

/**
 * The inline style a horizontal timeline entry card gets beyond its background colour and padding.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @return {Object} React style fragment.
 */
export function timelineCardPreviewStyle( attributes, tier ) {
	const style = sgsBorderPreview(
		{
			widthValues: attributes.cardBorderWidth,
			styleValue: attributes.cardBorderStyle,
			colourValue: attributes.cardBorderColour,
			colourGradientValue: attributes.cardBorderColourGradient,
			radiusValues: attributes.cardBorderRadius,
		},
		tier
	);
	if ( attributes.cardBackgroundColourGradient ) {
		style.backgroundImage = attributes.cardBackgroundColourGradient;
	}
	const boxShadow = resolveShadowPreviewComposed( attributes.cardShadow, colourVar( attributes.cardShadowColour ) );
	if ( boxShadow ) {
		style.boxShadow = boxShadow;
	}
	const maxWidth = lengthOf( tierValueOf( attributes.cardMaxWidth, tier ) );
	if ( maxWidth ) {
		style.maxWidth = maxWidth;
	}
	const columnGap = lengthOf( tierValueOf( attributes.cardColumnGap, tier ) );
	if ( columnGap ) {
		style.columnGap = columnGap;
	}
	return style;
}

/**
 * The inline style of an entry's milestone picture slot: its aspect ratio and corner radius.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed device tier.
 * @return {Object} React style fragment.
 */
export function timelineMediaPreviewStyle( attributes, tier ) {
	const style = sgsBorderPreview( { radiusValues: attributes.mediaBorderRadius }, tier );
	const ratio = RATIO_RE.exec( String( tierValueOf( attributes.mediaAspectRatio, tier ) ?? '' ) );
	if ( ratio && Number( ratio[ 1 ] ) > 0 && Number( ratio[ 2 ] ?? 1 ) > 0 ) {
		style.aspectRatio = ratio[ 2 ] ? `${ ratio[ 1 ] } / ${ ratio[ 2 ] }` : ratio[ 1 ];
	}
	if ( style.aspectRatio || Object.keys( style ).length ) {
		style.overflow = 'hidden';
	}
	return style;
}
