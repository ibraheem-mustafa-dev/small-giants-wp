<?php
/**
 * Server-side render for the SGS Cart block.
 *
 * Strategy:
 *   - Always renders count as 0 server-side to avoid full-page-cache
 *     (LiteSpeed / Hostinger) serving stale counts to all visitors.
 *   - The view.js module hydrates the real count from the WooCommerce
 *     Store API (`GET /wp-json/wc/store/v1/cart`) within ~200 ms.
 *   - When WooCommerce is not active the trigger renders but stays
 *     hidden (no .sgs-cart--active class); admins see a notice in the
 *     editor instead (handled in edit.js).
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

// ── Attribute resolution ──────────────────────────────────────────────────────
$display_mode      = $attributes['displayMode'] ?? 'link';
$icon_name         = preg_replace( '/[^a-z0-9-]/', '', strtolower( $attributes['iconName'] ?? 'shopping-cart' ) );
$icon_size         = absint( $attributes['iconSize'] ?? 24 );
$icon_colour       = $attributes['iconColour'] ?? 'primary';
$badge_colour      = $attributes['badgeColour'] ?? 'accent';
$badge_text_colour = $attributes['badgeTextColour'] ?? 'accent-text';
$aria_label        = sanitize_text_field( $attributes['ariaLabel'] ?? __( 'View your cart', 'sgs-blocks' ) );
$show_zero         = ! empty( $attributes['showZero'] );

// ── WooCommerce availability check ────────────────────────────────────────────
$wc_active = function_exists( 'WC' ) && ! is_null( WC() );

// Cart URL — WC provides wc_get_cart_url() when active; fall back to /cart.
$cart_url = $wc_active ? wc_get_cart_url() : home_url( '/cart' );

// ── SSR count: always 0 to avoid cached stale counts ─────────────────────────
// The view.js module replaces this via the Store API within ~200 ms.
$ssr_count = 0;

// ── Inline CSS custom properties ─────────────────────────────────────────────
$styles = array(
	'--sgs-cart-icon-size:' . $icon_size . 'px',
	'--sgs-cart-icon-colour:' . sgs_colour_value( $icon_colour ),
	'--sgs-cart-badge-colour:' . sgs_colour_value( $badge_colour ),
	'--sgs-cart-badge-text-colour:' . sgs_colour_value( $badge_text_colour ),
);

// ── Wrapper classes ───────────────────────────────────────────────────────────
$wrapper_classes = array( 'sgs-cart' );
if ( ! $wc_active ) {
	$wrapper_classes[] = 'sgs-cart--wc-inactive';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'             => implode( ' ', $wrapper_classes ),
		'style'             => implode( ';', $styles ) . ';',
		'data-show-zero'    => $show_zero ? 'true' : 'false',
		'data-display-mode' => esc_attr( $display_mode ),
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
