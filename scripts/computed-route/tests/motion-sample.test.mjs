// The sampled-pose check (lib/motion-sample.mjs, Spec 48 FR-48-47): the pose the draft's code states at 0, half and all
// of an entrance's run, against what the probe (lib/fill-entrance.mjs) reads after pausing and seeking the animation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { serveDraft } from '../lib/draft.mjs';
import { sampleEntrances, shapeEntrance } from '../lib/fill-entrance.mjs';
import { easingAt, lerpTransform, codePoseAt, measuredTransform, sampledPoseDifferences } from '../lib/motion-sample.mjs';
import { entranceCheck } from '../lib/motion-check.mjs';

const close = ( a, b, tol = 1e-3 ) => assert.ok( Math.abs( a - b ) <= tol, `${ a } is not ${ b }` );

test( 'easingAt evaluates linear, the keywords and cubic-bezier(); steps() and linear() are not evaluated', () => {
	close( easingAt( 'linear', 0.3 ), 0.3 );
	close( easingAt( 'ease', 0.5 ), 0.8024, 1e-3 );
	close( easingAt( 'ease-in-out', 0.5 ), 0.5 );
	close( easingAt( 'cubic-bezier(0.42, 0, 1, 1)', 0.5 ), easingAt( 'ease-in', 0.5 ) );
	close( easingAt( 'cubic-bezier(.16,.84,.32,1)', 0 ), 0 );
	close( easingAt( 'cubic-bezier(.16,.84,.32,1)', 1 ), 1 );
	assert.ok( easingAt( 'cubic-bezier(.16,.84,.32,1)', 0.5 ) > 0.9, 'a fast-out curve is most of the way at half time' );
	assert.equal( easingAt( 'steps(4, end)', 0.5 ), null );
	assert.equal( easingAt( 'token:easing.emphasised', 0.5 ), null );
} );

test( 'MUST FAIL: lerpTransform interpolates matching function lists and from or to none; differing lists are not compared', () => {
	assert.equal( lerpTransform( 'translateY(24px)', 'none', 0.25 ), 'translatey(18px)' );
	assert.equal( lerpTransform( 'none', 'scale(0.9) rotate(10deg)', 0.5 ), 'scale(0.95) rotate(5deg)' );
	assert.equal( lerpTransform( 'translate(10px, 0)', 'translate(0, 20px)', 0.5 ), 'translate(5px, 10px)' );
	assert.equal( lerpTransform( 'translateX(10px)', 'scale(2)', 0.5 ), null, 'CSS interpolates these as matrices' );
	assert.equal( lerpTransform( 'translateX(10%)', 'translateX(10px)', 0.5 ), null, 'units that differ' );
	assert.equal( lerpTransform( 'none', 'none', 0.5 ), 'none' );
} );

test( 'MUST FAIL: codePoseAt eases a Web Animation over the whole run and a CSS animation per keyframe stretch, and plays a reverse run backwards', () => {
	const props = [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateX(26px)', to: 'none' } ];
	const half = codePoseAt( { mechanism: 'waapi', easing: 'linear', properties: props }, 0.5 );
	close( half.opacity, 0.5 );
	assert.equal( half.transform, 'translatex(13px)' );
	assert.deepEqual( half.animates, [ 'transform' ] );
	close( codePoseAt( { mechanism: 'waapi', easing: 'ease', properties: props }, 0.5 ).opacity, 0.8024 );
	const back = codePoseAt( { mechanism: 'waapi', easing: 'linear', direction: 'reverse', properties: props }, 0 );
	close( back.opacity, 1, 1e-9 );
	const frames = [ { property: 'opacity', keyframes: [ { offset: 0, value: '0' }, { offset: 0.5, value: '1' }, { offset: 1, value: '0' } ] } ];
	// At a quarter of the run: per stretch, ease-in-out(0.5) of the first half is 0.5; over the whole run, ease-in-out(0.25)
	// is about 0.13, which lands at 0.26 of the first stretch.
	close( codePoseAt( { mechanism: 'css-animation', easing: 'ease-in-out', properties: frames }, 0.25 ).opacity, 0.5 );
	close( codePoseAt( { mechanism: 'waapi', easing: 'ease-in-out', properties: frames }, 0.25 ).opacity, 2 * easingAt( 'ease-in-out', 0.25 ) );
	const computed = codePoseAt( { mechanism: 'waapi', easing: 'linear', properties: [ { property: 'transform', from: 'translateY(x)', to: 'none', formula: 'translateY(x)' } ] }, 0.5 );
	assert.equal( computed.transform, undefined, 'a value the code computes is not compared' );
} );

test( 'measuredTransform composes the same properties the code animates, in CSS order', () => {
	const pose = { transform: 'matrix(1, 0, 0, 1, 0, 5)', translate: '0px 12px', rotate: 'none', scale: '1.1' };
	assert.equal( measuredTransform( pose, [ 'translate' ] ), 'translate(0px, 12px)' );
	assert.equal( measuredTransform( pose, [ 'translate', 'scale', 'transform' ] ), 'translate(0px, 12px) scale(1.1) matrix(1, 0, 0, 1, 0, 5)' );
} );

test( 'MUST FAIL: sampledPoseDifferences reports a sample off the code\'s pose, an animation with nothing sampled, and nothing for an older probe', () => {
	const record = { mechanism: 'waapi', easing: 'linear', properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(20px)', to: 'none' } ] };
	const at = ( f, opacity, y ) => ( { f, pose: { opacity, transform: `matrix(1, 0, 0, 1, 0, ${ y })`, translate: 'none', scale: 'none', rotate: 'none' } } );
	assert.deepEqual( sampledPoseDifferences( 1440, record, [ at( 0, 0, 20 ), at( 0.5, 0.5, 10 ), at( 1, 1, 0 ) ] ), [] );
	assert.deepEqual( sampledPoseDifferences( 1440, record, [ at( 0, 0, 20 ), at( 0.5, 0.8, 4 ), at( 1, 1, 0 ) ] ), [
		'1440: at 50% opacity measured 0.8, the code has 0.5',
		'1440: at 50% transform measured matrix(1, 0, 0, 1, 0, 4), the code has translatey(10px)',
	] );
	assert.deepEqual( sampledPoseDifferences( 768, record, [] ), [ '768: the render ran no animation to sample' ] );
	assert.deepEqual( sampledPoseDifferences( 768, { ...record, mechanism: 'js-style-write' }, [] ), [] );
	assert.deepEqual( sampledPoseDifferences( 768, record, null ), [] );
	const layer = { trigger: 'load', values: { duration: 600 } };
	const measured = { trigger: 'load', durationRawMs: 600, delayRawMs: 0, delayMs: 0, held: false, from: {}, samples: [ at( 0, 0, 20 ), at( 0.5, 0.8, 10 ), at( 1, 1, 0 ) ] };
	assert.deepEqual( entranceCheck( layer, { ...record, delay_ms: 0 }, { 1440: measured } ).differences, [ '1440: at 50% opacity measured 0.8, the code has 0.5' ], 'the render check carries the sampled pose' );
} );

const HTML = `<!doctype html><html><head><style>
body { margin: 0; }
.box { width: 80px; height: 40px; margin: 10px; background: #345; }
@keyframes bob { 0% { transform: translateY(40px); opacity: 0; } 30% { transform: translateY(-40px); opacity: 1; } 100% { transform: none; opacity: 1; } }
.ca { animation: bob 800ms ease-in-out 100ms both; }
</style></head><body>
<div class="box wa"></div><div class="box ca"></div><div class="box tp"></div>
<script>
document.querySelector( '.wa' ).animate( [ { opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' } ], { duration: 600, delay: 150, easing: 'cubic-bezier(.16,.84,.32,1)' } );
document.querySelector( '.tp' ).animate( [ { translate: '0 30px' }, { translate: '0 0' } ], { duration: 500, easing: 'ease-out' } );
</script></body></html>`;

const RECORDS = {
	wa: { mechanism: 'waapi', easing: 'cubic-bezier(.16,.84,.32,1)', properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateY(24px)', to: 'none' } ] },
	ca: { mechanism: 'css-animation', easing: 'ease-in-out', properties: [
		{ property: 'transform', keyframes: [ { offset: 0, value: 'translateY(40px)' }, { offset: 0.3, value: 'translateY(-40px)' }, { offset: 1, value: 'none' } ] },
		{ property: 'opacity', keyframes: [ { offset: 0, value: '0' }, { offset: 0.3, value: '1' }, { offset: 1, value: '1' } ] },
	] },
	tp: { mechanism: 'waapi', easing: 'ease-out', properties: [ { property: 'translate', from: '0 30px', to: '0 0' } ] },
};

test( 'MUST FAIL, in a real browser: each finite animation is sought to 0, half and all of its run; the code\'s poses match, and a misread easing or a CSS animation eased as a Web one does not', async () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'motion-sample-' ) );
	fs.writeFileSync( path.join( dir, 'index.html' ), HTML );
	const served = await serveDraft( dir );
	try {
		const raw = await sampleEntrances( { url: served.url, jobs: Object.keys( RECORDS ).map( ( id ) => ( { id, finder: `.${ id }` } ) ), windowMs: 1500, sweep: null } );
		for ( const [ id, record ] of Object.entries( RECORDS ) ) {
			const samples = shapeEntrance( raw[ id ] ).samples;
			assert.deepEqual( samples?.map( ( s ) => s.f ), [ 0, 0.5, 1 ], `${ id }: the entrance Fill checks carries the samples` );
			assert.deepEqual( sampledPoseDifferences( 1440, record, samples ), [], `${ id }: ${ JSON.stringify( samples ) }` );
		}
		assert.notDeepEqual( sampledPoseDifferences( 1440, { ...RECORDS.wa, easing: 'linear' }, raw.wa.samples ), [], 'a misread curve shows at half time' );
		assert.notDeepEqual( sampledPoseDifferences( 1440, { ...RECORDS.ca, mechanism: 'waapi' }, raw.ca.samples ), [], 'a CSS animation eases each stretch' );
		assert.notDeepEqual( sampledPoseDifferences( 1440, { ...RECORDS.tp, properties: [ { property: 'translate', from: '0 10px', to: '0 0' } ] }, raw.tp.samples ), [], 'a misread travel' );
	} finally {
		await served.close();
	}
} );
