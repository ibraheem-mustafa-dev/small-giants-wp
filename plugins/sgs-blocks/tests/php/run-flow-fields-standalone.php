<?php
/**
 * Standalone test: sgs_flow_fields_sanitise() (Spec 43 FR-43-21).
 *
 * Run: php tests/php/run-flow-fields-standalone.php
 * Exit 0 all pass, 1 any failure.
 */

namespace SGS\Blocks\Forms {
	class Form_Upload {
		const UPLOAD_META_KEY = '_sgs_form_upload';
	}
}

namespace {
	define( 'ABSPATH', __DIR__ . '/' );

	// Attachments: 10 = a flow upload by session "abc"; 11 = the same by "xyz";
	// 12 = an ordinary media-library image (no SGS upload meta); 13 = a page.
	$GLOBALS['posts'] = array(
		10 => (object) array( 'post_type' => 'attachment' ),
		11 => (object) array( 'post_type' => 'attachment' ),
		12 => (object) array( 'post_type' => 'attachment' ),
		13 => (object) array( 'post_type' => 'page' ),
	);
	$GLOBALS['meta'] = array(
		10 => array( '_sgs_form_upload' => 1, '_sgs_flow_upload_owner' => 'abc' ),
		11 => array( '_sgs_form_upload' => 1, '_sgs_flow_upload_owner' => 'xyz' ),
		12 => array(),
		13 => array( '_sgs_form_upload' => 1, '_sgs_flow_upload_owner' => 'abc' ),
	);

	class WC_Order {}
	class WC_Order_Item_Product {
		public $meta = array();
		public function add_meta_data( $key, $value, $unique = false ) {
			$this->meta[] = array( $key, $value );
		}
	}
	class WP_Error {
		public $code;
		public function __construct( $code, $message = '' ) {
			$this->code = $code;
		}
	}
	function get_post( $id ) {
		return $GLOBALS['posts'][ $id ] ?? null;
	}
	function get_post_meta( $id, $key, $single ) {
		return $GLOBALS['meta'][ $id ][ $key ] ?? '';
	}
	function sanitize_text_field( $s ) {
		return trim( strip_tags( $s ) );
	}
	function absint( $n ) {
		return abs( (int) $n );
	}
	function __( $s ) {
		return $s;
	}

	require dirname( __DIR__, 2 ) . '/includes/flow-fields/functions.php';
	require dirname( __DIR__, 2 ) . '/includes/flow-fields/class-flow-fields-cart.php';

	$failures = 0;
	function check( bool $cond, string $label ) {
		global $failures;
		echo ( $cond ? 'PASS  ' : 'FAIL  ' ), $label, PHP_EOL;
		if ( ! $cond ) {
			++$failures;
		}
	}
	function code_of( $r ) {
		return $r instanceof WP_Error ? $r->code : 'ok';
	}

	$f = 'SGS\Blocks\sgs_flow_fields_sanitise';

	$ok = $f(
		array(
			array( 'label' => 'Your prescription', 'value' => 'Type it in' ),
			array( 'label' => 'Right SPH', 'value' => '-2.25' ),
			array( 'label' => 'Photo', 'file_id' => 10 ),
		),
		'abc'
	);
	check( is_array( $ok ) && 3 === count( $ok ), 'text answers and own file accepted' );
	check( is_array( $ok ) && 'Photo uploaded' === $ok[2]['value'] && 10 === $ok[2]['file_id'], 'a file shows as "Photo uploaded" and keeps its ID' );

	check( 'sgs_flow_file_not_yours' === code_of( $f( array( array( 'label' => 'Photo', 'file_id' => 11 ) ), 'abc' ) ), "another session's file is refused" );
	check( 'sgs_flow_file_not_yours' === code_of( $f( array( array( 'label' => 'Photo', 'file_id' => 12 ) ), 'abc' ) ), 'a media-library image (not an SGS upload) is refused' );
	check( 'sgs_flow_file_not_yours' === code_of( $f( array( array( 'label' => 'Photo', 'file_id' => 13 ) ), 'abc' ) ), 'a non-attachment ID is refused' );
	check( 'sgs_flow_file_not_yours' === code_of( $f( array( array( 'label' => 'Photo', 'file_id' => 10 ) ), '' ) ), 'no cart session: every file refused' );

	check( 'sgs_flow_fields_shape' === code_of( $f( 'nope', 'abc' ) ), 'a non-list is refused' );
	check( 'sgs_flow_fields_shape' === code_of( $f( array( array( 'value' => 'x' ) ), 'abc' ) ), 'an entry with no label is refused' );
	check( 'sgs_flow_fields_count' === code_of( $f( array_fill( 0, 17, array( 'label' => 'a', 'value' => 'b' ) ), 'abc' ) ), 'more than 16 entries is refused' );

	$long = $f( array( array( 'label' => str_repeat( 'L', 90 ), 'value' => str_repeat( 'V', 300 ) ) ), 'abc' );
	check( 60 === mb_strlen( $long[0]['label'] ) && 200 === mb_strlen( $long[0]['value'] ), 'label trimmed to 60, value to 200' );
	check( array() === $f( array( array( 'label' => 'Empty', 'value' => '  ' ) ), 'abc' ), 'an empty value is dropped, not stored' );
	check( 'x' === $f( array( array( 'label' => 'Tag', 'value' => '<b>x</b>' ) ), 'abc' )[0]['value'], 'markup is stripped from values' );

	// FR-43-27: a multi-answer question travels as ONE row, its picks joined in the order shown.
	$multi = $f( array( array( 'label' => 'Flavour', 'value' => 'Chocolate chip, Biscoff, Oreo' ) ), 'abc' );
	check( is_array( $multi ) && 1 === count( $multi ) && 'Flavour' === $multi[0]['label'] && 'Chocolate chip, Biscoff, Oreo' === $multi[0]['value'], 'a multi-answer value is one row with its joined labels intact' );

	// "Show in the bag line" off: the flag survives the clean-up and the order line still gets both answers.
	$bag = $f(
		array(
			array( 'label' => 'Flavour', 'value' => 'Oreo' ),
			array( 'label' => 'Your prescription', 'value' => 'Send it later', 'bag_line' => false ),
			array( 'label' => 'Gift note', 'value' => 'Hello', 'bag_line' => true ),
			array( 'label' => 'Wrapped', 'value' => 'Yes', 'bag_line' => 'false' ),
		),
		'abc'
	);
	check( ! isset( $bag[0]['bag_line'] ) && false === $bag[1]['bag_line'] && ! isset( $bag[2]['bag_line'] ) && false === $bag[3]['bag_line'], 'only an explicit off keeps a bag_line flag' );
	$line = new WC_Order_Item_Product();
	\SGS\Blocks\Flow_Fields_Cart::copy_to_order_line_item( $line, 'key', array( \SGS\Blocks\Flow_Fields_Cart::KEY => $bag ), new WC_Order() );
	check( array( 'Flavour', 'Your prescription', 'Gift note', 'Wrapped' ) === array_column( $line->meta, 0 ), 'the order line keeps every answer, hidden ones included' );
	$rows = \SGS\Blocks\Flow_Fields_Cart::get_item_data( array(), array( \SGS\Blocks\Flow_Fields_Cart::KEY => $bag ) );
	check( array( 'Flavour', 'Gift note' ) === array_column( $rows, 'name' ), 'the bag, cart and checkout rows leave out the hidden answers' );

	echo PHP_EOL, '==== ', ( 0 === $failures ? 'all passed' : "$failures failed" ), ' ====', PHP_EOL;
	exit( 0 === $failures ? 0 : 1 );
}
