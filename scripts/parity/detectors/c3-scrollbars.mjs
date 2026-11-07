// C3 real scrollbars. Every scroll container (the page, the nav drawer body with the drawer open, mega panels open, any
// overflow:auto/scroll element) is read with classic scrollbars shown (launchReal) at short and tall phone viewports and on
// desktop, and compared with the draft's counterpart: scrollbar width (offsetWidth - clientWidth minus borders), the CSS
// scrollbar-width, whether it scrolls, and content height. A live scrollbar wider than the draft's, one the draft does not
// have, or a different content height is a finding. A container that cannot be paired is "unmeasured", never a pass.
import { RESOLVE_SRC, pairFor, finding, round, openSide, settle, runPages, summary } from './lib-geometry.mjs';

export const C3_VIEWPORTS = [ [ 375, 667 ], [ 768, 600 ], [ 375, 812 ], [ 1440, 900 ] ];
const CONTENT_TOL = 2;
// The drawer and the mega panels are site chrome, identical on every page: they are read once per viewport, on the first page run.
const chromeDone = new Set();

// In the page: the scroll containers under `rootSel` (the whole body when null), each with its measurements and cr-ref.
// With `withPage` the page scroller is the first row.
export function readScrollers( [ rootSel, withPage ] ) {
	const doc = document.documentElement;
	const out = [];
	if ( withPage ) {
		out.push( { role: 'page', ref: null, sbw: window.innerWidth - doc.clientWidth, cssWidth: getComputedStyle( doc ).scrollbarWidth, clientW: doc.clientWidth, scrollH: doc.scrollHeight, clientH: window.innerHeight, scrolls: doc.scrollHeight > window.innerHeight + 1 } );
	}
	const root = rootSel ? document.querySelector( rootSel ) : document.body;
	if ( ! root ) {
		return out;
	}
	const refOf = ( e ) => {
		for ( let x = e; x; x = x.parentElement ) {
			const c = [ ...( x.classList || [] ) ].find( ( k ) => /^cr-ref-.+-\d+$/.test( k ) );
			if ( c ) {
				return c;
			}
		}
		return null;
	};
	for ( const e of [ root, ...root.querySelectorAll( '*' ) ] ) {
		const s = getComputedStyle( e );
		if ( ! /auto|scroll/.test( s.overflowY + s.overflowX ) || 'none' === s.display ) {
			continue;
		}
		const r = e.getBoundingClientRect();
		if ( r.width < 40 || r.height < 40 ) {
			continue;
		}
		const bw = ( parseFloat( s.borderLeftWidth ) || 0 ) + ( parseFloat( s.borderRightWidth ) || 0 );
		const cls = [ ...e.classList ].filter( ( k ) => ! /^cr-ref-/.test( k ) ).slice( 0, 2 ).join( '.' ) || e.tagName.toLowerCase();
		out.push( { role: cls, ref: refOf( e ), sbw: Math.max( 0, e.offsetWidth - e.clientWidth - bw ), cssWidth: s.scrollbarWidth, clientW: e.clientWidth, scrollH: e.scrollHeight, clientH: e.clientHeight, scrolls: e.scrollHeight > e.clientHeight + 1 } );
	}
	return out;
}

// In the page: the draft scroll container for the element a pair names (itself, inside it, or the nearest ancestor).
export function readDraftFor( [ finder, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	const el = resolve( finder );
	if ( ! el ) {
		return null;
	}
	const scrolls = ( e ) => /auto|scroll/.test( getComputedStyle( e ).overflowY + getComputedStyle( e ).overflowX );
	let e = [ el, ...el.querySelectorAll( '*' ) ].find( scrolls );
	for ( let x = el.parentElement; ! e && x; x = x.parentElement ) {
		e = scrolls( x ) ? x : null;
	}
	if ( ! e ) {
		return { none: true };
	}
	const s = getComputedStyle( e );
	const bw = ( parseFloat( s.borderLeftWidth ) || 0 ) + ( parseFloat( s.borderRightWidth ) || 0 );
	return { sbw: Math.max( 0, e.offsetWidth - e.clientWidth - bw ), cssWidth: s.scrollbarWidth, clientW: e.clientWidth, scrollH: e.scrollHeight, clientH: e.clientHeight, scrolls: e.scrollHeight > e.clientHeight + 1 };
}

// Judges one live container against its draft reading; returns findings (pass, fail or unmeasured). Pure.
export function judgeScroller( live, draft, base ) {
	const b = { class: 'C3', ...base, block: live.role, ref: live.ref };
	if ( ! draft || draft.none ) {
		if ( live.sbw > 0 || live.scrolls ) {
			return [ { ...b, status: 'unmeasured', kind: 'scrollbar', reason: draft ? 'the draft counterpart has no scroll container' : 'no draft element paired' + ( live.ref ? '' : ' (no cr-ref on the live container)' ), live: live.sbw } ];
		}
		return [];
	}
	const out = [];
	const add = ( kind, bad, d, l, note ) => out.push( bad ? finding( { ...b, kind, draft: d, live: l, note } ) : { ...b, status: 'pass', kind, draft: d, live: l } );
	add( 'scrollbar-width', live.sbw > draft.sbw + 0.5, round( draft.sbw ), round( live.sbw ), `content ${ round( live.clientW ) }px wide live vs ${ round( draft.clientW ) }px in the draft` );
	if ( live.sbw > 0 || draft.sbw > 0 ) {
		add( 'scrollbar-style', live.cssWidth !== draft.cssWidth, draft.cssWidth, live.cssWidth, 'CSS scrollbar-width differs' );
	}
	add( 'scroll-state', live.scrolls && ! draft.scrolls, draft.scrolls, live.scrolls, 'the live container scrolls where the draft does not' );
	// A whole page differing by under 1% is layout drift, not a finding; a container is held to 2px.
	const tol = 'page' === live.role ? Math.max( CONTENT_TOL, draft.scrollH * 0.01 ) : CONTENT_TOL;
	// scrollHeight equals the box height when nothing overflows, so content height is only comparable where a side scrolls.
	add( 'content-height', ( live.scrolls || draft.scrolls ) && Math.abs( live.scrollH - draft.scrollH ) > tol, round( draft.scrollH ), round( live.scrollH ), `container content height (box ${ live.clientH } live, ${ draft.clientH } draft)` );
	return out;
}

async function openDrawer( page ) {
	const btn = page.locator( 'button[aria-label="Open menu"]:visible' ).first();
	if ( ! await btn.count() ) {
		return false;
	}
	await btn.click().catch( () => {} );
	await page.waitForTimeout( 1500 );
	return true;
}

const megaLabels = ( page ) => page.evaluate( () => [ ...document.querySelectorAll( 'header .sgs-nav-bar-menu__subtoggle' ) ]
	.filter( ( e ) => e.getBoundingClientRect().width > 0 )
	.map( ( e ) => ( e.getAttribute( 'aria-label' ) || '' ).replace( /^Show submenu for\s*/i, '' ) ).filter( Boolean ) );

async function hoverLabel( page, label ) {
	const el = page.locator( 'header' ).getByText( label, { exact: false } ).first();
	if ( ! await el.count() ) {
		return false;
	}
	await el.hover().catch( () => {} );
	await page.waitForTimeout( 1200 );
	return true;
}

// Runs C3 for one page across the viewports.
export async function runC3( { browser, client, page: pg, liveUrl: lu, draftUrl: du, widths = null } ) {
	const results = [];
	for ( const [ w, h ] of C3_VIEWPORTS.filter( ( v ) => ! widths || widths.includes( v[ 0 ] ) ) ) {
		const L = await openSide( browser, 'live', lu, w, h );
		const D = await openSide( browser, 'draft', du, w, h );
		try {
			await settle( L.page, { fast: true } );
			await settle( D.page, { fast: true } );
			const base = ( state ) => ( { page: pg.route, width: `${ w }x${ h }`, widthPx: w, state } );
			const lp = ( await L.page.evaluate( readScrollers, [ 'body', true ] ) )[ 0 ];
			const dp = ( await D.page.evaluate( readScrollers, [ 'body', true ] ) )[ 0 ];
			results.push( ...judgeScroller( lp, dp, { ...base( 'page' ), pairing: 'page' } ) );
			const states = [ { name: 'rest', open: async () => true } ];
			const chromeKey = `${ client }:${ w }x${ h }`;
			if ( ! chromeDone.has( chromeKey ) ) {
				chromeDone.add( chromeKey );
				states.push( { name: 'drawer-open', open: openDrawer } );
			}
			if ( w >= 1024 && states.length > 1 ) {
				for ( const label of await megaLabels( L.page ) ) {
					states.push( { name: `mega:${ label }`, open: ( p ) => hoverLabel( p, label ) } );
				}
			}
			for ( const st of states ) {
				if ( 'rest' !== st.name ) {
					await L.page.reload( { waitUntil: 'load' } );
					await D.page.reload( { waitUntil: 'load' } );
					await L.page.waitForTimeout( 1500 );
					await D.page.waitForTimeout( 1500 );
				}
				const lo = await st.open( L.page );
				const dOpen = await st.open( D.page );
				if ( ! lo || ! dOpen ) {
					if ( lo !== dOpen ) {
						results.push( { class: 'C3', ...base( st.name ), status: 'unmeasured', kind: 'state', reason: `state could not be opened on the ${ lo ? 'draft' : 'live' } side` } );
					}
					continue;
				}
				const rootSel = st.name.startsWith( 'drawer' ) ? '#sgs-nav-drawer, .sgs-nav-drawer' : st.name.startsWith( 'mega' ) ? '.sgs-nav-bar-menu__mega-panel-wrap' : null;
				const live = ( await L.page.evaluate( readScrollers, [ rootSel, false ] ) ).filter( ( s ) => 'rest' !== st.name || s.sbw > 0 || s.scrolls );
				for ( const lc of live ) {
					const finder = lc.ref ? pairFor( client, lc.ref ) : null;
					let dr = finder ? await D.page.evaluate( readDraftFor, [ finder, RESOLVE_SRC ] ) : null;
					let pairing = 'pairs.json';
					if ( ! dr && live.length === 1 && 'rest' !== st.name ) {
						const drawn = await D.page.evaluate( readScrollers, [ 'body', false ] );
						if ( 1 === drawn.length ) {
							dr = drawn[ 0 ];
							pairing = 'sole container in the state';
						}
					}
					results.push( ...judgeScroller( lc, dr, { ...base( st.name ), pairing } ) );
				}
			}
		} finally {
			await L.ctx.close();
			await D.ctx.close();
		}
	}
	return results;
}

export const run = ( opts ) => runPages( runC3, opts );
export const summaryLines = summary;
