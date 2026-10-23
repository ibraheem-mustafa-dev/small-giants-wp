// Track W W17 (N12) and W-hover. N12: the walker ran its states in sequence on one page and never closed what a state
// opened, so the Eye Care `scrolled` state at 375 measured the open navigation drawer (header-bar y-in-main draft 294,
// live -69: the live page locked by the open modal dialog). Every state now starts from the page's rest
// (lib/state-rest.mjs), a page that cannot be brought to rest is refused, and a state that finds nothing to trigger on
// either side is one report line. W-hover: hover and pressed rows on a used size (width, height, ...) had no declaration
// in the report, so G2 failed them; the walker records snap.declaredIn.hover / .active beside the rest snap.declared.
// The walk tests run the real walker (--lean, headless) on two local pages.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const WALKER = path.join( HERE, '..', 'draft-live-walk.mjs' );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
// Imported per test, so the walk test still runs (and fails on its assertion) where the module does not exist yet.
const rest = () => import( '../lib/state-rest.mjs' );

// One page per side. Menu opens a modal dialog and locks the page (body position fixed, as a drawer's scroll lock does);
// Step changes the label without opening anything; a sessionStorage flag set by `stuck` (live only) reopens the dialog on
// every load. The config's `open` opens the More disclosure: it is part of the page's rest.
const PAGE = ( words ) => `<!doctype html><html><head><style>body{margin:0}#bar{position:sticky;top:0;height:60px;background:#eee}main{height:3000px}</style></head><body>
<header id="bar"><span id="label">Step 1</span> <button id="menu">Menu</button> <button id="step">Step</button></header>
<details id="more"><summary>More</summary>x</details><main>content</main>
<dialog id="drawer"><p>${ words }</p></dialog>
<script>
const lock = () => { drawer.showModal(); document.body.style.position = 'fixed'; document.body.style.width = '100%'; };
menu.onclick = lock;
step.onclick = () => { label.textContent = 'Step 2'; };
if ( sessionStorage.getItem( 'stuck' ) ) { lock(); }
</script></body></html>`;

let dir;
let report;
const runOf = ( state ) => report.runs.find( ( r ) => r.state === state );
before( () => {
	dir = fs.mkdtempSync( path.join( os.tmpdir(), 'w17-' ) );
	fs.writeFileSync( path.join( dir, 'draft.html' ), PAGE( 'Drawer words' ) );
	fs.writeFileSync( path.join( dir, 'live.html' ), PAGE( 'Other words' ) );
	const url = ( f ) => pathToFileURL( path.join( dir, f ) ).href;
	const click = ( src ) => `( h ) => h.clickText( ${ JSON.stringify( src ) }, { tag: 'button', optional: true, wait: 150 } )`;
	const both = ( fn ) => `draft: ${ fn }, live: ${ fn }`;
	const scroll = `async ( h ) => { await h.page.evaluate( () => window.scrollTo( { top: 400, behavior: 'instant' } ) ); await h.wait( 150 ); }`;
	const more = `( h ) => h.page.evaluate( () => { document.getElementById( 'more' ).open = true; } )`;
	const stick = `async ( h ) => { await h.page.evaluate( () => sessionStorage.setItem( 'stuck', '1' ) ); await ( ${ click( '^menu$' ) } )( h ); }`;
	fs.writeFileSync( path.join( dir, 'w17.mjs' ), `export default {
	name: 'w17', widths: [ 800 ], links: false,
	draft: { url: ${ JSON.stringify( url( 'draft.html' ) ) }, open: ${ more } }, live: { url: ${ JSON.stringify( url( 'live.html' ) ) }, open: ${ more } },
	states: [
		{ name: 'closed', settle: 100 },
		{ name: 'step', settle: 100, ${ both( click( '^step$' ) ) } },
		{ name: 'step-next', settle: 100 },
		{ name: 'fresh', settle: 100, from: 'rest' },
		{ name: 'drawer-open', settle: 100, ${ both( click( '^menu$' ) ) } },
		{ name: 'keep', settle: 100, from: 'previous' },
		{ name: 'scrolled', settle: 100, ${ both( scroll ) } },
		{ name: 'nothing', settle: 100, ${ both( click( '^nothing$' ) ) } },
		{ name: 'one-sided', settle: 100, draft: ${ click( '^menu$' ) }, live: ${ click( '^nothing$' ) } },
		{ name: 'stuck', settle: 100, draft: ${ click( '^menu$' ) }, live: ${ stick } },
		{ name: 'after-stuck', settle: 100 },
	],
	pairs: [
		{ name: 'bar', states: [ 'closed', 'scrolled' ], draft: '#bar', live: '#bar', text: false, box: [ 'h' ], structure: false },
		{ name: 'label', states: [ 'step', 'step-next', 'fresh' ], draft: '#label', live: '#label', box: [], structure: false },
		{ name: 'drawer', states: [ 'drawer-open', 'keep', 'one-sided', 'stuck' ], draft: '#drawer p', live: '#drawer p', box: [], structure: false },
		{ name: 'nothing-bar', states: [ 'nothing', 'after-stuck' ], draft: '#bar', live: '#bar', text: false, box: [ 'h' ], structure: false },
	],
};
` );
	const out = path.join( dir, 'out' );
	const r = spawnSync( process.execPath, [ WALKER, path.join( dir, 'w17.mjs' ), '--out', out, '--headless', '--no-review', '--lean' ], { encoding: 'utf8', timeout: 110000 } );
	report = fs.existsSync( path.join( out, 'report.json' ) ) ? JSON.parse( fs.readFileSync( path.join( out, 'report.json' ), 'utf8' ) ) : { runs: [], failed: `${ r.stdout }\n${ r.stderr }` };
	report.md = fs.existsSync( path.join( out, 'report.md' ) ) ? fs.readFileSync( path.join( out, 'report.md' ), 'utf8' ) : '';
} );
after( () => fs.rmSync( dir, { recursive: true, force: true } ) );

test( 'MUST FAIL: a state after one that opened a locking drawer is measured from rest (the sticky bar scrolled with the page)', () => {
	assert.ok( runOf( 'scrolled' ), report.failed );
	assert.equal( runOf( 'scrolled' ).pairs.bar.live.box.y, 400, 'live: the drawer from drawer-open still locked the page' );
	assert.equal( runOf( 'scrolled' ).pairs.bar.draft.box.y, 400 );
} );

test( 'MUST FAIL: the first state is measured as loaded; a page still at rest keeps its step; from rest reloads; from previous keeps the drawer', () => {
	assert.equal( runOf( 'closed' ).pairs.bar.live.box.y, 0 );
	assert.equal( runOf( 'step-next' ).pairs.label.live.text, 'Step 2', 'a page at rest is not reloaded: a chained step survives' );
	assert.equal( runOf( 'fresh' ).pairs.label.live.text, 'Step 1', 'from: rest loads afresh' );
	assert.equal( runOf( 'keep' ).pairs.drawer.live.text, 'Other words', 'from: previous keeps the drawer open' );
} );

test( 'MUST FAIL: nothing to trigger on either side is one line and no rows; one side only is still measured', () => {
	const nothing = runOf( 'nothing' );
	assert.deepEqual( Object.keys( nothing.pairs ), [], 'no row per property for a state that triggered nothing' );
	assert.match( nothing.untriggered.draft, /nothing/ );
	assert.deepEqual( nothing.untriggered.unread, [ 'live' ], 'the live side skips its reads when the draft found nothing either' );
	assert.match( report.md, /- nothing @ 800: nothing to trigger on either side, not measured/ );
	const one = runOf( 'one-sided' );
	assert.equal( one.untriggered.draft, null );
	assert.match( one.untriggered.live, /nothing/ );
	assert.ok( one.pairs.drawer.diffs.length, 'the drawer the draft opened is still a row' );
	assert.match( report.md, /- one-sided @ 800: nothing to trigger on the live side only, measured/ );
} );

test( 'control: a state that opens a different panel on the two sides is still reported', () => {
	assert.ok( runOf( 'drawer-open' ).pairs.drawer.diffs.some( ( d ) => /Drawer words/.test( String( d.draft ) ) && /Other words/.test( String( d.live ) ) ) );
} );

test( 'MUST FAIL: a page that is not at rest after a fresh load is refused with its reason, never measured', () => {
	const r = runOf( 'after-stuck' );
	assert.deepEqual( Object.keys( r.pairs ), [ '(state)' ] );
	const [ row ] = r.pairs[ '(state)' ].diffs;
	assert.equal( row.key, 'not-at-rest' );
	assert.ok( ! row.accepted, 'a refusal is open' );
	assert.match( row.live, /open dialogs: 0 at rest, 1 now/ );
	assert.equal( row.draft, 'at rest', 'the draft reached rest by a fresh load (its open ran again)' );
	assert.match( report.md, /- after-stuck @ 800: refused, not measured/ );
	assert.ok( ! runOf( 'stuck' ).refused, 'the state that set the flag was itself at rest' );
} );

test( 'restDiff names each field that moved; an equal signature is at rest', async () => {
	const { restDiff } = await rest();
	const base = { scroll: '0,0', lock: 'visible visible static', dialogs: 0, modals: 0, popovers: 0, disclosures: 1, layers: '' };
	assert.deepEqual( restDiff( base, { ...base } ), [] );
	assert.deepEqual( restDiff( base, { ...base, scroll: '0,400', layers: 'div.drawer' } ), [ 'scroll: 0,0 at rest, 0,400 now', 'fixed layers over a quarter of the screen: none at rest, div.drawer now' ] );
	for ( const k of [ 'lock', 'dialogs', 'modals', 'popovers', 'disclosures' ] ) {
		assert.equal( restDiff( base, { ...base, [ k ]: 'x' } ).length, 1, k );
	}
	assert.deepEqual( restDiff( null, base ), [ 'no rest signature to compare' ] );
} );

test( 'unmeasuredRun: either side refused is one open row; both sides untriggered settle the run; one side is compared', async () => {
	const { unmeasuredRun } = await rest();
	const run = () => ( { pairs: {} } );
	const draftOnly = run();
	assert.equal( unmeasuredRun( draftOnly, { refused: 'r' }, {} ), true );
	assert.deepEqual( [ draftOnly.pairs[ '(state)' ].diffs[ 0 ].draft, draftOnly.pairs[ '(state)' ].diffs[ 0 ].live ], [ 'r', 'at rest' ] );
	const liveOnly = run();
	assert.equal( unmeasuredRun( liveOnly, {}, { refused: 'r' } ), true );
	assert.deepEqual( liveOnly.refused, { draft: null, live: 'r' } );
	const one = run();
	assert.equal( unmeasuredRun( one, { untriggered: 'a' }, {} ), false );
	assert.deepEqual( one.untriggered, { draft: 'a', live: null } );
	assert.equal( unmeasuredRun( run(), {}, { untriggered: 'a' } ), false );
	assert.equal( unmeasuredRun( run(), { untriggered: 'a' }, { untriggered: 'b' } ), true );
	const plain = run();
	assert.equal( unmeasuredRun( plain, {}, {} ), false );
	assert.deepEqual( plain, { pairs: {} } );
} );

test( 'untriggered: every try missed; a hit, a navigation or no try at all is a trigger', async () => {
	const { untriggered } = await rest();
	assert.equal( untriggered( [ { type: 'click', target: '/a/', hit: false }, { type: 'hover', target: 'b', hit: false } ] ), '/a/, b' );
	assert.equal( untriggered( [ { type: 'click', target: '/a/', hit: false }, { type: 'hover', target: 'b', hit: true } ] ), null );
	assert.equal( untriggered( [ { type: 'click', target: '/a/', hit: false }, { type: 'goto', target: '/x/' } ] ), null );
	assert.equal( untriggered( [] ), null );
	assert.equal( untriggered( [ { type: 'wait' } ] ), null );
} );

test( 'restSignature reads the scroll, the lock, an open modal and a covering fixed layer in the page', async () => {
	const { restSignature } = await rest();
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
		await page.setContent( `<style>main{height:3000px}#layer{position:fixed;inset:0;display:none}#chip{position:fixed;top:0;left:0;width:40px;height:40px}
			#ghost{position:fixed;inset:0;visibility:hidden}#clear{position:fixed;inset:0;opacity:0}#panel{display:none;width:50px;height:50px}</style>
			<main>x</main><div id="layer" class="drawer open"></div><div id="chip"></div><div id="ghost"></div><div id="clear"></div>
			<dialog id="d">hi</dialog><div id="panel" role="dialog">p</div><div id="pop" popover>pop</div><button aria-expanded="false">m</button>` );
		const at = await page.evaluate( restSignature );
		assert.deepEqual( at, { scroll: '0,0', lock: 'visible visible static', dialogs: 0, modals: 0, popovers: 0, disclosures: 0, layers: '' }, 'a small chip, a hidden and a transparent layer are no layers' );
		await page.evaluate( () => {
			document.getElementById( 'd' ).showModal();
			document.getElementById( 'layer' ).style.display = 'block';
			document.getElementById( 'panel' ).style.display = 'block';
			document.getElementById( 'pop' ).showPopover();
			document.documentElement.style.overflowY = 'clip';
			document.querySelector( 'button' ).setAttribute( 'aria-expanded', 'true' );
			document.body.style.overflowY = 'hidden';
			window.scrollTo( 0, 300 );
		} );
		const now = await page.evaluate( restSignature );
		assert.equal( now.scroll, '0,300' );
		assert.equal( now.lock, 'clip hidden static' );
		assert.equal( now.dialogs, 1 );
		assert.equal( now.modals, 1 );
		assert.equal( now.popovers, 1 );
		assert.equal( now.disclosures, 1 );
		assert.equal( now.layers, 'div#layer.drawer' );
	} finally {
		await browser.close();
	}
} );

// W-hover: the declared used sizes while :hover or :active holds, beside the rest declarations.
test( 'MUST FAIL: hover and pressed declarations of the used sizes are recorded in the snap (declaredIn), each its own state\'s', async () => {
	const { hoverPass, activePass } = await import( '../lib/state-passes.mjs' );
	const { resolveFinder } = await import( '../lib/collect.mjs' );
	const { openDevtools, declaredValues } = await import( '../lib/devtools.mjs' );
	const RESOLVE = resolveFinder.toString();
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
		await page.setContent( `<style>.b{display:block;width:100px;height:20px}.b:hover{width:180px}.b:active{width:150px;min-height:30px}.c{display:block;width:60px}.c:hover{color:red}</style>
			<a class="b" href="#">b</a><a class="c" href="#">c</a><span class="t">run</span>` );
		const cdp = await openDevtools( page );
		const pairs = [ { name: 'b', live: '.b' }, { name: 'c', live: '.c' }, { name: 't', live: { textRun: { within: '.t' } } }, { name: 'g', live: { group: { paths: [ '.c' ] } } } ];
		const snap = { b: {}, c: {}, t: {}, g: {} };
		snap.b.declared = await declaredValues( cdp, '.b', RESOLVE );
		await hoverPass( page, pairs, 'live', snap, { state: {}, h: null, RESOLVE, full: false, phone: false, cdp, propsFor: () => [ 'color' ] } );
		await activePass( page, pairs, 'live', snap, RESOLVE, cdp, { all: true, propsFor: () => [ 'color' ] } );
		assert.equal( snap.b.declared.width, '100px', 'rest stays rest' );
		assert.equal( snap.b.declaredIn?.hover?.width, '180px', 'the hover width row has its declaration' );
		assert.equal( snap.b.declaredIn.active.width, '150px' );
		assert.equal( snap.b.declaredIn.active[ 'min-height' ], '30px' );
		assert.equal( snap.b.declaredIn.hover[ 'min-height' ], undefined, 'a pressed-only declaration is not a hover one' );
		// negative control: a hover that declares no size reads the rest declaration, never a size the other element hovers to
		assert.equal( snap.c.declaredIn.hover.width, '60px' );
		assert.equal( snap.t.declaredIn, undefined, 'a text run measures no one element' );
		assert.equal( snap.g.declaredIn, undefined, 'nor does a group' );
		assert.equal( 'declared' in ( snap.b.hover || {} ), false, 'the hover styles compare.mjs reads carry no extra key' );
		// the force is cleared after each read
		assert.equal( ( await declaredValues( cdp, '.b', RESOLVE ) ).width, '100px' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL: a real-pointer hover pair records its hover declarations too; a phone reads none', async () => {
	const { hoverPass } = await import( '../lib/state-passes.mjs' );
	const { resolveFinder } = await import( '../lib/collect.mjs' );
	const { openDevtools } = await import( '../lib/devtools.mjs' );
	const RESOLVE = resolveFinder.toString();
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
		await page.setContent( '<style>.b{display:block;width:100px;height:40px}.b:hover{width:180px}</style><a class="b" href="#">b</a>' );
		const cdp = await openDevtools( page );
		const pairs = [ { name: 'b', live: '.b', hover: true, hoverWait: 50 } ];
		const snap = { b: {} };
		await hoverPass( page, pairs, 'live', snap, { state: {}, h: null, RESOLVE, full: false, phone: false, cdp, propsFor: () => [ 'color' ] } );
		assert.equal( snap.b.declaredIn?.hover?.width, '180px' );
		const phone = { b: {} };
		await hoverPass( page, pairs, 'live', phone, { state: {}, h: null, RESOLVE, full: false, phone: true, cdp, propsFor: () => [ 'color' ] } );
		assert.equal( phone.b.declaredIn, undefined );
		const bare = { b: {} };
		await hoverPass( page, pairs, 'live', bare, { state: {}, h: null, RESOLVE, full: false, phone: false, cdp: null, propsFor: () => [ 'color' ] } );
		assert.ok( bare.b.hover, 'a walk without a DevTools session still reads the hover' );
		assert.equal( bare.b.declaredIn, undefined, 'and no declarations' );
	} finally {
		await browser.close();
	}
} );
