// Proves that WooCommerce's own cart or checkout page (a page whose content WooCommerce keeps) ends after its inventory: its
// propose, Fill, build, apply and walk are each recorded not applicable and none runs (site-run.mjs::surfaceStepper,
// site-run.mjs::endWooPage). Its layout is the template-<slug> surface, which proposes and checks itself, so a proposal of the
// page itself is one nothing uses (restores e6fd03159's and be5e26ac5's rule: Mama's cart and checkout failed on it,
// 2026-11-01). Negative control: an ordinary page runs every stage. Nothing runs a site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { endWooPage, surfaceStepper } from '../site-run.mjs';

const STAGES = [ 'inventory', 'propose', 'fill', 'build', 'apply', 'walk' ];

const harness = ( { stages = STAGES } = {} ) => {
	const noted = [];
	const note = ( key, stage, ok, ms, detail, skipped = null, na = false ) => noted.push( { key, stage, ok, skipped, na } );
	return { noted, stepperFor: surfaceStepper( { stages, note } ) };
};

test( 'MUST FAIL: WooCommerce\'s own cart page is never proposed; the propose stage is recorded not applicable', async () => {
	const { noted, stepperFor } = harness();
	const step = stepperFor( 'cart', 'cart' );
	let ran = 0;
	assert.equal( await step( 'inventory', async () => ++ran ), true );
	assert.equal( ran, 1, 'the inventory still runs' );
	assert.equal( await step( 'propose', async () => ++ran ), true );
	assert.equal( ran, 1, 'the proposal is never made' );
	const propose = noted.find( ( n ) => 'propose' === n.stage );
	assert.equal( propose.ok, true );
	assert.equal( propose.na, true, 'not applicable, so --strict counts no gap' );
	assert.match( propose.skipped, /WooCommerce's own cart page keeps WooCommerce's content/ );
} );

test( 'MUST FAIL: WooCommerce\'s own page ends after its inventory: every later stage is noted not applicable and none runs', async () => {
	const { noted, stepperFor } = harness();
	const step = stepperFor( 'checkout', 'checkout' );
	await endWooPage( step );
	assert.deepEqual( noted.map( ( n ) => n.stage ), [ 'propose', 'fill', 'build', 'apply', 'walk' ] );
	assert.ok( noted.every( ( n ) => n.ok && n.na && /checkout page keeps WooCommerce's content/.test( n.skipped ) ) );
} );

test( 'negative control: an ordinary page runs every stage it is asked for', async () => {
	const { noted, stepperFor } = harness();
	const step = stepperFor( 'about', null );
	const ran = [];
	for ( const s of STAGES ) {
		assert.equal( await step( s, async () => ran.push( s ) ), true );
	}
	assert.deepEqual( ran, STAGES );
	assert.ok( noted.every( ( n ) => ! n.skipped ) );
} );

test( 'negative control: a stage left out of --stages is noted as left out, not as WooCommerce\'s, and a failed stage stops the surface', async () => {
	const { noted, stepperFor } = harness( { stages: [ 'inventory' ] } );
	const step = stepperFor( 'cart', 'cart' );
	assert.equal( await step( 'propose', async () => 1 ), true );
	assert.equal( noted[ 0 ].skipped, 'not in --stages' );
	assert.equal( noted[ 0 ].na, false );
	const plain = harness().stepperFor( 'about', null );
	assert.equal( await plain( 'fill', async () => {
		throw new Error( 'boom' );
	} ), false );
} );
