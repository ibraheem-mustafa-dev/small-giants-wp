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
 *   2. Only when step 1 is YES, checks whether the call is EXTERNALLY
 *      GUARDED (added 2026-09-03, see "EXTERNAL-GUARD RECOGNITION" below)
 *      — if so, no finding, full stop, without ever consulting the gate
 *      argument. Otherwise:
 *   3. Reads the registry's `guard_gate_param_index` argument at that SAME
 *      call site and checks whether its exact token text matches one of
 *      the registry's `guard_skip_literals` for that function (e.g. the
 *      bare keyword `null`) — a PROVEN case where the callee's guarded
 *      branch is skipped, so the hover-carrying selector reaches an
 *      unconditional, unguarded emission inside the callee. That is a
 *      FLAG. If the gate argument is a single literal NOT in the skip list
 *      (a genuine non-empty string, say), the guarded branch is
 *      confidently assumed to run — no finding. Anything else (a
 *      variable, a ternary, a nested call) is UNRESOLVED, not guessed at
 *      either way.
 *
 * EXTERNAL-GUARD RECOGNITION (added 2026-09-03). Step 1/3 above ask "did the
 * CALLEE guard itself?" — sound, but silent about a call the CALLER guards
 * from OUTSIDE the callee: layer 2 baked into the selector expression
 * itself, layer 1 wrapping the callee's whole return value
 * (`sgs_hover_media_wrap( sgs_border_gradient_css( ... ) )` is the real
 * shape this closes — see `includes/helpers-button-style.php`'s border-
 * gradient hover branch). A call is EXTERNALLY GUARDED only when BOTH are
 * independently PROVEN at that exact call site — this is a POSITIVE PROOF
 * requirement, not a relaxation of step 3, and either alone still falls
 * through to step 3 and can still be flagged:
 *   (a) the selector argument's expression — same one-hop tracing as step 1
 *       — contains the registry's declared `layer2_selector_constant`
 *       (e.g. `SGS_HOVER_NOT_TOUCH`) as a literal constant-name token; AND
 *   (b) the call itself sits as an argument (at any position, any nesting
 *       depth is NOT required — the immediate enclosing call is what's
 *       checked) inside a call to one of the registry's declared
 *       `layer1_wrapper_functions` (e.g. `sgs_hover_media_wrap`).
 * Both names are DECLARED DATA under the reserved registry key
 * `__guard_recognition__` — never hardcoded here.
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
 *   - EXTERNAL-GUARD RECOGNITION is bounded the SAME way: the layer-2
 *     constant must appear within ONE hop of the selector argument (a
 *     direct literal, or a locally-assigned variable in the SAME calling
 *     function); the layer-1 wrapper must be the IMMEDIATE enclosing call,
 *     not a wrapper applied two calls away; and a wrapper function not
 *     named in `layer1_wrapper_functions` is invisible, exactly like an
 *     emitter not named in the main registry.
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

/** Reserved registry key for the external-guard recognition metadata — chosen
 *  double-underscore so it can never collide with a real `sgs_*` function name. */
const GUARD_RECOGNITION_KEY = '__guard_recognition__';

/**
 * Load the declared cross-file emitter registry, plus the declared
 * external-guard recognition metadata (layer-1 wrapper function names,
 * layer-2 constant name) under the reserved `__guard_recognition__` key.
 *
 * @param string $path
 * @return array{emitters: array<string, array{selector_param_index:int, guard_gate_param_index:int, guard_skip_literals:string[]}>, guard_recognition: array{layer1_wrapper_functions: string[], layer2_selector_constant: string}}|null Null on any read/parse failure.
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

	$guardRecognition = array(
		'layer1_wrapper_functions' => array(),
		'layer2_selector_constant' => '',
	);
	if ( isset( $decoded[ GUARD_RECOGNITION_KEY ] ) && is_array( $decoded[ GUARD_RECOGNITION_KEY ] ) ) {
		$grEntry = $decoded[ GUARD_RECOGNITION_KEY ];
		if ( isset( $grEntry['layer1_wrapper_functions'] ) && is_array( $grEntry['layer1_wrapper_functions'] ) ) {
			$guardRecognition['layer1_wrapper_functions'] = array_map( 'strval', $grEntry['layer1_wrapper_functions'] );
		}
		if ( isset( $grEntry['layer2_selector_constant'] ) && is_string( $grEntry['layer2_selector_constant'] ) ) {
			$guardRecognition['layer2_selector_constant'] = $grEntry['layer2_selector_constant'];
		}
	}

	$emitters = array();
	foreach ( $decoded as $fn_name => $entry ) {
		if ( GUARD_RECOGNITION_KEY === $fn_name ) {
			continue; // consumed above, not an emitter row
		}
		if ( 0 === strpos( (string) $fn_name, '_' ) ) {
			continue; // schema-doc keys, e.g. _comment_schema
		}
		if ( ! is_array( $entry ) || ! isset( $entry['selector_param_index'], $entry['guard_gate_param_index'] ) ) {
			continue; // malformed row — silently dropping a row here is safe: it simply won't be detected, never a false accusation
		}
		$emitters[ $fn_name ] = array(
			'selector_param_index'   => (int) $entry['selector_param_index'],
			'guard_gate_param_index' => (int) $entry['guard_gate_param_index'],
			'guard_skip_literals'    => array_map( 'strval', $entry['guard_skip_literals'] ?? array() ),
		);
	}

	return array(
		'emitters'          => $emitters,
		'guard_recognition' => $guardRecognition,
	);
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
 * Recognises TWO simple shapes as within the bounded one-hop vocabulary:
 *   - a bare `$variable` (traced against $localMap, as before), and
 *   - this codebase's idiomatic double-quoted curly interpolation,
 *     `"{$variable} literal text"` — PHP's tokenizer splits this into a
 *     bare `"` delimiter char, `T_CURLY_OPEN`, `T_VARIABLE`, a bare `}`
 *     char, then `T_ENCAPSED_AND_WHITESPACE` for the trailing literal, then
 *     a closing bare `"`. Before 2026-09-05 the bare `"`/`T_CURLY_OPEN`/`}`
 *     tokens fell through to the "any other token kind" branch and marked
 *     the WHOLE argument `unresolved` — which is EVERY real call site in
 *     this codebase, since none of them build a raw hover-carrying string
 *     via plain `.` concatenation. Only the EXACT one-variable shape inside
 *     the braces is recognised; anything else (property/array access, a
 *     nested call) stays outside the bounded vocabulary and is still
 *     reported unresolved rather than guessed at.
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
	$p          = $span[0];
	while ( $p <= $span[1] ) {
		$t = $tokens[ $p ];
		if ( is_array( $t ) ) {
			if ( in_array( $t[0], SKIPPABLE_TOKEN_TYPES, true ) ) {
				$p++;
				continue;
			}
			if ( in_array( $t[0], array( T_CONSTANT_ENCAPSED_STRING, T_ENCAPSED_AND_WHITESPACE ), true ) ) {
				if ( false !== strpos( $t[1], ':hover' ) ) {
					return 'yes';
				}
				$p++;
				continue; // plain literal, no hover — simple, keeps resolving
			}
			if ( T_VARIABLE === $t[0] ) {
				if ( ! empty( $localMap[ $t[1] ] ) ) {
					return 'yes';
				}
				$p++;
				continue; // traced within this function, not hover-tainted — simple
			}
			if ( T_CURLY_OPEN === $t[0] ) {
				$innerIdx = $p + 1;
				while ( $innerIdx <= $span[1] && is_array( $tokens[ $innerIdx ] ) && in_array( $tokens[ $innerIdx ][0], SKIPPABLE_TOKEN_TYPES, true ) ) {
					$innerIdx++;
				}
				$closeIdx = $innerIdx + 1;
				while ( $closeIdx <= $span[1] && is_array( $tokens[ $closeIdx ] ) && in_array( $tokens[ $closeIdx ][0], SKIPPABLE_TOKEN_TYPES, true ) ) {
					$closeIdx++;
				}
				$isSimpleCurlyVar = (
					$innerIdx <= $span[1] && is_array( $tokens[ $innerIdx ] ) && T_VARIABLE === $tokens[ $innerIdx ][0]
					&& $closeIdx <= $span[1] && '}' === $tokens[ $closeIdx ]
				);
				if ( $isSimpleCurlyVar ) {
					if ( ! empty( $localMap[ $tokens[ $innerIdx ][1] ] ) ) {
						return 'yes';
					}
					$p = $closeIdx + 1;
					continue; // "{$var}" curly interpolation of an untainted variable — simple
				}
				// Not the bounded one-variable shape (property/array access,
				// a nested call inside the braces) — outside the vocabulary.
				$sawComplex = true;
				$p++;
				continue;
			}
			// any other token kind (T_STRING function name, T_ARRAY, T_OBJECT_OPERATOR,
			// T_DOUBLE_ARROW, etc.) is outside the bounded one-hop vocabulary.
			$sawComplex = true;
			$p++;
			continue;
		}
		if ( '.' === $t ) {
			$p++;
			continue; // string concatenation operator — simple
		}
		if ( '"' === $t ) {
			$p++;
			continue; // bare double-quote delimiter char — PHP splits an interpolated
			// double-quoted string into this + T_CURLY_OPEN/T_ENCAPSED_AND_WHITESPACE
			// segments; the delimiter itself carries no information — simple.
		}
		$sawComplex = true;
		$p++;
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
 * @param array<string,array> $emitters
 * @return array<int, array{function:string, line:int, name_idx:int, args: array<int, array{0:int,1:int}>}>
 */
function find_registered_calls( array $tokens, int $bodyStart, int $bodyEnd, array $emitters ): array {
	$calls = array();
	$i     = $bodyStart;
	while ( $i <= $bodyEnd ) {
		$t = $tokens[ $i ];
		if ( ! is_array( $t ) || T_STRING !== $t[0] || ! isset( $emitters[ $t[1] ] ) ) {
			$i++;
			continue;
		}

		$nameIdx = $i;

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
			// A string's `{$var}` complex interpolation opens with the ARRAY
			// token T_CURLY_OPEN (or T_DOLLAR_OPEN_CURLY_BRACES for the rarer
			// `${var}` form) but closes with a plain `}` CHAR token — an
			// asymmetric pair. Checking only the raw `'{' === $tk` char here
			// (found 2026-09-05) never matches the opening array token, so
			// depth never increments for it, while the closing `'}' === $tk`
			// DOES match and decrements — driving $argDepth permanently
			// negative for the rest of this call's argument list the moment
			// ANY argument contains this codebase's idiomatic
			// `"{$root_sel} .sgs-x__y"` selector shape. Once negative, the
			// real top-level comma after that argument is judged NOT at
			// depth 0 and is never split on, silently merging every
			// remaining argument into the interpolated one — see
			// scan_file()'s own body-end walk (`T_CURLY_OPEN === $t[0]`)
			// for the same recognition already used correctly there.
			if (
				'(' === $tk || '[' === $tk || '{' === $tk
				|| ( is_array( $tk ) && ( T_CURLY_OPEN === $tk[0] || T_DOLLAR_OPEN_CURLY_BRACES === $tk[0] ) )
			) {
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
			'name_idx' => $nameIdx,
			'args'     => $args,
		);

		$i = $close + 1;
	}
	return $calls;
}

/**
 * One-hop taint map, generalised: for every `$var = ...;` / `$var .= ...;`
 * statement inside [bodyStart, bodyEnd], record whether its right-hand-side
 * span contains a token that `$needleMatches` accepts, anywhere (including
 * inside a nested closure, since the closure body is lexically part of the
 * RHS span). A variable with NO local assignment found is simply absent
 * from the map — callers treat "absent" as a confident "not tainted at
 * this hop".
 *
 * @param array    $tokens
 * @param int      $bodyStart
 * @param int      $bodyEnd
 * @param callable $needleMatches function( array|string $token ): bool
 * @return array<string, bool>
 */
function build_local_taint_map( array $tokens, int $bodyStart, int $bodyEnd, callable $needleMatches ): array {
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

		$matched = false;
		for ( $p = $rhsStart; $p <= $rhsEnd; $p++ ) {
			if ( $needleMatches( $tokens[ $p ] ) ) {
				$matched = true;
				break;
			}
		}

		if ( $matched ) {
			$map[ $varName ] = true; // sticky — one matching assignment taints the variable for the rest of the function
		} elseif ( ! isset( $map[ $varName ] ) ) {
			$map[ $varName ] = false;
		}
	}
	return $map;
}

/**
 * One-hop classification for "does this argument span contain the layer-2
 * guard constant?" — same bounded shape as classify_arg_hover(): a direct
 * token match, or a bare `$variable` traced to a local assignment (via
 * $constMap) whose right-hand side contained the constant. No attempt to
 * resolve anything more complex.
 *
 * @param array $tokens
 * @param array{0:int,1:int} $span
 * @param array<string,bool> $constMap
 * @param string $constantName
 * @return bool
 */
function arg_carries_constant( array $tokens, array $span, array $constMap, string $constantName ): bool {
	if ( '' === $constantName || $span[1] < $span[0] ) {
		return false;
	}
	for ( $p = $span[0]; $p <= $span[1]; $p++ ) {
		$t = $tokens[ $p ];
		if ( is_array( $t ) && T_STRING === $t[0] && $constantName === $t[1] ) {
			return true;
		}
		if ( is_array( $t ) && T_VARIABLE === $t[0] && ! empty( $constMap[ $t[1] ] ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Find the name of the function whose argument list DIRECTLY contains
 * position `$beforeIdx` (i.e. the nearest enclosing call, scanning
 * backward through balanced brackets from just before some inner
 * expression). Returns null when the nearest enclosing bracket isn't a
 * function call (e.g. plain grouping parens, an `if (`/`foreach (`
 * control-structure paren — those tokenize as a keyword, not T_STRING, so
 * they're correctly excluded — or an array/block bracket), or when nothing
 * encloses the position within this function body.
 *
 * @param array $tokens
 * @param int   $beforeIdx Token index to start scanning backward from.
 * @param int   $bodyStart Lower bound — never scans outside the enclosing function body.
 * @return string|null
 */
function find_enclosing_call_name( array $tokens, int $beforeIdx, int $bodyStart ): ?string {
	$depth = 0;
	for ( $k = $beforeIdx; $k >= $bodyStart; $k-- ) {
		$tk = $tokens[ $k ];
		if ( ')' === $tk || ']' === $tk || '}' === $tk ) {
			$depth++;
			continue;
		}
		if ( '(' === $tk || '[' === $tk || '{' === $tk ) {
			if ( 0 !== $depth ) {
				$depth--;
				continue;
			}
			if ( '(' !== $tk ) {
				return null; // enclosed by [ or { — not a call's argument list
			}
			$m = $k - 1;
			while ( $m >= $bodyStart && is_array( $tokens[ $m ] ) && in_array( $tokens[ $m ][0], SKIPPABLE_TOKEN_TYPES, true ) ) {
				$m--;
			}
			if ( $m >= $bodyStart && is_array( $tokens[ $m ] ) && T_STRING === $tokens[ $m ][0] ) {
				return $tokens[ $m ][1];
			}
			return null; // '(' not preceded by a plain function name (grouping parens, a control keyword, etc.)
		}
	}
	return null;
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
 * Run JOB A (function-body co-occurrence) + JOB B (cross-file registry
 * resolution) over one token span — either a named function's body, or a
 * top-level "gap" span (code that lives outside every function body, the
 * common shape of an SGS `render.php` file, which never declares a named
 * function per this project's "no top-level function in per-render PHP"
 * rule — see this file's module docblock + `plugins/sgs-blocks/CLAUDE.md`).
 *
 * Pure extraction of the logic previously inlined in `scan_file()`'s main
 * loop — behaviour for the named-function case is unchanged. `$name` is
 * either the real function name, or a synthetic `<top-level>` /
 * `<top-level:LINE>` label supplied by the caller for a gap span.
 *
 * @param array                $tokens
 * @param int                  $spanStart
 * @param int                  $spanEnd
 * @param string               $name
 * @param int                  $line
 * @param string               $path
 * @param array{emitters: array<string,array>, guard_recognition: array{layer1_wrapper_functions: string[], layer2_selector_constant: string}}|null $registry
 * @return array{function_entry: array, failures: array, cross_file_calls: array, cross_file_flags: array, cross_file_unresolved: array}
 */
function analyze_span( array $tokens, int $spanStart, int $spanEnd, string $name, int $line, string $path, ?array $registry ): array {
	$failures            = array();
	$crossFileCalls      = array();
	$crossFileFlags      = array();
	$crossFileUnresolved = array();

	// ── JOB A: body co-occurrence ───────────────────────────────────────
	$hasHover   = false;
	$callsGuard = false;
	for ( $b = $spanStart; $b <= $spanEnd; $b++ ) {
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

	$functionEntry = array(
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

	// ── JOB B: cross-file registry resolution ───────────────────────────
	$emitters         = $registry['emitters'] ?? array();
	$guardRecognition = $registry['guard_recognition'] ?? array(
		'layer1_wrapper_functions' => array(),
		'layer2_selector_constant' => '',
	);
	if ( ! empty( $emitters ) ) {
		$calls = find_registered_calls( $tokens, $spanStart, $spanEnd, $emitters );
		if ( ! empty( $calls ) ) {
			$localMap = build_local_assignment_map( $tokens, $spanStart, $spanEnd );
			// Lazily built — only needed once a call's selector proves
			// hover-carrying, and only if guard_recognition names anything.
			$constMap = null;

			foreach ( $calls as $call ) {
				$entry           = $emitters[ $call['function'] ];
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

				// selectorVerdict === 'yes' — try external-guard recognition
				// FIRST (a positive proof, checked before the gate — see the
				// module docblock's "EXTERNAL-GUARD RECOGNITION" section).
				if ( '' !== $guardRecognition['layer2_selector_constant'] && ! empty( $guardRecognition['layer1_wrapper_functions'] ) ) {
					if ( null === $constMap ) {
						$constantName = $guardRecognition['layer2_selector_constant'];
						$constMap     = build_local_taint_map(
							$tokens,
							$spanStart,
							$spanEnd,
							static function ( $token ) use ( $constantName ) {
								return is_array( $token ) && T_STRING === $token[0] && $constantName === $token[1];
							}
						);
					}
					$hasLayer2 = arg_carries_constant( $tokens, $selectorSpan, $constMap, $guardRecognition['layer2_selector_constant'] );
					$enclosingFn = find_enclosing_call_name( $tokens, $call['name_idx'] - 1, $spanStart );
					$hasLayer1   = null !== $enclosingFn && in_array( $enclosingFn, $guardRecognition['layer1_wrapper_functions'], true );

					if ( $hasLayer1 && $hasLayer2 ) {
						$record['resolution'] = 'clean-externally-guarded';
						$crossFileCalls[]      = $record;
						continue;
					}
				}

				// Not externally guarded (or guard_recognition names nothing)
				// — fall through to the callee's own gate argument, exactly
				// as before this update.
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

	return array(
		'function_entry'        => $functionEntry,
		'failures'              => $failures,
		'cross_file_calls'      => $crossFileCalls,
		'cross_file_flags'      => $crossFileFlags,
		'cross_file_unresolved' => $crossFileUnresolved,
	);
}

/**
 * Compute the complement of a set of consumed [start,end] token-index ranges
 * over [0, $count-1] — the "gap segments" a function-body walk never visits.
 * `$consumedRanges` is assumed sorted ascending by start and non-overlapping
 * (true by construction: `scan_file()`'s main loop only ever advances
 * forward past a body it just consumed).
 *
 * @param int                        $count
 * @param array<int, array{0:int,1:int}> $consumedRanges
 * @return array<int, array{0:int,1:int}>
 */
function compute_gap_segments( int $count, array $consumedRanges ): array {
	$segments = array();
	$cursor   = 0;
	foreach ( $consumedRanges as $range ) {
		list( $rs, $re ) = $range;
		if ( $rs > $cursor ) {
			$segments[] = array( $cursor, $rs - 1 );
		}
		$cursor = max( $cursor, $re + 1 );
	}
	if ( $cursor <= $count - 1 ) {
		$segments[] = array( $cursor, $count - 1 );
	}
	return $segments;
}

/**
 * Line number of the first token carrying one, within a span — used to name
 * a synthetic `<top-level:LINE>` gap segment.
 *
 * @param array $tokens
 * @param int   $start
 * @param int   $end
 * @return int 0 if no token in the span carries a line number (shouldn't
 *             happen for a non-empty meaningful span, but never guessed at).
 */
function first_line_in_span( array $tokens, int $start, int $end ): int {
	for ( $p = $start; $p <= $end; $p++ ) {
		$t = $tokens[ $p ];
		if ( is_array( $t ) ) {
			return $t[2];
		}
	}
	return 0;
}

/**
 * @param string $path
 * @param array{emitters: array<string,array>, guard_recognition: array{layer1_wrapper_functions: string[], layer2_selector_constant: string}}|null $registry
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
	$consumedRanges       = array();
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

			$result = analyze_span( $tokens, $bodyStart, $bodyEnd, $name, $line, $path, $registry );

			$functions[]         = $result['function_entry'];
			$failures             = array_merge( $failures, $result['failures'] );
			$crossFileCalls       = array_merge( $crossFileCalls, $result['cross_file_calls'] );
			$crossFileFlags       = array_merge( $crossFileFlags, $result['cross_file_flags'] );
			$crossFileUnresolved  = array_merge( $crossFileUnresolved, $result['cross_file_unresolved'] );

			// Consumed range starts at the ORIGINAL `function` keyword token
			// ($i, untouched since loop entry), not $bodyStart — the
			// declaration head (name + parameter list, e.g.
			// `function sgs_border_gradient_css( string $selector, ... )`)
			// sits BEFORE the opening `{` and was previously left in the
			// "gap" segment scanned below. `find_registered_calls()` matches
			// any `T_STRING === registered-name` token followed by `(`,
			// with no way to tell a declaration head from a real call — so
			// every registered emitter's OWN signature was misdetected as a
			// self-call, and its typed parameter list (`string $selector`)
			// made classify_arg_hover() report the "call" unresolved. Fixed
			// 2026-09-05 by excluding the whole declaration from every gap.
			$consumedRanges[] = array( $i, $bodyEnd );

			$i = $bodyEnd + 1;
			continue;
		}

		$i++;
	}

	// ── Top-level ("gap") code — everything NOT inside a named function
	// body. This is the primary case for a scanned SGS `render.php` file,
	// which never declares a named top-level function (a hard project rule
	// — see this file's module docblock). Without this pass `scan_file()`
	// structurally cannot see a hover rule built in plain top-to-bottom
	// script code.
	$gapSegments = array();
	foreach ( compute_gap_segments( $count, $consumedRanges ) as $seg ) {
		if ( ! empty( meaningful_tokens( $tokens, $seg[0], $seg[1] ) ) ) {
			$gapSegments[] = $seg;
		}
	}

	$multipleGaps = count( $gapSegments ) > 1;
	foreach ( $gapSegments as $seg ) {
		$gapLine = first_line_in_span( $tokens, $seg[0], $seg[1] );
		$gapName = $multipleGaps ? "<top-level:{$gapLine}>" : '<top-level>';

		$result = analyze_span( $tokens, $seg[0], $seg[1], $gapName, $gapLine, $path, $registry );

		$functions[]         = $result['function_entry'];
		$failures             = array_merge( $failures, $result['failures'] );
		$crossFileCalls       = array_merge( $crossFileCalls, $result['cross_file_calls'] );
		$crossFileFlags       = array_merge( $crossFileFlags, $result['cross_file_flags'] );
		$crossFileUnresolved  = array_merge( $crossFileUnresolved, $result['cross_file_unresolved'] );
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

/**
 * Self-test for the top-level ("gap segment") scan added 2026-09-03 — proves
 * `scan_file()` can now see a hover rule built OUTSIDE any named function,
 * the shape every SGS `render.php` file actually has (top-level script code,
 * no function wrapper — a top-level function in per-render PHP fatals
 * WordPress on the block's second use, so no real render.php can ever
 * exercise the OLD, function-body-only code path).
 *
 * Two minimal synthetic fixtures, written to real temp files (the tokenizer
 * needs real PHP source, not a string held in memory):
 *   1. BROKEN  — top-level code builds `{$sel}:hover{...}` and calls no
 *      guard function anywhere. Must be reported as a failure.
 *   2. CLEAN   — the identical shape, but also calls
 *      `sgs_hover_state_rules()` in the same top-level span. Must be clean.
 *
 * This is a FAIL-then-PASS pair, not just a PASS check — a scanner that
 * always reports "no findings" (the exact pre-fix bug: 0 PHP findings
 * across every render.php, regardless of content) would pass a PASS-only
 * fixture. Asserting the BROKEN fixture fails is what proves the gap-segment
 * pass is actually running, not silently skipped.
 *
 * @return int 0 on all assertions passing, 1 otherwise.
 */
function run_self_test(): int {
	$emptyRegistry = array(
		'emitters'          => array(),
		'guard_recognition' => array(
			'layer1_wrapper_functions' => array(),
			'layer2_selector_constant' => '',
		),
	);

	$failCount = 0;
	$assert    = static function ( bool $condition, string $label ) use ( &$failCount ) {
		if ( $condition ) {
			fwrite( STDOUT, "  PASS: {$label}\n" );
		} else {
			fwrite( STDOUT, "  FAIL: {$label}\n" );
			$failCount++;
		}
	};

	// ── Fixture 1: BROKEN — top-level, unguarded ────────────────────────
	$brokenSource = <<<'PHP'
<?php
$sel = '.sgs-x__y';
$hover_selector = "{$sel}:hover{color:red;}";
echo $hover_selector;
PHP;

	$brokenPath = tempnam( sys_get_temp_dir(), 'sgs-hover-selftest-broken-' ) . '.php';
	file_put_contents( $brokenPath, $brokenSource );

	$brokenResult = scan_file( $brokenPath, $emptyRegistry );
	@unlink( $brokenPath );

	$assert( null === $brokenResult['error'], 'broken fixture: scan completes without error' );
	$assert( 1 === count( $brokenResult['failures'] ), 'broken fixture: exactly one failure reported' );
	if ( 1 === count( $brokenResult['failures'] ) ) {
		$assert( '<top-level>' === $brokenResult['failures'][0]['name'], 'broken fixture: failure is attributed to a synthetic <top-level> span, not silently dropped' );
	}
	$assert( 1 === count( $brokenResult['functions'] ), 'broken fixture: one function-shaped entry emitted for the gap segment' );
	if ( 1 === count( $brokenResult['functions'] ) ) {
		$assert( true === $brokenResult['functions'][0]['has_hover_literal'], 'broken fixture: has_hover_literal correctly true' );
		$assert( false === $brokenResult['functions'][0]['calls_guard'], 'broken fixture: calls_guard correctly false' );
	}

	// ── Fixture 2: CLEAN — identical shape, calls the guard ─────────────
	$cleanSource = <<<'PHP'
<?php
$sel = '.sgs-x__y';
$hover_rule = "{$sel}:hover{color:red;}";
$css = sgs_hover_state_rules( $sel, 'color:red;' );
echo $hover_rule . $css;
PHP;

	$cleanPath = tempnam( sys_get_temp_dir(), 'sgs-hover-selftest-clean-' ) . '.php';
	file_put_contents( $cleanPath, $cleanSource );

	$cleanResult = scan_file( $cleanPath, $emptyRegistry );
	@unlink( $cleanPath );

	$assert( null === $cleanResult['error'], 'clean fixture: scan completes without error' );
	$assert( 0 === count( $cleanResult['failures'] ), 'clean fixture: zero failures reported' );
	$assert( 1 === count( $cleanResult['functions'] ), 'clean fixture: one function-shaped entry emitted for the gap segment' );
	if ( 1 === count( $cleanResult['functions'] ) ) {
		$assert( true === $cleanResult['functions'][0]['has_hover_literal'], 'clean fixture: has_hover_literal correctly true' );
		$assert( true === $cleanResult['functions'][0]['calls_guard'], 'clean fixture: calls_guard correctly true' );
	}

	// ── Negative control: a file with a NAMED function still works ──────
	// (proves the refactor didn't regress the pre-existing JOB A path).
	$namedFnSource = <<<'PHP'
<?php
function sgs_test_render_thing() {
	$sel = '.sgs-x__y';
	$hover_selector = "{$sel}:hover{color:red;}";
	echo $hover_selector;
}
PHP;

	$namedFnPath = tempnam( sys_get_temp_dir(), 'sgs-hover-selftest-namedfn-' ) . '.php';
	file_put_contents( $namedFnPath, $namedFnSource );

	$namedFnResult = scan_file( $namedFnPath, $emptyRegistry );
	@unlink( $namedFnPath );

	$assert( null === $namedFnResult['error'], 'named-function fixture: scan completes without error' );
	$assert( 1 === count( $namedFnResult['failures'] ), 'named-function fixture: exactly one failure reported' );
	if ( 1 === count( $namedFnResult['failures'] ) ) {
		$assert( 'sgs_test_render_thing' === $namedFnResult['failures'][0]['name'], 'named-function fixture: failure attributed to the real function name, not a synthetic gap label' );
	}
	// A `<?php` open tag is itself a meaningful token (not whitespace/
	// comment), so the gap BEFORE the function keyword still produces one
	// synthetic `<top-level>` functions[] entry — it correctly carries no
	// hover literal and is not a failure. Two functions[] entries total:
	// the harmless top-level gap + the one real named-function failure.
	$assert( 2 === count( $namedFnResult['functions'] ), 'named-function fixture: exactly one real function entry + one harmless top-level gap entry for the opening tag' );
	foreach ( $namedFnResult['functions'] as $fnEntry ) {
		if ( '<top-level>' === $fnEntry['name'] ) {
			$assert( false === $fnEntry['has_hover_literal'], 'named-function fixture: the top-level gap entry (just the open tag) carries no hover literal' );
		}
	}

	// ── Fixture 4: cross-file, curly-interpolated selector, SAFE ────────
	// Regression coverage for the 2026-09-05 fix (three compounding bugs,
	// all in JOB B's cross-file machinery, none in JOB A above):
	//   (1) find_registered_calls()'s argument-splitter tracked bracket
	//       depth using a raw `'{' === $tk` char check, which never matches
	//       the interpolation-open ARRAY token T_CURLY_OPEN — but its
	//       matching close IS a raw `}` char and DID match, driving depth
	//       negative and silently merging every argument after a
	//       `"{$var} literal"` selector into one span.
	//   (2) classify_arg_hover() had no vocabulary for T_CURLY_OPEN or the
	//       bare `"` string-delimiter chars at all, so even a correctly
	//       split argument fell to `unresolved`.
	//   (3) scan_file()'s consumed-range bookkeeping recorded only
	//       [bodyStart, bodyEnd] (the `{…}` body), leaving a registered
	//       emitter's OWN declaration head (`function sgs_x( string $selector,
	//       ... )`) sitting in a "gap" segment, where find_registered_calls()
	//       matched the declaration's own name+paren as a fake self-call.
	// This fixture reproduces the exact real-world shape (curly-interpolated
	// selector, THEN two more arguments, one of them null) that was
	// reported UNRESOLVED for all 9 render.php call sites before the fix —
	// it must now resolve CLEAN, not unresolved, not flagged.
	$testRegistry = array(
		'emitters'          => array(
			'sgs_test_emitter_css' => array(
				'selector_param_index'   => 0,
				'guard_gate_param_index' => 2,
				'guard_skip_literals'    => array( 'null' ),
			),
		),
		'guard_recognition' => array(
			'layer1_wrapper_functions' => array(),
			'layer2_selector_constant' => '',
		),
	);

	$curlySafeSource = <<<'PHP'
<?php
$root_sel = '.uid';
$paint = 'red';
$scoped_css[] = sgs_test_emitter_css(
	"{$root_sel} .sgs-x__y",
	$paint,
	null,
	'2px'
);
PHP;

	$curlySafePath = tempnam( sys_get_temp_dir(), 'sgs-hover-selftest-curlysafe-' ) . '.php';
	file_put_contents( $curlySafePath, $curlySafeSource );

	$curlySafeResult = scan_file( $curlySafePath, $testRegistry );
	@unlink( $curlySafePath );

	$assert( null === $curlySafeResult['error'], 'curly-safe fixture: scan completes without error' );
	$assert( 0 === count( $curlySafeResult['cross_file_flags'] ), 'curly-safe fixture: not flagged unguarded' );
	$assert( 0 === count( $curlySafeResult['cross_file_unresolved'] ), 'curly-safe fixture: not unresolved — this is the exact shape that regressed to UNRESOLVED for 9 real render.php call sites pre-fix' );
	$assert( 1 === count( $curlySafeResult['cross_file_calls'] ), 'curly-safe fixture: exactly one cross-file call recorded (proves the argument splitter did not merge/drop it)' );
	if ( 1 === count( $curlySafeResult['cross_file_calls'] ) ) {
		$assert( 'clean-no-hover' === $curlySafeResult['cross_file_calls'][0]['resolution'], 'curly-safe fixture: resolved clean-no-hover, not unresolved-selector' );
	}

	// ── Fixture 5: cross-file, curly-interpolated selector, GENUINELY
	// UNGUARDED — mandatory NEGATIVE CONTROL. Proves the fix did not turn
	// into a blanket exemption: a selector that IS hover-tainted (built via
	// the SAME curly-interpolation shape, from a local variable carrying a
	// literal `:hover`) passed into a registered emitter with its
	// registry-declared skip literal at the gate position MUST still be
	// flagged. A checker that always resolves `"{$var} …"` selectors clean
	// would pass this fixture — it must not.
	$curlyUnguardedSource = <<<'PHP'
<?php
$base = '.uid';
$tainted_sel = "{$base}:hover";
$paint = 'red';
$scoped_css[] = sgs_test_emitter_css(
	"{$tainted_sel} .sgs-x__y",
	$paint,
	null,
	'2px'
);
PHP;

	$curlyUnguardedPath = tempnam( sys_get_temp_dir(), 'sgs-hover-selftest-curlyunguarded-' ) . '.php';
	file_put_contents( $curlyUnguardedPath, $curlyUnguardedSource );

	$curlyUnguardedResult = scan_file( $curlyUnguardedPath, $testRegistry );
	@unlink( $curlyUnguardedPath );

	$assert( null === $curlyUnguardedResult['error'], 'curly-unguarded NEGATIVE CONTROL: scan completes without error' );
	$assert( 1 === count( $curlyUnguardedResult['cross_file_flags'] ), 'curly-unguarded NEGATIVE CONTROL: genuinely unguarded call IS flagged — proves the curly-brace fix is not a blanket exemption' );
	if ( 1 === count( $curlyUnguardedResult['cross_file_flags'] ) ) {
		$assert( 'flagged-unguarded' === $curlyUnguardedResult['cross_file_flags'][0]['resolution'], 'curly-unguarded NEGATIVE CONTROL: resolution is flagged-unguarded' );
	}

	// ── Fixture 6: a registered emitter's OWN declaration must never be
	// misdetected as a call to itself — NEGATIVE CONTROL for bug (3) above.
	// Before the consumed-range fix, `function sgs_test_emitter_css( string
	// $selector, string $paint, ?string $hover = null, string $width='2px')`
	// sat in a top-level "gap" segment (declarations are never inside their
	// own body), and find_registered_calls() matched the name+`(` exactly
	// like a real call, then reported it UNRESOLVED because a typed
	// parameter (`string $selector`) isn't a recognised simple shape —
	// which is precisely what happened for real at
	// includes/helpers-tokens.php:873 and :1293 (the two emitters'
	// definition lines). This fixture defines the SAME emitter name (so it
	// IS in the registry and would be matched if the bug were present) and
	// asserts zero cross-file calls are recorded anywhere in the file.
	$ownDeclSource = <<<'PHP'
<?php
function sgs_test_emitter_css( string $selector, string $paint, ?string $hover = null, string $width = '2px' ): string {
	return "{$selector}{border:{$width} solid {$paint};}";
}
PHP;

	$ownDeclPath = tempnam( sys_get_temp_dir(), 'sgs-hover-selftest-owndecl-' ) . '.php';
	file_put_contents( $ownDeclPath, $ownDeclSource );

	$ownDeclResult = scan_file( $ownDeclPath, $testRegistry );
	@unlink( $ownDeclPath );

	$assert( null === $ownDeclResult['error'], 'own-declaration NEGATIVE CONTROL: scan completes without error' );
	$assert( 0 === count( $ownDeclResult['cross_file_calls'] ), 'own-declaration NEGATIVE CONTROL: the function\'s own declaration head is never recorded as a call to itself' );
	$assert( 0 === count( $ownDeclResult['cross_file_unresolved'] ), 'own-declaration NEGATIVE CONTROL: no phantom unresolved cross-file case from the declaration head' );

	if ( 0 === $failCount ) {
		fwrite( STDOUT, "\nSELF-TEST: PASS (all assertions green)\n" );
	} else {
		fwrite( STDOUT, "\nSELF-TEST: FAIL ({$failCount} assertion(s) failed)\n" );
	}

	return 0 === $failCount ? 0 : 1;
}

$args = array_slice( $argv, 1 );

if ( in_array( '--self-test', $args, true ) ) {
	exit( run_self_test() );
}

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
	$registry = array(
		'emitters'          => array(),
		'guard_recognition' => array(
			'layer1_wrapper_functions' => array(),
			'layer2_selector_constant' => '',
		),
	);
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
