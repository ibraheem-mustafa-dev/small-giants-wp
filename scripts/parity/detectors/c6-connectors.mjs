// C6 connectors and lines. For a block with a line joining its steps or milestones (process steps, timeline, any element
// whose draft counterpart is a line joining items) the line's start and end are compared with the first and last item
// centres, on the live page and on its draft twin: a live line whose end sits further than 2px from the item centre,
// and further than the draft's own offset, is a finding. The line is found by geometry (a thin box, or a thin absolutely
// positioned ::before/::after) so the same reader runs on both sides. Anything it cannot read is "unmeasured".
import { RESOLVE_SRC, pairFor, finding, round, openSide, settle, runPages, summary } from './lib-geometry.mjs';

export const C6_WIDTHS = [ 1440, 1024, 768 ];
const TOL = 2;

// In the page: the live connector blocks, each with its cr-ref (first one carrying a cr-ref, itself or an ancestor).
export function findLiveContainers() {
	const refOf = ( e ) => {
		for ( let x = e; x; x = x.parentElement ) {
			const c = [ ...( x.classList || [] ) ].find( ( k ) => /^cr-ref-.+-\d+$/.test( k ) );
			if ( c ) {
				return c;
			}
		}
		return null;
	};
	const set = new Set( document.querySelectorAll( '.sgs-process-steps, .sgs-timeline' ) );
	document.querySelectorAll( '[class*="__connector"]' ).forEach( ( l ) => l.parentElement && set.add( l.parentElement ) );
	return [ ...set ].filter( ( e ) => e.getBoundingClientRect().width > 0 ).map( ( e, i ) => ( { i, ref: refOf( e ), cls: [ ...e.classList ].filter( ( k ) => ! /^cr-ref-/.test( k ) ).slice( 0, 2 ).join( '.' ) } ) );
}

// In the page: line and item geometry of one container. in: [ { finder?, liveIndex? }, resolveSrc ].
export function measureConnector( [ target, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	let box = null;
	if ( null !== target.liveIndex && undefined !== target.liveIndex ) {
		const set = new Set( document.querySelectorAll( '.sgs-process-steps, .sgs-timeline' ) );
		document.querySelectorAll( '[class*="__connector"]' ).forEach( ( l ) => l.parentElement && set.add( l.parentElement ) );
		box = [ ...set ].filter( ( e ) => e.getBoundingClientRect().width > 0 )[ target.liveIndex ] || null;
	} else {
		box = resolve( target.finder );
	}
	if ( ! box ) {
		return { missing: true };
	}
	if ( target.scroll ) {
		box.scrollIntoView( { block: 'center' } );
	}
	const cr = box.getBoundingClientRect();
	const bg = ( s ) => 'rgba(0, 0, 0, 0)' !== s.backgroundColor || 'none' !== s.backgroundImage;
	const thin = ( w, h ) => ( Math.min( w, h ) <= 6 && Math.max( w, h ) >= 0.25 * ( w > h ? cr.width : cr.height ) );
	const scan = ( scope, lines ) => {
		for ( const e of [ scope, ...scope.querySelectorAll( '*' ) ] ) {
			const s = getComputedStyle( e );
			const r = e.getBoundingClientRect();
			if ( e !== box && 'none' !== s.display && r.width > 0 && r.height > 0 && thin( r.width, r.height ) && ( bg( s ) || 'none' !== s.borderTopStyle || 'none' !== s.borderLeftStyle ) && ! e.closest( 'svg' ) ) {
				lines.push( { from: 'element', l: r.left, t: r.top, w: r.width, h: r.height } );
			}
			for ( const pseudo of [ '::before', '::after' ] ) {
				const p = getComputedStyle( e, pseudo );
				if ( 'none' === p.content || 'absolute' !== p.position ) {
					continue;
				}
				const w = parseFloat( p.width );
				const h = parseFloat( p.height );
				if ( ! ( w >= 0 && h >= 0 ) || ! thin( w, h ) ) {
					continue;
				}
				let cb = e;
				while ( cb && 'static' === getComputedStyle( cb ).position ) {
					cb = cb.parentElement;
				}
				const cbr = ( cb || document.documentElement ).getBoundingClientRect();
				const cbs = getComputedStyle( cb || document.documentElement );
				let x = cbr.left + ( parseFloat( cbs.borderLeftWidth ) || 0 ) + ( parseFloat( p.left ) || 0 );
				const y = cbr.top + ( parseFloat( cbs.borderTopWidth ) || 0 ) + ( parseFloat( p.top ) || 0 );
				let ww = w;
				if ( 'none' !== p.transform ) {
					const m = new DOMMatrixReadOnly( p.transform );
					const [ ox ] = p.transformOrigin.split( ' ' ).map( parseFloat );
					x = x + ox - ox * m.a + m.e;
					ww = w * m.a;
				}
				lines.push( { from: `pseudo ${ pseudo }`, l: x, t: y, w: ww, h } );
			}
		}
	};
	// The line sits inside the block, or (the draft's way) in a sibling beside it under the same parent: widen to two ancestors,
	// keeping only a line that crosses the block's own box.
	const lines = [];
	scan( box, lines );
	for ( let up = box.parentElement, i = 0; ! lines.length && up && i < 2; up = up.parentElement, i++ ) {
		const found = [];
		scan( up, found );
		lines.push( ...found.filter( ( l ) => l.l < cr.right && l.l + l.w > cr.left && l.t < cr.bottom && l.t + l.h > cr.top ) );
	}
	if ( ! lines.length ) {
		return { noLine: true, boxW: cr.width };
	}
	// The line that joins the most: the longest.
	const line = lines.sort( ( a, b ) => Math.max( b.w, b.h ) - Math.max( a.w, a.h ) )[ 0 ];
	const horizontal = line.w >= line.h;
	// Items: direct children (or the children of one wrapper), not the line, drawn, larger than the line.
	const drawn = ( c ) => { const r = c.getBoundingClientRect(); return r.width > 20 && r.height > 20 && ! ( thin( r.width, r.height ) ); };
	let items = [ ...box.children ].filter( drawn );
	if ( items.length < 3 && 1 === box.children.length ) {
		items = [ ...box.children[ 0 ].children ].filter( drawn );
	}
	const circle = ( it ) => [ it, ...it.querySelectorAll( '*' ) ].find( ( x ) => {
		const r = x.getBoundingClientRect();
		const s = getComputedStyle( x );
		return x !== it && r.width >= 12 && r.width <= 140 && Math.abs( r.width - r.height ) < 2 && ( parseFloat( s.borderTopLeftRadius ) >= r.width / 2 - 1 || /%/.test( s.borderTopLeftRadius ) );
	} );
	const centre = ( it ) => {
		const m = circle( it ) || it;
		const r = m.getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2, marker: m !== it };
	};
	if ( items.length < 2 ) {
		return { noItems: true, items: items.length };
	}
	const a = centre( items[ 0 ] );
	const z = centre( items[ items.length - 1 ] );
	return {
		from: line.from, horizontal, items: items.length, marker: a.marker,
		start: horizontal ? line.l : line.t, end: horizontal ? line.l + line.w : line.t + line.h,
		first: horizontal ? a.x : a.y, last: horizontal ? z.x : z.y,
		boxStart: horizontal ? cr.left : cr.top, boxSize: horizontal ? cr.width : cr.height,
	};
}

// Judges one live reading against the draft's. Pure.
export function judgeConnector( live, draft, base ) {
	const b = { class: 'C6', ...base };
	const why = ( m, side ) => ( m.missing ? `${ side } element not found` : m.noLine ? `no line found inside the ${ side } block` : m.noItems ? `fewer than two items in the ${ side } block` : null );
	const reason = ( live && why( live, 'live' ) ) || ( draft && why( draft, 'draft' ) ) || ( ! draft ? 'no draft element paired' : null );
	if ( reason ) {
		return [ { ...b, status: 'unmeasured', kind: 'connector', reason } ];
	}
	const dS = live.start - live.first;
	const dE = live.end - live.last;
	const gS = draft.start - draft.first;
	const gE = draft.end - draft.last;
	const bad = ( l, g ) => Math.abs( l ) > TOL && Math.abs( l - g ) > TOL;
	const rel = ( m ) => `${ round( m.start - m.boxStart ) }px..${ round( m.end - m.boxStart ) }px of ${ round( m.boxSize ) }px`;
	const mk = ( kind, isBad, d, l, note ) => ( isBad ? finding( { ...b, kind, draft: round( d ), live: round( l ), note } ) : { ...b, status: 'pass', kind, draft: round( d ), live: round( l ) } );
	return [
		mk( 'connector-start', bad( dS, gS ), gS, dS, `line starts ${ round( dS ) }px from the first item centre (draft ${ round( gS ) }px); live line ${ rel( live ) }, draft ${ rel( draft ) }` ),
		mk( 'connector-end', bad( dE, gE ), gE, dE, `line ends ${ round( dE ) }px from the last item centre (draft ${ round( gE ) }px); live line ${ rel( live ) }, draft ${ rel( draft ) }` ),
	];
}

export async function runC6( { browser, client, page: pg, liveUrl: lu, draftUrl: du, widths = null } ) {
	const results = [];
	for ( const w of C6_WIDTHS.filter( ( x ) => ! widths || widths.includes( x ) ) ) {
		const L = await openSide( browser, 'live', lu, w, 900 );
		const D = await openSide( browser, 'draft', du, w, 900 );
		try {
			await settle( L.page );
			await settle( D.page );
			const boxes = await L.page.evaluate( findLiveContainers );
			for ( const c of boxes ) {
				const base = { page: pg.route, width: w, widthPx: w, state: 'settled', block: c.cls, ref: c.ref };
				const finder = c.ref ? pairFor( client, c.ref ) : null;
				// Scroll the block into view (a connector drawn on entrance starts), wait it out, then read.
				await L.page.evaluate( measureConnector, [ { liveIndex: c.i, scroll: true }, RESOLVE_SRC ] );
				if ( finder ) {
					await D.page.evaluate( measureConnector, [ { finder, scroll: true }, RESOLVE_SRC ] );
				}
				await L.page.waitForTimeout( 2500 );
				const liveSettled = await L.page.evaluate( measureConnector, [ { liveIndex: c.i }, RESOLVE_SRC ] );
				const draft = finder ? await D.page.evaluate( measureConnector, [ { finder }, RESOLVE_SRC ] ) : null;
				results.push( ...judgeConnector( liveSettled, draft, { ...base, pairing: finder ? 'pairs.json' : 'none' } ) );
			}
			if ( ! boxes.length ) {
				results.push( { class: 'C6', page: pg.route, width: w, widthPx: w, status: 'n/a', kind: 'connector', reason: 'no connector block on the page' } );
			}
		} finally {
			await L.ctx.close();
			await D.ctx.close();
		}
	}
	return results;
}

export const run = ( opts ) => runPages( runC6, opts );
export const summaryLines = summary;
