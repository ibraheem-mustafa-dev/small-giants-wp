<?php
// Self-test analogue of container/render.php calling SGS_Container_Wrapper::render() —
// the exact real-tree shape that makes contentWidth resolve as consumed.
echo SGS_Container_Wrapper::render( $attributes, $block, $content, 'section', array() );
