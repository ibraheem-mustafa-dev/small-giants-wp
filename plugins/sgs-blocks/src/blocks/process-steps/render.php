<?php
/**
 * Server-side render for sgs/process-steps.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/process-steps {attrs} /-->`) produce
 * the expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-process-steps` root class
 * never reaches the deployed page — breaking pixel-diff selectors.
 *
 * Render is a faithful PHP port of save.js. Existing static instances on
 * already-published posts continue to round-trip via their stored save
 * HTML; only new (cv2-emitted) instances flow through this renderer.
 *
 * @since 2026-05-15  Static-to-dynamic conversion
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$steps                   = isset( $attributes['steps'] ) && is_array( $attributes['steps'] ) ? $attributes['steps'] : array();
$connector_style         = $attributes['connectorStyle'] ?? 'line';
$number_style            = $attributes['numberStyle'] ?? 'circle';
$number_colour           = $attributes['numberColour'] ?? '';
$number_background       = $attributes['numberBackground'] ?? '';
$title_colour            = $attributes['titleColour'] ?? '';
$description_colour      = $attributes['descriptionColour'] ?? '';
$hover_background_colour = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour       = $attributes['hoverTextColour'] ?? '';
$hover_border_colour     = $attributes['hoverBorderColour'] ?? '';
$hover_effect            = $attributes['hoverEffect'] ?? 'none';
$transition_duration     = $attributes['transitionDuration'] ?? '';
$transition_easing       = $attributes['transitionEasing'] ?? '';

// Wrapper class array (parity with save.js className).
$wrapper_classes   = array( 'sgs-process-steps' );
$wrapper_classes[] = 'sgs-process-steps--connector-' . esc_attr( $connector_style );
$wrapper_classes[] = 'sgs-process-steps--number-' . esc_attr( $number_style );
if ( $hover_effect && 'none' !== $hover_effect ) {
	$wrapper_classes[] = 'sgs-process-steps--hover-' . esc_attr( $hover_effect );
}

// Wrapper CSS custom properties (parity with save.js wrapperStyle).
$wrapper_style_parts = array();
if ( $hover_background_colour ) {
	$wrapper_style_parts[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_background_colour );
}
if ( $hover_text_colour ) {
	$wrapper_style_parts[] = '--sgs-hover-text:' . sgs_colour_value( $hover_text_colour );
}
if ( $hover_border_colour ) {
	$wrapper_style_parts[] = '--sgs-hover-border:' . sgs_colour_value( $hover_border_colour );
}
if ( '' !== $transition_duration && null !== $transition_duration ) {
	$wrapper_style_parts[] = '--sgs-transition-duration:' . intval( $transition_duration ) . 'ms';
}
if ( $transition_easing ) {
	$wrapper_style_parts[] = '--sgs-transition-easing:' . esc_attr( $transition_easing );
}
$wrapper_style = $wrapper_style_parts ? implode( ';', $wrapper_style_parts ) : '';

$wrapper_args = array(
	'class' => implode( ' ', $wrapper_classes ),
);
if ( $wrapper_style ) {
	$wrapper_args['style'] = $wrapper_style;
}
$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// Per-step inline styles (parity with save.js numStyle / titleStyle / descStyle).
$num_style_parts = array();
if ( $number_colour ) {
	$num_style_parts[] = 'color:' . sgs_colour_value( $number_colour );
}
if ( $number_background ) {
	$num_style_parts[] = 'background-color:' . sgs_colour_value( $number_background );
}
$num_style_attr = $num_style_parts ? ' style="' . esc_attr( implode( ';', $num_style_parts ) ) . '"' : '';

$title_style_parts = array();
if ( $title_colour ) {
	$title_style_parts[] = 'color:' . sgs_colour_value( $title_colour );
}
$title_style_attr = $title_style_parts ? ' style="' . esc_attr( implode( ';', $title_style_parts ) ) . '"' : '';

$desc_style_parts = array();
if ( $description_colour ) {
	$desc_style_parts[] = 'color:' . sgs_colour_value( $description_colour );
}
$desc_style_attr = $desc_style_parts ? ' style="' . esc_attr( implode( ';', $desc_style_parts ) ) . '"' : '';

?>
<div<?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php
	foreach ( $steps as $index => $step ) :
		$step        = is_array( $step ) ? $step : array();
		$icon        = isset( $step['icon'] ) ? (string) $step['icon'] : '';
		$number      = isset( $step['number'] ) ? (string) $step['number'] : (string) ( $index + 1 );
		$step_title  = isset( $step['title'] ) ? (string) $step['title'] : '';
		$description = isset( $step['description'] ) ? (string) $step['description'] : '';
		?>
		<div class="sgs-process-steps__step">
			<?php if ( $icon ) : ?>
				<span class="sgs-process-steps__icon" data-icon="<?php echo esc_attr( $icon ); ?>" aria-hidden="true"></span>
			<?php endif; ?>
			<?php if ( 'none' !== $number_style ) : ?>
				<span class="sgs-process-steps__number"<?php echo $num_style_attr; // phpcs:ignore ?> aria-hidden="true"><?php echo esc_html( $number ); ?></span>
			<?php endif; ?>
			<h3 class="sgs-process-steps__title"<?php echo $title_style_attr; // phpcs:ignore ?>><?php echo esc_html( $step_title ); ?></h3>
			<?php if ( $description ) : ?>
				<p class="sgs-process-steps__description"<?php echo $desc_style_attr; // phpcs:ignore ?>><?php echo esc_html( $description ); ?></p>
			<?php endif; ?>
		</div>
	<?php endforeach; ?>
</div>
