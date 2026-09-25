<?php
/**
 * SGS Shop Filters — per-site card sizing, narrow-screen layout and filter
 * panel style. Sibling file to shop-filters-settings.php (required from
 * there); split out to keep both files under the theme's 300-line limit.
 *
 * Every setting here is a neutral default that renders identically to today
 * when unconfigured — see each control's description and the CSS comments in
 * assets/css/woocommerce.css for the exact selectors each one feeds.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * Register the card-sizing, narrow-layout and filter-panel-style controls
 * under the existing "Shop Filters" Customizer section (added by
 * register_shop_filter_customizer_settings() in shop-filters-settings.php,
 * hooked to the same 'customize_register' action — section membership is
 * resolved after every 'customize_register' callback has run, so hook order
 * between the two files does not matter).
 *
 * @param \WP_Customize_Manager $wp_customize Customizer manager instance.
 * @return void
 */
function register_shop_layout_customizer_settings( \WP_Customize_Manager $wp_customize ): void {
	$wp_customize->add_setting(
		'sgs_shop_card_min_width',
		array(
			'default'           => '',
			'sanitize_callback' => __NAMESPACE__ . '\sanitize_shop_card_min_width',
		)
	);
	$wp_customize->add_control(
		'sgs_shop_card_min_width',
		array(
			'section'     => 'sgs_shop_filters',
			'type'        => 'number',
			'label'       => __( 'Product card minimum width (px)', 'sgs-theme' ),
			'description' => __( 'The smallest a product card is allowed to shrink to before the row wraps to fewer columns. Leave blank for the theme default (240px).', 'sgs-theme' ),
			'input_attrs' => array(
				'min'  => 120,
				'max'  => 480,
				'step' => 1,
			),
		)
	);

	$wp_customize->add_setting(
		'sgs_shop_col_gap',
		array(
			'default'           => '',
			'sanitize_callback' => __NAMESPACE__ . '\sanitize_shop_col_gap',
		)
	);
	$wp_customize->add_control(
		'sgs_shop_col_gap',
		array(
			'section'     => 'sgs_shop_filters',
			'type'        => 'number',
			'label'       => __( 'Gap between product cards (px)', 'sgs-theme' ),
			'description' => __( 'Space between product cards on the wide desktop grid. Leave blank for the theme default (24px). The tighter mobile gutter (16px) is unaffected.', 'sgs-theme' ),
			'input_attrs' => array(
				'min'  => 0,
				'max'  => 64,
				'step' => 1,
			),
		)
	);

	$wp_customize->add_setting(
		'sgs_shop_narrow_layout',
		array(
			'default'           => 'rows',
			'sanitize_callback' => __NAMESPACE__ . '\sanitize_shop_narrow_layout',
		)
	);
	$wp_customize->add_control(
		'sgs_shop_narrow_layout',
		array(
			'section'     => 'sgs_shop_filters',
			'type'        => 'select',
			'label'       => __( 'Product grid on narrow screens', 'sgs-theme' ),
			'description' => __( 'Below about 496px, show each product as a horizontal row with the image beside the text (today\'s behaviour), or keep a two-column grid of upright cards instead.', 'sgs-theme' ),
			'choices'     => array(
				'rows' => __( 'Rows (image beside text)', 'sgs-theme' ),
				'grid' => __( 'Grid (two cards a row)', 'sgs-theme' ),
			),
		)
	);

	$wp_customize->add_setting(
		'sgs_shop_filter_panel_style',
		array(
			'default'           => 'panel',
			'sanitize_callback' => __NAMESPACE__ . '\sanitize_shop_filter_panel_style',
		)
	);
	$wp_customize->add_control(
		'sgs_shop_filter_panel_style',
		array(
			'section'     => 'sgs_shop_filters',
			'type'        => 'select',
			'label'       => __( 'Filter panel style', 'sgs-theme' ),
			'description' => __( 'Panel keeps today\'s tinted background, border, rounded corners and shadow around the filters. Plain removes all of that and shows just the filter controls on the page background. The mobile filter drawer always keeps its own solid background, whichever style is chosen, so it stays readable over the page behind it.', 'sgs-theme' ),
			'choices'     => array(
				'panel' => __( 'Panel', 'sgs-theme' ),
				'plain' => __( 'Plain', 'sgs-theme' ),
			),
		)
	);
}
add_action( 'customize_register', __NAMESPACE__ . '\register_shop_layout_customizer_settings' );

/**
 * Sanitise the product-card minimum-width setting: an empty value is valid
 * (means "use the theme default"), otherwise clamp to the allowed range.
 *
 * @param mixed $value Raw control value.
 * @return string Empty string, or an integer string between 120 and 480.
 */
function sanitize_shop_card_min_width( $value ): string {
	$value = trim( (string) $value );
	if ( '' === $value ) {
		return '';
	}

	$int = absint( $value );
	if ( $int < 120 ) {
		$int = 120;
	} elseif ( $int > 480 ) {
		$int = 480;
	}

	return (string) $int;
}

/**
 * Sanitise the card-gap setting: an empty value is valid (means "use the
 * theme default"), otherwise clamp to the allowed range.
 *
 * @param mixed $value Raw control value.
 * @return string Empty string, or an integer string between 0 and 64.
 */
function sanitize_shop_col_gap( $value ): string {
	$value = trim( (string) $value );
	if ( '' === $value ) {
		return '';
	}

	$int = absint( $value );
	if ( $int > 64 ) {
		$int = 64;
	}

	return (string) $int;
}

/**
 * Sanitise the narrow-screen layout setting to one of its two valid values.
 *
 * @param mixed $value Raw control value.
 * @return string 'rows' or 'grid'.
 */
function sanitize_shop_narrow_layout( $value ): string {
	return 'grid' === $value ? 'grid' : 'rows';
}

/**
 * Sanitise the filter-panel-style setting to one of its two valid values.
 *
 * @param mixed $value Raw control value.
 * @return string 'panel' or 'plain'.
 */
function sanitize_shop_filter_panel_style( $value ): string {
	return 'plain' === $value ? 'plain' : 'panel';
}

/**
 * Output the configured card minimum width / gap as CSS custom properties.
 *
 * Feeds `.sgs-shop-layout .wc-block-product-template` in woocommerce.css,
 * which reads `var(--sgs-shop-card-min-setting, 240px)` and
 * `var(--sgs-shop-col-gap-setting, 24px)` — so a site with neither setting
 * configured renders the same defaults the CSS already falls back to.
 *
 * @return void
 */
function output_shop_card_dimensions_style(): void {
	if ( ! wp_style_is( 'sgs-woocommerce', 'enqueued' ) ) {
		return;
	}

	$css = '';

	$card_min = trim( (string) get_theme_mod( 'sgs_shop_card_min_width', '' ) );
	if ( '' !== $card_min ) {
		$card_min = absint( $card_min );
		if ( $card_min >= 120 && $card_min <= 480 ) {
			$css .= sprintf( '--sgs-shop-card-min-setting:%dpx;', $card_min );
		}
	}

	$col_gap = trim( (string) get_theme_mod( 'sgs_shop_col_gap', '' ) );
	if ( '' !== $col_gap ) {
		$col_gap = absint( $col_gap );
		if ( $col_gap <= 64 ) {
			$css .= sprintf( '--sgs-shop-col-gap-setting:%dpx;', $col_gap );
		}
	}

	if ( '' === $css ) {
		return;
	}

	wp_add_inline_style( 'sgs-woocommerce', sprintf( ':root{%s}', $css ) );
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\output_shop_card_dimensions_style', 20 );

/**
 * Add the narrow-grid and plain-filter-panel body classes when their
 * settings are turned on. Both classes are only ever matched inside a
 * `.sgs-shop-layout` / `#sgs-shop-filters` selector in woocommerce.css, so
 * adding them site-wide (rather than only on shop pages) is harmless: they
 * do nothing outside those selectors' contexts.
 *
 * @param string[] $classes Existing body classes.
 * @return string[] Filtered body classes.
 */
function add_shop_layout_body_classes( array $classes ): array {
	if ( 'grid' === get_theme_mod( 'sgs_shop_narrow_layout', 'rows' ) ) {
		$classes[] = 'sgs-shop-narrow-grid';
	}

	if ( 'plain' === get_theme_mod( 'sgs_shop_filter_panel_style', 'panel' ) ) {
		$classes[] = 'sgs-shop-filters-plain';
	}

	return $classes;
}
add_filter( 'body_class', __NAMESPACE__ . '\add_shop_layout_body_classes' );
