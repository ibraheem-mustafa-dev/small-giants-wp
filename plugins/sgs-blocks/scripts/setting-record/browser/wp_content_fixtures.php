<?php
// Scratch fixtures for the browser pass on the blocks that read the site's own content (browser/README.md): four published posts,
// each with a featured image and a category (sgs/post-grid, so its pagination has more than one page), and a shopper account the
// wishlist's logged-in parts (alerts, share link) need. Run by prove_script_parts.py --setup-content on a scratch copy only;
// running it again changes nothing.
$out = array();
$img = array( 23, 24, 25, 26 );
foreach ( $img as $i => $thumb ) {
	$slug = 'sr-post-' . ( $i + 1 );
	$ex   = get_page_by_path( $slug, OBJECT, 'post' );
	if ( $ex ) {
		$out[ $slug ] = (int) $ex->ID;
		continue;
	}
	$id = wp_insert_post(
		array(
			'post_type'    => 'post',
			'post_status'  => 'publish',
			'post_name'    => $slug,
			'post_title'   => 'Sample post ' . ( $i + 1 ),
			'post_excerpt' => 'A short sample excerpt for post ' . ( $i + 1 ) . '.',
			'post_content' => 'Sample content for post ' . ( $i + 1 ) . '.',
		),
		true
	);
	if ( is_wp_error( $id ) ) {
		$out[ $slug ] = 'ERR ' . $id->get_error_message();
		continue;
	}
	set_post_thumbnail( $id, $thumb );
	wp_set_object_terms( $id, array( 0 === $i % 2 ? 'News' : 'Updates' ), 'category' );
	$out[ $slug ] = (int) $id;
}
$user = get_user_by( 'login', 'sr_shopper' );
if ( ! $user ) {
	$uid = wp_insert_user( array( 'user_login' => 'sr_shopper', 'user_pass' => 'sr-shopper-scratch', 'user_email' => 'sr-shopper@example.test', 'role' => 'customer' ) );
	$out['sr_shopper'] = is_wp_error( $uid ) ? 'ERR ' . $uid->get_error_message() : (int) $uid;
} else {
	$out['sr_shopper'] = (int) $user->ID;
}
// the opening hours sgs/business-info prints for displayType hours (its option sgs_site_info, as fixtures.json's harness holds it)
$info = get_option( 'sgs_site_info' );
$info = is_array( $info ) ? $info : array();
if ( empty( $info['opening_hours'] ) ) {
	$info['opening_hours'] = array( 'mon' => '9:00-17:00', 'tue' => '9:00-17:00', 'wed' => '9:00-17:00', 'thu' => '9:00-17:00', 'fri' => '9:00-17:00', 'sat' => '10:00-14:00', 'sun' => 'Closed' );
	update_option( 'sgs_site_info', $info );
}
$out['opening_hours'] = array_keys( (array) $info['opening_hours'] );
// the wishlist: every feature switched on (sgs_wishlist_features, includes/wishlist/class-wishlist-settings.php), and the shopper holds two
// saved products, the simple one saved at a price above today's (so its price-drop line draws), with the share link on
update_option( 'sgs_wishlist_features', array( 'priceAlerts' => true, 'stockAlerts' => true, 'sharing' => true ) );
// an out-of-stock product (the wishlist draws its stock chip and its notify-me button for one)
$oos_post = get_page_by_path( 'sr-out-of-stock', OBJECT, 'product' );
if ( $oos_post ) {
	$oos_id = (int) $oos_post->ID;
} else {
	$oos = new WC_Product_Simple();
	$oos->set_name( 'SR Out of stock' );
	$oos->set_regular_price( '15' );
	$oos->set_status( 'publish' );
	$oos->set_catalog_visibility( 'visible' );
	$oos->set_manage_stock( false );
	$oos->set_stock_status( 'outofstock' );
	$oos_id = (int) $oos->save();
}
$out['out_of_stock'] = $oos_id;
$shopper = get_user_by( 'login', 'sr_shopper' );
if ( $shopper ) {
	$simple   = get_page_by_path( 'sr-branded-simple', OBJECT, 'product' );
	$variable = get_page_by_path( 'sr-variable', OBJECT, 'product' );
	if ( $simple && $variable ) {
		update_user_meta(
			$shopper->ID,
			'_sgs_wishlist',
			wp_json_encode(
				array(
					array( 'id' => (int) $simple->ID, 'addedTs' => time() - 86400, 'savedPrice' => 3000, 'currency' => 'GBP', 'alertPrice' => null, 'inStock' => true ),
					array( 'id' => (int) $variable->ID, 'addedTs' => time() - 3600, 'savedPrice' => 1000, 'currency' => 'GBP', 'alertPrice' => null, 'inStock' => true ),
					array( 'id' => $oos_id, 'addedTs' => time() - 600, 'savedPrice' => 1500, 'currency' => 'GBP', 'alertPrice' => null, 'inStock' => false ),
				)
			)
		);
		update_user_meta( $shopper->ID, '_sgs_wishlist_share_on', '1' );
		$out['wishlist'] = array( (int) $simple->ID, (int) $variable->ID, $oos_id );
	}
}
echo json_encode( $out ), "\n";
