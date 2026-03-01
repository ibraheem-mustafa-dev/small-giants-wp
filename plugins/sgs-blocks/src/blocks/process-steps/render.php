<?php
/**
 * Server-side render for the SGS Process Steps block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

$steps             = $attributes['steps'] ?? array();
$connector_style   = $attributes['connectorStyle'] ?? 'line';
$number_style      = $attributes['numberStyle'] ?? 'circle';
$number_colour     = $attributes['numberColour'] ?? '';
$number_background = $attributes['numberBackground'] ?? '';
$title_colour      = $attributes['titleColour'] ?? '';
$desc_colour       = $attributes['descriptionColour'] ?? '';

if ( empty( $steps ) ) {
	return;
}

$classes = array(
	'sgs-process-steps',
	'sgs-process-steps--connector-' . esc_attr( $connector_style ),
	'sgs-process-steps--number-' . esc_attr( $number_style ),
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
	)
);

// Build inline style strings.
$num_styles = array();
if ( $number_colour ) {
	$num_styles[] = 'color:' . sgs_colour_value( $number_colour );
}
if ( $number_background ) {
	$num_styles[] = 'background-color:' . sgs_colour_value( $number_background );
}
$num_style_attr = $num_styles ? ' style="' . implode( ';', $num_styles ) . '"' : '';

$title_style_attr = $title_colour
	? ' style="color:' . sgs_colour_value( $title_colour ) . '"'
	: '';

$desc_style_attr = $desc_colour
	? ' style="color:' . sgs_colour_value( $desc_colour ) . '"'
	: '';

// Build step items.
$steps_html = '';
foreach ( $steps as $index => $step ) {
	$step_html = '<div class="sgs-process-steps__step">';

	// Optional Lucide icon (from save.js — stored in step.icon as an icon slug).
	if ( ! empty( $step['icon'] ) ) {
		$icon_svg   = sgs_get_lucide_icon( $step['icon'] );
		$step_html .= sprintf(
			'<span class="sgs-process-steps__icon" aria-hidden="true" data-icon="%s">%s</span>',
			esc_attr( $step['icon'] ),
			$icon_svg
		);
	}

	// Step number (shown unless numberStyle is 'none').
	if ( 'none' !== $number_style ) {
		$display_number = ! empty( $step['number'] ) ? $step['number'] : (string) ( $index + 1 );
		$step_html     .= sprintf(
			'<span class="sgs-process-steps__number"%s aria-hidden="true">%s</span>',
			$num_style_attr,
			esc_html( $display_number )
		);
	}

	// Step title — required.
	if ( ! empty( $step['title'] ) ) {
		$step_html .= sprintf(
			'<h3 class="sgs-process-steps__title"%s>%s</h3>',
			$title_style_attr,
			esc_html( $step['title'] )
		);
	}

	// Step description — optional.
	if ( ! empty( $step['description'] ) ) {
		$step_html .= sprintf(
			'<p class="sgs-process-steps__description"%s>%s</p>',
			$desc_style_attr,
			esc_html( $step['description'] )
		);
	}

	$step_html  .= '</div>';
	$steps_html .= $step_html;
}

printf( '<div %s>%s</div>', $wrapper_attributes, $steps_html );
