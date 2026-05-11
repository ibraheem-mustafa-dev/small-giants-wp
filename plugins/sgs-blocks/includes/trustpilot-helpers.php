<?php
/**
 * Trustpilot Reviews — Shared helpers.
 *
 * Helper functions used by the sgs/trustpilot-reviews block render template.
 * Kept here (rather than inline in render.php) so multiple block instances on
 * the same page do not trigger "cannot redeclare function" fatals.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Map a Trustpilot score to its official text label.
 *
 * Thresholds verified against the public Trustpilot business review page
 * label thresholds (2026-05-11 verification on mamasmunches.com page).
 *
 * @param float|int|string $score Trustpilot aggregate score (0-5).
 * @return string One of Excellent | Great | Good | Average | Poor | Bad.
 */
function sgs_trustpilot_score_label( $score ) {
	$s = floatval( $score );
	if ( $s >= 4.5 ) {
		return 'Excellent';
	}
	if ( $s >= 4.0 ) {
		return 'Great';
	}
	if ( $s >= 3.5 ) {
		return 'Good';
	}
	if ( $s >= 3.0 ) {
		return 'Average';
	}
	if ( $s >= 2.0 ) {
		return 'Poor';
	}
	return 'Bad';
}

/**
 * Resolve the URL for a Trustpilot brand SVG asset shipped with the plugin.
 *
 * @param string $relative Path relative to plugins/sgs-blocks/assets/brand/trustpilot/.
 * @return string Fully-qualified URL.
 */
function sgs_trustpilot_asset_url( $relative ) {
	$plugin_root = defined( 'SGS_BLOCKS_PATH' ) ? SGS_BLOCKS_PATH : plugin_dir_path( dirname( __DIR__, 2 ) . '/sgs-blocks.php' );
	return plugins_url( 'assets/brand/trustpilot/' . ltrim( $relative, '/' ), $plugin_root . 'sgs-blocks.php' );
}

/**
 * Return the URL for the tile-star SVG for a given numeric rating.
 *
 * Rounds to the nearest 0.5 then resolves the matching SVG filename. Trustpilot
 * ships SVGs at half-star granularity (stars-1.svg through stars-5.svg).
 *
 * @param float|int|string $rating Rating 1-5 (clamped).
 * @return string Fully-qualified URL to the matching SVG.
 */
function sgs_trustpilot_stars_url( $rating ) {
	$r = floatval( $rating );
	if ( $r < 1 ) {
		$r = 1;
	} elseif ( $r > 5 ) {
		$r = 5;
	}
	$rounded = round( $r * 2 ) / 2;
	if ( floor( $rounded ) === (float) $rounded ) {
		$filename = sprintf( 'stars-%d.svg', $rounded );
	} else {
		$filename = sprintf( 'stars-%.1f.svg', $rounded );
	}
	return sgs_trustpilot_asset_url( 'stars/' . $filename );
}

/**
 * Format an ISO-8601 date as a human-friendly "X time ago" string.
 *
 * @param string $iso_date ISO-8601 datetime string.
 * @return string Relative time label, or empty string when the date cannot be parsed.
 */
function sgs_trustpilot_relative_date( $iso_date ) {
	$ts = strtotime( $iso_date );
	if ( ! $ts ) {
		return '';
	}
	$diff = time() - $ts;
	if ( $diff < 60 ) {
		return 'just now';
	}
	if ( $diff < 3600 ) {
		$m = (int) floor( $diff / 60 );
		return $m . ' ' . ( 1 === $m ? 'minute' : 'minutes' ) . ' ago';
	}
	if ( $diff < 86400 ) {
		$h = (int) floor( $diff / 3600 );
		return $h . ' ' . ( 1 === $h ? 'hour' : 'hours' ) . ' ago';
	}
	if ( $diff < 2592000 ) {
		$d = (int) floor( $diff / 86400 );
		return $d . ' ' . ( 1 === $d ? 'day' : 'days' ) . ' ago';
	}
	if ( $diff < 31536000 ) {
		$months = (int) floor( $diff / 2592000 );
		return $months . ' ' . ( 1 === $months ? 'month' : 'months' ) . ' ago';
	}
	$years = (int) floor( $diff / 31536000 );
	return $years . ' ' . ( 1 === $years ? 'year' : 'years' ) . ' ago';
}
