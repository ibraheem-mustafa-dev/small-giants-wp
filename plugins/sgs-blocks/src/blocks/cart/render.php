<?php
/**
 * Server-side render for the SGS Cart block.
 *
 * Cache strategy: always renders count 0 server-side (LiteSpeed/Hostinger
 * page cache would otherwise serve stale counts to all visitors); view.js
 * hydrates the real count from the WooCommerce Store API within ~200 ms.
 * WooCommerce inactive → renders nothing at all (no per-client carve-out
 * needed; edit.js shows admins a Notice instead).
 *
 * FR-36-19 (mini-cart): `displayMode` is `link` (badge link, no panel),
 * `flyout` (DISCLOSURE per FR-36-10 — a plain toggle
 * button, non-modal popover, no Tab trap, page stays usable) or `drawer`
 * (DIALOG per FR-36-10 — a native `<dialog>` opened via the SHARED
 * `store('sgs/nav')` used by `sgs/nav-bar-menu`/`sgs/nav-drawer`,
 * zero duplicated open/close/focus logic). Item data/qty-edit/remove/
 * totals are populated client-side by view.js — the SSR panel is a
 * loading skeleton only (as cache-sensitive as the count).
 * `hideOnCartCheckoutPages` (default true) demotes the effective mode to
 * `link` on `is_cart()`/`is_checkout()` — a popover there is redundant.
 *
 * WCAG 2.2 AA: `link` mode's trigger is an `<a>` (full no-JS fallback);
 * `flyout`/`drawer` triggers are a real `<button>` (mirrors the
 * `sgs/nav-bar-menu` burger — a click handler on an `<a>` would race the
 * anchor's default navigation). aria-label carries the live count;
 * `role="status"`/`aria-live="polite"` on the badge, and the panel
 * carries its own SEPARATE status live region for mutation feedback
 * ("Item removed"/"Quantity updated") — never a duplicate of the badge
 * node, so FR-36-19's "no double-announce" holds by construction. Min
 * 44×44 px touch targets in style.css.
 *
 * BEM: .sgs-cart (root) / __trigger / __icon / __badge / --has-items /
 * __panel (flyout|drawer surface) / __panel-close (drawer × only).
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Inner block content (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

// Sibling PHP files in this folder are copied to build/ together with render.php.
// render.php is required once per cart instance, so code here uses closures on
// local variables and never a top-level `function`, which would fatal with
// "Cannot redeclare" when two carts render on one page.

// ---------------------------------------------------------------------------
// NO-INLINE (Spec 32 FR-32-4): margin is a block-private object attr,
// emitted scoped via the core style engine below (mirrors sgs/label).
// marginTablet/marginMobile are SGS object attrs, scoped @media (tablet
// max-width:1023px, mobile max-width:767px). The `--sgs-cart-*` custom-
// property VALUES (icon/badge/panel colours) land in the same scoped
// `.{uid}.wp-block-sgs-cart{…}` rule — the root carries ZERO inline
// `style="…"`.

// ── Attribute resolution ──────────────────────────────────────────────────────
$allowed_display_modes = array( 'link', 'flyout', 'drawer' );
$display_mode          = in_array( $attributes['displayMode'] ?? 'link', $allowed_display_modes, true )
	? (string) $attributes['displayMode']
	: 'link';
$icon_name             = preg_replace( '/[^a-z0-9-]/', '', strtolower( $attributes['iconName'] ?? 'shopping-cart' ) );
$icon_size             = absint( $attributes['iconSize'] ?? 24 );
$icon_colour           = (string) ( $attributes['iconColour'] ?? '' );
// Icon/SVG gradient sibling — non-empty wins over iconColour above.
$icon_colour_gradient       = $attributes['iconColourGradient'] ?? '';
$icon_colour_hover          = $attributes['iconColourHover'] ?? '';
$icon_colour_hover_gradient = $attributes['iconColourHoverGradient'] ?? '';
$badge_colour               = $attributes['badgeColour'] ?? 'accent';
$badge_text_colour          = $attributes['badgeTextColour'] ?? 'accent-text';
$aria_label                 = sanitize_text_field( $attributes['ariaLabel'] ?? __( 'View your cart', 'sgs-blocks' ) );
$show_zero                  = ! empty( $attributes['showZero'] );
$hide_when_empty            = ! empty( $attributes['hideWhenEmpty'] );

// Wave B, U-1 — text-pill trigger style. 'icon' (default) keeps the existing
// icon+badge trigger; 'pill' swaps the icon for an editable word (pillLabel)
// beside the live item count (same badge element, restyled — see style.css).
$trigger_style     = ( 'pill' === ( $attributes['triggerStyle'] ?? 'icon' ) ) ? 'pill' : 'icon';
$pill_label        = sanitize_text_field( $attributes['pillLabel'] ?? __( 'Cart', 'sgs-blocks' ) );
$pill_bg_colour    = (string) ( $attributes['pillBgColour'] ?? '' );
$pill_text_colour  = (string) ( $attributes['pillTextColour'] ?? '' );
$sgs_count_pop_raw = $attributes['countPopAnimation'] ?? 'off';
// The legacy boolean (before this setting had three modes) still reads correctly:
// true was 'pop on change', and the draft also pops on load, so it maps to the full mode.
if ( is_bool( $sgs_count_pop_raw ) ) {
	$sgs_count_pop_raw = $sgs_count_pop_raw ? 'load-and-change' : 'off';
}
$count_pop_animation = in_array( $sgs_count_pop_raw, array( 'change', 'load-and-change' ), true ) ? $sgs_count_pop_raw : 'off';

// FR-36-19 panel attrs.
$panel_heading      = sanitize_text_field( $attributes['panelHeading'] ?? __( 'Your cart', 'sgs-blocks' ) );
$empty_cart_message = sanitize_text_field( $attributes['emptyCartMessage'] ?? __( 'Your cart is empty', 'sgs-blocks' ) );
$empty_cart_cta     = sanitize_text_field( $attributes['emptyCartCtaLabel'] ?? __( 'Continue shopping', 'sgs-blocks' ) );
$view_cart_label    = sanitize_text_field( $attributes['viewCartLabel'] ?? __( 'View cart', 'sgs-blocks' ) );
$checkout_label     = sanitize_text_field( $attributes['checkoutLabel'] ?? __( 'Checkout', 'sgs-blocks' ) );
$auto_open_on_add   = ! isset( $attributes['autoOpenOnAdd'] ) || ! empty( $attributes['autoOpenOnAdd'] );
$hide_on_cart_pages = ! isset( $attributes['hideOnCartCheckoutPages'] ) || ! empty( $attributes['hideOnCartCheckoutPages'] );
$panel_bg_slug      = isset( $attributes['panelBg'] ) ? (string) $attributes['panelBg'] : 'base';
$panel_text_slug    = isset( $attributes['panelTextColour'] ) ? (string) $attributes['panelTextColour'] : 'contrast';

// ── WooCommerce availability check ────────────────────────────────────────────
if ( ! class_exists( 'WooCommerce' ) ) {
	return '';
}

$wc_active = function_exists( 'WC' ) && ! is_null( WC() );

// Cart URL — WC provides wc_get_cart_url() when active; fall back to /cart.
$cart_url     = $wc_active ? wc_get_cart_url() : home_url( '/cart' );
$checkout_url = ( $wc_active && function_exists( 'wc_get_checkout_url' ) ) ? wc_get_checkout_url() : home_url( '/checkout' );
$shop_url     = ( $wc_active && function_exists( 'wc_get_page_permalink' ) ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop' );

// ── Effective display mode — FR-36-19 "hide the mini-cart on cart/checkout
// pages" (SHOULD): a mini-cart popover is redundant friction while the
// visitor is already looking at the real cart/checkout. The badge still
// renders; only the panel is suppressed for this request.
$on_cart_or_checkout = $wc_active && function_exists( 'is_cart' ) && function_exists( 'is_checkout' )
	&& ( is_cart() || is_checkout() );
$effective_mode      = ( $hide_on_cart_pages && $on_cart_or_checkout ) ? 'link' : $display_mode;
$has_panel           = $wc_active && in_array( $effective_mode, array( 'flyout', 'drawer' ), true );

// ── Wave B, U-2 — free-delivery progress bar threshold ───────────────────────
// Manual override wins outright; otherwise read the WooCommerce free-shipping
// method's `min_amount` from the shipping zone matching the STORE'S OWN base
// country (never the visitor's — the panel is generic chrome, not a per-visitor
// shipping quote, and Store API doesn't expose the zone match pre-checkout).
// Both empty → null → the bar is hidden entirely (panel-render.js). As a
// CLOSURE assigned to a local variable, never a top-level `function` — this
// file is `require`d fresh per block instance (see the BUILD-SAFETY note
// above); a second `sgs/cart` on the same page would fatal on redeclaration.
$sgs_cart_resolve_free_shipping_min_amount = function () {
	if ( ! class_exists( 'WC_Shipping_Zones' ) || ! function_exists( 'wc_get_base_location' ) ) {
		return null;
	}
	$base_location = wc_get_base_location();
	$package       = array(
		'destination' => array(
			'country'  => is_array( $base_location ) ? (string) ( $base_location['country'] ?? '' ) : '',
			'state'    => is_array( $base_location ) ? (string) ( $base_location['state'] ?? '' ) : '',
			'postcode' => '',
		),
	);
	$zone          = WC_Shipping_Zones::get_zone_matching_package( $package );
	if ( ! $zone ) {
		return null;
	}
	foreach ( $zone->get_shipping_methods( true ) as $method ) {
		if ( 'free_shipping' !== $method->id || ! $method->is_enabled() ) {
			continue;
		}
		$min_amount = $method->get_option( 'min_amount', '' );
		if ( is_numeric( $min_amount ) && (float) $min_amount > 0 ) {
			return (float) $min_amount;
		}
	}
	return null;
};

$free_delivery_threshold_override = trim( (string) ( $attributes['freeDeliveryThresholdOverride'] ?? '' ) );
$free_delivery_threshold          = null;
if ( '' !== $free_delivery_threshold_override && is_numeric( $free_delivery_threshold_override ) ) {
	$free_delivery_threshold = (float) $free_delivery_threshold_override;
} elseif ( $has_panel ) {
	$free_delivery_threshold = $sgs_cart_resolve_free_shipping_min_amount();
}
$free_delivery_message = sanitize_text_field(
	$attributes['freeDeliveryMessage'] ?? sprintf(
		/* translators: %s is a literal "%s" placeholder the frontend JS replaces with a wc_price-formatted amount (Store API cart totals are only known client-side) — never expanded server-side. */
		__( "You're %s away from free delivery", 'sgs-blocks' ),
		'%s'
	)
);
$free_delivery_success_message = sanitize_text_field( $attributes['freeDeliverySuccessMessage'] ?? __( "You've unlocked free delivery!", 'sgs-blocks' ) );
$free_delivery_fill_colour     = (string) ( $attributes['freeDeliveryFillColour'] ?? '' );
$free_delivery_track_colour    = (string) ( $attributes['freeDeliveryTrackColour'] ?? '' );

// ── SSR count: always 0 to avoid cached stale counts ─────────────────────────
// The view.js module replaces this via the Store API within ~200 ms.
$ssr_count = 0;

// ── CSS custom-property VALUES (icon size/colour, badge colours, panel
// bg/text) — a scoped `.{uid}.wp-block-sgs-cart{…}` rule below. Inline
// `--var` custom properties are forbidden (Spec 32 FR-32-4); this mirrors
// sgs/info-box's hover-colour treatment. Nothing lands in the
// root's `style="…"` attribute. ────────────────────────────────────────────
$sgs_cart_vars = array(
	'--sgs-cart-icon-size:' . $icon_size . 'px',
);
// Unset, the trigger takes the surrounding text colour (style.css's currentColor fallback).
if ( '' !== $icon_colour ) {
	$sgs_cart_vars[] = '--sgs-cart-icon-colour:' . sgs_colour_value( $icon_colour );
}

// ── Margin — `margin` is a single block-owned TIER-of-BOXES envelope attr
// {desktop,tablet,mobile}, read once via
// sgs_responsive_normalise_object(), NOT auto-inlined. Hand-built shorthand
// for the tablet/mobile tiers (mirrors sgs/star-rating's margin). ─────
$sgs_cart_margin_tiers = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$base_margin_obj       = array();
$margin_raw            = is_array( $sgs_cart_margin_tiers['desktop'] ?? null ) ? $sgs_cart_margin_tiers['desktop'] : array();
if ( ! empty( $margin_raw ) ) {
	foreach ( $margin_raw as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}
$margin_tablet_obj = is_array( $sgs_cart_margin_tiers['tablet'] ?? null ) ? $sgs_cart_margin_tiers['tablet'] : array();
$margin_mobile_obj = is_array( $sgs_cart_margin_tiers['mobile'] ?? null ) ? $sgs_cart_margin_tiers['mobile'] : array();

// ── uid/selector — CLASS pattern mirrors sgs/label/sgs/heading/sgs/container.
$uid       = 'sgs-cart-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sel       = '.' . $uid . '.wp-block-sgs-cart';
$panel_id  = $uid . '-panel';
$drawer_id = $uid . '-drawer';

$scoped_css = array();

if ( ! empty( $base_margin_obj ) ) {
	$base_margin_styles = wp_style_engine_get_styles(
		array( 'spacing' => array( 'margin' => $base_margin_obj ) ),
		array( 'selector' => $sel )
	);
	if ( ! empty( $base_margin_styles['css'] ) ) {
		$scoped_css[] = $base_margin_styles['css'];
	}
}

$margin_tab_val = sgs_box_object_longhands( $margin_tablet_obj, 'margin' );
$margin_mob_val = sgs_box_object_longhands( $margin_mobile_obj, 'margin' );

if ( null !== $margin_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$sel}{{$margin_tab_val};}}";
}
if ( null !== $margin_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$sel}{{$margin_mob_val};}}";
}

// ── Cart custom-property VALUES (icon size/colour) — scoped rule on the
// SAME uid selector, NOT inline (Spec 32 FR-32-4). Badge/panel colours are
// emitted separately (below) — each pairs a fill (background) and text colour
// on the SAME element, which a text gradient's background-clip:text would
// otherwise clip, so the fill half routes through its own ::after layer. ───
if ( $sgs_cart_vars ) {
	$scoped_css[] = $sel . '{' . implode( ';', $sgs_cart_vars ) . '}';
}

require __DIR__ . '/render-scoped-css.php';

// ── Wrapper classes ───────────────────────────────────────────────────────────
$wrapper_classes = array( 'sgs-cart', $uid, 'sgs-cart--mode-' . $effective_mode, 'sgs-cart--trigger-' . $trigger_style );
if ( 'pill' === $trigger_style && 'bubble' === ( $attributes['pillCountStyle'] ?? 'plain' ) ) {
	$wrapper_classes[] = 'sgs-cart--pill-count-bubble';
}
if ( ! $wc_active ) {
	$wrapper_classes[] = 'sgs-cart--wc-inactive';
}
// Hide the whole trigger on first paint (pre-hydration) when the SSR count
// is 0 and the operator has opted in — view.js reveals it once the real
// Store API count is known to be > 0.
if ( $hide_when_empty && 0 === $ssr_count ) {
	$wrapper_classes[] = 'sgs-cart--hidden-empty';
}

// Wave B data attrs read by view.js (count-pop) / panel-render.js
// (free-delivery progress, only meaningful — and only ever emitted — when
// the block has a flyout/drawer panel to render it in).
$wrapper_data_attributes = array(
	'class'                 => implode( ' ', $wrapper_classes ),
	'data-show-zero'        => $show_zero ? 'true' : 'false',
	'data-hide-when-empty'  => $hide_when_empty ? '1' : '0',
	'data-display-mode'     => esc_attr( $effective_mode ),
	'data-auto-open-on-add' => $auto_open_on_add ? '1' : '0',
	'data-count-pop'        => $count_pop_animation,
);
if ( $has_panel ) {
	$wrapper_data_attributes['data-free-delivery-threshold']       = ( null !== $free_delivery_threshold ) ? (string) $free_delivery_threshold : '';
	$wrapper_data_attributes['data-free-delivery-message']         = $free_delivery_message;
	$wrapper_data_attributes['data-free-delivery-success-message'] = $free_delivery_success_message;
	$wrapper_data_attributes['data-free-delivery-placement']       = 'footer' === ( $attributes['freeDeliveryPlacement'] ?? 'above-items' ) ? 'footer' : 'above-items';
	$wrapper_data_attributes['data-free-delivery-hide-empty']      = ! empty( $attributes['freeDeliveryHideWhenEmpty'] ) ? '1' : '0';
}

$wrapper_attributes = get_block_wrapper_attributes(
	$wrapper_data_attributes
);

// ── Icon SVG ─────────────────────────────────────────────────────────────────
$icon_svg = sgs_get_lucide_icon( $icon_name );
// Icon/SVG gradient — non-empty gradient wins over iconColour's
// flat currentColor paint (helpers-svg-gradient.php).
$sgs_cart_stroke_grad = sgs_icon_gradient_css( 'lucide', $icon_colour_gradient, $uid . '-ig', "{$sel} .sgs-cart__icon svg" );
if ( '' !== $sgs_cart_stroke_grad['defs'] ) {
	$icon_svg     = sgs_svg_inject_defs( $icon_svg, $sgs_cart_stroke_grad['defs'] );
	$scoped_css[] = "{$sel} .sgs-cart__icon svg{" . $sgs_cart_stroke_grad['css'] . ';}';
}

// Icon hover — flat-or-gradient, via the shared sgs_icon_gradient_css()
// composer. This block's icon is always Lucide (no source
// picker), so the composer always takes the SVG stroke-gradient branch;
// using it anyway keeps every icon-hosting block on one call site.
$sgs_cart_icon_hover_grad = sgs_icon_gradient_css( 'lucide', $icon_colour_hover_gradient, $uid . '-igh', "{$sel} .sgs-cart__icon svg" );
if ( '' !== $sgs_cart_icon_hover_grad['css'] ) {
	$icon_svg     = sgs_svg_inject_defs( $icon_svg, $sgs_cart_icon_hover_grad['defs'] );
	$scoped_css[] = sgs_hover_state_rules( "{$sel} .sgs-cart__trigger", $sgs_cart_icon_hover_grad['css'], ':focus-visible', ' .sgs-cart__icon svg' );
} elseif ( '' !== $icon_colour_hover ) {
	$scoped_css[] = sgs_hover_state_rules( "{$sel} .sgs-cart__trigger", 'color:' . sgs_colour_value( $icon_colour_hover ), ':focus-visible', ' .sgs-cart__icon svg' );
}

// ── Accessible label with count ───────────────────────────────────────────────
// Uses a sprintf-style template; view.js replaces the live count.
$count_label = sprintf(
	/* translators: %d: number of items in the cart */
	_n( '%d item in cart', '%d items in cart', $ssr_count, 'sgs-blocks' ),
	$ssr_count
);
$trigger_label = $aria_label . ' (' . $count_label . ')';

// ── The trigger itself: <a href> in `link` mode (unchanged — full no-JS
// fallback), a real <button> in flyout/drawer mode (mirrors the proven
// sgs/nav-bar-menu burger — a click handler on an <a> would race the anchor's
// default navigation since neither store('sgs/nav')'s toggleDrawer action
// nor the flyout's own JS calls preventDefault on it). ──────────────────────
$icon_and_badge_html = sprintf(
	'<span class="sgs-cart__icon" aria-hidden="true">%1$s</span><span class="sgs-cart__badge%2$s" role="status" aria-live="polite" aria-atomic="true" data-sgs-cart-count>%3$d</span>',
	$icon_svg, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted Lucide SVG.
	( $ssr_count > 0 || $show_zero ) ? ' sgs-cart__badge--visible' : '',
	absint( $ssr_count )
);

// Wave B, U-1 — 'pill' trigger style: the word (pillLabel) replaces the icon;
// the count keeps the SAME `.sgs-cart__badge` element/attribute (style.css
// restyles it inline, not as an overlay), so badgeColour/badgeTextColour
// keep governing the count's colours in both trigger styles — one control,
// not two.
$pill_and_badge_html = sprintf(
	'<span class="sgs-cart__pill-label">%1$s</span><span class="sgs-cart__badge sgs-cart__badge--pill%2$s" role="status" aria-live="polite" aria-atomic="true" data-sgs-cart-count>%3$d</span>',
	esc_html( $pill_label ),
	( $ssr_count > 0 || $show_zero ) ? ' sgs-cart__badge--visible' : '',
	absint( $ssr_count )
);

$trigger_inner_html = ( 'pill' === $trigger_style ) ? $pill_and_badge_html : $icon_and_badge_html;

// ── Trigger markup (FR-36-10) ──────────────────────────────────────────────
// The mode decides the ELEMENT: an <a> for link (full no-JS fallback), a real
// <button> for flyout/drawer. Built in includes/helpers-cart-panel.php — see
// the note on the panel builders below for why it cannot live in this folder.
$trigger_args = array(
	'cart_url'      => $cart_url,
	'trigger_label' => $trigger_label,
	'panel_id'      => $panel_id,
	'drawer_id'     => $drawer_id,
);

$trigger_mode = ( 'link' === $effective_mode || ! $has_panel ) ? 'link' : $effective_mode;
$trigger_html = sgs_cart_trigger_html( $trigger_mode, $trigger_inner_html, $trigger_args );

// ── Panel markup (FR-36-19) ────────────────────────────────────────────────
// flyout and drawer share ONE body skeleton and differ only in the wrapper
// element their ARIA pattern requires (FR-36-10) — which is what lets a single
// `displayMode` attribute swap DISCLOSURE for DIALOG without forking markup.
// Both builders live in includes/helpers-cart-panel.php: `--webpack-copy-php`
// only copies PHP paths named in block.json, so a sibling file in THIS
// directory would never reach build/ and would fatal in production, whereas
// includes/ ships as source and already hosts every shared render helper.
$panel_args = array(
	'uid'                => $uid,
	'panel_id'           => $panel_id,
	'drawer_id'          => $drawer_id,
	'panel_heading'      => $panel_heading,
	'empty_cart_message' => $empty_cart_message,
	'empty_cart_cta'     => $empty_cart_cta,
	'shop_url'           => $shop_url,
	'cart_url'           => $cart_url,
	'checkout_url'       => $checkout_url,
	'view_cart_label'    => $view_cart_label,
	'checkout_label'     => $checkout_label,
	'show_count'         => ! empty( $attributes['panelShowCount'] ),
	'show_view_cart'     => ! isset( $attributes['panelShowViewCart'] ) || ! empty( $attributes['panelShowViewCart'] ),
	'tax_note'           => sanitize_text_field( $attributes['panelTaxNote'] ?? __( 'Shipping and taxes calculated at checkout.', 'sgs-blocks' ) ),
	'instalments_note'   => sanitize_text_field( $attributes['panelInstalmentsNote'] ?? '' ),
	'instalments_count'  => absint( $attributes['panelInstalmentsCount'] ?? 3 ),
	'close_html'         => 'drawer' === $effective_mode ? sgs_cart_close_button_html() : '',
	'remove_style'       => 'text' === ( $attributes['itemRemoveStyle'] ?? 'icon' ) ? 'text' : 'icon',
	'remove_label'       => sanitize_text_field( $attributes['itemRemoveLabel'] ?? __( 'Remove', 'sgs-blocks' ) ),
	'show_qty'           => ! isset( $attributes['itemShowQty'] ) || ! empty( $attributes['itemShowQty'] ),
	'show_save'          => ! isset( $attributes['itemShowSaveForLater'] ) || ! empty( $attributes['itemShowSaveForLater'] ),
	'show_add_options'   => ! empty( $attributes['itemShowAddOptions'] ),
	'add_options_label'  => sanitize_text_field( $attributes['itemAddOptionsLabel'] ?? '' ),
);

$panel_html = $has_panel
	? sgs_cart_panel_wrapper_html( $effective_mode, sgs_cart_panel_body_html( $panel_args ), $panel_args )
	: '';

// ── Scrim (Wave 3C U-2, family M-14) — the see-through layer dimming the
// page behind the open drawer. Only the drawer display mode has a backdrop;
// flyout is a plain popover with no page-dimming. Shared helper + design:
// includes/helpers-scrim.php, .claude/reports/2026-09-24-u2-scrim-design.md
// (Addendum A). The open selector is the NON-MODAL `[open]` form (this
// dialog is opened via store('sgs/nav') `showModal()` in modal mode, but
// resolveDrawerMode() in store.js also supports a non-modal `.show()` path
// for a partial-width anchor — `[open]` matches both). `data-sgs-nav-scrim`
// carries the SAME drawer-ref value as the trigger's `drawerRef` context and
// the dialog's own id, so store.js's resolveScrim() can find this element.
if ( $has_panel && 'drawer' === $effective_mode ) {
	$scrim_css = sgs_scrim_render(
		$attributes,
		$uid,
		array(
			'open' => '.' . $uid . '.sgs-cart__panel--drawer[open]',
			'data' => array( 'sgs-nav-scrim' => $drawer_id ),
		)
	);
	if ( '' !== $scrim_css ) {
		$scoped_css[] = $scrim_css;
	}
}

// ── Emit the scoped <style> then the trigger + (optional) panel. ────────────
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $scoped_css entries are all pre-sanitised (sgs_colour_value/sgs_css_length/wp_style_engine_get_styles); $wrapper_attributes from get_block_wrapper_attributes(); $trigger_html/$panel_html built entirely from esc_url/esc_attr/esc_html above plus trusted Lucide SVG + wp_interactivity_data_wp_context() (self-escaping).
if ( $scoped_css ) :
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); ?></style>
	<?php
endif;
?>
<div <?php echo $wrapper_attributes; ?>>
	<?php echo $trigger_html; ?>
	<?php echo $panel_html; ?>
</div>
<?php
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
