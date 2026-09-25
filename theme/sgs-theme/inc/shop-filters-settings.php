<?php
/**
 * SGS Shop Filters — Customizer settings + JS localisation.
 *
 * Generic, per-client configuration surface for the shop filter drawer
 * (assets/js/sgs-shop-filters.js + sgs-shop-filters-extras.js). No client
 * word, colour, price or copy is hardcoded — every value here is a neutral
 * default, and every new behaviour stays off until a client sets it.
 *
 * Required by functions.php next to the other inc/ files.
 *
 * Per-site shop-layout theme mods (registered in the sibling file
 * inc/shop-filters-layout-settings.php, required below). Each can be set
 * directly — via WP-CLI (`wp theme mod set <name> <value>`) or a mu-plugin —
 * without touching the Customizer UI, since the theme mod is the one source
 * both paths read: sgs_shop_card_min_width (string, '' or '120'-'480' px;
 * '' = 240px default), sgs_shop_col_gap (string, '' or '0'-'64' px; '' = 24px
 * default), sgs_shop_narrow_layout ('rows'|'grid', default 'rows'),
 * sgs_shop_filter_panel_style ('panel'|'plain', default 'panel').
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/shop-filters-layout-settings.php';

/**
 * Register the "Shop Filters" Customizer section + its controls.
 *
 * WordPress's own Customizer is the settings surface used here — the theme
 * has no existing shop-filter settings screen (Customizer/theme.json/block
 * attributes were all checked; nothing already governs this feature), and
 * the Customizer is the native, no-build-step surface for a site-wide,
 * non-block setting a non-technical client can reach from wp-admin.
 *
 * @param \WP_Customize_Manager $wp_customize Customizer manager instance.
 * @return void
 */
function register_shop_filter_customizer_settings( \WP_Customize_Manager $wp_customize ): void {
	$wp_customize->add_section(
		'sgs_shop_filters',
		array(
			'title'    => __( 'Shop Filters', 'sgs-theme' ),
			'priority' => 160,
		)
	);

	$fields = array(
		'sgs_shop_filter_boolean_enabled'   => array(
			'type'    => 'checkbox',
			'default' => false,
			'label'   => __( 'Enable boolean attribute toggle', 'sgs-theme' ),
		),
		'sgs_shop_filter_boolean_attribute' => array(
			'type'    => 'text',
			'default' => '',
			'label'   => __( 'Attribute slug (without "pa_"), e.g. "lens-type"', 'sgs-theme' ),
		),
		'sgs_shop_filter_boolean_term'      => array(
			'type'    => 'text',
			'default' => '',
			'label'   => __( 'Term slug that means "on", e.g. "polarised"', 'sgs-theme' ),
		),
		'sgs_shop_filter_boolean_label'     => array(
			'type'    => 'text',
			'default' => '',
			'label'   => __( 'Toggle label (leave blank to use the term name + "only")', 'sgs-theme' ),
		),
		'sgs_shop_filter_drawer_breakpoint' => array(
			'type'    => 'number',
			'default' => 782,
			'label'   => __( 'Drawer breakpoint (px) — filters become a mobile drawer below this width', 'sgs-theme' ),
		),
		'sgs_shop_result_count_enabled'     => array(
			'type'    => 'checkbox',
			'default' => false,
			'label'   => __( 'Show a live result count on the drawer\'s Apply button', 'sgs-theme' ),
		),
		'sgs_shop_result_count_label'       => array(
			'type'    => 'text',
			/* translators: %d: number of matching products. */
			'default' => __( 'Show %d results', 'sgs-theme' ),
			'label'   => __( 'Result count label (a number placeholder is inserted automatically)', 'sgs-theme' ),
		),
		'sgs_shop_columns_wide'             => array(
			'type'    => 'number',
			'default' => 4,
			'label'   => __( 'Product columns once the grid is wide (from 1280px container width)', 'sgs-theme' ),
		),
		'sgs_shop_sort_biggest_saving_enabled' => array(
			'type'    => 'checkbox',
			'default' => false,
			'label'   => __( 'Add a "Biggest saving" sort option (needs the RRP field below)', 'sgs-theme' ),
		),
		'sgs_shop_sort_rrp_meta_key'        => array(
			'type'    => 'text',
			'default' => '',
			'label'   => __( 'RRP custom field key used for "Biggest saving", e.g. "_rrp"', 'sgs-theme' ),
		),
		'sgs_shop_sort_brand_az_enabled'    => array(
			'type'    => 'checkbox',
			'default' => false,
			'label'   => __( 'Add a "Brand: A to Z" sort option (uses product brands)', 'sgs-theme' ),
		),
		'sgs_shop_hide_zero_decimals'       => array(
			'type'    => 'checkbox',
			'default' => false,
			'label'   => __( 'Hide ".00" on whole-pound prices (e.g. "£139.00" shows as "£139"; "£32.50" is unaffected)', 'sgs-theme' ),
		),
	);

	foreach ( $fields as $setting_id => $field ) {
		$wp_customize->add_setting(
			$setting_id,
			array(
				'default'           => $field['default'],
				'sanitize_callback' => 'checkbox' === $field['type']
					? __NAMESPACE__ . '\sanitize_shop_filter_checkbox'
					: ( 'number' === $field['type'] ? 'absint' : 'sanitize_text_field' ),
			)
		);
		$wp_customize->add_control(
			$setting_id,
			array(
				'section' => 'sgs_shop_filters',
				'type'    => $field['type'],
				'label'   => $field['label'],
			)
		);
	}
}
add_action( 'customize_register', __NAMESPACE__ . '\register_shop_filter_customizer_settings' );

/**
 * Sanitise a Customizer checkbox to a strict boolean.
 *
 * @param mixed $value Raw control value.
 * @return bool
 */
function sanitize_shop_filter_checkbox( $value ): bool {
	return (bool) $value;
}

/**
 * Resolve the boolean-filter toggle's config for JS, including looking up the
 * term's real display name so the default label reads naturally for any
 * client's attribute/term choice rather than showing a raw slug.
 *
 * @return array{attribute:string,term:string,label:string}|null
 */
function get_shop_filter_boolean_config(): ?array {
	if ( ! get_theme_mod( 'sgs_shop_filter_boolean_enabled', false ) ) {
		return null;
	}

	$attribute = sanitize_title( (string) get_theme_mod( 'sgs_shop_filter_boolean_attribute', '' ) );
	$term_slug = sanitize_title( (string) get_theme_mod( 'sgs_shop_filter_boolean_term', '' ) );

	if ( '' === $attribute || '' === $term_slug || ! function_exists( 'taxonomy_exists' ) ) {
		return null;
	}

	$taxonomy = 'pa_' . $attribute;
	if ( ! taxonomy_exists( $taxonomy ) ) {
		return null;
	}

	$term = get_term_by( 'slug', $term_slug, $taxonomy );
	if ( ! $term || is_wp_error( $term ) ) {
		return null;
	}

	$label = trim( (string) get_theme_mod( 'sgs_shop_filter_boolean_label', '' ) );
	if ( '' === $label ) {
		/* translators: %s: attribute term name, e.g. "Polarised". */
		$label = sprintf( __( '%s only', 'sgs-theme' ), $term->name );
	}

	return array(
		'attribute' => $attribute,
		'term'      => $term_slug,
		'label'     => $label,
	);
}

/**
 * Localise the shop filter drawer's JS-facing settings onto the already
 * enqueued `sgs-shop-filters` handle. Runs at a later priority than the
 * handle's own registration (functions.php::enqueue_styles, default
 * priority 10) so the handle exists by the time this fires; wp_localize_script
 * itself only requires the handle be registered/enqueued, not yet printed —
 * both scripts print in the footer, well after this runs.
 *
 * @return void
 */
function localise_shop_filter_settings(): void {
	if ( ! wp_script_is( 'sgs-shop-filters', 'enqueued' ) ) {
		return;
	}

	$breakpoint = absint( get_theme_mod( 'sgs_shop_filter_drawer_breakpoint', 782 ) );
	if ( $breakpoint < 1 ) {
		$breakpoint = 782;
	}

	$settings = array(
		'breakpoint'    => $breakpoint,
		'booleanFilter' => get_shop_filter_boolean_config(),
		'resultCount'   => null,
	);

	if (
		get_theme_mod( 'sgs_shop_result_count_enabled', false ) &&
		class_exists( 'WooCommerce' ) &&
		function_exists( 'rest_url' )
	) {
		/* translators: %d: number of matching products. */
		$default_label           = __( 'Show %d results', 'sgs-theme' );
		$settings['resultCount'] = array(
			'endpoint' => rest_url( 'wc/store/v1/products' ),
			'label'    => (string) get_theme_mod( 'sgs_shop_result_count_label', $default_label ),
		);
	}

	wp_localize_script( 'sgs-shop-filters', 'sgsShopFilters', $settings );

	// The extras module reads the same object; only enqueue it where the
	// drawer itself is enqueued, as its own dependent handle.
	wp_enqueue_script(
		'sgs-shop-filters-extras',
		get_theme_file_uri( 'assets/js/sgs-shop-filters-extras.js' ),
		array( 'sgs-shop-filters' ),
		asset_version( 'assets/js/sgs-shop-filters-extras.js', wp_get_theme()->get( 'Version' ) ),
		true
	);
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\localise_shop_filter_settings', 20 );

/**
 * Output the configurable wide-grid column count as a CSS custom property.
 *
 * Feeds the container-query rule in woocommerce.css
 * (`@container sgs-shop-grid (min-width: 1280px)`), which reads
 * `var(--sgs-shop-columns-wide, 4)` — so a site with no setting configured
 * renders the same default (4) the CSS already falls back to.
 *
 * @return void
 */
function output_shop_columns_wide_style(): void {
	if ( ! wp_style_is( 'sgs-woocommerce', 'enqueued' ) ) {
		return;
	}
	$columns = absint( get_theme_mod( 'sgs_shop_columns_wide', 4 ) );
	if ( $columns < 1 ) {
		$columns = 4;
	}
	wp_add_inline_style(
		'sgs-woocommerce',
		sprintf( ':root{--sgs-shop-columns-wide:%d;}', $columns )
	);
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\output_shop_columns_wide_style', 20 );

/**
 * Hook WooCommerce core's own trailing-zero trimmer when the setting is on.
 *
 * `wc_price()` already strips a decimal part that is all zeros (e.g. "139.00"
 * becomes "139") via `woocommerce_price_trim_zeros`; it leaves any non-zero
 * decimal untouched (e.g. "32.50" stays "32.50"). No custom regex is needed —
 * this only switches WooCommerce's existing behaviour on. It covers every
 * PHP-rendered price (shop archive, product cards, single product, mini cart
 * widget, cart, checkout and emails), all of which call `wc_price()`. It does
 * NOT cover the block-based Cart/Checkout or Mini Cart block, which format
 * prices in JavaScript from the Store API's `currency_minor_unit` and have no
 * equivalent trim hook (`packages/js/currency` always renders the currency's
 * fixed precision).
 *
 * @return void
 */
function maybe_hide_zero_price_decimals(): void {
	if ( ! class_exists( 'WooCommerce' ) ) {
		return;
	}
	add_filter( 'woocommerce_price_trim_zeros', __NAMESPACE__ . '\is_zero_price_decimals_hidden' );
}
add_action( 'init', __NAMESPACE__ . '\maybe_hide_zero_price_decimals' );

/**
 * Callback for `woocommerce_price_trim_zeros`.
 *
 * @return bool
 */
function is_zero_price_decimals_hidden(): bool {
	return (bool) get_theme_mod( 'sgs_shop_hide_zero_decimals', false );
}
