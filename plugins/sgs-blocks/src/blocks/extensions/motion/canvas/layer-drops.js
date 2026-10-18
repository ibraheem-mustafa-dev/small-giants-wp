/**
 * The canvas twin of `includes/motion/class-sgs-motion-layer-drops.php::resolve()` (Spec 38A §10, FR-38A-23): drop the
 * later of each refused pair, and every layer past a limit, in paint order (`hover.state`, `hover.effects`,
 * `entrance.base`, `entrance.text`, `effects`) until the element has no refusal; a value limit (`same-value`,
 * `refused-value`) clears only the refused value from the later layer, so a second perspective yields to the first.
 * The refusals come from the inspector's own reading of the schema table (`../layers/refusals.js`), the twin of
 * `Sgs_Motion_Layers::element_refusals()`.
 *
 * @package SGS\Blocks
 */

import { elementRefusals } from '../layers/refusals';
import { TABLE } from '../layers/refusal-match';

/** Paint order of the layer lists (`Sgs_Motion_Layers::LISTS`). */
const LISTS = Object.freeze( [
	'hover.state',
	'hover.effects',
	'entrance.base',
	'entrance.text',
	'effects',
] );

const VALUE_KINDS = Object.freeze( [ 'same-value', 'refused-value' ] );

const clone = ( value ) => JSON.parse( JSON.stringify( value ) );
const isPlain = ( v ) => v !== null && typeof v === 'object' && ! Array.isArray( v );

function splitPath( path ) {
	const bracket = path.indexOf( '[' );
	return bracket === -1
		? { list: path, index: null }
		: { list: path.slice( 0, bracket ), index: parseInt( path.slice( bracket + 1 ), 10 ) };
}

function rank( path ) {
	const { list, index } = splitPath( path );
	return Math.max( LISTS.indexOf( list ), 0 ) * 1000 + ( index ?? 0 );
}

function laterPath( paths ) {
	let best = paths[ 0 ];
	let bestRank = -1;
	paths.forEach( ( path ) => {
		const r = rank( path );
		if ( r >= bestRank ) {
			best = path;
			bestRank = r;
		}
	} );
	return best;
}

function valueLimit( id ) {
	const limit = ( TABLE?.limits || [] ).find(
		( row ) => row.id === id && VALUE_KINDS.includes( row.kind )
	);
	return limit ? String( limit.value ) : null;
}

function removePath( element, path ) {
	const { list, index } = splitPath( path );
	const keys = list.split( '.' );
	const out = clone( element );
	if ( index === null ) {
		if ( keys.length === 2 ) {
			if ( isPlain( out[ keys[ 0 ] ] ) ) {
				delete out[ keys[ 0 ] ][ keys[ 1 ] ];
			}
		} else {
			delete out[ keys[ 0 ] ];
		}
	} else {
		const holder = keys.length === 2 ? out[ keys[ 0 ] ] : out;
		const key = keys.length === 2 ? keys[ 1 ] : keys[ 0 ];
		if ( holder && Array.isArray( holder[ key ] ) ) {
			holder[ key ] = holder[ key ].filter( ( item, i ) => i !== index );
			if ( holder[ key ].length === 0 ) {
				delete holder[ key ];
			}
		}
	}
	[ 'hover', 'entrance' ].forEach( ( panel ) => {
		if ( isPlain( out[ panel ] ) && Object.keys( out[ panel ] ).length === 0 ) {
			delete out[ panel ];
		}
	} );
	return out;
}

function unsetIn( node, parts ) {
	const [ key, ...rest ] = parts;
	if ( rest.length === 0 ) {
		delete node[ key ];
	} else if ( isPlain( node[ key ] ) ) {
		unsetIn( node[ key ], rest );
	}
}

function removeValue( element, path, valuePath ) {
	const keys = path.split( '.' );
	if ( keys.length !== 2 || ! isPlain( element?.[ keys[ 0 ] ]?.[ keys[ 1 ] ] ) ) {
		return removePath( element, path );
	}
	const out = clone( element );
	const layer = out[ keys[ 0 ] ][ keys[ 1 ] ];
	const parts = valuePath.split( '.' );
	if ( isPlain( layer.values ) ) {
		unsetIn( layer.values, parts );
	}
	[ 'tablet', 'mobile' ].forEach( ( device ) => {
		if ( isPlain( layer.devices?.[ device ] ) ) {
			unsetIn( layer.devices[ device ], parts );
		}
	} );
	return out;
}

/**
 * Drop refused layers and values from one sanitised element, as the renderer does.
 *
 * @param {Object} element A sanitised element.
 * @param {Object} [context] Facts about where the element sits (`parent-owned`).
 * @return {{element: Object, dropped: Array<{path: string, id: string, text: string}>}} The resolved element.
 */
export function resolveLayerDrops( element, context = {} ) {
	let current = element;
	const dropped = [];
	for ( let guard = 0; guard < 64; guard++ ) {
		const refusals = elementRefusals( current, undefined, context );
		if ( refusals.length === 0 ) {
			break;
		}
		const first = refusals[ 0 ];
		const later = laterPath( first.layers );
		const value = valueLimit( first.id );
		dropped.push( {
			path: value === null ? later : `${ later }.values.${ value }`,
			id: first.id,
			text: first.text,
		} );
		current = value === null ? removePath( current, later ) : removeValue( current, later, value );
	}
	return { element: current, dropped };
}
