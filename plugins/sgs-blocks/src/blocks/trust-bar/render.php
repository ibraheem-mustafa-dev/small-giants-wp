<?php
/**
 * Server-side render for sgs/trust-bar.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/trust-bar {attrs} /-->`) produce
 * the expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-trust-bar` root class
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

$items                  = isset( $attributes['items'] ) && is_array( $attributes['items'] ) ? $attributes['items'] : array();
$animated               = ! empty( $attributes['animated'] );
$show_item_icons        = ! empty( $attributes['showItemIcons'] );
$dividers               = ! empty( $attributes['dividers'] );
$value_colour           = $attributes['valueColour'] ?? '';
$label_colour           = $attributes['labelColour'] ?? '';
$label_font_size        = $attributes['labelFontSize'] ?? '';
$label_font_size_tablet = $attributes['labelFontSizeTablet'] ?? '';
$label_font_size_mobile = $attributes['labelFontSizeMobile'] ?? '';
$hover_bg_colour        = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour      = $attributes['hoverTextColour'] ?? '';
$hover_border_colour    = $attributes['hoverBorderColour'] ?? '';
$transition_duration    = $attributes['transitionDuration'] ?? '';
$transition_easing      = $attributes['transitionEasing'] ?? '';

// Wrapper CSS custom properties (parity with save.js wrapperStyle).
$wrapper_style_parts = array();
if ( $hover_bg_colour ) {
	$wrapper_style_parts[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_bg_colour );
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

// Wrapper class — preserves SGS-BEM root + optional dividers modifier.
$wrapper_classes = array( 'sgs-trust-bar' );
if ( $dividers ) {
	$wrapper_classes[] = 'sgs-trust-bar--dividers';
}

// Responsive label font-size data attrs (read by CSS @media selectors).
$data_attrs = '';
if ( $label_font_size_tablet ) {
	$data_attrs .= ' data-label-fs-tablet="' . esc_attr( $label_font_size_tablet ) . '"';
}
if ( $label_font_size_mobile ) {
	$data_attrs .= ' data-label-fs-mobile="' . esc_attr( $label_font_size_mobile ) . '"';
}

$wrapper_args = array(
	'class' => implode( ' ', $wrapper_classes ),
);
if ( $wrapper_style ) {
	$wrapper_args['style'] = $wrapper_style;
}
$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// Per-item inline styles (parity with save.js valueStyle / labelStyle).
$value_style_parts = array();
if ( $value_colour ) {
	$value_style_parts[] = 'color:' . sgs_colour_value( $value_colour );
}
$value_style_attr = $value_style_parts ? ' style="' . esc_attr( implode( ';', $value_style_parts ) ) . '"' : '';

$label_style_parts = array();
if ( $label_colour ) {
	$label_style_parts[] = 'color:' . sgs_colour_value( $label_colour );
}
if ( $label_font_size ) {
	$label_style_parts[] = 'font-size:' . sgs_font_size_value( $label_font_size );
}
$label_style_attr = $label_style_parts ? ' style="' . esc_attr( implode( ';', $label_style_parts ) ) . '"' : '';

?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php echo $data_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php
	foreach ( $items as $item ) :
		$item       = is_array( $item ) ? $item : array();
		$value      = isset( $item['value'] ) ? (string) $item['value'] : '';
		$suffix     = isset( $item['suffix'] ) ? (string) $item['suffix'] : '';
		$item_label = isset( $item['label'] ) ? (string) $item['label'] : '';
		$icon       = isset( $item['icon'] ) ? (string) $item['icon'] : '';
		$item_anim  = ! isset( $item['animated'] ) || false !== $item['animated'];

		// Numeric-only animation trigger (parity with save.js isNumeric()).
		$cleaned     = preg_replace( '/[\s,]+/', '', $value );
		$is_numeric  = '' !== $cleaned && is_numeric( $cleaned );
		$should_anim = $animated && $item_anim && $is_numeric;

		$item_data_attrs = '';
		if ( $should_anim ) {
			$item_data_attrs .= ' data-target="' . esc_attr( (int) $cleaned ) . '"';
			$item_data_attrs .= ' data-separator="true"';
			if ( $suffix ) {
				$item_data_attrs .= ' data-suffix="' . esc_attr( $suffix ) . '"';
			}
		}
		?>
		<div class="sgs-trust-bar__item">
			<?php if ( $show_item_icons && $icon ) : ?>
				<span class="sgs-trust-bar__icon" data-icon="<?php echo esc_attr( $icon ); ?>" aria-hidden="true"></span>
			<?php endif; ?>
			<span class="sgs-sr-only"><?php echo esc_html( $value . $suffix . ' ' . $item_label ); ?></span>
			<span class="sgs-trust-bar__value"<?php echo $value_style_attr; // phpcs:ignore ?> aria-hidden="true"<?php echo $item_data_attrs; // phpcs:ignore ?>><?php
				echo esc_html( $value . $suffix );
			?>
			</span>
			<span class="sgs-trust-bar__label"<?php echo $label_style_attr; // phpcs:ignore ?> aria-hidden="true"><?php echo esc_html( $item_label ); ?></span>
		</div>
	<?php endforeach; ?>
</div>
<?php
