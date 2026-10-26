<?php
/**
 * sgs/container hover shadow SHAPE (`shadowHover`) and root overflow control
 * (`overflow`: visible | hidden | clip).
 *
 * Run with: vendor/bin/phpunit --filter ContainerHoverShadowOverflowTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ContainerHoverShadowOverflowTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const HOVER_SHAPE = '0 26px 46px 0';
	private const HOVER_COL   = 'rgba(7,60,80,.5)';

	/**
	 * @param array<string, mixed> $attrs Container attributes.
	 * @return array{html: string, css: string, uid: string}
	 */
	private function render_container( array $attrs ): array {
		$out        = $this->render_block( 'sgs/container', $attrs );
		$out['uid'] = 1 === preg_match( '/sgs-container-[0-9a-f]{8}/', $out['html'], $m ) ? $m[0] : '';
		return $out;
	}

	public function test_hover_shape_replaces_the_resting_shape_on_hover(): void {
		$out      = $this->render_container(
			array(
				'shadow'            => '0 2px 4px 0',
				'shadowColour'      => self::HOVER_COL,
				'shadowHover'       => self::HOVER_SHAPE,
				'shadowColourHover' => self::HOVER_COL,
			)
		);
		$expected = sgs_shadow_value_composed( self::HOVER_SHAPE, self::HOVER_COL );
		$this->assertNotSame( '', $expected );
		$this->assertStringContainsString( '.' . $out['uid'] . ':hover', $out['css'] );
		$this->assertStringContainsString( 'box-shadow:' . $expected, $out['css'] );
	}

	public function test_hover_shape_alone_uses_the_resting_colour_and_needs_no_resting_shadow(): void {
		$out      = $this->render_container(
			array(
				'shadowColour' => self::HOVER_COL,
				'shadowHover'  => self::HOVER_SHAPE,
			)
		);
		$expected = sgs_shadow_value_composed( self::HOVER_SHAPE, self::HOVER_COL );
		$this->assertStringContainsString( '.' . $out['uid'] . ':hover', $out['css'] );
		$this->assertStringContainsString( 'box-shadow:' . $expected, $out['css'] );
	}

	public function test_no_hover_shape_keeps_the_existing_hover_output(): void {
		$attrs = array(
			'shadow'            => '0 2px 4px 0',
			'shadowColour'      => self::HOVER_COL,
			'shadowColourHover' => 'rgba(1,2,3,.4)',
		);
		$with  = $this->render_container( $attrs );
		$this->assertStringContainsString( sgs_shadow_value_composed( '0 2px 4px 0', 'rgba(1,2,3,.4)' ), $with['css'] );
		$this->assertStringNotContainsString( self::HOVER_SHAPE, $with['css'] );
	}

	public function test_overflow_clip_and_hidden_paint_on_the_root(): void {
		foreach ( array( 'clip', 'hidden' ) as $value ) {
			$out = $this->render_container( array( 'overflow' => $value ) );
			$this->assertStringContainsString( '.' . $out['uid'] . '{overflow:' . $value, $out['css'], $value );
		}
	}

	public function test_overflow_visible_or_unset_prints_nothing(): void {
		foreach ( array( array(), array( 'overflow' => 'visible' ), array( 'overflow' => 'bogus' ) ) as $attrs ) {
			$out = $this->render_container( $attrs );
			$this->assertStringNotContainsString( 'overflow:', $out['css'] );
		}
	}

	/**
	 * @return array<string, array{0: array<string, mixed>, 1: string}>
	 */
	public static function clipping_modes(): array {
		return array(
			'shape divider' => array(
				array(
					'shapeDividerTop'       => 'wave',
					'shapeDividerTopColour' => 'primary',
				),
				'sgs-container--has-shape-divider',
			),
			'svg background' => array(
				array( 'bgSvgContent' => '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>' ),
				'sgs-container--has-bg-svg',
			),
		);
	}

	/**
	 * A mode that clips (shape divider, SVG background) gets `overflow: hidden` from style.css. The overflow
	 * control prints only an explicit hidden or clip, so leaving it on Visible (or unset) must never print a rule
	 * that would unclip the mode.
	 *
	 * @dataProvider clipping_modes
	 * @param array<string, mixed> $mode_attrs Attributes that switch the mode on.
	 * @param string               $class_name The mode's root class.
	 */
	public function test_the_overflow_control_never_unclips_a_clipping_mode( array $mode_attrs, string $class_name ): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/container/style.css' );
		$this->assertMatchesRegularExpression( '/\.' . preg_quote( $class_name, '/' ) . '\s*[,{][^}]*overflow:\s*hidden/s', $css, 'the stylesheet clips this mode' );

		foreach ( array( array(), array( 'overflow' => 'visible' ) ) as $attrs ) {
			$out = $this->render_container( $mode_attrs + $attrs );
			$this->assertStringContainsString( $class_name, $out['html'], 'positive control: the mode is on' );
			$this->assertStringNotContainsString( 'overflow:', $out['css'], 'Visible or unset prints no overflow rule' );
		}

		$out = $this->render_container( $mode_attrs + array( 'overflow' => 'hidden' ) );
		$this->assertStringContainsString( '.' . $out['uid'] . '{overflow:hidden', $out['css'], 'an explicit hidden agrees with the mode' );
	}

	public function test_scroll_row_overflow_stays_on_the_row_and_wins_on_its_own_axis(): void {
		$out = $this->render_container(
			array(
				'overflow'       => 'clip',
				'scrollSideways' => array( 'desktop' => 'on' ),
			)
		);
		$root = strpos( $out['css'], '.' . $out['uid'] . '{overflow:clip' );
		$row  = strpos( $out['css'], 'overflow-x:auto;overflow-y:hidden' );
		$this->assertNotFalse( $root, 'root clip rule missing' );
		$this->assertNotFalse( $row, 'scroll row rule missing' );
		$this->assertLessThan( $row, $root, 'the scroll row rule must come after the root overflow rule' );
		$this->assertStringNotContainsString( '.' . $out['uid'] . '{overflow-x:auto', $out['css'], 'the row is not the root' );
	}

	public function test_unset_container_is_unchanged_by_both_attributes(): void {
		$base = $this->render_container( array( 'shadow' => '0 2px 4px 0' ) );
		$this->assertStringNotContainsString( 'overflow:', $base['css'] );
		$same = $this->render_container( array( 'shadow' => '0 2px 4px 0', 'shadowHover' => '', 'overflow' => 'visible' ) );
		// The scope classes hash the attribute set, so they differ whenever an attribute is present; everything else must match.
		$norm = static fn( array $o ): string => preg_replace( '/sgs-c(?:ontainer|st)-[0-9a-f]{8}/', 'U', $o['html'] . $o['css'] );
		$this->assertSame( $norm( $base ), $norm( $same ), 'default values must render byte-identically' );
	}
}
