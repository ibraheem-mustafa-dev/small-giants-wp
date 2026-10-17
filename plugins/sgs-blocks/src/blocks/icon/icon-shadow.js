/**
 * The shadow of sgs/icon and the sgs/social-icons row, as the canvas's custom properties. Twin of
 * includes/helpers-icon-shadow.php (sgs_icon_shadow_vars).
 *
 * @package SGS\Blocks
 */

import { composeShadow } from '../../utils/shadow-layers';
import { shadowHoverValue } from '../../utils/shadow-hover';

/**
 * The resting and hover shadow custom properties. Twin of sgs_icon_shadow_vars().
 *
 * The caller reads each shadow attribute by its own name (so the canvas read is visible to the wiring gate) and passes the values.
 *
 * @param {Object}  values      { shadow, colour, hover, hoverColour, lift }: the stored shadow, its colour, the hover shadow and colour, the lift switch.
 * @param {string}  prefix      '--sgs-icon' or '--sgs-si'.
 * @param {Object}  [options]
 * @param {boolean} [options.pinHover] Pin an unset hover to the resting shadow (an icon with a shadow of its own).
 * @param {Object}  [options.hoverMap] `settings.custom.shadowHover`, for a preset's automatic lift.
 * @return {Object} React style fragment.
 */
export function iconShadowStyle( values, prefix, { pinHover = false, hoverMap = {} } = {} ) {
	const base = values.shadow || '';
	const colour = values.colour || '';
	const hoverShape = values.hover || '';
	const hoverColour = values.hoverColour || '';
	const rest = composeShadow( base, colour );
	let hover = '';
	if ( hoverShape || hoverColour ) {
		hover = composeShadow( hoverShape || base, hoverColour || colour );
	} else if ( base && false !== values.lift ) {
		hover = shadowHoverValue( base, colour, hoverMap );
	}
	if ( ! hover && pinHover ) {
		hover = rest;
	}
	const style = {};
	if ( rest ) {
		style[ `${ prefix }-shadow` ] = rest;
	}
	if ( hover ) {
		style[ `${ prefix }-shadow-hover` ] = hover;
	}
	return style;
}
