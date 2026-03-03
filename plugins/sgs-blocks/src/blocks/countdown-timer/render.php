<?php
/**
 * Server-side render for the SGS Countdown Timer block.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$label            = $attributes['label'] ?? '';
$target_date      = $attributes['targetDate'] ?? '';
$evergreen_mode   = $attributes['evergreenMode'] ?? false;
$evergreen_hours  = $attributes['evergreenHours'] ?? 24;
$evergreen_mins   = $attributes['evergreenMinutes'] ?? 0;
$expired_message  = $attributes['expiredMessage'] ?? 'This offer has expired.';
$show_days        = $attributes['showDays'] ?? true;
$show_hours       = $attributes['showHours'] ?? true;
$show_minutes     = $attributes['showMinutes'] ?? true;
$show_seconds     = $attributes['showSeconds'] ?? true;
$number_colour    = $attributes['numberColour'] ?? 'primary';
$label_colour     = $attributes['labelColour'] ?? 'text-muted';
$card_style       = $attributes['cardStyle'] ?? 'elevated';

$classes = array(
	'sgs-countdown',
	'sgs-countdown--' . esc_attr( $card_style ),
);

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => implode( ' ', $classes ),
) );

// Data attributes for JS.
$data_attrs = '';
if ( $evergreen_mode ) {
	$total_seconds = ( (int) $evergreen_hours * 3600 ) + ( (int) $evergreen_mins * 60 );
	$data_attrs .= ' data-evergreen="' . esc_attr( $total_seconds ) . '"';
} elseif ( $target_date ) {
	$data_attrs .= ' data-target="' . esc_attr( $target_date ) . '"';
}
$data_attrs .= ' data-expired-message="' . esc_attr( $expired_message ) . '"';

$number_style = 'color:' . sgs_colour_value( $number_colour );
$label_style  = 'color:' . sgs_colour_value( $label_colour );

$units = array();
if ( $show_days )    $units[] = array( 'class' => 'days',    'label' => __( 'Days', 'sgs-blocks' ) );
if ( $show_hours )   $units[] = array( 'class' => 'hours',   'label' => __( 'Hours', 'sgs-blocks' ) );
if ( $show_minutes ) $units[] = array( 'class' => 'minutes', 'label' => __( 'Minutes', 'sgs-blocks' ) );
if ( $show_seconds ) $units[] = array( 'class' => 'seconds', 'label' => __( 'Seconds', 'sgs-blocks' ) );

?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped HTML. ?><?php echo $data_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- all attributes built with esc_attr() above. ?> role="timer" aria-live="polite" aria-atomic="true">
	<?php if ( $label ) : ?>
		<p class="sgs-countdown__heading"><?php echo esc_html( $label ); ?></p>
	<?php endif; ?>
	<div class="sgs-countdown__grid">
		<?php foreach ( $units as $unit ) : ?>
			<div class="sgs-countdown__unit">
				<span class="sgs-countdown__number sgs-countdown__<?php echo esc_attr( $unit['class'] ); ?>" style="<?php echo esc_attr( $number_style ); ?>">00</span>
				<span class="sgs-countdown__label" style="<?php echo esc_attr( $label_style ); ?>"><?php echo esc_html( $unit['label'] ); ?></span>
			</div>
		<?php endforeach; ?>
	</div>
	<div class="sgs-countdown__expired" hidden aria-hidden="true"><?php echo esc_html( $expired_message ); ?></div>
</div>
