<?php
/**
 * Tests: the buy box "Pick a set" server rules (Pick a set plan, Phase 2): flag sanitising, pack numbers, the equal
 * split, the pick check and the cart hook that stores one server-built row.
 *
 * Run with: vendor/bin/phpunit --filter ConfiguratorPicksTest
 *
 * @package SGS\Blocks\Tests
 */


namespace SGS\Blocks\Tests {

	use PHPUnit\Framework\Attributes\PreserveGlobalState;
	use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
	use PHPUnit\Framework\TestCase;
	use SGS\Blocks\Configurator_Groups;
	use SGS\Blocks\Configurator_Picks;
	use function SGS\Blocks\sgs_picks_active_groups;
	use function SGS\Blocks\sgs_picks_check;
	use function SGS\Blocks\sgs_picks_distribute;
	use function SGS\Blocks\sgs_picks_parse_pack_number;
	use function SGS\Blocks\sgs_picks_per_unit_pence;
	use function SGS\Blocks\sgs_picks_sanitise_flags;


	#[RunTestsInSeparateProcesses]
	#[PreserveGlobalState( false )]
	final class ConfiguratorPicksTest extends TestCase {

		public static function setUpBeforeClass(): void {
			require_once __DIR__ . '/support/picks-stubs.php';
		}

		private const FLAVOURS = array(
			array( 'id' => 1, 'slug' => 'vanilla', 'label' => 'Vanilla' ),
			array( 'id' => 2, 'slug' => 'strawberry', 'label' => 'Strawberry' ),
			array( 'id' => 3, 'slug' => 'mango', 'label' => 'Mango' ),
			array( 'id' => 4, 'slug' => 'mint', 'label' => 'Mint' ),
		);

		protected function setUp(): void {
			$GLOBALS['sgs_t_meta']   = array( 7 => array( '_sgs_pack_size_axis' => 'pa_pack-size' ) );
			$GLOBALS['sgs_t_groups'] = array(
				array(
					'key' => 'pa_pack-size', 'label' => 'Pack size', 'role' => 'priced', 'flags' => array(),
					'terms' => array(
						array( 'id' => 10, 'slug' => 'pack-of-8', 'label' => 'Pack of 8' ),
						array( 'id' => 11, 'slug' => 'pack-of-20', 'label' => '20 cookies' ),
						array( 'id' => 12, 'slug' => 'big-box', 'label' => 'Big box' ),
						array( 'id' => 13, 'slug' => 'two', 'label' => 'Box of 2' ),
					),
				),
				array(
					'key' => 'flavour', 'label' => 'Flavour', 'role' => 'answer', 'terms' => self::FLAVOURS,
					'flags' => array( 'multi' => true, 'least' => 1, 'most' => 3, 'overflow' => 'replace', 'startWith' => 'vanilla', 'share' => 'equal' ),
				),
			);
		}

		private static function pick( string ...$slugs ): array {
			return array( 'flavour' => array_map( static fn( $s ) => array( 'slug' => $s, 'count' => 0 ), $slugs ) );
		}

		private function item( array $picks, string $pack_slug = 'pack-of-20', array $extra = array() ): array {
			$data = array_merge( array( 'variation' => array( 'attribute_pa_pack-size' => $pack_slug ) ), $extra );
			if ( $picks ) {
				$data[ Configurator_Picks::RAW_KEY ] = $picks;
			}
			return Configurator_Picks::add_cart_item_data( $data, 7, 70 );
		}

		// ── pure rules ──

		public function test_flags_are_clamped_and_unflagged_groups_dropped(): void {
			$flags = sgs_picks_sanitise_flags( array(
				'flavour' => array( 'multi' => '1', 'most' => 99, 'least' => 50, 'overflow' => 'bogus', 'startWith' => 'Vanilla!' ),
				'size'    => array( 'multi' => '', 'most' => 3 ),
			) );
			$this->assertSame( array( 'flavour' ), array_keys( $flags ) );
			$this->assertSame( 12, $flags['flavour']['most'] );
			$this->assertSame( 12, $flags['flavour']['least'], 'least is clamped to most' );
			$this->assertSame( 'refuse', $flags['flavour']['overflow'] );
			$this->assertSame( 'vanilla', $flags['flavour']['startWith'] );
			$this->assertSame( 2, sgs_picks_sanitise_flags( array( 'f' => array( 'multi' => 1, 'most' => 0 ) ) )['f']['most'] );
		}

		public function test_pack_number_needs_exactly_one_run_of_digits(): void {
			$this->assertSame( 8, sgs_picks_parse_pack_number( 'Pack of 8' ) );
			$this->assertSame( 40, sgs_picks_parse_pack_number( '40 cookies' ) );
			$this->assertNull( sgs_picks_parse_pack_number( 'Big box' ) );
			$this->assertNull( sgs_picks_parse_pack_number( '8 or 20' ) );
		}

		public function test_an_explicit_pack_units_term_field_wins_over_the_name(): void {
			$GLOBALS['sgs_t_meta']['t12'] = array( '_sgs_pack_units' => '4' );
			$pack = Configurator_Groups::pack( 7, $GLOBALS['sgs_t_groups'] );
			$this->assertSame( 4, $pack['units']['big-box'] );
			$this->assertSame( array(), $pack['unparseable'] );
			unset( $GLOBALS['sgs_t_meta']['t12'] );
			$this->assertSame( array( 'Big box' ), Configurator_Groups::pack( 7, $GLOBALS['sgs_t_groups'] )['unparseable'] );
		}

		public function test_the_equal_split_gives_the_extra_to_the_first_picks(): void {
			$this->assertSame( array( 7, 7, 6 ), sgs_picks_distribute( 20, 3 ) );
			$this->assertSame( array( 20 ), sgs_picks_distribute( 20, 1 ) );
			$this->assertSame( array(), sgs_picks_distribute( 20, 0 ) );
		}

		public function test_per_unit_pence_rounds_half_up_and_hides_without_a_pack(): void {
			$this->assertSame( 119, sgs_picks_per_unit_pence( 2380, 20 ) );
			$this->assertSame( 2, sgs_picks_per_unit_pence( 3, 2 ), '1.5p rounds half up to 2p' );
			$this->assertNull( sgs_picks_per_unit_pence( 2380, 0 ) );
		}

		// ── the cart hook ──

		public function test_three_picks_store_one_server_row_with_the_equal_split(): void {
			$data = $this->item( self::pick( 'strawberry', 'mango', 'vanilla' ) );
			$this->assertSame( array( array( 'label' => 'Flavour', 'value' => '7 Strawberry · 7 Mango · 6 Vanilla' ) ), $data['sgs_flow_fields'] );
			$this->assertSame( array( 'flavour' => array( 'strawberry' => 7, 'mango' => 7, 'vanilla' => 6 ) ), $data['sgs_picks'] );
		}

		public function test_a_fourth_pick_is_refused(): void {
			$this->expectException( \Exception::class );
			$this->item( self::pick( 'strawberry', 'mango', 'vanilla', 'mint' ) );
		}

		public function test_an_unknown_slug_a_duplicate_and_a_variation_attribute_are_refused(): void {
			foreach ( array( self::pick( 'nope' ), self::pick( 'mango', 'mango' ), array( 'pa_pack-size' => array( array( 'slug' => 'pack-of-8', 'count' => 0 ) ) ) ) as $bad ) {
				try {
					$this->item( $bad );
					$this->fail( 'a bad pick set was accepted' );
				} catch ( \Exception $e ) {
					$this->assertNotSame( '', $e->getMessage() );
				}
			}
		}

		public function test_a_product_without_flags_refuses_picks_and_passes_without_them(): void {
			$GLOBALS['sgs_t_groups'][1]['flags'] = array();
			$this->assertArrayNotHasKey( 'sgs_picks', $this->item( array() ) );
			$this->expectException( \Exception::class );
			$this->item( self::pick( 'mango' ) );
		}

		public function test_a_configurator_product_added_with_no_picks_is_refused_on_every_route(): void {
			$this->expectException( \Exception::class );
			$this->item( array() );
		}

		public function test_a_total_that_is_not_the_pack_is_refused_and_one_that_is_passes(): void {
			$GLOBALS['sgs_t_groups'][1]['flags']['share'] = 'counts';
			$counts = static fn( array $c ) => array( 'flavour' => array_map( static fn( $s, $n ) => array( 'slug' => $s, 'count' => $n ), array_keys( $c ), $c ) );
			$ok = $this->item( $counts( array( 'mango' => 12, 'mint' => 8 ) ) );
			$this->assertSame( '12 Mango · 8 Mint', $ok['sgs_flow_fields'][0]['value'] );
			$this->expectException( \Exception::class );
			$this->item( $counts( array( 'mango' => 12, 'mint' => 9 ) ) );
		}

		public function test_counts_mode_needs_counts_and_equal_mode_refuses_them(): void {
			$GLOBALS['sgs_t_groups'][1]['flags']['share'] = 'counts';
			try {
				$this->item( self::pick( 'mango' ) );
				$this->fail( 'counts mode accepted picks with no counts' );
			} catch ( \Exception $e ) {
				$this->assertStringContainsString( 'Flavour', $e->getMessage() );
			}
			$GLOBALS['sgs_t_groups'][1]['flags']['share'] = 'equal';
			$this->expectException( \Exception::class );
			$this->item( array( 'flavour' => array( array( 'slug' => 'mango', 'count' => 20 ) ) ) );
		}

		public function test_none_mode_gives_a_plain_list_even_with_a_pack(): void {
			$GLOBALS['sgs_t_groups'][1]['flags']['share'] = 'none';
			$this->assertSame( 'Mango, Mint', $this->item( self::pick( 'mango', 'mint' ) )['sgs_flow_fields'][0]['value'] );
		}

		public function test_most_is_clamped_to_the_pack_size(): void {
			$this->expectException( \Exception::class );
			$this->item( self::pick( 'mango', 'mint', 'vanilla' ), 'two' );
		}

		public function test_a_tampered_client_row_for_a_pick_group_is_replaced(): void {
			$data = $this->item( self::pick( 'mango' ), 'pack-of-20', array( 'sgs_flow_fields' => array( array( 'label' => 'flavour', 'value' => 'FREE' ), array( 'label' => 'Gift note', 'value' => 'hi' ) ) ) );
			$this->assertSame( array( array( 'label' => 'Gift note', 'value' => 'hi' ), array( 'label' => 'Flavour', 'value' => '20 Mango' ) ), $data['sgs_flow_fields'] );
		}

		public function test_an_error_never_echoes_a_hostile_slug(): void {
			try {
				$this->item( self::pick( '<script>alert(1)</script>' ) );
				$this->fail( 'accepted' );
			} catch ( \Exception $e ) {
				$this->assertStringNotContainsString( 'script', $e->getMessage() );
				$this->assertStringContainsString( 'Flavour', $e->getMessage(), 'the group is named by its own label' );
			}
		}

		public function test_the_same_variation_with_different_picks_is_a_different_cart_line(): void {
			$a = $this->item( self::pick( 'mango' ) );
			$b = $this->item( self::pick( 'mint' ) );
			$this->assertNotSame( md5( serialize( $a ) ), md5( serialize( $b ) ) );
		}

		public function test_unparseable_pack_falls_back_to_a_plain_list(): void {
			$data = $this->item( self::pick( 'mango', 'mint' ), 'big-box' );
			$this->assertSame( 'Mango, Mint', $data['sgs_flow_fields'][0]['value'] );
		}

		public function test_a_long_split_row_fits_the_value_limit(): void {
			$GLOBALS['sgs_t_groups'][1]['flags']['most'] = 12;
			$terms = array();
			for ( $i = 0; $i < 12; $i++ ) {
				$terms[] = array( 'id' => 100 + $i, 'slug' => 'f' . $i, 'label' => str_repeat( 'Wonderful flavour ', 3 ) . $i );
			}
			$GLOBALS['sgs_t_groups'][1]['terms'] = $terms;
			$data = $this->item( array( 'flavour' => array_map( static fn( $t ) => array( 'slug' => $t['slug'], 'count' => 0 ), $terms ) ) );
			$this->assertLessThanOrEqual( 200, mb_strlen( $data['sgs_flow_fields'][0]['value'] ) );
		}

		// ── cart load ──

		public function test_a_line_whose_options_changed_since_the_add_is_flagged(): void {
			$line = array( 'product_id' => 7, Configurator_Picks::KEY => array( 'flavour' => array( 'mango' => 20 ) ) );
			$this->assertArrayNotHasKey( 'sgs_picks_stale', Configurator_Picks::restore_from_session( $line, $line ) );
			$GLOBALS['sgs_t_groups'][1]['terms'] = array_slice( self::FLAVOURS, 0, 2 ); // Mango removed.
			$restored = Configurator_Picks::restore_from_session( $line, $line );
			$this->assertSame( array( 'Flavour' ), $restored['sgs_picks_stale'] );
		}

		public function test_the_no_js_form_posts_through_the_same_rules(): void {
			$_POST['sgs_picks'] = array( 'flavour' => array( 'mango', 'mint' ) );
			$data = Configurator_Picks::add_cart_item_data( array( 'variation' => array( 'attribute_pa_pack-size' => 'pack-of-20' ) ), 7, 70 );
			unset( $_POST['sgs_picks'] );
			$this->assertSame( '10 Mango · 10 Mint', $data['sgs_flow_fields'][0]['value'] );
			$_POST['sgs_picks'] = array( 'flavour' => array( '<script>' ) );
			try {
				Configurator_Picks::add_cart_item_data( array(), 7, 70 );
				$this->fail( 'accepted' );
			} catch ( \Exception $e ) {
				$this->assertStringNotContainsString( 'script', $e->getMessage() );
			} finally {
				unset( $_POST['sgs_picks'] );
			}
		}

		public function test_active_groups_need_two_options(): void {
			$GLOBALS['sgs_t_groups'][1]['terms'] = array( self::FLAVOURS[0] );
			$this->assertSame( array(), sgs_picks_active_groups( $GLOBALS['sgs_t_groups'] ) );
		}
	}
}
