<?php
/**
 * Child-process runner for BorderElementDeclsTest's corner-radius cases.
 *
 * The radius path calls wp_style_engine_get_styles(). Several test files define
 * their own stub of it when PHPUnit loads them, so inside the PHPUnit process
 * the first one loaded wins. This runner loads only the stub in WordPress's own
 * return shape, calls the helper for each case and prints the results as JSON.
 *
 * Usage: php tests/php/run-border-element-radius.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

define( 'ABSPATH', __DIR__ . '/' ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound -- WordPress's own constant, outside WordPress.

require_once __DIR__ . '/stubs/wp-functions.php';
require_once __DIR__ . '/stubs/style-engine-border-radius.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-border-style.php';

$sgs_cases = array(
	'uniform' => array( array( 'borderRadius' => '8px' ), '', array() ),
	'tiers'   => array(
		array(
			'borderRadius' => array(
				'desktop' => array(
					'topLeft'     => '10px',
					'bottomRight' => '6px',
				),
				'tablet'  => array( 'topRight' => '4px' ),
				'mobile'  => array(
					'topLeft'    => '2px',
					'bottomLeft' => '3px',
				),
			),
		),
		'',
		array(),
	),
	'off'     => array( array( 'borderRadius' => '8px' ), '', array( 'radius' => false ) ),
	'named'   => array(
		array(
			'borderRadius'       => '6px',
			'wrapperBorderWidth' => array( 'top' => '1px' ),
		),
		'wrapper',
		array( 'radius' => 'borderRadius' ),
	),
	'prefix'  => array(
		array(
			'cardBorderWidth'  => array( 'top' => '1px' ),
			'cardBorderStyle'  => 'dotted',
			'cardBorderRadius' => '4px',
			'cardBorderColour' => '#123456',
			'borderWidth'      => array( 'top' => '9px' ),
			'borderRadius'     => '9px',
		),
		'card',
		array( 'colour' => array( 'base' => 'cardBorderColour' ) ),
	),
);

$sgs_results = array();
foreach ( $sgs_cases as $sgs_name => $sgs_case ) {
	$sgs_results[ $sgs_name ] = sgs_border_element_decls( $sgs_case[0], $sgs_case[1], '.sgs-x-1', $sgs_case[2] );
}
echo json_encode( $sgs_results, JSON_THROW_ON_ERROR ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped, WordPress.WP.AlternativeFunctions.json_encode_json_encode -- JSON to a test process, outside WordPress.
