<?php
/**
 * Tests: Style variation manifest FR-S2-2 contract.
 *
 * Asserts that every named client variation JSON declares
 * settings.custom.sgs.headerPattern and settings.custom.sgs.footerPattern
 * as non-empty strings matching the sgs/framework-* slug prefix.
 *
 * Self-contained — no WordPress installation required.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * Class StyleVariationManifestTest
 */
class StyleVariationManifestTest extends TestCase {

	/**
	 * Path to the theme styles directory, resolved at runtime.
	 *
	 * @var string
	 */
	private static string $styles_dir;

	/**
	 * Set up the styles directory path once per test class.
	 *
	 * Navigate from plugins/sgs-blocks/tests/php/ up to theme/sgs-theme/styles/.
	 */
	public static function setUpBeforeClass(): void {
		self::$styles_dir = dirname( __DIR__, 4 ) . '/theme/sgs-theme/styles';
	}

	/**
	 * Provide the 3 client variation file names and their expected pattern slugs.
	 *
	 * @return array<string, array<int, string>>
	 */
	public static function client_variations_provider(): array {
		return array(
			"Mama's Munches"  => array(
				'mamas-munches.json',
				'sgs/framework-header-default',
				'sgs/framework-footer-default',
			),
			'Indus Foods'     => array(
				'indus-foods.json',
				'sgs/framework-header-default',
				'sgs/framework-footer-default',
			),
			'Helping Doctors' => array(
				'helping-doctors.json',
				'sgs/framework-header-default',
				'sgs/framework-footer-default',
			),
		);
	}

	/**
	 * Read and decode a variation JSON file from the styles directory.
	 *
	 * @param string $filename Bare filename (e.g. mamas-munches.json).
	 * @return array<mixed> Decoded JSON data.
	 */
	private function load_variation( string $filename ): array {
		$path = self::$styles_dir . '/' . $filename;
		$this->assertFileExists( $path, "Style variation file missing: {$filename}" );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$raw  = file_get_contents( $path );
		$data = json_decode( $raw, true );
		$this->assertNotNull( $data, "Invalid JSON in {$filename}: " . json_last_error_msg() );
		return $data;
	}

	/**
	 * Each named client variation must parse as valid JSON.
	 *
	 * @dataProvider client_variations_provider
	 *
	 * @param string $filename        Variation filename.
	 * @param string $expected_header Expected headerPattern slug.
	 * @param string $expected_footer Expected footerPattern slug.
	 */
	#[DataProvider( 'client_variations_provider' )]
	public function test_variation_is_valid_json(
		string $filename,
		string $expected_header,
		string $expected_footer
	): void {
		$this->load_variation( $filename ); // Assertions inside load_variation.
	}

	/**
	 * Each named client variation must declare settings.custom.sgs.headerPattern.
	 *
	 * @dataProvider client_variations_provider
	 *
	 * @param string $filename        Variation filename.
	 * @param string $expected_header Expected headerPattern slug.
	 * @param string $expected_footer Expected footerPattern slug.
	 */
	#[DataProvider( 'client_variations_provider' )]
	public function test_header_pattern_key_present(
		string $filename,
		string $expected_header,
		string $expected_footer
	): void {
		$data = $this->load_variation( $filename );

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
	 * Each named client variation must declare settings.custom.sgs.footerPattern.
	 *
	 * @dataProvider client_variations_provider
	 *
	 * @param string $filename        Variation filename.
	 * @param string $expected_header Expected headerPattern slug.
	 * @param string $expected_footer Expected footerPattern slug.
	 */
	#[DataProvider( 'client_variations_provider' )]
	public function test_footer_pattern_key_present(
		string $filename,
		string $expected_header,
		string $expected_footer
	): void {
		$data = $this->load_variation( $filename );

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
	 * @dataProvider client_variations_provider
	 *
	 * @param string $filename        Variation filename.
	 * @param string $expected_header Expected headerPattern slug.
	 * @param string $expected_footer Expected footerPattern slug.
	 */
	#[DataProvider( 'client_variations_provider' )]
	public function test_pattern_slugs_use_sgs_prefix(
		string $filename,
		string $expected_header,
		string $expected_footer
	): void {
		$data   = $this->load_variation( $filename );
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

	/**
	 * The 5 internal preset variations must NOT declare sgs pattern keys.
	 * They fall back to framework defaults — no explicit override needed.
	 *
	 * @dataProvider internal_variations_provider
	 *
	 * @param string $filename Internal preset filename.
	 */
	#[DataProvider( 'internal_variations_provider' )]
	public function test_internal_variations_have_no_sgs_pattern_keys( string $filename ): void {
		$path = self::$styles_dir . '/' . $filename;
		if ( ! file_exists( $path ) ) {
			$this->markTestSkipped( "Internal variation {$filename} not present in this environment." );
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$data = json_decode( file_get_contents( $path ), true );
		$sgs  = $data['settings']['custom']['sgs'] ?? null;

		if ( null !== $sgs ) {
			$this->assertArrayNotHasKey(
				'headerPattern',
				$sgs,
				"Internal variation {$filename} should not declare headerPattern."
			);
			$this->assertArrayNotHasKey(
				'footerPattern',
				$sgs,
				"Internal variation {$filename} should not declare footerPattern."
			);
		} else {
			// No sgs key at all — this is the expected state.
			$this->assertNull( $sgs );
		}
	}

	/**
	 * Provide the 5 internal preset variation file names.
	 *
	 * @return array<string, array<int, string>>
	 */
	public static function internal_variations_provider(): array {
		return array(
			'Eye Care'     => array( 'eye-care-ward-end.json' ),
			'Construction' => array( 'sgs-construction.json' ),
			'Healthcare'   => array( 'sgs-healthcare.json' ),
			'Mosque'       => array( 'sgs-mosque.json' ),
			'Professional' => array( 'sgs-professional.json' ),
		);
	}
}
