// A fixture's `wishlist` (calibration-fixtures.json): sgs/wishlist-panel builds its rows in the browser from the logged-in
// user's saved list (the `_sgs_wishlist` user meta, plugins/sgs-blocks/includes/wishlist/class-wishlist-store.php, read
// through GET /sgs/v1/wishlist), so its row settings have nothing to paint while the list is empty, and its empty-state
// settings have nothing to paint while it holds an item. The block is read a second time holding saved products in the
// states its price-drop, out-of-stock, alerts/share bar and share-field elements print in, as a fixture's `basket` is
// (lib/calibrate-basket.mjs), and each instance keeps the pass in which its marker shows. The user's own list, their
// share meta, the site's feature switches and the out-of-stock product's stock meta are kept under backup meta keys and
// put back afterwards.

const META = '_sgs_wishlist';
const BACKUP = '_sgs_wishlist_calibration_backup';
const STATE = '_sgs_wishlist_calibration_state';
const FEATURES = 'sgs_wishlist_features';
const SHARE_ON = '_sgs_wishlist_share_on';
const SHARE_TOKEN = '_sgs_wishlist_share_token';

// The last JSON line of a wp-cli reply (a PHP notice can print before or after it), or {}.
function lastJson( text ) {
	const line = String( text || '' ).trim().split( /\r?\n/ ).reverse().find( ( l ) => l.trim().startsWith( '{' ) );
	try {
		return line ? JSON.parse( line ) : {};
	} catch {
		return {};
	}
}

// The PHP that puts the wishlist into the states that print every element a setting paints (`on`), keeping what the user
// and the site had, or puts that back exactly (`! on`). Two published products are saved: a simple in-stock product with
// a saved price above its current price (the price-drop line and the Move to basket button, which a product with options
// replaces with a Choose options link) and, when the site has another in-stock product, that one out of stock for the
// pass (the stock chip). The site's alerts and sharing switches (`sgs_wishlist_features`) are switched on,
// and the user's share link is turned on (the alerts/share bar, the share field and its controls print). Prints
// { items } (the list length after), or { error }.
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
$state = json_decode( (string) get_user_meta( $u->ID, '${ STATE }', true ), true );
if ( is_array( $state ) ) {
	if ( ! empty( $state['features']['had'] ) ) { update_option( '${ FEATURES }', $state['features']['value'] ); } else { delete_option( '${ FEATURES }' ); }
	foreach ( array( 'shareOn' => '${ SHARE_ON }', 'token' => '${ SHARE_TOKEN }' ) as $k => $key ) {
		if ( ! empty( $state[ $k ]['had'] ) ) { update_user_meta( $u->ID, $key, $state[ $k ]['value'] ); } else { delete_user_meta( $u->ID, $key ); }
	}
	if ( ! empty( $state['stock']['id'] ) ) {
		$sid = (int) $state['stock']['id'];
		if ( ! empty( $state['stock']['had'] ) ) { update_post_meta( $sid, '_stock_status', $state['stock']['value'] ); } else { delete_post_meta( $sid, '_stock_status' ); }
		wc_delete_product_transients( $sid );
	}
}
delete_user_meta( $u->ID, '${ STATE }' );
echo wp_json_encode( array( 'items' => count( (array) json_decode( (string) get_user_meta( $u->ID, '${ META }', true ), true ) ) ) );
`;
	}
	return `<?php
if ( ! function_exists( 'wc_get_products' ) ) { echo wp_json_encode( array( 'error' => 'WooCommerce is not active' ) ); return; }
${ user }$ids = wc_get_products( array( 'status' => 'publish', 'limit' => -1, 'orderby' => 'ID', 'order' => 'ASC', 'return' => 'ids' ) );
if ( ! $ids ) { echo wp_json_encode( array( 'error' => 'the site has no published product' ) ); return; }
$drop = 0;
foreach ( $ids as $id ) { $pr = wc_get_product( $id ); if ( $pr && $pr->is_type( 'simple' ) && $pr->is_in_stock() ) { $drop = (int) $id; break; } }
if ( ! $drop ) { $drop = (int) $ids[0]; }
$oos = 0;
foreach ( $ids as $id ) { $pr = wc_get_product( $id ); if ( (int) $id !== $drop && $pr && $pr->is_in_stock() ) { $oos = (int) $id; break; } }
$pd = wc_get_product( $drop );
$now = ( $pd && '' !== (string) $pd->get_price() ) ? (int) round( (float) wc_get_price_to_display( $pd ) * ( 10 ** (int) wc_get_price_decimals() ) ) : 0;
if ( ! metadata_exists( 'user', $u->ID, '${ BACKUP }' ) ) {
	update_user_meta( $u->ID, '${ BACKUP }', (string) get_user_meta( $u->ID, '${ META }', true ) );
	$feat = get_option( '${ FEATURES }', '__absent__' );
	$state = array(
		'features' => array( 'had' => '__absent__' !== $feat, 'value' => '__absent__' === $feat ? null : $feat ),
		'shareOn'  => array( 'had' => metadata_exists( 'user', $u->ID, '${ SHARE_ON }' ), 'value' => get_user_meta( $u->ID, '${ SHARE_ON }', true ) ),
		'token'    => array( 'had' => metadata_exists( 'user', $u->ID, '${ SHARE_TOKEN }' ), 'value' => get_user_meta( $u->ID, '${ SHARE_TOKEN }', true ) ),
		'stock'    => array( 'id' => $oos, 'had' => $oos && metadata_exists( 'post', $oos, '_stock_status' ), 'value' => $oos ? get_post_meta( $oos, '_stock_status', true ) : '' ),
	);
	update_user_meta( $u->ID, '${ STATE }', wp_json_encode( $state ) );
}
$list = array( array( 'id' => $drop, 'addedTs' => time(), 'savedPrice' => $now * 2 + 100, 'currency' => get_woocommerce_currency() ) );
if ( $oos ) {
	$list[] = array( 'id' => $oos, 'addedTs' => time() );
	update_post_meta( $oos, '_stock_status', 'outofstock' );
	wc_delete_product_transients( $oos );
}
update_user_meta( $u->ID, '${ META }', wp_json_encode( $list ) );
update_option( '${ FEATURES }', array( 'priceAlerts' => true, 'stockAlerts' => true, 'sharing' => true ) );
update_user_meta( $u->ID, '${ SHARE_ON }', '1' );
if ( '' === (string) get_user_meta( $u->ID, '${ SHARE_TOKEN }', true ) ) { update_user_meta( $u->ID, '${ SHARE_TOKEN }', bin2hex( random_bytes( 16 ) ) ); }
echo wp_json_encode( array( 'items' => count( $list ) ) );
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
