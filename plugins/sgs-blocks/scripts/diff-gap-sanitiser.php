<?php
/**
 * Differential test: sgs_container_gap_value() old allowlist vs the new
 * sgs_css_length_value()-delegating implementation.
 *
 * Task 2 brief (.superpowers/sdd/task-2-brief.md) constraint 5 requires proof,
 * not reasoning, that every value the OLD sanitiser accepted still produces a
 * byte-identical result once sgs_container_gap_value() delegates to
 * sgs_css_length_value(). This script freezes the OLD implementation verbatim
 * (as it stood in helpers-container.php before the Task 2 swap) so the
 * comparison stays runnable forever as a regression guard, rather than being
 * a one-shot check that loses its baseline the moment the old code is
 * replaced.
 *
 * Run with: php plugins/sgs-blocks/scripts/diff-gap-sanitiser.php
 * Exits 0 on pass (every case byte-identical), 1 on any mismatch.
 *
 * @package SGS\Blocks
 */

// esc_attr() is a WordPress core function, not loaded in this standalone CLI
// context — same minimal stand-in used by helpers-css-safety.php's own
// --self-test path.
if ( ! function_exists( 'esc_attr' ) ) {
	/**
	 * Minimal CLI-only stand-in for WordPress core's esc_attr().
	 *
	 * @param string $text Text to escape.
	 * @return string Escaped text.
	 */
	function esc_attr( $text ) {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

/**
 * FROZEN COPY of the OLD sgs_container_gap_value() allowlist implementation
 * — verbatim from helpers-container.php as it stood immediately before Task
 * 2 swapped it to delegate to sgs_css_length_value(). Do not "improve" this
 * function; its entire purpose is to stay exactly what shipped before.
 *
 * @param string $gap Raw gap attribute value.
 * @return string CSS value fragment, or '' on failure.
 */
function sgs_container_gap_value_old_reference( $gap ) {
	$gap = (string) $gap;
	if ( '' === $gap ) {
		return '';
	}

	// Bare slug: digits only → wrap in WP spacing-preset var().
	if ( preg_match( '/^\d+$/', $gap ) ) {
		return 'var(--wp--preset--spacing--' . esc_attr( $gap ) . ')';
	}

	// Raw CSS length: sanitise — keep only digits, dot, a-z, percent, space.
	$sanitised = preg_replace( '/[^0-9a-z.% ]/', '', strtolower( $gap ) );
	$sanitised = trim( preg_replace( '/\s+/', ' ', $sanitised ) );
	if ( '' === $sanitised ) {
		return '';
	}

	return $sanitised;
}

// Load the NEW validator + the (post-swap) sgs_container_gap_value().
require_once __DIR__ . '/../includes/helpers-css-safety.php';
require_once __DIR__ . '/../includes/helpers-container.php';

if ( ! function_exists( 'sgs_container_gap_value' ) ) {
	fwrite( STDERR, "FATAL: sgs_container_gap_value() is not defined after requiring helpers-container.php\n" );
	exit( 1 );
}

/**
 * Run the differential corpus and report an honest count.
 *
 * @return int Process exit code (0 pass, 1 fail).
 */
function sgs_gap_diff_test() {
	$failures = array();
	$ran      = 0;

	// Brief-mandated minimum corpus (task-2-brief.md, Task 2 section) plus
	// the extra bare-slug + decimal + two-value cases already covered by
	// helpers-css-safety.php's own compat corpus, kept here too so this
	// script is a complete standalone proof rather than relying on the
	// sibling self-test having been run first.
	$corpus = array(
		'16px',
		'48px',
		'1rem',
		'50%',
		'30',
		'16px 12px',
		'',          // empty.
		';;;',       // junk 1 — old strips to '', new raw-rejects to ''.
		'{}',        // junk 2 — old strips to '', new raw-rejects to ''.
		'<>',        // junk 3 — old strips to '', new raw-rejects to ''.
	);

	foreach ( $corpus as $input ) {
		++$ran;
		$old = sgs_container_gap_value_old_reference( $input );
		$new = sgs_container_gap_value( $input );
		if ( $old !== $new ) {
			$failures[] = sprintf(
				'MISMATCH: input=%s old=%s new=%s',
				var_export( $input, true ),
				var_export( $old, true ),
				var_export( $new, true )
			);
		}
	}

	$passed = $ran - count( $failures );

	// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI
	// stdout, not web output; no browser context to escape for (matches the
	// pattern already used by helpers-css-safety.php's own --self-test).
	echo "sgs_container_gap_value() differential test (old allowlist vs new sgs_css_length_value() delegate)\n";
	echo str_repeat( '-', 40 ) . "\n";
	foreach ( $failures as $failure ) {
		echo 'FAIL: ' . $failure . "\n";
	}
	echo "{$passed}/{$ran} passed\n";
	// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped

	return empty( $failures ) ? 0 : 1;
}

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI exit code, not output.
exit( sgs_gap_diff_test() );
