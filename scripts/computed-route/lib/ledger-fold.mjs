// The clone difference ledger's one row per fact (tools/clone-ledger.mjs): rows of one element, part, pseudo layer, state and
// width that state the same difference become one row.
//   - A longhand row whose shorthand also has a row (a corner radius and border-radius, transition-duration and transition)
//     is folded into the shorthand row, which lists it in `covers`.
//   - The computed `width` or `height` row of an element whose box row (w, h) also differs is folded into the box row.
//   - Two or more sides or corners of one family (padding, margin, border width, style or colour, the corner radii, the
//     offsets) with the same stage become one row named by the family, its draft and live values listed side by side.
// Runs on the staged rows of each width (before lib/ledger-report.mjs::mergeWidths, after lib/ledger-follow.mjs::markFollows,
// which reads the longhand keys). Pure.
import { shorthandsOf } from './css-families.mjs';

export const FAMILIES = [
	[ 'padding', [ 'padding-top', 'padding-right', 'padding-bottom', 'padding-left' ] ],
	[ 'margin', [ 'margin-top', 'margin-right', 'margin-bottom', 'margin-left' ] ],
	[ 'border-width', [ 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width' ] ],
	[ 'border-style', [ 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style' ] ],
	[ 'border-color', [ 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color' ] ],
	[ 'border-radius', [ 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius' ] ],
	[ 'inset', [ 'top', 'right', 'bottom', 'left' ] ],
];
const BOX_OF = { width: 'w', height: 'h' };
const FAMILY_OF = new Map( FAMILIES.flatMap( ( [ f, list ] ) => list.map( ( k ) => [ k, f ] ) ) );
const side = ( k ) => k.replace( /^(padding|margin|border)-/, '' ).replace( /-(width|style|color|radius)$/, '' );

// rows: staged ledger rows ({ id, width, key, pseudo?, state?, draft, live, stage, kind }). Returns { rows, folded }.
export function oneRowPerFact( rows ) {
	const groups = new Map();
	rows.forEach( ( r, i ) => {
		const g = JSON.stringify( [ r.id, r.width, r.pseudo ?? null, r.state ?? null ] );
		( groups.get( g ) || groups.set( g, [] ).get( g ) ).push( i );
	} );
	const drop = new Set();
	const out = rows.map( ( r ) => ( { ...r } ) );
	for ( const idx of groups.values() ) {
		const byKey = new Map( idx.map( ( i ) => [ out[ i ].key, i ] ) );
		const cover = ( into, i ) => {
			out[ into ].covers = [ ...( out[ into ].covers || [] ), out[ i ].key ];
			drop.add( i );
		};
		for ( const i of idx ) {
			const k = out[ i ].key;
			const box = BOX_OF[ k ] && byKey.get( BOX_OF[ k ] );
			if ( undefined !== box ) {
				cover( box, i );
				continue;
			}
			const sh = shorthandsOf( k ).find( ( s ) => byKey.has( s ) && byKey.get( s ) !== i );
			if ( sh ) {
				cover( byKey.get( sh ), i );
			}
		}
		// Sides of one family with one stage: one row named by the family.
		const fam = new Map();
		for ( const i of idx ) {
			const f = ! drop.has( i ) && FAMILY_OF.get( out[ i ].key );
			if ( f ) {
				const g = `${ f }|${ out[ i ].stage }`;
				( fam.get( g ) || fam.set( g, [] ).get( g ) ).push( i );
			}
		}
		for ( const [ g, list ] of fam ) {
			if ( list.length < 2 ) {
				continue;
			}
			const [ f ] = g.split( '|' );
			const [ first, ...rest ] = list;
			const lead = out[ first ];
			const sides = list.map( ( i ) => out[ i ] );
			out[ first ] = { ...lead, key: f, draft: sides.map( ( s ) => `${ side( s.key ) } ${ s.draft }` ).join( ', ' ), live: sides.map( ( s ) => `${ side( s.key ) } ${ s.live }` ).join( ', ' ), covers: [ ...sides.map( ( s ) => s.key ), ...sides.flatMap( ( s ) => s.covers || [] ) ] };
			rest.forEach( ( i ) => drop.add( i ) );
		}
	}
	return { rows: out.filter( ( r, i ) => ! drop.has( i ) ), folded: drop.size };
}
