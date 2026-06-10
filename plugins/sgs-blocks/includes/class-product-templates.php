<?php
/**
 * SGS Product Templates — CPT registration + REST route wiring for FR-27-R4.
 *
 * Registers the `sgs_product_template` CPT (REST-managed, not public) and the
 * four agency-template routes under sgs/v1:
 *
 *   POST /sgs/v1/product-templates              — snapshot a product into a template
 *   GET  /sgs/v1/product-templates/{id}/export  — export the envelope JSON
 *   POST /sgs/v1/product-templates/import       — create a template from an envelope
 *   POST /sgs/v1/product-templates/{id}/apply   — apply a template to a target product
 *
 * Security:
 *   All routes require `manage_woocommerce` (global shop-configuration level;
 *   these are agency operations, not operator operations). CSRF is enforced via
 *   the same X-WP-Nonce / wp_rest nonce used by R1/R2.
 *
 * Companion files (each required by this class, each owns its dependency graph):
 *   class-product-templates-cpt.php        — sgs_product_template CPT registration
 *   class-product-templates-envelope.php   — envelope constants + build + validate
 *   class-product-templates-validators.php — sanitise pass + pure string primitives
 *   class-product-templates-helpers.php    — snapshot + persist
 *   class-product-templates-apply.php      — R2 dispatch + presentation/term meta writes
 *   class-product-templates-handlers.php   — POST handler implementations
 *
 * @package SGS\Blocks
 * @since   1.8.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-product-authoring-security.php';
require_once __DIR__ . '/class-product-templates-cpt.php';
require_once __DIR__ . '/class-product-templates-envelope.php';
require_once __DIR__ . '/class-product-templates-helpers.php';
require_once __DIR__ . '/class-product-templates-handlers.php';

/**
 * Registers the sgs_product_template CPT and the four product-template routes.
 */
final class Product_Templates {

	/** REST namespace — matches every other SGS endpoint. */
	const REST_NAMESPACE = 'sgs/v1';

	/** CPT slug — canonical definition lives in Product_Templates_CPT. */
	const POST_TYPE = Product_Templates_CPT::POST_TYPE;

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'init', array( Product_Templates_CPT::class, 'register_post_type' ) );
		\add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	// ── Route registration ────────────────────────────────────────────────────

	/**
	 * Register all four product-template routes.
	 *
	 * @return void
	 */
	public static function register_routes(): void {
		// Create a template from an existing product.
		\register_rest_route(
			self::REST_NAMESPACE,
			'/product-templates',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'create_from_product' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => array(
					'product_id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'description'       => \__( 'Source variable product ID.', 'sgs-blocks' ),
					),
					'title'      => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'description'       => \__( 'Human-readable template name.', 'sgs-blocks' ),
					),
				),
			)
		);

		// Export a template envelope (GET — cookie-nonce verified in the handler).
		\register_rest_route(
			self::REST_NAMESPACE,
			'/product-templates/(?P<id>\d+)/export',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'export_template' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		// Import an envelope and create a new template post.
		\register_rest_route(
			self::REST_NAMESPACE,
			'/product-templates/import',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'import_template' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => array(
					'envelope' => array(
						'required'    => true,
						'type'        => 'object',
						'description' => \__( 'Portable template envelope object.', 'sgs-blocks' ),
					),
					'title'    => array(
						'required'          => false,
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
						'description'       => \__( 'Optional title override for the imported template.', 'sgs-blocks' ),
					),
				),
			)
		);

		// Apply a template to a target product.
		\register_rest_route(
			self::REST_NAMESPACE,
			'/product-templates/(?P<id>\d+)/apply',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'apply_template' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => array(
					'id'             => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
					'product_id'     => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'description'       => \__( 'Target variable product ID on this site.', 'sgs-blocks' ),
					),
					'confirm'        => array(
						'required'    => false,
						'type'        => 'boolean',
						'default'     => false,
						'description' => \__( 'false = dry-run summary only; true = perform the apply.', 'sgs-blocks' ),
					),
					'starting_price' => array(
						'required'          => false,
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
						'description'       => \__( 'Optional regular price (decimal string, e.g. "9.99") set on all new variations. If absent, variations are created priceless and PREFLIGHT will hold the product unpublished until prices are set.', 'sgs-blocks' ),
					),
				),
			)
		);
	}

	// ── Permission callback ───────────────────────────────────────────────────

	/**
	 * All template routes require manage_woocommerce (agency-level operation).
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return bool|\WP_Error
	 */
	public static function can_manage( \WP_REST_Request $request ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- WP REST permission_callback contract always passes $request.
		if ( ! \current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a registered WooCommerce capability.
			return new \WP_Error(
				'rest_forbidden',
				\__( 'You need the manage_woocommerce capability to manage product templates.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}
		return true;
	}

	// ── Nonce helper ─────────────────────────────────────────────────────────

	/**
	 * Verify the X-WP-Nonce / wp_rest CSRF token (same chain as R1/R2).
	 *
	 * Returns null on success, WP_Error on failure.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_Error|null
	 */
	private static function verify_nonce( \WP_REST_Request $request ) {
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( ! \wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new \WP_Error(
				'rest_cookie_invalid_nonce',
				\__( 'Security token invalid or expired. Reload the page and try again.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}
		return null;
	}

	// ── Route callbacks (thin dispatch to handlers) ───────────────────────────

	/**
	 * POST /sgs/v1/product-templates
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function create_from_product( \WP_REST_Request $request ) {
		return Product_Templates_Handlers::create_from_product( $request, self::verify_nonce( $request ) );
	}

	/**
	 * GET /sgs/v1/product-templates/{id}/export
	 *
	 * Verifies the same X-WP-Nonce / wp_rest cookie nonce as every other
	 * template route (R1/R2 pattern — see class-product-preflight.php GET route).
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function export_template( \WP_REST_Request $request ) {
		$nonce_error = self::verify_nonce( $request );
		if ( null !== $nonce_error ) {
			return $nonce_error;
		}

		$template_id = (int) $request['id'];
		$post        = \get_post( $template_id );

		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return new \WP_Error( 'sgs_template_not_found', \__( 'Template not found.', 'sgs-blocks' ), array( 'status' => 404 ) );
		}

		$envelope = \json_decode( $post->post_content, true );
		if ( ! is_array( $envelope ) ) {
			return new \WP_Error( 'sgs_template_corrupt', \__( 'Template envelope is corrupt or unreadable.', 'sgs-blocks' ), array( 'status' => 500 ) );
		}

		$response = new \WP_REST_Response( $envelope, 200 );
		// Download semantics for cookie-session consumers hitting the URL
		// directly (the handler requires the wp_rest nonce, so app-password /
		// Basic-auth curl cannot use this route); the admin UI fetches via JS
		// and names the Blob download itself.
		$response->header( 'Content-Disposition', 'attachment; filename="sgs-template-' . $template_id . '.json"' );
		return $response;
	}

	/**
	 * POST /sgs/v1/product-templates/import
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function import_template( \WP_REST_Request $request ) {
		return Product_Templates_Handlers::import_template( $request, self::verify_nonce( $request ) );
	}

	/**
	 * POST /sgs/v1/product-templates/{id}/apply
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function apply_template( \WP_REST_Request $request ) {
		return Product_Templates_Handlers::apply_template( $request, self::verify_nonce( $request ), self::POST_TYPE );
	}
}
