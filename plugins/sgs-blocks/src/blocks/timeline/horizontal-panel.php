<?php
/**
 * Timeline partial: the pinned-horizontal settings (progress counter, proximity focus, active-entry year look).
 *
 * Required by render.php, runs in its scope. Reads `$attributes`, `$scroll_effect`, `$entries`, `$root_sel`; appends to
 * `$scoped_css`; sets `$hp_wrapper_args` (data attributes the motion engine reads on the root) and `$hp_counter_html`
 * (the counter element, already escaped). Nothing here applies unless the scroll effect is `pinned-horizontal`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$hp_wrapper_args = array();
$hp_counter_html = '';

if ( 'pinned-horizontal' !== $scroll_effect ) {
	return;
}

// Proximity focus: the engine reads these attributes (horizontal-panel-params.js::ATTRS). An unset number keeps the engine default.
if ( ! empty( $attributes['panelProximityFocus'] ) ) {
	$hp_wrapper_args['data-sgs-fx-horizontal-panel-proximity-focus'] = 'true';
	$hp_focus_limits = array(
		'panelFocusScale'   => array( 'data-sgs-fx-horizontal-panel-focus-scale', 2.0 ),
		'panelEdgeScale'    => array( 'data-sgs-fx-horizontal-panel-edge-scale', 2.0 ),
		'panelFocusOpacity' => array( 'data-sgs-fx-horizontal-panel-focus-opacity', 1.0 ),
		'panelEdgeOpacity'  => array( 'data-sgs-fx-horizontal-panel-edge-opacity', 1.0 ),
	);
	foreach ( $hp_focus_limits as $hp_key => $hp_spec ) {
		if ( isset( $attributes[ $hp_key ] ) && is_numeric( $attributes[ $hp_key ] ) ) {
			$hp_wrapper_args[ $hp_spec[0] ] = (string) max( 0.0, min( $hp_spec[1], (float) $attributes[ $hp_key ] ) );
		}
	}
}

// Progress counter: a scroll-progress element reading the pin's progress (fx-scroll-progress.js, source `pin`).
if ( ! empty( $attributes['panelCounter'] ) && count( $entries ) > 0 ) {
	$hp_format = $attributes['panelCounterFormat'] ?? 'padded-index-of-total';
	$hp_format = in_array( $hp_format, array( 'padded-index-of-total', 'index-of-total', 'percent' ), true ) ? $hp_format : 'padded-index-of-total';
	$hp_total  = count( $entries );
	$hp_width  = max( 2, strlen( (string) $hp_total ) );
	if ( 'padded-index-of-total' === $hp_format ) {
		$hp_text = str_pad( '1', $hp_width, '0', STR_PAD_LEFT ) . ' / ' . str_pad( (string) $hp_total, $hp_width, '0', STR_PAD_LEFT );
	} elseif ( 'index-of-total' === $hp_format ) {
		$hp_text = '1 / ' . $hp_total;
	} else {
		$hp_text = '0%';
	}
	$hp_counter_html = sprintf(
		'<p class="sgs-timeline__counter" data-sgs-fx="scroll-progress" data-sgs-fx-scroll-progress-source="pin" data-sgs-fx-scroll-progress-output="counter" data-sgs-fx-scroll-progress-counter-format="%1$s">%2$s</p>',
		esc_attr( $hp_format ),
		esc_html( $hp_text )
	);
}

// Active-entry year: the engine marks the entry nearest the centre with `data-sgs-fx-panel-active`.
$hp_active_sel   = $root_sel . ' [data-sgs-fx-panel-active] .sgs-timeline__date';
$hp_active_decls = array();
$hp_active_col   = sgs_colour_value( (string) ( $attributes['dateActiveColour'] ?? '' ) );
if ( '' !== $hp_active_col ) {
	$hp_active_decls[] = 'color:' . $hp_active_col;
}
$hp_stroke_col = sgs_colour_value( (string) ( $attributes['dateActiveTextStrokeColour'] ?? '' ) );
if ( '' !== $hp_stroke_col ) {
	$hp_active_decls[] = '-webkit-text-stroke-color:' . $hp_stroke_col;
}
if ( $hp_active_decls ) {
	$scoped_css[] = $hp_active_sel . '{' . implode( ';', $hp_active_decls ) . ';}';
}
if ( isset( $attributes['dateActiveTextStrokeWidth'] ) && is_array( $attributes['dateActiveTextStrokeWidth'] ) ) {
	$scoped_css[] = sgs_emit_responsive_css(
		$hp_active_sel,
		array(
			array(
				'value'        => $attributes['dateActiveTextStrokeWidth'],
				'css'          => '-webkit-text-stroke-width',
				'unit_default' => 'px',
			),
		)
	);
}
