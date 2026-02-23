<?php
/**
 * Server-side render for Address Field block.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_label;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;

$base_fid     = field_id( $attributes['fieldName'] ?? 'unnamed' );
$enable_lookup = $attributes['enableLookup'] ?? false;
$fields        = $attributes['fields'] ?? [ 'line1', 'line2', 'city', 'county', 'postcode', 'country' ];

$field_labels = [
	'line1'    => __( 'Address line 1', 'sgs-blocks' ),
	'line2'    => __( 'Address line 2', 'sgs-blocks' ),
	'city'     => __( 'City', 'sgs-blocks' ),
	'county'   => __( 'County', 'sgs-blocks' ),
	'postcode' => __( 'Postcode', 'sgs-blocks' ),
	'country'  => __( 'Country', 'sgs-blocks' ),
];

echo field_open( $attributes, 'address' );
echo field_label( $base_fid, $attributes );

echo '<div class="sgs-form-field__address-fields">';

// Postcode lookup (if enabled).
if ( $enable_lookup && in_array( 'postcode', $fields, true ) ) {
	echo '<div class="sgs-form-field__address-lookup">';
	printf(
		'<input type="text" id="%s-postcode-lookup" class="sgs-form-field__input" placeholder="%s" />',
		esc_attr( $base_fid ),
		esc_attr__( 'Enter postcode', 'sgs-blocks' )
	);
	printf(
		'<button type="button" class="sgs-form-field__lookup-button" data-field-id="%s">%s</button>',
		esc_attr( $base_fid ),
		esc_html__( 'Find Address', 'sgs-blocks' )
	);
	echo '</div>';
}

// Render each enabled address field.
foreach ( $fields as $field ) {
	if ( ! isset( $field_labels[ $field ] ) ) {
		continue;
	}

	$fid         = $base_fid . '-' . $field;
	$field_name  = ( $attributes['fieldName'] ?? '' ) . '[' . $field . ']';
	$placeholder = $field_labels[ $field ];
	$required    = ( 'line1' === $field || 'postcode' === $field ) && ! empty( $attributes['required'] );

	// Skip postcode in main fields if lookup is enabled (already rendered above).
	if ( 'postcode' === $field && $enable_lookup ) {
		continue;
	}

	$attrs = sprintf(
		'id="%s" name="%s" placeholder="%s"',
		esc_attr( $fid ),
		esc_attr( $field_name ),
		esc_attr( $placeholder )
	);

	if ( $required ) {
		$attrs .= ' required aria-required="true"';
	}

	printf(
		'<input type="text" class="sgs-form-field__input sgs-form-field__address-%s" %s />',
		esc_attr( $field ),
		$attrs
	);
}

echo '</div>';
echo field_close();
