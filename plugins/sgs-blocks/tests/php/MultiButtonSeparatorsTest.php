<?php
/**
 * Sgs/multi-button draws Separators: the buttons are always a flex row, so the
 * block hands the shared wrapper layout 'flex' and the wrapper's Separators
 * feature (sgs_container_separators_active) turns on.
 *
 * Run with: vendor/bin/phpunit --filter MultiButtonSeparatorsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Multi-button separators.
 */
final class MultiButtonSeparatorsTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const SEPARATORS = array(
		'column' => array(
			'style'  => 'solid',
			'width'  => array( 'desktop' => '1px' ),
			'colour' => '#000000',
		),
	);

	/**
	 * Configured separators mark the root, with no layout stored.
	 */
	public function test_configured_separators_mark_the_root(): void {
		$out = $this->render_block( 'sgs/multi-button', array( 'separators' => self::SEPARATORS ) );

		$this->assertSame( 1, preg_match( '/<div[^>]*class="([^"]*sgs-multi-button[^"]*)"/', $out['html'], $m ), 'no root' );
		$this->assertStringContainsString( 'sgs-has-separators', $m[1] );
	}

	/**
	 * No separators configured: no marker class.
	 */
	public function test_no_separators_no_marker(): void {
		$out = $this->render_block( 'sgs/multi-button', array() );

		$this->assertStringNotContainsString( 'sgs-has-separators', $out['html'] );
	}
}
