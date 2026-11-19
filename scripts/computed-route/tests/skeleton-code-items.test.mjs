// The items a strip's code builds, read in the page by lib/skeleton-inventory.mjs::codeItemsOf: a marquee track whose run is
// doubled for the loop (each item its words and a glyph span), and a static row whose items each hold an icon in a circle
// beside their words. Run in a local Chromium page from markup (no site, no draft runtime).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadChromium } from '../lib/fill-read.mjs';
import { codeItemsOf } from '../lib/skeleton-inventory.mjs';

const WORDS = [ 'boost your milk', 'baked when you order', 'handmade in Birmingham' ];
const glyphRun = ( n ) => WORDS.slice( 0, n ).map( ( w ) => `<span style="display:inline-flex;gap:28px">${ w }<span style="color:#E86A75">✦</span></span>` ).join( '' );
const ICON = '<svg width="20" height="20" viewBox="0 0 24 24" style="fill:none;stroke:#3A2A22;stroke-width:1.9;stroke-linecap:round"><title>Tick</title><path d="M20 6 9 17l-5-5"></path></svg>';
const iconRow = WORDS.map( ( w ) => `<span style="display:inline-flex;gap:12px;color:#3A2A22"><span style="width:40px;height:40px;border-radius:999px">${ ICON }</span>${ w }</span>` ).join( '' );
const PAGE = `<body>
<div id="marquee"><div data-marquee style="display:inline-flex">${ glyphRun( 3 ) }${ glyphRun( 3 ) }</div></div>
<div id="row"><div style="display:grid;grid-template-columns:repeat(3,1fr)">${ iconRow }</div></div>
<div id="stamped"><span data-dc-tpl="9">One</span><span>Two</span></div>
<div id="one"><div><span>Only</span><span></span></div></div>
<div id="even"><div>${ glyphRun( 3 ) }<span>one-handed snacking<span>✦</span></span></div></div>
<div id="odd"><div>${ glyphRun( 3 ) }</div></div>
</body>`;

async function read( ids ) {
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await browser.newPage();
		await page.setContent( PAGE );
		return await page.evaluate( ( [ src, list ] ) => {
			// eslint-disable-next-line no-new-func
			const fn = new Function( `return (${ src });` )();
			return Object.fromEntries( list.map( ( id ) => [ id, fn( document.getElementById( id ) ) ] ) );
		}, [ codeItemsOf.toString(), ids ] );
	} finally {
		await browser.close();
	}
}

test( 'MUST FAIL: a doubled marquee run is read once, each item its own words without the glyph span; a row of icon items keeps each icon with its paint', async () => {
	const r = await read( [ 'marquee', 'row' ] );
	assert.deepEqual( r.marquee.map( ( x ) => x.text ), WORDS, 'the loop\'s second run is dropped, the ✦ glyph is not part of the words' );
	assert.ok( r.marquee.every( ( x ) => null === x.svg ) );
	assert.deepEqual( r.row.map( ( x ) => x.text ), WORDS );
	assert.match( r.row[ 0 ].svg, /<path[^>]*stroke="currentColor"/, 'a stroke equal to the icon colour is currentColor' );
	assert.match( r.row[ 0 ].svg, /stroke-linecap="round"/ );
	assert.match( r.row[ 0 ].svg, /fill="none"/ );
} );

test( 'no items for an element holding a stamped element, one with a single item, and a run that is not doubled stays whole', async () => {
	const r = await read( [ 'stamped', 'one', 'odd', 'even' ] );
	assert.equal( r.stamped, null, 'a stamped child: the template draws it, the inventory reads it' );
	assert.equal( r.one, null, 'one item is no list' );
	assert.deepEqual( r.odd.map( ( x ) => x.text ), WORDS, 'three items, not halved' );
	assert.deepEqual( r.even.map( ( x ) => x.text ), [ ...WORDS, 'one-handed snacking' ], 'four different items are not a doubled run' );
} );

test( 'MUST FAIL: each code item carries its child-index path and the words of its glyph children', async () => {
	const r = await read( [ 'marquee', 'row' ] );
	assert.deepEqual( r.marquee.map( ( x ) => x.at ), [ [ 0, 0 ], [ 0, 1 ], [ 0, 2 ] ], 'through the one-child track, then the item' );
	assert.ok( r.marquee.every( ( x ) => '✦' === x.marks ) );
	assert.ok( r.row.every( ( x ) => '' === x.marks ), 'an icon circle is no glyph mark' );
} );
