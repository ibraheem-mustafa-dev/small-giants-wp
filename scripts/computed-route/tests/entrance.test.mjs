// Entrance start (lib/entrance.mjs): a block the draft shows at rest while live holds its entrance waiting for a scroll
// gets sgsAnimationStart 'load'; nothing else does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { entranceStart } from '../lib/entrance.mjs';

const col = ( attrs = {} ) => ( { name: 'sgs/container', attributes: { className: 'cr-ref-a-11', sgsAnimation: 'fade-up', ...attrs } } );
const group = ( prop, live, extra = {} ) => ( { prop, path: '', state: null, rows: [ { width: 375, draft: 'x', live } ], ...extra } );

test( 'MUST FAIL TO MISS: an entrance hidden live and shown on the draft at rest starts on page load', () => {
	assert.deepEqual( entranceStart( group( 'opacity', '0' ), col(), { 375: '1' } ), { writes: [ { attr: 'sgsAnimationStart', value: 'load', merge: 'replace' } ] } );
	assert.ok( entranceStart( group( 'translate', '0px 18px' ), col(), { 375: 'none' } ) );
} );

test( 'positive control: no entrance, already on load, a part, a hover, a half opacity or a draft still hidden writes nothing', () => {
	assert.equal( entranceStart( group( 'opacity', '0' ), { name: 'sgs/text', attributes: {} }, { 375: '1' } ), null );
	assert.equal( entranceStart( group( 'opacity', '0' ), col( { sgsAnimationStart: 'load' } ), { 375: '1' } ), null );
	assert.equal( entranceStart( group( 'opacity', '0', { path: '.sgs-container__inner' } ), col(), { 375: '1' } ), null );
	assert.equal( entranceStart( group( 'opacity', '0', { state: 'hover' } ), col(), { 375: '1' } ), null );
	assert.equal( entranceStart( group( 'opacity', '0.5' ), col(), { 375: '1' } ), null );
	assert.equal( entranceStart( group( 'opacity', '0' ), col(), { 375: '0' } ), null );
	assert.equal( entranceStart( group( 'color', 'red' ), col(), { 375: 'blue' } ), null );
} );
