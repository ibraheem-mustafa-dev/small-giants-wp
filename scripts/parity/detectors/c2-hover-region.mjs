// C2 hover trigger region. For each paired element two things are compared with the draft counterpart:
//  (a) triggers: :hover forced on the element and on each ancestor alone (transitions off); the ones that change the
//      element are its triggers. Each trigger's box (relative to the element) on live is matched to the draft's. A live
//      trigger the draft has no box for (a text paragraph with its own hover colour, a row where the draft has a tile) or a
//      draft trigger live lacks is a finding. With no CSS trigger on the draft the hover is scripted there: the row is
//      "unconfirmed" and the pointer sweep decides.
//  (b) sweep: the real pointer over the element's text, its left padding and the gap beside it, reading every marked
//      element of the enclosing card, row or wrapper (colour, ground, shadow, move, transform); where live and draft end
//      differently, or one changes and the other does not, it is a finding.
// An element that cannot be read on one side is "unmeasured" with the reason, never a pass.
import { changeSet, colourGap } from './c12-diff.mjs';
import { clientPages, readShared, pool } from './c12-session.mjs';
import { launchReal, liveUrl, draftUrl, summary } from './lib-geometry.mjs';

const BOX_TOL = 4;
const sameBox = ( a, b ) => a.every( ( v, i ) => Math.abs( v - b[ i ] ) <= BOX_TOL );

// (a) Judges the trigger scans of one element. Returns finding rows for it.
export function judgeTriggers( id, lt, dt, ctx ) {
	const base = { class: 'C2', page: ctx.page, width: ctx.width, ref: id, state: 'hover' };
	const L = lt?.triggers || [];
	const D = dt?.triggers || [];
	if ( ! L.length && ! D.length ) {
		return [];
	}
	if ( L.length && ! D.length ) {
		return [ { ...base, status: 'unconfirmed', kind: 'trigger-draft-scripted', live: L.map( ( t ) => ( { at: `${ t.tag }.${ t.cls }`, rel: t.rel, changes: t.changed } ) ), draft: 'no CSS trigger (a scripted hover or none)', rules: lt.rules } ];
	}
	const rows = [];
	const left = [ ...D ];
	for ( const t of L ) {
		const i = left.findIndex( ( d ) => sameBox( d.rel, t.rel ) );
		if ( i >= 0 ) {
			left.splice( i, 1 );
		} else {
			rows.push( { ...base, status: 'fail', kind: 'trigger-extra-live', live: { trigger: `${ t.tag }.${ t.cls }`, rel: t.rel, depth: t.depth, changes: t.changed }, draft: D.map( ( d ) => ( { rel: d.rel, depth: d.depth } ) ), rules: lt.rules } );
		}
	}
	for ( const d of left ) {
		rows.push( { ...base, status: 'fail', kind: 'trigger-missing-live', live: L.map( ( t ) => ( { rel: t.rel, depth: t.depth } ) ), draft: { trigger: `${ d.tag }.${ d.cls }`, rel: d.rel, depth: d.depth, changes: d.changed } } );
	}
	return rows;
}

// (b) Judges one element's pointer sweep on both sides. Returns finding rows (one per scope element and point).
export function judgeSweep( target, lh, dh, ctx ) {
	const rows = [];
	for ( const point of Object.keys( lh.reads ) ) {
		const l = lh.reads[ point ];
		const d = dh.reads[ point ];
		if ( ! d ) {
			rows.push( { class: 'C2', page: ctx.page, width: ctx.width, status: 'unmeasured', kind: 'sweep', ref: target, state: `hover:${ point }`, reason: `draft has no ${ point } point to hover` } );
			continue;
		}
		for ( const id of lh.scope ) {
			if ( ! l.rest[ id ] || ! d.rest[ id ] ) {
				continue;
			}
			const lc = changeSet( l.rest[ id ], l.hov[ id ] );
			const dc = changeSet( d.rest[ id ], d.hov[ id ] );
			const keys = [ ...new Set( [ ...Object.keys( lc ), ...Object.keys( dc ) ] ) ];
			const differ = keys.filter( ( k ) => Boolean( lc[ k ] ) !== Boolean( dc[ k ] ) || ( 'colour' === k && colourGap( lc[ k ].to, dc[ k ].to ) > 24 ) );
			if ( ! differ.length ) {
				continue;
			}
			rows.push( { class: 'C2', page: ctx.page, width: ctx.width, status: 'fail', kind: 'hover-outcome', ref: id, state: `hover:${ point }`, pointer: `${ point } of ${ target }`, categories: differ,
				live: Object.fromEntries( differ.map( ( k ) => [ k, lc[ k ] || 'none' ] ) ), draft: Object.fromEntries( differ.map( ( k ) => [ k, dc[ k ] || 'none' ] ) ) } );
		}
	}
	return rows;
}

export function judgeC2( live, draft, ctx ) {
	const rows = [];
	for ( const id of live.targets ) {
		rows.push( ...judgeTriggers( id, live.triggers?.[ id ], draft.triggers?.[ id ], ctx ) );
		const lh = live.hover?.[ id ];
		const dh = draft.hover?.[ id ];
		if ( ! lh || lh.skipped ) {
			continue;
		}
		if ( ! dh || dh.skipped || ! dh.reads ) {
			rows.push( { class: 'C2', page: ctx.page, width: ctx.width, status: 'unmeasured', kind: 'sweep', ref: id, state: 'hover', reason: dh?.skipped ? `draft ${ dh.skipped }` : 'draft element could not be hovered' } );
			continue;
		}
		rows.push( ...judgeSweep( id, lh, dh, ctx ) );
	}
	// The same element reported by several sweeps (each container reads it) is one row with the pointers listed.
	const merged = new Map();
	for ( const r of rows ) {
		const key = `${ r.kind }|${ r.ref }|${ r.state }|${ ( r.categories || [] ).join( ',' ) }`;
		const prior = merged.get( key );
		if ( prior && 'hover-outcome' === r.kind ) {
			prior.pointers.push( r.pointer );
		} else {
			merged.set( key, 'hover-outcome' === r.kind ? { ...r, pointers: [ r.pointer ] } : r );
		}
	}
	return [ ...merged.values() ];
}

export async function runC2Page( { browser, pg, site, draft, widths } ) {
	const found = clientPages( pg.client, [ pg.route ] )[ 0 ];
	if ( ! found?.pairs ) {
		return [ { class: 'C2', page: pg.route, status: 'unmeasured', kind: 'page', state: 'any', reason: 'no pairs file for this page' } ];
	}
	const rows = [];
	for ( const width of widths ) {
		const read = await readShared( browser, { urls: { live: liveUrl( site, pg ), draft: draftUrl( draft, pg ) }, width, pairs: found.pairs }, { hover: true, triggers: true } );
		for ( const id of Object.keys( found.pairs ) ) {
			if ( ! read.live.found[ id ] || ! read.draft.found[ id ] ) {
				rows.push( { class: 'C2', page: pg.route, width, status: 'unmeasured', kind: 'pair', ref: id, state: 'hover', reason: read.live.found[ id ] ? 'no draft counterpart resolved' : 'live element not on the page' } );
			}
		}
		rows.push( ...judgeC2( read.live, read.draft, { page: pg.route, width } ) );
	}
	return rows;
}

export async function run( { client, site, draft, pages, widths, divergences } ) {
	const browser = await launchReal();
	const rows = [];
	try {
		const per = await pool( pages, Number( process.env.DETECT_PARALLEL || 3 ), async ( pg ) => {
			try {
				return await runC2Page( { browser, pg: { ...pg, client }, site, draft, widths: widths.filter( ( w ) => [ 1440, 768 ].includes( w ) ) } );
			} catch ( e ) {
				return [ { class: 'C2', page: pg.route, status: 'unmeasured', kind: 'page', state: 'any', reason: `page run failed: ${ String( e.message ).split( '\n' )[ 0 ] }` } ];
			}
		} );
		rows.push( ...per.flat() );
	} finally {
		await browser.close();
	}
	const props = { 'trigger-extra-live': [ 'color', 'background-color' ], 'trigger-missing-live': [ 'color', 'background-color' ], 'hover-outcome': [ 'color', 'background-color', 'transform' ] };
	for ( const f of rows ) {
		const hit = 'fail' === f.status && ( divergences || [] ).find( ( e ) => ( '*' === e.node || e.node === f.ref ) && ( '*' === e.property || ( props[ f.kind ] || [] ).includes( e.property ) ) && ( ! e.scope || '*' === e.scope || e.scope === f.page ) );
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
