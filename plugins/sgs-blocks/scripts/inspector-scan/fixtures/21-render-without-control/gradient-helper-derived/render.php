<?php
$solid    = isset( $attributes['panelOverlay'] ) ? $attributes['panelOverlay'] : '';
$gradient = isset( $attributes['panelOverlayGradient'] ) ? $attributes['panelOverlayGradient'] : false;

printf( '<div style="background:%s"></div>', esc_attr( $gradient ? 'gradient' : $solid ) );
