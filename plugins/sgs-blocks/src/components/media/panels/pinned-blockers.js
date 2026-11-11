/**
 * What stops a Pinned background holding (Spec 49 §10.3): Parallax on the background itself, or a transform-based
 * entrance or hover on the block's own element. A transform on the section or an ancestor makes a fixed background
 * scroll with it.
 *
 * Pure: reads the block's stored motion value (`sgsMotion`), so no preset list is kept here: an entrance or hover
 * counts when the values it stores move the element (a `translate`, `scale`, `rotate` or `skew` key, or the
 * follow-pointer hover).
 *
 * @package SGS\Blocks
 */
import { backgroundTarget, effectLayers } from './motion-line.js';

const TRANSFORM_KEY = /^(translate[XYZ]?|scale[XY]?|rotate[XYZ]?|skew[XY]?|followPointer)$/;

/**
 * Whether a stored motion value, at any depth, sets a transform property.
 *
 * @param {*} node A stored value.
 * @return {boolean} True when a transform key is present.
 */
export function movesElement( node ) {
	if ( Array.isArray( node ) ) {
		return node.some( movesElement );
	}
	if ( ! node || 'object' !== typeof node ) {
		return false;
	}
	return Object.keys( node ).some( ( key ) => TRANSFORM_KEY.test( key ) || movesElement( node[ key ] ) );
}

/**
 * The block's own element keys among its declared motion parts.
 *
 * @param {Object|undefined} elements `supports.sgs.elements`.
 * @return {string[]} Part keys flagged `isWrapper`, else `wrapper`.
 */
export function rootParts( elements ) {
	const keys = Object.keys( elements || {} ).filter( ( key ) => elements[ key ]?.isWrapper );
	return keys.length ? keys : [ 'wrapper' ];
}

/**
 * @param {Object|undefined} motion   The block's `sgsMotion` value.
 * @param {Object|undefined} elements `supports.sgs.elements`.
 * @return {{parallax:boolean,transformMotion:boolean}} What blocks Pinned.
 */
export function pinnedBlockers( motion, elements ) {
	const parallax = [ 'image', 'video', 'svg' ].some( ( kind ) =>
		effectLayers( motion, backgroundTarget( kind ) ).some( ( layer ) => 'parallax' === String( layer.effect ).replace( /^fx-/, '' ) )
	);
	const transformMotion = rootParts( elements ).some( ( key ) => {
		const part = motion?.elements?.[ key ];
		return movesElement( part?.entrance?.base?.values ) || movesElement( part?.hover?.state?.values ) || movesElement( part?.hover?.effects );
	} );
	return { parallax, transformMotion };
}
