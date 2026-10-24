// Walker Track W wave 4, lane w4-fix: the council's findings on sections 34, 35 and 38. One principle behind each: a
// property or state the walk did not read is never evidence that nothing changed. A state text colour is dropped only
// where neither side holds text and each shows only an image or its one judged svg (35); a one-sided transition entry
// only on a property read on both sides in every state the walk read (34); a pair's every-state set is unknown on a
// phone, without its rest, and in a partial run (34); a bare wrapper is walked through `display: contents` and
// `visibility: hidden`, a legacy `clip` paints, and a drop is recorded (38); the draft cache key carries the snapshot
// schema. W4_FIX_LIB points the tests at another lib folder (the red-first proof runs them against main's).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

const LIB = process.env.W4_FIX_LIB ? new URL( `file:///${ process.env.W4_FIX_LIB.replace( /\\/g, '/' ).replace( /\/?$/, '/' ) }` ) : new URL( '../lib/', import.meta.url );
const lib = ( f ) => import( new URL( f, LIB ).href );
const { resolveFinder, collectPair, hoverStyles, HOVER_PROPS } = await lib( 'collect.mjs' );
const { PAINT_SRC } = await lib( 'paint.mjs' );
const { comparePair } = await lib( 'compare.mjs' );
const { compareState } = await lib( 'compare-state.mjs' );
const { readOpts } = await lib( 'state-passes.mjs' );
const { everyStateChanges, everyStateMap } = await lib( 'state-changes.mjs' );

const { chromium } = await import( new URL( '../../computed-route/node_modules/playwright/index.mjs', import.meta.url ).href );
const RESOLVE = resolveFinder.toString();
const TOL = { px: 0.5, box: 2 };
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

// Every pair of `pairs` read on one page as the walker reads it (readOpts), at rest with `props` and, with `hover`, at the
// hover end state under a real pointer with `hoverProps` and the state passes' options; `active` copies the hover read.
const readAll = async ( html, pairs, side, { props = [ 'display', 'color', 'icon-fill', 'icon-stroke' ], hover = false, hoverProps = HOVER_PROPS } = {} ) => {
	const page = await browser.newPage( { viewport: { width: 1000, height: 600 } } );
	await page.setContent( `<!doctype html><html><head><style>a{text-decoration:none}</style></head><body style="margin:0">${ html }</body></html>` );
	const snap = {};
	for ( const p of pairs ) {
		snap[ p.name ] = await page.evaluate( collectPair, [ p[ side ], props, RESOLVE, null, null, null, PAINT_SRC, null, readOpts( pairs, p, side, () => props ) ] );
		if ( hover && ! snap[ p.name ].missing ) {
			await page.hover( p[ side ] );
			await page.waitForTimeout( 50 );
			snap[ p.name ].hover = await page.evaluate( hoverStyles, [ p[ side ], hoverProps, RESOLVE, PAINT_SRC, { ...readOpts( pairs, p, side, () => props ), icon: true } ] );
			snap[ p.name ].active = snap[ p.name ].hover;
			await page.mouse.move( 999, 599 );
		}
	}
	await page.close();
	return snap;
};
const ONE = [ { name: 'n', draft: '#n', live: '#n' } ];
const pairOf = async ( draft, live, opts ) => [ ( await readAll( draft, ONE, 'draft', opts ) ).n, ( await readAll( live, ONE, 'live', opts ) ).n ];
// The state rows on the properties these rules judge (text properties and the icon's colour).
const stateRows = ( d, l ) => comparePair( { text: false }, d, l, TOL ).filter( ( r ) => [ 'hover', 'active' ].includes( r.kind ) && /^(color|font-size|icon-fill|icon-stroke)$/.test( r.key ) ).map( ( r ) => [ r.kind, r.key ] );
const css = ( rules ) => `<style>${ rules }</style>`;
const SVG = ( fill, size = 'width="24" height="24"' ) => `<svg ${ size } viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="${ fill }"/></svg>`;
const IMG = `<img width="280" height="63" alt="" src="data:image/svg+xml,${ encodeURIComponent( '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="63"><rect width="280" height="63" fill="#d8ca50"/></svg>' ) }">`;
const RECOLOUR = '#n{color:rgb(0,0,0)}#n:hover{color:rgb(200,0,0)}';
const STILL = '#n{color:rgb(0,0,0)}';

// C1 and I1: section 35's rule.
test( 'MUST FAIL: a pair whose props omit `color` but whose link holds text keeps its hover colour row (draft red, live blue)', async () => {
	const BTN = ( c ) => `${ css( `#n{display:inline-block;background:#eee;border-radius:4px}#n a{color:rgb(0,0,0)}#n:hover a{color:${ c }}` ) }<div id="n"><a href="/">Shop now</a></div>`;
	const [ d, l ] = await pairOf( BTN( 'rgb(200,0,0)' ), BTN( 'rgb(0,0,200)' ), { props: [ 'background-color', 'border-radius' ], hover: true } );
	assert.equal( d.styles.color, undefined );
	assert.deepEqual( stateRows( d, l ), [ [ 'hover', 'color' ], [ 'active', 'color' ] ] );
} );

test( 'MUST FAIL: burger bars drawn with `background: currentColor` recolour on the draft only, and the colour row stays', async () => {
	const BURGER = ( rules ) => `${ css( `${ rules }#n{display:block;width:48px;height:48px;border:0;background:none}#n span{display:block;height:3px;margin:6px;background:currentColor}` ) }<button id="n" aria-label="Menu"><span></span><span></span><span></span></button>`;
	const [ d, l ] = await pairOf( BURGER( RECOLOUR ), BURGER( STILL ), { hover: true } );
	assert.equal( d.textFrom, 'none' );
	assert.equal( l.textFrom, 'none' );
	assert.deepEqual( stateRows( d, l ), [ [ 'hover', 'color' ], [ 'active', 'color' ] ] );
} );

test( 'MUST FAIL: a ::before icon glyph recolours on the draft only, and the colour row stays', async () => {
	const GLYPH = ( rules ) => `${ css( `${ rules }#n{display:inline-block;width:24px;height:24px}#n::before{content:"\\2630"}` ) }<a id="n" href="/" aria-label="Menu"></a>`;
	const [ d, l ] = await pairOf( GLYPH( RECOLOUR ), GLYPH( STILL ), { hover: true } );
	assert.equal( d.textFrom, 'none' );
	assert.deepEqual( stateRows( d, l ), [ [ 'hover', 'color' ], [ 'active', 'color' ] ] );
	// The glyph beside an image, on the element itself and on a child that generates no box of its own (display:
	// contents, whose ::before still paints): still a row.
	const BESIDE = ( rules, on ) => `${ css( `${ rules }#n{display:block;width:300px}#n .g{display:contents}${ on }::before{content:"\\2630"}` ) }<div id="n"><span class="g"></span>${ IMG }</div>`;
	for ( const on of [ '#n', '#n .g' ] ) {
		const [ d2, l2 ] = await pairOf( BESIDE( RECOLOUR, on ), BESIDE( STILL, on ), { hover: true } );
		assert.deepEqual( stateRows( d2, l2 ), [ [ 'hover', 'color' ], [ 'active', 'color' ] ], on );
	}
} );

test( 'MUST FAIL: an image framed by a `currentColor` border, or set beside an svg, recolours on the draft only, and the colour row stays', async () => {
	const FRAME = ( rules ) => `${ css( `${ rules }#n{display:block;width:300px}#n span{display:block;border:2px solid currentColor}` ) }<div id="n"><span>${ IMG }</span></div>`;
	const [ d, l ] = await pairOf( FRAME( RECOLOUR ), FRAME( STILL ), { hover: true } );
	assert.deepEqual( stateRows( d, l ), [ [ 'hover', 'color' ], [ 'active', 'color' ] ] );
	const MIXED = ( rules ) => `${ css( `${ rules }#n{display:block;width:300px}` ) }<div id="n">${ SVG( '#d8ca50' ) }${ IMG }</div>`;
	const [ d2, l2 ] = await pairOf( MIXED( RECOLOUR ), MIXED( STILL ), { hover: true } );
	assert.deepEqual( stateRows( d2, l2 ), [ [ 'hover', 'color' ], [ 'active', 'color' ] ] );
} );

test( 'MUST FAIL: one em-sized svg of literal fill grows on the draft hover only: its colour is judged by the icon read, its font-size row stays', async () => {
	const EM = ( size ) => `${ css( `#n{display:inline-block;font-size:16px;color:rgb(0,0,0)}#n svg{display:block;width:1em;height:1em}#n:hover{font-size:${ size }px;color:rgb(200,0,0)}` ) }<a id="n" href="/" aria-label="Search">${ SVG( '#d8ca50' ) }</a>`;
	const [ d, l ] = await pairOf( EM( 24 ), EM( 16 ).replace( 'color:rgb(200,0,0)', 'color:rgb(0,0,0)' ), { hover: true, hoverProps: [ ...HOVER_PROPS, 'font-size' ] } );
	assert.deepEqual( [ d.textless, l.textless ], [ 'svg', 'svg' ] );
	assert.deepEqual( stateRows( d, l ), [ [ 'hover', 'font-size' ], [ 'active', 'font-size' ] ] );
} );

test( 'control: both sides read an icon, so the icons judge the colour (draft currentColor recolours, live literal fill; the element colours differ)', async () => {
	const ICON = ( rules, fill ) => `${ css( rules ) }<a id="n" href="/" aria-label="Search">${ SVG( fill ) }</a>`;
	const [ d, l ] = await pairOf( ICON( RECOLOUR, 'currentColor' ), ICON( '#n{color:rgb(0,0,0)}#n:hover{color:rgb(0,0,200)}', 'rgb(0,0,0)' ), { hover: true } );
	assert.deepEqual( stateRows( d, l ), [ [ 'hover', 'icon-fill' ], [ 'active', 'icon-fill' ] ] );
} );

test( 'control: two currentColor icons recolouring alike on hover give no row', async () => {
	const ICON = `${ css( RECOLOUR ) }<a id="n" href="/" aria-label="Search">${ SVG( 'currentColor' ) }</a>`;
	const [ d, l ] = await pairOf( ICON, ICON, { hover: true } );
	assert.deepEqual( stateRows( d, l ), [] );
} );

test( 'MUST FAIL: two currentColor svgs (no one icon to judge) recolour and grow (1em) on the draft only: colour and font-size rows stay', async () => {
	const TWO = ( rules ) => `${ css( `${ rules }#n{display:inline-flex;font-size:16px}#n svg{width:1em;height:1em}#n:hover{font-size:${ rules === STILL ? 16 : 24 }px}` ) }<a id="n" href="/" aria-label="Share">${ SVG( 'currentColor' ) }${ SVG( 'currentColor' ) }</a>`;
	const [ d, l ] = await pairOf( TWO( RECOLOUR ), TWO( STILL ), { hover: true, hoverProps: [ ...HOVER_PROPS, 'font-size' ] } );
	assert.deepEqual( stateRows( d, l ), [ [ 'hover', 'color' ], [ 'hover', 'font-size' ], [ 'active', 'color' ], [ 'active', 'font-size' ] ] );
} );

test( 'MUST FAIL: the draft\'s one currentColor svg recolours against a live image (no live icon to compare with): the colour row stays', async () => {
	const [ d, l ] = await pairOf( `${ css( RECOLOUR ) }<div id="n" style="width:280px">${ SVG( 'currentColor', 'width="280" height="63"' ) }</div>`, `${ css( STILL ) }<div id="n" style="width:280px">${ IMG }</div>`, { hover: true } );
	assert.deepEqual( stateRows( d, l ), [ [ 'hover', 'color' ], [ 'active', 'color' ] ] );
	assert.deepEqual( [ d.textless, l.textless ], [ 'svg', 'replaced' ] );
} );

test( 'control: the Indus logo shape (a custom element holding an svg of literal fills against a div holding an image in a link) still drops', async () => {
	const draft = `${ css( '#n{display:block;height:63px;aspect-ratio:3741 / 848;color:rgb(30,42,60)}#n:hover{color:rgb(7,94,128)}#n svg{display:block;width:100%;height:100%}' ) }<a href="/"><indus-logo id="n" role="img" aria-label="Indus Foods Ltd">${ SVG( '#d8ca50', 'width="280" height="63"' ) }</indus-logo></a>`;
	const live = `${ css( '#n{display:block;color:rgb(30,42,60)}' ) }<div id="n"><a href="/"><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Indus Foods</span>${ IMG }</a></div>`;
	const [ d, l ] = await pairOf( draft, live, { hover: true } );
	assert.notEqual( d.hover.color, l.hover.color );
	assert.deepEqual( stateRows( d, l ), [] );
	assert.deepEqual( [ d.textless, l.textless ], [ 'svg', 'replaced' ] );
} );

test( 'control: a font size on an image-only element paints nothing and is dropped', async () => {
	const IMGS = ( rules ) => `${ css( `${ rules }#n{display:block;width:280px;font-size:16px}#n:hover{font-size:${ rules === STILL ? 16 : 20 }px}` ) }<div id="n">${ IMG }</div>`;
	const [ d, l ] = await pairOf( IMGS( RECOLOUR ), IMGS( STILL ), { hover: true, hoverProps: [ ...HOVER_PROPS, 'font-size' ] } );
	assert.deepEqual( stateRows( d, l ), [] );
} );

// I2, I3, I4, I5, M3: the every-state set (section 34).
const longhands = ( t ) => {
	const parts = 'none' === t ? [] : t.split( /,(?![^(]*\))/ ).map( ( p ) => p.trim() );
	const time = ( p ) => p.match( /(^|\s)([\d.]+m?s)/ )?.[ 2 ] ?? '0s';
	return { 'transition-duration': parts.map( time ).join( ', ' ) || '0s', 'transition-delay': parts.map( () => '0s' ).join( ', ' ) || '0s', 'transition-timing-function': parts.map( () => 'ease' ).join( ', ' ) || 'ease' };
};
const KEYS = [ 'color', 'background-color', 'opacity', 'transform' ];
const side = ( transition, { styles = {}, hover = {}, noHover = false, extraRead = [] } = {} ) => {
	const rest = { color: 'rgb(0, 0, 0)', 'background-color': 'rgba(0, 0, 0, 0)', opacity: '1', transform: 'none', ...longhands( transition ), ...styles };
	const read = ( extra ) => ( { ...Object.fromEntries( [ ...KEYS, ...extraRead ].map( ( k ) => [ k, rest[ k ] ] ) ), ...extra } );
	return { box: { x: 0, y: 0, w: 100, h: 40 }, styles: rest, motion: { animation: 'none', transition }, keyframes: 'none', ...( noHover ? { noHover: true } : { hover: read( hover ), active: read( {} ) } ) };
};
const rows = ( d, l, every ) => comparePair( { name: 'p', text: false, pseudo: false }, d, l, TOL, every ).filter( ( r ) => /transition/.test( r.key ) ).map( ( r ) => `${ r.kind } ${ r.key }` );
const changesOf = ( every ) => [ ...( Array.isArray( every ) ? every : every.changes ) ].sort();

test( 'MUST FAIL: a draft `visibility 0s .3s` hide-after-fade against a live opacity-only fade is a row (visibility is read in no state)', () => {
	const d = side( 'opacity 0.3s, visibility 0s linear 0.3s', { hover: { opacity: '0' } } );
	const l = side( 'opacity 0.3s', { hover: { opacity: '0' } } );
	const every = everyStateChanges( [ { d, l }, { d, l } ] );
	assert.deepEqual( changesOf( every ), [ 'opacity' ] );
	assert.ok( rows( d, l, every ).includes( 'motion transition' ), rows( d, l, every ).join() );
} );

test( 'control: the same one-sided entry on a property read at rest and in every state read, and moving nowhere, is dropped', () => {
	const d = side( 'opacity 0.3s, background-color 0.3s', { hover: { opacity: '0' } } );
	const l = side( 'opacity 0.3s', { hover: { opacity: '0' } } );
	assert.deepEqual( rows( d, l, everyStateChanges( [ { d, l }, { d, l } ] ) ), [] );
	// Read at rest but not in the hover read, the pressed read or a landed focus read: compared.
	const narrowed = [ ( x ) => ( { ...x, hover: { opacity: '0' } } ), ( x ) => ( { ...x, active: { opacity: '1' } } ), ( x ) => ( { ...x, focus: { landed: true, styles: { opacity: '1' }, rest: { opacity: '1' } } } ) ];
	for ( const narrow of narrowed ) {
		const [ nd, nl ] = [ narrow( d ), narrow( l ) ];
		assert.ok( rows( nd, nl, everyStateChanges( [ { d: nd, l: nl }, { d: nd, l: nl } ] ) ).includes( 'motion transition' ) );
	}
	// A logical name is read as the physical longhand it sets.
	const [ ld, ll ] = [ side( 'opacity 0.3s, padding-block-start 0.3s', { styles: { 'padding-top': '0px' }, hover: { opacity: '0' }, extraRead: [ 'padding-top' ] } ), side( 'opacity 0.3s', { styles: { 'padding-top': '0px' }, hover: { opacity: '0' }, extraRead: [ 'padding-top' ] } ) ];
	assert.deepEqual( rows( ld, ll, everyStateChanges( [ { d: ld, l: ll } ] ) ), [] );
} );

test( 'MUST FAIL: a focus that changes the background is a change, so a one-sided background entry is compared', () => {
	const focus = ( x ) => ( { ...x, focus: { landed: true, styles: { 'background-color': 'rgb(255, 255, 0)' }, rest: { 'background-color': 'rgba(0, 0, 0, 0)' } } } );
	const d = focus( side( 'opacity 0.3s, background-color 0.3s', { hover: { opacity: '0' } } ) );
	const l = focus( side( 'opacity 0.3s', { hover: { opacity: '0' } } ) );
	const every = everyStateChanges( [ { d, l } ] );
	assert.ok( changesOf( every ).includes( 'background-color' ) );
	assert.ok( rows( d, l, every ).includes( 'motion transition' ) );
} );

test( 'MUST FAIL: a one-sided `border-color` entry is compared where only the top border colour is read in the states', () => {
	const d = side( 'opacity 0.3s', { styles: { 'border-top-color': 'rgb(0, 0, 0)' }, extraRead: [ 'border-top-color' ] } );
	const l = side( 'opacity 0.3s, border-color 0.3s', { styles: { 'border-top-color': 'rgb(0, 0, 0)' }, extraRead: [ 'border-top-color' ] } );
	assert.ok( rows( d, l, everyStateChanges( [ { d, l } ] ) ).includes( 'motion transition' ) );
} );

test( 'MUST FAIL: where nothing moves, a timing longhand row stays for a transition on a property no state read holds', () => {
	const [ d, l ] = [ side( 'visibility 0.3s' ), side( 'visibility 0.2s' ) ];
	assert.deepEqual( rows( d, l, everyStateChanges( [ { d, l } ] ) ), [ 'style transition-duration', 'motion transition' ] );
	const [ rd, rl ] = [ side( 'opacity 0.3s' ), side( 'opacity 0.2s' ) ];
	assert.deepEqual( rows( rd, rl, everyStateChanges( [ { d: rd, l: rl } ] ) ), [ 'motion transition' ] );
} );

test( 'MUST FAIL: two states on a phone (no hover, focus or pointer press read) give no known set, so a one-sided entry is compared', () => {
	const d = side( 'color 0.2s', { noHover: true } );
	const l = side( 'color 0.2s, background-color 0.2s', { noHover: true } );
	const every = everyStateChanges( [ { d, l }, { d, l } ] );
	assert.equal( every, null );
	assert.ok( rows( d, l, every ).includes( 'motion transition' ) );
} );

test( 'MUST FAIL: a pair read only in a later state (a drawer pair in menu-open) has no known set; and a partial run has no map', () => {
	const d = side( 'transform 0.3s' );
	const l = side( 'transform 0.3s, background-color 0.3s' );
	const drawer = { name: 'drawer', states: [ 'menu-open' ] };
	const states = [ { name: 'rest' }, { name: 'menu-open' } ];
	const pairsFor = ( st ) => [ drawer ].filter( ( x ) => x.states.includes( st.name ) );
	const snaps = { rest: { snap: {} }, 'menu-open': { snap: { drawer: d } } };
	const live = { rest: { snap: {} }, 'menu-open': { snap: { drawer: l } } };
	const map = everyStateMap( states, snaps, live, pairsFor );
	assert.equal( map.drawer, null );
	assert.ok( rows( d, l, map.drawer ).includes( 'motion transition' ) );
	const p = { name: 'p' };
	const both = { rest: { snap: { p: d } }, 'menu-open': { snap: { p: d } } };
	const bothLive = { rest: { snap: { p: l } }, 'menu-open': { snap: { p: l } } };
	assert.notEqual( everyStateMap( states, both, bothLive, () => [ p ] ).p, null );
	assert.deepEqual( everyStateMap( [ states[ 1 ] ], { 'menu-open': both[ 'menu-open' ] }, { 'menu-open': bothLive[ 'menu-open' ] }, () => [ p ], { partial: true } ), {} );
} );

test( 'MUST FAIL: a property read in one state only (`top` on a header that becomes fixed when scrolled) is a change', () => {
	const d = side( 'top 0.3s' );
	const fixed = side( 'top 0.3s', { styles: { top: '0px' } } );
	assert.ok( changesOf( everyStateChanges( [ { d, l: d }, { d, l: fixed } ] ) ).includes( 'top' ) );
} );

// I6, M1, M2: section 38's bare wrapper.
const NAV_PAIRS = [ { name: 'nav', text: false, draft: '#nav', live: '#nav' }, { name: 'burger', text: false, draft: '#burger', live: '#burger' } ];
const BURGER = '<button id="burger" style="display:block;width:48px;height:48px;border:0;background:#d8ca50" aria-label="Open menu"></button>';
const DRAFT_NAV = `<header style="display:flex;justify-content:space-between;padding:10px"><a href="/">Logo</a>${ BURGER }</header>`;
const LIVE_NAV = ( inner, navStyle = 'width:37px' ) => `<header style="display:flex;justify-content:space-between;padding:10px"><a href="/">Logo</a><nav id="nav" aria-label="header" style="${ navStyle }">${ inner }</nav></header>`;
const bareRun = async ( live ) => {
	const ds = await readAll( DRAFT_NAV, NAV_PAIRS, 'draft' );
	const ls = await readAll( live, NAV_PAIRS, 'live' );
	const run = { pairs: {} };
	const at = ( snap ) => ( { snap, log: [], structure: null, mainY: 0 } );
	compareState( run, at( ds ), at( ls ), { state: { name: 'rest' }, width: 375, cfg: {}, accept: [], tol: TOL, header: false, autoOn: false, pairsFor: () => NAV_PAIRS, origins: [], linksSeen: new Set(), allLiveLinks: [], unmatched: [], mispaired: [] } );
	return run.pairs.nav;
};
const presence = ( nav ) => nav.diffs.filter( ( r ) => 'presence' === r.kind ).map( ( r ) => [ r.key, r.draft, r.live ] );

test( 'MUST FAIL: a link under a `display: contents` box inside the live wrapper shows, and the presence row stays', async () => {
	// The nav lays out in a row: the burger first, the link overflowing the 37px box, so the box stays within the burger's.
	const nav = await bareRun( LIVE_NAV( `<div>${ BURGER }</div><div style="display:contents"><a href="/account" style="flex:none">Account</a></div>`, 'width:37px;display:flex' ) );
	assert.ok( nav.live.box.h <= 48 );
	assert.deepEqual( presence( nav ), [ [ 'element', 'missing', 'present' ] ] );
} );

test( 'MUST FAIL: a `visibility: visible` link under a `visibility: hidden` box shows, and the presence row stays', async () => {
	const nav = await bareRun( LIVE_NAV( `<div>${ BURGER }</div><div style="visibility:hidden;flex:none"><a href="/account" style="visibility:visible">Account</a></div>`, 'width:37px;display:flex' ) );
	assert.ok( nav.live.box.h <= 48 );
	assert.deepEqual( presence( nav ), [ [ 'element', 'missing', 'present' ] ] );
} );

test( 'MUST FAIL: a live wrapper clipped by the legacy `clip` property paints, and the presence row stays', async () => {
	const nav = await bareRun( LIVE_NAV( `<div>${ BURGER }</div>`, 'width:37px;position:absolute;clip:rect(0px, 30px, 48px, 0px)' ) );
	assert.deepEqual( presence( nav ), [ [ 'element', 'missing', 'present' ] ] );
} );

test( 'MUST FAIL: a presence row the bare-wrapper rule drops is recorded on the pair; hidden content stays out of `own`', async () => {
	const nav = await bareRun( LIVE_NAV( `<div style="visibility:hidden;position:absolute"><a href="/account">Account</a></div><div style="display:contents">${ BURGER }</div>` ) );
	assert.deepEqual( presence( nav ), [] );
	assert.deepEqual( nav.dropped, [ { kind: 'presence', key: 'element', draft: 'missing', live: 'present', rule: 'bare-wrapper', nested: [ 'burger' ] } ] );
} );

// I7: the draft cache key.
test( 'MUST FAIL: the draft cache key carries the snapshot schema, so a cache written before it is never read', async () => {
	const { draftCacheKey, currentEntries, SNAPSHOT_VERSION } = await lib( 'draft-cache.mjs' );
	const args = { config: 'header', width: 1440, states: null, lean: false, self: false };
	const old = JSON.stringify( args );
	assert.notEqual( draftCacheKey( args ), old );
	assert.equal( JSON.parse( draftCacheKey( args ) ).snapshot, SNAPSHOT_VERSION );
	assert.deepEqual( Object.keys( currentEntries( { [ old ]: {}, [ draftCacheKey( args ) ]: {} } ) ), [ draftCacheKey( args ) ] );
} );
