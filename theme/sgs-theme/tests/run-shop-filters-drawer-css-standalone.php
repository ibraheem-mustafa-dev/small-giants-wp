<?php
/**
 * Standalone runner: the drawer CSS is printed from `sgs_shop_filter_drawer_breakpoint`
 * (inc/shop-filters-drawer-css.php). At the default (unset, 782, or a value that is not a
 * positive number) it is assets/css/shop-filters-drawer.css unchanged; at another value every
 * drawer query moves to just below it and the sidebar query to it, in the source file and in its
 * minified form.
 *
 * Run: php theme/sgs-theme/tests/run-shop-filters-drawer-css-standalone.php
 * Print: php theme/sgs-theme/tests/run-shop-filters-drawer-css-standalone.php --print <saved value> [css file]
 *   writes the CSS the theme adds after woocommerce.css for that saved value (used by
 *   tests/shop-filters-drawer.test.mjs).
 *
 * @package SGS\Theme
 */

namespace {
	define( 'ABSPATH', __DIR__ );
	$GLOBALS['t_mods']       = array();
	$GLOBALS['t_inline_css'] = array();
	$GLOBALS['t_style_off']  = false;
	$GLOBALS['t_file']       = dirname( __DIR__ ) . '/assets/css/shop-filters-drawer.css';
	function add_action( ...$a ) {}
	function absint( $v ) {
		return abs( (int) $v );
	}
	function get_theme_mod( $name, $default = false ) {
		return array_key_exists( $name, $GLOBALS['t_mods'] ) ? $GLOBALS['t_mods'][ $name ] : $default;
	}
	function get_theme_file_path( $rel ) {
		return $GLOBALS['t_file'];
	}
	function wp_style_is( $h, $s ) {
		return 'sgs-woocommerce' === $h && ! $GLOBALS['t_style_off'];
	}
	function wp_add_inline_style( $h, $css ) {
		$GLOBALS['t_inline_css'][] = array( $h, $css );
	}
}

namespace SGS\Theme {
	require dirname( __DIR__ ) . '/inc/shop-filters-drawer-css.php';

	/** The CSS the theme prints for a saved option value (null: never saved). */
	$printed = static function ( $saved ): string {
		$GLOBALS['t_mods']       = null === $saved ? array() : array( 'sgs_shop_filter_drawer_breakpoint' => $saved );
		$GLOBALS['t_inline_css'] = array();
		output_shop_filter_drawer_style();
		$out = $GLOBALS['t_inline_css'];
		return 1 === count( $out ) && 'sgs-woocommerce' === $out[0][0] ? $out[0][1] : '';
	};

	$argv = $_SERVER['argv'] ?? array();
	if ( isset( $argv[1] ) && '--print' === $argv[1] ) {
		if ( isset( $argv[3] ) ) {
			$GLOBALS['t_file'] = $argv[3];
		}
		echo $printed( $argv[2] ?? null ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI test output.
		exit( 0 );
	}

	$pass  = 0;
	$fail  = 0;
	$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
		$ok ? $pass++ : $fail++;
		echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	};
	$queries = static function ( string $css ): array {
		preg_match_all( '/@media[^{]*/', $css, $m );
		return array_count_values( array_map( 'trim', $m[0] ) );
	};

	$source = (string) file_get_contents( $GLOBALS['t_file'] );
	$check(
		array( '@media ( max-width: 781.98px )' => 6, '@media ( min-width: 782px )' => 1 ) === $queries( $source ),
		'the source holds 6 drawer queries, 1 sidebar query and no other: ' . json_encode( $queries( $source ) )
	);

	foreach ( array( null, 782, '782', 0, '', 'abc' ) as $saved ) {
		$label = null === $saved ? 'never saved' : var_export( $saved, true );
		$check( $source === $printed( $saved ), "default ($label): the file prints unchanged" );
	}

	$css = $printed( 1060 );
	$check(
		array( '@media ( max-width: 1059.98px )' => 6, '@media ( min-width: 1060px )' => 1 ) === $queries( $css ),
		'1060: drawer queries at 1059.98px, the sidebar query at 1060px: ' . json_encode( $queries( $css ) )
	);
	$check( preg_replace( '/@media[^{]*/', '', $css ) === preg_replace( '/@media[^{]*/', '', $source ), '1060: only the queries change' );
	$check(
		array( '@media ( max-width: 599.98px )' => 6, '@media ( min-width: 600px )' => 1 ) === $queries( $printed( '600' ) ),
		'600 saved as text: drawer queries at 599.98px, sidebar at 600px'
	);

	// The deployed file is minified (csso): the same queries without the spaces. The file is read once per process,
	// so the minified copy is printed by a child process.
	$min_file = tempnam( sys_get_temp_dir(), 'sgs' );
	file_put_contents( $min_file, '@media (max-width:781.98px){a{b:c}}@media (min-width:782px){d{e:f}}' );
	$min_out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __FILE__ ) . ' --print 1060 ' . escapeshellarg( $min_file ) );
	unlink( $min_file );
	$check( '@media ( max-width: 1059.98px ){a{b:c}}@media ( min-width: 1060px ){d{e:f}}' === $min_out, "minified file: both queries rewritten ($min_out)" );

	// Where woocommerce.css is not loaded, nothing is printed.
	$GLOBALS['t_style_off'] = true;
	$check( '' === $printed( 1060 ), 'no sgs-woocommerce stylesheet: nothing printed' );

	echo "\n$pass passed, $fail failed\n";
	exit( $fail ? 1 : 0 );
}
