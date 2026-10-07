<?php
/**
 * Bound product values that follow the variation the shopper picks.
 *
 * A value bound through `sgs-product/field` paints the SELECTED variation's
 * value on first paint (the product's default combination, or the one a
 * `?attribute_pa_<axis>=<slug>` link opens on), and the `@sgs/bound-sync`
 * module swaps it when `sgs/product-card`'s `sgs-variation-change` event
 * announces another variation.
 *
 * Only the value itself changes: the binding wraps a non-empty value in
 * `<span class="sgs-bound" data-sgs-bound-source data-sgs-bound-scope
 * data-sgs-bound-key>`, so a block's icon, link or input is never touched.
 * Only the (block, attribute) pairs in FOLLOW_TARGETS are wrapped, because
 * they print the value as text; a plain-string attribute (alt, placeholder,
 * URL) is never wrapped and does not follow. An empty value renders nothing,
 * as it always has.
 *
 * Which keys follow:
 *   meta.<key>                 per variation, once any variation carries the
 *                              key; while none does, the parent's value stands
 *   sku, dimensions.*, weight  per variation (WooCommerce's getters inherit
 *                              the parent's value where a variation has none)
 *   attribute.<taxonomy>       the picked term's label, resolved in the browser
 *                              from the event's slugs
 * Every other key (title, brand, price, stock, description, images) is
 * product-level and never varies here; the buybox store owns price and stock.
 *
 * The per-variation values reach the browser through core's
 * `script_module_data_@sgs/bound-sync` channel, built from the cached product
 * manifest, only for products whose values were bound on this page.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-product-manifest.php';
require_once __DIR__ . '/product-field-values.php';

/**
 * Class Product_Field_Variations
 */
final class Product_Field_Variations {

	public const MODULE_ID = '@sgs/bound-sync';

	public const SOURCE = 'sgs-product/field';

	private const MODULE_PATH = 'build/shared/bound-sync.js';

	/**
	 * Bound (block => attributes) pairs whose value prints as text.
	 */
	public const FOLLOW_TARGETS = array(
		'sgs/text'              => array( 'text' ),
		'sgs/heading'           => array( 'content' ),
		'sgs/label'             => array( 'text' ),
		'sgs/button'            => array( 'label' ),
		'sgs/diagram-dimension' => array( 'value' ),
	);

	/**
	 * Keys requested on this page: product id => key => true.
	 *
	 * @var array<int, array<string, bool>>
	 */
	private static $requests = array();

	/**
	 * Per-request manifest cache (preselect applied): product id => manifest|null.
	 *
	 * @var array<int, array|null>
	 */
	private static $manifests = array();

	/**
	 * Per-request "any variation carries this meta" cache.
	 *
	 * @var array<string, bool>
	 */
	private static $carried = array();

	/**
	 * Whether the shared CSS has been collected on this page.
	 *
	 * @var bool
	 */
	private static $css_collected = false;

	/**
	 * Wire WordPress hooks. Called once from SGS_Blocks.
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_module' ), 20 );
		\add_filter( 'script_module_data_' . self::MODULE_ID, array( __CLASS__, 'module_data' ) );
	}

	/**
	 * Register the `@sgs/bound-sync` script module. A build without the file
	 * registers nothing, so the page keeps its server-rendered values.
	 */
	public static function register_module(): void {
		$file = SGS_BLOCKS_PATH . self::MODULE_PATH;
		if ( ! \file_exists( $file ) ) {
			return;
		}
		$version    = SGS_BLOCKS_VERSION;
		$asset_file = SGS_BLOCKS_PATH . 'build/shared/bound-sync.asset.php';
		if ( \file_exists( $asset_file ) ) {
			$asset = include $asset_file;
			if ( \is_array( $asset ) && ! empty( $asset['version'] ) ) {
				$version = (string) $asset['version'];
			}
		}
		\wp_register_script_module( self::MODULE_ID, SGS_BLOCKS_URL . self::MODULE_PATH, array(), $version );
	}

	/**
	 * Whether a bound attribute on this block prints its value as text.
	 *
	 * @param mixed  $block     Block instance (\WP_Block) or anything else.
	 * @param string $attribute Bound attribute name.
	 * @return bool
	 */
	public static function follows( $block, string $attribute ): bool {
		if ( ! $block instanceof \WP_Block ) {
			return false;
		}
		return \in_array( $attribute, self::FOLLOW_TARGETS[ $block->name ] ?? array(), true );
	}

	/**
	 * Whether a field key can differ between a product's variations.
	 *
	 * @param string $key Field key.
	 * @return bool
	 */
	public static function varies( string $key ): bool {
		$dot    = \strpos( $key, '.' );
		$prefix = false === $dot ? $key : \substr( $key, 0, $dot );
		return \in_array( $prefix, array( 'meta', 'sku', 'attribute', 'dimensions', 'weight' ), true );
	}

	/**
	 * The product's manifest with the URL preselect applied, or null for a
	 * product that is not a published variable product.
	 *
	 * @param int $product_id Product ID.
	 * @return array|null
	 */
	private static function manifest( int $product_id ): ?array {
		if ( ! \array_key_exists( $product_id, self::$manifests ) ) {
			$manifest = Product_Manifest::build( $product_id );
			if ( \is_array( $manifest ) && \function_exists( 'sgs_preselect_apply_to_manifest' ) ) {
				$manifest = \sgs_preselect_apply_to_manifest( $manifest );
			}
			self::$manifests[ $product_id ] = \is_array( $manifest ) && ! empty( $manifest['combos'] ) ? $manifest : null;
		}
		return self::$manifests[ $product_id ];
	}

	/**
	 * Every variation id the manifest can announce.
	 *
	 * @param array $manifest Product manifest.
	 * @return int[]
	 */
	private static function variation_ids( array $manifest ): array {
		$ids = array();
		foreach ( $manifest['combos'] as $combo ) {
			$vid = (int) ( $combo['variationId'] ?? 0 );
			if ( $vid > 0 ) {
				$ids[ $vid ] = $vid;
			}
		}
		return \array_values( $ids );
	}

	/**
	 * Whether any of the product's variations carries a meta key.
	 *
	 * @param int    $product_id Product ID.
	 * @param array  $manifest   Product manifest.
	 * @param string $meta_key   Meta key.
	 * @return bool
	 */
	private static function variations_carry( int $product_id, array $manifest, string $meta_key ): bool {
		$cache_key = $product_id . '|' . $meta_key;
		if ( ! isset( self::$carried[ $cache_key ] ) ) {
			$carried = false;
			foreach ( self::variation_ids( $manifest ) as $vid ) {
				if ( \metadata_exists( 'post', $vid, $meta_key ) ) {
					$carried = true;
					break;
				}
			}
			self::$carried[ $cache_key ] = $carried;
		}
		return self::$carried[ $cache_key ];
	}

	/**
	 * A key's value for one variation, or null when the parent's value stands.
	 *
	 * @param int    $product_id   Parent product ID.
	 * @param array  $manifest     Product manifest.
	 * @param int    $variation_id Variation ID.
	 * @param string $key          Field key (not attribute.*).
	 * @return string|null Plain text, not yet escaped.
	 */
	private static function variation_value( int $product_id, array $manifest, int $variation_id, string $key ): ?string {
		if ( 0 === \strpos( $key, 'meta.' ) ) {
			$meta_key = \sanitize_key( \substr( $key, 5 ) );
			if ( '' === $meta_key || ! \sgs_product_field_meta_allowed( $meta_key ) || ! self::variations_carry( $product_id, $manifest, $meta_key ) ) {
				return null;
			}
			$value = \get_post_meta( $variation_id, $meta_key, true );
			return \is_scalar( $value ) ? (string) $value : '';
		}
		$variation = \wc_get_product( $variation_id );
		return $variation ? \sgs_product_field_value( $variation, $key ) : null;
	}

	/**
	 * The label of the selected combination's term on one attribute axis.
	 *
	 * @param array  $manifest Product manifest.
	 * @param string $taxonomy Attribute taxonomy.
	 * @return string|null Null when the taxonomy is not a picker axis.
	 */
	private static function axis_label( array $manifest, string $taxonomy ): ?string {
		$slug = (string) ( $manifest['defaultAxes'][ $taxonomy ] ?? '' );
		foreach ( (array) ( $manifest['axes'] ?? array() ) as $axis ) {
			if ( ( $axis['taxonomy'] ?? '' ) !== $taxonomy ) {
				continue;
			}
			foreach ( (array) ( $axis['terms'] ?? array() ) as $term ) {
				if ( ( $term['slug'] ?? '' ) === $slug ) {
					return (string) ( $term['label'] ?? '' );
				}
			}
		}
		return null;
	}

	/**
	 * The selected variation's value for a key, or null when the product does
	 * not vary on it (the caller then resolves the parent product as before).
	 *
	 * @param int    $product_id Product ID.
	 * @param string $key        Field key.
	 * @return string|null Plain text, not yet escaped.
	 */
	public static function selected_value( int $product_id, string $key ): ?string {
		if ( ! self::varies( $key ) ) {
			return null;
		}
		$manifest = self::manifest( $product_id );
		if ( null === $manifest ) {
			return null;
		}
		if ( 0 === \strpos( $key, 'attribute.' ) ) {
			return self::axis_label( $manifest, \sanitize_key( \substr( $key, 10 ) ) );
		}
		$vid = (int) ( $manifest['combos'][ $manifest['defaultKey'] ?? '' ]['variationId'] ?? 0 );
		return $vid > 0 ? self::variation_value( $product_id, $manifest, $vid, $key ) : null;
	}

	/**
	 * Record that a key is bound on this page for a product, so its
	 * per-variation values are published and the module is loaded.
	 *
	 * @param int    $product_id Product ID.
	 * @param string $key        Field key.
	 */
	public static function request( int $product_id, string $key ): void {
		if ( ! sgs_is_frontend_render() || ! self::varies( $key ) || null === self::manifest( $product_id ) ) {
			return;
		}
		self::$requests[ $product_id ][ $key ] = true;
		\wp_enqueue_script_module( self::MODULE_ID );
		if ( ! self::$css_collected ) {
			self::$css_collected = true;
			sgs_collect_css(
				'.sgs-bound[data-sgs-bound-empty]{display:none!important}'
				. '@media (prefers-reduced-motion:no-preference){'
				. '.sgs-bound[data-sgs-bound-changed]{animation:sgs-bound-in var(--wp--custom--duration--medium,300ms) var(--wp--custom--easing--ease-out,ease-out)}'
				. '@keyframes sgs-bound-in{from{opacity:0}to{opacity:1}}}'
			);
		}
	}

	/**
	 * The marker attributes for a followed value (escaped, leading space).
	 *
	 * @param int    $product_id Product ID.
	 * @param string $key        Field key.
	 * @return string
	 */
	public static function marker_attrs( int $product_id, string $key ): string {
		return ' data-sgs-bound-source="' . \esc_attr( self::SOURCE ) . '"'
			. ' data-sgs-bound-scope="' . \esc_attr( (string) $product_id ) . '"'
			. ' data-sgs-bound-key="' . \esc_attr( $key ) . '"';
	}

	/**
	 * Wrap an already-escaped value so the module can swap it.
	 *
	 * @param string $escaped_value Escaped value.
	 * @param int    $product_id    Product ID.
	 * @param string $key           Field key.
	 * @return string
	 */
	public static function wrap( string $escaped_value, int $product_id, string $key ): string {
		return '<span class="sgs-bound"' . self::marker_attrs( $product_id, $key ) . '>' . $escaped_value . '</span>';
	}

	/**
	 * Publish the per-variation values for every product bound on this page.
	 *
	 * Shape: { sources: { "sgs-product/field": { "<productId>": {
	 *   values: { "<variationId>": { "<key>": "<value>" } },
	 *   labels: { "<taxonomy>": { "<slug>": "<label>" } } } } } }
	 * A key is published only when its values differ between variations.
	 *
	 * @param array $data Existing module data.
	 * @return array
	 */
	public static function module_data( $data ): array {
		$data = \is_array( $data ) ? $data : array();
		foreach ( self::$requests as $product_id => $keys ) {
			$manifest = self::manifest( (int) $product_id );
			if ( null === $manifest ) {
				continue;
			}
			$vids = self::variation_ids( $manifest );
			\update_meta_cache( 'post', $vids );
			$entry = array(
				'values' => array(),
				'labels' => array(),
			);
			foreach ( \array_keys( $keys ) as $key ) {
				if ( 0 === \strpos( $key, 'attribute.' ) ) {
					$taxonomy = \sanitize_key( \substr( $key, 10 ) );
					foreach ( (array) ( $manifest['axes'] ?? array() ) as $axis ) {
						if ( ( $axis['taxonomy'] ?? '' ) === $taxonomy ) {
							foreach ( (array) ( $axis['terms'] ?? array() ) as $term ) {
								$entry['labels'][ $taxonomy ][ (string) $term['slug'] ] = (string) $term['label'];
							}
						}
					}
					continue;
				}
				$per_vid = array();
				foreach ( $vids as $vid ) {
					$value = self::variation_value( (int) $product_id, $manifest, $vid, $key );
					if ( null !== $value ) {
						$per_vid[ $vid ] = $value;
					}
				}
				if ( \count( \array_unique( $per_vid ) ) < 2 ) {
					continue;
				}
				foreach ( $per_vid as $vid => $value ) {
					$entry['values'][ (string) $vid ][ $key ] = $value;
				}
			}
			if ( ! empty( $entry['values'] ) || ! empty( $entry['labels'] ) ) {
				$data['sources'][ self::SOURCE ][ (string) $product_id ] = $entry;
			}
		}
		return $data;
	}
}
