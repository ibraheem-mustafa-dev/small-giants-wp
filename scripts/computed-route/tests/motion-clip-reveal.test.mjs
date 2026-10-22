// Spec 48 FR-48-77, delivery unit U13b: an image reveal that animates `clip-path: inset(N% round R)` is written through
// the entrance's existing clip channel (`clip`, with opacity, scale, delay and easing on their own channels) and builds
// NO corner radius: the image's own border radius gives the end shape. The planted records have the shape of a scroll
// reveal on an image frame and of a load reveal on a hero frame.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { clipChannels } from '../lib/motion-clip.mjs';
import { entranceLayer } from '../lib/motion-layers.mjs';
import { validateMotionWrite } from '../lib/motion-validate.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/container': [] } ) ) );
const schema = loadMotionSchema();
const EASE = 'cubic-bezier(.16,.84,.32,1)';
const rec = ( id, over ) => ( { id, mechanism: 'waapi', status: 'active', element: { dc: 'Site', template_tpl_id: '10' }, trigger: { type: 'scroll-into-view' }, delay_ms: 0, easing: EASE, iterations: 1, direction: 'normal', fill: 'backwards', ...over } );
const IMAGE_REVEAL = rec( 'A-A', { duration_ms: 1000, properties: [ { property: 'opacity', from: 0, to: 1 }, { property: 'clip-path', from: 'inset(10% 10% 10% 10% round 24px)', to: 'inset(0 0 0 0 round 0px)' } ] } );
const HERO_REVEAL = rec( 'A-B', { trigger: { type: 'load' }, duration_ms: 1100, delay_ms: 200, properties: [
	{ property: 'clip-path', from: 'inset(8% 8% 8% 8% round 26px)', to: 'inset(0% 0% 0% 0% round 22px)' }, { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'scale(.94)', to: 'none' } ] } );

test( 'MUST FAIL: an inset() with a round tail is the clip channel and names the dropped radius; a bare round, or radius with no edges, is still no channel', () => {
	assert.deepEqual( clipChannels( 'inset(10% 10% 10% 10% round 24px)' ), { channels: { clip: 10 }, unsupported: [], ignored: [ 'corner radius' ] } );
	assert.deepEqual( clipChannels( 'inset(0 0 0 0 round 0px)' ), { channels: { clip: 0 }, unsupported: [], ignored: [ 'corner radius' ] } );
	assert.deepEqual( clipChannels( 'inset(100% 0px 0px round 12px)' ).channels, { clip: 100, clipEdge: 'top' } );
	assert.deepEqual( clipChannels( 'inset(10% 5% round 4px)' ).unsupported, [ 'clip-path' ], 'two different edges are no channel' );
	for ( const v of [ 'inset(10% round)', 'inset(round 24px)', 'circle(40px at 10px 10px)' ] ) {
		assert.deepEqual( clipChannels( v ).unsupported, [ 'clip-path' ], v );
	}
	assert.equal( clipChannels( 'inset(10%)' ).ignored, undefined, 'no radius, nothing ignored' );
} );

test( 'MUST FAIL: an image reveal with a rounded clip is written as the clip channel with opacity, delay and easing, and no radius', () => {
	const w = entranceLayer( IMAGE_REVEAL, mdb );
	assert.equal( w.unmapped, undefined );
	assert.deepEqual( w.layer, { trigger: 'scroll', values: { from: { opacity: 0, clip: 10 }, to: { opacity: 1, clip: 0 }, duration: 1000, easing: EASE } } );
	assert.match( w.notes.join( ' ' ), /corner radius has no entrance channel and is not built, the image's own border radius gives the end shape/ );
	assert.doesNotMatch( JSON.stringify( w.layer ), /radius|round/i, 'no corner radius is built' );
} );

test( 'MUST FAIL: a hero frame reveal writes clip, opacity, scale and its 200ms delay, and builds no radius', () => {
	const w = entranceLayer( HERO_REVEAL, mdb );
	assert.equal( w.unmapped, undefined );
	assert.deepEqual( w.layer, { trigger: 'load', values: { from: { clip: 8, opacity: 0, scale: 0.94 }, to: { clip: 0, opacity: 1, scale: 1 }, duration: 1100, delay: 200, easing: EASE } } );
	assert.match( w.notes.join( ' ' ), /inset\(8% 8% 8% 8% round 26px\) to inset\(0% 0% 0% 0% round 22px\)/ );
	assert.doesNotMatch( JSON.stringify( w.layer ), /radius|round/i );
} );

test( 'both reveals are valid sgsMotion documents; a reveal whose clip is a polygon is still reported unmapped', () => {
	for ( const r of [ IMAGE_REVEAL, HERO_REVEAL ] ) {
		const doc = { v: 1, elements: { root: { entrance: { base: entranceLayer( r, mdb ).layer } } } };
		assert.equal( validateMotionWrite( doc, schema ).valid, true, r.id );
	}
	const poly = rec( 'A-C', { duration_ms: 400, properties: [ { property: 'clip-path', from: 'polygon(0 0, 0 0, 0 100%)', to: 'polygon(0 0, 100% 0, 100% 100%)' } ] } );
	assert.match( entranceLayer( poly, mdb ).unmapped, /clip-path has no entrance channel/ );
} );
