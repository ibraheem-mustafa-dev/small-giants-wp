<?php
/**
 * A stored length never breaks out of the block's CSS rule: a length string in sgs/text's and sgs/heading's max width
 * and custom width, and in sgs/quote's attribution margin, is checked by the shared length validator (nothing prints
 * when it holds `;`, `{` or `}`), and the same setting holding a safe length prints it.
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

	private const HOSTILE_LENGTH = '10px;}body{color:red';

	public function test_a_hostile_text_or_heading_length_string_prints_nothing(): void {
		foreach ( array( 'sgs/text' => array( 'text' => 'Fresh bread' ), 'sgs/heading' => array( 'content' => 'Fresh bread' ) ) as $slug => $base ) {
			foreach ( array( 'maxWidth' => 'max-width', 'customWidth' => 'width' ) as $attr => $property ) {
				$css = $this->render_block( $slug, array_merge( $base, array( $attr => array( 'desktop' => self::HOSTILE_LENGTH ) ) ) )['css'];

				$this->assertStringNotContainsString( 'body{', $css, "$slug $attr: nothing leaves the rule" );
				$this->assertStringNotContainsString( 'color:red', $css, "$slug $attr: nothing leaves the rule" );
				$this->assertStringNotContainsString( $property . ':10px', $css, "$slug $attr: a refused length prints no declaration" );

				$ok = $this->render_block( $slug, array_merge( $base, array( $attr => array( 'desktop' => '40rem' ) ) ) )['css'];
				$this->assertMatchesRegularExpression( '/(?<![-\w])' . preg_quote( $property, '/' ) . ':40rem/', $ok, "$slug $attr: control, a safe length prints" );
			}
		}
	}

	public function test_a_hostile_quote_margin_length_prints_nothing(): void {
		$css = $this->render_block(
			'sgs/quote',
			array(
				'attribution'          => 'A regular',
				'attributionMarginTop' => array( 'desktop' => self::HOSTILE_LENGTH ),
			)
		)['css'];

		$this->assertStringNotContainsString( 'body{', $css, 'nothing leaves the rule' );
		$this->assertStringNotContainsString( 'color:red', $css, 'nothing leaves the rule' );
		$this->assertStringNotContainsString( 'margin-top:10px', $css, 'a refused length prints no declaration' );
	}

	public function test_the_quote_margin_prints_a_length_per_device(): void {
		$css = $this->render_block(
			'sgs/quote',
			array(
				'attribution'          => 'A regular',
				'attributionMarginTop' => array(
					'desktop' => '1.5rem',
					'mobile'  => '8px',
				),
			)
		)['css'];

		$this->assertMatchesRegularExpression( '/\{[^{}]*margin-top:1\.5rem;?[^{}]*\}/', $css, 'desktop length in the base rule' );
		$this->assertMatchesRegularExpression( '/@media[^{]*max-width:767px[^{]*\{[^{}]*\{[^{}]*margin-top:8px/', $css, 'mobile length in the mobile query' );
	}
}
