<?php
/**
 * The button preset's hover transform split into lift, scale and rotate, and the Motion hover markers that drop one part.
 *
 * Run with: vendor/bin/phpunit --filter ButtonHoverPartsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Sgs_Button_Hover_Parts;
use SGS\Blocks\Motion\Sgs_Motion_Emitter;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-button-hover-parts.php';

final class ButtonHoverPartsTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * @return array<string,array{0:string,1:array<string,string>}>
	 */
	public static function transforms(): array {
		return array(
			'lift 3px (Eye Care)'      => array( 'matrix(1, 0, 0, 1, 0, -3)', array( 'hover-lift' => 'translate(0px, -3px)' ) ),
			'diagonal lift (Mama)'     => array( 'matrix(1, 0, 0, 1, -3, -3)', array( 'hover-lift' => 'translate(-3px, -3px)' ) ),
			'scale and lift (Indus)'   => array(
				'matrix(1.05, 0, 0, 1.05, 0, -2.1)',
				array(
					'hover-lift'  => 'translate(0px, -2.1px)',
					'hover-scale' => 'scale(1.05)',
				)
			),
			'matrix rotation'          => array(
				'matrix(0.866025, 0.5, -0.5, 0.866025, 0, 0)',
				array( 'hover-rotate' => 'rotate(30deg)' ),
			),
			'translateY'               => array( 'translateY(-2px)', array( 'hover-lift' => 'translate(0px, -2px)' ) ),
			'translate, scale, rotate' => array(
				'translate(2px, -4px) scale(1.1) rotate(3deg)',
				array(
					'hover-lift'   => 'translate(2px, -4px)',
					'hover-scale'  => 'scale(1.1)',
					'hover-rotate' => 'rotate(3deg)',
				)
			),
			'uniform scale pair'       => array( 'scale(1.2, 1.2)', array( 'hover-scale' => 'scale(1.2)' ) ),
			'none'                     => array( 'none', array() ),
			'identity matrix'          => array( 'matrix(1, 0, 0, 1, 0, 0)', array() ),
		);
	}

	/**
	 * @dataProvider transforms
	 * @param string               $input    Preset transform.
	 * @param array<string,string> $expected Expected parts.
	 */
	#[\PHPUnit\Framework\Attributes\DataProvider( 'transforms' )]
	public function test_split_derives_each_part( string $input, array $expected ): void {
		$this->assertSame( $expected, Sgs_Button_Hover_Parts::split( $input ) );
	}

	public function test_a_form_that_cannot_be_split_stays_whole_in_lift(): void {
		foreach ( array( 'scale(1.2, 1.4)', 'scale(1.1) translateY(-2px)', 'skewX(5deg)', 'translateY(-1em)', 'matrix(1, 0, 0.3, 1, 0, -3)' ) as $odd ) {
			$out = Sgs_Button_Hover_Parts::derive( array( 'primary' => array( 'hover-transform' => $odd ) ) );
			$this->assertSame( array( 'primary' => array( 'hover-lift' => $odd ) ), $out, $odd );
		}
	}

	public function test_a_preset_with_its_own_transform_does_not_inherit_the_default_parts(): void {
		$out = Sgs_Button_Hover_Parts::derive(
			array(
				'default' => array( 'hover-transform' => 'matrix(1.05, 0, 0, 1.05, 0, -2.1)' ),
				'primary' => array( 'hover-transform' => 'matrix(1, 0, 0, 1, 0, -3)' ),
				'link'    => array( 'text' => '#000' ),
			)
		);
		$this->assertSame( 'scale(1)', $out['primary']['hover-scale'], 'default scale must not show through' );
		$this->assertSame( 'translate(0px, -3px)', $out['primary']['hover-lift'] );
		$this->assertArrayNotHasKey( 'link', $out, 'a preset without a transform keeps falling back whole' );
	}

	public function test_an_unsplittable_preset_transform_still_masks_the_default_scale_and_rotate(): void {
		$out = Sgs_Button_Hover_Parts::derive(
			array(
				'default' => array( 'hover-transform' => 'translate(0px, -2px) scale(1.05) rotate(2deg)' ),
				'primary' => array( 'hover-transform' => 'scale(1.1) translateY(-4px)' ),
			)
		);
		$this->assertSame( 'scale(1.1) translateY(-4px)', $out['primary']['hover-lift'], 'the whole transform stays in hover-lift' );
		$this->assertSame( 'scale(1)', $out['primary']['hover-scale'], 'the default scale must not stack on it' );
		$this->assertSame( 'rotate(0deg)', $out['primary']['hover-rotate'], 'the default rotate must not stack on it' );
		$this->assertArrayNotHasKey( 'hover-lift-whole', $out['primary'], 'the internal marker is never published' );
	}

	public function test_hover_markers_only_for_the_self_source_and_hover_fields(): void {
		$state = array( 'values' => array( 'translateY' => -2, 'restRotate' => -2 ), 'devices' => array( 'mobile' => array( 'scale' => 1.25 ) ) );
		$this->assertSame(
			array( 'data-sgs-mh-move' => '', 'data-sgs-mh-scale' => '' ),
			Sgs_Motion_Emitter::hover_part_markers( $state ),
			'translate and scale set markers; a rest rotation does not'
		);
		$this->assertSame( array(), Sgs_Motion_Emitter::hover_part_markers( $state + array( 'source' => 'root' ) ) );
		$this->assertSame( array(), Sgs_Motion_Emitter::hover_part_markers( array( 'values' => array( 'opacity' => 0.5 ) ) ) );
	}

	public function test_built_in_lift_off_adds_the_still_class(): void {
		$on  = $this->render_block( 'sgs/button', array( 'text' => 'Go', 'url' => 'https://example.test/' ) );
		$off = $this->render_block( 'sgs/button', array( 'text' => 'Go', 'url' => 'https://example.test/', 'builtInHoverLift' => false ) );
		$this->assertStringNotContainsString( 'sgs-button--hover-still', $on['html'] );
		$this->assertStringContainsString( 'sgs-button--hover-still', $off['html'] );
	}
}
