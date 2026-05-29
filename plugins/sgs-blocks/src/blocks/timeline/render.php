<?php
/**
 * Server-side render for sgs/timeline.
 *
 * Renders a date-based timeline as a semantic <ol>/<li>/<time> structure.
 * Vertical and horizontal orientations supported. When revealOnScroll is
 * false, all entries are pre-revealed (is-revealed baked in, no JS dep).
 *
 * @since 0.1.0
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$entries          = isset( $attributes['entries'] ) && is_array( $attributes['entries'] ) ? $attributes['entries'] : array();
$orientation      = $attributes['orientation'] ?? 'vertical';
$alignment        = $attributes['alignment'] ?? 'alternating';
$connector_style  = $attributes['connectorStyle'] ?? 'line';
$connector_colour = $attributes['connectorColour'] ?? 'border-subtle';
$date_colour      = $attributes['dateColour'] ?? 'accent';
$reveal_on_scroll = isset( $attributes['revealOnScroll'] ) ? (bool) $attributes['revealOnScroll'] : true;
$reveal_stagger   = isset( $attributes['revealStagger'] ) ? absint( $attributes['revealStagger'] ) : 100;

// Sanitise orientation + alignment to avoid arbitrary CSS class injection.
$orientation     = in_array( $orientation, array( 'vertical', 'horizontal' ), true ) ? $orientation : 'vertical';
$alignment       = in_array( $alignment, array( 'left', 'centre', 'alternating' ), true ) ? $alignment : 'alternating';
$connector_style = in_array( $connector_style, array( 'line', 'dashed', 'dotted' ), true ) ? $connector_style : 'line';

// Build wrapper class list.
$wrapper_classes   = array( 'sgs-timeline' );
$wrapper_classes[] = 'sgs-timeline--' . $orientation;
if ( 'vertical' === $orientation ) {
	$wrapper_classes[] = 'sgs-timeline--align-' . $alignment;
}
$wrapper_classes[] = 'sgs-timeline--connector-' . $connector_style;

// Wrapper CSS custom properties.
$wrapper_style_parts = array();
if ( $connector_colour ) {
	$wrapper_style_parts[] = '--sgs-connector-colour:' . sgs_colour_value( $connector_colour );
}
if ( $date_colour ) {
	$wrapper_style_parts[] = '--sgs-date-colour:' . sgs_colour_value( $date_colour );
}
if ( $reveal_stagger > 0 ) {
	$wrapper_style_parts[] = '--sgs-reveal-stagger:' . $reveal_stagger . 'ms';
}
$wrapper_style = $wrapper_style_parts ? implode( ';', $wrapper_style_parts ) : '';

$wrapper_args = array(
	'class' => implode( ' ', $wrapper_classes ),
);
if ( $wrapper_style ) {
	$wrapper_args['style'] = $wrapper_style;
}

// Pass scroll-reveal config to view.js via data attributes.
if ( $reveal_on_scroll ) {
	$wrapper_args['data-reveal-on-scroll'] = 'true';
	$wrapper_args['data-reveal-stagger']   = (string) $reveal_stagger;
}

$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

?>
<ol <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php foreach ( $entries as $index => $entry ) : ?>
		<?php
		$entry       = is_array( $entry ) ? $entry : array();
		$date_raw    = isset( $entry['date'] ) ? (string) $entry['date'] : '';
		$entry_title = isset( $entry['title'] ) ? (string) $entry['title'] : '';
		$description = isset( $entry['description'] ) ? (string) $entry['description'] : '';
		$icon        = isset( $entry['icon'] ) ? (string) $entry['icon'] : '';
		$image_id    = isset( $entry['image'] ) ? absint( $entry['image'] ) : 0;

		// Build a safe ISO 8601 datetime attribute from the raw date string.
		// Accept both full dates (YYYY-MM-DD) and year-only values.
		$datetime_attr = '';
		if ( $date_raw ) {
			if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date_raw ) ) {
				// Looks like YYYY-MM-DD — use as-is.
				$datetime_attr = $date_raw;
			} elseif ( preg_match( '/^\d{4}$/', $date_raw ) ) {
				// Year-only format.
				$datetime_attr = $date_raw;
			} else {
				// Attempt conversion via strtotime for human-readable strings.
				$ts = strtotime( $date_raw );
				if ( false !== $ts ) {
					$datetime_attr = gmdate( 'Y-m-d', $ts );
				}
			}
		}

		// Pre-reveal when revealOnScroll is disabled.
		$entry_classes = array( 'sgs-timeline__entry' );
		if ( ! $reveal_on_scroll ) {
			$entry_classes[] = 'is-revealed';
		}
		$entry_class_attr = implode( ' ', $entry_classes );

		$image_url = ( $image_id > 0 ) ? wp_get_attachment_image_url( $image_id, 'medium' ) : '';
		$image_alt = ( $image_id > 0 ) ? (string) get_post_meta( $image_id, '_wp_attachment_image_alt', true ) : '';
		?>
		<li class="<?php echo esc_attr( $entry_class_attr ); ?>">
			<time class="sgs-timeline__date"<?php echo $datetime_attr ? ' datetime="' . esc_attr( $datetime_attr ) . '"' : ''; ?>>
				<?php echo esc_html( $date_raw ); ?>
			</time>
			<div class="sgs-timeline__node" aria-hidden="true">
				<?php if ( $icon ) : ?>
					<span class="sgs-timeline__node-icon" data-icon="<?php echo esc_attr( $icon ); ?>" aria-hidden="true"></span>
				<?php endif; ?>
			</div>
			<div class="sgs-timeline__content">
				<h3 class="sgs-timeline__title"><?php echo esc_html( $entry_title ); ?></h3>
				<?php if ( $description ) : ?>
					<div class="sgs-timeline__description"><?php echo wp_kses_post( $description ); ?></div>
				<?php endif; ?>
				<?php if ( $image_url ) : ?>
					<img class="sgs-timeline__image" src="<?php echo esc_url( $image_url ); ?>" alt="<?php echo esc_attr( $image_alt ); ?>" loading="lazy" />
				<?php endif; ?>
			</div>
		</li>
	<?php endforeach; ?>
</ol>
