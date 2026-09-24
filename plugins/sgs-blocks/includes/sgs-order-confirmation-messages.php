<?php
/**
 * SGS Order Confirmation Messages — hook registration + frontend render.
 *
 * Shows a different sentence on the order-confirmation ("thank you") page
 * depending on whether the order is being delivered or collected in person
 * (local pickup / click-and-collect), e.g. "We'll email you when it ships"
 * versus "We'll text you when it's ready to collect". Any client can use
 * this — the two messages are editable in WooCommerce → Settings and OFF
 * (blank) by default renders nothing extra, so existing sites are unchanged
 * until an owner fills them in.
 *
 * Hooks into WooCommerce's own blockified order-confirmation template via
 * the `render_block_{$block_name}` filter on `woocommerce/order-confirmation-
 * status` (see theme/sgs-theme/parts/sgs-order-confirmation-content.html) —
 * no template edit needed, and it degrades to a no-op if that WC block is
 * ever swapped out.
 *
 * The settings-page class (class-sgs-order-confirmation-messages.php)
 * extends \WC_Settings_Page at file scope, so it is required lazily — see
 * sgs_order_confirmation_messages_add_settings_page() below — exactly the
 * same timing pattern as pack-pricing-settings.php.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Suggested wording for the two messages, shown as field placeholders only.
 *
 * Neutral, translatable, no client-specific wording. The saved messages
 * start blank; an owner types their own in WooCommerce → Settings → SGS
 * Order Messages.
 *
 * @return array{delivery_message:string,collection_message:string}
 */
function sgs_get_order_confirmation_message_defaults(): array {
	return array(
		'delivery_message'   => \__( "We'll email you when your order ships.", 'sgs-blocks' ),
		'collection_message' => \__( "We'll text you when your order's ready to collect.", 'sgs-blocks' ),
	);
}

/**
 * The two messages as currently configured (saved values merged over defaults).
 *
 * @return array{delivery_message:string,collection_message:string}
 */
function sgs_get_order_confirmation_messages(): array {
	// Blank by default: the suggestions above are only shown as field
	// placeholders, so a site shows nothing extra until its owner types a message.
	$saved = (array) \get_option( 'sgs_order_confirmation_messages', array() );
	return \wp_parse_args(
		$saved,
		array(
			'delivery_message'   => '',
			'collection_message' => '',
		)
	);
}

/**
 * Resolve the order the current order-confirmation page belongs to.
 *
 * Mirrors WooCommerce's own order-received key check (the `key` query arg)
 * so this never discloses another customer's shipping method — a visitor
 * without the right key gets no order back, same as WC's own template.
 *
 * @return \WC_Order|null
 */
function sgs_get_current_confirmed_order(): ?\WC_Order {
	$order_id = \absint( \get_query_var( 'order-received' ) );
	if ( ! $order_id ) {
		return null;
	}

	$order = \wc_get_order( $order_id );
	if ( ! ( $order instanceof \WC_Order ) ) {
		return null;
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- read-only GET param, sanitised via wc_clean() on the next line; matches WooCommerce's own order-received key check, not a form submission.
	$order_key = isset( $_GET['key'] ) ? \wc_clean( \wp_unslash( $_GET['key'] ) ) : '';
	if ( '' === $order_key || ! \hash_equals( $order->get_order_key(), $order_key ) ) {
		return null;
	}

	return $order;
}

/**
 * Append the delivery/collection message after the WC order-confirmation
 * status block.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $unused_block  Parsed block data (unused; the render_block_{name} filter always passes it).
 * @return string
 */
function sgs_order_confirmation_append_message( string $block_content, array $unused_block ): string { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- required by the render_block_{$block_name} filter signature.
	if ( \is_admin() || ! \function_exists( 'is_order_received_page' ) || ! \is_order_received_page() ) {
		return $block_content;
	}

	$order = sgs_get_current_confirmed_order();
	if ( ! $order ) {
		return $block_content;
	}

	$is_pickup = $order->has_shipping_method( 'local_pickup' ) || $order->has_shipping_method( 'pickup_location' );
	$messages  = sgs_get_order_confirmation_messages();
	$message   = $is_pickup ? $messages['collection_message'] : $messages['delivery_message'];

	if ( '' === \trim( (string) $message ) ) {
		return $block_content;
	}

	return $block_content . \sprintf(
		'<p class="sgs-order-confirmation-message">%s</p>',
		\esc_html( $message )
	);
}

/**
 * Add the SGS Order Confirmation Messages page to the WC settings stack.
 *
 * Same two timing traps as pack-pricing-settings.php: the class file
 * declares `extends \WC_Settings_Page` at file scope (fatals if required
 * before WooCommerce loads), and WC_Settings_Page is admin-lazy so the
 * require must happen inside this filter callback, not at plugin-load time.
 *
 * @param array $pages Existing WC settings page objects.
 * @return array
 */
function sgs_order_confirmation_messages_add_settings_page( array $pages ): array {
	if ( ! \class_exists( 'WC_Settings_Page' ) ) {
		return $pages;
	}
	require_once __DIR__ . '/class-sgs-order-confirmation-messages.php';
	if ( \class_exists( __NAMESPACE__ . '\\Sgs_Order_Confirmation_Messages' ) ) {
		$pages[] = new Sgs_Order_Confirmation_Messages();
	}
	return $pages;
}

\add_filter( 'woocommerce_get_settings_pages', __NAMESPACE__ . '\\sgs_order_confirmation_messages_add_settings_page' );
\add_filter( 'render_block_woocommerce/order-confirmation-status', __NAMESPACE__ . '\\sgs_order_confirmation_append_message', 10, 2 );
