// Walker Track W wave 2 fix 2, in headless Chromium on local HTML. A pair holding another pair reads its first text
// outside every inner pair, a nested block's included: text no pair owns belongs to the nearest enclosing pair (the route
// walks --lean, with no auto word check to catch it). Where one side's text is that nested text and the other side paints
// no text there (a wordmark drawn as an image), the pair is one `text presence` row, never a font row per property.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROPS, resolveFinder, collectPair, hoverStyles } from '../lib/collect.mjs';
import { PAINT_SRC } from '../lib/paint.mjs';
import { comparePair } from '../lib/compare.mjs';
import { collectAuto } from '../lib/auto-collect.mjs';
import { compareAuto } from '../lib/auto-compare.mjs';

const { chromium } = await import( new URL( '../../computed-route/node_modules/playwright/index.mjs', import.meta.url ).href );
const RESOLVE = resolveFinder.toString();
const TOL = { px: 0.5, box: 2 };
const TEXT = new Set( [ 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'color', 'text-shadow', 'text presence' ] );
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const read = async ( html, pairs ) => {
	const page = await browser.newPage( { viewport: { width: 1000, height: 600 } } );
	await page.setContent( `<!doctype html><html><body style="margin:0">${ html }</body></html>` );
	const out = {};
	for ( const [ name, finder ] of Object.entries( pairs ) ) {
		const others = Object.entries( pairs ).filter( ( [ n ] ) => n !== name ).map( ( [ , f ] ) => f );
		const opts = { others, textOthers: others, paintPart: true };
		out[ name ] = await page.evaluate( collectPair, [ finder, DEFAULT_PROPS, RESOLVE, null, null, null, PAINT_SRC, null, opts ] );
		const rest = await page.evaluate( hoverStyles, [ finder, [ 'color' ], RESOLVE, PAINT_SRC, opts ] );
		out[ name ].hover = rest;
	}
	out.__auto = await page.evaluate( collectAuto, [ {}, [], 4000 ] );
	await page.close();
	return out;
};
const rows = ( d, l ) => comparePair( { text: false, box: [] }, d, l, TOL ).filter( ( r ) => TEXT.has( r.key ) ).map( ( r ) => [ r.kind, r.key, r.draft, r.live ] );

const HEADER = ( font ) => `<div id="root"><a style="display:flex"><span style="font-family:${ font };font-size:24px;line-height:40px">BRAND</span><span id="tag" style="font-size:12px">tagline</span></a></div>`;

test( 'MUST FAIL (rater A): a wordmark in a nested block beside an inner pair is the root\'s text, so Georgia against Arial is a row', async () => {
	const d = await read( HEADER( 'Georgia' ), { root: '#root', tag: '#tag' } );
	const l = await read( HEADER( 'Arial' ), { root: '#root', tag: '#tag' } );
	assert.deepEqual( rows( d.root, l.root ), [ [ 'style', 'font-family', 'Georgia', 'Arial' ] ] );
	assert.equal( d.root.textFrom, 'nested' );
	assert.deepEqual( rows( d.tag, l.tag ), [], 'the inner pair\'s text is still its own' );
} );

// The Eye Care header (N11): the draft wordmark is words in the logo link beside an inner pair, the live one an image.
const DRAFT_N11 = `<div id="root" style="font-family:serif;color:rgb(0,0,0)"><div style="display:grid;grid-template-columns:auto auto">
	<a style="display:flex;font-family:'Playfair Display',serif;color:rgb(20,20,20)"><span>EYE CARE</span><span id="bm">BIRMINGHAM</span></a>
	<div><button style="font-family:monospace">0</button></div></div></div>`;
const LIVE_N11 = `<div id="root" style="font-family:serif;color:rgb(0,0,0)"><div style="display:grid;grid-template-columns:auto auto">
	<a><img alt="Eye Care Birmingham" width="80" height="20" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></a>
	<div id="right"><button style="font-family:monospace">Bag 0</button></div></div></div>`;

test( 'N11: nested text on one side and no text on the other is one text presence row, no font rows and no hover colour row', async () => {
	const d = await read( DRAFT_N11, { root: '#root', inner: '#bm' } );
	const l = await read( LIVE_N11, { root: '#root', inner: '#right' } );
	assert.equal( l.root.textFrom, 'none' );
	const withHover = ( s ) => ( { ...s, hover: { color: s.hover.color } } );
	assert.deepEqual( rows( withHover( d.root ), withHover( l.root ) ), [ [ 'style', 'text presence', 'text', 'none' ] ] );
	assert.deepEqual( rows( withHover( l.root ), withHover( d.root ) ), [ [ 'style', 'text presence', 'none', 'text' ] ], 'either way round' );
} );

test( 'control: nested text on both sides compares normally, and own text against no text keeps its font rows', async () => {
	const d = await read( DRAFT_N11, { root: '#root', inner: '#bm' } );
	const l = await read( DRAFT_N11.replace( "'Playfair Display'", 'Arial' ), { root: '#root', inner: '#bm' } );
	assert.deepEqual( rows( d.root, l.root ), [ [ 'style', 'font-family', '"Playfair Display", serif', 'Arial, serif' ] ] );
	// Own text (laid out by the pair itself) against none is not the nested case: every text property stays a row.
	const own = await read( '<div id="root"><b style="font-size:20px">Own</b><nav id="nav"><a>Home</a></nav></div>', { root: '#root', nav: '#nav' } );
	const none = await read( '<div id="root"><nav id="nav"><a>Home</a></nav></div>', { root: '#root', nav: '#nav' } );
	assert.equal( own.root.textFrom, 'own' );
	const r = rows( own.root, none.root );
	assert.ok( r.length > 1 && ! r.some( ( x ) => 'text presence' === x[ 1 ] ), JSON.stringify( r ) );
} );

test( 'MUST FAIL: the auto word check compares line-height', async () => {
	const page = ( lh ) => `<p style="line-height:${ lh }">Opening hours today</p>`;
	const d = await read( page( '40px' ), {} );
	const l = await read( page( '20px' ), {} );
	const r = compareAuto( d.__auto, l.__auto ).filter( ( x ) => /line-height/.test( x.key ) ).map( ( x ) => [ x.draft, x.live ] );
	assert.deepEqual( r, [ [ '40px', '20px' ] ] );
	// Control: normal reads as the pixels it paints, so a numeric value equal to it is no row.
	const n = await read( '<p style="font:16px Arial;line-height:normal">Same words</p>', {} );
	const px = n.__auto.words[ 0 ].lh;
	assert.match( px, /^[\d.]+px$/ );
	const m = await read( `<p style="font:16px Arial;line-height:${ px }">Same words</p>`, {} );
	assert.deepEqual( compareAuto( n.__auto, m.__auto ).filter( ( x ) => /line-height/.test( x.key ) ), [] );
} );
