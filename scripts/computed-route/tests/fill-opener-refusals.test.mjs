// The state refusals beyond the opener's own (lib/fill-opener-refusals.mjs): a state that opened at only some read widths,
// and a state the motion sampler could not open at a width, each raise a { state, reason } entry naming the widths.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openerRefusals } from '../lib/fill-opener-refusals.mjs';
import { refusalRows } from '../lib/fill-open.mjs';

const opener = { id: 'nav-drawer', state: 'open', refused: [] };
const ok = { ok: true, reason: null };
const shut = { ok: false, reason: 'none of the 2 sc-if ids rendered' };

test( 'MUST FAIL: a state that opens at some read widths and not others raises a row naming the widths not read', () => {
	const got = openerRefusals( { opener, readWidths: { 375: ok, 768: shut, 1440: ok } } );
	assert.equal( got.length, 1 );
	assert.equal( got[ 0 ].state, 'open' );
	assert.match( got[ 0 ].reason, /opened at 375, 1440 only/ );
	assert.match( got[ 0 ].reason, /not read at 768/ );
	assert.match( got[ 0 ].reason, /sc-if ids rendered/ );
	const rows = refusalRows( { opener: { ...opener, refused: got }, nodes: [ { index: 0, parent: null, name: 'sgs/mega-panel' } ], flat: [ {} ], refOf: () => 'cr-ref-1' } );
	assert.match( rows[ 0 ].reason, /^state-refused: state "open" of nav-drawer was not opened: it opened at 375, 1440 only/ );
} );

test( 'a state that opens at every read width raises nothing; one that opens at none keeps its single whole-state row', () => {
	assert.deepEqual( openerRefusals( { opener, readWidths: { 375: ok, 768: ok, 1440: ok } } ), [] );
	const none = openerRefusals( { opener, readWidths: { 375: shut, 768: shut, 1440: shut } } );
	assert.equal( none.length, 1 );
	assert.equal( none[ 0 ].reason, shut.reason );
	assert.equal( openerRefusals( { opener, readWidths: {} } )[ 0 ].reason, 'it rendered at no width' );
	assert.deepEqual( openerRefusals( { opener: { ...opener, state: null }, readWidths: { 375: shut } } ), [], 'an opener refused whole is already a row' );
} );

test( 'MUST FAIL: a width the motion sampler could not open raises a row naming the state and the widths, a width that opened does not', () => {
	const got = openerRefusals( { opener, motionWidths: { 375: shut, 768: ok, 1440: shut } } );
	assert.equal( got.length, 1 );
	assert.match( got[ 0 ].reason, /motion sample could not open it at 375, 1440/ );
	assert.deepEqual( openerRefusals( { opener, motionWidths: { 375: ok, 768: ok, 1440: ok } } ), [] );
	assert.deepEqual( openerRefusals( { opener, motionWidths: {} } ), [], 'a verdict-less opener (none returned) is not a refusal' );
} );
