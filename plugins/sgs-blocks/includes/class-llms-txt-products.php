<?php
/**
 * SGS llms-full.txt per-product expansion builder (FR-27-F2 llms clause, Spec 27 v6).
 *
 * Builds the /llms-full.txt content: the slim navigation header followed by a
 * per-product block (name, permalink, categories, inc-VAT price range,
 * attribute axes) for every catalogue-visible published product.
 *
 * Visibility filter (exfil guard): post_status='publish' + post_password=''
 * + catalog visibility NOT IN (hidden, search-only), enforced via
 * wc_get_products(['status'=>'publish','visibility'=>'catalog']) — WC's
 * WC_Product_Query maps visibility='catalog' to a product_visibility taxonomy
 * NOT IN ('exclude-from-catalog') tax_query, which excludes BOTH the
 * "Hidden" setting (terms exclude-from-catalog + exclude-from-search) AND the
 * "Search results only" setting (term exclude-from-catalog). The password gate
 * is a per-product post_password === '' check (WC_Product_Query exposes no
 * password argument).
 *
 * Price source: Product_Manifest::build() for variable products (SEC-1 single
 * source of truth); wc_get_price_including_tax() for simple products — the
 * SEC-1 grep gate applies to the schema/feed paths, and the spec explicitly
 * permits the direct read here.
 *
 * @package SGS\Blocks
 * @since   1.6.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// Own dependencies (shared-helper-must-require-its-own-deps): the slim header
// + line sanitiser come from the builders class; variable-product price ranges
// come from the manifest builder.
require_once __DIR__ . '/class-llms-txt-builders.php';
require_once __DIR__ . '/class-product-manifest.php';

/**
 * Class Llms_Txt_Products
 *
 * Static builders for the llms-full.txt per-product expansion. Called from
 * Llms_Txt (orchestrator).
 */
final class Llms_Txt_Products {

	/** Target byte cap for llms-full.txt before the truncation notice is appended. */
	private const FULL_CAP_BYTES = 700 * 1024;

	/** Products fetched per page while building (memory-bounded batching). */
	private const PER_PAGE = 50;

	/**
	 * Build the full product-expansion file.
	 *
	 * @return string Plain-text content, UTF-8 no BOM.
	 */
	public static function build_full(): string {
		// Start with the slim navigation header.
		$lines = array( Llms_Txt_Builders::build_slim() );

		if ( ! \function_exists( 'wc_get_products' ) ) {
			return implode( '', $lines );
		}

		$lines[] = '## Products';
		$lines[] = '';

		$byte_count = strlen( implode( "\n", $lines ) );
		$truncated  = false;
		$page       = 1;

		do {
			// visibility='catalog' → WC_Product_Query builds a tax_query
			// excluding the product_visibility term 'exclude-from-catalog':
			// products set to "Hidden" or "Search results only" both carry that
			// term, so neither can appear here. status='publish' excludes
			// draft / pending / private / trashed.
			$products = \wc_get_products(
				array(
					'status'     => 'publish',
					'visibility' => 'catalog',
					'limit'      => self::PER_PAGE,
					'page'       => $page,
					'return'     => 'objects',
					'orderby'    => 'date',
					'order'      => 'DESC',
				)
			);

			if ( empty( $products ) ) {
				break;
			}

			foreach ( $products as $product ) {
				// Exfil guard: skip password-protected products (WC_Product_Query
				// has no post_password argument, so this per-product check is the gate).
				$post = \get_post( $product->get_id() );
				if ( ! $post || '' !== $post->post_password ) {
					continue;
				}

				$product_lines = self::build_product_entry( $product );
				$chunk         = implode( "\n", $product_lines ) . "\n";

				if ( $byte_count + strlen( $chunk ) > self::FULL_CAP_BYTES ) {
					$truncated = true;
					break 2;
				}

				$lines[]     = $chunk;
				$byte_count += strlen( $chunk );
			}

			++$page;
			$batch_count = count( $products );

		} while ( self::PER_PAGE === $batch_count );

		if ( $truncated ) {
			$lines[] = '';
			$lines[] = '> Note: product list truncated at ~700 KB. See the shop page for the full catalogue.';
		}

		return implode( "\n", $lines );
	}

	/**
	 * Build the markdown block for a single WooCommerce product.
	 *
	 * @param \WC_Product $product WooCommerce product object.
	 * @return string[]
	 */
	private static function build_product_entry( \WC_Product $product ): array {
		$id        = $product->get_id();
		$name      = Llms_Txt_Builders::sanitise_line( $product->get_name() );
		$permalink = \get_permalink( $id );
		if ( ! $permalink ) {
			return array();
		}

		$lines   = array();
		$lines[] = '### ' . $name;
		$lines[] = 'URL: ' . \esc_url_raw( $permalink );

		// Categories.
		$cats = \wp_get_post_terms( $id, 'product_cat', array( 'fields' => 'names' ) );
		if ( ! \is_wp_error( $cats ) && ! empty( $cats ) ) {
			$lines[] = 'Categories: ' . implode( ', ', array_map( array( Llms_Txt_Builders::class, 'sanitise_line' ), $cats ) );
		}

		// Price range (inc-VAT).
		$price_line = self::build_price_line( $product );
		if ( $price_line ) {
			$lines[] = $price_line;
		}

		// Attribute axes (variable products only).
		if ( $product->is_type( 'variable' ) ) {
			$axes = self::build_axes_line( $product );
			if ( $axes ) {
				$lines[] = $axes;
			}
		}

		$lines[] = '';
		return $lines;
	}

	/**
	 * Build an inc-VAT price-range line for a product.
	 *
	 * Variable products: derived from the manifest's per-combo incMinor values
	 * (SEC-1 single source of truth). Simple products: direct
	 * wc_get_price_including_tax() read (explicitly permitted here by the spec).
	 *
	 * @param \WC_Product $product WooCommerce product object.
	 * @return string Price line or empty string.
	 */
	private static function build_price_line( \WC_Product $product ): string {
		$symbol   = \function_exists( 'get_woocommerce_currency_symbol' )
			? html_entity_decode( \get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8' )
			: '';
		$decimals = \function_exists( 'wc_get_price_decimals' ) ? \wc_get_price_decimals() : 2;

		if ( $product->is_type( 'variable' ) ) {
			$manifest = Product_Manifest::build( $product->get_id() );
			if ( $manifest && ! empty( $manifest['combos'] ) ) {
				$prices = array();
				foreach ( $manifest['combos'] as $combo ) {
					if ( isset( $combo['incMinor'] ) ) {
						$prices[] = (int) $combo['incMinor'];
					}
				}
				if ( ! empty( $prices ) ) {
					$multiplier = (int) round( 10 ** $decimals );
					$min        = number_format( min( $prices ) / $multiplier, $decimals );
					$max        = number_format( max( $prices ) / $multiplier, $decimals );
					if ( $min === $max ) {
						return 'Price (inc. VAT): ' . $symbol . $min;
					}
					return 'Price range (inc. VAT): ' . $symbol . $min . '–' . $symbol . $max;
				}
			}
		}

		// Simple / external / grouped fallback.
		if ( \function_exists( 'wc_get_price_including_tax' ) ) {
			$inc = \wc_get_price_including_tax( $product );
			if ( $inc > 0 ) {
				return 'Price (inc. VAT): ' . $symbol . number_format( $inc, $decimals );
			}
		}

		return '';
	}

	/**
	 * Build a one-line attribute-axes summary for a variable product.
	 *
	 * @param \WC_Product $product Variable product object.
	 * @return string
	 */
	private static function build_axes_line( \WC_Product $product ): string {
		$raw_attrs = $product->get_variation_attributes();
		if ( empty( $raw_attrs ) ) {
			return '';
		}

		$axes = array();
		foreach ( $raw_attrs as $taxonomy => $slugs ) {
			$label  = \function_exists( 'wc_attribute_label' )
				? Llms_Txt_Builders::sanitise_line( \wc_attribute_label( $taxonomy ) )
				: str_replace( 'pa_', '', $taxonomy );
			$values = array_filter( $slugs, fn( $s ) => '' !== $s );
			if ( ! empty( $values ) ) {
				$term_labels = array();
				foreach ( $values as $slug ) {
					$term          = \get_term_by( 'slug', $slug, $taxonomy );
					$term_labels[] = ( $term && ! \is_wp_error( $term ) )
						? Llms_Txt_Builders::sanitise_line( $term->name )
						: Llms_Txt_Builders::sanitise_line( $slug );
				}
				$axes[] = $label . ': ' . implode( ', ', $term_labels );
			}
		}

		return $axes ? 'Options — ' . implode( ' | ', $axes ) : '';
	}
}
