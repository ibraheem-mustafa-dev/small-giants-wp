// A fixture's `order` (calibration-fixtures.json): sgs/account prints its latest-order card (status chip, progress steps,
// order thumbnails) only for a user with an order, so calibration makes one pending test order for the logged-in user
// before the block's page is read and deletes it afterwards, whether the read passed or threw.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEST_ORDER_META, testOrderPhp } from '../lib/site-build-apply.mjs';
import { withTestOrder } from '../lib/calibrate-order.mjs';

test( 'MUST FAIL: a test order for a named customer belongs to that user, pending and marked', () => {
	const php = testOrderPhp( { customer: "o'brien" } );
	assert.ok( php.includes( "get_user_by( 'login', 'o\\'brien' )" ), 'the login is a quoted PHP string' );
	assert.ok( php.includes( 'set_customer_id(' ), 'the order is the user\'s own' );
	assert.ok( php.includes( "wc_create_order( array( 'status' => 'pending' ) )" ) );
	assert.ok( php.includes( `update_meta_data( '${ TEST_ORDER_META }'` ) );
	assert.ok( ! testOrderPhp().includes( 'set_customer_id(' ), 'control: no customer, a guest order as before' );
} );

test( 'MUST FAIL: a fixture with order makes the order, runs, and deletes it even when the run throws', async () => {
	const calls = [];
	const runPhp = ( php ) => {
		calls.push( php.includes( 'wc_create_order' ) ? 'make' : 'delete' );
		return php.includes( 'wc_create_order' ) ? '{"id":7,"url":"x"}' : '{"deleted":1}';
	};
	const out = await withTestOrder( { order: true }, { runPhp, customer: 'Claude' }, async () => 'read' );
	assert.equal( out, 'read' );
	assert.deepEqual( calls, [ 'make', 'delete' ] );

	calls.length = 0;
	await assert.rejects( withTestOrder( { order: true }, { runPhp, customer: 'Claude' }, async () => {
		throw new Error( 'boom' );
	} ), /boom/ );
	assert.deepEqual( calls, [ 'make', 'delete' ], 'the order is deleted after a failed read' );

	calls.length = 0;
	assert.equal( await withTestOrder( {}, { runPhp, customer: 'Claude' }, async () => 'plain' ), 'plain' );
	assert.deepEqual( calls, [], 'control: a fixture without order touches no order' );
} );

test( 'MUST FAIL: an order the site cannot make stops the block with the reason', async () => {
	const runPhp = () => '{"error":"WooCommerce is not active"}';
	await assert.rejects( withTestOrder( { order: true }, { runPhp, customer: 'Claude' }, async () => 'read' ), /test order: WooCommerce is not active/ );
} );
