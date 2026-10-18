<?php
/**
 * Renders the Indus card grid's parent-perspective case through the shipped motion renderer into
 * `render-parent-fixture.html` (Spec 38A §10, FR-38A-41), so `run-parent.mjs` measures the real renderer and
 * `assets/css/motion.css`.
 *
 * Two grids of cards. The card in grid A is a block placed directly inside an SGS block, with Follow pointer at 8deg,
 * perspective 1100px on its parent, hover scale 1.04 and a 6px lift; grid B holds the same card with its perspective on
 * itself (the control). The page's own stylesheet engages the hover state and writes the pointer at a corner
 * (`--sgs-tilt-x/y: 8deg`), with the transition off, so the measured values are the engaged end state; no element
 * carries a `style` attribute.
 *
 *   php render-parent-fixture.php      writes render-parent-fixture.html beside this file
 *   node run-parent.mjs                measures it in Chromium and Firefox (WebKit ignores a parent perspective)
 *
 * Test harness (not shipped code); bootstraps like `render-fixture.php`.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// phpcs:disable

$plugin = dirname( __DIR__, 4 );
require_once $plugin . '/tests/php/stubs/motion-render-stubs.php';

$render = static function ( string $id, string $on ): string {
	$motion = array(
		'v'        => 1,
		'elements' => array(
			'root' => array(
				'hover' => array(
					'state' => array(
						'values' => array(
							'scale'         => 1.04,
							'translateY'    => -6,
							'followPointer' => true,
							'maxAngle'      => 8,
							'perspective'   => 1100,
							'perspectiveOn' => $on,
							'resetDuration' => 600,
						),
					),
				),
			),
		),
	);
	return sgs_test_render_motion_block(
		array(
			'blockName' => 'sgs/info-box',
			'attrs'     => array( 'sgsMotion' => $motion ),
		),
		'<div class="wp-block-sgs-info-box box" id="' . $id . '"></div>',
		(object) array( 'name' => 'sgs/container' )
	);
};

\SGS\Blocks\Motion\Sgs_Motion_Renderer::reset();
$GLOBALS['sgs_collected_css'] = array();
$GLOBALS['sgs_test_is_admin'] = false;

$a = $render( 'parent-mode', 'parent' );
$b = $render( 'self-mode', 'self' );
foreach ( array( $a, $b ) as $html ) {
	if ( false !== strpos( $html, ' style=' ) ) {
		fwrite( STDERR, "render-parent-fixture: a rendered card carries a style attribute\n" );
		exit( 1 );
	}
}

$css  = implode( '', $GLOBALS['sgs_collected_css'] );
$page = '<!doctype html><meta charset=utf-8><title>rotate fixture (parent perspective)</title>' . "\n"
	. '<link rel="stylesheet" href="../../../../assets/css/motion.css">' . "\n"
	. "<style>\n"
	. "body{margin:0;background:#fff}\n"
	. ".grid{display:grid;grid-template-columns:repeat(3,200px);gap:24px;margin:40px}\n"
	. ".box{width:200px;height:100px;background:#c33}\n"
	. "/* The renderer's per-instance rules. */\n" . $css . "\n"
	. "/* Engage the hover state and the pointer at a corner (the measurement reads the engaged state). */\n"
	. "#parent-mode,#self-mode{--sgs-mh-on:1;--sgs-tilt-x:8deg;--sgs-tilt-y:8deg;transition:none}\n"
	. "</style>\n"
	. '<div class="grid" id="grid-parent">' . $a . '<div class="box"></div><div class="box"></div></div>' . "\n"
	. '<div class="grid" id="grid-self">' . $b . '<div class="box"></div><div class="box"></div></div>' . "\n";

file_put_contents( __DIR__ . '/render-parent-fixture.html', $page );
echo "wrote render-parent-fixture.html\n" . $a . "\n" . $b . "\n";
