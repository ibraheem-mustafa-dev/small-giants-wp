<?php
/**
 * The framework's small-screen preset step-downs stand aside for a client size that is already a range.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-type-scale-ranges-standalone.php
 *
 * @package SGS\Theme
 */

namespace {
	define( 'ABSPATH', __DIR__ );
	$GLOBALS['sgs_test_sizes'] = array();

	function wp_get_global_settings( $path ) {
		return array( 'typography', 'fontSizes' ) === $path ? $GLOBALS['sgs_test_sizes'] : array();
	}

	function add_action() {}

	class SGS_Breakpoints {
		public static function media( $range ) {
			return 'tablet' === $range ? '@media (max-width:1023px)' : '';
		}
	}

	require __DIR__ . '/../../../../theme/sgs-theme/inc/type-scale-ranges.php';

	$failed = 0;
	$check  = static function ( string $name, bool $ok ) use ( &$failed ): void {
		echo ( $ok ? 'PASS ' : 'FAIL ' ) . $name . "\n";
		$failed += $ok ? 0 : 1;
	};

	$GLOBALS['sgs_test_sizes'] = array(
		'theme' => array(
			array( 'slug' => 'x-large', 'size' => '24px' ),
			array( 'slug' => 'hero', 'size' => '50px' ),
		),
	);
	$check( 'NEGATIVE CONTROL: fixed sizes keep the step-downs', '' === \SGS\Theme\type_scale_ranges_css() );

	$GLOBALS['sgs_test_sizes'] = array(
		'theme'  => array( array( 'slug' => 'hero', 'size' => '50px' ), array( 'slug' => 'x-large', 'size' => '24px' ) ),
		'custom' => array( array( 'slug' => 'hero', 'size' => 'clamp(42px,4.4vw,72px)' ) ),
	);
	$css = \SGS\Theme\type_scale_ranges_css();
	$check( 'a client range restores itself at the small tiers', false !== strpos( $css, '@media (max-width:1023px){:root:root{--wp--preset--font-size--hero:clamp(42px,4.4vw,72px);}}' ) );
	$check( 'a fixed size beside it is left alone', false === strpos( $css, 'x-large' ) );

	$GLOBALS['sgs_test_sizes'] = array( 'theme' => array( array( 'slug' => 'regular', 'size' => 'clamp(1px,1vw,2px)' ) ) );
	$check( 'reading sizes are never touched', '' === \SGS\Theme\type_scale_ranges_css() );

	$GLOBALS['sgs_test_sizes'] = array( 'custom' => array( array( 'slug' => 'hero', 'size' => 'clamp(1px,2vw,3px);}</style><script>' ) ) );
	$check( 'a value that could break out of the rule is ignored', '' === \SGS\Theme\type_scale_ranges_css() );

	$fluid = static function ( string $size ): string {
		$GLOBALS['sgs_test_sizes'] = array( 'custom' => array( array( 'slug' => 'hero', 'size' => $size ) ) );
		return \SGS\Theme\type_scale_ranges_css();
	};
	$check( 'a comment opener inside a clamp() is refused', '' === $fluid( 'clamp(1px,/*,2px)' ) );
	$check( 'a comment closer is refused', '' === $fluid( 'clamp(1px,*/,2vw)' ) );
	$check( 'a bare viewport length is kept', '' !== $fluid( '5vw' ) );
	$check( 'a min() with a viewport unit is kept', '' !== $fluid( 'min(5vw, 3rem)' ) );
	$check( 'a calc() with a viewport unit is kept', '' !== $fluid( 'calc(1rem + 2vw)' ) );
	$check( 'a max() with a container unit is kept', '' !== $fluid( 'max(2rem, 4cqi)' ) );
	$check( 'a clamp() with a viewport unit is kept', '' !== $fluid( 'clamp(2rem, 4vw, 3rem)' ) );
	$check( 'a plain rem size is stepped down', '' === $fluid( '2rem' ) );
	$check( 'a plain px size is stepped down', '' === $fluid( '32px' ) );
	$check( 'a clamp() with no viewport unit is kept as written', '' !== $fluid( 'clamp(1rem, 2rem, 3rem)' ) );
	$check( 'a calc() with no viewport unit is stepped down', '' === $fluid( 'calc(1rem + 2px)' ) );
	$check( 'unbalanced parentheses are refused', '' === $fluid( 'clamp(1rem, 4vw, 3rem' ) );

	$functions = (string) file_get_contents( __DIR__ . '/../../../../theme/sgs-theme/functions.php' );
	$check( 'NEGATIVE CONTROL: the theme prints the ranges after the type scale stylesheet', 1 === preg_match( "/wp_add_inline_style\(\s*'sgs-type-scale',\s*type_scale_ranges_css\(\)\s*\)/", $functions ) );
	$check( 'the check fails once the call is deleted', 0 === preg_match( "/wp_add_inline_style\(\s*'sgs-type-scale',\s*type_scale_ranges_css\(\)\s*\)/", str_replace( "wp_add_inline_style( 'sgs-type-scale', type_scale_ranges_css() );", '', $functions ) ) );

	echo $failed ? "FAILED {$failed}\n" : "All passed\n";
	exit( $failed ? 1 : 0 );
}
