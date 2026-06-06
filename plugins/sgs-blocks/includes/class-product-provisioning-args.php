<?php
/**
 * SGS Product Provisioning — route argument schemas, validate callbacks,
 * cartesian helper, upsert-key builder, and response shaper.
 *
 * Extracted from class-product-provisioning.php to keep both files under the
 * 300-line limit (code-quality.md rule). Product_Provisioning requires this
 * file before use; no external code should reference this class directly.
 *
 * @package SGS\Blocks
 * @since   1.7.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Static helpers for Product_Provisioning route args, validation, cartesian
 * generation, upsert-key building, and response shaping.
 *
 * @internal Used only by Product_Provisioning.
 */
final class Product_Provisioning_Args {

	/**
	 * Maximum number of variations that may be generated in a single request.
	 * WooCommerce's own performance guidance caps this at 50–300; we match their
	 * UI default hard cap of 300.
	 *
	 * @var int
	 */
	const MAX_VARIATIONS = 300;

	// ── Route arg schemas ────────────────────────────────────────────────────

	/**
	 * Args schema for POST /sgs/v1/products/{id}/provision.
	 *
	 * @return array
	 */
	public static function provision_args(): array {
		$args = array(
			'id'         => array(
				'required'          => true,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'description'       => \__( 'Parent variable product ID.', 'sgs-blocks' ),
			),
			'attributes' => array(
				'required'          => true,
				'type'              => 'array',
				'validate_callback' => array( __CLASS__, 'validate_attributes_array' ),
				'description'       => \__( 'Attribute definitions with terms to provision.', 'sgs-blocks' ),
				'items'             => array(
					'type'       => 'object',
					'properties' => array(
						'name'     => array(
							'type'              => 'string',
							'required'          => true,
							'sanitize_callback' => 'sanitize_text_field',
						),
						'taxonomy' => array(
							'type'              => 'string',
							'required'          => false,
							'sanitize_callback' => 'sanitize_text_field',
						),
						'terms'    => array(
							'type'     => 'array',
							'required' => true,
							'items'    => array( 'type' => 'string' ),
						),
					),
				),
			),
			'defaults'   => array(
				'required'    => false,
				'type'        => 'object',
				'description' => \__( 'Default commerce fields applied to every new variation.', 'sgs-blocks' ),
				'properties'  => array(
					'regular_price' => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => array( __CLASS__, 'validate_decimal' ),
					),
					'sale_price'    => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => array( __CLASS__, 'validate_decimal' ),
					),
					'manage_stock'  => array( 'type' => 'boolean' ),
					'stock_status'  => array(
						'type' => 'string',
						'enum' => array( 'instock', 'outofstock', 'onbackorder' ),
					),
				),
			),
			'overrides'  => array(
				'required'             => false,
				'type'                 => 'object',
				'description'          => \__( 'Per-combo field overrides keyed by upsert key string.', 'sgs-blocks' ),
				// Each override value is an object with the same whitelisted commerce
				// fields as `defaults`; only these keys are ever read at point of use.
				'additionalProperties' => array(
					'type'       => 'object',
					'properties' => array(
						'regular_price' => array(
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => array( __CLASS__, 'validate_decimal' ),
						),
						'sale_price'    => array(
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => array( __CLASS__, 'validate_decimal' ),
						),
						'manage_stock'  => array( 'type' => 'boolean' ),
						'stock_status'  => array(
							'type' => 'string',
							'enum' => array( 'instock', 'outofstock', 'onbackorder' ),
						),
					),
				),
			),
			'dry_run'    => array(
				'required'    => false,
				'type'        => 'boolean',
				'default'     => false,
				'description' => \__( 'Compute the plan without writing anything.', 'sgs-blocks' ),
			),
		);

		// Test-only injected-failure threshold. Registered ONLY under a debug/
		// testing constant so it never appears in the public REST OPTIONS schema in
		// production. Even when registered, the handler honours it only when the
		// user has manage_options AND the `sgs_pa_allow_test_fail` filter returns
		// true (default false).
		if ( ( \defined( 'WP_DEBUG' ) && \WP_DEBUG ) || ( \defined( 'SGS_TESTING' ) && \SGS_TESTING ) ) {
			$args['_sgs_test_fail_after'] = array(
				'required'          => false,
				'type'              => 'integer',
				'default'           => 0,
				'sanitize_callback' => 'absint',
				'description'       => \__( 'Test-only: throw after creating N variations (gated; inert in production).', 'sgs-blocks' ),
			);
		}

		return $args;
	}

	/**
	 * Args schema for POST /sgs/v1/products/{id}/variations/bulk.
	 *
	 * @return array
	 */
	public static function bulk_args(): array {
		return array(
			'id'    => array(
				'required'          => true,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'description'       => \__( 'Parent variable product ID.', 'sgs-blocks' ),
			),
			'items' => array(
				'required'          => true,
				'type'              => 'array',
				'validate_callback' => array( __CLASS__, 'validate_items_array' ),
				'description'       => \__( 'Array of variation field-update objects.', 'sgs-blocks' ),
				'items'             => array(
					'type'       => 'object',
					'properties' => array(
						'variation_id'   => array(
							'type'     => 'integer',
							'required' => true,
						),
						'regular_price'  => array(
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => array( __CLASS__, 'validate_decimal' ),
						),
						'sale_price'     => array(
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => array( __CLASS__, 'validate_decimal' ),
						),
						'sku'            => array(
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
						),
						'manage_stock'   => array( 'type' => 'boolean' ),
						'stock_quantity' => array(
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
						),
						'stock_status'   => array(
							'type' => 'string',
							'enum' => array( 'instock', 'outofstock', 'onbackorder' ),
						),
						'description'    => array(
							'type'              => 'string',
							'sanitize_callback' => 'wp_kses_post',
						),
					),
				),
			),
		);
	}

	// ── Validate callbacks ───────────────────────────────────────────────────

	/**
	 * Validate that the attributes array has at least one entry and each item has
	 * a non-empty name and at least one term.
	 *
	 * @param mixed $value Raw input value.
	 * @return bool|\WP_Error
	 */
	public static function validate_attributes_array( $value ) {
		if ( ! \is_array( $value ) || empty( $value ) ) {
			return new \WP_Error(
				'sgs_invalid_attributes',
				\__( 'At least one attribute is required.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}
		foreach ( $value as $attr ) {
			if ( empty( $attr['name'] ) || ! \is_string( $attr['name'] ) ) {
				return new \WP_Error(
					'sgs_invalid_attribute_name',
					\__( 'Each attribute must have a non-empty name.', 'sgs-blocks' ),
					array( 'status' => 400 )
				);
			}
			if ( empty( $attr['terms'] ) || ! \is_array( $attr['terms'] ) ) {
				return new \WP_Error(
					'sgs_invalid_attribute_terms',
					\__( 'Each attribute must have at least one term.', 'sgs-blocks' ),
					array( 'status' => 400 )
				);
			}
		}
		return true;
	}

	/**
	 * Validate that items array is non-empty and each item has a positive
	 * variation_id integer.
	 *
	 * @param mixed $value Raw input value.
	 * @return bool|\WP_Error
	 */
	public static function validate_items_array( $value ) {
		if ( ! \is_array( $value ) || empty( $value ) ) {
			return new \WP_Error(
				'sgs_invalid_items',
				\__( 'At least one item is required.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}
		foreach ( $value as $item ) {
			if ( empty( $item['variation_id'] ) || (int) $item['variation_id'] <= 0 ) {
				return new \WP_Error(
					'sgs_invalid_variation_id',
					\__( 'Each item must include a positive variation_id.', 'sgs-blocks' ),
					array( 'status' => 400 )
				);
			}
		}
		return true;
	}

	/**
	 * Validate that a value is a non-negative decimal string.
	 *
	 * @param mixed $value Raw input.
	 * @return bool
	 */
	public static function validate_decimal( $value ): bool {
		return '' === $value || ( \is_numeric( $value ) && (float) $value >= 0 );
	}

	// ── Cartesian + upsert key ───────────────────────────────────────────────

	/**
	 * Build the Cartesian product of per-attribute term-slug lists.
	 *
	 * Each combo is a map of `taxonomy => slug` pairs (e.g.
	 * `['pa_size' => 'small', 'pa_flavour' => 'vanilla']`).
	 *
	 * Returns an empty array when any input group is empty (no combos possible).
	 *
	 * @param array[] $groups Indexed list of `['taxonomy' => string, 'slugs' => string[]]`.
	 * @return array[] List of combos (each an assoc array of tax → slug).
	 */
	public static function cartesian( array $groups ): array {
		$result = array( array() );

		foreach ( $groups as $group ) {
			$tax = $group['taxonomy'];
			$new = array();
			foreach ( $result as $existing ) {
				foreach ( $group['slugs'] as $slug ) {
					$combo         = $existing;
					$combo[ $tax ] = $slug;
					$new[]         = $combo;
				}
			}
			$result = $new;
		}

		// Return only real combos (the seed `array( array() )` must not leak through
		// when groups is empty).
		return ( 1 === \count( $result ) && empty( $result[0] ) ) ? array() : $result;
	}

	/**
	 * Build a deterministic upsert key from a combo map.
	 *
	 * Taxonomies are sorted alphabetically so the key is stable regardless of
	 * insertion order. Example: `pa_flavour=vanilla|pa_size=small`.
	 *
	 * @param array $combo Assoc array of `taxonomy => slug`.
	 * @return string
	 */
	public static function upsert_key( array $combo ): string {
		\ksort( $combo );
		$pairs = array();
		foreach ( $combo as $tax => $slug ) {
			$pairs[] = $tax . '=' . $slug;
		}
		return \implode( '|', $pairs );
	}
}
