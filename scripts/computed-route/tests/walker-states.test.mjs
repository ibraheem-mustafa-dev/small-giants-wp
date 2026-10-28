// The generated walker config walks every state its surface maps (Spec 48 §3.6, FR-48-13): Fill wrote only the first
// state of `surfaces.json` `states` into the config, so no other mapped state was ever walked and Solve never measured
// it. Each state now becomes a walker state with its own draft and live action, at the widths it holds at; a state the
// walker cannot open is a gap row. The state check follows each state too.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { walkerStates, walkRefusalRows, stateLiveSource } from '../lib/walker-states.mjs';
import { baseConfigText, WALK_WIDTHS } from '../lib/fill-config.mjs';
import { stateGroups, groupWidths } from '../lib/state-live.mjs';
import { lintConfig } from '../../parity/lib/lint.mjs';

const { chromium } = await import( 'playwright' );

// A header record drawn the way a handoff draws one: a scroll state, two width-bound navigation states, a logic state
// set by a plain key, and one reached only by clicking (no state key, no setState call).
const RECORD = { id: 'S-9', kind: 'header', dc: 'Demo Site', states: [
	{ name: 'top', state_keys: { scrolled: false }, how_to_reach: 'L.setState({scrolled:false})' },
	{ name: 'scrolled (shrunk)', state_keys: { scrolled: true }, how_to_reach: 'Scroll past 40px; L.setState({scrolled:true})' },
	{ name: 'full nav', state_keys: { w: '>= 1060' }, how_to_reach: 'L.setState({w:1400})' },
	{ name: 'compact nav (Menu button)', state_keys: { w: '< 1060' }, how_to_reach: 'L.setState({w:900})' },
	{ name: 'signed out', state_keys: { user: null }, how_to_reach: 'L.setState({user:null})' },
	{ name: 'rail moved', state_keys: {}, how_to_reach: 'Click the arrows' },
] };
const FACTS = { state: { 'Demo Site': { keys: [ 'scrolled', 'w', 'user' ], widthKeys: [] } } };
// The keys the component writes from the width (lib/state-reach.mjs::widthStateKeys over the export's breakpoints), as Fill
// passes them: only these make a comparison a width bound.
const WIDTH_KEYS = new Map( [ [ 'Demo Site', new Set( [ 'w' ] ) ] ] );
const VOCAB = [ { state: 'scrolled', reach: 'scroll' }, { state: 'current', reach: 'set-attribute' } ];
const ROOTS = { draft: '[data-dc-tpl="13"]', live: '.cr-ref-header-0' };
const walk = ( states, more = {} ) => walkerStates( { entry: { states }, record: RECORD, facts: FACTS, rootComponent: 'Demo Site', vocab: VOCAB, widthKeys: WIDTH_KEYS, widths: WALK_WIDTHS, ...more } );

let dir;
let browser;
before( async () => {
	dir = fs.mkdtempSync( path.join( os.tmpdir(), 'walker-states-' ) );
	browser = await chromium.launch();
} );
after( async () => {
	await browser?.close();
	fs.rmSync( dir, { recursive: true, force: true } );
} );

async function load( text ) {
	const file = path.join( dir, `cfg-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 ) }.mjs` );
	fs.writeFileSync( file, text );
	return ( await import( pathToFileURL( file ).href ) ).default;
}
const config = ( w, more = {} ) => load( baseConfigText( { surface: 'header', draftUrl: 'http://d/', liveUrl: 'http://l/', roots: ROOTS, walk: w, state: 'top', ...more } ) );

test( 'MUST FAIL: a surface with three mapped states generates a config walking all three, each later one opened on both sides from a fresh load', async () => {
	const w = walk( { top: null, scrolled: 'scrolled', 'signed-out': null } );
	assert.deepEqual( w.refused, [] );
	const cfg = await config( w );
	assert.deepEqual( cfg.states.map( ( s ) => s.name ), [ 'top', 'scrolled', 'signed-out' ], 'every mapped state is a walker state, in the surface\'s order' );
	for ( const s of cfg.states.slice( 1 ) ) {
		assert.equal( s.from, 'rest', `${ s.name } starts from a fresh load` );
		assert.equal( typeof s.draft, 'function', `${ s.name } has a draft action` );
		assert.equal( typeof s.live, 'function', `${ s.name } has a live action` );
	}
	assert.equal( cfg.states[ 0 ].from, undefined, 'the first state is the walker\'s rest' );
	assert.deepEqual( lintConfig( { ...cfg, pairs: [ { name: 'p', draft: '.a', live: '.b' } ] } ), [], 'the walker accepts the config: a ref-traced config\'s unscoped pairs look at every state' );
	assert.equal( lintConfig( { ...cfg, refPrefix: undefined, pairs: [ { name: 'p', draft: '.a', live: '.b' } ] } ).length, 2, 'a hand config (no refPrefix) still needs a pair scoped to each later state' );
	assert.equal( lintConfig( { ...cfg, pairs: [ { name: 'p', states: [ 'top' ], draft: '.a', live: '.b' } ] } ).length, 2, 'a ref-traced config whose pairs are all scoped elsewhere is not excused' );
	assert.equal( lintConfig( { ...cfg, states: cfg.states.map( ( s ) => ( { ...s, allPairs: undefined } ) ), pairs: [ { name: 'p', draft: '.a', live: '.b' } ] } ).length, 2, 'a hand state (not one Fill generated) in a ref-traced config still needs its own pair' );
	// The state check reads every state's rows: an unscoped pair is read at rest and in each later state.
	const groups = stateGroups( { ...cfg, pairs: [ { name: 'p', draft: '.a', live: '.b' } ] } );
	assert.deepEqual( groups.map( ( g ) => g.name ), [ null, 'scrolled', 'signed-out' ] );
	// Negative control: without the surface's walk the config walks the one named state.
	const one = await config( null );
	assert.deepEqual( one.states.map( ( s ) => s.name ), [ 'top' ] );
} );

test( 'MUST FAIL: a width-bound state is walked only at the widths it holds at', async () => {
	const w = walk( { top: null, 'full-nav': null, 'compact-nav': null } );
	assert.deepEqual( w.states.map( ( s ) => [ s.name, s.widths ] ), [ [ 'top', null ], [ 'full-nav', [ 1440, 1920 ] ], [ 'compact-nav', [ 375, 768 ] ] ] );
	const cfg = await config( w );
	assert.deepEqual( cfg.states.map( ( s ) => s.widths ?? null ), [ null, [ 1440, 1920 ], [ 375, 768 ] ] );
	// A bound no walk width falls inside is refused with its reason, never walked at every width.
	const narrow = walkerStates( { entry: { states: { top: null, tiny: null } }, record: { ...RECORD, states: [ RECORD.states[ 0 ], { name: 'tiny', state_keys: { w: '< 300' }, how_to_reach: 'L.setState({w:200})' } ] }, facts: FACTS, rootComponent: 'Demo Site', widthKeys: WIDTH_KEYS, widths: WALK_WIDTHS } );
	assert.deepEqual( narrow.states.map( ( s ) => s.name ), [ 'top' ] );
	assert.match( narrow.refused[ 0 ].reason, /holds at none of the walk widths/ );
} );

test( 'a state the walker cannot open is a gap row, never a walker state: no record state named, or no way and no width bound', async () => {
	const w = walk( { top: null, 'rail-moved': null, ghost: null } );
	assert.deepEqual( w.states.map( ( s ) => s.name ), [ 'top' ] );
	assert.deepEqual( w.refused.map( ( r ) => r.state ), [ 'rail-moved', 'ghost' ] );
	assert.match( w.refused[ 0 ].reason, /no usable state key .* and no setState call/ );
	assert.match( w.refused[ 1 ].reason, /no state of record S-9 is named "ghost"/ );
	const rows = walkRefusalRows( { walk: w, id: 'S-9', nodes: [ { parent: null, index: 0, name: 'sgs/site-header' } ], flat: [ { ref: 'cr-ref-header-0' } ], refOf: ( n ) => n.ref } );
	assert.deepEqual( rows.map( ( r ) => [ r.node, r.property, r.value ] ), [ [ 'cr-ref-header-0', '(state opener)', 'rail-moved' ], [ 'cr-ref-header-0', '(state opener)', 'ghost' ] ] );
	assert.match( rows[ 0 ].reason, /^walker-state-refused: walker state "rail-moved" of S-9 is not walked/ );
	// The config lists them as unwalked, with their reasons, for the walker check.
	const cfg = await config( w );
	assert.deepEqual( cfg.unwalked.map( ( u ) => u.state ), [ 'rail-moved', 'ghost' ] );
	assert.match( cfg.unwalked[ 1 ].reason, /no state of record S-9 is named "ghost"/ );
	assert.equal( ( await config( walk( { top: null } ) ) ).unwalked, undefined, 'nothing refused, no list' );
	// The first state is the page as loaded: never refused, whatever its record says.
	assert.deepEqual( walk( { ghost: null, top: null } ).states.map( ( s ) => s.name ), [ 'ghost', 'top' ] );
	// No record at all: only the first state walks.
	const bare = walkerStates( { entry: { states: { resting: null, other: null } }, record: null, widths: WALK_WIDTHS } );
	assert.deepEqual( [ bare.states.map( ( s ) => s.name ), bare.refused.map( ( r ) => r.state ) ], [ [ 'resting' ], [ 'other' ] ] );
} );

test( 'the live side reaches a state through its setting state: a scroll state scrolls, rest needs nothing, another state opens the root\'s control', () => {
	const w = walk( { top: null, scrolled: 'scrolled', 'signed-out': null } );
	assert.deepEqual( w.states.map( ( s ) => s.reach ), [ null, 'scroll', null ] );
	assert.equal( w.component, 'Root', 'the served entry draft\'s component is hosted as Root' );
	const current = walkerStates( { entry: { states: { top: null, 'signed-out': 'current' } }, record: RECORD, facts: FACTS, rootComponent: 'Demo Site', vocab: VOCAB, widths: WALK_WIDTHS } );
	assert.equal( current.states[ 1 ].reach, 'owner' );
	assert.equal( stateLiveSource( current.states[ 1 ], null ).includes( 'no live root' ), true, 'no live root: the live action logs a miss' );
	// A state-driven surface's states are open on live through the config's own live open.
	const opened = walkerStates( { entry: { states: { top: null, 'signed-out': 'current' } }, record: RECORD, facts: FACTS, rootComponent: 'Demo Site', vocab: VOCAB, widths: WALK_WIDTHS, opener: { state: 'signed out', ways: [ { state: 'signed out', bounds: [] } ] } } );
	assert.equal( opened.states[ 1 ].reach, null );
} );

test( 'MUST FAIL: a state the config\'s own open already applied at a width is not applied again there', () => {
	const opener = { state: 'full nav', ways: [ { state: 'compact nav (Menu button)', bounds: [ { key: 'w', min: null, max: 1059 } ] }, { state: 'full nav', bounds: [ { key: 'w', min: 1060, max: null } ] } ], openedAt: { 375: 0 } };
	const w = walk( { 'full-nav': null, 'compact-nav': null }, { opener } );
	assert.deepEqual( w.states.map( ( s ) => [ s.name, s.skipAt ] ), [ [ 'full-nav', [ 1440, 1920 ] ], [ 'compact-nav', [ 375, 768 ] ] ] );
	assert.deepEqual( walk( { 'full-nav': null, 'compact-nav': null } ).states.map( ( s ) => s.skipAt ), [ [], [] ], 'no opener: nothing to skip' );
} );

// Runs a config state's action on a long blank page at a width: { scrollY, log }.
async function runAction( fn, width ) {
	const page = await browser.newPage( { viewport: { width, height: 800 } } );
	try {
		await page.setContent( '<!doctype html><html><body style="margin:0"><div style="height:3000px"></div></body></html>' );
		const h = { page, log: [] };
		await fn( h );
		return { scrollY: await page.evaluate( () => scrollY ), log: h.log };
	} finally {
		await page.close();
	}
}

test( 'MUST FAIL: the scroll state scrolls the window on both sides, and a draft way that reaches no instance is logged as a miss', async () => {
	const cfg = await config( walk( { top: null, scrolled: 'scrolled', 'signed-out': null } ) );
	const scrolled = cfg.states[ 1 ];
	const live = await runAction( scrolled.live, 1440 );
	assert.equal( live.scrollY, 600, 'the live page scrolls as a visitor would' );
	const draft = await runAction( scrolled.draft, 1440 );
	assert.equal( draft.scrollY, 600, 'the draft scrolls too, then applies its way' );
	assert.deepEqual( draft.log, [ { type: 'click', target: 'state "scrolled" on Root', hit: false } ], 'a blank page has no draft component: the way is a miss' );
	const rest = await runAction( cfg.states[ 2 ].live, 1440 );
	assert.deepEqual( [ rest.scrollY, rest.log ], [ 0, [] ], 'a rest state does nothing on live' );
} );

test( 'MUST FAIL: the state check reads a width-scoped state only at its widths, and a state is named by its record name too', async () => {
	const cfg = await config( walk( { top: null, 'full-nav': null, 'compact-nav': null } ) );
	const groups = stateGroups( { ...cfg, pairs: [ { name: 'p', draft: '.a', live: '.b' } ] } );
	assert.deepEqual( groups.map( ( g ) => [ g.name, groupWidths( g, [ 375, 768, 1440 ] ) ] ), [ [ null, [ 375, 768, 1440 ] ], [ 'full-nav', [ 1440 ] ], [ 'compact-nav', [ 375, 768 ] ] ] );
	// A width-only state (a bound, no way to set it) is walked at its widths, with actions so the state check follows it.
	const tabletRecord = { ...RECORD, states: [ RECORD.states[ 0 ], { name: 'tablet', state_keys: { w: '768–1023' } } ] };
	const tablet = walkerStates( { entry: { states: { top: null, tablet: null } }, record: tabletRecord, facts: FACTS, rootComponent: 'Demo Site', widthKeys: WIDTH_KEYS, widths: WALK_WIDTHS } );
	assert.deepEqual( tablet.states.map( ( s ) => [ s.name, s.ways.length, s.widths ] ), [ [ 'top', 2, null ], [ 'tablet', 0, [ 768 ] ] ] );
	// Negative control: a range over a key the component does not write from the width (an accordion index) is no bound,
	// as in Fill's opener (lib/state-openers.mjs), so a state with no way and no bound is refused, never walked.
	const noWidthKeys = walkerStates( { entry: { states: { top: null, tablet: null } }, record: tabletRecord, facts: FACTS, rootComponent: 'Demo Site', widthKeys: new Map(), widths: WALK_WIDTHS } );
	assert.deepEqual( [ noWidthKeys.states.map( ( s ) => s.name ), noWidthKeys.refused.map( ( r ) => r.state ) ], [ [ 'top' ], [ 'tablet' ] ] );
	const tabletCfg = await config( tablet );
	assert.deepEqual( stateGroups( { ...tabletCfg, pairs: [ { name: 'p', draft: '.a', live: '.b' } ] } ).map( ( g ) => g.name ), [ null, 'tablet' ] );
	// A state the config cannot open on both sides (a hand config's draft-only state) is never read by the state check.
	assert.deepEqual( stateGroups( { states: [ { name: 'top' }, { name: 'half', draft: async () => {} } ], pairs: [ { name: 'p', draft: '.a', live: '.b' } ] } ).map( ( g ) => g.name ), [ null ] );
	// A surface key equal to the record state's own name (any case) names it as its walker key does.
	assert.deepEqual( walk( { top: null, 'Signed Out': null } ).states.map( ( s ) => s.name ), [ 'top', 'Signed Out' ] );
} );

test( 'MUST FAIL: the opener\'s way Fill opened with at a width decides what the config\'s open already applied there', () => {
	const opener = { state: 'compact nav (Menu button)', ways: [ { state: 'compact nav (Menu button)', bounds: [] }, { state: 'full nav', bounds: [ { key: 'w', min: 1060, max: null } ] } ], openedAt: { 1440: 1, 1920: 1 } };
	assert.deepEqual( walk( { 'full-nav': null, 'compact-nav': null }, { opener } ).states.map( ( s ) => [ s.name, s.skipAt ] ), [ [ 'full-nav', [ 1440, 1920 ] ], [ 'compact-nav', [ 375, 768 ] ] ] );
} );

// A live page where the header's state panel is controlled by a button outside it.
const OWNED = ( open = false ) => `<!doctype html><html><body><button id="t" aria-controls="panel" aria-expanded="${ open }">More</button><div id="panel"${ open ? '' : ' hidden' }><nav class="cr-ref-header-0">x</nav></div>
<script>document.getElementById( 't' ).addEventListener( 'click', () => { const p = document.getElementById( 'panel' ); p.hidden = ! p.hidden; document.getElementById( 't' ).setAttribute( 'aria-expanded', String( ! p.hidden ) ); } );</script></body></html>`;

test( 'MUST FAIL: an owner state opens the live root through its control, a skipped width applies no draft way, and a miss is logged', async () => {
	const current = walkerStates( { entry: { states: { top: null, more: 'current' } }, record: { ...RECORD, states: [ RECORD.states[ 0 ], { name: 'more', state_keys: { user: 'x' } } ] }, facts: FACTS, rootComponent: 'Demo Site', vocab: VOCAB, widths: WALK_WIDTHS } );
	current.states[ 1 ].skipAt = [ 1440 ];
	const cfg = await config( current );
	const page = await browser.newPage( { viewport: { width: 375, height: 800 } } );
	try {
		for ( const open of [ false, true ] ) {
			await page.setContent( OWNED( open ) );
			const h = { page, log: [] };
			await cfg.states[ 1 ].live( h );
			assert.equal( await page.evaluate( () => ! document.getElementById( 'panel' ).hidden ), true, 'the panel is open on live' );
			assert.deepEqual( h.log.map( ( e ) => e.hit ), [ true ], open ? 'a panel open already is a hit, never toggled shut' : 'the control was clicked' );
		}
		await page.setContent( '<!doctype html><p>nothing controls it</p>' );
		const miss = { page, log: [] };
		await cfg.states[ 1 ].live( miss );
		assert.deepEqual( miss.log.map( ( e ) => e.hit ), [ false ], 'nothing controls the root: a miss' );
	} finally {
		await page.close();
	}
	assert.deepEqual( ( await runAction( cfg.states[ 1 ].draft, 1440 ) ).log, [], 'at a skipped width the draft way is not applied' );
	assert.deepEqual( ( await runAction( cfg.states[ 1 ].draft, 375 ) ).log.map( ( e ) => e.target ), [ 'state "more" on Root' ], 'elsewhere it is' );
} );

test( 'MUST FAIL: a state name from the draft is text in the generated live action, never code', async () => {
	// A surfaces.json state name is draft data: a backtick or `${ … }` in it must print as written and run nothing.
	const name = 'odd`${ globalThis.__walkerStateInjected = 1 }';
	const src = stateLiveSource( { name, reach: 'owner' }, '.cr-ref-header-0' );
	const action = new Function( `return ( ${ src } );` )();
	const logged = [];
	const realLog = console.log;
	console.log = ( ...a ) => logged.push( a.join( ' ' ) );
	try {
		await action( { page: { evaluate: async () => ( { clicked: false, why: 'nothing controls it' } ), waitForTimeout: async () => {} }, log: [] } );
	} finally {
		console.log = realLog;
	}
	assert.equal( globalThis.__walkerStateInjected, undefined, 'the name was run as code' );
	assert.deepEqual( logged, [ `live state ${ name }: nothing controls it` ] );
} );
