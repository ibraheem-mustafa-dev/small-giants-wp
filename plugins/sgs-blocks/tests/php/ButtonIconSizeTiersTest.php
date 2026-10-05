<?php
/**
 * sgs/button: a tablet or mobile icon size repaints the icon at that width.
 *
 * The per-device icon size is emitted as --sgs-btn-icon-size on the button root;
 * the icon's svg rule must read that property, not the desktop size as a literal,
 * or the tablet/mobile values never reach the icon.
 *
 * Run with: vendor/bin/phpunit --filter ButtonIconSizeTiersTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ButtonIconSizeTiersTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_icon_svg_reads_the_per_device_size_property(): void {
		$out = $this->render_block(
			'sgs/button',
			array(
				'label'    => 'Go',
				'icon'     => 'arrow-right',
				'iconSize' => array(
					'desktop' => 20,
					'tablet'  => 28,
					'mobile'  => 32,
				),
			)
		);

		$this->assertStringContainsString( '@media (max-width:767px)', $out['css'] );
		$this->assertStringContainsString( '--sgs-btn-icon-size:32px', $out['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-button__icon svg\{width:var\(--sgs-btn-icon-size,1em\);height:var\(--sgs-btn-icon-size,1em\);\}/', $out['css'] );
		$this->assertStringNotContainsString( 'svg{width:20px', $out['css'] );
	}

	public function test_mobile_only_size_still_sizes_the_icon(): void {
		$out = $this->render_block(
			'sgs/button',
			array(
				'label'    => 'Go',
				'icon'     => 'arrow-right',
				'iconSize' => array( 'mobile' => 32 ),
			)
		);

		$this->assertStringContainsString( '.sgs-button__icon svg{width:var(--sgs-btn-icon-size,1em)', $out['css'] );
	}
}
