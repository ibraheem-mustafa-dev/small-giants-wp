<?php
/**
 * Server-side render for sgs/free-delivery-bar (Spec 27 FR-30-20).
 *
 * A card with the words "Add {amount} more for free delivery", a progress bar and, once the basket reaches the
 * threshold, a success line. The threshold comes from `sgs_free_delivery_threshold()` (an override wins, else the
 * store's base-country zone's free-shipping minimum); with none the front end prints nothing and the editor preview
 * says so.
 *
 * The page cache serves one copy to everyone, so on most pages the card is printed unfilled and `view.js` fills it from
 * `src/shared/cart-live/`. Cart and checkout are never page-cached, so there the server prints the real state and the
 * script only keeps it current.
 *
 * Every word is an attribute. NO-INLINE (Spec 32): every declaration goes into one scoped `<style>`; the fill's width
 * is the `--sgs-free-delivery-bar-pct` custom property.
 *
 * BEM: .sgs-free-delivery-bar (root and card) / __text / __track / __fill (--complete on the root).
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Unused: no InnerBlocks.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$in_editor = is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST );
$threshold = sgs_free_delivery_threshold( $attributes['freeDeliveryThresholdOverride'] ?? '' );

if ( null === $threshold || $threshold <= 0.0 ) {
	if ( $in_editor ) {
		echo '<p class="sgs-free-delivery-bar__notice">' . esc_html__( 'No free-delivery threshold found in WooCommerce shipping settings. Set a minimum order amount on a Free shipping method, or type a threshold in this block.', 'sgs-blocks' ) . '</p>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
	}
	return;
}

$message = sanitize_text_field( (string) ( $attributes['freeDeliveryMessage'] ?? '' ) );
if ( '' === $message ) {
	/* translators: %s is a literal "%s" the amount replaces. */
	$message = sprintf( __( 'Add %s more for free delivery', 'sgs-blocks' ), '%s' );
}
$success_message = sanitize_text_field( (string) ( $attributes['freeDeliverySuccessMessage'] ?? '' ) );
if ( '' === $success_message ) {
	$success_message = __( 'You have free delivery', 'sgs-blocks' );
}
$bar_label  = sanitize_text_field( (string) ( $attributes['freeDeliveryLabel'] ?? '' ) );
$hide_empty = ! empty( $attributes['freeDeliveryHideWhenEmpty'] );

// The real state, only where the page is never cached (cart and checkout): the items' subtotal plus its tax, before
// discounts, shipping and fees, the same sum the script uses. The editor preview shows a basket at 60% of the threshold.
$subtotal = null;
$empty    = false;
if ( $in_editor ) {
	$subtotal = $threshold * 0.6;
} elseif ( function_exists( 'is_cart' ) && function_exists( 'is_checkout' ) && ( is_cart() || is_checkout() )
	&& function_exists( 'WC' ) && WC() && WC()->cart ) {
	$subtotal = (float) WC()->cart->get_subtotal() + (float) WC()->cart->get_subtotal_tax();
	$empty    = WC()->cart->is_empty();
}
$state = null;
if ( null !== $subtotal ) {
	$remaining = max( 0.0, $threshold - $subtotal );
	$state     = array(
		'pct'      => max( 0.0, min( 100.0, ( $subtotal / $threshold ) * 100 ) ),
		'complete' => $remaining <= 0.0,
		'empty'    => $empty,
		'text'     => $remaining <= 0.0
			? $success_message
			: str_replace( '%s', function_exists( 'wc_price' ) ? html_entity_decode( wp_strip_all_tags( wc_price( $remaining ) ), ENT_QUOTES, 'UTF-8' ) : number_format_i18n( $remaining, 2 ), $message ),
	);
}

$uid      = 'sgs-free-delivery-bar-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-free-delivery-bar';
$scoped   = array();

// Card: fill, border, shadow, padding and margin through the same shared helpers sgs/quote uses.
$border     = sgs_border_element_decls(
	$attributes,
	'',
	$root_sel,
	array(
		'colour' => array(
			'base'     => 'borderColour',
			'gradient' => 'borderColourGradient',
		),
	)
);
$fill_decl  = sgs_background_paint_decl( $attributes['backgroundColour'] ?? '', $attributes['backgroundColourGradient'] ?? '' );
$shadow     = sgs_shadow_box_decls( (string) ( $attributes['boxShadow'] ?? '' ), (string) ( $attributes['boxShadowColour'] ?? '' ) );
$card_decls = array_merge( '' !== $fill_decl ? array( $fill_decl ) : array(), $border['base'], $shadow );
$scoped[]   = sgs_emit_tier_decls(
	$root_sel,
	array(
		'desktop' => $card_decls,
		'tablet'  => $border['tablet'],
		'mobile'  => $border['mobile'],
	)
);
$scoped     = array_merge( $scoped, $border['rules'] );
$scoped[]   = sgs_emit_responsive_css(
	$root_sel,
	array(
		array(
			'value'        => $attributes['padding'] ?? null,
			'css'          => 'padding',
			'box'          => true,
			'unit_default' => 'px',
		),
		array(
			'value'        => $attributes['margin'] ?? null,
			'css'          => 'margin',
			'box'          => true,
			'unit_default' => 'px',
		),
	)
);

// Message, track and fill.
$scoped[] = sgs_text_states_css(
	$root_sel . ' .sgs-free-delivery-bar__text',
	$attributes,
	array( 'base' => 'freeDeliveryTextColour' )
);
$scoped[] = sgs_typography_css_rule( $attributes, 'freeDeliveryText', $root_sel . ' .sgs-free-delivery-bar__text', '', false, false, sgs_object_attr_keys( $block ) );

$scoped[] = sgs_fill_states_css(
	$root_sel . ' .sgs-free-delivery-bar__track',
	$attributes,
	array( 'base' => 'freeDeliveryTrackColour' )
);
$track_radius = sgs_css_length_value( (string) ( $attributes['freeDeliveryTrackRadius'] ?? '' ) );
if ( '' !== $track_radius ) {
	$scoped[] = $root_sel . ' .sgs-free-delivery-bar__track{border-radius:' . $track_radius . ';}';
}
$scoped[] = sgs_emit_responsive_css(
	$root_sel . ' .sgs-free-delivery-bar__track',
	array(
		array(
			'value'        => $attributes['freeDeliveryTrackHeight'] ?? null,
			'css'          => 'height',
			'unit_default' => 'px',
		),
		array(
			'value'        => $attributes['freeDeliveryBarMargin'] ?? null,
			'css'          => 'margin',
			'box'          => true,
			'unit_default' => 'px',
		),
	)
);

$scoped[] = sgs_fill_states_css(
	$root_sel . ' .sgs-free-delivery-bar__fill',
	$attributes,
	array( 'base' => 'freeDeliveryFillColour' )
);
$easings  = array(
	'smooth'      => 'cubic-bezier(.2,.7,.2,1)',
	'ease'        => 'ease',
	'ease-in-out' => 'ease-in-out',
	'linear'      => 'linear',
);
$easing   = $easings[ $attributes['freeDeliveryFillEasing'] ?? 'smooth' ] ?? $easings['smooth'];
$duration = is_numeric( $attributes['freeDeliveryFillDuration'] ?? null ) ? max( 0.0, min( 3.0, (float) $attributes['freeDeliveryFillDuration'] ) ) : 0.6;
$vars     = array( '--sgs-free-delivery-bar-duration:' . $duration . 's', '--sgs-free-delivery-bar-easing:' . $easing );
if ( null !== $state ) {
	$vars[] = '--sgs-free-delivery-bar-pct:' . round( $state['pct'], 2 ) . '%';
}
$scoped[] = $root_sel . '{' . implode( ';', $vars ) . ';}';

// Markup.
$classes = array( 'sgs-free-delivery-bar', $uid );
if ( null !== $state && $state['complete'] ) {
	$classes[] = 'sgs-free-delivery-bar--complete';
}
$root_args = array(
	'class'                              => implode( ' ', $classes ),
	'data-sgs-free-delivery-bar'         => '',
	'data-reading'                       => null !== $state ? 'server' : 'waiting',
	'data-free-delivery-threshold'       => (string) $threshold,
	'data-free-delivery-message'         => $message,
	'data-free-delivery-success-message' => $success_message,
	'data-free-delivery-hide-empty'      => $hide_empty ? '1' : '0',
);
// A card that hides for an empty basket starts hidden when the basket is empty or not yet known, so it never leaves a gap
// that then closes.
if ( $hide_empty && ( null === $state || $state['empty'] ) ) {
	$root_args['hidden'] = 'hidden';
}
$wrapper_attrs = get_block_wrapper_attributes( $root_args );
$text          = null !== $state ? $state['text'] : '';
$value_now     = null !== $state ? (int) round( $state['pct'] ) : 0;

?>
<style>
	<?php echo wp_strip_all_tags( implode( '', array_filter( $scoped ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value is pre-sanitised by the shared helpers. ?>
</style>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-sanitised. ?>>
	<p class="sgs-free-delivery-bar__text" role="status" aria-live="polite" aria-atomic="true" data-sgs-cart-free-delivery-text><?php echo esc_html( $text ); ?></p>
	<div class="sgs-free-delivery-bar__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="<?php echo esc_attr( (string) $value_now ); ?>"<?php echo '' !== $bar_label ? ' aria-label="' . esc_attr( $bar_label ) . '"' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() above. ?> data-sgs-cart-free-delivery-track>
		<div class="sgs-free-delivery-bar__fill"></div>
	</div>
</div>
