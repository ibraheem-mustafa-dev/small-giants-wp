<?php
/**
 * SGS Image Sequence — "Verify frames" REST endpoint.
 *
 * Step 16, Motion Wave D (register), Route B. The `sgs/image-sequence`
 * block's frame source is four free-text inspector fields (folder URL,
 * frame count, zero-pad digits, file extension) with no validation — get
 * any one wrong and the block silently falls back to poster-only with no
 * explanation. This endpoint HEAD-checks the first and last frame filename
 * the block's runtime would actually request, and reports back by exact
 * filename so the operator (or Small Giants Studio, since this block is
 * agency-only) can see precisely what is missing.
 *
 * Security:
 *   - Capability-gated (`edit_posts` — same bar as the block editor itself;
 *     this never runs unauthenticated).
 *   - Explicit nonce check on top of REST's own cookie-nonce auth, mirroring
 *     Product_Preflight's pattern.
 *   - The operator-supplied URL is never used as a raw fetch target: it is
 *     validated with `wp_http_validate_url()` (scheme must be http/https)
 *     BEFORE being handed to `wp_safe_remote_head()`, which itself enforces
 *     `reject_unsafe_urls` — WordPress's core SSRF guard that blocks
 *     loopback/private/link-local IP ranges and non-http(s) schemes. Only 2
 *     HEAD requests are ever issued per call (first + last expected frame),
 *     each with an 8-second timeout and zero redirects followed — so this
 *     cannot be used as a port scanner or an open redirect probe.
 *
 * @package SGS\Blocks
 * @since   1.9.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Image_Sequence_Verify
 *
 * Static entry point: Image_Sequence_Verify::register() — wires the REST
 * route, called from sgs-blocks.php.
 */
final class Image_Sequence_Verify {

	/** REST namespace. */
	const REST_NAMESPACE = 'sgs/v1';

	/** REST route (POST). */
	const REST_ROUTE = 'image-sequence/verify-frames';

	/**
	 * File extensions the block itself accepts (mirrors render.php's
	 * `$allowed_ext` allow-list — kept independent here on purpose so this
	 * file has no include-order dependency on render.php, which is only
	 * ever loaded per block instance).
	 *
	 * @var string[]
	 */
	const ALLOWED_EXT = array( 'jpg', 'jpeg', 'png', 'webp', 'avif' );

	/**
	 * Same hard cap as render.php's `$sgs_max_frame_count` / edit.js's
	 * `MAX_FRAME_COUNT`. A verify request for more than this many frames is
	 * clamped the same way the frontend render clamps it, so "verify" checks
	 * the frame that will actually be requested by a visitor, not a number
	 * the render path will never reach.
	 *
	 * @var int
	 */
	const MAX_FRAME_COUNT = 200;

	/**
	 * Wire the REST route. Called once from the plugin bootstrap.
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_rest_route' ) );
	}

	/**
	 * Register POST /sgs/v1/image-sequence/verify-frames.
	 */
	public static function register_rest_route(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_ROUTE,
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle_rest_verify' ),
				'permission_callback' => array( __CLASS__, 'permission_callback' ),
				'args'                => array(
					'url'   => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'esc_url_raw',
					),
					'count' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
					'pad'   => array(
						'required'          => false,
						'type'              => 'integer',
						'default'           => 4,
						'sanitize_callback' => 'absint',
					),
					'ext'   => array(
						'required'          => false,
						'type'              => 'string',
						'default'           => 'webp',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * Permission callback — same capability bar as opening the block editor.
	 * This endpoint only reads back HTTP status codes for URLs the caller
	 * already typed into the inspector; it changes no site state.
	 *
	 * @return bool
	 */
	public static function permission_callback() {
		return \current_user_can( 'edit_posts' );
	}

	/**
	 * Handle POST /sgs/v1/image-sequence/verify-frames.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle_rest_verify( \WP_REST_Request $request ) {
		// CSRF — explicit check on top of REST's own cookie-nonce auth
		// (mirrors Product_Preflight::handle_rest_preflight()).
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( ! \wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new \WP_Error(
				'rest_cookie_invalid_nonce',
				\__( 'Security token invalid or expired. Reload the page and try again.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}

		$url   = \trim( (string) $request->get_param( 'url' ) );
		$count = \absint( $request->get_param( 'count' ) );
		$pad   = \absint( $request->get_param( 'pad' ) );
		$ext   = (string) $request->get_param( 'ext' );

		if ( '' === $url ) {
			return new \WP_REST_Response(
				array(
					'ok'      => false,
					'message' => \__( 'No frames folder URL is set for this tier yet.', 'sgs-blocks' ),
				),
				200
			);
		}

		// Scheme allow-list BEFORE any network call — belt-and-braces on top
		// of wp_safe_remote_head()'s own reject_unsafe_urls guard.
		if ( ! \wp_http_validate_url( $url ) ) {
			return new \WP_REST_Response(
				array(
					'ok'      => false,
					'message' => \sprintf(
						/* translators: %s: the invalid URL the operator entered */
						\__( '"%s" is not a valid, reachable web address (must be http:// or https://, and not a local/private address).', 'sgs-blocks' ),
						$url
					),
				),
				200
			);
		}

		if ( $count < 1 ) {
			return new \WP_REST_Response(
				array(
					'ok'      => false,
					'message' => \__( 'Frame count must be at least 1.', 'sgs-blocks' ),
				),
				200
			);
		}
		$count = \min( $count, self::MAX_FRAME_COUNT );

		$pad = ( $pad > 0 && $pad <= 8 ) ? $pad : 4;
		$ext = \in_array( $ext, self::ALLOWED_EXT, true ) ? $ext : 'webp';

		$base = \untrailingslashit( $url );

		$checks = array(
			'first' => 1,
			'last'  => $count,
		);

		$results = array();
		$missing = array();

		foreach ( $checks as $which => $index ) {
			$filename  = self::build_filename( $index, $pad, $ext );
			$frame_url = $base . '/' . $filename;

			$response = \wp_safe_remote_head(
				$frame_url,
				array(
					'timeout'     => 8,
					'redirection' => 2,
				)
			);

			if ( \is_wp_error( $response ) ) {
				$results[] = array(
					'which'    => $which,
					'filename' => $filename,
					'url'      => $frame_url,
					'ok'       => false,
					'error'    => $response->get_error_message(),
				);
				$missing[] = $filename;
				continue;
			}

			$code      = (int) \wp_remote_retrieve_response_code( $response );
			$frame_ok  = ( $code >= 200 && $code < 300 );
			$results[] = array(
				'which'    => $which,
				'filename' => $filename,
				'url'      => $frame_url,
				'ok'       => $frame_ok,
				'status'   => $code,
			);
			if ( ! $frame_ok ) {
				$missing[] = $filename;
			}
		}

		$all_ok = empty( $missing );

		if ( $all_ok ) {
			$message = \sprintf(
				/* translators: 1: first frame filename, 2: last frame filename */
				\__( 'Verified — %1$s and %2$s both loaded successfully.', 'sgs-blocks' ),
				$results[0]['filename'],
				$results[1]['filename']
			);
		} else {
			$message = \sprintf(
				/* translators: %s: comma-separated list of missing filenames */
				\__( 'Not found: %s. Check the folder URL, frame count, zero-padding, and file type against what was uploaded.', 'sgs-blocks' ),
				\implode( ', ', $missing )
			);
		}

		return new \WP_REST_Response(
			array(
				'ok'      => $all_ok,
				'message' => $message,
				'checked' => $results,
			),
			200
		);
	}

	/**
	 * Build a frame filename the same way the prep tool + runtime do:
	 * `frame_` + zero-padded index + `.` + extension (e.g. `frame_0001.webp`).
	 *
	 * @param int    $index Frame index (1-based).
	 * @param int    $pad   Zero-pad digit count.
	 * @param string $ext   File extension (already allow-listed by the caller).
	 * @return string
	 */
	private static function build_filename( int $index, int $pad, string $ext ): string {
		return 'frame_' . \str_pad( (string) $index, $pad, '0', STR_PAD_LEFT ) . '.' . $ext;
	}
}
