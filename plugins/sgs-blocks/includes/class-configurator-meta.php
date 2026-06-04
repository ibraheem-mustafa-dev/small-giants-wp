<?php
/**
 * Configurator meta registry — the single registration point for every Spec 27
 * configurator presentation/config meta key (attribute term_meta + variation
 * postmeta).
 *
 * Registering here once — with sanitise + per-object auth + show_in_rest — means
 * the Phase-2 render layer (B2 swatches / B3 per-unit / A4 gallery) AND the
 * Phase-R authoring UI read and write the SAME validated keys. No new keys, no
 * migration, no orphaned meta (the "authoring seam" the council flagged).
 *
 * Security contracts baked in here so every consumer inherits them:
 *  - SEC-4: the cosmetic discount label is digit-STRIPPED at save (a fabricated
 *    "20% off" / "20 percent off" / fullwidth "２０％" claim cannot be stored) and
 *    capped at 40 chars. Prevents a UK Consumer-Protection / Trading-Standards
 *    misleading-price claim entering through a cosmetic field.
 *  - SEC-8: `_sgs_variesby_value` is validated against Google's closed variesBy
 *    enum at save; an unmapped value is dropped (the JSON-LD emitter then treats
 *    that axis as a free-text additionalProperty, never an invalid enum value).
 *  - Per-object auth: variation postmeta writes require `edit_post` on the
 *    specific variation (IDOR-safe); attribute term_meta writes require
 *    `manage_woocommerce`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers + sanitises all configurator meta keys.
 */
final class Configurator_Meta {

	/**
	 * Google Merchant `variesBy` closed enum (FR-27-E1 / SEC-8).
	 *
	 * @var string[]
	 */
	const VARIESBY_ENUM = array( 'color', 'size', 'material', 'pattern', 'suggestedAge', 'suggestedGender' );

	/** Upper bound for the per-unit divisor (generous: e.g. ml→litre). 0/negatives rejected. */
	const UNIT_DIVISOR_MAX = 100000;

	/** Max length of the cosmetic discount label. */
	const LABEL_MAX_LEN = 40;

	/**
	 * Hook registration onto init (priority 20 — after WooCommerce registers its
	 * attribute taxonomies on init:5, so wc_get_attribute_taxonomy_names() is populated).
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_meta' ), 20 );
	}

	/**
	 * Register every configurator meta key.
	 *
	 * @return void
	 */
	public static function register_meta(): void {
		self::register_term_meta_all();
		self::register_variation_meta();
	}

	// ─── Attribute term meta (swatch + variesBy) on every product attribute taxonomy ───

	/**
	 * Register swatch + variesBy term meta on every WooCommerce attribute taxonomy
	 * (pa_size, pa_flavour, and any client attribute).
	 *
	 * @return void
	 */
	private static function register_term_meta_all(): void {
		if ( ! \function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
			return;
		}

		foreach ( \wc_get_attribute_taxonomy_names() as $taxonomy ) {
			\register_term_meta(
				$taxonomy,
				'_sgs_swatch_color',
				array(
					'type'              => 'string',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_hex_color',
					'auth_callback'     => array( __CLASS__, 'can_edit_attribute_terms' ),
				)
			);
			\register_term_meta(
				$taxonomy,
				'_sgs_swatch_image_id',
				array(
					'type'              => 'integer',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => array( __CLASS__, 'sanitize_image_id' ),
					'auth_callback'     => array( __CLASS__, 'can_edit_attribute_terms' ),
				)
			);
			\register_term_meta(
				$taxonomy,
				'_sgs_variesby_value',
				array(
					'type'              => 'string',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => array( __CLASS__, 'sanitize_variesby' ),
					'auth_callback'     => array( __CLASS__, 'can_edit_attribute_terms' ),
				)
			);
		}
	}

	// ─── Variation postmeta (gallery + per-unit + discount label) ───

	/**
	 * Register gallery / per-unit / discount-label meta on product_variation posts.
	 *
	 * @return void
	 */
	private static function register_variation_meta(): void {
		\register_post_meta(
			'product_variation',
			'_sgs_variation_gallery',
			array(
				'type'              => 'array',
				'single'            => true,
				'show_in_rest'      => array(
					'schema' => array(
						'type'  => 'array',
						'items' => array( 'type' => 'integer' ),
					),
				),
				'sanitize_callback' => array( __CLASS__, 'sanitize_id_array' ),
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
		\register_post_meta(
			'product_variation',
			'_sgs_unit_divisor',
			array(
				'type'              => 'number',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => array( __CLASS__, 'sanitize_divisor' ),
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
		\register_post_meta(
			'product_variation',
			'_sgs_unit_label',
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
		\register_post_meta(
			'product_variation',
			'_sgs_discount_label',
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => array( __CLASS__, 'sanitize_discount_label' ),
				'auth_callback'     => array( __CLASS__, 'can_edit_variation' ),
			)
		);
	}

	// ─── Sanitisers ───

	/**
	 * SEC-8: only a value in Google's closed variesBy enum survives; else dropped.
	 *
	 * @param mixed $value Raw value.
	 * @return string Valid enum value or ''.
	 */
	public static function sanitize_variesby( $value ): string {
		$value = \sanitize_text_field( (string) $value );
		return \in_array( $value, self::VARIESBY_ENUM, true ) ? $value : '';
	}

	/**
	 * An image id that resolves to a real image attachment; else 0.
	 *
	 * @param mixed $value Raw value.
	 * @return int
	 */
	public static function sanitize_image_id( $value ): int {
		$id = \absint( $value );
		if ( $id > 0 && \function_exists( 'wp_attachment_is_image' ) && \wp_attachment_is_image( $id ) ) {
			return $id;
		}
		return 0;
	}

	/**
	 * An array of positive, unique attachment ids (accepts a JSON string too).
	 *
	 * @param mixed $value Raw value.
	 * @return int[]
	 */
	public static function sanitize_id_array( $value ): array {
		if ( ! \is_array( $value ) ) {
			// Accept a JSON array (REST) OR a comma-separated string (the variation
			// gallery editor field posts a CSV of attachment ids).
			if ( \is_string( $value ) && '' !== $value ) {
				$decoded = \json_decode( $value, true );
				$value   = \is_array( $decoded ) ? $decoded : \explode( ',', $value );
			} else {
				$value = array();
			}
		}
		$ids = array();
		foreach ( $value as $item ) {
			// Image-type check (escape-audit): only real image attachments may
			// enter a gallery — sanitize_image_id() runs wp_attachment_is_image(),
			// so arbitrary post/page/non-image ids are rejected (no info-leak).
			$id = self::sanitize_image_id( $item );
			if ( $id > 0 ) {
				$ids[] = $id;
			}
		}
		return \array_values( \array_unique( $ids ) );
	}

	/**
	 * A positive divisor within a sane bound; else 0 (= unset, per-unit not shown).
	 *
	 * @param mixed $value Raw value.
	 * @return int|float 0 when invalid.
	 */
	public static function sanitize_divisor( $value ) {
		$number = \is_numeric( $value ) ? (float) $value : 0;
		if ( $number <= 0 || $number > self::UNIT_DIVISOR_MAX ) {
			return 0;
		}
		return ( \floor( $number ) === $number ) ? (int) $number : \round( $number, 4 );
	}

	/**
	 * SEC-4: cosmetic label — strip ALL digits and percent signs (no fabricated
	 * "% off" claim), then cap length.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public static function sanitize_discount_label( $value ): string {
		$value = \sanitize_text_field( (string) $value );
		$value = \preg_replace( '/\d/u', '', $value );                  // Strip every digit.
		$value = \preg_replace( '/[%\x{FF05}\x{2052}]/u', '', $value ); // Strip %, fullwidth %, commercial minus.
		$value = \trim( (string) $value );
		return \function_exists( 'mb_substr' )
			? \mb_substr( $value, 0, self::LABEL_MAX_LEN )
			: \substr( $value, 0, self::LABEL_MAX_LEN );
	}

	// ─── Auth ───

	/**
	 * Attribute term meta is shop configuration — gate on manage_woocommerce.
	 *
	 * @return bool
	 */
	public static function can_edit_attribute_terms(): bool {
		return \current_user_can( 'manage_woocommerce' );
	}

	/**
	 * Variation postmeta — per-object edit_post on the specific variation (IDOR-safe).
	 *
	 * @param bool   $allowed  Whether the user can add/edit (unused; we recompute).
	 * @param string $meta_key The meta key (unused).
	 * @param int    $post_id  The variation post id.
	 * @return bool
	 */
	public static function can_edit_variation( $allowed, $meta_key, $post_id ): bool {
		return \current_user_can( 'edit_post', (int) $post_id );
	}
}
