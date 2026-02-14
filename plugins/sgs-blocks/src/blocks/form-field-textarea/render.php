<?php
/**
 * Server-side render for Textarea Field block.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_label;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;
use function SGS\Blocks\Forms\field_input_attrs;

$fid  = field_id( $attributes['fieldName'] ?? 'unnamed' );
$rows = absint( $attributes['rows'] ?? 4 );

echo field_open( $attributes, 'textarea' );
echo field_label( $fid, $attributes );
echo '<textarea class="sgs-form-field__input" rows="' . $rows . '" ' . field_input_attrs( $fid, $attributes ) . '></textarea>';
echo field_help( $fid, $attributes );
echo field_close();
