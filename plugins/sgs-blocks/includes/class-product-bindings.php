<?php
/**
 * SGS Product Block Bindings source — `sgs-product/field`.
 *
 * Registers a single Block Bindings source that resolves product field
 * values for the `sgs/product-card` Bound mode. Routes to WooCommerce
 * (when active) or the `sgs_product` CPT as the data back-end.
 *
 * Source registration: `init` hook, priority 15 (after CPT registration at 5).
 *
 * Usage in block markup:
 *   metadata.bindings = { src: { source: 'sgs-product/field',
 *                                args: { key: 'price', source: 'auto' } } }
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Product_Bindings
 *
 * Registers the `sgs-product/field` Block Bindings source and provides
 * the shared product-data resolver used by render.php for Bound mode.
 */
final class Product_Bindings {

	/**
	 * Wire WordPress hooks. Called once from SGS_Blocks constructor.
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_source' ), 15 );
	}

	/**
	 * Register the `sgs-product/field` Block Bindings source.
	 *
	 * `uses_context` declares which block-context keys this source reads,
	 * allowing WordPress to inject them into the `get_value_callback`.
	 */
	public static function register_source(): void {
		if ( ! \function_exists( 'register_block_bindings_source' ) ) {
			// Block Bindings API requires WP 6.5+. Silent no-op on older installs.
			return;
		}

		\register_block_bindings_source(
			'sgs-product/field',
			array(
				'label'              => \__( 'SGS Product Field', 'sgs-blocks' ),
				'uses_context'       => array( 'postId', 'postType' ),
				'get_value_callback' => array( __CLASS__, 'get_value' ),
			)
		);
	}

	/**
	 * Resolve a product field value for the given block context + source_args.
	 *
	 * @param array     $source_args Array of source arguments.
	 *     Supported keys: price, title, image_url, image_alt, stock_status,
	 *     short_description. Optional: source ('wc'|'cpt'|'auto'), product_id.
	 * @param \WP_Block $block       Block instance providing context.
	 * @param string    $attribute   The bound attribute name (unused; for signature compat).
	 * @return mixed Resolved value, or empty string on failure.
	 */
	public static function get_value( array $source_args, $block, $attribute ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
		$key        = isset( $source_args['key'] ) ? \sanitize_key( $source_args['key'] ) : '';
		$source     = isset( $source_args['source'] ) ? \sanitize_key( $source_args['source'] ) : 'auto';
		$product_id = isset( $source_args['product_id'] )
			? \absint( $source_args['product_id'] )
			: 0;

		// Fall back to the block's context postId if no explicit product_id.
		if ( 0 === $product_id && ! empty( $block->context['postId'] ) ) {
			$product_id = \absint( $block->context['postId'] );
		}

		if ( 0 === $product_id || '' === $key ) {
			return '';
		}

		// Route: WC branch when source='wc', or when source='auto' and WC is active.
		$use_wc = ( 'wc' === $source )
			|| ( 'auto' === $source && \function_exists( 'wc_get_product' ) );

		if ( $use_wc ) {
			return self::resolve_wc_field( $product_id, $key );
		}

		return self::resolve_cpt_field( $product_id, $key );
	}

	// ── WooCommerce branch ────────────────────────────────────────────────────

	/**
	 * Resolve a field value from a WooCommerce product.
	 *
	 * @param int    $product_id WC product ID.
	 * @param string $key        Field key.
	 * @return string Escaped field value, or empty string if unavailable.
	 */
	private static function resolve_wc_field( int $product_id, string $key ): string {
		$product = \wc_get_product( $product_id );
		if ( ! $product ) {
			return '';
		}

		switch ( $key ) {
			case 'price':
				// get_price_html() returns variable-product ranges (e.g. "£8.00–£20.00")
				// and is already HTML-formatted. Allowed HTML tags only.
				return \wp_kses_post( $product->get_price_html() );

			case 'title':
				return \esc_html( $product->get_name() );

			case 'image_url':
				$image_id = $product->get_image_id();
				if ( ! $image_id ) {
					return \esc_url( \wc_placeholder_img_src( 'woocommerce_thumbnail' ) );
				}
				$url = \wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' );
				return $url ? \esc_url( $url ) : '';

			case 'image_alt':
				$image_id = $product->get_image_id();
				if ( ! $image_id ) {
					return \esc_attr( $product->get_name() );
				}
				$alt = \get_post_meta( $image_id, '_wp_attachment_image_alt', true );
				return $alt ? \esc_attr( $alt ) : \esc_attr( $product->get_name() );

			case 'stock_status':
				$availability = $product->get_availability();
				return isset( $availability['availability'] )
					? \esc_html( $availability['availability'] )
					: '';

			case 'short_description':
				return \wp_kses_post( $product->get_short_description() );
		}

		return '';
	}

	// ── SGS CPT branch ────────────────────────────────────────────────────────

	/**
	 * Resolve a field value from an `sgs_product` CPT post.
	 *
	 * Uses the public meta keys registered in class-product-cpt.php.
	 * Leading-underscore keys (e.g. `_sgs_variation_sets`) are not
	 * surfaced here — they are read directly in render.php.
	 *
	 * @param int    $product_id Post ID.
	 * @param string $key        Field key.
	 * @return string Escaped field value, or empty string if unavailable.
	 */
	private static function resolve_cpt_field( int $product_id, string $key ): string {
		$post = \get_post( $product_id );
		if ( ! $post || Product_CPT::POST_TYPE !== $post->post_type ) {
			return '';
		}

		switch ( $key ) {
			case 'price':
				$price = \get_post_meta( $product_id, 'sgs_price', true );
				$note  = \get_post_meta( $product_id, 'sgs_price_note', true );
				// C1 (QC): delegate to shared formatter — no duplication.
				return self::format_cpt_price_html( (string) $price, (string) $note );

			case 'title':
				return \esc_html( \get_the_title( $product_id ) );

			case 'image_url':
				$url = \get_the_post_thumbnail_url( $product_id, 'woocommerce_thumbnail' );
				if ( ! $url ) {
					$url = \get_the_post_thumbnail_url( $product_id, 'medium' );
				}
				return $url ? \esc_url( $url ) : '';

			case 'image_alt':
				$thumb_id = \get_post_thumbnail_id( $product_id );
				if ( $thumb_id ) {
					$alt = \get_post_meta( $thumb_id, '_wp_attachment_image_alt', true );
					if ( $alt ) {
						return \esc_attr( $alt );
					}
				}
				return \esc_attr( \get_the_title( $product_id ) );

			case 'stock_status':
				// CPT has no stock concept — return empty so the card hides the slot.
				return '';

			case 'short_description':
				$desc = \get_post_meta( $product_id, 'sgs_description', true );
				return $desc
					? \wp_kses(
						$desc,
						array(
							'strong' => array(),
							'em'     => array(),
							'br'     => array(),
						)
					)
					: \wp_kses_post( \get_the_excerpt( $product_id ) );
		}

		return '';
	}

	/**
	 * Format a CPT product price as HTML.
	 *
	 * C1 (QC): extracted to eliminate duplicated formatting logic between
	 * resolve_cpt_field() and get_product_data() CPT branch. Both previously
	 * built the same two-span string independently — now they call this.
	 *
	 * @param string $price Raw price value (numeric string or empty).
	 * @param string $note  Optional price note (e.g. "per pack", "inc. VAT").
	 * @return string HTML string — amount span + optional note span. Empty if no price.
	 */
	private static function format_cpt_price_html( string $price, string $note ): string {
		$html = '';
		if ( $price ) {
			$html .= '<span class="sgs-product-price__amount">'
				. \esc_html( \number_format( (float) $price, 2 ) )
				. '</span>';
		}
		if ( $note ) {
			$html .= ' <span class="sgs-product-price__note">'
				. \esc_html( $note )
				. '</span>';
		}
		return $html;
	}

	/**
	 * Read + type-guard the `_sgs_variation_sets` meta in a single fetch.
	 *
	 * Keeps both data branches DRY and correct when the meta is absent or
	 * malformed (avoids the double `get_post_meta()` call in the return array).
	 *
	 * @param int $product_id Post ID.
	 * @return array Variation-set definitions, or an empty array.
	 */
	private static function read_variation_sets( int $product_id ): array {
		$vsets = \get_post_meta( $product_id, '_sgs_variation_sets', true );
		return \is_array( $vsets ) ? $vsets : array();
	}

	// ── Shared data resolver (used by render.php directly) ────────────────────

	/**
	 * Build the full product data array for Bound-mode render.php.
	 *
	 * Returns all fields needed to seed `wp_interactivity_state()` and render
	 * the initial server-side HTML for a bound product card.
	 *
	 * Returns null when the product cannot be resolved (triggers empty state).
	 *
	 * @param int    $product_id  The product ID to resolve.
	 * @param string $source_mode 'wc-product' | 'sgs-cpt'.
	 * @return array|null {
	 *     @type int    $id             Product ID.
	 *     @type string $title          Product title (escaped).
	 *     @type string $price_html     Price HTML (wp_kses_post safe).
	 *     @type string $image_url      Full thumbnail URL (escaped).
	 *     @type string $image_alt      Alt text (escaped).
	 *     @type string $short_desc     Short description (wp_kses safe).
	 *     @type string $stock_status   Stock/availability text.
	 *     @type int    $wc_id          WC product ID for add-to-cart (0 if none).
	 *     @type array  $variation_sets Raw _sgs_variation_sets array.
	 * }
	 */
	public static function get_product_data( int $product_id, string $source_mode ): ?array {
		if ( 0 === $product_id ) {
			return null;
		}

		$use_wc = 'wc-product' === $source_mode;
		$wc_id  = 0;

		if ( $use_wc ) {
			if ( ! \function_exists( 'wc_get_product' ) ) {
				// WC not active — fall through to CPT.
				$use_wc = false;
			} else {
				$product = \wc_get_product( $product_id );
				if ( ! $product ) {
					return null;
				}
				$wc_id = $product_id;

				$image_id  = $product->get_image_id();
				$image_url = $image_id
					? \wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' )
					: \wc_placeholder_img_src( 'woocommerce_thumbnail' );
				$raw_alt   = $image_id ? \get_post_meta( $image_id, '_wp_attachment_image_alt', true ) : '';
				$image_alt = ( $image_id && $raw_alt ) ? $raw_alt : $product->get_name();

				$availability = $product->get_availability();

				// "From <min>" for variable products — a single inviting price reads
				// better than a bare range (£9.99–£59.99) before a variation is
				// chosen. Tax-correct via wc_get_price_to_display() (never own
				// division); empty for simple products (they show the exact price).
				$is_variable     = $product->is_type( 'variable' );
				$price_from_html = '';
				if ( $is_variable && \method_exists( $product, 'get_variation_price' ) ) {
					$min_raw     = $product->get_variation_price( 'min', false );
					$min_display = \function_exists( 'wc_get_price_to_display' )
						? \wc_get_price_to_display( $product, array( 'price' => $min_raw ) )
						: $min_raw;
					if ( '' !== (string) $min_display ) {
						$price_from_html = \wp_kses_post( \wc_price( $min_display ) );
					}
				}

				return array(
					'id'              => $product_id,
					'title'           => \esc_html( $product->get_name() ),
					'price_html'      => \wp_kses_post( $product->get_price_html() ),
					'is_variable'     => $is_variable,
					'price_from_html' => $price_from_html,
					'image_url'       => \esc_url( (string) $image_url ),
					'image_alt'       => \sanitize_text_field( (string) $image_alt ),
					'short_desc'      => \wp_kses_post( $product->get_short_description() ),
					'stock_status'    => isset( $availability['availability'] )
						? \esc_html( $availability['availability'] )
						: '',
					'wc_id'           => $wc_id,
					'variation_sets'  => self::read_variation_sets( $product_id ),
				);
			}
		}

		// CPT branch. Restrict to sgs_product posts — never expose an
		// arbitrary post (private page, draft, password-protected) just
		// because its ID was passed as productId (IDOR guard).
		$post = \get_post( $product_id );
		if ( ! $post || Product_CPT::POST_TYPE !== $post->post_type ) {
			return null;
		}

		$price      = \get_post_meta( $product_id, 'sgs_price', true );
		$price_note = \get_post_meta( $product_id, 'sgs_price_note', true );
		// C1 (QC): delegate to shared formatter — eliminates duplicated span-building logic.
		$price_html = self::format_cpt_price_html( (string) $price, (string) $price_note );

		$thumb_id  = \get_post_thumbnail_id( $product_id );
		$image_url = \get_the_post_thumbnail_url( $product_id, 'woocommerce_thumbnail' );
		if ( ! $image_url ) {
			$image_url = \get_the_post_thumbnail_url( $product_id, 'medium' );
		}
		if ( ! $image_url ) {
			$image_url = '';
		}
		$image_alt = '';
		if ( $thumb_id ) {
			$image_alt = \get_post_meta( $thumb_id, '_wp_attachment_image_alt', true );
		}
		if ( '' === $image_alt ) {
			$image_alt = \get_the_title( $product_id );
		}

		$desc = \get_post_meta( $product_id, 'sgs_description', true );
		if ( ! $desc ) {
			$desc = \get_the_excerpt( $product_id );
		}

		return array(
			'id'             => $product_id,
			'title'          => \esc_html( \get_the_title( $product_id ) ),
			'price_html'     => $price_html,
			'image_url'      => \esc_url( (string) $image_url ),
			'image_alt'      => \sanitize_text_field( (string) $image_alt ),
			'short_desc'     => \wp_kses(
				(string) $desc,
				array(
					'strong' => array(),
					'em'     => array(),
					'br'     => array(),
				)
			),
			'stock_status'   => '',
			'wc_id'          => 0,
			'variation_sets' => self::read_variation_sets( $product_id ),
		);
	}
}
