<?php
/**
 * Timeline partial: the pinned-horizontal settings (header row with progress counter, bar and hint, proximity focus,
 * active-entry year look, pin length, card transition).
 *
 * Required by render.php, runs in its scope. Reads `$attributes`, `$scroll_effect`, `$entries`, `$root_sel`; appends to
 * `$scoped_css` and to `$wrapper_args['class']`; sets `$hp_wrapper_args` (data attributes the motion engine reads on the
 * root) and `$hp_counter_html` (the header: the bare counter, or the header row holding the counter, bar and hint;
 * already escaped). Nothing here applies unless the scroll effect is `pinned-horizontal`.
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

// Travel end: the engine reads this (horizontal-panel-params.js::ATTRS.travelEnd). The default `first-start` prints nothing.
if ( 'track-end' === ( $attributes['panelTravelEnd'] ?? '' ) ) {
	$hp_wrapper_args['data-sgs-fx-horizontal-panel-travel-end'] = 'track-end';
}

// Progress counter: a scroll-progress element reading the pin's progress (fx-scroll-progress.js, source `pin`).
$hp_counter_only = '';
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
	// `active` makes the counter read the card nearest the centre instead of the scroll progress.
	$hp_basis_attr   = 'active' === ( $attributes['panelCounterBasis'] ?? '' ) ? ' data-sgs-fx-scroll-progress-counter-basis="active"' : '';
	$hp_counter_only = sprintf(
		'<p class="sgs-timeline__counter" data-sgs-fx="scroll-progress" data-sgs-fx-scroll-progress-source="pin" data-sgs-fx-scroll-progress-output="counter" data-sgs-fx-scroll-progress-counter-format="%1$s"%3$s>%2$s</p>',
		esc_attr( $hp_format ),
		esc_html( $hp_text ),
		$hp_basis_attr
	);
}
$hp_counter_html = $hp_counter_only;

// Header row: the counter, a progress bar and a hint on one line above the cards. Built only when the bar is on or a
// hint is set; otherwise the counter stays the bare element above.
$hp_bar     = ! empty( $attributes['panelProgressBar'] );
$hp_hint    = trim( (string) ( $attributes['panelHint'] ?? '' ) );
$hp_has_row = $hp_bar || '' !== $hp_hint;
if ( $hp_has_row ) {
	$hp_counter_html  = '<div class="sgs-timeline__panel-row">' . $hp_counter_only;
	$hp_counter_html .= $hp_bar ? '<div class="sgs-timeline__panel-track" aria-hidden="true"><span class="sgs-timeline__panel-fill"></span></div>' : '';
	$hp_counter_html .= '' !== $hp_hint ? '<span class="sgs-timeline__panel-hint">' . esc_html( $hp_hint ) . '</span>' : '';
	$hp_counter_html .= '</div>';
	// The row replaces the timeline's own connector while the pin runs (style.scss hides it behind this class).
	$wrapper_args['class'] .= ' sgs-timeline--panel-row';

	$hp_row_decls = array();
	if ( isset( $attributes['panelRowGap'] ) && is_numeric( $attributes['panelRowGap'] ) ) {
		$hp_row_decls[] = 'gap:' . max( 0.0, min( 400.0, (float) $attributes['panelRowGap'] ) ) . 'px';
	}
	if ( isset( $attributes['panelRowSpacing'] ) && is_numeric( $attributes['panelRowSpacing'] ) ) {
		$hp_row_decls[] = 'margin-bottom:' . max( 0.0, min( 400.0, (float) $attributes['panelRowSpacing'] ) ) . 'px';
	}
	if ( $hp_row_decls ) {
		$scoped_css[] = $root_sel . ' .sgs-timeline__panel-row{' . implode( ';', $hp_row_decls ) . ';}';
	}

	if ( $hp_bar ) {
		$hp_track_decls = array();
		if ( isset( $attributes['panelBarHeight'] ) && is_numeric( $attributes['panelBarHeight'] ) ) {
			$hp_track_decls[] = 'height:' . max( 1.0, min( 40.0, (float) $attributes['panelBarHeight'] ) ) . 'px';
		}
		$hp_track_col = sgs_colour_value( (string) ( $attributes['panelBarTrackColour'] ?? '' ) );
		if ( '' !== $hp_track_col ) {
			$hp_track_decls[] = 'background-color:' . $hp_track_col;
		}
		if ( $hp_track_decls ) {
			$scoped_css[] = $root_sel . ' .sgs-timeline__panel-track{' . implode( ';', $hp_track_decls ) . ';}';
		}
		$hp_fill_decl = sgs_background_paint_decl( (string) ( $attributes['panelBarFillColour'] ?? '' ), (string) ( $attributes['panelBarFillGradient'] ?? '' ) );
		if ( '' !== $hp_fill_decl ) {
			$scoped_css[] = $root_sel . ' .sgs-timeline__panel-fill{' . $hp_fill_decl . ';}';
		}
	}
}

// Content column: the root's side padding becomes max(gutter, (100% - max width) / 2 + gutter) per device, so the counter
// row and the card strip share one centred column. Each tier reads the nearest set value at or above it.
$hp_max_tiers    = sgs_responsive_normalise_object( $attributes['panelContentMaxWidth'] ?? null, false );
$hp_gutter_tiers = sgs_responsive_normalise_object( $attributes['panelContentGutter'] ?? null, false );
$hp_pad_value    = array();
$hp_last_max     = null;
$hp_last_gutter  = null;
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $hp_tier ) {
	$hp_last_max    = is_numeric( $hp_max_tiers[ $hp_tier ] ?? null ) && (float) $hp_max_tiers[ $hp_tier ] > 0 ? (float) $hp_max_tiers[ $hp_tier ] : $hp_last_max;
	$hp_last_gutter = is_numeric( $hp_gutter_tiers[ $hp_tier ] ?? null ) ? max( 0.0, (float) $hp_gutter_tiers[ $hp_tier ] ) : $hp_last_gutter;
	if ( null === $hp_last_max && null === $hp_last_gutter ) {
		continue;
	}
	$hp_gut = null === $hp_last_gutter ? 40.0 : $hp_last_gutter;
	$hp_pad_value[ $hp_tier ] = null === $hp_last_max
		? $hp_gut . 'px'
		: 'max(' . $hp_gut . 'px, calc((100% - ' . $hp_last_max . 'px) / 2 + ' . $hp_gut . 'px))';
}
if ( $hp_pad_value ) {
	// The pin runs from 768px up; below that the timeline keeps its own padding.
	$scoped_css[] = SGS_Breakpoints::media( 'tablet-up' ) . '{'
		. sgs_emit_responsive_css( $root_sel, array( array( 'value' => $hp_pad_value, 'css' => 'padding-inline' ) ) )
		. '}';
}

// Counter and hint text: colour and typography (each helper call names its prefix as a literal).
$hp_counter_decls = sgs_text_decls( $attributes, array( 'base' => 'counterColour' ) );
if ( $hp_counter_decls['normal'] ) {
	$scoped_css[] = $root_sel . ' .sgs-timeline__counter{' . implode( ';', $hp_counter_decls['normal'] ) . ';}';
}
$hp_counter_type_css = sgs_typography_css_rule( $attributes, 'counter', $root_sel . ' .sgs-timeline__counter' );
if ( '' !== $hp_counter_type_css ) {
	$scoped_css[] = $hp_counter_type_css;
}
$hp_hint_decls = sgs_text_decls( $attributes, array( 'base' => 'hintColour' ) );
if ( $hp_hint_decls['normal'] ) {
	$scoped_css[] = $root_sel . ' .sgs-timeline__panel-hint{' . implode( ';', $hp_hint_decls['normal'] ) . ';}';
}
$hp_hint_type_css = sgs_typography_css_rule( $attributes, 'hint', $root_sel . ' .sgs-timeline__panel-hint' );
if ( '' !== $hp_hint_type_css ) {
	$scoped_css[] = $hp_hint_type_css;
}

// Pin length and tail: the per-device custom properties horizontal-panel-params.js reads (vh per card, vh after the last).
$hp_pin_specs = array();
foreach ( array( 'panelPinLength' => '--sgs-horizontal-panel-pin-length', 'panelPinTail' => '--sgs-horizontal-panel-pin-tail' ) as $hp_key => $hp_prop ) {
	if ( isset( $attributes[ $hp_key ] ) && is_array( $attributes[ $hp_key ] ) && $attributes[ $hp_key ] ) {
		$hp_pin_specs[] = array(
			'value'        => $attributes[ $hp_key ],
			'css'          => $hp_prop,
			'unit_default' => 'vh',
		);
	}
}
if ( $hp_pin_specs ) {
	$scoped_css[] = sgs_emit_responsive_css( $root_sel, $hp_pin_specs );
}

// Card transition: the year colour (fill and outline) and the card opacity and scale ease over this many milliseconds
// when the active card changes.
$hp_transition_ms = isset( $attributes['panelTransitionMs'] ) && is_numeric( $attributes['panelTransitionMs'] )
	? max( 0, min( 3000, (int) $attributes['panelTransitionMs'] ) )
	: 0;
if ( $hp_transition_ms > 0 ) {
	$scoped_css[] = '@media (prefers-reduced-motion:no-preference){'
		. $root_sel . ' .sgs-timeline__date{transition:color ' . $hp_transition_ms . 'ms ease,-webkit-text-stroke-color ' . $hp_transition_ms . 'ms ease;}'
		. $root_sel . ' .sgs-timeline__entry{transition:opacity ' . $hp_transition_ms . 'ms ease,scale ' . $hp_transition_ms . 'ms ease;}'
		. '}';
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
