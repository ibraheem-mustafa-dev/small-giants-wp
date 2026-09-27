<?php
/**
 * The look of the shop's toolbar and filter controls (Customizer > Shop Filters),
 * second set: the sort menu's text size, the Filter button's look and place, the
 * text of checkbox-list filters (a brand list), the chosen-filter chips and
 * whether they name their group ("Shape: Pilot" or "Pilot"), and the price
 * slider's look. Emitted as custom properties, body classes and one setting for
 * sgs-shop-filters-extras.js, which assets/css/woocommerce.css reads, so no
 * element carries an inline style.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * The choice controls: setting => [ label, [ value => label ], default ].
 *
 * @return array<string,array{0:string,1:array<string,string>,2:string}>
 */
function shop_controls_look_choices(): array {
	return array(
		'sgs_shop_toggle_look'  => array(
			__( 'Filter button look (below the drawer breakpoint)', 'sgs-theme' ),
			array(
				'filled'   => __( 'Filled, with an icon', 'sgs-theme' ),
				'outlined' => __( 'Outlined text in capitals ("FILTER")', 'sgs-theme' ),
			),
			'filled',
		),
		'sgs_shop_toggle_place' => array(
			__( 'Filter button place (below the drawer breakpoint)', 'sgs-theme' ),
			array(
				'row'     => __( 'Its own row above the products', 'sgs-theme' ),
				'toolbar' => __( 'In the toolbar, before the sort menu', 'sgs-theme' ),
			),
			'row',
		),
		'sgs_shop_active_look'  => array(
			__( 'Chosen filters look', 'sgs-theme' ),
			array(
				'theme' => __( 'Outlined chips and a Clear button', 'sgs-theme' ),
				'pills' => __( 'Filled pills', 'sgs-theme' ),
			),
			'theme',
		),
		'sgs_shop_price_look'   => array(
			__( 'Price slider look', 'sgs-theme' ),
			array(
				'theme' => __( 'Thick track with large handles', 'sgs-theme' ),
				'thin'  => __( 'Thin track with small round handles', 'sgs-theme' ),
			),
			'theme',
		),
	);
}

/**
 * The number controls: setting => label.
 *
 * @return array<string,string>
 */
function shop_controls_look_numbers(): array {
	return array(
		'sgs_shop_sort_size'          => __( 'Sort menu text size (px, blank for 15)', 'sgs-theme' ),
		'sgs_shop_filter_list_size'   => __( 'Text size of checkbox-list filters, e.g. brands (px, blank for the theme\'s small size)', 'sgs-theme' ),
		'sgs_shop_filter_list_row'    => __( 'Space above and below each checkbox-list option (px, blank for 2)', 'sgs-theme' ),
		'sgs_shop_filter_list_weight' => __( 'Weight of checkbox-list option text (100 to 900, blank for 400)', 'sgs-theme' ),
	);
}

/**
 * Register the controls in the existing Shop Filters section.
 *
 * @param \WP_Customize_Manager $wp_customize Customizer manager.
 * @return void
 */
function register_shop_controls_look_settings( \WP_Customize_Manager $wp_customize ): void {
	foreach ( shop_controls_look_numbers() as $id => $label ) {
		$wp_customize->add_setting(
			$id,
			array(
				'default'           => '',
				'sanitize_callback' => __NAMESPACE__ . '\sanitize_shop_controls_look_number',
			)
		);
		$wp_customize->add_control(
			$id,
			array(
				'section' => 'sgs_shop_filters',
				'type'    => 'number',
				'label'   => $label,
			)
		);
	}
	foreach ( shop_controls_look_choices() as $id => $spec ) {
		$wp_customize->add_setting(
			$id,
			array(
				'default'           => $spec[2],
				'sanitize_callback' => __NAMESPACE__ . '\sanitize_shop_controls_look_choice',
			)
		);
		$wp_customize->add_control(
			$id,
			array(
				'section' => 'sgs_shop_filters',
				'type'    => 'select',
				'label'   => $spec[0],
				'choices' => $spec[1],
			)
		);
	}
	$wp_customize->add_setting(
		'sgs_shop_active_prefix',
		array(
			'default'           => true,
			'sanitize_callback' => 'wp_validate_boolean',
		)
	);
	$wp_customize->add_control(
		'sgs_shop_active_prefix',
		array(
			'section' => 'sgs_shop_filters',
			'type'    => 'checkbox',
			'label'   => __( 'Chosen filters name their group ("Shape: Pilot"; off shows "Pilot")', 'sgs-theme' ),
		)
	);
}
add_action( 'customize_register', __NAMESPACE__ . '\register_shop_controls_look_settings', 22 );

/**
 * A number to one decimal place up to 900 (13.5px, a 500 weight), or blank.
 *
 * @param mixed $value Raw value.
 * @return string
 */
function sanitize_shop_controls_look_number( $value ): string {
	return '' === trim( (string) $value ) ? '' : (string) min( 900, round( abs( (float) $value ), 1 ) );
}

/**
 * A choice value from any of the choice controls, or '' (the control's default applies).
 *
 * @param mixed                 $value   Raw value.
 * @param \WP_Customize_Setting $setting The setting being saved.
 * @return string
 */
function sanitize_shop_controls_look_choice( $value, $setting ): string {
	$spec = shop_controls_look_choices()[ $setting->id ] ?? null;
	return $spec && isset( $spec[1][ $value ] ) ? (string) $value : ( $spec ? $spec[2] : '' );
}

/**
 * A choice setting's saved value, or its default.
 *
 * @param string $id Setting id.
 * @return string
 */
function shop_controls_look_value( string $id ): string {
	$spec  = shop_controls_look_choices()[ $id ];
	$value = (string) get_theme_mod( $id, $spec[2] );
	return isset( $spec[1][ $value ] ) ? $value : $spec[2];
}

/**
 * Sizes as custom properties on the shop's stylesheet.
 *
 * @return void
 */
function output_shop_controls_look_style(): void {
	if ( ! wp_style_is( 'sgs-woocommerce', 'enqueued' ) ) {
		return;
	}
	$vars  = array(
		'sgs_shop_sort_size'        => '--sgs-shop-sort-size',
		'sgs_shop_filter_list_size' => '--sgs-filter-list-size',
		'sgs_shop_filter_list_row'  => '--sgs-filter-list-row',
	);
	$decls = array();
	foreach ( $vars as $id => $prop ) {
		$raw = trim( (string) get_theme_mod( $id, '' ) );
		if ( '' !== $raw ) {
			$decls[] = $prop . ':' . min( 64, round( abs( (float) $raw ), 1 ) ) . 'px';
		}
	}
	$weight = absint( get_theme_mod( 'sgs_shop_filter_list_weight', '' ) );
	if ( $weight >= 100 && $weight <= 900 ) {
		$decls[] = '--sgs-filter-list-weight:' . ( intdiv( $weight, 100 ) * 100 );
	}
	if ( $decls ) {
		wp_add_inline_style( 'sgs-woocommerce', ':root{' . implode( ';', $decls ) . '}' );
	}
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\output_shop_controls_look_style', 20 );

/**
 * `sgs-shop-toggle-outlined`, `sgs-shop-active-pills` and `sgs-shop-price-thin` on <body>.
 *
 * @param string[] $classes Body classes.
 * @return string[]
 */
function add_shop_controls_look_body_class( array $classes ): array {
	$map = array(
		'sgs_shop_toggle_look' => array( 'outlined', 'sgs-shop-toggle-outlined' ),
		'sgs_shop_active_look' => array( 'pills', 'sgs-shop-active-pills' ),
		'sgs_shop_price_look'  => array( 'thin', 'sgs-shop-price-thin' ),
	);
	foreach ( $map as $id => $on ) {
		$value = shop_controls_look_value( $id );
		if ( $value === $on[0] ) {
			$classes[] = $on[1];
		}
	}
	return $classes;
}
add_filter( 'body_class', __NAMESPACE__ . '\add_shop_controls_look_body_class' );

/**
 * The Filter button's place, read by sgs-shop-filters-extras.js.
 *
 * @return void
 */
function localise_shop_toggle_place(): void {
	if ( ! wp_script_is( 'sgs-shop-filters-extras', 'enqueued' ) ) {
		return;
	}
	wp_add_inline_script(
		'sgs-shop-filters-extras',
		'window.sgsShopFilters = Object.assign( window.sgsShopFilters || {}, ' . wp_json_encode( array( 'togglePlace' => shop_controls_look_value( 'sgs_shop_toggle_place' ) ) ) . ' );',
		'before'
	);
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\localise_shop_toggle_place', 22 );

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
