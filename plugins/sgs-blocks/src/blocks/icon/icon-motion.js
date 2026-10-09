/**
 * The hover move, motion and shadow of sgs/icon and the sgs/social-icons row, as the canvas's custom properties and the
 * inspector's attribute names. Twin of includes/helpers-icon-motion.php (sgs_icon_motion_decls, sgs_icon_shadow_vars).
 *
 * @package SGS\Blocks
 */

import { composeShadow } from '../../utils/shadow-layers';
import { shadowHoverValue } from '../../utils/shadow-hover';
import { motionEasingCss } from '../../components/MotionEasingControl';

/** The attribute names an icon stores the motion and shadow under. */
export const ICON_MOTION_NAMES = {
	x: 'offsetXHover',
	y: 'offsetYHover',
	rotate: 'iconRotateHover',
	moveMs: 'transitionDuration',
	paintMs: 'paintDuration',
	easing: 'transitionEasing',
	easingCustom: 'transitionEasingCustom',
	shadow: 'boxShadow',
	lift: 'shadowLiftOnHover',
};

/** The attribute names a social-icons row stores its group defaults under. */
export const ROW_MOTION_NAMES = {
	x: 'childIconOffsetXHover',
	y: 'childIconOffsetYHover',
	rotate: 'childIconRotateHover',
	moveMs: 'childIconTransitionDuration',
	paintMs: 'childIconPaintDuration',
	easing: 'childIconTransitionEasing',
	easingCustom: 'childIconTransitionEasingCustom',
	shadow: 'childIconBoxShadow',
	lift: 'childIconShadowLiftOnHover',
};

const num = ( raw ) => ( 'number' === typeof raw && Number.isFinite( raw ) ? raw : 0 );
const clamp = ( value, limit ) => Math.max( -limit, Math.min( limit, value ) );
const round2 = ( value ) => Math.round( value * 100 ) / 100;

/**
 * The hover move and motion custom properties for a set of stored values.
 *
 * @param {Object} attributes Block attributes.
 * @param {Object} names      ICON_MOTION_NAMES or ROW_MOTION_NAMES.
 * @param {string} prefix     '--sgs-icon' or '--sgs-si'.
 * @return {Object} React style fragment.
 */
export function iconMotionStyle( attributes, names, prefix ) {
	const style = {};
	[
		[ 'hover-x', names.x, 40, 'px' ],
		[ 'hover-y', names.y, 40, 'px' ],
		[ 'hover-rotate', names.rotate, 180, 'deg' ],
	].forEach( ( [ property, key, limit, unit ] ) => {
		const value = num( attributes[ key ] );
		if ( Math.abs( value ) > 0.001 ) {
			style[ `${ prefix }-${ property }` ] = `${ round2( clamp( value, limit ) ) }${ unit }`;
		}
	} );
	[
		[ 'move-duration', names.moveMs ],
		[ 'paint-duration', names.paintMs ],
	].forEach( ( [ property, key ] ) => {
		const ms = Math.max( 0, Math.min( 3000, Math.round( num( attributes[ key ] ) ) ) );
		if ( ms > 0 ) {
			style[ `${ prefix }-${ property }` ] = `${ ms }ms`;
		}
	} );
	const easing = ( attributes[ names.easing ] || '' ).trim();
	if ( easing ) {
		const css = motionEasingCss( easing, attributes[ names.easingCustom ] || '', '' );
		if ( css ) {
			style[ `${ prefix }-move-easing` ] = css;
		}
	}
	return style;
}

/**
 * The resting and hover shadow custom properties. Twin of sgs_icon_shadow_vars().
 *
 * @param {Object}  attributes Block attributes.
 * @param {Object}  names      ICON_MOTION_NAMES or ROW_MOTION_NAMES.
 * @param {string}  prefix     '--sgs-icon' or '--sgs-si'.
 * @param {Object}  [options]
 * @param {boolean} [options.pinHover] Pin an unset hover to the resting shadow (an icon with a shadow of its own).
 * @param {Object}  [options.hoverMap] `settings.custom.shadowHover`, for a preset's automatic lift.
 * @return {Object} React style fragment.
 */
export function iconShadowStyle( attributes, names, prefix, { pinHover = false, hoverMap = {} } = {} ) {
	const base = attributes[ names.shadow ] || '';
	const colour = attributes[ `${ names.shadow }Colour` ] || '';
	const hoverShape = attributes[ `${ names.shadow }Hover` ] || '';
	const hoverColour = attributes[ `${ names.shadow }ColourHover` ] || '';
	const rest = composeShadow( base, colour );
	let hover = '';
	if ( hoverShape || hoverColour ) {
		hover = composeShadow( hoverShape || base, hoverColour || colour );
	} else if ( base && false !== attributes[ names.lift ] ) {
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
