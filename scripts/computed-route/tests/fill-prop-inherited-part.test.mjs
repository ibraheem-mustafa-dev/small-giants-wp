// An inherited property that equals the draft on the element read (the draft's icon disc, a span in a cocoa link, shows cocoa and so does the
// block's root) is not equal for the block when a part of the block paints its own value of it: the icon's shape paints its own colour
// (yellow), the glyph inside it inherits that, and the draft's glyph is cocoa. The resolver returned `equal` at the root and never asked the
// shape's slot, so the Email card's icon drew a yellow glyph on a yellow disc (Mama's Contact, 2026-11-19). lib/fill-prop.mjs::resolveProperty.
// Pure functions only. Mutation list: tests/fill-prop-inherited-part.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProperty } from '../lib/fill-prop.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const SHAPE = '.sgs-icon__shape';
const COCOA = 'rgb(58, 42, 34)';
const YELLOW = 'rgb(249, 207, 110)';
const THREE = { 1440: COCOA, 768: COCOA, 375: COCOA };
const cal = { elements: { '': {}, [ SHAPE ]: {} }, settings: { iconColour: { slot: SHAPE, slots: [ SHAPE ], reaches: [ SHAPE ], property: 'color', state: null, forms: [ 'hex' ], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } } };
const run = ( prop, baseline, slots = [ '', SHAPE ] ) => resolveProperty( { node: { attributes: {} }, block: 'sgs/icon', prop, draft: THREE, baseline, slots, calibration: cal, db, snapshot, log: [] } );

test( 'MUST FAIL: a colour equal on the root is asked of the shape that paints its own colour', () => {
	const r = run( 'color', ( slot ) => ( SHAPE === slot ? YELLOW : COCOA ) );
	assert.equal( r.status, 'written' );
	assert.equal( r.slot, SHAPE );
	assert.equal( r.writes[ 0 ].attr, 'iconColour' );
} );

test( 'negative controls: no slot differs is equal, a non-inherited property is unchanged, and the root alone is equal', () => {
	assert.equal( run( 'color', () => COCOA ).status, 'equal', 'the shape shows cocoa too' );
	assert.equal( run( 'color', () => COCOA, [ '' ] ).status, 'equal' );
	const gap = run( 'row-gap', ( slot ) => ( SHAPE === slot ? '9px' : COCOA ) );
	assert.equal( gap.status, 'equal', 'a property the root does not pass down keeps the first slot verdict, whatever the shape shows' );
} );
