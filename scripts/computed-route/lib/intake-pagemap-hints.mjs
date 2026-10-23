// The surfaces.json cross-check of the page map (Spec 48 FR-48-30, FR-48A-7): Claude Design's handoff/surfaces.json
// records pair with the surfaces lib/intake-pagemap-surfaces.mjs finds in the draft code, by kind, place and name; a
// surface on one side only is a `surfaces-disagree` gap row, and a record with no code surface is still proposed.
import { KIND_POST_TYPE, kebab } from './intake-pagemap-surfaces.mjs';

const WORDS = ( s ) => new Set( kebab( s ).split( /[^a-z0-9]+/ ).filter( ( w ) => w.length > 2 && ! [ 'menu', 'mega', 'form', 'drawer', 'modal', 'the', 'and', 'inline', 'site' ].includes( w ) ) );
const normRoute = ( r ) => ( r ? String( r ).replace( /^\/+/, '' ).replace( /\.dc\.html.*$/, '' ).toLowerCase() : null );
// A hint record's kind names the same surface as a code surface's: equal kinds, or a hint modal or form that the code
// shows as a choice flow (the code reads what the surface does; the hint names how it is shown).
const sameKind = ( h, c ) => h.kind === c.kind || ( 'choice-flow' === c.kind && [ 'modal', 'form' ].includes( h.kind ) );
// Whether a hint record sits where the code surface does: a site-wide record (`*`) with a surface outside every page,
// or the record's route with the surface's page.
const samePlace = ( h, c ) => ( '*' === h.route ? ! c.page : !! c.page && normRoute( h.route ) === normRoute( c.page ) );

// Cross-checks the code's surfaces with handoff/surfaces.json records (FR-48A-7): { surfaces (code surfaces, then
// hint-only ones), gaps (one `surfaces-disagree` row per surface one side lacks) }. Only the kinds that become CPT
// posts take part; a hint record names its kind, `name`, `dc` and `route`.
export function crossCheck( code, hint ) {
	const records = ( hint?.records || [] ).filter( ( h ) => KIND_POST_TYPE[ String( h.kind ).toLowerCase() ] )
		.map( ( h ) => ( { ...h, kind: [ 'choice flow', 'quiz' ].includes( String( h.kind ).toLowerCase() ) ? 'choice-flow' : String( h.kind ).toLowerCase() } ) );
	if ( ! hint ) {
		return { surfaces: code, gaps: [] };
	}
	const used = new Set();
	const gaps = [];
	const out = [];
	for ( const c of code ) {
		const same = records.filter( ( h ) => ! used.has( h ) && sameKind( h, c ) && ( ! h.dc || h.dc === c.dc ) );
		const peers = code.filter( ( x ) => x.kind === c.kind && x.dc === c.dc );
		const score = ( h ) => ( normRoute( h.route ) && normRoute( h.route ) === normRoute( c.route ) ? 3 : 0 )
			+ ( [ ...WORDS( c.label ) ].some( ( w ) => WORDS( h.name ).has( w ) ) ? 2 : 0 ) + ( h.dc === c.dc ? 1 : 0 ) + ( samePlace( h, c ) ? 1 : 0 );
		const best = same.map( ( h ) => ( { h, s: score( h ) } ) ).sort( ( a, b ) => b.s - a.s )[ 0 ];
		const match = best && ( best.s >= 2 || ( 1 === same.length && 1 === peers.length ) ) ? best.h : null;
		if ( match ) {
			used.add( match );
		}
		out.push( match ? { ...c, hint: match.id } : c );
	}
	// Leftovers of one kind in one draft pair in document order when both sides have the same number.
	for ( const c of out.filter( ( x ) => ! x.hint ) ) {
		const mine = out.filter( ( x ) => ! x.hint && x.kind === c.kind && x.dc === c.dc );
		const theirs = records.filter( ( h ) => ! used.has( h ) && h.kind === c.kind && h.dc === c.dc );
		if ( mine.length === theirs.length && mine.length ) {
			mine.forEach( ( x, i ) => {
				x.hint = theirs[ i ].id;
				used.add( theirs[ i ] );
			} );
		}
	}
	for ( const c of out.filter( ( x ) => ! x.hint ) ) {
		gaps.push( { construct: 'surfaces-disagree', draftId: c.draftId, error: `${ KIND_POST_TYPE[ c.kind ] } "${ c.label }" is in the draft code; handoff/surfaces.json has no ${ c.kind } record for it` } );
	}
	for ( const h of records.filter( ( r ) => ! used.has( r ) ) ) {
		out.push( { kind: h.kind, label: h.name, title: h.name, route: normRoute( h.route ) && '*' !== h.route ? normRoute( h.route ) : null, dc: h.dc || null, draftId: `surfaces.json ${ h.id }`, hint: h.id } );
		gaps.push( { construct: 'surfaces-disagree', draftId: `surfaces.json ${ h.id }`, error: `surfaces.json ${ h.id } ${ h.kind } "${ h.name }" (${ h.dc || 'no dc' }) has no matching surface in the draft code` } );
	}
	return { surfaces: out, gaps };
}
