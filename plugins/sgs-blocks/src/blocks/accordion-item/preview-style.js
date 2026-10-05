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
