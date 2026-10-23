// Walker W15 (Track W wave 2), in headless Chromium on local HTML.
// N11: a root pair read the draft wordmark's text properties while the live read found no text of its own (Eye Care
// header, gen-header-1, mega-shop @375: draft "Playfair Display", serif / live null). An element holding another
// text-reading pair owns only the text it lays out itself (paint.mjs::textCarrier), on both sides alike.
// Gaps: a one-child flex row's gap paints nothing, so it never reads against a block box's 0 (paint.mjs::layoutComparable
// over collect.mjs::collectPair's layoutChildren); a gap between two or more flex or grid items still compares.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROPS, resolveFinder, collectPair, hoverStyles } from '../lib/collect.mjs';
import { PAINT_SRC, layoutComparable } from '../lib/paint.mjs';
import { comparePair } from '../lib/compare.mjs';

const { chromium } = await import( new URL( '../../computed-route/node_modules/playwright/index.mjs', import.meta.url ).href );
const RESOLVE = resolveFinder.toString();
const TOL = { px: 0.5, box: 2 };
const TEXT = [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow' ];
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

// Reads each named pair on one page: `pairs` maps a name to its finder; every other pair owns its text (as readOpts gives
// on a ref-traced walk, where every pair reads text properties).
const read = async ( html, pairs, props = DEFAULT_PROPS ) => {
	const page = await browser.newPage( { viewport: { width: 1000, height: 600 } } );
	await page.setContent( `<!doctype html><html><body style="margin:0">${ html }</body></html>` );
	const out = {};
	for ( const [ name, finder ] of Object.entries( pairs ) ) {
		const others = Object.entries( pairs ).filter( ( [ n ] ) => n !== name ).map( ( [ , f ] ) => f );
		const opts = { others, textOthers: others, paintPart: true };
		out[ name ] = await page.evaluate( collectPair, [ finder, props, RESOLVE, null, null, null, PAINT_SRC, null, opts ] );
		out[ name ].hoverColour = ( await page.evaluate( hoverStyles, [ finder, [ 'color' ], RESOLVE, PAINT_SRC, opts ] ) ).color;
	}
	await page.close();
	return out;
};
const textRows = ( d, l ) => comparePair( { text: false, box: [] }, d, l, TOL ).filter( ( r ) => TEXT.includes( r.key ) );
const gapRows = ( d, l ) => comparePair( { text: false, box: [] }, d, l, TOL ).filter( ( r ) => /gap$/.test( r.key ) );

// The Eye Care header in the mega-shop state: the draft wordmark's words sit in the logo link beside the span another pair
// measures, the bag count in a button no pair measures; live paints its wordmark as an image and its bag inside the pair.
const DRAFT_HEADER = `<div id="root" style="font-family:serif;color:rgb(0,0,0)"><div style="display:grid;grid-template-columns:auto auto">
	<a style="display:flex;font-family:'Playfair Display',serif;color:rgb(20,20,20)"><span>EYE CARE</span><span id="bm">BIRMINGHAM</span></a>
	<div><button style="font-family:monospace">0</button></div></div></div>`;
const LIVE_HEADER = `<div id="root" style="font-family:serif;color:rgb(0,0,0)"><div style="display:grid;grid-template-columns:auto auto">
	<a><img alt="Eye Care Birmingham" width="80" height="20" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></a>
	<div id="right"><button style="font-family:monospace">Bag 0</button></div></div></div>`;

test( 'MUST FAIL (N11, Eye Care gen-header-1 mega-shop @375): a root whose words sit in nested blocks beside another pair reads text on neither side', async () => {
	const draft = await read( DRAFT_HEADER, { root: '#root', inner: '#bm' } );
	const live = await read( LIVE_HEADER, { root: '#root', inner: '#right' } );
	assert.equal( live.root.styles[ 'font-family' ], undefined, 'live: the only words are the inner pair\'s' );
	assert.equal( draft.root.styles[ 'font-family' ], undefined, 'draft: the wordmark words are not the root\'s own either' );
	assert.deepEqual( textRows( draft.root, live.root ), [] );
	assert.equal( draft.root.hoverColour, live.root.hoverColour, 'the hover read takes the same rule' );
} );

test( 'control: a root holding another pair still owns the text it lays out itself, and a font that differs is a row', async () => {
	const page = ( font ) => `<div id="root"><span style="font-family:${ font }">Wholesale</span> <b>only</b><nav id="nav"><a>Home</a></nav></div>`;
	const draft = await read( page( 'serif' ), { root: '#root', nav: '#nav' } );
	const live = await read( page( 'sans-serif' ), { root: '#root', nav: '#nav' } );
	assert.equal( draft.root.styles[ 'font-family' ], 'serif' );
	assert.deepEqual( textRows( draft.root, live.root ).map( ( r ) => [ r.key, r.draft, r.live ] ), [ [ 'font-family', 'serif', 'sans-serif' ] ] );
	// Own text reached through a box laid out with display: contents counts as the root's own too.
	const contents = await read( '<div id="root"><span style="display:contents"><i style="font-size:21px">Own</i></span><nav id="nav"><a>Home</a></nav></div>', { root: '#root', nav: '#nav' } );
	assert.equal( contents.root.styles[ 'font-size' ], '21px' );
} );

test( 'control: a pair holding no other pair reads its first text however deep (a button label in a span in a div)', async () => {
	const draft = await read( '<button id="b"><div><span style="font-size:19px">Buy</span></div></button>', { b: '#b' } );
	assert.equal( draft.b.styles[ 'font-size' ], '19px' );
} );

test( 'control: a root whose words all belong to inner pairs reads text on neither side', async () => {
	const side = ( size ) => `<div id="root"><div><p id="p" style="font-size:${ size }">Words</p></div></div>`;
	const draft = await read( side( '13px' ), { root: '#root', p: '#p' } );
	const live = await read( side( '15px' ), { root: '#root', p: '#p' } );
	assert.deepEqual( textRows( draft.root, live.root ), [] );
	assert.ok( textRows( draft.p, live.p ).some( ( r ) => 'font-size' === r.key ), 'the owner still compares them' );
} );

const GAPS = [ 'gap', 'row-gap', 'column-gap', 'display' ];

test( 'MUST FAIL (Track R r11 section 2, Indus Register button @768): a one-child flex row\'s 8px gap is no row against a block box\'s 0', async () => {
	const draft = await read( '<a id="b" style="display:inline-flex;gap:8px">Register For A Trade Account</a>', { b: '#b' }, GAPS );
	const live = await read( '<a id="b" style="display:block;gap:8px"><span>Register For A Trade Account</span></a>', { b: '#b' }, GAPS );
	assert.equal( draft.b.layoutChildren, 1, 'one text item' );
	assert.equal( live.b.layoutChildren, 1 );
	assert.deepEqual( gapRows( draft.b, live.b ), [] );
} );

test( 'layoutChildren counts the in-flow rendered items: a text run is one, an out-of-flow or undisplayed child none', async () => {
	const s = await read( `<div id="a" style="display:flex"><span>a</span><span style="position:absolute">b</span><span style="display:none">c</span></div>
		<a id="b" style="display:flex"><svg width="10" height="10"></svg> Label</a><div id="c" style="display:flex"> </div>`, { a: '#a', b: '#b', c: '#c' }, GAPS );
	assert.deepEqual( [ s.a.layoutChildren, s.b.layoutChildren, s.c.layoutChildren ], [ 1, 2, 0 ] );
} );

test( 'control: a two-child flex row with an 8px gap against 16px is still a row, and so is one against a block stack', async () => {
	const row = ( disp, gap ) => `<div id="r" style="display:${ disp };gap:${ gap }"><span>One</span><span>Two</span></div>`;
	const d = ( await read( row( 'flex', '8px' ), { r: '#r' }, GAPS ) ).r;
	const l = ( await read( row( 'flex', '16px' ), { r: '#r' }, GAPS ) ).r;
	assert.deepEqual( gapRows( d, l ).map( ( r ) => [ r.key, r.draft, r.live ] ), [ [ 'gap', '8px', '16px' ], [ 'row-gap', '8px', '16px' ], [ 'column-gap', '8px', '16px' ] ] );
	const block = ( await read( row( 'block', '8px' ), { r: '#r' }, GAPS ) ).r;
	assert.deepEqual( gapRows( d, block ).map( ( r ) => r.live ), [ '0px', '0px', '0px' ] );
	// Either side laying out two items is enough, whichever it is.
	assert.deepEqual( gapRows( block, d ).map( ( r ) => r.draft ), [ '0px', '0px', '0px' ] );
} );

test( 'layoutComparable on snapshots: gaps compare only where a side lays out two or more items with flex or grid; a snapshot without layoutChildren still compares', () => {
	const s = ( layoutDisplay, layoutChildren ) => ( { layoutDisplay, layoutChildren, styles: {} } );
	assert.equal( layoutComparable( 'gap', s( 'flex', 1 ), s( 'block', 1 ) ), false );
	assert.equal( layoutComparable( 'column-gap', s( 'inline-flex', 1 ), s( 'grid', 1 ) ), false );
	assert.equal( layoutComparable( 'gap', s( 'block', 3 ), s( 'block', 2 ) ), false, 'block flow lays out no flex or grid items' );
	assert.equal( layoutComparable( 'gap', s( 'flex', 2 ), s( 'block', 1 ) ), true );
	assert.equal( layoutComparable( 'row-gap', s( 'block', 1 ), s( 'grid', 2 ) ), true );
	assert.equal( layoutComparable( 'gap', s( 'flex', 1 ), { styles: {} } ), true );
	assert.equal( layoutComparable( 'gap', { styles: {} }, s( 'flex', 1 ) ), true );
} );
