<?php
// Show/hide toggles: two paint (a fixed border in the block they guard; a
// reassignment of a colour a later declaration writes), two do not (a guarded
// display rule; a guarded rule carrying another setting's colour).
$uid = 'sgs-tp-1';
$css = array();
if ( ! empty( $attributes['hairline'] ) ) {
	$css[] = '.' . $uid . ' .sgs-toggle-paint__rule{border-top:1px solid ' . sgs_colour_value( 'border' ) . ';}';
}
if ( ! empty( $attributes['showBox'] ) ) {
	$css[] = '.' . $uid . ' .sgs-toggle-paint__box{display:block;}';
}
$colour = sgs_colour_value( $attributes['itemColour'] ?? '' );
$smart  = ! empty( $attributes['smartContrast'] );
if ( $smart ) {
	$colour = sgs_contrast_pick( $colour );
}
$css[] = '.' . $uid . ' .sgs-toggle-paint__item{color:' . $colour . ';}';
if ( ! empty( $attributes['showCaption'] ) ) {
	$label_colour = sgs_colour_value( $attributes['labelColour'] ?? '' );
	$css[] = '.' . $uid . ' .sgs-toggle-paint__label{color:' . $label_colour . ';}';
}
echo '<style>' . implode( '', $css ) . '</style>';
