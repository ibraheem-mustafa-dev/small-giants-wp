// W21 (walker speed-up, Bean 2026-11-01): the parts pass moved a real pointer over every part and held fixed waits (hover 800 ms,
// press 400, release 400, +300 per pair), about 1.6 s a part. lib/parts.mjs::readParts now reads a part's hover and press with
// DevTools forced :hover and :hover + :active (no pointer, no hold); only a part a script drives (a pointer or mouse listener on
// it or an ancestor up to the pair's element, parts.mjs::scriptDriven) is read with a real pointer, waiting for its animations
// to settle; and a later state of one page reuses a part's reading when its element, page box and resting look are unchanged.
// The pages are small local HTML pages in headless Chromium, never a site.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveFinder } from '../lib/collect.mjs';
import { readParts } from '../lib/parts.mjs';
import { openDevtools } from '../lib/devtools.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
const RESOLVE = resolveFinder.toString();
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const CSS = '<style>body{margin:0;font:16px/20px sans-serif}nav{display:flex;gap:20px;padding:20px}nav a{display:inline-block;padding:10px;color:rgb(17,34,51);text-decoration:none}</style>';
const CSS_ONLY = `${ CSS }<style>#nav a:hover{color:rgb(200,0,0)}</style><nav id="nav"><a href="#a">Home</a></nav>`;
const SCRIPTED = `${ CSS }<nav id="nav"><a id="home" href="#a">Home</a></nav>
	<script>const h = document.getElementById( 'home' ); h.addEventListener( 'mouseenter', () => { h.style.color = 'rgb(0, 0, 200)'; } );</script>`;

// A page with the mouse and the DevTools protocol watched: how many times a pointer moved, how many pseudo-states were forced.
const open = async ( html ) => {
	const page = await browser.newPage( { viewport: { width: 1000, height: 600 } } );
	await page.setContent( `<!doctype html><html><body>${ html }</body></html>` );
	const cdp = await openDevtools( page );
	const seen = { moves: 0, forced: 0 };
	const move = page.mouse.move.bind( page.mouse );
	page.mouse.move = ( ...a ) => {
		seen.moves++;
		return move( ...a );
	};
	const send = cdp.send.bind( cdp );
	cdp.send = ( method, ...a ) => {
		if ( 'CSS.forcePseudoState' === method && a[ 0 ]?.forcedPseudoClasses?.length ) {
			seen.forced++;
		}
		return send( method, ...a );
	};
	return { page, cdp, seen };
};

test( 'MUST FAIL (a): a CSS-only :hover colour is read with no pointer move', async () => {
	const { page, cdp, seen } = await open( CSS_ONLY );
	const [ home ] = await readParts( page, '#nav', [], RESOLVE, 800, { cdp } );
	assert.equal( seen.moves, 0 );
	assert.ok( seen.forced > 0 );
	assert.equal( home.rest.color, 'rgb(17, 34, 51)' );
	assert.equal( home.hover.color, 'rgb(200, 0, 0)' );
	await page.close();
} );

test( 'MUST FAIL (b): a part with a JS mouseenter listener is read with a real pointer and reads the changed colour', async () => {
	const { page, cdp, seen } = await open( SCRIPTED );
	const [ home ] = await readParts( page, '#nav', [], RESOLVE, 800, { cdp } );
	assert.ok( seen.moves > 0 );
	assert.equal( seen.forced, 0 );
	assert.equal( home.rest.color, 'rgb(17, 34, 51)' );
	assert.equal( home.hover.color, 'rgb(0, 0, 200)' );
	await page.close();
} );

test( 'MUST FAIL (b): a listener on an ancestor inside the pair (the pair\'s element) makes its parts pointer-read too', async () => {
	const { page, cdp, seen } = await open( `${ CSS_ONLY }<script>document.getElementById( 'nav' ).addEventListener( 'pointermove', () => {} );</script>` );
	const [ home ] = await readParts( page, '#nav', [], RESOLVE, 800, { cdp } );
	assert.ok( seen.moves > 0 );
	assert.equal( home.hover.color, 'rgb(200, 0, 0)' );
	await page.close();
} );

test( 'MUST FAIL (c): a second state reuses an unchanged part\'s reading and re-reads a changed or new one', async () => {
	const { page, cdp, seen } = await open( `${ CSS }<style>#nav a:hover{color:rgb(200,0,0)}</style><nav id="nav"><a id="home" href="#a">Home</a><a id="about" href="#b">About</a></nav>` );
	const cache = new Map();
	const first = await readParts( page, '#nav', [], RESOLVE, 800, { cdp, cache } );
	// One part's read forces its element chain twice (hover, then hover and active).
	const perPart = seen.forced / 2;
	assert.ok( perPart > 0 );
	seen.forced = 0;
	const again = await readParts( page, '#nav', [], RESOLVE, 800, { cdp, cache } );
	assert.equal( seen.forced, 0, 'nothing changed: no new read' );
	assert.deepEqual( again, first );
	// One part's box changes (a slide moved it) and a new part appears: those two are read, the unchanged one is not.
	await page.evaluate( () => {
		document.getElementById( 'about' ).style.paddingLeft = '30px';
		const a = document.createElement( 'a' );
		a.href = '#c';
		a.textContent = 'Shop';
		document.getElementById( 'nav' ).appendChild( a );
	} );
	const third = await readParts( page, '#nav', [], RESOLVE, 800, { cdp, cache } );
	assert.equal( seen.forced, 2 * perPart, 'the changed part and the new one are read; the unchanged one is not' );
	assert.deepEqual( third.map( ( x ) => x.name ), [ 'home', 'about', 'shop' ] );
	assert.equal( third[ 2 ].hover.color, 'rgb(200, 0, 0)' );
	await page.close();
} );

test( 'MUST FAIL (c): a part whose resting colour changed between states is re-read even with its box unchanged (a header that turns solid on scroll)', async () => {
	const { page, cdp, seen } = await open( CSS_ONLY );
	const cache = new Map();
	await readParts( page, '#nav', [], RESOLVE, 800, { cdp, cache } );
	seen.forced = 0;
	await page.evaluate( () => document.head.insertAdjacentHTML( 'beforeend', '<style>#nav a{color:rgb(1,2,3)}</style>' ) );
	const [ home ] = await readParts( page, '#nav', [], RESOLVE, 800, { cdp, cache } );
	assert.ok( seen.forced > 0 );
	assert.equal( home.rest.color, 'rgb(1, 2, 3)' );
	await page.close();
} );

test( 'MUST FAIL (d): the row shape is today\'s, and a forced read equals the real-pointer read of the same part', async () => {
	const forced = await open( CSS_ONLY );
	const [ f ] = await readParts( forced.page, '#nav', [], RESOLVE, 800, { cdp: forced.cdp } );
	assert.deepEqual( Object.keys( f ).sort(), [ 'name', 'dup', 'worded', 'root', 'kind', 'href', 'site', 'pos', 'box', 'rest', 'hover', 'layers', 'effects' ].sort() );
	assert.deepEqual( Object.keys( f.layers ), [ 'rest', 'hover' ] );
	assert.deepEqual( Object.keys( f.effects ).sort(), [ 'hover', 'press' ] );
	assert.equal( f.eid, undefined );
	assert.equal( f.abs, undefined );
	const pointer = await open( CSS_ONLY );
	const [ p ] = await readParts( pointer.page, '#nav', [], RESOLVE, 300 );
	assert.ok( pointer.seen.moves > 0 );
	assert.deepEqual( f, p );
	await forced.page.close();
	await pointer.page.close();
} );
