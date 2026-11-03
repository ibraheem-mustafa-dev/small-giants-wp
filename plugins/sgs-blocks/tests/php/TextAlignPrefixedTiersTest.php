<?php
/**
 * Prefixed per-breakpoint text alignment (FW-F): a `{prefix}TextAlign` object on each converted block prints its
 * desktop value as the base rule and its mobile value in the mobile query, through the shared typography emitter.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter TextAlignPrefixedTiersTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TextAlignPrefixedTiersTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * @return array<string,array{0:string,1:array,2:string}>
	 */
	public static function converted(): array {
		return array(
			'team-member name'      => array( 'sgs/team-member', array( 'name' => 'Ada' ), 'nameTextAlign' ),
			'team-member bio'       => array( 'sgs/team-member', array( 'name' => 'Ada', 'bio' => 'Hello' ), 'bioTextAlign' ),
			'trust-bar label'       => array( 'sgs/trust-bar', array(), 'labelTextAlign' ),
			'pricing-table title'   => array( 'sgs/pricing-table', array(), 'titleTextAlign' ),
			'countdown number'      => array( 'sgs/countdown-timer', array( 'targetDate' => '2099-01-01T00:00:00' ), 'numberTextAlign' ),
			'icon-list item'        => array( 'sgs/icon-list', array(), 'itemTextAlign' ),
			'testimonial quote'     => array( 'sgs/testimonial', array( 'quote' => 'Great' ), 'quoteTextAlign' ),
			'product-faq question'  => array( 'sgs/product-faq', array(), 'questionTextAlign' ),
			'process-steps title'   => array( 'sgs/process-steps', array(), 'titleTextAlign' ),
		);
	}

	/**
	 * @dataProvider converted
	 */
	public function test_each_breakpoint_prints_for_the_prefixed_attribute( string $block, array $attrs, string $attr ): void {
		$out = $this->render_block( $block, array_merge( $attrs, array( $attr => array( 'desktop' => 'left', 'mobile' => 'center' ) ) ) );
		$css = $out['css'];

		$this->assertMatchesRegularExpression( '/\{[^}]*text-align:left;[^}]*\}/', $css, $block . ' ' . $attr . ': desktop base rule' );
		$this->assertMatchesRegularExpression( '/@media \(max-width:\s*767px\)\s*\{[^{}]*\{[^}]*text-align:center/', $css, $block . ' ' . $attr . ': mobile rule' );

		$unset = $this->render_block( $block, $attrs )['css'];
		$this->assertDoesNotMatchRegularExpression( '/text-align:(left|center)/', $unset, 'negative control: unset prints nothing' );
	}
}
