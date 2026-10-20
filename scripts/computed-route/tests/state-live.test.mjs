// The live side of the state check (Spec 48 FR-48-81) in a real browser: the draft and the live page are read by the
// same state reader, and a live page that never paints the draft's state look is reported.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { statePairs, wantedProps, liveStateCheck, stateReport } from '../lib/state-live.mjs';

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

test( 'statePairs follows selector pairs at rest only', () => {
	const pairs = statePairs( { pairs: [ ...PAIRS, { name: 'run', draft: { textRun: { within: 'main' } }, live: '.x' }, { name: 'open', states: [ 'drawer-open' ], draft: '.a', live: '.b' } ] } );
	assert.deepEqual( pairs.map( ( p ) => p.name ), [ 'title', 'go' ] );
	assert.notEqual( pairs[ 0 ].draft, pairs[ 0 ].live, 'each side has its own job id' );
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
