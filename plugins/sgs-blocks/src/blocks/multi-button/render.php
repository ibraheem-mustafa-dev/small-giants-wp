<?php
/**
 * SGS Multi-Button -- server-side render.
 *
 * Outputs a flex container wrapping one or more sgs/button children.
 * Responsive layout is scoped per-instance via a unique ID.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (sgs/button instances).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$direction        = isset( $attributes['direction'] ) ? esc_attr( $attributes['direction'] ) : 'row';
$direction_tablet = ! empty( $attributes['directionTablet'] ) ? esc_attr( $attributes['directionTablet'] ) : $direction;
$direction_mobile = ! empty( $attributes['directionMobile'] ) ? esc_attr( $attributes['directionMobile'] ) : 'column';

$gap        = isset( $attributes['gap'] ) ? absint( $attributes['gap'] ) : 12;
$gap_tablet = ( isset( $attributes['gapTablet'] ) && null !== $attributes['gapTablet'] ) ? absint( $attributes['gapTablet'] ) : $gap;
$gap_mobile = ( isset( $attributes['gapMobile'] ) && null !== $attributes['gapMobile'] ) ? absint( $attributes['gapMobile'] ) : 8;
$gap_unit   = isset( $attributes['gapUnit'] ) ? esc_attr( $attributes['gapUnit'] ) : 'px';

$justify_content        = isset( $attributes['justifyContent'] ) ? esc_attr( $attributes['justifyContent'] ) : 'flex-start';
$justify_content_tablet = ! empty( $attributes['justifyContentTablet'] ) ? esc_attr( $attributes['justifyContentTablet'] ) : $justify_content;
$justify_content_mobile = ! empty( $attributes['justifyContentMobile'] ) ? esc_attr( $attributes['justifyContentMobile'] ) : $justify_content;

$wrap        = isset( $attributes['wrap'] ) ? esc_attr( $attributes['wrap'] ) : 'wrap';
$wrap_tablet = ! empty( $attributes['wrapTablet'] ) ? esc_attr( $attributes['wrapTablet'] ) : $wrap;
$wrap_mobile = ! empty( $attributes['wrapMobile'] ) ? esc_attr( $attributes['wrapMobile'] ) : 'wrap';

$align_items = isset( $attributes['alignItems'] ) ? esc_attr( $attributes['alignItems'] ) : 'center';

// Generate a unique ID so responsive CSS is scoped per block instance.
$uid = wp_unique_id( 'sgs-mb-' );

// Build scoped responsive CSS using concatenation (WPCS: no variable interpolation in strings).
$css  = '#' . $uid . '.sgs-multi-button{';
$css .= 'display:flex;';
$css .= 'flex-direction:' . $direction . ';';
$css .= 'flex-wrap:' . $wrap . ';';
$css .= 'gap:' . $gap . $gap_unit . ';';
$css .= 'justify-content:' . $justify_content . ';';
$css .= 'align-items:' . $align_items . ';';
$css .= '}';

// Tablet breakpoint (769px to 1024px).
$css .= '@media(max-width:1024px) and (min-width:769px){';
$css .= '#' . $uid . '.sgs-multi-button{';
$css .= 'flex-direction:' . $direction_tablet . ';';
$css .= 'flex-wrap:' . $wrap_tablet . ';';
$css .= 'gap:' . $gap_tablet . $gap_unit . ';';
$css .= 'justify-content:' . $justify_content_tablet . ';';
$css .= '}}';

// Mobile breakpoint (max 768px).
$css .= '@media(max-width:768px){';
$css .= '#' . $uid . '.sgs-multi-button{';
$css .= 'flex-direction:' . $direction_mobile . ';';
$css .= 'flex-wrap:' . $wrap_mobile . ';';
$css .= 'gap:' . $gap_mobile . $gap_unit . ';';
$css .= 'justify-content:' . $justify_content_mobile . ';';
$css .= '}}';

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'id'    => esc_attr( $uid ),
		'class' => 'sgs-multi-button',
	)
);
?>
<style><?php echo esc_html( $css ); ?></style>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns sanitised HTML. ?>>
	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is rendered block HTML produced by WordPress core. ?>
</div>
