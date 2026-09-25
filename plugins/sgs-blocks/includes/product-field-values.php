<?php
/**
 * Product field values for the `sgs-product/field` bindings source beyond the
 * core set (price, title, image, stock, short description): brand, SKU, any
 * product attribute and allowed product meta.
 *
 * Keys use dot notation, like the `sgs/site-info` source:
 *   brand                     first term of the product_brand taxonomy
 *   sku                       the product's SKU
 *   attribute.<taxonomy>      the product's terms for that attribute (e.g. attribute.pa_material)
 *   meta.<meta_key>           a scalar product meta value (e.g. meta._sgs_frame_eye)
 *
 * Meta is limited to public keys and keys starting `_sgs_` (filter
 * `sgs_product_field_meta_allowed`), so WooCommerce's internal meta never
 * reaches the page through a binding.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_product_field_meta_allowed' ) ) {
	/**
	 * Whether a product meta key may be shown through a binding.
	 *
	 * @param string $meta_key Meta key.
	 * @return bool
	 */
	function sgs_product_field_meta_allowed( string $meta_key ): bool {
		$allowed = '' !== $meta_key && ( '_' !== $meta_key[0] || 0 === strpos( $meta_key, '_sgs_' ) );
		return (bool) apply_filters( 'sgs_product_field_meta_allowed', $allowed, $meta_key );
	}
}

if ( ! function_exists( 'sgs_product_field_value' ) ) {
	/**
	 * Resolve one of the extended product field keys.
	 *
	 * @param \WC_Product $product The product.
	 * @param string      $key     Field key (see file doc).
	 * @return string Plain text value ('' when absent), not yet escaped.
	 */
	function sgs_product_field_value( $product, string $key ): string {
		$dot    = strpos( $key, '.' );
		$prefix = false === $dot ? $key : substr( $key, 0, $dot );
		$name   = false === $dot ? '' : sanitize_key( substr( $key, $dot + 1 ) );

		switch ( $prefix ) {
			case 'brand':
				$taxonomy = (string) apply_filters( 'sgs_product_card_brand_taxonomy', 'product_brand' );
				$terms    = taxonomy_exists( $taxonomy ) ? get_the_terms( $product->get_id(), $taxonomy ) : false;
				return is_array( $terms ) && ! empty( $terms ) ? (string) $terms[0]->name : '';

			case 'sku':
				return (string) $product->get_sku();

			case 'attribute':
				return '' !== $name ? wp_strip_all_tags( (string) $product->get_attribute( $name ) ) : '';

			case 'meta':
				if ( '' === $name || ! sgs_product_field_meta_allowed( $name ) ) {
					return '';
				}
				$value = get_post_meta( $product->get_id(), $name, true );
				return is_scalar( $value ) ? (string) $value : '';
		}
		return '';
	}
}

if ( ! function_exists( 'sgs_product_field_list' ) ) {
	/**
	 * The fields the editor's binding picker offers: brand, SKU, every product
	 * attribute taxonomy and the allowed meta keys products on this site use.
	 *
	 * @return array<string, array{label: string, type: string}>
	 */
	function sgs_product_field_list(): array {
		$fields = array(
			'title'             => array( 'label' => __( 'Product name', 'sgs-blocks' ) ),
			'brand'             => array( 'label' => __( 'Brand', 'sgs-blocks' ) ),
			'sku'               => array( 'label' => __( 'SKU', 'sgs-blocks' ) ),
			'short_description' => array( 'label' => __( 'Short description', 'sgs-blocks' ) ),
			'stock_status'      => array( 'label' => __( 'Stock status', 'sgs-blocks' ) ),
		);
		if ( function_exists( 'wc_get_attribute_taxonomies' ) ) {
			foreach ( wc_get_attribute_taxonomies() as $tax ) {
				$fields[ 'attribute.pa_' . $tax->attribute_name ] = array(
					/* translators: %s is a product attribute name, e.g. "Material". */
					'label' => sprintf( __( 'Attribute: %s', 'sgs-blocks' ), $tax->attribute_label ),
				);
			}
		}

		global $wpdb;
		$keys = $wpdb->get_col( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- editor-only, once per editor load.
			$wpdb->prepare(
				"SELECT DISTINCT pm.meta_key FROM {$wpdb->postmeta} pm INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id WHERE p.post_type = %s ORDER BY pm.meta_key LIMIT 300",
				'product'
			)
		);
		foreach ( (array) $keys as $meta_key ) {
			$meta_key = (string) $meta_key;
			if ( sgs_product_field_meta_allowed( $meta_key ) ) {
				$label                         = ucfirst( trim( str_replace( array( '_sgs_', '_' ), array( '', ' ' ), $meta_key ) ) );
				$fields[ 'meta.' . $meta_key ] = array(
					/* translators: %s is a product field name, e.g. "Frame eye". */
					'label' => sprintf( __( 'Field: %s', 'sgs-blocks' ), $label ),
				);
			}
		}

		foreach ( $fields as $k => $field ) {
			$fields[ $k ]['type'] = 'string';
		}
		return $fields;
	}
}
