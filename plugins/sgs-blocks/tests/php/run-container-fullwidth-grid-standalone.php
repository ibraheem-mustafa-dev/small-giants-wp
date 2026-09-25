<?php
/**
 * Standalone test: a container whose contentWidth is `full` keeps grid-item stretch.
 *
 * SGS_Container_Wrapper centres a width band with `margin-inline:auto`. `full`
 * resolves to no width, so there is no band and the centring selector falls back
 * to the OUTER box; on a container that is itself a grid or flex item, an auto
 * inline margin shrinks it to its content (a nested grid set to `full` measured
 * 123px wide, one track, inside a 780px track, live 2026-09-25). The centring is
 * now emitted only at tiers whose width is a real cap.
 *
 * The centring section is extracted from the REAL class-sgs-container-wrapper.php
 * and run; every check also runs against the pre-change file (PRE_CHANGE), where
 * the defect checks must fail.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-container-fullwidth-grid-standalone.php
 *
 * @package SGS\Blocks
 */

// phpcs:disable WordPress.WP.AlternativeFunctions, Squiz.PHP.Eval.Discouraged -- CLI test harness evaluating the extracted wrapper section (no untrusted input).

const PRE_CHANGE = 'eebb37b8f';

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', '/' );
}
require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-breakpoints.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-responsive.php';

$pass = 0;
$fail = 0;

/**
 * Record one check.
 *
 * @param bool   $cond  Result.
 * @param string $label What was checked.
 */
function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

/**
 * Text between two markers (start inclusive, end exclusive), or ''.
 *
 * @param string $src   Source.
 * @param string $start Start marker.
 * @param string $end   End marker.
 * @return string Section.
 */
function section( string $src, string $start, string $end ): string {
	$a = strpos( $src, $start );
	$b = false !== $a ? strpos( $src, $end, $a ) : false;
	return ( false !== $a && false !== $b ) ? substr( $src, $a, $b - $a ) : '';
}

$rel     = 'plugins/sgs-blocks/includes/class-sgs-container-wrapper.php';
$current = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/class-sgs-container-wrapper.php' );
$old     = (string) shell_exec( 'git -C ' . escapeshellarg( dirname( __DIR__, 4 ) ) . ' show ' . PRE_CHANGE . ':' . $rel . ' 2>' . ( '\\' === DIRECTORY_SEPARATOR ? 'NUL' : '/dev/null' ) );
ok( '' !== $old, 'the pre-change wrapper is readable for the negative controls' );

/**
 * Build a runner for one version of the wrapper: the has-value closure plus the
 * contentWidth centring block, run with a given attribute set and selector.
 *
 * @param string $src Wrapper source.
 * @return callable|null fn( array $attributes, string $sel ): string CSS.
 */
function runner( string $src ) {
	$has   = section( $src, '$sgs_tier_object_has_value = static function', "\n\t\t\t\t};" );
	$centre = section( $src, "if ( '' !== \$band_obj_sel && \$sgs_tier_object_has_value( \$attributes['contentWidth'] ?? null ) ) {", '// OUTER shadow' );
	if ( '' === $has || '' === $centre ) {
		return null;
	}
	$code = $has . "\n\t\t\t\t};\n" . $centre;
	return static function ( array $attributes, string $band_obj_sel ) use ( $code ): string {
		$responsive_css = '';
		eval( $code );
		return $responsive_css;
	};
}

$run     = runner( $current );
$run_old = runner( $old );
ok( is_callable( $run ) && is_callable( $run_old ), 'the centring section is extracted from the current and the pre-change wrapper' );

$sel = '.sgs-container-t';
$tab = SGS_Breakpoints::TABLET_MAX;
$mob = SGS_Breakpoints::MOBILE_MAX;

// 1. The defect: `full` everywhere.
$full = array( 'contentWidth' => array( 'desktop' => 'full' ) );
ok( '' === $run( $full, $sel ), '`full` at every tier emits no centring (the outer grid item keeps its stretch)' );
ok( false !== strpos( $run_old( $full, $sel ), '{margin-inline:auto}' ), 'NEGATIVE CONTROL: the pre-change wrapper centred a `full` container' );

// 2. A real cap still centres, as before.
$capped = array( 'contentWidth' => array( 'desktop' => 'normal' ) );
ok( $sel . '{margin-inline:auto}' === $run( $capped, $sel ), 'a capped width (normal) still centres at the base' );
ok( $run( $capped, $sel ) === $run_old( $capped, $sel ), 'a capped width emits exactly what it did before' );
ok( $sel . '{margin-inline:auto}' === $run( array( 'contentWidth' => array( 'desktop' => '800px' ) ), $sel ), 'a length width centres' );

// 3. Mixed tiers.
ok( '@media (max-width:' . $tab . 'px){' . $sel . '{margin-inline:auto}}' === $run( array( 'contentWidth' => array( 'desktop' => 'full', 'tablet' => '800px' ) ), $sel ), 'full at desktop, capped at tablet: centring only from tablet down' );
ok( $sel . '{margin-inline:auto}@media (max-width:' . $mob . 'px){' . $sel . '{margin-inline:0}}' === $run( array( 'contentWidth' => array( 'desktop' => 'wide', 'mobile' => 'full' ) ), $sel ), 'capped at desktop, full at mobile: the inherited auto margin is reset at mobile' );
ok( $sel . '{margin-inline:auto}' === $run( array( 'contentWidth' => array( 'desktop' => 'wide', 'tablet' => 'normal' ) ), $sel ), 'capped at every tier: one base rule, no repeats' );

// 4. Unset stays silent.
ok( '' === $run( array( 'contentWidth' => array() ), $sel ) && '' === $run( array(), $sel ), 'an unset contentWidth emits nothing' );
ok( '' === $run( $capped, '' ), 'no selector (no uid) emits nothing' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
