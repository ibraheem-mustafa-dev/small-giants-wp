<?php
// Suppresses the wrapper band but emits its OWN inner wrapping element and caps
// it — a real band by a different element.
$uid = 'sgs-' . wp_unique_id();
$cw  = (string) ( $attributes['contentWidth'] ?? '' );
$css = '.' . $uid . '>.own-band{max-width:' . $cw . ';margin-inline:auto}';
$opts = array( 'wrap_inner' => false );
echo '<style>' . $css . '</style>'
	. SGS_Container_Wrapper::render( $attributes, $block, '<div class="own-band">' . $content . '</div>', 'section', $opts );
