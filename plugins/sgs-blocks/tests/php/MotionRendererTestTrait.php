<?php
/**
 * Shared harness for the motion renderer tests: the WordPress stand-ins are loaded in setUp(), and fixture blocks are
 * rendered through the shipped renderer (`includes/motion/class-sgs-motion-renderer.php`) so a test reads the collected
 * CSS and the returned markup.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test helper, not shipped code.
// phpcs:disable

use SGS\Blocks\Motion\Sgs_Motion_Renderer;

trait MotionRendererTestTrait {

	private const CARD = '<div class="wp-block-sgs-hero"><div class="sgs-hero__media"><img src="a.jpg" alt=""></div><div class="sgs-hero__content"><p class="lede">Hi</p></div></div>';

	protected function setUp(): void {
		require_once __DIR__ . '/stubs/motion-render-stubs.php';
		Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$GLOBALS['sgs_test_is_admin'] = false;
		$GLOBALS['sgs_test_in_loop']  = false;
		$GLOBALS['sgs_test_actions']  = array();
	}

	private function render( array $motion, string $html = self::CARD, array $extra_attrs = array() ): string {
		return sgs_test_render_motion_block(
			array(
				'blockName' => 'sgs/hero',
				'attrs'     => array( 'sgsMotion' => $motion ) + $extra_attrs,
			),
			$html
		);
	}

	private function css(): string {
		return implode( '', $GLOBALS['sgs_collected_css'] );
	}

	private function scope( string $html ): string {
		$this->assertSame( 1, preg_match( '/\b(sgs-m-[0-9a-f]{10})\b/', $html, $m ), 'the root carries the scope class' );
		return $m[1];
	}

	private static function media_hover( array $values, array $devices = array(), string $source = 'self' ): array {
		$state = array(
			'source' => $source,
			'values' => $values,
		);
		if ( array() !== $devices ) {
			$state['devices'] = $devices;
		}
		return array(
			'v'        => 1,
			'elements' => array( 'media' => array( 'hover' => array( 'state' => $state ) ) ),
		);
	}

	private static function load_fade( bool $allow = false, string $trigger = 'load' ): array {
		$values = array( 'from' => array( 'opacity' => 0, 'translateY' => 24 ), 'duration' => 600 );
		if ( $allow ) {
			$values['allowLcpFade'] = true;
		}
		return array(
			'v'        => 1,
			'elements' => array( 'root' => array( 'entrance' => array( 'base' => array( 'trigger' => $trigger, 'values' => $values ) ) ) ),
		);
	}
}
