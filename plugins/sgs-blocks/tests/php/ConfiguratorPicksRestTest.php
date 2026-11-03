<?php
/**
 * Tests: the "Pick a set" setup checklist the buy box editor shows (pack found or not, pick groups, setup faults).
 *
 * Run with: vendor/bin/phpunit --filter ConfiguratorPicksRestTest
 *
 * @package SGS\Blocks\Tests
 */

namespace SGS\Blocks\Tests {

	use PHPUnit\Framework\Attributes\PreserveGlobalState;
	use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
	use PHPUnit\Framework\TestCase;
	use SGS\Blocks\Configurator_Picks_Rest;

	#[RunTestsInSeparateProcesses]
	#[PreserveGlobalState( false )]
	final class ConfiguratorPicksRestTest extends TestCase {

		public static function setUpBeforeClass(): void {
			require_once __DIR__ . '/support/picks-stubs.php';
			require_once dirname( __DIR__, 2 ) . '/includes/configurator-picks/preflight.php';
			require_once dirname( __DIR__, 2 ) . '/includes/configurator-picks/class-configurator-picks-rest.php';
		}

		protected function setUp(): void {
			$GLOBALS['sgs_t_meta']   = array( 7 => array( '_sgs_pack_size_axis' => 'pa_pack-size' ) );
			$GLOBALS['sgs_t_groups'] = array(
				array(
					'key' => 'pa_pack-size', 'label' => 'Pack size', 'role' => 'priced', 'flags' => array(),
					'terms' => array(
						array( 'id' => 0, 'slug' => 'pack-of-8', 'label' => 'Pack of 8' ),
						array( 'id' => 0, 'slug' => 'pack-of-20', 'label' => '20 cookies' ),
					),
				),
				array(
					'key' => 'flavour', 'label' => 'Flavour', 'role' => 'answer',
					'flags' => array( 'multi' => true, 'least' => 1, 'most' => 3, 'overflow' => 'refuse', 'startWith' => '', 'share' => 'equal' ),
					'terms' => array(
						array( 'id' => 0, 'slug' => 'a', 'label' => 'A', 'colour' => '', 'image' => 0, 'badge' => '', 'description' => '' ),
						array( 'id' => 0, 'slug' => 'b', 'label' => 'B', 'colour' => '', 'image' => 0, 'badge' => '', 'description' => '' ),
					),
				),
			);
		}

		public function test_a_healthy_product_reports_the_pack_and_the_group(): void {
			$list = Configurator_Picks_Rest::checklist( 7 );
			$this->assertTrue( $list['pack']['found'] );
			$this->assertSame( array( 8, 20 ), $list['pack']['sizes'] );
			$this->assertSame( 'flavour', $list['groups'][0]['key'] );
			$this->assertTrue( $list['groups'][0]['active'] );
			$this->assertSame( 'equal', $list['groups'][0]['share'] );
			$this->assertSame( array(), $list['issues'] );
		}

		public function test_an_unreadable_pack_term_is_named(): void {
			$GLOBALS['sgs_t_groups'][0]['terms'][1]['label'] = 'Big box';
			$list = Configurator_Picks_Rest::checklist( 7 );
			$this->assertFalse( $list['pack']['found'] );
			$this->assertSame( array( 'Big box' ), $list['pack']['unparseable'] );
			$this->assertNotEmpty( $list['issues'] );
		}

		public function test_a_product_with_no_pick_groups_has_an_empty_list(): void {
			$GLOBALS['sgs_t_groups'] = array( $GLOBALS['sgs_t_groups'][0] );
			$this->assertSame( array(), Configurator_Picks_Rest::checklist( 7 )['groups'] );
		}
	}
}
