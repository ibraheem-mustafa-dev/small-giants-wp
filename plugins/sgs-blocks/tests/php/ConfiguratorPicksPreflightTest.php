<?php
/**
 * Tests: the Product_Preflight check for "Pick a set" products.
 *
 * Run with: vendor/bin/phpunit --filter ConfiguratorPicksPreflightTest
 *
 * @package SGS\Blocks\Tests
 */

namespace SGS\Blocks\Tests {

	use PHPUnit\Framework\Attributes\PreserveGlobalState;
	use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
	use PHPUnit\Framework\TestCase;
	use function SGS\Blocks\sgs_picks_preflight_issues;


	#[RunTestsInSeparateProcesses]
	#[PreserveGlobalState( false )]
	final class ConfiguratorPicksPreflightTest extends TestCase {

		public static function setUpBeforeClass(): void {
			require_once __DIR__ . '/support/picks-stubs.php';
			require_once dirname( __DIR__, 2 ) . '/includes/configurator-picks/preflight.php';
		}

		private static function group( int $terms, array $flags = array() ): array {
			$list = array();
			for ( $i = 0; $i < $terms; $i++ ) {
				$list[] = array( 'id' => $i, 'slug' => 's' . $i, 'label' => 'S' . $i );
			}
			return array( 'key' => 'flavour', 'label' => 'Flavour', 'role' => 'answer', 'terms' => $list, 'flags' => array_merge( array( 'multi' => true, 'least' => 1, 'most' => 3, 'share' => false ), $flags ) );
		}

		private static function codes( array $groups, array $pack ): array {
			return array_column( sgs_picks_preflight_issues( $groups, $pack ), 'code' );
		}

		private const NO_PACK = array( 'key' => '', 'units' => array(), 'unparseable' => array() );

		public function test_a_healthy_product_and_one_without_pick_groups_have_no_issues(): void {
			$this->assertSame( array(), self::codes( array( self::group( 4 ) ), self::NO_PACK ) );
			$this->assertSame( array(), self::codes( array( array( 'key' => 'k', 'label' => 'K', 'role' => 'answer', 'terms' => array(), 'flags' => array() ) ), array( 'key' => 'p', 'units' => array(), 'unparseable' => array( 'Big box' ) ) ) );
		}

		public function test_a_group_with_fewer_than_two_options_is_flagged(): void {
			$this->assertSame( array( 'picks_too_few_options' ), self::codes( array( self::group( 1 ) ), self::NO_PACK ) );
		}

		public function test_an_unreadable_pack_term_is_flagged_by_name(): void {
			$issues = sgs_picks_preflight_issues( array( self::group( 3 ) ), array( 'key' => 'p', 'units' => array( 'a' => 8 ), 'unparseable' => array( 'Big box' ) ) );
			$this->assertSame( 'picks_pack_unreadable', $issues[0]['code'] );
			$this->assertStringContainsString( 'Big box', $issues[0]['message'] );
		}

		public function test_most_above_the_smallest_pack_is_flagged_only_when_sharing(): void {
			$pack = array( 'key' => 'p', 'units' => array( 'two' => 2, 'big' => 20 ), 'unparseable' => array() );
			$this->assertSame( array( 'picks_most_above_pack' ), self::codes( array( self::group( 4, array( 'share' => true ) ) ), $pack ) );
			$this->assertSame( array(), self::codes( array( self::group( 4 ) ), $pack ) );
		}
	}
}
