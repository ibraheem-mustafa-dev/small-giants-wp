<?php
/**
 * Tests: sgs/trust-bar input safety and output hardening.
 *
 * - Non-finite numbers (NAN, INF, "1e999") never reach a CSS value.
 * - A malformed spacing value (a nested array) is dropped instead of becoming `gap:Array;`.
 * - The icon-slug branch of render.php sanitises the library SVG through wp_kses.
 * - The editor ranges in edit-panels.js mirror the server clamps.
 *
 * Run with:
 *   vendor/bin/phpunit --filter TrustBarSafetyTest
 *
 * The all-Lucide kses proof needs a real WordPress wp-includes directory; point
 * SGS_WP_INCLUDES_DIR at one (for example a local site's wp-includes) or it is skipped.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once __DIR__ . '/TrustBarRenderTrait.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-trust-bar-marquee.php';

final class TrustBarSafetyTest extends TestCase {

	use TrustBarRenderTrait;

	/** @return array<string, array{0: mixed}> */
	public static function non_finite_provider(): array {
		return array(
			'NAN'                   => array( NAN ),
			'INF'                   => array( INF ),
			'-INF'                  => array( -INF ),
			'overflowing string'    => array( '1e999' ),
			'negative overflowing'  => array( '-1e999' ),
		);
	}

	/** @param mixed $raw Non-finite stored value. */
	#[DataProvider( 'non_finite_provider' )]
	public function test_non_finite_stroke_width_falls_back_to_the_default( $raw ): void {
		$this->assertSame( (float) SGS_TRUST_BAR_DEFAULT_STROKE_WIDTH, sgs_trust_bar_icon_stroke_width( $raw ) );
		$this->assertStringNotContainsStringIgnoringCase( 'nan', sgs_trust_bar_number( sgs_trust_bar_icon_stroke_width( $raw ) ) );
	}

	/** @param mixed $raw Non-finite stored value. */
	#[DataProvider( 'non_finite_provider' )]
	public function test_non_finite_bare_size_and_duration_and_breakpoint_are_ignored( $raw ): void {
		$this->assertSame( SGS_TRUST_BAR_DEFAULT_BARE_ICON_SIZE, sgs_trust_bar_icon_bare_size( $raw ) );
		$this->assertSame( 0.0, sgs_trust_bar_marquee_duration( $raw ), 'a non-finite duration means "use the preset"' );
		$this->assertSame( 0, sgs_trust_bar_marquee_below( $raw ) );
		$this->assertStringNotContainsString( 'animation-duration', sgs_trust_bar_marquee_css( '.x', 0, sgs_trust_bar_marquee_duration( $raw ) ), 'no duration rule is emitted' );
	}

	public function test_finite_numbers_still_pass_through_the_guard(): void {
		$this->assertSame( 2.5, sgs_trust_bar_icon_stroke_width( '2.5' ) );
		$this->assertSame( 0.25, sgs_trust_bar_icon_stroke_width( 0.1 ), 'clamped to the server minimum' );
		$this->assertSame( 4.0, sgs_trust_bar_icon_stroke_width( 99 ) );
		$this->assertSame( 30.0, sgs_trust_bar_marquee_duration( 30 ) );
		$this->assertSame( 300.0, sgs_trust_bar_marquee_duration( 9999 ) );
		$this->assertSame( 96, sgs_trust_bar_icon_bare_size( 500 ) );
	}

	public function test_scrub_drops_everything_that_cannot_become_a_css_length(): void {
		$this->assertNull( sgs_trust_bar_scrub_spacing( array( 'desktop' => array( 'nested' => 1 ) ), 1 ), 'a nested array under a scalar property' );
		$this->assertNull( sgs_trust_bar_scrub_spacing( array( 'desktop' => INF ), 1 ) );
		$this->assertNull( sgs_trust_bar_scrub_spacing( array( 'desktop' => '1e999' ), 1 ) );
		$this->assertNull( sgs_trust_bar_scrub_spacing( array( 'desktop' => true, 'tablet' => null ), 1 ) );
		$this->assertSame(
			array( 'tablet' => '8px', 'mobile' => 4 ),
			sgs_trust_bar_scrub_spacing( array( 'desktop' => array( 'x' => 1 ), 'tablet' => '8px', 'mobile' => 4 ), 1 ),
			'good tiers survive next to a bad one'
		);
		$this->assertSame(
			array( 'desktop' => array( 'top' => '4px' ) ),
			sgs_trust_bar_scrub_spacing( array( 'desktop' => array( 'top' => '4px', 'left' => array( 1 ), 'right' => NAN ) ), 2 ),
			'a box object keeps its good sides'
		);
	}

	public function test_a_nested_array_item_gap_renders_no_array_and_no_warning(): void {
		// render() fails the test if the child process printed any PHP warning ahead of the JSON.
		$out = $this->render(
			array(
				'badgeStyle' => 'icon-circle',
				'items'      => $this->two_items(),
				'itemGap'    => array( 'desktop' => array( 'nested' => 1 ) ),
			)
		);
		$this->assertStringNotContainsString( 'Array', $out['css'], 'no `gap:Array;`' );
		$this->assertStringNotContainsString( '__badge{gap', $out['css'] );
	}

	public function test_a_good_tier_survives_a_bad_one_in_the_same_item_gap(): void {
		$out = $this->render(
			array(
				'badgeStyle' => 'icon-circle',
				'items'      => $this->two_items(),
				'itemGap'    => array(
					'desktop' => array( 'nested' => 1 ),
					'tablet'  => '9px',
				),
			)
		);
		$this->assertStringContainsString( 'gap:9px', $out['css'] );
		$this->assertStringNotContainsString( 'Array', $out['css'] );
	}

	/**
	 * Run PHP in a child process with `wp_kses` replaced by a marker, so the test can see
	 * whether the icon helper routes the library SVG through it.
	 *
	 * @param string $body PHP appended after the helpers are loaded.
	 * @return string Output.
	 */
	private function run_with_kses_spy( string $body ): string {
		$script = tempnam( sys_get_temp_dir(), 'sgskses' );
		$plugin = dirname( __DIR__, 2 );
		file_put_contents(
			$script,
			'<?php define( "ABSPATH", "x/" );'
			. 'function wp_kses( $s, $allowed ) { return "KSES[" . $s . "]"; }'
			. 'function sgs_get_lucide_icon( $n ) { return "check" === $n ? "<svg>CHECK</svg>" : ( "truck" === $n ? "<svg>TRUCK</svg>" : "" ); }'
			. 'require ' . var_export( $plugin . '/includes/helpers-svg-kses.php', true ) . ';'
			. 'require ' . var_export( $plugin . '/includes/helpers-trust-bar-item.php', true ) . ';'
			. $body
		);
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
	}

	public function test_the_icon_slug_branch_is_sanitised_through_wp_kses(): void {
		$this->assertSame( 'KSES[<svg>TRUCK</svg>]', $this->run_with_kses_spy( 'echo sgs_trust_bar_library_icon_svg( "truck" );' ) );
		$this->assertSame( 'KSES[<svg>CHECK</svg>]', $this->run_with_kses_spy( 'echo sgs_trust_bar_library_icon_svg( "no-such-icon" );' ), 'an unknown slug falls back to check, still sanitised' );
	}

	public function test_render_php_slug_branch_calls_the_sanitising_helper(): void {
		$render = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/trust-bar/render.php' );
		$this->assertStringContainsString( '$svg = sgs_trust_bar_library_icon_svg( $icon_slug );', $render );
		$this->assertStringNotContainsString( '$svg = sgs_get_lucide_icon( $icon_slug );', $render, 'the slug branch must not echo the map value unsanitised' );
	}

	/**
	 * With a REAL wp_kses, every Lucide icon must pass the sanitising helper unchanged,
	 * otherwise the defence-in-depth would silently alter shipped icons; and the same
	 * kses lets a hostile <use href> through, which is why the generator, not kses, is the gate.
	 */
	public function test_real_kses_leaves_every_lucide_icon_byte_identical(): void {
		$wp = getenv( 'SGS_WP_INCLUDES_DIR' );
		if ( ! $wp || ! is_file( rtrim( $wp, '/\\' ) . '/kses.php' ) ) {
			$this->markTestSkipped( 'Set SGS_WP_INCLUDES_DIR to a WordPress wp-includes directory to run the real-kses proof.' );
		}
		$plugin = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgsrealkses' );
		file_put_contents(
			$script,
			'<?php define( "ABSPATH", "x/" );'
			. '$core = ' . var_export( rtrim( $wp, '/\\' ) . '/', true ) . ';'
			. 'function apply_filters( $h, $v ) { return $v; } function add_filter() { return true; } function has_filter() { return false; }'
			. 'function do_action() {} function get_option( $k, $d = false ) { return "blog_charset" === $k ? "UTF-8" : $d; }'
			. 'function wp_allowed_protocols() { return array( "http", "https", "ftp", "mailto", "tel" ); }'
			. 'function _doing_it_wrong() {} function get_bloginfo() { return "UTF-8"; } function __( $s ) { return $s; }'
			. 'function is_utf8_charset() { return true; } function wp_get_wp_version() { return "6.9"; }'
			. 'require $core . "formatting.php"; require $core . "kses.php";'
			. 'require ' . var_export( $plugin . '/includes/helpers-svg-kses.php', true ) . ';'
			. 'require ' . var_export( $plugin . '/includes/lucide-icons.php', true ) . ';'
			. 'require ' . var_export( $plugin . '/includes/helpers-trust-bar-item.php', true ) . ';'
			. '$n = 0; $bad = array();'
			. 'foreach ( glob( ' . var_export( $plugin . '/node_modules/lucide-static/icons/*.svg', true ) . ' ) as $f ) {'
			. '  $name = basename( $f, ".svg" ); $svg = sgs_get_lucide_icon( $name ); if ( "" === $svg ) { continue; }'
			. '  ++$n; if ( sgs_trust_bar_library_icon_svg( $name ) !== $svg ) { $bad[] = $name; } }'
			. 'echo json_encode( array( "n" => $n, "bad" => $bad, "use_passes" => false !== strpos( wp_kses( "<svg><use href=\"https://evil/x.svg#a\"/></svg>", sgs_svg_kses_allowed_tags() ), "<use" ) ) );'
		);
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$result = json_decode( $out, true );
		$this->assertIsArray( $result, 'probe did not return JSON: ' . $out );
		$this->assertGreaterThan( 1000, $result['n'], 'the Lucide set was actually iterated' );
		$this->assertSame( array(), $result['bad'], 'kses altered these Lucide icons' );
		$this->assertTrue( $result['use_passes'], 'positive control: kses does NOT stop <use href>, so the generator gate matters' );
	}

	public function test_editor_ranges_mirror_the_server_clamps(): void {
		$js = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/trust-bar/edit-panels.js' );
		$this->assertSame( 1, preg_match( '/TRUST_BAR_LIMITS\s*=\s*\{(.*?)\n\};/s', $js, $block ), 'TRUST_BAR_LIMITS is declared in edit-panels.js' );

		$read = static function ( string $key, string $field ) use ( $block ): float {
			preg_match( '/' . $key . ':\s*\{[^}]*\b' . $field . ':\s*([0-9.]+)/', $block[1], $m );
			return isset( $m[1] ) ? (float) $m[1] : NAN;
		};

		$this->assertSame( (float) SGS_TRUST_BAR_STROKE_WIDTH_MIN, $read( 'strokeWidth', 'min' ) );
		$this->assertSame( (float) SGS_TRUST_BAR_STROKE_WIDTH_MAX, $read( 'strokeWidth', 'max' ) );
		$this->assertSame( (float) SGS_TRUST_BAR_BARE_ICON_SIZE_MIN, $read( 'bareSize', 'min' ) );
		$this->assertSame( (float) SGS_TRUST_BAR_BARE_ICON_SIZE_MAX, $read( 'bareSize', 'max' ) );
		$this->assertSame( (float) SGS_TRUST_BAR_SCROLL_DURATION_MIN, $read( 'scrollDuration', 'min' ) );
		$this->assertSame( (float) SGS_TRUST_BAR_SCROLL_DURATION_MAX, $read( 'scrollDuration', 'max' ) );
		$this->assertSame( (float) SGS_TRUST_BAR_DEFAULT_STROKE_WIDTH, $read( 'strokeWidth', 'fallback' ) );
		$this->assertSame( (float) SGS_TRUST_BAR_DEFAULT_BARE_ICON_SIZE, $read( 'bareSize', 'fallback' ) );

		// The controls must use the constants, not a re-typed literal that could drift.
		foreach ( array( 'TRUST_BAR_LIMITS.strokeWidth.min', 'TRUST_BAR_LIMITS.strokeWidth.max', 'TRUST_BAR_LIMITS.bareSize.min', 'TRUST_BAR_LIMITS.bareSize.max', 'TRUST_BAR_LIMITS.scrollDuration.max' ) as $ref ) {
			$this->assertStringContainsString( $ref, substr( $js, (int) strpos( $js, 'export function TrustBarIconPanel' ) ), "$ref drives a RangeControl" );
		}
	}

	public function test_block_json_descriptions_state_the_server_clamps(): void {
		$block = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/trust-bar/block.json' ), true );
		$this->assertStringContainsString( '0.25 to 4', $block['attributes']['iconStrokeWidth']['description'] );
		$this->assertStringContainsString( '(2 to 300)', $block['attributes']['autoScrollDuration']['description'] );
		$this->assertStringContainsString( '8 to 96', $block['attributes']['iconBareSize']['description'] );
	}
}
