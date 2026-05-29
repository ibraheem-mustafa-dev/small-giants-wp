<?php
/**
 * Server-side render for sgs/divider.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/divider {attrs} /-->`) produce
 * the expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-divider` root class and
 * variant-specific markup never reach the deployed page.
 *
 * Render is a faithful PHP port of save.js, supporting all four variants:
 * line, dots, wave, and shape. Existing static instances on already-published
 * posts continue to round-trip via their stored save HTML; only new
 * (cv2-emitted) instances flow through this renderer.
 *
 * @since 2026-05-16  P-PHASE8-2 render.php audit
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// Extract attributes with defaults matching block.json.
$variant       = $attributes['variant'] ?? 'line';
$colour        = $attributes['colour'] ?? 'primary';
$thickness     = (int) ( $attributes['thickness'] ?? 1 );
$width         = (int) ( $attributes['width'] ?? 100 );
$width_unit    = $attributes['widthUnit'] ?? '%';
$divider_align = $attributes['dividerAlign'] ?? 'center';
$margin_top    = (int) ( $attributes['marginTop'] ?? 32 );
$margin_bottom = (int) ( $attributes['marginBottom'] ?? 32 );
$margin_unit   = $attributes['marginUnit'] ?? 'px';
$shape         = $attributes['shape'] ?? 'circle';
$shape_size    = (int) ( $attributes['shapeSize'] ?? 12 );
$dot_count     = (int) ( $attributes['dotCount'] ?? 3 );

// Resolve colour to CSS custom property or direct colour value.
$colour_value = sgs_colour_value( $colour );

// Wrapper margin style (parity with save.js buildWrapperStyle).
$wrapper_style_parts = array();
if ( 0 !== $margin_top || 0 !== $margin_bottom ) {
	$wrapper_style_parts[] = 'margin-top:' . intval( $margin_top ) . esc_attr( $margin_unit );
	$wrapper_style_parts[] = 'margin-bottom:' . intval( $margin_bottom ) . esc_attr( $margin_unit );
}
$wrapper_style = $wrapper_style_parts ? implode( ';', $wrapper_style_parts ) : '';

// Wrapper class names — preserves SGS-BEM root + variant + alignment.
$wrapper_classes = array(
	'wp-block-sgs-divider',
	'wp-block-sgs-divider--' . sanitize_html_class( $variant ),
	'is-divider-align-' . sanitize_html_class( $divider_align ),
);

$wrapper_args = array(
	'class' => implode( ' ', $wrapper_classes ),
);
if ( $wrapper_style ) {
	$wrapper_args['style'] = $wrapper_style;
}
$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// Size style (width) — applies to all variant inner elements.
$size_style_parts = array();
if ( 0 !== $width ) {
	$size_style_parts[] = 'width:' . intval( $width ) . esc_attr( $width_unit );
}
$size_style = $size_style_parts ? ' style="' . esc_attr( implode( ';', $size_style_parts ) ) . '"' : '';

// Render variant-specific inner markup.
?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php
	if ( 'line' === $variant ) {
		// Line variant — <hr> with inline border style.
		$line_style_parts = array(
			'border-top:' . intval( $thickness ) . 'px solid ' . esc_attr( $colour_value ),
			'border-bottom:none',
			'border-left:none',
			'border-right:none',
			'margin:0',
		);
		?>
		<hr class="wp-block-sgs-divider__line" style="<?php echo esc_attr( implode( ';', $line_style_parts ) ); ?>" />
		<?php
	} elseif ( 'dots' === $variant ) {
		// Dots variant — container with repeating dot spans.
		?>
		<div class="wp-block-sgs-divider__dots"<?php echo $size_style; // phpcs:ignore ?>>
			<?php
			for ( $i = 0; $i < $dot_count; $i++ ) {
				$dot_style_parts = array(
					'width:' . intval( $shape_size ) . 'px',
					'height:' . intval( $shape_size ) . 'px',
					'background-color:' . esc_attr( $colour_value ),
				);
				?>
				<span class="wp-block-sgs-divider__dot" style="<?php echo esc_attr( implode( ';', $dot_style_parts ) ); ?>"></span>
				<?php
			}
			?>
		</div>
		<?php
	} elseif ( 'wave' === $variant ) {
		// Wave variant — SVG with inline path + stroke.
		?>
		<div class="wp-block-sgs-divider__wave"<?php echo $size_style; // phpcs:ignore ?>>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true" focusable="false">
				<path d="M0,10 C25,0 50,20 75,10 C100,0 125,20 150,10 C175,0 200,20 200,10" stroke="<?php echo esc_attr( $colour_value ); ?>" stroke-width="2" fill="none" />
			</svg>
		</div>
		<?php
	} elseif ( 'shape' === $variant ) {
		// Shape variant — centred shape (circle, square, diamond).
		$shape_class       = 'wp-block-sgs-divider__shape-inner is-' . sanitize_html_class( $shape );
		$shape_style_parts = array(
			'width:' . intval( $shape_size ) . 'px',
			'height:' . intval( $shape_size ) . 'px',
			'background-color:' . esc_attr( $colour_value ),
		);
		?>
		<div class="wp-block-sgs-divider__shape"<?php echo $size_style; // phpcs:ignore ?>>
			<span class="<?php echo esc_attr( $shape_class ); ?>" style="<?php echo esc_attr( implode( ';', $shape_style_parts ) ); ?>"></span>
		</div>
		<?php
	}
	?>
</div>
<?php
