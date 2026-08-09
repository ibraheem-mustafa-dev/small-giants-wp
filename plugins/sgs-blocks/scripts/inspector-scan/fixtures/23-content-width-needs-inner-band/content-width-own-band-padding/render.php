<?php
// The hero-split shape: an extra element would collapse the two grid columns,
// so the band is centred padding-inline on the grid itself. A grid item is
// sized by its track, so max-width on the column would be an inert lever.
$uid  = 'sgs-' . wp_unique_id();
$cw   = (string) ( $attributes['contentWidth'] ?? '' );
$opts = array( 'wrap_inner' => false );
$css  = '';
if ( '' !== $cw && 'full' !== $cw ) {
	$css = '.' . $uid . '{padding-inline:max(24px,calc((100% - ' . $cw . ') / 2))}';
}
echo '<style>' . $css . '</style>'
	. SGS_Container_Wrapper::render( $attributes, $block, $content, 'section', $opts );
