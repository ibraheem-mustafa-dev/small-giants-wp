/**
 * The `open` and `state` entrance triggers in the canvas (Spec 38A §5.2, §8, §9): the twin of
 * `includes/motion/class-sgs-motion-trigger-open-state.php`, which hooks the emitter's `sgs_motion_entrance_trigger`
 * and `sgs_motion_entrance_css` filters.
 *
 * - A `state` entrance must name a state its block declares in `supports.sgs.motion.states`; any other is dropped.
 * - `open` adds the close values per device: `--sgs-me-close-to-<suffix>`, `--sgs-me-close-dur`,
 *   `--sgs-me-close-delay` and, desktop only, `--sgs-me-close-ease`. When the entrance insets one clip edge,
 *   `applyCloseClipEdge` writes the close clip amount on that edge's holder in place of the uniform one.
 * - `state` adds one rule keyed to the named state on the host, with the animation name unless the WAAPI module plays
 *   a multi-keyframe entrance. A CSS state entrance also gets the rest rule (`<name>-rest`: a zero duration and delay,
 *   so a state already true at load jumps to its held values with no visible animation) and, when the layer stores `close` values, the same close
 *   properties as `open` plus the out rule (`<name>-out`: the close keyframes on the close duration, easing and delay).
 *
 * @package SGS\Blocks
 */

import { fields, ME_PREFIX, rules, TIERS, valueCss } from './motion-schema';
import { applyCloseClipEdge } from './emit-clip-edge';

const STATE_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const STATE_ATTR = 'data-sgs-motion-state';
const CLOSE_PREFIX = '--sgs-me-close-';
const OUT_SUFFIX = '-out';
const REST_SUFFIX = '-rest';
const STATE_SUFFIX_MAX = 59;
const PAINT = {
	backgroundColour: [ 'background-color', '--sgs-me-to-bg' ],
	textColour: [ 'color', '--sgs-me-to-fg' ],
	borderColour: [ 'border-color', '--sgs-me-to-bd' ],
};

const plain = ( v ) => ( v && typeof v === 'object' && ! Array.isArray( v ) ? v : {} );

/**
 * The states a block declares (`supports.sgs.motion.states`), valid names only, each once.
 *
 * @param {unknown} motionSupport The block's `supports.sgs.motion` value.
 * @return {string[]} State names.
 */
export function declaredStates( motionSupport ) {
	const states = Array.isArray( motionSupport?.states ) ? motionSupport.states : [];
	return [ ...new Set( states.filter( ( s ) => typeof s === 'string' && STATE_PATTERN.test( s ) ) ) ];
}

/**
 * The entrance trigger after the open/state check: '' drops the entrance.
 *
 * @param {string}   trigger Stored trigger.
 * @param {Object}   base    Entrance base layer.
 * @param {string[]} states  The block's declared states.
 * @return {string} Trigger.
 */
export function filterTrigger( trigger, base, states ) {
	if ( trigger !== 'state' ) {
		return trigger;
	}
	const state = typeof base?.state === 'string' ? base.state : '';
	return state !== '' && states.includes( state ) ? trigger : '';
}

function closeRules( base, selector ) {
	const tiers = {
		desktop: plain( base.close ),
		tablet: plain( base.devices?.tablet?.close ),
		mobile: plain( base.devices?.mobile?.close ),
	};
	const timing = { closeDuration: 'dur', closeDelay: 'delay', closeEasing: 'ease' };
	const toFields = fields( 'EntranceCloseTo' );
	const decls = { desktop: {}, tablet: {}, mobile: {} };
	TIERS.forEach( ( tier ) => {
		const close = tiers[ tier ];
		Object.entries( plain( close.to ) ).forEach( ( [ key, value ] ) => {
			const prop = toFields[ key ]?.css ?? null;
			const out = valueCss( 'EntranceCloseTo', key, value );
			if ( prop === null || out === null || ! prop.startsWith( ME_PREFIX ) ) {
				return;
			}
			decls[ tier ][ CLOSE_PREFIX + 'to-' + prop.slice( ME_PREFIX.length ) ] = out;
		} );
		Object.entries( timing ).forEach( ( [ key, suffix ] ) => {
			if ( key === 'closeEasing' && tier !== 'desktop' ) {
				return;
			}
			const out = Object.prototype.hasOwnProperty.call( close, key )
				? valueCss( 'EntranceClose', key, close[ key ] )
				: null;
			if ( out !== null ) {
				decls[ tier ][ CLOSE_PREFIX + suffix ] = out;
			}
		} );
	} );
	applyCloseClipEdge( base, decls );
	return rules( selector, decls );
}

// The colour to-values read into their CSS properties (stored once, for every device).
function paint( base ) {
	const to = plain( plain( base.values ).to );
	return Object.fromEntries(
		Object.entries( PAINT )
			.filter( ( [ key ] ) => typeof to[ key ] === 'string' && to[ key ] !== '' )
			.map( ( [ , [ property, holder ] ] ) => [ property, `var(${ holder })` ] )
	);
}

function openPaintRule( base, selector ) {
	const declarations = paint( base );
	if ( Object.keys( declarations ).length === 0 ) {
		return '';
	}
	const open = `[${ STATE_ATTR }~="open"]`;
	const closed = `[${ STATE_ATTR }]:not(${ open })`;
	return rules( `${ selector }:is(${ open },${ open } *):not(${ closed },${ closed } *)`, {
		desktop: declarations,
		tablet: {},
		mobile: {},
	} );
}

function hasClose( base ) {
	return [ base.close, base.devices?.tablet?.close, base.devices?.mobile?.close ].some(
		( close ) => Object.keys( plain( close ) ).length > 0
	);
}

function stateRule( base, selector, keyframes ) {
	const state = typeof base.state === 'string' ? base.state : '';
	if ( ! STATE_PATTERN.test( state ) ) {
		return '';
	}
	const host = `[${ STATE_ATTR }~="${ state }"]`;
	const decls = { '--sgs-mt-on': '1' };
	if ( ! keyframes ) {
		decls[ 'animation-name' ] = 'var(--sgs-mt-in,none)';
	}
	Object.assign( decls, paint( base ) );
	let css = rules( `${ selector }:is(${ host },${ host } *)`, { desktop: decls, tablet: {}, mobile: {} } );
	if ( keyframes || state.length > STATE_SUFFIX_MAX ) {
		return css;
	}
	if ( hasClose( base ) ) {
		const out = `[${ STATE_ATTR }~="${ state }${ OUT_SUFFIX }"]`;
		css += rules( `${ selector }:is(${ out },${ out } *)`, {
			desktop: {
				'--sgs-me-a-dur': 'var(--sgs-me-close-dur,var(--sgs-me-dur,var(--wp--custom--duration--slow,450ms)))',
				'--sgs-me-a-ease': 'var(--sgs-me-close-ease,var(--sgs-me-ease,var(--wp--custom--entrance--easing,ease-out)))',
				'--sgs-me-a-delay': 'var(--sgs-me-close-delay,0ms)',
				'animation-name': 'var(--sgs-mt-out,none)',
			},
			tablet: {},
			mobile: {},
		} );
	}
	const rest = `[${ STATE_ATTR }~="${ state }${ REST_SUFFIX }"]`;
	return (
		css +
		rules( `${ selector }:is(${ rest },${ rest } *)`, {
			desktop: {
				'--sgs-me-a-dur': 'var(--sgs-mt-rest,0ms)',
				'--sgs-me-a-delay': 'var(--sgs-mt-rest,0ms)',
			},
			tablet: {},
			mobile: {},
		} )
	);
}

/**
 * A trigger's own rules beyond the entrance values.
 *
 * @param {Object} base     Entrance base layer.
 * @param {string} selector Scoped selector.
 * @param {Object} attrs    The target's data attributes.
 * @return {string} CSS.
 */
export function triggerCss( base, selector, attrs ) {
	const trigger = String( attrs[ 'data-sgs-me' ] ?? '' ).trim().split( /\s+/ )[ 0 ] ?? '';
	if ( trigger === 'open' ) {
		return closeRules( base, selector ) + openPaintRule( base, selector );
	}
	if ( trigger === 'state' ) {
		const keyframes = attrs[ 'data-sgs-me-keyframes' ] !== undefined;
		const close = ! keyframes && hasClose( base ) ? closeRules( base, selector ) : '';
		return close + stateRule( base, selector, keyframes );
	}
	return '';
}
