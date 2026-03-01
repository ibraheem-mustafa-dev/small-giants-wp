<?php
/**
 * Test the SGS Forms REST API endpoints.
 *
 * Covers:
 * - Valid submission → 200 success.
 * - Honeypot filled → 200 fake success (silently discarded).
 * - Rate limiting → 429 after threshold is exceeded.
 * - Missing / invalid nonce → 403 forbidden.
 * - Field validation (form data size, invalid field type).
 *
 * @package SGS\Blocks\Tests
 */

/**
 * Class Test_Form_Submission
 */
class Test_Form_Submission extends WP_UnitTestCase {

	/**
	 * REST server instance.
	 *
	 * @var WP_REST_Server
	 */
	private WP_REST_Server $server;

	/**
	 * The route namespace + base.
	 *
	 * @var string
	 */
	private const ROUTE = '/sgs-forms/v1/submit';

	/**
	 * A valid form ID used across multiple tests.
	 *
	 * @var string
	 */
	private const FORM_ID = 'test-contact-form';

	/**
	 * Boot the REST server and seed a form config transient.
	 */
	public function setUp(): void {
		parent::setUp();

		// Bring up the REST server.
		global $wp_rest_server;
		$wp_rest_server = new WP_REST_Server();
		$this->server   = $wp_rest_server;
		do_action( 'rest_api_init', $this->server );

		// Seed form configuration (normally set by render.php on page render).
		set_transient(
			'sgs_form_config_' . sanitize_key( self::FORM_ID ),
			[
				'requireLogin' => false,
				'rateLimit'    => 3, // Low threshold makes rate-limit test fast.
			],
			DAY_IN_SECONDS
		);

		// Ensure a clean rate-limit slate for each test.
		$this->flush_rate_limit_transients();
	}

	/**
	 * Tear down after each test.
	 */
	public function tearDown(): void {
		global $wp_rest_server;
		$wp_rest_server = null;

		$this->flush_rate_limit_transients();

		parent::tearDown();
	}

	// ─── Helpers ─────────────────────────────────────────────────────────────

	/**
	 * Build a WP_REST_Request for the submit endpoint.
	 *
	 * @param array $body      Request body parameters.
	 * @param bool  $with_nonce Whether to attach a valid wp_rest nonce header.
	 * @return WP_REST_Request
	 */
	private function make_submit_request( array $body, bool $with_nonce = true ): WP_REST_Request {
		$request = new WP_REST_Request( 'POST', self::ROUTE );
		$request->set_header( 'Content-Type', 'application/json' );

		if ( $with_nonce ) {
			$request->set_header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );
		}

		$request->set_body( wp_json_encode( $body ) );
		$request->set_body_params( $body );

		return $request;
	}

	/**
	 * Dispatch a WP_REST_Request and return the response.
	 *
	 * @param WP_REST_Request $request REST request.
	 * @return WP_REST_Response
	 */
	private function dispatch( WP_REST_Request $request ): WP_REST_Response {
		return $this->server->dispatch( $request );
	}

	/**
	 * Delete all rate-limit transients for the test form ID and the test IP.
	 * REMOTE_ADDR falls back to '0.0.0.0' in tests (no real HTTP request).
	 */
	private function flush_rate_limit_transients(): void {
		$ip  = '0.0.0.0';
		$key = 'sgs_form_rate_' . md5( $ip . self::FORM_ID );
		delete_transient( $key );
	}

	// ─── Tests ───────────────────────────────────────────────────────────────

	/**
	 * A well-formed submission with a valid nonce returns HTTP 200.
	 */
	public function test_valid_submission_returns_200(): void {
		$request = $this->make_submit_request(
			[
				'formId'  => self::FORM_ID,
				'fields'  => [ 'name' => 'Alice', 'email' => 'alice@example.com' ],
				'honeypot' => '',
			]
		);

		$response = $this->dispatch( $request );

		$this->assertSame(
			200,
			$response->get_status(),
			'Valid submission must return HTTP 200.'
		);

		$data = $response->get_data();
		$this->assertTrue( $data['success'] ?? false, 'Response data must include success:true.' );
	}

	/**
	 * When the honeypot field is populated the endpoint must still return 200
	 * (fake success), but the submission must NOT be stored.
	 *
	 * The fake-success behaviour ensures bots cannot detect the trap.
	 */
	public function test_honeypot_filled_returns_fake_200(): void {
		$request = $this->make_submit_request(
			[
				'formId'   => self::FORM_ID,
				'fields'   => [ 'name' => 'Bot', 'email' => 'bot@spam.com' ],
				'honeypot' => 'I am a robot', // Non-empty → bot detected.
			]
		);

		$response = $this->dispatch( $request );

		$this->assertSame(
			200,
			$response->get_status(),
			'Honeypot-filled submission must return HTTP 200 (fake success).'
		);

		$data = $response->get_data();
		$this->assertTrue(
			$data['success'] ?? false,
			'Fake-success response must still carry success:true.'
		);

		// The fake success response must NOT contain a submissionId because
		// nothing was persisted.
		$this->assertArrayNotHasKey(
			'submissionId',
			$data,
			'Honeypot submissions must not return a submissionId.'
		);
	}

	/**
	 * After the configured rate-limit threshold is reached, subsequent
	 * submissions from the same IP must receive HTTP 429.
	 */
	public function test_rate_limit_returns_429(): void {
		// The test form config has rateLimit = 3.
		// Submit 3 times successfully, then the 4th must fail.
		for ( $i = 0; $i < 3; $i++ ) {
			$request  = $this->make_submit_request(
				[
					'formId'   => self::FORM_ID,
					'fields'   => [ 'name' => "Submission {$i}" ],
					'honeypot' => '',
				]
			);
			$response = $this->dispatch( $request );

			// All three should succeed (status 200).
			$this->assertSame(
				200,
				$response->get_status(),
				"Submission #{$i} should succeed before rate limit is hit."
			);
		}

		// 4th submission — must be rejected.
		$request  = $this->make_submit_request(
			[
				'formId'   => self::FORM_ID,
				'fields'   => [ 'name' => 'Over the limit' ],
				'honeypot' => '',
			]
		);
		$response = $this->dispatch( $request );

		$this->assertSame(
			429,
			$response->get_status(),
			'Submission exceeding the rate limit must return HTTP 429.'
		);
	}

	/**
	 * A request without an X-WP-Nonce header must be rejected with HTTP 403.
	 */
	public function test_missing_nonce_returns_403(): void {
		$request = $this->make_submit_request(
			[
				'formId'   => self::FORM_ID,
				'fields'   => [ 'name' => 'No nonce' ],
				'honeypot' => '',
			],
			false  // no_nonce = do NOT attach nonce header.
		);

		$response = $this->dispatch( $request );

		$this->assertSame(
			403,
			$response->get_status(),
			'Request without a valid nonce must return HTTP 403.'
		);
	}

	/**
	 * A request with an obviously invalid nonce value must return 403.
	 */
	public function test_invalid_nonce_returns_403(): void {
		$request = $this->make_submit_request(
			[
				'formId'   => self::FORM_ID,
				'fields'   => [ 'name' => 'Bad nonce' ],
				'honeypot' => '',
			],
			false
		);
		$request->set_header( 'X-WP-Nonce', 'this-is-not-a-valid-nonce' );

		$response = $this->dispatch( $request );

		$this->assertSame(
			403,
			$response->get_status(),
			'Request with an invalid nonce must return HTTP 403.'
		);
	}

	/**
	 * Submitting a fields object larger than the 65 536-byte limit must fail
	 * with a WP_Error (the REST API translates this to a 400 response).
	 */
	public function test_oversized_fields_payload_rejected(): void {
		// Create a fields array whose JSON encoding exceeds 65 536 bytes.
		$huge_fields = [];
		for ( $i = 0; $i < 100; $i++ ) {
			$huge_fields[ "field_{$i}" ] = str_repeat( 'X', 700 );
		}

		$request = $this->make_submit_request(
			[
				'formId'   => self::FORM_ID,
				'fields'   => $huge_fields,
				'honeypot' => '',
			]
		);

		$response = $this->dispatch( $request );

		// Expect a non-200 status — the validator returns a WP_Error which
		// WordPress wraps in a 400 Bad Request response.
		$this->assertNotSame(
			200,
			$response->get_status(),
			'An oversized fields payload must be rejected.'
		);
	}

	/**
	 * The submit endpoint must be registered under the expected route.
	 */
	public function test_submit_route_is_registered(): void {
		$routes = $this->server->get_routes();

		$this->assertArrayHasKey(
			'/sgs-forms/v1/submit',
			$routes,
			'The /sgs-forms/v1/submit route must be registered.'
		);
	}

	/**
	 * The upload endpoint must also be registered.
	 */
	public function test_upload_route_is_registered(): void {
		$routes = $this->server->get_routes();

		$this->assertArrayHasKey(
			'/sgs-forms/v1/upload',
			$routes,
			'The /sgs-forms/v1/upload route must be registered.'
		);
	}

	/**
	 * Admin-only submissions listing route must be registered.
	 */
	public function test_submissions_admin_route_is_registered(): void {
		$routes = $this->server->get_routes();

		$this->assertArrayHasKey(
			'/sgs-forms/v1/submissions',
			$routes,
			'The /sgs-forms/v1/submissions admin route must be registered.'
		);
	}

	/**
	 * Non-admin access to submissions listing must return 403.
	 */
	public function test_submissions_listing_requires_admin(): void {
		// Create a subscriber-level user and set as current user.
		$user_id = $this->factory->user->create( [ 'role' => 'subscriber' ] );
		wp_set_current_user( $user_id );

		$request = new WP_REST_Request( 'GET', '/sgs-forms/v1/submissions' );
		$request->set_header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );

		$response = $this->dispatch( $request );

		$this->assertSame(
			403,
			$response->get_status(),
			'Non-admin users must not be able to list submissions.'
		);
	}
}
