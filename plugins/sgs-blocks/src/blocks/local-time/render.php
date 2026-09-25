<?php
/**
 * Server-side render for sgs/local-time.
 *
 * A live clock for one IANA time zone. The SERVER always renders the current
 * time in the resolved zone (DateTimeImmutable + DateTimeZone), so a no-JS
 * visitor and a cached page both show a correct — if momentarily stale —
 * time. view.js (a viewScriptModule) corrects the displayed value on load
 * with Intl.DateTimeFormat and then ticks at the next second/minute edge.
 *
 * Zone resolution (includes/local-time-helpers.php::sgs_local_time_resolve_zone):
 * an empty or invalid `timeZone` attribute falls back to the SITE's own zone
 * (`wp_timezone()`), never a hard-coded UTC.
 *
 * NO-INLINE (Spec 32): every declaration is emitted into the block's own
 * scoped `.{uid}` <style> tag; the root/label/time elements carry zero
 * inline style="" declarations.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 3 ) . '/includes/local-time-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Read + sanitise attributes.
// ---------------------------------------------------------------------------

$time_zone_raw  = isset( $attributes['timeZone'] ) ? (string) $attributes['timeZone'] : '';
$label_text     = isset( $attributes['label'] ) ? (string) $attributes['label'] : '';
$label_position = isset( $attributes['labelPosition'] ) ? (string) $attributes['labelPosition'] : 'before';
if ( ! in_array( $label_position, array( 'before', 'after', 'above' ), true ) ) {
	$label_position = 'before';
}
$separator = isset( $attributes['separator'] ) ? (string) $attributes['separator'] : '';

$hour_cycle = isset( $attributes['hourCycle'] ) ? (string) $attributes['hourCycle'] : 'h23';
if ( ! in_array( $hour_cycle, array( 'h12', 'h23' ), true ) ) {
	$hour_cycle = 'h23';
}
$show_seconds = ! empty( $attributes['showSeconds'] );
$show_period  = ! isset( $attributes['showPeriod'] ) || ! empty( $attributes['showPeriod'] );

// ---------------------------------------------------------------------------
// 2. Resolve the zone and format the first-paint time.
// ---------------------------------------------------------------------------

$zone = sgs_local_time_resolve_zone( $time_zone_raw );
$now  = new DateTimeImmutable( 'now', $zone );

$display_text = sgs_local_time_display( $now, $hour_cycle, $show_seconds, $show_period );
$iso_datetime = $now->format( DATE_ATOM ); // Carries the UTC offset (Spec §A).
$zone_name    = $zone->getName();

// ---------------------------------------------------------------------------
// 3. Scoped CSS assembly.
// ---------------------------------------------------------------------------

$uid       = wp_unique_id( 'sgs-local-time-' );
$root_sel  = '.' . $uid . '.sgs-local-time';
$label_sel = $root_sel . ' .sgs-local-time__label';
$time_sel  = $root_sel . ' .sgs-local-time__time';

$scoped_css = array();

// Gap (root wrapper, object-tier — {desktop,tablet,mobile}, each a raw CSS
// length or a bare number treated as px).
$gap_obj = sgs_responsive_normalise_object( $attributes['gap'] ?? null );
if ( ! empty( array_filter( $gap_obj ) ) ) {
	$gap_css = sgs_emit_responsive_css(
		$root_sel,
		array(
			array(
				'value'        => $gap_obj,
				'css'          => 'gap',
				'unit_default' => 'px',
			),
		)
	);
	if ( '' !== $gap_css ) {
		$scoped_css[] = $gap_css;
	}
}

// Label colour (base/hover/gradient/hoverGradient) — the shared text-colour
// state emitter (helpers-colour-variants.php), same primitive collapsible-text's
// body text colour is built on top of.
$label_colour_css = sgs_text_states_css(
	$label_sel,
	$attributes,
	array(
		'base'           => 'labelColour',
		'hover'          => 'labelColourHover',
		'gradient'       => 'labelColourGradient',
		'hover_gradient' => 'labelColourHoverGradient',
	)
);
if ( '' !== $label_colour_css ) {
	$scoped_css[] = $label_colour_css;
}

// Time colour (base/hover/gradient/hoverGradient).
$time_colour_css = sgs_text_states_css(
	$time_sel,
	$attributes,
	array(
		'base'           => 'timeColour',
		'hover'          => 'timeColourHover',
		'gradient'       => 'timeColourGradient',
		'hover_gradient' => 'timeColourHoverGradient',
	)
);
if ( '' !== $time_colour_css ) {
	$scoped_css[] = $time_colour_css;
}

// Typography — one call per element (label, time), the same
// sgs_typography_css_rule() mechanism as sgs/collapsible-text and
// sgs/countdown-timer's numbered digits.
$label_typography_css = sgs_typography_css_rule( $attributes, 'label', $label_sel );
if ( '' !== $label_typography_css ) {
	$scoped_css[] = $label_typography_css;
}
$time_typography_css = sgs_typography_css_rule( $attributes, 'time', $time_sel );
if ( '' !== $time_typography_css ) {
	$scoped_css[] = $time_typography_css;
}

// ---------------------------------------------------------------------------
// 4. Wrapper + markup.
// ---------------------------------------------------------------------------

$wrapper_classes = array( 'sgs-local-time', $uid, 'sgs-local-time--' . $label_position );

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'id'    => $uid,
		'class' => implode( ' ', $wrapper_classes ),
	)
);

$label_html = '';
if ( '' !== $label_text ) {
	$label_html = '<span class="sgs-local-time__label">' . esc_html( $label_text ) . '</span>';
}

$sep_html = '';
if ( '' !== $separator && 'above' !== $label_position ) {
	$sep_html = '<span class="sgs-local-time__sep" aria-hidden="true">' . esc_html( $separator ) . '</span>';
}

$time_html = '<time class="sgs-local-time__time" datetime="' . esc_attr( $iso_datetime ) . '" data-zone="' . esc_attr( $zone_name ) . '" data-cycle="' . esc_attr( $hour_cycle ) . '" data-seconds="' . ( $show_seconds ? '1' : '0' ) . '" data-show-period="' . ( $show_period ? '1' : '0' ) . '">' . esc_html( $display_text ) . '</time>';

if ( 'after' === $label_position ) {
	$children_html = $time_html . $sep_html . $label_html;
} elseif ( 'above' === $label_position ) {
	$children_html = $label_html . $time_html;
} else {
	$children_html = $label_html . $sep_html . $time_html;
}

$output = '';

if ( $scoped_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised by the shared emitters; wp_strip_all_tags guards </style>.
	$output .= '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}

$output .= '<div ' . $wrapper_attrs . '>' . $children_html . '</div>';

echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from get_block_wrapper_attributes(), esc_html(), esc_attr(), and first-party CSS.
