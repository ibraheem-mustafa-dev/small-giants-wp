<?php
/**
 * Standalone test: SGS\Blocks\Forms\Choice_Flow_Submit::handle() (Spec 43 FR-43-4).
 *
 * Run: php tests/php/run-choice-flow-submit-standalone.php
 * Exit 0 all pass, 1 any failure.
 */

namespace SGS\Blocks {
	class Sgs_Block_CPTs {
		/** @return \WP_Post|null */
		public static function resolve_choice_flow( string $slug ) {
			return $GLOBALS['flow_posts'][ $slug ] ?? null;
		}
	}
}

namespace SGS\Blocks\Forms {
	/** Test double — real class lives in class-form-rest-submission.php. */
	class Form_REST_Submission {
		public static function check_rate_limit( string $key, int $max = 5 ) {
			$count = ( $GLOBALS['rate_counts'][ $key ] ?? 0 ) + 1;
			$GLOBALS['rate_counts'][ $key ] = $count;
			if ( $count > $max ) {
				return new \WP_Error( 'rate_limit_exceeded', 'Too many submissions. Please try again later.', array( 'status' => 429 ) );
			}
			return true;
		}
	}

	/** Test double — real class lives in class-form-processor.php. */
	class Form_Processor {
		public static function process( string $form_id, array $fields, array $file_ids = array(), bool $store = true ) {
			$GLOBALS['processed'][] = array(
				'form_id' => $form_id,
				'fields'  => $fields,
			);
			return array(
				'success'       => true,
				'submission_id' => count( $GLOBALS['processed'] ),
			);
		}
	}

	/** Referenced only as a ::class string inside register_route(), never called here. */
	class Form_REST_API {
		public static function verify_form_nonce() {
			return true;
		}
	}
}

namespace {

	define( 'ABSPATH', __DIR__ . '/' );

	class WP_Post {
		public $post_status = 'publish';
		public $post_content = '';
	}

	class WP_Error {
		public $code;
		public $message;
		public $data;
		public function __construct( $code, $message = '', $data = null ) {
			$this->code    = $code;
			$this->message = $message;
			$this->data    = $data;
		}
	}

	class WP_REST_Response {
		public $data;
		public $status;
		public function __construct( $data, $status = 200 ) {
			$this->data   = $data;
			$this->status = $status;
		}
	}

	class WP_REST_Request {
		private array $params;
		public function __construct( array $params = array() ) {
			$this->params = $params;
		}
		public function get_param( $key ) {
			return $this->params[ $key ] ?? null;
		}
	}

	function is_wp_error( $thing ) {
		return $thing instanceof WP_Error;
	}
	function sanitize_text_field( $s ) {
		return trim( strip_tags( (string) $s ) );
	}
	function sanitize_key( $s ) {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $s ) );
	}
	function absint( $n ) {
		return abs( (int) $n );
	}
	function is_email( $s ) {
		return false !== filter_var( (string) $s, FILTER_VALIDATE_EMAIL );
	}
	function __( $s ) {
		return $s;
	}
	function get_post( $id ) {
		return $GLOBALS['pages'][ $id ] ?? null;
	}
	function parse_blocks( $content ) {
		// Test fixtures store their block tree as JSON, not real block comments —
		// keeps the fixture readable and avoids needing a real block parser here.
		$decoded = json_decode( $content, true );
		return is_array( $decoded ) ? $decoded : array();
	}

	require dirname( __DIR__, 2 ) . '/includes/forms/class-choice-flow-submit.php';

	$failures = 0;
	function check( bool $cond, string $label ) {
		global $failures;
		echo ( $cond ? 'PASS  ' : 'FAIL  ' ), $label, PHP_EOL;
		if ( ! $cond ) {
			++$failures;
		}
	}
	function status_of( $r ) {
		if ( $r instanceof WP_Error ) {
			return $r->data['status'] ?? null;
		}
		if ( $r instanceof WP_REST_Response ) {
			return $r->status;
		}
		return null;
	}

	/** Build a `sgs/choice-flow` block tree as the JSON `parse_blocks()` fixture above decodes. */
	function flow_tree( array $result_attrs ): string {
		return wp_json_encode(
			array(
				array(
					'blockName'   => 'sgs/choice-flow',
					'attrs'       => array(),
					'innerBlocks' => array(
						array(
							'blockName'   => 'sgs/form-step',
							'attrs'       => array(),
							'innerBlocks' => array(
								array(
									'blockName'   => 'sgs/choice-flow-result',
									'attrs'       => $result_attrs,
									'innerBlocks' => array(),
								),
							),
						),
					),
				),
			)
		);
	}
	// json_encode is native PHP; wp_json_encode isn't stubbed above deliberately —
	// define it here so flow_tree() reads like production code.
	function wp_json_encode( $data ) {
		return json_encode( $data );
	}

	$GLOBALS['flow_posts'] = array();
	$GLOBALS['pages']      = array();
	$GLOBALS['rate_counts'] = array();
	$GLOBALS['processed']  = array();

	$test_flow = new WP_Post();
	$test_flow->post_content = flow_tree( array( 'action' => 'email', 'rateLimit' => 5 ) );
	$GLOBALS['flow_posts']['test-flow'] = $test_flow;

	$rate_flow = new WP_Post();
	$rate_flow->post_content = flow_tree( array( 'action' => 'email', 'rateLimit' => 5 ) );
	$GLOBALS['flow_posts']['rate-test-flow'] = $rate_flow;

	$handle = array( 'SGS\Blocks\Forms\Choice_Flow_Submit', 'handle' );

	// ---- invalid email -> 400 ------------------------------------------------
	$r = call_user_func(
		$handle,
		new WP_REST_Request(
			array(
				'flowRef' => 'test-flow',
				'email'   => 'not-an-email',
				'answers' => array(),
				'tags'    => array(),
				'sgs_hp'  => '',
			)
		)
	);
	check( is_wp_error( $r ) && 400 === status_of( $r ), 'invalid email is refused with 400' );
	check( 0 === count( $GLOBALS['processed'] ), 'invalid email stores nothing' );

	// ---- honeypot filled -> fake 200 success, nothing stored -----------------
	$r = call_user_func(
		$handle,
		new WP_REST_Request(
			array(
				'flowRef' => 'test-flow',
				'email'   => 'shopper@example.com',
				'answers' => array(),
				'tags'    => array(),
				'sgs_hp'  => 'i-am-a-bot',
			)
		)
	);
	check( $r instanceof WP_REST_Response && 200 === $r->status && true === ( $r->data['success'] ?? false ), 'a filled honeypot returns a fake 200 success' );
	check( 0 === count( $GLOBALS['processed'] ), 'a filled honeypot stores nothing' );

	// ---- unknown flowRef -> 404 ----------------------------------------------
	$r = call_user_func(
		$handle,
		new WP_REST_Request(
			array(
				'flowRef' => 'no-such-flow',
				'email'   => 'shopper@example.com',
				'answers' => array(),
				'tags'    => array(),
				'sgs_hp'  => '',
			)
		)
	);
	check( is_wp_error( $r ) && 404 === status_of( $r ), 'an unknown flowRef is refused with 404' );

	// ---- answers over the limit are truncated, not rejected -------------------
	$many_answers = array();
	for ( $i = 0; $i < 20; $i++ ) {
		$many_answers[] = array( 'label' => "Question $i", 'value' => "Answer $i" );
	}
	$r = call_user_func(
		$handle,
		new WP_REST_Request(
			array(
				'flowRef' => 'test-flow',
				'email'   => 'shopper@example.com',
				'answers' => $many_answers,
				'tags'    => array( 'lens-type', 'INVALID TAG!!' ),
				'sgs_hp'  => '',
			)
		)
	);
	check( $r instanceof WP_REST_Response && 200 === $r->status, '20 answers still succeeds (truncated, not rejected)' );
	$stored = end( $GLOBALS['processed'] );
	check( 16 === count( $stored['fields']['answers'] ), 'answers over the 16 limit are truncated to 16' );
	check( in_array( 'lens-type', $stored['fields']['tags'], true ), 'a valid tag survives sanitize_key' );
	check( ! in_array( 'INVALID TAG!!', $stored['fields']['tags'], true ), 'an invalid tag is reduced by sanitize_key, not passed through raw' );

	$long = array( array( 'label' => str_repeat( 'L', 90 ), 'value' => str_repeat( 'V', 300 ) ) );
	$r    = call_user_func(
		$handle,
		new WP_REST_Request(
			array(
				'flowRef' => 'test-flow',
				'email'   => 'shopper2@example.com',
				'answers' => $long,
				'tags'    => array(),
				'sgs_hp'  => '',
			)
		)
	);
	$stored = end( $GLOBALS['processed'] );
	$line   = $stored['fields']['answers'][0];
	check( 0 === strpos( $line, str_repeat( 'L', 60 ) ), 'an over-length label is trimmed to 60 chars' );
	check( false === strpos( $line, str_repeat( 'V', 300 ) ) && strpos( $line, str_repeat( 'V', 200 ) ) > 0, 'an over-length value is trimmed to 200 chars' );

	// ---- rate limit: max 5, 5th allowed, 6th refused with 429 -----------------
	// Uses its own flow slug so the truncation/email tests above (which also
	// reach check_rate_limit against 'test-flow') cannot pollute this count.
	$rate_body = static function () {
		return array(
			'flowRef' => 'rate-test-flow',
			'email'   => 'rate-tester@example.com',
			'answers' => array(),
			'tags'    => array(),
			'sgs_hp'  => '',
		);
	};
	$last = null;
	for ( $i = 1; $i <= 5; $i++ ) {
		$last = call_user_func( $handle, new WP_REST_Request( $rate_body() ) );
	}
	check( $last instanceof WP_REST_Response && 200 === $last->status, 'the 5th submission for this flow is allowed (negative control)' );
	$sixth = call_user_func( $handle, new WP_REST_Request( $rate_body() ) );
	check( is_wp_error( $sixth ) && 429 === status_of( $sixth ), 'the 6th submission for this flow is refused with 429' );

	echo PHP_EOL, '==== ', ( 0 === $failures ? 'all passed' : "$failures failed" ), ' ====', PHP_EOL;
	exit( 0 === $failures ? 0 : 1 );
}
