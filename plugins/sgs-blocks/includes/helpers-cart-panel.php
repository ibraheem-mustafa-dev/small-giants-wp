<?php
/**
 * Mini-cart panel markup helpers (FR-36-19).
 *
 * WHY THESE LIVE HERE AND NOT IN THE BLOCK DIRECTORY.
 * `--webpack-copy-php` only copies the PHP paths a block.json's `render`/
 * `variations` fields name, so a sibling PHP file inside `src/blocks/cart/`
 * would never reach `build/` and would fatal in production. `includes/` ships
 * as source and is already the home of every shared render helper, so the
 * panel builders belong here — the same reasoning that puts
 * `sgs_typography_css_rule()` in `helpers-typography.php`.
 *
 * Both functions are PURE string builders: they take resolved, already-decided
 * values and return escaped markup. No attribute resolution, no WooCommerce
 * calls, no output. That keeps the render-order decisions (effective mode,
 * WC availability, cache strategy) visible in `cart/render.php` where a reader
 * expects them.
 *
 * FR-36-10 contract: the flyout wrapper is a DISCLOSURE (a plain `<div hidden>`
 * toggled by a `<button aria-expanded>`, no focus trap, page stays usable);
 * the drawer wrapper is a DIALOG (a native `<dialog>` driven by the shared
 * `store('sgs/nav')`). The BODY is identical for both — only the wrapper
 * differs — which is what makes one attribute able to swap the ARIA pattern
 * without forking the markup.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Build the cart trigger for the given display mode.
 *
 * `link`   → an `<a href>`, so the cart is reachable with no JS at all.
 * `flyout` → a real `<button aria-expanded aria-controls>`. It must be a button,
 *            not a styled `<a>`: a click handler on an anchor races the anchor's
 *            own default navigation. This mirrors the `sgs/nav-bar-menu` burger.
 * `drawer` → the same button, wrapped in a `data-wp-interactive="sgs/nav"` element
 *            carrying the per-instance context, so the SHARED `store('sgs/nav')`
 *            drives it. No second open/close/focus utility exists (R-31-9).
 *
 * @param string $mode           Effective display mode — link, flyout or drawer.
 * @param string $inner_html     Pre-built icon + badge markup.
 * @param array  $args {
 *     Resolved trigger values.
 *
 *     @type string $cart_url      Destination for link mode.
 *     @type string $trigger_label Accessible name (carries the live count).
 *     @type string $panel_id      Flyout panel id, for aria-controls.
 *     @type string $drawer_id     Dialog id, for aria-controls.
 * }
 * @return string Escaped trigger markup.
 */
function sgs_cart_trigger_html( string $mode, string $inner_html, array $args ): string {
	// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $inner_html is built from esc_attr + trusted Lucide SVG by the caller; wp_interactivity_data_wp_context() self-escapes.
	if ( 'flyout' === $mode ) {
		return sprintf(
			'<button type="button" class="sgs-cart__trigger" aria-label="%1$s" aria-expanded="false" aria-controls="%2$s" data-sgs-cart-trigger data-sgs-cart-flyout-trigger>%3$s</button>',
			esc_attr( $args['trigger_label'] ),
			esc_attr( $args['panel_id'] ),
			$inner_html
		);
	}

	if ( 'drawer' === $mode ) {
		$context      = array(
			'isOpen'    => false,
			'drawerRef' => $args['drawer_id'],
		);
		$context_attr = wp_interactivity_data_wp_context( $context );

		return sprintf(
			'<div class="sgs-cart__trigger-wrap" data-wp-interactive="sgs/nav" %1$s><button type="button" class="sgs-cart__trigger" data-wp-on--click="actions.toggleDrawer" data-wp-bind--aria-expanded="state.isOpen" aria-controls="%2$s" aria-label="%3$s" data-sgs-cart-trigger>%4$s</button></div>',
			$context_attr,
			esc_attr( $args['drawer_id'] ),
			esc_attr( $args['trigger_label'] ),
			$inner_html
		);
	}

	return sprintf(
		'<a href="%1$s" class="sgs-cart__trigger" aria-label="%2$s" data-sgs-cart-trigger>%3$s</a>',
		esc_url( $args['cart_url'] ),
		esc_attr( $args['trigger_label'] ),
		$inner_html
	);
	// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
}

/**
 * Build the shared mini-cart panel body.
 *
 * The item list, empty state and totals are populated client-side by
 * `panel-render.js` against the WooCommerce Store API — this SSR body is a
 * loading skeleton only. That is deliberate, not an omission: the item list is
 * exactly as cache-sensitive as the count badge, and a page cache would
 * otherwise serve one visitor's cart to every visitor.
 *
 * The status region here is a SEPARATE node from the badge's live region, so
 * mutation feedback ("Item removed") can never double-announce with the count
 * (FR-36-19's live-region coherence clause).
 *
 * @param array $args {
 *     Resolved, pre-decided values.
 *
 *     @type string $panel_id           Panel DOM id (also seeds the heading id).
 *     @type string $panel_heading      Operator-set panel heading text.
 *     @type string $empty_cart_message Operator-set empty-state message.
 *     @type string $empty_cart_cta     Operator-set empty-state CTA label.
 *     @type string $shop_url           Empty-state CTA destination.
 *     @type string $cart_url           "View cart" destination.
 *     @type string $checkout_url       "Checkout" destination.
 *     @type string $view_cart_label    Operator-set "View cart" label.
 *     @type string $checkout_label     Operator-set "Checkout" label.
 *     @type bool   $show_count         Show the live "(N)" after the heading.
 *     @type bool   $show_view_cart     Show the View cart button.
 *     @type string $tax_note           Note under the subtotal; '' hides it.
 *     @type string $instalments_note   Note under checkout with a %s amount; '' hides it.
 *     @type int    $instalments_count  Instalment count used for that amount.
 *     @type string $close_html         Drawer close button markup (head row), or ''.
 *     @type string $remove_style       Item remove control: icon | text.
 *     @type string $remove_label       Text-style remove label.
 *     @type bool   $show_qty           Show each item's quantity input.
 *     @type bool   $show_save          Show each item's Save for later action.
 * }
 * @return string Escaped panel-body markup.
 */
function sgs_cart_panel_body_html( array $args ): string {
	$count_html = ! empty( $args['show_count'] )
		? ' <span class="sgs-cart__panel-count" data-sgs-cart-panel-count>(0)</span>'
		: '';

	$note_html = '';
	if ( '' !== (string) ( $args['tax_note'] ?? '' ) ) {
		$note_html = '<p class="sgs-cart__panel-tax-note" data-sgs-cart-tax-note>' . esc_html( $args['tax_note'] ) . '</p>';
	}

	$view_html = ! isset( $args['show_view_cart'] ) || ! empty( $args['show_view_cart'] )
		? sprintf( '<a class="sgs-cart__panel-view" href="%1$s">%2$s</a>', esc_url( $args['cart_url'] ), esc_html( $args['view_cart_label'] ) )
		: '';

	$instalments_html = '';
	if ( '' !== (string) ( $args['instalments_note'] ?? '' ) ) {
		$instalments_html = sprintf(
			'<p class="sgs-cart__panel-note" data-sgs-cart-note data-note-template="%1$s" data-note-count="%2$d" hidden></p>',
			esc_attr( $args['instalments_note'] ),
			max( 1, absint( $args['instalments_count'] ?? 3 ) )
		);
	}

	return sprintf(
		'<div class="sgs-cart__panel-inner">' .
			'<div class="sgs-cart__panel-header"><h2 class="sgs-cart__panel-heading" id="%1$s-heading">%2$s%13$s</h2>%14$s</div>' .
			'<div class="sgs-cart__panel-status" role="status" aria-live="polite" aria-atomic="true" data-sgs-cart-status></div>' .
			'<div class="sgs-cart__panel-items" data-sgs-cart-items aria-busy="true" data-empty-message="%3$s" data-empty-cta-label="%4$s" data-shop-url="%5$s" data-remove-style="%15$s" data-remove-label="%16$s" data-show-qty="%17$s" data-show-save="%18$s"><p class="sgs-cart__panel-loading">%6$s</p></div>' .
			'<div class="sgs-cart__panel-footer" data-sgs-cart-footer hidden>' .
				'<div class="sgs-cart__panel-subtotal"><span class="sgs-cart__panel-subtotal-label">%7$s</span><span class="sgs-cart__panel-subtotal-value" data-sgs-cart-subtotal></span></div>' .
				'%8$s' .
				'<div class="sgs-cart__panel-actions">' .
					'%9$s' .
					'<a class="sgs-cart__panel-checkout" href="%11$s">%12$s</a>' .
				'</div>' .
				'%10$s' .
			'</div>' .
		'</div>',
		esc_attr( $args['panel_id'] ),
		esc_html( $args['panel_heading'] ),
		esc_attr( $args['empty_cart_message'] ),
		esc_attr( $args['empty_cart_cta'] ),
		esc_url( $args['shop_url'] ),
		esc_html__( 'Loading your cart…', 'sgs-blocks' ),
		esc_html__( 'Subtotal', 'sgs-blocks' ),
		$note_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_html above.
		$view_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_url/esc_html above.
		$instalments_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr above.
		esc_url( $args['checkout_url'] ),
		esc_html( $args['checkout_label'] ),
		$count_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static markup.
		(string) ( $args['close_html'] ?? '' ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by sgs_cart_close_button_html().
		'text' === ( $args['remove_style'] ?? 'icon' ) ? 'text' : 'icon',
		esc_attr( (string) ( $args['remove_label'] ?? '' ) ),
		! isset( $args['show_qty'] ) || ! empty( $args['show_qty'] ) ? '1' : '0',
		! isset( $args['show_save'] ) || ! empty( $args['show_save'] ) ? '1' : '0'
	);
}

/**
 * The drawer's close button. It sits in the panel head row (built into
 * `sgs_cart_panel_body_html()` through `$args['close_html']`), so the head is
 * one flex row: heading on the left, close on the right.
 *
 * @return string Escaped button markup.
 */
function sgs_cart_close_button_html(): string {
	return sprintf(
		'<button type="button" class="sgs-cart__panel-close" data-sgs-nav-close aria-label="%1$s">%2$s</button>',
		esc_attr__( 'Close cart', 'sgs-blocks' ),
		sgs_get_lucide_icon( 'x' ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted Lucide SVG.
	);
}

/**
 * Wrap the panel body in the element the display mode's ARIA pattern requires.
 *
 * `flyout`  → DISCLOSURE: a `hidden` div the trigger toggles via
 *             `aria-expanded`/`aria-controls`. Tab is never trapped.
 * `drawer`  → DIALOG: a native `<dialog>` carrying `data-sgs-nav-drawer`, so
 *             the SHARED `store('sgs/nav')` opens it with the same
 *             `showModal()` / body-reparent / scroll-lock / focus-trap
 *             / ESC behaviour `sgs/nav-drawer` already proves. No second
 *             open/close utility exists (R-31-9).
 * anything else (i.e. `link`) → no panel at all.
 *
 * @param string $mode      Effective display mode — link, flyout or drawer.
 * @param string $body_html Output of sgs_cart_panel_body_html().
 * @param array  $args {
 *     Resolved DOM ids.
 *
 *     @type string $panel_id  Panel DOM id (labels the heading in both modes).
 *     @type string $drawer_id Dialog DOM id — the drawer trigger's aria-controls.
 *     @type string $uid       Block instance's scoped-styling class (drawer only —
 *                             Wave 3C U-2's scrim `open` selector is scoped to it,
 *                             `.{uid}.sgs-cart__panel--drawer[open]`).
 * }
 * @return string Escaped wrapper markup, or '' when the mode has no panel.
 */
function sgs_cart_panel_wrapper_html( string $mode, string $body_html, array $args ): string {
	// The uid class scopes every per-instance panel rule to THIS panel
	// (`.{uid}.sgs-cart__panel`): the shared nav store re-parents the drawer
	// dialog to <body> on open, so a rule scoped to the block wrapper would stop
	// matching the moment the drawer opens. It also scopes the U-2 scrim's
	// `open` selector (`.{uid}.sgs-cart__panel--drawer[open]`).
	$uid_class = isset( $args['uid'] ) ? sanitize_html_class( (string) $args['uid'] ) : '';
	$uid_attr  = '' !== $uid_class ? ' ' . esc_attr( $uid_class ) : '';

	if ( 'flyout' === $mode ) {
		return sprintf(
			'<div id="%1$s" class="sgs-cart__panel sgs-cart__panel--flyout%3$s" hidden data-sgs-cart-panel data-sgs-cart-mode="flyout" aria-labelledby="%1$s-heading">%2$s</div>',
			esc_attr( $args['panel_id'] ),
			$body_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from esc_* calls in sgs_cart_panel_body_html().
			$uid_attr // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr above.
		);
	}

	if ( 'drawer' === $mode ) {
		return sprintf(
			'<dialog id="%1$s" class="sgs-cart__panel sgs-cart__panel--drawer%2$s" data-sgs-nav-drawer data-sgs-cart-panel data-sgs-cart-mode="drawer" aria-labelledby="%3$s-heading">%4$s</dialog>',
			esc_attr( $args['drawer_id'] ),
			$uid_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr above.
			esc_attr( $args['panel_id'] ),
			$body_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from esc_* calls in sgs_cart_panel_body_html().
		);
	}

	return '';
}

/**
 * Scoped CSS for the mini-cart panel's own settings (typography, colours,
 * per-device lengths, padding boxes, shadow, motion), for flyout and drawer.
 *
 * Every selector is `.{uid}.sgs-cart__panel …` — the panel element itself carries
 * the uid class (see sgs_cart_panel_wrapper_html()), so these rules keep matching
 * after the nav store re-parents the drawer dialog to <body>. Defaults live in
 * style.css inside :where(), so an attribute here always wins.
 *
 * @param array  $attributes Block attributes.
 * @param string $uid        The block instance's scoped-styling class.
 * @param bool   $is_drawer  Whether the effective display mode is the drawer.
 * @return string[] CSS rule strings (no <style> wrapper).
 */
function sgs_cart_panel_css( array $attributes, string $uid, bool $is_drawer ): array {
	$p   = '.' . $uid . '.sgs-cart__panel';
	$css = array();

	$colour = static function ( string $key ) use ( $attributes ): string {
		$value = isset( $attributes[ $key ] ) ? trim( (string) $attributes[ $key ] ) : '';
		return '' === $value ? '' : sgs_colour_value( $value );
	};
	$tier   = static function ( string $sel, string $key, array $props, bool $box = false ) use ( $attributes ): string {
		if ( ! is_array( $attributes[ $key ] ?? null ) || array() === $attributes[ $key ] ) {
			return '';
		}
		$specs = array();
		foreach ( $props as $prop ) {
			$specs[] = array(
				'value'        => $attributes[ $key ],
				'css'          => $prop,
				'box'          => $box,
				'unit_default' => 'px',
			);
		}
		return sgs_emit_responsive_css( $sel, $specs );
	};

	// Typography — one prefix per text element, through the shared helper.
	$typography = array(
		'panelTitle'       => '.sgs-cart__panel-heading',
		'panelCount'       => '.sgs-cart__panel-count',
		'panelEmpty'       => '.sgs-cart__panel-empty',
		'emptyMessage'     => '.sgs-cart__panel-empty-message',
		'emptyCta'         => '.sgs-cart__panel-empty-cta',
		'itemBrand'        => '.sgs-cart__item-brand',
		'itemName'         => '.sgs-cart__item-name',
		'itemDetail'       => '.sgs-cart__item-details',
		'itemPrice'        => '.sgs-cart__item-price',
		'itemAction'       => '.sgs-cart__item-action',
		'subtotal'         => '.sgs-cart__panel-subtotal',
		'freeDeliveryText' => '.sgs-cart__free-delivery-text',
		'checkout'         => '.sgs-cart__panel-checkout',
		'panelNote'        => '.sgs-cart__panel-note',
	);
	foreach ( $typography as $prefix => $sel ) {
		$rule = sgs_typography_css_rule( $attributes, $prefix, $p . ' ' . $sel );
		if ( '' !== $rule ) {
			$css[] = $rule;
		}
	}

	// Single-property colour rules: attribute => [ selector, property ].
	$paints = array(
		'panelCountColour'       => array( '.sgs-cart__panel-count', 'color' ),
		'panelCloseColour'       => array( '.sgs-cart__panel-close', 'color' ),
		'panelFooterBg'          => array( '.sgs-cart__panel-footer', 'background-color' ),
		'panelHeadBorderColour'  => array( '.sgs-cart__panel-header', 'border-bottom-color' ),
		'panelFooterBorderColour' => array( '.sgs-cart__panel-footer', 'border-top-color' ),
		'panelEmptyColour'       => array( '.sgs-cart__panel-empty', 'color' ),
		'emptyMessageColour'     => array( '.sgs-cart__panel-empty-message', 'color' ),
		'emptyCtaBg'             => array( '.sgs-cart__panel-empty-cta', 'background-color' ),
		'emptyCtaColour'         => array( '.sgs-cart__panel-empty-cta', 'color' ),
		'itemThumbBg'            => array( '.sgs-cart__item-thumb', 'background-color' ),
		'itemBrandColour'        => array( '.sgs-cart__item-brand', 'color' ),
		'itemDetailColour'       => array( '.sgs-cart__item-details', 'color' ),
		'itemRemoveColour'       => array( '.sgs-cart__item-remove--text', 'color' ),
		'itemRemoveBorderColour' => array( '.sgs-cart__item-remove--text', 'border-bottom-color' ),
		'itemActionColour'       => array( '.sgs-cart__item-save-for-later', 'color' ),
		'itemActionBorderColour' => array( '.sgs-cart__item-save-for-later', 'border-bottom-color' ),
		'subtotalLabelColour'    => array( '.sgs-cart__panel-subtotal', 'color' ),
		'subtotalValueColour'    => array( '.sgs-cart__panel-subtotal-value', 'color' ),
		'freeDeliveryTextColour' => array( '.sgs-cart__free-delivery-text', 'color' ),
		'freeDeliveryFillColour' => array( '.sgs-cart__free-delivery-fill', 'background-color' ),
		'freeDeliveryTrackColour' => array( '.sgs-cart__free-delivery-track', 'background-color' ),
		'checkoutBg'             => array( '.sgs-cart__panel-checkout', 'background-color' ),
		'checkoutColour'         => array( '.sgs-cart__panel-checkout', 'color' ),
		'panelNoteColour'        => array( '.sgs-cart__panel-note', 'color' ),
	);
	foreach ( $paints as $key => $target ) {
		$value = $colour( $key );
		if ( '' !== $value ) {
			$css[] = $p . ' ' . $target[0] . '{' . $target[1] . ':' . $value . ';}';
		}
	}
	// A divider under each item row: the colour switches on the rule and its spacing.
	$divider = $colour( 'itemDividerColour' );
	if ( '' !== $divider ) {
		$css[] = $p . ' .sgs-cart__item{padding-bottom:12px;border-bottom:1px solid ' . $divider . ';}';
	}
	// Checkout hover and keyboard focus (touch-safe pair).
	$hover = array_filter(
		array(
			'' !== $colour( 'checkoutBgHover' ) ? 'background-color:' . $colour( 'checkoutBgHover' ) : '',
			'' !== $colour( 'checkoutColourHover' ) ? 'color:' . $colour( 'checkoutColourHover' ) : '',
		)
	);
	if ( $hover ) {
		$css[] = sgs_hover_state_rules( $p . ' .sgs-cart__panel-checkout', implode( ';', $hover ) );
	}

	// Per-device lengths (tier objects) and padding/margin boxes.
	$tiers = array(
		array( '', 'panelMaxWidth', array( 'max-width' ) ),
		array( ' .sgs-cart__panel-items', 'panelBodyGap', array( 'gap' ) ),
		array( ' .sgs-cart__panel-items', 'itemThumbSize', array( '--sgs-cart-item-thumb' ) ),
		array( ' .sgs-cart__item', 'itemGap', array( 'gap' ) ),
		array( ' .sgs-cart__panel-close svg', 'panelCloseSize', array( 'width', 'height' ) ),
		array( ' .sgs-cart__panel-empty-message', 'emptyMessageGap', array( 'margin-bottom' ) ),
		array( ' .sgs-cart__free-delivery-track', 'freeDeliveryTrackHeight', array( 'height' ) ),
		array( ' .sgs-cart__panel-checkout', 'checkoutMinHeight', array( 'min-height' ) ),
	);
	foreach ( $tiers as $row ) {
		$css[] = $tier( $p . $row[0], $row[1], $row[2] );
	}
	$boxes = array(
		array( ' .sgs-cart__panel-header', 'panelHeadPadding', 'padding' ),
		array( ' .sgs-cart__panel-items', 'panelBodyPadding', 'padding' ),
		array( ' .sgs-cart__panel-footer', 'panelFooterPadding', 'padding' ),
		array( ' .sgs-cart__panel-empty', 'panelEmptyPadding', 'padding' ),
		array( ' .sgs-cart__panel-empty-cta', 'emptyCtaPadding', 'padding' ),
		array( ' .sgs-cart__free-delivery-track', 'freeDeliveryBarMargin', 'margin' ),
	);
	foreach ( $boxes as $row ) {
		$css[] = $tier( $p . $row[0], $row[1], array( $row[2] ), true );
	}

	// Corner radii — plain CSS-length strings.
	$radii = array(
		'itemThumbRadius'         => '.sgs-cart__item-thumb',
		'emptyCtaRadius'          => '.sgs-cart__panel-empty-cta',
		'checkoutRadius'          => '.sgs-cart__panel-checkout,' . $p . ' .sgs-cart__panel-view',
		'freeDeliveryTrackRadius' => '.sgs-cart__free-delivery-track',
	);
	foreach ( $radii as $key => $sel ) {
		$radius = sgs_css_length_value( (string) ( $attributes[ $key ] ?? '' ) );
		if ( '' !== $radius ) {
			$css[] = $p . ' ' . $sel . '{border-radius:' . $radius . ';}';
		}
	}

	// Panel shadow (ShadowControl: shape + colour).
	$shadow = sgs_shadow_box_decls( (string) ( $attributes['panelShadow'] ?? '' ), (string) ( $attributes['panelShadowColour'] ?? '' ) );
	if ( $shadow ) {
		$css[] = $p . '{' . implode( ';', $shadow ) . ';}';
	}

	// Drawer slide-in motion (duration and easing only; the keyframes are in style.css).
	if ( $is_drawer ) {
		$motion = array();
		if ( is_numeric( $attributes['panelSlideDuration'] ?? null ) && (float) $attributes['panelSlideDuration'] > 0 ) {
			$motion[] = 'animation-duration:' . sgs_motion_ms( $attributes['panelSlideDuration'], 250 ) . 'ms';
		}
		if ( '' !== (string) ( $attributes['panelSlideEasing'] ?? '' ) ) {
			$motion[] = 'animation-timing-function:' . sgs_motion_easing_css( (string) $attributes['panelSlideEasing'], (string) ( $attributes['panelSlideEasingCustom'] ?? '' ), 'ease-out' );
		}
		if ( $motion ) {
			$css[] = $p . '[open]{' . implode( ';', $motion ) . ';}';
		}
	}

	return array_values( array_filter( $css ) );
}
