<?php
/**
 * Tokenize-calls.php
 *
 * PHP-side helper for check-dead-api-calls.py. Uses PHP's own tokenizer
 * (token_get_all) rather than regex, so it does not false-positive on
 * function-shaped text sitting inside a comment, a string literal, or a
 * heredoc/nowdoc CSS block (all of which are single opaque tokens to the
 * tokenizer) and does not need a hand-maintained keyword-exclusion list for
 * `if(`, `array(`, `match(`, `isset(`, etc. — those are already dedicated
 * token types (T_IF, T_ARRAY, T_MATCH, T_ISSET...), never T_STRING, so a
 * "T_STRING immediately followed by '('" scan skips them automatically.
 *
 * Usage: php tokenize_calls.php <path-to-php-file>
 * Output (stdout): JSON { "calls": [...], "definitions": [...] }
 *
 *   calls[]       — { "name": "wc_get_price_html", "line": 42 }
 *                    Every bare/namespaced GLOBAL function call: a T_STRING
 *                    immediately followed by "(", that is NOT preceded (after
 *                    walking back over any T_NS_SEPARATOR namespace-path
 *                    segments) by "->", "?->", "::", or "new" — i.e. not a
 *                    method call, static call, or class instantiation. A
 *                    call immediately preceded by "function" is a
 *                    DECLARATION, not a call, and is excluded here (it is
 *                    reported under definitions[] instead).
 *
 *   definitions[] — { "name": "my_helper", "line": 10, "is_method": false }
 *                    Every `function name(` declaration. `is_method` is true
 *                    when the declaration sits inside a class/trait/interface
 *                    body (brace-depth tracked via T_CLASS/T_TRAIT/
 *                    T_INTERFACE/T_ENUM). Only is_method === false entries are
 *                    GLOBAL functions — the caller (check-dead-api-calls.py)
 *                    uses those to extend its allowlist; method names are
 *                    deliberately NOT added to the global allowlist (scope
 *                    decision — see the main script's header comment).
 *
 * UK English throughout (source comments only — PHP itself has no locale).
 *
 * @package SGS\Blocks\Scripts\DeadApiChecker
 */

// Not a WordPress runtime context (a bare CLI script invoked as a
// subprocess) — direct filesystem calls / json_encode() are correct here,
// not the WP_Filesystem / wp_json_encode() wrappers WPCS otherwise expects.
$target_path = $argv[1] ?? null;
if ( null === $target_path || ! is_readable( $target_path ) ) {
	fwrite( STDERR, 'tokenize-calls.php: cannot read file: ' . ( $target_path ?? '(none)' ) . "\n" );
	exit( 1 );
}

$src = file_get_contents( $target_path );
if ( false === $src ) {
	fwrite( STDERR, "tokenize-calls.php: failed to read file contents\n" );
	exit( 1 );
}

$raw = token_get_all( $src );

// -----------------------------------------------------------------------
// Flatten to a uniform token list WITH accurate line numbers, dropping
// whitespace/comments (irrelevant to call/definition detection, and their
// removal is what lets "immediately followed by (" work across formatting
// styles like `foo (` or `foo  (`).
// -----------------------------------------------------------------------
$line     = 1;
$filtered = array();
foreach ( $raw as $tok ) {
	if ( is_array( $tok ) ) {
		list( $token_type, $text, $tline ) = $tok;
		$line = $tline; // PHP gives an accurate starting line for array tokens.
		if ( T_WHITESPACE === $token_type || T_COMMENT === $token_type || T_DOC_COMMENT === $token_type ) {
			$line += substr_count( $text, "\n" );
			continue;
		}
		$filtered[] = array(
			'type' => $token_type,
			'text' => $text,
			'line' => $line,
		);
		$line += substr_count( $text, "\n" );
	} else {
		// Single-character token (operators, punctuation) — token_get_all
		// gives no line number for these, so we carry the running line
		// count forward from the last array token (accurate: the token
		// stream is contiguous over the whole source).
		$filtered[] = array(
			'type' => null,
			'text' => $tok,
			'line' => $line,
		);
		$line += substr_count( $tok, "\n" );
	}
}

$n = count( $filtered );

// -----------------------------------------------------------------------
// Track whether we are inside a class/trait/interface/enum BODY, so a
// `function name(` declared there is flagged is_method=true and excluded
// from the global-function allowlist by the caller.
// -----------------------------------------------------------------------
$class_like_keyword_types = array( T_CLASS, T_TRAIT, T_INTERFACE );
if ( defined( 'T_ENUM' ) ) {
	$class_like_keyword_types[] = T_ENUM;
}

$brace_kind_stack  = array(); // each entry: 'class' | 'other'.
$pending_class_like = false;

$calls       = array();
$definitions = array();

/**
 * A qualified-name (namespace-path) walk-back: given index $i pointing at
 * the LAST T_STRING segment of `Foo\Bar\baz`, returns the index of the
 * token immediately BEFORE the whole qualified chain (skipping alternating
 * T_NS_SEPARATOR / T_STRING segments), or -1 if none.
 *
 * @param array $filtered The flattened, comment/whitespace-stripped token list.
 * @param int   $i        Index of the final T_STRING segment of the qualified name.
 * @return int Index of the preceding token, or -1 if the chain starts at index 0.
 */
function sgs_walk_back_qualified_name( array $filtered, int $i ): int {
	$k = $i - 1;
	while ( $k >= 0 ) {
		$t = $filtered[ $k ]['type'];
		if ( T_NS_SEPARATOR === $t || T_STRING === $t ) {
			$k--;
			continue;
		}
		break;
	}
	return $k;
}

for ( $i = 0; $i < $n; $i++ ) {
	$tok = $filtered[ $i ];

	// --- brace-depth tracking for class-body detection ------------------
	if ( in_array( $tok['type'], $class_like_keyword_types, true ) ) {
		$pending_class_like = true;
	}
	if ( '{' === $tok['text'] ) {
		$brace_kind_stack[] = $pending_class_like ? 'class' : 'other';
		$pending_class_like = false;
	} elseif ( '}' === $tok['text'] ) {
		array_pop( $brace_kind_stack );
	}

	// --- function DECLARATIONS -------------------------------------------
	if ( T_FUNCTION === $tok['type'] ) {
		$j = $i + 1;
		if ( isset( $filtered[ $j ] ) && '&' === $filtered[ $j ]['text'] ) {
			$j++; // By-reference return: function &foo().
		}
		if ( isset( $filtered[ $j ] ) && T_STRING === $filtered[ $j ]['type'] ) {
			$is_method = in_array( 'class', $brace_kind_stack, true );
			$definitions[] = array(
				'name'      => $filtered[ $j ]['text'],
				'line'      => $filtered[ $j ]['line'],
				'is_method' => $is_method,
			);
			// Advance $i past the name token itself, so the next loop
			// iteration does NOT re-examine it as a "T_STRING immediately
			// followed by (" — without this, every named declaration
			// (`function foo(`) was ALSO double-counted as a call to
			// itself (caught by manual tokenizer verification before this
			// script's own --self-test existed to catch it structurally).
			$i = $j;
		}
		continue; // Never treat a declaration's name as a call.
	}

	// --- function / method / static / instantiation CALLS ---------------
	if ( T_STRING === $tok['type'] ) {
		$next = $filtered[ $i + 1 ] ?? null;
		if ( null === $next || '(' !== $next['text'] ) {
			continue; // not followed by "(" — not a call.
		}

		$before_chain_idx = sgs_walk_back_qualified_name( $filtered, $i );
		$before            = $before_chain_idx >= 0 ? $filtered[ $before_chain_idx ] : null;
		$before_type       = $before['type'] ?? null;

		$excluded_types = array( T_OBJECT_OPERATOR, T_DOUBLE_COLON, T_NEW );
		if ( defined( 'T_NULLSAFE_OBJECT_OPERATOR' ) ) {
			$excluded_types[] = T_NULLSAFE_OBJECT_OPERATOR;
		}

		if ( in_array( $before_type, $excluded_types, true ) ) {
			continue; // method call / static call / `new Foo(...)` — not a global function call.
		}

		$calls[] = array(
			'name' => $tok['text'],
			'line' => $tok['line'],
		);
	}
}

echo json_encode(
	array(
		'calls'       => $calls,
		'definitions' => $definitions,
	)
);
