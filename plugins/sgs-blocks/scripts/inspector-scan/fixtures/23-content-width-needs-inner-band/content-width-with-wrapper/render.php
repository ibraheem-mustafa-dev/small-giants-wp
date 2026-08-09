<?php
// Ordinary wrapper-routed block: no wrap_inner override, so declaring
// contentWidth is itself what makes .sgs-container__inner render.
echo SGS_Container_Wrapper::render( $attributes, $block, $content, 'section', array( 'tag' => 'section' ) );
