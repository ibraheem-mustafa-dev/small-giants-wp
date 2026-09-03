<?php
/**
 * Static PHP-side hover-guard coverage scan.
 *
 * Complements transform.js/check.js (which cover static block `style.css`)
 * by scanning the PHP emission helpers under `includes/` for a `:hover`
 * selector built and emitted WITHOUT ever routing through one of the guard
 * functions declared in `includes/helpers-hover-state.php`
 * (`sgs_hover_guarded_rule()`, `sgs_hover_state_rules()`,
 * `sgs_hover_media_wrap()`).
 *
 * METHOD (function-body co-occurrence, NOT full data-flow taint tracking —
 * see the "KNOWN LIMITATION" note below for exactly what this cannot see).
 *
 * For every top-level `function name(...) { ... }` definition in a scanned
 * file (nested closures, e.g. inside `array_map()`, are considered part of
 * their enclosing top-level function's body):
 *
 *   - If the body contains NO `:hover` string-literal token anywhere, the
 *     function is not a candidate — skipped.
 *   - If the body contains a `:hover` literal AND also calls at least one
 *     of the three guard functions anywhere in the same body, it PASSES.
 *     This tolerates the codebase's real multi-statement pattern (build a
 *     `$hover_selector` string across several lines, pass it into
 *     `sgs_hover_guarded_rule()` several lines later) without trying to
 *     prove the two are the same string — see the limitation note.
 *   - If the body contains a `:hover` literal and calls NONE of the guard
 *     functions, it FAILS — this is the realistic regression this scan
 *     exists to catch: a new helper that hand-rolls a `{$sel}:hover{...}`
 *     rule and never wraps it.
 *
 * `includes/helpers-hover-state.php` itself is excluded from scanning — it
 * is the DEFINER of `:hover` construction (`sgs_hover_state_rules()`
 * builds the literal `:hover` suffix internally), not a caller that must
 * route through itself.
 *
 * ⛔ KNOWN LIMITATION (documented, not silently swallowed — matches this
 * project's anti-vacuity standard). This is a function-BODY co-occurrence
 * check, not a data-flow proof that the guarded call actually consumes the
 * SAME string the `:hover` literal produced. A function that calls a guard
 * function for one code path while a DIFFERENT, unguarded code path in the
 * SAME function emits a rule built from a `:hover`-carrying selector it
 * received as a PARAMETER (rather than containing a `:hover` literal
 * itself) is invisible to this scan — there is no `:hover` string literal
 * inside that function's own source to trigger the check. Cross-function
 * taint tracking would be needed to close that gap; out of scope here. See
 * the accompanying report for one such pre-existing case found by hand
 * during this build (`sgs_border_gradient_css()`'s null-`$hover_paint`
 * branch in helpers-tokens.php), reported but NOT fixed — fixing it is
 * outside this task's file-write scope.
 *
 * Output: JSON to stdout — {"functions": [...], "failures": [...]}.
 * Exit code 0 if failures is empty, 1 otherwise, 2 on a scan error (parse
 * failure) — never fabricates a pass on an error.
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

const GUARD_FUNCTIONS = array(
	'sgs_hover_guarded_rule',
	'sgs_hover_state_rules',
	'sgs_hover_media_wrap',
);

/**
 * @param string $path
 * @return array{functions: array<int, array{name:string, file:string, line:int, has_hover_literal:bool, calls_guard:bool}>, failures: array<int, array{name:string, file:string, line:int}>, error: string|null}
 */
function scan_file( string $path ): array {
	$source = file_get_contents( $path );
	if ( false === $source ) {
		return array(
			'functions' => array(),
			'failures'  => array(),
			'error'     => "could not read {$path}",
		);
	}

	$tokens = @token_get_all( $source );
	if ( false === $tokens ) {
		return array(
			'functions' => array(),
			'failures'  => array(),
			'error'     => "tokenizer failed on {$path}",
		);
	}

	$functions = array();
	$failures  = array();
	$count     = count( $tokens );
	$i         = 0;

	while ( $i < $count ) {
		$tok = $tokens[ $i ];

		if ( is_array( $tok ) && T_FUNCTION === $tok[0] ) {
			// Find the function name (next T_STRING token, skipping whitespace
			// and the by-ref `&` for a function returning by reference).
			$j    = $i + 1;
			$name = null;
			while ( $j < $count ) {
				$t = $tokens[ $j ];
				if ( is_array( $t ) && T_STRING === $t[0] ) {
					$name = $t[1];
					break;
				}
				if ( is_array( $t ) && T_WHITESPACE === $t[0] ) {
					$j++;
					continue;
				}
				if ( '&' === $t ) {
					$j++;
					continue;
				}
				break; // anonymous function/closure at this position — skip as top-level candidate
			}

			$line = is_array( $tok ) ? $tok[2] : 0;

			// Advance to the opening '{' of the body, skipping the parameter
			// list and any return-type declaration. Bail (not a definition,
			// e.g. an interface/abstract signature ending in ';') if we hit
			// ';' before '{'.
			$k         = $j;
			$paren     = 0;
			$foundOpen = false;
			while ( $k < $count ) {
				$t = $tokens[ $k ];
				if ( '(' === $t ) {
					$paren++;
				} elseif ( ')' === $t ) {
					$paren--;
				} elseif ( '{' === $t && 0 === $paren ) {
					$foundOpen = true;
					break;
				} elseif ( ';' === $t && 0 === $paren ) {
					break; // interface method signature, no body
				}
				$k++;
			}

			if ( ! $foundOpen || null === $name ) {
				$i++;
				continue;
			}

			// Walk from the opening '{' to its matching close, tracking depth.
			$depth      = 0;
			$bodyStart  = $k;
			$bodyEnd    = $k;
			$m          = $k;
			while ( $m < $count ) {
				$t = $tokens[ $m ];
				if ( '{' === $t || ( is_array( $t ) && T_CURLY_OPEN === $t[0] ) || ( is_array( $t ) && T_DOLLAR_OPEN_CURLY_BRACES === $t[0] ) ) {
					$depth++;
				} elseif ( '}' === $t ) {
					$depth--;
					if ( 0 === $depth ) {
						$bodyEnd = $m;
						break;
					}
				}
				$m++;
			}

			$hasHover   = false;
			$callsGuard = false;
			for ( $b = $bodyStart; $b <= $bodyEnd; $b++ ) {
				$t = $tokens[ $b ];
				if ( is_array( $t ) && in_array( $t[0], array( T_CONSTANT_ENCAPSED_STRING, T_ENCAPSED_AND_WHITESPACE, T_STRING ), true ) ) {
					if ( false !== strpos( $t[1], ':hover' ) ) {
						$hasHover = true;
					}
				}
				if ( is_array( $t ) && T_STRING === $t[0] && in_array( $t[1], GUARD_FUNCTIONS, true ) ) {
					$callsGuard = true;
				}
			}

			$functions[] = array(
				'name'              => $name,
				'file'              => $path,
				'line'              => $line,
				'has_hover_literal' => $hasHover,
				'calls_guard'       => $callsGuard,
			);

			if ( $hasHover && ! $callsGuard ) {
				$failures[] = array(
					'name' => $name,
					'file' => $path,
					'line' => $line,
				);
			}

			$i = $bodyEnd + 1;
			continue;
		}

		$i++;
	}

	return array(
		'functions' => $functions,
		'failures'  => $failures,
		'error'     => null,
	);
}

$paths = array_slice( $argv, 1 );
if ( empty( $paths ) ) {
	fwrite( STDERR, "usage: php php-hover-scan.php <file.php> [<file.php> ...]\n" );
	exit( 2 );
}

$allFunctions = array();
$allFailures  = array();
$hadError     = false;

foreach ( $paths as $path ) {
	$result = scan_file( $path );
	if ( null !== $result['error'] ) {
		fwrite( STDERR, "SCAN ERROR: {$result['error']}\n" );
		$hadError = true;
		continue;
	}
	$allFunctions = array_merge( $allFunctions, $result['functions'] );
	$allFailures  = array_merge( $allFailures, $result['failures'] );
}

echo json_encode(
	array(
		'functions' => $allFunctions,
		'failures'  => $allFailures,
		'had_error' => $hadError,
	),
	JSON_PRETTY_PRINT
), "\n";

if ( $hadError ) {
	exit( 2 );
}
exit( empty( $allFailures ) ? 0 : 1 );
