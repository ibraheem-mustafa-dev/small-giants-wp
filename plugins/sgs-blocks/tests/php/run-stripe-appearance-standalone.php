<?php
/**
 * Standalone test: the Checkout block's Stripe card fields take the look of the block's own field settings
 * (includes/woocommerce/stripe-appearance.php). WooCommerce Stripe reads `blocksAppearance` from its script data when
 * it is set; the filter adds it only when the block's `sgsStripeMatchFields` is on.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-stripe-appearance-standalone.php
 *
 * @package SGS\Blocks
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );

$GLOBALS['filters'] = array();
function add_filter( $tag, $cb, $prio = 10, $args = 1 ) { $GLOBALS['filters'][ $tag ][] = $cb; }
function wp_get_global_settings( array $path = array() ) {
	$all = array(
		'color'      => array( 'palette' => array( 'theme' => array( array( 'slug' => 'border', 'color' => '#E6E1DA' ), array( 'slug' => 'white', 'color' => '#FFFFFF' ), array( 'slug' => 'accent', 'color' => '#9C8B78' ), array( 'slug' => 'text', 'color' => '#141414' ) ) ) ),
		'typography' => array( 'fontFamilies' => array( 'theme' => array( array( 'slug' => 'body', 'fontFamily' => 'Outfit, system-ui, sans-serif' ) ) ) ),
		'custom'     => array( 'focus' => array( 'ring' => 'var(--wp--preset--color--accent)', 'width' => '2px' ) ),
	);
	$out = $all;
	foreach ( $path as $key ) {
		$out = $out[ $key ] ?? null;
	}
	return $out;
}

require dirname( __DIR__, 2 ) . '/includes/woocommerce/stripe-appearance.php';

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}

$attrs = array(
	'sgsStripeMatchFields'  => true,
	'sgsFieldBackground'    => 'white',
	'sgsFieldBorderWidth'   => array( 'desktop' => array( 'top' => '1px', 'right' => '1px', 'bottom' => '1px', 'left' => '1px' ) ),
	'sgsFieldBorderStyle'   => 'solid',
	'sgsFieldBorderColour'  => 'border',
	'sgsFieldBorderRadius'  => array( 'desktop' => array( 'topLeft' => '0px', 'topRight' => '0px', 'bottomRight' => '0px', 'bottomLeft' => '0px' ) ),
	'sgsFieldPadding'       => array( 'desktop' => array( 'right' => '14px', 'left' => '14px' ) ),
	'sgsFieldMinHeight'     => '48px',
	'sgsFieldFontSize'      => 15,
	'sgsFieldFontSizeUnit'  => 'px',
	'sgsFieldColour'        => '#000000',
	'sgsFieldLabelColour'   => '#757575',
	'sgsFieldLabelFontSize' => 15,
);
$block = array( 'blockName' => 'woocommerce/checkout', 'attrs' => $attrs );

ok( isset( $GLOBALS['filters']['render_block_data'] ) && isset( $GLOBALS['filters']['wc_stripe_params'] ), 'hooks: render_block_data records the block, wc_stripe_params adds the appearance' );
ok( array( 'a' => 1 ) === SGS\Blocks\sgs_stripe_appearance_params( array( 'a' => 1 ) ), 'before any Checkout block rendered the params are unchanged' );

SGS\Blocks\sgs_stripe_appearance_record( array( 'blockName' => 'woocommerce/cart', 'attrs' => $attrs ) );
ok( array( 'a' => 1 ) === SGS\Blocks\sgs_stripe_appearance_params( array( 'a' => 1 ) ), 'only the Checkout block records its settings' );

SGS\Blocks\sgs_stripe_appearance_record( array( 'blockName' => 'woocommerce/checkout', 'attrs' => array( 'sgsFieldBackground' => 'white' ) ) );
ok( array( 'a' => 1 ) === SGS\Blocks\sgs_stripe_appearance_params( array( 'a' => 1 ) ), 'a Checkout block without sgsStripeMatchFields leaves the params unchanged' );

SGS\Blocks\sgs_stripe_appearance_record( $block );
$p = SGS\Blocks\sgs_stripe_appearance_params( array( 'a' => 1 ) );
$a = $p['blocksAppearance'] ?? array();
ok( 1 === $p['a'] && is_array( $a ), 'with the setting on, blocksAppearance is added beside the existing params' );
ok( 'Outfit, system-ui, sans-serif' === ( $a['variables']['fontFamily'] ?? '' ) && '15px' === ( $a['variables']['fontSizeBase'] ?? '' ), 'variables carry the site font stack and the field font size' );
ok( '#FFFFFF' === ( $a['variables']['colorBackground'] ?? '' ) && '#000000' === ( $a['variables']['colorText'] ?? '' ), 'the field background slug and the text colour resolve to hex (Stripe cannot read CSS variables)' );
$in = $a['rules']['.Input'] ?? array();
ok( '1px solid #E6E1DA' === ( $in['border'] ?? '' ) && '0px' === ( $in['borderRadius'] ?? '' ), '.Input takes the field border and radius' );
ok( '#FFFFFF' === ( $in['backgroundColor'] ?? '' ) && '#000000' === ( $in['color'] ?? '' ) && '15px' === ( $in['fontSize'] ?? '' ), '.Input takes the field fill, text colour and size' );
ok( '14px' === ( $in['paddingLeft'] ?? '' ) && '14px' === ( $in['paddingRight'] ?? '' ) && isset( $in['paddingTop'], $in['paddingBottom'] ), '.Input takes the field side padding and a vertical padding that reaches the minimum height' );
$h = (int) $in['paddingTop'] + (int) $in['paddingBottom'] + 2 + (int) round( 15 * 1.25 );
ok( $h >= 46 && $h <= 50, 'the vertical padding gives a box about 48px tall (' . $h . ')' );
ok( '#757575' === ( $a['rules']['.Label--resting']['color'] ?? '' ) && '15px' === ( $a['rules']['.Label--resting']['fontSize'] ?? '' ), 'the resting label is the field label colour and size' );
$f = $a['rules']['.Input:focus'] ?? array();
ok( false !== strpos( (string) ( $f['outline'] ?? '' ), '#9C8B78' ) && '-2px' === ( $f['outlineOffset'] ?? '' ), 'focus draws the theme focus ring inside the border' );
ok( 'floating' === ( $a['labels'] ?? '' ), 'labels stay floating, like the site\'s own fields' );

SGS\Blocks\sgs_stripe_appearance_record( array( 'blockName' => 'woocommerce/checkout', 'attrs' => array( 'sgsStripeMatchFields' => true ) ) );
$bare = SGS\Blocks\sgs_stripe_appearance_params( array() )['blocksAppearance'] ?? null;
ok( is_array( $bare ) && 'Outfit, system-ui, sans-serif' === ( $bare['variables']['fontFamily'] ?? '' ) && ! isset( $bare['rules']['.Input']['border'] ), 'with no field settings the appearance carries the site font only (nothing invented)' );

echo $failures ? "\n{$failures} failed\n" : "\nall passed\n";
exit( $failures ? 1 : 0 );
