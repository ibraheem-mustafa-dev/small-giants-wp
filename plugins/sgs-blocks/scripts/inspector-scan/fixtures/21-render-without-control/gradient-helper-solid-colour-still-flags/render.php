<?php
$gradient = isset( $attributes['panelOverlayGradient'] ) ? $attributes['panelOverlayGradient'] : false;
$colour   = isset( $attributes['panelOverlayColour'] ) ? $attributes['panelOverlayColour'] : '';

printf( '<div style="background:%s"></div>', esc_attr( $gradient ? 'gradient' : $colour ) );
