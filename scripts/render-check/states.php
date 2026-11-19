<?php
/**
 * Lists the pages and states the render check captures on a site, as JSON, from the site itself: every published
 * page, the front page, the posts page and a post, a missing page, and on a shop the shop, a product, a category,
 * product searches, the basket empty and filled, the checkout, the account signed out, every signed-in account view
 * in the account menu, the seeded order's view and its order confirmation.
 *
 *   wp eval-file states.php <seed.json>
 *
 * seed.json is seed.php's output. A state names who views it (`auth`: guest or customer), whether its basket holds
 * the seeded product (`basket`), and what proves it was reached (`assert` selectors, `assertText`); a state whose
 * proof fails is unreached, never compared.
 *
 * @package SGS\RenderCheck
 */

$rc_seed = json_decode( (string) file_get_contents( $args[0] ?? '' ), true );
if ( ! is_array( $rc_seed ) ) {
	fwrite( STDERR, "states.php: pass seed.php's output file\n" );
	exit( 1 );
}

$rc_rel    = static function ( $url ) {
	return wp_make_link_relative( (string) $url );
};
$rc_states = array();
$rc_add    = static function ( array $s ) use ( &$rc_states ) {
	$rc_states[ $s['name'] ] = $s + array(
		'auth'   => 'guest',
		'basket' => false,
		'assert' => array(),
	);
};

$rc_special = array();
if ( ! empty( $rc_seed['woocommerce'] ) ) {
	foreach ( array( 'cart', 'checkout', 'myaccount', 'shop' ) as $rc_p ) {
		$rc_special[] = (int) wc_get_page_id( $rc_p );
	}
}

$rc_add(
	array(
		'name' => 'home',
		'path' => '/',
	)
);
$rc_front = (int) get_option( 'page_on_front' );
$rc_posts = (int) get_option( 'page_for_posts' );
foreach ( get_posts( array( 'post_type' => 'page', 'post_status' => 'publish', 'numberposts' => -1, 'orderby' => 'ID', 'order' => 'ASC' ) ) as $rc_page ) {
	if ( in_array( $rc_page->ID, $rc_special, true ) || $rc_page->ID === $rc_front ) {
		continue;
	}
	$rc_add(
		array(
			'name' => 'page-' . $rc_page->post_name,
			'path' => $rc_rel( get_permalink( $rc_page ) ),
		)
	);
}
if ( $rc_posts && 'publish' === get_post_status( $rc_posts ) ) {
	$rc_add(
		array(
			'name' => 'blog',
			'path' => $rc_rel( get_permalink( $rc_posts ) ),
		)
	);
}
$rc_post = get_posts( array( 'post_type' => 'post', 'post_status' => 'publish', 'numberposts' => 1, 'orderby' => 'ID', 'order' => 'ASC' ) );
if ( $rc_post ) {
	$rc_add(
		array(
			'name'   => 'post',
			'path'   => $rc_rel( get_permalink( $rc_post[0] ) ),
			'assert' => array( 'body.single-post' ),
		)
	);
}
$rc_add(
	array(
		'name'        => 'not-found',
		'path'        => '/render-check-no-such-page/',
		'allowStatus' => 404,
		'assert'      => array( 'body.error404' ),
	)
);
// Opened parts, found by structure (the visible control whose aria-controls names the dialog). A site or width with no
// such control records the state as not on this page; the phone menu is first loaded at 375.
$rc_add(
	array(
		'name'      => 'menu-open',
		'path'      => '/',
		'hashWidth' => 375,
		'actions'   => array( array( 'open' => 'dialog.sgs-nav-drawer' ) ),
		'assert'    => array( 'dialog.sgs-nav-drawer[open]' ),
	)
);
$rc_add(
	array(
		'name'    => 'search-empty',
		'path'   => '/?s=rcnoresultzq',
		'assert' => array( 'body.search' ),
	)
);

if ( ! empty( $rc_seed['woocommerce'] ) ) {
	$rc_product = $rc_seed['product'];
	$rc_word    = preg_split( '/\s+/', trim( $rc_product['name'] ) )[0];
	$rc_order   = $rc_seed['order'];

	$rc_add(
		array(
			'name'   => 'shop',
			'path'   => $rc_rel( wc_get_page_permalink( 'shop' ) ),
			'assert' => array( 'body.woocommerce-shop' ),
		)
	);
	$rc_add(
		array(
			'name'   => 'product',
			'path'   => $rc_product['path'],
			'assert' => array( 'body.single-product' ),
		)
	);
	$rc_cat = get_terms( array( 'taxonomy' => 'product_cat', 'hide_empty' => true, 'number' => 1, 'orderby' => 'term_id', 'exclude' => array( (int) get_option( 'default_product_cat' ) ) ) );
	if ( $rc_cat && ! is_wp_error( $rc_cat ) ) {
		$rc_add(
			array(
				'name'   => 'product-category',
				'path'   => $rc_rel( get_term_link( $rc_cat[0] ) ),
				'assert' => array( 'body.tax-product_cat' ),
			)
		);
	}
	$rc_add(
		array(
			'name'       => 'product-search',
			'path'       => '/?s=' . rawurlencode( $rc_word ) . '&post_type=product',
			'assert'     => array( 'body.search' ),
			'assertText' => array( $rc_product['name'] ),
		)
	);

	$rc_cart     = $rc_rel( wc_get_page_permalink( 'cart' ) );
	$rc_checkout = $rc_rel( wc_get_page_permalink( 'checkout' ) );
	$rc_lines    = '.wc-block-cart-items__row, .woocommerce-cart-form__cart-item, .wc-block-components-order-summary-item, .woocommerce-checkout-review-order-table .cart_item';
	$rc_add(
		array(
			'name'   => 'cart-empty',
			'path'   => $rc_cart,
			'assert' => array( '.wp-block-woocommerce-empty-cart-block, .wc-empty-cart-message, .cart-empty' ),
		)
	);
	$rc_add(
		array(
			'name'       => 'cart-filled',
			'path'       => $rc_cart,
			'basket'     => true,
			'assert'     => array( $rc_lines ),
			'assertText' => array( $rc_product['name'] ),
		)
	);
	$rc_add(
		array(
			'name'       => 'checkout',
			'path'       => $rc_checkout,
			'basket'     => true,
			'assert'     => array( 'body.woocommerce-checkout', $rc_lines ),
			'assertText' => array( $rc_product['name'] ),
		)
	);
	$rc_add(
		array(
			'name'       => 'checkout-signed-in',
			'path'       => $rc_checkout,
			'auth'       => 'customer',
			'basket'     => true,
			'assert'     => array( 'body.logged-in', 'body.woocommerce-checkout', $rc_lines ),
			'assertText' => array( $rc_product['name'] ),
		)
	);
	$rc_coupon = '.wc-block-components-totals-coupon .wc-block-components-panel__button';
	$rc_add(
		array(
			'name'    => 'basket-drawer-empty',
			'path'    => '/',
			'actions' => array( array( 'open' => 'dialog.sgs-cart__panel' ), array( 'waitGone' => '.sgs-cart__panel-loading' ) ),
			'assert'  => array( 'dialog.sgs-cart__panel[open]' ),
		)
	);
	$rc_add(
		array(
			'name'       => 'basket-drawer-filled',
			'path'       => '/',
			'basket'     => true,
			'actions'    => array( array( 'open' => 'dialog.sgs-cart__panel' ), array( 'waitGone' => '.sgs-cart__panel-loading' ) ),
			'assert'     => array( 'dialog.sgs-cart__panel[open]' ),
			'assertText' => array( $rc_product['name'] ),
		)
	);
	$rc_add(
		array(
			'name'       => 'cart-coupon-open',
			'path'       => $rc_cart,
			'basket'     => true,
			'actions'    => array(
				array(
					'click'     => $rc_coupon,
					'ifPresent' => true,
				),
				array( 'waitFor' => '.wc-block-components-totals-coupon__input input' ),
			),
			'assert'     => array( $rc_lines, '.wc-block-components-totals-coupon__input input' ),
			'assertText' => array( $rc_product['name'] ),
		)
	);
	$rc_add(
		array(
			'name'       => 'checkout-coupon-open',
			'path'       => $rc_checkout,
			'basket'     => true,
			'actions'    => array(
				array(
					'click'     => $rc_coupon,
					'ifPresent' => true,
				),
				array( 'waitFor' => '.wc-block-components-totals-coupon__input input' ),
			),
			'assert'     => array( 'body.woocommerce-checkout', $rc_lines, '.wc-block-components-totals-coupon__input input' ),
			'assertText' => array( $rc_product['name'] ),
		)
	);
	$rc_add(
		array(
			'name'      => 'product-scrolled',
			'path'      => $rc_product['path'],
			'hashWidth' => 375,
			'actions'   => array( array( 'scroll' => 'middle' ) ),
			'assert'    => array( 'body.single-product' ),
		)
	);
	$rc_add(
		array(
			'name'         => 'account-signed-out',
			'path'         => $rc_rel( wc_get_page_permalink( 'myaccount' ) ),
			'assertAbsent' => array( 'body.logged-in' ),
		)
	);

	// Every signed-in view the account menu offers (signing out is not a view).
	foreach ( wc_get_account_menu_items() as $rc_key => $rc_label ) {
		if ( 'customer-logout' === $rc_key ) {
			continue;
		}
		$rc_state = array(
			'name'   => 'account-' . $rc_key,
			'path'   => $rc_rel( wc_get_account_endpoint_url( $rc_key ) ),
			'auth'   => 'customer',
			'assert' => array( 'body.logged-in', 'dashboard' === $rc_key ? 'body.woocommerce-dashboard' : 'body.woocommerce-' . sanitize_html_class( $rc_key ) ),
			'signedInView' => true,
		);
		if ( 'saved-items' === $rc_key ) {
			$rc_state['assertText'] = array( $rc_product['name'] );
		}
		if ( 'orders' === $rc_key ) {
			$rc_state['assertText'] = array( $rc_order['number'] );
		}
		$rc_add( $rc_state );
	}
	foreach ( array( 'billing', 'shipping' ) as $rc_type ) {
		$rc_add(
			array(
				'name'         => 'account-edit-address-' . $rc_type,
				'path'         => $rc_rel( wc_get_endpoint_url( 'edit-address', $rc_type, wc_get_page_permalink( 'myaccount' ) ) ),
				'auth'         => 'customer',
				'assert'       => array( 'body.logged-in', 'body.woocommerce-edit-address', 'input[name="' . $rc_type . '_address_1"]' ),
				'signedInView' => true,
			)
		);
	}
	// The account block's own address editor, opened in place from the addresses view.
	$rc_add(
		array(
			'name'         => 'account-address-editor-open',
			'path'         => $rc_rel( wc_get_account_endpoint_url( 'edit-address' ) ),
			'auth'         => 'customer',
			'actions'      => array(
				array(
					'click'     => '.sgs-account__addr-edit',
					'ifPresent' => true,
				),
				array( 'wait' => 800 ),
			),
			'assert'       => array( 'body.logged-in', '.sgs-account__addr form, form .woocommerce-address-fields, .sgs-account__addr-form' ),
			'signedInView' => true,
		)
	);
	$rc_add(
		array(
			'name'         => 'account-view-order',
			'path'         => $rc_order['view'],
			'auth'         => 'customer',
			'assert'       => array( 'body.logged-in', 'body.woocommerce-view-order' ),
			'assertText'   => array( $rc_order['number'], $rc_product['name'] ),
			'signedInView' => true,
		)
	);
	$rc_add(
		array(
			'name'       => 'order-received',
			'path'       => $rc_order['received'],
			'auth'       => 'customer',
			'assert'     => array( 'body.woocommerce-order-received' ),
			'assertText' => array( $rc_order['number'], $rc_product['name'] ),
		)
	);
}

echo wp_json_encode( array_values( $rc_states ) ) . "\n";
