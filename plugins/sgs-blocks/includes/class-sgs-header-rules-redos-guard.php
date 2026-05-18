<?php
/**
 * ReDoS guard helpers for the conditional header rules engine (FR-S3-2, Spec 17 Wave 2).
 *
 * Extracted from {@see Sgs_Header_Rules} to keep the main engine under the
 * 300-line PHP cap. Owns two distinct responsibilities:
 *
 *   1. STORAGE-TIME validation — {@see validate_at_storage()} rejects operator-
 *      supplied URL regex patterns that contain catastrophic-backtracking shapes,
 *      exceed the maximum length, or fail PCRE compile.
 *
 *   2. RENDER-TIME guard — {@see run_guarded()} lowers the PCRE backtrack limit
 *      and installs a temporary error handler that converts PCRE runtime warnings
 *      into graceful fallthrough, then restores both on exit via finally{}.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Header_Rules_ReDoS_Guard
 *
 * Pure static helpers — no instance state. Designed to be called by
 * {@see Sgs_Header_Rules} at storage time (add_rule) and render time (evaluate).
 */
final class Sgs_Header_Rules_ReDoS_Guard {

	/** Maximum allowed length of an operator-provided regex pattern. */
	const MAX_PATTERN_LENGTH = 200;

	/** PCRE backtrack limit applied during render-time evaluation. */
	const RENDER_BACKTRACK_LIMIT = 100000;

	/**
	 * Catastrophic-backtracking shapes rejected at storage time. The validator
	 * patterns are known-fast literals — they themselves do NOT introduce
	 * ReDoS risk because each is anchored to specific character classes.
	 *
	 * @var array<int,string>
	 */
	const NESTED_QUANTIFIER_BLACKLIST = array(
		'/\([^)]*[+*][^)]*\)\s*[+*]/',              // (anything+/-)+ or (anything+/-)*  — nested unbounded quantifier.
		'/\([^)]*[+*][^)]*\)\s*\{\d*,?\d*\}/',      // (anything+/-){n,m}  — bounded quantifier over a greedy inner group.
	);

	/**
	 * Storage-time validator for an operator-supplied URL regex pattern.
	 *
	 * Checks:
	 *   1. Non-empty.
	 *   2. Length ≤ {@see MAX_PATTERN_LENGTH}.
	 *   3. No catastrophic-backtracking shape from {@see NESTED_QUANTIFIER_BLACKLIST}.
	 *   4. Test-compile via preg_match against empty string.
	 *
	 * @param string $pattern Operator-supplied pattern (no delimiters).
	 * @return true|\WP_Error
	 */
	public static function validate_at_storage( string $pattern ) {
		if ( '' === $pattern ) {
			return new \WP_Error(
				'sgs_header_rules_empty_pattern',
				\__( 'URL pattern cannot be empty.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}
		if ( strlen( $pattern ) > self::MAX_PATTERN_LENGTH ) {
			return new \WP_Error(
				'sgs_header_rules_pattern_too_long',
				\__( 'URL pattern exceeds 200 characters.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}
		foreach ( self::NESTED_QUANTIFIER_BLACKLIST as $blacklist_re ) {
			if ( preg_match( $blacklist_re, $pattern ) ) {
				return new \WP_Error(
					'sgs_header_rules_redos_shape',
					\__( 'URL pattern contains a nested unbounded quantifier (e.g. (a+)+) that risks catastrophic backtracking.', 'sgs-blocks' ),
					array( 'status' => 400 )
				);
			}
		}
		// Test-compile against an empty string. PHP returns false on compile failure.
		// We suppress warnings via @ — the false return value is the canonical signal.
		$result = @preg_match( '/' . str_replace( '/', '\\/', $pattern ) . '/', '' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		if ( false === $result ) {
			return new \WP_Error(
				'sgs_header_rules_invalid_regex',
				\__( 'URL pattern is not a valid regular expression.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}
		return true;
	}

	/**
	 * Render-time guard. Runs a callable with a lowered PCRE backtrack limit and
	 * a silencing error handler that converts PCRE runtime warnings into a graceful
	 * skip rather than aborting the render. Both are restored via finally{} so the
	 * guard is always torn down regardless of exceptions.
	 *
	 * Usage:
	 *   $html = Sgs_Header_Rules_ReDoS_Guard::run_guarded( static function () {
	 *       // ... PCRE-executing code ...
	 *       return $result;
	 *   } );
	 *
	 * @param callable $callback Zero-argument callable returning a value of any type.
	 * @return mixed The return value of $callback.
	 */
	public static function run_guarded( callable $callback ) {
		$prev_limit = ini_get( 'pcre.backtrack_limit' );
		ini_set( 'pcre.backtrack_limit', (string) self::RENDER_BACKTRACK_LIMIT ); // phpcs:ignore WordPress.PHP.IniSet.Risky

		// Convert PCRE runtime warnings into a graceful skip rather than aborting render.
		$swallow = static function () {
			return true;
		};
		set_error_handler( $swallow ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions

		try {
			return $callback();
		} finally {
			restore_error_handler();
			if ( false !== $prev_limit ) {
				ini_set( 'pcre.backtrack_limit', (string) $prev_limit ); // phpcs:ignore WordPress.PHP.IniSet.Risky
			}
		}
	}
}
