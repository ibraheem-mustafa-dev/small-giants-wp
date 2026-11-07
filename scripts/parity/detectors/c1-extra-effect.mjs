// C1 extra effect. On every paired live element, an effect the draft counterpart does not have: a scroll-driven move
// (own transform that changes as the page scrolls), a running infinite animation, idle script motion, or a hover change
// (transform, move, colour, ground, shadow, opacity, filter, decoration) when the pointer is over the element or over
// another element it sits in (a wrapper, a card). The draft counterpart is read under the same action. Effects both sides
// have are not findings (the draft's hero image parallax, a card's own tilt). An element that cannot be read on one side
// is "unmeasured" with the reason, never a pass.
import { changeSet, scrollRange, scrollMoves, travel } from './c12-diff.mjs';
import { clientPages, readShared, pool } from './c12-session.mjs';
import { launchReal, liveUrl, draftUrl, summary } from './lib-geometry.mjs';

const WIDE = new Set( [ 'transform', 'move' ] );

// True when a marked ancestor of `id` itself transforms in this hover (the live readings).
function carriedBy( rest, hov, id ) {
	for ( let up = rest[ id ]?.up; up; up = rest[ up ]?.up ) {
		if ( changeSet( rest[ up ], hov[ up ] ).transform ) {
			return true;
		}
	}
	return false;
}

// Judges one page at one width from the two readings. `ctx` is { page, width }. Returns finding rows.
export function judgeC1( live, draft, ids, ctx ) {
	const rows = [];
	const row = ( f ) => rows.push( { class: 'C1', page: ctx.page, width: ctx.width, ...f } );
	for ( const id of ids ) {
		if ( ! live.found[ id ] || ! draft.found[ id ] ) {
			row( { status: 'unmeasured', kind: 'pair', ref: id, state: 'any', reason: live.found[ id ] ? 'no draft counterpart resolved' : 'live element not on the page' } );
			continue;
		}
		const ls = live.scroll?.[ id ];
		const ds = draft.scroll?.[ id ];
		if ( live.scroll ) {
			const lr = scrollRange( ls || [] );
			const dr = scrollRange( ds || [] );
			if ( ! lr || ! dr ) {
				row( { status: 'unmeasured', kind: 'scroll', ref: id, state: 'scroll', reason: `in view in fewer than 2 scroll steps (live ${ lr ? 'ok' : 'no' }, draft ${ dr ? 'ok' : 'no' })` } );
			} else if ( scrollMoves( lr ) && ! scrollMoves( dr ) ) {
				row( { status: 'fail', kind: 'scroll-driven', ref: id, state: 'scroll', draft: dr, live: lr } );
			}
			const names = ( s ) => [ ...new Set( ( s || [] ).flatMap( ( x ) => x.anim ) ) ];
			if ( names( ls ).length && ! names( ds ).length ) {
				row( { status: 'fail', kind: 'running-animation', ref: id, state: 'rest', draft: [], live: names( ls ) } );
			}
			if ( ( ls || [] ).some( ( x ) => x.idle ) && ! ( ds || [] ).some( ( x ) => x.idle ) ) {
				row( { status: 'fail', kind: 'idle-motion', ref: id, state: 'rest', draft: 'still', live: 'moves with no input' } );
			}
		}
	}
	// Hover: for each hovered element the live-only change categories of every marked element, one row per element.
	const byRef = new Map();
	for ( const [ target, lh ] of Object.entries( live.hover || {} ) ) {
		const dh = draft.hover?.[ target ];
		if ( lh.skipped || ! lh.reads?.text ) {
			continue;
		}
		if ( ! dh || dh.skipped || ! dh.reads?.text ) {
			row( { status: 'unmeasured', kind: 'hover', ref: target, state: 'hover', reason: dh?.skipped ? `draft ${ dh.skipped }` : 'draft element could not be hovered' } );
			continue;
		}
		const { rest: lr, hov: lv } = lh.reads.text;
		const { rest: dr, hov: dv } = dh.reads.text;
		for ( const id of ids ) {
			if ( ! lr[ id ] || ! dr[ id ] ) {
				continue;
			}
			const lc = changeSet( lr[ id ], lv[ id ] );
			const dc = changeSet( dr[ id ], dv[ id ] );
			const extra = Object.keys( lc ).filter( ( k ) => ! dc[ k ] );
			// A box that moves because a container it sits in transforms (a scaled wrapper carries its children) is that
			// container's effect, not a second one.
			if ( extra.length && extra.every( ( k ) => 'move' === k ) && carriedBy( lr, lv, id ) ) {
				continue;
			}
			// A move with a transform is one effect.
			const kinds = extra.includes( 'transform' ) ? extra.filter( ( k ) => 'move' !== k ) : extra;
			if ( ! kinds.length ) {
				continue;
			}
			const key = `${ id }|${ kinds.join( ',' ) }`;
			const prior = byRef.get( key );
			if ( prior ) {
				prior.triggers.push( target );
				continue;
			}
			const hit = { class: 'C1', page: ctx.page, width: ctx.width, status: 'fail', kind: 'hover-effect', ref: id, state: 'hover', categories: kinds,
				triggers: [ target ], via: id === target ? 'own hover' : 'hover on a container or neighbour',
				draft: Object.fromEntries( kinds.map( ( k ) => [ k, dc[ k ] || 'none' ] ) ), live: Object.fromEntries( kinds.map( ( k ) => [ k, lc[ k ] ] ) ) };
			if ( kinds.some( ( k ) => WIDE.has( k ) ) ) {
				hit.travel = travel( lc );
			}
			byRef.set( key, hit );
			rows.push( hit );
		}
	}
	return rows;
}

export async function runC1Page( { browser, pg, site, draft, widths, hoverWidths = [ 1440, 768 ], scrollWidths = [ 1440, 768 ] } ) {
	const found = clientPages( pg.client, [ pg.route ] )[ 0 ];
	if ( ! found?.pairs ) {
		return [ { class: 'C1', page: pg.route, status: 'unmeasured', kind: 'page', state: 'any', reason: 'no pairs file for this page' } ];
	}
	const rows = [];
	for ( const width of widths ) {
		const need = { scroll: scrollWidths.includes( width ), hover: hoverWidths.includes( width ) };
		if ( ! need.scroll && ! need.hover ) {
			continue;
		}
		const read = await readShared( browser, { urls: { live: liveUrl( site, pg ), draft: draftUrl( draft, pg ) }, width, pairs: found.pairs }, need );
		rows.push( ...judgeC1( read.live, read.draft, Object.keys( found.pairs ), { page: pg.route, width } ) );
	}
	return rows;
}

export async function run( { client, site, draft, pages, widths, divergences } ) {
	const browser = await launchReal();
	const rows = [];
	try {
		const per = await pool( pages, Number( process.env.DETECT_PARALLEL || 3 ), async ( pg ) => {
			try {
				return await runC1Page( { browser, pg: { ...pg, client }, site, draft, widths: widths.filter( ( w ) => [ 1440, 768 ].includes( w ) ) } );
			} catch ( e ) {
				return [ { class: 'C1', page: pg.route, status: 'unmeasured', kind: 'page', state: 'any', reason: `page run failed: ${ String( e.message ).split( '\n' )[ 0 ] }` } ];
			}
		} );
		rows.push( ...per.flat() );
	} finally {
		await browser.close();
	}
	const rules = divergences || [];
	const props = { 'scroll-driven': [ 'transform', 'translate' ], 'running-animation': [ 'animation' ], 'hover-effect': [ 'transform', 'scale', 'translate', 'color', 'box-shadow', 'background-color' ] };
	for ( const f of rows ) {
		const hit = 'fail' === f.status && rules.find( ( e ) => ( '*' === e.node || e.node === f.ref ) && ( '*' === e.property || ( props[ f.kind ] || [] ).includes( e.property ) ) && ( ! e.scope || '*' === e.scope || e.scope === f.page ) );
		if ( hit ) {
			f.status = 'ruled';
			f.ruling = hit.id;
		}
		f.severity = f.status;
		f.check = f.kind;
		f.trigger = f.state;
	}
	return { findings: rows };
}
export const summaryLines = summary;
