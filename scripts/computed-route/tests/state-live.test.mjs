// The live side of the state check (Spec 48 FR-48-81) in a real browser: the draft and the live page are read by the
// same state reader, and a live page that never paints the draft's state look is reported.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { openDraft, openLive } from '../lib/pairs-page.mjs';
import { statePairs, stateGroups, stateSkips, wantedProps, liveStateCheck, stateReport, surfaceStateCheck, readSide } from '../lib/state-live.mjs';

const VOCAB = JSON.parse( readFileSync( new URL( '../../../plugins/sgs-blocks/scripts/data/states.json', import.meta.url ), 'utf8' ) ).states;
const page = ( css ) => `data:text/html,${ encodeURIComponent( `<!doctype html><html><head><style>${ css }</style></head><body><div class="card"><p class="title">Card title</p></div><a class="go" href="#x">Go</a></body></html>` ) }`;
const DRAFT = page( '.card .title { color: rgb(0, 0, 0) } .card:hover .title { color: rgb(200, 0, 0) } .go { color: rgb(0, 0, 0) } .go:focus-visible { color: rgb(0, 0, 200) }' );
const PAINTS = page( '.card .title { color: rgb(0, 0, 0) } .card:hover .title { color: rgb(200, 0, 0) } .go { color: rgb(0, 0, 0) } .go:focus-visible { color: rgb(0, 0, 200) }' );
const NEVER = page( '.card .title { color: rgb(0, 0, 0) } .go { color: rgb(0, 0, 0) } .go:focus-visible { color: rgb(0, 0, 200) }' );
const PAIRS = [ { name: 'title', draft: '.title', live: '.title' }, { name: 'go', draft: '.go', live: '.go' } ];

const { chromium } = await import( 'playwright' );
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

test( 'statePairs follows every pair that has both finders, and stateGroups reads each in its walker states', () => {
	const open = async () => {};
	const cfg = {
		states: [ { name: 'closed', draft: open, live: open }, { name: 'drawer-open', draft: open, live: open }, { name: 'half', draft: open } ],
		pairs: [
			...PAIRS,
			{ name: 'run', draft: { textRun: { within: 'main' } }, live: '.x' },
			{ name: 'grp', draft: { group: { paths: [ '.a', '.b' ] } }, live: '.x', states: [ 'closed', 'drawer-open' ] },
			{ name: 'open', states: [ 'drawer-open' ], draft: '.a', live: '.b' },
			{ name: 'half', states: [ 'half' ], draft: '.a', live: '.b' },
			{ name: 'bare', draft: '.a' },
		],
	};
	const pairs = statePairs( cfg );
	assert.deepEqual( pairs.map( ( p ) => p.name ), [ 'title', 'go', 'run', 'grp', 'open' ], 'a state the config cannot open on both sides, and a pair without a live finder, are not followed' );
	assert.notEqual( pairs[ 0 ].draft, pairs[ 0 ].live, 'each side has its own job id' );
	const groups = stateGroups( cfg );
	assert.deepEqual( groups.map( ( g ) => [ g.name, g.pairs.map( ( p ) => p.name ) ] ), [ [ null, [ 'title', 'go', 'run', 'grp' ] ], [ 'drawer-open', [ 'grp', 'open' ] ] ] );
	assert.deepEqual( groups[ 0 ].pairs[ 2 ].draftFinder, { textRun: { within: 'main' } }, 'a text run keeps its finder; the in-page resolver reads its `within`' );
} );

test( 'wantedProps asks the live side for every property the draft state changes', () => {
	const pairs = statePairs( { pairs: PAIRS } );
	const want = wantedProps( { looks: { [ pairs[ 0 ].draft ]: [ { declared: { color: 'red' } }, { declared: { color: 'blue', opacity: '1' } } ] } }, pairs );
	assert.deepEqual( want[ pairs[ 0 ].live ], [ 'color', 'opacity' ] );
	assert.deepEqual( want[ pairs[ 1 ].live ], [] );
} );

const run = ( live ) => liveStateCheck( { browser, cfg: { draft: { url: DRAFT }, live: { url: live }, pairs: PAIRS }, rows: VOCAB, widths: [ 1440 ] } );

test( 'MUST FAIL: a live page that never paints the hover is reported as differing', async () => {
	const check = await run( NEVER );
	const hover = check.rows.find( ( r ) => 'title' === r.pair && 'hover' === r.state && 'color' === r.prop );
	assert.ok( hover, 'the draft hover look is checked' );
	assert.equal( hover.verdict, 'differs' );
	assert.equal( hover.liveState, false, 'the live page has no hover look' );
	assert.equal( hover.liveValue, 'rgb(0, 0, 0)', 'the live resting colour is what shows' );
	const focus = check.rows.find( ( r ) => 'go' === r.pair && r.state.includes( 'focus' ) );
	assert.equal( focus?.verdict, 'match', 'a state the live page paints matches' );
	const report = stateReport( check );
	assert.equal( report.json.open.length, 1 );
	assert.match( report.markdown, /\| title \| 1440 \| hover \| color \| rgb\(200, 0, 0\) \| rgb\(0, 0, 0\) \(no live state look\) \| differs \|/ );
} );

test( 'a live page that paints every draft state look reports no open row', async () => {
	const check = await run( PAINTS );
	assert.ok( check.rows.length >= 2 );
	assert.equal( check.summary.differs, 0 );
	assert.equal( check.summary.unreadable, 0 );
	assert.equal( stateReport( check ).json.open.length, 0 );
} );

const TIMED = ( dur ) => page( `.card .title { color: rgb(0, 0, 0) } .go { color: rgb(0, 0, 0); transition-duration: ${ dur } } .go:focus-visible { color: rgb(0, 0, 200) }` );

test( 'MUST FAIL: a live page that times a change differently is reported in the open rows; the same timing is not', async () => {
	const draft = TIMED( '0.3s' );
	const wrong = await liveStateCheck( { browser, cfg: { draft: { url: draft }, live: { url: TIMED( '0.9s' ) }, pairs: PAIRS }, rows: VOCAB, widths: [ 1440 ] } );
	const row = wrong.rows.find( ( r ) => 'transition-duration' === r.prop );
	assert.ok( row, 'the draft timing is checked' );
	assert.deepEqual( [ row.pair, row.verdict, row.draftValue, row.liveValue ], [ 'go', 'differs', '0.3s', '0.9s' ] );
	assert.match( row.state, /^timing /, 'a timing row is told apart from a state row' );
	const open = stateReport( wrong ).json.open;
	assert.ok( open.some( ( r ) => 'transition-duration' === r.prop ), 'it reaches the report' );
	assert.match( stateReport( wrong ).markdown, /\| go \| 1440 \| timing rest \(both\) \| transition-duration \| 0\.3s \| 0\.9s \| differs \|/ );
	const same = await liveStateCheck( { browser, cfg: { draft: { url: draft }, live: { url: TIMED( '300ms' ) }, pairs: PAIRS }, rows: VOCAB, widths: [ 1440 ] } );
	assert.equal( same.rows.find( ( r ) => 'transition-duration' === r.prop )?.verdict, 'match', '0.3s and 300ms are the same time' );
	assert.equal( stateReport( same ).json.open.length, 0 );
} );

test( 'MUST FAIL: a :visited look the live page lacks is reported as unconfirmed by the render', async () => {
	const draft = page( '.go { color: rgb(0, 0, 0) } .go:visited { color: rgb(128, 0, 128) }' );
	const check = await liveStateCheck( { browser, cfg: { draft: { url: draft }, live: { url: page( '.go { color: rgb(0, 0, 0) }' ) }, pairs: PAIRS }, rows: VOCAB, widths: [ 1440 ] } );
	const row = check.rows.find( ( r ) => 'go' === r.pair && 'visited' === r.state );
	assert.deepEqual( [ row?.verdict, row?.confirmed, row?.draftValue ], [ 'differs', false, 'rgb(128, 0, 128)' ] );
	assert.match( stateReport( check ).markdown, /differs \(declared in code, not confirmed by the render\) \|/ );
	assert.equal( check.summary.unreachedDraft.length, 0, ':visited is read by code, no longer listed as unreachable' );
} );

const panelPage = ( css, fake = '', before = '' ) => `data:text/html,${ encodeURIComponent( `<!doctype html><html><head><style>${ css }</style></head><body><button id="open" onclick="document.getElementById('panel').hidden=false">Open</button>${ before }<div id="panel" hidden><a class="pl" href="#x">Panel link</a></div>${ fake }</body></html>` ) }`;
const click = ( h ) => h.page.click( '#open' );
const PANEL_CFG = ( live ) => ( {
	draft: { url: panelPage( '.pl { color: rgb(0, 0, 0) } .pl:hover { color: rgb(200, 0, 0) }' ) },
	live: { url: live },
	states: [ { name: 'closed', draft: async () => {}, live: async () => {} }, { name: 'panel-open', draft: click, live: click } ],
	pairs: [ { name: 'plink', states: [ 'panel-open' ], draft: '.pl', live: '.pl' } ],
} );

test( 'MUST FAIL: a state-scoped pair is read in its walker state, and a hover look the live panel lacks is reported', async () => {
	const check = await liveStateCheck( { browser, cfg: PANEL_CFG( panelPage( '.pl { color: rgb(0, 0, 0) }' ) ), rows: VOCAB, widths: [ 1440 ] } );
	const hover = check.rows.find( ( r ) => 'plink' === r.pair && 'hover' === r.state && 'color' === r.prop );
	assert.ok( hover, 'the panel link is read inside the opened panel' );
	assert.deepEqual( [ hover.verdict, hover.walkerState, hover.liveValue ], [ 'differs', 'panel-open', 'rgb(0, 0, 0)' ] );
	assert.equal( check.pairs, 1 );
	assert.match( stateReport( check ).markdown, /\| plink \| 1440 \| panel-open: hover \| color \|/ );
	const ok = await liveStateCheck( { browser, cfg: PANEL_CFG( panelPage( '.pl { color: rgb(0, 0, 0) } .pl:hover { color: rgb(200, 0, 0) }' ) ), rows: VOCAB, widths: [ 1440 ] } );
	assert.equal( ok.summary.differs, 0 );
	assert.ok( ok.summary.match >= 1 );
} );

// A page whose logic runtime is faked the way the draft's is (lib/intake-state.mjs::logicState walks a host's React
// fiber to a component holding `logic.setState`): setting `secret` marks the body, and a rule keyed on that mark paints.
const LOGIC_FAKE = '<div class="sc-host" data-sc-name="Home"></div><script>(() => { const logic = { state: { secret: false }, setState( p ) { Object.assign( this.state, p ); document.body.classList.toggle( "secret", !! this.state.secret ); } }; const host = document.querySelector( ".sc-host" ); host.__reactFiber$x = { stateNode: { logic, __name: "Home" }, return: null }; })();</script>';
const logicPage = ( css ) => panelPage( `.title { color: rgb(0, 0, 0) } ${ css }`, LOGIC_FAKE, '<p class="title">Title</p>' );

test( 'MUST FAIL: a logic-state look the live page does not show is reported', async () => {
	const logicRows = [ { id: 'Home:8', component: 'Home', reach: 'set-state', keys: { secret: true }, settingState: 'open' } ];
	const cfg = ( live ) => ( { draft: { url: logicPage( 'body.secret .title { color: rgb(0, 128, 0) }' ) }, live: { url: live }, pairs: [ { name: 'title', draft: '.title', live: '.title' } ], logicRows } );
	const bad = await liveStateCheck( { browser, cfg: cfg( logicPage( '' ) ), rows: VOCAB, widths: [ 1440 ], } );
	const row = bad.rows.find( ( r ) => 'title' === r.pair && 'open#logic' === r.state && 'color' === r.prop );
	assert.ok( row, 'the draft logic look is checked' );
	assert.deepEqual( [ row.verdict, row.draftValue, row.liveValue ], [ 'differs', 'rgb(0, 128, 0)', 'rgb(0, 0, 0)' ] );
	const good = await liveStateCheck( { browser, cfg: cfg( logicPage( 'body.secret .title { color: rgb(0, 128, 0) }' ) ), rows: VOCAB, widths: [ 1440 ] } );
	assert.equal( good.rows.find( ( r ) => 'open#logic' === r.state && 'color' === r.prop )?.verdict, 'match' );
} );

test( 'MUST FAIL: a logic state the page cannot enter is listed in the unreached states, and reaches the report', async () => {
	const p = await browser.newPage();
	try {
		await p.goto( logicPage( '' ) );
		const logicRows = [ { id: 'Home:9', component: 'Home', reach: 'set-state', keys: { zzz: true } } ];
		const side = await readSide( p, [ { id: 'd0', finder: '.title' } ], VOCAB, null, () => {}, logicRows );
		const gap = side.states.unreached.find( ( u ) => 'sc-if Home:9' === u.selector );
		assert.ok( gap, 'the gap is listed' );
		assert.match( gap.why, /no setting state/ );
		const report = stateReport( { rows: [], pairs: 1, summary: { match: 0, differs: 0, unreadable: 0, byState: {}, unreachedDraft: side.states.unreached } } );
		assert.match( report.markdown, /sc-if Home:9/ );
	} finally {
		await p.close();
	}
} );

test( 'MUST FAIL: the live state check returns a pair it did not follow, and the report lists it', async () => {
	const cfg = { draft: { url: DRAFT }, live: { url: PAINTS }, pairs: [ ...PAIRS, { name: 'ghost', states: [ 'nowhere' ], draft: '.title', live: '.title' } ] };
	const check = await liveStateCheck( { browser, cfg, rows: VOCAB, widths: [ 1440 ] } );
	assert.deepEqual( check.skipped.map( ( k ) => [ k.name, k.state ] ), [ [ 'ghost', 'nowhere' ] ] );
	assert.match( stateReport( check ).markdown, /Not followed: ghost \(nowhere\)/ );
} );

test( 'MUST FAIL: a pair whose state cannot be opened is listed as not followed, with the reason', () => {
	const open = async () => {};
	const cfg = { states: [ { name: 'closed', draft: open, live: open }, { name: 'half', draft: open } ], pairs: [ { name: 'a', draft: '.a', live: '.a' }, { name: 'h', states: [ 'half' ], draft: '.a', live: '.b' }, { name: 'bare', draft: '.a' } ] };
	assert.deepEqual( stateSkips( cfg ).map( ( k ) => [ k.name, k.state ] ), [ [ 'h', 'half' ], [ 'bare', null ] ] );
	const md = stateReport( { rows: [], pairs: 1, skipped: stateSkips( cfg ), summary: { match: 0, differs: 0, unreadable: 0, byState: {}, unreachedDraft: [] } } ).markdown;
	assert.match( md, /Not followed: h \(half\): the walker config cannot open "half" on both sides; bare: no live finder/ );
} );

test( 'MUST FAIL: surfaceStateCheck passes the sc-if rows of the surface (from its state map) to the live check', async () => {
	const buildDir = mkdtempSync( join( tmpdir(), 'surf-' ) );
	mkdirSync( join( buildDir, 'intake' ) );
	const intake = {
		census: [ { kind: 'sc-if', draftId: 'Home:5', component: 'Home' } ],
		inventory: { surfaces: { records: [ { id: 'S-1', kind: 'drawer', dc: 'Home', states: [ { name: 'secret=true', state_keys: { secret: true }, sc_if_tpl_ids: [ '5' ] } ] } ], counts: { toggling_sc_ifs: { covered_by: { 'Home:5': 'S-1' } } } } },
	};
	writeFileSync( join( buildDir, 'intake', 'intake.json' ), JSON.stringify( intake ) );
	const seen = [];
	const run = async ( args ) => {
		seen.push( args );
		return { rows: [], pairs: 0, skipped: [], summary: { match: 0, differs: 0, unreadable: 0, byState: {}, unreachedDraft: [] } };
	};
	const surfaces = { header: { states: { closed: null } } };
	await surfaceStateCheck( { cfg: { pairs: [] }, vocab: { rows: VOCAB }, surfaces, surface: 'header', buildDir, run } );
	assert.deepEqual( seen[ 0 ].logicRows.map( ( r ) => [ r.id, r.reach ] ), [ [ 'Home:5', 'set-state' ] ] );
	await surfaceStateCheck( { cfg: { pairs: [] }, vocab: { rows: VOCAB }, surfaces, surface: 'header', buildDir: join( buildDir, 'none' ), run } );
	assert.deepEqual( seen[ 1 ].logicRows, [], 'no intake, no rows' );
} );

test( 'MUST FAIL: a page whose state entry throws is closed before the error leaves openDraft and openLive', async () => {
	const opened = [];
	const spy = { newPage: async ( o ) => {
		const p = await browser.newPage( o );
		opened.push( p );
		return p;
	} };
	const boom = { name: 'boom', draft: async () => {
		throw new Error( 'draft state entry failed' );
	}, live: async () => {
		throw new Error( 'live state entry failed' );
	} };
	const cfg = { draft: { url: DRAFT }, live: { url: DRAFT } };
	await assert.rejects( openDraft( spy, cfg, 1440, boom ), /draft state entry failed/ );
	await assert.rejects( openLive( spy, cfg, 1440, boom ), /live state entry failed/ );
	assert.equal( opened.length, 2 );
	assert.deepEqual( opened.map( ( p ) => p.isClosed() ), [ true, true ] );
} );
