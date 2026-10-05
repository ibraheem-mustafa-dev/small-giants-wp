// The four flows against the local mock shop in headless Chromium. Each flow passes in `good` and fails with its own
// named signal in the matching bug mode; the other flows are unaffected by that bug, which proves the signals are
// specific. Needs Playwright with Chromium: in a git worktree lib/browser.mjs finds the main checkout's copy.
//
//   node --test scripts/parity/flows/tests/flows.test.mjs
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch } from '../lib/browser.mjs';
import { execute, runOne, STATUS } from '../lib/flow.mjs';
import { startMockShop } from './mock-shop.mjs';
import { runAll, MIN_GAP_MS } from '../run-all.mjs';
import * as twoProducts from '../bag-two-products.mjs';
import * as secondUnit from '../bag-second-unit.mjs';
import * as lensSkip from '../lens-skip-to-bag.mjs';
import * as filters from '../filter-apply-clear.mjs';

const FLOWS = [ twoProducts, secondUnit, lensSkip, filters ];
// mode -> { flow name: expected signal (a string prefix) } for the flows that must FAIL; every other flow must pass.
const EXPECT = {
	good: {},
	'bug-a': { 'bag-two-products': 'bag-lost-line' },
	'bug-b': { 'bag-second-unit': 'cooldown-blocked-second-unit' },
	'bug-filter': { 'filter-apply-clear': 'groups!=headings (' },
	'bug-skip': { 'lens-skip-to-bag': 'skip-opens-extra-step' },
};

let browser;
before( async () => {
	browser = await launch( { headed: false } );
} );
after( async () => {
	await browser.close();
} );

async function runFlowIn( mode, flow ) {
	const shop = await startMockShop( { mode } );
	const context = await browser.newContext( { viewport: { width: 1440, height: 900 } } );
	try {
		return await execute( flow, { page: await context.newPage(), base: shop.url } );
	} finally {
		await context.close();
		await shop.close();
	}
}

for ( const [ mode, failing ] of Object.entries( EXPECT ) ) {
	for ( const flow of FLOWS ) {
		const name = flow.meta.name;
		const want = failing[ name ];
		test( `${ mode }: ${ name } ${ want ? `FAILS with ${ want }` : 'passes' }`, async () => {
			const r = await runFlowIn( mode, flow );
			if ( want ) {
				assert.equal( r.status, STATUS.FAIL, `${ r.status } ${ r.signal } ${ r.detail }` );
				assert.ok( r.signal.startsWith( want ), `signal was ${ r.signal }` );
			} else {
				assert.equal( r.status, STATUS.PASS, `${ r.status } ${ r.signal } ${ r.detail }` );
			}
		} );
	}
}

test( 'bug-b: the second add is inside the 20 s window the flow asserts, and the shop answered 429 sgs_rate_limited', async () => {
	const r = await runFlowIn( 'bug-b', secondUnit );
	assert.ok( r.evidence.gapMs < 20000, `gap ${ r.evidence.gapMs } ms` );
	assert.equal( r.evidence.adds[ 1 ].status, 429 );
	assert.equal( r.evidence.adds[ 1 ].code, 'sgs_rate_limited' );
	assert.match( r.evidence.adds[ 1 ].ui, /please wait/i );
} );

test( 'bug-a: both adds returned 2xx (the bag is what lost the line), recorded with status and code', async () => {
	const r = await runFlowIn( 'bug-a', twoProducts );
	assert.deepEqual( r.evidence.adds.map( ( a ) => a.status ), [ 200, 200 ] );
	assert.equal( r.evidence.bag.lines.length, 1 );
} );

test( 'bug-filter: the empty shells are reported as well as the group/heading mismatch', async () => {
	const r = await runFlowIn( 'bug-filter', filters );
	assert.ok( r.evidence.problems.some( ( p ) => p.signal === 'empty-shell-groups' ) );
	assert.equal( r.evidence.baseline.groups, r.evidence.baseline.headings, 'the baseline itself was clean' );
} );

test( 'a flow that cannot reach its state is an ERROR (no skip link on the page), not a failure', async () => {
	const shop = await startMockShop( { mode: 'good' } );
	const context = await browser.newContext();
	try {
		const page = await context.newPage();
		process.env.SGS_FLOW_LENS_PRODUCT = '/product/b/'; // product B has no lens pop-up
		const r = await execute( lensSkip, { page, base: shop.url } );
		assert.equal( r.status, STATUS.ERROR );
	} finally {
		delete process.env.SGS_FLOW_LENS_PRODUCT;
		await context.close();
		await shop.close();
	}
} );

test( 'run-all: leaves 31 s or more between flows (a shorter request is clamped up), one JSON per flow, flows-only output', async () => {
	const shop = await startMockShop( { mode: 'good' } );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-flows-' ) );
	const waits = [];
	try {
		const results = await runAll( { base: shop.url, dir, gapMs: 0, wait: async ( ms ) => waits.push( ms ), quiet: true } );
		assert.deepEqual( waits, [ MIN_GAP_MS, MIN_GAP_MS, MIN_GAP_MS ] );
		assert.ok( MIN_GAP_MS >= 31000 );
		assert.deepEqual( results.map( ( r ) => r.status ), [ 'pass', 'pass', 'pass', 'pass' ] );
		const files = fs.readdirSync( dir ).sort();
		assert.deepEqual( files, [ '_summary.json', 'bag-second-unit.json', 'bag-two-products.json', 'filter-apply-clear.json', 'lens-skip-to-bag.json' ] );
		const one = JSON.parse( fs.readFileSync( path.join( dir, 'bag-two-products.json' ), 'utf8' ) );
		for ( const k of [ 'flow', 'status', 'signal', 'precondition', 'expected', 'failureSignals', 'evidence', 'steps', 'startedAt', 'durationMs' ] ) {
			assert.ok( Object.hasOwn( one, k ), `result has ${ k }` );
		}
	} finally {
		await shop.close();
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

test( 'runOne writes into the directory it is given and nowhere near the parity reports', async () => {
	const shop = await startMockShop( { mode: 'good' } );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-flows-' ) );
	try {
		const r = await runOne( filters, { base: shop.url, dir, quiet: true } );
		assert.equal( r.file, path.join( dir, 'filter-apply-clear.json' ) );
		assert.ok( ! /walker|solve-report|triage|parity/.test( r.file.replace( dir, '' ) ) );
	} finally {
		await shop.close();
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );
