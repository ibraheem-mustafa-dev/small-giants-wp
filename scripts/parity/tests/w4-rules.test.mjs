// Walker Track W wave 4, lane w4-rules, in headless Chromium on local HTML. Four walker artefacts on the Indus header:
// a state colour on a logo that paints no text on either side (GAP-CHECKLIST 34), a declared aspect ratio whose box
// matches (35), flow offsets read from the top of a pass-through nav (36), and a presence row on a wrapper whose only
// content is another pair (37). Each rule has planted controls in which the draft paints or moves and the live does not.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFinder, collectPair, hoverStyles, HOVER_PROPS } from '../lib/collect.mjs';
import { PAINT_SRC } from '../lib/paint.mjs';
import { comparePair } from '../lib/compare.mjs';
import { compareState, flowOffsets } from '../lib/compare-state.mjs';
import { readOpts } from '../lib/state-passes.mjs';

const { chromium } = await import( new URL( '../../computed-route/node_modules/playwright/index.mjs', import.meta.url ).href );
const RESOLVE = resolveFinder.toString();
const TOL = { px: 0.5, box: 2 };
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const PROPS = [ 'display', 'color', 'aspect-ratio', 'icon-fill', 'icon-stroke' ];
// Every pair of `pairs` read on one page as the walker reads it (readOpts), at rest and, with `hover`, at the hover end
// state under a real pointer and with the state passes' options; `active` copies the hover read as the pressed one.
const readAll = async ( html, pairs, side, { hover = false } = {} ) => {
	const page = await browser.newPage( { viewport: { width: 1000, height: 600 } } );
	await page.setContent( `<!doctype html><html><body style="margin:0">${ html }</body></html>` );
	const snap = {};
	for ( const p of pairs ) {
		snap[ p.name ] = await page.evaluate( collectPair, [ p[ side ], PROPS, RESOLVE, null, null, null, PAINT_SRC, null, readOpts( pairs, p, side, () => PROPS ) ] );
		if ( hover && ! snap[ p.name ].missing ) {
			await page.hover( p[ side ] );
			await page.waitForTimeout( 50 );
			snap[ p.name ].hover = await page.evaluate( hoverStyles, [ p[ side ], HOVER_PROPS, RESOLVE, PAINT_SRC, { ...readOpts( pairs, p, side, () => PROPS ), icon: true } ] );
			snap[ p.name ].active = snap[ p.name ].hover;
			await page.mouse.move( 999, 599 );
		}
	}
	await page.close();
	return snap;
};
const ONE = [ { name: 'logo', draft: '#n', live: '#n' } ];
const rowsOf = ( d, l, kinds ) => comparePair( { text: false }, d, l, TOL ).filter( ( r ) => kinds.includes( r.kind ) ).map( ( r ) => [ r.kind, r.key ] );

// Section 34: the draft logo element changes its own colour on hover and press; its svg paints literal fills. The live
// logo is a div holding an image. Neither paints text.
const SVG = ( fill ) => `<svg width="280" height="63" viewBox="0 0 280 63"><path d="M0 0h280v63H0z" fill="${ fill }"/></svg>`;
const IMG = `<img width="280" height="63" alt="" src="data:image/svg+xml,${ encodeURIComponent( '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="63"><rect width="280" height="63" fill="#d8ca50"/></svg>' ) }">`;
const STYLE = ( css ) => `<style>${ css }</style>`;
const DRAFT_LOGO = ( inner = SVG( '#d8ca50' ) ) => `${ STYLE( '#n{display:block;width:280px;color:rgb(30,42,60)}#n:hover{color:rgb(7,94,128)}' ) }<a href="/"><div id="n">${ inner }</div></a>`;
const LIVE_LOGO = ( inner = IMG, css = '' ) => `${ STYLE( `#n{display:block;width:280px;color:rgb(30,42,60)}${ css }` ) }<a href="/"><div id="n">${ inner }</div></a>`;

test( 'MUST FAIL: a logo that paints no text on either side gives no hover or pressed colour row', async () => {
	const d = ( await readAll( DRAFT_LOGO(), ONE, 'draft', { hover: true } ) ).logo;
	const l = ( await readAll( LIVE_LOGO(), ONE, 'live', { hover: true } ) ).logo;
	assert.equal( d.textFrom, 'none' );
	assert.equal( l.textFrom, 'none' );
	assert.notEqual( d.hover.color, l.hover.color );
	assert.deepEqual( rowsOf( d, l, [ 'hover', 'active' ] ), [] );
} );

test( 'control: the draft paints text and recolours it on hover, the live paints none, and the row stays', async () => {
	const d = ( await readAll( DRAFT_LOGO( 'Indus Foods' ), ONE, 'draft', { hover: true } ) ).logo;
	const l = ( await readAll( LIVE_LOGO(), ONE, 'live', { hover: true } ) ).logo;
	assert.deepEqual( rowsOf( d, l, [ 'hover' ] ), [ [ 'hover', 'color' ] ] );
} );

test( 'control: the draft\'s currentColor icon recolours on hover, the live icon does not, and a row stays', async () => {
	const d = ( await readAll( DRAFT_LOGO( SVG( 'currentColor' ) ), ONE, 'draft', { hover: true } ) ).logo;
	const l = ( await readAll( LIVE_LOGO( SVG( 'rgb(30,42,60)' ) ), ONE, 'live', { hover: true } ) ).logo;
	assert.deepEqual( rowsOf( d, l, [ 'hover' ] ), [ [ 'hover', 'icon-fill' ] ] );
} );

test( 'MUST FAIL: the live element recolours on hover as the draft does but its icon has a literal fill: the icon row stays', async () => {
	const d = ( await readAll( DRAFT_LOGO( SVG( 'currentColor' ) ), ONE, 'draft', { hover: true } ) ).logo;
	const l = ( await readAll( LIVE_LOGO( SVG( 'rgb(30,42,60)' ), '#n:hover{color:rgb(7,94,128)}' ), ONE, 'live', { hover: true } ) ).logo;
	assert.equal( d.hover.color, l.hover.color );
	assert.deepEqual( rowsOf( d, l, [ 'hover', 'active' ] ), [ [ 'hover', 'icon-fill' ], [ 'active', 'icon-fill' ] ] );
} );

test( 'control: both currentColor icons recolour alike on hover: no row', async () => {
	const d = ( await readAll( DRAFT_LOGO( SVG( 'currentColor' ) ), ONE, 'draft', { hover: true } ) ).logo;
	const l = ( await readAll( LIVE_LOGO( SVG( 'currentColor' ), '#n:hover{color:rgb(7,94,128)}' ), ONE, 'live', { hover: true } ) ).logo;
	assert.deepEqual( rowsOf( d, l, [ 'hover', 'active' ] ), [] );
} );

// Section 35: a declared ratio on the draft element against a live `auto` box sized by its image.
const styleRows = ( d, l ) => comparePair( { text: false }, d, l, TOL ).filter( ( r ) => 'style' === r.kind || 'box' === r.kind ).map( ( r ) => [ r.key, r.draft, r.live ] );

test( 'MUST FAIL: a draft aspect-ratio whose box matches the live box (280x63 against 279x63) is no row', async () => {
	const d = ( await readAll( `<div id="n" style="width:280px;aspect-ratio:3741 / 848">${ SVG( '#d8ca50' ).replace( '<svg ', '<svg style="display:block;width:100%;height:100%" ' ) }</div>`, ONE, 'draft' ) ).logo;
	const l = ( await readAll( `<div id="n" style="width:279px"><img style="display:block;width:279px;height:63px" alt="" src="${ IMG.match( /src="([^"]+)"/ )[ 1 ] }"></div>`, ONE, 'live' ) ).logo;
	assert.equal( d.styles[ 'aspect-ratio' ], '3741 / 848' );
	assert.equal( l.styles[ 'aspect-ratio' ], 'auto' );
	assert.deepEqual( styleRows( d, l ), [] );
} );

test( 'control: a draft 2 / 1 box of 200x100 against a live auto box of 200x50 keeps the ratio row beside the height row', async () => {
	const d = ( await readAll( '<div id="n" style="width:200px;aspect-ratio:2 / 1"></div>', ONE, 'draft' ) ).logo;
	const l = ( await readAll( '<div id="n" style="width:200px;height:50px"></div>', ONE, 'live' ) ).logo;
	assert.deepEqual( styleRows( d, l ), [ [ 'h', 100, 50 ], [ 'aspect-ratio', '2 / 1', 'auto' ] ] );
} );

// Section 36: a top bar, then a row holding the logo and the nav. The draft nav is a height:100% box in the 84px row;
// the live nav is 42px, centred by the row. Every pair is measured from the pair before it (flowOffsets).
const LINK = 'display:block;height:42px';
const FLOW_PAIRS = [ { name: 'top', draft: '#top', live: '#top' }, { name: 'nav', draft: '#nav', live: '#nav' }, { name: 'logo', draft: '#logo', live: '#logo' } ];
const ROW = ( nav, links = LINK ) => `<div id="top" style="height:40px;background:#123"></div><div style="display:flex;align-items:center;height:84px;padding:0 60px">
	<nav id="nav" style="display:flex;align-items:center;width:300px;${ nav }"><a href="/" style="${ links };width:73px">Home</a><a href="/about" style="${ links };width:90px">About</a></nav>
	<a id="logo" href="/" style="${ LINK };width:200px">Logo</a>
</div>`;
const flowRows = ( ds, ls ) => Object.entries( flowOffsets( FLOW_PAIRS, ds, ls, { draft: 0, live: 0 }, TOL ) ).flatMap( ( [ n, rows ] ) => rows.map( ( r ) => [ n, r.key, r.draft, r.live ] ) );

test( 'MUST FAIL: a pass-through nav is placed, and places the next pair, by where its links start', async () => {
	const ds = await readAll( ROW( 'height:100%' ), FLOW_PAIRS, 'draft' );
	const ls = await readAll( ROW( '' ), FLOW_PAIRS, 'live' );
	assert.equal( ds.nav.box.h, 84 );
	assert.equal( ls.nav.box.h, 42 );
	assert.deepEqual( comparePair( { text: false }, ds.nav, ls.nav, TOL ).filter( ( r ) => 'box' === r.kind ), [] );
	assert.deepEqual( flowRows( ds, ls ), [] );
} );

test( 'control: the live links sit 20px lower inside the same row, and the flow row stays', async () => {
	const ds = await readAll( ROW( 'height:100%' ), FLOW_PAIRS, 'draft' );
	const ls = await readAll( ROW( 'margin-top:40px' ), FLOW_PAIRS, 'live' );
	assert.ok( flowRows( ds, ls ).some( ( [ n ] ) => 'nav' === n || 'logo' === n ), JSON.stringify( flowRows( ds, ls ) ) );
} );

// Section 37: the draft has no nav at this width, only its burger; the live nav exists as the burger's wrapper.
const NAV_PAIRS = [ { name: 'nav', text: false, draft: '#nav', live: '#nav' }, { name: 'burger', text: false, draft: '#burger', live: '#burger' } ];
const BURGER = '<button id="burger" style="display:block;width:48px;height:48px;border:0;background:#d8ca50" aria-label="Open menu"></button>';
const DRAFT_NAV = ( burger = BURGER ) => `<header style="display:flex;justify-content:space-between;padding:10px">${ '<a href="/">Logo</a>' }${ burger }</header>`;
const LIVE_NAV = ( wrap = '', extra = '' ) => `<header style="display:flex;justify-content:space-between;padding:10px"><a href="/">Logo</a><nav id="nav" aria-label="header" style="width:37px"><ul style="display:none"><li><a href="/">Home</a></li></ul><div class="wrap" style="${ wrap }">${ BURGER }</div>${ extra }</nav></header>`;
const stateRows = ( ds, ls ) => {
	const run = { pairs: {} };
	const side = ( snap ) => ( { snap, log: [], structure: null, mainY: 0 } );
	compareState( run, side( ds ), side( ls ), { state: { name: 'rest' }, width: 375, cfg: {}, accept: [], tol: TOL, header: false, autoOn: false, pairsFor: () => NAV_PAIRS, origins: [], linksSeen: new Set(), allLiveLinks: [], unmatched: [], mispaired: [] } );
	return ( run.pairs.nav?.diffs || [] ).filter( ( r ) => 'presence' === r.kind ).map( ( r ) => [ r.key, r.draft, r.live ] );
};

test( 'MUST FAIL: a live nav that only wraps the burger, paired on both sides, is no presence row', async () => {
	const ds = await readAll( DRAFT_NAV(), NAV_PAIRS, 'draft' );
	const ls = await readAll( LIVE_NAV(), NAV_PAIRS, 'live' );
	assert.ok( ds.nav.missing );
	assert.deepEqual( ls.nav.bare, { own: false, nested: [ 'burger' ] } );
	assert.deepEqual( stateRows( ds, ls ), [] );
} );

test( 'control: the live wrapper paints a ground, and the presence row stays', async () => {
	const ds = await readAll( DRAFT_NAV(), NAV_PAIRS, 'draft' );
	const ls = await readAll( LIVE_NAV( 'background:#eee' ), NAV_PAIRS, 'live' );
	assert.deepEqual( stateRows( ds, ls ), [ [ 'element', 'missing', 'present' ] ] );
} );

test( 'control: the live nav holds a visible text link beside the burger, and the presence row stays', async () => {
	const ds = await readAll( DRAFT_NAV(), NAV_PAIRS, 'draft' );
	const ls = await readAll( LIVE_NAV( '', '<a href="/contact">Contact</a>' ), NAV_PAIRS, 'live' );
	assert.deepEqual( stateRows( ds, ls ), [ [ 'element', 'missing', 'present' ] ] );
} );

test( 'control: the burger is missing on the draft side, and the presence row stays', async () => {
	const ds = await readAll( DRAFT_NAV( '' ), NAV_PAIRS, 'draft' );
	const ls = await readAll( LIVE_NAV(), NAV_PAIRS, 'live' );
	assert.deepEqual( stateRows( ds, ls ), [ [ 'element', 'missing', 'present' ] ] );
} );

test( 'control: the live nav draws a label of its own over its box (positioned, so the box keeps its size), and the presence row stays', async () => {
	const ds = await readAll( DRAFT_NAV(), NAV_PAIRS, 'draft' );
	const ls = await readAll( LIVE_NAV( '', '<span style="position:absolute;left:0;top:0">Menu</span>' ).replace( 'style="width:37px"', 'style="width:37px;position:relative"' ), NAV_PAIRS, 'live' );
	assert.equal( ls.nav.box.h, 48 );
	assert.deepEqual( stateRows( ds, ls ), [ [ 'element', 'missing', 'present' ] ] );
} );

test( 'control: the live nav element itself paints a ground, and the presence row stays', async () => {
	const ds = await readAll( DRAFT_NAV(), NAV_PAIRS, 'draft' );
	const ls = await readAll( LIVE_NAV().replace( 'style="width:37px"', 'style="width:37px;background:#eee"' ), NAV_PAIRS, 'live' );
	assert.deepEqual( stateRows( ds, ls ), [ [ 'element', 'missing', 'present' ] ] );
} );

test( 'control: the live nav wraps the burger and a search button the draft lacks, and the presence row stays', async () => {
	const pairs = [ ...NAV_PAIRS, { name: 'search', text: false, draft: '#search', live: '#search' } ];
	const SEARCH = '<button id="search" style="display:block;width:48px;height:48px;border:0;background:#d8ca50" aria-label="Search"></button>';
	const ds = await readAll( DRAFT_NAV(), pairs, 'draft' );
	const ls = await readAll( LIVE_NAV().replace( 'style="width:37px"', 'style="display:flex"' ).replace( '</div></nav>', `</div>${ SEARCH }</nav>` ), pairs, 'live' );
	assert.deepEqual( ls.nav.bare, { own: false, nested: [ 'burger', 'search' ] } );
	const run = { pairs: {} };
	const side = ( snap ) => ( { snap, log: [], structure: null, mainY: 0 } );
	compareState( run, side( ds ), side( ls ), { state: { name: 'rest' }, width: 375, cfg: {}, accept: [], tol: TOL, header: false, autoOn: false, pairsFor: () => pairs, origins: [], linksSeen: new Set(), allLiveLinks: [], unmatched: [], mispaired: [] } );
	assert.deepEqual( run.pairs.nav.diffs.filter( ( r ) => 'presence' === r.kind ).map( ( r ) => r.key ), [ 'element' ] );
} );

test( 'control: the draft nav paints a ground, so its box top is what shows, and the flow row stays', async () => {
	const ds = await readAll( ROW( 'height:100%;background:#eee' ), FLOW_PAIRS, 'draft' );
	const ls = await readAll( ROW( '' ), FLOW_PAIRS, 'live' );
	assert.ok( flowRows( ds, ls ).some( ( [ n, k ] ) => 'nav' === n && 'y-after-top' === k ), JSON.stringify( flowRows( ds, ls ) ) );
} );

test( 'control: the live nav is wider than its burger (120px against 48px), taking space of its own, and the presence row stays', async () => {
	const ds = await readAll( DRAFT_NAV(), NAV_PAIRS, 'draft' );
	const ls = await readAll( LIVE_NAV().replace( 'style="width:37px"', 'style="width:120px"' ), NAV_PAIRS, 'live' );
	assert.deepEqual( stateRows( ds, ls ), [ [ 'element', 'missing', 'present' ] ] );
} );
