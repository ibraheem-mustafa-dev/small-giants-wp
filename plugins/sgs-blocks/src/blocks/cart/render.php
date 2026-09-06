<?php
/**
 * Server-side render for the SGS Cart block.
 *
 * Cache strategy: always renders count 0 server-side (LiteSpeed/Hostinger
 * page cache would otherwise serve stale counts to all visitors); view.js
 * hydrates the real count from the WooCommerce Store API within ~200 ms.
 * WooCommerce inactive → renders nothing at all (D338/R-31-9 — no
 * per-client carve-out needed; edit.js shows admins a Notice instead).
 *
 * FR-36-19 Phase 2 (mini-cart): `displayMode` is `link` (unchanged badge
 * link, no panel), `flyout` (DISCLOSURE per FR-36-10 — a plain toggle
 * button, non-modal popover, no Tab trap, page stays usable) or `drawer`
 * (DIALOG per FR-36-10 — a native `<dialog>` opened via the SHARED
 * `store('sgs/nav')` already proven by `sgs/nav-menu`/`sgs/nav-drawer`,
 * zero duplicated open/close/focus logic). Item data/qty-edit/remove/
 * totals are populated client-side by view.js — the SSR panel is a
 * loading skeleton only (as cache-sensitive as the count).
 * `hideOnCartCheckoutPages` (default true) demotes the effective mode to
 * `link` on `is_cart()`/`is_checkout()` — a popover there is redundant.
 *
 * WCAG 2.2 AA: `link` mode's trigger is an `<a>` (full no-JS fallback);
 * `flyout`/`drawer` triggers are a real `<button>` (mirrors the proven
 * `sgs/nav-menu` burger — a click handler on an `<a>` would race the
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

// BUILD-SAFETY: `--webpack-copy-php` only copies the PHP paths block.json's
// `render`/`variations` fields name (verified against @wordpress/scripts's
// PhpFilePathsPlugin) — a sibling PHP file in this directory would never
// reach build/ and 500 in production, so panel markup stays inline below
// as CLOSURES on local variables (never `function foo(){}` at file scope:
// WP `require`s this file fresh per render, and a top-level function would
// fatal with "Cannot redeclare" the moment two sgs/cart instances render on
// one page) — matches the sgs_css_length_value() pattern established below.

// ---------------------------------------------------------------------------
// NO-INLINE (Spec 32 FR-32-4, D345): margin is a WP-native
// style.spacing.margin object, skip-serialised so it's never auto-inlined —
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
$icon_colour           = $attributes['iconColour'] ?? 'primary';
// D636/D644 icon/SVG gradient sibling — non-empty wins over iconColour above.
$icon_colour_gradient       = $attributes['iconColourGradient'] ?? '';
$icon_colour_hover          = $attributes['iconColourHover'] ?? '';
$icon_colour_hover_gradient = $attributes['iconColourHoverGradient'] ?? '';
$badge_colour               = $attributes['badgeColour'] ?? 'accent';
$badge_text_colour          = $attributes['badgeTextColour'] ?? 'accent-text';
$aria_label                 = sanitize_text_field( $attributes['ariaLabel'] ?? __( 'View your cart', 'sgs-blocks' ) );
$show_zero                  = ! empty( $attributes['showZero'] );
$hide_when_empty            = ! empty( $attributes['hideWhenEmpty'] );

// FR-36-19 Phase 2 panel attrs.
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

// ── SSR count: always 0 to avoid cached stale counts ─────────────────────────
// The view.js module replaces this via the Store API within ~200 ms.
$ssr_count = 0;

// ── CSS custom-property VALUES (icon size/colour, badge colours, panel
// bg/text) — a scoped `.{uid}.wp-block-sgs-cart{…}` rule below (Spec 32
// FR-32-4 as amended 2026-07-18 / D345: inline `--var` is now FORBIDDEN,
// mirrors sgs/info-box's hover-colour treatment). Nothing lands in the
// root's `style="…"` attribute. ────────────────────────────────────────────
$sgs_cart_vars = array(
	'--sgs-cart-icon-size:' . $icon_size . 'px',
	'--sgs-cart-icon-colour:' . sgs_colour_value( $icon_colour ),
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

$margin_tab_val = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val = sgs_box_object_shorthand( $margin_mobile_obj );

if ( null !== $margin_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$sel}{margin:{$margin_tab_val};}}";
}
if ( null !== $margin_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$sel}{margin:{$margin_mob_val};}}";
}

// ── Cart custom-property VALUES (icon size/colour) — scoped rule on the
// SAME uid selector, NOT inline (Spec 32 FR-32-4 as amended 2026-07-18 /
// D345). Badge/panel colours moved off this mechanism 2026-09-04 (below) —
// each pairs a fill (background) and text colour on the SAME element, which
// a text gradient's background-clip:text would otherwise clip, so the fill
// half now routes through its own ::after layer. ───────────────────────────
if ( $sgs_cart_vars ) {
	$scoped_css[] = $sel . '{' . implode( ';', $sgs_cart_vars ) . '}';
}

// Badge: badgeColour (fill) / badgeTextColour (text) share .sgs-cart__badge.
// HAND-BUILT ::after, NOT sgs_block_background_layer_css() — the badge is
// already `position:absolute` (style.css, positions it top:2px/right:2px on
// the icon), and that helper hardcodes `position:relative` on the same
// selector, which would silently break the badge's own positioning (the
// exact trap sgs/pricing-table's popularBadgeBackground already documents).
$badge_sel             = $sel . ' .sgs-cart__badge';
$badge_colour_gradient = (string) ( $attributes['badgeColourGradient'] ?? '' );
$badge_bg_paint        = sgs_background_paint_decl( $badge_colour, $badge_colour_gradient );
if ( '' !== $badge_bg_paint ) {
	$scoped_css[] = $badge_sel . '::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;' . $badge_bg_paint . ';}';
}
$badge_text_gradient  = (string) ( $attributes['badgeTextColourGradient'] ?? '' );
$badge_text_effective = sgs_resolve_text_colour_or_gradient( $badge_text_colour, $badge_text_gradient );
if ( '' !== $badge_text_effective ) {
	$badge_text_decl = sgs_text_colour_decl( $badge_text_effective );
	if ( '' !== $badge_text_decl ) {
		$scoped_css[] = $badge_sel . '{' . $badge_text_decl . ';}';
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $badge_sel, $badge_text_effective );
}

// Panel: panelBg (fill) / panelTextColour (text) share .sgs-cart__panel —
// same split, only rendered when $has_panel (flyout|drawer displayMode).
// Also HAND-BUILT: the panel's own `--flyout`/`--drawer` modifier classes
// declare `position:absolute`/`position:fixed` respectively, at the SAME
// (0,2,0) specificity as a uid-scoped rule here would carry — relying on
// sgs_block_background_layer_css()'s `position:relative` to win on source
// order is exactly the kind of silent, unprovable win/loss this file's own
// discipline avoids. The panel is always positioned by one of those two
// modifiers whenever it renders, so `::after` has a positioning context
// without this code adding one.
if ( $has_panel ) {
	$panel_sel         = $sel . ' .sgs-cart__panel';
	$panel_bg_gradient = (string) ( $attributes['panelBgGradient'] ?? '' );
	$panel_bg_paint    = sgs_background_paint_decl( $panel_bg_slug, $panel_bg_gradient );
	if ( '' !== $panel_bg_paint ) {
		$scoped_css[] = $panel_sel . '::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;' . $panel_bg_paint . ';}';
	}
	$panel_text_gradient  = (string) ( $attributes['panelTextColourGradient'] ?? '' );
	$panel_text_effective = sgs_resolve_text_colour_or_gradient( $panel_text_slug, $panel_text_gradient );
	if ( '' !== $panel_text_effective ) {
		$panel_text_decl = sgs_text_colour_decl( $panel_text_effective );
		if ( '' !== $panel_text_decl ) {
			$scoped_css[] = $panel_sel . '{' . $panel_text_decl . ';}';
		}
		$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $panel_sel, $panel_text_effective );
	}
}

// ── Media-element atom layer (rule 37-media-no-handroll fix) — item-thumbnail
// object-fit only. The thumbnail <img> itself is added to the DOM later by
// panel-render.js/item-row-template.js (Store API hydration), never by this
// file — but the CSS custom property is set here, on the PHP-rendered wrapper
// ($uid is already a class on it, see $wrapper_classes above), and inherits
// down to the .sgs-media-el marker item-row-template.js appends regardless of
// when that element is inserted. `class_exists()` guards a class the plugin
// loader always registers; kept for the same "never fatal if load order
// changes" reason sgs/gallery/sgs/hero guard it.
if ( $has_panel && class_exists( 'SGS_Media_Element' ) ) {
	$sgs_cart_media_css = SGS_Media_Element::style(
		$attributes,
		'',
		'sgs/cart',
		$uid,
		array( 'object-fit' )
	);
	if ( '' !== $sgs_cart_media_css ) {
		$scoped_css[] = $sgs_cart_media_css;
	}
}

// ── Wrapper classes ───────────────────────────────────────────────────────────
$wrapper_classes = array( 'sgs-cart', $uid, 'sgs-cart--mode-' . $effective_mode );
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
		'class'                 => implode( ' ', $wrapper_classes ),
		'data-show-zero'        => $show_zero ? 'true' : 'false',
		'data-hide-when-empty'  => $hide_when_empty ? '1' : '0',
		'data-display-mode'     => esc_attr( $effective_mode ),
		'data-auto-open-on-add' => $auto_open_on_add ? '1' : '0',
	)
);

// ── Icon SVG ─────────────────────────────────────────────────────────────────
$icon_svg = sgs_get_lucide_icon( $icon_name );
// D636/D644 icon/SVG gradient — non-empty gradient wins over iconColour's
// flat currentColor paint (helpers-svg-gradient.php).
$sgs_cart_stroke_grad = sgs_icon_gradient_css( 'lucide', $icon_colour_gradient, $uid . '-ig', "{$sel} .sgs-cart__icon svg" );
if ( '' !== $sgs_cart_stroke_grad['defs'] ) {
	$icon_svg     = sgs_svg_inject_defs( $icon_svg, $sgs_cart_stroke_grad['defs'] );
	$scoped_css[] = "{$sel} .sgs-cart__icon svg{" . $sgs_cart_stroke_grad['css'] . ';}';
}

// Icon hover — flat-or-gradient, via the shared sgs_icon_gradient_css()
// composer (2026-09-06). This block's icon is always Lucide (no source
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
// sgs/nav-menu burger — a click handler on an <a> would race the anchor's
// default navigation since neither store('sgs/nav')'s toggleDrawer action
// nor the flyout's own JS calls preventDefault on it). ──────────────────────
$icon_and_badge_html = sprintf(
	'<span class="sgs-cart__icon" aria-hidden="true">%1$s</span><span class="sgs-cart__badge%2$s" role="status" aria-live="polite" aria-atomic="true" data-sgs-cart-count>%3$d</span>',
	$icon_svg, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted Lucide SVG.
	( $ssr_count > 0 || $show_zero ) ? ' sgs-cart__badge--visible' : '',
	absint( $ssr_count )
);

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
$trigger_html = sgs_cart_trigger_html( $trigger_mode, $icon_and_badge_html, $trigger_args );

// ── Panel markup (FR-36-19) ────────────────────────────────────────────────
// flyout and drawer share ONE body skeleton and differ only in the wrapper
// element their ARIA pattern requires (FR-36-10) — which is what lets a single
// `displayMode` attribute swap DISCLOSURE for DIALOG without forking markup.
// Both builders live in includes/helpers-cart-panel.php: `--webpack-copy-php`
// only copies PHP paths named in block.json, so a sibling file in THIS
// directory would never reach build/ and would fatal in production, whereas
// includes/ ships as source and already hosts every shared render helper.
$panel_args = array(
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
);

$panel_html = $has_panel
	? sgs_cart_panel_wrapper_html( $effective_mode, sgs_cart_panel_body_html( $panel_args ), $panel_args )
	: '';

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
