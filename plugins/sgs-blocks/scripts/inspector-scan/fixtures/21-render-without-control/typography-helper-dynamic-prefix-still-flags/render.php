<?php
$weight = isset( $attributes['labelFontWeight'] ) ? $attributes['labelFontWeight'] : '';

printf( '<style>.fixture-label{font-weight:%s}</style>', esc_attr( $weight ) );
