<?php
/**
 * Server-side render for Text Field block.
 *
 * A field that carries its own input styling (fill, border, radius, shadow, leading icon) gets a uid class and a
 * scoped <style> from includes/forms/field-own-style.php; a field with none of those renders exactly as before.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_label;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_error;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;
use function SGS\Blocks\Forms\field_input_attrs;
use function SGS\Blocks\Forms\field_own_style_set_attrs;
use function SGS\Blocks\Forms\field_own_style_css;

require_once dirname( __DIR__, 3 ) . '/includes/forms/field-own-style.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

$fid = field_id( $attributes['fieldName'] ?? 'unnamed' );

$sgs_ft_own   = field_own_style_set_attrs( $attributes );
$sgs_ft_uid   = array() === $sgs_ft_own ? '' : 'sgs-fo-' . substr( md5( wp_json_encode( $sgs_ft_own ) ), 0, 8 );
$sgs_ft_css   = field_own_style_css( $attributes, $sgs_ft_uid );
$sgs_ft_icon  = '' !== $sgs_ft_uid && '' !== (string) ( $attributes['leadingIcon'] ?? '' ) ? sgs_get_lucide_icon( (string) $attributes['leadingIcon'] ) : '';

// A gradient wins over the flat icon colour: the Lucide icon is an SVG, so it paints through a stroke gradient def.
$sgs_ft_icon_gradient = (string) ( $attributes['leadingIconColourGradient'] ?? '' );
if ( '' !== $sgs_ft_icon && '' !== $sgs_ft_icon_gradient ) {
	$sgs_ft_icon_paint = sgs_icon_gradient_css( 'lucide', $sgs_ft_icon_gradient, $sgs_ft_uid . '-icon', '.' . $sgs_ft_uid . ' .sgs-form-field__leading-icon svg' );
	if ( '' !== $sgs_ft_icon_paint['css'] ) {
		$sgs_ft_css .= '.' . $sgs_ft_uid . ' .sgs-form-field__leading-icon svg{' . $sgs_ft_icon_paint['css'] . ';}';
		$sgs_ft_icon = sgs_svg_inject_defs( $sgs_ft_icon, $sgs_ft_icon_paint['defs'] );
	}
}

if ( '' !== $sgs_ft_css ) {
	echo '<style>' . wp_strip_all_tags( $sgs_ft_css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- scoped CSS built from sanitised values.
}

echo field_open( $attributes, 'text', $sgs_ft_uid );
echo field_label( $fid, $attributes );
$sgs_ft_input = '<input type="text" class="sgs-form-field__input" ' . field_input_attrs( $fid, $attributes ) . ' />';
if ( '' !== $sgs_ft_icon ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_get_lucide_icon() returns pre-sanitised SVG markup.
	echo '<span class="sgs-form-field__control sgs-form-field__control--has-icon"><span class="sgs-form-field__leading-icon" aria-hidden="true">' . $sgs_ft_icon . '</span>' . $sgs_ft_input . '</span>';
} else {
	echo $sgs_ft_input; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- field_input_attrs() returns escaped attributes.
}
echo field_error( $fid );
echo field_help( $fid, $attributes );
echo field_close();
