<?php
// The physics-canvas shape: forces the band on unconditionally.
$opts = array(
	'tag'        => 'section',
	'wrap_inner' => true,
);
echo SGS_Container_Wrapper::render( $attributes, $block, $content, 'section', $opts );
