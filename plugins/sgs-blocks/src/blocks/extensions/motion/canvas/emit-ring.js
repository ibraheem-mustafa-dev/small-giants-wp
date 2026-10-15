/**
 * The hover ring's resting-shadow guard for the editor (Spec 38A §5.1; FR-38A-42's ring clause; build plan M3.9): the
 * twin of `includes/motion/class-sgs-motion-ring-guard.php`, used by the canvas emitter and the Hover panel.
 *
 * The ring is a hover `box-shadow`, so it is offered only on an element whose block sets no shadow of its own. A block
 * names the attributes that paint a `box-shadow` on an element in `block.json`
 * (`supports.sgs.elements.<element>.attrMap["css:box-shadow"]`, and the same key under each of the element's `states`;
 * `native:shadow` is the native `style.shadow`). An element is shadowed when any of them holds a value (an empty string
 * and `none` are not a shadow; `attributes` are the editor's, so a `block.json` default is already in them). The `root`
 * target covers the elements flagged `isWrapper`. A shadow the block's own stylesheet paints with no attribute behind it
 * is declared on the element as `"restingShadow": true` (written and gated by
 * `scripts/migrate-motion-resting-shadows.py`) and counts in every variant. A delegating block in a delegating mode is
 * also refused where the child block it prints is (`delegate`: the child's elements, attribute defaults and part map).
 *
 * @package SGS\Blocks
 */

import { valueCss } from './motion-schema';

/** The refusal id reported for a ring on a shadowed element. */
export const RING_REFUSAL = 'ring-resting-shadow';

/** The hover state values the guard removes. */
export const RING_KEYS = Object.freeze( [ 'ringSpread', 'ringColour' ] );

const SHADOW_KEY = 'css:box-shadow';
const STYLE_KEY = 'restingShadow';
const NATIVE = 'native:shadow';
const ROOT = 'root';
const HOVER = 'HoverStateValues';

const plain = ( v ) =>
	v && typeof v === 'object' && ! Array.isArray( v ) ? v : {};

// The element declarations that stand for a target: the part itself, or every `isWrapper` part for `root`.
function elementsFor( elements, target ) {
	return Object.entries( plain( elements ) )
		.filter( ( [ key, element ] ) =>
			target === ROOT ? plain( element ).isWrapper === true : key === target
		)
		.map( ( [ , element ] ) => plain( element ) );
}

/**
 * The attribute names a block declares as painting a `box-shadow` on a target, in every state.
 *
 * @param {Object} elements The block's `supports.sgs.elements`.
 * @param {string} target   Target (a declared part, or `root`).
 * @return {string[]} The attribute names.
 */
export function shadowAttributes( elements, target ) {
	const names = [];
	elementsFor( elements, target ).forEach( ( el ) => {
		[
			plain( el.attrMap ),
			...Object.values( plain( el.states ) ).map( ( s ) =>
				plain( plain( s ).attrMap )
			),
		].forEach( ( map ) => {
			if ( typeof map[ SHADOW_KEY ] === 'string' ) {
				names.push( map[ SHADOW_KEY ] );
			}
		} );
	} );
	return [ ...new Set( names ) ];
}

/**
 * The part of a block's attributes that decides the ring refusal: every attribute any element declares as painting a
 * `box-shadow` (and `style.shadow` for the native one). The canvas hook keys its options on this, so an edit to any
 * other attribute does not re-emit the block's motion.
 *
 * @param {Object} elements   The block's `supports.sgs.elements`.
 * @param {Object} attributes The block's attributes.
 * @return {Object} The shadow-deciding attributes.
 */
export function shadowValues( elements, attributes ) {
	const attrs = plain( attributes );
	const out = {};
	Object.keys( plain( elements ) ).forEach( ( key ) =>
		shadowAttributes( { [ key ]: elements[ key ] }, key ).forEach( ( name ) => {
			if ( name === NATIVE ) {
				out.style = { shadow: plain( attrs.style ).shadow };
			} else {
				out[ name ] = attrs[ name ];
			}
		} )
	);
	return out;
}

/**
 * Whether a stored shadow value paints one: not empty, not `none`.
 *
 * @param {*} value Attribute value.
 * @return {boolean} True when it is a shadow.
 */
function isSet( value ) {
	if ( typeof value === 'string' ) {
		const text = value.trim().toLowerCase();
		return text !== '' && text !== 'none';
	}
	if ( Array.isArray( value ) ) {
		return value.some( isSet );
	}
	if ( value && typeof value === 'object' ) {
		return Object.values( value ).some( isSet );
	}
	return value !== null && value !== undefined && value !== false;
}

/**
 * Whether the block's stylesheet paints a resting shadow on a target (the element's `restingShadow` marker).
 *
 * @param {Object} elements The block's `supports.sgs.elements`.
 * @param {string} target   Target.
 * @return {boolean} True when the element is marked.
 */
export function stylesheetShadow( elements, target ) {
	return elementsFor( elements, target ).some( ( el ) => el[ STYLE_KEY ] === true );
}

/**
 * Whether a target's element has a shadow set, so the hover ring is refused there.
 *
 * @param {Object}  elements   The block's `supports.sgs.elements`.
 * @param {string}  target     Target.
 * @param {Object}  attributes The block's attributes (defaults included).
 * @param {?Object} delegate   The child block a delegating mode prints: `{ elements, attributes, parts }` (`ringDelegate`).
 * @return {boolean} True when the ring is refused.
 */
export function ringRefused( elements, target, attributes, delegate = null ) {
	const attrs = plain( attributes );
	if (
		stylesheetShadow( elements, target ) ||
		shadowAttributes( elements, target ).some( ( name ) =>
			isSet( name === NATIVE ? plain( attrs.style ).shadow : attrs[ name ] )
		)
	) {
		return true;
	}
	const to = plain( delegate?.parts )[ target ];
	return typeof to === 'string' && ringRefused( delegate.elements, to, delegate.attributes );
}

/**
 * The child block a delegating block prints in its current mode, in the shape `ringRefused` reads, or null.
 *
 * @param {?Object}  delegation `activeDelegation()` of the block: `{ block, parts }`.
 * @param {Function} childOf    Takes the child block name; returns `{ elements, attributes }` (its `supports.sgs.elements`
 *                              and its attribute defaults).
 * @return {?Object} `{ elements, attributes, parts }`.
 */
export function ringDelegate( delegation, childOf ) {
	if ( ! delegation ) {
		return null;
	}
	const child = childOf( delegation.block ) || {};
	return {
		elements: child.elements || {},
		attributes: child.attributes || {},
		parts: delegation.parts,
	};
}

const tierValues = ( state ) => [
	plain( state?.values ),
	plain( state?.devices?.tablet ),
	plain( state?.devices?.mobile ),
];

/**
 * Whether a hover state layer stores a ring value on any device.
 *
 * @param {Object} state Hover state layer.
 * @return {boolean} True when it does.
 */
export function hasRing( state ) {
	return tierValues( state ).some( ( values ) =>
		RING_KEYS.some( ( key ) =>
			Object.prototype.hasOwnProperty.call( values, key )
		)
	);
}

/**
 * Whether a hover state layer's ring would show: a colour, and a spread above zero on some device.
 *
 * @param {Object} state Hover state layer.
 * @return {boolean} True when it paints.
 */
export function ringPaints( state ) {
	if ( valueCss( HOVER, 'ringColour', plain( state?.values ).ringColour ) === null ) {
		return false;
	}
	return tierValues( state ).some( ( values ) => {
		const css = valueCss( HOVER, 'ringSpread', values.ringSpread );
		return css !== null && ! /^0(?:\.0+)?[a-z%]*$/.test( css );
	} );
}

/**
 * A hover state layer without its ring values on any device.
 *
 * @param {Object} state Hover state layer.
 * @return {Object} The layer.
 */
export function stripRing( state ) {
	const drop = ( values ) =>
		Object.fromEntries(
			Object.entries( plain( values ) ).filter(
				( [ key ] ) => ! RING_KEYS.includes( key )
			)
		);
	const out = { ...state };
	if ( state.values !== undefined ) {
		out.values = drop( state.values );
	}
	if ( state.devices !== undefined ) {
		out.devices = { ...state.devices };
		[ 'tablet', 'mobile' ].forEach( ( tier ) => {
			if ( state.devices[ tier ] !== undefined ) {
				out.devices[ tier ] = drop( state.devices[ tier ] );
			}
		} );
	}
	return out;
}
