<?php
/**
 * Byte-identical render snapshots of sgs/buybox for every fixture in tests/fixtures/buybox/*.json. The buy box
 * "Pick a set" work (.claude/plans/2026-11-03-buybox-configurator.md) must leave every existing buy box unchanged:
 * a fixture that renders differently from its stored snapshot fails (the attribute-hash scope class is masked, see norm()).
 *
 * Fixture shape: attrs, product, manifest, context, optional queried. Snapshots live in tests/fixtures/buybox/snapshots.
 * Write or refresh them only on purpose: SGS_UPDATE_SNAPSHOTS=1 vendor/bin/phpunit --filter BuyboxSnapshotTest
 *
 * Run with: vendor/bin/phpunit --filter BuyboxSnapshotTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class BuyboxSnapshotTest extends TestCase {

	private const DIR = __DIR__ . '/../fixtures/buybox';

	/** @return array<string, array{string}> */
	public static function fixtures(): array {
		$out = array();
		foreach ( glob( self::DIR . '/*.json' ) ?: array() as $file ) {
			$out[ basename( $file, '.json' ) ] = array( basename( $file, '.json' ) );
		}
		return $out;
	}

	/** Render a fixture through the real render.php in a child process. */
	public static function render_fixture( string $name, array $attr_overrides = array(), ?array $context_override = null, array $product_overrides = array(), bool $render_children = false ): string {
		$fixture = json_decode( (string) file_get_contents( self::DIR . "/$name.json" ), true, 512, JSON_THROW_ON_ERROR );
		$fixture['attrs'] = array_merge( $fixture['attrs'], $attr_overrides );
		if ( null !== $context_override ) {
			$fixture['context'] = $context_override;
		}
		$fixture['product'] = array_merge( $fixture['product'], $product_overrides );
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$files   = array();
		$cmd     = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/buybox --motion-targets' . ( $render_children ? ' --render-children' : '' );
		foreach ( array( 'attrs', 'product', 'manifest', 'context', 'queried' ) as $key ) {
			if ( ! array_key_exists( $key, $fixture ) ) {
				continue;
			}
			$files[ $key ] = tempnam( sys_get_temp_dir(), 'sgsbs' );
			file_put_contents( $files[ $key ], json_encode( $fixture[ $key ] ?? new stdClass(), JSON_THROW_ON_ERROR ) );
			$cmd .= ' --' . $key . '-file ' . escapeshellarg( $files[ $key ] );
		}
		try {
			$out = (string) shell_exec( $cmd . ' 2>&1' );
		} finally {
			array_map( 'unlink', $files );
		}
		$start   = strpos( $out, '{"ok"' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		if ( ! is_array( $decoded ) || ! ( $decoded['ok'] ?? false ) ) {
			throw new RuntimeException( 'render.php failed for ' . $name . ': ' . ( $decoded['error'] ?? $out ) );
		}
		return (string) $decoded['html'];
	}

	/**
	 * The scope class (sgs-bb-xxxxxxxx) is an md5 of the block's attributes, so adding any attribute to block.json renames
	 * it on every buy box; the comparison masks that one token and nothing else.
	 */
	public static function norm( string $html ): string {
		return (string) preg_replace( '/sgs-bb-[0-9a-f]{8}/', 'sgs-bb-X', $html );
	}

	/** @dataProvider fixtures */
	public function test_the_render_is_byte_identical_to_its_snapshot( string $name ): void {
		$html = self::render_fixture( $name );
		$snap = self::DIR . "/snapshots/$name.html";
		if ( '1' === getenv( 'SGS_UPDATE_SNAPSHOTS' ) ) {
			file_put_contents( $snap, $html );
		}
		$this->assertFileExists( $snap, "no snapshot for $name; write it on purpose with SGS_UPDATE_SNAPSHOTS=1" );
		$this->assertSame( self::norm( (string) file_get_contents( $snap ) ), self::norm( $html ), "the $name buy box no longer renders byte-identically" );
	}

	public function test_a_render_is_deterministic(): void {
		$this->assertSame( self::render_fixture( 'standard' ), self::render_fixture( 'standard' ) );
	}

	public function test_the_fixtures_exercise_the_layouts(): void {
		$this->assertStringContainsString( 'sgs-buybox--guided', self::render_fixture( 'guided' ) );
		$this->assertStringNotContainsString( 'sgs-buybox--guided', self::render_fixture( 'standard' ) );
		$this->assertStringContainsString( 'sgs-buybox__bar', self::render_fixture( 'bound' ) );
	}
}
