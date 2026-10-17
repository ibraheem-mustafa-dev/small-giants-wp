/**
 * One target's entrance for the editor-canvas emitter (Spec 38A §9): the twin of
 * `includes/motion/class-sgs-motion-emitter.php::entrance()`. Writes the from and to holders, the timing, the start
 * line and the one perspective per device, the keyframe list for a multi-keyframe entrance, and `data-sgs-me`. The
 * trigger passes the same check as the page's `sgs_motion_entrance_trigger` filter (`trigger-rules.js`: an undeclared
 * `state` drops the entrance).
 *
 * @package SGS\Blocks
 */

import {
	fields,
	ME_PREFIX,
	orderedChannels,
	propertyChannels,
	tierValues,
	TIERS,
	valueCss,
} from './motion-schema';
import { keyframesJson } from './emit-rotation';
import { filterTrigger } from './trigger-rules';
import { applyClipEdge } from './emit-clip-edge';

const has = ( obj, key ) => Object.prototype.hasOwnProperty.call( obj, key );

/**
 * The entrance's declarations and data attributes.
 *
 * @param {Object} base    Entrance base layer.
 * @param {Object} decls   Per-tier declarations (mutated).
 * @param {Object} attrs   Data attributes (mutated).
 * @param {Object} context `lcp` (boolean), `states` (the block's declared states).
 * @return {boolean} Whether an entrance was emitted.
 */
export function emitEntrance( base, decls, attrs, context ) {
	const trigger = filterTrigger( String( base.trigger ?? 'scroll' ), base, context.states || [] );
	if ( trigger === '' ) {
		return false;
	}
	const tiers = tierValues( base );
	const keepOp = ( trigger === 'load' || trigger === 'scroll' ) && Boolean( context.lcp ) && tiers.desktop.allowLcpFade !== true;
	const map = propertyChannels();
	const used = {};
	const timing = { duration: 'dur', delay: 'delay', easing: 'ease', start: 'start' };
	TIERS.forEach( ( tier ) => {
		[
			[ 'from', 'EntranceFrom' ],
			[ 'to', 'EntranceTo' ],
		].forEach( ( [ end, def ] ) => {
			const values = tiers[ tier ][ end ];
			const plain = values && typeof values === 'object' ? values : {};
			Object.entries( plain ).forEach( ( [ key, value ] ) => {
				const prop = fields( def )[ key ]?.css ?? null;
				const css = valueCss( def, key, value );
				if ( prop === null || css === null ) {
					return;
				}
				used[ prop ] = true;
				decls[ tier ][ ME_PREFIX + end + '-' + prop.slice( ME_PREFIX.length ) ] = css;
			} );
		} );
		Object.entries( timing ).forEach( ( [ key, suffix ] ) => {
			const css = has( tiers[ tier ], key ) ? valueCss( 'EntranceValues', key, tiers[ tier ][ key ] ) : null;
			if ( css !== null ) {
				decls[ tier ][ ME_PREFIX + suffix ] = css;
			}
		} );
		const persp = fields( 'EntranceValues' ).perspective?.css ?? null;
		const css =
			persp !== null && has( tiers[ tier ], 'perspective' )
				? valueCss( 'EntranceValues', 'perspective', tiers[ tier ].perspective )
				: null;
		if ( css !== null ) {
			decls[ tier ][ persp ] = css;
		}
	} );
	applyClipEdge( tiers, decls, context.report );
	const keyframes = keyframesJson( tiers.desktop.keyframes ?? null, used, keepOp, decls.desktop );
	if ( keepOp ) {
		const opFrom = ME_PREFIX + 'from-op';
		delete decls.tablet[ opFrom ];
		delete decls.mobile[ opFrom ];
		if ( used[ ME_PREFIX + 'op' ] ) {
			decls.desktop[ opFrom ] = '1';
		}
	}
	if ( keyframes !== null ) {
		attrs[ 'data-sgs-me-keyframes' ] = keyframes;
	}
	const channels = {};
	Object.keys( used ).forEach( ( prop ) => {
		if ( map[ prop ] ) {
			channels[ map[ prop ] ] = true;
		}
	} );
	attrs[ 'data-sgs-me' ] = `${ trigger } ${ orderedChannels( channels ).join( ' ' ) }`.trim();
	return true;
}
