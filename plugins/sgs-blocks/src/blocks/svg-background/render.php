<?php
/**
 * SVG Background — Server Render
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 * @param array    $attributes Block attributes.
 * @param string   $content    Block content (inner blocks).
 * @param WP_Block $block      Block instance.
 */

$svg_content     = $attributes['svgContent'] ?? '';
$svg_position    = $attributes['svgPosition'] ?? 'background';
$animation_type  = $attributes['animationType'] ?? 'none';
$animation_speed = $attributes['animationSpeed'] ?? 'medium';
$opacity         = $attributes['opacity'] ?? 100;
$min_height      = $attributes['minHeight'] ?? '';

$wrapper_classes = [
	'sgs-svg-background',
	'sgs-svg-background--' . $svg_position,
	'sgs-svg-background--anim-' . $animation_type,
	'sgs-svg-background--speed-' . $animation_speed,
];

$wrapper_styles = [];

if ( ! empty( $min_height ) ) {
	$wrapper_styles[] = 'min-height: ' . esc_attr( $min_height );
}

$wrapper_attributes = get_block_wrapper_attributes( [
	'class' => implode( ' ', $wrapper_classes ),
	'style' => ! empty( $wrapper_styles ) ? implode( '; ', $wrapper_styles ) : null,
] );

?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped HTML. ?>>
	<?php if ( ! empty( $svg_content ) ) : ?>
		<div
			class="sgs-svg-background__svg"
			style="opacity: <?php echo esc_attr( $opacity / 100 ); ?>;"
			aria-hidden="true"
		>
			<?php
			// Sanitise SVG to remove script tags and event handlers.
			$allowed_svg_tags = [
				'svg'      => [
					'xmlns'       => true,
					'viewbox'     => true,
					'width'       => true,
					'height'      => true,
					'preserveaspectratio' => true,
					'class'       => true,
					'id'          => true,
				],
				'g'        => [ 'transform' => true, 'class' => true, 'id' => true ],
				'path'     => [ 'd' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true, 'class' => true ],
				'circle'   => [ 'cx' => true, 'cy' => true, 'r' => true, 'fill' => true, 'stroke' => true, 'class' => true ],
				'rect'     => [ 'x' => true, 'y' => true, 'width' => true, 'height' => true, 'fill' => true, 'stroke' => true, 'class' => true ],
				'polygon'  => [ 'points' => true, 'fill' => true, 'stroke' => true, 'class' => true ],
				'polyline' => [ 'points' => true, 'fill' => true, 'stroke' => true, 'class' => true ],
				'line'     => [ 'x1' => true, 'y1' => true, 'x2' => true, 'y2' => true, 'stroke' => true, 'class' => true ],
				'ellipse'  => [ 'cx' => true, 'cy' => true, 'rx' => true, 'ry' => true, 'fill' => true, 'stroke' => true, 'class' => true ],
				'text'     => [ 'x' => true, 'y' => true, 'fill' => true, 'font-size' => true, 'font-family' => true, 'class' => true ],
				'defs'     => [],
				'style'    => [ 'type' => true ],
				'animate'  => [ 'attributename' => true, 'from' => true, 'to' => true, 'dur' => true, 'repeatcount' => true ],
			];

			echo wp_kses( $svg_content, $allowed_svg_tags );
			?>
		</div>
	<?php endif; ?>

	<div class="sgs-svg-background__content">
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Block inner content is processed by WordPress's block renderer. ?>
	</div>
</div>
