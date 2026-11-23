/**
 * The editor canvas's twin of a built-in button's look: `buttonKitStyle()` returns the React style one built-in button
 * wears for a prefix, from the attributes the shared panel (`BuiltinButtonPanelBody`) writes.
 *
 * It composes the shared preview helpers, one for each family `includes/helpers-button-style.php::sgs_button_kit_css()` prints:
 * colour and gradient (`backgroundPaintPreview`, `textPaintPreview`), border width, style, colour and per-device radius
 * (`sgsBorderPreview`), per-device padding (`tierBoxLonghands`), min height and the square `size` (`tierLengthPreview`), type
 * (`typographyPreviewStyle`) and shadow (`composeShadow`). The attribute names are `prefix + base`, the bases taken from
 * `registry.json`, so the canvas can never read a name the generator did not create. The preset choice is not here: the
 * canvas gives the button the preset's class, as the page does. Hover and press states are not previewed, so `HoverLiftDistance`
 * (a hover movement) has no canvas twin.
 *
 * `tests/js/button-kit-style.test.js` runs this and the PHP emitter over one fixture (`tests/fixtures/button-kit/preview-parity.json`)
 * and compares what each paints. Inline `style` is allowed in the editor canvas only; the front end prints a stylesheet.
 *
 * @package
 */
import registry from './registry.json';
import {
	backgroundPaintPreview,
	textPaintPreview,
} from '../../utils/background-preview';
import { sgsBorderPreview } from '../../utils/border-preview';
import { tierLengthPreview } from '../../utils/cssLength';
import { tierValueOf } from '../../utils/responsive';
import { composeShadow } from '../../utils/shadow-layers';
import { tierBoxLonghands } from '../../utils/spacing-preview';
import { typographyPreviewStyle } from '../../utils/typography-preview';

/** The `justify-content` values `{prefix}ContentAlign` takes (sgs/button's `contentAlign` list; PHP: SGS_BUTTON_KIT_CONTENT_ALIGN). */
const CONTENT_ALIGN = [ 'flex-start', 'center', 'flex-end', 'space-between' ];

/** The `position` values `{prefix}Position` takes (the `float` group; PHP: SGS_BUTTON_KIT_POSITIONS). */
const POSITIONS = [ 'static', 'relative', 'absolute' ];

const BASES = new Set(
	Object.values( registry.groups )
		.flat()
		.map( ( row ) => row.base )
);

/**
 * @param {Object} attributes        Block attributes.
 * @param {string} prefix            The button's attribute prefix (for example 'flowOpener').
 * @param {Object} [options]
 * @param {string} [options.tier]    Previewed device tier from usePreviewTier(); 'desktop' by default.
 * @param {Array}  [options.palette] Theme colour palette, for colour slugs.
 * @return {Object} React style fragment; `{}` when nothing is set.
 */
export default function buttonKitStyle(
	attributes,
	prefix,
	{ tier = 'desktop', palette = [] } = {}
) {
	const attr = ( base ) => {
		if ( ! BASES.has( base ) ) {
			throw new Error(
				`buttonKitStyle: "${ base }" is not in button-kit/registry.json`
			);
		}
		return attributes?.[ prefix + base ];
	};
	const style = {
		...typographyPreviewStyle( attributes || {}, prefix, tier ),
		...backgroundPaintPreview(
			attr( 'ColourBackground' ),
			attr( 'ColourBackgroundGradient' ),
			palette
		),
		...textPaintPreview(
			attr( 'ColourText' ),
			attr( 'ColourTextGradient' ),
			palette
		),
		...sgsBorderPreview(
			{
				widthValues: attr( 'BorderWidth' ),
				styleValue: attr( 'BorderStyle' ),
				colourValue: attr( 'ColourBorder' ),
				colourGradientValue: attr( 'ColourBorderGradient' ),
				radiusValues: attr( 'BorderRadius' ),
			},
			tier,
			palette
		),
		...tierBoxLonghands( attr( 'Padding' ), tier, 'padding' ),
	};

	const minHeight = tierLengthPreview( attr( 'MinHeight' ), tier );
	if ( minHeight ) {
		style.minHeight = minHeight;
	}

	// The `size` group (a square control: a carousel arrow, a pause button): one length for both sides.
	const size = tierLengthPreview( attr( 'Size' ), tier );
	if ( size ) {
		style.width = size;
		style.height = size;
	}

	// The `contentAlign` group: justify-content on the button, from sgs/button's value list, at the previewed device.
	const align = tierValueOf( attr( 'ContentAlign' ), tier );
	if ( CONTENT_ALIGN.includes( align ) ) {
		style.justifyContent = align;
	}

	// The `float` group: position and the four edge offsets at the previewed device.
	const position = tierValueOf( attr( 'Position' ), tier );
	if ( POSITIONS.includes( position ) ) {
		style.position = position;
	}
	for ( const [ base, property ] of [
		[ 'InsetTop', 'top' ],
		[ 'InsetRight', 'right' ],
		[ 'InsetBottom', 'bottom' ],
		[ 'InsetLeft', 'left' ],
	] ) {
		const edge = tierLengthPreview( attr( base ), tier );
		if ( edge ) {
			style[ property ] = edge;
		}
	}

	const shadow = composeShadow( attr( 'Shadow' ), attr( 'ShadowColour' ) );
	if ( shadow ) {
		style.boxShadow = shadow;
	}

	const width = attr( 'WidthType' );
	if ( 'full' === width ) {
		style.width = '100%';
	} else if ( 'fit' === width ) {
		style.width = 'fit-content';
	}
	return style;
}
