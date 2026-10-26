<?php
/**
 * A stored unit never breaks out of the block's CSS rule: sgs/text's max width unit is checked against the block's
 * unit list (it was only HTML-escaped, which lets `;`, `{` and `}` through), and the shared responsive emitter cleans a
 * caller's `unit_default` the way it cleans a `unit_attr` value (sgs/quote passed its stored attribution margin unit
 * there raw). Valid units print as before.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter StoredUnitBreakoutTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class StoredUnitBreakoutTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const HOSTILE = 'px;}body{display:none';

	public function test_a_hostile_text_max_width_unit_stays_inside_the_rule(): void {
		$css = $this->render_block( 'sgs/text', array( 'text' => 'Fresh bread', 'maxWidth' => 300, 'maxWidthUnit' => self::HOSTILE ) )['css'];

		$this->assertStringNotContainsString( 'body{', $css );
		$this->assertStringContainsString( 'max-width:300px', $css, 'an unknown unit falls back to px' );
		$ok = $this->render_block( 'sgs/text', array( 'text' => 'Fresh bread', 'maxWidth' => 40, 'maxWidthUnit' => 'rem' ) )['css'];
		$this->assertStringContainsString( 'max-width:40rem', $ok, 'control: a listed unit prints' );
	}

	public function test_a_hostile_quote_margin_unit_stays_inside_the_rule(): void {
		$attrs = array(
			'attribution'           => 'A regular',
			'attributionMarginTop'  => array( 'desktop' => 12 ),
			'attributionMarginUnit' => self::HOSTILE,
		);
		$css   = $this->render_block( 'sgs/quote', $attrs )['css'];

		$this->assertStringContainsString( 'margin-top:12px', $css, 'the margin printed; the hostile unit is reduced to letters, an invalid value the browser drops, so nothing leaves the declaration' );
		$this->assertStringNotContainsString( 'body{', $css );
		$this->assertStringNotContainsString( 'display:none', $css );
		$ok = $this->render_block( 'sgs/quote', array_merge( $attrs, array( 'attributionMarginUnit' => 'em' ) ) )['css'];
		$this->assertStringContainsString( 'margin-top:12em', $ok, 'control: a valid unit prints' );
	}
}
