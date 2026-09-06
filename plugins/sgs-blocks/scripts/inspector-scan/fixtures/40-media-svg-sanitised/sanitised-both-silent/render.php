<?php
// Fixture: correctly sanitised on the PHP side — proves the rule does not
// flag every SVG-attribute read, only unsanitised echoes.
$svg_content_raw = isset( $attributes['svgContent'] ) ? (string) $attributes['svgContent'] : '';

$allowed_svg_tags = sgs_allowed_svg_tags();
$sanitised_svg    = wp_kses( $svg_content_raw, $allowed_svg_tags );

printf(
	'<div class="fixture__svg" aria-hidden="true">%s</div>',
	$sanitised_svg // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised via wp_kses() above.
);
