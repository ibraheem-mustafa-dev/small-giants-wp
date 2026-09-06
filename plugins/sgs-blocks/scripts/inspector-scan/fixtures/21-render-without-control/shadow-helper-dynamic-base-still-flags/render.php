<?php
$colour = isset( $attributes['tileShadowColour'] ) ? $attributes['tileShadowColour'] : '';

printf( '<style>.fixture{box-shadow-color:%s}</style>', esc_attr( $colour ) );
