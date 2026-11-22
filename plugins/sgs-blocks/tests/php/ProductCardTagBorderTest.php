<?php
/**
 * sgs/product-card: the trial tag's border width and colour (tagBorderWidth, tagBorderColour), beside the existing
 * tagBorderRadius (shop investigation F-65).
 *
 * Run with: vendor/bin/phpunit --filter ProductCardTagBorderTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ProductCardTagBorderTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const BASE = array(
		'sourceMode'   => 'typed',
		'productName'  => 'Trial pack',
		'variantStyle' => 'trial',
		'tagText'      => 'Trial',
	);

	/** The CSS rule bodies printed for the trial tag's own scoped selector. */
	private function tag_rules( string $css ): string {
		preg_match_all( '/\.sgs-product-card__tag--trial\{([^}]*)\}/', $css, $m );
		return implode( ';', $m[1] );
	}

	public function test_width_and_colour_print_on_the_trial_tag(): void {
		$out   = $this->render_block(
			'sgs/product-card',
			self::BASE + array(
				'tagBorderWidth'  => array( 'top' => '1px', 'right' => '1px', 'bottom' => '1px', 'left' => '1px' ),
				'tagBorderColour' => '#3a2a1a',
			)
		);
		$rules = $this->tag_rules( $out['css'] );
		$this->assertMatchesRegularExpression( '/border(-top)?-width:1px/', $rules );
		$this->assertStringContainsString( 'border-color:#3a2a1a', $rules );
	}

	public function test_unset_prints_no_border(): void {
		$out   = $this->render_block( 'sgs/product-card', self::BASE + array( 'tagBorderRadius' => '8px' ) );
		$rules = $this->tag_rules( $out['css'] );
		$this->assertStringContainsString( 'border-radius:8px', $rules, 'the tag rule printed, so the negative control is not vacuous' );
		$this->assertStringNotContainsString( 'border-width', $rules );
		$this->assertStringNotContainsString( 'border-color', $rules );
		$this->assertStringNotContainsString( 'border-style', $rules );
	}

	public function test_the_radius_prints_once(): void {
		$out = $this->render_block(
			'sgs/product-card',
			self::BASE + array(
				'tagBorderRadius' => '8px',
				'tagBorderWidth'  => array( 'top' => '2px', 'right' => '2px', 'bottom' => '2px', 'left' => '2px' ),
			)
		);
		$this->assertSame( 1, substr_count( $this->tag_rules( $out['css'] ), 'border-radius' ) );
	}
}
