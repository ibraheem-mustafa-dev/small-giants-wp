/**
 * The editor-canvas emitter (Spec 38A §6.5, §9, §10; FR-38A-28): the JS twin of the renderer's per-target path in
 * `includes/motion/` (`Sgs_Motion_Document::sanitise`, `Sgs_Motion_Targets::resolve`, `Sgs_Motion_Layer_Drops::resolve`,
 * `Sgs_Motion_Shared_Element`, `Sgs_Motion_Emitter::emit` with the open and state trigger rules), so the canvas writes
 * the same scoped custom properties, `transition` lists, per-device media queries and data attributes as the page,
 * and the form Focus state's field rules (`emit-focus.js`, refused off the `sgs/form` root as `focus-not-form`), and
 * the hover ring (a `box-shadow` channel; its values are dropped on an element whose block sets a shadow, as
 * `ring-resting-shadow`, `emit-ring.js`).
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
	effectRuntimeTiming,
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
import { itemMatches, resolveTarget } from './resolve-target';
import { sanitiseDocument } from './document-sanitise';
import { resolveLayerDrops } from './layer-drops';
import { stripShared } from './shared-element';
import { emitFocus, focusAllowed, FOCUS_REFUSAL } from './emit-focus';
import { hasRing, RING_REFUSAL, ringPaints, ringRefused, stripRing } from './emit-ring';
import { delegatedMove, inheritedItem, movedEntranceTarget } from './stagger-apply';

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
		'transition-timing-function': tokenOr( 'token:easing.emphasised', 'ease-out' ),
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
	let easing = tokenOr( 'token:easing.emphasised', 'ease-out' );
	const tiers = tierValues( layer );
	if ( easeKey !== null && tiers.desktop[ easeKey ] !== undefined && tiers.desktop[ easeKey ] !== null ) {
		easing = valueCss( def, easeKey, tiers.desktop[ easeKey ] ) ?? easing;
	}
	const runtime = effectRuntimeTiming( effect );
	if ( runtime ) {
		props.forEach( ( prop ) =>
			trans.desktop.push( `${ prop } var(${ runtime.duration }, 0ms) var(${ runtime.easing }, ${ easing }) 0ms` )
		);
		return;
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
 * Whether any hover layer in the stored targets uses this source.
 *
 * @param {Object} targets The stored `elements` map.
 * @param {string} source  `root`, `group` or `item`.
 * @return {boolean} True when a hover state or effect names the source.
 */
function usesSource( targets, source ) {
	return Object.values( targets ).some( ( element ) =>
		[ element?.hover?.state, ...listOf( element?.hover?.effects ) ].some(
			( layer ) => layer && typeof layer === 'object' && layer.source === source
		)
	);
}

/**
 * Where the stagger's `apply` moves the container's entrance, and the item plan that plays it: `moved` is the
 * container target whose entrance the container leaves out, `plan` and `css` the declared item part's inherited
 * entrance (null and '' when no item takes it).
 *
 * @param {Object} motion  The stored motion attribute.
 * @param {Object} targets The sanitised document's `elements`.
 * @param {Object} options `emitScopedCss()` options (`hasInnerBlocks`: the block holds blocks; `noItems`: no item shows).
 * @return {{moved:?string,plan:?Object,css:string}} The hand-over.
 */
function itemHandOver( motion, targets, { blockName, elements, root, states, context, motionItems, delegation, hasInnerBlocks, noItems } ) {
	const none = { moved: null, plan: null, css: '' };
	if ( delegation ) {
		// No child shows (an empty result), so nothing takes the container's entrance, as on the page.
		return noItems ? none : { ...none, moved: delegatedMove( motion, targets, elements, delegation ) };
	}
	if ( hasInnerBlocks ) {
		return { ...none, moved: movedEntranceTarget( motion, targets, elements ) };
	}
	const item = noItems ? null : inheritedItem( motion, targets, elements, motionItems );
	const resolved = item ? resolveTarget( blockName, elements, root, item.part, {} ) : null;
	if ( resolved === null ) {
		return none;
	}
	const emitted = emitTarget( { entrance: { base: item.base } }, resolved.selector, { ...context, suppressEntrance: false, states } );
	if ( ! emitted.entrance || Object.keys( emitted.attrs ).length === 0 ) {
		return none;
	}
	return {
		moved: item.from,
		plan: { target: item.part, ...resolved, attrs: emitted.attrs, entrance: true, inheritedFrom: item.from },
		css: emitted.css,
	};
}

/**
 * Emit a whole block's motion: sanitise the document, then for each resolvable target (in stored order) drop refused
 * layers and, for a target that shares its element with an earlier-declared one (`losers`, found in the canvas DOM by
 * `shared-element.js`), its hover state and entrance; emit its CSS and data attributes. With the stagger's `apply` on,
 * the container's own entrance plays on its children only, and only when they take it (`stagger-apply.js`): a block
 * that prints its items itself gets one more plan, its declared item part (`target`) playing the container's entrance
 * (`inheritedFrom`, the container target Replay plays it from), after the stored targets' plans.
 *
 * @param {Object} motion  The stored motion attribute.
 * @param {Object} options `blockName`, `elements` (`supports.sgs.elements`), `root` (the scoped root selector),
 *                         `states` (the block's declared states), `losers` (target => the target it yields to) and
 *                         `context` (`lcp`, `suppressEntrance`) for every target, and `animationItems` (the block's
 *                         `supports.sgs.animationItems`, which with the `item` part names its repeated items) and
 *                         `attributes` (the block's attributes, so a shadowed element drops the hover ring; without them
 *                         no ring is refused),
 *                         `motionItems`, `delegation`, `hasInnerBlocks` and `noItems` (the hand-over, `itemHandOver`).
 * @return {{css:string,plans:Array,rootAttrs:Object,dropped:Array,itemMatches?:Array}} Empty for an absent or invalid
 *         attribute; `itemMatches` (the elements to mark `data-sgs-mitem`) only when a hover layer uses source item.
 */
export function emitScopedCss( motion, { blockName, elements, root, states = [], losers = {}, context = {}, animationItems = '', attributes, motionItems, delegation = null, hasInnerBlocks = false, noItems = false } ) {
	const out = { css: '', plans: [], rootAttrs: {}, dropped: [] };
	const doc = sanitiseDocument( motion );
	const targets = doc.elements;
	if ( ! targets || typeof targets !== 'object' || Array.isArray( targets ) ) {
		return out;
	}
	const handOver = itemHandOver( motion, targets, { blockName, elements, root, states, context, motionItems, delegation, hasInnerBlocks, noItems } );
	const moved = handOver.moved;
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
		const state = element?.hover?.state;
		if ( state && typeof state === 'object' && ! Array.isArray( state ) && hasRing( state ) ) {
			// The ring and the accent line are a `box-shadow`: a shadowed element drops both (FR-38A-42); an invisible
			// pair is dropped on its own.
			const refused = Boolean( attributes ) && ringRefused( elements, target, attributes );
			if ( refused || ! ringPaints( state ) ) {
				element = { ...element, hover: { ...element.hover, state: stripRing( state, refused ) } };
			}
			if ( refused ) {
				out.dropped.push( { target, id: RING_REFUSAL, layer: 'hover.state' } );
			}
		}
		const report = ( drop ) => out.dropped.push( { target, layer: 'entrance.base', ...drop } );
		const suppressEntrance = Boolean( context.suppressEntrance ) || target === moved;
		const emitted = emitTarget( element, resolved.selector, { ...context, suppressEntrance, states, noTransition: loser, report } );
		out.css += emitted.css;
		out.plans.push( { target, ...resolved, attrs: emitted.attrs, entrance: emitted.entrance } );
	} );
	if ( handOver.plan ) {
		out.css += handOver.css;
		out.plans.push( handOver.plan );
	}
	const usesRoot = usesSource( targets, 'root' );
	if ( usesRoot ) {
		out.rootAttrs[ 'data-sgs-mroot' ] = '';
	}
	if ( usesSource( targets, 'item' ) ) {
		out.itemMatches = itemMatches( blockName, elements, animationItems );
	}
	return out;
}
