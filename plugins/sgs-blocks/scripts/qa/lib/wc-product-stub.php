<?php
/**
 * One minimal WooCommerce product for the render harness, loaded only by `--product-file` (the motion part
 * render-path gate, scripts/check-motion-part-render-paths.py, renders sgs/product-card's bound simple-product card
 * with it).
 *
 * WHAT IT IS: the read-only accessors a bound card reads off a `WC_Product` (name, price HTML, image ID, type, short
 * description, stock, rating) answering with the values in the product file, and the `wc_get_product()` lookup that
 * returns it for its own ID. Every value is the fixture's input, never computed commerce: no tax, no variations, no
 * cart. A variable product (`"type": "variable"`) answers `is_type( 'variable' )` and its two variation prices and
 * nothing more, so it renders the read-only card (WC_VERSION is undefined) and the branches that build a
 * `Product_Manifest` stay out of reach (see wp-stubs.php "DELIBERATELY NOT STUBBED: sgs/buybox"
 * for why that object graph is not faked here).
 *
 * Product file keys: id, name, price_html, price, type ("simple" | "variable"), image_id, image_url (what
 * wp_get_attachment_image_url() answers for image_id), short_description, in_stock, average_rating, review_count,
 * variation_price_min, variation_price_max, terms (taxonomy => term slugs, read by has_term() in wp-stubs.php).
 *
 * Test scaffolding only; nothing here is shipped.
 *
 * @package SGS\Blocks\QA
 */

declare(strict_types=1);

// phpcs:disable

if ( ! class_exists( 'WC_Product' ) ) {
	/** The product file's values behind the WC_Product accessors a bound card calls. */
	class WC_Product {
		private array $data;
		public function __construct( array $data ) {
			$this->data = $data;
		}
		public function get_id() {
			return (int) ( $this->data['id'] ?? 0 );
		}
		public function get_name() {
			return (string) ( $this->data['name'] ?? '' );
		}
		public function get_price_html() {
			return (string) ( $this->data['price_html'] ?? '' );
		}
		public function get_price() {
			return (string) ( $this->data['price'] ?? '' );
		}
		public function get_image_id() {
			return (int) ( $this->data['image_id'] ?? 0 );
		}
		public function is_type( $type ) {
			return in_array( (string) ( $this->data['type'] ?? 'simple' ), (array) $type, true );
		}
		public function get_short_description() {
			return (string) ( $this->data['short_description'] ?? '' );
		}
		public function is_in_stock() {
			return (bool) ( $this->data['in_stock'] ?? true );
		}
		public function get_availability() {
			return array(
				'availability' => $this->is_in_stock() ? '' : 'Out of stock',
				'class'        => $this->is_in_stock() ? 'in-stock' : 'out-of-stock',
			);
		}
		public function get_average_rating() {
			return (string) ( $this->data['average_rating'] ?? '0' );
		}
		public function get_review_count() {
			return (int) ( $this->data['review_count'] ?? 0 );
		}
		public function get_variation_attributes() {
			return array();
		}
		/** A variable product's lowest or highest variation price: the file's variation_price_min / _max. */
		public function get_variation_price( $min_or_max = 'min', $for_display = false ) {
			return (string) ( $this->data[ 'max' === $min_or_max ? 'variation_price_max' : 'variation_price_min' ] ?? '' );
		}
	}
}

if ( ! function_exists( 'wc_get_product' ) ) {
	function wc_get_product( $the_product = false ) {
		$data = $GLOBALS['sgs_qa_product'] ?? null;
		$id   = is_object( $the_product ) && method_exists( $the_product, 'get_id' ) ? $the_product->get_id() : absint( $the_product );
		return is_array( $data ) && (int) ( $data['id'] ?? 0 ) === $id ? new WC_Product( $data ) : false;
	}
}

if ( ! function_exists( 'wc_placeholder_img_src' ) ) {
	function wc_placeholder_img_src( $size = 'woocommerce_thumbnail' ) {
		// WooCommerce's placeholder file name (uploads/woocommerce-placeholder.png); sgs_product_card_has_real_image()
		// recognises it.
		return 'https://example.test/wp-content/uploads/woocommerce-placeholder.png';
	}
}

if ( ! function_exists( 'wc_price' ) ) {
	function wc_price( $price, $args = array() ) {
		return '<span class="woocommerce-Price-amount amount">' . esc_html( (string) $price ) . '</span>';
	}
}
