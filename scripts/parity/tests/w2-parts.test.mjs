// Walker Track W wave 2 fix 3: parts never pair across two known destinations that differ (lib/parts.mjs::pairParts, in
// every round); unnamed links pair by destination before place, and wordless parts that swap places are an `order` row;
// a repeated name's copy index is its own field (`dup`), so a real "#1" in a name stays part of the name.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compareParts, pairParts, readParts } from '../lib/parts.mjs';
import { resolveFinder } from '../lib/collect.mjs';

const TOL = { px: 0.5, box: 2 };
const P = ( name, href, x, extra = {} ) => ( { name, kind: 'link', href, pos: { x, y: 0.5 }, box: { w: 24, h: 24 }, root: false, rest: { color: 'rgb(0,0,0)' }, hover: { color: 'rgb(0,0,0)' }, layers: { rest: [], hover: [] }, effects: {}, ...extra } );
const keys = ( rows ) => rows.map( ( r ) => `${ r.key } | ${ r.draft } | ${ r.live }` );

test( 'MUST FAIL (rater A): swapped unnamed social icons pair by destination and their swap is a row', () => {
	const d = [ P( '(unnamed a)', 'instagram.com/x', 0.1 ), P( '(unnamed a)', 'facebook.com/x', 0.2, { dup: 1 } ) ];
	const l = [ P( '(unnamed a)', 'facebook.com/x', 0.1 ), P( '(unnamed a)', 'instagram.com/x', 0.2, { dup: 1 } ) ];
	assert.deepEqual( keys( compareParts( d, l, TOL ) ), [ '(unnamed a) order | 1 of 2 | 2 of 2', '(unnamed a)#1 order | 2 of 2 | 1 of 2' ] );
	assert.deepEqual( pairParts( d, l ).pairs.map( ( [ a, b ] ) => [ a.href, b.href ] ), [ [ 'instagram.com/x', 'instagram.com/x' ], [ 'facebook.com/x', 'facebook.com/x' ] ] );
	// An unnamed link pairs its destination before a nearer unnamed link with none.
	const one = [ P( '(unnamed a)', 'instagram.com/x', 0.1 ) ];
	const two = [ P( '(unnamed a)', null, 0.1 ), P( '(unnamed a)', 'instagram.com/x', 0.5, { dup: 1 } ) ];
	assert.deepEqual( keys( compareParts( one, two, TOL ) ), [ '(unnamed a) presence | missing | present' ] );
} );

test( 'MUST FAIL (rater A): one name with two different destinations is never a pair', () => {
	assert.deepEqual( keys( compareParts( [ P( 'shop', 'amazon.com/a', 0.5 ) ], [ P( 'shop', 'etsy.com/b', 0.5 ) ], TOL ) ), [ 'shop presence | present | missing', 'shop presence | missing | present' ] );
	// Same-site paths are destinations too.
	const site = compareParts( [ P( 'shop', null, 0.5, { site: '/shop' } ) ], [ P( 'shop', null, 0.5, { site: '/sale' } ) ], TOL );
	assert.deepEqual( keys( site ), [ 'shop presence | present | missing', 'shop presence | missing | present' ] );
	assert.deepEqual( keys( compareParts( [ P( 'shop', 'amazon.com/a', 0.5 ) ], [ P( 'shop', null, 0.5, { site: '/shop' } ) ], TOL ) ).length, 2, 'another site against this site' );
} );

test( 'control: in-order icons with the same destinations, and a destination one side cannot name, still pair with no row', () => {
	const d = [ P( '(unnamed a)', 'instagram.com/x', 0.1 ), P( '(unnamed a)', 'facebook.com/x', 0.2, { dup: 1 } ) ];
	const l = [ P( '(unnamed a)', 'instagram.com/x', 0.1 ), P( '(unnamed a)', 'facebook.com/x', 0.2, { dup: 1 } ) ];
	assert.deepEqual( compareParts( d, l, TOL ), [] );
	assert.deepEqual( compareParts( [ P( 'shop', 'amazon.com/a', 0.5 ) ], [ P( 'shop', null, 0.5 ) ], TOL ), [] );
	assert.deepEqual( compareParts( [ P( 'shop', null, 0.5, { site: '/shop' } ) ], [ P( 'shop', null, 0.5, { site: '/shop' } ) ], TOL ), [] );
	// Worded parts in another order are left to the word check: no order row.
	assert.deepEqual( compareParts( [ P( 'home', null, 0.1, { worded: true } ), P( 'shop', null, 0.9, { worded: true } ) ], [ P( 'home', null, 0.9, { worded: true } ), P( 'shop', null, 0.1, { worded: true } ) ], TOL ), [] );
} );

test( 'MUST FAIL (rater A minor): a real "#1" in a name is part of it, the copy index is its own field', () => {
	assert.deepEqual( keys( compareParts( [ P( 'rank #1', null, 0.5 ) ], [ P( 'rank #2', null, 0.5 ) ], TOL ) ), [ 'rank #1 label | rank #1 | rank #2' ] );
	assert.deepEqual( keys( compareParts( [ P( 'rank #1', null, 0.1 ) ], [ P( 'rank #2', null, 0.9 ) ], TOL ) ), [ 'rank #1 presence | present | missing', 'rank #2 presence | missing | present' ], 'two names are never one name' );
	// Two copies of one name still pair as one name, and keep their copy index on the rows.
	const d = [ P( 'home', null, 0.1 ), P( 'home', null, 0.9, { dup: 1 } ) ];
	assert.deepEqual( keys( compareParts( d, [ P( 'home', null, 0.1 ) ], TOL ) ), [ 'home#1 presence | present | missing' ] );
} );

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
let browser;
before( async () => {
	const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

test( 'readParts records the copy index apart from the name, whether the name is words, and a same-site path', async () => {
	const page = await browser.newPage( { viewport: { width: 800, height: 400 } } );
	const html = '<!doctype html><html><body><nav id="nav" style="display:flex;gap:20px;padding:20px"><a href="/Shop/?a=1">rank #1</a><a href="http://parts.test/shop/">rank #1</a><a href="#top" aria-label="Top">^</a><a href="https://www.instagram.com/x/" aria-label="Instagram"><svg width="10" height="10"></svg></a></nav></body></html>';
	await page.route( 'http://parts.test/**', ( r ) => r.fulfill( { contentType: 'text/html', body: html } ) );
	await page.goto( 'http://parts.test/page/' );
	const parts = await readParts( page, '#nav', [], resolveFinder.toString(), 50 );
	await page.close();
	assert.deepEqual( parts.map( ( p ) => [ p.name, p.dup, p.worded, p.href, p.site ] ), [ [ 'rank #1', 0, true, null, '/shop?a=1' ], [ 'rank #1', 1, true, null, '/shop' ], [ '^', 0, true, null, null ], [ 'instagram', 0, false, 'instagram.com/x', null ] ] );
} );
