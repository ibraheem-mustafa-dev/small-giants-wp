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
	return [
		'wave' => [
			'label' => 'Wave',
			'path'  => 'M0,40 C200,120 400,0 600,60 C800,120 1000,0 1200,40 L1200,120 L0,120 Z',
		],
		'wave-smooth' => [
			'label' => 'Wave (Smooth)',
			'path'  => 'M0,60 Q300,120 600,60 Q900,0 1200,60 L1200,120 L0,120 Z',
		],
		'triangle' => [
			'label' => 'Triangle',
			'path'  => 'M0,120 L600,0 L1200,120 Z',
		],
		'triangle-asymmetric' => [
			'label' => 'Triangle (Asymmetric)',
			'path'  => 'M0,120 L800,0 L1200,120 Z',
		],
		'curve' => [
			'label' => 'Curve',
			'path'  => 'M0,120 Q600,0 1200,120 Z',
		],
		'curve-asymmetric' => [
			'label' => 'Curve (Asymmetric)',
			'path'  => 'M0,120 C300,120 600,0 1200,80 L1200,120 Z',
		],
		'zigzag' => [
			'label' => 'Zigzag',
			'path'  => 'M0,60 L100,20 L200,60 L300,20 L400,60 L500,20 L600,60 L700,20 L800,60 L900,20 L1000,60 L1100,20 L1200,60 L1200,120 L0,120 Z',
		],
		'cloud' => [
			'label' => 'Cloud',
			'path'  => 'M0,80 C50,40 100,60 150,40 C200,20 250,50 300,30 C350,10 400,50 450,30 C500,10 550,40 600,20 C650,0 700,40 750,20 C800,0 850,30 900,20 C950,10 1000,40 1050,30 C1100,20 1150,50 1200,40 L1200,120 L0,120 Z',
		],
		'slant' => [
			'label' => 'Slant',
			'path'  => 'M0,120 L1200,0 L1200,120 Z',
		],
		'slant-gentle' => [
			'label' => 'Slant (Gentle)',
			'path'  => 'M0,120 L1200,60 L1200,120 Z',
		],
		'mountains' => [
			'label' => 'Mountains',
			'path'  => 'M0,120 L200,40 L400,90 L600,20 L800,70 L1000,30 L1200,80 L1200,120 Z',
		],
		'drops' => [
			'label' => 'Drops',
			'path'  => 'M0,80 C100,40 150,80 200,80 C250,80 300,40 400,80 C500,120 550,40 600,80 C650,120 700,40 800,80 C900,120 950,40 1000,80 C1050,120 1100,40 1200,80 L1200,120 L0,120 Z',
		],
	];
}

/**
 * Get a single shape divider SVG.
 *
 * @param string $shape   Shape key.
 * @param string $colour  CSS colour value.
 * @param int    $height  Height in pixels.
 * @param bool   $flip    Flip horizontally.
 * @param bool   $invert  Invert vertically (mirror).
 * @param string $position 'top' or 'bottom'.
 * @return string SVG HTML or empty string.
 */
function sgs_render_shape_divider( string $shape, string $colour, int $height, bool $flip, bool $invert, string $position ): string {
	$shapes = sgs_get_shape_dividers();

	if ( ! isset( $shapes[ $shape ] ) ) {
		return '';
	}

	$path = $shapes[ $shape ]['path'];

	$transform_parts = [];
	if ( $flip ) {
		$transform_parts[] = 'scaleX(-1)';
	}
	if ( $invert ) {
		$transform_parts[] = 'scaleY(-1)';
	}

	$transform = $transform_parts ? ' transform="' . esc_attr( implode( ' ', $transform_parts ) ) . '" transform-origin="center"' : '';

	$position_class = 'sgs-shape-divider--' . esc_attr( $position );

	return sprintf(
		'<div class="sgs-shape-divider %s" style="height:%dpx;color:%s" aria-hidden="true">' .
		'<svg viewBox="0 0 1200 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' .
		'<path d="%s" fill="currentColor"%s/>' .
		'</svg></div>',
		$position_class,
		absint( $height ),
		esc_attr( $colour ),
		esc_attr( $path ),
		$transform
	);
}
