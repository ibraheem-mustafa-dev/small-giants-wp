<?php
/**
 * Colour-string parsing shared by the text-contrast and surface-tone helpers: a solid colour
 * value to hex plus alpha, and a top-level comma split for CSS function arguments.
 *
 * Palette slugs resolve through sgs_resolve_palette_hex() (helpers-colour-wcag.php), which
 * requires this file, so the two are always loaded together.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolve a SOLID colour value to a 6-digit hex plus its own alpha (0.0-1.0).
 *
 * Accepts hex (#RGB/#RRGGBB, alpha 1.0), 8-digit hex (#RRGGBBAA, alpha is the
 * trailing byte), `rgb()`/`rgba()` (commas or spaces, alpha from the optional
 * 4th channel or `/` syntax), keywords `black`/`white`, a bare palette slug, or
 * `var(--wp--preset--color--SLUG)` (resolved via sgs_resolve_palette_hex() and
 * re-parsed once — an entry can itself be any of the forms above).
 *
 * Returns array('hex' => '', 'alpha' => 1.0) for anything else (empty,
 * `transparent`, `inherit`, `currentColor`, a gradient, an unknown slug, junk)
 * — never throws or emits a warning.
 *
 * @param string $value Colour value as stored in a block attribute.
 * @return array{hex: string, alpha: float} Hex ('' when unresolvable) + alpha.
 */
function sgs_colour_resolve_hex_alpha( string $value ): array {
	$value = trim( $value );
	$none  = array(
		'hex'   => '',
		'alpha' => 1.0,
	);

	if ( '' === $value ) {
		return $none;
	}

	$lower = strtolower( $value );
	if ( 'transparent' === $lower ) {
		return $none;
	}
	if ( 'black' === $lower ) {
		return array(
			'hex'   => '#000000',
			'alpha' => 1.0,
		);
	}
	if ( 'white' === $lower ) {
		return array(
			'hex'   => '#ffffff',
			'alpha' => 1.0,
		);
	}

	// 3/6-digit hex: opaque.
	if ( 1 === preg_match( '/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value ) ) {
		return array(
			'hex'   => $value,
			'alpha' => 1.0,
		);
	}

	// 8-digit hex: #RRGGBBAA — alpha is the trailing byte.
	if ( 1 === preg_match( '/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})$/', $value, $matches ) ) {
		return array(
			'hex'   => '#' . $matches[1],
			'alpha' => round( hexdec( $matches[2] ) / 255, 4 ),
		);
	}

	// rgb()/rgba(): comma- or space-separated channels, optional alpha
	// (a trailing comma/space/slash-separated 4th value, plain 0-1 or a %).
	if ( 1 === preg_match( '/^rgba?\(\s*([0-9]{1,3})[\s,]+([0-9]{1,3})[\s,]+([0-9]{1,3})(?:[\s,\/]+([0-9.]+%?))?\s*\)$/i', $value, $matches ) ) {
		$r     = max( 0, min( 255, (int) $matches[1] ) );
		$g     = max( 0, min( 255, (int) $matches[2] ) );
		$b     = max( 0, min( 255, (int) $matches[3] ) );
		$alpha = 1.0;
		if ( isset( $matches[4] ) && '' !== $matches[4] ) {
			$alpha = str_ends_with( $matches[4], '%' )
				? max( 0.0, min( 100.0, (float) rtrim( $matches[4], '%' ) ) ) / 100
				: max( 0.0, min( 1.0, (float) $matches[4] ) );
		}
		return array(
			'hex'   => sprintf( '#%02x%02x%02x', $r, $g, $b ),
			'alpha' => $alpha,
		);
	}

	// Palette var / bare slug — resolve then re-parse once (guarded against a
	// slug resolving to itself, which would recurse forever).
	$slug = '';
	if ( 1 === preg_match( '/^var\(\s*--wp--preset--color--([a-z0-9-]+)\s*\)$/', $value, $matches ) ) {
		$slug = $matches[1];
	} elseif ( 1 === preg_match( '/^[a-z0-9-]+$/', $value ) ) {
		$slug = $value;
	}

	if ( '' !== $slug ) {
		$resolved = sgs_resolve_palette_hex( $slug );
		if ( '' !== $resolved && $resolved !== $value ) {
			return sgs_colour_resolve_hex_alpha( $resolved );
		}
	}

	return $none;
}

/**
 * Split a comma-separated CSS argument list on TOP-LEVEL commas only —
 * i.e. commas that are not nested inside a function call's parentheses.
 * A gradient's colour stops are comma-separated, but a stop's own colour
 * can itself be a function containing commas (`rgb(0, 0, 0)`,
 * `var(--a, --b)`), so a naive `explode(',', …)` would shred those in half.
 *
 * @param string $value The inner argument list of a gradient function.
 * @return array<int, string> Trimmed top-level segments.
 */
function sgs_split_top_level_commas( string $value ): array {
	$parts   = array();
	$depth   = 0;
	$current = '';
	$length  = strlen( $value );

	for ( $i = 0; $i < $length; $i++ ) {
		$char = $value[ $i ];
		if ( '(' === $char ) {
			++$depth;
		} elseif ( ')' === $char ) {
			--$depth;
		}
		if ( ',' === $char && 0 === $depth ) {
			$parts[] = trim( $current );
			$current = '';
			continue;
		}
		$current .= $char;
	}
	if ( '' !== trim( $current ) ) {
		$parts[] = trim( $current );
	}

	return $parts;
}
