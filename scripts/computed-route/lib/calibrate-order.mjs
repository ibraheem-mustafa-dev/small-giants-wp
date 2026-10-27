// A fixture's `order` (calibration-fixtures.json): a block whose settings paint only for a user with an order. sgs/account
// prints its latest-order card (status chip, progress steps, order thumbnails) only when the viewing user has one
// (plugins/sgs-blocks/includes/account/templates/dashboard.php), and a mirror copied from a test site may hold no orders,
// so every chip setting would read as dead. The block is read holding one pending test order (no email) for the
// logged-in user, made with the site run's builder (lib/site-build-apply.mjs) under calibration's own meta key, so a
// site run on the same site never deletes it and it never deletes a site run's order.
import { deleteTestOrdersPhp, testOrderPhp } from './site-build-apply.mjs';

export const CALIBRATION_ORDER_META = '_sgs_calibration_test_order';

// The last JSON line of a wp-cli reply (a PHP notice can print before or after it), or {}.
function lastJson( text ) {
	const line = String( text || '' ).trim().split( /\r?\n/ ).reverse().find( ( l ) => l.trim().startsWith( '{' ) );
	try {
		return line ? JSON.parse( line ) : {};
	} catch {
		return {};
	}
}

// Runs `read` holding the fixture's test order (or plainly when the fixture has none). `runPhp` runs a PHP body on the
// site (lib/calibration-refs.mjs::wpEvalRunner); `customer` is the logged-in user's login. Any calibration order a
// killed run left behind is deleted first, so the user's latest order is this run's. Throws when there is no login or
// the order cannot be made; the order is deleted whether `read` returns or throws, and a failed delete is reported
// through `warn`, never in place of the read's own result.
export async function withTestOrder( fixture, { runPhp, customer, warn = ( m ) => console.error( m ) }, read ) {
	if ( ! fixture?.order ) {
		return read();
	}
	if ( ! customer ) {
		throw new Error( 'test order: no login for the user the order is for (the target env has no WP_USER)' );
	}
	const sweep = ( when ) => {
		try {
			runPhp( deleteTestOrdersPhp( { meta: CALIBRATION_ORDER_META } ) );
		} catch ( e ) {
			warn( `test order: deleting calibration orders ${ when } failed: ${ String( e?.message || e ).split( /\r?\n/ )[ 0 ] }` );
		}
	};
	sweep( 'before the read' );
	try {
		const made = lastJson( runPhp( testOrderPhp( { customer, meta: CALIBRATION_ORDER_META } ) ) );
		if ( ! made.id ) {
			throw new Error( `test order: ${ made.error || 'the site returned no order id' }` );
		}
		return await read();
	} finally {
		sweep( 'after the read' );
	}
}
