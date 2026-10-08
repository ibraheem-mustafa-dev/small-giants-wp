<?php
/**
 * Tests: a client's explicit 0 corner is a set corner (CR6 P2-a).
 *
 * The accordion, container and product-card blocks build their base radius corner by corner before the style engine
 * prints it. A corner counts as set when it sanitises to a non-empty value, so an explicit '0' prints
 * border-top-left-radius:0 rather than being dropped (PHP's empty() is true for the string '0', which let
 * the stylesheet's radius show through where the client asked for a square corner).
 *
 * Run with:
 *   vendor/bin/phpunit --filter ExplicitZeroCornerTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Explicit-zero corners on the three blocks that build their base radius by hand.
 */
final class ExplicitZeroCornerTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * The blocks under test.
	 *
	 * @return array<string, array{0: string}>
	 */
	public static function blocks(): array {
		return array(
			'accordion'    => array( 'sgs/accordion' ),
			'container'    => array( 'sgs/container' ),
			'product-card' => array( 'sgs/product-card' ),
		);
	}

	/**
	 * An explicit 0 top-left corner is printed beside the other set corners.
	 *
	 * @param string $slug Block name.
	 */
	#[DataProvider( 'blocks' )]
	public function test_an_explicit_zero_corner_is_printed( string $slug ): void {
		$out = $this->render_block(
			$slug,
			array(
				'borderRadius' => array(
					'desktop' => array(
						'topLeft'     => '0',
						'topRight'    => '8px',
						'bottomRight' => '8px',
						'bottomLeft'  => '8px',
					),
				),
			)
		);
		$this->assertMatchesRegularExpression( '/border-top-left-radius:\s*0(px)?\s*;/', $out['css'], "{$slug}: the explicit 0 corner was dropped" );
		$this->assertStringContainsString( 'border-top-right-radius:8px', $out['css'], "{$slug}: the set corners did not print" );
	}
}
