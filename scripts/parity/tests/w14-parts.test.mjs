// W14 (second-client header walk, N3): the parts pass paired a pair's interactive parts by accessible name only, so one
// link named differently on the two sides ("eye care birmingham" in the draft, "go to eye care birmingham (sgs test)
// homepage" live) became a draft-only presence row and live-only presence rows. lib/parts.mjs::pairParts pairs by name,
// then by a destination both sides can name (hrefKey), then by kind, place and size in the pair; a paired part named
// differently is one `<name> label` row. Controls: a part missing on one side stays a presence row, and two links in
// swapped places with different destinations never pair as each other.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as P from '../lib/parts.mjs';
const { compareParts, readParts } = P;
const hrefKey = ( ...a ) => P.hrefKey( ...a );
import { resolveFinder } from '../lib/collect.mjs';

const TOL = { px: 0.5, box: 2 };
const LOOK = { color: 'rgb(0, 0, 0)', 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-width': '0px', transform: 'none', scale: 'none', translate: 'none', rotate: 'none', 'transform-origin': '20px 10px', opacity: '1', filter: 'none' };
const part = ( name, x, extra = {} ) => ( { name, root: false, kind: 'link', href: null, pos: { x, y: 0.5 }, box: { w: 40, h: 20 }, rest: { ...LOOK }, hover: { ...LOOK }, layers: { rest: [], hover: [] }, effects: { hover: [], press: [] }, ...extra } );
const keys = ( rows ) => rows.map( ( r ) => `${ r.key } | ${ r.draft } | ${ r.live }` );

test( 'MUST FAIL (N3): a link renamed between the sides stays one pair with one label row', () => {
	const rows = compareParts( [ part( 'shop', 0.3 ) ], [ part( 'shop now', 0.31, { box: { w: 44, h: 20 } } ) ], TOL );
	assert.deepEqual( keys( rows ), [ 'shop label | shop | shop now' ] );
} );

test( 'MUST FAIL (N3, Eye Care header-logo-group at 768, closed): the draft logo link pairs the live link over the same place', () => {
	// Captured from the walk: the draft pair element is the link; live, the group holds the logo image link and the block-link overlay.
	const d = [ part( 'eye care birmingham', 0.5, { root: true, box: { w: 164, h: 32 } } ) ];
	const l = [ part( 'go to eye care birmingham (sgs test) homepage', 0.14, { box: { w: 48, h: 24 } } ), part( '(unnamed a)', 0.5, { box: { w: 170, h: 32 } } ) ];
	assert.deepEqual( keys( compareParts( d, l, TOL ) ), [ 'eye care birmingham label | eye care birmingham | (unnamed a)', 'go to eye care birmingham (sgs test) homepage presence | missing | present' ] );
} );

test( 'MUST FAIL (N3, drawer socials): a link renamed live pairs by its destination wherever it sits', () => {
	const d = [ part( 'instagram', 0.2, { href: 'instagram.com/eyecare' } ) ];
	const l = [ part( 'follow us on instagram (opens in new tab)', 0.6, { href: 'instagram.com/eyecare', box: { w: 90, h: 20 } } ) ];
	assert.deepEqual( keys( compareParts( d, l, TOL ) ), [ 'instagram label | instagram | follow us on instagram (opens in new tab)' ] );
} );

test( 'MUST FAIL (N3): a renamed part whose look differs is one pair with its label and look rows', () => {
	const rows = compareParts( [ part( 'shop', 0.3 ) ], [ part( 'shop now', 0.3, { rest: { ...LOOK, color: 'rgb(200, 0, 0)' }, hover: { ...LOOK, color: 'rgb(200, 0, 0)' } } ) ], TOL );
	assert.deepEqual( rows.map( ( r ) => r.key ), [ 'shop rest:color', 'shop label' ] );
} );

test( 'control (b): a link missing on live is still a presence row', () => {
	const d = [ part( 'menu', 0.08, { kind: 'button' } ), part( 'sign in', 0.81, { box: { w: 44, h: 44 } } ) ];
	assert.deepEqual( keys( compareParts( d, [ part( 'menu', 0.09, { kind: 'button' } ) ], TOL ) ), [ 'sign in presence | present | missing' ] );
} );

test( 'control (b): a different part somewhere else, of another kind or another size is never a pair', () => {
	const far = compareParts( [ part( 'shop', 0.2 ) ], [ part( 'help', 0.5 ) ], TOL );
	assert.deepEqual( keys( far ), [ 'shop presence | present | missing', 'help presence | missing | present' ] );
	const kind = compareParts( [ part( 'shop', 0.3 ) ], [ part( 'open menu', 0.3, { kind: 'button' } ) ], TOL );
	assert.deepEqual( keys( kind ), [ 'shop presence | present | missing', 'open menu presence | missing | present' ] );
	const size = compareParts( [ part( 'shop', 0.3 ) ], [ part( 'icon', 0.3, { box: { w: 20, h: 20 } } ) ], TOL );
	assert.deepEqual( keys( size ), [ 'shop presence | present | missing', 'icon presence | missing | present' ] );
	const tall = compareParts( [ part( 'shop', 0.3 ) ], [ part( 'panel', 0.3, { box: { w: 40, h: 60 } } ) ], TOL );
	assert.deepEqual( keys( tall ), [ 'shop presence | present | missing', 'panel presence | missing | present' ] );
	const low = compareParts( [ part( 'shop', 0.3 ) ], [ part( 'help', 0.3, { pos: { x: 0.3, y: 0.9 } } ) ], TOL );
	assert.deepEqual( keys( low ), [ 'shop presence | present | missing', 'help presence | missing | present' ] );
} );

test( 'control (c): two links swapped in place with different destinations pair by destination, never as each other', () => {
	const d = [ part( 'facebook', 0.2, { href: 'facebook.com/eyecare' } ), part( 'instagram', 0.8, { href: 'instagram.com/eyecare' } ) ];
	const l = [ part( 'follow on instagram', 0.2, { href: 'instagram.com/eyecare' } ), part( 'like on facebook', 0.8, { href: 'facebook.com/eyecare' } ) ];
	assert.deepEqual( keys( compareParts( d, l, TOL ) ), [ 'facebook label | facebook | like on facebook', 'instagram label | instagram | follow on instagram' ] );
} );

test( 'control (c): a link in the same place with another destination is two presence rows, not a renamed pair', () => {
	const rows = compareParts( [ part( 'facebook', 0.2, { href: 'facebook.com/eyecare' } ) ], [ part( 'twitter', 0.2, { href: 'x.com/eyecare' } ) ], TOL );
	assert.deepEqual( keys( rows ), [ 'facebook presence | present | missing', 'twitter presence | missing | present' ] );
} );

test( 'parts of one name still pair by name first, and two parts of one name by where they sit', () => {
	const d = [ part( 'home', 0.1, { href: 'a.com/x' } ), part( 'home#1', 0.9 ) ];
	const l = [ part( 'home', 0.9 ), part( 'home#1', 0.1, { href: 'b.com/y' } ) ];
	assert.deepEqual( compareParts( d, l, TOL ), [] );
} );

test( 'hrefKey: only a destination both sides can name alike is a key', () => {
	const o = 'http://127.0.0.1:5000';
	assert.equal( hrefKey( '#', `${ o }/#`, o ), null );
	assert.equal( hrefKey( '', `${ o }/`, o ), null );
	assert.equal( hrefKey( null, '', o ), null );
	assert.equal( hrefKey( 'javascript:void(0)', 'javascript:void(0)', o ), null );
	assert.equal( hrefKey( 'shop.html', `${ o }/shop.html`, o ), null );
	assert.equal( hrefKey( 'https://www.Instagram.com/eyecare/', 'https://www.instagram.com/eyecare/', o ), 'instagram.com/eyecare' );
	assert.equal( hrefKey( 'https://instagram.com/eyecare', 'https://instagram.com/eyecare', 'https://live.test' ), 'instagram.com/eyecare' );
	assert.equal( hrefKey( 'https://wa.me/44?text=hi', 'https://wa.me/44?text=hi', o ), 'wa.me/44?text=hi' );
	assert.equal( hrefKey( 'tel:0121 729 8233', 'tel:0121%20729%208233', o ), 'tel:01217298233' );
	assert.equal( hrefKey( 'mailto:Hi@Eye.Care', 'mailto:Hi@Eye.Care', o ), 'mailto:hi@eye.care' );
	assert.equal( hrefKey( 'ftp://files.test/a', 'ftp://files.test/a', o ), null );
} );

// In headless Chromium: each part read carries its kind and comparable destination.
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
let browser;
before( async () => {
	const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

test( 'readParts records each part\'s kind and comparable destination', async () => {
	const page = await browser.newPage( { viewport: { width: 800, height: 400 } } );
	await page.setContent( '<!doctype html><html><body><nav id="nav" style="display:flex;gap:20px;padding:20px"><a href="https://www.instagram.com/eyecare/">Instagram</a><a href="#">Top</a><button type="button">Menu</button></nav></body></html>' );
	const parts = await readParts( page, '#nav', [], resolveFinder.toString(), 50 );
	await page.close();
	assert.deepEqual( parts.map( ( p ) => [ p.name, p.kind, p.href ] ), [ [ 'instagram', 'link', 'instagram.com/eyecare' ], [ 'top', 'link', null ], [ 'menu', 'button', null ] ] );
} );
