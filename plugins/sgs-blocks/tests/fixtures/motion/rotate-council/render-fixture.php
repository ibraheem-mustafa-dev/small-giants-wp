<?php
/**
 * Renders the rotate council's §7 fixture card through the shipped motion renderer into `render-fixture.html`
 * (Spec 38A §10, FR-38A-41), so `run.mjs` measures the real renderer and `assets/css/motion.css` instead of a
 * hand-written stylesheet.
 *
 * The card: rest rotate -1deg, rest rotateX 10deg, hover rotateY 5deg, self perspective 800px, translate 20px 10px and
 * scale 1.1, all on the hover state. The page's own stylesheet engages the hover state (`--sgs-mh-on: 1`) and turns the
 * hover transition off, so the measured values are the engaged end state; no element carries a `style` attribute.
 *
 *   php render-fixture.php            writes render-fixture.html beside this file
 *   node run.mjs render-fixture.html  measures it in Chromium, Firefox and WebKit
 *
 * Test harness (not shipped code); bootstraps like `tests/php/MotionRendererTest.php`.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// phpcs:disable

$plugin = dirname( __DIR__, 4 );
require_once $plugin . '/tests/php/stubs/motion-render-stubs.php';

\SGS\Blocks\Motion\Sgs_Motion_Renderer::reset();
$GLOBALS['sgs_collected_css'] = array();
$GLOBALS['sgs_test_is_admin'] = false;

$motion = array(
	'v'        => 1,
	'elements' => array(
		'root' => array(
			'hover' => array(
				'state' => array(
					'values' => array(
						'restRotate'  => -1,
						'restRotateX' => 10,
						'rotateY'     => 5,
						'perspective' => 800,
						'translateX'  => 20,
						'translateY'  => 10,
						'scale'       => 1.1,
					),
				),
			),
		),
	),
);

$card = sgs_test_render_motion_block(
	array(
		'blockName' => 'sgs/hero',
		'attrs'     => array( 'sgsMotion' => $motion ),
	),
	'<div class="wp-block-sgs-hero box" id="ind"></div>'
);
if ( false !== strpos( $card, ' style=' ) ) {
	fwrite( STDERR, "render-fixture: the rendered card carries a style attribute\n" );
	exit( 1 );
}

$css  = implode( '', $GLOBALS['sgs_collected_css'] );
$page = '<!doctype html><meta charset=utf-8><title>rotate fixture (rendered)</title>' . "\n"
	. '<link rel="stylesheet" href="../../../../assets/css/motion.css">' . "\n"
	. "<style>\n"
	. "body{margin:0;background:#fff}\n"
	. ".box{position:absolute;left:200px;top:100px;width:200px;height:100px;background:#c33}\n"
	. "/* The renderer's per-instance rules. */\n" . $css . "\n"
	. "/* Engage the hover state at its end values (the measurement reads the engaged state, not a transition). */\n"
	. "#ind[data-sgs-mh]{--sgs-mh-on:1;transition:none}\n"
	. "</style>\n"
	. $card . "\n";

file_put_contents( __DIR__ . '/render-fixture.html', $page );
echo "wrote render-fixture.html\n" . $card . "\n";
