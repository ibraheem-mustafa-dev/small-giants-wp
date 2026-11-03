<?php
/**
 * Tests: the Attributes-panel save path of the buy box "Pick a set" mode: posted rows become a sanitised flags map keyed
 * by the attribute key, a row ticked "Used for variations" carries none, and the panel's wording avoids developer terms.
 *
 * Run with: vendor/bin/phpunit --filter ConfiguratorPicksAdminTest
 *
 * @package SGS\Blocks\Tests
 */

namespace SGS\Blocks\Tests {

	use PHPUnit\Framework\Attributes\PreserveGlobalState;
	use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
	use PHPUnit\Framework\TestCase;
	use SGS\Blocks\Configurator_Picks_Admin;


	#[RunTestsInSeparateProcesses]
	#[PreserveGlobalState( false )]
	final class ConfiguratorPicksAdminTest extends TestCase {

		public static function setUpBeforeClass(): void {
			require_once __DIR__ . '/support/picks-stubs.php';
			require_once dirname( __DIR__, 2 ) . '/includes/configurator-picks/class-configurator-picks-admin.php';
		}

		public function test_posted_rows_become_flags_keyed_by_attribute_key(): void {
			$flags = Configurator_Picks_Admin::flags_from_request(
				array( 0 => array( 'multi' => '1', 'least' => '1', 'most' => '3', 'overflow' => 'replace', 'startWith' => 'vanilla', 'share' => '1' ) ),
				array( 0 => 'Flavour' ),
				array()
			);
			$this->assertSame( array( 'flavour' ), array_keys( $flags ) );
			$this->assertSame( 'replace', $flags['flavour']['overflow'] );
			$this->assertTrue( $flags['flavour']['share'] );
		}

		public function test_a_global_attribute_is_keyed_by_its_taxonomy_name(): void {
			$flags = Configurator_Picks_Admin::flags_from_request( array( 1 => array( 'multi' => '1' ) ), array( 1 => 'pa_flavour' ), array() );
			$this->assertSame( array( 'pa_flavour' ), array_keys( $flags ) );
		}

		public function test_a_row_used_for_variations_and_an_unticked_row_carry_no_flags(): void {
			$flags = Configurator_Picks_Admin::flags_from_request(
				array( 0 => array( 'multi' => '1' ), 1 => array( 'least' => '2' ), 2 => array( 'multi' => '1' ) ),
				array( 0 => 'pa_pack-size', 1 => 'Colour', 2 => 'Flavour' ),
				array( 0 => '1' )
			);
			$this->assertSame( array( 'flavour' ), array_keys( $flags ), 'variation row dropped, no-multi row dropped' );
		}

		public function test_hostile_values_are_clamped_or_dropped(): void {
			$flags = Configurator_Picks_Admin::flags_from_request(
				array( 0 => array( 'multi' => '1', 'most' => '9999', 'overflow' => '<script>', 'startWith' => '<b>x</b>' ) ),
				array( 0 => 'Flavour' ),
				array()
			);
			$this->assertSame( 12, $flags['flavour']['most'] );
			$this->assertSame( 'refuse', $flags['flavour']['overflow'] );
			$this->assertStringNotContainsString( '<', $flags['flavour']['startWith'] );
		}

		public function test_the_panel_never_uses_developer_words(): void {
			$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/configurator-picks/class-configurator-picks-admin.php' );
			preg_match_all( "/esc_html__\\(\\s*['\"](.+?)['\"]\\s*,/", $source, $m );
			$this->assertNotEmpty( $m[1] );
			foreach ( $m[1] as $text ) {
				$this->assertDoesNotMatchRegularExpression( '/taxonomy|overflow|refuse|replace/i', $text, $text );
			}
		}
	}
}
