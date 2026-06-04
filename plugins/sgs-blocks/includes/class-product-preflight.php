<?php
/**
 * SGS Product Preflight — go-live gate + weekly health cron (FR-27-PREFLIGHT / SEC-5).
 *
 * Prevents a misconfigured variable product from ever reaching publish status by
 * hooking `transition_post_status`. Also exposes a REST read endpoint so the
 * authoring UI or an agent can pre-check readiness before attempting to publish.
 *
 * APPLIES ONLY to variable WooCommerce products. Simple products, pages, and every
 * other post type are completely unaffected.
 *
 * Issue codes returned by evaluate():
 *   wc_version_too_old   — WooCommerce < 9.8 (hard block)
 *   zero_price           — at least one variation has price ≤ 0 (hard block)
 *   no_image             — at least one variation has no image (hard block)
 *   draft                — product is not published at check time (hard block)
 *   manifest_over_cap    — seeded manifest subset exceeds the 24 KB context cap (hard block)
 *   no_variesby          — no variation axis maps to a Google variesBy enum (hard block)
 *   invalid_jsonld       — Product_Schema emits an empty/invalid ProductGroup (hard block)
 *
 * @package SGS\Blocks
 * @since   1.8.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-product-manifest.php';
require_once __DIR__ . '/class-product-schema.php';
require_once __DIR__ . '/class-configurator-meta.php';
require_once __DIR__ . '/class-sgs-configurator-compat.php';
require_once __DIR__ . '/class-product-authoring-security.php';

/**
 * Class Product_Preflight
 *
 * Static entry points:
 *   Product_Preflight::register()            — wire all WP hooks (called from sgs-blocks.php)
 *   Product_Preflight::evaluate( $id )       — run the full preflight check; returns issue array
 */
final class Product_Preflight {

	/** REST namespace. */
	const REST_NAMESPACE = 'sgs/v1';

	/** REST route (GET). */
	const REST_ROUTE_PREFLIGHT = 'products/(?P<id>\d+)/preflight';

	/** Cron hook name. */
	const CRON_HOOK = 'sgs_preflight_health_check';

	/**
	 * Manifest byte cap (mirrors the product-card render.php 24 KB seed cap, M-C9).
	 * The seeded subset omits server-only fields; we measure the lean subset here.
	 *
	 * @var int
	 */
	const MANIFEST_CAP_BYTES = 24576;

	/**
	 * Maximum number of variable products evaluated per health-cron run.
	 * Keeps the batch cheap on large catalogues.
	 *
	 * @var int
	 */
	const CRON_PRODUCT_BATCH = 50;

	/**
	 * Transient key that records whether the health cron found any degraded products.
	 *
	 * @var string
	 */
	const HEALTH_TRANSIENT = 'sgs_preflight_health_degraded';

	/**
	 * Wire WordPress hooks. Called once from the plugin bootstrap.
	 */
	public static function register(): void {
		// Publish gate — fires whenever a product transitions into 'publish'.
		\add_action( 'transition_post_status', array( __CLASS__, 'on_transition_post_status' ), 10, 3 );

		// REST read endpoint — lets the authoring UI / agent pre-check readiness.
		\add_action( 'rest_api_init', array( __CLASS__, 'register_rest_route' ) );

		// Weekly health cron — schedule once, keep checking.
		if ( ! \wp_next_scheduled( self::CRON_HOOK ) ) {
			\wp_schedule_event( \time(), 'weekly', self::CRON_HOOK );
		}
		\add_action( self::CRON_HOOK, array( __CLASS__, 'run_health_cron' ) );

		// Surface cron findings as a dismissible admin notice.
		\add_action( 'admin_notices', array( __CLASS__, 'maybe_show_health_notice' ) );

		// Note: clearing the scheduled event on plugin deactivation requires a
		// register_deactivation_hook call in sgs-blocks.php (see wiring note below).
	}

	// ── Publish gate ─────────────────────────────────────────────────────────────

	/**
	 * Hook: transition_post_status.
	 *
	 * Runs when ANY post transitions status. We gate on:
	 *   - new status  === 'publish'
	 *   - post type   === 'product'
	 *   - product type === 'variable'
	 *
	 * If evaluate() finds blockers the post is immediately reverted to 'draft' and
	 * an admin notice queues the issues. A static re-entrancy flag prevents the
	 * revert itself from triggering the hook again.
	 *
	 * @param string   $new_status Incoming status.
	 * @param string   $old_status Previous status.
	 * @param \WP_Post $post       The post object.
	 */
	public static function on_transition_post_status( string $new_status, string $old_status, \WP_Post $post ): void {
		// Only care about products moving INTO publish.
		if ( 'publish' !== $new_status || 'product' !== $post->post_type ) {
			return;
		}

		// Re-entrancy guard — the wp_update_post() revert fires this hook again.
		static $reverting = false;
		if ( $reverting ) {
			return;
		}

		// Only variable products go through preflight.
		if ( ! \function_exists( 'wc_get_product' ) ) {
			return;
		}
		$product = \wc_get_product( $post->ID );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return;
		}

		// Run the check. Pass 'publish' as the intended status so `draft` code is not
		// triggered (the product IS transitioning to publish here, so we skip that check).
		$result = self::evaluate( $post->ID, /* skip_draft_check */ true );

		if ( $result['ready'] ) {
			return; // All good — let the publish proceed.
		}

		// Revert to draft.
		$reverting = true;
		\remove_action( 'transition_post_status', array( __CLASS__, 'on_transition_post_status' ), 10 );

		\wp_update_post(
			array(
				'ID'          => $post->ID,
				'post_status' => 'draft',
			)
		);

		\add_action( 'transition_post_status', array( __CLASS__, 'on_transition_post_status' ), 10, 3 );
		$reverting = false;

		// Persist the issues so the admin notice can read them.
		\update_post_meta( $post->ID, '_sgs_preflight_issues', $result['issues'] );

		// Queue a dismissible admin notice for this request.
		self::queue_publish_blocked_notice( $post->ID, $result['issues'] );
	}

	/**
	 * Queue a dismissible admin notice listing every blocking issue.
	 *
	 * @param int   $product_id Product ID.
	 * @param array $issues     Array of issue entries from evaluate().
	 */
	private static function queue_publish_blocked_notice( int $product_id, array $issues ): void {
		$product_title = \get_the_title( $product_id );
		$messages      = array();
		foreach ( $issues as $issue ) {
			$messages[] = (string) $issue['message'];
		}

		\add_action(
			'admin_notices',
			static function () use ( $product_title, $messages ) {
				echo '<div class="notice notice-error is-dismissible"><p>';
				printf(
					/* translators: %s: product name */
					\esc_html__( '"%s" could not be published — the following issues must be resolved:', 'sgs-blocks' ),
					\esc_html( $product_title )
				);
				echo '</p><ul>';
				foreach ( $messages as $msg ) {
					echo '<li>' . \esc_html( $msg ) . '</li>';
				}
				echo '</ul></div>';
			}
		);
	}

	// ── REST endpoint ─────────────────────────────────────────────────────────────

	/**
	 * Register GET /sgs/v1/products/{id}/preflight.
	 *
	 * Permission: per-object edit_post (IDOR-safe, mirrors Product_Authoring_Security::can_edit_product).
	 */
	public static function register_rest_route(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_ROUTE_PREFLIGHT,
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'handle_rest_preflight' ),
				'permission_callback' => array( __CLASS__, 'permission_callback' ),
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'description'       => \__( 'WooCommerce variable product ID.', 'sgs-blocks' ),
					),
				),
			)
		);
	}

	/**
	 * Permission callback: user must be able to edit the specific product (IDOR-safe).
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return bool|\WP_Error
	 */
	public static function permission_callback( \WP_REST_Request $request ) {
		return Product_Authoring_Security::can_edit_product( $request );
	}

	/**
	 * Handle GET /sgs/v1/products/{id}/preflight.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle_rest_preflight( \WP_REST_Request $request ) {
		// CSRF.
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( ! \wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new \WP_Error(
				'rest_cookie_invalid_nonce',
				\__( 'Security token invalid or expired. Reload the page and try again.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}

		$product_id = \absint( $request->get_param( 'id' ) );

		if ( 'product' !== \get_post_type( $product_id ) ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Invalid product ID.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		$result = self::evaluate( $product_id );

		return new \WP_REST_Response( $result, 200 );
	}

	// ── evaluate() — the core preflight check ────────────────────────────────────

	/**
	 * Run the full preflight check for a variable product.
	 *
	 * Safe to call from: admin UI, REST endpoint, WP-cron, agent scripts.
	 *
	 * @param int  $product_id       WooCommerce product ID.
	 * @param bool $skip_draft_check When true, the 'draft' code is not tested. Used by
	 *                               the publish-transition hook because the product IS
	 *                               currently transitioning to publish (not a draft any more).
	 * @return array {
	 *   bool  $ready    True when no blocking issues were found.
	 *   array $issues   Array of { code:string, message:string, severity:string }.
	 *   array $checked  Human-readable list of check names that ran.
	 * }
	 */
	public static function evaluate( int $product_id, bool $skip_draft_check = false ): array {
		$issues  = array();
		$checked = array();

		// ── Gate: WooCommerce active ─────────────────────────────────────────────
		if ( ! \function_exists( 'wc_get_product' ) ) {
			$issues[] = array(
				'code'     => 'wc_unavailable',
				'message'  => \__( 'WooCommerce is not active.', 'sgs-blocks' ),
				'severity' => 'blocker',
			);
			return self::result( $issues, $checked );
		}

		$product = \wc_get_product( $product_id );

		// Only evaluate variable products — return ready=true for all other types so
		// simple products, pages, etc. are never blocked.
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return self::result( array(), array( 'not_variable_product' ) );
		}

		// ── Check 1: WooCommerce version ─────────────────────────────────────────
		$checked[] = 'wc_version';
		if ( ! Sgs_Configurator_Compat::is_supported() ) {
			$wc_msg = \sprintf(
				/* translators: %s: minimum required WooCommerce version */
				\__( 'WooCommerce %s or higher is required for the product configurator.', 'sgs-blocks' ),
				Sgs_Configurator_Compat::MIN_WC
			);
			$issues[] = array(
				'code'     => 'wc_version_too_old',
				'message'  => $wc_msg,
				'severity' => 'blocker',
			);
		}

		// ── Check 2: Draft status ────────────────────────────────────────────────
		if ( ! $skip_draft_check ) {
			$checked[] = 'publish_status';
			if ( 'publish' !== \get_post_status( $product_id ) ) {
				$issues[] = array(
					'code'     => 'draft',
					'message'  => \__( 'Product must be published before it is live.', 'sgs-blocks' ),
					'severity' => 'blocker',
				);
			}
		}

		// ── Check 3: Zero-price variations ──────────────────────────────────────
		$checked[] = 'zero_price';
		$zero_ids  = array();
		foreach ( $product->get_children() as $child_id ) {
			$variation = \wc_get_product( $child_id );
			if ( ! $variation || ! $variation->exists() ) {
				continue;
			}
			// Use wc_get_price_to_display() — respects tax display settings (matches cart behaviour).
			$display_price = \wc_get_price_to_display( $variation );
			if ( $display_price <= 0 ) {
				$zero_ids[] = $child_id;
			}
		}
		if ( ! empty( $zero_ids ) ) {
			$issues[] = array(
				'code'     => 'zero_price',
				'message'  => \sprintf(
					/* translators: %d: count of zero-price variations */
					\_n(
						'%d variation has a price of £0 or unset — customers cannot purchase it.',
						'%d variations have a price of £0 or unset — customers cannot purchase them.',
						\count( $zero_ids ),
						'sgs-blocks'
					),
					\count( $zero_ids )
				),
				'severity' => 'blocker',
			);
		}

		// ── Check 4: Missing images ──────────────────────────────────────────────
		$checked[]       = 'images';
		$parent_image_id = $product->get_image_id();
		$no_image_ids    = array();
		foreach ( $product->get_children() as $child_id ) {
			$variation = \wc_get_product( $child_id );
			if ( ! $variation || ! $variation->exists() ) {
				continue;
			}
			$variation_image_id = $variation->get_image_id();
			// A variation passes when it has its own image OR the parent has a fallback image.
			if ( ! $variation_image_id && ! $parent_image_id ) {
				$no_image_ids[] = $child_id;
			}
		}
		if ( ! empty( $no_image_ids ) ) {
			$issues[] = array(
				'code'     => 'no_image',
				'message'  => \sprintf(
					/* translators: %d: count of variations without an image */
					\_n(
						'%d variation has no image (and the parent product has no fallback image).',
						'%d variations have no image (and the parent product has no fallback image).',
						\count( $no_image_ids ),
						'sgs-blocks'
					),
					\count( $no_image_ids )
				),
				'severity' => 'blocker',
			);
		}

		// ── Check 5: Manifest over the 24 KB seed cap ────────────────────────────
		$checked[] = 'manifest_cap';
		$manifest  = Product_Manifest::build( $product_id );
		if ( null !== $manifest ) {
			// Mirror the lean-subset logic from render.php: strip server-only fields
			// (sku / gtin / incMinor / saleEndDate / gallery > 1 image) before measuring.
			$lean_manifest = self::lean_manifest_subset( $manifest );
			$encoded       = \wp_json_encode( $lean_manifest );
			$lean_bytes    = \strlen( false !== $encoded ? $encoded : '' );
			if ( $lean_bytes >= self::MANIFEST_CAP_BYTES ) {
				$cap_msg = \sprintf(
					/* translators: 1: measured bytes, 2: cap bytes */
					\__( 'The product manifest is %1$d bytes — over the %2$d byte context cap. Reduce the number of variations.', 'sgs-blocks' ),
					$lean_bytes,
					self::MANIFEST_CAP_BYTES
				);
				$issues[] = array(
					'code'     => 'manifest_over_cap',
					'message'  => $cap_msg,
					'severity' => 'blocker',
				);
			}
		}

		// ── Check 6: No variesBy mapping ─────────────────────────────────────────
		$checked[]    = 'variesby';
		$has_variesby = false;
		$raw_attrs    = $product->get_variation_attributes();
		foreach ( $raw_attrs as $taxonomy => $slugs ) {
			foreach ( $slugs as $slug ) {
				if ( '' === $slug ) {
					continue;
				}
				$term = \get_term_by( 'slug', $slug, $taxonomy );
				if ( ! $term || \is_wp_error( $term ) ) {
					continue;
				}
				$mapped = Configurator_Meta::sanitize_variesby(
					\get_term_meta( $term->term_id, '_sgs_variesby_value', true )
				);
				if ( '' !== $mapped ) {
					$has_variesby = true;
					break 2;
				}
			}
		}
		if ( ! $has_variesby && ! empty( $raw_attrs ) ) {
			$issues[] = array(
				'code'     => 'no_variesby',
				'message'  => \__( 'No variation attribute term has a Google variesBy mapping (colour, size, material, etc.). The ProductGroup schema will not be valid for Google Merchant.', 'sgs-blocks' ),
				'severity' => 'blocker',
			);
		}

		// ── Check 7: JSON-LD structural validity ─────────────────────────────────
		$checked[]   = 'jsonld';
		$schema_html = Product_Schema::build_script( $product_id );
		if ( '' === $schema_html ) {
			$issues[] = array(
				'code'     => 'invalid_jsonld',
				'message'  => \__( 'The ProductGroup JSON-LD output is empty — the manifest has no valid combos or the product data is incomplete.', 'sgs-blocks' ),
				'severity' => 'blocker',
			);
		} else {
			// Verify the script contains a ProductGroup and at least one AggregateOffer.
			$json_str  = (string) \preg_replace( '/<script[^>]*>|<\/script>/i', '', $schema_html );
			$json_data = \json_decode( $json_str, true );
			if ( ! \is_array( $json_data )
				|| 'ProductGroup' !== ( $json_data['@type'] ?? '' )
				|| empty( $json_data['offers'] ) ) {
				$issues[] = array(
					'code'     => 'invalid_jsonld',
					'message'  => \__( 'The ProductGroup JSON-LD is missing required fields (ProductGroup type or offers).', 'sgs-blocks' ),
					'severity' => 'blocker',
				);
			}
		}

		return self::result( $issues, $checked );
	}

	// ── Weekly health cron ────────────────────────────────────────────────────────

	/**
	 * Hook: sgs_preflight_health_check (weekly WP-cron event).
	 *
	 * Iterates the FIRST N published variable products and runs evaluate().
	 * When any product has degraded (e.g. a variation went to £0 post-publish),
	 * stores a transient so admin_notices can surface it.
	 */
	public static function run_health_cron(): void {
		if ( ! \function_exists( 'wc_get_product' ) ) {
			return;
		}

		global $wpdb;

		// Fetch up to CRON_PRODUCT_BATCH published variable products (cheap indexed query).
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- cron context; result not cached on purpose.
		$product_ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT DISTINCT p.ID
				   FROM {$wpdb->posts} p
				   JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID
				  WHERE p.post_type   = 'product'
				    AND p.post_status = 'publish'
				    AND pm.meta_key   = '_product_type'
				    AND pm.meta_value = 'variable'
				  ORDER BY p.ID ASC
				  LIMIT %d",
				self::CRON_PRODUCT_BATCH
			)
		);

		if ( empty( $product_ids ) ) {
			return;
		}

		$degraded = array();

		foreach ( $product_ids as $pid ) {
			$pid    = (int) $pid;
			$result = self::evaluate( $pid );
			if ( ! $result['ready'] ) {
				$degraded[] = $pid;
			}
		}

		if ( ! empty( $degraded ) ) {
			\set_transient(
				self::HEALTH_TRANSIENT,
				array(
					'count' => \count( $degraded ),
					'ids'   => $degraded,
					'at'    => \time(),
				),
				\WEEK_IN_SECONDS
			);
		} else {
			\delete_transient( self::HEALTH_TRANSIENT );
		}
	}

	/**
	 * Hook: admin_notices — display the health-cron finding when present.
	 */
	public static function maybe_show_health_notice(): void {
		if ( ! \current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		$data = \get_transient( self::HEALTH_TRANSIENT );
		if ( ! \is_array( $data ) || empty( $data['count'] ) ) {
			return;
		}

		$count = (int) $data['count'];
		echo '<div class="notice notice-warning is-dismissible"><p>';
		\printf(
			\esc_html(
				/* translators: %d: number of products needing attention */
				\_n(
					'SGS Configurator health: %d product needs attention (zero price, missing image, or invalid schema). Please review and republish.',
					'SGS Configurator health: %d products need attention (zero price, missing image, or invalid schema). Please review and republish.',
					$count,
					'sgs-blocks'
				)
			),
			(int) $count
		);
		echo '</p></div>';
	}

	// ── Private helpers ───────────────────────────────────────────────────────────

	/**
	 * Build a lean manifest subset — mirrors the size-reduction the product-card
	 * render.php applies before seeding into data-wp-context.
	 *
	 * Strips server-only fields: sku, gtin, incMinor, saleEndDate.
	 * Also drops gallery entries beyond the first (the primary image; the rest are
	 * loaded on demand).  These two operations are the main causes of the E1 server-
	 * manifest growth that tripped the 24 KB cap (MEMORY feedback 2026-06-05).
	 *
	 * @param array $manifest Full manifest from Product_Manifest::build().
	 * @return array Lean subset.
	 */
	private static function lean_manifest_subset( array $manifest ): array {
		$lean = $manifest;
		if ( isset( $lean['combos'] ) && \is_array( $lean['combos'] ) ) {
			foreach ( $lean['combos'] as &$combo ) {
				unset( $combo['sku'], $combo['gtin'], $combo['incMinor'], $combo['saleEndDate'] );
				// Keep only the first gallery item (the primary image).
				if ( isset( $combo['gallery'] ) && \is_array( $combo['gallery'] ) && \count( $combo['gallery'] ) > 1 ) {
					$combo['gallery'] = array( $combo['gallery'][0] );
				}
			}
			unset( $combo );
		}
		return $lean;
	}

	/**
	 * Build the standard evaluate() return shape.
	 *
	 * @param array $issues  Array of issue entries.
	 * @param array $checked Array of check names that ran.
	 * @return array
	 */
	private static function result( array $issues, array $checked ): array {
		return array(
			'ready'   => empty( $issues ),
			'issues'  => $issues,
			'checked' => $checked,
		);
	}
}
