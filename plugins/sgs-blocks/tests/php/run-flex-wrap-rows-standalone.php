<?php
/**
 * Standalone test: a row's wrap setting reaches the page as a per-instance `flex-wrap` rule.
 *
 * Renders sgs/product-card and sgs/buybox through the REAL render.php in the QA harness (a child process,
 * scripts/qa/lib/render-css-harness.php) and finds the rule `includes/helpers-flex-wrap.php::sgs_flex_wrap_css` prints
 * for each wrap attribute, and none for the empty default. Covers the rows `scripts/check-row-flex-wrap.py` holds
 * the commerce blocks to.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-flex-wrap-rows-standalone.php
 */

// phpcs:disable
$failures = 0;
$passes   = 0;
function ok( bool $cond, string $label ): void {
	global $failures, $passes;
	if ( $cond ) {
		++$passes;
		echo "PASS  {$label}\n";
	} else {
		++$failures;
		echo "FAIL  {$label}\n";
	}
}

$product  = array(
	'id'                  => 52,
	'name'                => 'Oak table',
	'price_html'          => '<span class="woocommerce-Price-amount amount">£120</span>',
	'price'               => '120',
	'type'                => 'variable',
	'image_id'            => 7,
	'image_url'           => 'https://example.test/oak.jpg',
	'short_description'   => 'Solid oak.',
	'in_stock'            => true,
	'variation_price_min' => '90',
	'variation_price_max' => '150',
);
$combo    = static function ( int $id, int $price, string $img ): array {
	return array(
		'variationId' => $id, 'priceMinor' => $price, 'regularMinor' => $price, 'saleMinor' => 0, 'pctOff' => 0,
		'pctDisplay' => '', 'inStock' => true, 'imageUrl' => $img, 'hasOwnImage' => true, 'exMinor' => $price,
		'taxMinor' => 0, 'regularExMinor' => $price, 'unitDivisor' => 1, 'unitLabel' => '', 'discountLabel' => '',
		'incMinor' => $price, 'sku' => 'OAK-' . $id, 'gtin' => '', 'saleEndDate' => '',
		'gallery' => array(
			array( 'url' => $img, 'w' => 800, 'h' => 800, 'alt' => 'Oak table' ),
			array( 'url' => str_replace( '.jpg', '-2.jpg', $img ), 'w' => 800, 'h' => 800, 'alt' => 'Oak table, side' ),
		),
	);
};
$manifest = array(
	'decimals' => 2, 'currencySymbol' => '£', 'generatedAt' => 1767225600,
	'axes'     => array( array( 'taxonomy' => 'pa_size', 'label' => 'Size', 'variesBy' => 'size', 'terms' => array( array( 'slug' => 'small', 'label' => 'Small' ), array( 'slug' => 'large', 'label' => 'Large' ) ) ) ),
	'combos'   => array(
		'pa_size:small' => $combo( 61, 9000, 'https://example.test/oak-small.jpg' ),
		'pa_size:large' => $combo( 62, 15000, 'https://example.test/oak-large.jpg' ),
	),
	'defaultKey' => 'pa_size:small', 'defaultAxes' => array( 'pa_size' => 'small' ),
);

/**
 * The CSS the real render.php prints for the attributes, from the QA harness.
 */
function render_css( string $slug, array $attrs, array $extra = array() ): string {
	$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
	$files   = array();
	foreach ( array_merge( array( 'attrs' => $attrs ), $extra ) as $key => $value ) {
		$files[ $key ] = tempnam( sys_get_temp_dir(), 'sgsfw' );
		file_put_contents( $files[ $key ], json_encode( $value, JSON_THROW_ON_ERROR ) );
	}
	$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug ' . $slug . ' --motion-targets --attrs-file ' . escapeshellarg( $files['attrs'] );
	foreach ( array( 'product', 'manifest', 'context' ) as $opt ) {
		if ( isset( $files[ $opt ] ) ) {
			$cmd .= ' --' . $opt . '-file ' . escapeshellarg( $files[ $opt ] );
		}
	}
	$out = (string) shell_exec( $cmd . ' 2>&1' );
	array_map( 'unlink', $files );
	$start   = strpos( $out, '{"ok"' );
	$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
	if ( ! is_array( $decoded ) || empty( $decoded['ok'] ) ) {
		echo "NOTRUN {$slug}: " . ( $decoded['error'] ?? $out ) . "\n";
		return '';
	}
	$GLOBALS['last_html'] = (string) $decoded['html'];
	return (string) $decoded['css'];
}

function has_rule( string $css, string $selector_tail, string $value ): bool {
	return 1 === preg_match( '/' . preg_quote( $selector_tail, '/' ) . '\{flex-wrap:' . $value . ';\}/', $css );
}

// product-card: the typed card renders swatches, buttons, price row and thumbnails.
$css = render_css( 'sgs/product-card', array( 'swatchesFlexWrap' => 'nowrap', 'ctaRowFlexWrap' => 'wrap', 'priceRowFlexWrap' => 'nowrap', 'thumbsFlexWrap' => 'wrap' ) );
ok( has_rule( $css, ' .sgs-product-card__swatches', 'nowrap' ), 'product-card swatchesFlexWrap nowrap prints a flex-wrap rule on the swatch row' );
ok( has_rule( $css, ' .sgs-product-card__cta-row', 'wrap' ), 'product-card ctaRowFlexWrap wrap prints a rule on the buttons row' );
ok( has_rule( $css, ' .sgs-product-card__price-row', 'nowrap' ), 'product-card priceRowFlexWrap nowrap prints a rule on the price row' );
ok( has_rule( $css, ' .product-card__thumbs', 'wrap' ), 'product-card thumbsFlexWrap wrap prints a rule on the thumbnail strip' );
$css = render_css( 'sgs/product-card', array() );
ok( '' !== $GLOBALS['last_html'] && false === strpos( $css, 'flex-wrap' ), 'product-card with no wrap setting prints no flex-wrap rule' );
$css = render_css( 'sgs/product-card', array( 'swatchesFlexWrap' => 'sideways' ) );
ok( '' !== $GLOBALS['last_html'] && false === strpos( $css, 'flex-wrap' ), 'product-card ignores a value outside nowrap and wrap' );

// buybox: a variable product, the guided layout for the meter and Back/Next.
$extra = array( 'product' => $product, 'manifest' => $manifest, 'context' => array( 'postId' => 52 ) );
$css   = render_css( 'sgs/buybox', array( 'productId' => 52, 'buyboxLayout' => 'guided', 'thumbsFlexWrap' => 'wrap', 'priceRowFlexWrap' => 'nowrap', 'meterFlexWrap' => 'nowrap', 'navFlexWrap' => 'wrap' ), $extra );
ok( has_rule( $css, ' .product-card__thumbs', 'wrap' ), 'buybox thumbsFlexWrap wrap prints a flex-wrap rule on the gallery thumbnails' );
ok( has_rule( $css, ' .buybox__price-row', 'nowrap' ), 'buybox priceRowFlexWrap nowrap prints a rule on the price row' );
ok( has_rule( $css, ' .sgs-buybox-guided__meter', 'nowrap' ), 'buybox meterFlexWrap nowrap prints a rule on the step meter' );
ok( has_rule( $css, ' .sgs-buybox-guided__nav', 'wrap' ), 'buybox navFlexWrap wrap prints a rule on Back and Next' );
$css = render_css( 'sgs/buybox', array( 'productId' => 52 ), $extra );
ok( '' !== $GLOBALS['last_html'] && false === strpos( $css, 'flex-wrap' ), 'buybox with no wrap setting prints no flex-wrap rule' );

echo "\n{$passes} passed, {$failures} failed\n";
exit( $failures > 0 ? 1 : 0 );
