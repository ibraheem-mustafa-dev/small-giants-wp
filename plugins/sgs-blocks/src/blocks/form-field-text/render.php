<?php
/**
 * Server-side render for Text Field block.
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

$fid = field_id( $attributes['fieldName'] ?? 'unnamed' );

echo field_open( $attributes, 'text' );
echo field_label( $fid, $attributes );
echo '<input type="text" class="sgs-form-field__input" ' . field_input_attrs( $fid, $attributes ) . ' />';
echo field_help( $fid, $attributes );
echo field_close();
