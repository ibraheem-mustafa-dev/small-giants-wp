<?php
/**
 * Time-zone resolution and formatting helpers for sgs/local-time.
 *
 * Kept in its own file (not a top-level function inside the block's
 * render.php — a second render.php instance on the same page would fatal on
 * "Cannot redeclare") and guarded with function_exists() so it is safe to
 * require from more than one place.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_local_time_resolve_zone' ) ) {
	/**
	 * Resolve a client-supplied IANA time-zone string to a DateTimeZone.
	 *
	 * An empty string, a non-string value, or a string that DateTimeZone
	 * rejects (unknown/mistyped identifier) all fall back to the SITE's
	 * configured zone (`wp_timezone()`) — never a hard-coded UTC. UTC would
	 * silently produce a wrong time for every site whose admin timezone is
	 * not literally UTC, which is the failure this helper exists to avoid.
	 *
	 * @param mixed $tz_raw Raw `timeZone` attribute value.
	 * @return DateTimeZone Resolved zone.
	 */
	function sgs_local_time_resolve_zone( $tz_raw ) {
		$tz = is_string( $tz_raw ) ? trim( $tz_raw ) : '';

		if ( '' !== $tz ) {
			try {
				return new DateTimeZone( $tz );
			} catch ( \Throwable $e ) {
				// Invalid/unknown identifier — fall through to the site zone.
				unset( $e );
			}
		}

		return wp_timezone();
	}
}

if ( ! function_exists( 'sgs_local_time_format_string' ) ) {
	/**
	 * Build a PHP date() format string for the given display options.
	 *
	 * This is only the NO-JS / first-paint render. view.js re-formats the
	 * same moment client-side with Intl.DateTimeFormat once it loads (so the
	 * displayed time is locale-correct after hydration); this format string
	 * only needs to match the SHAPE (12/24-hour, seconds on/off, AM/PM
	 * on/off) view.js will apply, not the locale's exact punctuation.
	 *
	 * @param string $hour_cycle   'h12' or 'h23' (anything else behaves as 'h23').
	 * @param bool   $show_seconds Whether to include seconds.
	 * @param bool   $show_period  Whether to append AM/PM (h12 only).
	 * @return string A date()-compatible format string.
	 */
	function sgs_local_time_format_string( $hour_cycle, $show_seconds, $show_period ) {
		$is_h12 = ( 'h12' === $hour_cycle );

		$fmt = $is_h12 ? 'g:i' : 'H:i';

		if ( $show_seconds ) {
			$fmt .= ':s';
		}

		if ( $is_h12 && $show_period ) {
			$fmt .= ' A';
		}

		return $fmt;
	}
}

if ( ! function_exists( 'sgs_local_time_display' ) ) {
	/**
	 * Format a moment for display, per the block's hour-cycle/seconds/period options.
	 *
	 * @param DateTimeImmutable $now          The moment to format, already in the target zone.
	 * @param string            $hour_cycle   'h12' or 'h23'.
	 * @param bool              $show_seconds Whether to include seconds.
	 * @param bool              $show_period  Whether to append AM/PM (h12 only).
	 * @return string Formatted display string.
	 */
	function sgs_local_time_display( DateTimeImmutable $now, $hour_cycle, $show_seconds, $show_period ) {
		return $now->format( sgs_local_time_format_string( $hour_cycle, $show_seconds, $show_period ) );
	}
}
