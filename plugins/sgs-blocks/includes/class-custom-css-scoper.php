<?php
/**
 * Custom_Css_Scoper — parses a block's `sgsCustomCss` and scopes every rule to the block instance.
 *
 * Spec 32 FR-32-20. The Additional-CSS field is the one sanctioned raw-CSS channel (FR-32-13), and the
 * cloning route writes breakpoint residuals into it, so nothing written there may reach the rest of the
 * page. The CSS is parsed, never string-replaced:
 *
 *  - `&selector` (or the CSS-nesting `&`) becomes the doubled scope class `.uid.uid` (0,2,0, FR-32-13 rule 3).
 *  - A selector that does not name the block is made a descendant of it (`.uid.uid h2`).
 *  - A declaration outside any rule applies to the block itself.
 *  - `@media`, `@supports`, `@container` and `@layer` blocks are walked and their rules scoped the same way.
 *  - `@keyframes <name>` is kept, at the top level or inside a walked block, renamed `<name>-<token>` where the
 *    token is the scope's first class (`.sgs-c-1a2b.sgs-c-1a2b` gives `sparkle-sgs-c-1a2b`), so two blocks'
 *    animations never collide. Every `animation` / `animation-name` in the same input that names a kept
 *    keyframes (a whole token, in any comma-separated item) is rewritten to the renamed one; a name the input
 *    does not define is left as written (a theme or global animation). Keyframe selectors may only be
 *    percentages, `from` or `to`; a quoted or reserved name, any other keyframe selector, a declaration outside
 *    a keyframe, a nested rule or a script-capable value refuses the whole `@keyframes` block.
 *  - Every other at-rule (`@import`, `@font-face`, `@-webkit-keyframes`, `@charset`, `@namespace`, `@page`, …) is refused,
 *    as is a rule nested inside a rule body, a rule whose body could run script (`expression(`, `javascript:`,
 *    `behavior:`, `-moz-binding`), and any input containing markup (`<`), which closes the `</style>` breakout.
 *  - Unbalanced braces, an unterminated string or an unterminated comment refuse the whole input.
 *
 * `src/utils/custom-css-scope.js` is the editor's copy of this algorithm. Both are run against
 * `tests/shared/custom-css-scope-cases.json`, so the canvas and the page scope a rule identically.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( __NAMESPACE__ . '\\Custom_Css_Scoper' ) ) {

	/**
	 * Parser and scoper for per-instance custom CSS.
	 */
	final class Custom_Css_Scoper {

		/** At-rules whose block holds rules that are scoped recursively. */
		const NESTING_AT_RULES = array( 'media', 'supports', 'container', 'layer' );

		/** A declaration body matching this could run script in some engine; the rule is refused. */
		const UNSAFE_BODY = '/expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding/i';

		/** Names a `@keyframes` may not take (CSS-wide keywords and `none`), compared lower-cased. */
		const RESERVED_KEYFRAMES_NAMES = array( 'none', 'initial', 'inherit', 'unset', 'revert', 'revert-layer', 'default' );

		/** A keyframes name: an unquoted CSS identifier. */
		const KEYFRAMES_NAME = '/^(?:--|-?[A-Za-z_])[A-Za-z0-9_-]*$/';

		/** One keyframe selector: a percentage, `from` or `to`. */
		const KEYFRAME_SELECTOR = '/^(?:from|to|(?:\d+(?:\.\d+)?|\.\d+)%)$/i';

		/** Whitespace as CSS defines it; the JS copy uses the same class so both trim identically. */
		const WS = " \t\n\r\f";

		/**
		 * Scope `$css` to `$scope` (a complete selector such as `.sgs-c-1a2b.sgs-c-1a2b`).
		 *
		 * @param string $css   Raw CSS from the block attribute.
		 * @param string $scope Selector every emitted rule is confined to.
		 * @return array{css: string, refused: string[]} The scoped CSS and a reason per refused part.
		 */
		public static function scope( string $css, string $scope ): array {
			if ( '' === trim( $css, self::WS ) ) {
				return array(
					'css'     => '',
					'refused' => array(),
				);
			}
			if ( false !== strpos( $css, '<' ) ) {
				return array(
					'css'     => '',
					'refused' => array( 'markup: the CSS contains "<"' ),
				);
			}

			$clean = self::strip_comments( $css );
			if ( null === $clean ) {
				return array(
					'css'     => '',
					'refused' => array( 'syntax: an unterminated comment' ),
				);
			}

			// Pass one finds the keyframes names the input defines, so pass two can rename every reference
			// to them, including one written before its @keyframes.
			$suffix  = self::scope_token( $scope );
			$defined = array();
			$ignored = array();
			$pos     = 0;
			$out     = self::parse_block( $clean, $pos, false, $scope, $ignored, $suffix, array(), $defined );
			if ( null !== $out ) {
				$renames = array();
				foreach ( array_keys( $defined ) as $name ) {
					$renames[ (string) $name ] = $name . '-' . $suffix;
				}
				$refused = array();
				$pos     = 0;
				$out     = self::parse_block( $clean, $pos, false, $scope, $refused, $suffix, $renames, $defined );
			}
			if ( null === $out ) {
				return array(
					'css'     => '',
					'refused' => array( 'syntax: unbalanced braces or an unterminated string' ),
				);
			}

			return array(
				'css'     => $out,
				'refused' => $refused,
			);
		}

		/**
		 * Remove `/* … *\/` comments outside strings.
		 *
		 * @param string $css Raw CSS.
		 * @return string|null The CSS without comments, or null for an unterminated comment.
		 */
		private static function strip_comments( string $css ): ?string {
			$out   = '';
			$len   = strlen( $css );
			$quote = '';
			for ( $i = 0; $i < $len; $i++ ) {
				$c = $css[ $i ];
				if ( '' !== $quote ) {
					$out .= $c;
					if ( '\\' === $c && $i + 1 < $len ) {
						$out .= $css[ ++$i ];
					} elseif ( $c === $quote ) {
						$quote = '';
					}
					continue;
				}
				if ( '"' === $c || "'" === $c ) {
					$quote = $c;
					$out  .= $c;
					continue;
				}
				if ( '/' === $c && $i + 1 < $len && '*' === $css[ $i + 1 ] ) {
					$end = strpos( $css, '*/', $i + 2 );
					if ( false === $end ) {
						return null;
					}
					$i = $end + 1;
					continue;
				}
				$out .= $c;
			}
			return $out;
		}

		/**
		 * Read up to the next `{`, `;` or `}` at bracket depth 0 and outside strings.
		 *
		 * @param string $css CSS without comments.
		 * @param int    $pos Read position, advanced past the text read (not past the stop character).
		 * @return array{0: string, 1: string}|null [text, stop character or '' at end], or null for an unterminated string.
		 */
		private static function read_until_stop( string $css, int &$pos ): ?array {
			$len   = strlen( $css );
			$start = $pos;
			$depth = 0;
			$quote = '';
			for ( ; $pos < $len; $pos++ ) {
				$c = $css[ $pos ];
				if ( '' !== $quote ) {
					if ( '\\' === $c ) {
						++$pos;
					} elseif ( $c === $quote ) {
						$quote = '';
					}
					continue;
				}
				if ( '"' === $c || "'" === $c ) {
					$quote = $c;
				} elseif ( '(' === $c || '[' === $c ) {
					++$depth;
				} elseif ( ( ')' === $c || ']' === $c ) && $depth > 0 ) {
					--$depth;
				} elseif ( 0 === $depth && ( '{' === $c || ';' === $c || '}' === $c ) ) {
					return array( substr( $css, $start, $pos - $start ), $c );
				}
			}
			if ( '' !== $quote ) {
				return null;
			}
			return array( substr( $css, $start ), '' );
		}

		/**
		 * Read a rule body up to its closing `}`; report whether it holds a nested block.
		 *
		 * @param string $css CSS without comments.
		 * @param int    $pos Position just after the opening `{`; advanced past the closing `}`.
		 * @return array{0: string, 1: bool}|null [body, has a nested block], or null when unbalanced.
		 */
		private static function read_body( string $css, int &$pos ): ?array {
			$len    = strlen( $css );
			$start  = $pos;
			$depth  = 1;
			$quote  = '';
			$nested = false;
			for ( ; $pos < $len; $pos++ ) {
				$c = $css[ $pos ];
				if ( '' !== $quote ) {
					if ( '\\' === $c ) {
						++$pos;
					} elseif ( $c === $quote ) {
						$quote = '';
					}
					continue;
				}
				if ( '"' === $c || "'" === $c ) {
					$quote = $c;
				} elseif ( '{' === $c ) {
					++$depth;
					$nested = true;
				} elseif ( '}' === $c ) {
					--$depth;
					if ( 0 === $depth ) {
						$body = substr( $css, $start, $pos - $start );
						++$pos;
						return array( $body, $nested );
					}
				}
			}
			return null;
		}

		/**
		 * Parse a run of statements, emitting scoped CSS.
		 *
		 * @param string   $css      CSS without comments.
		 * @param int      $pos      Read position.
		 * @param bool     $in_block True inside an at-rule block (a `}` ends the run).
		 * @param string   $scope    The instance selector.
		 * @param string[] $refused  Reasons for refused parts, appended to.
		 * @param string   $suffix   Token appended to every kept keyframes name.
		 * @param string[] $renames  Keyframes name => renamed name, applied to animation declarations.
		 * @param bool[]   $defined  Keyframes names kept, set as name => true.
		 * @return string|null Scoped CSS, or null when the input is malformed.
		 */
		private static function parse_block( string $css, int &$pos, bool $in_block, string $scope, array &$refused, string $suffix, array $renames, array &$defined ): ?string {
			$out   = '';
			$decls = array();

			while ( true ) {
				$read = self::read_until_stop( $css, $pos );
				if ( null === $read ) {
					return null;
				}
				list( $text, $stop ) = $read;
				$prelude             = self::squash( $text );

				if ( '' === $stop ) {
					if ( $in_block ) {
						return null;
					}
					if ( '' !== $prelude ) {
						$decls[] = $prelude;
					}
					break;
				}

				if ( '}' === $stop ) {
					if ( ! $in_block ) {
						return null;
					}
					if ( '' !== $prelude ) {
						$decls[] = $prelude;
					}
					++$pos;
					break;
				}

				if ( ';' === $stop ) {
					++$pos;
					if ( '' === $prelude ) {
						continue;
					}
					if ( '@' === $prelude[0] ) {
						$refused[] = 'at-rule: ' . self::at_name( $prelude );
						continue;
					}
					$decls[] = $prelude;
					continue;
				}

				// '{': a rule or a block at-rule.
				++$pos;
				if ( '' !== $prelude && '@' === $prelude[0] ) {
					$name = self::at_name( $prelude );
					if ( in_array( $name, self::NESTING_AT_RULES, true ) ) {
						$condition = self::squash( substr( $prelude, strlen( $name ) + 1 ) );
						$inner     = self::parse_block( $css, $pos, true, $scope, $refused, $suffix, $renames, $defined );
						if ( null === $inner ) {
							return null;
						}
						if ( '' !== $inner ) {
							$out .= '@' . $name . ( '' !== $condition ? ' ' . $condition : '' ) . '{' . $inner . '}';
						}
						continue;
					}
					if ( 'keyframes' === $name ) {
						$raw = self::read_body( $css, $pos );
						if ( null === $raw ) {
							return null;
						}
						$kept = self::keyframes( $prelude, $raw[0], $suffix, $renames, $refused );
						if ( null !== $kept ) {
							$defined[ $kept[0] ] = true;
							$out                .= $kept[1];
						}
						continue;
					}
					$skip = self::read_body( $css, $pos );
					if ( null === $skip ) {
						return null;
					}
					$refused[] = 'at-rule: ' . $name;
					continue;
				}

				$body = self::read_body( $css, $pos );
				if ( null === $body ) {
					return null;
				}
				list( $raw_body, $nested ) = $body;
				if ( $nested ) {
					$refused[] = 'nested rule: ' . $prelude;
					continue;
				}
				if ( '' === $prelude ) {
					$refused[] = 'rule without a selector';
					continue;
				}
				$declarations = self::squash( $raw_body );
				if ( preg_match( self::UNSAFE_BODY, $declarations ) ) {
					$refused[] = 'unsafe value: ' . $prelude;
					continue;
				}
				if ( '' === $declarations ) {
					continue;
				}
				$out .= self::scope_selector_list( $prelude, $scope ) . '{' . self::rename_animations( self::trim_semicolon( $declarations ), $renames ) . '}';
			}

			if ( $decls ) {
				$joined = self::trim_semicolon( implode( ';', $decls ) );
				if ( preg_match( self::UNSAFE_BODY, $joined ) ) {
					$refused[] = 'unsafe value: declarations on the block';
				} elseif ( '' !== $joined ) {
					$out = $scope . '{' . self::rename_animations( $joined, $renames ) . '}' . $out;
				}
			}

			return $out;
		}

		/**
		 * Check and rename one `@keyframes` block.
		 *
		 * @param string   $prelude The `@keyframes <name>` prelude.
		 * @param string   $body    The block's body, between its braces.
		 * @param string   $suffix  Token appended to the name.
		 * @param string[] $renames Keyframes name => renamed name, applied to the keyframes' declarations.
		 * @param string[] $refused Reasons for refused parts, appended to.
		 * @return array{0: string, 1: string}|null [name as written, renamed CSS], or null when refused or empty.
		 */
		private static function keyframes( string $prelude, string $body, string $suffix, array $renames, array &$refused ): ?array {
			$name = self::squash( substr( $prelude, strlen( 'keyframes' ) + 1 ) );
			if ( ! preg_match( self::KEYFRAMES_NAME, $name ) || in_array( strtolower( $name ), self::RESERVED_KEYFRAMES_NAMES, true ) ) {
				$refused[] = 'keyframes name: ' . $name;
				return null;
			}
			$label  = '@keyframes ' . $name;
			$frames = '';
			$pos    = 0;
			while ( true ) {
				$read = self::read_until_stop( $body, $pos );
				if ( null === $read ) {
					$refused[] = 'stray declaration: ' . $label;
					return null;
				}
				list( $text, $stop ) = $read;
				$selector_list       = self::squash( $text );
				if ( '' === $stop ) {
					if ( '' !== $selector_list ) {
						$refused[] = 'stray declaration: ' . $label;
						return null;
					}
					break;
				}
				if ( '{' !== $stop ) {
					$refused[] = 'stray declaration: ' . $label;
					return null;
				}
				++$pos;
				$frame = self::read_body( $body, $pos );
				if ( null === $frame ) {
					$refused[] = 'stray declaration: ' . $label;
					return null;
				}
				if ( $frame[1] ) {
					$refused[] = 'nested rule: ' . $label;
					return null;
				}
				$selectors = array();
				foreach ( self::split_top_level( $selector_list, ',' ) as $selector ) {
					$selector = self::squash( $selector );
					if ( ! preg_match( self::KEYFRAME_SELECTOR, $selector ) ) {
						$refused[] = 'keyframe selector: ' . ( '' !== $selector ? $selector : $selector_list );
						return null;
					}
					$selectors[] = $selector;
				}
				$declarations = self::squash( $frame[0] );
				if ( preg_match( self::UNSAFE_BODY, $declarations ) ) {
					$refused[] = 'unsafe value: ' . $label;
					return null;
				}
				$declarations = self::trim_semicolon( $declarations );
				if ( '' === $declarations ) {
					continue;
				}
				$frames .= implode( ',', $selectors ) . '{' . self::rename_animations( $declarations, $renames ) . '}';
			}
			if ( '' === $frames ) {
				return null;
			}
			return array( $name, '@keyframes ' . $name . '-' . $suffix . '{' . $frames . '}' );
		}

		/**
		 * Rewrite keyframes names in `animation` and `animation-name` declarations.
		 *
		 * A token is replaced only when it is a whole space-separated token at bracket depth 0 that equals a
		 * renamed name; everything else, including the separators, is kept as written.
		 *
		 * @param string   $declarations Declaration list.
		 * @param string[] $renames      Keyframes name => renamed name.
		 * @return string
		 */
		private static function rename_animations( string $declarations, array $renames ): string {
			if ( ! $renames ) {
				return $declarations;
			}
			$parts = self::split_top_level( $declarations, ';' );
			foreach ( $parts as $i => $part ) {
				$colon = self::find_outside_strings( $part, ':' );
				if ( false === $colon ) {
					continue;
				}
				$property = strtolower( self::squash( substr( $part, 0, $colon ) ) );
				if ( 'animation' !== $property && 'animation-name' !== $property ) {
					continue;
				}
				$items = self::split_top_level( substr( $part, $colon + 1 ), ',' );
				foreach ( $items as $j => $item ) {
					$tokens = self::split_top_level( $item, ' ' );
					foreach ( $tokens as $k => $token ) {
						if ( isset( $renames[ $token ] ) ) {
							$tokens[ $k ] = $renames[ $token ];
						}
					}
					$items[ $j ] = implode( ' ', $tokens );
				}
				$parts[ $i ] = substr( $part, 0, $colon + 1 ) . implode( ',', $items );
			}
			return implode( ';', $parts );
		}

		/**
		 * The token a kept keyframes name is suffixed with: the scope's first class, or `scoped`.
		 *
		 * @param string $scope The instance selector.
		 * @return string
		 */
		private static function scope_token( string $scope ): string {
			return preg_match( '/^\.(-?[A-Za-z_][A-Za-z0-9_-]*)/', $scope, $m ) ? $m[1] : 'scoped';
		}

		/**
		 * Scope each selector in a comma list.
		 *
		 * @param string $selectors Selector list.
		 * @param string $scope     The instance selector.
		 * @return string
		 */
		private static function scope_selector_list( string $selectors, string $scope ): string {
			$scoped = array();
			foreach ( self::split_top_level( $selectors, ',' ) as $selector ) {
				$selector = self::squash( $selector );
				if ( '' === $selector ) {
					continue;
				}
				$selector = self::replace_outside_strings( $selector, '&selector', '&' );
				if ( false !== self::find_outside_strings( $selector, '&' ) ) {
					$scoped[] = self::replace_outside_strings( $selector, '&', $scope );
				} else {
					$scoped[] = $scope . ' ' . $selector;
				}
			}
			return implode( ',', $scoped );
		}

		/**
		 * Split on `$sep` at bracket depth 0, outside strings.
		 *
		 * @param string $text Text to split.
		 * @param string $sep  One-character separator.
		 * @return string[]
		 */
		private static function split_top_level( string $text, string $sep ): array {
			$parts = array();
			$cur   = '';
			$depth = 0;
			$quote = '';
			$len   = strlen( $text );
			for ( $i = 0; $i < $len; $i++ ) {
				$c = $text[ $i ];
				if ( '' !== $quote ) {
					$cur .= $c;
					if ( '\\' === $c && $i + 1 < $len ) {
						$cur .= $text[ ++$i ];
					} elseif ( $c === $quote ) {
						$quote = '';
					}
					continue;
				}
				if ( '"' === $c || "'" === $c ) {
					$quote = $c;
				} elseif ( '(' === $c || '[' === $c ) {
					++$depth;
				} elseif ( ( ')' === $c || ']' === $c ) && $depth > 0 ) {
					--$depth;
				} elseif ( $c === $sep && 0 === $depth ) {
					$parts[] = $cur;
					$cur     = '';
					continue;
				}
				$cur .= $c;
			}
			$parts[] = $cur;
			return $parts;
		}

		/**
		 * Position of `$needle` outside quoted strings, or false.
		 *
		 * @param string $text   Haystack.
		 * @param string $needle Needle.
		 * @return int|false
		 */
		private static function find_outside_strings( string $text, string $needle ) {
			$quote = '';
			$len   = strlen( $text );
			$n     = strlen( $needle );
			for ( $i = 0; $i < $len; $i++ ) {
				$c = $text[ $i ];
				if ( '' !== $quote ) {
					if ( '\\' === $c ) {
						++$i;
					} elseif ( $c === $quote ) {
						$quote = '';
					}
					continue;
				}
				if ( '"' === $c || "'" === $c ) {
					$quote = $c;
					continue;
				}
				if ( substr( $text, $i, $n ) === $needle ) {
					return $i;
				}
			}
			return false;
		}

		/**
		 * Replace every `$needle` outside quoted strings.
		 *
		 * @param string $text    Text.
		 * @param string $needle  Needle.
		 * @param string $replace Replacement.
		 * @return string
		 */
		private static function replace_outside_strings( string $text, string $needle, string $replace ): string {
			$out   = '';
			$quote = '';
			$len   = strlen( $text );
			$n     = strlen( $needle );
			for ( $i = 0; $i < $len; $i++ ) {
				$c = $text[ $i ];
				if ( '' !== $quote ) {
					$out .= $c;
					if ( '\\' === $c && $i + 1 < $len ) {
						$out .= $text[ ++$i ];
					} elseif ( $c === $quote ) {
						$quote = '';
					}
					continue;
				}
				if ( '"' === $c || "'" === $c ) {
					$quote = $c;
					$out  .= $c;
					continue;
				}
				if ( substr( $text, $i, $n ) === $needle ) {
					$out .= $replace;
					$i   += $n - 1;
					continue;
				}
				$out .= $c;
			}
			return $out;
		}

		/**
		 * Lower-case at-rule name of a prelude starting with `@`.
		 *
		 * @param string $prelude Prelude.
		 * @return string
		 */
		private static function at_name( string $prelude ): string {
			return preg_match( '/^@([A-Za-z-]+)/', $prelude, $m ) ? strtolower( $m[1] ) : '';
		}

		/**
		 * Collapse whitespace runs to one space and trim.
		 *
		 * @param string $text Text.
		 * @return string
		 */
		private static function squash( string $text ): string {
			return trim( (string) preg_replace( '/[ \t\n\r\f]+/', ' ', $text ), self::WS );
		}

		/**
		 * Trim whitespace and trailing semicolons from a declaration list.
		 *
		 * @param string $text Declarations.
		 * @return string
		 */
		private static function trim_semicolon( string $text ): string {
			return trim( rtrim( trim( $text, self::WS ), '; ' ), self::WS );
		}
	}
}
