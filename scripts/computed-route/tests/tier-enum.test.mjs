// A per-breakpoint object holds the choices of ONE tier in the DB's enum_values (the seeder stores them; block.json has none):
// lib/resolve.mjs::tierEnumDef lets the resolver check each tier's value against them, and lib/gate-probes.mjs::probeValues
// probes each choice as that tier's value, never as a bare string on an object setting.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tierEnumDef } from '../lib/resolve.mjs';
import { probeValues } from '../lib/gate-probes.mjs';

const row = { tier_shape: 'tier_object', enum_values: '["left","center","right"]' };
const def = { type: 'object', default: {} };

test( 'MUST FAIL: a tier object takes its per-tier choices from the DB row', () => {
	assert.deepEqual( tierEnumDef( def, row ).enum, [ 'left', 'center', 'right' ] );
} );

test( 'negative controls: a string setting, a declared enum, a box and a row with no choices are returned unchanged', () => {
	assert.equal( tierEnumDef( { type: 'string' }, row ).enum, undefined );
	assert.deepEqual( tierEnumDef( { type: 'object', enum: [ 'x' ] }, row ).enum, [ 'x' ] );
	assert.equal( tierEnumDef( def, { tier_shape: 'box_only', enum_values: '["a"]' } ).enum, undefined );
	assert.equal( tierEnumDef( def, { tier_shape: 'tier_object', enum_values: null } ).enum, undefined );
	assert.equal( tierEnumDef( undefined, row ), undefined );
} );

test( 'MUST FAIL: probe values for a tier object are per-tier objects, a string setting keeps bare strings', () => {
	const tier = probeValues( 'text-align', { attr_type: 'object', enum_values: '["left","center"]' } );
	assert.ok( tier.some( ( v ) => JSON.stringify( v ) === '{"desktop":"left"}' ) );
	assert.ok( ! tier.includes( 'left' ), 'a bare string on an object setting would be the old shape' );
	const flat = probeValues( 'text-align', { attr_type: 'string', enum_values: '["left","center"]' } );
	assert.ok( flat.includes( 'left' ) );
} );
