<?php
/**
 * Shared CSS-length safety primitive for SGS block server-side rendering.
 *
 * Provides sgs_css_length_value() — a single hardened validator for any CSS
 * length-shaped attribute value (gap, padding, margin, font-size, grid track
 * lists, etc.) that needs to accept modern fluid-CSS function calls
 * (var()/calc()/min()/max()/minmax()/clamp()/repeat()) while failing closed
 * on anything that could break out of a CSS declaration.
 *
 * This is a SHARED safety primitive, not container-specific — do not fold it
 * back into helpers-container.php. It supersedes the narrow allowlist in
 * sgs_container_gap_value() (see .superpowers/sdd/task-1-brief.md); wiring
 * callers over to it is a separate task and is NOT done by this file.
 *
 * Guarded with function_exists() so this file is safe to include twice (the
 * same pattern used by helpers-container.php / helpers-typography.php).
 *
 * @package SGS\Blocks
 */

if ( ! function_exists( 'sgs_css_length_value' ) ) {
	/**
	 * Validate and normalise a CSS length-shaped value for safe inline emission.
	 *
	 * Grammar (reuses WordPress core's own accepted grammar for fluid CSS —
	 * core's `safecss_filter_attr()` has safely accepted clamp()/min()/max()/
	 * calc()/var() since Trac #55966, and core's theme.json spacingSizes
	 * documents clamp() as a valid preset value):
	 *
	 *   1. A BARE SLUG — a value whose characters are ALL digits (e.g. "40") —
	 *      is a WP spacing-preset slug, wrapped in var(--wp--preset--spacing--N)
	 *      for back-compat with the original sgs_container_gap_value() slug rule.
	 *   2. Otherwise, the value is checked for three raw dangerous substrings
	 *      (url(, expression(, @import) BEFORE any parsing — belt and braces;
	 *      core does not need this guard because `gap` is not in its
	 *      url-bearing property list, but this is a bespoke path.
	 *   3. Any var()/calc()/min()/max()/minmax()/clamp()/repeat() call is then
	 *      consumed with core's own recursive balanced-paren pattern (PCRE2
	 *      (?1) recursion — verified working on this build 2026-08-01).
	 *      `repeat()` (grid-template-columns track lists, e.g.
	 *      "repeat(auto-fit, minmax(16rem, 1fr))") is in WP core's own grammar
	 *      too (`var|calc|min|max|minmax|clamp|repeat`) and was restored here
	 *      2026-08-02 when this validator was wired up as the object-model
	 *      responsive sanitiser (sgs_responsive_sanitise_css_value) — that
	 *      caller's `gridTemplateColumns` values are the exact shape `repeat()`
	 *      exists for. Safe to add: the raw-input breakout check in step 2a
	 *      runs BEFORE this consumption and is what actually provides the
	 *      security (see step 2a's comment) — the function-name allowlist only
	 *      decides which SAFE calls get consumed as a unit, it is not itself a
	 *      security boundary.
	 *   4. If ANYTHING remains after consumption that matches a CSS-breakout
	 *      character class ([\&=}{;<>]), a comment opener (/*), or an
	 *      unconsumed parenthesis, the whole value is rejected.
	 *   5. Otherwise the ORIGINAL value (not the stripped-for-validation one)
	 *      is returned, trimmed, with runs of whitespace collapsed to a single
	 *      space — this preserves the two-value gap syntax ("16px 12px").
	 *
	 * Fails CLOSED: any value that does not parse as a safe CSS length returns
	 * '' (empty string), exactly as the sanitiser it supersedes does for junk.
	 * Callers must guard on '' !== $value before use.
	 *
	 * @param string $value Raw attribute value to validate.
	 * @return string A safe CSS value fragment, or '' on rejection.
	 */
	function sgs_css_length_value( $value ) {
		$value = (string) $value;

		if ( '' === $value ) {
			return '';
		}

		// 1. Bare slug: digits only → wrap in WP spacing-preset var().
		if ( preg_match( '/^\d+$/', $value ) ) {
			return 'var(--wp--preset--spacing--' . esc_attr( $value ) . ')';
		}

		// 2. Belt-and-braces reject of dangerous raw substrings, checked on the
		// RAW input before any function-call consumption. Case-insensitive —
		// CSS keywords are not case-sensitive in browsers.
		if ( preg_match( '/url\s*\(|expression\s*\(|@import/i', $value ) ) {
			return '';
		}

		// 2a. Reject CSS-breakout characters on the RAW input, BEFORE the
		// var|calc|min|max|minmax|clamp consumption below. This is the actual
		// fix: without this check, anything wrapped inside an allowlisted
		// function call (e.g. "calc(}body{color:red)") is stripped out by
		// step 3 UNINSPECTED, and the post-consumption remainder check in
		// step 4 never sees it. `;` `{` `}` `<` `>` `\` and the comment
		// opener `/*` can never legitimately appear in a CSS length or a
		// length-valued function call, so they are rejected here regardless
		// of nesting depth. `(` `)` and `,` are deliberately NOT included —
		// they are legitimate (function-call syntax), and step 4's
		// post-consumption check is what proves any parens left behind are
		// unbalanced.
		//
		// `=` is included here too (it is not in the brief's minimal raw
		// list, but it is not legitimate syntax inside var()/calc()/min()/
		// max()/minmax()/clamp() either — none of those functions ever take
		// an `=`). Leaving it out of the raw check would mean it is the SAME
		// class of bug this fix closes: `calc(1px=2px)` would be silently
		// stripped by step 3's consumption and never reach step 4's
		// remainder check, so it would keep being accepted. Rejecting it
		// here regresses nothing in the accept/backward-compat corpus.
		if ( preg_match( '/[\\\\{}<>;=]/', $value ) || false !== strpos( $value, '/*' ) ) {
			return '';
		}

		// 3. Consume var|calc|min|max|minmax|clamp|repeat calls with WordPress
		// core's own recursive balanced-paren pattern. (?1) recurses group 1
		// (the parenthesised body) to any nesting depth, so
		// "clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)" and
		// "repeat(auto-fit, minmax(min(100%, max(16rem, calc(...))), 1fr))"
		// are each consumed in one match, however deeply nested.
		//
		// CASE-INSENSITIVE (/i) — CSS function names are not case-sensitive
		// ("CLAMP(...)", "Calc(...)" and "clamp(...)" are the same function to
		// every browser), so a lowercase-only pattern here was a false-negative
		// bug: legitimate uppercase/mixed-case author input (hand-authored CSS,
		// or any future emitter that doesn't happen to lowercase) was silently
		// rejected by step 4 below, because the unconsumed "CALC(" text left
		// behind still contains a bare "(" that the remainder check flags.
		//
		// Making this /i is safe — it does NOT open a new bypass — because the
		// breakout guard in step 2a runs on the RAW input BEFORE this
		// consumption step, and step 2a's character class ([\&=}{;<>]) plus its
		// '/*' check match punctuation only, not letters, so they are already
		// fully case-agnostic. An attack payload wrapped inside an
		// allowlisted call, uppercase or not — e.g. "CALC(}body{color:red)" —
		// is rejected at step 2a on the raw value, before this line ever runs,
		// exactly as its lowercase twin "calc(}body{color:red)" already is.
		// This line only changes which SAFE inputs get consumed; it does not
		// change which UNSAFE inputs get rejected.
		$consumed = preg_replace(
			'/\b(?:var|calc|min|max|minmax|clamp|repeat)(\((?:[^()]|(?1))*\))/i',
			'',
			$value
		);

		// preg_replace() returns null on a PCRE engine error (e.g. backtrack
		// or recursion-depth limit exceeded on a pathological input) — fail
		// closed rather than trust an unvalidated value.
		if ( null === $consumed ) {
			return '';
		}

		// 4. Anything left that can break out of a CSS declaration, open a
		// comment, or is an unconsumed/unbalanced parenthesis → reject.
		// This single check also catches unbalanced parens: a function call
		// with no matching close (e.g. "calc(100% - 48px") is NOT consumed by
		// the balanced-paren pattern above, so its "(" survives into $consumed.
		if ( preg_match( '/[\\\\&=}{;<>()]/', $consumed ) || false !== strpos( $consumed, '/*' ) ) {
			return '';
		}

		// 5. Safe — return the ORIGINAL value (with any var()/calc()/clamp()
		// calls still intact; they were only stripped above for validation),
		// trimmed, with internal whitespace runs collapsed to one space.
		return trim( preg_replace( '/\s+/', ' ', $value ) );
	}
}

/**
 * CLI self-check — no WordPress bootstrap required.
 *
 * Run with: php plugins/sgs-blocks/includes/helpers-css-safety.php --self-test
 * Exits 0 on pass (every case behaved as expected), 1 on any failure.
 *
 * This block only runs when the file is executed directly from the CLI with
 * the --self-test flag; it is a no-op (and therefore safe) when the file is
 * `require`d by WordPress on a normal request, and safe to include twice.
 */
if ( PHP_SAPI === 'cli' && isset( $argv ) && in_array( '--self-test', $argv, true ) ) {

	// esc_attr() is a WordPress core function and is not loaded in this
	// standalone CLI context — provide a minimal, behaviourally equivalent
	// stub so sgs_css_length_value() can run unmodified outside WordPress.
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
	 * Run every accept/reject/backward-compat case and report an honest count.
	 *
	 * @return int Process exit code (0 pass, 1 fail).
	 */
	function sgs_css_length_value_self_test() {
		$failures = array();
		$ran      = 0;

		// --- MUST-ACCEPT cases (brief constraint 4, verbatim) ---------------
		$accept_cases = array(
			array( '16px', '16px' ),
			array( '1rem', '1rem' ),
			array( '50%', '50%' ),
			array( '30', 'var(--wp--preset--spacing--30)' ), // bare slug.
			array( 'var(--x, 1rem)', 'var(--x, 1rem)' ),
			array( 'clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)', 'clamp(0.5rem, 0.25rem + 1.5cqi, 1rem)' ),
			array( 'calc(100% - 48px)', 'calc(100% - 48px)' ),
			array( 'min(100%, 16rem)', 'min(100%, 16rem)' ),
			array( '16px 12px', '16px 12px' ), // two-value gap.

			// --- Case-insensitivity fix (the finding this task closes) ------
			// CSS function names are not case-sensitive; these were wrongly
			// REJECTED before the /i flag was added to the step-3 pattern.
			array( 'CLAMP(0.5rem, 1vw, 1rem)', 'CLAMP(0.5rem, 1vw, 1rem)' ),
			array( 'VAR(--MyVar, 1rem)', 'VAR(--MyVar, 1rem)' ), // custom-prop name case preserved.
			array( 'Calc(100% - 48px)', 'Calc(100% - 48px)' ),
			array( 'MIN(100%, 16rem)', 'MIN(100%, 16rem)' ),

			// --- repeat() restored to the function allowlist (this task) ----
			// gridTemplateColumns (an object-model responsive property routed
			// through this validator via sgs_responsive_sanitise_css_value)
			// legitimately carries repeat() track lists — WP core's own
			// grammar includes it (var|calc|min|max|minmax|clamp|repeat), it
			// was dropped from ours only when this validator was scoped to
			// scalar gap values, and re-adding it is safe because the raw-
			// input breakout check (step 2a) runs before any function-name
			// consumption. These two were REJECTED before this fix.
			array( 'repeat(3,1fr)', 'repeat(3,1fr)' ),
			array(
				'repeat(auto-fit, minmax(min(100%, max(16rem, calc((100% - (2 * 48px)) / 3))), 1fr))',
				'repeat(auto-fit, minmax(min(100%, max(16rem, calc((100% - (2 * 48px)) / 3))), 1fr))',
			), // the live D456 footer intrinsic-columns value.

			// --- Plain-value corpus named explicitly in this task's brief ---
			array( '1200px', '1200px' ),
			array( '0 auto', '0 auto' ),
			array( 'var(--wp--preset--spacing--30)', 'var(--wp--preset--spacing--30)' ),
			array( '48px', '48px' ),
			array( '100%', '100%' ),
		);

		foreach ( $accept_cases as $case ) {
			list( $input, $expected ) = $case;
			++$ran;
			$actual = sgs_css_length_value( $input );
			if ( $actual !== $expected ) {
				$failures[] = "ACCEPT case failed: input=\"{$input}\" expected=\"{$expected}\" actual=\"{$actual}\"";
			}
		}

		// --- MUST-REJECT cases (brief constraint 3 — one test per named
		// dangerous construct, plus explicit unbalanced-parenthesis cases).
		// These double as the required negative controls: each assertion
		// below FAILS LOUDLY (adds to $failures) if the value is NOT rejected,
		// i.e. if sgs_css_length_value() wrongly returns a non-empty string.
		$reject_cases = array(
			'url'               => 'url(javascript:alert(1))',
			'expression'        => 'expression(alert(1))',
			'@import'           => "@import 'evil.css'",
			'semicolon'         => '16px; color:red',
			'close-brace'       => '16px} body{color:red',
			'open-brace'        => '16px{',
			'angle-lt'          => '<script>alert(1)</script>',
			'angle-gt'          => '16px>0',
			'backslash'         => '16px\\2028',
			'unbalanced-open'   => 'calc(100% - 48px',   // missing close.
			'unbalanced-close'  => '16px)',                // stray close, no open.
			'unknown-fn-parens' => 'evil(alert(1))',       // parens on a non-allowlisted fn.

			// --- Inside-allowlisted-call breakout repro cases (the actual
			// finding this fix closes: nothing inspected the INSIDE of a
			// consumed var/calc/min/max/minmax/clamp call). Each of these
			// was verified ACCEPTED before this fix.
			'calc-brace-breakout'   => 'calc(}body{color:red)',
			'calc-semicolon-inside' => 'calc(1px;color:red)',
			'clamp-script-tag'      => 'clamp(<script>,1px,2px)',
			'calc-comment-inside'   => 'calc(1px/*x*/)',
			'calc-equals-inside'    => 'calc(1px=2px)',
			'calc-style-close-tag'  => 'calc(</style><script>alert(1)</script>)',

			// --- Case-insensitivity regression guards (this task's fix). The
			// step-3 consumption pattern gained /i so legitimate uppercase
			// input is accepted (see accept_cases above) — these prove that
			// change did NOT also let the uppercase twin of every breakout
			// case above slip through. Each must still be rejected by the
			// RAW-input step-2a check, which runs before consumption and is
			// already case-agnostic (it matches punctuation, not letters).
			'url-upper'                   => 'URL(evil)',
			'expression-upper'            => 'EXPRESSION(alert(1))',
			'calc-brace-breakout-upper'   => 'CALC(}body{color:red)',
			'clamp-script-tag-upper'      => 'CLAMP(<script>,1px,2px)',
			'calc-semicolon-inside-upper' => 'CALC(1px;color:red)',
			'calc-comment-inside-upper'   => 'CALC(1px/*x*/)',
			'calc-url-inside-upper'       => 'Calc(url(evil))',
		);

		foreach ( $reject_cases as $label => $input ) {
			++$ran;
			$actual = sgs_css_length_value( $input );
			if ( '' !== $actual ) {
				$failures[] = "REJECT case (negative control) failed to reject: label=\"{$label}\" input=\"{$input}\" actual=\"{$actual}\" (expected '')";
			}
		}

		// --- BACKWARD-COMPATIBILITY differential corpus (brief constraint 5)
		// Real values the old sgs_container_gap_value() allowlist accepted —
		// bare slugs and simple non-function lengths, which is the entire
		// domain the old allowlist covered (it stripped every paren/comma,
		// so it never accepted a function call in the first place).
		$compat_corpus = array(
			'0'         => 'var(--wp--preset--spacing--0)',
			'8'         => 'var(--wp--preset--spacing--8)',
			'16'        => 'var(--wp--preset--spacing--16)',
			'24'        => 'var(--wp--preset--spacing--24)',
			'32'        => 'var(--wp--preset--spacing--32)',
			'40'        => 'var(--wp--preset--spacing--40)',
			'48'        => 'var(--wp--preset--spacing--48)',
			'56'        => 'var(--wp--preset--spacing--56)',
			'64'        => 'var(--wp--preset--spacing--64)',
			'80'        => 'var(--wp--preset--spacing--80)',
			'0px'       => '0px',
			'1.5rem'    => '1.5rem',
			'2vw'       => '2vw',
			'100%'      => '100%',
			'24px 16px' => '24px 16px',
		);

		foreach ( $compat_corpus as $input => $expected_old_behaviour ) {
			++$ran;
			$actual = sgs_css_length_value( $input );
			if ( $actual !== $expected_old_behaviour ) {
				$failures[] = "BACKWARD-COMPAT case failed: input=\"{$input}\" expected=\"{$expected_old_behaviour}\" actual=\"{$actual}\"";
			}
		}

		$passed = $ran - count( $failures );

		// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI
		// stdout, not web output; no browser context to escape for.
		echo "sgs_css_length_value() self-test\n";
		echo str_repeat( '-', 40 ) . "\n";
		if ( ! empty( $failures ) ) {
			foreach ( $failures as $failure ) {
				echo 'FAIL: ' . $failure . "\n";
			}
		}
		echo "{$passed}/{$ran} passed\n";
		// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped

		return empty( $failures ) ? 0 : 1;
	}

	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI exit code, not output.
	exit( sgs_css_length_value_self_test() );
}
