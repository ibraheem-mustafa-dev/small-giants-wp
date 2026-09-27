<?php
/**
 * The look of the shop's filter controls (Customizer > Shop Filters): the
 * option text size on chips and one-choice segments, how far a colour swatch
 * grows when pointed at, the gap between products on phones, and whether the
 * sort menu draws the theme's arrow or the browser's own. Emitted as custom
 * properties and a body class that assets/css/woocommerce.css reads, so no
 * element carries an inline style.
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
function register_shop_filter_look_settings( \WP_Customize_Manager $wp_customize ): void {
	$wp_customize->add_setting(
		'sgs_shop_filter_option_size',
		array(
			'default'           => '',
			'sanitize_callback' => __NAMESPACE__ . '\sanitize_shop_filter_look_number',
		)
	);
	$wp_customize->add_control(
		'sgs_shop_filter_option_size',
		array(
			'section' => 'sgs_shop_filters',
			'type'    => 'number',
			'label'   => __( 'Text size of filter chips and one-choice segments (px, blank for the theme\'s small size)', 'sgs-theme' ),
		)
	);

	$wp_customize->add_setting(
		'sgs_shop_filter_swatch_hover',
		array(
			'default'           => '',
			'sanitize_callback' => __NAMESPACE__ . '\sanitize_shop_filter_look_number',
		)
	);
	$wp_customize->add_control(
		'sgs_shop_filter_swatch_hover',
		array(
			'section' => 'sgs_shop_filters',
			'type'    => 'number',
			'label'   => __( 'How far a colour swatch grows when pointed at (%, e.g. 112; blank for 108)', 'sgs-theme' ),
		)
	);

	$wp_customize->add_setting(
		'sgs_shop_gap_phone',
		array(
			'default'           => '',
			'sanitize_callback' => __NAMESPACE__ . '\sanitize_shop_filter_look_number',
		)
	);
	$wp_customize->add_control(
		'sgs_shop_gap_phone',
		array(
			'section' => 'sgs_shop_filters',
			'type'    => 'number',
			'label'   => __( 'Gap between products on phones, both ways (px, blank for 16 across and the row gap down)', 'sgs-theme' ),
		)
	);

	$wp_customize->add_setting(
		'sgs_shop_sort_arrow',
		array(
			'default'           => 'theme',
			'sanitize_callback' => __NAMESPACE__ . '\sanitize_shop_sort_arrow',
		)
	);
	$wp_customize->add_control(
		'sgs_shop_sort_arrow',
		array(
			'section' => 'sgs_shop_filters',
			'type'    => 'select',
			'label'   => __( 'Sort menu arrow', 'sgs-theme' ),
			'choices' => array(
				'theme'   => __( 'The theme\'s arrow', 'sgs-theme' ),
				'browser' => __( 'The browser\'s own arrow', 'sgs-theme' ),
			),
		)
	);
}
add_action( 'customize_register', __NAMESPACE__ . '\register_shop_filter_look_settings', 21 );

/**
 * A whole number up to 400, or blank.
 *
 * @param mixed $value Raw value.
 * @return string
 */
function sanitize_shop_filter_look_number( $value ): string {
	return '' === trim( (string) $value ) ? '' : (string) min( 400, absint( $value ) );
}

/**
 * The sort menu arrow choice.
 *
 * @param mixed $value Raw value.
 * @return string
 */
function sanitize_shop_sort_arrow( $value ): string {
	return 'browser' === $value ? 'browser' : 'theme';
}

/**
 * The option text size, swatch growth and phone gap as custom properties.
 *
 * @return void
 */
function output_shop_filter_look_style(): void {
	if ( ! wp_style_is( 'sgs-woocommerce', 'enqueued' ) ) {
		return;
	}
	$decls  = array();
	$option = absint( get_theme_mod( 'sgs_shop_filter_option_size', '' ) );
	if ( $option > 0 ) {
		$decls[] = '--sgs-filter-option-size:' . $option . 'px';
	}
	$swatch = absint( get_theme_mod( 'sgs_shop_filter_swatch_hover', '' ) );
	if ( $swatch > 100 ) {
		$decls[] = '--sgs-swatch-hover-scale:' . number_format( $swatch / 100, 2 );
	}
	$css = $decls ? '#sgs-shop-filters{' . implode( ';', $decls ) . '}' : '';
	$gap = get_theme_mod( 'sgs_shop_gap_phone', '' );
	if ( '' !== trim( (string) $gap ) ) {
		$css .= ':root{--sgs-shop-gap-phone-setting:' . min( 64, absint( $gap ) ) . 'px}';
	}
	if ( '' !== $css ) {
		wp_add_inline_style( 'sgs-woocommerce', $css );
	}
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\output_shop_filter_look_style', 20 );

/**
 * `sgs-shop-sort-native` on <body> when the sort menu keeps the browser's arrow.
 *
 * @param string[] $classes Body classes.
 * @return string[]
 */
function add_shop_filter_look_body_class( array $classes ): array {
	if ( 'browser' === get_theme_mod( 'sgs_shop_sort_arrow', 'theme' ) ) {
		$classes[] = 'sgs-shop-sort-native';
	}
	return $classes;
}
add_filter( 'body_class', __NAMESPACE__ . '\add_shop_filter_look_body_class' );
