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
 * nothing more, so on its own it renders the read-only card (WC_VERSION is undefined); with `--manifest-file`
 * (manifest-stub.php) its Product_Manifest comes from the fixture through `Product_Manifest::build()`'s cache, which
 * reaches the product card's configurator and sgs/buybox's main path.
 *
 * Product file keys: id, name, price_html, price, type ("simple" | "variable"), image_id, image_url (what
 * wp_get_attachment_image_url() answers for image_id), short_description, in_stock, average_rating, review_count,
 * variation_price_min, variation_price_max, terms (taxonomy => term slugs, read by has_term() in wp-stubs.php).
 *
 * A product file holding a JSON list is a catalogue (`$GLOBALS['sgs_qa_products']`): `wc_get_product()` finds each
 * product by ID, `wc_get_products()` returns every ID, and `$GLOBALS['sgs_qa_product']` (what the other stubs read for
 * meta, permalinks, images and terms) is the first product until `--render-children` switches it to the product the
 * child card being rendered is bound to.
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
		$id = is_object( $the_product ) && method_exists( $the_product, 'get_id' ) ? $the_product->get_id() : absint( $the_product );
		foreach ( $GLOBALS['sgs_qa_products'] ?? array( $GLOBALS['sgs_qa_product'] ?? null ) as $data ) {
			if ( is_array( $data ) && (int) ( $data['id'] ?? 0 ) === $id ) {
				return new WC_Product( $data );
			}
		}
		return false;
	}
}

if ( ! function_exists( 'wc_get_products' ) ) {
	/** Every product in a list product file, in file order, as IDs (the only return shape the grid asks for). */
	function wc_get_products( $args = array() ) {
		$ids = array();
		foreach ( $GLOBALS['sgs_qa_products'] ?? array() as $data ) {
			$ids[] = (int) ( $data['id'] ?? 0 );
		}
		return $ids;
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
