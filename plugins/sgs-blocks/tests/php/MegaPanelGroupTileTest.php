<?php
/**
 * Tests: sgs/mega-panel's groupPadding and groupTransitionDuration overrides.
 *
 * groupPadding is a per-tier box object emitted through sgs_emit_responsive_css()
 * with 'box' => true (the same call render.php makes), so only the sides that are
 * set print, and an unset value prints nothing. groupTransitionDuration is a
 * numeric-millisecond string validated by sgs_motion_ms(). The remaining checks
 * read block.json and render.php to prove both attributes are declared with no
 * default value and that render.php emits them on the group tile.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MegaPanelGroupTileTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

require_once dirname( __DIR__, 2 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-motion-easing.php';

final class MegaPanelGroupTileTest extends TestCase {

	private const TILE = '.u.wp-block-sgs-mega-panel[data-mega-style] .sgs-mega-group';

	private function emit( array $group_padding ): string {
		if ( empty( $group_padding ) ) {
			return '';
		}
		return sgs_emit_responsive_css(
			self::TILE,
			array(
				array(
					'value'        => $group_padding,
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
			),
			array( 'container' => false )
		);
	}

	public function test_top_and_bottom_only_print_those_longhands(): void {
		$css = $this->emit( array( 'desktop' => array( 'top' => '26px', 'bottom' => '26px' ) ) );
		$this->assertStringContainsString( 'padding-top:26px;', $css );
		$this->assertStringContainsString( 'padding-bottom:26px;', $css );
		$this->assertStringNotContainsString( 'padding-left', $css );
		$this->assertStringNotContainsString( 'padding-right', $css );
		$this->assertStringStartsWith( self::TILE . '{', $css );
	}

	public function test_unset_emits_nothing(): void {
		$this->assertSame( '', $this->emit( array() ) );
		$this->assertSame( '', $this->emit( array( 'desktop' => array() ) ) );
	}

	public function test_duration_is_validated_as_milliseconds(): void {
		$this->assertSame( 250, sgs_motion_ms( '250', 0 ) );
		$this->assertSame( 0, sgs_motion_ms( 'url(x)', 0 ) );
		$this->assertSame( 3000, sgs_motion_ms( '99999', 0 ) );
	}

	public function test_block_json_declares_both_without_a_value(): void {
		$json = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/mega-panel/block.json' ), true );
		$this->assertSame( 'object', $json['attributes']['groupPadding']['type'] );
		$this->assertSame( array(), $json['attributes']['groupPadding']['default'] );
		$this->assertSame( 'string', $json['attributes']['groupTransitionDuration']['type'] );
		$this->assertSame( '', $json['attributes']['groupTransitionDuration']['default'] );
		$map = $json['supports']['sgs']['elements']['group']['attrMap'];
		$this->assertSame( 'groupPadding', $map['css:padding'] );
		$this->assertSame( 'groupTransitionDuration', $map['css:transition-duration'] );
	}

	public function test_render_emits_both_on_the_group_tile(): void {
		$php = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/mega-panel/render.php' );
		$this->assertStringContainsString( "\$attributes['groupPadding']", $php );
		$this->assertStringContainsString( "'[data-mega-style]' . \$rel_group", $php );
		$this->assertStringContainsString( "'{transition-duration:' . sgs_motion_ms(", $php );
		$this->assertLessThan(
			strpos( $php, '@media (prefers-reduced-motion: reduce){' ),
			strpos( $php, "\$attributes['groupTransitionDuration']" ),
			'the duration rule must precede the reduced-motion block'
		);
	}
}
