<?php
/**
 * Per-device layout distribution (justifyContent, justifyItems, alignContent) and process-steps gaps (stepGap, numberGap).
 *
 * The desktop value prints with the layout declarations exactly as the old single value did; tablet and mobile print as
 * overrides only where they differ and only where the layout applies the property.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter LayoutDistributionTiersTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class LayoutDistributionTiersTest extends TestCase {

	use BlockHarnessRenderTrait;

	/** The CSS with the instance's hashed class names removed, so two renders can be compared byte for byte. */
	private function stable( string $css ): string {
		return (string) preg_replace( '/sgs-[a-z-]+-[0-9a-f]{8}/', 'UID', $css );
	}

	private const MOBILE = '/@media\(max-width:\s*767\.98px\)\s*\{[^{}]*\{[^}]*%s/';

	public function test_flex_container_prints_each_tier_of_justify_content(): void {
		$css = $this->render_block( 'sgs/container', array( 'layout' => 'flex', 'justifyContent' => array( 'desktop' => 'center', 'mobile' => 'flex-start' ) ) )['css'];
		$this->assertMatchesRegularExpression( '/justify-content:center/', $css, 'desktop base declaration' );
		$this->assertMatchesRegularExpression( sprintf( self::MOBILE, 'justify-content:flex-start' ), $css, 'mobile override' );
	}

	public function test_flex_container_tablet_only_value_carries_to_mobile_without_a_second_rule(): void {
		$css = $this->render_block( 'sgs/container', array( 'layout' => 'flex', 'justifyContent' => array( 'tablet' => 'space-between' ) ) )['css'];
		$this->assertSame( 1, substr_count( $css, 'justify-content:space-between' ), 'the tablet rule prints once; mobile inherits it' );
		$this->assertDoesNotMatchRegularExpression( '/(?<!\{)justify-content:center/', $css );
	}

	public function test_grid_container_prints_justify_items_and_align_content_tiers(): void {
		$css = $this->render_block( 'sgs/container', array(
			'layout'       => 'grid',
			'justifyItems' => array( 'desktop' => 'center', 'mobile' => 'stretch' ),
			'alignContent' => array( 'tablet' => 'space-between' ),
		) )['css'];
		$this->assertMatchesRegularExpression( '/justify-items:center/', $css );
		$this->assertMatchesRegularExpression( sprintf( self::MOBILE, 'justify-items:stretch' ), $css, 'mobile goes back to stretch' );
		$this->assertMatchesRegularExpression( '/align-content:space-between/', $css, 'tablet align-content override' );
	}

	public function test_a_property_the_layout_does_not_apply_prints_no_override(): void {
		$flex = $this->render_block( 'sgs/container', array( 'layout' => 'flex', 'justifyItems' => array( 'mobile' => 'center' ), 'alignContent' => array( 'mobile' => 'center' ) ) )['css'];
		$this->assertDoesNotMatchRegularExpression( '/justify-items|align-content/', $flex, 'negative control: grid-only properties on a flex row' );
		$grid = $this->render_block( 'sgs/container', array( 'layout' => 'grid', 'justifyContent' => array( 'mobile' => 'center' ) ) )['css'];
		$this->assertDoesNotMatchRegularExpression( '/justify-content/', $grid, 'negative control: flex-only property on a grid' );
	}

	public function test_desktop_only_value_prints_what_the_scalar_printed(): void {
		foreach ( array(
			array( 'flex', 'justifyContent', 'space-between' ),
			array( 'grid', 'justifyItems', 'center' ),
			array( 'grid', 'alignContent', 'end' ),
		) as list( $layout, $attr, $value ) ) {
			$old = $this->render_block( 'sgs/container', array( 'layout' => $layout, $attr => $value ) )['css'];
			$new = $this->render_block( 'sgs/container', array( 'layout' => $layout, $attr => array( 'desktop' => $value ) ) )['css'];
			$this->assertNotSame( '', $old );
			$this->assertSame( $this->stable( $old ), $this->stable( $new ), $attr . ': byte for byte as the scalar printed' );
		}
	}

	public function test_untouched_container_prints_no_distribution_declaration(): void {
		$css = $this->render_block( 'sgs/container', array( 'layout' => 'grid' ) )['css'];
		$this->assertDoesNotMatchRegularExpression( '/justify-items|align-content|justify-content/', $css );
	}

	public function test_process_steps_gaps_print_per_device(): void {
		$css = $this->render_block( 'sgs/process-steps', array(
			'layout'    => 'list',
			'stepGap'   => array( 'desktop' => '24px', 'mobile' => '8px' ),
			'numberGap' => array( 'desktop' => '20px', 'mobile' => '6px' ),
		) )['css'];
		$this->assertMatchesRegularExpression( '/--sgs-step-gap:24px;gap:24px;/', $css, 'desktop step gap: both declarations, in the old order' );
		$this->assertMatchesRegularExpression( sprintf( self::MOBILE, '--sgs-step-gap:8px;gap:8px;' ), $css, 'mobile step gap' );
		$this->assertMatchesRegularExpression( '/layout-list \.sgs-process-steps__step\{column-gap:20px;\}/', $css, 'desktop number gap' );
		$this->assertMatchesRegularExpression( sprintf( self::MOBILE, 'column-gap:6px' ), $css, 'mobile number gap' );
	}

	public function test_process_steps_desktop_only_gap_prints_one_plain_rule(): void {
		$css = $this->render_block( 'sgs/process-steps', array( 'layout' => 'list', 'stepGap' => array( 'desktop' => '24px' ), 'numberGap' => array( 'desktop' => '20px' ) ) )['css'];
		$this->assertSame( 1, substr_count( $css, '--sgs-step-gap:24px' ) );
		$this->assertDoesNotMatchRegularExpression( '/@media[^{]*\{[^{}]*\{[^}]*(--sgs-step-gap|column-gap)/', $css, 'no override when only desktop is set' );
		$unset = $this->render_block( 'sgs/process-steps', array( 'layout' => 'list' ) )['css'];
		$this->assertDoesNotMatchRegularExpression( '/--sgs-step-gap:|column-gap:/', $unset, 'negative control: unset prints nothing' );
	}

	public function test_hero_prints_each_tier_where_its_variant_applies_it(): void {
		$split = $this->render_block( 'sgs/hero', array( 'variant' => 'split', 'justifyItems' => array( 'desktop' => 'center', 'mobile' => 'start' ), 'alignContent' => array( 'tablet' => 'end' ) ) )['css'];
		$this->assertMatchesRegularExpression( '/justify-items:center/', $split );
		$this->assertMatchesRegularExpression( sprintf( self::MOBILE, 'justify-items:start' ), $split, 'split hero: mobile justify-items' );
		$this->assertMatchesRegularExpression( '/align-content:end/', $split, 'split hero: tablet align-content' );
		$standard = $this->render_block( 'sgs/hero', array( 'variant' => 'standard', 'justifyContent' => array( 'desktop' => 'center', 'mobile' => 'flex-start' ) ) )['css'];
		$this->assertMatchesRegularExpression( '/justify-content:center/', $standard );
		$this->assertMatchesRegularExpression( sprintf( self::MOBILE, 'justify-content:flex-start' ), $standard, 'standard hero: mobile justify-content' );
		$flexOnly = $this->render_block( 'sgs/hero', array( 'variant' => 'standard', 'justifyItems' => array( 'mobile' => 'center' ) ) )['css'];
		$this->assertDoesNotMatchRegularExpression( '/justify-items/', $flexOnly, 'negative control: a grid-only property on the flex variant' );
	}

	public function test_feature_grid_prints_justify_items_per_device(): void {
		$css = $this->render_block( 'sgs/feature-grid', array( 'justifyItems' => array( 'desktop' => 'center', 'mobile' => 'start' ) ) )['css'];
		$this->assertMatchesRegularExpression( '/justify-items:\s*center/', $css );
		$this->assertMatchesRegularExpression( sprintf( self::MOBILE, 'justify-items:start' ), $css, 'mobile override' );
	}

	public function test_gallery_grid_prints_justify_items_and_align_content_per_device(): void {
		$css = $this->render_block( 'sgs/gallery', array( 'justifyItems' => array( 'desktop' => 'center', 'mobile' => 'start' ), 'alignContent' => array( 'desktop' => 'end' ) ) )['css'];
		$this->assertMatchesRegularExpression( '/justify-items:center/', $css );
		$this->assertMatchesRegularExpression( '/align-content:end/', $css );
		$this->assertMatchesRegularExpression( sprintf( self::MOBILE, 'justify-items:start' ), $css, 'mobile override' );
	}

	public function test_drawer_menu_rows_print_each_spread_and_restore_the_start_padding(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ );
		}
		require_once dirname( __DIR__, 2 ) . '/includes/nav-drawer-menu-section-css.php';
		$css = sgs_nav_drawer_menu_row_layout_css( array( 'justifyContent' => array( 'desktop' => 'center', 'tablet' => 'flex-start' ) ), '.u' );
		$this->assertStringContainsString( '.u .sgs-nav-drawer-menu__link{justify-content:center;}', $css, 'desktop spread' );
		$this->assertStringContainsString( '.u .sgs-nav-drawer-menu__accordion-row > .sgs-nav-drawer-menu__link{padding-inline-start:56px;}', $css, 'a centred row reserves the expander side' );
		$this->assertMatchesRegularExpression( '/@media[^{]*\{[^{}]*__link\{justify-content:flex-start;\}[^@]*padding-inline-start:12px/', $css, 'leaving centre restores the start padding' );
		$desktop_only = sgs_nav_drawer_menu_row_layout_css( array( 'justifyContent' => array( 'desktop' => 'space-between' ) ), '.u' );
		$this->assertStringNotContainsString( '@media', $desktop_only, 'a desktop-only value prints no override' );
		$this->assertSame( '', sgs_nav_drawer_menu_row_layout_css( array(), '.u' ), 'negative control: unset prints nothing' );
	}
}
