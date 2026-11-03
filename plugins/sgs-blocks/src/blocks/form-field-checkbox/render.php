<?php
/**
 * Server-side render for Checkbox Field block.
 *
 * Uses <fieldset> + <legend> so that the group label is correctly
 * associated with all checkbox inputs — assistive technology reads the
 * legend as context for each individual option.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-colour-variants.php';

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_error;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;
use function SGS\Blocks\Forms\field_submission_name;
use function SGS\Blocks\Forms\field_message_attrs;

$fid      = field_id( $attributes['fieldName'] ?? 'unnamed' );
$options  = $attributes['options'] ?? array();
$name     = esc_attr( field_submission_name( $fid, $attributes ) ) . '[]';
$label    = $attributes['label'] ?? '';
$required = ! empty( $attributes['required'] );
$help_text = $attributes['helpText'] ?? '';

// Build aria-describedby: always reference the error span; add help ID when present.
$described_by = array( $fid . '-error' );
if ( ! empty( $help_text ) ) {
	$described_by[] = $fid . '-help';
}
$described_by_attr = 'aria-describedby="' . esc_attr( implode( ' ', $described_by ) ) . '"';

$msg_attrs = field_message_attrs( $attributes );

// Card presentation (optionPresentation "card"): a boxed row and a custom tick box, as one scoped rule set on the
// field's uid class; never an inline style. Plain keeps the stylesheet's bare row and prints nothing.
$sgs_cb_class = '';
if ( 'card' === ( $attributes['optionPresentation'] ?? 'plain' ) ) {
	$sgs_cb_uid   = 'sgs-cb-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
	$sgs_cb_class = 'sgs-form-field--option-card ' . $sgs_cb_uid;
	$sgs_cb_row   = '.' . $sgs_cb_uid . ' .sgs-form-field__option';
	$sgs_cb_len   = static fn( $raw ): string => is_numeric( $raw ) ? (string) (float) $raw . 'px' : sgs_css_single_length_value( (string) $raw );
	$sgs_cb_css   = '';

	$sgs_cb_decls = array();
	$sgs_cb_bg    = sgs_fill_decls( $attributes, array( 'base' => 'rowBackground' ) );
	$sgs_cb_decls = array_merge( $sgs_cb_decls, $sgs_cb_bg['normal'] );
	$sgs_cb_gap = $sgs_cb_len( $attributes['rowGap'] ?? '' );
	if ( '' !== $sgs_cb_gap ) {
		$sgs_cb_decls[] = 'gap:' . $sgs_cb_gap;
	}
	$sgs_cb_border = sgs_border_element_decls(
		$attributes,
		'row',
		$sgs_cb_row,
		array(
			'colour'         => array( 'base' => 'rowBorderColour' ),
			'colour_default' => 'currentColor',
		)
	);
	$sgs_cb_decls  = array_merge( $sgs_cb_decls, $sgs_cb_border['base'] );
	if ( $sgs_cb_decls ) {
		$sgs_cb_css .= $sgs_cb_row . '{' . implode( ';', $sgs_cb_decls ) . ';}';
	}
	if ( $sgs_cb_border['tablet'] ) {
		$sgs_cb_css .= '@media(max-width:1023px){' . $sgs_cb_row . '{' . implode( ';', $sgs_cb_border['tablet'] ) . ';}}';
	}
	if ( $sgs_cb_border['mobile'] ) {
		$sgs_cb_css .= '@media(max-width:767px){' . $sgs_cb_row . '{' . implode( ';', $sgs_cb_border['mobile'] ) . ';}}';
	}
	$sgs_cb_css .= implode( '', $sgs_cb_border['rules'] );
	if ( is_array( $attributes['rowPadding'] ?? null ) && array() !== $attributes['rowPadding'] ) {
		$sgs_cb_css .= sgs_emit_responsive_css(
			$sgs_cb_row,
			array(
				array(
					'value'        => $attributes['rowPadding'],
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
			)
		);
	}
	$sgs_cb_vars = array();
	$sgs_cb_size = $sgs_cb_len( $attributes['boxSize'] ?? '' );
	if ( '' !== $sgs_cb_size ) {
		$sgs_cb_vars[] = '--sgs-option-box-size:' . $sgs_cb_size;
	}
	$sgs_cb_rad = $sgs_cb_len( $attributes['boxRadius'] ?? '' );
	if ( '' !== $sgs_cb_rad ) {
		$sgs_cb_vars[] = '--sgs-option-box-radius:' . $sgs_cb_rad;
	}
	$sgs_cb_on = sgs_fill_decls( $attributes, array( 'base' => 'boxColourChecked' ) );
	if ( $sgs_cb_on['normal'] ) {
		$sgs_cb_css .= $sgs_cb_row . ' input[type="checkbox"]:checked{' . implode( ';', $sgs_cb_on['normal'] ) . ';border-color:' . sgs_colour_value( (string) ( $attributes['boxColourChecked'] ?? '' ) ) . ';}';
	}
	if ( $sgs_cb_vars ) {
		$sgs_cb_css .= '.' . $sgs_cb_uid . '{' . implode( ';', $sgs_cb_vars ) . ';}';
	}
	if ( '' !== $sgs_cb_css ) {
		echo '<style>' . wp_strip_all_tags( $sgs_cb_css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from sanitised colour and length values.
	}
}

echo field_open( $attributes, 'checkbox', $sgs_cb_class );

echo '<fieldset class="sgs-form-field__group">';

if ( ! empty( $label ) ) {
	echo '<legend class="sgs-form-field__label">';
	echo sgs_rich_text_kses( (string) $label, false );
	if ( $required ) {
		echo ' <span class="sgs-form-field__required" aria-hidden="true">*</span>';
	}
	echo '</legend>';
}

foreach ( $options as $i => $option ) {
	// Normalise: handle both plain strings and {value, label} objects.
	if ( is_string( $option ) ) {
		$opt_value = $option;
		$opt_label = $option;
		$opt_on    = false;
	} else {
		$opt_value = $option['value'] ?? '';
		$opt_label = $option['label'] ?? '';
		$opt_on    = ! empty( $option['checked'] );
	}
	$option_id = $fid . '-' . $i;
	echo '<label class="sgs-form-field__option" for="' . esc_attr( $option_id ) . '">';
	echo '<input type="checkbox" id="' . esc_attr( $option_id ) . '" name="' . $name . '" value="' . esc_attr( $opt_value ) . '"';
	if ( $required ) {
		echo ' required aria-required="true"';
	}
	// First option carries the aria-describedby for the whole group.
	if ( 0 === $i ) {
		echo ' ' . $described_by_attr;
	}
	if ( $opt_on ) {
		echo ' checked';
	}
	if ( $msg_attrs ) {
		echo ' ' . implode( ' ', $msg_attrs );
	}
	echo ' />';
	echo '<span>' . esc_html( $opt_label ) . '</span>';
	echo '</label>';
}

echo '</fieldset>';

echo field_error( $fid );
echo field_help( $fid, $attributes );
echo field_close();
