<?php
/**
 * Device visibility hides exactly one tier's elements at every viewport width, fractional ones included (a zoomed
 * browser or a scaled display gives 1023.4px, which `max-width:1023px` and `min-width:1024px` both miss).
 *
 * The test parses the bounds out of the generated CSS and evaluates them at each width, so it asserts the rule a browser
 * would apply, not a string.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
class DeviceVisibilityFractionalTest extends TestCase {

	protected function setUp(): void {
		// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stubs.
		if ( ! function_exists( 'add_filter' ) ) {
			function add_filter() {}
		}
		if ( ! function_exists( 'add_action' ) ) {
			function add_action() {}
		}
		// phpcs:enable
		require_once dirname( __DIR__, 2 ) . '/includes/device-visibility.php';
	}

	/**
	 * Which hide classes the generated CSS applies at a viewport width.
	 *
	 * @param float $width Viewport width in px.
	 * @return string[] Classes whose media query matches.
	 */
	private function hidden_at( float $width ): array {
		$css = \SGS\Blocks\device_visibility_css();
		preg_match_all( '/@media ([^{]+)\{\.(sgs-hide-[a-z]+)\{/', $css, $rules, PREG_SET_ORDER );
		$this->assertCount( 3, $rules, 'one rule per tier' );
		$hidden = array();
		foreach ( $rules as $rule ) {
			$matches = true;
			preg_match_all( '/\((min|max)-width:([0-9.]+)px\)/', $rule[1], $edges, PREG_SET_ORDER );
			$this->assertNotEmpty( $edges );
			foreach ( $edges as $edge ) {
				$bound = (float) $edge[2];
				if ( 'min' === $edge[1] && $width < $bound ) {
					$matches = false;
				}
				if ( 'max' === $edge[1] && $width > $bound ) {
					$matches = false;
				}
			}
			if ( $matches ) {
				$hidden[] = $rule[2];
			}
		}
		return $hidden;
	}

	public static function widthProvider(): array {
		return array(
			'767'    => array( 767.0, 'sgs-hide-mobile' ),
			'767.5'  => array( 767.5, 'sgs-hide-mobile' ),
			'768'    => array( 768.0, 'sgs-hide-tablet' ),
			'1023'   => array( 1023.0, 'sgs-hide-tablet' ),
			'1023.5' => array( 1023.5, 'sgs-hide-tablet' ),
			'1024'   => array( 1024.0, 'sgs-hide-desktop' ),
			'320'    => array( 320.0, 'sgs-hide-mobile' ),
			'1920'   => array( 1920.0, 'sgs-hide-desktop' ),
		);
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'widthProvider' )]
	public function test_exactly_one_tier_hides_at_each_width( float $width, string $expected ): void {
		$this->assertSame( array( $expected ), $this->hidden_at( $width ) );
	}

	public function test_bounds_come_from_the_breakpoint_source(): void {
		$css = \SGS\Blocks\device_visibility_css();
		$this->assertStringContainsString( SGS_Breakpoints::query_fractional( 'mobile' ), $css );
		$this->assertStringContainsString( SGS_Breakpoints::query_fractional( 'tablet-only' ), $css );
		$this->assertStringContainsString( SGS_Breakpoints::query_fractional( 'desktop' ), $css );
	}
}
