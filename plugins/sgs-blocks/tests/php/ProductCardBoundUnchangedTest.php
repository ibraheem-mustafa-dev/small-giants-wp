<?php
/**
 * A product-bound sgs/product-card (live-data mode) renders the same HTML and scoped CSS with the B11 attributes at
 * their defaults as it did before B11 (the commit just before the mode landed), for a simple product, a product with
 * no photo, a variable product on the read-only card and a variable product on the configurator card (a ranged
 * price; the photo's own markup is not compared, see render()). Both renders run the real render.php in the QA harness (a child process) against the same
 * `--product-file` / `--manifest-file` fixtures from tests/fixtures/motion/render-paths.json; the baseline renders
 * from a `git archive` of the base commit. Only the per-instance hash suffix is normalised.
 *
 * Run with: vendor/bin/phpunit --filter ProductCardBoundUnchangedTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class ProductCardBoundUnchangedTest extends TestCase {

	/** The commit just before the B11 work; override with SGS_BASELINE_REF. */
	private const BASE_REF = '60293ed8c^';

	private static string $base_dir = '';

	/** Every attribute B11 added, at its block.json default. */
	private const DEFAULTS = array(
		'cardContentSource'   => 'typed',
		'badgeMetaKey'        => '',
		'priceNoteMetaKey'    => '',
		'ctaLabelMetaKey'     => '',
		'ctaActionMetaKey'    => '',
		'ctaChoicesToPage'    => false,
		'priceFromLowest'     => false,
		'showCtaIcon'         => true,
		'showCtaShadow'       => true,
		'showSwatches'        => true,
		'showDescriptionTier' => array(),
		'cardPaddingTier'     => array(),
	);

	public static function setUpBeforeClass(): void {
		$repo = dirname( __DIR__, 4 );
		$ref  = getenv( 'SGS_BASELINE_REF' ) ?: self::BASE_REF;
		$dir  = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-pc-baseline-' . md5( $ref . $repo );
		if ( ! is_dir( $dir . '/plugins/sgs-blocks/src' ) ) {
			@mkdir( $dir, 0777, true );
			$cmd = 'git -C ' . escapeshellarg( $repo ) . ' archive ' . escapeshellarg( $ref ) . ' plugins/sgs-blocks/src plugins/sgs-blocks/includes plugins/sgs-blocks/scripts/qa theme 2>NUL | tar -x -C ' . escapeshellarg( $dir ) . ' 2>&1';
			shell_exec( $cmd );
		}
		self::$base_dir = is_dir( $dir . '/plugins/sgs-blocks/src/blocks/product-card' ) ? $dir . '/plugins/sgs-blocks' : '';
	}

	/** @return array<string,mixed> */
	private static function fixtures(): array {
		$all = json_decode( (string) file_get_contents( __DIR__ . '/../fixtures/motion/render-paths.json' ), true, 512, JSON_THROW_ON_ERROR );
		return $all['blocks']['product-card'];
	}

	/**
	 * @param string              $plugin Plugin directory to render from.
	 * @param array<string,mixed> $attrs  Block attributes.
	 * @param array<string,mixed> $path   Fixture path (product, manifest).
	 * @return string HTML and CSS with the instance hash suffix normalised.
	 */
	private function render( string $plugin, array $attrs, array $path ): string {
		$files = array( 'attrs-file' => $attrs );
		foreach ( array( 'product' => 'product-file', 'manifest' => 'manifest-file' ) as $key => $flag ) {
			if ( isset( $path[ $key ] ) ) {
				$files[ $flag ] = $path[ $key ];
			}
		}
		$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $plugin . '/scripts/qa/lib/render-css-harness.php' ) . ' --slug sgs/product-card';
		$tmp = array();
		foreach ( $files as $flag => $value ) {
			$f = tempnam( sys_get_temp_dir(), 'sgsbd' );
			file_put_contents( $f, json_encode( $value, JSON_THROW_ON_ERROR ) );
			$tmp[] = $f;
			$cmd  .= ' --' . $flag . ' ' . escapeshellarg( $f );
		}
		$out = (string) shell_exec( $cmd . ' 2>&1' );
		foreach ( $tmp as $f ) {
			@unlink( $f );
		}
		$decoded = json_decode( substr( $out, (int) strpos( $out, '{"ok"' ) ), true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . substr( $out, 0, 400 ) );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		$text = (string) $decoded['html'] . "\n/*css*/\n" . (string) $decoded['css'];
		// The photo is the media renderer's since Spec 49 (its markup, bindings and srcset are pinned by the picture tests),
		// so only where it sits is compared here (whitespace around it included).
		$text = (string) preg_replace( '/\s*<img\b[^>]*>\s*/s', '<img>', $text );
		$text = str_replace( '"imageSrcset":"",', '', $text );
		return (string) preg_replace( '/sgs-([a-z0-9-]+)-[0-9a-f]{8}/', 'sgs-$1-HASH', $text );
	}

	/** @return array<string,array{0:string}> */
	public static function bound_paths(): array {
		return array(
			'simple product'                    => array( 'live-wc-simple' ),
			'product with no photo'             => array( 'live-wc-no-photo' ),
			'variable product, read-only card'  => array( 'readonly-variable' ),
			'ranged variable, configurator card' => array( 'interactive-variable' ),
		);
	}

	/** @dataProvider bound_paths */
	#[\PHPUnit\Framework\Attributes\DataProvider( 'bound_paths' )]
	public function test_defaults_render_the_same_bytes_as_before_b11( string $name ): void {
		if ( '' === self::$base_dir ) {
			$this->markTestSkipped( 'The base commit could not be archived (git or tar missing).' );
		}
		$fixtures = self::fixtures();
		$path     = $fixtures['paths'][ $name ];
		$attrs    = array_merge( $fixtures['base'] ?? array(), $path['attrs'] );
		$plugin   = dirname( __DIR__, 2 );

		$before = $this->render( self::$base_dir, $attrs, $path );
		$this->assertStringContainsString( 'product-card', $before, 'positive control: the baseline rendered a card' );

		$this->assertSame( $before, $this->render( $plugin, $attrs, $path ), 'new attributes absent: same bytes' );
		$this->assertSame( $before, $this->render( $plugin, array_merge( $attrs, self::DEFAULTS ), $path ), 'new attributes at their defaults: same bytes' );
	}

	public function test_flipping_one_default_changes_the_render(): void {
		if ( '' === self::$base_dir ) {
			$this->markTestSkipped( 'The base commit could not be archived (git or tar missing).' );
		}
		$fixtures = self::fixtures();
		$path     = $fixtures['paths']['interactive-variable'];
		$attrs    = array_merge( $fixtures['base'] ?? array(), $path['attrs'] );
		$plugin   = dirname( __DIR__, 2 );

		$before = $this->render( self::$base_dir, $attrs, $path );
		foreach ( array( 'showCtaIcon' => false, 'showCtaShadow' => false, 'imageHeight' => array( 'desktop' => '180px' ) ) as $key => $value ) {
			$flipped = $this->render( $plugin, array_merge( $attrs, self::DEFAULTS, array( $key => $value ) ), $path );
			$this->assertNotSame( $before, $flipped, 'negative control: flipping ' . $key . ' must change the render' );
		}
	}
}
