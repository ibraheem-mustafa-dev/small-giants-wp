<?php
/**
 * Read CSS the way the browser's tokenizer does, for scoping an inlined SVG's <style> (helpers-svg-instance-scope.php):
 * comments outside strings removed, strings ended at their quote or an unescaped newline, backslash escapes skipped,
 * (), [] and {} nested, and the text split into its top-level blocks and statements.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_svg_scope_scan' ) ) {
	/**
	 * Walk comment-free CSS from `$i` the way the browser's tokenizer does and stop at a boundary. A string ends at its
	 * quote or an unescaped newline; a backslash escapes the next character (an escaped brace is never a brace); (),
	 * [] and {} nest, and a closer that does not match the innermost opener (which the browser ignores) marks the
	 * text unclean. Prelude mode stops at a top-level `{` or `;`; body mode starts inside a `{` and stops at its match.
	 *
	 * @param string $css  CSS text.
	 * @param int    $i    Start offset.
	 * @param bool   $body Body mode.
	 * @return array{0:int,1:string,2:bool} Stop offset, the character stopped at ('' at the end) and cleanliness.
	 */
	function sgs_svg_scope_scan( string $css, int $i, bool $body ): array {
		$len   = strlen( $css );
		$stack = $body ? array( '}' ) : array();
		$quote = '';
		$clean = true;
		for ( ; $i < $len; $i++ ) {
			$c = $css[ $i ];
			if ( '' !== $quote ) {
				if ( '\\' === $c ) {
					++$i;
				} elseif ( $c === $quote || "\n" === $c ) {
					$quote = '';
				}
				continue;
			}
			if ( '\\' === $c ) {
				if ( $i + 1 < $len && "\n" !== $css[ $i + 1 ] ) {
					++$i;
				}
			} elseif ( '"' === $c || "'" === $c ) {
				$quote = $c;
			} elseif ( '(' === $c ) {
				$stack[] = ')';
			} elseif ( '[' === $c ) {
				$stack[] = ']';
			} elseif ( '{' === $c ) {
				if ( ! $body && ! $stack ) {
					return array( $i, '{', $clean );
				}
				$stack[] = '}';
			} elseif ( ')' === $c || ']' === $c || '}' === $c ) {
				if ( $stack && end( $stack ) === $c ) {
					array_pop( $stack );
					if ( $body && ! $stack ) {
						return array( $i, '}', $clean );
					}
				} else {
					$clean = false;
				}
			} elseif ( ';' === $c && ! $body && ! $stack ) {
				return array( $i, ';', $clean );
			}
		}
		return array( $len, '', false );
	}
}

if ( ! function_exists( 'sgs_svg_scope_strip_comments' ) ) {
	/**
	 * Normalise newlines and replace every comment outside a string with a space (an unclosed one runs to the end).
	 *
	 * @param string $css CSS text.
	 * @return string
	 */
	function sgs_svg_scope_strip_comments( string $css ): string {
		$css   = str_replace( array( "\r\n", "\r", "\f" ), "\n", $css );
		$out   = '';
		$quote = '';
		$len   = strlen( $css );
		for ( $i = 0; $i < $len; $i++ ) {
			$c = $css[ $i ];
			if ( '' === $quote && '/' === $c && $i + 1 < $len && '*' === $css[ $i + 1 ] ) {
				$end  = strpos( $css, '*/', $i + 2 );
				$i    = false === $end ? $len : $end + 1;
				$out .= ' ';
				continue;
			}
			$out .= $c;
			if ( '\\' === $c && $i + 1 < $len ) {
				$out .= $css[ ++$i ];
			} elseif ( '' !== $quote && ( $c === $quote || "\n" === $c ) ) {
				$quote = '';
			} elseif ( '' === $quote && ( '"' === $c || "'" === $c ) ) {
				$quote = $c;
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_svg_scope_items' ) ) {
	/**
	 * Split comment-free CSS into its top-level items: a block (prelude and body) or a `;` statement (body null).
	 *
	 * @param string $css CSS text.
	 * @return array<int, array{prelude:string, body:?string, clean:bool}>
	 */
	function sgs_svg_scope_items( string $css ): array {
		$items = array();
		$len   = strlen( $css );
		$i     = 0;
		while ( $i < $len ) {
			list( $end, $stop, $clean ) = sgs_svg_scope_scan( $css, $i, false );
			$prelude                    = trim( substr( $css, $i, $end - $i ) );
			if ( '{' === $stop ) {
				list( $close, , $body_clean ) = sgs_svg_scope_scan( $css, $end + 1, true );
				$items[]                      = array(
					'prelude' => $prelude,
					'body'    => substr( $css, $end + 1, max( 0, $close - $end - 1 ) ),
					'clean'   => $clean && $body_clean && '' !== $prelude,
				);
				$i                            = $close + 1;
				continue;
			}
			if ( '' !== $prelude ) {
				$items[] = array(
					'prelude' => $prelude,
					'body'    => null,
					'clean'   => false,
				);
			}
			$i = $end + 1;
		}
		return $items;
	}
}

if ( ! function_exists( 'sgs_svg_scope_find_top_level' ) ) {
	/**
	 * Offset of the first of `$chars` outside strings, escapes, parentheses and brackets, from `$i`, or null.
	 *
	 * @param string $text  Text.
	 * @param int    $i     Start offset.
	 * @param string $chars Characters to find.
	 * @return int|null
	 */
	function sgs_svg_scope_find_top_level( string $text, int $i, string $chars ): ?int {
		$depth = 0;
		$quote = '';
		$len   = strlen( $text );
		for ( ; $i < $len; $i++ ) {
			$c = $text[ $i ];
			if ( '' !== $quote ) {
				if ( '\\' === $c ) {
					++$i;
				} elseif ( $c === $quote || "\n" === $c ) {
					$quote = '';
				}
				continue;
			}
			if ( '\\' === $c ) {
				++$i;
			} elseif ( '"' === $c || "'" === $c ) {
				$quote = $c;
			} elseif ( '(' === $c || '[' === $c ) {
				++$depth;
			} elseif ( ')' === $c || ']' === $c ) {
				$depth = max( 0, $depth - 1 );
			} elseif ( 0 === $depth && false !== strpos( $chars, $c ) ) {
				return $i;
			}
		}
		return null;
	}
}

if ( ! function_exists( 'sgs_svg_scope_split' ) ) {
	/**
	 * Split a selector list on its top-level commas.
	 *
	 * @param string $text Selector list.
	 * @return string[]
	 */
	function sgs_svg_scope_split( string $text ): array {
		$parts = array();
		$start = 0;
		$comma = sgs_svg_scope_find_top_level( $text, 0, ',' );
		while ( null !== $comma ) {
			$parts[] = substr( $text, $start, $comma - $start );
			$start   = $comma + 1;
			$comma   = sgs_svg_scope_find_top_level( $text, $start, ',' );
		}
		$parts[] = substr( $text, $start );
		return $parts;
	}
}
