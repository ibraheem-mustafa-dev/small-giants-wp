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
 *            own default navigation. This mirrors the proven `sgs/nav-menu` burger.
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
	// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $inner_html is built from esc_attr + trusted Lucide SVG by the caller; wp_interactivity_data_wp_context() self-escapes and its fallback esc_attr()s the JSON.
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
		$context_attr = function_exists( 'wp_interactivity_data_wp_context' )
			? wp_interactivity_data_wp_context( $context )
			: sprintf( "data-wp-context='%s'", esc_attr( wp_json_encode( $context ) ) );

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
 * }
 * @return string Escaped panel-body markup.
 */
function sgs_cart_panel_body_html( array $args ): string {
	return sprintf(
		'<div class="sgs-cart__panel-inner">' .
			'<div class="sgs-cart__panel-header"><h2 class="sgs-cart__panel-heading" id="%1$s-heading">%2$s</h2></div>' .
			'<div class="sgs-cart__panel-status" role="status" aria-live="polite" aria-atomic="true" data-sgs-cart-status></div>' .
			'<div class="sgs-cart__panel-items" data-sgs-cart-items aria-busy="true" data-empty-message="%3$s" data-empty-cta-label="%4$s" data-shop-url="%5$s"><p class="sgs-cart__panel-loading">%6$s</p></div>' .
			'<div class="sgs-cart__panel-footer" data-sgs-cart-footer hidden>' .
				'<div class="sgs-cart__panel-subtotal"><span class="sgs-cart__panel-subtotal-label">%7$s</span><span class="sgs-cart__panel-subtotal-value" data-sgs-cart-subtotal></span></div>' .
				'<p class="sgs-cart__panel-tax-note" data-sgs-cart-tax-note>%8$s</p>' .
				'<div class="sgs-cart__panel-actions">' .
					'<a class="sgs-cart__panel-view" href="%9$s">%10$s</a>' .
					'<a class="sgs-cart__panel-checkout" href="%11$s">%12$s</a>' .
				'</div>' .
			'</div>' .
		'</div>',
		esc_attr( $args['panel_id'] ),
		esc_html( $args['panel_heading'] ),
		esc_attr( $args['empty_cart_message'] ),
		esc_attr( $args['empty_cart_cta'] ),
		esc_url( $args['shop_url'] ),
		esc_html__( 'Loading your cart…', 'sgs-blocks' ),
		esc_html__( 'Subtotal', 'sgs-blocks' ),
		esc_html__( 'Shipping and taxes calculated at checkout.', 'sgs-blocks' ),
		esc_url( $args['cart_url'] ),
		esc_html( $args['view_cart_label'] ),
		esc_url( $args['checkout_url'] ),
		esc_html( $args['checkout_label'] )
	);
}

/**
 * Wrap the panel body in the element the display mode's ARIA pattern requires.
 *
 * `flyout`  → DISCLOSURE: a `hidden` div the trigger toggles via
 *             `aria-expanded`/`aria-controls`. Tab is never trapped.
 * `drawer`  → DIALOG: a native `<dialog>` carrying `data-sgs-nav-drawer`, so
 *             the SHARED `store('sgs/nav')` opens it with the same
 *             `showModal()` / body-reparent (D323) / scroll-lock / focus-trap
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
 * }
 * @return string Escaped wrapper markup, or '' when the mode has no panel.
 */
function sgs_cart_panel_wrapper_html( string $mode, string $body_html, array $args ): string {
	if ( 'flyout' === $mode ) {
		return sprintf(
			'<div id="%1$s" class="sgs-cart__panel sgs-cart__panel--flyout" hidden data-sgs-cart-panel data-sgs-cart-mode="flyout" aria-labelledby="%1$s-heading">%2$s</div>',
			esc_attr( $args['panel_id'] ),
			$body_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from esc_* calls in sgs_cart_panel_body_html().
		);
	}

	if ( 'drawer' === $mode ) {
		return sprintf(
			'<dialog id="%1$s" class="sgs-cart__panel sgs-cart__panel--drawer" data-sgs-nav-drawer data-sgs-cart-panel data-sgs-cart-mode="drawer" aria-labelledby="%2$s-heading"><button type="button" class="sgs-cart__panel-close" data-sgs-nav-close aria-label="%3$s">%4$s</button>%5$s</dialog>',
			esc_attr( $args['drawer_id'] ),
			esc_attr( $args['panel_id'] ),
			esc_attr__( 'Close cart', 'sgs-blocks' ),
			sgs_get_lucide_icon( 'x' ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted Lucide SVG.
			$body_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from esc_* calls in sgs_cart_panel_body_html().
		);
	}

	return '';
}
