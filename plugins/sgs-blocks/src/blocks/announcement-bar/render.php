<?php
/**
 * Announcement Bar — Server Render
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 * @param array    $attributes Block attributes.
 * @param string   $content    Block content.
 * @param WP_Block $block      Block instance.
 */

$messages              = $attributes['messages'] ?? [ [ 'text' => '', 'ctaText' => '', 'ctaUrl' => '' ] ];
$variant               = $attributes['variant'] ?? 'standard';
$background_colour     = $attributes['backgroundColour'] ?? 'primary';
$text_colour           = $attributes['textColour'] ?? 'text-inverse';
$cta_style             = $attributes['ctaStyle'] ?? 'outline';
$cta_colour            = $attributes['ctaColour'] ?? 'accent';
$position              = $attributes['position'] ?? 'top';
$sticky                = $attributes['sticky'] ?? true;
$dismissible           = $attributes['dismissible'] ?? true;
$close_behaviour       = $attributes['closeBehaviour'] ?? 'session';
$cookie_days           = $attributes['cookieDays'] ?? 7;
$target_date           = $attributes['targetDate'] ?? '';
$show_days             = $attributes['showDays'] ?? true;
$show_hours            = $attributes['showHours'] ?? true;
$show_minutes          = $attributes['showMinutes'] ?? true;
$show_seconds          = $attributes['showSeconds'] ?? true;
$countdown_end_action  = $attributes['countdownEndAction'] ?? 'hide';
$countdown_end_message = $attributes['countdownEndMessage'] ?? 'This offer has ended.';
$rotation_interval     = $attributes['rotationInterval'] ?? 5000;
$rotation_type         = $attributes['rotationType'] ?? 'fade';
$start_date            = $attributes['startDate'] ?? '';
$end_date              = $attributes['endDate'] ?? '';
$icon                  = $attributes['icon'] ?? '';
$font_size             = $attributes['fontSize'] ?? 'small';

// Check scheduling.
$now = current_time( 'timestamp' );

if ( ! empty( $start_date ) && strtotime( $start_date ) > $now ) {
	// Bar not yet active.
	return '';
}

if ( ! empty( $end_date ) && strtotime( $end_date ) < $now ) {
	// Bar has expired.
	return '';
}

// Build wrapper classes.
$wrapper_classes = [
	'sgs-announcement-bar',
	'sgs-announcement-bar--' . $variant,
	'sgs-announcement-bar--' . $position,
	'sgs-announcement-bar--' . $rotation_type,
	'has-' . $background_colour . '-background-color',
	'has-' . $text_colour . '-color',
	'has-' . $font_size . '-font-size',
];

if ( $sticky ) {
	$wrapper_classes[] = 'sgs-announcement-bar--sticky';
}

if ( $dismissible && 'none' !== $close_behaviour ) {
	$wrapper_classes[] = 'sgs-announcement-bar--dismissible';
}

$wrapper_attributes = get_block_wrapper_attributes( [
	'class'                => implode( ' ', $wrapper_classes ),
	'data-wp-interactive'  => 'sgs/announcement-bar',
	'data-wp-context'      => wp_json_encode( [
		'isDismissed'         => false,
		'currentMessageIndex' => 0,
		'countdownRemaining'  => 0,
		'closeBehaviour'      => $close_behaviour,
		'cookieDays'          => $cookie_days,
		'targetDate'          => $target_date,
		'rotationInterval'    => $rotation_interval,
		'variant'             => $variant,
		'countdownEndAction'  => $countdown_end_action,
		'countdownEndMessage' => $countdown_end_message,
	] ),
	'data-wp-class--is-dismissed' => 'context.isDismissed',
	'data-wp-watch'        => 'callbacks.init',
	'role'                 => 'alert',
	'aria-live'            => 'polite',
] );

?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped HTML. ?>>
	<div class="sgs-announcement-bar__content">
		<?php if ( ! empty( $icon ) ) : ?>
			<span class="sgs-announcement-bar__icon" aria-hidden="true"><?php echo esc_html( $icon ); ?></span>
		<?php endif; ?>

		<div class="sgs-announcement-bar__messages">
			<?php foreach ( $messages as $index => $message ) : ?>
				<div
					class="sgs-announcement-bar__message"
					data-index="<?php echo esc_attr( $index ); ?>"
					data-wp-bind--hidden="callbacks.isMessageHidden"
				>
					<div class="sgs-announcement-bar__text">
						<?php echo wp_kses_post( $message['text'] ); ?>
					</div>

					<?php if ( ! empty( $message['ctaText'] ) && ! empty( $message['ctaUrl'] ) ) : ?>
						<a
							href="<?php echo esc_url( $message['ctaUrl'] ); ?>"
							class="sgs-announcement-bar__cta sgs-announcement-bar__cta--<?php echo esc_attr( $cta_style ); ?> has-<?php echo esc_attr( $cta_colour ); ?>-color"
						>
							<?php echo esc_html( $message['ctaText'] ); ?>
						</a>
					<?php endif; ?>
				</div>
			<?php endforeach; ?>
		</div>

		<?php if ( 'countdown' === $variant && ! empty( $target_date ) ) : ?>
			<div class="sgs-announcement-bar__countdown" aria-hidden="true" data-wp-watch="callbacks.updateCountdown">
				<?php if ( $show_days ) : ?>
					<span class="sgs-countdown-digit">
						<span data-wp-text="state.countdown.days">0</span><small>d</small>
					</span>
				<?php endif; ?>

				<?php if ( $show_hours ) : ?>
					<span class="sgs-countdown-digit">
						<span data-wp-text="state.countdown.hours">0</span><small>h</small>
					</span>
				<?php endif; ?>

				<?php if ( $show_minutes ) : ?>
					<span class="sgs-countdown-digit">
						<span data-wp-text="state.countdown.minutes">0</span><small>m</small>
					</span>
				<?php endif; ?>

				<?php if ( $show_seconds ) : ?>
					<span class="sgs-countdown-digit">
						<span data-wp-text="state.countdown.seconds">0</span><small>s</small>
					</span>
				<?php endif; ?>
			</div>
		<?php endif; ?>

		<?php if ( $dismissible && 'none' !== $close_behaviour ) : ?>
			<button
				type="button"
				class="sgs-announcement-bar__close"
				aria-label="<?php echo esc_attr__( 'Dismiss announcement', 'sgs-blocks' ); ?>"
				data-wp-on--click="actions.dismiss"
			>
				×
			</button>
		<?php endif; ?>
	</div>
</div>
