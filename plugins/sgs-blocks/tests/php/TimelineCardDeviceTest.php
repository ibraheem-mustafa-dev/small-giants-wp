<?php
/**
 * sgs/timeline: the per-device card strip settings (card layout, space between cards, card shadow per device, a bordered
 * carousel card, image band height) print their rules and print nothing when unset.
 *
 * Run with: vendor/bin/phpunit --filter TimelineCardDeviceTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TimelineCardDeviceTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function block( array $extra ): array {
		$entries = array(
			array( 'date' => '2020', 'title' => 'A', 'description' => 'x', 'icon' => '', 'image' => 0 ),
			array( 'date' => '2021', 'title' => 'B', 'description' => 'y', 'icon' => '', 'image' => 0 ),
		);
		return $this->render_block(
			'sgs/timeline',
			array_merge( array( 'orientation' => 'horizontal', 'contentLayout' => 'same-side', 'mobileLayout' => 'carousel', 'entries' => $entries ), $extra )
		);
	}

	public function test_nothing_prints_by_default(): void {
		$out = $this->block( array() );
		foreach ( array( 'sgs-tl-card-display', 'sgs-tl-card-gap', 'sgs-tl-strip-pad', 'card-bordered', 'aspect-ratio:auto' ) as $needle ) {
			$this->assertStringNotContainsString( $needle, $out['css'] . $out['html'], $needle );
		}
	}

	public function test_stacked_layout_prints_per_device_ranges_and_side_prints_nothing(): void {
		$out = $this->block( array( 'cardLayout' => array( 'desktop' => 'side', 'tablet' => 'stacked', 'mobile' => 'stacked' ) ) );
		$this->assertMatchesRegularExpression( "/@media ?\(min-width:768px\) and \(max-width:1023px\)\{[^{]*\.sgs-timeline__entry\{display:grid;grid-template-columns:minmax\(0,1fr\);grid-template-areas:'media' 'date' 'content';row-gap:0;--sgs-tl-card-display:grid;/", $out['css'] );
		$this->assertMatchesRegularExpression( "/@media ?\(max-width:767px\)\{[^{]*\.sgs-timeline__entry\{display:grid;/", $out['css'] );
		// the stacked card spaces its rows by the date's own margins: the list layout's entry gap must not add a row gap
		$this->assertMatchesRegularExpression( "/@media ?\(max-width:767px\)\{[^{]*\.sgs-timeline__entry\{display:grid;[^}]*row-gap:0;/", $out['css'] );
		$this->assertDoesNotMatchRegularExpression( "/@media ?\(min-width:1024px\)\{[^{]*\.sgs-timeline__entry\{display:grid/", $out['css'], 'negative control: desktop stays side by side' );

		$not_same_side = $this->block( array( 'contentLayout' => 'alternating', 'cardLayout' => array( 'tablet' => 'stacked' ) ) );
		$this->assertStringNotContainsString( 'sgs-tl-card-display', $not_same_side['css'] );
	}

	public function test_card_gap_prints_the_real_gap_and_the_carousel_property(): void {
		$out = $this->block( array( 'cardGap' => array( 'desktop' => 32, 'tablet' => 16 ) ) );
		$this->assertMatchesRegularExpression( '/\.sgs-timeline__list\{column-gap:32px;--sgs-tl-card-gap:32px;\}/', $out['css'] );
		$this->assertMatchesRegularExpression( '/@media ?\(max-width:1023px\)\{[^{]*\.sgs-timeline__list\{column-gap:16px;--sgs-tl-card-gap:16px;\}/', $out['css'] );
	}

	public function test_device_shadows_print_inside_their_widths(): void {
		$out = $this->block( array( 'cardShadowTablet' => '0 26px 44px -30px', 'cardShadowTabletColour' => '#2C3E5099' ) );
		$this->assertMatchesRegularExpression( '/@media ?\(max-width:1023px\)\{[^{]*\.sgs-timeline__entry\{box-shadow:0px 26px 44px -30px/', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/@media ?\(max-width:767px\)\{[^{]*\.sgs-timeline__entry\{box-shadow/', $out['css'], 'negative control: the mobile pair is unset' );
	}

	public function test_a_card_border_marks_the_root_so_the_carousel_stripe_gives_way(): void {
		$none = $this->block( array() );
		$this->assertStringNotContainsString( 'sgs-timeline--card-bordered', $none['html'] );
		$set = $this->block( array( 'cardBorderColour' => '#2C3E5014', 'cardBorderWidth' => array( 'top' => '1px', 'right' => '1px', 'bottom' => '1px', 'left' => '1px' ) ) );
		$this->assertStringContainsString( 'sgs-timeline--card-bordered', $set['html'] );
	}

	public function test_image_height_replaces_the_aspect_ratio_per_device(): void {
		$out = $this->block( array( 'mediaAspectRatio' => array( 'desktop' => '4 / 5' ), 'mediaHeight' => array( 'tablet' => 190 ) ) );
		$this->assertMatchesRegularExpression( '/@media ?\(max-width:1023px\)\{[^{]*\.sgs-timeline__media-slot\{height:190px;aspect-ratio:auto;\}/', $out['css'] );
	}

	public function test_mobile_content_side_space_pads_the_swipeable_row(): void {
		$out = $this->block( array( 'scrollEffect' => 'pinned-horizontal', 'panelContentGutter' => array( 'desktop' => 40, 'mobile' => 20 ) ) );
		$this->assertMatchesRegularExpression( '/@media ?\(max-width:767px\)\{[^{]*\.sgs-timeline__list\{scroll-padding-inline:20px;--sgs-tl-strip-pad:20px;\}/', $out['css'] );
		$desktop_only = $this->block( array( 'scrollEffect' => 'pinned-horizontal', 'panelContentGutter' => array( 'desktop' => 40 ) ) );
		$this->assertStringNotContainsString( 'sgs-tl-strip-pad', $desktop_only['css'], 'negative control: only an explicit mobile value pads the row' );
	}
}
