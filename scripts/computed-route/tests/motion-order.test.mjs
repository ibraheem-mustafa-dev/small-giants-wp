// Spec 48 FR-48-78, from the step 4.0 council (2026-10-19): what the writer must never fabricate. A loop is an effect
// only when it never ends and starts at load or in view; a counted repeat and a trigger-bound loop are reported. A
// one-shot played in reverse is written as it plays. A transform list in an order the motion model does not draw
// (translate, then rotate, then scale, under one perspective first) is reported, never rewritten into the model's
// order; the same function twice combines.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, asPlayed } from '../lib/motion-layers.mjs';
import { transformChannels } from '../lib/motion-channels.mjs';

const rec = ( over ) => ( { id: 'R', mechanism: 'waapi', status: 'active', element: { dc: 'Site', template_tpl_id: '1' }, trigger: { type: 'mount' }, properties: [ { property: 'transform', from: 'translateY(0)', to: 'translateY(-12px)' } ], duration_ms: 4200, delay_ms: 0, easing: 'ease-in-out', iterations: 'infinite', direction: 'alternate', ...over } );

test( 'MUST FAIL: only an endless animation started at load or in view is an effect; a counted repeat and a trigger-bound loop are reported', () => {
	assert.equal( classify( rec() ).kind, 'effect' );
	assert.equal( classify( rec( { trigger: { type: 'scroll-into-view' } } ) ).kind, 'effect' );
	assert.equal( classify( rec( { iterations: Infinity } ) ).kind, 'effect' );
	const thrice = classify( rec( { iterations: 3, direction: 'normal' } ) );
	assert.deepEqual( [ thrice.kind, /3 times.*repeat count/.test( thrice.reason ) ], [ 'skip', true ] );
	const hovered = classify( rec( { trigger: { type: 'hover' } } ) );
	assert.deepEqual( [ hovered.kind, /started on hover.*FR-48-80/.test( hovered.reason ) ], [ 'skip', true ] );
	assert.equal( classify( rec( { iterations: 1 } ) ).kind, 'entrance', 'one alternate run is a single forward play' );
} );

test( 'MUST FAIL: a one-shot played in reverse is written as it plays', () => {
	const played = asPlayed( rec( { iterations: 1, direction: 'reverse', properties: [ { property: 'opacity', from: '0', to: '1' }, { property: 'transform', from: 'none', to: 'none', keyframes: [ { offset: 0, value: 'translateY(0)' }, { offset: 0.25, value: 'translateY(-20px)' }, { offset: 1, value: 'translateY(0)' } ] } ] } ) );
	assert.deepEqual( played.properties[ 0 ], { property: 'opacity', from: '1', to: '0' } );
	assert.deepEqual( played.properties[ 1 ].keyframes.map( ( k ) => k.offset ), [ 0, 0.75, 1 ] );
	assert.equal( asPlayed( rec( { direction: 'normal' } ) ).properties[ 0 ].from, 'translateY(0)', 'control: a forward record is unchanged' );
} );

test( 'MUST FAIL: a move written after a flat turn or resize is rewritten exactly into the model\'s order; one no flat rewrite holds is reported; the same function twice combines', () => {
	assert.deepEqual( transformChannels( 'scale(2) translateX(10px)' ), { channels: { scale: 2, translateX: 20 }, unsupported: [] }, 'the draft moves 20px' );
	assert.deepEqual( transformChannels( 'rotate(90deg) translateX(100px)' ), { channels: { rotate: 90, translateX: 0, translateY: 100 }, unsupported: [] }, 'turned a quarter, the move goes down' );
	assert.deepEqual( transformChannels( 'rotateX(10deg) translateY(5px)' ).unsupported, [ 'transform order' ], 'after a tilt no flat rewrite holds' );
	assert.deepEqual( transformChannels( 'scaleX(2) rotate(10deg)' ).unsupported, [ 'transform order' ] );
	assert.deepEqual( transformChannels( 'rotate(10deg) scaleX(2)' ).unsupported, [], 'control: rotate then scale is the model\'s order' );
	assert.deepEqual( transformChannels( 'translate(10px, 0) rotate(5deg) scale(1.1)' ).unsupported, [], 'control: translate, rotate, scale' );
	assert.deepEqual( transformChannels( 'translateX(100px) perspective(500px) translateZ(100px)' ).unsupported, [ 'perspective position' ] );
	assert.ok( transformChannels( 'translateZ(100px) perspective(500px)' ).unsupported.includes( 'translateZ' ), 'a depth move before the perspective draws nothing' );
	assert.deepEqual( transformChannels( 'translateX(10px) translateX(20px) scale(2) scale(1.5)' ).channels, { translateX: 30, scale: 3 } );
} );

test( 'MUST FAIL: a clip-path inset is the entrance clip channel, one edge with clipEdge; any other shape is reported', async () => {
	const { clipChannels } = await import( '../lib/motion-clip.mjs' );
	const { poseOf } = await import( '../lib/motion-channels.mjs' );
	assert.deepEqual( clipChannels( 'inset(100%)' ).channels, { clip: 100 } );
	assert.deepEqual( clipChannels( 'inset(0 0 100% 0)' ).channels, { clip: 100, clipEdge: 'bottom' } );
	assert.deepEqual( clipChannels( 'inset(0% 30% 0% 0%)' ).channels, { clip: 30, clipEdge: 'right' } );
	assert.deepEqual( clipChannels( 'inset(10% round 4px)' ).channels, { clip: 10 }, 'a round tail is dropped, never built (FR-48-77)' );
	for ( const v of [ 'circle(40%)', 'inset(10px)', 'inset(10% 20% 0 0)', 'inset(round 4px)' ] ) {
		assert.deepEqual( clipChannels( v ).unsupported, [ 'clip-path' ], v );
	}
	const { from, to, unsupported, other } = poseOf( [ { property: 'clip-path', from: 'inset(100%)', to: 'inset(0)' }, { property: 'opacity', from: '0', to: '1' } ] );
	assert.deepEqual( { from, to, unsupported, other }, { from: { clip: 100, opacity: 0 }, to: { clip: 0, opacity: 1 }, unsupported: [], other: [] } );
} );
