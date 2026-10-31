<?php
/**
 * sgs/team-member and sgs/star-rating: the wrapper text colour (flat, gradient, hover) reaches the text their stylesheet paints itself.
 *
 * Run with: vendor/bin/phpunit --filter WrapperTextColourReachesChildrenTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class WrapperTextColourReachesChildrenTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const GRADIENT = 'linear-gradient(90deg,#f00,#00f)';

	/**
	 * @return array<string, array{0: string, 1: array<string, mixed>, 2: string[]}>
	 */
	public static function blocks(): array {
		return array(
			'team-member' => array( 'sgs/team-member', array( 'name' => 'Ann', 'role' => 'CEO', 'bio' => 'Bio text' ), array( 'sgs-team-member__bio' ) ),
			'star-rating' => array( 'sgs/star-rating', array( 'rating' => 4, 'displayMode' => 'stars', 'showNumeric' => true, 'showLabel' => true, 'label' => 'Great' ), array( 'sgs-star-rating__numeric', 'sgs-star-rating__label', 'sgs-star-rating__value', 'sgs-star-rating__count' ) ),
		);
	}

	/**
	 * @dataProvider blocks
	 */
	public function test_flat_gradient_and_hover_reach_the_children( string $slug, array $attrs, array $children ): void {
		$flat = $this->render_block( $slug, array_merge( $attrs, array( 'textColour' => '#112233' ) ) )['css'];
		$grad = $this->render_block( $slug, array_merge( $attrs, array( 'textColourGradient' => self::GRADIENT ) ) )['css'];
		$hov  = $this->render_block( $slug, array_merge( $attrs, array( 'textColourHover' => '#445566' ) ) )['css'];
		$hovg = $this->render_block( $slug, array_merge( $attrs, array( 'textColourHoverGradient' => self::GRADIENT ) ) )['css'];

		foreach ( $children as $child ) {
			$this->assertMatchesRegularExpression( '/ \.' . $child . '\{color:#112233;\}/', $flat, "flat on $child" );
			$this->assertMatchesRegularExpression( '/ \.' . $child . '\{background-image:linear-gradient\(90deg,#f00,#00f\);-webkit-background-clip:text;background-clip:text;color:transparent;\}/', $grad, "gradient on $child" );
			$this->assertMatchesRegularExpression( '/:hover \.' . $child . '\{color:#445566\}/', $hov, "hover on $child" );
			$this->assertMatchesRegularExpression( '/:hover \.' . $child . '\{background-image:linear-gradient\(90deg,#f00,#00f\);-webkit-background-clip:text;background-clip:text;color:transparent\}/', $hovg, "hover gradient on $child" );
		}
	}

	/**
	 * @dataProvider blocks
	 */
	public function test_nothing_is_printed_without_a_text_colour( string $slug, array $attrs, array $children ): void {
		$css = $this->render_block( $slug, $attrs )['css'];

		foreach ( $children as $child ) {
			$this->assertStringNotContainsString( ' .' . $child . '{color:', $css, 'negative control' );
		}
	}
}
