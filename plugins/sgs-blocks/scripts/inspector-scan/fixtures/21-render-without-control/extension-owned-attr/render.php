<?php
/**
 * Fixture render surface. Paints all four attributes, so every one of them is
 * genuinely "rendered" and the only thing standing between them and a finding
 * is whether a control resolves.
 *
 * The three extension-owned ones must be excluded by OWNERSHIP; `headingText`
 * must be resolved by the real control in edit.js.
 */

$fx      = isset( $attributes['fx'] ) ? $attributes['fx'] : '';
$dot     = isset( $attributes['fxGridDotColour'] ) ? $attributes['fxGridDotColour'] : '';
$scale   = isset( $attributes['sgsHoverScale'] ) ? $attributes['sgsHoverScale'] : '';
$heading = isset( $attributes['headingText'] ) ? $attributes['headingText'] : '';

printf(
	'<div data-sgs-fx="%s" data-sgs-fx-grid-colour="%s" data-sgs-hover-scale="%s"><h2>%s</h2></div>',
	esc_attr( $fx ),
	esc_attr( $dot ),
	esc_attr( $scale ),
	esc_html( $heading )
);
