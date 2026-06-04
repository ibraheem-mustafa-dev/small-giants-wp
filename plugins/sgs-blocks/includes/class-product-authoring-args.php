<?php
/**
 * SGS Product Authoring — route argument schemas, validate callbacks, and
 * response-data helpers.
 *
 * Extracted from class-product-authoring.php to keep both files under the
 * 300-line file-length limit (code-quality.md rule). Product_Authoring requires
 * this file before it is used; no external code should reference this class
 * directly.
 *
 * @package SGS\Blocks
 * @since   1.7.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Static helpers for Product_Authoring route args, validation, and responses.
 *
 * @internal Used only by Product_Authoring.
 */
final class Product_Authoring_Args {

	/**
	 * Args schema for the update_variation route.
	 *
	 * @return array
	 */
	public static function variation_args(): array {
		return array(
			'id'               => array(
				'required'          => true,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'description'       => \__( 'Parent variable product ID.', 'sgs-blocks' ),
			),
			'variation_id'     => array(
				'required'          => true,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'description'       => \__( 'Variation ID.', 'sgs-blocks' ),
			),
			'regular_price'    => array(
				'required'          => false,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => array( __CLASS__, 'validate_decimal' ),
				'description'       => \__( 'Regular price (decimal string, e.g. "9.99").', 'sgs-blocks' ),
			),
			'sale_price'       => array(
				'required'          => false,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => array( __CLASS__, 'validate_decimal' ),
				'description'       => \__( 'Sale price (decimal string).', 'sgs-blocks' ),
			),
			'sku'              => array(
				'required'          => false,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'description'       => \__( 'Stock-keeping unit identifier.', 'sgs-blocks' ),
			),
			'manage_stock'     => array(
				'required'    => false,
				'type'        => 'boolean',
				'description' => \__( 'Whether stock management is enabled for this variation.', 'sgs-blocks' ),
			),
			'stock_quantity'   => array(
				'required'          => false,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'description'       => \__( 'Stock quantity (non-negative integer).', 'sgs-blocks' ),
			),
			'stock_status'     => array(
				'required'          => false,
				'type'              => 'string',
				'enum'              => array( 'instock', 'outofstock', 'onbackorder' ),
				'sanitize_callback' => 'sanitize_text_field',
				'description'       => \__( 'Stock status.', 'sgs-blocks' ),
			),
			'description'      => array(
				'required'          => false,
				'type'              => 'string',
				'sanitize_callback' => 'wp_kses_post',
				'description'       => \__( 'Variation description (HTML allowed).', 'sgs-blocks' ),
			),
			'global_unique_id' => array(
				'required'          => false,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => array( __CLASS__, 'validate_gtin' ),
				'description'       => \__( 'GTIN / global unique identifier (digits only).', 'sgs-blocks' ),
			),
		);
	}

	/**
	 * Args schema for the update_attributes route.
	 *
	 * @return array
	 */
	public static function attributes_args(): array {
		return array(
			'id'         => array(
				'required'          => true,
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
				'description'       => \__( 'Parent variable product ID.', 'sgs-blocks' ),
			),
			'attributes' => array(
				'required'    => true,
				'type'        => 'array',
				'description' => \__( 'Array of attribute objects.', 'sgs-blocks' ),
				'items'       => array(
					'type'       => 'object',
					'properties' => array(
						'taxonomy'  => array(
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
						),
						'options'   => array(
							'type'  => 'array',
							'items' => array( 'type' => 'string' ),
						),
						'variation' => array( 'type' => 'boolean' ),
						'visible'   => array( 'type' => 'boolean' ),
					),
				),
			),
		);
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

	/**
	 * Validate that a GTIN value contains only digits (0–9).
	 *
	 * @param mixed $value Raw input.
	 * @return bool
	 */
	public static function validate_gtin( $value ): bool {
		return '' === $value || (bool) \preg_match( '/^\d+$/', (string) $value );
	}

	/**
	 * Build the canonical variation response data array.
	 *
	 * @param \WC_Product_Variation $variation Saved variation.
	 * @return array
	 */
	public static function variation_response_data( \WC_Product_Variation $variation ): array {
		$data = array(
			'id'             => $variation->get_id(),
			'parent_id'      => $variation->get_parent_id(),
			'sku'            => $variation->get_sku(),
			'regular_price'  => $variation->get_regular_price(),
			'sale_price'     => $variation->get_sale_price(),
			'price'          => $variation->get_price(),
			'manage_stock'   => $variation->get_manage_stock(),
			'stock_quantity' => $variation->get_stock_quantity(),
			'stock_status'   => $variation->get_stock_status(),
			'description'    => $variation->get_description(),
			'attributes'     => $variation->get_attributes(),
		);

		if ( \method_exists( $variation, 'get_global_unique_id' ) ) {
			$data['global_unique_id'] = $variation->get_global_unique_id();
		}

		return $data;
	}
}
