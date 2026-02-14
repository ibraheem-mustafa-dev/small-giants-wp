<?php
/**
 * Server-side render for Tiles Field block.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_label;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;

$fid        = field_id( $attributes['fieldName'] ?? 'unnamed' );
$tiles      = $attributes['tiles'] ?? array();
$multi      = $attributes['multiSelect'] ?? false;
$columns    = absint( $attributes['columns'] ?? 3 );
$name       = esc_attr( $attributes['fieldName'] ?? '' );
$input_type = $multi ? 'checkbox' : 'radio';
$input_name = $multi ? $name . '[]' : $name;

echo field_open( $attributes, 'tiles' );
echo field_label( $fid, $attributes );
echo '<div class="sgs-form-tiles" style="grid-template-columns:repeat(' . $columns . ',1fr)">';
foreach ( $tiles as $i => $tile ) {
	$tile_id = $fid . '-tile-' . $i;
	echo '<label class="sgs-form-tile" for="' . esc_attr( $tile_id ) . '" data-wp-on--click="actions.toggleTile">';
	echo '<input type="' . $input_type . '" id="' . esc_attr( $tile_id ) . '" name="' . $input_name . '" value="' . esc_attr( $tile['value'] ?? '' ) . '" class="sgs-form-tile__input" />';
	if ( ! empty( $tile['icon'] ) ) {
		echo '<span class="sgs-form-tile__icon">' . esc_html( $tile['icon'] ) . '</span>';
	}
	echo '<span class="sgs-form-tile__label">' . esc_html( $tile['label'] ?? '' ) . '</span>';
	echo '<span class="sgs-form-tile__check" aria-hidden="true"></span>';
	echo '</label>';
}
echo '</div>';
echo field_help( $fid, $attributes );
echo field_close();
