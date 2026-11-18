<?php
/**
 * Standalone runner: a product page prints its product's structured data whatever block shows it.
 *
 * Covers the shop's two policy options ({@see Product_Offer_Policy}), the plain `Product` built for a
 * product without options ({@see Product_Schema_Simple}) and the routing of {@see Product_Page_Schema}
 * (a draft prints nothing; a plain product and a gift card defer to an SEO plugin that prints structured
 * data; the filter decides last). The `ProductGroup` for a product with options is proved on a scratch copy of
 * the shop, because it reads the live manifest.
 *
 * Run with: php plugins/sgs-blocks/tests/php/run-product-page-schema-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );

	$GLOBALS['t'] = array(
		'options' => array(),
		'filters' => array(),
		'is_product' => true,
		'queried' => 10,
		'listable' => true,
		'seo_owns' => false,
		'products' => array(),
		'removed' => array(),
	);

	class WC_Product {
		public $data;
		public function __construct( array $data ) { $this->data = $data + array( 'id' => 10, 'type' => 'simple', 'name' => 'Plain box', 'short' => '', 'desc' => '', 'sku' => '', 'price' => '12.5', 'inc' => 15.0, 'stock' => 'instock', 'gtin' => '', 'sale_end' => null, 'on_sale' => false, 'visible' => true ); }
		public function get_id() { return $this->data['id']; }
		public function get_type() { return $this->data['type']; }
		public function get_name() { return $this->data['name']; }
		public function get_short_description() { return $this->data['short']; }
		public function get_description() { return $this->data['desc']; }
		public function get_sku() { return $this->data['sku']; }
		public function get_price() { return $this->data['price']; }
		public function get_stock_status() { return $this->data['stock']; }
		public function get_global_unique_id() { return $this->data['gtin']; }
		public function is_on_sale() { return $this->data['on_sale']; }
		public function get_date_on_sale_to() { return $this->data['sale_end']; }
		public function is_visible() { return $GLOBALS['t']['listable']; }
		public function get_image_id() { return 0; }
		public function get_attribute( $a ) { return ''; }
		public function get_review_count() { return 0; }
	}

	function add_action() {}
	function add_filter() {}
	function apply_filters( $hook, $value, ...$rest ) {
		foreach ( $GLOBALS['t']['filters'][ $hook ] ?? array() as $cb ) {
			$value = $cb( $value, ...$rest );
		}
		return $value;
	}
	function get_option( $key, $default = false ) { return $GLOBALS['t']['options'][ $key ] ?? $default; }
	function is_product() { return $GLOBALS['t']['is_product']; }
	function get_queried_object_id() { return $GLOBALS['t']['queried']; }
	function wc_get_product( $id ) { return $GLOBALS['t']['products'][ $id ] ?? null; }
	function wc_get_price_including_tax( $p ) { return $p->data['inc']; }
	function wc_get_price_decimals() { return 2; }
	function get_woocommerce_currency() { return 'GBP'; }
	function get_permalink( $id ) { return 'https://shop.example/product/' . $id . '/'; }
	function esc_url_raw( $u ) { return $u; }
	function get_bloginfo( $k ) { return 'Mama&#039;s Munches'; }
	function wp_strip_all_tags( $s ) { return strip_tags( $s ); }
	function sanitize_text_field( $s ) { return trim( $s ); }
	function taxonomy_exists( $t ) { return false; }
	function wp_json_encode( $d, $f = 0 ) { return json_encode( $d, $f ); }
	function get_post_status( $id ) { return 'publish'; }
	function add_action_stub() {}
	function wp_get_attachment_image_url() { return false; }
	function WC() { return (object) array( 'structured_data' => new stdClass() ); }
	function remove_action( ...$a ) { $GLOBALS['t']['removed'][] = $a; }
}

namespace {
	// Load only the classes under test; the sibling class files they require are satisfied above or loaded here.
	$inc = dirname( __DIR__, 2 ) . '/includes/';
	require $inc . 'class-sgs-schema.php';
	require $inc . 'class-product-offer-policy.php';
	require $inc . 'class-product-schema.php';
	require $inc . 'class-product-schema-simple.php';
	require $inc . 'class-product-page-schema.php';

	use SGS\Blocks\Product_Offer_Policy;
	use SGS\Blocks\Product_Page_Schema;
	use SGS\Blocks\Product_Schema_Simple;

	$failures = 0;
	$total    = 0;
	$check    = static function ( string $label, bool $ok, string $detail = '' ) use ( &$failures, &$total ): void {
		++$total;
		echo ( $ok ? 'PASS  ' : 'FAIL  ' ) . $label . ( $ok || '' === $detail ? '' : ' (' . $detail . ')' ) . "\n";
		$failures += $ok ? 0 : 1;
	};
	$emit = static function () {
		ob_start();
		Product_Page_Schema::emit();
		return (string) ob_get_clean();
	};
	$nodes = static function ( string $html ): array {
		preg_match_all( '#<script type="application/ld\+json">(.*?)</script>#s', $html, $m );
		return array_map( static fn( $j ) => json_decode( $j, true ), $m[1] );
	};

	// Policy options.
	$check( 'nothing is printed for the policy when the options are empty', array() === Product_Offer_Policy::offer_fields() );
	$GLOBALS['t']['options']['sgs_configurator_returns']  = array( 'applicableCountry' => 'GB', 'merchantReturnDays' => 14 );
	$GLOBALS['t']['options']['woocommerce_default_country'] = 'GB:ENG';
	$f = Product_Offer_Policy::offer_fields();
	$check( 'return policy gets its type and the store country, shipping stays absent', 'MerchantReturnPolicy' === $f['hasMerchantReturnPolicy']['@type'] && 'GB' === $f['hasMerchantReturnPolicy']['returnPolicyCountry'] && ! isset( $f['shippingDetails'] ) );
	$GLOBALS['t']['options']['woocommerce_default_country'] = '';
	$check( 'a missing store country leaves returnPolicyCountry out, never empty', ! array_key_exists( 'returnPolicyCountry', Product_Offer_Policy::returns() ) );
	$GLOBALS['t']['options']['sgs_configurator_returns'] = 'not an array';
	$check( 'a value that is not an object is ignored', null === Product_Offer_Policy::returns() );
	$GLOBALS['t']['options'] = array();

	// Simple product.
	$GLOBALS['t']['products'][10] = new WC_Product( array( 'sku' => 'BOX-1', 'short' => 'A <b>plain</b> box &amp; lid.' ) );
	$node = Product_Schema_Simple::build_node( $GLOBALS['t']['products'][10] );
	$check( 'a simple product is one Product with one Offer', 'Product' === $node['@type'] && 'Offer' === $node['offers']['@type'] );
	$check( 'the price is the VAT-inclusive price, two decimals, in the store currency', '15.00' === $node['offers']['price'] && 'GBP' === $node['offers']['priceCurrency'] );
	$check( 'availability, url and condition are set', 'https://schema.org/InStock' === $node['offers']['availability'] && 'https://shop.example/product/10/' === $node['offers']['url'] && 'https://schema.org/NewCondition' === $node['offers']['itemCondition'] );
	$check( 'no gtin when none is set; the SKU is the mpn', ! array_filter( array_keys( $node ), static fn( $k ) => 0 === strpos( $k, 'gtin' ) ) && 'BOX-1' === $node['mpn'] && 'BOX-1' === $node['sku'] );
	$check( 'brand falls back to the shop name', 'Brand' === $node['brand']['@type'] && 'Mama&#039;s Munches' === $node['brand']['name'] );
	$check( 'no policy fields and no priceValidUntil when none is set', ! isset( $node['offers']['shippingDetails'] ) && ! isset( $node['offers']['hasMerchantReturnPolicy'] ) && ! isset( $node['offers']['priceValidUntil'] ) );
	$GLOBALS['t']['products'][10]->data['gtin'] = '5012345678900';
	$node = Product_Schema_Simple::build_node( $GLOBALS['t']['products'][10] );
	$check( 'a 13-digit GTIN prints as gtin13 and replaces mpn', '5012345678900' === ( $node['gtin13'] ?? '' ) && ! isset( $node['mpn'] ) );
	$GLOBALS['t']['products'][10]->data['stock'] = 'outofstock';
	$check( 'out of stock prints OutOfStock', 'https://schema.org/OutOfStock' === Product_Schema_Simple::build_node( $GLOBALS['t']['products'][10] )['offers']['availability'] );
	$GLOBALS['t']['products'][10]->data['price'] = '';
	$check( 'a product with no price prints nothing', null === Product_Schema_Simple::build_node( $GLOBALS['t']['products'][10] ) );
	$GLOBALS['t']['products'][10]->data['price'] = '12.5';
	$GLOBALS['t']['products'][10]->data['stock'] = 'instock';
	$GLOBALS['t']['products'][11] = new WC_Product( array( 'id' => 11, 'type' => 'external' ) );
	$check( 'a product type that is not simple is not built here', null === Product_Schema_Simple::build_node( $GLOBALS['t']['products'][11] ) );

	// Routing.
	$out = $nodes( $emit() );
	$check( 'a product page with no card prints exactly one Product node', 1 === count( $out ) && 'Product' === $out[0]['@type'] );
	$check( 'the entity in the shop name is decoded in the printed JSON', "Mama's Munches" === $out[0]['brand']['name'] );
	$check( 'WooCommerce\'s own Product copy is removed when this prints', 1 === count( $GLOBALS['t']['removed'] ) && 'woocommerce_single_product_summary' === $GLOBALS['t']['removed'][0][0] );
	$GLOBALS['t']['filters']['sgs_seo_plugin_owns_schema'] = array( static fn() => true );
	$check( 'a plain Product defers to an SEO plugin that prints structured data', '' === $emit() );
	$GLOBALS['t']['filters']['sgs_seo_plugin_owns_schema'] = array();
	$GLOBALS['t']['listable'] = false;
	$check( 'a draft or hidden product prints nothing', '' === $emit() );
	$GLOBALS['t']['listable'] = true;
	$GLOBALS['t']['is_product'] = false;
	$check( 'a page that is not a product page prints nothing', '' === $emit() );
	$GLOBALS['t']['is_product'] = true;
	$GLOBALS['t']['filters']['sgs_product_page_schema'] = array( static fn( $tag ) => '' );
	$check( 'the filter can switch a product page off', '' === $emit() );
	$GLOBALS['t']['filters']['sgs_product_page_schema'] = array();
	$GLOBALS['t']['filters']['sgs_product_schema_brand_fallback'] = array( static fn( $b ) => '' );
	$out = $nodes( $emit() );
	$check( 'a site can print no brand for a product that has none', ! isset( $out[0]['brand'] ) );

	echo "\n==== " . ( $total - $failures ) . ' of ' . $total . ' checks passed (' . $failures . " failed) ====\n";
	exit( $failures > 0 ? 1 : 0 );
}
