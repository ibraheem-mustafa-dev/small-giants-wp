<?php
// Fixture mirroring src/blocks/before-after/render.php — the real block
// NEVER touches beforeSvgContent/afterSvgContent directly; the read is
// delegated entirely to a sibling media-render.php's own resolver
// (sgs_before_after_resolve_svg(), which calls wp_kses() +
// sgs_svg_kses_allowed_tags() internally). This file must not reference
// either attribute name directly — that absence is the correct shape.
require_once __DIR__ . '/media-render.php';

$before_html = sgs_before_after_resolve_slot( $attributes, 'before' );
$after_html  = sgs_before_after_resolve_slot( $attributes, 'after' );

printf(
	'<div class="sgs-before-after">%s%s</div>',
	$before_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised inside media-render.php.
	$after_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised inside media-render.php.
);
