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
 * Href resolution (FR-30-14, Wave 3C account-area build): an explicit
 * `wishlistUrl` attribute always wins; otherwise the Saved items page
 * (`woocommerce_saved_items_page_id` — WooCommerce's own
 * `woocommerce_{key}_page_id` option naming, so `wc_get_page_permalink(
 * 'saved_items' )` reads it automatically) when that page is set and
 * published; otherwise the pre-existing fallback, the cart page (where
 * `sgs/wishlist-panel` lived before the Saved items page existed).
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

// ── Href resolution: an explicit URL wins; otherwise the Saved items page
// when it is set and published; otherwise the cart page, where
// sgs/wishlist-panel lived by default before the Saved items page existed
// (theme/sgs-theme/templates/cart.html). ──
$wishlist_url = trim( (string) ( $attributes['wishlistUrl'] ?? '' ) );
if ( '' !== $wishlist_url ) {
	$href = esc_url( $wishlist_url );
} else {
	$saved_items_page_id = ( function_exists( 'wc_get_page_id' ) ) ? wc_get_page_id( 'saved_items' ) : 0;
	if ( $saved_items_page_id > 0 && 'publish' === get_post_status( $saved_items_page_id ) && function_exists( 'wc_get_page_permalink' ) ) {
		$href = esc_url( wc_get_page_permalink( 'saved_items' ) );
	} elseif ( function_exists( 'wc_get_cart_url' ) ) {
		$href = esc_url( wc_get_cart_url() );
	} else {
		$href = esc_url( home_url( '/' ) );
	}
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
// assistive tech via aria-label). Per-tier resolution uses the framework's
// null-means-inherit chain (Desktop concrete boolean, Tablet/Mobile override;
// see BooleanResponsiveControl and sgs/audio's toggleShowLabel for the same
// shape).
$show_label_base = ! empty( $attributes['showLabel'] );

$show_label_tablet_raw = $attributes['showLabelTablet'] ?? null;
$show_label_mobile_raw = $attributes['showLabelMobile'] ?? null;
// '' is the REST GET null-serialisation shim (addQueryArgs can't represent a
// real null) — treat identically to a real null (inherit the tier above).
$show_label_tablet_inherits = ( null === $show_label_tablet_raw || '' === $show_label_tablet_raw );
$show_label_mobile_inherits = ( null === $show_label_mobile_raw || '' === $show_label_mobile_raw );

$show_label_tablet_effective = $show_label_tablet_inherits ? $show_label_base : (bool) $show_label_tablet_raw;
$show_label_mobile_effective = $show_label_mobile_inherits ? $show_label_tablet_effective : (bool) $show_label_mobile_raw;

$sgs_wl_label_shown_decls  = '{position:static;width:auto;height:auto;overflow:visible;clip:auto;clip-path:none;white-space:normal;margin:0 0 0 var(--wp--preset--spacing--20,0.5em);}';
$sgs_wl_label_hidden_decls = '{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;margin:0;}';

// Each tier's rule is emitted unconditionally (not only when true) — the
// resolved value can legitimately need to override a wider tier that already
// switched the label on (e.g. Desktop on, Tablet explicitly off).
foreach (
	array(
		'desktop' => array(
			'media'     => '',
			'effective' => $show_label_base,
		),
		'tablet'  => array(
			'media'     => '@media(max-width:1023px)',
			'effective' => $show_label_tablet_effective,
		),
		'mobile'  => array(
			'media'     => '@media(max-width:767px)',
			'effective' => $show_label_mobile_effective,
		),
	) as $sgs_wl_tier_data
) {
	$rule         = $root_sel . ' .sgs-wishlist-link__label' . ( $sgs_wl_tier_data['effective'] ? $sgs_wl_label_shown_decls : $sgs_wl_label_hidden_decls );
	$scoped_css[] = $sgs_wl_tier_data['media'] ? $sgs_wl_tier_data['media'] . '{' . $rule . '}' : $rule;
}

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class' => 'sgs-wishlist-link ' . $uid,
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
