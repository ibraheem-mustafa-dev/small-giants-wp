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

if ( ! function_exists( 'sgs_touch_hover_has_hover' ) ) {
	/**
	 * Whether a selector carries `:hover` as a pseudo-class.
	 *
	 * @param string $selector Selector text.
	 * @return bool
	 */
	function sgs_touch_hover_has_hover( string $selector ): bool {
		return 1 === preg_match( '/:hover(?![\w-])/i', $selector );
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
		return 1 === preg_match( '/:active(?![\w-])/i', $selector );
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

if ( ! function_exists( 'sgs_touch_hover_member' ) ) {
	/**
	 * The touch half of one member: every `:hover` and `:active` becomes `.sgs-pressed`.
	 *
	 * @param string $member A selector member, without the mouse guard.
	 * @return array{selector:string,negated:bool}|null Null when a state follows a pseudo-element.
	 */
	function sgs_touch_hover_member( string $member ): ?array {
		$negated = false;
		while ( preg_match( '/:(?:hover|active)(?![\w-])/i', $member, $m, PREG_OFFSET_CAPTURE ) ) {
			$at     = (int) $m[0][1];
			$before = substr( $member, 0, $at );
			// The open parentheses around this state, and where its compound starts (after the last combinator).
			$opens = array();
			$start = 0;
			for ( $i = 0, $n = strlen( $before ); $i < $n; $i++ ) {
				$c = $before[ $i ];
				if ( '(' === $c ) {
					$opens[] = $i;
				} elseif ( ')' === $c ) {
					array_pop( $opens );
				} elseif ( ' ' === $c || '>' === $c || '+' === $c || '~' === $c ) {
					$start = $i + 1;
				}
			}
			$floor    = $opens ? (int) end( $opens ) + 1 : 0;
			$compound = substr( $before, max( $start, $floor ) );
			if ( 1 === preg_match( '/::|:(?:before|after|first-line|first-letter)(?![\w-])/i', $compound ) ) {
				return null;
			}
			foreach ( $opens as $open ) {
				if ( 1 === preg_match( '/:not$/i', substr( $before, 0, $open ) ) ) {
					$negated = true;
				}
			}
			$member = $before . '.' . SGS_PRESSED_CLASS . substr( $member, $at + strlen( $m[0][0] ) );
		}
		return array(
			'selector' => $member,
			'negated'  => $negated,
		);
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
			$plain = 0 === strpos( $m, SGS_HOVER_NOT_TOUCH ) ? trim( substr( $m, strlen( SGS_HOVER_NOT_TOUCH ) ) ) : $m;
			if ( sgs_touch_hover_has_hover( $plain ) && 1 !== preg_match( '/^(?:::|:root\b|html\b)/i', $plain ) ) {
				$t = sgs_touch_hover_member( $plain );
				if ( null !== $t ) {
					$half = $t['negated'] ? SGS_HOVER_TOUCH_ONLY . ' ' . $t['selector'] : $t['selector'];
					if ( $in_mouse ) {
						$touch[] = $half;
					} else {
						$out[] = $half;
					}
				}
				$out[] = $in_mouse ? $m : SGS_HOVER_NOT_TOUCH . ' ' . $plain;
				continue;
			}
			$out[] = $m;
			if ( ! sgs_touch_hover_has_hover( $m ) && sgs_touch_hover_has_active( $m ) ) {
				$t = sgs_touch_hover_member( $m );
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

if ( ! function_exists( 'sgs_touch_hover_is_mouse_media' ) ) {
	/**
	 * Whether an at-rule prelude is a mouse-only media query (`(hover:hover)` without `not`).
	 *
	 * @param string $prelude At-rule prelude.
	 * @return bool
	 */
	function sgs_touch_hover_is_mouse_media( string $prelude ): bool {
		$p = strtolower( (string) preg_replace( '/\s+/', '', $prelude ) );
		return 0 === strpos( $p, '@media' ) && false !== strpos( $p, '(hover:hover)' ) && false === strpos( $p, 'not' );
	}
}

if ( ! function_exists( 'sgs_touch_hover_members_in' ) ) {
	/**
	 * Every selector member in a parsed tree, whitespace-normalised, as lookup keys.
	 *
	 * @param array<int,array<string,mixed>> $nodes Parsed nodes.
	 * @param array<string,bool>             $set   Collected members.
	 * @return void
	 */
	function sgs_touch_hover_members_in( array $nodes, array &$set ): void {
		foreach ( $nodes as $node ) {
			if ( 'rule' === $node['type'] ) {
				foreach ( sgs_touch_hover_split_members( $node['prelude'] ) as $m ) {
					$set[ sgs_touch_hover_normalise( $m ) ] = true;
				}
			} elseif ( 'block' === $node['type'] ) {
				sgs_touch_hover_members_in( $node['children'], $set );
			}
		}
	}
}

if ( ! function_exists( 'sgs_touch_hover_missing_touch' ) ) {
	/**
	 * The touch halves a mouse media block's hover rules lack anywhere in the CSS, as rules to print before it.
	 *
	 * @param array<int,array<string,mixed>> $nodes    The mouse block's children.
	 * @param array<string,bool>             $existing Every member in the CSS; extended with what is added.
	 * @return string
	 */
	function sgs_touch_hover_missing_touch( array $nodes, array &$existing ): string {
		$out = '';
		foreach ( $nodes as $node ) {
			if ( 'block' === $node['type'] ) {
				$inner = sgs_touch_hover_missing_touch( $node['children'], $existing );
				if ( '' !== $inner ) {
					$out .= sgs_touch_hover_is_mouse_media( $node['prelude'] ) ? $inner : $node['prelude'] . '{' . $inner . '}';
				}
				continue;
			}
			if ( 'rule' !== $node['type'] || ! sgs_touch_hover_has_hover( $node['prelude'] ) ) {
				continue;
			}
			$missing = array();
			foreach ( sgs_touch_hover_contract_members( sgs_touch_hover_split_members( $node['prelude'] ), true )['touch'] as $half ) {
				$key = sgs_touch_hover_normalise( $half );
				if ( ! isset( $existing[ $key ] ) ) {
					$existing[ $key ] = true;
					$missing[]        = $half;
				}
			}
			if ( $missing ) {
				$out .= implode( ',', $missing ) . '{' . $node['body'] . '}';
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
	 * @param array<string,bool>|null        $existing Every member in the CSS, built on first need.
	 * @param array<int,array<string,mixed>> $all      The whole tree, for $existing.
	 * @return string
	 */
	function sgs_touch_hover_emit( array $nodes, bool $in_mouse, ?array &$existing, array $all ): string {
		$out = '';
		foreach ( $nodes as $node ) {
			if ( 'raw' === $node['type'] ) {
				$out .= $node['text'];
				continue;
			}
			if ( 'block' === $node['type'] ) {
				$mouse = sgs_touch_hover_is_mouse_media( $node['prelude'] );
				$touch = '';
				if ( $mouse && ! $in_mouse ) {
					// The touch halves a mouse block is missing print just before it, inside the other at-rules it sits in.
					if ( null === $existing ) {
						$existing = array();
						sgs_touch_hover_members_in( $all, $existing );
					}
					$touch = sgs_touch_hover_missing_touch( $node['children'], $existing );
				}
				$out .= $touch . $node['prelude'] . '{' . sgs_touch_hover_emit( $node['children'], $in_mouse || $mouse, $existing, $all ) . '}';
				continue;
			}
			$prelude = $node['prelude'];
			if ( ! $in_mouse && ( sgs_touch_hover_has_hover( $prelude ) || sgs_touch_hover_has_active( $prelude ) ) ) {
				$members = sgs_touch_hover_split_members( $prelude );
				$next    = sgs_touch_hover_contract_members( $members, false )['members'];
				if ( array_map( 'sgs_touch_hover_normalise', $next ) !== array_map( 'sgs_touch_hover_normalise', $members ) ) {
					$prelude = implode( ',', $next );
					if ( null !== $existing ) {
						foreach ( $next as $m ) {
							$existing[ sgs_touch_hover_normalise( $m ) ] = true;
						}
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
	 * @return string The CSS, returned untouched when it carries no `:hover` or `:active`.
	 */
	function sgs_touch_hover_css( string $css ): string {
		if ( ! sgs_touch_hover_has_hover( $css ) && ! sgs_touch_hover_has_active( $css ) ) {
			return $css;
		}
		$css  = (string) preg_replace( '#/\*.*?\*/#s', '', $css );
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
		$existing = null;
		return sgs_touch_hover_emit( $tree, false, $existing, $tree );
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
