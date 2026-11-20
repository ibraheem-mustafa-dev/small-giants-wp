<?php
/**
 * The container's shrink-to-fit reset is one shared rule read through a marker class, not a rule under every instance's
 * uid (Stage C, plan `.claude/plans/archive/2026-11-19-stage-c-per-instance-css.md` Task 2).
 *
 * Each test renders the real `sgs/container` render.php through the CSS harness. MUST FAIL cases are marked: each goes
 * red when the rule it names is removed.
 *
 * Run with: vendor/bin/phpunit --filter ContainerFitTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class ContainerFitTest extends TestCase {

	/**
	 * Render sgs/container with the attributes through the harness.
	 *
	 * @param array<string,mixed> $attrs Block attributes.
	 * @return array{html:string,css:string}
	 */
	private function render( array $attrs ): array {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$file    = (string) tempnam( sys_get_temp_dir(), 'sgscf' );
		file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/container --attrs-file ' . escapeshellarg( $file ) . ' 2>&1' );
		} finally {
			unlink( $file );
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render failed: ' . ( $decoded['error'] ?? $out ) );
		return array(
			'html' => (string) $decoded['html'],
			'css'  => (string) $decoded['css'],
		);
	}

	private static function root_class( string $html ): string {
		self::assertSame( 1, preg_match( '/<(?:section|div|main)\b[^>]*\bclass="([^"]*)"/', $html, $m ), 'a root element with a class' );
		return $m[1];
	}

	/** The same attributes as before the change: a grid whose items sit in the content band. */
	private const GRID = array(
		'layout'       => 'grid',
		'columns'      => 3,
		'contentWidth' => '1200px',
	);

	public function test_equal_value_is_skipped_the_instance_prints_no_reset_of_its_own(): void {
		$r = $this->render( self::GRID );
		$this->assertDoesNotMatchRegularExpression( '/\.sgs-container-[0-9a-f]{8}[^{]*>\*\)?\{min-width:0/', $r['css'], 'MUST FAIL: the reset is not printed under the instance uid' );
		$this->assertDoesNotMatchRegularExpression( '/:where\(\.sgs-container-[0-9a-f]{8}/', $r['css'], 'MUST FAIL: no per-uid :where rule' );
		$this->assertStringContainsString( 'sgs-container--fit-band', self::root_class( $r['html'] ), 'MUST FAIL: the root carries the band marker, which is how the shared rule reaches its items' );
		$this->assertSame( 1, substr_count( $r['css'], 'min-width:0;min-height:0' ), 'the shared rule is printed once for the instance' );
	}

	public function test_a_flex_row_on_the_root_takes_the_root_marker(): void {
		$r = $this->render( array( 'layout' => 'flex' ) );
		$classes = explode( ' ', self::root_class( $r['html'] ) );
		$this->assertContains( 'sgs-container--fit', $classes, 'MUST FAIL: no band, so the items are the root\'s own children' );
		$this->assertNotContains( 'sgs-container--fit-band', $classes );
	}

	public function test_a_container_with_no_layout_gets_neither_marker_nor_rule(): void {
		$r = $this->render( array( 'contentWidth' => '1200px' ) );
		$this->assertStringNotContainsString( 'sgs-container--fit', $r['html'], 'MUST FAIL: no grid, flex or stack, so no items to shrink' );
		$this->assertStringNotContainsString( 'min-width:0;min-height:0', $r['css'] );
	}

	public function test_the_shared_rule_is_the_same_text_for_every_instance_so_the_collector_keeps_one_copy(): void {
		$a = $this->render( self::GRID );
		$b = $this->render( array( 'layout' => 'flex', 'gap' => '12px' ) );
		$this->assertSame( 1, preg_match( '/<style>(:where\(\.sgs-container--fit[^<]*)<\/style>/', $a['html'], $ma ) );
		$this->assertSame( 1, preg_match( '/<style>(:where\(\.sgs-container--fit[^<]*)<\/style>/', $b['html'], $mb ) );
		$this->assertSame( $ma[1], $mb[1], 'MUST FAIL: identical text in two different containers' );
	}

	public function test_a_theme_or_child_rule_still_wins_because_the_shared_rule_has_zero_specificity(): void {
		$r = $this->render( self::GRID );
		$this->assertSame( 1, preg_match( '/(:where\(\.sgs-container--fit[^{]*)\{min-width:0;min-height:0\}/', $r['css'], $m ) );
		$selector = $m[1];
		// Everything outside :where( ... ) must be empty: nothing in the selector counts toward specificity.
		$outside = preg_replace( '/:where\((?:[^()]|\([^()]*\))*\)/', '', $selector );
		$this->assertSame( '', $outside, 'MUST FAIL: any selector outside :where() would out-rank a child\'s own min-height or a theme rule' );
	}

	public function test_the_shared_selectors_cover_the_two_places_the_old_rule_aimed(): void {
		// Old rule, per instance: :where(.{uid}>.sgs-container__inner>*) when the band holds the items, :where(.{uid}>*) when the root does.
		$this->assertSame(
			':where(.sgs-container--fit>*,.sgs-container--fit-band>.sgs-container__inner>*){min-width:0;min-height:0}',
			( function (): string {
				if ( ! defined( 'ABSPATH' ) ) {
					define( 'ABSPATH', __DIR__ . '/' );
				}
				require_once dirname( __DIR__, 2 ) . '/includes/helpers-container-fit.php';
				return sgs_container_fit_rule();
			} )(),
			'MUST FAIL: the shared rule names both item positions'
		);
	}
}
