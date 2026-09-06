<?php
/**
 * Paints both overlay attributes, so each is a live candidate that ONLY
 * transitive component resolution can clear. A resolver that expands one level
 * lands on BackgroundPanel.js, which names neither attribute, and reports two
 * false defects.
 */

$overlay  = isset( $attributes['backgroundOverlayColour'] ) ? $attributes['backgroundOverlayColour'] : '';
$gradient = isset( $attributes['overlayGradient'] ) ? $attributes['overlayGradient'] : false;

$css = $gradient ? sprintf( 'linear-gradient(180deg, %s, transparent)', $overlay ) : $overlay;

printf( '<div style="background:%s"></div>', esc_attr( $css ) );
