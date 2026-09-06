<?php
// Fixture mirroring src/blocks/media/render.php:1020-1113 — the
// confirmed-correct PHP-side pattern: wp_kses() + sgs_allowed_svg_tags().
$svg_content_raw = isset( $attributes['svgContent'] ) ? (string) $attributes['svgContent'] : '';

if ( '' === $svg_content_raw ) {
	echo '<!-- fixture: no SVG content set -->';
	return;
}

$allowed_svg_tags = sgs_allowed_svg_tags();

$sanitised_svg = wp_kses( $svg_content_raw, $allowed_svg_tags );

printf(
	'<div class="sgs-media__svg" aria-hidden="true">%s</div>',
	$sanitised_svg // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised via wp_kses() above.
);
