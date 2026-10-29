<?php
/**
 * Sgs/multi-button: an unset mobile tier inherits the tablet value.
 *
 * The tablet rules print inside a bounded `(min-width:768px) and (max-width:1023px)` query, so
 * they never cascade down to mobile in CSS. The mobile rule must therefore carry the tablet
 * value itself when the mobile tier is unset (Spec 02, per-breakpoint override model).
 * Direction, cross-axis alignment and gap keep their own mobile defaults (the stacked look).
 *
 * Run with: vendor/bin/phpunit --filter MultiButtonTierInheritanceTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Multi-button device-tier inheritance.
 */
final class MultiButtonTierInheritanceTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * The CSS inside one media query of the block's output.
	 *
	 * @param string $css   Rendered CSS.
	 * @param string $query Media query as printed, e.g. '@media(max-width:767px)'.
	 * @return string The query's rule body, or '' when absent.
	 */
	private function media_body( string $css, string $query ): string {
		$this->assertSame( 1, preg_match( '/' . preg_quote( $query, '/' ) . '\{[^{]*\{([^}]*)\}\}/', $css, $m ), $query . ' is printed' );
		return $m[1];
	}

	public function test_unset_mobile_inherits_tablet_justify_and_wrap(): void {
		$out = $this->render_block(
			'sgs/multi-button',
			array(
				'justifyContent' => array(
					'desktop' => 'flex-end',
					'tablet'  => 'flex-start',
				),
				'flexWrap'       => array(
					'desktop' => 'nowrap',
					'tablet'  => 'wrap',
				),
			)
		);

		$tablet = $this->media_body( $out['css'], '@media(max-width:1023px) and (min-width:768px)' );
		$mobile = $this->media_body( $out['css'], '@media(max-width:767px)' );

		$this->assertStringContainsString( 'justify-content:flex-start;', $tablet );
		$this->assertStringContainsString( 'justify-content:flex-start;', $mobile, 'mobile carries the tablet value, not the desktop flex-end' );
		$this->assertStringNotContainsString( 'flex-end', $mobile );
		$this->assertStringContainsString( 'flex-wrap:wrap;', $mobile, 'mobile carries the tablet wrap, not the nowrap constant' );
	}

	public function test_explicit_mobile_value_wins_over_tablet(): void {
		$out = $this->render_block(
			'sgs/multi-button',
			array(
				'justifyContent' => array(
					'desktop' => 'flex-end',
					'tablet'  => 'flex-start',
					'mobile'  => 'center',
				),
				'flexWrap'       => array(
					'desktop' => 'nowrap',
					'tablet'  => 'wrap',
					'mobile'  => 'wrap-reverse',
				),
			)
		);

		$mobile = $this->media_body( $out['css'], '@media(max-width:767px)' );

		$this->assertStringContainsString( 'justify-content:center;', $mobile );
		$this->assertStringContainsString( 'flex-wrap:wrap-reverse;', $mobile );
		$this->assertStringNotContainsString( 'justify-content:flex-start;', $mobile );
	}

	public function test_with_no_tablet_value_mobile_still_follows_desktop(): void {
		$out = $this->render_block( 'sgs/multi-button', array( 'justifyContent' => array( 'desktop' => 'flex-end' ) ) );

		$this->assertStringContainsString( 'justify-content:flex-end;', $this->media_body( $out['css'], '@media(max-width:767px)' ) );
	}

	public function test_mobile_keeps_its_own_stacked_defaults(): void {
		$out    = $this->render_block(
			'sgs/multi-button',
			array(
				'flexDirection' => array( 'desktop' => 'row', 'tablet' => 'row' ),
				'alignItems'    => array( 'desktop' => 'center', 'tablet' => 'flex-start' ),
			)
		);
		$mobile = $this->media_body( $out['css'], '@media(max-width:767px)' );

		$this->assertStringContainsString( 'flex-direction:column;', $mobile );
		$this->assertStringContainsString( 'align-items:stretch;', $mobile );
		$this->assertStringContainsString( 'gap:8px;', $mobile );
	}
}
