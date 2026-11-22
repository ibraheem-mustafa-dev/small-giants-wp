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
 * Product file keys: id, name, price_html, price, regular_price, sale_price, sku, gallery_image_ids, stock_quantity, type ("simple" | "variable" | "grouped" | "external"), image_id, image_url (what
 * wp_get_attachment_image_url() answers for image_id), short_description, in_stock, purchasable (default true), average_rating, review_count,
 * variation_price_min, variation_price_max, terms (taxonomy => term slugs, read by has_term() in wp-stubs.php),
 * attributes (a list of {name, visible}: the product's taxonomy attributes, read by get_attributes()).
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
		/** The file's `regular_price` (default: `price`), `sale_price` (default ''), on sale when a sale price is set. */
		public function get_regular_price() {
			return (string) ( $this->data['regular_price'] ?? $this->get_price() );
		}
		public function get_sale_price() {
			return (string) ( $this->data['sale_price'] ?? '' );
		}
		public function is_on_sale() {
			return '' !== $this->get_sale_price();
		}
		public function get_date_on_sale_to() {
			return null;
		}
		public function get_sku() {
			return (string) ( $this->data['sku'] ?? '' );
		}
		/** The file's `gallery_image_ids`: the product's own WooCommerce gallery. */
		public function get_gallery_image_ids() {
			return (array) ( $this->data['gallery_image_ids'] ?? array() );
		}
		/** The file's `stock_quantity` (null: stock not managed). */
		public function managing_stock() {
			return null !== ( $this->data['stock_quantity'] ?? null );
		}
		public function get_stock_quantity() {
			return $this->data['stock_quantity'] ?? null;
		}
		public function get_low_stock_amount() {
			return '';
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
		public function get_description() {
			return (string) ( $this->data['description'] ?? '' );
		}
		public function is_purchasable() {
			return (bool) ( $this->data['purchasable'] ?? true );
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
		public function get_status() {
			return (string) ( $this->data['status'] ?? 'publish' );
		}
		public function is_visible() {
			return (bool) ( $this->data['visible'] ?? true );
		}
		/** The product file's `upsell_ids` / `cross_sell_ids`: the owner's Linked products lists. */
		public function get_upsell_ids() {
			return (array) ( $this->data['upsell_ids'] ?? array() );
		}
		public function get_cross_sell_ids() {
			return (array) ( $this->data['cross_sell_ids'] ?? array() );
		}
		public function get_variation_attributes() {
			return array();
		}
		/** The product file's `attributes` ({name, visible}, each a taxonomy attribute), as WooCommerce's objects. */
		public function get_attributes() {
			$out = array();
			foreach ( (array) ( $this->data['attributes'] ?? array() ) as $attr ) {
				$out[ (string) ( $attr['name'] ?? '' ) ] = new WC_Product_Attribute( (string) ( $attr['name'] ?? '' ), (bool) ( $attr['visible'] ?? true ) );
			}
			return $out;
		}
		/** A variable product's lowest or highest variation price: the file's variation_price_min / _max. */
		public function get_variation_price( $min_or_max = 'min', $for_display = false ) {
			return (string) ( $this->data[ 'max' === $min_or_max ? 'variation_price_max' : 'variation_price_min' ] ?? '' );
		}
	}
}

if ( ! class_exists( 'WC_Product_Attribute' ) ) {
	/** A taxonomy product attribute: its name (`pa_*`) and whether it shows on the product page. */
	class WC_Product_Attribute {
		private string $name;
		private bool $visible;
		public function __construct( string $name = '', bool $visible = true ) {
			$this->name    = $name;
			$this->visible = $visible;
		}
		public function get_name() {
			return $this->name;
		}
		public function is_taxonomy() {
			return 0 === strpos( $this->name, 'pa_' );
		}
		public function get_visible() {
			return $this->visible;
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

if ( ! function_exists( 'wc_get_related_products' ) ) {
	/** WooCommerce's related products for a product: its file's `related_ids`. */
	function wc_get_related_products( $product_id, $limit = 5, $exclude_ids = array() ) {
		foreach ( $GLOBALS['sgs_qa_products'] ?? array( $GLOBALS['sgs_qa_product'] ?? null ) as $data ) {
			if ( is_array( $data ) && (int) ( $data['id'] ?? 0 ) === (int) $product_id ) {
				return array_slice( array_diff( (array) ( $data['related_ids'] ?? array() ), (array) $exclude_ids ), 0, (int) $limit );
			}
		}
		return array();
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
