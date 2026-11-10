/**
 * Small pieces every Spec 49 media field shares: reading one slot attribute and the length units of §9.4.
 *
 * @package
 */
import { mediaAttrName } from '../MediaElementControls.js';

/**
 * Reader and writer for one slot's attributes.
 *
 * @param {Object}   attributes    Block attributes.
 * @param {Function} setAttributes Block `setAttributes`.
 * @param {string}   prefix        The slot prefix ('' for an unprefixed slot).
 * @return {{name: Function, read: Function, write: Function}} `write( patch )` takes `{ Base: value }` and calls
 *     `setAttributes` once, so a multi-base write is one undo step.
 */
export function slotAccess( attributes, setAttributes, prefix = '' ) {
	const name = ( base ) => mediaAttrName( prefix, base );
	return {
		name,
		read: ( base ) => attributes?.[ name( base ) ],
		write: ( patch ) => {
			const out = {};
			Object.keys( patch ).forEach( ( base ) => {
				out[ name( base ) ] = patch[ base ];
			} );
			setAttributes( out );
		},
	};
}

/**
 * @param {string[]} values Unit symbols.
 * @return {Array<{value: string, label: string, default: number}>} The shape `SgsLengthControl` takes.
 */
export function lengthUnits( values ) {
	return values.map( ( value ) => ( { value, label: value, default: 0 } ) );
}

/** Units per §9.4's catalogue of ranges. */
export const WIDTH_UNITS = lengthUnits( [ 'px', '%', 'rem', 'em', 'vw', 'ch' ] );
export const HEIGHT_UNITS = lengthUnits( [ 'px', '%', 'rem', 'em', 'vh', 'svh', 'dvh', 'vw' ] );

/**
 * The kind a slot currently holds: the first device that carries a file with a kind, else the slot's first allowed
 * kind, else `image`.
 *
 * @param {Object} slot   `{ kinds, context }`.
 * @param {Object} access `slotAccess` result.
 * @return {string} `image`, `video`, `embed` or `svg`.
 */
export function slotKind( slot, access ) {
	const source = access.read( 'Source' );
	const own = Object.values( source && 'object' === typeof source ? source : {} ).find( ( s ) => s?.kind );
	return own?.kind || slot?.kinds?.[ 0 ] || 'image';
}
