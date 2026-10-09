<?php
/**
 * Prints what the PHP side composes for the icon hover move, motion and shadow custom properties, for
 * tests/js/icon-motion-parity.test.js to compare with the editor's twin (src/blocks/icon/icon-motion.js). Input: a JSON
 * list of cases ({ attributes, prefix, names }) read from argv[1].
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals -- CLI test fixture, not shipped code.

$plugin = dirname( __DIR__, 3 );
define( 'ABSPATH', $plugin . '/' );
require_once $plugin . '/scripts/qa/lib/wp-stubs.php';
require_once $plugin . '/includes/render-helpers.php';

$cases = json_decode( (string) file_get_contents( $argv[1] ?? '' ), true );
$out   = array();
foreach ( is_array( $cases ) ? $cases : array() as $case ) {
	$attributes = $case['attributes'];
	$names      = $case['names'];
	$prefix     = $case['prefix'];
	$decls      = array_merge(
		sgs_icon_motion_decls(
			array(
				'x'             => $attributes[ $names['x'] ] ?? null,
				'y'             => $attributes[ $names['y'] ] ?? null,
				'rotate'        => $attributes[ $names['rotate'] ] ?? null,
				'move_ms'       => $attributes[ $names['moveMs'] ] ?? null,
				'paint_ms'      => $attributes[ $names['paintMs'] ] ?? null,
				'easing'        => $attributes[ $names['easing'] ] ?? '',
				'easing_custom' => $attributes[ $names['easingCustom'] ] ?? '',
			),
			$prefix
		),
		sgs_icon_shadow_vars(
			array_merge( $attributes, array( 'shadowLiftOnHover' => $attributes[ $names['lift'] ] ?? true ) ),
			array(
				'base'         => $names['shadow'],
				'colour'       => $names['shadow'] . 'Colour',
				'hover'        => $names['shadow'] . 'Hover',
				'hover_colour' => $names['shadow'] . 'ColourHover',
			),
			$prefix,
			! empty( $case['pin'] )
		)
	);
	$map        = array();
	foreach ( $decls as $decl ) {
		$parts                = explode( ':', $decl, 2 );
		$map[ $parts[0] ] = $parts[1];
	}
	ksort( $map );
	$out[] = array() === $map ? new stdClass() : $map;
}
echo json_encode( $out ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode
