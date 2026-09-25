<?php
/**
 * Server-side render for sgs/wishlist-link.
 *
 * A header/footer icon-link to the wishlist panel with a live saved-item
 * count badge. Cache strategy mirrors `sgs/cart`'s badge (see
 * `src/blocks/cart/render.php`'s own docblock): the count is ALWAYS rendered
 * as 0 server-side — LiteSpeed/Hostinger page cache would otherwise serve a
 * stale count to every visitor — and `view.js` hydrates the real count from
 * `src/shared/wishlist-store/index.js` within one paint.
 *
 * NO-INLINE (Spec 32): zero inline style property declarations; colours and
 * sizes are a scoped `<style>` block built from $scoped_css, same contract as
 * sgs/notice-banner and sgs/cart.
 *
 * BEM: .sgs-wishlist-link (root) / __icon / __label / __badge (--visible).
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Unused — no InnerBlocks.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';

$icon_source_raw = (string) ( $attributes['iconSource'] ?? '' );
$icon_source     = '' !== $icon_source_raw ? $icon_source_raw : 'lucide';
$icon_name_raw   = (string) ( $attributes['iconName'] ?? '' );
$icon_name       = preg_replace( '/[^a-z0-9-]/', '', strtolower( '' !== $icon_name_raw ? $icon_name_raw : 'heart' ) );
$icon_html       = ( 'lucide' === $icon_source )
	? sgs_get_lucide_icon( $icon_name )
	: sgs_get_lucide_icon( 'heart' ); // Only lucide is offered for this icon-link; any other stored source falls back safely.

$label      = sanitize_text_field( (string) ( $attributes['label'] ?? __( 'Wishlist', 'sgs-blocks' ) ) );
$show_count = ! empty( $attributes['showCount'] );

// ── Href resolution: an explicit URL wins; otherwise the cart page, where
// sgs/wishlist-panel lives by default (theme/sgs-theme/templates/cart.html). ──
$wishlist_url = trim( (string) ( $attributes['wishlistUrl'] ?? '' ) );
if ( '' !== $wishlist_url ) {
	$href = esc_url( $wishlist_url );
} elseif ( function_exists( 'wc_get_cart_url' ) ) {
	$href = esc_url( wc_get_cart_url() );
} else {
	$href = esc_url( home_url( '/' ) );
}

$aria_label = sprintf(
	/* translators: %s: item count, rendered as 0 server-side and kept live by view.js. */
	__( 'Wishlist, %s items', 'sgs-blocks' ),
	'0'
);

$uid      = 'sgs-wishlist-link-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-wishlist-link';

$scoped_css = array();

// Colours (flat only — no gradient companions requested for this block).
$scoped_css[] = sgs_fill_states_css(
	$root_sel . ' .sgs-wishlist-link__icon svg',
	$attributes,
	array(
		'base'  => 'iconColour',
		'hover' => 'iconColourHover',
	)
);
$scoped_css[] = sgs_fill_states_css(
	$root_sel . ' .sgs-wishlist-link__badge',
	$attributes,
	array( 'base' => 'badgeBackgroundColour' )
);
$scoped_css[] = sgs_text_states_css(
	$root_sel . ' .sgs-wishlist-link__badge',
	$attributes,
	array( 'base' => 'badgeTextColour' )
);

// Icon size — tier object, in px.
$icon_size_tiers = sgs_responsive_normalise_object( $attributes['iconSize'] ?? null, false );
foreach ( array(
	'desktop' => '',
	'tablet'  => '@media(max-width:1023px)',
	'mobile'  => '@media(max-width:767px)',
) as $tier => $media ) {
	$size = $icon_size_tiers[ $tier ] ?? null;
	if ( null === $size || '' === $size ) {
		continue;
	}
	$size_safe = sgs_css_length_value( is_numeric( $size ) ? $size . 'px' : (string) $size );
	if ( '' === $size_safe ) {
		continue;
	}
	$rule         = $root_sel . ' .sgs-wishlist-link__icon svg{width:' . $size_safe . ';height:' . $size_safe . ';}';
	$scoped_css[] = $media ? $media . '{' . $rule . '}' : $rule;
}

// showLabel — icon-only by default (the label stays in the DOM for
// assistive tech via aria-label; visually hidden unless a tier opts in).
$show_label_tiers = sgs_responsive_normalise_object( $attributes['showLabel'] ?? null, false );
foreach ( array(
	'desktop' => '',
	'tablet'  => '@media(max-width:1023px)',
	'mobile'  => '@media(max-width:767px)',
) as $tier => $media ) {
	if ( true !== ( $show_label_tiers[ $tier ] ?? null ) ) {
		continue;
	}
	$rule         = $root_sel . ' .sgs-wishlist-link__label{position:static;width:auto;height:auto;overflow:visible;clip:auto;clip-path:none;white-space:normal;margin:0 0 0 var(--wp--preset--spacing--20,0.5em);}';
	$scoped_css[] = $media ? $media . '{' . $rule . '}' : $rule;
}

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class' => $uid,
	)
);

$badge_html = $show_count
	? '<span class="sgs-wishlist-link__badge" role="status" aria-live="polite" aria-atomic="true" data-sgs-wishlist-count>0</span>'
	: '';

?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php echo wp_strip_all_tags( implode( '', array_filter( $scoped_css ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</style>
<?php endif; ?>
<a <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-sanitised. ?> href="<?php echo $href; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_url() above. ?>" aria-label="<?php echo esc_attr( $aria_label ); ?>" data-sgs-wishlist-link>
	<span class="sgs-wishlist-link__icon" aria-hidden="true"><?php echo $icon_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted Lucide SVG. ?></span>
	<span class="sgs-wishlist-link__label"><?php echo esc_html( $label ); ?></span>
	<?php echo $badge_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from static markup + absint(0) above. ?>
</a>
