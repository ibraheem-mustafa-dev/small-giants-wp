<?php
/**
 * Shared default arrays and small sanitisers for sgs/account.
 *
 * Read by both the block's render.php (src/blocks/account/render.php) and the
 * dashboard template (includes/account/templates/dashboard.php), so the two
 * surfaces never drift on which endpoint gets which default icon/description.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_account_default_menu_icons' ) ) {
	/**
	 * Default Lucide icon name per WooCommerce My Account endpoint.
	 *
	 * @return array<string,string> endpoint => icon name.
	 */
	function sgs_account_default_menu_icons(): array {
		return array(
			'dashboard'       => 'layout-dashboard',
			'orders'          => 'package',
			'saved-items'     => 'heart',
			'downloads'       => 'download',
			'edit-address'    => 'map-pin',
			'payment-methods' => 'credit-card',
			'edit-account'    => 'user',
			'customer-logout' => 'log-out',
		);
	}
}

if ( ! function_exists( 'sgs_account_default_card_descriptions' ) ) {
	/**
	 * Default one-line description per endpoint, for the dashboard quick-card grid.
	 *
	 * @return array<string,string> endpoint => description.
	 */
	function sgs_account_default_card_descriptions(): array {
		return array(
			'orders'          => __( 'See and reorder past orders', 'sgs-blocks' ),
			'saved-items'     => __( 'Your saved products', 'sgs-blocks' ),
			'edit-address'    => __( 'Delivery and billing', 'sgs-blocks' ),
			'edit-account'    => __( 'Name, email and password', 'sgs-blocks' ),
			'downloads'       => __( 'Your downloads', 'sgs-blocks' ),
			'payment-methods' => __( 'Saved cards', 'sgs-blocks' ),
		);
	}
}

if ( ! function_exists( 'sgs_account_default_status_step_labels' ) ) {
	/**
	 * Default labels for the 4-step order-progress line.
	 *
	 * @return array{placed:string,processing:string,dispatched:string,delivered:string}
	 */
	function sgs_account_default_status_step_labels(): array {
		return array(
			'placed'     => __( 'Placed', 'sgs-blocks' ),
			'processing' => __( 'Processing', 'sgs-blocks' ),
			'dispatched' => __( 'Dispatched', 'sgs-blocks' ),
			'delivered'  => __( 'Delivered', 'sgs-blocks' ),
		);
	}
}

if ( ! function_exists( 'sgs_account_never_hide' ) ) {
	/**
	 * Endpoints the hiddenEndpoints control may never remove — a client can
	 * lock themselves out of their own account (dashboard) or lose the only
	 * way to log out.
	 *
	 * @return string[] Endpoint keys.
	 */
	function sgs_account_never_hide(): array {
		return array( 'dashboard', 'customer-logout' );
	}
}

if ( ! function_exists( 'sgs_account_sanitize_hidden_endpoints' ) ) {
	/**
	 * Sanitise the hiddenEndpoints attribute: allowlist of known-safe
	 * characters, plus the never-hide guard.
	 *
	 * @param mixed $raw Raw attribute value.
	 * @return string[] Sanitised endpoint slugs, never containing a
	 *                   never-hide entry.
	 */
	function sgs_account_sanitize_hidden_endpoints( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$never = sgs_account_never_hide();
		$clean = array();
		foreach ( $raw as $slug ) {
			$slug = sanitize_key( (string) $slug );
			if ( '' === $slug || in_array( $slug, $never, true ) ) {
				continue;
			}
			$clean[] = $slug;
		}
		return array_values( array_unique( $clean ) );
	}
}

if ( ! function_exists( 'sgs_account_map_order_status_to_step' ) ) {
	/**
	 * Map a WooCommerce order status to one of the 4 progress steps, or ''
	 * when the order sits outside the happy path (cancelled/refunded/failed —
	 * show the status chip only, no track, per the design's Step mapping).
	 *
	 * @param string $status Order status (no 'wc-' prefix, e.g. 'processing').
	 * @return string One of 'placed'|'processing'|'dispatched'|'delivered', or ''.
	 */
	function sgs_account_map_order_status_to_step( string $status ): string {
		switch ( $status ) {
			case 'pending':
			case 'on-hold':
				return 'placed';
			case 'processing':
				return 'processing';
			case 'shipped':
			case 'dispatched':
				return 'dispatched';
			case 'completed':
				return 'delivered';
			default:
				return '';
		}
	}
}

if ( ! function_exists( 'sgs_account_step_order' ) ) {
	/**
	 * The 4 steps in display order — index also doubles as "how far along".
	 *
	 * @return string[]
	 */
	function sgs_account_step_order(): array {
		return array( 'placed', 'processing', 'dispatched', 'delivered' );
	}
}
