<?php
/**
 * Tests: `SGS_Media_Priority::resolve` (Spec 49 section 7.7), the loading rules, the cap, the single high claim,
 * the 50,000 px floor, REST, unarmed, and the per-device slot counting as one image.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MediaPriorityTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MediaPriorityTest extends TestCase {

	private const BIG = array( 'width' => 1920, 'height' => 1080 );

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		if ( ! function_exists( 'apply_filters' ) ) {
			function apply_filters( string $hook, $value, ...$args ) {
				$cb = $GLOBALS['sgs_test_filters'][ $hook ] ?? null;
				return null === $cb ? $value : $cb( $value, ...$args );
			}
		}
		require_once dirname( __DIR__, 2 ) . '/includes/motion/class-sgs-motion-fold.php';
		require_once dirname( __DIR__, 2 ) . '/includes/motion/class-sgs-fold-scan.php';
		require_once dirname( __DIR__, 2 ) . '/includes/media/class-sgs-media-priority.php';
		$GLOBALS['sgs_test_filters'] = array();
		SGS_Media_Priority::reset();
	}

	private static function page( bool $fold = true ): array {
		return array( 'armed' => true, 'rest' => false, 'fold' => $fold );
	}

	public function test_hidden_surface_is_lazy_and_claims_nothing(): void {
		$r = SGS_Media_Priority::resolve( array( 'hidden' => true, 'load' => 'first' ) + self::BIG, self::page() );
		$this->assertSame( 'lazy', $r['loading'] );
		$this->assertSame( 'auto', $r['fetchpriority'] );
		$this->assertSame( array( 'eager' => false, 'lead' => false ), $r['claims'] );
		$next = SGS_Media_Priority::resolve( self::BIG, self::page() );
		$this->assertSame( 'high', $next['fetchpriority'], 'the hidden image left the lead claim free' );
	}

	public function test_load_first_is_eager_and_the_lead_candidate(): void {
		$r = SGS_Media_Priority::resolve( array( 'load' => 'first' ) + self::BIG, self::page( false ) );
		$this->assertSame( 'eager', $r['loading'] );
		$this->assertSame( 'high', $r['fetchpriority'] );
	}

	public function test_load_later_is_lazy_even_above_the_fold(): void {
		$r = SGS_Media_Priority::resolve( array( 'load' => 'later' ) + self::BIG, self::page( true ) );
		$this->assertSame( 'lazy', $r['loading'] );
		$this->assertSame( 'auto', $r['fetchpriority'] );
	}

	public function test_above_the_fold_is_eager_and_below_it_is_lazy(): void {
		$this->assertSame( 'eager', SGS_Media_Priority::resolve( self::BIG, self::page( true ) )['loading'] );
		$this->assertSame( 'lazy', SGS_Media_Priority::resolve( self::BIG, self::page( false ) )['loading'] );
	}

	public function test_fold_is_computed_from_the_tree_with_the_default_two_sections(): void {
		$section = static fn(): array => array( 'blockName' => 'sgs/container', 'attrs' => array(), 'innerBlocks' => array() );
		$tree    = array( $section(), $section(), $section() );
		$second  = SGS_Media_Priority::resolve( self::BIG, array( 'armed' => true, 'rest' => false, 'tree' => $tree, 'path' => array( 1 ) ) );
		$third   = SGS_Media_Priority::resolve( self::BIG, array( 'armed' => true, 'rest' => false, 'tree' => $tree, 'path' => array( 2 ) ) );
		$this->assertSame( 'eager', $second['loading'], 'the second section is above the fold' );
		$this->assertSame( 'lazy', $third['loading'], 'the third is past the fold' );
	}

	public function test_the_eager_cap_follows_the_filter(): void {
		$GLOBALS['sgs_test_filters']['sgs_eager_image_limit'] = static fn( $v ) => 3;
		$loading = array();
		for ( $i = 0; $i < 5; $i++ ) {
			$loading[] = SGS_Media_Priority::resolve( self::BIG, self::page() )['loading'];
		}
		$this->assertSame( array( 'eager', 'eager', 'eager', 'lazy', 'lazy' ), $loading );
	}

	public function test_the_default_cap_is_sixteen(): void {
		$eager = 0;
		for ( $i = 0; $i < 20; $i++ ) {
			$eager += 'eager' === SGS_Media_Priority::resolve( self::BIG, self::page() )['loading'] ? 1 : 0;
		}
		$this->assertSame( 16, $eager );
	}

	public function test_only_one_image_takes_high(): void {
		$priorities = array();
		for ( $i = 0; $i < 3; $i++ ) {
			$priorities[] = SGS_Media_Priority::resolve( self::BIG, self::page() )['fetchpriority'];
		}
		$this->assertSame( array( 'high', 'auto', 'auto' ), $priorities );
	}

	public function test_logo_layer_and_brand_strip_never_lead(): void {
		foreach ( array( 'logo', 'layer', 'brand-strip' ) as $role ) {
			SGS_Media_Priority::reset();
			$r = SGS_Media_Priority::resolve( array( 'role' => $role ) + self::BIG, self::page() );
			$this->assertSame( 'eager', $r['loading'], $role );
			$this->assertSame( 'auto', $r['fetchpriority'], $role );
		}
		$this->assertSame( 'high', SGS_Media_Priority::resolve( self::BIG, self::page() )['fetchpriority'], 'the next content image still leads' );
	}

	public function test_the_fifty_thousand_pixel_floor(): void {
		$small = SGS_Media_Priority::resolve( array( 'width' => 305, 'height' => 102 ), self::page() );
		$this->assertSame( 'eager', $small['loading'] );
		$this->assertSame( 'auto', $small['fetchpriority'] );
		$under = SGS_Media_Priority::resolve( array( 'width' => 249, 'height' => 200 ), self::page() );
		$this->assertSame( 'auto', $under['fetchpriority'] );
		$unknown = SGS_Media_Priority::resolve( array(), self::page() );
		$this->assertSame( 'auto', $unknown['fetchpriority'], 'no known size never takes high' );
		$edge = SGS_Media_Priority::resolve( array( 'width' => 250, 'height' => 200 ), self::page() );
		$this->assertSame( 'high', $edge['fetchpriority'], '50,000 px exactly qualifies' );
	}

	public function test_the_floor_follows_the_core_filter(): void {
		$GLOBALS['sgs_test_filters']['wp_min_priority_img_pixels'] = static fn( $v ) => 1000;
		$this->assertSame( 'high', SGS_Media_Priority::resolve( array( 'width' => 50, 'height' => 50 ), self::page() )['fetchpriority'] );
	}

	public function test_rest_is_lazy_and_never_high_even_for_load_first(): void {
		$r = SGS_Media_Priority::resolve( array( 'load' => 'first' ) + self::BIG, array( 'armed' => true, 'rest' => true, 'fold' => true ) );
		$this->assertSame( 'lazy', $r['loading'] );
		$this->assertSame( 'auto', $r['fetchpriority'] );
	}

	public function test_unarmed_is_lazy_and_never_high(): void {
		$r = SGS_Media_Priority::resolve( array( 'load' => 'first' ) + self::BIG, array( 'armed' => false, 'rest' => false, 'fold' => true ) );
		$this->assertSame( 'lazy', $r['loading'] );
		$this->assertSame( 'auto', $r['fetchpriority'] );
	}

	public function test_a_refused_slot_does_not_spend_the_cap_or_the_claim(): void {
		SGS_Media_Priority::resolve( self::BIG, array( 'armed' => false, 'fold' => true ) );
		SGS_Media_Priority::resolve( self::BIG, array( 'armed' => true, 'rest' => true, 'fold' => true ) );
		$this->assertSame( 'high', SGS_Media_Priority::resolve( self::BIG, self::page() )['fetchpriority'] );
	}

	public function test_a_per_device_slot_resolved_once_counts_as_one_image(): void {
		$GLOBALS['sgs_test_filters']['sgs_eager_image_limit'] = static fn( $v ) => 2;
		$slot = SGS_Media_Priority::resolve( array( 'width' => 1920, 'height' => 1080, 'per_device' => true ), self::page() );
		$next = SGS_Media_Priority::resolve( self::BIG, self::page() );
		$last = SGS_Media_Priority::resolve( self::BIG, self::page() );
		$this->assertSame( 'high', $slot['fetchpriority'] );
		$this->assertSame( 'eager', $next['loading'], 'the two-device slot used one place of the cap' );
		$this->assertSame( 'lazy', $last['loading'] );
	}
}
