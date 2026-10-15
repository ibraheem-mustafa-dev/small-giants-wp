/**
 * The editor-canvas emitter (Spec 38A §6.5, §9, §10; FR-38A-28): the JS twin of the renderer's per-target path in
 * `includes/motion/` (`Sgs_Motion_Document::sanitise`, `Sgs_Motion_Targets::resolve`, `Sgs_Motion_Layer_Drops::resolve`,
 * `Sgs_Motion_Shared_Element`, `Sgs_Motion_Emitter::emit` with the open and state trigger rules), so the canvas writes
 * the same scoped custom properties, `transition` lists, per-device media queries and data attributes as the page,
 * and the form Focus state's field rules (`emit-focus.js`, refused off the `sgs/form` root as `focus-not-form`).
 * `tests/js/motion-canvas-emitter-parity.test.js` compares this output with the PHP output on shared fixtures
 * (`tests/php/fixtures/motion-canvas-emitter-dump.php`).
 *
 * What the canvas does not mirror, and why: the scroll-owner entrance suppression and the LCP rule are page facts (the
 * canvas shows every entrance at its final state and plays one only on Replay), so they arrive as context; the effect
 * runtime attributes (`data-sgs-fx`) and injected paint layers belong to the per-effect canvas stories (M3.6).
 *
 * @package SGS\Blocks
 */

import {
	effectValuesDef,
	fields,
	MH_PREFIX,
	orderedChannels,
	ownerProperties,
	layerWrites,
	propertyChannels,
	rules,
	tierValues,
	TIERS,
	tokenOr,
	valueCss,
} from './motion-schema';
import {
	angleChannels,
	defaultPerspective,
	emptyAngles,
	followChannels,
	followDefaults,
	followEntries,
	follows,
	followTiming,
	hoverAngles,
	isAngle,
} from './emit-rotation';
import { emitEntrance } from './emit-entrance';
import { triggerCss } from './trigger-rules';
import { resolveTarget } from './resolve-target';
import { sanitiseDocument } from './document-sanitise';
import { resolveLayerDrops } from './layer-drops';
import { stripShared } from './shared-element';
import { emitFocus, focusAllowed, FOCUS_REFUSAL } from './emit-focus';

/** Hover colour and shadow properties whose timing the hover state owns (FR-38A-7). */
const HOVER_PAINT = [ 'color', 'background-color', 'border-color', 'box-shadow' ];

const has = ( obj, key ) => Object.prototype.hasOwnProperty.call( obj, key );

const emptyTiers = () => ( { desktop: {}, tablet: {}, mobile: {} } );

const listOf = ( v ) => {
	if ( Array.isArray( v ) ) {
		return v;
	}
	return v && typeof v === 'object' ? Object.values( v ) : [];
};

/**
 * The hover state's to-values, resting values, channels and transition list.
 *
 * @param {Object} state    Hover state layer.
 * @param {Object} decls    Per-tier declarations (mutated).
 * @param {Object} trans    Per-tier transition entries (mutated).
 * @param {Object} channels Channel set (mutated).
 */
function hoverState( state, decls, trans, channels ) {
	const def = 'HoverStateValues';
	const f = fields( def );
	const tiers = tierValues( state );
	const map = propertyChannels();
	const owners = {};
	const timing = {
		'transition-duration': tokenOr( 'token:duration.fast', '200ms' ),
		'transition-delay': '0ms',
		'transition-timing-function': tokenOr( 'token:easing.ease-out', 'ease-out' ),
	};
	const isFollow = follows( tiers.desktop );
	const follow = followDefaults();
	const angles = emptyAngles();
	const raw = emptyAngles();
	let ownerCount = 0;
	TIERS.forEach( ( tier ) => {
		let timingChanged = tier === 'desktop';
		const angleChanged = {};
		if ( isFollow && followTiming( tiers[ tier ], follow ) ) {
			timingChanged = true;
		}
		Object.entries( tiers[ tier ] ).forEach( ( [ key, value ] ) => {
			const prop = f[ key ]?.css ?? null;
			const css = valueCss( def, key, value );
			if ( prop === null || css === null ) {
				return;
			}
			if ( has( timing, prop ) ) {
				timing[ prop ] = css;
				timingChanged = true;
			} else if ( isAngle( key ) ) {
				angles[ key ] = css;
				raw[ key ] = value;
				angleChanged[ key ] = true;
			} else if ( [ 'rest', 'active' ].includes( f[ key ].state ) ) {
				decls[ tier ][ prop ] = css;
			} else if ( prop.startsWith( MH_PREFIX ) ) {
				decls[ tier ][ MH_PREFIX + 'to-' + prop.slice( MH_PREFIX.length ) ] = css;
				owners[ prop ] = true;
			} else {
				decls[ tier ][ MH_PREFIX + 'to-' + key ] = css;
				owners[ prop ] = true;
			}
		} );
		if ( Object.keys( angleChanged ).length > 0 ) {
			hoverAngles( angles, raw, angleChanged, tier, decls, owners );
		}
		// A tier repeats the whole list when its timing or its owner set differs from the wider tier's.
		if ( timingChanged || Object.keys( owners ).length !== ownerCount ) {
			trans[ tier ] = [ ...Object.keys( owners ), ...HOVER_PAINT ].map(
				( prop ) =>
					`${ prop } ${ timing[ 'transition-duration' ] } ${ timing[ 'transition-timing-function' ] } ${ timing[ 'transition-delay' ] }`
			);
			if ( isFollow ) {
				trans[ tier ] = [ ...trans[ tier ], ...followEntries( follow ) ];
			}
		}
		ownerCount = Object.keys( owners ).length;
	} );
	Object.keys( owners ).forEach( ( prop ) => {
		if ( map[ prop ] ) {
			channels[ map[ prop ] ] = true;
		}
	} );
	angleChannels( angles, channels );
	if ( isFollow ) {
		followChannels( channels );
	}
}

/**
 * Which of two same-typed timing fields the return transition reads: `duration`/`easing` exactly, else the first key
 * ending in `Duration`/`Easing`.
 *
 * @param {string|null} current The key chosen so far.
 * @param {string}      key     Candidate key.
 * @param {boolean}     isType  Whether the candidate has the wanted type.
 * @param {string}      suffix  `Duration` or `Easing`.
 * @return {string|null} The key.
 */
function betterTimingKey( current, key, isType, suffix ) {
	if ( ! isType ) {
		return current;
	}
	if ( suffix.toLowerCase() === key ) {
		return key;
	}
	if ( current === null && key.endsWith( suffix ) ) {
		return key;
	}
	return current;
}

/**
 * A hover effect's own return transition: its owner properties on its stored duration and easing.
 *
 * @param {Object} layer A hover effect layer.
 * @param {Object} trans Per-tier transition entries (mutated).
 */
function effectTransition( layer, trans ) {
	const effect = String( layer.effect );
	const props = ownerProperties( effect );
	const def = effectValuesDef( effect );
	if ( props.length === 0 || def === '' ) {
		return;
	}
	let durKey = null;
	let easeKey = null;
	Object.entries( fields( def ) ).forEach( ( [ key, field ] ) => {
		durKey = betterTimingKey( durKey, key, field.type === 'duration', 'Duration' );
		easeKey = betterTimingKey( easeKey, key, field.type === 'easing', 'Easing' );
	} );
	let duration = tokenOr( 'token:duration.medium', '300ms' );
	let easing = tokenOr( 'token:easing.ease-out', 'ease-out' );
	const tiers = tierValues( layer );
	if ( easeKey !== null && tiers.desktop[ easeKey ] !== undefined && tiers.desktop[ easeKey ] !== null ) {
		easing = valueCss( def, easeKey, tiers.desktop[ easeKey ] ) ?? easing;
	}
	TIERS.forEach( ( tier ) => {
		let changed = tier === 'desktop';
		if ( durKey !== null && tiers[ tier ][ durKey ] !== undefined && tiers[ tier ][ durKey ] !== null ) {
			duration = valueCss( def, durKey, tiers[ tier ][ durKey ] ) ?? duration;
			changed = true;
		}
		if ( changed ) {
			props.forEach( ( prop ) =>
				trans[ tier ].push( `${ prop } ${ duration } ${ easing } 0ms` )
			);
		}
	} );
}

/**
 * Emit one target.
 *
 * @param {Object} element  The stored element.
 * @param {string} selector The target's scoped selector.
 * @param {Object} context  `lcp`, `suppressEntrance`, `noTransition` (booleans) and `states` (the block's declared
 *                          states).
 * @return {{css:string,attrs:Object<string,string>,entrance:boolean}} The target's CSS and data attributes.
 */
export function emitTarget( element, selector, context = {} ) {
	const decls = emptyTiers();
	const attrs = {};
	const channels = {};
	const trans = { desktop: [], tablet: [], mobile: [] };
	const state = element?.hover?.state;
	if ( state && typeof state === 'object' && ! Array.isArray( state ) ) {
		attrs[ 'data-sgs-mh' ] = String( state.source ?? 'self' );
		hoverState( state, decls, trans, channels );
	}
	listOf( element?.hover?.effects ).forEach( ( layer ) => {
		layerWrites( layer ).forEach( ( c ) => ( channels[ c ] = true ) );
		effectTransition( layer, trans );
	} );
	listOf( element?.effects ).forEach( ( layer ) => {
		layerWrites( layer ).forEach( ( c ) => ( channels[ c ] = true ) );
	} );
	let played = false;
	const base = element?.entrance?.base;
	if ( base && typeof base === 'object' && ! Array.isArray( base ) && ! context.suppressEntrance ) {
		played = emitEntrance( base, decls, attrs, context );
	}
	const meChannels = ( attrs[ 'data-sgs-me' ] ?? '' ).split( ' ' );
	defaultPerspective( decls, Boolean( channels.transform ) || meChannels.includes( 'transform' ) );
	if ( Object.keys( channels ).length > 0 ) {
		attrs[ 'data-sgs-mc' ] = orderedChannels( channels ).join( ' ' );
	}
	TIERS.forEach( ( tier ) => {
		if ( trans[ tier ].length > 0 && ! context.noTransition ) {
			decls[ tier ].transition = trans[ tier ].join( ', ' );
		}
	} );
	let css = rules( selector, decls );
	if ( played ) {
		css += triggerCss( base, selector, attrs );
	}
	const focus = element?.hover?.focus;
	if ( focus && typeof focus === 'object' && ! Array.isArray( focus ) ) {
		css += emitFocus( focus, selector );
	}
	return { css, attrs, entrance: played };
}

/**
 * Emit a whole block's motion: sanitise the document, then for each resolvable target (in stored order) drop refused
 * layers and, for a target that shares its element with an earlier-declared one (`losers`, found in the canvas DOM by
 * `shared-element.js`), its hover state and entrance; emit its CSS and data attributes.
 *
 * @param {Object} motion  The stored motion attribute.
 * @param {Object} options `blockName`, `elements` (`supports.sgs.elements`), `root` (the scoped root selector),
 *                         `states` (the block's declared states), `losers` (target => the target it yields to) and
 *                         `context` (`lcp`, `suppressEntrance`) for every target.
 * @return {{css:string,plans:Array,rootAttrs:Object,dropped:Array}} Empty for an absent or invalid attribute.
 */
export function emitScopedCss( motion, { blockName, elements, root, states = [], losers = {}, context = {} } ) {
	const out = { css: '', plans: [], rootAttrs: {}, dropped: [] };
	const doc = sanitiseDocument( motion );
	const targets = doc.elements;
	if ( ! targets || typeof targets !== 'object' || Array.isArray( targets ) ) {
		return out;
	}
	Object.entries( targets ).forEach( ( [ target, stored ] ) => {
		const resolved = resolveTarget( blockName, elements, root, target, stored || {} );
		if ( resolved === null ) {
			return;
		}
		const result = resolveLayerDrops( stored || {} );
		result.dropped.forEach( ( drop ) => out.dropped.push( { target, ...drop } ) );
		const loser = Object.prototype.hasOwnProperty.call( losers, target );
		let element = loser ? stripShared( result.element ) : result.element;
		if (
			element?.hover?.focus !== undefined &&
			! focusAllowed( blockName, target )
		) {
			out.dropped.push( {
				target,
				id: FOCUS_REFUSAL,
				layer: 'hover.focus',
			} );
			const hover = { ...element.hover };
			delete hover.focus;
			element = { ...element, hover };
		}
		const emitted = emitTarget( element, resolved.selector, { ...context, states, noTransition: loser } );
		out.css += emitted.css;
		out.plans.push( { target, ...resolved, attrs: emitted.attrs, entrance: emitted.entrance } );
	} );
	const usesRoot = Object.values( targets ).some( ( element ) =>
		[ element?.hover?.state, ...listOf( element?.hover?.effects ) ].some(
			( layer ) => layer && typeof layer === 'object' && layer.source === 'root'
		)
	);
	if ( usesRoot ) {
		out.rootAttrs[ 'data-sgs-mroot' ] = '';
	}
	return out;
}
