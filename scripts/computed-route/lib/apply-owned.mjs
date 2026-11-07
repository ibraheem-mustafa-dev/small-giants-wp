// Who owns a draft record. A block takes the records on the draft elements it owns: its own element and the ids its skeleton node
// owns (lib/apply-skeleton.mjs::ownedIds). An id another pair holds (a repeated card that has its own paired block, a button inside
// a button row) belongs to that pair, never to the wrapper around it. A record on an element no pair holds that lies inside the
// block's reach but outside its ownership (a descendant, or the frame that wraps the next node) is reported, never written to the
// block's root.
import { recogniseBehaviour } from './motion-behaviours.mjs';
import { recordsFor } from './apply-records.mjs';

export const idOfTpl = ( tpl ) => Number( /\/(\d+)#\d+$/.exec( String( tpl ?? '' ) )?.[ 1 ] ?? NaN );

// `owns` less the ids that another pair of the surface holds as its own draft element. The pair's own id always stays. A pair that
// shares its element with a wrapper block as a part (`part`) holds no element of its own.
export function ownsWithoutPaired( owns, self, pairs ) {
	const mine = idOfTpl( self.tpl );
	const other = new Set( ( pairs || [] ).filter( ( p ) => p.ref !== self.ref && ! p.part ).map( ( p ) => idOfTpl( p.tpl ) ).filter( Number.isFinite ) );
	return ( owns || [] ).filter( ( id ) => id === mine || ! other.has( id ) );
}

const ids = ( r ) => [].concat( r.element?.template_tpl_id ?? [] ).map( Number );

// Rows for the script behaviours on draft elements the target reaches but does not own and no other pair holds:
// [ { status: 'no-setting', prop: record id, why } ].
export function descendantRows( { target, block, recordsIndex, surface, allRecords } ) {
	const own = new Set( [ ...( target.owns || [] ), idOfTpl( target.tpl ) ] );
	const held = new Set( ( surface?.pairs || [] ).filter( ( p ) => p.ref !== target.ref ).flatMap( ( p ) => [ idOfTpl( p.tpl ), ...( p.owns || [] ) ] ) );
	const rows = new Map();
	for ( const id of ( target.reach || [] ).filter( ( x ) => ! own.has( x ) && ! held.has( x ) ) ) {
		for ( const r of recordsFor( recordsIndex, `Root/${ id }#0` ) ) {
			const b = rows.has( r.id ) || ids( r ).some( ( x ) => own.has( x ) ) ? null : recogniseBehaviour( r, { records: allRecords } );
			if ( b && ! [ 'native', 'covered' ].includes( b.kind ) ) {
				rows.set( r.id, { status: 'no-setting', prop: r.id, why: `${ r.id } targets a descendant (draft element ${ id }), no part of ${ block } holds it` } );
			}
		}
	}
	return [ ...rows.values() ];
}
