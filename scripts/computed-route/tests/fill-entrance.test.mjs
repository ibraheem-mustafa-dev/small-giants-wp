// L9.7 entrances (lib/fill-entrance.mjs): duration and delay from sampled frames, distance from the transform at the first
// sampled frame, a looping element is not an entrance, and the values are written only through the resolver to the settings
// calibration ties to opacity and transform on that block.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { sampleEntrances, shapeEntrance, translationOf, entranceValues, entranceWrites, STEP_MS, JITTER_MS } from '../lib/fill-entrance.mjs';
import { openDb } from '../lib/db.mjs';

const pose = ( opacity, transform = 'none', translate = 'none' ) => ( { opacity, transform, translate, scale: 'none', rotate: 'none' } );
const RISE = pose( 0, 'matrix(1, 0, 0, 1, 0, 18)' );

test( 'MUST FAIL: an element that never moved, and one still moving at the end, are not entrances', () => {
	assert.equal( shapeEntrance( { seenAt: 100, first: pose( 1 ), firstChange: null, start: null, end: null, loop: false } ), null, 'static' );
	assert.equal( shapeEntrance( { seenAt: 100, first: RISE, firstChange: RISE, start: 120, end: 4400, loop: true } ), null, 'a loop' );
	assert.equal( shapeEntrance( undefined ), null );
	assert.ok( shapeEntrance( { seenAt: 100, first: RISE, firstChange: RISE, start: 300, end: 900, loop: false } ), 'the control with a settled entrance is one' );
} );

test( 'delay is first change minus first sight, duration is last change minus first change, both to the 50ms an author sets; distance is the first frame\'s translation', () => {
	assert.equal( STEP_MS, 50 );
	const e = shapeEntrance( { seenAt: 1000, first: RISE, firstChange: pose( 0.1, 'matrix(1, 0, 0, 1, 0, 17)' ), start: 1203, end: 1809, loop: false } );
	assert.deepEqual( [ e.delayMs, e.durationMs, e.distancePx, e.x, e.y, e.opacityFrom, e.fromFirstChange ], [ 200, 600, 18, 0, 18, 0, false ] );
	assert.deepEqual( entranceValues( e ), [ [ 'opacity', '0' ], [ 'transform', 'matrix(1, 0, 0, 1, 0, 18)' ], [ 'animation-duration', '0.6s' ], [ 'animation-delay', '0.2s' ] ] );
	// 580 and 780 measured are the 600 and 800 an author set: a frame is read late at each end.
	assert.equal( shapeEntrance( { seenAt: 0, first: RISE, firstChange: RISE, start: 10, end: 590, loop: false } ).durationMs, 600 );
	assert.equal( shapeEntrance( { seenAt: 0, first: RISE, firstChange: RISE, start: 10, end: 790, loop: false } ).durationMs, 800 );
} );

test( 'a delay of two frames or less is jitter: it measures as 0 and no delay value is written', () => {
	assert.equal( JITTER_MS, 40 );
	const e = shapeEntrance( { seenAt: 1000, first: RISE, firstChange: RISE, start: 1034, end: 1634, loop: false } );
	assert.equal( e.delayMs, 0 );
	assert.deepEqual( entranceValues( e ).map( ( [ p ] ) => p ), [ 'opacity', 'transform', 'animation-duration' ] );
	assert.equal( shapeEntrance( { seenAt: 1000, first: RISE, firstChange: RISE, start: 1100, end: 1700, loop: false } ).delayMs, 100 );
} );

test( 'a first frame already at rest (no backwards fill) takes the distance from the first frame that moved', () => {
	const e = shapeEntrance( { seenAt: 0, first: pose( 1 ), firstChange: pose( 0.02, 'matrix(1, 0, 0, 1, -24, 0)' ), start: 300, end: 700, loop: false } );
	assert.deepEqual( [ e.distancePx, e.x, e.fromFirstChange, e.opacityFrom ], [ 24, -24, true, 0.02 ] );
} );

test( 'translationOf reads matrix, matrix3d and the translate property, and adds them', () => {
	assert.deepEqual( translationOf( pose( 1, 'matrix(1, 0, 0, 1, 12, -6)' ) ), { x: 12, y: -6 } );
	assert.deepEqual( translationOf( pose( 1, 'matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, 5,7,0,1)' ) ), { x: 5, y: 7 } );
	assert.deepEqual( translationOf( pose( 1, 'none', '0px 18px' ) ), { x: 0, y: 18 } );
	assert.deepEqual( translationOf( pose( 1, 'matrix(1, 0, 0, 1, 10, 0)', '5px' ) ), { x: 15, y: 0 } );
	assert.deepEqual( translationOf( pose( 1 ) ), { x: 0, y: 0 } );
} );

const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
@keyframes rise { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
.rise { animation: rise 600ms linear 200ms both }
.late { animation: rise 600ms linear 300ms forwards }
.loop { animation: spin 1s linear infinite }
</style></head><body>
<p class="rise">Rises</p><p class="late">Late</p><p class="loop">Loops</p><p class="still">Still</p>
</body></html>`;

test( 'in a real browser: a keyframe entrance is sampled for delay, duration, distance and opacity; a loop and a still element are not entrances', async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-entrance-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	const served = await serveDraft( dir );
	try {
		const jobs = [ 'rise', 'late', 'loop', 'still' ].map( ( id ) => ( { id, finder: `.${ id }` } ) );
		const raw = await sampleEntrances( { url: served.url, jobs, windowMs: 2500 } );
		const rise = shapeEntrance( raw.rise );
		assert.equal( rise.delayMs, 200, `delay ${ rise.delayMs }` );
		assert.equal( rise.durationMs, 600, `duration ${ rise.durationMs }` );
		assert.ok( Math.abs( rise.distancePx - 18 ) <= 1, `distance ${ rise.distancePx }` );
		assert.equal( rise.opacityFrom, 0 );
		const late = shapeEntrance( raw.late );
		assert.equal( late.fromFirstChange, true, 'no backwards fill: the first frame is at rest' );
		assert.ok( late.distancePx > 15 && late.distancePx <= 18, `distance from the first moving frame ${ late.distancePx }` );
		assert.equal( shapeEntrance( raw.loop ), null );
		assert.equal( shapeEntrance( raw.still ), null );
	} finally {
		await served.close();
	}
} );

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const same = ( v ) => ( { 375: v, 768: v, 1440: v } );
const CAL = { block: 'sgs/text', elements: { '': {} }, settings: {}, discovered: { sgsAnimation: {
	opacity: { slots: [ '' ], values: { 'fade-up': same( '0' ), 'fade-in': same( '0' ) } },
	transform: { slots: [ '' ], values: { 'fade-up': same( 'matrix(1, 0, 0, 1, 0, 18)' ), 'fade-in': same( 'none' ) } },
} } };
const ENTRANCE = shapeEntrance( { seenAt: 0, first: RISE, firstChange: RISE, start: 200, end: 800, loop: false } );

test( 'entranceWrites: the preset comes from the setting calibration ties to opacity and transform, and duration and delay with no setting are UNMAPPED with the measured values', () => {
	const node = { name: 'sgs/text', attributes: {} };
	const r = entranceWrites( { entrance: ENTRANCE, node, ref: 'cr-ref-x-3', block: 'sgs/text', calibration: CAL, db, snapshot, log: [] } );
	assert.equal( node.attributes.sgsAnimation, 'fade-up', 'fade-up and fade-in both fit opacity 0; the transform picks fade-up' );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.after, w.prop ] ), [ [ 'sgsAnimation', 'fade-up', 'entrance opacity' ] ] );
	assert.deepEqual( r.unmapped.map( ( u ) => [ u.property, u.value ] ), [ [ 'entrance animation-duration', '600ms' ], [ 'entrance animation-delay', '200ms' ] ] );
	assert.match( r.unmapped[ 0 ].reason, /^no-setting: / );
	assert.equal( r.unmapped[ 0 ].node, 'cr-ref-x-3' );
} );

test( 'entranceWrites with a calibration that ties nothing writes nothing and lists every measured entrance value', () => {
	const node = { name: 'sgs/text', attributes: {} };
	const r = entranceWrites( { entrance: ENTRANCE, node, ref: 'cr-ref-x-3', block: 'sgs/text', calibration: { block: 'sgs/text', elements: { '': {} }, settings: {}, discovered: {} }, db, snapshot, log: [] } );
	assert.deepEqual( r.writes, [] );
	assert.deepEqual( node.attributes, {} );
	assert.deepEqual( r.unmapped.map( ( u ) => u.property ), [ 'entrance opacity', 'entrance transform', 'entrance animation-duration', 'entrance animation-delay' ] );
} );
