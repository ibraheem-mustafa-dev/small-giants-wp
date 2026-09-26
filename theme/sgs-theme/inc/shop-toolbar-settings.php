<?php
/**
 * Shop toolbar and filter-panel settings (Customizer > Shop Filters):
 * the result count's wording, the sort menu's options and labels, the
 * searchable filter lists' placeholder, where the one-switch filter sits and
 * what it reads, and the colour swatches' stylesheet.
 *
 * Kept apart from inc/shop-filters-settings.php, which is near its size cap.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * Register the controls in the existing Shop Filters section.
 *
 * @param \WP_Customize_Manager $wp_customize Customizer manager.
 * @return void
 */
function register_shop_toolbar_customizer_settings( \WP_Customize_Manager $wp_customize ): void {
	$fields = array(
		'sgs_shop_count_label'             => array(
			'type'     => 'text',
			/* translators: %d is shown as typed: it marks where the setting puts the number. */
			'label'    => __( 'Result count wording, with %d where the number goes (blank keeps WooCommerce\'s wording)', 'sgs-theme' ),
			'sanitize' => 'sanitize_text_field',
		),
		'sgs_shop_count_label_single'      => array(
			'type'     => 'text',
			/* translators: %d is shown as typed: it marks where the setting puts the number. */
			'label'    => __( 'Result count wording for one result, with %d where the number goes', 'sgs-theme' ),
			'sanitize' => 'sanitize_text_field',
		),
		'sgs_shop_sort_menu'               => array(
			'type'     => 'textarea',
			'label'    => __( 'Sort menu: one "option|Label" per line, in order (options: menu_order, popularity, rating, date, price, price-desc, sgs_biggest_saving, sgs_brand_az). Blank keeps WooCommerce\'s menu.', 'sgs-theme' ),
			'sanitize' => 'sanitize_textarea_field',
		),
		'sgs_shop_filters_width'           => array(
			'type'     => 'number',
			'label'    => __( 'Filter column width on desktop (px, blank for 260)', 'sgs-theme' ),
			'sanitize' => __NAMESPACE__ . '\sanitize_shop_px',
		),
		'sgs_shop_layout_gap'              => array(
			'type'     => 'number',
			'label'    => __( 'Gap between the filter column and the products (px, blank for the theme spacing)', 'sgs-theme' ),
			'sanitize' => __NAMESPACE__ . '\sanitize_shop_px',
		),
		'sgs_shop_filter_search_label'     => array(
			'type'     => 'text',
			'label'    => __( 'Placeholder of a searchable filter list (a group heading with the class sgs-filter-search), e.g. "Search brands"', 'sgs-theme' ),
			'sanitize' => 'sanitize_text_field',
		),
		'sgs_shop_filter_boolean_source'   => array(
			'type'     => 'select',
			'label'    => __( 'The toggle reads', 'sgs-theme' ),
			'choices'  => array(
				'attribute' => __( 'A product attribute (slug above)', 'sgs-theme' ),
				'tag'       => __( 'A product tag (the term slug above)', 'sgs-theme' ),
			),
			'default'  => 'attribute',
			'sanitize' => __NAMESPACE__ . '\sanitize_shop_boolean_source',
		),
		'sgs_shop_filter_boolean_position' => array(
			'type'     => 'select',
			'label'    => __( 'Toggle position in the filter panel', 'sgs-theme' ),
			'choices'  => array(
				'top'    => __( 'Top', 'sgs-theme' ),
				'bottom' => __( 'Bottom', 'sgs-theme' ),
			),
			'default'  => 'top',
			'sanitize' => __NAMESPACE__ . '\sanitize_shop_boolean_position',
		),
	);
	foreach ( $fields as $id => $field ) {
		$wp_customize->add_setting(
			$id,
			array(
				'default'           => $field['default'] ?? '',
				'sanitize_callback' => $field['sanitize'],
			)
		);
		$wp_customize->add_control(
			$id,
			array(
				'section' => 'sgs_shop_filters',
				'type'    => $field['type'],
				'label'   => $field['label'],
				'choices' => $field['choices'] ?? array(),
			)
		);
	}
}
add_action( 'customize_register', __NAMESPACE__ . '\register_shop_toolbar_customizer_settings', 20 );

/**
 * Sanitise a pixel setting: a whole number from 0 to 600, or blank.
 *
 * @param mixed $value Raw value.
 * @return string
 */
function sanitize_shop_px( $value ): string {
	return '' === trim( (string) $value ) ? '' : (string) min( 600, absint( $value ) );
}

/**
 * The filter column's width and gap as custom properties woocommerce.css reads.
 *
 * @return void
 */
function output_shop_layout_style(): void {
	if ( ! wp_style_is( 'sgs-woocommerce', 'enqueued' ) ) {
		return;
	}
	$css = '';
	foreach ( array(
		'sgs_shop_filters_width' => '--sgs-shop-filters-width-setting',
		'sgs_shop_layout_gap'    => '--sgs-shop-layout-gap-setting',
	) as $mod => $property ) {
		$value = sanitize_shop_px( get_theme_mod( $mod, '' ) );
		if ( '' !== $value ) {
			$css .= $property . ':' . $value . 'px;';
		}
	}
	if ( '' !== $css ) {
		wp_add_inline_style( 'sgs-woocommerce', ':root{' . $css . '}' );
	}
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\output_shop_layout_style', 20 );

/**
 * Sanitise the toggle's source.
 *
 * @param mixed $value Raw value.
 * @return string 'attribute' or 'tag'.
 */
function sanitize_shop_boolean_source( $value ): string {
	return 'tag' === $value ? 'tag' : 'attribute';
}

/**
 * Sanitise the toggle's position.
 *
 * @param mixed $value Raw value.
 * @return string 'top' or 'bottom'.
 */
function sanitize_shop_boolean_position( $value ): string {
	return 'bottom' === $value ? 'bottom' : 'top';
}

/**
 * Rebuild the sort menu from `sgs_shop_sort_menu`: its lines set which of the
 * available options show, in what order, under what label. Runs after the
 * custom options are added (priority 10), so they can be listed too.
 *
 * @param array<string,string> $options Available orderby value => label.
 * @return array<string,string>
 */
function apply_shop_sort_menu( array $options ): array {
	$menu = trim( (string) get_theme_mod( 'sgs_shop_sort_menu', '' ) );
	if ( '' === $menu ) {
		return $options;
	}
	$out = array();
	foreach ( preg_split( '/\r\n|\r|\n/', $menu ) as $line ) {
		$parts = array_map( 'trim', explode( '|', $line, 2 ) );
		if ( 2 === count( $parts ) && isset( $options[ $parts[0] ] ) && '' !== $parts[1] ) {
			$out[ $parts[0] ] = $parts[1];
		}
	}
	return $out ? $out : $options;
}
add_filter( 'woocommerce_catalog_orderby', __NAMESPACE__ . '\apply_shop_sort_menu', 20 );
add_filter( 'woocommerce_default_catalog_orderby_options', __NAMESPACE__ . '\apply_shop_sort_menu', 20 );

/**
 * The result count in `sgs_shop_count_label`'s wording ("16 frames"). The
 * number is the loop's total, or the last number WooCommerce printed.
 *
 * @param string $html Rendered woocommerce/product-results-count block.
 * @return string
 */
function apply_shop_count_label( string $html ): string {
	$plural = trim( (string) get_theme_mod( 'sgs_shop_count_label', '' ) );
	if ( '' === $plural || false === strpos( $plural, '%d' ) ) {
		return $html;
	}
	$total = function_exists( 'wc_get_loop_prop' ) ? (int) wc_get_loop_prop( 'total' ) : 0;
	if ( $total <= 0 && preg_match_all( '/\d+/', wp_strip_all_tags( $html ), $m ) ) {
		$total = (int) end( $m[0] );
	}
	$single = trim( (string) get_theme_mod( 'sgs_shop_count_label_single', '' ) );
	$label  = sprintf( 1 === $total && false !== strpos( $single, '%d' ) ? $single : $plural, $total );
	$result = preg_replace( '#(<p\b[^>]*>).*?(</p>)#s', '${1}' . esc_html( $label ) . '${2}', $html, 1 );
	return is_string( $result ) ? $result : $html;
}
add_filter( 'render_block_woocommerce/product-results-count', __NAMESPACE__ . '\apply_shop_count_label' );

/**
 * One rule per attribute term with a swatch colour (`_sgs_swatch_color`,
 * edited on the attribute term screen), giving its filter chip the colour a
 * swatch group (heading class sgs-filter-swatches) paints with. A stylesheet, so no
 * element carries an inline style.
 *
 * @return void
 */
function add_shop_swatch_styles(): void {
	if ( ! wp_style_is( 'sgs-woocommerce', 'enqueued' ) || ! function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
		return;
	}
	$rules = array();
	foreach ( wc_get_attribute_taxonomy_names() as $taxonomy ) {
		$terms = get_terms(
			array(
				'taxonomy'   => $taxonomy,
				'hide_empty' => false,
				'meta_key'   => '_sgs_swatch_color', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- a handful of attribute terms.
			)
		);
		if ( is_wp_error( $terms ) ) {
			continue;
		}
		$attribute = substr( $taxonomy, 3 );
		foreach ( $terms as $term ) {
			$hex = sanitize_hex_color( (string) get_term_meta( $term->term_id, '_sgs_swatch_color', true ) );
			if ( $hex ) {
				$id      = 'attribute/' . $attribute . '-' . $term->slug;
				$rules[] = '#sgs-shop-filters [id="' . esc_attr( $id ) . '"]{--sgs-swatch:' . $hex . '}';
			}
		}
	}
	if ( $rules ) {
		wp_add_inline_style( 'sgs-woocommerce', implode( '', $rules ) );
	}
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\add_shop_swatch_styles', 20 );

/**
 * Load the per-group looks (sgs-shop-filters-groups.js) wherever the filter
 * drawer loads, with the search placeholder merged into its settings object.
 *
 * @return void
 */
function enqueue_shop_filter_groups(): void {
	if ( ! wp_script_is( 'sgs-shop-filters', 'enqueued' ) ) {
		return;
	}
	wp_enqueue_script(
		'sgs-shop-filters-groups',
		get_theme_file_uri( 'assets/js/sgs-shop-filters-groups.js' ),
		array( 'sgs-shop-filters' ),
		asset_version( 'assets/js/sgs-shop-filters-groups.js', wp_get_theme()->get( 'Version' ) ),
		true
	);
	$extra = array(
		'searchLabel'       => (string) get_theme_mod( 'sgs_shop_filter_search_label', '' ),
		'segmentedAllLabel' => __( 'All', 'sgs-theme' ),
	);
	wp_add_inline_script(
		'sgs-shop-filters-groups',
		'window.sgsShopFilters = Object.assign( window.sgsShopFilters || {}, ' . wp_json_encode( $extra ) . ' );',
		'before'
	);
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_shop_filter_groups', 21 );
