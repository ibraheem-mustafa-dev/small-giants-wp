/**
 * sgs/site-footer-row — the row's border, flex wrap and text colour on the
 * editor canvas, as the shared wrapper and render.php paint them.
 *
 * @package SGS\Blocks
 */

import { containerWrapperPreview, textPaintPreview, RADIUS_STYLE_KEYS } from '../../utils';

/**
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier.
 * @param {Array}  palette    Theme colour palette.
 * @return {Object} Style fragment for the row root.
 */
export function footerRowPaint( attributes, tier, palette ) {
	const wrapper = containerWrapperPreview( attributes, tier, palette ).style;
	const style = {};
	[ 'borderWidth', 'borderStyle', 'borderColor', 'borderImage', ...RADIUS_STYLE_KEYS, 'flexWrap' ].forEach( ( key ) => {
		if ( undefined !== wrapper[ key ] ) {
			style[ key ] = wrapper[ key ];
		}
	} );
	return { ...style, ...textPaintPreview( attributes.textColour, attributes.textColourGradient, palette ) };
}
