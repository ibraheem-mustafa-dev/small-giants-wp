<?php
/**
 * Server-side render for the SGS Countdown Timer block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use Carbon\Carbon;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

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

// Carbon-powered initial values for fixed target dates.
$initial    = array( 'days' => 0, 'hours' => 0, 'minutes' => 0, 'seconds' => 0 );
$server_ts  = 0;
$is_expired = false;

if ( ! $evergreen_mode && $target_date ) {
	try {
		$target    = Carbon::parse( $target_date, wp_timezone() );
		$now       = Carbon::now( wp_timezone() );
		$server_ts = $target->timestamp;

		if ( $target->isPast() ) {
			$is_expired = true;
		} else {
			$total_seconds      = (int) $target->diffInSeconds( $now );
			$initial['days']    = (int) floor( $total_seconds / 86400 );
			$remaining          = $total_seconds % 86400;
			$initial['hours']   = (int) floor( $remaining / 3600 );
			$remaining         %= 3600;
			$initial['minutes'] = (int) floor( $remaining / 60 );
			$initial['seconds'] = $remaining % 60;
		}
	} catch ( \Exception $e ) {
		// Invalid date — fall back to zeros, JS handles it.
	}
}

$classes = array(
	'sgs-countdown',
	'sgs-countdown--' . esc_attr( $card_style ),
);

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => implode( ' ', $classes ),
	'style' => '--sgs-countdown-number-colour:' . esc_attr( sgs_colour_value( $number_colour ) ) . ';--sgs-countdown-label-colour:' . esc_attr( sgs_colour_value( $label_colour ) ) . ';',
) );

// Data attributes for JS.
$data_attrs = '';
if ( $evergreen_mode ) {
	$total_seconds = ( (int) $evergreen_hours * 3600 ) + ( (int) $evergreen_mins * 60 );
	$data_attrs .= ' data-evergreen="' . esc_attr( $total_seconds ) . '"';
} elseif ( $target_date ) {
	$data_attrs .= ' data-target="' . esc_attr( $target_date ) . '"';
}
if ( $server_ts ) {
	$data_attrs .= ' data-server-ts="' . esc_attr( $server_ts ) . '"';
}
$data_attrs .= ' data-expired-message="' . esc_attr( $expired_message ) . '"';

$units = array();
if ( $show_days )    $units[] = array( 'class' => 'days',    'label' => __( 'Days', 'sgs-blocks' ) );
if ( $show_hours )   $units[] = array( 'class' => 'hours',   'label' => __( 'Hours', 'sgs-blocks' ) );
if ( $show_minutes ) $units[] = array( 'class' => 'minutes', 'label' => __( 'Minutes', 'sgs-blocks' ) );
if ( $show_seconds ) $units[] = array( 'class' => 'seconds', 'label' => __( 'Seconds', 'sgs-blocks' ) );

$grid_hidden    = $is_expired ? ' hidden' : '';
$expired_hidden = $is_expired ? '' : ' hidden aria-hidden="true"';

?>
<div <?php echo $wrapper_attributes; ?><?php echo $data_attrs; ?> role="timer" aria-live="polite" aria-atomic="true">
	<div class="sgs-countdown__grid"<?php echo $grid_hidden; ?>>
		<?php foreach ( $units as $unit ) : ?>
			<div class="sgs-countdown__unit">
				<span class="sgs-countdown__number sgs-countdown__<?php echo esc_attr( $unit['class'] ); ?>"><?php echo esc_html( str_pad( (string) ( $initial[ $unit['class'] ] ?? 0 ), 2, '0', STR_PAD_LEFT ) ); ?></span>
				<span class="sgs-countdown__label"><?php echo esc_html( $unit['label'] ); ?></span>
			</div>
		<?php endforeach; ?>
	</div>
	<div class="sgs-countdown__expired"<?php echo $expired_hidden; ?>><?php echo esc_html( $expired_message ); ?></div>
</div>
