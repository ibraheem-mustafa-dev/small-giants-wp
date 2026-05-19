<?php
/**
 * Server-side render for sgs/counter.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/counter {attrs} /-->`) produce
 * the expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-counter` root class
 * never reaches the deployed page — breaking pixel-diff selectors.
 *
 * Render is a faithful PHP port of save.js. Existing static instances on
 * already-published posts continue to round-trip via their stored save
 * HTML; only new (cv2-emitted) instances flow through this renderer.
 *
 * @since 2026-05-16  P-PHASE8-2 render.php audit
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$number          = isset( $attributes['number'] ) ? absint( $attributes['number'] ) : 0;
$prefix          = isset( $attributes['prefix'] ) ? (string) $attributes['prefix'] : '';
$suffix          = isset( $attributes['suffix'] ) ? (string) $attributes['suffix'] : '';
$label           = isset( $attributes['label'] ) ? (string) $attributes['label'] : '';
$duration        = isset( $attributes['duration'] ) ? absint( $attributes['duration'] ) : 2000;
$separator       = ! empty( $attributes['separator'] );
$number_colour   = $attributes['numberColour'] ?? '';
$label_colour    = $attributes['labelColour'] ?? '';
$label_font_size = $attributes['labelFontSize'] ?? '';
$icon            = $attributes['icon'] ?? '';
$accent_stroke   = ! empty( $attributes['accentStroke'] );

/**
 * Format a number with thousand separators using en-GB locale.
 *
 * Parity with save.js formatNumber().
 *
 * @param int  $num       The number to format.
 * @param bool $separator Whether to add thousand separators.
 * @return string Formatted number string.
 */
function sgs_format_counter_number( int $num, bool $separator ): string {
	if ( $separator ) {
		return number_format_i18n( $num );
	}
	return (string) $num;
}

$formatted_number = sgs_format_counter_number( $number, $separator );

// Wrapper class — preserves SGS-BEM root + optional accent-stroke modifier.
$wrapper_classes = array( 'sgs-counter' );
if ( $accent_stroke ) {
	$wrapper_classes[] = 'sgs-counter--accent-stroke';
}

$wrapper_args  = array(
	'class' => implode( ' ', $wrapper_classes ),
);
$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// Number inline style (colour only).
$number_style_parts = array();
if ( $number_colour ) {
	$number_style_parts[] = 'color:' . sgs_colour_value( $number_colour );
}
$number_style_attr = $number_style_parts ? ' style="' . esc_attr( implode( ';', $number_style_parts ) ) . '"' : '';

// Label inline style (colour + font-size).
$label_style_parts = array();
if ( $label_colour ) {
	$label_style_parts[] = 'color:' . sgs_colour_value( $label_colour );
}
if ( $label_font_size ) {
	$label_style_parts[] = 'font-size:' . sgs_font_size_value( $label_font_size );
}
$label_style_attr = $label_style_parts ? ' style="' . esc_attr( implode( ';', $label_style_parts ) ) . '"' : '';

// Full text for SR only (parity with save.js fullText).
$full_text = $prefix . $formatted_number . $suffix . ' ' . $label;

?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php if ( $icon ) : ?>
		<span class="sgs-counter__icon-placeholder" data-icon="<?php echo esc_attr( $icon ); ?>" aria-hidden="true"></span>
	<?php endif; ?>
	<span class="sgs-sr-only"><?php echo esc_html( $full_text ); ?></span>
	<span class="sgs-counter__number"<?php echo $number_style_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> data-target="<?php echo esc_attr( (string) $number ); ?>" data-duration="<?php echo esc_attr( (string) $duration ); ?>" data-separator="<?php echo esc_attr( $separator ? 'true' : 'false' ); ?>"<?php echo $prefix ? ' data-prefix="' . esc_attr( $prefix ) . '"' : ''; ?><?php echo $suffix ? ' data-suffix="' . esc_attr( $suffix ) . '"' : ''; ?> aria-hidden="true">
	<?php
		echo esc_html( $prefix . $formatted_number . $suffix );
	?>
	</span>
	<p class="sgs-counter__label"<?php echo $label_style_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> aria-hidden="true"><?php echo wp_kses_post( $label ); ?></p>
</div>
<?php
