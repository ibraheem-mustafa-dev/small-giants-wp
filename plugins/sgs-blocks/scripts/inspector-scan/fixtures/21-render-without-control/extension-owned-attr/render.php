<?php
/**
 * Fixture render surface. Paints all four attributes, so every one of them is
 * genuinely "rendered" and the only thing standing between them and a finding
 * is whether a control resolves.
 *
 * The three extension-owned ones must be excluded by OWNERSHIP; `headingText`
 * must be resolved by the real control in edit.js.
 */

$css     = isset( $attributes['sgsCustomCss'] ) ? $attributes['sgsCustomCss'] : '';
$hide    = isset( $attributes['sgsHideOnMobile'] ) ? $attributes['sgsHideOnMobile'] : '';
$sizing  = isset( $attributes['sgsChildSizing'] ) ? $attributes['sgsChildSizing'] : '';
$heading = isset( $attributes['headingText'] ) ? $attributes['headingText'] : '';

printf(
	'<div data-css="%s" data-hide="%s" data-sizing="%s"><h2>%s</h2></div>',
	esc_attr( $css ),
	esc_attr( $hide ),
	esc_attr( $sizing ),
	esc_html( $heading )
);
