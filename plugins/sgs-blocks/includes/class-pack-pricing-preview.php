<?php
/**
 * SGS Smart Bulk Pricing — preview REST endpoint (Spec 28 P3, FR-28-10).
 *
 * Registers POST /sgs/v1/pack-pricing/preview.
 *
 * Accepts the product_id + optional per-request overrides (k_notch,
 * pack_sizes, base_pence), resolves the cascade via sgs_get_pack_pricing_config(),
 * calls sgs_auto_pack_prices(), and returns JSON preview rows.
 *
 * The endpoint WRITES NOTHING to WooCommerce — it is preview-only (P3 contract).
 * The "Apply to live shop" write path is P4 (FR-28-5, deferred).
 *
 * Each row in the response carries:
 *   pack_size        int     Pack count.
 *   pack_price_pence int     Charmed pack total in pence.
 *   pack_price_fmt   string  Formatted display string e.g. "£8.99".
 *   per_unit_pence   int     Per-unit in pence.
 *   per_unit_fmt     string  Formatted per-unit e.g. "75p".
 *   saving_pct       int     Saving % vs single.
 *   saving_pence     int     Saving pence per unit.
 *   saving_display   string  Plain-text saving label (FR-28-8, esc_html-safe).
 *   clamped          bool    True when a guardrail reduced the price.
 *   locked           bool    Reserved; always false in P3.
 *   guardrail_note   string  Plain-English explanation when clamped = true.
 *
 * Security:
 *   - permission_callback: current_user_can( 'edit_post', $product_id ).
 *   - Nonce verified via standard WP REST nonce (wp_rest).
 *   - All inputs sanitised; output is JSON-encoded WP_REST_Response (no raw echo).
 *
 * @package   SGS\Blocks
 * @since     1.14.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md FR-28-10
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// This file owns its own dependencies: handle() delegates cascade+engine
// resolution to the shared Pack_Pricing_Resolver (the SAME function the apply
// path calls — preview == apply by construction).
require_once __DIR__ . '/class-pack-pricing-resolver.php';

/**
 * Class Pack_Pricing_Preview
 *
 * REST controller for the pack-pricing preview endpoint (P3, preview-only).
 */
final class Pack_Pricing_Preview {

	/** REST namespace (matches every other SGS endpoint). */
	const REST_NAMESPACE = 'sgs/v1';

	/** REST route. */
	const REST_ROUTE = '/pack-pricing/preview';

	/**
	 * Wire REST hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
	}

	/**
	 * Register the preview REST route.
	 *
	 * @return void
	 */
	public static function register_route(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			self::REST_ROUTE,
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => array( __CLASS__, 'permission_check' ),
				'args'                => self::route_args(),
			)
		);
	}

	/**
	 * Route argument schema (FR-28-15 input gates).
	 *
	 * @return array
	 */
	private static function route_args(): array {
		return array(
			'product_id' => array(
				'required'          => true,
				'type'              => 'integer',
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
				'description'       => 'WooCommerce product post ID.',
			),
			'base_pence' => array(
				'required'          => false,
				'type'              => 'integer',
				'minimum'           => 10,
				'sanitize_callback' => 'absint',
				'description'       => 'Single-item reference price in pence (overrides _sgs_base_price_pence for this preview).',
			),
			'k_notch'    => array(
				'required'          => false,
				'type'              => 'string',
				'enum'              => array( 'gentle', 'standard', 'aggressive' ),
				'sanitize_callback' => 'sanitize_key',
				'description'       => 'Steepness notch override for this preview.',
			),
			'pack_sizes' => array(
				'required'    => false,
				'type'        => 'array',
				'items'       => array(
					'type'    => 'integer',
					'minimum' => 2,
					'maximum' => 500,
				),
				'description' => 'Pack-size array override for this preview.',
			),
		);
	}

	/**
	 * Permission callback — edit_post on the specific product (IDOR-safe).
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return bool|\WP_Error
	 */
	public static function permission_check( \WP_REST_Request $request ) {
		$product_id = (int) $request->get_param( 'product_id' );
		if ( ! \current_user_can( 'edit_post', $product_id ) ) {
			return new \WP_Error(
				'rest_forbidden',
				\__( 'You do not have permission to preview pricing for this product.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}
		return true;
	}

	/**
	 * Handle the preview request.
	 *
	 * Resolves the cascade, applies any request-level overrides, calls the
	 * engine, and returns formatted preview rows.  Writes NOTHING to WC.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle( \WP_REST_Request $request ) {
		$product_id = (int) $request->get_param( 'product_id' );

		// Resolve cascade + overrides + engine via the SHARED resolver — the
		// SAME function the apply path calls (preview == apply by construction).
		$resolved = Pack_Pricing_Resolver::resolve( $product_id, $request );
		if ( \is_wp_error( $resolved ) ) {
			return $resolved;
		}
		$cfg  = $resolved['cfg'];
		$rows = $resolved['rows'];

		// Format rows for the preview table.
		$preview_rows = array();
		foreach ( $rows as $pack_size => $row ) {
			$preview_rows[] = self::format_row( (int) $pack_size, $row, $cfg['base_pence'] );
		}

		return new \WP_REST_Response(
			array(
				'preview_rows' => $preview_rows,
				'config'       => array(
					'base_pence'   => $cfg['base_pence'],
					'k'            => $cfg['k'],
					'source_k'     => $cfg['source_k'],
					'source_sizes' => $cfg['source_sizes'],
					'charm_round'  => $cfg['charm_round'],
				),
			),
			200
		);
	}

	/**
	 * Format a single engine row into a preview-table row.
	 *
	 * Adds formatted display strings and a plain-English guardrail note.
	 *
	 * @param int   $pack_size  Pack count.
	 * @param array $row        Engine output row.
	 * @param int   $base_pence Single-item reference price in pence.
	 * @return array
	 */
	private static function format_row( int $pack_size, array $row, int $base_pence ): array {
		$pack_pence = (int) $row['pack_price_pence'];
		$unit_pence = (int) $row['per_unit_pence'];

		// Format pack price as £X.XX (always two decimals).
		$pack_fmt = self::format_pence( $pack_pence );

		// Format per-unit: show pence when < 100p, else £X.XX.
		$unit_fmt = $unit_pence < 100
			? $unit_pence . 'p'
			: self::format_pence( $unit_pence );

		// Guardrail note — plain English for non-coders (FR-28-4 visibility).
		$guardrail_note = '';
		if ( (bool) $row['clamped'] ) {
			if ( (bool) $row['locked'] ) {
				// Manual override (not a guardrail — positive message).
				$guardrail_note = \__( 'You set this price manually — the engine has not touched it.', 'sgs-blocks' );
			} elseif ( (int) $row['saving_pct'] >= 40 ) {
				$guardrail_note = \__( 'Price was reduced to keep the saving at or below the 40% cap (scepticism ceiling — FR-28-4).', 'sgs-blocks' );
			} elseif ( $unit_pence >= $base_pence ) {
				$guardrail_note = \__( 'Price was adjusted because the per-unit cost was not cheaper than buying a single item.', 'sgs-blocks' );
			} else {
				$guardrail_note = \__( 'Price was adjusted by a guardrail to keep it within safe bounds.', 'sgs-blocks' );
			}
		}

		// PLAIN TEXT in the JSON, by design (security review Findings 1+8,
		// 2026-06-09): JSON is a data channel, not HTML. esc_html() here would
		// surface literal entities (&#039;) once the admin JS renders these
		// fields via textContent — which is the layer that owns escaping.
		// Do NOT add esc_html() back; do NOT render these via innerHTML.
		return array(
			'pack_size'        => $pack_size,
			'pack_price_pence' => $pack_pence,
			'pack_price_fmt'   => $pack_fmt,
			'per_unit_pence'   => $unit_pence,
			'per_unit_fmt'     => $unit_fmt,
			'saving_pct'       => (int) $row['saving_pct'],
			'saving_pence'     => (int) $row['saving_pence_each'],
			'saving_display'   => (string) $row['saving_display'],
			'clamped'          => (bool) $row['clamped'],
			'locked'           => (bool) $row['locked'],
			'guardrail_note'   => $guardrail_note,
		);
	}

	/**
	 * Format an integer pence value as a display string (£X.XX or Xp).
	 *
	 * Uses WC's currency symbol when available; falls back to £.
	 *
	 * @param int $pence Price in pence.
	 * @return string Plain-text formatted price.
	 */
	private static function format_pence( int $pence ): string {
		if ( \function_exists( 'wc_price' ) ) {
			return \html_entity_decode(
				\wp_strip_all_tags( \wc_price( $pence / 100 ) ),
				ENT_QUOTES,
				'UTF-8'
			);
		}
		return '£' . \number_format( $pence / 100, 2 );
	}
}
