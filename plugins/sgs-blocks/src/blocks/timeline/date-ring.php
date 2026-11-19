<?php
/**
 * Timeline partial: the horizontal timeline's year ring (a box drawn around each entry's date) and its equal-column row.
 *
 * Required by render.php, runs in its scope. Reads `$attributes`, `$orientation`, `$scroll_effect`, `$root_sel`; appends
 * to `$scoped_css` and to `$wrapper_args['class']`. Nothing here prints unless one of these settings is set.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( 'horizontal' !== $orientation ) {
	return;
}

// Equal columns: the entries share the row (style.scss `.sgs-timeline--cards-share`). The pinned horizontal scroll
// effect slides a row wider than the screen, so it keeps its own card width.
if ( ! empty( $attributes['cardsShareRow'] ) && 'pinned-horizontal' !== $scroll_effect ) {
	$wrapper_args['class'] .= ' sgs-timeline--cards-share';
}

// The year ring: the date's own box. The look prints on the date at every width; a size also makes it a marker on the
// connecting line from 768px up (style.scss `.sgs-timeline--date-ring`).
$dr_sel    = $root_sel . ' .sgs-timeline__date';
$dr_border = sgs_border_element_decls(
	$attributes,
	'dateRing',
	$dr_sel,
	array(
		'colour'     => array(
			'base'     => 'dateRingBorderColour',
			'gradient' => 'dateRingBorderColourGradient',
		),
		'ring_width' => '1px',
	)
);
$dr_decls  = $dr_border['base'];
$dr_paint  = sgs_background_paint_decl( (string) ( $attributes['dateRingBackgroundColour'] ?? '' ), (string) ( $attributes['dateRingBackgroundColourGradient'] ?? '' ) );
if ( '' !== $dr_paint ) {
	$dr_decls[] = $dr_paint;
}
$dr_shadow = sgs_shadow_decls(
	$attributes,
	array(
		'base'   => 'dateRingShadow',
		'colour' => 'dateRingShadowColour',
	),
	( $block instanceof \WP_Block ) ? (string) $block->name : ''
);
$dr_decls  = array_merge( $dr_decls, $dr_shadow['normal'] );
if ( $dr_decls ) {
	$scoped_css[] = $dr_sel . '{' . implode( ';', $dr_decls ) . ';}';
}
$scoped_css = array_merge( $scoped_css, $dr_border['rules'] );
if ( $dr_border['tablet'] ) {
	$scoped_css[] = sgs_emit_tier_decls( $dr_sel, array( 'tablet' => $dr_border['tablet'] ) );
}
if ( $dr_border['mobile'] ) {
	$scoped_css[] = sgs_emit_tier_decls( $dr_sel, array( 'mobile' => $dr_border['mobile'] ) );
}
if ( ! empty( $attributes['dateRingPadding'] ) && is_array( $attributes['dateRingPadding'] ) ) {
	$scoped_css[] = sgs_emit_responsive_css(
		$dr_sel,
		array(
			array(
				'value'        => $attributes['dateRingPadding'],
				'css'          => 'padding',
				'box'          => true,
				'unit_default' => 'px',
			),
		)
	);
}
if ( ! empty( $attributes['dateRingSize'] ) && is_array( $attributes['dateRingSize'] ) ) {
	$dr_size = sgs_emit_responsive_css(
		$root_sel,
		array(
			array(
				'value'        => $attributes['dateRingSize'],
				'css'          => '--sgs-date-ring-size',
				'unit_default' => 'px',
			),
		)
	);
	if ( '' !== $dr_size ) {
		$scoped_css[]           = $dr_size;
		$wrapper_args['class'] .= ' sgs-timeline--date-ring';
	}
}
