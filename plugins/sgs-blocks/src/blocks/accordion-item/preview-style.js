/**
 * Editor-canvas preview for sgs/accordion-item, mirroring render.php at the
 * previewed device tier: the item's own wrapper (background, text colour,
 * border and corner radius, max width and content band through the shared
 * containerWrapperPreview()), and the header row the parent sgs/accordion
 * styles through block context (header colour and gradient, background and
 * gradient, closed/open font weight, icon colour and gradient).
 *
 * @package SGS\Blocks
 */

import {
	containerWrapperPreview,
	backgroundPaintPreview,
	textPaintPreview,
	colourVar,
	resolveShadowPreviewComposed,
} from '../../utils';
import { parseSvgGradient } from '../../utils/svg-gradient-preview';

// render.php accepts only the digit weights 100-900.
const fontWeightOf = ( value ) => ( /^[1-9]00$/.test( String( value ?? '' ) ) ? String( value ) : undefined );

/**
 * The item's own wrapper.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       'desktop' | 'tablet' | 'mobile'.
 * @param {Array}  palette    Theme colour palette.
 * @return {{ style: Object, bandStyle: Object, hasBandProps: boolean }}
 */
export function itemWrapperPreview( attributes, tier, palette ) {
	const wrapper = containerWrapperPreview( attributes, tier, palette );
	// Background first, text second: a text gradient wins the shared
	// background-image key, the same last-wins order render.php emits.
	Object.assign(
		wrapper.style,
		backgroundPaintPreview( attributes.backgroundColour, attributes.backgroundColourGradient, palette ),
		textPaintPreview( attributes.textColour, attributes.textColourGradient, palette )
	);
	return wrapper;
}

/**
 * The shadow round the item (itemShadow and itemShadowColour from the parent accordion), as render.php prints it on the item root; the open shadow replaces it while the item previews open.
 *
 * @param {Object}  context Block context from sgs/accordion.
 * @param {boolean} open    Whether the item previews open.
 * @return {Object} Style for the item root; empty while no shadow is set.
 */
export function itemShadowPreview( context, open ) {
	const colour = context[ 'sgs/accordionItemShadowColour' ];
	const resting = resolveShadowPreviewComposed( context[ 'sgs/accordionItemShadow' ], colour );
	const openShadow = open
		? resolveShadowPreviewComposed(
				context[ 'sgs/accordionItemShadowOpen' ],
				context[ 'sgs/accordionItemShadowOpenColour' ] || colour
		  )
		: undefined;
	const shadow = openShadow || resting;
	return shadow ? { boxShadow: shadow } : {};
}

/**
 * The ring round the toggle icon (iconCircle* from the parent accordion), as render.php prints it on the icons box.
 *
 * @param {Object}  context Block context from sgs/accordion.
 * @param {string}  tier    'desktop' | 'tablet' | 'mobile'.
 * @param {boolean} open    Whether the item previews open.
 * @return {Object} Inline style for the icons box; empty while every ring member is empty.
 */
export function iconRingPreview( context, tier, open ) {
	const sizes = context[ 'sgs/accordionIconCircleSize' ] || {};
	const size = [ tier, 'tablet', 'desktop' ]
		.slice( 'mobile' === tier ? 0 : 'tablet' === tier ? 1 : 2 )
		.map( ( t ) => sizes[ t ] )
		.find( ( v ) => 'number' === typeof v && v > 0 );
	const widths = context[ 'sgs/accordionIconCircleBorderWidth' ] || {};
	const side = ( key ) => ( /^\d+(\.\d+)?(px|em|rem)?$/.test( String( widths[ key ] ?? '' ) ) ? String( widths[ key ] ) : '' );
	const hasWidth = [ 'top', 'right', 'bottom', 'left' ].some( ( key ) => '' !== side( key ) );
	const borderColour = colourVar( ( open && context[ 'sgs/accordionIconCircleBorderColourOpen' ] ) || context[ 'sgs/accordionIconCircleBorderColour' ] );
	const background = colourVar( ( open && context[ 'sgs/accordionIconCircleBackgroundOpen' ] ) || context[ 'sgs/accordionIconCircleBackground' ] );
	if ( ! size && ! hasWidth && ! borderColour && ! background ) {
		return {};
	}
	return {
		boxSizing: 'border-box',
		borderRadius: '50%',
		display: 'grid',
		placeItems: 'center',
		...( size ? { width: `${ size }px`, height: `${ size }px` } : {} ),
		...( background ? { backgroundColor: background } : {} ),
		...( hasWidth
			? {
					borderStyle: 'solid',
					borderWidth: [ 'top', 'right', 'bottom', 'left' ].map( ( key ) => ( side( key ) ? ( /[a-z]$/.test( side( key ) ) ? side( key ) : `${ side( key ) }px` ) : '0' ) ).join( ' ' ),
			  }
			: {} ),
		...( borderColour ? { borderColor: borderColour } : {} ),
	};
}

/**
 * The header row, title and icon as the parent accordion styles them.
 *
 * @param {Object}  context Block context from sgs/accordion.
 * @param {Array}   palette Theme colour palette.
 * @param {boolean} open    Whether the item previews open.
 * @return {{ header: Object, title: Object, icon: Object, iconGradient: ?Object }}
 */
export function headerPreview( context, palette, open ) {
	const header = {
		...backgroundPaintPreview(
			context[ 'sgs/accordionHeaderBackground' ],
			context[ 'sgs/accordionHeaderBackgroundGradient' ],
			palette
		),
	};
	const weight = fontWeightOf(
		open
			? context[ 'sgs/accordionHeaderFontWeightOpen' ] || context[ 'sgs/accordionHeaderFontWeight' ]
			: context[ 'sgs/accordionHeaderFontWeight' ]
	);
	if ( weight ) {
		header.fontWeight = weight;
	}

	// A flat header colour sits on the header (the icon inherits it, as on the
	// page); a gradient clips to the title's glyphs instead, so it never shares
	// the header's own background-image with the header background.
	const textPaint = textPaintPreview(
		context[ 'sgs/accordionHeaderColour' ],
		context[ 'sgs/accordionHeaderColourGradient' ],
		palette
	);
	const title = textPaint.backgroundImage ? textPaint : {};
	if ( ! textPaint.backgroundImage ) {
		Object.assign( header, textPaint );
	}

	const iconColour = colourVar( context[ 'sgs/accordionIconColour' ] );
	const iconGradientValue = context[ 'sgs/accordionIconColourGradient' ];
	return {
		header,
		title,
		icon: iconColour ? { color: iconColour } : {},
		iconGradient: iconGradientValue ? parseSvgGradient( iconGradientValue ) : null,
	};
}
