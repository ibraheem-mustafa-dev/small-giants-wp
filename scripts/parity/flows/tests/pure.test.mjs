// The flows' pure judgement: each failure signal is produced from plain data, no browser. The browser end is proved
// against the mock shop in flows.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTwoProducts, assertSecondUnit, isCooldownBlock, SIGNALS, SECOND_UNIT_MAX_GAP_MS } from '../lib/bag.mjs';
import { evaluateFilterProbe } from '../lib/filters.mjs';
import { parseEnv, baseUrl, candidateRoots } from '../lib/browser.mjs';
import { formatTable, exitCodeFor, execute, STATUS } from '../lib/flow.mjs';

const ok = ( id, at = 0 ) => ( { status: 200, code: null, id, at, ui: '' } );
const line = ( id, quantity = 1 ) => ( { id, key: String( id ), name: 'x', quantity } );

test( 'bag-lost-line: both adds 2xx but one line is missing', () => {
	const v = assertTwoProducts( ok( 101 ), ok( 102 ), { lines: [ line( 101 ) ] } );
	assert.equal( v.ok, false );
	assert.equal( v.signal, SIGNALS.LOST_LINE );
} );
test( 'bag-lost-line is not reported when both lines are there, and a refused add is named add-rejected instead', () => {
	assert.equal( assertTwoProducts( ok( 101 ), ok( 102 ), { lines: [ line( 101 ), line( 102 ) ] } ).ok, true );
	const refused = assertTwoProducts( ok( 101 ), { status: 429, code: 'sgs_rate_limited', id: 102, at: 0 }, { lines: [ line( 101 ) ] } );
	assert.match( refused.signal, /^add-rejected \(HTTP 429 sgs_rate_limited\)$/ );
} );

test( 'cooldown-blocked-second-unit: 429 sgs_rate_limited, or UI text "please wait"', () => {
	const bag = { lines: [ line( 101 ) ] };
	const byStatus = assertSecondUnit( ok( 101, 0 ), { status: 429, code: 'sgs_rate_limited', id: 101, at: 3000, ui: '' }, bag );
	assert.equal( byStatus.signal, SIGNALS.COOLDOWN );
	const byText = assertSecondUnit( ok( 101, 0 ), { status: 200, code: null, id: 101, at: 3000, ui: 'Please wait before adding more' }, bag );
	assert.equal( byText.signal, SIGNALS.COOLDOWN );
	assert.equal( isCooldownBlock( ok( 101 ) ), false );
} );
test( 'second unit passes with two units inside the window, and loses the line when the bag holds one', () => {
	assert.equal( assertSecondUnit( ok( 101, 0 ), ok( 101, 3000 ), { lines: [ line( 101, 2 ) ] } ).ok, true );
	assert.equal( assertSecondUnit( ok( 101, 0 ), ok( 101, 3000 ), { lines: [ line( 101, 1 ) ] } ).signal, SIGNALS.LOST_LINE );
} );
test( 'the gap is asserted: 20 s or more is invalid evidence, never a pass (a 31 s wait would hide the bug)', () => {
	const late = assertSecondUnit( ok( 101, 0 ), ok( 101, SECOND_UNIT_MAX_GAP_MS ), { lines: [ line( 101, 2 ) ] } );
	assert.equal( late.ok, false );
	assert.equal( late.invalid, true );
	assert.equal( late.signal, 'gap-too-long' );
	assert.equal( assertSecondUnit( ok( 101, 0 ), ok( 101, SECOND_UNIT_MAX_GAP_MS - 1 ), { lines: [ line( 101, 2 ) ] } ).ok, true );
} );

const probe = ( o ) => ( { groups: 3, headings: 3, labels: [ 'Gender', 'Colour', 'Brand' ], emptyShells: [], chosen: 0, ...o } );
test( 'filters: groups!=headings (n vs m) is the headline signal and empty shells are named too', () => {
	const v = evaluateFilterProbe( probe(), probe( { groups: 7, headings: 4, labels: [ '', '', '', 'Gender', 'Colour', 'Brand', 'Gender' ], emptyShells: [ 0, 1, 2, 6 ] } ) );
	assert.equal( v.ok, false );
	assert.equal( v.signal, 'groups!=headings (7 vs 4)' );
	assert.ok( v.problems.some( ( p ) => p.signal === 'empty-shell-groups' ) );
	assert.ok( v.problems.some( ( p ) => p.signal === 'duplicate-group-labels' ) );
} );
test( 'filters: a restored panel passes; a changed one is baseline-not-restored', () => {
	assert.equal( evaluateFilterProbe( probe(), probe() ).ok, true );
	assert.equal( evaluateFilterProbe( probe(), probe( { chosen: 1 } ) ).signal, 'baseline-not-restored' );
	assert.equal( evaluateFilterProbe( probe(), probe( { labels: [ 'Gender', 'Colour', 'Size' ] } ) ).signal, 'baseline-not-restored' );
} );

test( 'env parsing and base URL precedence, without printing or requiring any secret', () => {
	assert.deepEqual( parseEnv( 'A=1\n# c\nB="two"\r\nWP_URL_EYECARETEST=https://x.test/' ), { A: '1', B: 'two', WP_URL_EYECARETEST: 'https://x.test/' } );
	const fileEnv = { WP_URL_EYECARETEST: 'https://file.test/' };
	assert.equal( baseUrl( { arg: 'https://arg.test/', env: { SGS_FLOW_BASE_URL: 'https://env.test' }, fileEnv } ), 'https://arg.test' );
	assert.equal( baseUrl( { env: { SGS_FLOW_BASE_URL: 'https://env.test' }, fileEnv } ), 'https://env.test' );
	assert.equal( baseUrl( { env: {}, fileEnv } ), 'https://file.test' );
	assert.throws( () => baseUrl( { env: {}, fileEnv: {} } ), /No base URL/ );
} );
test( 'inside a worktree the main checkout is searched for secrets and node_modules', () => {
	const roots = candidateRoots( 'C:\\repo\\.claude\\worktrees\\agent-1' );
	assert.equal( roots.length, 2 );
	assert.match( roots[ 1 ].replace( /\\/g, '/' ), /repo$/ );
	assert.equal( candidateRoots( 'C:\\repo' ).length, 1 );
} );

test( 'a flow that throws is an ERROR, never a pass or a fail; exit codes keep the three apart', async () => {
	const boom = { meta: { name: 'x', precondition: '', expected: '', failureSignals: [] }, run: async () => {
		throw new Error( 'no button' );
	} };
	const r = await execute( boom, { page: null, base: 'http://b' } );
	assert.equal( r.status, STATUS.ERROR );
	assert.equal( exitCodeFor( [ { status: 'pass' } ] ), 0 );
	assert.equal( exitCodeFor( [ { status: 'pass' }, { status: 'fail' } ] ), 1 );
	assert.equal( exitCodeFor( [ { status: 'fail' }, { status: 'error' } ] ), 2 );
} );
test( 'the table prints a known-failure note only when that flow fails', async () => {
	const meta = { name: 'k', precondition: '', expected: '', failureSignals: [], knownFailure: 'expected until N38 lands' };
	const failing = await execute( { meta, run: async () => ( { status: 'fail', signal: 's', detail: 'd' } ) }, { page: null, base: 'b' } );
	const passing = await execute( { meta, run: async () => ( { status: 'pass' } ) }, { page: null, base: 'b' } );
	assert.match( formatTable( [ failing ] ), /expected until N38 lands/ );
	assert.doesNotMatch( formatTable( [ passing ] ), /N38/ );
} );
