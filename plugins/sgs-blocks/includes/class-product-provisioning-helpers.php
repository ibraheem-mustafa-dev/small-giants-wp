<?php
/**
 * SGS Product Provisioning — low-level taxonomy + term + snapshot helpers.
 *
 * Extracted from class-product-provisioning.php to keep every file under the
 * 300-line limit (code-quality.md rule). Product_Provisioning requires this
 * file before use; no external code should reference this class directly.
 *
 * @package SGS\Blocks
 * @since   1.7.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Low-level provisioning primitives: taxonomy resolution, term upsert,
 * parent-attribute snapshot capture/restore.
 *
 * @internal Used only by Product_Provisioning.
 */
final class Product_Provisioning_Helpers {

	// ── Taxonomy resolution ──────────────────────────────────────────────────

	/**
	 * Resolve or create a WooCommerce product-attribute taxonomy for the given
	 * human-readable name.
	 *
	 * Resolution order (conflict-safe; never touches sibling products):
	 *  1. Caller-supplied `$explicit_tax` if it resolves to an existing WC attr.
	 *  2. Slug derived from `$name` via wc_sanitize_taxonomy_name → pa_ prefix.
	 *  3. Create a new global WC attribute (via wc_create_attribute) and
	 *     immediately register the taxonomy for the current request so
	 *     wp_insert_term() can use it.
	 *
	 * Returns an array `['taxonomy' => string, 'created_attr_id' => int|null]`
	 * on success, or a \WP_Error on failure.
	 *
	 * @param string      $name         Human-readable attribute name (e.g. "Size").
	 * @param string|null $explicit_tax Optional pa_* taxonomy slug supplied by caller.
	 * @return array|\WP_Error
	 */
	public static function resolve_taxonomy( string $name, ?string $explicit_tax ) {
		// ── 1. Explicit taxonomy supplied by caller ──────────────────────────
		if ( null !== $explicit_tax && '' !== $explicit_tax ) {
			$tax = \sanitize_text_field( $explicit_tax );
			if ( \function_exists( 'wc_attribute_taxonomy_id_by_name' )
				&& \wc_attribute_taxonomy_id_by_name( $tax ) > 0 ) {
				return array(
					'taxonomy'        => $tax,
					'created_attr_id' => null,
				);
			}
			return new \WP_Error(
				'sgs_invalid_taxonomy',
				\sprintf(
					/* translators: %s: taxonomy slug. */
					\__( 'Supplied taxonomy does not exist as a WooCommerce attribute: %s', 'sgs-blocks' ),
					\esc_html( $tax )
				),
				array( 'status' => 400 )
			);
		}

		// ── 2. Derive slug from name; reuse if the taxonomy already exists ───
		if ( ! \function_exists( 'wc_sanitize_taxonomy_name' )
			|| ! \function_exists( 'wc_attribute_taxonomy_name' ) ) {
			return new \WP_Error(
				'sgs_wc_unavailable',
				\__( 'WooCommerce is not active.', 'sgs-blocks' ),
				array( 'status' => 503 )
			);
		}

		$slug = \wc_sanitize_taxonomy_name( $name );
		$tax  = \wc_attribute_taxonomy_name( $slug );

		if ( \wc_attribute_taxonomy_id_by_name( $tax ) > 0 ) {
			return array(
				'taxonomy'        => $tax,
				'created_attr_id' => null,
			);
		}

		// ── 3. Create the WC attribute + register taxonomy for this request ──
		if ( ! \function_exists( 'wc_create_attribute' ) ) {
			return new \WP_Error(
				'sgs_wc_unavailable',
				\__( 'WooCommerce attribute functions are not available.', 'sgs-blocks' ),
				array( 'status' => 503 )
			);
		}

		$attr_id = \wc_create_attribute(
			array(
				'name' => $name,
				'slug' => $slug,
				'type' => 'select',
			)
		);

		if ( \is_wp_error( $attr_id ) ) {
			return $attr_id;
		}

		// Register the new taxonomy for the remainder of this PHP request so that
		// wp_insert_term() can find it immediately (WC normally registers these on
		// init; we've just created one mid-request).
		\delete_transient( 'wc_attribute_taxonomies' );

		if ( ! \taxonomy_exists( $tax ) ) {
			\register_taxonomy(
				$tax,
				'product',
				array(
					'hierarchical' => false,
					'label'        => $name,
					'query_var'    => true,
					'rewrite'      => false,
					'public'       => true,
				)
			);
		}

		return array(
			'taxonomy'        => $tax,
			'created_attr_id' => (int) $attr_id,
		);
	}

	// ── Term upsert ──────────────────────────────────────────────────────────

	/**
	 * Ensure a term exists in the given taxonomy, reusing it if already present.
	 *
	 * NEVER deletes or renames existing terms; NEVER touches sibling products'
	 * `_product_attributes`.
	 *
	 * Returns `['term_id' => int, 'created' => bool]` on success, or \WP_Error.
	 *
	 * @param string $term_name The human-readable term name (e.g. "Small").
	 * @param string $taxonomy  The pa_* taxonomy slug.
	 * @return array|\WP_Error
	 */
	public static function ensure_term( string $term_name, string $taxonomy ) {
		// Try by name first (most reliable for human-supplied strings).
		$existing = \get_term_by( 'name', $term_name, $taxonomy );
		if ( $existing && ! \is_wp_error( $existing ) ) {
			return array(
				'term_id' => (int) $existing->term_id,
				'created' => false,
			);
		}

		// Try by slug (handles the case where the name differs in capitalisation).
		$slug     = \sanitize_title( $term_name );
		$existing = \get_term_by( 'slug', $slug, $taxonomy );
		if ( $existing && ! \is_wp_error( $existing ) ) {
			return array(
				'term_id' => (int) $existing->term_id,
				'created' => false,
			);
		}

		// Insert a new term.
		$result = \wp_insert_term( $term_name, $taxonomy );
		if ( \is_wp_error( $result ) ) {
			return $result;
		}

		return array(
			'term_id' => (int) $result['term_id'],
			'created' => true,
		);
	}

	// ── Parent-attribute snapshot ─────────────────────────────────────────────

	/**
	 * Capture the parent product's attribute + default-attribute state BEFORE any
	 * writes so that rollback can restore an exact copy.
	 *
	 * @param \WC_Product_Variable $product The parent product.
	 * @return array Snapshot array for use with restore_parent_snapshot().
	 */
	public static function capture_parent_snapshot( \WC_Product_Variable $product ): array {
		return array(
			'attributes'         => $product->get_attributes( 'edit' ),
			'default_attributes' => $product->get_default_attributes( 'edit' ),
		);
	}

	/**
	 * Restore the parent product to the state recorded by capture_parent_snapshot().
	 *
	 * Called during rollback only. Intentionally does not rethrow — a failed
	 * restore is logged but must not mask the original exception.
	 *
	 * @param array                $snapshot From capture_parent_snapshot().
	 * @param \WC_Product_Variable $product  The parent product (already loaded).
	 * @return void
	 */
	public static function restore_parent_snapshot( array $snapshot, \WC_Product_Variable $product ): void {
		try {
			$product->set_attributes( $snapshot['attributes'] );
			$product->set_default_attributes( $snapshot['default_attributes'] );
			$product->save();
		} catch ( \Throwable $e ) {
			\wc_get_logger()->error(
				'SGS Product_Provisioning rollback: failed to restore parent snapshot — ' . $e->getMessage(),
				array( 'source' => 'sgs-product-provisioning' )
			);
		}
	}
}
