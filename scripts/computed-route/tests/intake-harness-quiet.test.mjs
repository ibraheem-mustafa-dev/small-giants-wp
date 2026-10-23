// Spec 48 FR-48-28, lib/intake-harness.mjs::steps quiet-step skipping on the fixture export
// tests/fixtures/intake-harness-quiet/ (a 500ms timeout and a 9000ms timeout that write the clock into the DOM, a
// 6500ms interval that writes its tick time, a frame-loop counter, and an IntersectionObserver reveal below the fold
// that writes the clock and starts a 400ms transition and a 700ms timeout; no infinite animation, so the long waits
// between the interval's ticks are quiet). With skipping on (the default) and off (opts.skipQuiet false, as
// INTAKE_SKIP_QUIET=0) the rest and clock-sample readings are byte-identical, the settle times agree, and the
// 6500ms-interval settle drops from about 1285 page calls to about 112 (asserted as under a quarter: a count of the work
// done, since wall time includes the browser launch and page load, which a loaded machine stretches). The readings are
// sensitive to the virtual time an observer or timer fires at (a 4ms shift in the scroll step changes them), so the
// identity is not vacuous.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { quietSkip, openHarness, settleRest } from '../lib/intake-harness.mjs';
import { readSurface } from '../lib/intake-reading.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURE = path.join( HERE, 'fixtures', 'intake-harness-quiet' );
const INDEX = 'Home.dc.html';
let harPath;

const read = ( extra = {} ) => readSurface( { folder: FIXTURE, index: INDEX, harPath, width: 1440, mode: 'rest', ...extra } );
const bar = ( r, name ) => r.records.find( ( x ) => x.path.endsWith( `div:nth-child(${ { timeout: 2, frames: 3, interval: 4, late: 5, reveal: 7, after: 8 }[ name ] })` ) ) ?? assert.fail( `no ${ name } record` );

test.before( async () => {
	const { manifestHash } = recheckManifest( FIXTURE );
	harPath = path.join( os.tmpdir(), 'sgs-intake-harness-quiet-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FIXTURE, index: INDEX, harPath } );
	}
} );

test( 'MUST FAIL: rest readings with quiet-step skipping on and off are byte-identical', async () => {
	const on = await read();
	const off = await read( { skipQuiet: false } );
	assert.equal( on.jsonl, off.jsonl );
	for ( const k of [ 'settleMs', 'settleAfterScrollMs', 'virtualMs' ] ) {
		assert.equal( on.summary[ k ], off.summary[ k ], `${ k } differs` );
	}
	assert.deepEqual( on.summary.scroll, off.summary.scroll );
	// Every writer fired at its virtual time: 500ms, 9000ms, three ticks at 6500, 13000 and 19500ms, 60 frames.
	assert.equal( bar( on, 'timeout' ).declared.width, '100px' );
	assert.equal( bar( on, 'late' ).declared.width, '180px' );
	assert.equal( bar( on, 'interval' ).declared.width, '49.5px' );
	assert.equal( bar( on, 'frames' ).declared.width, '60px' );
	assert.equal( on.summary.settleMs, 19504, 'the boot settle ends on the 16ms step after the third tick' );
	assert.ok( Number( bar( on, 'reveal' ).declared.width.replace( 'px', '' ) ) > 195, 'the reveal fired after the boot settle' );
} );

// The page calls one boot settle makes: a count of the work done, which a loaded machine does not change.
const settleCalls = async ( skipQuiet ) => {
	const h = await openHarness( { folder: FIXTURE, index: INDEX, harPath, skipQuiet } );
	try {
		const evaluate = h.page.evaluate.bind( h.page );
		let calls = 0;
		h.page.evaluate = ( ...args ) => {
			calls++;
			return evaluate( ...args );
		};
		const settled = await settleRest( h.page, h.options );
		return { calls, settleMs: settled.settleMs };
	} finally {
		await h.close();
	}
};

test( 'MUST FAIL: skipping the quiet stretches cuts the page calls of the 6500ms-interval settle to under a quarter, to the same settle time', async () => {
	const on = await settleCalls( true );
	const off = await settleCalls( false );
	assert.equal( on.settleMs, off.settleMs );
	assert.ok( off.calls > 1000, `the control: stepping every 16ms makes ${ off.calls } page calls` );
	assert.ok( on.calls * 4 < off.calls, `skipping saved too little: ${ off.calls } page calls off, ${ on.calls } on` );
} );

test( 'MUST FAIL: clock-kind sample readings with skipping on and off are byte-identical', async () => {
	const sample = { target: '[data-q="interval"]', times: [ 450, 7000, 20000 ], kind: 'clock' };
	const on = await read( { mode: 'sample', sample } );
	const off = await read( { mode: 'sample', sample, skipQuiet: false } );
	assert.equal( on.jsonl, off.jsonl );
	assert.equal( on.records.filter( ( r ) => 7000 === r.t ).find( ( r ) => r.path.endsWith( 'div:nth-child(4)' ) ).declared.width, '16.5px' );
} );

test( 'MUST FAIL: a settle on a page with nothing pending ends on its first step, with skipping on as off (no jump before a step reports something pending)', async () => {
	for ( const skipQuiet of [ true, false ] ) {
		const h = await openHarness( { folder: FIXTURE, index: INDEX, harPath, skipQuiet } );
		try {
			await settleRest( h.page, h.options );
			const again = await settleRest( h.page, h.options );
			assert.equal( again.settleMs, 16, `skipQuiet ${ skipQuiet }: the settled page's boot settle took ${ again.settleMs }ms` );
			assert.equal( again.settleAfterScrollMs, 16 );
			assert.equal( again.virtualMs - again.startMs, 16 + 100 * again.scroll.length + 16 );
		} finally {
			await h.close();
		}
	}
} );

test( 'negative control: the readings change when an observer fires 4ms of virtual time later, so the identity above is not vacuous', async () => {
	const ref = await read();
	const shifted = await read( { scrollStepMs: 104 } );
	assert.notEqual( shifted.jsonl, ref.jsonl );
	assert.notEqual( bar( shifted, 'after' ).declared.width, bar( ref, 'after' ).declared.width );
} );

test( 'quietSkip jumps whole steps, stops at least one step before the next due time, and never exceeds the limit', () => {
	const o = { stepMs: 16 };
	assert.equal( quietSkip( 6500, Infinity, o ), 6480 );
	assert.equal( ( 6500 - quietSkip( 6500, Infinity, o ) ) > 16, true );
	assert.equal( quietSkip( 32, Infinity, o ), 16 );
	assert.equal( quietSkip( 31, Infinity, o ), 0, 'under two steps of quiet is stepped' );
	assert.equal( quietSkip( 0, Infinity, o ), 0 );
	assert.equal( quietSkip( null, 100, o ), 80, 'nothing scheduled: bounded by the time left, the last step still stepped' );
	assert.equal( quietSkip( null, Infinity, o ), 0, 'nothing scheduled and no limit: no jump' );
	assert.equal( quietSkip( 5000, 40, o ), 16 );
	for ( const q of [ 33, 47, 48, 49, 1000, 6499 ] ) {
		const s = quietSkip( q, Infinity, o );
		assert.equal( s % 16, 0 );
		assert.ok( q - s >= 16 && q - s < 32, `q ${ q }: jump ${ s }` );
	}
} );
