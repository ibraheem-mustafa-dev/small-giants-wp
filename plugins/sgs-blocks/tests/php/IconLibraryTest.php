<?php
/**
 * Tests: SGS icon library — generator output feeds sgs_get_lucide_icon().
 *
 * The generator (scripts/generate-icons.js) merges assets/icons/sgs-icons.json into
 * the PHP map that every block already calls. These tests run it against a FIXTURE
 * library into a temp directory (nothing tracked is written), then load the generated
 * PHP in a separate PHP process (the function name is already defined in-process by
 * IconTest) and call sgs_get_lucide_icon() / the sgs/icon render.php.
 *
 * Set SGS_TEST_GENERATOR to point at a mutated generator (negative controls).
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

class IconLibraryTest extends TestCase {

	private string $tmp;

	private const FIXTURE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="M8 12h8"/></svg>';

	protected function setUp(): void {
		if ( false === strpos( (string) shell_exec( 'node --version 2>&1' ), 'v' ) ) {
			$this->markTestSkipped( 'node is required to run scripts/generate-icons.js' );
		}
		$this->tmp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sgs-icon-lib-' . bin2hex( random_bytes( 6 ) );
		mkdir( $this->tmp, 0777, true );
	}

	protected function tearDown(): void {
		if ( isset( $this->tmp ) && is_dir( $this->tmp ) ) {
			$this->remove_dir( $this->tmp );
		}
	}

	private function remove_dir( string $dir ): void {
		foreach ( scandir( $dir ) ?: array() as $entry ) {
			if ( '.' === $entry || '..' === $entry ) {
				continue;
			}
			$path = $dir . DIRECTORY_SEPARATOR . $entry;
			is_dir( $path ) ? $this->remove_dir( $path ) : unlink( $path );
		}
		rmdir( $dir );
	}

	private function generator(): string {
		$override = getenv( 'SGS_TEST_GENERATOR' );
		return $override ? $override : SGS_BLOCKS_PLUGIN_DIR . '/scripts/generate-icons.js';
	}

	/**
	 * Run the generator; returns [exit code, combined output].
	 *
	 * @param string[] $args CLI arguments.
	 * @return array{0:int,1:string}
	 */
	private function run_generator( array $args ): array {
		$cmd = 'node ' . escapeshellarg( $this->generator() ) . ' ' . implode( ' ', array_map( 'escapeshellarg', $args ) ) . ' 2>&1';
		exec( $cmd, $lines, $code );
		return array( $code, implode( "\n", $lines ) );
	}

	private function write_library( array $library ): string {
		$path = $this->tmp . DIRECTORY_SEPARATOR . 'library.json';
		file_put_contents( $path, json_encode( $library ) );
		return $path;
	}

	/**
	 * Generate into the temp dir from a fixture library; returns the PHP map path.
	 *
	 * @param array<string,string> $library Fixture library { slug: svg }.
	 */
	private function generate( array $library ): string {
		$out = $this->tmp . DIRECTORY_SEPARATOR . 'out';
		[ $code, $output ] = $this->run_generator( array( '--out-dir', $out, '--library', $this->write_library( $library ) ) );
		$this->assertSame( 0, $code, 'Generator failed: ' . $output );
		return $out . DIRECTORY_SEPARATOR . 'lucide-icons.php';
	}

	/**
	 * Run PHP code in a fresh process that has loaded the given generated map.
	 */
	private function php( string $map_file, string $body ): string {
		$script = $this->tmp . DIRECTORY_SEPARATOR . 'probe.php';
		file_put_contents(
			$script,
			'<?php require ' . var_export( SGS_BLOCKS_PLUGIN_DIR . '/tests/php/bootstrap.php', true ) . ';'
			. 'require ' . var_export( SGS_BLOCKS_PLUGIN_DIR . '/includes/render-helpers.php', true ) . ';'
			. 'require ' . var_export( $map_file, true ) . ';' . $body
		);
		return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
	}

	public function test_sgs_get_lucide_icon_returns_a_library_icon_after_generation(): void {
		$map = $this->generate( array( 'fixture-frame' => self::FIXTURE_SVG ) );
		$out = $this->php( $map, 'echo sgs_get_lucide_icon( "fixture-frame" );' );
		$this->assertSame( self::FIXTURE_SVG, $out, 'A promoted library icon must come back verbatim from sgs_get_lucide_icon().' );
	}

	public function test_lucide_icons_and_aliases_are_unchanged_by_the_library(): void {
		$map    = $this->generate( array( 'fixture-frame' => self::FIXTURE_SVG ) );
		$lucide = $this->php( $map, 'echo sgs_get_lucide_icon( "check" );' );
		$alias  = $this->php( $map, 'echo sgs_get_lucide_icon( "people" ) === sgs_get_lucide_icon( "users" ) ? "same" : "diff";' );
		$this->assertStringContainsString( 'lucide-check', $lucide );
		$this->assertSame( 'same', $alias, 'The people alias must still resolve to users.' );
		$this->assertSame( '', $this->php( $map, 'echo sgs_get_lucide_icon( "definitely-not-an-icon" );' ) );
	}

	/**
	 * Library slugs reach the block through the existing call site with no change:
	 * iconName is a free string (no enum), render.php keeps the slug alphabet and calls
	 * sgs_get_lucide_icon(). (A live render is not possible here: render.php require_once's
	 * the tracked map, which would redeclare the function this test loads from a temp map.)
	 */
	public function test_icon_block_call_site_accepts_any_library_slug_without_change(): void {
		$block = json_decode( (string) file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/icon/block.json' ), true );
		$this->assertArrayNotHasKey( 'enum', $block['attributes']['iconName'], 'iconName must stay a free string so library slugs are selectable.' );
		$render = (string) file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/icon/render.php' );
		$this->assertStringContainsString( "preg_replace( '/[^a-z0-9-]/', ''", $render, 'render.php must keep the slug alphabet a-z, 0-9 and hyphen.' );
		$this->assertStringContainsString( 'sgs_get_lucide_icon( $icon_name )', $render );
	}

	public function test_library_slugs_that_shadow_lucide_wordpress_or_alias_names_fail_generation(): void {
		foreach ( array( 'star', 'close', 'user-group' ) as $slug ) {
			[ $code, $output ] = $this->run_generator( array( '--check', '--library', $this->write_library( array( $slug => self::FIXTURE_SVG ) ) ) );
			$this->assertNotSame( 0, $code, "Slug '{$slug}' must be refused." );
			$this->assertStringContainsString( 'refused', $output );
			$this->assertStringContainsString( '"' . $slug . '"', $output, 'The message must name the offending slug.' );
		}
	}

	public function test_unsafe_library_markup_fails_generation(): void {
		foreach ( array( '<svg><script>alert(1)</script></svg>', '<svg onload="x()"><path d="M1 1"/></svg>' ) as $svg ) {
			[ $code ] = $this->run_generator( array( '--check', '--library', $this->write_library( array( 'unsafe-icon' => $svg ) ) ) );
			$this->assertNotSame( 0, $code, 'Unsafe markup must be refused.' );
		}
	}

	public function test_tracked_php_map_matches_a_fresh_generation_from_the_tracked_library(): void {
		$out = $this->tmp . DIRECTORY_SEPARATOR . 'fresh';
		[ $code, $output ] = $this->run_generator( array( '--out-dir', $out ) );
		$this->assertSame( 0, $code, $output );
		$strip = static fn( string $file ): string => preg_replace( '/^ \* Last generated: .*$/m', '', (string) file_get_contents( $file ) );
		$this->assertSame(
			$strip( SGS_BLOCKS_PLUGIN_DIR . '/includes/lucide-icons.php' ),
			$strip( $out . DIRECTORY_SEPARATOR . 'lucide-icons.php' ),
			'includes/lucide-icons.php is stale: run node scripts/generate-icons.js.'
		);
	}

	public function test_every_tracked_library_icon_resolves_through_the_tracked_php_map(): void {
		$library = json_decode( (string) file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/assets/icons/sgs-icons.json' ), true );
		$this->assertIsArray( $library, 'assets/icons/sgs-icons.json must be a JSON object.' );
		foreach ( array_keys( $library ) as $slug ) {
			$out = $this->php( SGS_BLOCKS_PLUGIN_DIR . '/includes/lucide-icons.php', 'echo strlen( sgs_get_lucide_icon( ' . var_export( $slug, true ) . ' ) );' );
			$this->assertGreaterThan( 0, (int) $out, "Library icon '{$slug}' is missing from includes/lucide-icons.php." );
		}
	}
}
