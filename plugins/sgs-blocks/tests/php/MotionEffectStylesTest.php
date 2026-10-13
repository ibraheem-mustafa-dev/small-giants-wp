<?php
/**
 * Tests: an effect's companion stylesheet resolves by naming convention (Spec 38A).
 *
 * `SGS_Motion_Registry::effect_stylesheet()` returns `assets/css/fx-<effect>.css` exactly when that file exists and
 * the effect name is a plain slug. There is no per-effect map to keep in step: for every effect in the motion schema
 * the answer must equal what is on disk.
 *
 * Run with:
 *   vendor/bin/phpunit --filter MotionEffectStylesTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\SGS_Motion_Registry;

// The registry file guards on ABSPATH and reads SGS_BLOCKS_PATH, so the constants are defined per process.
#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class MotionEffectStylesTest extends TestCase {

	private string $root;

	protected function setUp(): void {
		$this->root = dirname( __DIR__, 2 ) . '/';
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', $this->root );
		}
		if ( ! defined( 'SGS_BLOCKS_PATH' ) ) {
			define( 'SGS_BLOCKS_PATH', $this->root );
		}
		require_once $this->root . 'includes/class-sgs-motion-registry.php';
	}

	/** @return string[] */
	private function schema_effects(): array {
		$schema = json_decode( (string) file_get_contents( $this->root . 'schemas/motion.schema.json' ), true );
		$this->assertIsArray( $schema['x-sgs-effects'] ?? null, 'The motion schema lists its effects under x-sgs-effects.' );
		$effects = array_keys( $schema['x-sgs-effects'] );
		$this->assertGreaterThan( 20, count( $effects ), 'The effect list is not empty.' );
		return $effects;
	}

	public function test_an_effect_resolves_to_its_stylesheet_exactly_when_the_file_exists(): void {
		$with_css = 0;
		foreach ( $this->schema_effects() as $effect ) {
			$rel      = 'assets/css/fx-' . $effect . '.css';
			$resolved = SGS_Motion_Registry::effect_stylesheet( $effect );
			if ( file_exists( $this->root . $rel ) ) {
				$this->assertSame( $rel, $resolved, "Effect '$effect' has $rel on disk, so it must resolve to it." );
				++$with_css;
			} else {
				$this->assertNull( $resolved, "Effect '$effect' has no $rel, so it must resolve to nothing." );
			}
		}
		$this->assertGreaterThan( 5, $with_css, 'Several effects ship a stylesheet.' );
	}

	public function test_every_fx_stylesheet_on_disk_belongs_to_a_schema_effect(): void {
		$effects = $this->schema_effects();
		foreach ( glob( $this->root . 'assets/css/fx-*.css' ) as $file ) {
			$effect = substr( basename( $file ), 3, -4 );
			$this->assertContains( $effect, $effects, basename( $file ) . ' names no effect in the motion schema.' );
			$this->assertSame( 'assets/css/' . basename( $file ), SGS_Motion_Registry::effect_stylesheet( $effect ) );
		}
	}

	public function test_morph_resolves_to_fx_morph_css(): void {
		$this->assertSame( 'assets/css/fx-morph.css', SGS_Motion_Registry::effect_stylesheet( 'morph' ) );
	}

	public function test_an_invalid_slug_resolves_to_nothing(): void {
		foreach ( array( '../x', '', 'Morph', 'a/b', 'morph.css', "morph\0", "morph\n" ) as $bad ) {
			$this->assertNull( SGS_Motion_Registry::effect_stylesheet( $bad ), 'Slug ' . var_export( $bad, true ) . ' must not resolve.' );
		}
	}
}
