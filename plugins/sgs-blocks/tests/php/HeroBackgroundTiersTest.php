<?php
/**
 * sgs/hero (standard variant): the tablet and mobile background images reach the front end.
 *
 * The standard hero paints its background as a private <img> (LCP priority) only when no tier image is set; with a
 * tablet or mobile image the whole background stays on the shared wrapper's ::before layer, as for every other block
 * using the Background panel (SGS_Container_Wrapper swaps tiers inside @media rules a lone <img> cannot follow).
 *
 * Run with: vendor/bin/phpunit --filter HeroBackgroundTiersTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class HeroBackgroundTiersTest extends TestCase {

	use BlockHarnessRenderTrait;

	public function test_tablet_and_mobile_images_paint_through_the_wrapper(): void {
		$out = $this->render_block(
			'sgs/hero',
			array(
				'backgroundImage'       => array( 'url' => 'https://example.com/desk.jpg' ),
				'backgroundImageTablet' => array( 'url' => 'https://example.com/tab.jpg' ),
				'backgroundImageMobile' => array( 'url' => 'https://example.com/mob.jpg' ),
			)
		);

		$this->assertStringNotContainsString( 'sgs-hero__bg-img', $out['html'] );
		$this->assertStringContainsString( 'https://example.com/desk.jpg', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media \(max-width:1023px\)\{[^}]*::before\{background-image:url\(https:\/\/example\.com\/tab\.jpg\)/', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media \(max-width:767px\)\{[^}]*::before\{background-image:url\(https:\/\/example\.com\/mob\.jpg\)/', $out['css'] );
	}

	public function test_desktop_only_image_stays_a_bare_img(): void {
		$out = $this->render_block(
			'sgs/hero',
			array( 'backgroundImage' => array( 'url' => 'https://example.com/desk.jpg' ) )
		);

		$this->assertStringContainsString( 'sgs-hero__bg-img', $out['html'] );
		$this->assertStringNotContainsString( 'example.com/desk.jpg', $out['css'] );
	}
}
