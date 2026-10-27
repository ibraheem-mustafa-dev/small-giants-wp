// A fixture's `wishlist` (calibration-fixtures.json): sgs/wishlist-panel builds its rows in the browser from the logged-in
// user's saved list (the `_sgs_wishlist` user meta, plugins/sgs-blocks/includes/wishlist/class-wishlist-store.php, read
// through GET /sgs/v1/wishlist), so its row settings have nothing to paint while the list is empty, and its empty-state
// settings have nothing to paint while it holds an item. The block is read a second time holding one saved product (the
// site's first published WooCommerce product), as a fixture's `basket` is (lib/calibrate-basket.mjs), and each instance
// keeps the pass in which its marker shows. The user's own list is kept under a backup meta key and put back afterwards.

const META = '_sgs_wishlist';
const BACKUP = '_sgs_wishlist_calibration_backup';

// The last JSON line of a wp-cli reply (a PHP notice can print before or after it), or {}.
function lastJson( text ) {
	const line = String( text || '' ).trim().split( /\r?\n/ ).reverse().find( ( l ) => l.trim().startsWith( '{' ) );
	try {
		return line ? JSON.parse( line ) : {};
	} catch {
		return {};
	}
}

// The PHP that saves one published product to `customer`'s list (`on`), keeping the list they had, or puts that list
// back (`! on`). Prints { items } (the list length after), or { error }.
export function wishlistPhp( { customer, on } ) {
	const login = `'${ String( customer ).replace( /\\/g, '\\\\' ).replace( /'/g, "\\'" ) }'`;
	const user = `$u = get_user_by( 'login', ${ login } );
if ( ! $u ) { echo wp_json_encode( array( 'error' => 'no user with the login the wishlist is for' ) ); return; }
`;
	if ( ! on ) {
		return `<?php
${ user }$kept = get_user_meta( $u->ID, '${ BACKUP }', true );
if ( '' === $kept ) { delete_user_meta( $u->ID, '${ META }' ); } else { update_user_meta( $u->ID, '${ META }', $kept ); }
delete_user_meta( $u->ID, '${ BACKUP }' );
echo wp_json_encode( array( 'items' => count( (array) json_decode( (string) get_user_meta( $u->ID, '${ META }', true ), true ) ) ) );
`;
	}
	return `<?php
if ( ! function_exists( 'wc_get_products' ) ) { echo wp_json_encode( array( 'error' => 'WooCommerce is not active' ) ); return; }
${ user }$p = wc_get_products( array( 'status' => 'publish', 'limit' => 1, 'orderby' => 'ID', 'order' => 'ASC', 'return' => 'ids' ) );
if ( ! $p ) { echo wp_json_encode( array( 'error' => 'the site has no published product' ) ); return; }
if ( ! metadata_exists( 'user', $u->ID, '${ BACKUP }' ) ) { update_user_meta( $u->ID, '${ BACKUP }', (string) get_user_meta( $u->ID, '${ META }', true ) ); }
update_user_meta( $u->ID, '${ META }', wp_json_encode( array( array( 'id' => (int) $p[0], 'addedTs' => time() ) ) ) );
echo wp_json_encode( array( 'items' => 1 ) );
`;
}

// Saves (`on`) or puts back the logged-in user's list on the site `runPhp` reaches (lib/calibration-refs.mjs::wpEvalRunner).
// Throws when there is no login or the site refuses; returns the reply ({ items }).
export function setWishlist( runPhp, customer, on ) {
	if ( ! customer ) {
		throw new Error( 'wishlist: no login for the user the wishlist is for (the target env has no WP_USER)' );
	}
	const reply = lastJson( runPhp( wishlistPhp( { customer, on } ) ) );
	if ( reply.error ) {
		throw new Error( `wishlist: ${ reply.error }` );
	}
	return reply;
}
