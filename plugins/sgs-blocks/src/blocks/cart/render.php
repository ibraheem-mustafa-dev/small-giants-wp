<?php
/**
 * Server-side render for the SGS Cart block.
 *
 * Strategy:
 *   - Always renders count as 0 server-side to avoid full-page-cache
 *     (LiteSpeed / Hostinger) serving stale counts to all visitors.
 *   - The view.js module hydrates the real count from the WooCommerce
 *     Store API (`GET /wp-json/wc/store/v1/cart`) within ~200 ms.
 *   - When WooCommerce is not active the block renders NOTHING at all
 *     (early return, D338). It previously rendered the trigger and hid it
 *     via CSS, which put a shopping trolley in the header of every
 *     non-ecommerce client. This is the UNIVERSAL fix (R-31-9): the cart
 *     disappears by construction on a site with no shop, an actual shop
 *     keeps it, and no per-client carve-out or pattern edit is needed.
 *     Admins still see a notice in the editor (handled in edit.js).
 *
 * WCAG 2.2 AA:
 *   - Trigger is an <a> linking to the /cart URL: native keyboard nav.
 *   - aria-label carries the current count ("View your cart (0 items)").
 *   - aria-live="polite" on the badge so screen readers announce updates.
 *   - min 44×44 px touch target enforced in style.css.
 *
 * BEM classes:
 *   .sgs-cart                       root wrapper
 *   .sgs-cart__trigger              the <a> link
 *   .sgs-cart__icon                 SVG icon wrapper
 *   .sgs-cart__badge                numeric count badge
 *   .sgs-cart--has-items            modifier added by view.js when count > 0
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

// ---------------------------------------------------------------------------
// NO-INLINE (per-block migration contract, 2026-07-10; ZERO-INLINE amended
// 2026-07-18 D345 — Spec 32 FR-32-4): margin is a WP-native
// style.spacing.margin object (skip-serialised in block.json → NOT auto-
// inlined by get_block_wrapper_attributes()). Emitted scoped via the core
// style engine below, mirroring sgs/label. marginTablet/marginMobile are SGS
// custom object attrs, hand-built shorthand, scoped @media (contract §B2:
// tablet max-width:1023px, mobile max-width:767px). The `--sgs-cart-*`
// custom-property VALUES (icon size/colour, badge colours) are emitted into
// a scoped `.{uid}.wp-block-sgs-cart{…}` rule alongside the margin rules
// (mirrors sgs/info-box's hover-colour treatment) — the root carries ZERO
// inline `style="…"` attribute at all.
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// ── Attribute resolution ──────────────────────────────────────────────────────
$display_mode      = $attributes['displayMode'] ?? 'link';
$icon_name         = preg_replace( '/[^a-z0-9-]/', '', strtolower( $attributes['iconName'] ?? 'shopping-cart' ) );
$icon_size         = absint( $attributes['iconSize'] ?? 24 );
$icon_colour       = $attributes['iconColour'] ?? 'primary';
$badge_colour      = $attributes['badgeColour'] ?? 'accent';
$badge_text_colour = $attributes['badgeTextColour'] ?? 'accent-text';
$aria_label        = sanitize_text_field( $attributes['ariaLabel'] ?? __( 'View your cart', 'sgs-blocks' ) );
$show_zero         = ! empty( $attributes['showZero'] );
$hide_when_empty   = ! empty( $attributes['hideWhenEmpty'] );

// ── WooCommerce availability check ────────────────────────────────────────────
if ( ! class_exists( 'WooCommerce' ) ) {
	return '';
}

$wc_active = function_exists( 'WC' ) && ! is_null( WC() );

// Cart URL — WC provides wc_get_cart_url() when active; fall back to /cart.
$cart_url = $wc_active ? wc_get_cart_url() : home_url( '/cart' );

// ── SSR count: always 0 to avoid cached stale counts ─────────────────────────
// The view.js module replaces this via the Store API within ~200 ms.
$ssr_count = 0;

// ── CSS custom-property VALUES (icon size/colour, badge colours) — moved to
// a scoped `.{uid}.wp-block-sgs-cart{…}` rule below (Spec 32 FR-32-4 as
// amended 2026-07-18 / D345: inline `--var` is now FORBIDDEN, mirrors
// sgs/info-box's hover-colour treatment). Nothing lands in the root's
// `style="…"` attribute. ────────────────────────────────────────────────────
$sgs_cart_vars = array(
	'--sgs-cart-icon-size:' . $icon_size . 'px',
	'--sgs-cart-icon-colour:' . sgs_colour_value( $icon_colour ),
	'--sgs-cart-badge-colour:' . sgs_colour_value( $badge_colour ),
	'--sgs-cart-badge-text-colour:' . sgs_colour_value( $badge_text_colour ),
);

// ── Margin — WP-native style.spacing.margin object (skip-serialised), NOT
// auto-inlined. Tiers are SGS custom object attrs, hand-built shorthand. ─────
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}
$margin_tablet_obj = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

// ── uid/selector — CLASS pattern mirrors sgs/label/sgs/heading/sgs/container.
$uid  = 'sgs-cart-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sel  = '.' . $uid . '.wp-block-sgs-cart';

$scoped_css = array();

if ( function_exists( 'wp_style_engine_get_styles' ) && ! empty( $base_margin_obj ) ) {
	$base_margin_styles = wp_style_engine_get_styles(
		array( 'spacing' => array( 'margin' => $base_margin_obj ) ),
		array( 'selector' => $sel )
	);
	if ( ! empty( $base_margin_styles['css'] ) ) {
		$scoped_css[] = $base_margin_styles['css'];
	}
}

$margin_tab_val = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val = $sgs_box_shorthand( $margin_mobile_obj );

if ( null !== $margin_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$sel}{margin:{$margin_tab_val};}}";
}
if ( null !== $margin_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$sel}{margin:{$margin_mob_val};}}";
}

// ── Cart custom-property VALUES (icon size/colour, badge colours) — scoped
// rule on the SAME uid selector, NOT inline (Spec 32 FR-32-4 as amended
// 2026-07-18 / D345). ────────────────────────────────────────────────────────
if ( $sgs_cart_vars ) {
	$scoped_css[] = $sel . '{' . implode( ';', $sgs_cart_vars ) . '}';
}

// ── Wrapper classes ───────────────────────────────────────────────────────────
$wrapper_classes = array( 'sgs-cart', $uid );
if ( ! $wc_active ) {
	$wrapper_classes[] = 'sgs-cart--wc-inactive';
}
// Hide the whole trigger on first paint (pre-hydration) when the SSR count
// is 0 and the operator has opted in — view.js reveals it once the real
// Store API count is known to be > 0.
if ( $hide_when_empty && 0 === $ssr_count ) {
	$wrapper_classes[] = 'sgs-cart--hidden-empty';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'                => implode( ' ', $wrapper_classes ),
		'data-show-zero'       => $show_zero ? 'true' : 'false',
		'data-hide-when-empty' => $hide_when_empty ? '1' : '0',
		'data-display-mode'    => esc_attr( $display_mode ),
	)
);

// ── Icon SVG ─────────────────────────────────────────────────────────────────
$icon_svg = sgs_get_lucide_icon( $icon_name );

// ── Accessible label with count ───────────────────────────────────────────────
// Uses a sprintf-style template; view.js replaces the live count.
$count_label = sprintf(
	/* translators: %d: number of items in the cart */
	_n( '%d item in cart', '%d items in cart', $ssr_count, 'sgs-blocks' ),
	$ssr_count
);
$trigger_label = $aria_label . ' (' . $count_label . ')';

?>
<?php if ( $scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> breakout. ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- from WP core. ?>>
	<a
		href="<?php echo esc_url( $cart_url ); ?>"
		class="sgs-cart__trigger"
		aria-label="<?php echo esc_attr( $trigger_label ); ?>"
		data-sgs-cart-trigger
	>
		<span class="sgs-cart__icon" aria-hidden="true">
			<?php echo $icon_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG from trusted lucide library. ?>
		</span>

		<span
			class="sgs-cart__badge<?php echo ( $ssr_count > 0 || $show_zero ) ? ' sgs-cart__badge--visible' : ''; ?>"
			aria-live="polite"
			aria-atomic="true"
			data-sgs-cart-count
		><?php echo absint( $ssr_count ); ?></span>
	</a>
</div>
