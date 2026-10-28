<?php
/**
 * Child-process harness for GiftCardPreflightTest (Spec 27, FR-27-GC1).
 *
 * Loads the REAL `Product_Preflight` (and its real dependencies) against fake
 * WordPress/WooCommerce functions, then runs the publish gate for a gift card and
 * for an ordinary variable product with no variesBy mapping. Prints one JSON
 * object. Runs in its own PHP process so the stubs never reach the PHPUnit process
 * (the same arrangement as the other stub-heavy tests in this directory).
 *
 *   php tests/php/support/gift-card-preflight-harness.php
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

namespace {

	define( 'ABSPATH', dirname( __DIR__, 3 ) . '/' );
	define( 'WC_VERSION', '11.1.0' );

	$GLOBALS['t_updates'] = array();
	$GLOBALS['t_products'] = array();

	class WP_Post {
		public $ID;
		public $post_type = 'product';
		public function __construct( $id ) { $this->ID = $id; }
	}

	class T_Product {
		public $type; public $attrs;
		public function __construct( $type, $attrs = array() ) { $this->type = $type; $this->attrs = $attrs; }
		public function get_type() { return $this->type; }
		public function is_type( $t ) { return $this->type === $t; }
		public function get_children() { return array(); }
		public function get_image_id() { return 0; }
		public function get_variation_attributes() { return $this->attrs; }
	}

	function wc_get_product( $id ) { return $GLOBALS['t_products'][ $id ] ?? false; }
	function get_post_status( $id ) { return 'draft'; }
	function get_term_by( $f, $slug, $tax ) { return (object) array( 'term_id' => 7 ); }
	function get_term_meta( $id, $key, $single ) { return ''; }
	function get_the_title( $id ) { return 'Test product'; }
	function is_wp_error( $x ) { return false; }
	function apply_filters( $tag, $value ) { return $value; }
	function add_action() {}
	function remove_action() {}
	function delete_post_meta() {}
	function update_post_meta() {}
	function sanitize_text_field( $s ) { return trim( strip_tags( (string) $s ) ); }
	function wp_json_encode( $d, $f = 0 ) { return json_encode( $d, $f ); }
	function __( $s ) { return $s; }
	function _n( $a, $b, $n ) { return 1 === $n ? $a : $b; }
	function esc_html__( $s ) { return $s; }
	function esc_html( $s ) { return $s; }
	function wp_update_post( $args ) { $GLOBALS['t_updates'][] = $args; return $args['ID']; }

	// A gift card: its own type, no variations, and (on purpose) a variation-style attribute that would fail check 6 if it were evaluated.
	$GLOBALS['t_products'][101] = new T_Product( 'sgs_gift_card', array( 'pa_amount' => array( '15', '25', '40' ) ) );
	// An ordinary variable product whose only axis maps to no Google variesBy value.
	$GLOBALS['t_products'][202] = new T_Product( 'variable', array( 'pa_amount' => array( '15', '25', '40' ) ) );
	// A gift card that WooCommerce would also treat as variable (a subclass of the variable class): only the type name can exempt it.
	$GLOBALS['t_products'][303] = new class( 'sgs_gift_card', array( 'pa_amount' => array( '15', '25' ) ) ) extends T_Product {
		public function is_type( $t ) { return 'variable' === $t || parent::is_type( $t ); }
	};

	require_once dirname( __DIR__, 3 ) . '/includes/gift-card/class-gift-card-product-type.php';
	$includes = dirname( __DIR__, 3 ) . '/includes';
	if ( in_array( '--without-exemption', $argv, true ) ) {
		// Mutation run: the same file with the gift-card exemption switched off, to prove the exemption is what lets a gift card through.
		$source = file_get_contents( $includes . '/class-product-preflight.php' );
		$source = str_replace( '__DIR__', var_export( $includes, true ), $source );
		$source = str_replace( 'Gift_Card\Gift_Card_Product_Type::is_gift_card( $product )', 'false', $source, $replaced );
		if ( 1 !== $replaced ) {
			fwrite( STDERR, 'exemption call not found exactly once' );
			exit( 3 );
		}
		eval( '?>' . $source );
	} else {
		require_once $includes . '/class-product-preflight.php';
	}

	$gift     = \SGS\Blocks\Product_Preflight::evaluate( 101, true );
	$variable = \SGS\Blocks\Product_Preflight::evaluate( 202, true );
	$gift_var = \SGS\Blocks\Product_Preflight::evaluate( 303, true );

	\SGS\Blocks\Product_Preflight::on_transition_post_status( 'publish', 'draft', new WP_Post( 101 ) );
	$after_gift = $GLOBALS['t_updates'];
	\SGS\Blocks\Product_Preflight::on_transition_post_status( 'publish', 'draft', new WP_Post( 202 ) );
	$after_both = $GLOBALS['t_updates'];

	echo json_encode(
		array(
			'gift_ready'      => $gift['ready'],
			'gift_checked'    => $gift['checked'],
			'gift_variable_like_ready' => $gift_var['ready'],
			'variable_ready'  => $variable['ready'],
			'variable_codes'  => array_column( $variable['issues'], 'code' ),
			'updates_gift'    => $after_gift,
			'updates_after'   => $after_both,
		)
	);
}
