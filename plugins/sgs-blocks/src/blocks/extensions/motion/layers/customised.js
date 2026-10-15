/**
 * Customised values (Spec 38A §5; D2): reading and writing a value at a dot path, the value the layer's preset stamped
 * there, the layer's `customised` paths that drive the Customised tag and Reset, and the paths a re-stamp or a
 * replacement puts at risk. `stamp.js` re-exports every export here except `withValueAt`.
 *
 * @package
 */

import { sameValue } from '../../../../components/motion/atom-utils';
import { DEFS } from './layer-lists';
import { presetBySlug } from './preset-lookup';
import { CLOSE_PATH, copy, evaluate, isObject } from './stamp-common';

/**
 * The value at a dot path (`values.maxPullX`, `devices.mobile.from.translateY`).
 *
 * @param {Object} source The layer or preset row.
 * @param {string} path   Dot path.
 * @return {unknown} The value, or undefined.
 */
export function valueAtPath( source, path ) {
	return path
		.split( '.' )
		.reduce(
			( node, key ) =>
				node !== null && typeof node === 'object'
					? node[ key ]
					: undefined,
			source
		);
}

// A copy of `source` with the value at `path` set (undefined removes it).
export function withValueAt( source, path, value ) {
	const [ key, ...rest ] = path.split( '.' );
	const base = Array.isArray( source )
		? [ ...source ]
		: { ...( isObject( source ) ? source : {} ) };
	if ( rest.length ) {
		base[ key ] = withValueAt( base[ key ], rest.join( '.' ), value );
	} else if ( value === undefined ) {
		delete base[ key ];
	} else {
		base[ key ] = value;
	}
	return base;
}

/**
 * The value the layer's preset stamped at a path.
 *
 * @param {Object} layer The layer.
 * @param {string} path  Dot path.
 * @return {unknown} The stamped value, or undefined when the layer has no preset or the preset sets no value there.
 */
export function stampedValue( layer, path ) {
	const row = layer?.preset ? presetBySlug( layer.preset ) : null;
	return row ? valueAtPath( row, path ) : undefined;
}

/**
 * Whether a field is customised: listed in the layer's `customised` paths.
 *
 * @param {Object} layer The layer.
 * @param {string} path  Dot path.
 * @return {boolean} True when customised.
 */
export function isCustomised( layer, path ) {
	return (
		Array.isArray( layer?.customised ) && layer.customised.includes( path )
	);
}

// The layer with `customised` set to the given paths, each once (removed when none is left); a path the schema's
// `customisedPaths` item refuses is not written.
function withCustomised( layer, paths ) {
	const next = { ...layer };
	const kept = [ ...new Set( paths ) ].filter(
		( path ) => evaluate( DEFS.customisedPaths.items, path ) === null
	);
	if ( kept.length ) {
		next.customised = kept;
	} else {
		delete next.customised;
	}
	return next;
}

/**
 * The layer after a field edit: the value set, and the path added to `customised` while it differs from the stamped
 * value (removed once it matches again).
 *
 * @param {Object}  layer The layer.
 * @param {string}  path  Dot path under `values`, `close` or `devices`.
 * @param {unknown} value The new value (undefined clears it).
 * @return {Object} The edited layer.
 */
export function editField( layer, path, value ) {
	const next = withValueAt( layer, path, value );
	const others = ( layer.customised || [] ).filter(
		( item ) => item !== path
	);
	const differs =
		CLOSE_PATH.test( path ) ||
		! sameValue( value, stampedValue( layer, path ) );
	return withCustomised( next, differs ? [ ...others, path ] : others );
}

/**
 * The layer with one field restored to its stamped value and its Customised tag cleared.
 *
 * @param {Object} layer The layer.
 * @param {string} path  Dot path.
 * @return {Object} The reset layer.
 */
export function resetField( layer, path ) {
	const next = withValueAt(
		layer,
		path,
		copy( stampedValue( layer, path ) )
	);
	return withCustomised(
		next,
		( layer.customised || [] ).filter( ( item ) => item !== path )
	);
}

// The dot paths of the non-empty leaf values under a node (`values.followPointer`, `devices.tablet.from.opacity`).
export function leafPaths( node, prefix ) {
	if ( Array.isArray( node ) ) {
		return node.length ? [ prefix ] : [];
	}
	if ( isObject( node ) ) {
		return Object.entries( node ).flatMap( ( [ key, item ] ) =>
			leafPaths( item, `${ prefix }.${ key }` )
		);
	}
	return node === undefined || node === null || node === '' ? [] : [ prefix ];
}

/**
 * The value paths a re-stamp or a replacement would put at risk. A layer with a preset records what the client changed
 * in `customised`; a layer with none (a migrated or cloned one) records nothing, so every value it holds counts.
 *
 * @param {Object} layer The layer.
 * @return {string[]} The paths.
 */
export function heldPaths( layer ) {
	return layer.preset
		? layer.customised || []
		: [
				...new Set( [
					...( layer.customised || [] ),
					...leafPaths( layer.values, 'values' ),
					...leafPaths( layer.devices, 'devices' ),
				] ),
		  ];
}
