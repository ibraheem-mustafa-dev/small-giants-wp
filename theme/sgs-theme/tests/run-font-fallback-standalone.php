<?php
/**
 * Standalone runner: font fallback metrics with a zero or missing value skip the family instead of dividing by zero,
 * and the first-paint preload finds a face file whether or not it has metrics.
 *
 * Run: php theme/sgs-theme/tests/run-font-fallback-standalone.php
 *
 * @package SGS\Theme
 */

namespace {
	define( 'ABSPATH', __DIR__ );
	$GLOBALS['t_dir'] = sys_get_temp_dir() . '/sgs-ff-' . getmypid();
	mkdir( $GLOBALS['t_dir'] . '/assets/fonts', 0777, true );
	file_put_contents(
		$GLOBALS['t_dir'] . '/assets/fonts/fallback-metrics.json',
		json_encode(
			array(
				'bases' => array( 'sans-serif' => array( 'local' => 'Arial', 'avgWidth' => 0.5 ) ),
				'fonts' => array(
					'ok/ok.woff2'     => array( 'unitsPerEm' => 1000, 'ascender' => 900, 'descender' => -200, 'lineGap' => 0, 'avgWidth' => 0.4 ),
					'zero/zero.woff2' => array( 'unitsPerEm' => 0, 'ascender' => 900, 'descender' => -200, 'lineGap' => 0, 'avgWidth' => 0.4 ),
					'gone/gone.woff2' => array( 'ascender' => 900, 'descender' => -200, 'lineGap' => 0, 'avgWidth' => 0.4 ),
				),
			)
		)
	);
	function add_action( ...$a ) {}
	function add_filter( ...$a ) {}
	function get_theme_file_path( $f ) {
		return $GLOBALS['t_dir'] . '/' . $f;
	}
	function get_theme_file_uri( $f ) {
		return 'https://example.test/wp-content/themes/sgs-theme/' . $f;
	}
}

namespace SGS\Theme {
	require dirname( __DIR__ ) . '/inc/font-fallback.php';

	$pass  = 0;
	$fail  = 0;
	$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
		$ok ? $pass++ : $fail++;
		echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	};
	$family = static fn( string $src ): array => array(
		'fontFamily' => '"Test", sans-serif',
		'slug'       => 'test',
		'fontFace'   => array( array( 'src' => array( $src ), 'fontWeight' => '400' ) ),
	);

	$check( null !== font_fallback_for_family( $family( 'file:./assets/fonts/ok/ok.woff2' ) ), 'a family with complete metrics gets a fallback rule' );
	$zero = null;
	try {
		$zero = font_fallback_for_family( $family( 'file:./assets/fonts/zero/zero.woff2' ) );
		$check( null === $zero, 'unitsPerEm 0 skips the family, no division by zero' );
	} catch ( \DivisionByZeroError $e ) {
		$check( false, 'unitsPerEm 0 skips the family, no division by zero' );
	}
	$check( null === font_fallback_for_family( $family( 'file:./assets/fonts/gone/gone.woff2' ) ), 'a missing unitsPerEm skips the family' );

	$check( 'https://example.test/wp-content/themes/sgs-theme/assets/fonts/ok/ok.woff2' === font_fallback_preload_url( $family( 'file:./assets/fonts/ok/ok.woff2' ) ), 'a face with metrics preloads its theme file' );
	$check( 'https://example.test/wp-content/uploads/f/a.woff2' === font_fallback_preload_url( $family( 'https://example.test/wp-content/uploads/f/a.woff2' ) ), 'an uploads face with no metrics still preloads' );
	$check( 'https://example.test/wp-content/themes/sgs-theme/assets/fonts/other/b.woff2' === font_fallback_preload_url( $family( 'file:./assets/fonts/other/b.woff2' ) ), 'a theme face with no metrics still preloads' );
	$check( '' === font_fallback_preload_url( $family( 'https://example.test/x.ttf' ) ), 'a non-woff2 face is not preloaded' );

	echo "{$pass} passed, {$fail} failed\n";
	exit( $fail > 0 ? 1 : 0 );
}
