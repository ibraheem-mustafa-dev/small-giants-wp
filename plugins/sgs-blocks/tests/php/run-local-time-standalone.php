<?php
/**
 * Standalone runner for sgs/local-time's zone resolution and time formatting
 * (includes/local-time-helpers.php). Exercises the REAL functions with plain
 * PHP, no PHPUnit. Exits non-zero on any failure.
 *
 * Normal run (all green):
 *   php plugins/sgs-blocks/tests/php/run-local-time-standalone.php
 *
 * Negative-control run (deliberately broken fallback, must go RED):
 *   php plugins/sgs-blocks/tests/php/run-local-time-standalone.php --negative-control
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code): global accumulators and direct echo are
// the established run-*-standalone.php idiom.
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// wp_timezone() stub — deliberately NOT UTC (Europe/Berlin), so a bug that
// hard-codes UTC as the fallback is visibly wrong rather than accidentally
// matching. Mirrors how a real WP install's Settings > General "Timezone"
// almost never happens to be UTC either.
if ( ! function_exists( 'wp_timezone' ) ) {
	function wp_timezone() {
		return new DateTimeZone( 'Europe/Berlin' );
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/local-time-helpers.php';

$pass = 0;
$fail = 0;

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

$negative_control = in_array( '--negative-control', $argv ?? array(), true );

if ( $negative_control ) {
	echo "=== NEGATIVE CONTROL RUN — deliberately broken fallback ===\n";

	/**
	 * The bug this test exists to catch: a resolver that falls back to a
	 * hard-coded UTC instead of the site's own zone (wp_timezone()).
	 *
	 * @param mixed $tz_raw Raw `timeZone` attribute value.
	 * @return DateTimeZone Resolved zone (wrongly, on the invalid-input path).
	 */
	function sgs_local_time_resolve_zone_broken( $tz_raw ) {
		$tz = is_string( $tz_raw ) ? trim( $tz_raw ) : '';
		if ( '' !== $tz ) {
			try {
				return new DateTimeZone( $tz );
			} catch ( \Throwable $e ) {
				unset( $e ); // Invalid identifier — fall through to the (broken) fallback below.
			}
		}
		return new DateTimeZone( 'UTC' ); // BUG: should be wp_timezone().
	}

	$broken_zone = sgs_local_time_resolve_zone_broken( 'Not/A_Real_Zone' );
	ok(
		'Europe/Berlin' === $broken_zone->getName(),
		'NEGATIVE CONTROL: an invalid zone falls back to wp_timezone() (Europe/Berlin), not a hard-coded UTC'
	);

	echo "\n$pass passed, $fail failed\n";
	exit( $fail ? 1 : 0 );
}

// ---------------------------------------------------------------------------
// 1. Zone resolution — valid, empty and invalid input.
// ---------------------------------------------------------------------------

ok( 'Europe/London' === sgs_local_time_resolve_zone( 'Europe/London' )->getName(), 'a valid IANA zone resolves to itself' );
ok( 'Asia/Hong_Kong' === sgs_local_time_resolve_zone( 'Asia/Hong_Kong' )->getName(), 'a second valid IANA zone resolves to itself' );
ok( 'Europe/Berlin' === sgs_local_time_resolve_zone( '' )->getName(), 'an empty timeZone attribute falls back to wp_timezone()' );
ok( 'Europe/Berlin' === sgs_local_time_resolve_zone( 'Not/A_Real_Zone' )->getName(), 'an invalid zone identifier falls back to wp_timezone(), not UTC' );
ok( 'Europe/Berlin' === sgs_local_time_resolve_zone( 'Mars/Olympus_Mons' )->getName(), 'a plausible-looking but unknown zone falls back to wp_timezone()' );
ok( 'Europe/Berlin' === sgs_local_time_resolve_zone( null )->getName(), 'a non-string value falls back to wp_timezone()' );

// ---------------------------------------------------------------------------
// 2. DST — Europe/London across a summer (BST, +01:00) and winter (GMT,
// +00:00) date; Asia/Hong_Kong has no DST and stays +08:00 on both dates.
// ---------------------------------------------------------------------------

$london        = sgs_local_time_resolve_zone( 'Europe/London' );
$london_summer = new DateTimeImmutable( '2026-06-15 15:05:09', $london );
$london_winter = new DateTimeImmutable( '2026-01-15 15:05:09', $london );

ok( '+01:00' === $london_summer->format( 'P' ), 'Europe/London in June (BST) is UTC+01:00' );
ok( '+00:00' === $london_winter->format( 'P' ), 'Europe/London in January (GMT) is UTC+00:00' );

$hk        = sgs_local_time_resolve_zone( 'Asia/Hong_Kong' );
$hk_summer = new DateTimeImmutable( '2026-06-15 15:05:09', $hk );
$hk_winter = new DateTimeImmutable( '2026-01-15 15:05:09', $hk );

ok( '+08:00' === $hk_summer->format( 'P' ), 'Asia/Hong_Kong in June is UTC+08:00 (no DST)' );
ok( '+08:00' === $hk_winter->format( 'P' ), 'Asia/Hong_Kong in January is UTC+08:00 (no DST, same as June)' );

// ---------------------------------------------------------------------------
// 3. h12 vs h23 output, seconds on/off, AM/PM on/off.
// ---------------------------------------------------------------------------

$moment = new DateTimeImmutable( '2026-06-15 15:05:09', $london );

ok( '15:05' === sgs_local_time_display( $moment, 'h23', false, true ), 'h23, no seconds: "15:05"' );
ok( '15:05:09' === sgs_local_time_display( $moment, 'h23', true, true ), 'h23, with seconds: "15:05:09"' );
ok( '3:05 PM' === sgs_local_time_display( $moment, 'h12', false, true ), 'h12, no seconds, AM/PM shown: "3:05 PM"' );
ok( '3:05' === sgs_local_time_display( $moment, 'h12', false, false ), 'h12, no seconds, AM/PM hidden: "3:05"' );
ok( '3:05:09 PM' === sgs_local_time_display( $moment, 'h12', true, true ), 'h12, with seconds, AM/PM shown: "3:05:09 PM"' );
ok( '3:05:09' === sgs_local_time_display( $moment, 'h12', true, false ), 'h12, with seconds, AM/PM hidden: "3:05:09"' );

$midnight = new DateTimeImmutable( '2026-06-15 00:05:00', $london );
ok( '00:05' === sgs_local_time_display( $midnight, 'h23', false, true ), 'h23 midnight: "00:05" (not "24:05")' );
ok( '12:05 AM' === sgs_local_time_display( $midnight, 'h12', false, true ), 'h12 midnight: "12:05 AM"' );

// ---------------------------------------------------------------------------
// 4. The ISO datetime carries the UTC offset (DATE_ATOM), for both the
// summer and winter London moments (Spec §A's `datetime` attribute).
// ---------------------------------------------------------------------------

$iso_summer = $london_summer->format( DATE_ATOM );
$iso_winter = $london_winter->format( DATE_ATOM );

ok( (bool) preg_match( '/^2026-06-15T15:05:09\+01:00$/', $iso_summer ), "summer ISO datetime carries the +01:00 offset: {$iso_summer}" );
ok( (bool) preg_match( '/^2026-01-15T15:05:09\+00:00$/', $iso_winter ), "winter ISO datetime carries the +00:00 offset: {$iso_winter}" );

$iso_hk = $hk_summer->format( DATE_ATOM );
ok( (bool) preg_match( '/^2026-06-15T15:05:09\+08:00$/', $iso_hk ), "Hong Kong ISO datetime carries the +08:00 offset: {$iso_hk}" );

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
