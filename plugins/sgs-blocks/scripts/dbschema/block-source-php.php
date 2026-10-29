<?php
/**
 * What a block's own PHP states about its settings, read with PHP's tokenizer.
 *
 *   php block-source-php.php <plugin dir>
 *
 * Prints one JSON object on stdout:
 *   { "<block folder>": {
 *       "choices": { "<attribute>": { "values": [ ... ], "files": [ ... ] } },
 *       "items":   { "<array attribute>": { "fields": [ ... ], "files": [ ... ] } } } }
 *
 * choices: the values of an allow-list. Only the allow-list shapes count, so a subset test never adds a value:
 *   $v = in_array( $x, LIST, true ) ? $x : $default;      if ( ! in_array( $x, LIST, true ) ) { ... }
 * where $x is the attribute (`$attributes['name']`) or a variable assigned from it, and LIST is an array literal, a variable
 * holding one, array_keys / array_merge of those, or a call to a function whose body returns one (sgs_list_marker_types()).
 * A helper that applies the allow-list to its own parameter gives the values to the attribute passed to it.
 *
 * items: the keys `$item['key']` that a `foreach ( $attributes['name'] as $item )` loop (or a variable assigned from the
 * attribute) reads from each item.
 */

if ( PHP_SAPI !== 'cli' || ! isset( $argv[1] ) || ! is_dir( $argv[1] ) ) {
	fwrite( STDERR, "usage: php block-source-php.php <plugin dir>\n" );
	exit( 2 );
}

$plugin = rtrim( str_replace( '\\', '/', realpath( $argv[1] ) ), '/' );

/**
 * The significant tokens of a file: [ id (int) or char, text, line ].
 */
function sgs_tokens( string $file ): array {
	$out = array();
	foreach ( token_get_all( (string) file_get_contents( $file ) ) as $t ) {
		if ( is_array( $t ) ) {
			if ( in_array( $t[0], array( T_WHITESPACE, T_COMMENT, T_DOC_COMMENT, T_INLINE_HTML, T_OPEN_TAG, T_CLOSE_TAG, T_OPEN_TAG_WITH_ECHO ), true ) ) {
				continue;
			}
			$out[] = array( $t[0], $t[1] );
		} else {
			$out[] = array( $t, $t );
		}
	}
	return $out;
}

function sgs_text( array $tokens ): string {
	return implode( '', array_column( $tokens, 1 ) );
}

function sgs_string_value( array $token ): ?string {
	if ( T_CONSTANT_ENCAPSED_STRING !== $token[0] ) {
		return null;
	}
	$body = substr( $token[1], 1, -1 );
	return "'" === $token[1][0] ? str_replace( array( "\\'", '\\\\' ), array( "'", '\\' ), $body ) : stripcslashes( $body );
}

/** Index of the token that closes the bracket opened at $i, or null. */
function sgs_close( array $t, int $i ): ?int {
	$open  = $t[ $i ][1];
	$close = array(
		'(' => ')',
		'[' => ']',
		'{' => '}',
	)[ $open ] ?? null;
	if ( null === $close ) {
		return null;
	}
	$depth = 0;
	for ( $n = count( $t ), $j = $i; $j < $n; $j++ ) {
		if ( $t[ $j ][1] === $open && ! is_int( $t[ $j ][0] ) ) {
			++$depth;
		} elseif ( $t[ $j ][1] === $close && ! is_int( $t[ $j ][0] ) && 0 === --$depth ) {
			return $j;
		}
	}
	return null;
}

/** Split tokens $a..$b (exclusive) at depth-0 commas. */
function sgs_args( array $t, int $a, int $b ): array {
	$args  = array();
	$cur   = array();
	$depth = 0;
	for ( $i = $a; $i < $b; $i++ ) {
		$ch = is_int( $t[ $i ][0] ) ? '' : $t[ $i ][1];
		if ( '(' === $ch || '[' === $ch || '{' === $ch ) {
			++$depth;
		} elseif ( ')' === $ch || ']' === $ch || '}' === $ch ) {
			--$depth;
		}
		if ( ',' === $ch && 0 === $depth ) {
			$args[] = $cur;
			$cur    = array();
		} else {
			$cur[] = $t[ $i ];
		}
	}
	$cur && ( $args[] = $cur );
	return $args;
}

/** The statements of a token list: [ [ tokens... ] ], split at ';' and at braces (depth in parentheses respected). */
function sgs_statements( array $t ): array {
	$out   = array();
	$cur   = array();
	$depth = 0;
	foreach ( $t as $tok ) {
		$ch = is_int( $tok[0] ) ? '' : $tok[1];
		if ( '(' === $ch || '[' === $ch ) {
			++$depth;
		} elseif ( ')' === $ch || ']' === $ch ) {
			--$depth;
		}
		if ( 0 === $depth && ( ';' === $ch || '{' === $ch || '}' === $ch ) ) {
			$cur && ( $out[] = $cur );
			$cur = array();
			continue;
		}
		$cur[] = $tok;
	}
	$cur && ( $out[] = $cur );
	return $out;
}

/** The attribute names `$attributes['name']` (not followed by another '[') read in the tokens. */
function sgs_attrs_read( array $t ): array {
	$names = array();
	for ( $i = 0, $n = count( $t ) - 3; $i < $n; $i++ ) {
		if ( T_VARIABLE === $t[ $i ][0] && '$attributes' === $t[ $i ][1] && '[' === $t[ $i + 1 ][1] && null !== sgs_string_value( $t[ $i + 2 ] ) && ']' === $t[ $i + 3 ][1] ) {
			if ( isset( $t[ $i + 4 ] ) && '[' === $t[ $i + 4 ][1] ) {
				$names[] = '[' . sgs_string_value( $t[ $i + 2 ] ); // read as a nested value: not the plain attribute
			} else {
				$names[] = sgs_string_value( $t[ $i + 2 ] );
			}
		}
	}
	return array_values( array_unique( $names ) );
}

/**
 * A scope's variable to attribute map: $v = <expression reading exactly one plain attribute and no other variable but ones
 * already mapped to it>.
 */
function sgs_var_attrs( array $statements, array $seed = array() ): array {
	$map = $seed;
	for ( $pass = 0; $pass < 3; $pass++ ) {
		foreach ( $statements as $s ) {
			if ( count( $s ) < 3 || T_VARIABLE !== $s[0][0] || '=' !== $s[1][1] ) {
				continue;
			}
			$rhs   = array_slice( $s, 2 );
			$attrs = sgs_attrs_read( $rhs );
			$vars  = array();
			foreach ( $rhs as $tok ) {
				if ( T_VARIABLE === $tok[0] && '$attributes' !== $tok[1] ) {
					$vars[] = $tok[1];
				}
			}
			$via = array();
			foreach ( $vars as $v ) {
				if ( isset( $map[ $v ] ) ) {
					$via[] = $map[ $v ];
				}
			}
			$all = array_values( array_unique( array_merge( $attrs, $via ) ) );
			if ( 1 === count( $all ) && '[' !== $all[0][0] && count( $vars ) === count( $via ) && ! preg_match( '/in_array|foreach/', sgs_text( $rhs ) ) ) {
				$map[ $s[0][1] ] = $all[0];
			} elseif ( 1 === count( $all ) && '[' !== $all[0][0] && count( $vars ) === count( $via ) ) {
				// $v = in_array( $x, LIST ) ? $x : default; still the same attribute.
				$map[ $s[0][1] ] = $all[0];
			}
		}
	}
	return $map;
}

/** A list literal's values (or keys with $keys) from tokens, or null when anything in it is not a plain scalar. */
function sgs_literal_list( array $t, bool $keys = false ): ?array {
	if ( ! $t ) {
		return null;
	}
	$first = $t[0];
	if ( T_ARRAY === $first[0] && isset( $t[1] ) && '(' === $t[1][1] ) {
		$open = 1;
	} elseif ( '[' === $first[1] && ! is_int( $first[0] ) ) {
		$open = 0;
	} else {
		return null;
	}
	$close = sgs_close( $t, $open );
	if ( null === $close || $close !== count( $t ) - 1 ) {
		return null;
	}
	$out = array();
	foreach ( sgs_args( $t, $open + 1, $close ) as $el ) {
		$arrow = null;
		foreach ( $el as $k => $tok ) {
			if ( T_DOUBLE_ARROW === $tok[0] ) {
				$arrow = $k;
				break;
			}
		}
		$side = null === $arrow ? $el : ( $keys ? array_slice( $el, 0, $arrow ) : array_slice( $el, $arrow + 1 ) );
		if ( $keys && null === $arrow ) {
			return null;
		}
		$v = sgs_scalar( $side );
		if ( ! $v[0] ) {
			return null;
		}
		$out[] = $v[1];
	}
	return $out;
}

/** [ ok, value ] for a scalar literal (string, number, true/false/null, a leading minus). */
function sgs_scalar( array $t ): array {
	if ( 1 === count( $t ) ) {
		$s = sgs_string_value( $t[0] );
		if ( null !== $s ) {
			return array( true, $s );
		}
		if ( T_LNUMBER === $t[0][0] ) {
			return array( true, (int) $t[0][1] );
		}
		if ( T_DNUMBER === $t[0][0] ) {
			return array( true, (float) $t[0][1] );
		}
	}
	if ( 2 === count( $t ) && '-' === $t[0][1] && T_LNUMBER === $t[1][0] ) {
		return array( true, -(int) $t[1][1] );
	}
	return array( false, null );
}

/** Index of PHP functions by name: [ name => [ 'params' => [ '$a', ... ], 'body' => tokens, 'file' => path ] ]. */
function sgs_function_index( array $files ): array {
	$index = array();
	foreach ( $files as $file ) {
		$t = sgs_tokens( $file );
		for ( $i = 0, $n = count( $t ); $i < $n - 3; $i++ ) {
			if ( T_FUNCTION === $t[ $i ][0] && T_STRING === $t[ $i + 1 ][0] && '(' === $t[ $i + 2 ][1] ) {
				$pc = sgs_close( $t, $i + 2 );
				$j  = $pc;
				while ( null !== $j && isset( $t[ $j ] ) && '{' !== $t[ $j ][1] ) {
					++$j;
				}
				$bc = null !== $j && isset( $t[ $j ] ) ? sgs_close( $t, $j ) : null;
				if ( null === $pc || null === $bc ) {
					continue;
				}
				$params = array();
				foreach ( sgs_args( $t, $i + 3, $pc ) as $p ) {
					foreach ( $p as $tok ) {
						if ( T_VARIABLE === $tok[0] ) {
							$params[] = $tok[1];
							break;
						}
					}
				}
				$index[ $t[ $i + 1 ][1] ] = array(
					'params' => $params,
					'body'   => array_slice( $t, $j + 1, $bc - $j - 1 ),
					'file'   => $file,
				);
			}
		}
	}
	return $index;
}

/** The values a list expression stands for, or null. */
function sgs_list_of( array $expr, array $vars, array $functions, int $depth = 0 ): ?array {
	if ( $depth > 6 || ! $expr ) {
		return null;
	}
	$lit = sgs_literal_list( $expr );
	if ( null !== $lit ) {
		return $lit;
	}
	if ( 1 === count( $expr ) && T_VARIABLE === $expr[0][0] && isset( $vars[ $expr[0][1] ] ) ) {
		return sgs_list_of( $vars[ $expr[0][1] ], $vars, $functions, $depth + 1 );
	}
	if ( count( $expr ) >= 3 && T_STRING === $expr[0][0] && '(' === $expr[1][1] && sgs_close( $expr, 1 ) === count( $expr ) - 1 ) {
		$name = $expr[0][1];
		$args = sgs_args( $expr, 2, count( $expr ) - 1 );
		if ( 'array_keys' === $name && 1 === count( $args ) ) {
			$arg = $args[0];
			if ( 1 === count( $arg ) && T_VARIABLE === $arg[0][0] && isset( $vars[ $arg[0][1] ] ) ) {
				$arg = $vars[ $arg[0][1] ];
			}
			return sgs_literal_list( $arg, true );
		}
		if ( in_array( $name, array( 'array_values', 'array_unique' ), true ) && $args ) {
			return sgs_list_of( $args[0], $vars, $functions, $depth + 1 );
		}
		if ( 'array_merge' === $name && $args ) {
			$out = array();
			foreach ( $args as $a ) {
				$part = sgs_list_of( $a, $vars, $functions, $depth + 1 );
				if ( null === $part ) {
					return null;
				}
				$out = array_merge( $out, $part );
			}
			return array_values( array_unique( $out, SORT_REGULAR ) );
		}
		if ( ! $args && isset( $functions[ $name ] ) && ! $functions[ $name ]['params'] ) {
			$body = $functions[ $name ]['body'];
			$ret  = array();
			foreach ( sgs_statements( $body ) as $s ) {
				if ( T_RETURN === $s[0][0] ) {
					$ret[] = array_slice( $s, 1 );
				}
			}
			return 1 === count( $ret ) ? sgs_list_of( $ret[0], array(), $functions, $depth + 1 ) : null;
		}
	}
	return null;
}

/** Variables assigned a list expression: [ '$name' => tokens ] (the last assignment wins). */
function sgs_list_vars( array $statements ): array {
	$vars = array();
	foreach ( $statements as $s ) {
		if ( count( $s ) >= 3 && T_VARIABLE === $s[0][0] && '=' === $s[1][1] ) {
			$vars[ $s[0][1] ] = array_slice( $s, 2 );
		}
	}
	return $vars;
}

/**
 * The allow-lists in a statement list: [ [ 'subject' => tokens, 'list' => tokens ] ].
 */
function sgs_allow_lists( array $statements ): array {
	$out = array();
	foreach ( $statements as $s ) {
		$ternary = false;
		$start   = 0;
		if ( T_IF === $s[0][0] && isset( $s[1] ) && '(' === $s[1][1] ) {
			$cond  = array_slice( $s, 2, sgs_close( $s, 1 ) - 2 );
			$start = 0;
			if ( $cond && '!' === $cond[0][1] && isset( $cond[1] ) && T_STRING === $cond[1][0] && 'in_array' === $cond[1][1] ) {
				$tokens = array_slice( $cond, 1 );
				$ternary = false;
			} else {
				continue;
			}
		} elseif ( count( $s ) >= 3 && T_VARIABLE === $s[0][0] && '=' === $s[1][1] ) {
			$tokens  = array_slice( $s, 2 );
			$ternary = true;
		} elseif ( count( $s ) >= 3 && T_RETURN === $s[0][0] ) {
			$tokens  = array_slice( $s, 1 );
			$ternary = true;
		} else {
			continue;
		}
		foreach ( $tokens as $i => $tok ) {
			if ( T_STRING !== $tok[0] || 'in_array' !== $tok[1] || ! isset( $tokens[ $i + 1 ] ) || '(' !== $tokens[ $i + 1 ][1] ) {
				continue;
			}
			$close = sgs_close( $tokens, $i + 1 );
			$args  = null === $close ? array() : sgs_args( $tokens, $i + 2, $close );
			if ( count( $args ) < 2 ) {
				continue;
			}
			if ( $ternary ) {
				// COND ? SUBJECT : default — the tested subject must be what the true branch returns.
				$depth = 0;
				$q     = null;
				for ( $k = $close + 1, $n = count( $tokens ); $k < $n; $k++ ) {
					$ch = is_int( $tokens[ $k ][0] ) ? '' : $tokens[ $k ][1];
					if ( '(' === $ch || '[' === $ch ) {
						++$depth;
					} elseif ( ')' === $ch || ']' === $ch ) {
						--$depth;
					} elseif ( '?' === $ch && 0 === $depth ) {
						$q = $k;
						break;
					}
				}
				if ( null === $q ) {
					continue;
				}
				$true = array();
				for ( $k = $q + 1, $n = count( $tokens ); $k < $n && ':' !== $tokens[ $k ][1]; $k++ ) {
					$true[] = $tokens[ $k ];
				}
				if ( sgs_text( sgs_norm_subject( $true ) ) !== sgs_text( sgs_norm_subject( $args[0] ) ) ) {
					continue;
				}
			}
			$out[] = array(
				'subject' => sgs_norm_subject( $args[0] ),
				'list'    => $args[1],
			);
		}
	}
	return $out;
}

/** A subject expression without its casts, outer parentheses and trailing `?? literal` default. */
function sgs_norm_subject( array $t ): array {
	while ( $t && ( in_array( $t[0][0], array( T_STRING_CAST, T_INT_CAST ), true ) ) ) {
		array_shift( $t );
	}
	while ( count( $t ) >= 2 && '(' === $t[0][1] && ! is_int( $t[0][0] ) && sgs_close( $t, 0 ) === count( $t ) - 1 ) {
		$t = array_slice( $t, 1, -1 );
	}
	foreach ( $t as $k => $tok ) {
		if ( T_COALESCE === $tok[0] && $k > 0 && sgs_scalar( array_slice( $t, $k + 1 ) )[0] ) {
			return array_slice( $t, 0, $k );
		}
	}
	return $t;
}

/** The attribute a subject expression stands for, or null. */
function sgs_subject_attr( array $subject, array $varmap ): ?string {
	$attrs = sgs_attrs_read( $subject );
	$vars  = array();
	foreach ( $subject as $tok ) {
		if ( T_VARIABLE === $tok[0] && '$attributes' !== $tok[1] ) {
			$vars[] = $tok[1];
		}
	}
	$names = $attrs;
	foreach ( $vars as $v ) {
		if ( ! isset( $varmap[ $v ] ) ) {
			return null;
		}
		$names[] = $varmap[ $v ];
	}
	$names = array_values( array_unique( $names ) );
	return 1 === count( $names ) && '[' !== $names[0][0] ? $names[0] : null;
}

// ---- main ------------------------------------------------------------------------------------------------------------

$rii   = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $plugin . '/src', FilesystemIterator::SKIP_DOTS ) );
$files = array();
foreach ( $rii as $f ) {
	if ( 'php' === $f->getExtension() ) {
		$files[] = str_replace( '\\', '/', $f->getPathname() );
	}
}
foreach ( glob( $plugin . '/includes/*.php' ) ?: array() as $f ) {
	$files[] = str_replace( '\\', '/', $f );
}
foreach ( glob( $plugin . '/includes/*/*.php' ) ?: array() as $f ) {
	$files[] = str_replace( '\\', '/', $f );
}
sort( $files );
$functions = sgs_function_index( $files );

// Helpers that apply an allow-list to one of their parameters: [ name => [ position => values ] ].
$helper_lists = array();
foreach ( $functions as $name => $fn ) {
	$statements = sgs_statements( $fn['body'] );
	$vars       = sgs_list_vars( $statements );
	foreach ( sgs_allow_lists( $statements ) as $al ) {
		$subject = $al['subject'];
		if ( 1 !== count( $subject ) || T_VARIABLE !== $subject[0][0] ) {
			continue;
		}
		$pos = array_search( $subject[0][1], $fn['params'], true );
		$vals = false === $pos ? null : sgs_list_of( $al['list'], $vars, $functions );
		if ( null !== $vals ) {
			$helper_lists[ $name ][ $pos ] = array_values( array_unique( array_merge( $helper_lists[ $name ][ $pos ] ?? array(), $vals ), SORT_REGULAR ) );
		}
	}
}

$result = array();
foreach ( glob( $plugin . '/src/blocks/*', GLOB_ONLYDIR ) as $dir ) {
	$block = basename( $dir );
	if ( ! is_file( $dir . '/block.json' ) ) {
		continue;
	}
	$choices = array();
	$items   = array();
	foreach ( $files as $file ) {
		if ( 0 !== strpos( $file, str_replace( '\\', '/', $dir ) . '/' ) ) {
			continue;
		}
		$t          = sgs_tokens( $file );
		$statements = sgs_statements( $t );
		$varmap     = sgs_var_attrs( $statements );
		$lvars      = sgs_list_vars( $statements );
		$base       = basename( $file );

		foreach ( sgs_allow_lists( $statements ) as $al ) {
			$attr = sgs_subject_attr( $al['subject'], $varmap );
			$vals = null === $attr ? null : sgs_list_of( $al['list'], $lvars, $functions );
			if ( null !== $vals ) {
				$choices[ $attr ]['lists'][] = $vals;
				$choices[ $attr ]['files'][ $base ] = true;
			}
		}

		// A helper called with the attribute applies its own allow-list to it.
		for ( $i = 0, $n = count( $t ) - 2; $i < $n; $i++ ) {
			if ( T_STRING === $t[ $i ][0] && '(' === $t[ $i + 1 ][1] && isset( $helper_lists[ $t[ $i ][1] ] ) && ( 0 === $i || T_FUNCTION !== $t[ $i - 1 ][0] ) ) {
				$close = sgs_close( $t, $i + 1 );
				foreach ( null === $close ? array() : sgs_args( $t, $i + 2, $close ) as $pos => $arg ) {
					$attr = isset( $helper_lists[ $t[ $i ][1] ][ $pos ] ) ? sgs_subject_attr( sgs_norm_subject( $arg ), $varmap ) : null;
					if ( null !== $attr ) {
						$choices[ $attr ]['lists'][] = $helper_lists[ $t[ $i ][1] ][ $pos ];
						$choices[ $attr ]['files'][ $base ] = true;
					}
				}
			}
		}

		// foreach ( $attributes['name'] as $item ) { $item['key'] ... }
		for ( $i = 0, $n = count( $t ); $i < $n - 4; $i++ ) {
			if ( T_FOREACH !== $t[ $i ][0] || '(' !== $t[ $i + 1 ][1] ) {
				continue;
			}
			$pc = sgs_close( $t, $i + 1 );
			if ( null === $pc ) {
				continue;
			}
			$head = array_slice( $t, $i + 2, $pc - $i - 2 );
			$as   = null;
			foreach ( $head as $k => $tok ) {
				if ( T_AS === $tok[0] ) {
					$as = $k;
					break;
				}
			}
			if ( null === $as ) {
				continue;
			}
			$source = array_slice( $head, 0, $as );
			$attr   = sgs_subject_attr( $source, $varmap );
			$bind   = array_slice( $head, $as + 1 );
			$item   = $bind ? end( $bind ) : null;
			if ( null === $attr || ! $item || T_VARIABLE !== $item[0] ) {
				continue;
			}
			// The loop body: braces, or the alternative syntax up to the matching endforeach.
			$bs = $pc + 1;
			if ( isset( $t[ $bs ] ) && '{' === $t[ $bs ][1] ) {
				$be   = sgs_close( $t, $bs );
				$body = null === $be ? array() : array_slice( $t, $bs + 1, $be - $bs - 1 );
			} else {
				$depth = 1;
				$be    = $bs;
				for ( $k = $bs + 1; $k < $n; $k++ ) {
					if ( T_FOREACH === $t[ $k ][0] ) {
						++$depth;
					} elseif ( T_ENDFOREACH === $t[ $k ][0] && 0 === --$depth ) {
						$be = $k;
						break;
					}
				}
				$body = array_slice( $t, $bs + 1, $be - $bs - 1 );
			}
			foreach ( $body as $k => $tok ) {
				if ( T_VARIABLE === $tok[0] && $tok[1] === $item[1] && isset( $body[ $k + 3 ] ) && '[' === $body[ $k + 1 ][1] && null !== sgs_string_value( $body[ $k + 2 ] ) && ']' === $body[ $k + 3 ][1] ) {
					$key = sgs_string_value( $body[ $k + 2 ] );
					if ( ! in_array( $key, $items[ $attr ]['fields'] ?? array(), true ) ) {
						$items[ $attr ]['fields'][] = $key;
					}
					$items[ $attr ]['files'][ $base ] = true;
				}
			}
		}
	}
	foreach ( $choices as $a => $c ) {
		$names = array_keys( $c['files'] );
		sort( $names );
		$first = $c['lists'][0];
		$same  = true;
		foreach ( $c['lists'] as $l ) {
			$same = $same && count( $l ) === count( $first ) && ! array_diff( array_map( 'strval', $l ), array_map( 'strval', $first ) );
		}
		// Several allow-lists for one setting that differ are not one list: report the disagreement, never pick one.
		$choices[ $a ] = $same
			? array(
				'values' => array_values( array_unique( $first, SORT_REGULAR ) ),
				'files'  => $names,
			)
			: array(
				'gap'   => 'the PHP allow-lists for this setting differ: ' . implode( ' | ', array_map( static fn( $l ) => implode( ',', $l ), $c['lists'] ) ),
				'files' => $names,
			);
	}
	foreach ( $items as $a => $c ) {
		$items[ $a ]['files'] = array_keys( $c['files'] );
		sort( $items[ $a ]['files'] );
	}
	if ( $choices || $items ) {
		ksort( $choices );
		ksort( $items );
		$result[ $block ] = array(
			'choices' => (object) $choices,
			'items'   => (object) $items,
		);
	}
}

echo json_encode( $result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ), "\n";
