// RF6, motion and timing through the existing controls (clone root-fix plan 2026-11-24, Spec 48 FR-48-81): a hover that only
// changes colour or shadow gets the motion hover layer's `paintDuration` and `shadowDuration` (lib/fill-motion.mjs::
// motionWrites, lib/fill-timing.mjs::paintHoverTimings), and a block's own transition survives an undeclared 0s unless
// the block's own default is 0s (lib/fill-prop.mjs::notPainted).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { paintHoverTimings } from '../lib/fill-timing.mjs';
import { notPainted } from '../lib/fill-prop.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/icon': [], 'sgs/card': [] } ) ) );
const W = [ 375, 768, 1440 ];
const TIMING = { 'transition-property': 'background-color, box-shadow', 'transition-duration': '0.4s, 0.6s', 'transition-timing-function': 'ease, ease-out' };
const reads = ( id, declared, timing = TIMING ) => ( {
	widths: Object.fromEntries( W.map( ( w ) => [ w, { [ id ]: { styles: timing } } ] ) ),
	declared: Object.fromEntries( W.map( ( w ) => [ w, { [ id ]: timing } ] ) ),
	states: Object.fromEntries( W.map( ( w ) => [ w, { looks: { [ id ]: [ { states: [ 'hover' ], declared, rendered: declared, read: 'entered' } ] } } ] ) ),
} );
const run = ( block, r ) => {
	const nodes = [ { index: 0, name: block, targets: [ { id: '0:', slot: '', finder: '.row a.ig' } ] } ];
	const flat = [ { name: block, attributes: {}, ref: 'r0' } ];
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records: [], mdb, schema, rawSnapshot: { settings: { custom: {} } }, reads: r } );
	return { out, flat };
};

for ( const block of [ 'sgs/icon', 'sgs/card' ] ) {
	test( `MUST FAIL: ${ block } with a colour and shadow hover that moves nothing gets paintDuration and shadowDuration`, () => {
		const { flat, out } = run( block, reads( '0:', { 'background-color': 'rgb(1, 2, 3)', 'box-shadow': 'rgba(0, 0, 0, 0.2) 0px 4px 8px' } ) );
		const v = flat[ 0 ].attributes.sgsMotion?.elements?.root?.hover?.state?.values;
		assert.ok( v, JSON.stringify( out.unmapped ) );
		assert.equal( v.paintDuration, 400 );
		assert.equal( v.shadowDuration, 600 );
		assert.equal( v.scale, undefined, 'the hover layer moves nothing' );
	} );
}

test( 'MUST FAIL: a hover with no paint look, or a block with no motion support, writes no layer', () => {
	const { flat } = run( 'sgs/icon', reads( '0:', { 'text-decoration-line': 'underline' } ) );
	assert.equal( flat[ 0 ].attributes.sgsMotion, undefined, 'a transition list without a colour or shadow hover look times nothing' );
	assert.deepEqual( paintHoverTimings( reads( '0:', { opacity: '0.5' } ), '0:' ), {} );
	assert.equal( run( 'sgs/text', reads( '0:', { 'background-color': 'red' } ) ).flat[ 0 ].attributes.sgsMotion, undefined );
} );

test( 'MUST FAIL: an undeclared 0s duration is a leftover only where the block\'s own transition is 0s too', () => {
	const none = { 'transition-duration': '0s' };
	assert.equal( notPainted( 'transition-duration', none, null, {}, '0s' ), true, 'the block has no transition of its own' );
	assert.equal( notPainted( 'transition-duration', none, null, {}, undefined ), true, 'no calibrated default: judged as before' );
	assert.equal( notPainted( 'transition-duration', none, null, {}, '0.3s' ), false, 'the block\'s own 300ms is removed by the draft\'s none: written' );
	assert.equal( notPainted( 'transition-duration', none, null, {}, '0s, 0.3s' ), false );
	assert.equal( notPainted( 'transition-duration', none, null, { 'transition-duration': '0s' }, '0.3s' ), false );
} );
