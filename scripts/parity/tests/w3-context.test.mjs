// Track W context reads: direction, column-count and column-width are read on every pair (an equivalence rule judges
// `text-align: start|end` and a block container's `justify-content` from them) and never compared themselves
// (collect.mjs::CONTEXT_PROPS, compare.mjs::comparePair).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROPS, CONTEXT_PROPS, resolveFinder, collectPair } from '../lib/collect.mjs';
import { PAINT_SRC } from '../lib/paint.mjs';
import { comparePair } from '../lib/compare.mjs';

const { chromium } = await import( new URL( '../../computed-route/node_modules/playwright/index.mjs', import.meta.url ).href );
const RESOLVE = resolveFinder.toString();
const TOL = { px: 0.5, box: 2 };
const WIDTHS = [ 375, 768, 1440 ];
const CONTEXT = [ 'direction', 'column-count', 'column-width' ];
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const read = async ( html, width = 1000 ) => {
	const page = await browser.newPage( { viewport: { width, height: 600 } } );
	await page.setContent( `<!doctype html><html><body style="margin:0">${ html }</body></html>` );
	const out = await page.evaluate( collectPair, [ '#t', DEFAULT_PROPS, RESOLVE, null, null, null, PAINT_SRC, null ] );
	await page.close();
	return out;
};
const box = ( style ) => `<div id="t" style="width:200px;height:60px;${ style }"><p style="margin:0">x</p></div>`;
const rows = ( d, l ) => comparePair( { text: false, box: [] }, d, l, TOL ).filter( ( r ) => 'style' === r.kind ).map( ( r ) => r.key );

test( 'MUST FAIL: the walker reads direction, column-count and column-width on both sides of a pair at 375, 768 and 1440', async () => {
	assert.deepEqual( [ ...CONTEXT_PROPS ].sort(), [ ...CONTEXT ].sort() );
	for ( const p of CONTEXT ) {
		assert.ok( DEFAULT_PROPS.includes( p ), `walker reads ${ p }` );
	}
	for ( const w of WIDTHS ) {
		for ( const side of [ box( '' ), box( 'column-count:3;column-width:80px;direction:rtl' ) ] ) {
			const snap = await read( side, w );
			for ( const p of CONTEXT ) {
				assert.equal( typeof snap.styles[ p ], 'string', `${ p } read at ${ w }` );
			}
		}
	}
} );

test( 'MUST FAIL: a planted direction: rtl element reads rtl, a plain one ltr, and the columns read their computed values', async () => {
	const rtl = await read( box( 'direction:rtl;column-count:3;column-width:80px' ) );
	assert.equal( rtl.styles.direction, 'rtl' );
	assert.equal( rtl.styles[ 'column-count' ], '3' );
	assert.equal( rtl.styles[ 'column-width' ], '80px' );
	const plain = await read( box( '' ) );
	assert.equal( plain.styles.direction, 'ltr' );
	assert.equal( plain.styles[ 'column-count' ], 'auto' );
	assert.equal( plain.styles[ 'column-width' ], 'auto' );
} );

test( 'MUST FAIL: a pair differing only in direction, column-count and column-width raises no row; a real difference beside them still does', async () => {
	const plain = await read( box( '' ) );
	const ctx = await read( box( 'direction:rtl;column-count:3;column-width:80px' ) );
	for ( const p of CONTEXT ) {
		assert.notEqual( plain.styles[ p ], ctx.styles[ p ], `${ p } differs between the sides` );
	}
	assert.deepEqual( rows( plain, ctx ), [] );
	const red = await read( box( 'direction:rtl;column-count:3;column-width:80px;color:rgb(200,0,0)' ) );
	assert.deepEqual( rows( plain, red ), [ 'color' ], 'control: the real difference is the only row' );
} );
