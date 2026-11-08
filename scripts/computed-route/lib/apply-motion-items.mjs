// Draft calls on a block's descendants, placed on the block's own motion parts (the framework DB's `motion_targets`):
//   - a repeated one-shot on the elements of a list (a grid's cards, a row of steps) is the part the block declares as its
//     printed items (`supports.sgs.motionItems`, read from `block_supports`), with the draft's per-item delay as the block's
//     `sgsMotion.stagger` (the stagger helper holds every item's delay, so the part's entrance carries none);
//   - a call on an element whose record names a part of the block (a "connector" line, a "progress" bar) is that part.
// A call that is neither (a reveal of a picture inside an entry, a filter row the block does not draw) stays unplaced and the
// caller reports it. A wrapper alias of the same draft ids (a container around a process-steps block) hands such a call to
// the descendant pair that places it (`claimedElsewhere`).
import { recordsFor } from './apply-records.mjs';
import { endless } from './apply-motion-calls.mjs';
import { staggerOf } from './fill-motion-stagger.mjs';

const WIDTHS = [ 1440, 768, 375 ];
const caches = new WeakMap();
const idOf = ( tpl ) => Number( /^Root\/(\d+)#\d+$/.exec( String( tpl ?? '' ) )?.[ 1 ] ?? NaN );
// A part that wraps or bands other parts is never the element a described line or bar is.
const STRUCTURAL = new Set( [ 'root', 'wrapper', 'inner', 'content-band', 'content', 'background', 'overlay', 'grid' ] );

// The part a block declares as its printed items, or null: `supports.sgs.motionItems` in the framework DB.
export function itemsPartOf( db, block ) {
	if ( ! caches.has( db ) ) {
		const map = new Map();
		for ( const r of db.prepare( "SELECT block_slug, support_value FROM block_supports WHERE support_name = 'sgs' AND support_value LIKE '%motionItems%'" ).all() ) {
			try {
				const part = JSON.parse( r.support_value )?.motionItems;
				'string' === typeof part && map.set( r.block_slug, part );
			} catch {
				// A support value that is not JSON names no items part.
			}
		}
		caches.set( db, map );
	}
	return caches.get( db ).get( block ) ?? null;
}

// Groups of descendant calls by the draft element animated: [ { tpl, calls: { width: [ call ] } } ]. `keep( call )` says whether
// a call is this target's to place. `auxKeys`: the keys of the extra draft elements the target's families read beside its own (a
// described connector line); a call on one is a descendant call although the element was read.
export function groupsOf( animate, keep, auxKeys = new Set() ) {
	const groups = new Map();
	for ( const w of WIDTHS ) {
		for ( const c of animate[ w ] || [] ) {
			if ( ( c.own && ! auxKeys.has( c.key ) ) || ! keep( c ) ) {
				continue;
			}
			const id = c.tpl ?? '';
			groups.has( id ) || groups.set( id, { tpl: id, calls: { 1440: [], 768: [], 375: [] } } );
			groups.get( id ).calls[ w ].push( c );
		}
	}
	return [ ...groups.values() ];
}

const words = ( text ) => new Set( String( text ?? '' ).toLowerCase().match( /[a-z0-9]+/g ) ?? [] );
const isClip = ( call ) => ( Array.isArray( call.frames ) ? call.frames : [] ).some( ( f ) => 'clipPath' in f || 'clip-path' in f );

// The delays the draft gave one list, per item, as a stagger { offset, step, cap }: the draft's own record where it states
// one (its formula or inventory field), else the arithmetic of the call delays; null when the items start together.
export function staggerFor( { recs, calls } ) {
	for ( const r of recs ) {
		const s = staggerOf( r );
		if ( s && ! s.refused ) {
			return s;
		}
	}
	const list = WIDTHS.map( ( w ) => calls[ w ] ).find( ( l ) => l?.length > 1 ) || [];
	const delays = list.map( ( c ) => ( 'object' === typeof c.options && c.options ? c.options.delay : 0 ) ?? 0 ).sort( ( a, b ) => a - b );
	const step = delays[ 1 ] - delays[ 0 ];
	return step > 0 && delays.every( ( d, i ) => d === delays[ 0 ] + i * step ) ? { offset: delays[ 0 ], step } : null;
}

// { part, kind: 'part' | 'items' } the block gives a group, or null.
export function placeGroup( { block, group, mdb, db, recordsIndex, items } ) {
	if ( ! group.tpl ) {
		return null;
	}
	const names = new Set( mdb.targetsOf( block ).map( ( t ) => t.target ) );
	const recs = recordsFor( recordsIndex, `Root/${ group.tpl }#0` );
	// Only a record of a Web Animation that names this element among a few says what the element is: a transition record's
	// text is the element's markup, and a rule for every grid child names no one part.
	const specific = recs.filter( ( r ) => 'waapi' === r.mechanism && [ r.element?.template_tpl_id ].flat().length <= 3 );
	const text = words( specific.flatMap( ( r ) => [ r.name, r.element?.description ] ).join( ' ' ) );
	const named = [ ...names ].filter( ( n ) => ! STRUCTURAL.has( n ) && n.split( '-' ).every( ( w ) => text.has( w ) ) ).sort( ( a, b ) => b.length - a.length )[ 0 ];
	if ( named ) {
		return { part: named, kind: 'part', recs };
	}
	const part = itemsPartOf( db, block );
	const all = WIDTHS.flatMap( ( w ) => group.calls[ w ] );
	const repeated = WIDTHS.some( ( w ) => group.calls[ w ].length > 1 && ( ! items || group.calls[ w ].length <= items ) );
	if ( part && names.has( part ) && repeated && all.every( ( c ) => ! endless( c ) && ! isClip( c ) ) ) {
		return { part, kind: 'items', recs };
	}
	return null;
}

// Whether another pair of the surface, sharing the draft ids of this call's element, places the group: a wrapper hands it over.
export function claimedElsewhere( { target, surface, all, group, mdb, db, recordsIndex } ) {
	const id = Number( group.tpl );
	return ( surface?.pairs || [] ).some( ( p ) => {
		const other = all?.blocks?.[ p.ref ]?.block;
		return p.ref !== target.ref && other && ( p.owns || [] ).includes( id ) && ( target.owns || [] ).includes( idOf( p.tpl ) )
			&& null !== placeGroup( { block: other, group, mdb, db, recordsIndex, items: all?.drafts?.[ 1440 ]?.facts?.[ p.key ?? p.ref ]?.items?.n ?? null } );
	} );
}

// Whether a target owns the draft element of a group (its draft ids hold the element's template id).
export const ownsGroup = ( target, group ) => ( target.owns || [] ).includes( Number( group.tpl ) );

const stem = ( w ) => w.replace( /s$/, '' );

// A group of calls keyed to one pair that the NEXT pair of the surface, in document order, holds as a part of its own block: a
// row of chips the draft draws before a grid whose block prints them (a post grid's filter chips). The group's draft elements
// are named by their records' descriptions; a part of the next block takes them when the part's label ends with a word the
// description names (the head noun of "Filter chip" is "chip", the description's "chips") and no other part does. The block's
// items part and its structural parts never take such a group. { ref, part } or null.
export function siblingClaim( { group, surface, all, db, mdb, recordsIndex } ) {
	const id = Number( group.tpl );
	const key = WIDTHS.flatMap( ( w ) => group.calls[ w ] ).find( ( c ) => c.key )?.key;
	const pairs = ( surface?.pairs || [] ).map( ( p ) => ( { ...p, id: idOf( p.tpl ) } ) ).filter( ( p ) => Number.isFinite( p.id ) );
	const owner = pairs.find( ( p ) => ( p.key ?? p.ref ) === key );
	const next = pairs.filter( ( p ) => p.id > id ).sort( ( a, b ) => a.id - b.id )[ 0 ];
	const block = next ? all?.blocks?.[ next.ref ]?.block : null;
	if ( ! owner || ! block || owner.id >= id ) {
		return null;
	}
	const text = new Set( [ ...words( recordsFor( recordsIndex, `Root/${ group.tpl }#0` ).flatMap( ( r ) => [ r.name, r.element?.description ] ).join( ' ' ) ) ].map( stem ) );
	const items = itemsPartOf( db, block );
	const fits = mdb.targetsOf( block ).filter( ( t ) => ! STRUCTURAL.has( t.target ) && t.target !== items && 'part' === t.kind && text.has( stem( String( t.label ).toLowerCase().split( /\s+/ ).pop() ) ) );
	return 1 === fits.length ? { ref: next.ref, part: fits[ 0 ].target } : null;
}
