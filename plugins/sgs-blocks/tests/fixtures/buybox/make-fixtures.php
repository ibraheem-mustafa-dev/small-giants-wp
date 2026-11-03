<?php
/**
 * Writes the hand-made buy box render fixtures (standard, guided, bound, unbound) beside this file.
 *
 * Real exports from a mirror (scripts/local-wp/export-block-tree.php) drop in as further <name>.json files of the same
 * shape: attrs, product, manifest, context, optional queried. Run: php make-fixtures.php
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

$combo = static function ( int $id, int $price, string $img ): array {
	return array(
		'variationId' => $id, 'priceMinor' => $price, 'regularMinor' => $price, 'saleMinor' => 0, 'pctOff' => 0, 'pctDisplay' => '',
		'inStock' => true, 'imageUrl' => $img, 'hasOwnImage' => true, 'exMinor' => $price, 'taxMinor' => 0, 'regularExMinor' => $price,
		'unitDivisor' => 1, 'unitLabel' => '', 'discountLabel' => '', 'incMinor' => $price, 'sku' => 'T-' . $id, 'gtin' => '', 'saleEndDate' => '',
		'gallery' => array( array( 'url' => $img, 'w' => 800, 'h' => 800, 'alt' => 'Box' ) ),
	);
};
$combos = array();
$n      = 61;
foreach ( array( 'small' => 900, 'large' => 1500 ) as $size => $price ) {
	foreach ( array( 'red', 'blue' ) as $colour ) {
		$combos[ "pa_size:$size|pa_colour:$colour" ] = $combo( $n++, $price, "https://example.test/box-$size-$colour.jpg" );
	}
}
$manifest = array(
	'decimals' => 2, 'currencySymbol' => '£', 'generatedAt' => 1767225600,
	'axes' => array(
		array( 'taxonomy' => 'pa_size', 'label' => 'Size', 'variesBy' => 'size', 'terms' => array( array( 'slug' => 'small', 'label' => 'Small' ), array( 'slug' => 'large', 'label' => 'Large' ) ) ),
		array( 'taxonomy' => 'pa_colour', 'label' => 'Colour', 'variesBy' => 'color', 'terms' => array( array( 'slug' => 'red', 'label' => 'Red' ), array( 'slug' => 'blue', 'label' => 'Blue' ) ) ),
	),
	'combos' => $combos, 'defaultKey' => 'pa_size:small|pa_colour:red', 'defaultAxes' => array( 'pa_size' => 'small', 'pa_colour' => 'red' ),
);
$product  = array(
	'id' => 52, 'name' => 'Test box', 'price_html' => '<span class="woocommerce-Price-amount amount">£9</span>', 'price' => '9',
	'type' => 'variable', 'image_id' => 7, 'image_url' => 'https://example.test/box.jpg', 'short_description' => 'A box.',
	'in_stock' => true, 'variation_price_min' => '9', 'variation_price_max' => '15',
);
$fixtures = array(
	'standard' => array( 'attrs' => array( 'productId' => 52 ), 'context' => array( 'postId' => 52 ) ),
	'guided'   => array( 'attrs' => array( 'productId' => 52, 'buyboxLayout' => 'guided' ), 'context' => array( 'postId' => 52 ) ),
	'bound'    => array( 'attrs' => array( 'productId' => 52, 'stickyBar' => array( 'mobile' => 'after-button' ) ), 'context' => array( 'postId' => 52 ) ),
	'unbound'  => array( 'attrs' => array( 'productId' => 52 ), 'context' => new stdClass(), 'queried' => array( 'id' => 52, 'post_type' => 'product' ) ),
);
foreach ( $fixtures as $name => $fixture ) {
	$fixture['product']  = $product;
	$fixture['manifest'] = $manifest;
	file_put_contents( __DIR__ . "/$name.json", json_encode( $fixture, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . "\n" );
}
