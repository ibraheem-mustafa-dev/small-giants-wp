<?php
// Fixture: reads svgContent directly and echoes it with no sanitisation
// step of any kind anywhere in this file — the real bug this rule exists
// to catch.
$svg_content_raw = isset( $attributes['svgContent'] ) ? (string) $attributes['svgContent'] : '';

printf(
	'<div class="fixture__svg" aria-hidden="true">%s</div>',
	$svg_content_raw // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixture deliberately unsanitised.
);
