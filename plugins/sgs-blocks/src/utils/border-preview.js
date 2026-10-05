/**
 * sgsBorderPreview — the editor-canvas twin of `SgsBorderControl`: it takes the
 * same values a block hands that panel (`widthValues`, `styleValue`,
 * `colourValue`, `colourGradientValue`, `radiusValues`) and returns the border
 * the published page paints, composed from the shared border helpers.
 *
 * @package SGS\Blocks
 */

import { boxShorthand } from './spacing-preview';
import { borderBoxPreview, resolveBorderStyle } from './border-style';
import { borderPaintPreview } from './background-preview';
import { borderRadiusPreview } from './radius-preview';

/**
 * The radius attribute behind a panel's `radiusValues`: the panel envelope
 * `{ base, tablet, mobile }` maps to the tier object `{ desktop, tablet, mobile }`;
 * the attribute itself (tier object, flat corner box or uniform string) passes through.
 *
 * @param {*} radiusValues Panel radius values, or the radius attribute.
 * @return {*} A value `borderRadiusPreview()` reads.
 */
function radiusSource( radiusValues ) {
	if ( radiusValues && 'object' === typeof radiusValues && 'base' in radiusValues ) {
		return { desktop: radiusValues.base, tablet: radiusValues.tablet, mobile: radiusValues.mobile };
	}
	return radiusValues;
}

/**
 * Border width, style, paint and radius for one element.
 *
 * By default the border paints only beside a real width (`borderBoxPreview()`'s
 * rule: a width with no style paints solid, `none` paints nothing) and its
 * colour rides with it. `defaultBorder` is for an element whose own stylesheet
 * already paints a border: a chosen style, width or colour then applies on its
 * own, overriding just that part of the stylesheet's border.
 *
 * @param {Object}  values
 * @param {Object}  [values.widthValues]         `{ top, right, bottom, left }` width box.
 * @param {string}  [values.styleValue]          Stored border-style.
 * @param {string}  [values.colourValue]         Flat colour (slug or CSS colour).
 * @param {string}  [values.colourGradientValue] Gradient border colour.
 * @param {*}       [values.radiusValues]        Panel radius envelope or the radius attribute.
 * @param {string}  [tier='desktop']             Previewed device tier.
 * @param {Array}   [palette]                    Theme colour palette.
 * @param {Object}  [options]
 * @param {boolean} [options.defaultBorder=false] The element's stylesheet already paints a border.
 * @param {string}  [options.fallbackColour]      Colour painted when no flat colour is set.
 * @param {boolean} [options.wholeTier=false]     Radius tiers replace whole (see borderRadiusPreview).
 * @return {Object} React style fragment; {} when nothing paints.
 */
export function sgsBorderPreview(
	{ widthValues, styleValue, colourValue, colourGradientValue, radiusValues } = {},
	tier = 'desktop',
	palette,
	{ defaultBorder = false, fallbackColour, wholeTier = false } = {}
) {
	let style;
	if ( defaultBorder ) {
		style = {};
		const width = boxShorthand( widthValues );
		if ( styleValue || width ) style.borderStyle = resolveBorderStyle( styleValue );
		if ( width ) style.borderWidth = width;
	} else {
		style = borderBoxPreview( widthValues, styleValue );
	}
	if ( style.borderStyle || defaultBorder ) {
		Object.assign( style, borderPaintPreview( colourValue, colourGradientValue, palette ) );
		if ( ! style.borderColor && fallbackColour ) style.borderColor = fallbackColour;
	}
	return Object.assign( style, borderRadiusPreview( radiusSource( radiusValues ), tier, { wholeTier } ) );
}
