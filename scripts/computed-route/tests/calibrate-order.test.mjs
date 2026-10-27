// A fixture's `order` (calibration-fixtures.json): sgs/account prints its latest-order card (status chip, progress steps,
// order thumbnails) only for a user with an order, so calibration makes one pending test order for the logged-in user
// before the block's page is read and deletes it afterwards, whether the read passed or threw.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEST_ORDER_META, testOrderPhp } from '../lib/site-build-apply.mjs';
import { CALIBRATION_ORDER_META, withTestOrder } from '../lib/calibrate-order.mjs';

test( 'MUST FAIL: a test order for a named customer belongs to that user, pending and marked', () => {
	const php = testOrderPhp( { customer: "o'brien" } );
	assert.ok( php.includes( "get_user_by( 'login', 'o\\'brien' )" ), 'the login is a quoted PHP string' );
	assert.ok( php.includes( 'set_customer_id(' ), 'the order is the user\'s own' );
	assert.ok( php.includes( "wc_create_order( array( 'status' => 'pending' ) )" ) );
	assert.ok( php.includes( `update_meta_data( '${ TEST_ORDER_META }'` ) );
	assert.ok( ! testOrderPhp().includes( 'set_customer_id(' ), 'control: no customer, a guest order as before' );
} );

test( 'MUST FAIL: a fixture with order sweeps stale calibration orders, makes one, runs, and deletes it even when the run throws', async () => {
	const calls = [];
	const runPhp = ( php ) => {
		const kind = php.includes( 'wc_create_order' ) ? 'make' : 'delete';
		calls.push( kind );
		assert.ok( php.includes( CALIBRATION_ORDER_META ), `${ kind } uses the calibration's own meta key` );
		assert.ok( ! php.includes( TEST_ORDER_META ), `${ kind } never touches the site run's test orders` );
		return 'make' === kind ? 'PHP Notice: something\n{"id":7,"url":"x"}\nPHP Deprecated: after' : '{"deleted":1}';
	};
	const out = await withTestOrder( { order: true }, { runPhp, customer: 'Claude' }, async () => 'read' );
	assert.equal( out, 'read' );
	assert.deepEqual( calls, [ 'delete', 'make', 'delete' ], 'a stale order from a killed run is swept first' );

	calls.length = 0;
	await assert.rejects( withTestOrder( { order: true }, { runPhp, customer: 'Claude' }, async () => {
		throw new Error( 'boom' );
	} ), /boom/ );
	assert.deepEqual( calls, [ 'delete', 'make', 'delete' ], 'the order is deleted after a failed read' );

	calls.length = 0;
	assert.equal( await withTestOrder( {}, { runPhp, customer: 'Claude' }, async () => 'plain' ), 'plain' );
	assert.deepEqual( calls, [], 'control: a fixture without order touches no order' );
} );

test( 'MUST FAIL: a failed delete keeps the read result; no login refuses before any order is made', async () => {
	const runPhp = ( php ) => {
		if ( php.includes( 'wc_create_order' ) ) {
			return '{"id":7}';
		}
		throw new Error( 'wp-cli died' );
	};
	const warned = [];
	assert.equal( await withTestOrder( { order: true }, { runPhp, customer: 'Claude', warn: ( m ) => warned.push( m ) }, async () => 'read' ), 'read' );
	assert.ok( warned.some( ( m ) => /wp-cli died/.test( m ) ), 'the failed delete is reported' );
	const made = [];
	await assert.rejects( withTestOrder( { order: true }, { runPhp: ( php ) => made.push( php ), customer: undefined }, async () => 'read' ), /no login/ );
	assert.equal( made.length, 0 );
} );

test( 'MUST FAIL: an order the site cannot make stops the block with the reason', async () => {
	const runPhp = ( php ) => ( php.includes( 'wc_create_order' ) ? '{"error":"WooCommerce is not active"}' : '{"deleted":0}' );
	await assert.rejects( withTestOrder( { order: true }, { runPhp, customer: 'Claude' }, async () => 'read' ), /test order: WooCommerce is not active/ );
} );
