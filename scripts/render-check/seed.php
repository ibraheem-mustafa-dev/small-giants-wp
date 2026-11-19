<?php
/**
 * Seeds a scratch copy for the render check: one customer with fixed details, one saved item, one order of fixed
 * date and order key, and the product the capture puts in a basket. Prints the facts as one JSON line.
 *
 *   wp eval-file seed.php <args.json>
 *
 * args.json: { "password": "...", "product": <optional product or variation id> }. Run identically on both copies
 * of a run (they are copies of one database), so every id, date and key matches between them. Sends no email.
 *
 * @package SGS\RenderCheck
 */

// phpcs:disable WordPress.WP.GlobalVariablesOverride.Prohibited -- a WP-CLI script, not plugin code.

$rc_args = json_decode( (string) file_get_contents( $args[0] ?? '' ), true );
if ( ! is_array( $rc_args ) || empty( $rc_args['password'] ) ) {
	fwrite( STDERR, "seed.php: pass the args file\n" );
	exit( 1 );
}

add_filter( 'pre_wp_mail', '__return_false' );

$rc_out = array( 'woocommerce' => function_exists( 'wc_create_order' ) );

$rc_login = 'rc-customer';
$rc_user  = get_user_by( 'login', $rc_login );
if ( $rc_user ) {
	require_once ABSPATH . 'wp-admin/includes/user.php';
	wp_delete_user( $rc_user->ID );
}
$rc_uid = wp_insert_user(
	array(
		'user_login'      => $rc_login,
		'user_pass'       => $rc_args['password'],
		'user_email'      => 'rc-customer@example.com',
		'first_name'      => 'Sam',
		'last_name'       => 'Taylor',
		'display_name'    => 'Sam Taylor',
		'nickname'        => 'Sam',
		'role'            => $rc_out['woocommerce'] ? 'customer' : 'subscriber',
		'user_registered' => '2026-01-10 09:00:00',
	)
);
if ( is_wp_error( $rc_uid ) ) {
	fwrite( STDERR, 'seed.php: ' . $rc_uid->get_error_message() . "\n" );
	exit( 1 );
}
update_user_meta( $rc_uid, 'show_admin_bar_front', 'false' );
$rc_out['customer'] = array(
	'id'    => $rc_uid,
	'login' => $rc_login,
);

if ( ! $rc_out['woocommerce'] ) {
	echo wp_json_encode( $rc_out ) . "\n";
	return;
}

$rc_address = array(
	'first_name' => 'Sam',
	'last_name'  => 'Taylor',
	'company'    => '',
	'address_1'  => '1 Test Street',
	'address_2'  => '',
	'city'       => 'Birmingham',
	'state'      => '',
	'postcode'   => 'B1 1AA',
	'country'    => 'GB',
);
$rc_customer = new WC_Customer( $rc_uid );
foreach ( $rc_address as $rc_k => $rc_v ) {
	$rc_customer->{"set_billing_$rc_k"}( $rc_v );
	$rc_customer->{"set_shipping_$rc_k"}( $rc_v );
}
$rc_customer->set_billing_email( 'rc-customer@example.com' );
$rc_customer->set_billing_phone( '07700900000' );
$rc_customer->save();

// The product a basket holds: the one asked for, else the first purchasable in-stock simple product, else the first
// such variation (every attribute set) of a variable product. Each candidate is added to a basket here, as WooCommerce's
// own add-to-cart form would add it: with no choices, then with the fewest picks each SGS pick group asks for. The first
// that the shop accepts is kept, with the form fields that added it.
$rc_candidates = static function () use ( $rc_args ) {
	if ( ! empty( $rc_args['product'] ) ) {
		return array_filter( array( wc_get_product( (int) $rc_args['product'] ) ) );
	}
	$out = array();
	foreach ( wc_get_products( array( 'status' => 'publish', 'type' => 'simple', 'stock_status' => 'instock', 'limit' => 20, 'orderby' => 'ID', 'order' => 'ASC' ) ) as $p ) {
		if ( $p->is_purchasable() && $p->is_in_stock() && 'hidden' !== $p->get_catalog_visibility() ) {
			$out[] = $p;
		}
	}
	foreach ( wc_get_products( array( 'status' => 'publish', 'type' => 'variable', 'limit' => 20, 'orderby' => 'ID', 'order' => 'ASC' ) ) as $p ) {
		foreach ( $p->get_children() as $vid ) {
			$v = wc_get_product( $vid );
			if ( $v && $v->is_purchasable() && $v->is_in_stock() && ! in_array( '', $v->get_variation_attributes(), true ) ) {
				$out[] = $v;
				break;
			}
		}
	}
	return $out;
};
$rc_pick_sets = static function ( int $parent_id ): array {
	$sets = array( array() );
	if ( ! class_exists( '\SGS\Blocks\Configurator_Groups' ) || ! function_exists( '\SGS\Blocks\sgs_picks_active_groups' ) ) {
		return $sets;
	}
	$active = \SGS\Blocks\sgs_picks_active_groups( \SGS\Blocks\Configurator_Groups::for_product( $parent_id ) );
	if ( ! $active ) {
		return $sets;
	}
	$fields = array();
	foreach ( $active as $key => $group ) {
		$need = max( 1, (int) ( $group['flags']['least'] ?? 1 ) );
		foreach ( array_slice( $group['terms'], 0, $need ) as $i => $term ) {
			$fields[ "sgs_picks[$key][$i]" ] = (string) $term['slug'];
		}
	}
	$sets[] = $fields;
	return $sets;
};
wc_load_cart();
$rc_product = null;
$rc_fields  = array();
foreach ( $rc_candidates() as $rc_c ) {
	$rc_pid   = $rc_c->get_parent_id() ? $rc_c->get_parent_id() : $rc_c->get_id();
	$rc_attrs = $rc_c->get_parent_id() ? $rc_c->get_variation_attributes() : array();
	foreach ( $rc_pick_sets( $rc_pid ) as $rc_set ) {
		$_POST = array();
		foreach ( $rc_set as $rc_k => $rc_v ) {
			preg_match( '/^sgs_picks\[([^\]]+)\]\[(\d+)\]$/', $rc_k, $rc_m );
			$_POST['sgs_picks'][ $rc_m[1] ][ (int) $rc_m[2] ] = $rc_v;
		}
		wc_clear_notices();
		$rc_ok = apply_filters( 'woocommerce_add_to_cart_validation', true, $rc_pid, 1, $rc_c->get_parent_id() ? $rc_c->get_id() : 0, $rc_attrs );
		$rc_in = $rc_ok ? WC()->cart->add_to_cart( $rc_pid, 1, $rc_c->get_parent_id() ? $rc_c->get_id() : 0, $rc_attrs ) : false;
		WC()->cart->empty_cart();
		$_POST = array();
		if ( $rc_in ) {
			$rc_product = $rc_c;
			$rc_fields  = array(
				'add-to-cart' => (string) $rc_pid,
				'product_id'  => (string) $rc_pid,
				'quantity'    => '1',
			);
			if ( $rc_c->get_parent_id() ) {
				$rc_fields['variation_id'] = (string) $rc_c->get_id();
				$rc_fields                += $rc_attrs;
			}
			$rc_fields += $rc_set;
			break 2;
		}
	}
}
wc_clear_notices();
if ( ! $rc_product ) {
	fwrite( STDERR, "seed.php: no product the shop accepts in a basket (tried each candidate with no choices and with the fewest picks)\n" );
	exit( 1 );
}
$rc_parent         = $rc_product->get_parent_id() ? wc_get_product( $rc_product->get_parent_id() ) : $rc_product;
$rc_out['product'] = array(
	'id'        => $rc_product->get_id(),
	'parent'    => $rc_parent->get_id(),
	'name'      => $rc_parent->get_name(),
	'path'      => wp_make_link_relative( get_permalink( $rc_parent->get_id() ) ),
	'addFields' => $rc_fields,
);

// One saved item (the parent product: the saved list holds products, not variations).
update_user_meta(
	$rc_uid,
	'_sgs_wishlist',
	wp_json_encode(
		array(
			array(
				'id'         => $rc_parent->get_id(),
				'addedTs'    => 1768467600,
				'savedPrice' => null,
				'currency'   => '',
				'alertPrice' => null,
				'inStock'    => null,
			),
		)
	)
);

// One order of fixed date and key.
$rc_order = wc_create_order(
	array(
		'customer_id' => $rc_uid,
		'created_via' => 'render-check',
	)
);
$rc_order->add_product( $rc_product, 1 );
$rc_ship = new WC_Order_Item_Shipping();
$rc_ship->set_method_title( 'Standard delivery' );
$rc_ship->set_method_id( 'flat_rate' );
$rc_ship->set_total( '3.50' );
$rc_order->add_item( $rc_ship );
$rc_order->set_address( $rc_address + array( 'email' => 'rc-customer@example.com', 'phone' => '07700900000' ), 'billing' );
$rc_order->set_address( $rc_address, 'shipping' );
$rc_order->set_payment_method( 'bacs' );
$rc_order->set_payment_method_title( 'Card' );
$rc_order->set_order_key( 'wc_order_rendercheck01' );
$rc_order->calculate_totals( false );
$rc_order->set_status( 'processing' );
$rc_order->set_date_created( '2026-01-15T10:30:00+00:00' );
$rc_order->set_date_paid( '2026-01-15T10:31:00+00:00' );
$rc_order->save();

$rc_out['order'] = array(
	'id'       => $rc_order->get_id(),
	'number'   => (string) $rc_order->get_order_number(),
	'key'      => $rc_order->get_order_key(),
	'received' => wp_make_link_relative( $rc_order->get_checkout_order_received_url() ),
	'view'     => wp_make_link_relative( $rc_order->get_view_order_url() ),
);

echo wp_json_encode( $rc_out ) . "\n";
