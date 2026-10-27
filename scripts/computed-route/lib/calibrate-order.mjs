// A fixture's `order` (calibration-fixtures.json): a block whose settings paint only for a user with an order. sgs/account
// prints its latest-order card (status chip, progress steps, order thumbnails) only when the viewing user has one
// (plugins/sgs-blocks/includes/account/templates/dashboard.php), and a mirror copied from a test site may hold no orders,
// so every chip setting would read as dead. The block is read holding one pending test order (no email) for the
// logged-in user, made with the site run's builder (lib/site-build-apply.mjs) and deleted afterwards.
import { deleteTestOrdersPhp, testOrderPhp } from './site-build-apply.mjs';

const lastJson = ( text ) => JSON.parse( String( text || '' ).trim().split( /\r?\n/ ).pop() || '{}' );

// Runs `read` holding the fixture's test order (or plainly when the fixture has none). `runPhp` runs a PHP body on the
// site (lib/calibration-refs.mjs::wpEvalRunner); `customer` is the logged-in user's login. Throws when the order cannot
// be made; the order is deleted whether `read` returns or throws.
export async function withTestOrder( fixture, { runPhp, customer }, read ) {
	if ( ! fixture?.order ) {
		return read();
	}
	const made = lastJson( runPhp( testOrderPhp( { customer } ) ) );
	if ( made.error ) {
		throw new Error( `test order: ${ made.error }` );
	}
	try {
		return await read();
	} finally {
		runPhp( deleteTestOrdersPhp() );
	}
}
