<?php
/**
 * SGS Floating UI Customiser Registration
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register Customiser settings for Floating UI.
 *
 * @param \WP_Customize_Manager $wp_customize Customiser manager instance.
 */
function customize_register_floating_ui( $wp_customize ) {
	// Add Section.
	$wp_customize->add_section(
		'sgs_floating_ui',
		array(
			'title'    => __( 'SGS Floating UI', 'sgs-theme' ),
			'priority' => 110,
			'panel'    => $wp_customize->get_panel( 'sgs' ) ? 'sgs' : '',
		)
	);

	// Palette choices from theme.json.
	$palette_choices = array(
		'primary'      => __( 'Primary', 'sgs-theme' ),
		'accent'       => __( 'Accent', 'sgs-theme' ),
		'primary-dark' => __( 'Primary Dark', 'sgs-theme' ),
		'surface'      => __( 'Surface', 'sgs-theme' ),
		'text'         => __( 'Text', 'sgs-theme' )
	);

	// --- BACK TO TOP ---

	$wp_customize->add_setting(
		'sgs_back_to_top_enabled',
		array(
			'default'           => true,
			'sanitize_callback' => 'rest_sanitize_boolean',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_back_to_top_enabled',
		array(
			'label'    => __( 'Enable Back to Top', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'checkbox',
		)
	);

	$wp_customize->add_setting(
		'sgs_back_to_top_position',
		array(
			'default'           => 'bottom-right',
			'sanitize_callback' => 'sanitize_text_field',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_back_to_top_position',
		array(
			'label'    => __( 'Position', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'select',
			'choices'  => array(
				'bottom-right' => __( 'Bottom Right', 'sgs-theme' ),
				'bottom-left'  => __( 'Bottom Left', 'sgs-theme' ),
				'top-right'    => __( 'Top Right', 'sgs-theme' ),
				'top-left'     => __( 'Top Left', 'sgs-theme' ),
			),
		)
	);

	$wp_customize->add_setting(
		'sgs_back_to_top_show_after',
		array(
			'default'           => 200,
			'sanitize_callback' => 'absint',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_back_to_top_show_after',
		array(
			'label'    => __( 'Show after X pixels scrolled', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'number',
		)
	);

	$wp_customize->add_setting(
		'sgs_back_to_top_shape',
		array(
			'default'           => 'circle',
			'sanitize_callback' => 'sanitize_text_field',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_back_to_top_shape',
		array(
			'label'    => __( 'Shape', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'select',
			'choices'  => array(
				'circle' => __( 'Circle', 'sgs-theme' ),
				'pill'   => __( 'Pill', 'sgs-theme' ),
				'square' => __( 'Square', 'sgs-theme' ),
			),
		)
	);

	$wp_customize->add_setting(
		'sgs_back_to_top_colour_slug',
		array(
			'default'           => 'primary',
			'sanitize_callback' => 'sanitize_text_field',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_back_to_top_colour_slug',
		array(
			'label'    => __( 'Colour', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'select',
			'choices'  => $palette_choices,
		)
	);

	$wp_customize->add_setting(
		'sgs_back_to_top_size',
		array(
			'default'           => 48,
			'sanitize_callback' => 'absint',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_back_to_top_size',
		array(
			'label'    => __( 'Size (px)', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'number',
			'input_attrs' => array(
				'min'  => 32,
				'max'  => 96,
				'step' => 1,
			),
		)
	);

	$wp_customize->add_setting(
		'sgs_back_to_top_icon',
		array(
			'default'           => 'arrow-up',
			'sanitize_callback' => 'sanitize_text_field',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_back_to_top_icon',
		array(
			'label'    => __( 'Icon', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'select',
			'choices'  => array(
				'arrow-up'          => __( 'Arrow Up', 'sgs-theme' ),
				'chevron-up'        => __( 'Chevron Up', 'sgs-theme' ),
				'double-chevron-up' => __( 'Double Chevron Up', 'sgs-theme' ),
			),
		)
	);

	// --- READING PROGRESS ---

	$wp_customize->add_setting(
		'sgs_reading_progress_enabled',
		array(
			'default'           => false,
			'sanitize_callback' => 'rest_sanitize_boolean',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_reading_progress_enabled',
		array(
			'label'    => __( 'Enable Reading Progress', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'checkbox',
		)
	);

	$wp_customize->add_setting(
		'sgs_reading_progress_mode',
		array(
			'default'           => 'both',
			'sanitize_callback' => 'sanitize_text_field',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_reading_progress_mode',
		array(
			'label'    => __( 'Display Mode', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'select',
			'choices'  => array(
				'bar'       => __( 'Bar Only', 'sgs-theme' ),
				'countdown' => __( 'Countdown Only', 'sgs-theme' ),
				'both'      => __( 'Both', 'sgs-theme' ),
			),
		)
	);

	$wp_customize->add_setting(
		'sgs_reading_progress_position',
		array(
			'default'           => 'top',
			'sanitize_callback' => 'sanitize_text_field',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_reading_progress_position',
		array(
			'label'    => __( 'Position', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'select',
			'choices'  => array(
				'top'    => __( 'Top', 'sgs-theme' ),
				'bottom' => __( 'Bottom', 'sgs-theme' ),
			),
		)
	);

	$wp_customize->add_setting(
		'sgs_reading_progress_target_selector',
		array(
			'default'           => 'main, article, .entry-content',
			'sanitize_callback' => 'sanitize_text_field',
			'transport'         => 'refresh',
		)
	);

	$wp_customize->add_control(
		'sgs_reading_progress_target_selector',
		array(
			'label'    => __( 'Target Content Selector(s)', 'sgs-theme' ),
			'description' => __( 'Comma-separated CSS selectors.', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'text',
		)
	);

	$wp_customize->add_setting(
		'sgs_reading_progress_wpm',
		array(
			'default'           => 225,
			'sanitize_callback' => 'absint',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_reading_progress_wpm',
		array(
			'label'    => __( 'Words Per Minute (WPM)', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'number',
		)
	);

	$wp_customize->add_setting(
		'sgs_reading_progress_bar_colour_slug',
		array(
			'default'           => 'primary',
			'sanitize_callback' => 'sanitize_text_field',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_reading_progress_bar_colour_slug',
		array(
			'label'    => __( 'Bar Colour', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'select',
			'choices'  => $palette_choices,
		)
	);

	$wp_customize->add_setting(
		'sgs_reading_progress_bar_height',
		array(
			'default'           => 4,
			'sanitize_callback' => 'absint',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_reading_progress_bar_height',
		array(
			'label'    => __( 'Bar Height (px)', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'number',
		)
	);

	$wp_customize->add_setting(
		'sgs_reading_progress_post_types',
		array(
			'default'           => 'post',
			'sanitize_callback' => 'sanitize_text_field',
			'transport'         => 'refresh',
		)
	);

	$wp_customize->add_control(
		'sgs_reading_progress_post_types',
		array(
			'label'    => __( 'Enabled Post Types', 'sgs-theme' ),
			'description' => __( 'Comma-separated post type slugs (e.g. post, page, product).', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'text',
		)
	);

	$wp_customize->add_setting(
		'sgs_reading_progress_show_when_finished',
		array(
			'default'           => false,
			'sanitize_callback' => 'rest_sanitize_boolean',
			'transport'         => 'postMessage',
		)
	);

	$wp_customize->add_control(
		'sgs_reading_progress_show_when_finished',
		array(
			'label'    => __( 'Show when finished', 'sgs-theme' ),
			'section'  => 'sgs_floating_ui',
			'type'     => 'checkbox',
		)
	);
}

add_action( 'customize_register', __NAMESPACE__ . '\\customize_register_floating_ui', 20 );

/**
 * Enqueue Customiser preview script.
 */
function customize_preview_init() {
	wp_enqueue_script(
		'sgs-customiser-preview',
		get_template_directory_uri() . '/assets/js/customiser-preview.js',
		array( 'customize-preview' ),
		'1.0.0',
		true
	);
}

add_action( 'customize_preview_init', __NAMESPACE__ . '\\customize_preview_init' );
