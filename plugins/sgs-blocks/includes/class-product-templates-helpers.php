<?php
/**
 * SGS Product Templates — internal helpers for snapshot + persist.
 *
 * Extracted from class-product-templates.php to keep both files under the
 * 300-line limit (code-quality.md rule). The APPLY-side helpers (R2 dispatch,
 * presentation/term meta writes) live in class-product-templates-apply.php.
 * No external code should reference this class directly.
 *
 * @package SGS\Blocks
 * @since   1.8.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-product-templates-envelope.php';
require_once __DIR__ . '/class-product-templates-validators.php';
require_once __DIR__ . '/class-product-templates-cpt.php';
require_once __DIR__ . '/class-configurator-meta.php';

/**
 * Internal helpers: snapshot a product into an envelope and persist a
 * template CPT post.
 *
 * @internal Used only by Product_Templates.
 */
final class Product_Templates_Helpers {

	// ── Snapshot ──────────────────────────────────────────────────────────────

	/**
	 * Read a variable product and build its portable envelope.
	 *
	 * Collects attribute/term slugs + names + swatch colours (not swatch image
	 * IDs — those are site-local attachment IDs), product-level presentation
	 * meta (allow-listed keys only), the primary variesBy value, and the bare
	 * pack-size axis slug (pa_ prefix stripped for portability).
	 *
	 * @param \WC_Product_Variable $product Variable product object.
	 * @return array|\WP_Error Envelope array on success; WP_Error on failure.
	 */
	public static function snapshot_product( \WC_Product_Variable $product ) {
		if ( ! \function_exists( 'wc_sanitize_taxonomy_name' )
			|| ! \function_exists( 'wc_attribute_taxonomy_name' ) ) {
			return new \WP_Error(
				'sgs_wc_unavailable',
				\__( 'WooCommerce attribute functions unavailable.', 'sgs-blocks' ),
				array( 'status' => 503 )
			);
		}

		$product_id = $product->get_id();

		// ── Attributes + terms ────────────────────────────────────────────────
		$envelope_attrs = array();
		foreach ( $product->get_attributes() as $tax_slug => $attr_obj ) {
			// Only variation attributes backed by a real pa_* taxonomy.
			if ( ! $attr_obj->get_variation() || ! \taxonomy_exists( $tax_slug ) ) {
				continue;
			}

			// Bare slug: strip pa_ prefix (envelope stores bare slugs, not pa_ prefixed).
			$bare_slug = ( 0 === strpos( $tax_slug, 'pa_' ) ) ? substr( $tax_slug, 3 ) : $tax_slug;

			// Resolve human-readable attribute name via the WC attribute registry.
			$attr_name = self::resolve_attr_name( $tax_slug, $bare_slug );

			// Collect terms: slug + name + swatch colour (image ID excluded — site-local).
			$terms           = array();
			$option_term_ids = $attr_obj->get_options();
			foreach ( $option_term_ids as $term_id ) {
				$term = \get_term( (int) $term_id, $tax_slug );
				if ( ! $term || \is_wp_error( $term ) ) {
					continue;
				}

				// swatch_color: portable hex value; _sgs_swatch_image_id is site-local (excluded).
				$swatch_color = \get_term_meta( $term->term_id, '_sgs_swatch_color', true );
				$swatch_out   = ( '' !== $swatch_color && null !== $swatch_color )
					? Product_Templates_Validators::clean_string( (string) $swatch_color )
					: null;

				// variesby: export per-term Google variesBy value.
				$variesby_raw = \get_term_meta( $term->term_id, '_sgs_variesby_value', true );
				$variesby_out = ( '' !== $variesby_raw && null !== $variesby_raw ) ? (string) $variesby_raw : null;

				// unit_label + unit_divisor: per-variation meta keys are stored per-variation
				// not per-term; we record null here (variation-level data is not portable).
				$terms[] = array(
					'name'         => $term->name,
					'slug'         => $term->slug,
					'swatch_color' => $swatch_out,
					'variesby'     => $variesby_out,
					'unit_label'   => null, // Variation-level; set per-variation after apply.
					'unit_divisor' => null, // Variation-level; set per-variation after apply.
				);
			}

			$envelope_attrs[] = array(
				'name'  => $attr_name,
				'slug'  => $bare_slug,
				'terms' => $terms,
			);
		}

		// ── Presentation meta ─────────────────────────────────────────────────
		$presentation = array();
		foreach ( Product_Templates_Envelope::PRODUCT_PRESENTATION_KEYS as $key ) {
			$value = \get_post_meta( $product_id, $key, true );
			if ( '' !== $value && false !== $value ) {
				$presentation[ $key ] = $value;
			}
		}

		// ── variesBy: first non-empty value from term meta on the first axis ──
		$varies_by = null;
		foreach ( $product->get_attributes() as $tax_slug => $attr_obj ) {
			if ( ! $attr_obj->get_variation() ) {
				continue;
			}
			$options = $attr_obj->get_options();
			if ( empty( $options ) ) {
				continue;
			}
			$vb = \get_term_meta( (int) $options[0], '_sgs_variesby_value', true );
			if ( '' !== $vb && false !== $vb ) {
				$varies_by = $vb;
				break;
			}
		}

		// ── Pack-size axis slug (bare, without pa_ prefix) ────────────────────
		$pack_axis_raw  = \get_post_meta( $product_id, '_sgs_pack_size_axis', true );
		$pack_size_slug = null;
		if ( '' !== $pack_axis_raw && false !== $pack_axis_raw ) {
			$pack_size_slug = ( 0 === strpos( (string) $pack_axis_raw, 'pa_' ) )
				? substr( (string) $pack_axis_raw, 3 )
				: (string) $pack_axis_raw;
		}

		$generator = 'sgs-blocks/' . ( \defined( 'SGS_BLOCKS_VERSION' ) ? SGS_BLOCKS_VERSION : '0.0.0' );

		return Product_Templates_Envelope::build(
			$generator,
			$envelope_attrs,
			$presentation,
			$varies_by,
			$pack_size_slug
		);
	}

	// ── Persist ───────────────────────────────────────────────────────────────

	/**
	 * Create a new sgs_product_template post storing the envelope in post_content.
	 *
	 * The post_content field is the single source of truth for the envelope — no parallel
	 * meta copies (duplicated data drifts, per project rule).
	 *
	 * @param string $title    Human-readable template title.
	 * @param array  $envelope Validated, sanitised envelope array.
	 * @return int|\WP_Error Post ID on success; WP_Error on failure.
	 */
	public static function save_template( string $title, array $envelope ) {
		$json = \wp_json_encode( $envelope );
		if ( false === $json ) {
			return new \WP_Error(
				'sgs_encode_failed',
				\__( 'Failed to encode template envelope.', 'sgs-blocks' ),
				array( 'status' => 500 )
			);
		}

		$post_id = \wp_insert_post(
			array(
				'post_type'    => Product_Templates_CPT::POST_TYPE,
				'post_title'   => $title,
				'post_content' => $json,
				'post_status'  => 'publish',
			),
			true // Return WP_Error on failure.
		);

		return $post_id;
	}

	// ── Private utility ───────────────────────────────────────────────────────

	/**
	 * Resolve a human-readable attribute name for a pa_* taxonomy slug.
	 *
	 * Tries the WC attribute registry first; falls back to title-casing the
	 * bare slug.
	 *
	 * @param string $tax_slug  Full taxonomy slug (e.g. pa_size).
	 * @param string $bare_slug Slug without pa_ prefix (e.g. size).
	 * @return string
	 */
	private static function resolve_attr_name( string $tax_slug, string $bare_slug ): string {
		if ( \function_exists( 'wc_attribute_taxonomy_id_by_name' ) ) {
			$attr_id_val = \wc_attribute_taxonomy_id_by_name( $tax_slug );
			if ( $attr_id_val > 0 && \function_exists( 'wc_get_attribute' ) ) {
				$wc_attr = \wc_get_attribute( $attr_id_val );
				if ( $wc_attr && ! \is_wp_error( $wc_attr ) ) {
					return $wc_attr->name;
				}
			}
		}
		// Fallback: title-case the bare slug.
		return ucwords( str_replace( array( '-', '_' ), ' ', $bare_slug ) );
	}
}
