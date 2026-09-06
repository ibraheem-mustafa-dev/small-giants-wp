<?php
/**
 * Paints both attributes, so both are in rule 21's scope; only the variation
 * switcher provides the control for variantPreset.
 */

$heading = isset( $attributes['headingText'] ) ? $attributes['headingText'] : '';
$preset  = isset( $attributes['variantPreset'] ) ? $attributes['variantPreset'] : '';

echo '<h2 class="fixture--' . esc_attr( $preset ) . '">' . esc_html( $heading ) . '</h2>';
