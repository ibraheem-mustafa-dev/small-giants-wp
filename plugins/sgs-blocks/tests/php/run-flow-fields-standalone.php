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

	echo PHP_EOL, '==== ', ( 0 === $failures ? 'all passed' : "$failures failed" ), ' ====', PHP_EOL;
	exit( 0 === $failures ? 0 : 1 );
}
