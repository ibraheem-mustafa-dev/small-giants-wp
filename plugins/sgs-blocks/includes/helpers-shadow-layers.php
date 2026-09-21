<?php
/**
 * Layered box-shadow composer: the ONE place a stored shadow becomes CSS.
 *
 * A stored shadow is two ordinary text attributes:
 *
 *   shape   — layers separated by top-level commas, each `[inset] X Y [BLUR [SPREAD]]`
 *             (lengths in px, a bare `0` is legal), OR a bare theme preset slug, OR `none`.
 *   colour  — one entry for every layer, or a comma list matching the layers. An entry is
 *             `site` (the one site-wide shadow colour), a palette slug, or a CSS colour,
 *             optionally followed by an opacity: `site 12%`.
 *
 * Nothing is filtered by blocklist. Every layer is parsed into fields and re-emitted from
 * those fields, so only what the grammar understands can reach the page. Input that does
 * not parse is dropped, never passed through. Limits are enforced here, not in the editor:
 * UI limits are not security.
 *
 * A layer's opacity `color-mix()` is BUILT here from the parsed colour and percentage, never stored
 * (same approach as sgs_surface_fill_alpha()); only a theme preset's own strict one passes through.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-css-safety.php';
require_once __DIR__ . '/helpers-tokens.php';

const SGS_SHADOW_MAX_BYTES      = 2000;
const SGS_SHADOW_MAX_LAYERS     = 8;
const SGS_SHADOW_MAX_COLOURS    = 64;
const SGS_SHADOW_DEFAULT_COLOUR = '#0000001A';
const SGS_SHADOW_SITE_COLOUR    = 'var(--wp--custom--shadow-colour, #000000)';

/**
 * Split on top-level separators only (a linear scanner, never a regex).
 *
 * Parentheses are counted so `rgb(0, 0, 0)` stays whole. A stray `)` is ignored; an unclosed `(`
 * swallows the rest, which then fails the grammar. Comma splits keep empty entries (a colour
 * list needs them); whitespace splits drop them.
 *
 * @param string $value Text to split.
 * @param string $sep   ',' or ' ' (any whitespace).
 * @return string[] Trimmed parts.
 */
function sgs_shadow_split_top( string $value, string $sep ): array {
	$parts = array();
	$depth = 0;
	$buf   = '';
	$len   = strlen( $value );
	for ( $i = 0; $i < $len; $i++ ) {
		$c = $value[ $i ];
		if ( '(' === $c ) {
			++$depth;
		} elseif ( ')' === $c && $depth > 0 ) {
			--$depth;
		}
		$is_sep = 0 === $depth && ( ',' === $sep ? ',' === $c : ctype_space( $c ) );
		if ( $is_sep ) {
			$parts[] = trim( $buf );
			$buf     = '';
			continue;
		}
		$buf .= $c;
	}
	$parts[] = trim( $buf );
	if ( ',' !== $sep ) {
		$parts = array_values(
			array_filter(
				$parts,
				static function ( $part ) {
					return '' !== $part;
				}
			)
		);
	}
	return $parts;
}

/**
 * Parse one length token: an optional minus, up to 4 digits and 3 decimals, optional `px`.
 * A bare `0` is legal. Anything else (em, %, exponents, calc) is not.
 *
 * @param string $token Candidate token.
 * @return float|null The number, or null when it is not a legal length.
 */
function sgs_shadow_parse_length( string $token ): ?float {
	if ( ! preg_match( '/^-?(?:\d{1,4}(?:\.\d{1,3})?|\.\d{1,3})(?:px)?$/', $token ) ) {
		return null;
	}
	return (float) $token;
}

/**
 * Format a number as a px length with no trailing zeros ("4px", "0.5px", "0px").
 *
 * @param float $value Number.
 * @return string CSS length.
 */
function sgs_shadow_format_length( float $value ): string {
	$text = rtrim( rtrim( number_format( $value, 3, '.', '' ), '0' ), '.' );
	if ( '' === $text || '-0' === $text ) {
		$text = '0';
	}
	return $text . 'px';
}

/**
 * Is a resolved colour safe to emit? Balanced parentheses, at most 3 deep, no comment
 * openers or closers, no `!`, no control characters, and nothing sgs_css_value_has_breakout()
 * rejects.
 *
 * @param string $css Resolved colour value.
 * @return bool True when safe.
 */
function sgs_shadow_colour_is_safe( string $css ): bool {
	if ( '' === $css || strlen( $css ) > 200 || sgs_css_value_has_breakout( $css ) ) {
		return false;
	}
	if ( 1 === preg_match( '#/\*|\*/|!|[\x00-\x1F]#', $css ) ) {
		return false;
	}
	$depth = 0;
	$deep  = 0;
	$len   = strlen( $css );
	for ( $i = 0; $i < $len; $i++ ) {
		if ( '(' === $css[ $i ] ) {
			$deep = max( $deep, ++$depth );
		} elseif ( ')' === $css[ $i ] && --$depth < 0 ) {
			return false;
		}
	}
	return 0 === $depth && $deep <= 3;
}

/**
 * Resolve ONE colour-list entry (`site`, a palette slug or CSS colour, plus an optional
 * `N%` opacity) to a CSS colour. Opacity below 100 becomes a color-mix() built here.
 *
 * @param string $entry Colour-list entry.
 * @return string|null CSS colour, or null when the entry is not understood.
 */
function sgs_shadow_resolve_colour( string $entry ): ?string {
	$tokens = sgs_shadow_split_top( trim( $entry ), ' ' );
	$alpha  = 100.0;
	if ( count( $tokens ) > 1 && preg_match( '/^(\d{1,3}(?:\.\d)?)%$/', $tokens[ count( $tokens ) - 1 ], $match ) ) {
		$alpha = min( 100.0, (float) $match[1] );
		array_pop( $tokens );
	}
	// A colour is a hex code, a keyword, a palette slug or a function: never something that
	// starts like a number (`1e9999px` is not a colour).
	if ( 1 !== count( $tokens ) || 1 !== preg_match( '/^[#a-z]/i', $tokens[0] ) ) {
		return null;
	}
	// A theme preset carries ONE strict `color-mix(in srgb, <site|palette var|hex> N%, transparent)`; no other.
	$is_mix = 1 === preg_match( '/^color-mix\(in srgb, (?:var\(--wp--custom--shadow-colour\)|var\(--wp--preset--color--[a-z0-9-]+\)|#[0-9a-f]{6}(?:[0-9a-f]{2})?) \d{1,3}(?:\.\d)?%, transparent\)$/i', $tokens[0] );
	if ( ! $is_mix && 0 === stripos( $tokens[0], 'color-mix(' ) ) {
		return null;
	}
	$css = 'site' === $tokens[0] ? SGS_SHADOW_SITE_COLOUR : ( $is_mix ? $tokens[0] : sgs_colour_value( $tokens[0] ) );
	if ( ! sgs_shadow_colour_is_safe( $css ) ) {
		return null;
	}
	if ( $alpha >= 100.0 ) {
		return $css;
	}
	return 'color-mix(in srgb, ' . $css . ' ' . rtrim( rtrim( number_format( $alpha, 1, '.', '' ), '0' ), '.' ) . '%, transparent)';
}

/**
 * Parse one shadow layer into fields. `inset` may be first or last (any case). 2 to 4
 * lengths. An optional single colour token is an embedded colour (draft-style values).
 * Blur may not be negative. Values are clamped: blur 0 to 100, offsets and spread -200 to 200.
 *
 * @param string $layer One layer of text.
 * @return array{inset:bool,x:float,y:float,blur:float,spread:float,colour:?string}|null Fields, or null when it does not parse.
 */
function sgs_shadow_parse_layer( string $layer ): ?array {
	$tokens = sgs_shadow_split_top( trim( $layer ), ' ' );
	$last   = count( $tokens ) - 1;
	$inset  = false;
	$nums   = array();
	$colour = null;
	foreach ( $tokens as $index => $token ) {
		if ( 'inset' === strtolower( $token ) ) {
			if ( $inset || ( 0 !== $index && $last !== $index ) ) {
				return null;
			}
			$inset = true;
			continue;
		}
		$length = sgs_shadow_parse_length( $token );
		if ( null !== $length ) {
			$nums[] = $length;
			continue;
		}
		if ( null !== $colour ) {
			return null;
		}
		$colour = $token;
	}
	if ( count( $nums ) < 2 || count( $nums ) > 4 || ( $nums[2] ?? 0.0 ) < 0.0 ) {
		return null;
	}
	return array(
		'inset'  => $inset,
		'x'      => max( -200.0, min( 200.0, $nums[0] ) ),
		'y'      => max( -200.0, min( 200.0, $nums[1] ) ),
		'blur'   => max( 0.0, min( 100.0, $nums[2] ?? 0.0 ) ),
		'spread' => max( -200.0, min( 200.0, $nums[3] ?? 0.0 ) ),
		'colour' => $colour,
	);
}

/**
 * Compose a stored shadow (shape text + colour text) into a CSS `box-shadow` value.
 *
 * @param string|null $shape  Layers, a bare preset slug, or `none`.
 * @param string|null $colour One colour entry for all layers, or a list matching the layers.
 * @return string CSS value, or '' when there is nothing to draw.
 */
function sgs_shadow_layers( ?string $shape, ?string $colour ): string {
	$shape = trim( (string) $shape );
	if ( '' === $shape || strlen( $shape ) > SGS_SHADOW_MAX_BYTES ) {
		return '';
	}
	if ( 'none' === strtolower( $shape ) ) {
		return 'none';
	}
	if ( 1 === preg_match( '/^[a-z][a-z0-9-]*$/i', $shape ) && 'inset' !== strtolower( $shape ) ) {
		return 'var(--wp--preset--shadow--' . strtolower( $shape ) . ')';
	}
	$layers = sgs_shadow_split_top( $shape, ',' );
	if ( count( $layers ) > SGS_SHADOW_MAX_LAYERS ) {
		return '';
	}
	$list = '' === trim( (string) $colour ) ? array() : array_slice( sgs_shadow_split_top( (string) $colour, ',' ), 0, SGS_SHADOW_MAX_COLOURS );
	$out  = array();
	$last = '';
	foreach ( $layers as $index => $text ) {
		$fields = sgs_shadow_parse_layer( $text );
		$entry  = $list[ $index ] ?? '';
		if ( '' !== $entry ) {
			$last = $entry;
		}
		if ( null === $fields ) {
			continue;
		}
		if ( null !== $fields['colour'] ) {
			$css = sgs_shadow_resolve_colour( $fields['colour'] );
		} elseif ( '' !== $last ) {
			$css = sgs_shadow_resolve_colour( $last );
		} else {
			$css = SGS_SHADOW_DEFAULT_COLOUR;
		}
		if ( null === $css ) {
			continue;
		}
		$out[] = ( $fields['inset'] ? 'inset ' : '' )
			. sgs_shadow_format_length( $fields['x'] ) . ' '
			. sgs_shadow_format_length( $fields['y'] ) . ' '
			. sgs_shadow_format_length( $fields['blur'] ) . ' '
			. sgs_shadow_format_length( $fields['spread'] ) . ' ' . $css;
	}
	return implode( ', ', $out );
}

/**
 * The forced-colours (high-contrast) fallback. Browsers remove box-shadow in that mode,
 * so an element that depends on its shadow for an edge would vanish. This nested rule
 * gives it a 1px outline in the system text colour instead, only in that mode and not
 * while the element has keyboard focus (a block's own focus ring wins).
 *
 * It rides inside the shadow's own declaration list, so it needs no selector.
 *
 * @return string One nested at-rule, ready to sit beside other declarations.
 */
function sgs_shadow_forced_colours_decl(): string {
	return '@media (forced-colors:active){&:not(:focus-visible){outline:1px solid CanvasText;outline-offset:-1px}}';
}

/**
 * The full `box-shadow` declaration set for a stored shadow: the declaration plus its
 * forced-colours fallback. Empty when there is nothing to draw; no fallback for `none`.
 *
 * @param string|null $shape  Stored shape.
 * @param string|null $colour Stored colour text.
 * @return string[] Declarations, ready to implode with ';'.
 */
function sgs_shadow_box_decls( ?string $shape, ?string $colour ): array {
	$value = sgs_shadow_layers( $shape, $colour );
	if ( '' === $value ) {
		return array();
	}
	$decls = array( 'box-shadow:' . $value );
	if ( 'none' !== $value ) {
		$decls[] = sgs_shadow_forced_colours_decl();
	}
	return $decls;
}
