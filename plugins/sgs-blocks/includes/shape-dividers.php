<?php
/**
 * Shape divider SVG library.
 *
 * Returns SVG path data for shape dividers used in the Container block.
 * Each shape is a viewBox 1200x120 SVG path.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Get all available shape divider definitions.
 *
 * @return array<string, array{label: string, path: string}>
 */
function sgs_get_shape_dividers(): array {
	return array(
		'wave'                => array(
			'label' => 'Wave',
			'path'  => 'M0,40 C200,120 400,0 600,60 C800,120 1000,0 1200,40 L1200,120 L0,120 Z',
		),
		'wave-smooth'         => array(
			'label' => 'Wave (Smooth)',
			'path'  => 'M0,60 Q300,120 600,60 Q900,0 1200,60 L1200,120 L0,120 Z',
		),
		'triangle'            => array(
			'label' => 'Triangle',
			'path'  => 'M0,120 L600,0 L1200,120 Z',
		),
		'triangle-asymmetric' => array(
			'label' => 'Triangle (Asymmetric)',
			'path'  => 'M0,120 L800,0 L1200,120 Z',
		),
		'curve'               => array(
			'label' => 'Curve',
			'path'  => 'M0,120 Q600,0 1200,120 Z',
		),
		'curve-asymmetric'    => array(
			'label' => 'Curve (Asymmetric)',
			'path'  => 'M0,120 C300,120 600,0 1200,80 L1200,120 Z',
		),
		'zigzag'              => array(
			'label' => 'Zigzag',
			'path'  => 'M0,60 L100,20 L200,60 L300,20 L400,60 L500,20 L600,60 L700,20 L800,60 L900,20 L1000,60 L1100,20 L1200,60 L1200,120 L0,120 Z',
		),
		'cloud'               => array(
			'label' => 'Cloud',
			'path'  => 'M0,80 C50,40 100,60 150,40 C200,20 250,50 300,30 C350,10 400,50 450,30 C500,10 550,40 600,20 C650,0 700,40 750,20 C800,0 850,30 900,20 C950,10 1000,40 1050,30 C1100,20 1150,50 1200,40 L1200,120 L0,120 Z',
		),
		'slant'               => array(
			'label' => 'Slant',
			'path'  => 'M0,120 L1200,0 L1200,120 Z',
		),
		'slant-gentle'        => array(
			'label' => 'Slant (Gentle)',
			'path'  => 'M0,120 L1200,60 L1200,120 Z',
		),
		'mountains'           => array(
			'label' => 'Mountains',
			'path'  => 'M0,120 L200,40 L400,90 L600,20 L800,70 L1000,30 L1200,80 L1200,120 Z',
		),
		'drops'               => array(
			'label' => 'Drops',
			'path'  => 'M0,80 C100,40 150,80 200,80 C250,80 300,40 400,80 C500,120 550,40 600,80 C650,120 700,40 800,80 C900,120 950,40 1000,80 C1050,120 1100,40 1200,80 L1200,120 L0,120 Z',
		),
		'tilt'                => array(
			'label' => 'Tilt',
			'path'  => 'M0,120 L1200,0 L1200,120 Z',
		),
		'arrow'               => array(
			'label' => 'Arrow',
			'path'  => 'M0,0 L600,120 L1200,0 L1200,120 L0,120 Z',
		),
		'split'               => array(
			'label' => 'Split',
			'path'  => 'M0,0 L600,80 L1200,0 L1200,120 L0,120 Z',
		),
	);
}

/**
 * Get a single shape divider SVG.
 *
 * MARKUP ONLY — no `style` attribute (FR-32-1 / FR-32-4, D345). This used to
 * emit `style="height:…px;color:…"`, which are real CSS PROPERTY declarations
 * and the most serious form of the no-inline breach. The caller now owns those
 * two values and emits them as a scoped `.{uid} .sgs-shape-divider--{position}`
 * rule; `$colour`/`$height` were therefore removed from this signature rather
 * than left as dead parameters. `sgs_render_shape_divider_decls()` builds the
 * matching declarations so the two cannot drift apart.
 *
 * @param string $shape    Shape key.
 * @param bool   $flip     Flip horizontally.
 * @param bool   $invert   Invert vertically (mirror).
 * @param string $position 'top' or 'bottom'.
 * @return string SVG HTML or empty string.
 */
function sgs_render_shape_divider( string $shape, bool $flip, bool $invert, string $position ): string {
	$shapes = sgs_get_shape_dividers();

	if ( ! isset( $shapes[ $shape ] ) ) {
		return '';
	}

	$path = $shapes[ $shape ]['path'];

	$transform_parts = array();
	if ( $flip ) {
		$transform_parts[] = 'scaleX(-1)';
	}
	if ( $invert ) {
		$transform_parts[] = 'scaleY(-1)';
	}

	$transform = $transform_parts ? ' transform="' . esc_attr( implode( ' ', $transform_parts ) ) . '" transform-origin="center"' : '';

	$position_class = 'sgs-shape-divider--' . esc_attr( $position );

	return sprintf(
		'<div class="sgs-shape-divider %s" aria-hidden="true">' .
		'<svg viewBox="0 0 1200 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' .
		'<path d="%s" fill="currentColor"%s/>' .
		'</svg></div>',
		$position_class,
		esc_attr( $path ),
		$transform
	);
}

/**
 * Build the scoped-CSS declarations for one shape divider.
 *
 * Companion to sgs_render_shape_divider(), which emits markup only (FR-32-1 /
 * FR-32-4, D345). The caller wraps these declarations in a per-instance
 * selector — `.{uid} .sgs-shape-divider--{position}` — so the values land in a
 * scoped stylesheet rule instead of an inline `style` attribute. `color` is set
 * (not `fill`) because the SVG path paints with `fill="currentColor"`.
 *
 * @param string $colour CSS colour value (validated here, as it was inline).
 * @param int    $height Height in pixels.
 * @return string Declarations without braces, e.g. `height:60px;color:#fff`.
 */
function sgs_shape_divider_decls( string $colour, int $height ): string {
	return 'height:' . absint( $height ) . 'px;color:' . sgs_sanitise_colour( $colour );
}

/**
 * Validate a colour value against a strict allow-list of formats.
 *
 * Accepts: theme.json palette slugs (a-z, 0-9, -), CSS variables, hex (#rgb, #rrggbb, #rrggbbaa),
 * rgb()/rgba(), hsl()/hsla(), oklch(), and the 'currentColor' / 'transparent' / 'inherit' keywords.
 * Anything else (including raw text, malformed CSS, embedded quotes) returns empty string,
 * which collapses to no inline colour — the block falls back to its CSS default.
 *
 * Defence-in-depth on top of esc_attr(): esc_attr only neutralises HTML entities; it does not
 * prevent CSS-context attacks like style="color:red;background:url(javascript:alert(1))".
 *
 * @param string $colour Raw colour value from block attribute or settings.
 * @return string Validated colour or empty string.
 */
function sgs_sanitise_colour( string $colour ): string {
	$colour = trim( $colour );
	if ( '' === $colour ) {
		return '';
	}

	// Theme.json palette slug (e.g. "primary", "accent-light").
	if ( preg_match( '/^[a-z][a-z0-9-]*$/i', $colour ) ) {
		return 'var(--wp--preset--color--' . sanitize_key( $colour ) . ')';
	}

	// Already a CSS variable — pass through if shape is exactly var(--name).
	if ( preg_match( '/^var\(--[a-z0-9-]+\)$/i', $colour ) ) {
		return $colour;
	}

	// Hex: #rgb / #rgba / #rrggbb / #rrggbbaa.
	if ( preg_match( '/^#([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i', $colour ) ) {
		return strtolower( $colour );
	}

	// Functional notations: rgb(), rgba(), hsl(), hsla(), oklch(), oklab().
	if ( preg_match( '/^(rgb|rgba|hsl|hsla|oklch|oklab)\([0-9 .,%\/-]+\)$/i', $colour ) ) {
		return $colour;
	}

	// Reserved keywords.
	if ( in_array( strtolower( $colour ), array( 'currentcolor', 'transparent', 'inherit' ), true ) ) {
		return strtolower( $colour );
	}

	// Anything else: reject.
	return '';
}
