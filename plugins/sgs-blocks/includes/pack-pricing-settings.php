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
 * Add the SGS Pack Pricing page to the WC settings stack.
 *
 * The filter is added unconditionally; ALL WC-dependent work happens inside
 * this callback. Two timing traps live here (both live-confirmed on the
 * canary 2026-06-09):
 *
 * 1. class-pack-pricing-settings-page.php declares `extends \WC_Settings_Page`
 *    at FILE scope — requiring it before WooCommerce loads fatals the whole
 *    site (sgs-blocks loads alphabetically before woocommerce), so the
 *    require_once must be lazy.
 * 2. WC_Settings_Page is an ADMIN-LAZY class — it does not exist yet at
 *    `woocommerce_loaded` time, so a class_exists() early-return there
 *    silently unregisters the tab. By the time WooCommerce applies the
 *    woocommerce_get_settings_pages filter it has already loaded
 *    WC_Settings_Page, which is why the require belongs HERE.
 *
 * @param array $pages Existing WC settings page objects.
 * @return array
 */
function sgs_pack_pricing_settings_add_page( array $pages ): array {
	if ( ! \class_exists( 'WC_Settings_Page' ) ) {
		return $pages;
	}
	require_once __DIR__ . '/class-pack-pricing-settings-page.php';
	if ( \class_exists( __NAMESPACE__ . '\\Pack_Pricing_Settings_Page' ) ) {
		$pages[] = new Pack_Pricing_Settings_Page();
	}
	return $pages;
}
\add_filter( 'woocommerce_get_settings_pages', __NAMESPACE__ . '\\sgs_pack_pricing_settings_add_page' );
