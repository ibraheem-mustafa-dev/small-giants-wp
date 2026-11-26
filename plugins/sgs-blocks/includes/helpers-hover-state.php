<?php
/**
 * Hover and press looks on touch screens: the ONE place a generated `:hover` rule is built (Spec 38A FR-38A-17).
 *
 * Every hover look follows one contract, shared with the stylesheet transform `scripts/hover-guard/transform.js`:
 *   - Mouse: each `:hover` selector member sits behind `:where(:root:not(.sgs-touch-input))` (SGS_HOVER_NOT_TOUCH).
 *     `assets/js/touch-input.js` puts `.sgs-touch-input` on <html> while the last pointer was a touch, so a phone can
 *     no longer leave a tapped element in its hover look. The guard is `:where()`, so it adds no specificity.
 *   - Touch: the same member with `:hover` replaced by the pressed class `.sgs-pressed` joins the rule.
 *     touch-input.js sets that class on the element under a touching finger and on its ancestors (the chain `:hover`
 *     covers) the moment the finger lands, and removes it when the finger lifts, slides off the element or the touch
 *     becomes a scroll. A class and a pseudo-class weigh the same, so specificity is unchanged.
 *   - A member that hovers only through `:not(:hover)` gets its touch half under `:where(:root.sgs-touch-input)`
 *     (SGS_HOVER_TOUCH_ONLY): unguarded it would also apply while a mouse hovers.
 *   - Press looks: a member keyed on `:active` gains the same member with `.sgs-pressed`, so a press look shows at
 *     once and clears on slide-off and scroll on every engine.
 *   - A `:hover` or `:active` after a pseudo-element gets no touch half (a class cannot follow one); a member that
 *     starts at a pseudo-element or the root (a viewport scrollbar) stays as written.
 *
 * The site setting "Hover effects on touch screens" (`class-sgs-touch-hover-setting.php`) picks what touch-input.js
 * does: "Show while pressed" (the default) sets both classes; "Off on touch screens" sets only `.sgs-touch-input`, so
 * no hover look shows on touch; "Show on tap" sets neither, so the browser's own sticky hover applies.
 *
 * `sgs_touch_hover_css()` applies the contract to any finished CSS text. The emitters below call it, and the
 * per-instance CSS collector (`class-sgs-css-registry.php::sgs_css_place`) and the inline-styles pass
 * (`class-sgs-touch-hover-styles.php`) run it again over everything they print, so a raw `:hover` printed by a block
 * outside these helpers still follows it. It is idempotent.
 *
 * `:focus-visible` is KEYBOARD-reachable and stays OUTSIDE the guard: every caller splits its hover selector from its
 * focus selector. A paint that follows a container's focus is keyed on `:focus-visible` (the element itself) plus
 * `:has(:focus-visible)` (a descendant), never `:focus-within`: a tap or a mouse click focuses a link, and
 * `:focus-within` would paint the container on that tap.
 *
 * The parser here is for SGS's own generated CSS: comments are dropped from CSS that carries `:hover` or `:active`, and
 * a brace inside a quoted string in a declaration is not supported (none is generated).
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

/** Zero-specificity mouse guard: off while the last pointer was a touch (touch-input.js). */
const SGS_HOVER_NOT_TOUCH = ':where(:root:not(.sgs-touch-input))';

/** Zero-specificity guard of a `:not(:hover)` member's touch half. */
const SGS_HOVER_TOUCH_ONLY = ':where(:root.sgs-touch-input)';

/** The class touch-input.js sets on the pressed chain. Must match scripts/hover-guard/transform.js::PRESSED_CLASS. */
const SGS_PRESSED_CLASS = 'sgs-pressed';

if ( ! function_exists( 'sgs_touch_hover_split_members' ) ) {
	/**
	 * Split a selector list at its top-level commas (outside brackets, parentheses and quotes).
	 *
	 * @param string $selector Selector list.
	 * @return string[] Trimmed, non-empty members.
	 */
	function sgs_touch_hover_split_members( string $selector ): array {
		$members = array();
		$depth   = 0;
		$quote   = '';
		$current = '';
		$len     = strlen( $selector );
		for ( $i = 0; $i < $len; $i++ ) {
			$c = $selector[ $i ];
			if ( '' !== $quote ) {
				$current .= $c;
				if ( '\\' === $c && $i + 1 < $len ) {
					$current .= $selector[ ++$i ];
				} elseif ( $c === $quote ) {
					$quote = '';
				}
				continue;
			}
			if ( '"' === $c || "'" === $c ) {
				$quote = $c;
			} elseif ( '(' === $c || '[' === $c ) {
				++$depth;
			} elseif ( ')' === $c || ']' === $c ) {
				--$depth;
			} elseif ( ',' === $c && 0 === $depth ) {
				$members[] = trim( $current );
				$current   = '';
				continue;
			}
			$current .= $c;
		}
		$members[] = trim( $current );
		return array_values( array_filter( $members, static fn ( $m ) => '' !== $m ) );
	}
}

if ( ! function_exists( 'sgs_touch_hover_unquoted' ) ) {
	/**
	 * A selector with each quoted string emptied, so text in an attribute value is never read as a state.
	 *
	 * @param string $selector Selector text.
	 * @return string
	 */
	function sgs_touch_hover_unquoted( string $selector ): string {
		return (string) preg_replace( '/"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'/s', '""', $selector );
	}
}

if ( ! function_exists( 'sgs_touch_hover_has_hover' ) ) {
	/**
	 * Whether a selector carries `:hover` as a pseudo-class.
	 *
	 * @param string $selector Selector text.
	 * @return bool
	 */
	function sgs_touch_hover_has_hover( string $selector ): bool {
		return 1 === preg_match( '/:hover(?![\w-])/i', sgs_touch_hover_unquoted( $selector ) );
	}
}

if ( ! function_exists( 'sgs_touch_hover_has_active' ) ) {
	/**
	 * Whether a selector carries `:active` as a pseudo-class.
	 *
	 * @param string $selector Selector text.
	 * @return bool
	 */
	function sgs_touch_hover_has_active( string $selector ): bool {
		return 1 === preg_match( '/:active(?![\w-])/i', sgs_touch_hover_unquoted( $selector ) );
	}
}

if ( ! function_exists( 'sgs_touch_hover_normalise' ) ) {
	/**
	 * Whitespace-insensitive form of a selector member.
	 *
	 * @param string $member Selector member.
	 * @return string
	 */
	function sgs_touch_hover_normalise( string $member ): string {
		return trim( (string) preg_replace( '/\s*([>+~,()])\s*/', '$1', (string) preg_replace( '/\s+/', ' ', $member ) ) );
	}
}

if ( ! function_exists( 'sgs_touch_hover_state_compound' ) ) {
	/**
	 * Where a state sits: the compound it belongs to (climbing out of `:not()`, `:is()` and `:where()`), and whether
	 * it is negated. Reads the member text before the state, so a quoted or bracketed `:hover` is never counted.
	 *
	 * @param string $before The member text up to the state.
	 * @return array{key:string,negated:bool,any_not:bool,start:int} `key` names the compound, `negated` says it sits in a
	 *         `:not()` of that compound, `any_not` that any open parenthesis is a `:not(`, and `start` is where the state's
	 *         own compound begins in `$before`.
	 */
	function sgs_touch_hover_state_compound( string $before ): array {
		// One frame per open parenthesis: where it opens, where its current compound starts, and what it belongs to.
		$frames  = array(
			array(
				'open'  => -1,
				'start' => 0,
				'kind'  => '',
			),
		);
		$quote   = '';
		$bracket = 0;
		$len     = strlen( $before );
		for ( $i = 0; $i < $len; $i++ ) {
			$c = $before[ $i ];
			if ( '' !== $quote ) {
				if ( '\\' === $c ) {
					++$i;
				} elseif ( $c === $quote ) {
					$quote = '';
				}
				continue;
			}
			if ( '\\' === $c ) {
				++$i;
			} elseif ( '"' === $c || "'" === $c ) {
				$quote = $c;
			} elseif ( '[' === $c ) {
				++$bracket;
			} elseif ( ']' === $c ) {
				--$bracket;
			} elseif ( $bracket > 0 ) {
				continue;
			} elseif ( '(' === $c ) {
				$kind     = 1 === preg_match( '/:(not|is|where)$/i', substr( $before, 0, $i ), $k ) ? strtolower( $k[1] ) : '';
				$frames[] = array(
					'open'  => $i,
					'start' => $i + 1,
					'kind'  => $kind,
				);
			} elseif ( ')' === $c ) {
				if ( count( $frames ) > 1 ) {
					array_pop( $frames );
				}
			} elseif ( ' ' === $c || "\t" === $c || "\n" === $c || '>' === $c || '+' === $c || '~' === $c || ',' === $c ) {
				$frames[ count( $frames ) - 1 ]['start'] = $i + 1;
			}
		}
		$own     = (int) end( $frames )['start'];
		$any_not = in_array( 'not', array_column( $frames, 'kind' ), true );
		$top     = count( $frames ) - 1;
		$negated = false;
		while ( $top > 0 && '' !== $frames[ $top ]['kind'] ) {
			$negated = $negated || 'not' === $frames[ $top ]['kind'];
			--$top;
		}
		return array(
			'key'     => $frames[ $top ]['open'] . ':' . $frames[ $top ]['start'],
			'negated' => $negated,
			'any_not' => $any_not,
			'start'   => $own,
		);
	}
}

if ( ! function_exists( 'sgs_touch_hover_member' ) ) {
	/**
	 * The touch half of one member: every `:hover` and `:active` becomes `.sgs-pressed`.
	 *
	 * @param string $member A selector member, without the mouse guard.
	 * @return array{selector:string,negated:bool}|null Null when a state follows a pseudo-element, or when one compound
	 *                                                  both requires and negates the state (`.a:active:not(:hover)`):
	 *                                                  both are the one class, so the half could never match.
	 */
	function sgs_touch_hover_member( string $member ): ?array {
		$negated  = false;
		$offset   = 0;
		$states   = array();
		$positive = array();
		$negative = array();
		while ( preg_match( '/:(?:hover|active)(?![\w-])/i', $member, $m, PREG_OFFSET_CAPTURE, $offset ) ) {
			$at     = (int) $m[0][1];
			$before = substr( $member, 0, $at );
			$offset = $at + 1;
			// A match inside a quoted attribute value (`[title=":hover"]`) is text, not a state. An escape pair (`\"`) is no quote.
			$plain = (string) preg_replace( '/\\\\./s', '', $before );
			if ( 1 === substr_count( $plain, '"' ) % 2 || 1 === substr_count( $plain, "'" ) % 2 ) {
				continue;
			}
			$where    = sgs_touch_hover_state_compound( $before );
			$compound = substr( $before, $where['start'] );
			if ( 1 === preg_match( '/::|:(?:before|after|first-line|first-letter)(?![\w-])/i', $compound ) ) {
				return null;
			}
			$negated = $negated || $where['any_not'];
			if ( $where['negated'] ) {
				$negative[ $where['key'] ] = true;
			} else {
				$positive[ $where['key'] ] = true;
			}
			$states[] = array( $at, strlen( $m[0][0] ) );
		}
		if ( array_intersect_key( $positive, $negative ) ) {
			return null;
		}
		foreach ( array_reverse( $states ) as $state ) {
			$member = substr( $member, 0, $state[0] ) . '.' . SGS_PRESSED_CLASS . substr( $member, $state[0] + $state[1] );
		}
		return array(
			'selector' => $member,
			'negated'  => $negated,
		);
	}
}

if ( ! function_exists( 'sgs_touch_hover_root_compound' ) ) {
	/**
	 * The length of a member's first compound when it is the root (`:root`, `html`), else 0.
	 *
	 * @param string $member Selector member.
	 * @return int
	 */
	function sgs_touch_hover_root_compound( string $member ): int {
		if ( 1 !== preg_match( '/^(?::root|html)(?![\w-])/i', $member ) ) {
			return 0;
		}
		$depth = 0;
		for ( $i = 0, $n = strlen( $member ); $i < $n; $i++ ) {
			$c = $member[ $i ];
			if ( '(' === $c || '[' === $c ) {
				++$depth;
			} elseif ( ')' === $c || ']' === $c ) {
				--$depth;
			} elseif ( 0 === $depth && false !== strpos( " \t\n>+~", $c ) ) {
				return $i;
			}
		}
		return strlen( $member );
	}
}

if ( ! function_exists( 'sgs_touch_hover_guarded' ) ) {
	/**
	 * A member behind a root guard. A member that starts at the root (`:root :where(a:hover)`, WordPress's global
	 * styles) takes the guard on that compound (`:root:where(:not(.sgs-touch-input))`), since the root is no descendant
	 * of itself; any other member takes it as a descendant prefix. Both forms add no specificity.
	 *
	 * @param string $member Selector member.
	 * @param string $guard  SGS_HOVER_NOT_TOUCH or SGS_HOVER_TOUCH_ONLY.
	 * @return string
	 */
	function sgs_touch_hover_guarded( string $member, string $guard ): string {
		$at = sgs_touch_hover_root_compound( $member );
		if ( $at > 0 ) {
			return substr( $member, 0, $at ) . ':where(' . substr( $guard, strlen( ':where(:root' ), -1 ) . ')' . substr( $member, $at );
		}
		return $guard . ' ' . $member;
	}
}

if ( ! function_exists( 'sgs_touch_hover_unguarded' ) ) {
	/**
	 * A member without the mouse guard (either form).
	 *
	 * @param string $member Selector member.
	 * @return string
	 */
	function sgs_touch_hover_unguarded( string $member ): string {
		if ( 0 === strpos( $member, SGS_HOVER_NOT_TOUCH ) ) {
			return trim( substr( $member, strlen( SGS_HOVER_NOT_TOUCH ) ) );
		}
		$at   = sgs_touch_hover_root_compound( $member );
		$tail = ':where(:not(.sgs-touch-input))';
		if ( $at > strlen( $tail ) && substr( $member, $at - strlen( $tail ), strlen( $tail ) ) === $tail ) {
			return substr( $member, 0, $at - strlen( $tail ) ) . substr( $member, $at );
		}
		return $member;
	}
}

if ( ! function_exists( 'sgs_touch_hover_contract_members' ) ) {
	/**
	 * The members a rule carries under the contract (see this file's header).
	 *
	 * @param string[] $members  The rule's members.
	 * @param bool     $in_mouse Whether the rule sits in `@media (hover:hover)`: its touch halves are returned apart.
	 * @return array{members:string[],touch:string[]} The rule's members, and the touch halves a mouse-media rule needs
	 *                                               outside its media query.
	 */
	function sgs_touch_hover_contract_members( array $members, bool $in_mouse ): array {
		$out   = array();
		$touch = array();
		foreach ( $members as $m ) {
			$plain = sgs_touch_hover_unguarded( $m );
			if ( sgs_touch_hover_has_hover( $plain ) && 0 !== strpos( $plain, '::' ) ) {
				$t = sgs_touch_hover_member( $plain );
				if ( null !== $t ) {
					$half = $t['negated'] ? sgs_touch_hover_guarded( $t['selector'], SGS_HOVER_TOUCH_ONLY ) : $t['selector'];
					if ( $in_mouse ) {
						$touch[] = $half;
					} else {
						$out[] = $half;
					}
				}
				$out[] = $in_mouse ? $m : sgs_touch_hover_guarded( $plain, SGS_HOVER_NOT_TOUCH );
				continue;
			}
			$out[] = $m;
			// A press look inside a mouse-only query is mouse-only, and the halves of that query are hoisted out of it: no twin.
			if ( ! $in_mouse && ! sgs_touch_hover_has_hover( $plain ) && sgs_touch_hover_has_active( $plain ) ) {
				$t = sgs_touch_hover_member( $plain );
				if ( null !== $t && ! $t['negated'] ) {
					$out[] = $t['selector'];
				}
			}
		}
		$seen = array();
		$out  = array_values(
			array_filter(
				$out,
				static function ( $m ) use ( &$seen ) {
					$k = sgs_touch_hover_normalise( $m );
					if ( isset( $seen[ $k ] ) ) {
						return false;
					}
					$seen[ $k ] = true;
					return true;
				}
			)
		);
		return array(
			'members' => $out,
			'touch'   => $touch,
		);
	}
}

if ( ! function_exists( 'sgs_touch_hover_log' ) ) {
	/**
	 * Say why a stylesheet was left as it came: the safe fallbacks of this file are silent in production, and under
	 * WP_DEBUG they name their reason in the error log.
	 *
	 * @param string $reason Short reason.
	 * @return void
	 */
	function sgs_touch_hover_log( string $reason ): void {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log( 'sgs_touch_hover_css: ' . $reason ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
		}
	}
}

if ( ! function_exists( 'sgs_touch_hover_parse' ) ) {
	/**
	 * Parse CSS into nodes: `rule` (prelude, body), `block` (an at-rule holding rules) and `raw` (kept verbatim).
	 *
	 * @param string $css    CSS text without comments.
	 * @param int    $i      Read position, advanced past the block's closing brace.
	 * @param bool   $closed Set when the parse stopped at a closing brace.
	 * @return array<int,array<string,mixed>>
	 */
	function sgs_touch_hover_parse( string $css, int &$i, bool &$closed = false ): array {
		$closed = false;
		$nodes  = array();
		$len    = strlen( $css );
		while ( $i < $len ) {
			$stop = $i + strcspn( $css, '{};', $i );
			if ( $stop >= $len ) {
				$rest = trim( substr( $css, $i ) );
				if ( '' !== $rest ) {
					$nodes[] = array(
						'type' => 'raw',
						'text' => $rest,
					);
				}
				$i = $len;
				break;
			}
			$char = $css[ $stop ];
			$text = trim( substr( $css, $i, $stop - $i ) );
			if ( '}' === $char ) {
				if ( '' !== $text ) {
					$nodes[] = array(
						'type' => 'raw',
						'text' => $text,
					);
				}
				$i      = $stop + 1;
				$closed = true;
				return $nodes;
			}
			if ( ';' === $char ) {
				$nodes[] = array(
					'type' => 'raw',
					'text' => $text . ';',
				);
				$i       = $stop + 1;
				continue;
			}
			// '{': a block-holding at-rule recurses; anything else is a rule whose body runs to its matching brace.
			if ( 1 === preg_match( '/^@(?:media|supports|layer|container|scope|document|-moz-document)\b/i', $text ) ) {
				$i       = $stop + 1;
				$nodes[] = array(
					'type'     => 'block',
					'prelude'  => $text,
					'children' => sgs_touch_hover_parse( $css, $i ),
				);
				continue;
			}
			$depth = 1;
			$j     = $stop + 1;
			while ( $j < $len && $depth > 0 ) {
				$j += strcspn( $css, '{}', $j );
				if ( $j >= $len ) {
					break;
				}
				$depth += '{' === $css[ $j ] ? 1 : -1;
				++$j;
			}
			$body = substr( $css, $stop + 1, max( 0, $j - $stop - 2 ) );
			if ( '@' === ( $text[0] ?? '' ) || false !== strpos( $body, '{' ) ) {
				if ( '@' !== ( $text[0] ?? '' ) && ( sgs_touch_hover_has_hover( $text . ' ' . $body ) || sgs_touch_hover_has_active( $text . ' ' . $body ) ) ) {
					sgs_touch_hover_log( 'nested CSS under a rule that carries :hover or :active was copied as it came: ' . substr( $text, 0, 80 ) );
				}
				$nodes[] = array(
					'type' => 'raw',
					'text' => $text . '{' . $body . '}',
				);
			} else {
				$nodes[] = array(
					'type'    => 'rule',
					'prelude' => $text,
					'body'    => $body,
				);
			}
			$i = $j;
		}
		return $nodes;
	}
}

if ( ! function_exists( 'sgs_touch_hover_mouse_remainder' ) ) {
	/**
	 * What an at-rule prelude leaves once its `(hover:hover)` condition is taken out, or null when it is not a mouse-only
	 * media query. Mouse-only means `(hover:hover)` is one of the conditions joined by `and`: a query list (`,`), a
	 * `not` or an `or` is not. Must match scripts/hover-guard/transform.js::mouseRemainder.
	 *
	 * @param string $prelude At-rule prelude (`@media (hover:hover) and (min-width:1024px)`).
	 * @return string|null '' for exactly `(hover:hover)`, else the remaining conditions joined by ` and `.
	 */
	function sgs_touch_hover_mouse_remainder( string $prelude ): ?string {
		if ( 1 !== preg_match( '/^@media\b\s*(.*)$/is', trim( $prelude ), $m ) ) {
			return null;
		}
		$text = trim( (string) preg_replace( '/\s+/', ' ', $m[1] ) );
		if ( false !== strpos( $text, ',' ) || 1 === preg_match( '/(^|\s)(not|or)(\s|\()/i', $text ) ) {
			return null;
		}
		$parts = (array) preg_split( '/\s+and\s+/i', $text );
		$hover = false;
		$rest  = array();
		foreach ( $parts as $p ) {
			if ( '(hover:hover)' === strtolower( (string) preg_replace( '/\s+/', '', $p ) ) ) {
				$hover = true;
			} elseif ( 'all' !== strtolower( $p ) ) {
				$rest[] = $p;
			}
		}
		return $hover ? implode( ' and ', $rest ) : null;
	}
}

if ( ! function_exists( 'sgs_touch_hover_ctx' ) ) {
	/**
	 * One at-rule as a context segment, whitespace-free and lower-case. Must match transform.js::segment.
	 *
	 * @param string $prelude At-rule prelude.
	 * @return string
	 */
	function sgs_touch_hover_ctx( string $prelude ): string {
		return '/' . strtolower( (string) preg_replace( '/\s+/', '', $prelude ) );
	}
}

if ( ! function_exists( 'sgs_touch_hover_remainder_ctx' ) ) {
	/**
	 * The context segment a mouse-only media block leaves for the touch half hoisted out of it.
	 *
	 * @param string $remainder What `sgs_touch_hover_mouse_remainder` returned.
	 * @return string '' when nothing remains.
	 */
	function sgs_touch_hover_remainder_ctx( string $remainder ): string {
		return '' === $remainder ? '' : sgs_touch_hover_ctx( '@media ' . $remainder );
	}
}

if ( ! function_exists( 'sgs_touch_hover_body_key' ) ) {
	/**
	 * A rule body, whitespace-insensitive. Must match transform.js::bodyKey.
	 *
	 * @param string $body Declarations, no braces.
	 * @return string
	 */
	function sgs_touch_hover_body_key( string $body ): string {
		$body = (string) preg_replace( '/\s+/', ' ', $body );
		$body = (string) preg_replace( '/\s*([:;,{}!])\s*/', '$1', $body );
		return rtrim( trim( $body ), ';' );
	}
}

if ( ! function_exists( 'sgs_touch_hover_rule_key' ) ) {
	/**
	 * The identity of one member of one rule: the at-rules around it, the member and the declarations. A touch half is
	 * "already there" only as an identical rule, so a second rule for one selector with other declarations still gets
	 * its own half.
	 *
	 * @param string $ctx    At-rules around the rule, as built by `sgs_touch_hover_ctx`.
	 * @param string $member Selector member.
	 * @param string $body   Declarations, no braces.
	 * @return string
	 */
	function sgs_touch_hover_rule_key( string $ctx, string $member, string $body ): string {
		return $ctx . '|' . sgs_touch_hover_normalise( $member ) . '|' . sgs_touch_hover_body_key( $body );
	}
}

if ( ! function_exists( 'sgs_touch_hover_members_in' ) ) {
	/**
	 * Every rule member in a parsed tree as lookup keys (`sgs_touch_hover_rule_key`).
	 *
	 * @param array<int,array<string,mixed>> $nodes Parsed nodes.
	 * @param array<string,bool>             $set   Collected keys.
	 * @param string                         $ctx   At-rules around these nodes.
	 * @return void
	 */
	function sgs_touch_hover_members_in( array $nodes, array &$set, string $ctx = '' ): void {
		foreach ( $nodes as $node ) {
			if ( 'rule' === $node['type'] ) {
				foreach ( sgs_touch_hover_split_members( $node['prelude'] ) as $m ) {
					$set[ sgs_touch_hover_rule_key( $ctx, $m, $node['body'] ) ] = true;
				}
			} elseif ( 'block' === $node['type'] ) {
				sgs_touch_hover_members_in( $node['children'], $set, $ctx . sgs_touch_hover_ctx( $node['prelude'] ) );
			}
		}
	}
}

if ( ! function_exists( 'sgs_touch_hover_missing_touch' ) ) {
	/**
	 * The touch halves a mouse media block's hover rules lack as identical rules, to print before the block.
	 *
	 * @param array<int,array<string,mixed>> $nodes    The mouse block's children.
	 * @param array<string,bool>             $existing Every rule key in the CSS; extended with what is added.
	 * @param string                         $ctx      The at-rules the halves will sit in (mouse-only conditions taken out).
	 * @return string
	 */
	function sgs_touch_hover_missing_touch( array $nodes, array &$existing, string $ctx ): string {
		$out = '';
		foreach ( $nodes as $node ) {
			if ( 'block' === $node['type'] ) {
				$rest  = sgs_touch_hover_mouse_remainder( $node['prelude'] );
				$inner = sgs_touch_hover_missing_touch(
					$node['children'],
					$existing,
					$ctx . ( null === $rest ? sgs_touch_hover_ctx( $node['prelude'] ) : sgs_touch_hover_remainder_ctx( $rest ) )
				);
				if ( '' === $inner ) {
					continue;
				}
				if ( null === $rest ) {
					$out .= $node['prelude'] . '{' . $inner . '}';
				} else {
					$out .= '' === $rest ? $inner : '@media ' . $rest . '{' . $inner . '}';
				}
				continue;
			}
			if ( 'rule' !== $node['type'] || ! sgs_touch_hover_has_hover( $node['prelude'] ) ) {
				continue;
			}
			$missing = array();
			foreach ( sgs_touch_hover_contract_members( sgs_touch_hover_split_members( $node['prelude'] ), true )['touch'] as $half ) {
				$key = sgs_touch_hover_rule_key( $ctx, $half, $node['body'] );
				if ( ! isset( $existing[ $key ] ) ) {
					$existing[ $key ] = true;
					$missing[]        = $half;
				}
			}
			if ( $missing ) {
				$out .= implode( ',', array_unique( $missing ) ) . '{' . $node['body'] . '}';
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_touch_hover_emit' ) ) {
	/**
	 * Serialise parsed nodes, applying the contract to each hover or press rule.
	 *
	 * @param array<int,array<string,mixed>> $nodes    Parsed nodes.
	 * @param bool                           $in_mouse Whether an ancestor is a mouse media query.
	 * @param array<string,bool>             $existing Every rule key in the CSS (`sgs_touch_hover_rule_key`).
	 * @param string                         $ctx      The at-rules around these nodes.
	 * @return string
	 */
	function sgs_touch_hover_emit( array $nodes, bool $in_mouse, array &$existing, string $ctx ): string {
		$out = '';
		foreach ( $nodes as $node ) {
			if ( 'raw' === $node['type'] ) {
				$out .= $node['text'];
				continue;
			}
			if ( 'block' === $node['type'] ) {
				$rest  = sgs_touch_hover_mouse_remainder( $node['prelude'] );
				$touch = '';
				if ( null !== $rest && ! $in_mouse ) {
					// The touch halves a mouse block is missing print just before it, inside the other at-rules it sits in and
					// with the conditions it adds to `(hover:hover)`.
					$inner = sgs_touch_hover_missing_touch( $node['children'], $existing, $ctx . sgs_touch_hover_remainder_ctx( $rest ) );
					$touch = ( '' === $inner || '' === $rest ) ? $inner : '@media ' . $rest . '{' . $inner . '}';
				}
				$out .= $touch . $node['prelude'] . '{' . sgs_touch_hover_emit( $node['children'], $in_mouse || null !== $rest, $existing, $ctx . sgs_touch_hover_ctx( $node['prelude'] ) ) . '}';
				continue;
			}
			$prelude = $node['prelude'];
			if ( ! $in_mouse && ( sgs_touch_hover_has_hover( $prelude ) || sgs_touch_hover_has_active( $prelude ) ) ) {
				$members = sgs_touch_hover_split_members( $prelude );
				$next    = sgs_touch_hover_contract_members( $members, false )['members'];
				if ( array_map( 'sgs_touch_hover_normalise', $next ) !== array_map( 'sgs_touch_hover_normalise', $members ) ) {
					$prelude = implode( ',', $next );
					foreach ( $next as $m ) {
						$existing[ sgs_touch_hover_rule_key( $ctx, $m, $node['body'] ) ] = true;
					}
				}
			}
			$out .= $prelude . '{' . $node['body'] . '}';
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_touch_hover_css' ) ) {
	/**
	 * Apply the hover-on-touch contract to finished CSS text (see this file's header).
	 *
	 * @param string $css CSS text.
	 * @return string The CSS, returned untouched when it carries no `:hover` or `:active`, or when its braces do not balance
	 *                (logged under WP_DEBUG).
	 */
	function sgs_touch_hover_css( string $css ): string {
		if ( ! sgs_touch_hover_has_hover( $css ) && ! sgs_touch_hover_has_active( $css ) ) {
			return $css;
		}
		$css = (string) preg_replace( '#/\*.*?\*/#s', '', $css );
		if ( substr_count( $css, '{' ) !== substr_count( $css, '}' ) ) {
			// Unbalanced text is printed as it came rather than re-cut by a parser that cannot trust it.
			sgs_touch_hover_log( 'braces do not balance, so the CSS was printed as it came: ' . substr( trim( $css ), 0, 80 ) );
			return $css;
		}
		$len  = strlen( $css );
		$i    = 0;
		$tree = array();
		while ( $i < $len ) {
			$closed = false;
			array_push( $tree, ...sgs_touch_hover_parse( $css, $i, $closed ) );
			if ( $closed ) {
				// The parse stopped at a closing brace with no block open: keep it as text and read on.
				$tree[] = array(
					'type' => 'raw',
					'text' => '}',
				);
			}
		}
		$existing = array();
		if ( 1 === preg_match( '/\(\s*hover\s*:\s*hover\s*\)/i', $css ) ) {
			sgs_touch_hover_members_in( $tree, $existing );
		}
		return sgs_touch_hover_emit( $tree, false, $existing, '' );
	}
}

if ( ! function_exists( 'sgs_hover_guarded_rule' ) ) {
	/**
	 * Build a hover-only rule under the hover-on-touch contract: the touch half, then the guarded mouse half.
	 *
	 * Pass ONLY selectors carrying `:hover`. Focus selectors must be emitted separately by the caller, unguarded.
	 *
	 * @param string $hover_selector One or more comma-separated `:hover` selectors.
	 * @param string $decls          CSS declarations, no braces.
	 * @return string A complete rule, or '' when either input is empty.
	 */
	function sgs_hover_guarded_rule( string $hover_selector, string $decls ): string {
		$decls          = trim( $decls );
		$hover_selector = trim( $hover_selector );

		if ( '' === $hover_selector || '' === $decls ) {
			return '';
		}

		$members = sgs_touch_hover_contract_members( sgs_touch_hover_split_members( $hover_selector ), false )['members'];
		// The touch halves first, so every guarded mouse member stays one unbroken run in the selector.
		usort( $members, static fn ( $a, $b ) => (int) sgs_touch_hover_has_hover( $a ) <=> (int) sgs_touch_hover_has_hover( $b ) );

		return implode( ',', $members ) . '{' . $decls . '}';
	}
}

if ( ! function_exists( 'sgs_focus_rests_active' ) ) {
	/**
	 * Whether the block rendering now keeps its resting look on keyboard focus (`sgsFocusRests`).
	 *
	 * `Sgs_Focus_Rests` (`includes/class-sgs-focus-rests.php`) keeps a per-block render stack and publishes the
	 * flag of the block on top, so a nested block without the setting is unaffected. Every emitter that pairs a hover
	 * rule with a `:focus-visible` or `:focus-within` twin of the same declarations skips the twin while this is true.
	 *
	 * @return bool
	 */
	function sgs_focus_rests_active(): bool {
		return ! empty( $GLOBALS['sgs_focus_rests_active'] );
	}
}

if ( ! function_exists( 'sgs_hover_state_rules' ) ) {
	/**
	 * Emit a hover state as a PAIR: a guarded hover rule plus an unguarded
	 * focus rule carrying the identical declarations.
	 *
	 * Replaces the `{sel}:hover,{sel}:focus-x{decls}` one-rule shape that every
	 * paint helper used before 2026-09-03. While `sgs_focus_rests_active()` is true (the block's `sgsFocusRests`
	 * setting) the focus rule is left out.
	 *
	 * @param string $selector One or more comma-separated base selectors.
	 * @param string $decls    CSS declarations, no braces.
	 * @param string $focus    Focus pseudo-class, e.g. ':focus-visible'. ':focus-within' is emitted as
	 *                         both ':focus-visible' (the element itself) and ':has(:focus-visible)' (a descendant),
	 *                         so keyboard focus paints it and a tap or click does not.
	 * @param string $suffix   Optional pseudo-element suffix, e.g. '::after'.
	 * @return string Both rules concatenated, or '' when inputs are empty.
	 */
	function sgs_hover_state_rules( string $selector, string $decls, string $focus = ':focus-visible', string $suffix = '' ): string {
		$decls    = trim( $decls );
		$selector = trim( $selector );

		if ( '' === $selector || '' === $decls ) {
			return '';
		}

		// A `:focus-within` target can take focus itself (a button or link), which `:has()` never matches, so it gets both.
		$focuses = ':focus-within' === $focus ? array( ':focus-visible', ':has(:focus-visible)' ) : array( $focus );

		$parts = array_map( 'trim', explode( ',', $selector ) );

		$hover_selector = implode(
			',',
			array_map(
				static function ( $part ) use ( $suffix ) {
					return $part . ':hover' . $suffix;
				},
				$parts
			)
		);

		$focus_selector = implode(
			',',
			array_map(
				static function ( $part ) use ( $focuses, $suffix ) {
					return implode(
						',',
						array_map(
							static function ( $state ) use ( $part, $suffix ) {
								return $part . $state . $suffix;
							},
							$focuses
						)
					);
				},
				$parts
			)
		);

		// Group hovered (Spec 38A §6.2 `source: group`): while a block whose motion hover uses the group source renders,
		// the motion renderer sets this flag, and the nearest `[data-sgs-hover-group]` ancestor's hover and
		// focus-visible-within drive the same declarations.
		if ( ! empty( $GLOBALS['sgs_hover_group_active'] ) ) {
			foreach ( $parts as $part ) {
				$hover_selector .= ',[data-sgs-hover-group]:hover ' . $part . $suffix;
				$focus_selector .= ',[data-sgs-hover-group]:has(:focus-visible) ' . $part . $suffix;
			}
		}

		// Keyboard focus keeps the resting look (`sgsFocusRests`): the guarded hover rule only; the focus ring is
		// focus.css's.
		if ( sgs_focus_rests_active() ) {
			return sgs_hover_guarded_rule( $hover_selector, $decls );
		}

		return sgs_hover_guarded_rule( $hover_selector, $decls )
			. $focus_selector . '{' . $decls . '}';
	}
}

if ( ! function_exists( 'sgs_hover_media_wrap' ) ) {
	/**
	 * Pass an ALREADY-BUILT rule string through the hover-on-touch contract.
	 *
	 * For callers that receive a finished rule string from another helper (an `@supports` companion, for instance)
	 * and so cannot hand over a selector/declaration pair. Such a caller prefixes SGS_HOVER_NOT_TOUCH onto the hover
	 * selector it passes to that helper; this wrapper adds each rule's touch half. `scripts/hover-guard/php-hover-scan.php`
	 * recognises the pair as guarded.
	 *
	 * @param string $rule One or more complete CSS rules.
	 * @return string The rules under the contract, or '' when the input is empty.
	 */
	function sgs_hover_media_wrap( string $rule ): string {
		return sgs_touch_hover_css( trim( $rule ) );
	}
}
