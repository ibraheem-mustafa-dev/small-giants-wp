<?php
/**
 * Server-side render for Textarea Field block.
 *
 * The character counter sits below the box by default. counterPlacement "inside" wraps the box and the counter in one
 * positioned element so the counter rests at the box's bottom right; counterFontSize and counterColour are a scoped
 * rule on the field's uid class, never an inline style.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-colour-variants.php';

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_label;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_error;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;
use function SGS\Blocks\Forms\field_input_attrs;
use function SGS\Blocks\Forms\field_default_value;
use function SGS\Blocks\Forms\field_counter;

$fid  = field_id( $attributes['fieldName'] ?? 'unnamed' );
$rows = absint( $attributes['rows'] ?? 4 );

$sgs_ta_counter         = field_counter( $fid, $attributes );
$sgs_ta_inside          = '' !== $sgs_ta_counter && 'inside' === ( $attributes['counterPlacement'] ?? 'below' );
$sgs_ta_uid             = 'sgs-ta-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_ta_css             = '';
$sgs_ta_counter_text    = sgs_text_decls( $attributes, array( 'base' => 'counterColour' ) );
$sgs_ta_counter_size    = $attributes['counterFontSize'] ?? null;
$sgs_ta_counter_decls   = empty( $sgs_ta_counter_text['normal'] ) ? '' : implode( ';', $sgs_ta_counter_text['normal'] ) . ';';
if ( '' !== $sgs_ta_counter && '' !== $sgs_ta_counter_decls ) {
	$sgs_ta_css .= '.' . $sgs_ta_uid . ' .sgs-form-field__counter{' . $sgs_ta_counter_decls . '}';
}
if ( '' !== $sgs_ta_counter && is_array( $sgs_ta_counter_size ) && array() !== $sgs_ta_counter_size ) {
	$sgs_ta_css .= sgs_emit_responsive_css(
		'.' . $sgs_ta_uid . ' .sgs-form-field__counter',
		array(
			array(
				'value'     => $sgs_ta_counter_size,
				'css'       => 'font-size',
				'transform' => static fn( $raw ): string => is_numeric( $raw ) ? (string) (float) $raw . 'px' : sgs_css_single_length_value( $raw ),
			),
		)
	);
}

// The box itself: per-device minimum height and padding, and the line height. Each is opt-in; the chained
// field class lifts the rule above the form-level field rules. With the counter inside, the stylesheet keeps the
// bottom padding that leaves room under the typed text, so a custom bottom padding does not apply there.
$sgs_ta_sel    = '.' . $sgs_ta_uid . '.sgs-form-field textarea.sgs-form-field__input';
$sgs_ta_height = $attributes['inputMinHeight'] ?? null;
if ( is_array( $sgs_ta_height ) && array() !== $sgs_ta_height ) {
	$sgs_ta_css .= sgs_emit_responsive_css(
		$sgs_ta_sel,
		array(
			array(
				'value'     => $sgs_ta_height,
				'css'       => 'min-height',
				'transform' => static fn( $raw ): string => is_numeric( $raw ) ? (string) (float) $raw . 'px' : sgs_css_single_length_value( $raw ),
			),
		)
	);
}
$sgs_ta_padding = $attributes['inputPadding'] ?? null;
if ( is_array( $sgs_ta_padding ) && array() !== $sgs_ta_padding ) {
	$sgs_ta_css .= sgs_emit_responsive_css(
		$sgs_ta_sel,
		array(
			array(
				'value'        => $sgs_ta_padding,
				'css'          => 'padding',
				'box'          => true,
				'unit_default' => 'px',
			),
		)
	);
}
$sgs_ta_line_height = sgs_css_single_length_value( (string) ( $attributes['inputLineHeight'] ?? '' ) );
if ( '' !== $sgs_ta_line_height ) {
	$sgs_ta_css .= $sgs_ta_sel . '{line-height:' . $sgs_ta_line_height . ';}';
}

$sgs_ta_classes = array();
if ( '' !== $sgs_ta_css ) {
	$sgs_ta_classes[] = $sgs_ta_uid;
	echo '<style>' . wp_strip_all_tags( $sgs_ta_css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from sanitised colour and length values.
}
if ( $sgs_ta_inside ) {
	$sgs_ta_classes[] = 'sgs-form-field--counter-inside';
}

$sgs_ta_box = '<textarea class="sgs-form-field__input" rows="' . $rows . '" ' . field_input_attrs( $fid, $attributes, false ) . '>' . esc_html( field_default_value( $attributes, true ) ) . '</textarea>';

echo field_open( $attributes, 'textarea', implode( ' ', $sgs_ta_classes ) );
echo field_label( $fid, $attributes );
if ( $sgs_ta_inside ) {
	echo '<div class="sgs-form-field__control">' . $sgs_ta_box . $sgs_ta_counter . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- both parts are escaped by their builders.
} else {
	echo $sgs_ta_box . $sgs_ta_counter; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- both parts are escaped by their builders.
}
echo field_error( $fid );
echo field_help( $fid, $attributes );
echo field_close();
