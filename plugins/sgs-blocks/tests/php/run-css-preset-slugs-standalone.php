<?php
/**
 * Standalone test: sgs_css_length_value_preset_slugs() reads spacing presets in the shape WordPress really returns
 * (grouped by origin: default, theme, custom) and in the flat shape, so a bare "30" resolves to the preset variable.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-css-preset-slugs-standalone.php
 * The helper caches its list per process, so each shape runs in a child process.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
$base = dirname( __DIR__, 2 );

if ( isset( $argv[1] ) && 'child' === $argv[1] ) {
	define( 'ABSPATH', $base . '/' );
	$shape = $argv[2];
	function wp_get_global_settings( $path = array() ) {
		global $shape;
		if ( array( 'spacing', 'spacingSizes' ) !== $path ) {
			return null;
		}
		if ( 'origin' === $shape ) {
			return array(
				'default' => array( array( 'slug' => '20', 'size' => '0.5rem', 'name' => '2' ), array( 'slug' => '30', 'size' => '1rem', 'name' => '3' ) ),
				'theme'   => array( array( 'slug' => '10', 'size' => '0.25rem' ), array( 'slug' => '30', 'size' => '1rem' ), array( 'slug' => '80', 'size' => '8rem' ) ),
			);
		}
		if ( 'flat' === $shape ) {
			return array( array( 'slug' => '20' ), array( 'slug' => '30' ) );
		}
		return null;
	}
	function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
	require $base . '/includes/helpers-css-safety.php';
	$slugs = sgs_css_length_value_preset_slugs();
	sort( $slugs );
	echo json_encode( array( 'slugs' => $slugs, 'single30' => sgs_css_single_length_value( '30' ), 'single25' => sgs_css_single_length_value( '25' ), 'px' => sgs_css_single_length_value( '30px' ) ) );
	exit( 0 );
}

$fail = 0;
function check( bool $c, string $label ): void {
	global $fail;
	echo ( $c ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $c ) {
		++$fail;
	}
}
function run_shape( string $shape ): array {
	$out = shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __FILE__ ) . ' child ' . $shape );
	return (array) json_decode( (string) $out, true );
}

$origin = run_shape( 'origin' );
check( array( '10', '20', '30', '80' ) === ( $origin['slugs'] ?? null ), 'origin-grouped: default and theme slugs, de-duplicated' );
check( 'var(--wp--preset--spacing--30)' === ( $origin['single30'] ?? null ), 'origin-grouped: "30" gives the preset variable' );
check( '25px' === ( $origin['single25'] ?? null ), 'origin-grouped: "25" (not a slug) stays px' );
check( '30px' === ( $origin['px'] ?? null ), 'origin-grouped: "30px" stays 30px' );

$flat = run_shape( 'flat' );
check( array( '20', '30' ) === ( $flat['slugs'] ?? null ), 'flat: slugs read' );
check( 'var(--wp--preset--spacing--30)' === ( $flat['single30'] ?? null ), 'flat: "30" gives the preset variable' );

$none = run_shape( 'none' );
check( array() === ( $none['slugs'] ?? null ) && '30px' === ( $none['single30'] ?? null ), 'no presets: empty list, "30" is px' );

echo $fail ? "FAILED ($fail)\n" : "ALL PASS\n";
exit( $fail ? 1 : 0 );
