<?php
/**
 * Server-side render for sgs/diagram-dimension.
 *
 * One measurement inside an sgs/measured-diagram: a line over the drawing and
 * a label with a caption and a value.
 *
 *   <li class="wp-block-sgs-diagram-dimension sgs-diagram-dimension {uid} …">
 *     <span class="sgs-diagram-dimension__overlay" aria-hidden="true">
 *       <svg class="sgs-diagram-dimension__lines" viewBox="0 0 W H" …>
 *         <path class="…__guides" d/> <path class="…__line" d/> <path class="…__ends" d/>
 *         <circle class="…__dot" cx cy r/>
 *       </svg>
 *       <span class="sgs-diagram-dimension__marker"></span>
 *     </span>
 *     <span class="sgs-diagram-dimension__number" aria-hidden="true"></span>
 *     <span class="sgs-diagram-dimension__label">
 *       <span class="…__caption">Lens width</span> <span class="…__value">52 mm</span>
 *     </span>
 *   </li>
 *
 * The SVG carries ONLY geometry attributes (viewBox, preserveAspectRatio, d,
 * cx, cy, r). Every stroke, fill, width, dash and `vector-effect` comes from
 * the stylesheets and the parent's scoped rules. The path data comes from the
 * tested geometry twin, sgs_diagram_dimension_paths(); the viewBox is the
 * drawing's own size, passed down by the parent through block context.
 *
 * Reading order is always caption then value; `labelOrder` only flips the
 * visual stacking with CSS, so a screen reader hears "Lens width 52 mm".
 *
 * A value bound to `sgs-product/field` arrives already wrapped in the
 * binding's `.sgs-bound` span. When that bound value is empty on first paint
 * but varies by size, an empty marker span is printed instead so a size that
 * has the value can fill it; `hideWhenEmpty` hides the whole measurement
 * (line and label) while it is empty, via `:has([data-sgs-bound-empty])`.
 *
 * NO-INLINE (Spec 32): the label position and the numbered marker's position
 * are rules in this block's own `.{uid}`-scoped <style>.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Unused (no inner blocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$sgs_dd_context = ( $block instanceof WP_Block ) ? $block->context : array();
list( $sgs_dd_w, $sgs_dd_h ) = sgs_measured_diagram_box(
	$sgs_dd_context['sgs/measuredDiagramWidth'] ?? null,
	$sgs_dd_context['sgs/measuredDiagramHeight'] ?? null
);
$sgs_dd_tick = $sgs_dd_context['sgs/measuredDiagramTickLength'] ?? null;

// ── Enums (strict allow-lists) ──────────────────────────────────────────────
$sgs_dd_kind        = isset( $attributes['kind'] ) && in_array( $attributes['kind'], array( 'dimension', 'leader' ), true ) ? $attributes['kind'] : 'dimension';
$sgs_dd_end_style   = isset( $attributes['endStyle'] ) && in_array( $attributes['endStyle'], array( 'tick', 'arrow', 'dot', 'none' ), true ) ? $attributes['endStyle'] : 'tick';
$sgs_dd_orientation = isset( $attributes['orientation'] ) && in_array( $attributes['orientation'], array( 'horizontal', 'vertical', 'free' ), true ) ? $attributes['orientation'] : 'horizontal';
$sgs_dd_align       = isset( $attributes['labelAlign'] ) && in_array( $attributes['labelAlign'], array( 'start', 'center', 'end' ), true ) ? $attributes['labelAlign'] : 'center';
$sgs_dd_order       = isset( $attributes['labelOrder'] ) && in_array( $attributes['labelOrder'], array( 'captionFirst', 'valueFirst' ), true ) ? $attributes['labelOrder'] : 'captionFirst';
$sgs_dd_hide_empty  = ! isset( $attributes['hideWhenEmpty'] ) || ! empty( $attributes['hideWhenEmpty'] );

// ── Geometry (% of the drawing box, clamped 0–100) ──────────────────────────
$sgs_dd_sx = sgs_measured_diagram_pct( $attributes['startX'] ?? null, 20.0 );
$sgs_dd_sy = sgs_measured_diagram_pct( $attributes['startY'] ?? null, 50.0 );
$sgs_dd_ex = sgs_measured_diagram_pct( $attributes['endX'] ?? null, 80.0 );
$sgs_dd_ey = sgs_measured_diagram_pct( $attributes['endY'] ?? null, 50.0 );
// The orientation lock the editor applies while dragging, applied again here
// so a hand-written tree with slightly off-axis numbers still draws straight.
if ( 'horizontal' === $sgs_dd_orientation ) {
	$sgs_dd_ey = $sgs_dd_sy;
} elseif ( 'vertical' === $sgs_dd_orientation ) {
	$sgs_dd_ex = $sgs_dd_sx;
}

$sgs_dd_paths = sgs_diagram_dimension_paths(
	array(
		'startX'       => $sgs_dd_sx,
		'startY'       => $sgs_dd_sy,
		'endX'         => $sgs_dd_ex,
		'endY'         => $sgs_dd_ey,
		'kind'         => $sgs_dd_kind,
		'endStyle'     => $sgs_dd_end_style,
		'extReach'     => $attributes['extReach'] ?? null,
		'extReachEnd'  => $attributes['extReachEnd'] ?? null,
		'extOvershoot' => $attributes['extOvershoot'] ?? null,
		'tickLength'   => $sgs_dd_tick,
	),
	$sgs_dd_w,
	$sgs_dd_h
);

// ── Caption and value ───────────────────────────────────────────────────────
$sgs_dd_kses      = sgs_diagram_dimension_text_kses();
$sgs_dd_caption   = wp_kses( (string) ( $attributes['caption'] ?? '' ), $sgs_dd_kses );
$sgs_dd_value     = wp_kses( (string) ( $attributes['value'] ?? '' ), $sgs_dd_kses );
$sgs_dd_is_bound  = isset( $attributes['metadata']['bindings']['value'] );
$sgs_dd_marker    = '';
$sgs_dd_has_value = '' !== trim( $sgs_dd_value );

if ( ! $sgs_dd_has_value && $sgs_dd_is_bound ) {
	$sgs_dd_marker = sgs_diagram_dimension_empty_marker( $attributes, $block );
	// Bound, empty, and no other size can fill it: nothing to measure here.
	if ( '' === $sgs_dd_marker && $sgs_dd_hide_empty ) {
		return;
	}
}
if ( '' === trim( $sgs_dd_caption ) && ! $sgs_dd_has_value && '' === $sgs_dd_marker ) {
	return;
}

// ── Scoped CSS: label position per tier, marker at the line's midpoint ─────
$uid        = wp_unique_id( 'sgs-diagram-dimension-' );
$scoped_css = array();

$sgs_dd_mid_x = ( $sgs_dd_sx + $sgs_dd_ex ) / 2;
$sgs_dd_mid_y = ( $sgs_dd_sy + $sgs_dd_ey ) / 2;

$scoped_css[] = sgs_emit_responsive_css(
	'.' . $uid . ' .sgs-diagram-dimension__label',
	array(
		array(
			'value'        => sgs_measured_diagram_pct_tiers( $attributes['labelX'] ?? null, $sgs_dd_mid_x ),
			'css'          => 'left',
			'unit_default' => '%',
		),
		array(
			'value'        => sgs_measured_diagram_pct_tiers( $attributes['labelY'] ?? null, $sgs_dd_mid_y ),
			'css'          => 'top',
			'unit_default' => '%',
		),
	)
);
$scoped_css[] = '.' . $uid . ' .sgs-diagram-dimension__marker{left:' . sgs_diagram_fmt( $sgs_dd_mid_x ) . '%;top:' . sgs_diagram_fmt( $sgs_dd_mid_y ) . '%;}';
$scoped_css   = array_filter( $scoped_css );

// ── Markup ──────────────────────────────────────────────────────────────────
$sgs_dd_svg  = '<svg class="sgs-diagram-dimension__lines" viewBox="0 0 ' . esc_attr( sgs_diagram_fmt( $sgs_dd_w ) ) . ' ' . esc_attr( sgs_diagram_fmt( $sgs_dd_h ) ) . '" preserveAspectRatio="none" aria-hidden="true" focusable="false">';
$sgs_dd_svg .= '' !== $sgs_dd_paths['guides'] ? '<path class="sgs-diagram-dimension__guides" d="' . esc_attr( $sgs_dd_paths['guides'] ) . '"/>' : '';
$sgs_dd_svg .= '' !== $sgs_dd_paths['line'] ? '<path class="sgs-diagram-dimension__line" d="' . esc_attr( $sgs_dd_paths['line'] ) . '"/>' : '';
$sgs_dd_svg .= '' !== $sgs_dd_paths['ends'] ? '<path class="sgs-diagram-dimension__ends" d="' . esc_attr( $sgs_dd_paths['ends'] ) . '"/>' : '';
if ( $sgs_dd_paths['dots'] ) {
	$sgs_dd_r = sgs_measured_diagram_dot_radius( $sgs_dd_tick, $sgs_dd_w );
	foreach ( $sgs_dd_paths['dots'] as $sgs_dd_dot ) {
		$sgs_dd_svg .= '<circle class="sgs-diagram-dimension__dot" cx="' . esc_attr( $sgs_dd_dot['cx'] ) . '" cy="' . esc_attr( $sgs_dd_dot['cy'] ) . '" r="' . esc_attr( $sgs_dd_r ) . '"/>';
	}
}
$sgs_dd_svg .= '</svg>';

$sgs_dd_label = '<span class="sgs-diagram-dimension__label">';
if ( '' !== trim( $sgs_dd_caption ) ) {
	$sgs_dd_label .= '<span class="sgs-diagram-dimension__caption">' . $sgs_dd_caption . '</span> ';
}
if ( $sgs_dd_has_value || '' !== $sgs_dd_marker ) {
	$sgs_dd_label .= '<span class="sgs-diagram-dimension__value">' . $sgs_dd_value . $sgs_dd_marker . '</span>';
}
$sgs_dd_label .= '</span>';

$sgs_dd_classes = array(
	'sgs-diagram-dimension',
	$uid,
	'sgs-diagram-dimension--' . $sgs_dd_kind,
	'sgs-diagram-dimension--align-' . $sgs_dd_align,
	'valueFirst' === $sgs_dd_order ? 'sgs-diagram-dimension--value-first' : 'sgs-diagram-dimension--caption-first',
);
if ( $sgs_dd_hide_empty ) {
	$sgs_dd_classes[] = 'sgs-diagram-dimension--hide-empty';
}

$sgs_dd_wrapper = get_block_wrapper_attributes( array( 'class' => implode( ' ', $sgs_dd_classes ) ) );

if ( $scoped_css ) {
	echo '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- numeric values from clamped floats, emitted through the shared responsive emitter.
}

printf(
	'<li %1$s><span class="sgs-diagram-dimension__overlay" aria-hidden="true">%2$s<span class="sgs-diagram-dimension__marker"></span></span><span class="sgs-diagram-dimension__number" aria-hidden="true"></span>%3$s</li>',
	$sgs_dd_wrapper, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes.
	$sgs_dd_svg, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- geometry attributes built from esc_attr()'d numbers above.
	$sgs_dd_label // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- caption and value passed through wp_kses() with a narrow list.
);
