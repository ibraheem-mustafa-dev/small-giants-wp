<?php
/**
 * Standalone runner: a rest rotation list on an element that sits alone inside a repeated list item (Spec 27 FR-27-K6),
 * the product card's image size from the attachment, and the `%` entrance translate (Spec 38A).
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-template-tilt-standalone.php
 *
 * Asserts:
 * - a root rest rotation list inside a query or product template prints `li:nth-child(Kn+i) > .scope` rules;
 * - the same list outside a template is refused to its first angle (no nth-child rule), and a non-root list keeps
 *   `:nth-child(Kn+i of .class)` byte-identical inside and outside a template;
 * - `sgs_product_card_image_url_at_size` takes the product's featured image by ID, so a `-300x300` URL prints the chosen size;
 * - the entrance and hover translate owners are registered `<length-percentage>` in the stylesheet and the schema.
 * Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';

use SGS\Blocks\Motion\Sgs_Motion_Loop_Delays;
use SGS\Blocks\Motion\Sgs_Motion_Renderer;

$failures = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures ): void {
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
};

$render = static function ( string $element, array $values, bool $in_template ) {
	Sgs_Motion_Renderer::reset();
	$GLOBALS['sgs_collected_css'] = array();
	$GLOBALS['sgs_test_is_admin'] = false;
	$GLOBALS['sgs_test_in_loop']  = false;
	$GLOBALS['sgs_test_actions']  = array();
	$template = array( 'blockName' => 'woocommerce/product-template' );
	if ( $in_template ) {
		Sgs_Motion_Loop_Delays::enter_template( null, $template );
	}
	$html = sgs_test_render_motion_block(
		array(
			'blockName' => 'sgs/hero',
			'attrs'     => array(
				'sgsMotion' => array(
					'v'        => 1,
					'elements' => array( $element => array( 'hover' => array( 'state' => array( 'source' => 'self', 'values' => $values ) ) ) ),
				),
			),
		),
		'<div class="wp-block-sgs-hero"><div class="sgs-hero__media"><img src="a.jpg" alt=""></div></div>'
	);
	if ( $in_template ) {
		Sgs_Motion_Loop_Delays::leave_template( $html, $template );
	}
	return array( $html, implode( '', $GLOBALS['sgs_collected_css'] ) );
};

$list = array( 'restRotate' => array( -2, 1.5, -1 ), 'rotate' => 0 );

// 1. Root list inside a template counts the list items.
list( , $css ) = $render( 'root', $list, true );
$check( 3 === preg_match_all( '/li:nth-child\(3n\+[1-3]\) > \.sgs-m-[0-9a-f]{10}\{--sgs-rot-rest:/', $css ), 'in template: one li rule per angle: ' . $css );
$check( false !== strpos( $css, 'li:nth-child(3n+2) > .sgs-m-' ), 'in template: position 2 has its rule' );
$check( false === strpos( $css, ' of .' ), 'in template: no sibling-counting rule' );
$check( false !== strpos( $css, '--sgs-rot-rest:1.5deg;' ), 'in template: the second angle is 1.5deg' );
$check( false !== preg_match( '/\.sgs-m-[0-9a-f]{10}\{--sgs-rot-rest:-2deg;/', $css ) && false !== strpos( $css, '--sgs-rot-rest:-2deg;' ), 'in template: the base rule carries the first angle' );

// 2. Negative control: the same root list outside a template is refused to the first angle (today's output).
list( , $css ) = $render( 'root', $list, false );
$check( false === strpos( $css, 'nth-child' ), 'outside a template: no per-item rule for a root list' );
$check( false !== strpos( $css, '--sgs-rot-rest:-2deg;' ), 'outside a template: the first angle is used' );

// 3. Negative control: a non-root list keeps the sibling selector, inside or outside a template.
list( , $outside ) = $render( 'media', $list, false );
list( , $inside )  = $render( 'media', $list, true );
$check( false !== strpos( $outside, ':nth-child(3n+2 of .sgs-hero__media){--sgs-rot-rest:1.5deg;}' ), 'non-root list: sibling selector outside a template' );
$check( 0 === preg_match( '/li:nth-child/', $inside ), 'non-root list: no li rule inside a template' );
$check( preg_replace( '/sgs-m-[0-9a-f]{10}/', 'S', $outside ) === preg_replace( '/sgs-m-[0-9a-f]{10}/', 'S', $inside ), 'non-root list: identical inside and outside a template' );

// 4. The template depth returns to zero after the template.
$check( false === Sgs_Motion_Loop_Delays::in_template_item(), 'depth is back to zero' );

// 5. The product card's image size comes from the featured image by ID.
if ( ! function_exists( 'get_post_thumbnail_id' ) ) {
	function get_post_thumbnail_id( $post_id ) { return 77 === (int) $post_id ? 500 : 0; }
}
if ( ! function_exists( 'attachment_url_to_postid' ) ) {
	function attachment_url_to_postid( $url ) { return 0; }
}
if ( ! function_exists( 'wp_get_attachment_image_url' ) ) {
	function wp_get_attachment_image_url( $id, $size ) { return 500 === (int) $id ? 'https://x.test/p-' . $size . '.jpg' : false; }
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $u ) { return $u; }
}
require_once dirname( __DIR__, 2 ) . '/includes/product-card-image-size.php';
$small = 'https://x.test/p-300x300.jpg';
$check( 'https://x.test/p-large.jpg' === sgs_product_card_image_url_at_size( $small, 'large', 77 ), 'a 300px stored URL prints the large source via the product ID' );
$check( $small === sgs_product_card_image_url_at_size( $small, 'large' ), 'negative control: without an ID the unresolvable URL is unchanged' );
$check( $small === sgs_product_card_image_url_at_size( $small, '', 77 ), 'negative control: no size, no change' );
$applied = sgs_product_card_image_size_apply( array( 'image_url' => $small, 'wc_id' => 77 ), array( 'imageSize' => 'large' ) );
$check( 'https://x.test/p-large.jpg' === $applied['image_url'], 'imageSize large swaps the product data URL' );

// 6. % translate owners.
$css_file = file_get_contents( dirname( __DIR__, 2 ) . '/assets/css/motion.css' );
$schema   = file_get_contents( dirname( __DIR__, 2 ) . '/schemas/motion.schema.json' );
foreach ( array( '--sgs-me-tx', '--sgs-me-ty', '--sgs-mh-tx', '--sgs-mh-ty' ) as $prop ) {
	$check( 1 === preg_match( '/@property ' . preg_quote( $prop, '/' ) . " \\{ syntax: '<length-percentage>'/", $css_file ), "$prop is registered <length-percentage> in motion.css" );
	$check( 1 === preg_match( '/"name": "' . preg_quote( $prop, '/' ) . '",\s*"syntax": "<length-percentage>"/', $schema ), "$prop is <length-percentage> in the schema" );
}

if ( $failures > 0 ) {
	echo "$failures check(s) failed\n";
	exit( 1 );
}
echo "OK\n";
