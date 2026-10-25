<?php
/**
 * Tests: a header or footer row prints its scroll-animation settings for whichever of scroll-away and shrink it has.
 *
 * Renders the REAL src/blocks/site-header-row/render.php and site-footer-row/render.php through the QA harness.
 * A row that scrolls away (rowHideOnScroll) without shrinking still gets `rowAnimate` off and a `rowShrinkDuration`
 * timing on its collapse (`.is-row-collapse-mode`) and its base transition, and none of the shrink-only declarations
 * (the published --sgs-row-shrink-* timing, `.is-row-shrink-active`, the shrunk padding). A row that only shrinks gets
 * no collapse rule. Negative control: a row with neither behaviour prints none of the settings, whatever is stored.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Render-level coverage of sgs_row_shrink_settings_css() through both row blocks.
 */
final class RowScrollSettingsRenderTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const CONTENT = '<p>Row content</p>';

	/**
	 * Both row blocks share the helper, so every case runs against each.
	 *
	 * @return array<string, array{0: string}>
	 */
	public static function rows(): array {
		return array(
			'header row' => array( 'sgs/site-header-row' ),
			'footer row' => array( 'sgs/site-footer-row' ),
		);
	}

	/**
	 * Render a row with content (an empty row renders nothing) and return its CSS.
	 *
	 * @param string               $slug  Row block slug.
	 * @param array<string, mixed> $attrs Row attributes.
	 */
	private function row_css( string $slug, array $attrs ): string {
		return $this->render_block( $slug, $attrs, array(), array(), self::CONTENT )['css'];
	}

	/**
	 * Row animation off (rowAnimate false) stops the collapse and the slide of a row that scrolls away without shrinking.
	 *
	 * @param string $slug Row block slug.
	 */
	#[DataProvider( 'rows' )]
	public function test_animation_off_reaches_a_row_that_only_scrolls_away( string $slug ): void {
		$css = $this->row_css(
			$slug,
			array(
				'rowHideOnScroll' => array( 'desktop' => 'on' ),
				'rowAnimate'      => false,
			)
		);
		$this->assertMatchesRegularExpression( '/\.sgs-row-behaviour,[^{]*\.is-row-collapse-mode\{transition:none;\}/', $css, 'rowAnimate off removes the collapse and the base slide' );
		$this->assertStringNotContainsString( 'is-row-shrink-active', $css, 'a row that does not shrink gets no shrink rule' );
		$this->assertStringNotContainsString( '--sgs-row-shrink-duration', $css, 'nor the shrink timing its children read' );
	}

	/**
	 * The row speed and curve time the collapse of a row that scrolls away without shrinking.
	 *
	 * @param string $slug Row block slug.
	 */
	#[DataProvider( 'rows' )]
	public function test_speed_times_the_collapse_of_a_row_that_only_scrolls_away( string $slug ): void {
		$css = $this->row_css(
			$slug,
			array(
				'rowHideOnScroll'   => array( 'desktop' => 'on' ),
				'rowShrinkDuration' => 400,
				'rowShrinkEasing'   => 'linear',
				'rowShrinkPadding'  => array( 'desktop' => array( 'top' => '4px' ) ),
			)
		);
		$this->assertMatchesRegularExpression( '/\.is-row-collapse-mode\{transition:background-color 400ms linear,transform 400ms linear,block-size 400ms linear/', $css );
		$this->assertMatchesRegularExpression( '/prefers-reduced-motion: reduce\)\{[^{]*\.is-row-collapse-mode\{transition:none;\}\}/', $css, 'reduced motion resets the timed collapse' );
		$this->assertStringNotContainsString( 'is-row-shrink-active', $css );
		$this->assertStringNotContainsString( 'is-row-shrunk', $css, 'the shrunk padding is a shrink-only setting' );
		$this->assertStringNotContainsString( '--sgs-row-shrink-duration', $css );
	}

	/**
	 * A row that shrinks without scrolling away gets the shrink settings and no collapse rule.
	 *
	 * @param string $slug Row block slug.
	 */
	#[DataProvider( 'rows' )]
	public function test_a_row_that_only_shrinks_gets_no_collapse_rule( string $slug ): void {
		$css = $this->row_css(
			$slug,
			array(
				'rowShrink'         => array( 'desktop' => 'on' ),
				'rowShrinkDuration' => 400,
			)
		);
		$this->assertStringContainsString( '--sgs-row-shrink-duration:400ms', $css );
		$this->assertMatchesRegularExpression( '/\.is-row-shrink-active\{transition:background-color 400ms/', $css );
		$this->assertStringNotContainsString( 'is-row-collapse-mode', $css );

		$off = $this->row_css(
			$slug,
			array(
				'rowShrink'  => array( 'desktop' => 'on' ),
				'rowAnimate' => false,
			)
		);
		$this->assertStringContainsString( '--sgs-row-shrink-duration:0ms', $off );
		$this->assertMatchesRegularExpression( '/\.is-row-shrink-active,[^{]*>\.sgs-container__inner\{transition:none;\}/', $off );
		$this->assertStringNotContainsString( 'is-row-collapse-mode', $off );
	}

	/**
	 * Negative control: a row with neither behaviour prints none of the settings.
	 *
	 * @param string $slug Row block slug.
	 */
	#[DataProvider( 'rows' )]
	public function test_negative_control_a_row_with_neither_behaviour_prints_no_settings( string $slug ): void {
		$css = $this->row_css(
			$slug,
			array(
				'rowTransparent'    => array( 'desktop' => 'on' ),
				'rowAnimate'        => false,
				'rowShrinkDuration' => 400,
				'rowShrinkEasing'   => 'linear',
				'rowShrinkPadding'  => array( 'desktop' => array( 'top' => '4px' ) ),
			)
		);
		$this->assertStringNotContainsString( 'transition', $css );
		$this->assertStringNotContainsString( '--sgs-row-shrink', $css );
		$this->assertStringNotContainsString( 'is-row-', $css );
	}
}
