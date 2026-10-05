<?php
/**
 * Tests: client theme-snapshot manifest, FR-S2-2 contract.
 *
 * Asserts that each named client's sites/<client>/theme-snapshot.json (Spec 33; the per-client
 * token file push-theme-snapshot.py deploys) declares settings.custom.sgs.headerPattern and
 * settings.custom.sgs.footerPattern as non-empty strings with the sgs/ prefix, the keys
 * class-sgs-template-part-seeder.php reads.
 *
 * Self-contained — no WordPress installation required.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * Class ThemeSnapshotManifestTest
 */
class ThemeSnapshotManifestTest extends TestCase {

	/**
	 * Path to the repository's sites/ directory, resolved at runtime.
	 *
	 * @var string
	 */
	private static string $sites_dir;

	/**
	 * Set up the sites directory path once per test class.
	 *
	 * Navigate from plugins/sgs-blocks/tests/php/ up to the repository's sites/.
	 */
	public static function setUpBeforeClass(): void {
		self::$sites_dir = dirname( __DIR__, 4 ) . '/sites';
	}

	/**
	 * Provide 3 client slugs and their expected pattern slugs.
	 *
	 * @return array<string, array<int, string>>
	 */
	public static function client_snapshots_provider(): array {
		return array(
			"The bakery client" => array(
				'mamas-munches',
				'sgs/framework-header-default',
				'sgs/framework-footer-default',
			),
			'The wholesale-food client' => array(
				'indus-foods',
				'sgs/framework-header-default',
				'sgs/framework-footer-default',
			),
			'The charity client' => array(
				'helping-doctors',
				'sgs/framework-header-default',
				'sgs/framework-footer-default',
			),
		);
	}

	/**
	 * Read and decode a client's theme-snapshot.json.
	 *
	 * @param string $filename Client slug (its folder under sites/).
	 * @return array<mixed> Decoded JSON data.
	 */
	private function load_snapshot( string $filename ): array {
		$path = self::$sites_dir . '/' . $filename . '/theme-snapshot.json';
		$this->assertFileExists( $path, "Theme snapshot missing for client: {$filename}" );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$raw  = file_get_contents( $path );
		$data = json_decode( $raw, true );
		$this->assertNotNull( $data, "Invalid JSON in {$filename}: " . json_last_error_msg() );
		return $data;
	}

	/**
	 * Each named client snapshot must parse as valid JSON.
	 *
	 * @dataProvider client_snapshots_provider
	 *
	 * @param string $filename        Client slug.
	 * @param string $expected_header Expected headerPattern slug.
	 * @param string $expected_footer Expected footerPattern slug.
	 */
	#[DataProvider( 'client_snapshots_provider' )]
	public function test_snapshot_is_valid_json(
		string $filename,
		string $expected_header,
		string $expected_footer
	): void {
		$this->load_snapshot( $filename ); // Assertions inside load_snapshot.
	}

	/**
	 * Each named client snapshot must declare settings.custom.sgs.headerPattern.
	 *
	 * @dataProvider client_snapshots_provider
	 *
	 * @param string $filename        Client slug.
	 * @param string $expected_header Expected headerPattern slug.
	 * @param string $expected_footer Expected footerPattern slug.
	 */
	#[DataProvider( 'client_snapshots_provider' )]
	public function test_header_pattern_key_present(
		string $filename,
		string $expected_header,
		string $expected_footer
	): void {
		$data = $this->load_snapshot( $filename );

		$this->assertArrayHasKey( 'settings', $data, "Missing 'settings' in {$filename}" );
		$this->assertArrayHasKey( 'custom', $data['settings'], "Missing 'settings.custom' in {$filename}" );
		$this->assertArrayHasKey( 'sgs', $data['settings']['custom'], "Missing 'settings.custom.sgs' in {$filename}" );
		$this->assertArrayHasKey(
			'headerPattern',
			$data['settings']['custom']['sgs'],
			"Missing 'settings.custom.sgs.headerPattern' in {$filename}"
		);

		$actual = $data['settings']['custom']['sgs']['headerPattern'];
		$this->assertIsString( $actual, "headerPattern must be a string in {$filename}" );
		$this->assertNotEmpty( $actual, "headerPattern must not be empty in {$filename}" );
		$this->assertSame(
			$expected_header,
			$actual,
			"headerPattern mismatch in {$filename}: expected '{$expected_header}', got '{$actual}'"
		);
	}

	/**
	 * Each named client snapshot must declare settings.custom.sgs.footerPattern.
	 *
	 * @dataProvider client_snapshots_provider
	 *
	 * @param string $filename        Client slug.
	 * @param string $expected_header Expected headerPattern slug.
	 * @param string $expected_footer Expected footerPattern slug.
	 */
	#[DataProvider( 'client_snapshots_provider' )]
	public function test_footer_pattern_key_present(
		string $filename,
		string $expected_header,
		string $expected_footer
	): void {
		$data = $this->load_snapshot( $filename );

		$this->assertArrayHasKey( 'settings', $data );
		$this->assertArrayHasKey( 'custom', $data['settings'] );
		$this->assertArrayHasKey( 'sgs', $data['settings']['custom'] );
		$this->assertArrayHasKey(
			'footerPattern',
			$data['settings']['custom']['sgs'],
			"Missing 'settings.custom.sgs.footerPattern' in {$filename}"
		);

		$actual = $data['settings']['custom']['sgs']['footerPattern'];
		$this->assertIsString( $actual, "footerPattern must be a string in {$filename}" );
		$this->assertNotEmpty( $actual, "footerPattern must not be empty in {$filename}" );
		$this->assertSame(
			$expected_footer,
			$actual,
			"footerPattern mismatch in {$filename}: expected '{$expected_footer}', got '{$actual}'"
		);
	}

	/**
	 * Pattern slugs must start with the sgs/ prefix.
	 *
	 * @dataProvider client_snapshots_provider
	 *
	 * @param string $filename        Client slug.
	 * @param string $expected_header Expected headerPattern slug.
	 * @param string $expected_footer Expected footerPattern slug.
	 */
	#[DataProvider( 'client_snapshots_provider' )]
	public function test_pattern_slugs_use_sgs_prefix(
		string $filename,
		string $expected_header,
		string $expected_footer
	): void {
		$data   = $this->load_snapshot( $filename );
		$sgs    = $data['settings']['custom']['sgs'] ?? array();
		$header = $sgs['headerPattern'] ?? '';
		$footer = $sgs['footerPattern'] ?? '';

		$this->assertStringStartsWith(
			'sgs/',
			$header,
			"headerPattern must begin with 'sgs/' in {$filename}"
		);
		$this->assertStringStartsWith(
			'sgs/',
			$footer,
			"footerPattern must begin with 'sgs/' in {$filename}"
		);
	}
}
