<?php
/**
 * Chosen filters on the shop (Customizer > Shop Filters): the settings the
 * drawer's scripts read (the Filter button's place, whether it counts the chosen
 * filters as "FILTER (1)", and where the chosen filters sit), the script that
 * shows them in a row under the title (assets/js/sgs-shop-filters-chosen.js),
 * and the switch that drops a chosen filter's group name ("Shape: Pilot" to
 * "Pilot"). The row's look comes from shop-controls-look-settings.php.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * The "count chosen filters on the Filter button" control.
 *
 * @param \WP_Customize_Manager $wp_customize Customizer manager.
 * @return void
 */
function register_shop_chosen_filter_settings( \WP_Customize_Manager $wp_customize ): void {
	$wp_customize->add_setting(
		'sgs_shop_toggle_count',
		array(
			'default'           => true,
			'sanitize_callback' => 'wp_validate_boolean',
		)
	);
	$wp_customize->add_control(
		'sgs_shop_toggle_count',
		array(
			'section' => 'sgs_shop_filters',
			'type'    => 'checkbox',
			'label'   => __( 'The Filter button counts the chosen filters ("FILTER (1)")', 'sgs-theme' ),
		)
	);
}
add_action( 'customize_register', __NAMESPACE__ . '\register_shop_chosen_filter_settings', 23 );

/**
 * The drawer scripts' chosen-filter settings, and the script for the row under the title.
 *
 * @return void
 */
function enqueue_shop_chosen_filters(): void {
	if ( ! wp_script_is( 'sgs-shop-filters-extras', 'enqueued' ) ) {
		return;
	}
	$settings = array(
		'togglePlace' => shop_controls_look_value( 'sgs_shop_toggle_place' ),
		'toggleCount' => wp_validate_boolean( get_theme_mod( 'sgs_shop_toggle_count', true ) ),
		'activePlace' => shop_controls_look_value( 'sgs_shop_active_place' ),
		'clearAll'    => __( 'Clear all', 'sgs-theme' ),
		'chosenLabel' => __( 'Chosen filters', 'sgs-theme' ),
	);
	wp_add_inline_script(
		'sgs-shop-filters-extras',
		'window.sgsShopFilters = Object.assign( window.sgsShopFilters || {}, ' . wp_json_encode( $settings ) . ' );',
		'before'
	);
	wp_enqueue_script(
		'sgs-shop-filters-chosen',
		get_theme_file_uri( 'assets/js/sgs-shop-filters-chosen.js' ),
		array( 'sgs-shop-filters-extras' ),
		asset_version( 'assets/js/sgs-shop-filters-chosen.js', wp_get_theme()->get( 'Version' ) ),
		true
	);
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_shop_chosen_filters', 22 );

/**
 * With the group prefix off, a chosen filter reads "Pilot": the server's list of
 * chosen filters and each filter block's label template ("Shape: {{label}}",
 * used for choices made on the page) both lose the "<group>: " part. Price and
 * other built-in filters keep their wording.
 *
 * @param array<int,array<string,mixed>> $items Chosen filters.
 * @return array<int,array<string,mixed>>
 */
function strip_shop_active_filter_prefix( $items ) {
	if ( ! is_array( $items ) || wp_validate_boolean( get_theme_mod( 'sgs_shop_active_prefix', true ) ) ) {
		return $items;
	}
	foreach ( $items as $i => $item ) {
		if ( isset( $item['type'], $item['activeLabel'] ) && preg_match( '#^(attribute|taxonomy)/#', (string) $item['type'] ) ) {
			$items[ $i ]['activeLabel'] = preg_replace( '/^[^:]+:\s*/', '', (string) $item['activeLabel'] );
		}
	}
	return $items;
}
add_filter( 'woocommerce_blocks_product_filters_selected_items', __NAMESPACE__ . '\strip_shop_active_filter_prefix', 20 );

/**
 * The label template on an attribute or taxonomy filter block, without the group.
 *
 * @param string $html Rendered filter block.
 * @return string
 */
function strip_shop_filter_label_template( $html ) {
	if ( ! is_string( $html ) || wp_validate_boolean( get_theme_mod( 'sgs_shop_active_prefix', true ) ) ) {
		return $html;
	}
	$tags = new \WP_HTML_Tag_Processor( $html );
	if ( ! $tags->next_tag() ) {
		return $html;
	}
	$context = json_decode( (string) $tags->get_attribute( 'data-wp-context' ), true );
	if ( ! is_array( $context ) || empty( $context['activeLabelTemplate'] ) ) {
		return $html;
	}
	$context['activeLabelTemplate'] = '{{label}}';
	$tags->set_attribute( 'data-wp-context', (string) wp_json_encode( $context ) );
	return $tags->get_updated_html();
}
add_filter( 'render_block_woocommerce/product-filter-attribute', __NAMESPACE__ . '\strip_shop_filter_label_template' );
add_filter( 'render_block_woocommerce/product-filter-taxonomy', __NAMESPACE__ . '\strip_shop_filter_label_template' );
