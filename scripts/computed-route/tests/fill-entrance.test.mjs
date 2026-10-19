// Entrances (lib/fill-entrance.mjs, the motion writer's render check): duration and delay from sampled frames, distance
// and scale from the pose at the first sampled frame, a looping element is not an entrance, and an element below the fold
// that starts moving once it scrolls into view is a scroll entrance timed from that moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { sampleEntrances, sampleMotion, shapeEntrance, translationOf, scaleOf, rotateOf, STEP_MS, JITTER_MS } from '../lib/fill-entrance.mjs';

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
	assert.equal( e.trigger, 'load' );
	// 580 and 780 measured are the 600 and 800 an author set: a frame is read late at each end.
	assert.equal( shapeEntrance( { seenAt: 0, first: RISE, firstChange: RISE, start: 10, end: 590, loop: false } ).durationMs, 600 );
	assert.equal( shapeEntrance( { seenAt: 0, first: RISE, firstChange: RISE, start: 10, end: 790, loop: false } ).durationMs, 800 );
} );

test( 'a delay of two frames or less is jitter: it measures as 0 and no delay value is written', () => {
	assert.equal( JITTER_MS, 40 );
	const e = shapeEntrance( { seenAt: 1000, first: RISE, firstChange: RISE, start: 1034, end: 1634, loop: false } );
	assert.equal( e.delayMs, 0 );
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
@keyframes turn { from { opacity: 0; transform: rotate(30deg) } to { opacity: 1; transform: none } }
.turn { animation: turn 600ms cubic-bezier(.16,.84,.32,1) 200ms both }
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
.rise { animation: rise 600ms linear 200ms both }
.late { animation: rise 600ms linear 300ms forwards }
.loop { animation: spin 1s linear infinite }
</style></head><body>
<p class="rise">Rises</p><p class="turn">Turns</p><p class="late">Late</p><p class="loop">Loops</p><p class="still">Still</p>
</body></html>`;

test( 'in a real browser: a keyframe entrance is sampled for delay, duration, distance and opacity; a loop and a still element are not entrances', async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-entrance-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	const served = await serveDraft( dir );
	try {
		const jobs = [ 'rise', 'turn', 'late', 'loop', 'still' ].map( ( id ) => ( { id, finder: `.${ id }` } ) );
		const raw = await sampleEntrances( { url: served.url, jobs, windowMs: 2500 } );
		const rise = shapeEntrance( raw.rise );
		const turn = shapeEntrance( raw.turn );
		// A real browser reads each time to a frame (about 17ms at 60Hz), and the measured delay runs 188-220ms against
		// the 225ms where it rounds to 250, so one dropped frame moves the rounded value a whole step. The raw intervals
		// are held to two frames of what the page sets; the rounding to STEP_MS is pinned by the synthetic tests above.
		const FRAMES_2 = 34;
		const rawDelay = raw.rise.start - raw.rise.seenAt;
		const rawDuration = raw.rise.end - raw.rise.start;
		assert.ok( Math.abs( rawDelay - 200 ) <= FRAMES_2, `raw delay ${ rawDelay }` );
		assert.ok( Math.abs( rawDuration - 600 ) <= FRAMES_2, `raw duration ${ rawDuration }` );
		assert.ok( Math.abs( rise.distancePx - 18 ) <= 1, `distance ${ rise.distancePx }` );
		assert.equal( rise.opacityFrom, 0 );
		assert.equal( rise.easing, 'linear', 'the CSS animation curve is read from its keyframes' );
		assert.equal( rise.rotate, 0 );
		assert.equal( turn.easing, 'cubic-bezier(0.16, 0.84, 0.32, 1)', 'the keyframes curve, as the browser writes it' );
		assert.ok( Math.abs( turn.rotate - 30 ) <= 3, `rotate ${ turn.rotate }` );
		const late = shapeEntrance( raw.late );
		assert.equal( late.fromFirstChange, true, 'no backwards fill: the first frame is at rest' );
		assert.ok( late.distancePx > 15 && late.distancePx <= 18, `distance from the first moving frame ${ late.distancePx }` );
		assert.equal( shapeEntrance( raw.loop ), null );
		assert.equal( shapeEntrance( raw.still ), null );
	} finally {
		await served.close();
	}
} );

test( 'MUST FAIL: an element off-screen when first seen that moves once it meets the viewport is a scroll entrance timed from then; one that played off-screen is a load entrance', () => {
	const scroll = shapeEntrance( { seenAt: 100, visibleAt: 2400, first: pose( 1 ), firstChange: pose( 0.05, 'matrix(0.96, 0, 0, 0.96, 0, 39)' ), start: 2416, end: 3216, loop: false } );
	assert.deepEqual( [ scroll.trigger, scroll.delayMs, scroll.durationMs, scroll.delayRawMs, scroll.scale, scroll.y ], [ 'scroll', 0, 800, 16, 0.96, 39 ] );
	const staggered = shapeEntrance( { seenAt: 100, visibleAt: 2400, first: pose( 1 ), firstChange: RISE, start: 2560, end: 3360, loop: false } );
	assert.deepEqual( [ staggered.trigger, staggered.delayRawMs ], [ 'scroll', 160 ] );
	const offscreenLoad = shapeEntrance( { seenAt: 100, visibleAt: 2400, first: RISE, firstChange: RISE, start: 300, end: 900, loop: false } );
	assert.deepEqual( [ offscreenLoad.trigger, offscreenLoad.delayMs ], [ 'load', 200 ] );
	const inView = shapeEntrance( { seenAt: 100, visibleAt: 100, first: RISE, firstChange: RISE, start: 300, end: 900, loop: false } );
	assert.equal( inView.trigger, 'load' );
} );

test( 'scaleOf reads the matrix x scale and the scale property', () => {
	assert.equal( scaleOf( pose( 1, 'matrix(0.96, 0, 0, 0.96, 0, 40)' ) ), 0.96 );
	assert.equal( scaleOf( { ...pose( 1 ), scale: '1.2' } ), 1.2 );
	assert.equal( scaleOf( pose( 1 ) ), 1 );
} );

const SCROLL_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0 } .gap { height: 2000px } .rv { height: 80px }
</style></head><body><div class="gap"></div><p class="rv">Reveals</p><div class="gap"></div>
<script>
const io = new IntersectionObserver( ( es ) => es.forEach( ( en ) => { if ( ! en.isIntersecting ) return; io.unobserve( en.target );
	en.target.animate( [ { opacity: 0, transform: 'translateY(40px) scale(.96)' }, { opacity: 1, transform: 'none' } ], { duration: 800, delay: 160, easing: 'linear', fill: 'backwards' } ); } ) );
io.observe( document.querySelector( '.rv' ) );
</script></body></html>`;

test( 'in a real browser: the sweep scrolls a below-the-fold reveal into view and samples it as a scroll entrance with its own delay', async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-entrance-scroll-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), SCROLL_HTML );
	const served = await serveDraft( dir );
	try {
		const raw = await sampleEntrances( { url: served.url, jobs: [ { id: 'rv', finder: '.rv' } ], windowMs: 1000 } );
		const e = shapeEntrance( raw.rv );
		assert.ok( e, 'the reveal played inside the window' );
		assert.equal( e.trigger, 'scroll' );
		assert.ok( Math.abs( e.delayRawMs - 160 ) <= 34, `raw delay ${ e.delayRawMs }` );
		assert.ok( Math.abs( e.durationRawMs - 800 ) <= 34, `raw duration ${ e.durationRawMs }` );
		assert.equal( e.scale, 0.96 );
		const still = await sampleEntrances( { url: served.url, jobs: [ { id: 'rv', finder: '.rv' } ], windowMs: 1000, sweep: null } );
		assert.equal( shapeEntrance( still.rv ), null, 'negative control: with no sweep the reveal never plays' );
	} finally {
		await served.close();
	}
} );

test( 'MUST FAIL: a backwards fill that jumps to the from-pose and holds through its delay: the jump is the trigger and the hold, to its second change, is the exact delay', () => {
	const held = shapeEntrance( { seenAt: 0, visibleAt: 2000, first: pose( 1 ), firstChange: RISE, start: 2004, secondAt: 2180, end: 2980, loop: false } );
	assert.deepEqual( [ held.trigger, held.delayRawMs, held.durationRawMs, held.exactDelay ], [ 'scroll', 160, 816, true ] );
	const moving = shapeEntrance( { seenAt: 0, visibleAt: 2000, first: pose( 1 ), firstChange: RISE, start: 2004, secondAt: 2020, end: 2804, loop: false } );
	assert.equal( moving.delayRawMs, 4, 'the control: a second change one frame later is movement, not a hold' );
	assert.equal( moving.exactDelay, false, 'a scroll entrance with no hold is timed from first sight in view: an upper bound' );
} );

const LOOP_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0; } .track { width: 3000px; height: 40px; } .ring { width: 40px; height: 40px; animation: pulse 2s linear infinite; }
@keyframes pulse { from { opacity: 1; } to { opacity: 0.4; } } .still { width: 40px; height: 40px; } .wide { width: 40px; height: 40px; } @media (min-width: 1000px) { .wide { animation: pulse 2s linear infinite; } }
</style></head><body><div class="track"></div><div class="ring"></div><div class="wide"></div><div class="still"><svg width="20" height="20"><circle r="5" cx="10" cy="10"><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/></circle></svg></div>
<script>const t = document.querySelector( '.track' ); const dist = 1700; t.animate( [ { transform: 'translateX(0)' }, { transform: 'translateX(-' + dist + 'px)' } ], { duration: dist / 0.045, iterations: Infinity } );</script></body></html>`;

test( 'in a real browser: sampleMotion reads each element\'s endless animations as the code made them, its box and its SVG animation elements', async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'fill-entrance-loops-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), LOOP_HTML );
	const served = await serveDraft( dir );
	try {
		const jobs = [ { id: 'track', finder: '.track' }, { id: 'ring', finder: '.ring' }, { id: 'still', finder: '.still' }, { id: 'wide', finder: '.wide' } ];
		const { entrances, loops } = await sampleMotion( { url: served.url, jobs, windowMs: 800, sweep: null } );
		const track = loops.track[ 1440 ];
		assert.equal( track.loops.length, 1 );
		assert.ok( Math.abs( track.loops[ 0 ].duration - 1700 / 0.045 ) < 1, `duration ${ track.loops[ 0 ].duration }` );
		assert.match( track.loops[ 0 ].frames[ 1 ].transform, /translateX\(-1700px\)/ );
		assert.equal( track.box.width, 3000 );
		const ring = loops.ring[ 375 ].loops[ 0 ];
		assert.deepEqual( [ ring.css, ring.name, ring.duration, ring.frames.map( ( f ) => f.opacity ) ], [ true, 'pulse', 2000, [ '1', '0.4' ] ] );
		assert.deepEqual( loops.still[ 768 ].loops, [], 'negative control: an element holding an SVG animation runs no endless animation itself' );
		assert.equal( loops.still[ 768 ].smil[ 0 ].values, '1;0.4;1' );
		assert.equal( loops.wide[ 1440 ].loops.length, 1 );
		assert.deepEqual( [ loops.wide[ 375 ].loops, loops.wide[ 768 ].loops ], [ [], [] ], 'a loop the render shows at 1440 only has an empty entry at the other widths' );
		assert.equal( entrances.track[ 1440 ], null, 'a loop is not an entrance' );
		for ( const id of [ 'track', 'ring', 'still', 'wide' ] ) {
			assert.deepEqual( Object.keys( loops[ id ] ).sort(), [ '1440', '375', '768' ], `${ id }: a loop job has an entry at every width the element was found` );
		}
	} finally {
		await served.close();
	}
} );

test( 'rotateOf reads the matrix angle and the rotate property and adds them; shapeEntrance carries the probe easing, null when none', () => {
	assert.equal( rotateOf( pose( 1, 'matrix(0.866, 0.5, -0.5, 0.866, 0, 0)' ) ), 30 );
	assert.equal( rotateOf( { ...pose( 1 ), rotate: '45deg' } ), 45 );
	assert.equal( rotateOf( pose( 1 ) ), 0 );
	assert.equal( shapeEntrance( { seenAt: 100, first: RISE, firstChange: RISE, start: 300, end: 900, loop: false, easing: 'ease-out' } ).easing, 'ease-out' );
	assert.equal( shapeEntrance( { seenAt: 100, first: RISE, firstChange: RISE, start: 300, end: 900, loop: false } ).easing, null );
} );
