<?php
/**
 * Tests for the pure selection logic of Sgs_Starter_Library_Seeder
 * (FR-37-48, Spec 37): which registered patterns still need a seeded post.
 *
 * The WordPress-touching half (get_posts marker lookup, wp_insert_post) cannot
 * run without WordPress and is proven live on the canary. This test drives the
 * decision function with an in-memory "already seeded" store that stands in for
 * that lookup, so it proves the selection logic only: it does NOT exercise
 * Sgs_Starter_Library_Seeder::is_seeded(), so the "a look in the bin counts as
 * seeded" rule (the `trash` status in that query) is not covered here.
 *
 * Also covers the two other pure decisions: whether `--all` was passed
 * (Sgs_Starter_Cli_Seeder::wants_all) and when the version migration is due
 * (Sgs_Starter_Library_Migration::is_due).
 *
 * Run with:
 *   vendor/bin/phpunit --filter StarterLibrarySeederTest
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable Squiz.Commenting.FunctionComment.Missing, WordPress.Files.FileName, WordPress.NamingConventions.PrefixAllGlobals

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use SGS\Blocks\Sgs_Starter_Cli_Seeder;
use SGS\Blocks\Sgs_Starter_Library_Migration;
use SGS\Blocks\Sgs_Starter_Library_Seeder;

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-starter-library-seeder.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-starter-cli-seeder.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-starter-library-migration.php';

/**
 * Class StarterLibrarySeederTest
 */
class StarterLibrarySeederTest extends TestCase {

	private const SKIP = array( 'sgs/drawer-scratch', 'sgs/framework-drawer-default' );

	/**
	 * Registered patterns as WP_Block_Patterns_Registry::get_all_registered() returns them.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private static function registry(): array {
		return array(
			array(
				'name'      => 'sgs/framework-drawer-default',
				'title'     => 'Default',
				'content'   => '<!-- wp:paragraph /-->',
				'postTypes' => array( 'sgs_drawer' ),
			),
			array(
				'name'      => 'sgs/drawer-scratch',
				'title'     => 'Scratch',
				'content'   => '<!-- wp:paragraph /-->',
				'postTypes' => array( 'sgs_drawer' ),
			),
			array(
				'name'      => 'sgs/drawer-centred-statement',
				'title'     => 'Centred statement',
				'content'   => '<!-- wp:group /-->',
				'postTypes' => array( 'sgs_drawer' ),
			),
			array(
				'name'      => 'sgs/drawer-solid-brand-light',
				'title'     => '',
				'content'   => '<!-- wp:group /-->',
				'postTypes' => array( 'sgs_drawer' ),
			),
			array(
				'name'      => 'sgs/header-centred',
				'title'     => 'Header',
				'content'   => '<!-- wp:group /-->',
				'postTypes' => array( 'sgs_header' ),
			),
			array(
				'name'      => 'sgs/hero-home',
				'title'     => 'Unscoped pattern',
				'content'   => '<!-- wp:group /-->',
				'postTypes' => array(),
			),
			array(
				'name'      => 'sgs/drawer-empty',
				'title'     => 'No content',
				'content'   => '',
				'postTypes' => array( 'sgs_drawer' ),
			),
			array(
				'name'      => 'sgs/drawer-hidden',
				'title'     => 'Hidden from the inserter',
				'content'   => '<!-- wp:group /-->',
				'postTypes' => array( 'sgs_drawer' ),
				'inserter'  => false,
			),
		);
	}

	/**
	 * Run one seeding pass against an in-memory marker store; created looks are
	 * added to the store exactly as the real insert stamps the meta.
	 *
	 * @param array<int,string> $store Slugs that already carry the marker.
	 * @return array{created:array<int,string>,skipped:int}
	 */
	private static function pass( array &$store ): array {
		$plan = Sgs_Starter_Library_Seeder::select_missing(
			self::registry(),
			'sgs_drawer',
			self::SKIP,
			static function ( string $slug ) use ( &$store ): bool {
				return in_array( $slug, $store, true );
			}
		);

		$created = array_column( $plan['create'], 'slug' );
		$store   = array_merge( $store, $created );

		return array(
			'created' => $created,
			'skipped' => $plan['skipped'],
		);
	}

	public function test_first_pass_creates_only_scoped_non_blank_non_default_looks(): void {
		$store  = array();
		$result = self::pass( $store );

		$this->assertSame( array( 'sgs/drawer-centred-statement', 'sgs/drawer-solid-brand-light' ), $result['created'] );
		$this->assertSame( 0, $result['skipped'] );
	}

	public function test_reactivation_creates_nothing_and_counts_skips(): void {
		$store = array();
		self::pass( $store );
		$second = self::pass( $store );

		$this->assertSame( array(), $second['created'] );
		$this->assertSame( 2, $second['skipped'] );
	}

	public function test_a_look_already_in_the_store_is_not_recreated(): void {
		// Stands in for any status the real marker lookup matches; the trash status itself is proven live.
		$store = array( 'sgs/drawer-centred-statement' );
		$pass  = self::pass( $store );

		$this->assertSame( array( 'sgs/drawer-solid-brand-light' ), $pass['created'] );
		$this->assertSame( 1, $pass['skipped'] );
	}

	public function test_only_the_missing_look_is_added_when_the_library_grows(): void {
		$store = array( 'sgs/drawer-centred-statement', 'sgs/drawer-solid-brand-light' );
		$pass  = self::pass( $store );

		$this->assertSame( array(), $pass['created'] );

		$plan = Sgs_Starter_Library_Seeder::select_missing(
			array_merge(
				self::registry(),
				array(
					array(
						'name'      => 'sgs/drawer-new-look',
						'title'     => 'New look',
						'content'   => '<!-- wp:group /-->',
						'postTypes' => array( 'sgs_drawer' ),
					),
				)
			),
			'sgs_drawer',
			self::SKIP,
			static function ( string $slug ) use ( $store ): bool {
				return in_array( $slug, $store, true );
			}
		);

		$this->assertSame( array( 'sgs/drawer-new-look' ), array_column( $plan['create'], 'slug' ) );
		$this->assertSame( 2, $plan['skipped'] );
	}

	public function test_title_falls_back_to_the_slug_and_content_is_passed_through(): void {
		$store = array();
		$plan  = Sgs_Starter_Library_Seeder::select_missing(
			self::registry(),
			'sgs_drawer',
			self::SKIP,
			static function ( string $slug ) use ( &$store ): bool {
				return in_array( $slug, $store, true );
			}
		);

		$by_slug = array_column( $plan['create'], null, 'slug' );

		$this->assertSame( 'Centred statement', $by_slug['sgs/drawer-centred-statement']['title'] );
		$this->assertSame( 'sgs/drawer-solid-brand-light', $by_slug['sgs/drawer-solid-brand-light']['title'] );
		$this->assertSame( '<!-- wp:group /-->', $by_slug['sgs/drawer-centred-statement']['content'] );
	}

	public function test_another_post_type_selects_only_its_own_patterns(): void {
		$plan = Sgs_Starter_Library_Seeder::select_missing(
			self::registry(),
			'sgs_header',
			array(),
			static function (): bool {
				return false;
			}
		);

		$this->assertSame( array( 'sgs/header-centred' ), array_column( $plan['create'], 'slug' ) );
	}

	public function test_a_pattern_hidden_from_the_inserter_is_never_seeded_or_counted(): void {
		$store = array( 'sgs/drawer-hidden' );
		$pass  = self::pass( $store );

		$this->assertNotContains( 'sgs/drawer-hidden', $pass['created'] );
		$this->assertSame( 0, $pass['skipped'] );
	}

	public function test_a_pattern_with_inserter_true_is_still_seeded(): void {
		$plan = Sgs_Starter_Library_Seeder::select_missing(
			array(
				array(
					'name'      => 'sgs/drawer-shown',
					'title'     => 'Shown',
					'content'   => '<!-- wp:group /-->',
					'postTypes' => array( 'sgs_drawer' ),
					'inserter'  => true,
				),
			),
			'sgs_drawer',
			array(),
			static function (): bool {
				return false;
			}
		);

		$this->assertSame( array( 'sgs/drawer-shown' ), array_column( $plan['create'], 'slug' ) );
	}

	/**
	 * @return array<string,array{0:array<string,mixed>,1:bool}>
	 */
	public static function all_flag_provider(): array {
		return array(
			'--all'        => array( array( 'all' => true ), true ),
			'--no-all'     => array( array( 'all' => false ), false ),
			'--all=0'      => array( array( 'all' => '0' ), false ),
			'--all=false'  => array( array( 'all' => 'false' ), false ),
			'--all=1'      => array( array( 'all' => '1' ), true ),
			'absent'       => array( array(), false ),
			'other flag'   => array( array( 'user' => '1' ), false ),
		);
	}

	/**
	 * @param array<string,mixed> $assoc_args Named arguments as WP-CLI parses them.
	 */
	#[DataProvider( 'all_flag_provider' )]
	public function test_wants_all_reads_the_flag_value_not_its_presence( array $assoc_args, bool $expected ): void {
		$this->assertSame( $expected, Sgs_Starter_Cli_Seeder::wants_all( $assoc_args ) );
	}

	/**
	 * @return array<string,array{0:string,1:string,2:bool}>
	 */
	public static function migration_due_provider(): array {
		return array(
			'never run'         => array( '', 'aaa', true ),
			'signature changed' => array( 'aaa', 'bbb', true ),
			'unchanged'         => array( 'aaa', 'aaa', false ),
			'no signature'      => array( '', '', false ),
		);
	}

	#[DataProvider( 'migration_due_provider' )]
	public function test_migration_is_due_only_when_the_signature_changed( string $stored, string $current, bool $expected ): void {
		$this->assertSame( $expected, Sgs_Starter_Library_Migration::is_due( $stored, $current ) );
	}

	public function test_signature_changes_when_a_library_pattern_is_added_or_the_version_changes(): void {
		$one   = array(
			array(
				'name'      => 'sgs/drawer-a',
				'postTypes' => array( 'sgs_drawer' ),
			),
		);
		$two   = array_merge(
			$one,
			array(
				array(
					'name'      => 'sgs/drawer-b',
					'postTypes' => array( 'sgs_drawer' ),
				),
			)
		);
		$other = array_merge(
			$one,
			array(
				array(
					'name'      => 'sgs/header-x',
					'postTypes' => array( 'sgs_header' ),
				),
			)
		);
		$types = array( 'sgs_drawer' );

		$base = Sgs_Starter_Library_Migration::signature( '1', $one, $types );
		$this->assertNotSame( $base, Sgs_Starter_Library_Migration::signature( '1', $two, $types ), 'a new drawer pattern must change the signature' );
		$this->assertNotSame( $base, Sgs_Starter_Library_Migration::signature( '2', $one, $types ), 'a version bump must change the signature' );
		$this->assertSame( $base, Sgs_Starter_Library_Migration::signature( '1', $other, $types ), 'a pattern for another post type must not' );
		$this->assertSame( $base, Sgs_Starter_Library_Migration::signature( '1', array_reverse( $one ), $types ), 'order must not matter' );
	}
}
