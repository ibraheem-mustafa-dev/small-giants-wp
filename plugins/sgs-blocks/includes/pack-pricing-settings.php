<?php
/**
 * SGS Smart Bulk Pricing — settings registration hooks (Spec 28 P3, FR-28-11).
 *
 * Hooks the Pack_Pricing_Settings_Page class into WooCommerce's settings stack
 * via the woocommerce_get_settings_pages filter.  The class itself lives in
 * class-pack-pricing-settings-page.php.
 *
 * @package   SGS\Blocks
 * @since     1.14.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md FR-28-6/11
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the SGS Pack Pricing WooCommerce settings page.
 *
 * Hooked on woocommerce_loaded so WC_Settings_Page is defined before we
 * extend it. The require_once MUST stay inside this function, after the
 * class_exists guard: class-pack-pricing-settings-page.php declares
 * `extends \WC_Settings_Page` at file scope, so loading it before
 * WooCommerce fatals the whole site (sgs-blocks loads alphabetically
 * before woocommerce — live-confirmed on the canary 2026-06-09).
 *
 * @return void
 */
function sgs_pack_pricing_settings_register(): void {
	if ( ! \class_exists( 'WC_Settings_Page' ) ) {
		return;
	}
	require_once __DIR__ . '/class-pack-pricing-settings-page.php';
	\add_filter( 'woocommerce_get_settings_pages', __NAMESPACE__ . '\\sgs_pack_pricing_settings_add_page' );
}
\add_action( 'woocommerce_loaded', __NAMESPACE__ . '\\sgs_pack_pricing_settings_register' );

/**
 * Add the Pack_Pricing_Settings_Page instance to the WC settings stack.
 *
 * @param array $pages Existing WC settings page objects.
 * @return array
 */
function sgs_pack_pricing_settings_add_page( array $pages ): array {
	$pages[] = new Pack_Pricing_Settings_Page();
	return $pages;
}
