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
 * TWO JOBS.
 *
 * JOB A — function-body co-occurrence (unchanged since this scanner's first
 * build). For every top-level `function name(...) { ... }` definition in a
 * scanned file (nested closures, e.g. inside `array_map()`, are considered
 * part of their enclosing top-level function's body):
 *
 *   - If the body contains NO `:hover` string-literal token anywhere, the
 *     function is not a candidate — skipped.
 *   - If the body contains a `:hover` literal AND also calls at least one
 *     of the three guard functions anywhere in the same body, it PASSES.
 *     This tolerates the codebase's real multi-statement pattern (build a
 *     `$hover_selector` string across several lines, pass it into
 *     `sgs_hover_guarded_rule()` several lines later) without trying to
 *     prove the two are the same string.
 *   - If the body contains a `:hover` literal and calls NONE of the guard
 *     functions, it FAILS — a new helper that hand-rolls a `{$sel}:hover{}`
 *     rule and never wraps it.
 *
 * JOB B — cross-file registry resolution (added 2026-09-03, closes a gap
 * JOB A cannot see by construction: a function whose OWN body has no
 * `:hover` literal at all, because the hover-carrying selector was built in
 * a DIFFERENT file and handed in as a parameter to a shared CSS-emitting
 * helper that only guards on SOME of its call paths). Driven entirely by
 * `php-emitter-registry.json` — DECLARED DATA, not a hardcoded if/else
 * chain. For each function name in that registry, this scan finds every
 * CALL to it anywhere in a scanned file's function bodies and:
 *
 *   1. Reads the registry's `selector_param_index` argument at that call
 *      site and asks "does this argument carry `:hover`?" — resolved with
 *      EXACTLY ONE HOP: if the argument is itself a literal containing
 *      `:hover`, or a bare `$variable` that was locally assigned (in the
 *      SAME enclosing function, `=` or `.=`) a value containing `:hover`
 *      anywhere in its right-hand side, the answer is a confident YES. If
 *      the argument is a bare `$variable` with no local assignment found in
 *      this function (i.e. it is simply a pass-through parameter), the
 *      answer is a confident NO for the CURRENT hop — this scan does not
 *      chase the variable into the CALLER's caller; see the KNOWN
 *      LIMITATION note below. Anything more complex (a function call, a
 *      ternary, string interpolation mixing multiple sources) that doesn't
 *      resolve to a plain literal-or-traced-variable is UNRESOLVED — this
 *      scan never guesses past what it can prove.
 *   2. Only when step 1 is YES: reads the registry's
 *      `guard_gate_param_index` argument at that SAME call site and checks
 *      whether its exact token text matches one of the registry's
 *      `guard_skip_literals` for that function (e.g. the bare keyword
 *      `null`) — a PROVEN case where the callee's guarded branch is
 *      skipped, so the hover-carrying selector reaches an unconditional,
 *      unguarded emission inside the callee. That is a FLAG. If the gate
 *      argument is a single literal NOT in the skip list (a genuine
 *      non-empty string, say), the guarded branch is confidently assumed to
 *      run — no finding. Anything else (a variable, a ternary, a nested
 *      call) is UNRESOLVED, not guessed at either way.
 *
 * `includes/helpers-hover-state.php` itself is excluded from BOTH jobs — it
 * is the DEFINER of `:hover` construction and of the guard functions, not a
 * caller that must route through itself.
 *
 * ⛔ KNOWN LIMITATIONS (documented, not silently swallowed — matches this
 * project's anti-vacuity standard).
 *   - JOB A is function-BODY co-occurrence, not proof the guarded call
 *     consumes the SAME string the `:hover` literal produced.
 *   - JOB B is bounded to exactly ONE hop of variable tracing, scoped to
 *     the immediate calling function's own body, and only against the
 *     functions named in `php-emitter-registry.json`. It cannot see: a
 *     two-hop flow (the hover-carrying value assembled in a function two
 *     calls away from the registered emitter); a dynamically-named function
 *     call (`$fn(...)` or `call_user_func()`) invoking a registered
 *     emitter; a selector built in a CALLER's caller and merely passed
 *     through as a bare parameter (deliberately resolved as "no" at the
 *     current hop — see step 1 above); or any emitter not yet added to the
 *     registry.
 *
 * Output: JSON to stdout — {"functions", "failures", "cross_file_calls",
 * "cross_file_flags", "cross_file_unresolved", "had_error"}.
 * Exit code 0 only if failures, cross_file_flags AND cross_file_unresolved
 * are all empty; 1 if any is non-empty; 2 on a scan error (parse/read
 * failure, or a missing/unreadable registry file) — never fabricates a
 * pass on an error.
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

const GUARD_FUNCTIONS = array(
	'sgs_hover_guarded_rule',
	'sgs_hover_state_rules',
	'sgs_hover_media_wrap',
);

/** Token types treated as insignificant whitespace/comments when reducing a span to its meaningful tokens. */
const SKIPPABLE_TOKEN_TYPES = array( T_WHITESPACE, T_COMMENT, T_DOC_COMMENT );

/**
 * Load the declared cross-file emitter registry.
 *
 * @param string $path
 * @return array<string, array{selector_param_index:int, guard_gate_param_index:int, guard_skip_literals:string[]}>|null Null on any read/parse failure.
 */
function load_registry( string $path ): ?array {
	if ( ! is_readable( $path ) ) {
		return null;
	}
	$raw = file_get_contents( $path );
	if ( false === $raw ) {
		return null;
	}
	$decoded = json_decode( $raw, true );
	if ( ! is_array( $decoded ) ) {
		return null;
	}
	$registry = array();
	foreach ( $decoded as $fn_name => $entry ) {
		if ( 0 === strpos( (string) $fn_name, '_' ) ) {
			continue; // schema-doc keys, e.g. _comment_schema
		}
		if ( ! is_array( $entry ) || ! isset( $entry['selector_param_index'], $entry['guard_gate_param_index'] ) ) {
			continue; // malformed row — silently dropping a row here is safe: it simply won't be detected, never a false accusation
		}
		$registry[ $fn_name ] = array(
			'selector_param_index'   => (int) $entry['selector_param_index'],
			'guard_gate_param_index' => (int) $entry['guard_gate_param_index'],
			'guard_skip_literals'    => array_map( 'strval', $entry['guard_skip_literals'] ?? array() ),
		);
	}
	return $registry;
}

/**
 * Reduce a token span [start,end] (inclusive) to its meaningful tokens
 * (whitespace/comments stripped).
 *
 * @param array $tokens
 * @param int   $start
 * @param int   $end
 * @return array
 */
function meaningful_tokens( array $tokens, int $start, int $end ): array {
	$out = array();
	for ( $p = $start; $p <= $end; $p++ ) {
		$t = $tokens[ $p ];
		if ( is_array( $t ) && in_array( $t[0], SKIPPABLE_TOKEN_TYPES, true ) ) {
			continue;
		}
		$out[] = $t;
	}
	return $out;
}

/**
 * One-hop hover-taint classification for a single call argument span.
 *
 * @param array $tokens
 * @param array{0:int,1:int} $span
 * @param array<string,bool> $localMap Variable name => was locally assigned a `:hover`-carrying value in this function.
 * @return 'yes'|'no'|'unresolved'
 */
function classify_arg_hover( array $tokens, array $span, array $localMap ): string {
	if ( $span[1] < $span[0] ) {
		return 'unresolved'; // argument position not actually passed at this call site
	}
	$sawComplex = false;
	for ( $p = $span[0]; $p <= $span[1]; $p++ ) {
		$t = $tokens[ $p ];
		if ( is_array( $t ) ) {
			if ( in_array( $t[0], SKIPPABLE_TOKEN_TYPES, true ) ) {
				continue;
			}
			if ( in_array( $t[0], array( T_CONSTANT_ENCAPSED_STRING, T_ENCAPSED_AND_WHITESPACE ), true ) ) {
				if ( false !== strpos( $t[1], ':hover' ) ) {
					return 'yes';
				}
				continue; // plain literal, no hover — simple, keeps resolving
			}
			if ( T_VARIABLE === $t[0] ) {
				if ( ! empty( $localMap[ $t[1] ] ) ) {
					return 'yes';
				}
				continue; // traced within this function, not hover-tainted — simple
			}
			// any other token kind (T_STRING function name, T_ARRAY, T_OBJECT_OPERATOR,
			// T_DOUBLE_ARROW, etc.) is outside the bounded one-hop vocabulary.
			$sawComplex = true;
			continue;
		}
		if ( '.' === $t ) {
			continue; // string concatenation operator — simple
		}
		$sawComplex = true;
	}
	return $sawComplex ? 'unresolved' : 'no';
}

/**
 * Classify a guard-gate argument span against the registry's declared
 * skip-literal list for this function.
 *
 * @param array $tokens
 * @param array{0:int,1:int} $span
 * @param string[] $skipLiterals
 * @return 'skip'|'fires'|'unresolved'
 */
function classify_gate_arg( array $tokens, array $span, array $skipLiterals ): string {
	if ( $span[1] < $span[0] ) {
		return 'unresolved';
	}
	$meaningful = meaningful_tokens( $tokens, $span[0], $span[1] );
	if ( 1 !== count( $meaningful ) ) {
		return 'unresolved'; // ternary, concatenation, nested call — don't guess
	}
	$only = $meaningful[0];
	$text = is_array( $only ) ? $only[1] : $only;
	foreach ( $skipLiterals as $lit ) {
		if ( 0 === strcasecmp( trim( $text ), $lit ) ) {
			return 'skip';
		}
	}
	if ( is_array( $only ) && T_CONSTANT_ENCAPSED_STRING === $only[0] ) {
		return 'fires'; // a genuine, non-skip-listed literal — confident the guarded branch runs
	}
	return 'unresolved'; // e.g. a bare $variable, a number, an unrecognised single token
}

/**
 * Find every call to a registered function within a token span, and split
 * each call's argument list into top-level (bracket-depth-0) spans.
 *
 * @param array $tokens
 * @param int   $bodyStart
 * @param int   $bodyEnd
 * @param array<string,array> $registry
 * @return array<int, array{function:string, line:int, args: array<int, array{0:int,1:int}>}>
 */
function find_registered_calls( array $tokens, int $bodyStart, int $bodyEnd, array $registry ): array {
	$calls = array();
	$i     = $bodyStart;
	while ( $i <= $bodyEnd ) {
		$t = $tokens[ $i ];
		if ( ! is_array( $t ) || T_STRING !== $t[0] || ! isset( $registry[ $t[1] ] ) ) {
			$i++;
			continue;
		}

		$j = $i + 1;
		while ( $j <= $bodyEnd && is_array( $tokens[ $j ] ) && in_array( $tokens[ $j ][0], SKIPPABLE_TOKEN_TYPES, true ) ) {
			$j++;
		}
		if ( $j > $bodyEnd || '(' !== $tokens[ $j ] ) {
			$i++;
			continue; // a mention of the name, not a direct call (e.g. inside a string) — not our concern
		}

		$openParen = $j;
		$depth     = 0;
		$close     = null;
		for ( $k = $openParen; $k <= $bodyEnd; $k++ ) {
			$tk = $tokens[ $k ];
			if ( '(' === $tk ) {
				$depth++;
			} elseif ( ')' === $tk ) {
				$depth--;
				if ( 0 === $depth ) {
					$close = $k;
					break;
				}
			}
		}
		if ( null === $close ) {
			$i++;
			continue; // unterminated within this body — malformed, skip rather than guess
		}

		$args      = array();
		$argStart  = $openParen + 1;
		$argDepth  = 0;
		for ( $k = $openParen + 1; $k < $close; $k++ ) {
			$tk = $tokens[ $k ];
			if ( '(' === $tk || '[' === $tk || '{' === $tk ) {
				$argDepth++;
			} elseif ( ')' === $tk || ']' === $tk || '}' === $tk ) {
				$argDepth--;
			} elseif ( 0 === $argDepth && ',' === $tk ) {
				$args[]   = array( $argStart, $k - 1 );
				$argStart = $k + 1;
			}
		}
		if ( $argStart <= $close - 1 ) {
			$args[] = array( $argStart, $close - 1 );
		}

		$calls[] = array(
			'function' => $t[1],
			'line'     => $t[2],
			'args'     => $args,
		);

		$i = $close + 1;
	}
	return $calls;
}

/**
 * One-hop local variable taint map: for every `$var = ...;` / `$var .= ...;`
 * statement inside [bodyStart, bodyEnd], record whether its right-hand-side
 * span contains a `:hover` string-literal token anywhere (including inside
 * a nested closure, since the closure body is lexically part of the RHS
 * span). A variable with NO local assignment found (a pass-through
 * parameter) is simply absent from the map — callers treat "absent" as a
 * confident "not tainted at this hop".
 *
 * @param array $tokens
 * @param int   $bodyStart
 * @param int   $bodyEnd
 * @return array<string, bool>
 */
function build_local_assignment_map( array $tokens, int $bodyStart, int $bodyEnd ): array {
	$map = array();
	for ( $i = $bodyStart; $i <= $bodyEnd; $i++ ) {
		$t = $tokens[ $i ];
		if ( ! is_array( $t ) || T_VARIABLE !== $t[0] ) {
			continue;
		}
		$varName = $t[1];

		$j = $i + 1;
		while ( $j <= $bodyEnd && is_array( $tokens[ $j ] ) && in_array( $tokens[ $j ][0], SKIPPABLE_TOKEN_TYPES, true ) ) {
			$j++;
		}
		if ( $j > $bodyEnd ) {
			continue;
		}
		$opTok    = $tokens[ $j ];
		$isAssign = ( '=' === $opTok ) || ( is_array( $opTok ) && T_CONCAT_EQUAL === $opTok[0] );
		if ( ! $isAssign ) {
			continue;
		}

		$rhsStart = $j + 1;
		$depth    = 0;
		$rhsEnd   = null;
		for ( $k = $rhsStart; $k <= $bodyEnd; $k++ ) {
			$tk = $tokens[ $k ];
			if ( '(' === $tk || '[' === $tk || '{' === $tk || ( is_array( $tk ) && ( T_CURLY_OPEN === $tk[0] || T_DOLLAR_OPEN_CURLY_BRACES === $tk[0] ) ) ) {
				$depth++;
			} elseif ( ')' === $tk || ']' === $tk || '}' === $tk ) {
				$depth--;
			} elseif ( 0 === $depth && ';' === $tk ) {
				$rhsEnd = $k - 1;
				break;
			}
		}
		if ( null === $rhsEnd || $rhsEnd < $rhsStart ) {
			continue; // malformed or empty RHS — don't guess
		}

		$hasHover = false;
		for ( $p = $rhsStart; $p <= $rhsEnd; $p++ ) {
			$tp = $tokens[ $p ];
			if ( is_array( $tp ) && in_array( $tp[0], array( T_CONSTANT_ENCAPSED_STRING, T_ENCAPSED_AND_WHITESPACE ), true ) && false !== strpos( $tp[1], ':hover' ) ) {
				$hasHover = true;
				break;
			}
		}

		if ( $hasHover ) {
			$map[ $varName ] = true; // sticky — one hover-carrying assignment taints the variable for the rest of the function
		} elseif ( ! isset( $map[ $varName ] ) ) {
			$map[ $varName ] = false;
		}
	}
	return $map;
}

/**
 * @param string $path
 * @param array<string,array>|null $registry
 * @return array{functions: array, failures: array, cross_file_calls: array, cross_file_flags: array, cross_file_unresolved: array, error: string|null}
 */
function scan_file( string $path, ?array $registry ): array {
	$source = file_get_contents( $path );
	if ( false === $source ) {
		return array(
			'functions'             => array(),
			'failures'              => array(),
			'cross_file_calls'      => array(),
			'cross_file_flags'      => array(),
			'cross_file_unresolved' => array(),
			'error'                 => "could not read {$path}",
		);
	}

	$tokens = @token_get_all( $source );
	if ( false === $tokens ) {
		return array(
			'functions'             => array(),
			'failures'              => array(),
			'cross_file_calls'      => array(),
			'cross_file_flags'      => array(),
			'cross_file_unresolved' => array(),
			'error'                 => "tokenizer failed on {$path}",
		);
	}

	$functions            = array();
	$failures             = array();
	$crossFileCalls       = array();
	$crossFileFlags       = array();
	$crossFileUnresolved  = array();
	$count                = count( $tokens );
	$i                    = 0;

	while ( $i < $count ) {
		$tok = $tokens[ $i ];

		if ( is_array( $tok ) && T_FUNCTION === $tok[0] ) {
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
				break;
			}

			$line = is_array( $tok ) ? $tok[2] : 0;

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
					break;
				}
				$k++;
			}

			if ( ! $foundOpen || null === $name ) {
				$i++;
				continue;
			}

			$depth     = 0;
			$bodyStart = $k;
			$bodyEnd   = $k;
			$m         = $k;
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

			// ── JOB A: function-body co-occurrence ─────────────────────────
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

			// ── JOB B: cross-file registry resolution ──────────────────────
			if ( ! empty( $registry ) ) {
				$calls = find_registered_calls( $tokens, $bodyStart, $bodyEnd, $registry );
				if ( ! empty( $calls ) ) {
					$localMap = build_local_assignment_map( $tokens, $bodyStart, $bodyEnd );

					foreach ( $calls as $call ) {
						$entry           = $registry[ $call['function'] ];
						$selectorIdx     = $entry['selector_param_index'];
						$gateIdx         = $entry['guard_gate_param_index'];
						$selectorSpan    = $call['args'][ $selectorIdx ] ?? array( 1, 0 ); // empty span => "not passed"
						$selectorVerdict = classify_arg_hover( $tokens, $selectorSpan, $localMap );

						$record = array(
							'caller_function' => $name,
							'file'             => $path,
							'line'             => $call['line'],
							'callee'           => $call['function'],
						);

						if ( 'no' === $selectorVerdict ) {
							$record['resolution'] = 'clean-no-hover';
							$crossFileCalls[]      = $record;
							continue;
						}

						if ( 'unresolved' === $selectorVerdict ) {
							$record['resolution'] = 'unresolved-selector';
							$crossFileCalls[]      = $record;
							$crossFileUnresolved[] = $record;
							continue;
						}

						// selectorVerdict === 'yes' — check the gate.
						$gateSpan    = $call['args'][ $gateIdx ] ?? array( 1, 0 );
						$gateVerdict = classify_gate_arg( $tokens, $gateSpan, $entry['guard_skip_literals'] );

						if ( 'skip' === $gateVerdict ) {
							$record['resolution'] = 'flagged-unguarded';
							$crossFileCalls[]      = $record;
							$crossFileFlags[]      = $record;
						} elseif ( 'fires' === $gateVerdict ) {
							$record['resolution'] = 'clean-guard-fires';
							$crossFileCalls[]      = $record;
						} else {
							$record['resolution'] = 'unresolved-gate';
							$crossFileCalls[]      = $record;
							$crossFileUnresolved[] = $record;
						}
					}
				}
			}

			$i = $bodyEnd + 1;
			continue;
		}

		$i++;
	}

	return array(
		'functions'             => $functions,
		'failures'              => $failures,
		'cross_file_calls'      => $crossFileCalls,
		'cross_file_flags'      => $crossFileFlags,
		'cross_file_unresolved' => $crossFileUnresolved,
		'error'                 => null,
	);
}

$args = array_slice( $argv, 1 );
if ( empty( $args ) ) {
	fwrite( STDERR, "usage: php php-hover-scan.php [--registry=path] <file.php> [<file.php> ...]\n" );
	exit( 2 );
}

$registryPath = __DIR__ . '/php-emitter-registry.json';
$paths        = array();
foreach ( $args as $arg ) {
	if ( 0 === strpos( $arg, '--registry=' ) ) {
		$registryPath = substr( $arg, strlen( '--registry=' ) );
		continue;
	}
	$paths[] = $arg;
}

if ( empty( $paths ) ) {
	fwrite( STDERR, "usage: php php-hover-scan.php [--registry=path] <file.php> [<file.php> ...]\n" );
	exit( 2 );
}

$registry = load_registry( $registryPath );
if ( null === $registry ) {
	fwrite( STDERR, "SCAN ERROR: could not load emitter registry at {$registryPath} — cross-file job (B) cannot run.\n" );
	// Job A can still run meaningfully on its own, but per this scanner's
	// never-fabricate-a-pass rule a registry load failure is treated as a
	// scan error (exit 2), not a silent "0 cross-file findings".
	$hadError = true;
	$registry = array();
} else {
	$hadError = false;
}

$allFunctions            = array();
$allFailures             = array();
$allCrossFileCalls       = array();
$allCrossFileFlags       = array();
$allCrossFileUnresolved  = array();

foreach ( $paths as $path ) {
	$result = scan_file( $path, $registry );
	if ( null !== $result['error'] ) {
		fwrite( STDERR, "SCAN ERROR: {$result['error']}\n" );
		$hadError = true;
		continue;
	}
	$allFunctions           = array_merge( $allFunctions, $result['functions'] );
	$allFailures            = array_merge( $allFailures, $result['failures'] );
	$allCrossFileCalls      = array_merge( $allCrossFileCalls, $result['cross_file_calls'] );
	$allCrossFileFlags      = array_merge( $allCrossFileFlags, $result['cross_file_flags'] );
	$allCrossFileUnresolved = array_merge( $allCrossFileUnresolved, $result['cross_file_unresolved'] );
}

echo json_encode(
	array(
		'functions'             => $allFunctions,
		'failures'              => $allFailures,
		'cross_file_calls'      => $allCrossFileCalls,
		'cross_file_flags'      => $allCrossFileFlags,
		'cross_file_unresolved' => $allCrossFileUnresolved,
		'had_error'             => $hadError,
	),
	JSON_PRETTY_PRINT
), "\n";

if ( $hadError ) {
	exit( 2 );
}
exit( ( empty( $allFailures ) && empty( $allCrossFileFlags ) && empty( $allCrossFileUnresolved ) ) ? 0 : 1 );
