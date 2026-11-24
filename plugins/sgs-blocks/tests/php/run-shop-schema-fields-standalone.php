<?php
/**
 * Standalone runner: the product structured data fields Google's merchant listing and product snippet reports ask for.
 *
 * Covers, with the WordPress and WooCommerce functions stubbed:
 *
 * - the variant name and every other text in the printed JSON-LD reaching the page as UTF-8 (the en dash);
 * - `description` on every variant `Product` (the variation's own, else the parent's short, else its long description);
 * - `shippingDetails` built from WooCommerce's shipping zones and methods when the site opts in, with the delivery
 *   time printed only when the site has set one, in Google's `ServicePeriod` shape;
 * - a product whose WooCommerce shipping class changes a flat rate's price carrying its own `OfferShippingDetails`
 *   (the class cost rules of `WC_Shipping_Flat_Rate::calculate_shipping`, free shipping over a minimum, a variation's
 *   own class, an empty or formula class cost) and the settings preview listing each such class;
 * - `hasMerchantReturnPolicy` from the shop's return option, and the settings screen that writes it;
 * - `aggregateRating` and `review` from the product's own approved WooCommerce reviews only;
 * - every typed node printed passing a small schema.org property check.
 *
 * Run with: php plugins/sgs-blocks/tests/php/run-shop-schema-fields-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable

namespace {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );

	$GLOBALS['t'] = array(
		'options'  => array(),
		'filters'  => array(),
		'meta'     => array(),
		'zones'    => array(),
		'comments' => array(),
		'cmeta'    => array(),
		'asked'    => array(),
		'errors'   => array(),
		'products' => array(),
		'classes'  => array(),
	);

	class WC_Product {
		public $data;
		public function __construct( array $data = array() ) { $this->data = $data + array( 'id' => 10, 'name' => 'Lactation Cookies', 'short' => '', 'desc' => '', 'avg' => '0', 'ratings' => 0, 'reviews' => 0, 'type' => 'variable', 'price' => '12.5', 'stock' => 'instock' ); }
		public function get_id() { return $this->data['id']; }
		public function get_type() { return $this->data['type']; }
		public function get_price() { return $this->data['price']; }
		public function get_stock_status() { return $this->data['stock']; }
		public function is_on_sale() { return false; }
		public function get_date_on_sale_to() { return null; }
		public function get_global_unique_id() { return ''; }
		public function get_name() { return $this->data['name']; }
		public function get_short_description() { return $this->data['short']; }
		public function get_description() { return $this->data['desc']; }
		public function get_sku() { return ''; }
		public function get_image_id() { return 0; }
		public function get_attribute( $a ) { return ''; }
		public function get_review_count() { return $this->data['reviews']; }
		public function get_rating_count() { return $this->data['ratings']; }
		public function get_average_rating() { return $this->data['avg']; }
		public function get_shipping_class_id() { return $this->data['class_id'] ?? 0; }
		public function get_shipping_class() { return $this->data['class_slug'] ?? ''; }
	}
	class WC_Shipping_Zones {
		public static function get_zones() { return $GLOBALS['t']['zones']; }
	}
	class WP_Error {}

	function add_action() {}
	function add_filter() {}
	function apply_filters( $hook, $value, ...$rest ) {
		foreach ( $GLOBALS['t']['filters'][ $hook ] ?? array() as $cb ) {
			$value = $cb( $value, ...$rest );
		}
		return $value;
	}
	function get_option( $key, $default = false ) { return $GLOBALS['t']['options'][ $key ] ?? $default; }
	function update_option( $key, $value ) { $GLOBALS['t']['options'][ $key ] = $value; return true; }
	function home_url( $p = '' ) { return 'https://shop.example' . $p; }
	function get_post_meta( $id, $key, $single = false ) { return $GLOBALS['t']['meta'][ $id ][ $key ] ?? ''; }
	function update_meta_cache() {}
	function wc_get_price_including_tax( $p ) { return $p->data['inc'] ?? 15.0; }
	function wc_get_price_excluding_tax( $p ) { return $p->data['exc'] ?? 12.5; }
	function get_woocommerce_currency_symbol() { return '&pound;'; }
	function get_permalink( $id ) { return 'https://shop.example/product/' . $id . '/'; }
	function wc_get_product( $id ) { return $GLOBALS['t']['products'][ $id ] ?? null; }
	function wc_get_price_decimals() { return 2; }
	function get_woocommerce_currency() { return 'GBP'; }
	function esc_url_raw( $u ) { return $u; }
	function get_bloginfo( $k ) { return 'Mama&#039;s Munches'; }
	function wp_strip_all_tags( $s ) { return strip_tags( $s ); }
	function sanitize_text_field( $s ) { return trim( $s ); }
	function taxonomy_exists( $t ) { return false; }
	function wp_json_encode( $d, $f = 0 ) { return json_encode( $d, $f ); }
	function __( $s ) { return $s; }
	function esc_html__( $s ) { return $s; }
	function esc_html( $s ) { return htmlspecialchars( (string) $s ); }
	function esc_attr( $s ) { return htmlspecialchars( (string) $s ); }
	function get_comments( $args ) { $GLOBALS['t']['asked'][] = $args; return $GLOBALS['t']['comments'][ $args['post_id'] ] ?? array(); }
	function get_comment_meta( $id, $key, $single = false ) { return $GLOBALS['t']['cmeta'][ $id ][ $key ] ?? ''; }
	function add_settings_error( $setting, $code, $message, $type = 'error' ) { $GLOBALS['t']['errors'][] = $code; }
	function register_setting() {}
	function add_settings_section() {}
	function add_settings_field() {}
	function add_options_page() {}
	function current_user_can() { return true; }
	function settings_fields() {}
	function submit_button() {}
	function is_admin() { return false; }
	function is_feed() { return false; }
	function wp_is_json_request() { return false; }
	function is_404() { return false; }
	function is_front_page() { return true; }
	function WC() {
		return new class() {
			public $countries;
			public function __construct() {
				$this->countries = new class() {
					public function get_continents() { return array( 'EU' => array( 'countries' => array( 'FR', 'DE' ) ), 'EUA' => array( 'countries' => array( 'GB', 'FR', 'DE' ) ) ); }
				};
			}
			public function shipping() {
				return new class() {
					public function get_shipping_classes() { return $GLOBALS['t']['classes']; }
				};
			}
		};
	}
}

namespace {
	$inc = dirname( __DIR__, 2 ) . '/includes/';
	require_once $inc . 'class-sgs-schema.php';
	require_once $inc . 'class-product-offer-policy.php';
	require_once $inc . 'class-product-shipping-woo.php';
	require_once $inc . 'class-product-reviews.php';
	require_once $inc . 'class-product-schema.php';
	require_once $inc . 'class-product-schema-simple.php';
	require_once $inc . 'class-shop-policy-settings.php';
	require_once $inc . 'class-product-item-list.php';
	require_once $inc . 'class-product-page-schema.php';

	use SGS\Blocks\Sgs_Schema;
	use SGS\Blocks\Product_Offer_Policy;
	use SGS\Blocks\Product_Reviews;
	use SGS\Blocks\Product_Schema;
	use SGS\Blocks\Product_Shipping_Woo;
	use SGS\Blocks\Shop_Policy_Settings;

	$failures = 0;
	$total    = 0;
	$check    = static function ( string $label, bool $ok, string $detail = '' ) use ( &$failures, &$total ): void {
		++$total;
		echo ( $ok ? 'PASS  ' : 'FAIL  ' ) . $label . ( $ok || '' === $detail ? '' : ' (' . $detail . ')' ) . "\n";
		$failures += $ok ? 0 : 1;
	};
	$reset = static function (): void {
		$GLOBALS['t']['options']  = array( 'woocommerce_default_country' => 'GB:ENG' );
		$GLOBALS['t']['zones']    = array();
		$GLOBALS['t']['comments'] = array();
		$GLOBALS['t']['cmeta']    = array();
		$GLOBALS['t']['asked']    = array();
		$GLOBALS['t']['errors']   = array();
		$GLOBALS['t']['classes']  = array();
		Product_Shipping_Woo::reset_cache();
	};

	// ── A small schema.org check: every typed node's keys belong to its type, and Google's required keys are there. ──
	$allowed = array(
		'Product'               => array( '@context', '@type', '@id', 'name', 'url', 'description', 'image', 'brand', 'sku', 'mpn', 'gtin8', 'gtin12', 'gtin13', 'gtin14', 'offers', 'aggregateRating', 'review', 'size', 'material', 'color', 'pattern', 'additionalProperty', 'isVariantOf', 'productGroupID' ),
		'ProductGroup'          => array( '@context', '@type', '@id', 'name', 'url', 'description', 'image', 'brand', 'sku', 'productGroupID', 'variesBy', 'hasVariant', 'offers', 'aggregateRating', 'review' ),
		'Brand'                 => array( 'name' ),
		'PropertyValue'         => array( 'name', 'value' ),
		'Offer'                 => array( 'price', 'priceCurrency', 'availability', 'url', 'itemCondition', 'priceValidUntil', 'shippingDetails', 'hasMerchantReturnPolicy' ),
		'AggregateOffer'        => array( 'priceCurrency', 'lowPrice', 'highPrice', 'offerCount', 'availability', 'shippingDetails', 'hasMerchantReturnPolicy' ),
		'OfferShippingDetails'  => array( 'hasShippingService', 'shippingRate', 'shippingDestination', 'deliveryTime' ),
		'ShippingDeliveryTime'  => array( 'handlingTime', 'transitTime', 'businessDays', 'cutoffTime' ),
		'ShippingService'       => array( '@id', 'name', 'shippingConditions', 'handlingTime', 'fulfillmentType', 'description' ),
		'ShippingConditions'    => array( 'shippingDestination', 'shippingRate', 'orderValue', 'transitTime', 'doesNotShip' ),
		'ServicePeriod'         => array( 'duration', 'businessDays', 'cutoffTime' ),
		'QuantitativeValue'     => array( 'minValue', 'maxValue', 'value', 'unitCode' ),
		'MonetaryAmount'        => array( 'value', 'minValue', 'maxValue', 'currency' ),
		'DefinedRegion'         => array( 'addressCountry', 'addressRegion' ),
		'MerchantReturnPolicy'  => array( '@id', 'applicableCountry', 'returnPolicyCountry', 'returnPolicyCategory', 'merchantReturnDays', 'returnMethod', 'returnFees', 'refundType', 'merchantReturnLink' ),
		'AggregateRating'       => array( 'ratingValue', 'ratingCount', 'reviewCount', 'bestRating', 'worstRating' ),
		'Review'                => array( 'author', 'datePublished', 'reviewBody', 'reviewRating', 'name' ),
		'Rating'                => array( 'ratingValue', 'bestRating', 'worstRating' ),
		'Person'                => array( 'name' ),
	);
	$required = array(
		'Product'              => array( 'name' ),
		'ProductGroup'         => array( 'name', 'productGroupID' ),
		'Offer'                => array( 'price', 'priceCurrency' ),
		'ShippingService'      => array( 'shippingConditions' ),
		'MerchantReturnPolicy' => array( 'applicableCountry', 'returnPolicyCategory' ),
		'AggregateRating'      => array( 'ratingValue' ),
		'Review'               => array( 'author', 'reviewRating' ),
		'Rating'               => array( 'ratingValue' ),
		'MonetaryAmount'       => array( 'currency' ),
	);
	$problems = static function ( $node, string $path = '$' ) use ( &$problems, $allowed, $required ): array {
		$out = array();
		if ( ! is_array( $node ) ) {
			return $out;
		}
		if ( array_keys( $node ) === range( 0, count( $node ) - 1 ) && $node ) {
			foreach ( $node as $i => $one ) {
				$out = array_merge( $out, $problems( $one, $path . '[' . $i . ']' ) );
			}
			return $out;
		}
		$type = $node['@type'] ?? null;
		if ( is_string( $type ) ) {
			if ( ! isset( $allowed[ $type ] ) ) {
				$out[] = $path . ': unknown type ' . $type;
			} else {
				foreach ( array_keys( $node ) as $k ) {
					if ( '@type' !== $k && ! in_array( $k, $allowed[ $type ], true ) ) {
						$out[] = $path . ': ' . $type . ' has no property ' . $k;
					}
				}
				foreach ( $required[ $type ] ?? array() as $k ) {
					if ( ! isset( $node[ $k ] ) && ! ( 'MonetaryAmount' === $type && 'currency' !== $k ) ) {
						$out[] = $path . ': ' . $type . ' lacks ' . $k;
					}
				}
			}
		}
		foreach ( $node as $k => $v ) {
			if ( is_array( $v ) ) {
				$out = array_merge( $out, $problems( $v, $path . '.' . $k ) );
			}
		}
		return $out;
	};

	$rg_product = static function ( array $over = array() ) { return new WC_Product( $over ); };
	$group_node = new ReflectionMethod( Product_Schema::class, 'group_node' );
	$group_node->setAccessible( true );
	$manifest = array(
		'decimals' => 2,
		'axes'     => array(
			array( 'taxonomy' => 'pa_flavour', 'label' => 'Flavour', 'variesBy' => 'material', 'terms' => array( array( 'slug' => 'classic-oat', 'label' => 'Classic oat' ) ) ),
		),
		'combos'   => array(
			'pa_flavour:classic-oat' => array( 'variationId' => 258, 'incMinor' => 950, 'inStock' => true ),
		),
	);
	$build_group = static function ( WC_Product $parent ) use ( $group_node, $manifest ) {
		return $group_node->invoke( null, $parent, 10, $manifest, $manifest['combos'] );
	};

	// ── 1. The en dash and the other text: real UTF-8 from source to printed bytes. ──
	$reset();
	$GLOBALS['t']['products'][10] = $rg_product( array( 'short' => 'Baked &#8211; to order &amp; posted.' ) );
	$group = $build_group( $GLOBALS['t']['products'][10] );
	$json  = Sgs_Schema::encode_jsonld( $group );
	$check( 'the variant name carries one real en dash (U+2013 as the bytes E2 80 93)', str_contains( $json, "Lactation Cookies \xE2\x80\x93 Classic oat" ) );
	$check( 'no part of the printed JSON is a UTF-8 dash read as Windows-1252 (C3 A2 E2 82 AC)', ! str_contains( $json, "\xC3\xA2\xE2\x82\xAC" ) && ! str_contains( $json, "\xC3\x82" ) );
	$check( 'the printed JSON is valid UTF-8', mb_check_encoding( $json, 'UTF-8' ) );
	$check( 'an entity in a description is decoded once, not left or doubled', ( json_decode( $json, true )['description'] ?? '' ) === "Baked \xE2\x80\x93 to order & posted." );

	// ── 2. Variant description. ──
	$reset();
	$GLOBALS['t']['products'][10] = $rg_product( array( 'short' => 'Parent short.', 'desc' => 'Parent <b>long</b>.' ) );
	$variant = $build_group( $GLOBALS['t']['products'][10] )['hasVariant'][0];
	$check( 'a variant with no description of its own takes the parent short description', 'Parent short.' === ( $variant['description'] ?? null ) );
	$GLOBALS['t']['products'][10] = $rg_product( array( 'desc' => 'Parent <b>long</b>.' ) );
	$variant = $build_group( $GLOBALS['t']['products'][10] )['hasVariant'][0];
	$check( 'with no short description either, the parent long description as plain text', 'Parent long.' === ( $variant['description'] ?? null ) );
	$GLOBALS['t']['meta'][258]['_variation_description'] = '<p>Oat &amp; <em>milk</em> choc, 8.</p>';
	$variant = $build_group( $GLOBALS['t']['products'][10] )['hasVariant'][0];
	$check( 'the variation\'s own description wins, as plain text', 'Oat & milk choc, 8.' === Sgs_Schema::decode_text( $variant['description'] ?? '' ) );
	$GLOBALS['t']['meta'] = array();
	$GLOBALS['t']['products'][10] = $rg_product();
	$variant = $build_group( $GLOBALS['t']['products'][10] )['hasVariant'][0];
	$check( 'no description anywhere prints no description key (never empty)', ! array_key_exists( 'description', $variant ) );

	// ── 3. Shipping from WooCommerce. ──
	$method = static function ( string $id, string $title, array $opts, string $enabled = 'yes' ) {
		return new class( $id, $title, $opts, $enabled ) {
			public $id;
			public $enabled;
			private $title;
			private $opts;
			public function __construct( $id, $title, $opts, $enabled ) { $this->id = $id; $this->title = $title; $this->opts = $opts; $this->enabled = $enabled; }
			public function get_title() { return $this->title; }
			public function get_option( $k, $d = '' ) { return $this->opts[ $k ] ?? $d; }
		};
	};
	$uk_zone = static function ( array $methods, array $locations = null ) {
		return array(
			'zone_id'          => 1,
			'zone_locations'   => $locations ?? array( (object) array( 'code' => 'GB', 'type' => 'country' ) ),
			'shipping_methods' => $methods,
		);
	};
	$mamas = static function () use ( $method, $uk_zone ) {
		return $uk_zone(
			array(
				$method( 'flat_rate', 'Royal Mail Tracked 48', array( 'cost' => '3.95' ) ),
				$method( 'flat_rate', 'Royal Mail Tracked 24', array( 'cost' => '5.45' ) ),
				$method( 'free_shipping', 'Free UK delivery', array( 'requires' => 'min_amount', 'min_amount' => '35' ) ),
			)
		);
	};

	$reset();
	$GLOBALS['t']['zones'] = array( $mamas() );
	$check( 'zones exist but the site has not opted in: nothing is printed', null === Product_Offer_Policy::shipping_service() && array() === Product_Offer_Policy::offer_fields() );
	$GLOBALS['t']['options']['sgs_shipping_from_woocommerce'] = '1';
	Product_Shipping_Woo::reset_cache();
	$services = Product_Offer_Policy::shipping_service();
	$check( 'opted in: one ShippingService per usable method, named by its title', is_array( $services ) && 3 === count( $services ) && 'Royal Mail Tracked 48' === $services[0]['name'] && 'Free UK delivery' === $services[2]['name'] );
	$cond = $services[0]['shippingConditions'];
	$check( 'a flat rate prints its cost in the store currency', '3.95' === $cond['shippingRate']['value'] && 'GBP' === $cond['shippingRate']['currency'] && 'MonetaryAmount' === $cond['shippingRate']['@type'] );
	$check( 'the zone\'s country is the destination', 'DefinedRegion' === $cond['shippingDestination']['@type'] && 'GB' === $cond['shippingDestination']['addressCountry'] );
	$free = $services[2]['shippingConditions'];
	$check( 'free shipping over a minimum is a zero rate with an orderValue minimum', '0.00' === $free['shippingRate']['value'] && '35.00' === $free['orderValue']['minValue'] && 'GBP' === $free['orderValue']['currency'] );
	$check( 'each service has a stable @id on the home page', 'https://shop.example/#shipping-service-1' === $services[0]['@id'] && 'https://shop.example/#shipping-service-3' === $services[2]['@id'] );
	$check( 'no delivery time is printed when the site has set none', ! isset( $cond['transitTime'] ) && ! isset( $services[0]['handlingTime'] ) );
	$fields = Product_Offer_Policy::offer_fields();
	$refs   = Product_Offer_Policy::offer_references();
	$check( 'the Offer holds OfferShippingDetails with the services once', 'OfferShippingDetails' === $fields['shippingDetails']['@type'] && 3 === count( $fields['shippingDetails']['hasShippingService'] ) );
	$check( 'a further Offer points at each service by @id alone', array( array( '@id' => 'https://shop.example/#shipping-service-1' ), array( '@id' => 'https://shop.example/#shipping-service-2' ), array( '@id' => 'https://shop.example/#shipping-service-3' ) ) === $refs['shippingDetails']['hasShippingService'] );

	$GLOBALS['t']['options']['sgs_shipping_delivery_time'] = array( 'handlingMin' => 1, 'handlingMax' => 2, 'transitMin' => 2, 'transitMax' => 3 );
	Product_Shipping_Woo::reset_cache();
	$services = Product_Offer_Policy::shipping_service();
	$check( 'a delivery time set by the site prints as ServicePeriod transit time in the conditions', 'ServicePeriod' === $services[0]['shippingConditions']['transitTime']['@type'] && 2 === $services[0]['shippingConditions']['transitTime']['duration']['minValue'] && 3 === $services[0]['shippingConditions']['transitTime']['duration']['maxValue'] && 'DAY' === $services[0]['shippingConditions']['transitTime']['duration']['unitCode'] );
	$check( 'and as ServicePeriod handling time on the service itself', 1 === $services[0]['handlingTime']['duration']['minValue'] && 2 === $services[0]['handlingTime']['duration']['maxValue'] );
	$GLOBALS['t']['options']['sgs_shipping_delivery_time'] = array( 'transitMin' => 2 );
	Product_Shipping_Woo::reset_cache();
	$services = Product_Offer_Policy::shipping_service();
	$check( 'a half-filled range prints a single value, and handling is left out when blank', 2 === $services[0]['shippingConditions']['transitTime']['duration']['value'] && ! isset( $services[0]['handlingTime'] ) );
	$GLOBALS['t']['options']['sgs_shipping_delivery_time'] = array();

	// What WooCommerce can hold that Google cannot read is left out, not guessed.
	$GLOBALS['t']['zones'] = array(
		$uk_zone(
			array(
				$method( 'flat_rate', 'Off', array( 'cost' => '9' ), 'no' ),
				$method( 'flat_rate', 'Formula', array( 'cost' => '2 + [qty] * 1.5' ) ),
				$method( 'free_shipping', 'Coupon only', array( 'requires' => 'coupon' ) ),
				$method( 'free_shipping', 'Coupon and minimum', array( 'requires' => 'both', 'min_amount' => '50' ) ),
				$method( 'local_pickup', 'Collect', array( 'cost' => '0' ) ),
				$method( 'free_shipping', 'Always free', array( 'requires' => '' ) ),
				$method( 'free_shipping', 'Free with either', array( 'requires' => 'either', 'min_amount' => '20' ) ),
			)
		),
	);
	Product_Shipping_Woo::reset_cache();
	$services = Product_Offer_Policy::shipping_service();
	$names    = is_array( $services ) && isset( $services['name'] ) ? array( $services['name'] ) : array_column( (array) $services, 'name' );
	$check( 'a disabled method, a cost formula, a coupon rule and local pickup print nothing', array( 'Always free', 'Free with either' ) === $names, implode( ',', $names ) );
	$check( 'free shipping with no condition has no orderValue', ! isset( ( $services[0] ?? $services )['shippingConditions']['orderValue'] ) );

	$zone_state = (object) array( 'code' => 'GB:ENG', 'type' => 'state' );
	$zone_eu    = (object) array( 'code' => 'EU', 'type' => 'continent' );
	$zone_post  = static function ( string $code ) {
		return (object) array( 'code' => $code, 'type' => 'postcode' );
	};
	$region     = static function ( string $country, string $state = '' ) {
		return '' === $state ? array( '@type' => 'DefinedRegion', 'addressCountry' => $country ) : array( '@type' => 'DefinedRegion', 'addressCountry' => $country, 'addressRegion' => $state );
	};
	$published  = static function () {
		Product_Shipping_Woo::reset_cache();
		$all = Product_Offer_Policy::shipping_service();
		return null === $all ? array() : ( isset( $all['name'] ) ? array( $all ) : $all );
	};
	$dest_of    = static function ( array $service ) {
		$d = $service['shippingConditions']['shippingDestination'];
		return isset( $d['@type'] ) ? array( $d ) : $d;
	};
	$flat       = static function ( string $title, string $cost ) use ( $method ) {
		return array( $method( 'flat_rate', $title, array( 'cost' => $cost ) ) );
	};

	$GLOBALS['t']['zones'] = array( $uk_zone( $flat( 'Standard', '4' ), array( $zone_state, $zone_eu ) ) );
	$list = $published();
	$check( 'a state keeps its country and region and a continent expands to its countries', 1 === count( $list ) && array( $region( 'GB', 'ENG' ), $region( 'FR' ), $region( 'DE' ) ) === $dest_of( $list[0] ) );

	$GLOBALS['t']['zones'] = array(
		$uk_zone( $flat( 'Standard', '4' ), array( $zone_state, $zone_eu, $zone_post( 'B1 1AA' ) ) ),
		$uk_zone( $flat( 'Postcode only', '4' ), array( $zone_post( 'B1 1AA' ) ) ),
	);
	$check( 'a zone limited by postcode (alone, or beside a state or continent) prints nothing: its price is not for the whole area', array() === $published() );

	$GLOBALS['t']['zones'] = array(
		$uk_zone( $flat( 'UK', '3.95' ) ),
		$uk_zone( $flat( 'Highlands', '12' ), array( (object) array( 'code' => 'GB', 'type' => 'country' ), $zone_post( 'IV*' ), $zone_post( 'KW*' ) ) ),
	);
	$list = $published();
	$check( 'a Highlands zone (GB plus postcodes) after a UK zone prints only the UK service', 1 === count( $list ) && 'UK' === $list[0]['name'] && '3.95' === $list[0]['shippingConditions']['shippingRate']['value'] );
	$GLOBALS['t']['zones'] = array_reverse( $GLOBALS['t']['zones'] );
	$list = $published();
	$check( 'the Highlands zone placed first does not change that: the UK service still covers the country', 1 === count( $list ) && 'UK' === $list[0]['name'] );

	$GLOBALS['t']['zones'] = array(
		$uk_zone( $flat( 'UK', '3.95' ) ),
		$uk_zone( $flat( 'Europe', '9' ), array( (object) array( 'code' => 'EUA', 'type' => 'continent' ) ) ),
	);
	$list = $published();
	$check( 'a Europe zone after a UK zone is published without GB (WooCommerce charges the first matching zone)', 2 === count( $list ) && array( $region( 'GB' ) ) === $dest_of( $list[0] ) && array( $region( 'FR' ), $region( 'DE' ) ) === $dest_of( $list[1] ) );
	$GLOBALS['t']['zones'] = array_reverse( $GLOBALS['t']['zones'] );
	$list = $published();
	$check( 'a Europe zone before a UK zone keeps GB, and the UK zone prints nothing (GB is already Europe\'s)', 1 === count( $list ) && 'Europe' === $list[0]['name'] && array( $region( 'GB' ), $region( 'FR' ), $region( 'DE' ) ) === $dest_of( $list[0] ) );

	$GLOBALS['t']['zones'] = array(
		$uk_zone( $flat( 'England', '4' ), array( $zone_state ) ),
		$uk_zone( $flat( 'Rest of UK', '8' ), array( (object) array( 'code' => 'GB', 'type' => 'country' ), (object) array( 'code' => 'GB:ENG', 'type' => 'state' ), (object) array( 'code' => 'GB:SCT', 'type' => 'state' ) ) ),
	);
	$list = $published();
	$check( 'a state already priced by an earlier zone is not priced again, and a whole country that contains it is left out rather than priced wrongly', 2 === count( $list ) && array( $region( 'GB', 'ENG' ) ) === $dest_of( $list[0] ) && array( $region( 'GB', 'SCT' ) ) === $dest_of( $list[1] ) );

	$GLOBALS['t']['zones'] = array( $uk_zone( $flat( 'Twice', '5' ), array( (object) array( 'code' => 'FR', 'type' => 'country' ), $zone_eu ) ) );
	$list = $published();
	$check( 'a country named twice in one zone (directly and through a continent) is printed once', 1 === count( $list ) && array( $region( 'FR' ), $region( 'DE' ) ) === $dest_of( $list[0] ) );

	$GLOBALS['t']['zones'] = array();
	Product_Shipping_Woo::reset_cache();
	$check( 'opted in with no zones prints nothing', null === Product_Offer_Policy::shipping_service() );

	// The hand-set override option still wins, in Google's ServicePeriod shape.
	$GLOBALS['t']['zones'] = array( $mamas() );
	$GLOBALS['t']['options']['sgs_configurator_shipping'] = array(
		'shippingRate' => array( '@type' => 'MonetaryAmount', 'value' => '3.95', 'currency' => 'GBP' ),
		'deliveryTime' => array(
			'handlingTime' => array( '@type' => 'QuantitativeValue', 'minValue' => 1, 'maxValue' => 2, 'unitCode' => 'DAY' ),
			'transitTime'  => array( '@type' => 'QuantitativeValue', 'minValue' => 3, 'maxValue' => 5, 'unitCode' => 'DAY' ),
		),
	);
	Product_Shipping_Woo::reset_cache();
	$service = Product_Offer_Policy::shipping_service();
	$check( 'the hand-set option wins over WooCommerce\'s settings', 'https://shop.example/#shipping-service' === $service['@id'] && isset( $service['shippingConditions']['shippingRate'] ) );
	$check( 'its transit time is a ServicePeriod holding the QuantitativeValue, as Google reads it', 'ServicePeriod' === $service['shippingConditions']['transitTime']['@type'] && 5 === $service['shippingConditions']['transitTime']['duration']['maxValue'] );
	$check( 'its handling time sits on the service, not in the conditions', 'ServicePeriod' === $service['handlingTime']['@type'] && ! isset( $service['shippingConditions']['handlingTime'] ) );

	// ── 3b. Shipping classes: a product's own rates, as WooCommerce charges a basket holding only that product. ──
	$letterbox  = (object) array( 'term_id' => 73, 'slug' => 'letterbox', 'name' => 'letterbox' );
	$mamas_live = static function () use ( $method, $uk_zone ) {
		return $uk_zone(
			array(
				$method( 'free_shipping', 'Free delivery', array( 'requires' => 'min_amount', 'min_amount' => '35' ) ),
				$method( 'flat_rate', 'Royal Mail Tracked 48', array( 'cost' => '0', 'type' => 'class', 'no_class_cost' => '3.95', 'class_cost_73' => '0' ) ),
				$method( 'flat_rate', 'Royal Mail Tracked 24', array( 'cost' => '5.45', 'type' => 'class', 'class_cost_73' => '' ) ),
			)
		);
	};
	$setup = static function ( array $zones, array $classes ) use ( $reset ): void {
		$reset();
		$GLOBALS['t']['zones']   = $zones;
		$GLOBALS['t']['classes'] = $classes;
		$GLOBALS['t']['options']['sgs_shipping_from_woocommerce'] = '1';
		Product_Shipping_Woo::reset_cache();
	};
	$one_zone = static function ( array $methods ) use ( $uk_zone ) { return array( $uk_zone( $methods ) ); };
	$rates_of = static function ( $details ): array {
		$list = isset( $details['@type'] ) ? array( $details ) : (array) $details;
		return array_map( static fn( $d ) => $d['shippingRate']['value'] ?? '?', $list );
	};
	$offer_of = static function ( WC_Product $p ) { return \SGS\Blocks\Product_Schema_Simple::build_node( $p )['offers']; };
	$service_names = static function (): array {
		$s = Product_Offer_Policy::shipping_service();
		return null === $s ? array() : array_column( isset( $s['name'] ) ? array( $s ) : $s, 'name' );
	};
	$classed = static function ( int $id, array $over = array() ) {
		return new WC_Product( $over + array( 'id' => $id, 'type' => 'simple', 'name' => 'Classed', 'class_id' => 73, 'class_slug' => 'letterbox' ) );
	};

	$setup( array( $mamas_live() ), array( $letterbox ) );
	$services = Product_Offer_Policy::shipping_service();
	$check( 'the shop-wide service states the price for a product with no class: cost plus the no-class cost (3.95, 5.45)', '3.95' === $services[1]['shippingConditions']['shippingRate']['value'] && '5.45' === $services[2]['shippingConditions']['shippingRate']['value'] && '35.00' === $services[0]['shippingConditions']['orderValue']['minValue'], json_encode( array_column( array_column( $services, 'shippingConditions' ), 'shippingRate' ) ) );
	$trio  = $classed( 11, array( 'name' => 'Taster Trio', 'exc' => 5.0, 'inc' => 5.0 ) );
	$offer = $offer_of( $trio );
	$check( 'Mama\'s Taster Trio (class letterbox): Tracked 48 is 0.00 and Tracked 24 is 5.45 on its own offer', array( '0.00', '5.45' ) === $rates_of( $offer['shippingDetails'] ), json_encode( $offer['shippingDetails'] ) );
	$check( 'each is an OfferShippingDetails with the zone\'s destination and no reference to the shop-wide service', 'OfferShippingDetails' === $offer['shippingDetails'][0]['@type'] && 'GB' === $offer['shippingDetails'][1]['shippingDestination']['addressCountry'] && ! isset( $offer['shippingDetails'][0]['hasShippingService'] ) );
	$check( 'free shipping over 35 is left out for a 5.00 product (a one-item basket does not reach it)', 2 === count( $offer['shippingDetails'] ) );
	$check( 'the override passes the schema.org check', array() === $problems( $offer ), implode( '; ', $problems( $offer ) ) );
	$plain = new WC_Product( array( 'id' => 12, 'type' => 'simple', 'name' => 'Cookies', 'exc' => 12.0 ) );
	$offer = $offer_of( $plain );
	$check( 'a product with no class keeps the reference to the shop-wide service (three services)', 'OfferShippingDetails' === $offer['shippingDetails']['@type'] && 3 === count( $offer['shippingDetails']['hasShippingService'] ) && ! isset( $offer['shippingDetails']['shippingRate'] ) );
	$check( 'free shipping over 35 is printed for a classed product whose basket price reaches it (40 without VAT, the default basket display)', array( '0.00', '0.00', '5.45' ) === $rates_of( $offer_of( $classed( 13, array( 'exc' => 40.0, 'inc' => 48.0 ) ) )['shippingDetails'] ) );
	$boxed = $classed( 14, array( 'exc' => 30.0, 'inc' => 36.0 ) );
	$check( 'and not for 30 without VAT, though 36 with VAT would reach it', array( '0.00', '5.45' ) === $rates_of( $offer_of( $boxed )['shippingDetails'] ) );
	$GLOBALS['t']['options']['woocommerce_tax_display_cart'] = 'incl';
	$check( 'the minimum is compared with the VAT-inclusive price when the basket shows prices with VAT', array( '0.00', '0.00', '5.45' ) === $rates_of( $offer_of( $boxed )['shippingDetails'] ) );
	$GLOBALS['t']['options']['woocommerce_tax_display_cart'] = 'excl';

	$GLOBALS['t']['options']['sgs_shipping_delivery_time'] = array( 'handlingMin' => 1, 'handlingMax' => 2, 'transitMin' => 2, 'transitMax' => 3 );
	$time = $offer_of( $trio )['shippingDetails'][0]['deliveryTime'] ?? array();
	$check( 'the delivery time the site set prints on each override in the offer-level shape', 'ShippingDeliveryTime' === ( $time['@type'] ?? '' ) && 3 === ( $time['transitTime']['maxValue'] ?? 0 ) && 'DAY' === ( $time['transitTime']['unitCode'] ?? '' ) && 1 === ( $time['handlingTime']['minValue'] ?? 0 ), json_encode( $time ) );
	$bad = $problems( $offer_of( $trio ) );
	$check( 'and the override with a delivery time passes the schema.org check', array() === $bad, implode( '; ', $bad ) );
	$GLOBALS['t']['options']['sgs_shipping_delivery_time'] = array();

	$check( 'the settings preview data lists the class whose prices differ', array( 'letterbox' => 'Royal Mail Tracked 48 £0, Royal Mail Tracked 24 £5.45' ) === Product_Shipping_Woo::class_differences(), json_encode( Product_Shipping_Woo::class_differences() ) );
	ob_start();
	Shop_Policy_Settings::render_page();
	$page = ob_get_clean();
	$check( 'the settings page prints it, so the shop sees it before ticking the box', str_contains( $page, 'letterbox: Royal Mail Tracked 48 £0, Royal Mail Tracked 24 £5.45' ) );
	$setup( array( $mamas() ), array( $letterbox ) );
	$check( 'a class that changes no price is not listed (no class cost fields set)', array() === Product_Shipping_Woo::class_differences() );

	// A variation: its own class (WooCommerce reports the parent's when the variation says "same as parent").
	$setup( array( $mamas_live() ), array( $letterbox ) );
	$GLOBALS['t']['products'][10]  = $rg_product();
	$GLOBALS['t']['products'][258] = $classed( 258, array( 'type' => 'variation', 'exc' => 12.5 ) );
	$group = $build_group( $GLOBALS['t']['products'][10] );
	$check( 'a variation in class letterbox carries its own rates on its Offer', array( '0.00', '5.45' ) === $rates_of( $group['hasVariant'][0]['offers']['shippingDetails'] ), json_encode( $group['hasVariant'][0]['offers']['shippingDetails'] ) );
	$check( 'while the group, whose parent has no class, keeps the full shop-wide service', 3 === count( $group['offers']['shippingDetails']['hasShippingService'] ) );
	$GLOBALS['t']['products'][258] = new WC_Product( array( 'id' => 258, 'type' => 'variation', 'exc' => 12.5 ) );
	$group = $build_group( $GLOBALS['t']['products'][10] );
	$check( 'a variation with no class points at the shop-wide service by @id', array( '@id' => 'https://shop.example/#shipping-service-1' ) === $group['hasVariant'][0]['offers']['shippingDetails']['hasShippingService'][0] );
	$GLOBALS['t']['products'][10]  = $rg_product( array( 'class_id' => 73, 'class_slug' => 'letterbox' ) );
	$GLOBALS['t']['products'][258] = $classed( 258, array( 'type' => 'variation', 'exc' => 12.5 ) );
	$group = $build_group( $GLOBALS['t']['products'][10] );
	$check( 'a parent in class letterbox whose variation inherits it: the group and the variant both carry the class rates', array( '0.00', '5.45' ) === $rates_of( $group['offers']['shippingDetails'] ) && array( '0.00', '5.45' ) === $rates_of( $group['hasVariant'][0]['offers']['shippingDetails'] ) );
	$bad = $problems( $group );
	$check( 'the group with class rates passes the schema.org check', array() === $bad, implode( '; ', $bad ) );

	// An empty class cost adds nothing; a method with every cost empty is not offered; a formula excludes the method.
	$setup( $one_zone( array(
		$method( 'flat_rate', 'Standard', array( 'cost' => '2', 'class_cost_73' => '' ) ),
		$method( 'flat_rate', 'Only no-class', array( 'cost' => '', 'no_class_cost' => '4', 'class_cost_73' => '' ) ),
	) ), array( $letterbox ) );
	$check( 'a product with no class: Standard at its cost and the second method at its no-class cost', array( 'Standard', 'Only no-class' ) === $service_names() && '4.00' === Product_Offer_Policy::shipping_service()[1]['shippingConditions']['shippingRate']['value'] );
	$check( 'in the class, an empty class cost adds nothing (Standard stays 2.00) and the method with every cost field empty is not offered', array( '2.00' ) === $rates_of( $offer_of( $classed( 15 ) )['shippingDetails'] ), json_encode( $offer_of( $classed( 15 ) )['shippingDetails'] ) );
	$setup( $one_zone( array(
		$method( 'flat_rate', 'Parcel', array( 'cost' => '3', 'no_class_cost' => '1', 'class_cost_73' => '[qty] * 2' ) ),
		$method( 'flat_rate', 'Letter', array( 'cost' => '1', 'class_cost_73' => '0.5' ) ),
	) ), array( $letterbox ) );
	$check( 'a formula class cost leaves that method out for the class (never a guessed price)', array( '1.50' ) === $rates_of( $offer_of( $classed( 15 ) )['shippingDetails'] ), json_encode( $offer_of( $classed( 15 ) )['shippingDetails'] ) );
	$setup( $one_zone( array(
		$method( 'flat_rate', 'Formula base', array( 'cost' => '2 + [qty] * 1.5', 'class_cost_73' => '1' ) ),
		$method( 'flat_rate', 'Plain', array( 'cost' => '2', 'class_cost_73' => '1' ) ),
	) ), array( $letterbox ) );
	$check( 'a formula in the method\'s own cost leaves it out of the shop-wide service and of every product', array( 'Plain' ) === $service_names() && array( '3.00' ) === $rates_of( $offer_of( $classed( 15 ) )['shippingDetails'] ) );
	$setup( $one_zone( array( $method( 'flat_rate', 'Per order', array( 'cost' => '4', 'type' => 'order', 'class_cost_73' => '-1' ) ) ) ), array( $letterbox ) );
	$check( 'a "per order" method ignores a negative class cost, so the rates match and the Offer keeps the reference', isset( $offer_of( $classed( 15 ) )['shippingDetails']['hasShippingService'] ) );
	$setup( $one_zone( array( $method( 'flat_rate', 'Per class', array( 'cost' => '4', 'type' => 'class', 'class_cost_73' => '1.5' ) ) ) ), array( $letterbox ) );
	$check( 'a "per class" method adds the class cost to the method cost (4 + 1.5)', array( '5.50' ) === $rates_of( $offer_of( $classed( 15 ) )['shippingDetails'] ) );
	$setup( $one_zone( array( $method( 'flat_rate', 'No classes', array( 'cost' => '3', 'no_class_cost' => '1', 'class_cost_73' => '9' ) ) ) ), array() );
	$check( 'a shop with no shipping classes adds no class cost at all, as WooCommerce does', '3.00' === Product_Offer_Policy::shipping_service()['shippingConditions']['shippingRate']['value'] && isset( $offer_of( $classed( 15 ) )['shippingDetails']['hasShippingService'] ) );
	$setup( array( $mamas_live() ), array( $letterbox ) );
	$GLOBALS['t']['options']['sgs_configurator_shipping'] = array( 'shippingRate' => array( '@type' => 'MonetaryAmount', 'value' => '9.99', 'currency' => 'GBP' ) );
	$check( 'the hand-set shipping option still wins over a product\'s class rates', '9.99' === $offer_of( $trio )['shippingDetails']['hasShippingService']['shippingConditions']['shippingRate']['value'] );
	$GLOBALS['t']['options']['sgs_configurator_shipping'] = array();
	$GLOBALS['t']['options']['sgs_shipping_from_woocommerce'] = '';
	$check( 'a site that has not opted in prints no shipping for a classed product either', ! isset( $offer_of( $trio )['shippingDetails'] ) );

	// ── 4. Return policy: the option, and the settings screen that writes it. ──
	$reset();
	$check( 'no option, no return policy', null === Product_Offer_Policy::returns() );
	$clean = Shop_Policy_Settings::sanitise_returns( array( 'returnPolicyCategory' => 'https://schema.org/MerchantReturnNotPermitted', 'applicableCountry' => 'gb' ) );
	$check( 'not permitted + country saves the schema.org object with an upper-case country', array( '@type' => 'MerchantReturnPolicy', 'applicableCountry' => 'GB', 'returnPolicyCategory' => 'https://schema.org/MerchantReturnNotPermitted' ) === $clean, json_encode( $clean ) );
	$GLOBALS['t']['options']['sgs_configurator_returns'] = $clean;
	$policy = Product_Offer_Policy::returns();
	$check( 'the policy prints on the Offer fields and carries the store country as returnPolicyCountry', 'GB' === $policy['returnPolicyCountry'] && 'https://schema.org/MerchantReturnNotPermitted' === Product_Offer_Policy::offer_fields()['hasMerchantReturnPolicy']['returnPolicyCategory'] );
	$check( 'no category saves no policy (the shop has none to publish)', array() === Shop_Policy_Settings::sanitise_returns( array( 'returnPolicyCategory' => '', 'applicableCountry' => 'GB' ) ) );
	$check( 'a category outside the three Google allows saves nothing', array() === Shop_Policy_Settings::sanitise_returns( array( 'returnPolicyCategory' => 'https://schema.org/Nonsense', 'applicableCountry' => 'GB' ) ) );
	$GLOBALS['t']['errors'] = array();
	$kept = Shop_Policy_Settings::sanitise_returns( array( 'returnPolicyCategory' => 'https://schema.org/MerchantReturnNotPermitted', 'applicableCountry' => '' ) );
	$check( 'a policy with no country is refused with a message and keeps the stored value', 'sgs_returns_country' === ( $GLOBALS['t']['errors'][0] ?? '' ) && $kept === $clean );
	$GLOBALS['t']['errors'] = array();
	Shop_Policy_Settings::sanitise_returns( array( 'returnPolicyCategory' => 'https://schema.org/MerchantReturnFiniteReturnWindow', 'applicableCountry' => 'GB', 'merchantReturnDays' => '' ) );
	$check( 'a finite window with no number of days is refused with a message', 'sgs_returns_days' === ( $GLOBALS['t']['errors'][0] ?? '' ) );
	$finite = Shop_Policy_Settings::sanitise_returns( array( 'returnPolicyCategory' => 'https://schema.org/MerchantReturnFiniteReturnWindow', 'applicableCountry' => 'GB', 'merchantReturnDays' => '14', 'returnMethod' => 'https://schema.org/ReturnByMail', 'returnFees' => 'https://schema.org/FreeReturn' ) );
	$check( 'a finite window saves days as a number, with method and fees', 14 === $finite['merchantReturnDays'] && 'https://schema.org/ReturnByMail' === $finite['returnMethod'] && 'https://schema.org/FreeReturn' === $finite['returnFees'] );
	$other = Shop_Policy_Settings::sanitise_returns( array( 'returnPolicyCategory' => 'https://schema.org/MerchantReturnNotPermitted', 'applicableCountry' => 'GB', 'merchantReturnDays' => '30', 'returnMethod' => 'https://schema.org/ReturnByMail' ) );
	$check( 'days, method and fees are dropped when returns are not permitted', ! isset( $other['merchantReturnDays'] ) && ! isset( $other['returnMethod'] ) );
	$GLOBALS['t']['options']['sgs_configurator_returns'] = $clean + array( 'refundType' => 'https://schema.org/FullRefund' );
	$check( 'a stored key the form does not show (set by WP-CLI) is kept', 'https://schema.org/FullRefund' === ( Shop_Policy_Settings::sanitise_returns( $finite )['refundType'] ?? '' ) );
	$GLOBALS['t']['options']['sgs_configurator_returns'] = $clean;
	$check( 'a submitted key the form does not show is dropped, never printed into the structured data', ! isset( Shop_Policy_Settings::sanitise_returns( $finite + array( 'name' => '</script><script>x()</script>' ) )['name'] ) );
	$check( 'delivery time input: whole numbers kept, blanks and junk dropped', array( 'transitMin' => 2, 'transitMax' => 3 ) === Shop_Policy_Settings::sanitise_delivery_time( array( 'handlingMin' => '', 'handlingMax' => 'x', 'transitMin' => '2', 'transitMax' => '3' ) ) );
	$check( 'delivery time: a range typed the wrong way round is turned round, never printed inverted', array( 'transitMin' => 2, 'transitMax' => 4 ) === Shop_Policy_Settings::sanitise_delivery_time( array( 'transitMin' => '4', 'transitMax' => '2' ) ) );
	$check( 'the opt-in is saved as 1 or nothing', '1' === Shop_Policy_Settings::sanitise_flag( 'on' ) && '' === Shop_Policy_Settings::sanitise_flag( '' ) );

	// ── 5. Ratings and reviews: the product's own approved reviews only. ──
	$review = static function ( int $id, string $author, string $rating, string $body = 'Lovely.', string $date = '2026-10-02 09:30:00' ) {
		$GLOBALS['t']['cmeta'][ $id ]['rating'] = $rating;
		return (object) array( 'comment_ID' => $id, 'comment_author' => $author, 'comment_content' => $body, 'comment_date_gmt' => $date );
	};
	$reset();
	$GLOBALS['t']['options']['sgs_trustpilot_data'] = array( 'rating' => 4.3, 'count' => 8 );
	$GLOBALS['t']['options']['sgs_google_reviews'] = array( 'rating' => 4.9, 'count' => 120 );
	$p = $rg_product();
	$check( 'a product with no WooCommerce reviews prints no aggregateRating and no review, whatever a third party holds', array() === Product_Reviews::fields( $p ) );
	$GLOBALS['t']['products'][10] = $p;
	$group = $build_group( $p );
	$check( 'and neither does its ProductGroup', ! isset( $group['aggregateRating'] ) && ! isset( $group['review'] ) );

	$p = $rg_product( array( 'avg' => '4.5', 'ratings' => 2, 'reviews' => 3 ) );
	$GLOBALS['t']['comments'][10] = array( $review( 1, 'Amira', '5', 'Brilliant <b>cookies</b>.' ), $review( 2, 'Sam', '4' ), $review( 3, 'Kit', '', 'No stars given.' ), $review( 4, '', '5' ) );
	$f = Product_Reviews::fields( $p );
	$check( 'approved rated reviews print aggregateRating from WooCommerce\'s own average and counts', '4.5' === (string) $f['aggregateRating']['ratingValue'] && 2 === $f['aggregateRating']['ratingCount'] && 3 === $f['aggregateRating']['reviewCount'] && 5 === $f['aggregateRating']['bestRating'] && 1 === $f['aggregateRating']['worstRating'] );
	$check( 'a review prints author, date, plain-text body and its rating', 'Person' === $f['review'][0]['author']['@type'] && 'Amira' === $f['review'][0]['author']['name'] && '2026-10-02' === $f['review'][0]['datePublished'] && 'Brilliant cookies.' === $f['review'][0]['reviewBody'] && 5 === $f['review'][0]['reviewRating']['ratingValue'] );
	$check( 'a review with no star rating or no author name is left out', 2 === count( $f['review'] ) );
	$ask = $GLOBALS['t']['asked'][ count( $GLOBALS['t']['asked'] ) - 1 ];
	$check( 'only this product\'s approved reviews are read', 10 === $ask['post_id'] && 'approve' === $ask['status'] && 'review' === $ask['type'] );
	$GLOBALS['t']['products'][10] = $p;
	$group = $build_group( $p );
	$check( 'the ProductGroup carries both', isset( $group['aggregateRating'], $group['review'] ) );
	$p = $rg_product( array( 'avg' => '0', 'ratings' => 0, 'reviews' => 2 ) );
	$check( 'reviews with no star ratings print no aggregateRating (a zero average is never printed)', ! isset( Product_Reviews::fields( $p )['aggregateRating'] ) );
	$many = array();
	for ( $i = 1; $i <= 12; $i++ ) { $many[] = $review( 100 + $i, 'Person ' . $i, '5' ); }
	$GLOBALS['t']['comments'][10] = $many;
	$check( 'no more than ten reviews print', 10 === count( Product_Reviews::fields( $rg_product( array( 'avg' => '5', 'ratings' => 12, 'reviews' => 12 ) ) )['review'] ) );

	$reset();
	$GLOBALS['t']['products'][11] = new WC_Product( array( 'id' => 11, 'type' => 'simple', 'name' => 'Taster Trio', 'avg' => '4', 'ratings' => 1, 'reviews' => 1 ) );
	$GLOBALS['t']['comments'][11] = array( $review( 7, 'Dee', '4' ) );
	$simple = \SGS\Blocks\Product_Schema_Simple::build_node( $GLOBALS['t']['products'][11] );
	$check( 'a simple product prints the same aggregateRating and review', 4 === $simple['review'][0]['reviewRating']['ratingValue'] && 1 === $simple['aggregateRating']['ratingCount'] );
	$GLOBALS['t']['comments'][11] = array();
	$GLOBALS['t']['products'][11] = new WC_Product( array( 'id' => 11, 'type' => 'simple', 'name' => 'Taster Trio' ) );
	$simple = \SGS\Blocks\Product_Schema_Simple::build_node( $GLOBALS['t']['products'][11] );
	$check( 'a simple product with no reviews prints neither', ! isset( $simple['aggregateRating'] ) && ! isset( $simple['review'] ) );

	// ── 6. Everything printed passes the schema.org check, in the fullest state a shop can reach. ──
	$reset();
	$GLOBALS['t']['zones']   = array( $mamas() );
	$GLOBALS['t']['options'] += array(
		'sgs_shipping_from_woocommerce' => '1',
		'sgs_shipping_delivery_time'    => array( 'handlingMin' => 1, 'handlingMax' => 2, 'transitMin' => 2, 'transitMax' => 3 ),
		'sgs_configurator_returns'      => $clean,
	);
	Product_Shipping_Woo::reset_cache();
	$p = $rg_product( array( 'short' => 'Baked to order.', 'avg' => '4.5', 'ratings' => 2, 'reviews' => 2 ) );
	$GLOBALS['t']['comments'][10] = array( $review( 1, 'Amira', '5' ), $review( 2, 'Sam', '4' ) );
	$GLOBALS['t']['products'][10] = $p;
	$group = $build_group( $p );
	$bad   = $problems( $group );
	$check( 'the full ProductGroup passes the schema.org check', array() === $bad, implode( '; ', $bad ) );
	$check( 'the group and each variant Offer carry the three policies, in full once and by @id after', 'AggregateOffer' === $group['offers']['@type'] && 3 === count( $group['offers']['shippingDetails']['hasShippingService'] ) && isset( $group['offers']['hasMerchantReturnPolicy']['returnPolicyCategory'] ) && array( '@id' => 'https://shop.example/#return-policy' ) === $group['hasVariant'][0]['offers']['hasMerchantReturnPolicy'] );
	$check( 'the Organisation\'s policy nodes pass the check', array() === $problems( array( 'ps' => Product_Offer_Policy::shipping_service(), 'rp' => Product_Offer_Policy::returns() ) ) );
	// SEC-9: with an SEO plugin owning the Organisation and WebSite schema, SGS prints none of the policy nodes.
	require_once $inc . 'class-org-website-schema.php';
	$GLOBALS['t']['filters']['sgs_seo_plugin_owns_schema'] = array( static fn() => true );
	ob_start();
	\SGS\Blocks\Org_Website_Schema::emit();
	$check( 'an SEO plugin owning the Organisation schema: no shipping, return or other node is printed', '' === ob_get_clean() );
	$GLOBALS['t']['filters']['sgs_seo_plugin_owns_schema'] = array();
	$GLOBALS['t']['filters']['sgs_seo_plugin_owns_product_schema'] = array( static fn() => true );
	$GLOBALS['t']['products'][11] = new WC_Product( array( 'id' => 11, 'type' => 'simple', 'avg' => '4', 'ratings' => 1, 'reviews' => 1 ) );
	$GLOBALS['t']['comments'][11] = array( $review( 7, 'Dee', '4' ) );
	$owned = new ReflectionMethod( 'SGS\Blocks\Product_Page_Schema', 'script_for' );
	$owned->setAccessible( true );
	$check( 'an SEO plugin printing Product: the plain product prints nothing, reviews and policies included', '' === $owned->invoke( null, $GLOBALS['t']['products'][11] ) );
	$GLOBALS['t']['filters']['sgs_seo_plugin_owns_product_schema'] = array();
	$check( 'the checker itself fails a wrong key (it can fail)', array() !== $problems( array( '@type' => 'ShippingConditions', 'handlingTime' => 1 ) ) );

	echo "\n==== " . ( $total - $failures ) . ' of ' . $total . ' checks passed (' . $failures . " failed) ====\n";
	exit( $failures > 0 ? 1 : 0 );
}
