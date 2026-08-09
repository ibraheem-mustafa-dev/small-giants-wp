<?php
/**
 * The product-card shape: routes through the wrapper, but suppresses the band
 * unconditionally and reads contentWidth nowhere in code. The mention of
 * contentWidth in THIS docblock must not count as a read.
 */
$opts = array(
	'tag'        => 'div',
	'wrap_inner' => false,
);
echo SGS_Container_Wrapper::render( $attributes, $block, $content, 'content', $opts );
