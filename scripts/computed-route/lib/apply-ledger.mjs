// The client's accepted differences (qa/divergences.json) as the applier reads them. A row naming a cr-ref matches on the
// ref, its state and its property; a free-text row matches on its surface (scope) and property, narrowed by its `block`
// (or a block-slug `node`), its `part` and its `surfaces` list: a ruling about one thing that names a page and a property
// must not excuse everything else there. A match is never written.
// The index refuses a ruling that could excuse unrelated work (`refusals`): a property an applier family can write
// (lib/apply-writable.mjs) with no cr-ref node, no block and no part, or a `surfaces` entry naming no surface of the client.
import fs from 'node:fs';
import path from 'node:path';
import { writableProps } from './apply-writable.mjs';

const words = ( s ) => String( s ?? '' ).toLowerCase().split( /[^a-z0-9*-]+/ ).filter( Boolean );
const BLOCK_SLUG = /^sgs\/[\w-]+$/;

const blockOf = ( r ) => r.block ?? ( BLOCK_SLUG.test( String( r.node ?? '' ).trim() ) ? String( r.node ).trim() : null );

export function ledgerIndex( rows = [], { surfaces = null, writable = null } = {} ) {
	const index = rows.map( ( r ) => ( {
		id: r.id,
		refs: String( r.node ?? '' ).match( /cr-ref-[\w-]+/g ) || [],
		scope: words( r.scope ),
		state: r.state ?? '*',
		props: words( r.property ),
		block: blockOf( r ),
		part: r.part ? String( r.part ).toLowerCase() : null,
		surfaces: r.surfaces ?? null,
		apply: r.apply ?? null,
	} ) );
	const refused = refusals( index, { surfaces, writable: writable ?? writableProps() } );
	if ( refused.length ) {
		throw new Error( `${ path.join( 'qa', 'divergences.json' ) } holds ${ refused.length } ruling${ 1 === refused.length ? '' : 's' } the applier refuses, because each could excuse work it was never meant to cover:\n${ refused.map( ( x ) => `  ${ x.id }: ${ x.why }` ).join( '\n' ) }` );
	}
	return index;
}

const propHit = ( row, prop ) => row.props.includes( '*' ) || row.props.includes( prop ) || row.props.some( ( p ) => prop.startsWith( `${ p }-` ) );

// [ { id, why } ] for every ruling of the index that is too wide to keep. `surfaces` (names of the client's surfaces; null skips the check)
// and `writable` (the properties a family can write) come from the caller.
export function refusals( index, { surfaces = null, writable = [] } ) {
	const out = [];
	for ( const row of index ) {
		if ( null !== row.surfaces ) {
			const named = Array.isArray( row.surfaces ) ? row.surfaces : [];
			const unknown = surfaces ? named.filter( ( s ) => ! surfaces.includes( s ) ) : [];
			if ( ! named.length || unknown.length ) {
				out.push( { id: row.id, why: named.length ? `\`surfaces\` names ${ unknown.map( ( s ) => `"${ s }"` ).join( ', ' ) }, which is no surface in the page map; use a surface name from the client's surfaces.json` : '`surfaces` is empty; list the surfaces it covers or remove the field' } );
			}
		}
		const keys = Object.keys( row.apply ?? {} ).filter( ( k ) => ! [ 'when', 'remove', 'set' ].includes( k ) );
		if ( keys.length || ( row.apply && ! row.block && ! row.refs.length ) ) {
			out.push( { id: row.id, why: keys.length ? `\`apply\` holds ${ keys.join( ', ' ) }; it takes only when, remove and set` : '`apply` names no block or cr-ref node, so it would change every block' } );
		}
		const reaches = writable.filter( ( p ) => propHit( row, p ) );
		if ( reaches.length && ! row.refs.length && ! row.block && ! row.part ) {
			out.push( { id: row.id, why: `property "${ row.props.join( ', ' ) }" is one the applier writes (${ reaches.slice( 0, 3 ).join( ', ' ) }${ reaches.length > 3 ? ', ...' : '' }) and the ruling names no element: add \`node\` (a cr-ref), \`block\` (a block slug such as sgs/timeline) or \`part\`` } );
		}
	}
	return out;
}

// The surface names of a client's build folder: its surfaces.json keys and its page map's slugs.
export function surfaceNames( build ) {
	const read = ( f ) => ( fs.existsSync( path.join( build, f ) ) ? JSON.parse( fs.readFileSync( path.join( build, f ), 'utf8' ) ) : null );
	const surfaces = read( 'surfaces.json' );
	const pageMap = read( 'page-map.json' );
	return [ ...new Set( [ ...Object.keys( surfaces ?? {} ), ...( Array.isArray( pageMap ) ? pageMap : [] ).map( ( p ) => p.slug ).filter( Boolean ) ] ) ];
}

// Whether a ruling covers a place: a named cr-ref, or its surface (scope or `surfaces`), block and part.
export function placeHit( row, { ref, surface, block = null, part = null } ) {
	const named = row.surfaces ? row.surfaces.includes( surface ) : row.scope.includes( surface ) || row.scope.includes( '*' ) || row.scope.includes( 'every' );
	const here = ! row.part || String( part ?? '' ).toLowerCase().includes( row.part );
	return row.refs.length ? row.refs.includes( ref ) : named && ( ! row.block || row.block === block ) && here;
}

export function ledgerMatch( index, { ref, surface, block = null, state = '*', prop, part = null } ) {
	for ( const row of index ) {
		const when = '*' === row.state || '*' === state || row.state === state;
		if ( placeHit( row, { ref, surface, block, part } ) && when && propHit( row, prop ) ) {
			return row.id;
		}
	}
	return null;
}
