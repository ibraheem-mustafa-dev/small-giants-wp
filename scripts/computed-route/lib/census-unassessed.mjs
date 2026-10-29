// The rules that move a walker row with no Fill row out of `unassessed` (FR-48-65, register S6/D3). A row with no Fill row is
// unassessed only after these measuring artefacts are taken out: a box measurement (a consequence of the layout rows around
// it, or `box-unexplained`: FR-48-65 holds U as W-walker until a geometry check explains it), a technique difference between
// the draft's motion and the block's (compared by what they paint, not by how they are made), and a box width or height that
// repeats a `width` or `height` row of the same element (dropped: one difference, one row). The vocabulary is
// data/census-unassessed.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RULES = JSON.parse( fs.readFileSync( path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'census-unassessed.json' ), 'utf8' ) );
const LAYOUT = new RegExp( RULES.layoutKeys );
const TECHNIQUE_STYLE = new RegExp( RULES.technique.style );

// Whether a row is a difference in how a motion is made (a transition list, an animation shorthand, a keyframes text, a
// transition longhand), not in what it paints.
export const isTechniqueRow = ( row ) => ( 'motion' === row.kind && RULES.technique.motion.includes( row.key ) ) || ( 'style' === row.kind && TECHNIQUE_STYLE.test( String( row.key ) ) );

const px = ( v ) => {
	const n = parseFloat( String( v ?? '' ) );
	return Number.isNaN( n ) ? null : n;
};
// The horizontal box keys (x, w), against the vertical ones (y, h and the page-relative y-in-main).
const horizontal = ( key ) => /^(x|w)(-|$)/.test( String( key ) );
const refOf = ( row ) => String( row.element ?? '' ).split( ' ' )[ 0 ];
const widthsOf = ( row ) => ( 'all' === row.tier ? 'all' : 'flat' === row.tier ? null : String( row.tier ).split( '+' ).map( Number ) );
const overlap = ( a, b ) => {
	const [ x, y ] = [ widthsOf( a ), widthsOf( b ) ];
	return null === x || null === y || 'all' === x || 'all' === y || x.some( ( w ) => y.includes( w ) );
};

// The box rows that only repeat a style row of the same element: a `w` (`h`) box row with no Fill row beside a `width`
// (`height`) style row of that element at an overlapping width whose draft and live values match the box's within the
// tolerance. Returns a Set of the repeated rows.
// A style row's index key: its element and property.
const at = ( element, key ) => `${ element }\u0001${ key }`;

export function boxDuplicates( rows ) {
	const styles = new Map();
	for ( const r of rows ) {
		if ( 'style' === r.kind && Object.values( RULES.sizeKeys ).includes( r.key ) && 'walker-only' === r.side ) {
			const k = at( r.element, r.key );
			styles.set( k, [ ...( styles.get( k ) ?? [] ), r ] );
		}
	}
	const same = ( a, b ) => null !== a && null !== b && Math.abs( a - b ) <= RULES.sizeTolerancePx;
	const out = new Set();
	for ( const r of rows ) {
		const key = RULES.sizeKeys[ r.key ];
		if ( RULES.boxKind !== r.kind || ! key || 'walker-only' !== r.side ) {
			continue;
		}
		const twin = ( styles.get( at( r.element, key ) ) ?? [] ).find( ( s ) => overlap( r, s ) && same( px( r.draft ), px( s.draft ) ) && same( px( r.live ), px( s.live ) ) );
		twin && out.add( r );
	}
	return out;
}

// The walker artefact of each row with no Fill row, as Map( row -> 'consequence' | 'box-unexplained' | 'technique' ), and for a
// box row the row that explains it in `by` (the box-geometry check). A box row is a consequence when a layout style row of its
// own element, an ancestor (its position) or a descendant (its size), or a box row on the same axis of an ancestor, shares a
// width with it; else it is box-unexplained. `parentOf( ref )` is the tree's parent ref or null.
export function walkerArtefacts( rows, parentOf = () => null ) {
	const byRef = new Map();
	for ( const r of rows ) {
		byRef.set( refOf( r ), [ ...( byRef.get( refOf( r ) ) ?? [] ), r ] );
	}
	const chain = ( ref ) => {
		const out = [];
		for ( let p = parentOf( ref ); p && ! out.includes( p ); p = parentOf( p ) ) {
			out.push( p );
		}
		return out;
	};
	const descendants = new Map();
	for ( const ref of byRef.keys() ) {
		chain( ref ).forEach( ( up ) => descendants.set( up, [ ...( descendants.get( up ) ?? [] ), ref ] ) );
	}
	const below = ( ref ) => descendants.get( ref ) ?? [];
	const out = new Map();
	for ( const r of rows ) {
		if ( r.fillClass || 'walker-only' !== r.side ) {
			continue;
		}
		if ( isTechniqueRow( r ) ) {
			out.set( r, { reason: 'technique', by: null } );
		} else if ( RULES.boxKind === r.kind ) {
			const ref = refOf( r );
			const near = [ ref, ...chain( ref ), ...below( ref ) ].flatMap( ( x ) => byRef.get( x ) ?? [] ).filter( ( c ) => c !== r && overlap( r, c ) );
			const by = near.find( ( c ) => 'style' === c.kind && LAYOUT.test( String( c.key ) ) ) ?? near.find( ( c ) => RULES.boxKind === c.kind && horizontal( c.key ) === horizontal( r.key ) );
			out.set( r, by ? { reason: 'consequence', by: `${ by.element } ${ by.kind }:${ by.key }` } : { reason: 'box-unexplained', by: null } );
		}
	}
	return out;
}
