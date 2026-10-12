// Shaping the intake record (Spec 48 FR-48-17, FR-48-35) so Bean's one review stays about half an hour: repeated
// skeleton rows that are copies of one template element, and repeated flag rows of one kind and text, become one row
// each; every original key or row ID stays listed inside the collapsed row, so no row is lost. Also the palette usage
// read from rest-mode reading records, and the slim census rows the record keeps.
import { colourHex } from './tokens.mjs';

// `<chain>/<n>#<copy>` (parity/lib/collect.mjs::tplKeyOf) to its template element: the chain with every copy index
// removed, the component (the chain's last host) and the draft ID `<component>:<n>`. Null for another shape.
export function templateOf( key ) {
	const m = /^(.+)\/(\d+)#\d+$/.exec( String( key ?? '' ) );
	if ( ! m ) {
		return null;
	}
	const chain = m[ 1 ].split( '>' ).map( ( p ) => p.replace( /#\d+$/, '' ) ).join( '>' );
	const component = m[ 1 ].split( '>' ).pop().replace( /[@#].*$/, '' );
	return { key: `${ chain }/${ m[ 2 ] }`, component, draftId: `${ component }:${ m[ 2 ] }` };
}

const countBy = ( list ) => list.reduce( ( o, v ) => ( ( o[ v ] = ( o[ v ] || 0 ) + 1 ), o ), {} );

// One surface's skeleton rows with copies of one template element collapsed: rows sharing a template element (same
// component and data-dc-tpl, every copy index ignored, so an sc-for loop's copies and an import mounted in a loop meet)
// and the same proposed block and action become one row keyed by the template element, with `copies` and every
// original `keys`. Copies the proposal sends to different blocks stay apart (the key gains `=<block>`). Every row gains
// `draftId`; a collapsed row's `reason` (shown in the review, never hashed) says how many copies it stands for. Row
// order follows each group's first copy.
export function collapseSkeletonRows( surface, rows ) {
	const groups = new Map();
	for ( const r of rows ) {
		const t = templateOf( r.key );
		const base = t ? t.key : r.key;
		const g = groups.get( base ) || [];
		g.push( { r, t } );
		groups.set( base, g );
	}
	const out = [];
	for ( const [ base, list ] of groups ) {
		const blocks = [ ...new Set( list.map( ( x ) => `${ x.r.block ?? '' }|${ x.r.action ?? '' }` ) ) ];
		for ( const b of blocks ) {
			const of = list.filter( ( x ) => `${ x.r.block ?? '' }|${ x.r.action ?? '' }` === b );
			const first = of[ 0 ];
			const draftId = first.t?.draftId ?? first.r.draftId ?? first.r.key;
			if ( 1 === list.length ) {
				out.push( { ...first.r, draftId } );
				continue;
			}
			const key = 1 === blocks.length ? base : `${ base }=${ first.r.block ?? first.r.action ?? 'none' }`;
			const words = [ ...new Set( of.map( ( x ) => x.r.words ).filter( Boolean ) ) ];
			out.push( {
				...first.r, rowId: `skeleton:${ surface }:${ key }`, key, draftId, copies: of.length, keys: of.map( ( x ) => x.r.key ),
				reason: [ `${ of.length } copies of one template element`, first.r.reason ].filter( Boolean ).join( '; ' ), proposalReason: first.r.reason ?? null,
				words: first.r.words, ...( words.length > 1 ? { otherWords: words.slice( 1, 4 ), distinctWords: words.length } : {} ),
				...( 1 === blocks.length ? {} : { splitFrom: base, blocksAcrossCopies: countBy( list.map( ( x ) => x.r.block ?? 'none' ) ) } ),
			} );
		}
	}
	return out;
}

// Every surface's rows collapsed, first within each surface (collapseSkeletonRows), then across surfaces: a template
// element a single-file draft renders on many surfaces (a page section shared by every route) is one row in the first
// surface that shows it, with `alsoIn` listing every other surface and its keys, and its `copies` counting them all.
// Rows proposing another block or action for the same element stay apart. `skeletons` is proposeSkeletons' list;
// returns { skeletons: { slug: entry }, before, after, withinSurfaces } (row counts summed over surfaces). A surface
// whose every row moved to an earlier surface keeps its entry with `rowsIn` naming where they are. Screenshots are
// dropped (intake takes none) and snippets cut to 160 characters.
export function collapseSkeletons( skeletons ) {
	const out = {};
	let before = 0;
	let within = 0;
	let after = 0;
	const first = new Map();
	for ( const s of skeletons ) {
		const { surface, ...rest } = s;
		const rows = [];
		for ( const r of collapseSkeletonRows( surface, s.rows || [] ) ) {
			const { screenshots, ...keep } = r;
			void screenshots;
			const row = { ...keep, ...( 'string' === typeof keep.snippet ? { snippet: keep.snippet.slice( 0, 160 ) } : {} ) };
			const k = `${ row.draftId }|${ row.block ?? '' }|${ row.action ?? '' }`;
			const home = first.get( k );
			if ( home && home.surface !== surface ) {
				home.row.alsoIn = [ ...( home.row.alsoIn || [] ), { surface, keys: row.keys || [ row.key ] } ];
				home.row.copies = ( home.row.copies || 1 ) + ( row.copies || 1 );
				home.row.reason = [ `${ home.row.copies } copies of one template element on ${ 1 + home.row.alsoIn.length } surfaces`, home.proposed ].filter( Boolean ).join( '; ' );
				continue;
			}
			first.has( k ) || first.set( k, { surface, row, proposed: 'proposalReason' in row ? row.proposalReason : row.reason ?? null } );
			rows.push( row );
		}
		before += ( s.rows || [] ).length;
		within += collapseSkeletonRows( surface, s.rows || [] ).length;
		after += rows.length;
		out[ surface ] = { ...rest, rows };
	}
	for ( const [ surface, e ] of Object.entries( out ) ) {
		if ( ! e.rows.length && skeletons.find( ( s ) => s.surface === surface )?.rows?.length ) {
			e.rowsIn = [ ...new Set( [ ...first.values() ].filter( ( f ) => f.row.alsoIn?.some( ( a ) => a.surface === surface ) ).map( ( f ) => f.surface ) ) ];
		}
	}
	return { skeletons: out, before, after, withinSurfaces: within };
}

// Flag rows of one kind and the same text (or URL) collapsed into the first, with `count`, every `rowIds` and every
// `draftIds`; its `why` (shown, never hashed) gives the count. A single row keeps its shape. Returns { rows, before,
// after }.
export function collapseFlags( rows ) {
	const groups = new Map();
	for ( const r of rows ) {
		const k = `${ r.kind }\u0000${ r.text ?? r.url ?? r.rowId }`;
		groups.set( k, [ ...( groups.get( k ) || [] ), r ] );
	}
	const out = [ ...groups.values() ].map( ( list ) => ( 1 === list.length ? list[ 0 ] : {
		...list[ 0 ], count: list.length, rowIds: list.map( ( r ) => r.rowId ), draftIds: [ ...new Set( list.map( ( r ) => r.draftId ) ) ],
		why: [ list[ 0 ].why, `${ list.length } rows with this text` ].filter( Boolean ).join( '; ' ),
	} ) );
	return { rows: out, before: rows.length, after: out.length };
}

// The colour properties a reading holds, each with the condition under which it paints.
const COLOUR_PROPS = {
	color: () => true,
	'background-color': () => true,
	'border-top-color': ( c ) => parseFloat( c[ 'border-top-width' ] ) > 0 && 'none' !== c[ 'border-top-style' ],
	'border-bottom-color': ( c ) => parseFloat( c[ 'border-bottom-width' ] ) > 0,
	'border-left-color': ( c ) => parseFloat( c[ 'border-left-width' ] ) > 0,
	'border-right-color': ( c ) => parseFloat( c[ 'border-right-width' ] ) > 0,
	'outline-color': ( c ) => 'none' !== c[ 'outline-style' ] && parseFloat( c[ 'outline-width' ] ) > 0,
	'text-decoration-color': ( c ) => 'none' !== c[ 'text-decoration-line' ],
};

// lib/intake-palette.mjs's `usage` from rest-mode reading records (lib/intake-reading.mjs): per painted colour
// property, the computed colour as hex, the element's draft ID (`<component>:<n>`), its tag (the last step of the
// record's path) and how many records show it. A fully transparent colour paints nothing and is skipped.
export function paletteUsage( records ) {
	const counts = new Map();
	for ( const r of records ) {
		const c = r.computed || {};
		const tag = /(?:^|>\s*)([a-z][a-z0-9-]*):nth-child\(\d+\)$/.exec( r.path || '' )?.[ 1 ] ?? null;
		const draftId = templateOf( r.draftId )?.draftId ?? r.draftId;
		for ( const [ property, paints ] of Object.entries( COLOUR_PROPS ) ) {
			const hex = colourHex( c[ property ] );
			if ( ! hex || /^#[0-9a-f]{6}00$/i.test( hex ) || ! paints( c ) ) {
				continue;
			}
			const k = [ hex, property, draftId, tag ].join( '\u0000' );
			const u = counts.get( k ) || { hex, property, draftId, count: 0, ...( tag ? { tag } : {} ) };
			u.count++;
			counts.set( k, u );
		}
	}
	return [ ...counts.values() ].sort( ( a, b ) => b.count - a.count || ( a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0 ) );
}

// The census rows the intake record keeps: identity, source, reader or gap, and reach. A row no reader read and no
// registry gap covers (an unknown construct, an unread kind) keeps the census problem as its gap, never a silent row.
export const slimCensus = ( rows, problems = [] ) => rows.map( ( r ) => ( {
	id: r.id, kind: r.kind, draftId: String( r.draftId ), component: r.component ?? null, source: r.source,
	...( r.reader ? { reader: r.reader } : {} ),
	...( r.gap ? { gap: String( r.gap ) } : r.reader ? {} : { gap: problems.find( ( p ) => p.includes( r.draftId ) ) || `no reader read this ${ r.kind } and the registry records no gap for it` } ),
	unreached: 'boolean' === typeof r.unreached ? r.unreached : null, ...( r.traceGap ? { traceGap: r.traceGap } : {} ),
} ) );

// Missing-feature rows for one draft ID and construct (a construct the proposal met on several surfaces, numbered
// `~2`, `~3`) collapsed into the first, with `count` and every `rowIds`; its `why` gives the count. Returns { rows,
// before, after }.
export function collapseMissing( rows ) {
	const groups = new Map();
	for ( const r of rows ) {
		const k = `${ r.draftId }\u0000${ r.construct }`;
		groups.set( k, [ ...( groups.get( k ) || [] ), r ] );
	}
	const out = [ ...groups.values() ].map( ( list ) => ( 1 === list.length ? list[ 0 ] : {
		...list[ 0 ], count: list.length, rowIds: list.map( ( r ) => r.rowId ), why: [ list[ 0 ].why, `${ list.length } rows for this element` ].filter( Boolean ).join( '; ' ),
	} ) );
	return { rows: out, before: rows.length, after: out.length };
}
