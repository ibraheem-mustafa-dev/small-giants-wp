// Session C lane L2, the walker core (scripts/parity/GAP-CHECKLIST.md sections 20 to 26). Every item has a planted fault
// that must turn red: headless Chromium on local HTML fixtures, never a site. Each MUST FAIL test is red against the
// walker before the lane's change and green after (set L2_PARITY_DIR to a copy of scripts/parity at the old commit to
// see it red). Playwright is resolved from this checkout or, in a worktree, from the main checkout.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const PARITY = process.env.L2_PARITY_DIR ? path.resolve( process.env.L2_PARITY_DIR ) : path.join( HERE, '../../parity' );
const lib = ( f ) => import( pathToFileURL( path.join( PARITY, 'lib', f ) ).href );
const PLAYWRIGHT = [ '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs', '../../../../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ]
	.map( ( p ) => path.join( HERE, p ) ).find( ( p ) => fs.existsSync( p ) );
const { chromium } = await import( pathToFileURL( PLAYWRIGHT ).href );

const { DEFAULT_PROPS, ACTIVE_PROPS, FOCUS_PROPS, resolveFinder, collectPair, centreOf, hoverPointOf } = await lib( 'collect.mjs' );
const { PAINT_SRC, lineRows } = await lib( 'paint.mjs' );
const { comparePair, compareLines } = await lib( 'compare.mjs' );
const { compareAuto } = await lib( 'auto-compare.mjs' );
const { collectAutoOn } = await lib( 'auto-walk.mjs' );
const { openDevtools, forcedPseudo } = await lib( 'devtools.mjs' );
const { focusPass, compareFocus } = await lib( 'focus.mjs' );
const { sameValue } = await lib( 'compare.mjs' );
const sp = await lib( 'state-passes.mjs' );
const { sampleRegion, compareEntrances } = await lib( 'entrances.mjs' );
const { stampRefs, dropUnmatched, unmatchedRefs, pairingPath, loadUnmatched } = await lib( 'ref-trace.mjs' );
const { compareState } = await lib( 'compare-state.mjs' );

const RESOLVE = resolveFinder.toString();
const TOL = { box: 2, px: 0.5 };
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const pageWith = async ( html, width = 900 ) => {
	const page = await browser.newPage( { viewport: { width, height: 700 } } );
	await page.setContent( `<!doctype html><html><body style="margin:0">${ html }</body></html>` );
	return page;
};
const snapOf = ( page, finder, props = [ ...DEFAULT_PROPS, 'max-width' ] ) => page.evaluate( collectPair, [ finder, props, RESOLVE, null, null, null, PAINT_SRC, null ] );
const GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// ---------------------------------------------------------------------------------------------------------------------
// L2.6 tag-mismatch guard (section 20)

test( 'MUST FAIL TO GUARD: a draft div against a live img is one tag row and no object-fit, max-width or display rows', async () => {
	const draft = await pageWith( '<div class="x" style="font-size:20px;padding:8px;display:block">Shop now</div>' );
	const live = await pageWith( `<img class="x" alt="Shop now" src="${ GIF }" style="max-width:100%;object-fit:cover;display:inline-block;width:40px;height:30px">` );
	const rows = comparePair( { name: 'x', draft: '.x', live: '.x' }, await snapOf( draft, '.x' ), await snapOf( live, '.x' ), TOL );
	assert.equal( rows.filter( ( r ) => 'tag' === r.kind ).length, 1 );
	assert.equal( rows.length, 1, `only the tag row, got ${ rows.map( ( r ) => `${ r.kind }:${ r.key }` ) }` );
	assert.equal( rows[ 0 ].draft, '<div> (block)' );
	assert.equal( rows[ 0 ].live, '<img> (media)' );
	assert.equal( rows.filter( ( r ) => [ 'object-fit', 'max-width', 'display' ].includes( r.key ) ).length, 0 );
	await draft.close();
	await live.close();
} );

test( 'MUST FAIL TO GUARD: a draft span against a live h1 is one tag row', async () => {
	const draft = await pageWith( '<span class="x" style="font-size:20px">Title</span>' );
	const live = await pageWith( '<h1 class="x" style="font-size:40px;margin:0">Title</h1>' );
	const rows = comparePair( { name: 'x', draft: '.x', live: '.x' }, await snapOf( draft, '.x' ), await snapOf( live, '.x' ), TOL );
	assert.deepEqual( rows.map( ( r ) => r.kind ), [ 'tag' ] );
	assert.equal( rows[ 0 ].draft, '<span> (inline text)' );
	await draft.close();
	await live.close();
} );

test( 'negative control: a div against a section is the same class and still compares', async () => {
	const draft = await pageWith( '<div class="x" style="font-size:20px">Hello</div>' );
	const live = await pageWith( '<section class="x" style="font-size:30px">Hello</section>' );
	const rows = comparePair( { name: 'x', draft: '.x', live: '.x' }, await snapOf( draft, '.x' ), await snapOf( live, '.x' ), TOL );
	assert.equal( rows.filter( ( r ) => 'tag' === r.kind ).length, 0 );
	assert.ok( rows.some( ( r ) => 'style' === r.kind && 'font-size' === r.key ), 'the font-size row is still reported' );
	await draft.close();
	await live.close();
} );

test( 'a text-run or group finder keeps its wrapper tag out of the guard', () => {
	const side = ( tag ) => ( { tag, text: 'a', box: { x: 0, y: 0, w: 10, h: 10 }, styles: {}, motion: { animation: 'none', transition: 'none' }, keyframes: 'none' } );
	const run = comparePair( { name: 'x', draft: { textRun: { within: '.a' } }, live: '.b' }, side( 'div' ), side( 'img' ), TOL );
	const group = comparePair( { name: 'x', draft: '.a', live: { group: { paths: [ '.b' ] } } }, side( 'div' ), side( 'img' ), TOL );
	assert.equal( run.filter( ( r ) => 'tag' === r.kind ).length + group.filter( ( r ) => 'tag' === r.kind ).length, 0 );
} );

// ---------------------------------------------------------------------------------------------------------------------
// L2.7 drop rows from unmatched refs (section 21)

const LEFT = ( ref, why ) => ( { ref, why, words: 3, matched: 1 } );
const WHY = {
	words: 'no draft element holds its words',
	pct: 'only 76% of its words matched the draft',
	moved: 'its draft element at 768 does not hold the same words',
	foreign: 'the draft element also holds 2 word(s) that belong outside this block',
	none: 'no matched words',
	control: 'no draft control with its name, id, placeholder or label',
	image: 'no painted words (an image, an icon or an empty wrapper)',
	width: 'its width is 319px on the draft against 996px live',
};

test( 'MUST FAIL TO DROP: a row of a ref in left with a drop reason disappears and is counted; kept, hand-covered, width and image refs stay', () => {
	const pairing = {
		left: [ LEFT( 'cr-ref-x-5', WHY.words ), LEFT( 'cr-ref-x-6', WHY.words ), LEFT( 'cr-ref-x-7', WHY.words ), LEFT( 'cr-ref-x-8', WHY.width ), LEFT( 'cr-ref-x-9', WHY.image ) ],
		keptPairs: [ { ref: 'cr-ref-x-6' } ],
		coveredByHand: [ 'cr-ref-x-7' ],
	};
	const unmatched = unmatchedRefs( pairing );
	const rows = [ 5, 6, 7, 8, 9, 10 ].flatMap( ( n ) => [ { kind: 'style', key: 'font-size', ref: `cr-ref-x-${ n }` }, { kind: 'style', key: 'color', ref: `cr-ref-x-${ n }` } ] );
	const out = dropUnmatched( [ ...rows, { kind: 'presence', key: 'element' } ], unmatched );
	assert.deepEqual( out.unmatched, [ { ref: 'cr-ref-x-5', why: WHY.words, count: 2 } ] );
	assert.equal( out.diffs.filter( ( d ) => 'cr-ref-x-5' === d.ref ).length, 0, 'x-5 is gone' );
	for ( const n of [ 6, 7, 8, 9, 10 ] ) {
		assert.equal( out.diffs.filter( ( d ) => d.ref === `cr-ref-x-${ n }` ).length, 2, `x-${ n } stays` );
	}
	assert.ok( out.diffs.some( ( d ) => 'presence' === d.kind ), 'a row with no ref is never dropped' );
} );

test( 'the drop list is exactly the six false-finding reasons; an unknown reason is kept', () => {
	const refs = Object.entries( WHY ).map( ( [ k ], i ) => [ k, `cr-ref-y-${ i }` ] );
	const unmatched = unmatchedRefs( { left: [ ...Object.entries( WHY ).map( ( [ , why ], i ) => LEFT( `cr-ref-y-${ i }`, why ) ), LEFT( 'cr-ref-y-99', 'some new reason' ) ] } );
	assert.deepEqual( refs.filter( ( [ , r ] ) => unmatched.has( r.replace( 'cr-ref-', '' ) ) ).map( ( [ k ] ) => k ), [ 'words', 'pct', 'moved', 'foreign', 'none', 'control' ] );
	assert.equal( unmatched.has( 'y-99' ), false );
} );

test( 'the pairing is found from the config: pairing path first, else ../pairs/<name>.json with a trailing .full dropped', () => {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'l2-pairs-' ) );
	fs.mkdirSync( path.join( root, 'parity' ) );
	fs.mkdirSync( path.join( root, 'pairs' ) );
	fs.writeFileSync( path.join( root, 'pairs', 'home.json' ), JSON.stringify( { left: [ LEFT( 'cr-ref-home-1', WHY.none ) ] } ) );
	fs.writeFileSync( path.join( root, 'pairs', 'named.json' ), JSON.stringify( { left: [ LEFT( 'cr-ref-n-1', WHY.none ) ] } ) );
	assert.equal( pairingPath( path.join( root, 'parity', 'home.full.mjs' ), {} ), path.join( root, 'pairs', 'home.json' ) );
	assert.equal( pairingPath( path.join( root, 'parity', 'other.mjs' ), {} ), null );
	assert.equal( pairingPath( path.join( root, 'parity', 'other.mjs' ), { pairing: '../pairs/named.json' } ), path.join( root, 'pairs', 'named.json' ) );
	assert.deepEqual( [ ...loadUnmatched( path.join( root, 'parity', 'home.full.mjs' ), {} ).keys() ], [ 'home-1' ] );
	assert.equal( loadUnmatched( path.join( root, 'parity', 'other.mjs' ), {} ).size, 0 );
	fs.rmSync( root, { recursive: true, force: true } );
} );

test( 'MUST FAIL TO DROP: compareState drops the unmatched ref\'s row, records it on the pair, and keeps a kept one', () => {
	const snap = ( size, ref ) => ( {
		box: { x: 0, y: 0, w: 100, h: 20 }, styles: { 'font-size': size }, text: 'a', tag: 'p', keyframes: 'none', motion: { animation: 'none', transition: 'none' },
		...( ref ? { trace: { ref, block: 'sgs-x', path: '', owners: [] } } : {} ),
	} );
	const run = ( left, keptPairs ) => {
		const out = { pairs: {} };
		const pair = ( name, ref ) => ( { name, draft: '.d', live: `.${ ref }`, text: false, structure: false, ref } );
		const pairs = [ pair( 'gen-x-5', 'cr-ref-x-5' ), pair( 'gen-x-6', 'cr-ref-x-6' ) ];
		const d = { snap: { 'gen-x-5': snap( '16px' ), 'gen-x-6': snap( '16px' ) }, structure: {}, log: [], mainY: null };
		const l = { snap: { 'gen-x-5': snap( '20px', 'cr-ref-x-5' ), 'gen-x-6': snap( '20px', 'cr-ref-x-6' ) }, structure: {}, log: [], mainY: null };
		compareState( out, d, l, { state: { name: 'rest' }, width: 1440, cfg: { refPrefix: 'cr-ref-' }, accept: [], divergences: [], tol: TOL, header: false, autoOn: false, pairsFor: () => pairs, origins: {}, linksSeen: new Set(), allLiveLinks: [], unmatched: unmatchedRefs( { left, keptPairs } ) } );
		return out.pairs;
	};
	const dropped = run( [ LEFT( 'cr-ref-x-5', WHY.words ) ], [ { ref: 'cr-ref-x-6' } ] );
	assert.equal( dropped[ 'gen-x-5' ].diffs.length, 0 );
	assert.deepEqual( dropped[ 'gen-x-5' ].unmatched, [ { ref: 'cr-ref-x-5', why: WHY.words, count: 1 } ] );
	assert.equal( dropped[ 'gen-x-6' ].diffs.filter( ( x ) => 'font-size' === x.key ).length, 1, 'the kept ref keeps its row' );
	const kept = run( [ LEFT( 'cr-ref-x-5', WHY.words ) ], [ { ref: 'cr-ref-x-5' } ] );
	assert.equal( kept[ 'gen-x-5' ].diffs.filter( ( x ) => 'font-size' === x.key ).length, 1, 'the same row stays when x-5 is in keptPairs' );
	const width = run( [ LEFT( 'cr-ref-x-5', WHY.width ) ], [] );
	assert.equal( width[ 'gen-x-5' ].diffs.filter( ( x ) => 'font-size' === x.key ).length, 1, 'a width reason stays' );
	assert.equal( width[ 'gen-x-5' ].unmatched, undefined );
} );

// ---------------------------------------------------------------------------------------------------------------------
// L2.1 1920 in the default (section 22)

test( 'MUST FAIL TO DEFAULT: the walker and the benchmark scorer default to all four widths, 1920 included', () => {
	const walk = fs.readFileSync( path.join( PARITY, 'draft-live-walk.mjs' ), 'utf8' );
	assert.match( walk, /cfg\.widths \|\| \[ 1440, 768, 375, 1920 \]/ );
	assert.equal( ( walk.match( /--widths 1440,768,375,1920/g ) || [] ).length, 2, 'both usage strings' );
	assert.doesNotMatch( walk, /1440,768,375[^,]/ );
	assert.match( fs.readFileSync( path.join( PARITY, 'benchmark/score.mjs' ), 'utf8' ), /c\.widths \|\| \[ 1440, 768, 375, 1920 \]/ );
} );

// ---------------------------------------------------------------------------------------------------------------------
// L2.2 focus and active (section 23)

const BTN = ( extra ) => `<style>.b { display: inline-block; padding: 8px 16px; background: rgb(0, 80, 160); color: white; border: 0; outline: none; transition: transform 0.1s } ${ extra }</style>
	<p>Heading words here</p><button class="b" type="button">Buy now</button> <a class="b" href="#">More info</a>`;
const FOCUS_RED = '.b:focus-visible { outline: 3px solid red; outline-offset: 2px }';
const PRESS = '.b:active { transform: scale(0.9) }';

test( 'a configured pair: :focus-visible on one side only is a focus row (a real Tab)', async () => {
	const draft = await pageWith( BTN( '' ) );
	const live = await pageWith( BTN( FOCUS_RED ) );
	const p = { name: 'b', draft: 'button.b', live: 'button.b' };
	const rows = compareFocus( await focusPass( draft, p, 'draft', RESOLVE ), await focusPass( live, p, 'live', RESOLVE ), sameValue, 0.5 );
	assert.ok( rows.some( ( r ) => 'focus' === r.kind && 'outline-style' === r.key ), JSON.stringify( rows ) );
	const same = compareFocus( await focusPass( live, p, 'draft', RESOLVE ), await focusPass( live, p, 'live', RESOLVE ), sameValue, 0.5 );
	assert.equal( same.length, 0, 'negative control: the same page both sides' );
	await draft.close();
	await live.close();
} );

test( 'MUST FAIL TO READ ACTIVE: :active { transform: scale(.9) } on one side is an active row, read through the DevTools protocol', async () => {
	const draft = await pageWith( BTN( '' ) );
	const live = await pageWith( BTN( PRESS ) );
	const pair = { name: 'b', draft: 'button.b', live: 'button.b', active: true };
	const read = async ( page ) => {
		const snap = { b: await snapOf( page, 'button.b' ) };
		await sp.activePass( page, [ pair ], 'draft', snap, RESOLVE, await openDevtools( page ), { all: false } );
		return snap.b;
	};
	const d = await read( draft );
	const l = await read( live );
	assert.equal( l.active.transform, 'matrix(0.9, 0, 0, 0.9, 0, 0)' );
	const rows = comparePair( pair, d, l, TOL ).filter( ( r ) => 'active' === r.kind );
	assert.deepEqual( rows.map( ( r ) => r.key ), [ 'transform' ] );
	const same = comparePair( pair, l, await read( live ), TOL ).filter( ( r ) => 'active' === r.kind );
	assert.equal( same.length, 0, 'negative control: identical pages' );
	// A pair that is not flagged and has no ref-traced session is not read.
	const snap = { b: await snapOf( live, 'button.b' ) };
	await sp.activePass( live, [ { ...pair, active: undefined } ], 'draft', snap, RESOLVE, await openDevtools( live ), { all: false } );
	assert.equal( snap.b.active, undefined );
	await draft.close();
	await live.close();
} );

const interactiveRows = async ( dHtml, lHtml ) => {
	const draft = await pageWith( dHtml );
	const live = await pageWith( lHtml );
	const read = async ( page, side ) => {
		const auto = await collectAutoOn( page, side, {} );
		await sp.readInteractives( page, await openDevtools( page ), auto, RESOLVE, {} );
		return auto;
	};
	const rows = compareAuto( await read( draft, 'draft' ), await read( live, 'live' ), {} );
	await draft.close();
	await live.close();
	return rows;
};

test( 'MUST FAIL TO READ EVERY ELEMENT: focus and active on any matched interactive element are auto rows with focus: and active: keys', async () => {
	const rows = await interactiveRows( BTN( '' ), BTN( `${ FOCUS_RED } ${ PRESS }` ) );
	const focus = rows.filter( ( r ) => r.key.startsWith( 'focus:' ) );
	const active = rows.filter( ( r ) => r.key.startsWith( 'active:' ) );
	assert.ok( focus.some( ( r ) => r.key.startsWith( 'focus:outline-style "button buy now"' ) && 'auto' === r.kind ), JSON.stringify( focus ) );
	assert.ok( focus.some( ( r ) => r.key.includes( '"a more info"' ) ), 'the link is read too' );
	assert.ok( active.some( ( r ) => r.key.startsWith( 'active:transform "button buy now"' ) ), JSON.stringify( active ) );
	assert.equal( rows.filter( ( r ) => ! /^(focus|active):/.test( r.key ) ).length, 0, 'nothing else differs' );
	const same = await interactiveRows( BTN( `${ FOCUS_RED } ${ PRESS }` ), BTN( `${ FOCUS_RED } ${ PRESS }` ) );
	assert.equal( same.length, 0, 'negative control: identical pages' );
} );

test( 'interactive elements are read up to 60 per state', async () => {
	const page = await pageWith( `<p>words</p>${ Array.from( { length: 70 }, ( _, i ) => `<button type="button">B${ i }</button>` ).join( '' ) }` );
	const auto = await collectAutoOn( page, 'draft', {} );
	await sp.readInteractives( page, await openDevtools( page ), auto, RESOLVE, {} );
	assert.equal( auto.interactives.length, 70 );
	assert.equal( auto.interactives.filter( ( c ) => c.rest ).length, 60 );
	assert.equal( auto.interactives[ 60 ].rest, undefined );
	await page.close();
} );

test( 'forcedPseudo: :focus-visible is forced on the element, :focus-within on its parent, and the force is cleared', async () => {
	const page = await pageWith( '<style>.w:focus-within { background: rgb(0, 128, 0) } .i:focus-visible { outline: 2px solid red } .w { background: white }</style><div class="w"><input class="i"></div>' );
	const cdp = await openDevtools( page );
	const bg = ( sel ) => () => page.evaluate( ( s ) => [ getComputedStyle( document.querySelector( s ) ).backgroundColor, getComputedStyle( document.querySelector( '.i' ) ).outlineStyle ], sel );
	const [ wrapBg, outline ] = await forcedPseudo( cdp, page, '.i', RESOLVE, [ 'focus', 'focus-visible' ], bg( '.w' ) );
	assert.equal( wrapBg, 'rgb(0, 128, 0)' );
	assert.equal( outline, 'solid' );
	const [ restBg, restOutline ] = await bg( '.w' )();
	assert.equal( restBg, 'rgb(255, 255, 255)' );
	assert.notEqual( restOutline, 'solid' );
	assert.ok( ACTIVE_PROPS.includes( 'transform' ) && FOCUS_PROPS.includes( 'outline-style' ) );
	await page.close();
} );

// ---------------------------------------------------------------------------------------------------------------------
// L2.3 link coverage (section 24)

const linkRows = async ( dHtml, lHtml ) => {
	const draft = await pageWith( dHtml );
	const live = await pageWith( lHtml );
	const rows = compareAuto( await collectAutoOn( draft, 'draft', {} ), await collectAutoOn( live, 'live', {} ), {} );
	await draft.close();
	await live.close();
	return rows.filter( ( r ) => /^link-/.test( r.key ) );
};

test( 'MUST FAIL TO SEE: a draft link against a plain live span is one link-missing auto row; both linked gives none', async () => {
	const rows = await linkRows( '<p>Welcome here</p><a href="#">Shop now</a><p>Bye</p>', '<p>Welcome here</p><span>Shop now</span><p>Bye</p>' );
	assert.equal( rows.length, 1, JSON.stringify( rows ) );
	assert.equal( rows[ 0 ].kind, 'auto' );
	assert.equal( rows[ 0 ].key, 'link-missing "shop now"' );
	assert.deepEqual( [ rows[ 0 ].draft, rows[ 0 ].live ], [ 'link', 'plain' ] );
	assert.equal( ( await linkRows( '<p>Welcome here</p><a href="#">Shop now</a>', '<p>Welcome here</p><a href="/shop">Shop now</a>' ) ).length, 0, 'both linked' );
	assert.equal( ( await linkRows( '<p>Welcome here</p><span>Shop now</span>', '<p>Welcome here</p><span>Shop now</span>' ) ).length, 0, 'both plain' );
} );

test( 'a live link over a plain draft word is a link-extra auto row', async () => {
	const rows = await linkRows( '<p>Welcome here</p><span>Shop now</span>', '<p>Welcome here</p><a href="/shop">Shop now</a>' );
	assert.deepEqual( rows.map( ( r ) => [ r.kind, r.key, r.draft, r.live ] ), [ [ 'auto', 'link-extra "shop now"', 'plain', 'link' ] ] );
} );

// ---------------------------------------------------------------------------------------------------------------------
// L2.4 line counts (section 25)

const HEADER = ( shrinks ) => `<style>.title { font: 20px/24px sans-serif; width: 300px; margin: 0 } </style>
	<div class="hd"><h2 class="title">Lenses and sunglasses</h2></div>
	<script>window.go = () => { const t = document.querySelector( '.title' ); ${ shrinks ? "t.style.width = '90px'; setTimeout( () => { t.style.width = '300px'; }, 300 );" : '' } };</script>`;

const sampleRun = async ( shrinks ) => {
	const page = await pageWith( HEADER( shrinks ) );
	const pair = { name: 'hd', draft: '.title', live: '.title', lines: true };
	await page.evaluate( () => window.go() );
	const { samples } = await sp.sampleLines( page, [ pair ], 'draft', RESOLVE );
	await page.waitForTimeout( 450 );
	const snap = { hd: { name: 'hd' } };
	await sp.settledLines( page, [ pair ], 'draft', RESOLVE, snap, samples );
	await page.close();
	return snap.hd.lines;
};

test( 'lineRows counts the line boxes: one line, a wrapped title and no text', async () => {
	const page = await pageWith( '<p id="a" style="font:20px/24px sans-serif;width:300px;margin:0">Short</p><p id="b" style="font:20px/24px sans-serif;width:90px;margin:0">Lenses and sunglasses</p><p id="c"></p>' );
	const n = ( id ) => page.evaluate( ( [ src, i ] ) => new Function( `${ src }; return lineRows( document.getElementById( '${ i }' ) );` )(), [ PAINT_SRC, id ] );
	assert.equal( await n( 'a' ), 1 );
	assert.ok( await n( 'b' ) >= 2 );
	assert.equal( await n( 'c' ), 0 );
	assert.equal( typeof lineRows, 'function' );
	await page.close();
} );

test( 'MUST FAIL TO COUNT: a title wrapping to 2 lines for 300ms on one side is a lines@120ms row, and none when both match', async () => {
	const draft = await sampleRun( false );
	const live = await sampleRun( true );
	assert.equal( draft.at[ 120 ], 1 );
	assert.ok( live.at[ 120 ] >= 2, `the live title wraps (${ live.at[ 120 ] } lines)` );
	const rows = compareLines( draft, live );
	assert.ok( rows.some( ( r ) => 'lines@120ms' === r.key && 'lines' === r.kind && 1 === r.draft && r.live >= 2 ), JSON.stringify( rows ) );
	assert.equal( rows.some( ( r ) => 'lines' === r.key ), false, 'the settled count is 1 on both: no settled row' );
	assert.deepEqual( compareLines( draft, await sampleRun( false ) ), [], 'negative control: both steady' );
	// comparePair carries the rows once a snapshot has `lines`.
	const side = ( lines ) => ( { tag: 'h2', text: 'a', box: { x: 0, y: 0, w: 10, h: 10 }, styles: {}, motion: { animation: 'none', transition: 'none' }, keyframes: 'none', lines } );
	assert.ok( comparePair( { name: 'hd', draft: '.t', live: '.t' }, side( draft ), side( live ), TOL ).some( ( r ) => 'lines@120ms' === r.key ) );
} );

// ---------------------------------------------------------------------------------------------------------------------
// L2.5 entrance motion (section 26)

const DRAWER = ( kind ) => `<style>.it { opacity: 0; list-style: none } ${ 'visible' === kind ? '.it { opacity: 1 }' : '' } ${ 'keyframes' === kind ? '@keyframes rise { from { opacity: 0 } to { opacity: 1 } } .it { animation: rise 0.4s both }' : '' }</style>
	<button id="open" type="button">Open</button>
	<div id="drawer" hidden><ul><li class="it cr-ref-x-1">Alpha</li><li class="it cr-ref-x-2">Bravo</li><li class="it cr-ref-x-3">Charlie</li></ul></div>
	<script>window.openDrawer = () => {
		document.getElementById( 'drawer' ).hidden = false;
		const items = [ ...document.querySelectorAll( '.it' ) ];
		${ 'stagger' === kind ? 'items.forEach( ( el, i ) => setTimeout( () => { el.style.opacity = "1"; }, i * 80 ) );' : '' }
		${ 'together' === kind ? 'items.forEach( ( el ) => { el.style.opacity = "1"; } );' : '' }
	};</script>`;

const regionOf = async ( kind, side ) => {
	const page = await pageWith( DRAWER( kind ) );
	const sampling = sampleRegion( page, side, { refPrefix: 'cr-ref-' }, '#drawer' );
	await page.evaluate( () => window.openDrawer() );
	const out = await sampling;
	await page.close();
	return out;
};

test( 'MUST FAIL TO SAMPLE: staggered items against items fading together give an entrance row for the offset item, carrying the live ref and path', async () => {
	const draft = await regionOf( 'stagger', 'draft' );
	const live = await regionOf( 'together', 'live' );
	assert.deepEqual( Object.keys( draft.blocks ).sort(), [ 'alpha', 'bravo', 'charlie' ] );
	const rows = compareEntrances( draft, live, 100 );
	const charlie = rows.find( ( r ) => 'entrance "charlie"' === r.key );
	assert.ok( charlie, JSON.stringify( rows ) );
	assert.equal( 'entrance', charlie.kind );
	assert.equal( charlie.ref, 'cr-ref-x-3' );
	assert.equal( charlie.path, '' );
	assert.equal( rows.some( ( r ) => 'entrance "alpha"' === r.key ), false );
	const same = compareEntrances( await regionOf( 'together', 'draft' ), await regionOf( 'together', 'live' ), 100 );
	assert.equal( same.length, 0, 'negative control: both fade together' );
} );

test( 'a CSS keyframe on one side against none is an entrance row from the sampled region', async () => {
	const rows = compareEntrances( await regionOf( 'keyframes', 'draft' ), await regionOf( 'visible', 'live' ), 100 );
	assert.ok( rows.length >= 1, 'a keyframed entrance against a static one is reported' );
	assert.ok( rows.every( ( r ) => 'entrance' === r.kind ) );
} );

test( 'a page-load entrance row carries no ref on a draft-only comparison and stampRefs maps tag, active and lines rows', () => {
	const rows = [ { kind: 'tag', key: 'tag' }, { kind: 'active', key: 'color' }, { kind: 'lines', key: 'lines' }, { kind: 'entrance', key: 'x' } ];
	stampRefs( rows, { ref: 'cr-ref-z-1', block: 'sgs-z', path: '> a', textPath: '> span', owners: [] } );
	assert.deepEqual( rows.map( ( r ) => r.ref ?? null ), [ 'cr-ref-z-1', 'cr-ref-z-1', 'cr-ref-z-1', null ] );
	assert.equal( rows[ 1 ].path, '> span', 'an active text colour reads where the text paints, like hover' );
} );

// ---------------------------------------------------------------------------------------------------------------------
// Lane L4 reads paint.mjs: its exports keep working.

test( 'paint.mjs keeps groupBox, textRun, textCarrier and PAINT_SRC working for lane L4', async () => {
	const paint = await lib( 'paint.mjs' );
	for ( const name of [ 'groupBox', 'textRun', 'textCarrier', 'paintedDecoration', 'layoutElement', 'layoutComparable' ] ) {
		assert.equal( typeof paint[ name ], 'function', name );
	}
	assert.equal( typeof paint.PAINT_SRC, 'string' );
	const page = await pageWith( '<div id="a" style="width:200px;height:50px">x</div><div id="b" style="width:100px;height:20px">y</div><ul id="u" style="font:16px/20px sans-serif"><li>One</li><li>Two</li></ul>' );
	const out = await page.evaluate( ( src ) => {
		const f = new Function( `${ src }; return { groupBox, textRun };` )();
		return { box: f.groupBox( [ '#a', '#b' ] ).box, rows: f.textRun( document.getElementById( 'u' ), false ).rows };
	}, paint.PAINT_SRC );
	assert.equal( out.box.w, 200 );
	assert.equal( out.rows.count, 2 );
	await page.close();
} );

// ---------------------------------------------------------------------------------------------------------------------
// Spec 47 W2-D: the hover point (P3a), icon reads (P2b3, P1) and loops (P3c), in a real browser on local HTML.

// A track far wider than the viewport, mid-translate: its raw centre is off-screen to the left. `overflow: clip` keeps the
// wrapper from scrolling, as a marquee's does.
const MARQUEE = `<style>.w { position: relative; overflow: clip; height: 80px } .t { position: absolute; left: -3000px; width: 4000px; height: 60px; background: rgb(10, 10, 10) } .t.paused { opacity: 0.5 }</style>
	<div class="w"><div class="t" id="t">track</div></div><script>const t = document.getElementById( 't' ); t.addEventListener( 'mouseenter', () => t.classList.add( 'paused' ) );</script>`;
const HOVER_ARGS = { state: {}, h: {}, RESOLVE, full: false, phone: false, cdp: null };

test( 'MUST FAIL TO CLAMP: a track whose raw centre is off-screen gets a hover point inside the viewport that lands on it', async () => {
	const page = await pageWith( MARQUEE, 900 );
	const raw = await page.evaluate( centreOf, [ '#t', RESOLVE ] );
	assert.ok( raw.x < 0, `the raw centre ${ raw.x } is off-screen: the aim that never fires mouseenter` );
	const at = await page.evaluate( hoverPointOf, [ '#t', RESOLVE ] );
	assert.ok( at.x >= 0 && at.x <= 900 && at.y >= 0 && at.y <= 700, JSON.stringify( at ) );
	assert.equal( at.clamped, true );
	assert.equal( await page.evaluate( ( [ x, y ] ) => document.elementFromPoint( x, y )?.id, [ at.x, at.y ] ), 't' );
	await page.close();
} );

test( 'MUST FAIL TO HOVER: the hover pass pauses a track that was off-screen, and a hover that changes nothing is not unreached', async () => {
	const page = await pageWith( MARQUEE + '<a id="plain" href="#" style="display:block;width:100px;height:40px">x</a>', 900 );
	const snap = { track: { box: { w: 4000, h: 60 } }, plain: { box: { w: 100, h: 40 } } };
	const pairs = [ { name: 'track', hover: true, draft: '#t', live: '#t', hoverWait: 50 }, { name: 'plain', hover: true, draft: '#plain', live: '#plain', hoverWait: 50 } ];
	await sp.hoverPass( page, pairs, 'draft', snap, HOVER_ARGS );
	assert.equal( snap.track.hover.opacity, '0.5', 'the pointer reached the track: mouseenter fired and the pause class applied' );
	assert.ok( ! snap.track.hoverUnreached );
	assert.equal( snap.plain.hover.opacity, '1', 'hovered and unchanged' );
	assert.ok( ! snap.plain.hoverUnreached, 'a reached hover that changed nothing carries no unreached mark' );
	await page.close();
} );

test( 'NOT OVER-SUPPRESSING: an on-screen element gets exactly its raw centre; a covered or off-screen one is unreached, a distinct outcome', async () => {
	const page = await pageWith( '<style>.f { position: fixed; inset: 0 } .w { overflow: clip; position: relative; height: 50px }</style><div id="ok" style="width:200px;height:100px">a</div><div class="w"><div id="far" style="position:absolute;left:5000px;width:50px;height:50px">b</div></div>', 900 );
	const raw = await page.evaluate( centreOf, [ '#ok', RESOLVE ] );
	const at = await page.evaluate( hoverPointOf, [ '#ok', RESOLVE ] );
	assert.deepEqual( [ at.x, at.y, at.clamped ], [ raw.x, raw.y, false ], 'no drift from the clamp' );
	assert.deepEqual( await page.evaluate( hoverPointOf, [ '#far', RESOLVE ] ), { unreached: true }, 'wholly outside the viewport' );
	assert.equal( await page.evaluate( hoverPointOf, [ '#nothing', RESOLVE ] ), null, 'a missing element stays null, not unreached' );
	await page.evaluate( () => document.body.insertAdjacentHTML( 'beforeend', '<div class="f"></div>' ) );
	assert.deepEqual( await page.evaluate( hoverPointOf, [ '#ok', RESOLVE ] ), { unreached: true }, 'covered at every point' );
	const snap = { ok: { box: { w: 200, h: 100 } } };
	await sp.hoverPass( page, [ { name: 'ok', hover: true, draft: '#ok', live: '#ok', hoverWait: 20 } ], 'draft', snap, HOVER_ARGS );
	assert.equal( snap.ok.hoverUnreached, true );
	assert.equal( snap.ok.hover, undefined, 'no hover read to mistake for unchanged' );
	const base = { box: { w: 1, h: 1 }, text: '', styles: {}, motion: { animation: 'none', transition: 'none' }, keyframes: 'none' };
	const rows = comparePair( { text: false }, { ...base, hoverUnreached: true }, { ...base, hover: { opacity: '1' } }, TOL );
	assert.deepEqual( rows.map( ( r ) => [ r.kind, r.key, r.draft, r.live ] ), [ [ 'hover', 'reached', 'unreached', 'hovered' ] ] );
	assert.deepEqual( comparePair( { text: false }, { ...base, hover: { opacity: '1' } }, { ...base, hover: { opacity: '1' } }, TOL ), [] );
	await page.close();
} );

const SVG = ( extra = '', size = 24 ) => `<svg ${ extra } width="${ size }" height="${ size }" viewBox="0 0 24 24"><path d="M2 2h20v20H2z" fill="rgb(200, 0, 0)" stroke="none"/></svg>`;
const iconKeys = ( s ) => Object.keys( s.styles ).filter( ( k ) => /^icon-/.test( k ) ).sort();
const FULL_ICON = [ 'icon-colour', 'icon-fill', 'icon-height', 'icon-stroke', 'icon-width' ];

test( 'MUST FAIL TO SCOPE: a container holding two svgs reads no icon at all', async () => {
	const page = await pageWith( `<div id="c">${ SVG() }${ SVG() }</div>` );
	const s = await snapOf( page, '#c' );
	assert.deepEqual( iconKeys( s ), [] );
	assert.equal( s.iconKind, null );
	await page.close();
} );

test( 'NOT OVER-SUPPRESSING: an svg itself, a container of one painted svg, and one with a hidden or empty second svg all read the full icon', async () => {
	const page = await pageWith( `<div id="a">${ SVG( 'id="s"' ) }</div><div id="b">${ SVG() }${ SVG( 'style="display:none"' ) }${ SVG( 'style="visibility:hidden"' ) }<svg width="0" height="0"><path d="M0 0h1v1z"/></svg></div>` );
	assert.deepEqual( iconKeys( await snapOf( page, '#s' ) ), FULL_ICON, 'the svg itself' );
	const one = await snapOf( page, '#a' );
	assert.deepEqual( iconKeys( one ), FULL_ICON, 'one painted svg inside a container' );
	assert.equal( one.iconKind, 'svg' );
	assert.equal( one.styles[ 'icon-colour' ], 'rgb(200, 0, 0)' );
	assert.deepEqual( iconKeys( await snapOf( page, '#b' ) ), FULL_ICON, 'hidden and zero-size svgs do not count' );
	await page.close();
} );

const ICON_CSS = '<style>.sgs-accordion__icon { font: 700 20px/1 serif; color: rgb(0, 0, 200) } .sep { font-size: 30px }</style>';
const GLYPH_PAGE = ( font ) => pageWith( `${ ICON_CSS }<details><summary><span class="sgs-accordion__icon" id="i" style="${ font }">+</span></summary></details><p>Open <span class="sep" id="sep">•</span> Close</p>` );
const SVG_PAGE = () => pageWith( `${ ICON_CSS }<details><summary><span class="sgs-accordion__icon" id="i">${ SVG() }</span></summary></details><p>Open <span class="sep" id="sep">•</span> Close</p>` );

test( 'MUST FAIL TO ABSTRACT: a glyph against an svg gives one icon-colour row and no text rows, no icon-size', async () => {
	const draft = await GLYPH_PAGE( '' );
	const live = await SVG_PAGE();
	const d = await snapOf( draft, '#i' );
	const l = await snapOf( live, '#i' );
	assert.equal( d.iconKind, 'glyph' );
	assert.equal( l.iconKind, 'svg' );
	const rows = comparePair( {}, d, l, TOL );
	const textual = rows.filter( ( r ) => 'text' === r.kind || /^(font-|line-height|letter-spacing|text-|color$)/.test( r.key ) );
	assert.deepEqual( textual, [], JSON.stringify( rows ) );
	assert.deepEqual( rows.filter( ( r ) => /^icon-/.test( r.key ) ).map( ( r ) => [ r.key, r.draft, r.live ] ), [ [ 'icon-colour', 'rgb(0, 0, 200)', 'rgb(200, 0, 0)' ] ] );
	assert.ok( ! rows.some( ( r ) => 'icon-size' === r.key ) );
	await draft.close();
	await live.close();
} );

test( 'NOT OVER-SUPPRESSING: svg-vs-svg keeps every row (a real 40 against 44 touch target), a bare bullet keeps its text comparison, glyph-vs-glyph keeps text rows', async () => {
	const a = await pageWith( `<button id="b" style="display:block;padding:0;border:0">${ SVG( '', 40 ) }</button>` );
	const b = await pageWith( `<button id="b" style="display:block;padding:0;border:0">${ SVG( '', 44 ) }</button>` );
	const rows = comparePair( {}, await snapOf( a, '#b' ), await snapOf( b, '#b' ), TOL );
	const got = rows.map( ( r ) => `${ r.kind }:${ r.key }` ).sort();
	for ( const k of [ 'box:w', 'box:h', 'style:icon-width', 'style:icon-height' ] ) {
		assert.ok( got.includes( k ), `${ k } survives: ${ got }` );
	}
	assert.ok( ! got.includes( 'style:icon-colour' ), 'icon-colour is the mixed pair\'s row only' );
	const glyph = await GLYPH_PAGE( '' );
	const glyphBig = await GLYPH_PAGE( 'font-size: 32px' );
	assert.ok( comparePair( {}, await snapOf( glyph, '#i' ), await snapOf( glyphBig, '#i' ), TOL ).some( ( r ) => 'font-size' === r.key ), 'two glyphs compare as text' );
	const sepSnap = await snapOf( glyph, '#sep' );
	assert.equal( sepSnap.iconKind, null, 'a stand-alone bullet is not an icon' );
	const sepBig = await pageWith( `${ ICON_CSS }<p>Open <span class="sep" id="sep" style="font-size:40px">•</span> Close</p>` );
	assert.ok( comparePair( {}, sepSnap, await snapOf( sepBig, '#sep' ), TOL ).some( ( r ) => 'font-size' === r.key ), 'bullet text compared' );
	const svgPage = await SVG_PAGE();
	const vsSvg = comparePair( {}, sepSnap, await snapOf( svgPage, '#i' ), TOL );
	assert.ok( vsSvg.some( ( r ) => 'font-size' === r.key ), 'a bullet against an svg is not a glyph pair: text rows stay' );
	for ( const p of [ a, b, glyph, glyphBig, sepBig, svgPage ] ) {
		await p.close();
	}
} );

const SLIDE = '<style>@keyframes slide { from { transform: translateX(0) } to { transform: translateX(-50%) } } @keyframes fin { to { opacity: 0.4 } } .m { animation: slide 2s linear infinite; background-color: rgb(1, 2, 3) } .f { animation: fin 0.1s both }</style>';

test( 'MUST FAIL TO RECORD: loops lists the properties an infinite animation drives, and only those', async () => {
	const page = await pageWith( `${ SLIDE }<div class="m" id="m">x</div><div class="f" id="f">y</div><div id="none">z</div>` );
	assert.deepEqual( ( await snapOf( page, '#m' ) ).loops, [ 'transform' ], 'the background beside it is not a loop' );
	assert.deepEqual( ( await snapOf( page, '#f' ) ).loops, [], 'a finite animation is not a loop' );
	assert.deepEqual( ( await snapOf( page, '#none' ) ).loops, [] );
	await page.close();
} );

test( 'an animation name with no readable rules reads as unresolved whatever it is called; unresolved against none still differs', async () => {
	const a = await pageWith( '<div id="x" style="animation: foo 1s">x</div>' );
	const b = await pageWith( '<div id="x" style="animation: bar 1s">x</div>' );
	const c = await pageWith( '<div id="x">x</div>' );
	const [ sa, sb, sc ] = [ await snapOf( a, '#x' ), await snapOf( b, '#x' ), await snapOf( c, '#x' ) ];
	assert.equal( sa.keyframes, sb.keyframes );
	assert.notEqual( sa.keyframes, sc.keyframes );
	for ( const p of [ a, b, c ] ) {
		await p.close();
	}
} );
