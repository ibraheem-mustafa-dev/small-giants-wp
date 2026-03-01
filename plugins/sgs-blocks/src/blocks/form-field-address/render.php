<?php
/**
 * Server-side render for Address Field block.
 *
 * Renders a compound address field with optional postcode auto-lookup.
 * Sub-fields are named {fieldName}[line1], {fieldName}[postcode], etc.
 * so they submit as a nested array and arrive at the server as a single key.
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_label;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_error;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;

$base_fid      = field_id( $attributes['fieldName'] ?? 'unnamed' );
$enable_lookup = $attributes['enableLookup'] ?? false;
$fields        = $attributes['fields'] ?? array( 'line1', 'line2', 'city', 'county', 'postcode', 'country' );

$field_labels = array(
	'line1'    => __( 'Address line 1', 'sgs-blocks' ),
	'line2'    => __( 'Address line 2 (optional)', 'sgs-blocks' ),
	'city'     => __( 'City', 'sgs-blocks' ),
	'county'   => __( 'County', 'sgs-blocks' ),
	'postcode' => __( 'Postcode', 'sgs-blocks' ),
	'country'  => __( 'Country', 'sgs-blocks' ),
);

echo field_open( $attributes, 'address' );
echo field_label( $base_fid, $attributes );
echo '<div class="sgs-form-field__address-fields">';

// Postcode lookup widget (rendered before the standard sub-fields).
if ( $enable_lookup && in_array( 'postcode', $fields, true ) ) {
	echo '<div class="sgs-form-field__address-lookup">';
	printf(
		'<label for="%1$s-postcode-lookup" class="screen-reader-text">%2$s</label>
		 <input type="text" id="%1$s-postcode-lookup" class="sgs-form-field__input" placeholder="%3$s" autocomplete="postal-code" />',
		esc_attr( $base_fid ),
		esc_html__( 'Postcode for address lookup', 'sgs-blocks' ),
		esc_attr__( 'Enter postcode to find address', 'sgs-blocks' )
	);
	printf(
		'<button type="button" class="sgs-form-field__lookup-button" data-field-id="%s">%s</button>',
		esc_attr( $base_fid ),
		esc_html__( 'Find Address', 'sgs-blocks' )
	);
	echo '</div>';
}

// Render each enabled address sub-field.
foreach ( $fields as $field ) {
	if ( ! isset( $field_labels[ $field ] ) ) {
		continue;
	}

	$fid         = $base_fid . '-' . $field;
	$field_name  = ( $attributes['fieldName'] ?? '' ) . '[' . $field . ']';
	$placeholder = $field_labels[ $field ];

	// line1 and postcode inherit the parent `required` flag; all others are optional.
	$is_required = in_array( $field, array( 'line1', 'postcode' ), true ) && ! empty( $attributes['required'] );

	// Skip the postcode sub-field when the lookup widget already rendered it.
	if ( 'postcode' === $field && $enable_lookup ) {
		continue;
	}

	// Map sub-field names to HTML autocomplete attribute tokens.
	$autocomplete_map = array(
		'line1'    => 'address-line1',
		'line2'    => 'address-line2',
		'city'     => 'address-level2',
		'county'   => 'address-level1',
		'postcode' => 'postal-code',
		'country'  => 'country-name',
	);

	$input_attrs = sprintf(
		'id="%s" name="%s" placeholder="%s" autocomplete="%s"',
		esc_attr( $fid ),
		esc_attr( $field_name ),
		esc_attr( $placeholder ),
		esc_attr( $autocomplete_map[ $field ] ?? 'off' )
	);

	if ( $is_required ) {
		$input_attrs .= ' required aria-required="true"';
	}

	// Individual label for each sub-field (screen-reader-only by default; show via CSS when needed).
	printf( '<label for="%s" class="screen-reader-text">%s</label>', esc_attr( $fid ), esc_html( $field_labels[ $field ] ) );

	printf(
		'<input type="text" class="sgs-form-field__input sgs-form-field__address-%s" %s />',
		esc_attr( $field ),
		$input_attrs
	);
}

echo '</div>';

echo field_error( $base_fid );
echo field_help( $base_fid, $attributes );
echo field_close();
