<?php
/**
 * Design-token resolution helpers for SGS block server-side rendering.
 *
 * Provides sgs_attr_has_value(), sgs_is_css_colour(), sgs_colour_value(),
 * sgs_shadow_value(), sgs_font_size_value(), and sgs_transition_vars() —
 * converting design token slugs to CSS custom properties and passing raw
 * CSS values through unchanged.
 *
 * @package SGS\Blocks
 */

/**
 * Determine whether an attribute value is meaningfully set.
 *
 * WordPress passes `type:"string"` attributes with `default:""` into render.php
 * as an empty string, not null. A bare `null !== $val` check wrongly fires for
 * those absent-attr cases, causing `floatval("")` = 0.0 to emit e.g. `padding-top:0px`.
 *
 * This helper returns `true` only when the value is neither null nor an empty string,
 * so it is safe to use as the gate for CSS emission. Numeric zero (`0` or `"0"`) returns
 * `true` because that is a legitimate explicitly-set value (e.g. `padding-top:0px` when
 * the operator intentionally wants zero padding).
 *
 * Typical usage (replaces bare `null !== $val` in CSS emission guards):
 *
 *   if ( sgs_attr_has_value( $padding_top ) ) {
 *       $style_parts[] = 'padding-top:' . floatval( $padding_top ) . esc_attr( $padding_unit );
 *   }
 *
 * @param mixed $val The attribute value to test.
 * @return bool True if the value is neither null nor empty string; false otherwise.
 */
function sgs_attr_has_value( $val ): bool {
	if ( null === $val ) {
		return false;
	}
	if ( '' === $val ) {
		return false;
	}
	return true;
}

/**
 * Determine whether a value is a direct CSS colour rather than a design token slug.
 *
 * Handles all modern CSS colour formats:
 * - Hex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
 * - Functional: rgb(), rgba(), hsl(), hsla(), oklch(), lch(), oklab(), lab(), hwb()
 * - Named keywords: red, blue, transparent, currentColor, inherit, etc.
 *
 * @param string $value The value to test.
 * @return bool True if the value is a CSS colour, false if it looks like a slug.
 */
function sgs_is_css_colour( string $value ): bool {
	$value = trim( $value );

	if ( '' === $value ) {
		return false;
	}

	// Hex colours: #RGB, #RGBA, #RRGGBB, #RRGGBBAA.
	if ( preg_match( '/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $value ) ) {
		return true;
	}

	// Functional colour notations.
	if ( preg_match( '/^(rgb|rgba|hsl|hsla|oklch|lch|oklab|lab|hwb)\s*\(/i', $value ) ) {
		return true;
	}

	// CSS named colour keywords (complete list per CSS Color Level 4).
	$named_colours = array(
		'aliceblue',
		'antiquewhite',
		'aqua',
		'aquamarine',
		'azure',
		'beige',
		'bisque',
		'black',
		'blanchedalmond',
		'blue',
		'blueviolet',
		'brown',
		'burlywood',
		'cadetblue',
		'chartreuse',
		'chocolate',
		'coral',
		'cornflowerblue',
		'cornsilk',
		'crimson',
		'cyan',
		'darkblue',
		'darkcyan',
		'darkgoldenrod',
		'darkgray',
		'darkgreen',
		'darkgrey',
		'darkkhaki',
		'darkmagenta',
		'darkolivegreen',
		'darkorange',
		'darkorchid',
		'darkred',
		'darksalmon',
		'darkseagreen',
		'darkslateblue',
		'darkslategray',
		'darkslategrey',
		'darkturquoise',
		'darkviolet',
		'deeppink',
		'deepskyblue',
		'dimgray',
		'dimgrey',
		'dodgerblue',
		'firebrick',
		'floralwhite',
		'forestgreen',
		'fuchsia',
		'gainsboro',
		'ghostwhite',
		'gold',
		'goldenrod',
		'gray',
		'green',
		'greenyellow',
		'grey',
		'honeydew',
		'hotpink',
		'indianred',
		'indigo',
		'ivory',
		'khaki',
		'lavender',
		'lavenderblush',
		'lawngreen',
		'lemonchiffon',
		'lightblue',
		'lightcoral',
		'lightcyan',
		'lightgoldenrodyellow',
		'lightgray',
		'lightgreen',
		'lightgrey',
		'lightpink',
		'lightsalmon',
		'lightseagreen',
		'lightskyblue',
		'lightslategray',
		'lightslategrey',
		'lightsteelblue',
		'lightyellow',
		'lime',
		'limegreen',
		'linen',
		'magenta',
		'maroon',
		'mediumaquamarine',
		'mediumblue',
		'mediumorchid',
		'mediumpurple',
		'mediumseagreen',
		'mediumslateblue',
		'mediumspringgreen',
		'mediumturquoise',
		'mediumvioletred',
		'midnightblue',
		'mintcream',
		'mistyrose',
		'moccasin',
		'navajowhite',
		'navy',
		'oldlace',
		'olive',
		'olivedrab',
		'orange',
		'orangered',
		'orchid',
		'palegoldenrod',
		'palegreen',
		'paleturquoise',
		'palevioletred',
		'papayawhip',
		'peachpuff',
		'peru',
		'pink',
		'plum',
		'powderblue',
		'purple',
		'rebeccapurple',
		'red',
		'rosybrown',
		'royalblue',
		'saddlebrown',
		'salmon',
		'sandybrown',
		'seagreen',
		'seashell',
		'sienna',
		'silver',
		'skyblue',
		'slateblue',
		'slategray',
		'slategrey',
		'snow',
		'springgreen',
		'steelblue',
		'tan',
		'teal',
		'thistle',
		'tomato',
		'turquoise',
		'violet',
		'wheat',
		'white',
		'whitesmoke',
		'yellow',
		'yellowgreen',
		// Special keywords.
		'transparent',
		'currentcolor',
		'inherit',
		'initial',
		'unset',
	);

	if ( in_array( strtolower( $value ), $named_colours, true ) ) {
		return true;
	}

	return false;
}

/**
 * Normalise a functional-colour notation — rgb()/rgba()/hsl()/hsla() — to a hex
 * string (6-digit, or 8-digit `#RRGGBBAA` when an alpha < 1 is present).
 *
 * WHY THIS EXISTS (universal, proven 2026-07-10): WordPress's
 * `safecss_filter_attr()` — applied to EVERY inline `style` value by
 * `get_block_wrapper_attributes()`, AND to any scoped real-property value — SILENTLY
 * STRIPS a declaration whose value is `rgb()`/`rgba()`/`hsl()`/`hsla()` (functional
 * notation is NOT on core's allowed-function list), while hex + named keywords + var()
 * survive. So a cloned/authored functional colour (e.g. the selected-pill tint
 * `rgba(230,138,149,0.1)`) is dropped and the element falls back to its default. Every
 * SGS colour value flows through `sgs_colour_value()`, so normalising there fixes it
 * once for every block + every context (hex conversion is lossless, incl. alpha).
 *
 * Any value that is NOT a functional-colour notation (hex, named keyword, `var()`,
 * `transparent`, `currentColor`) is returned unchanged.
 *
 * @param string $value A CSS colour string.
 * @return string A hex colour, or the original value if not functional notation.
 */
function sgs_functional_colour_to_hex( string $value ): string {
	$v = trim( $value );

	// rgb()/rgba() — comma OR space separated; alpha after a comma or slash.
	if ( preg_match( '/^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)\s*(?:[,\/]\s*([\d.]+%?)\s*)?\)$/i', $v, $m ) ) {
		$r = sgs_css_channel_to_255( $m[1] );
		$g = sgs_css_channel_to_255( $m[2] );
		$b = sgs_css_channel_to_255( $m[3] );
		$hex = sprintf( '#%02X%02X%02X', $r, $g, $b );
		if ( isset( $m[4] ) && '' !== $m[4] ) {
			$a = sgs_css_alpha_to_255( $m[4] );
			if ( $a < 255 ) {
				$hex .= sprintf( '%02X', $a );
			}
		}
		return $hex;
	}

	// hsl()/hsla() — hue (optional deg), sat%, light%, optional alpha.
	if ( preg_match( '/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[,\/]\s*([\d.]+%?)\s*)?\)$/i', $v, $m ) ) {
		return sgs_rgb_to_hex( sgs_hsl_to_rgb( (float) $m[1], (float) $m[2], (float) $m[3] ), $m[4] ?? '' );
	}

	// hwb(H W% B%) — CSS Color 4.
	if ( preg_match( '/^hwb\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[,\/]\s*([\d.]+%?)\s*)?\)$/i', $v, $m ) ) {
		return sgs_rgb_to_hex( sgs_hwb_to_rgb( (float) $m[1], (float) $m[2], (float) $m[3] ), $m[4] ?? '' );
	}

	// oklch(L C H) — L 0-1 or %, C 0-~0.4 or % (of 0.4), H deg.
	if ( preg_match( '/^oklch\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+)(?:deg)?\s*(?:[,\/]\s*([\d.]+%?)\s*)?\)$/i', $v, $m ) ) {
		$l   = sgs_css_num_or_pct( $m[1], 1.0 );
		$c   = sgs_css_num_or_pct( $m[2], 0.4 );
		$h   = deg2rad( (float) $m[3] );
		return sgs_rgb_to_hex( sgs_oklab_to_rgb( $l, $c * cos( $h ), $c * sin( $h ) ), $m[4] ?? '' );
	}

	// oklab(L a b) — L 0-1 or %, a/b ~-0.4..0.4 (or % of 0.4).
	if ( preg_match( '/^oklab\(\s*([\d.]+%?)[\s,]+(-?[\d.]+%?)[\s,]+(-?[\d.]+%?)\s*(?:[,\/]\s*([\d.]+%?)\s*)?\)$/i', $v, $m ) ) {
		return sgs_rgb_to_hex(
			sgs_oklab_to_rgb( sgs_css_num_or_pct( $m[1], 1.0 ), sgs_css_num_or_pct( $m[2], 0.4 ), sgs_css_num_or_pct( $m[3], 0.4 ) ),
			$m[4] ?? ''
		);
	}

	// lch(L C H) — L 0-100 or %, C 0-~150 or % (of 150), H deg.
	if ( preg_match( '/^lch\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+)(?:deg)?\s*(?:[,\/]\s*([\d.]+%?)\s*)?\)$/i', $v, $m ) ) {
		$l   = sgs_css_num_or_pct( $m[1], 100.0 );
		$c   = sgs_css_num_or_pct( $m[2], 150.0 );
		$h   = deg2rad( (float) $m[3] );
		return sgs_rgb_to_hex( sgs_lab_to_rgb( $l, $c * cos( $h ), $c * sin( $h ) ), $m[4] ?? '' );
	}

	// lab(L a b) — L 0-100 or %, a/b ~-125..125 (or % of 125).
	if ( preg_match( '/^lab\(\s*([\d.]+%?)[\s,]+(-?[\d.]+%?)[\s,]+(-?[\d.]+%?)\s*(?:[,\/]\s*([\d.]+%?)\s*)?\)$/i', $v, $m ) ) {
		return sgs_rgb_to_hex(
			sgs_lab_to_rgb( sgs_css_num_or_pct( $m[1], 100.0 ), sgs_css_num_or_pct( $m[2], 125.0 ), sgs_css_num_or_pct( $m[3], 125.0 ) ),
			$m[4] ?? ''
		);
	}

	return $value;
}

/**
 * Build a hex string from an RGB triple (each 0-255) + an optional CSS alpha
 * token (0-1 float or a percentage). Emits 8-digit `#RRGGBBAA` only when the
 * alpha resolves to < 255 (opaque stays 6-digit).
 *
 * @param array{0:int,1:int,2:int} $rgb       RGB triple.
 * @param string                   $alpha_tok Alpha token, or '' for opaque.
 * @return string Hex colour.
 */
function sgs_rgb_to_hex( array $rgb, string $alpha_tok = '' ): string {
	$hex = sprintf( '#%02X%02X%02X', $rgb[0], $rgb[1], $rgb[2] );
	if ( '' !== $alpha_tok ) {
		$a = sgs_css_alpha_to_255( $alpha_tok );
		if ( $a < 255 ) {
			$hex .= sprintf( '%02X', $a );
		}
	}
	return $hex;
}

/**
 * Resolve a CSS number-or-percentage token. A percentage is taken as a fraction
 * of `$pct_base`; a bare number is returned as-is.
 *
 * @param string $tok      Token, e.g. "0.7", "70%", "-0.1".
 * @param float  $pct_base The value 100% maps to.
 * @return float Resolved number.
 */
function sgs_css_num_or_pct( string $tok, float $pct_base ): float {
	$tok = trim( $tok );
	if ( str_ends_with( $tok, '%' ) ) {
		return (float) rtrim( $tok, '%' ) / 100 * $pct_base;
	}
	return (float) $tok;
}

/**
 * Gamma-encode a linear-sRGB channel (0-1) to a clamped 0-255 byte.
 *
 * @param float $c Linear channel value.
 * @return int Clamped 0-255 value.
 */
function sgs_linear_srgb_to_255( float $c ): int {
	$c = $c <= 0.0031308 ? 12.92 * $c : 1.055 * ( $c ** ( 1 / 2.4 ) ) - 0.055;
	return (int) max( 0, min( 255, round( $c * 255 ) ) );
}

/**
 * CSS Color 4 hwb() → RGB (each 0-255). H degrees, W/B percent (0-100).
 *
 * @param float $h Hue degrees.
 * @param float $w Whiteness percent.
 * @param float $b Blackness percent.
 * @return array{0:int,1:int,2:int} RGB triple.
 */
function sgs_hwb_to_rgb( float $h, float $w, float $b ): array {
	$w /= 100;
	$b /= 100;
	if ( $w + $b >= 1 ) {
		$grey = (int) round( $w / ( $w + $b ) * 255 );
		return array( $grey, $grey, $grey );
	}
	$pure = sgs_hsl_to_rgb( $h, 100, 50 ); // pure hue at full saturation.
	$out  = array();
	foreach ( $pure as $c ) {
		$cn    = $c / 255;
		$out[] = (int) round( ( $cn * ( 1 - $w - $b ) + $w ) * 255 );
	}
	return $out;
}

/**
 * OKLab → sRGB (each 0-255). Björn Ottosson's canonical matrices.
 *
 * @param float $lightness L (0-1).
 * @param float $a         a axis.
 * @param float $b         b axis.
 * @return array{0:int,1:int,2:int} RGB triple.
 */
function sgs_oklab_to_rgb( float $lightness, float $a, float $b ): array {
	$l_ = $lightness + 0.3963377774 * $a + 0.2158037573 * $b;
	$m_ = $lightness - 0.1055613458 * $a - 0.0638541728 * $b;
	$s_ = $lightness - 0.0894841775 * $a - 1.2914855480 * $b;
	$l  = $l_ ** 3;
	$m  = $m_ ** 3;
	$s  = $s_ ** 3;
	$r  = 4.0767416621 * $l - 3.3077115913 * $m + 0.2309699292 * $s;
	$g  = -1.2684380046 * $l + 2.6097574011 * $m - 0.3413193965 * $s;
	$bl = -0.0041960863 * $l - 0.7034186147 * $m + 1.7076147010 * $s;
	return array( sgs_linear_srgb_to_255( $r ), sgs_linear_srgb_to_255( $g ), sgs_linear_srgb_to_255( $bl ) );
}

/**
 * CIE Lab (D50) → sRGB (each 0-255) — via XYZ(D50) → linear sRGB with the
 * CSS Color 4 Bradford-adapted D50→D65 matrix.
 *
 * @param float $lightness L (0-100).
 * @param float $a         a axis.
 * @param float $b         b axis.
 * @return array{0:int,1:int,2:int} RGB triple.
 */
function sgs_lab_to_rgb( float $lightness, float $a, float $b ): array {
	$fy = ( $lightness + 16 ) / 116;
	$fx = $fy + $a / 500;
	$fz = $fy - $b / 200;
	$e  = 216 / 24389;
	$k  = 24389 / 27;

	$xr = $fx ** 3 > $e ? $fx ** 3 : ( 116 * $fx - 16 ) / $k;
	$yr = $lightness > $k * $e ? $fy ** 3 : $lightness / $k;
	$zr = $fz ** 3 > $e ? $fz ** 3 : ( 116 * $fz - 16 ) / $k;

	// D50 reference white.
	$x = $xr * ( 0.3457 / 0.3585 );
	$y = $yr;
	$z = $zr * ( ( 1 - 0.3457 - 0.3585 ) / 0.3585 );

	// XYZ(D50) → linear sRGB (CSS Color 4 matrix, Bradford-adapted).
	$r  = 3.1341359569958707 * $x - 1.6173863321612437 * $y - 0.4906619460083532 * $z;
	$g  = -0.978795502912089 * $x + 1.916254567259083 * $y + 0.03344273116131949 * $z;
	$bl = 0.07195537988411677 * $x - 0.2289768646400821 * $y + 1.405386058324125 * $z;
	return array( sgs_linear_srgb_to_255( $r ), sgs_linear_srgb_to_255( $g ), sgs_linear_srgb_to_255( $bl ) );
}

/**
 * Normalise EVERY functional-colour occurrence (rgb/rgba/hsl/hsla) EMBEDDED in a
 * compound CSS value string to hex — e.g. a box-shadow `0 2px 4px rgba(0,0,0,0.1)`
 * → `0 2px 4px #0000001A`, or a comma-separated multi-shadow. Same safecss reason
 * as sgs_functional_colour_to_hex (which handles a BARE colour) — but for values
 * where the colour is one token among many (shadow, gradient). Non-colour tokens +
 * hex + keywords + var() are untouched.
 *
 * @param string $value A compound CSS value string.
 * @return string The value with functional colours rewritten to hex.
 */
function sgs_normalise_css_functional_colours( string $value ): string {
	return (string) preg_replace_callback(
		'/(?:rgba?|hsla?)\([^()]*\)/i',
		static function ( array $m ): string {
			return sgs_functional_colour_to_hex( $m[0] );
		},
		$value
	);
}

/**
 * Convert an rgb() channel token (0-255 integer or a percentage) to 0-255.
 *
 * @param string $tok Channel token, e.g. "230" or "50%".
 * @return int Clamped 0-255 value.
 */
function sgs_css_channel_to_255( string $tok ): int {
	$tok = trim( $tok );
	if ( str_ends_with( $tok, '%' ) ) {
		$n = (float) rtrim( $tok, '%' ) * 2.55;
	} else {
		$n = (float) $tok;
	}
	return (int) max( 0, min( 255, round( $n ) ) );
}

/**
 * Convert a CSS alpha token (0-1 float or a percentage) to a 0-255 byte.
 *
 * @param string $tok Alpha token, e.g. "0.1" or "10%".
 * @return int Clamped 0-255 value.
 */
function sgs_css_alpha_to_255( string $tok ): int {
	$tok = trim( $tok );
	if ( str_ends_with( $tok, '%' ) ) {
		$a = (float) rtrim( $tok, '%' ) / 100;
	} else {
		$a = (float) $tok;
	}
	return (int) max( 0, min( 255, round( $a * 255 ) ) );
}

/**
 * Convert HSL to RGB (each 0-255). H in degrees, S/L in percent (0-100).
 *
 * @param float $h Hue in degrees.
 * @param float $s Saturation percent (0-100).
 * @param float $l Lightness percent (0-100).
 * @return array{0:int,1:int,2:int} RGB triple.
 */
function sgs_hsl_to_rgb( float $h, float $s, float $l ): array {
	$h = fmod( $h, 360 ) / 360;
	if ( $h < 0 ) {
		++$h;
	}
	$s = max( 0, min( 100, $s ) ) / 100;
	$l = max( 0, min( 100, $l ) ) / 100;

	if ( 0.0 === $s ) {
		$val = (int) round( $l * 255 );
		return array( $val, $val, $val );
	}

	$q = $l < 0.5 ? $l * ( 1 + $s ) : $l + $s - $l * $s;
	$p = 2 * $l - $q;

	$hue2rgb = static function ( float $p, float $q, float $t ): float {
		if ( $t < 0 ) {
			++$t;
		}
		if ( $t > 1 ) {
			--$t;
		}
		if ( $t < 1 / 6 ) {
			return $p + ( $q - $p ) * 6 * $t;
		}
		if ( $t < 1 / 2 ) {
			return $q;
		}
		if ( $t < 2 / 3 ) {
			return $p + ( $q - $p ) * ( 2 / 3 - $t ) * 6;
		}
		return $p;
	};

	return array(
		(int) round( $hue2rgb( $p, $q, $h + 1 / 3 ) * 255 ),
		(int) round( $hue2rgb( $p, $q, $h ) * 255 ),
		(int) round( $hue2rgb( $p, $q, $h - 1 / 3 ) * 255 ),
	);
}

/**
 * Resolve a colour attribute value to a CSS colour string.
 *
 * If the value is a raw CSS colour (hex, rgb, named, etc.) it is returned
 * escaped as-is. If it is a design token slug, it is wrapped in a CSS custom
 * property reference: var(--wp--preset--color--{slug}).
 *
 * @param string|null $slug_or_value A CSS colour string or a design token slug.
 * @return string A CSS colour value, or an empty string if input is empty.
 */
function sgs_colour_value( ?string $slug_or_value ): string {
	if ( ! $slug_or_value ) {
		return '';
	}

	$value = trim( $slug_or_value );

	// Raw CSS colour OR an already-formed CSS custom-property reference passes
	// through untouched. The `var(` passthrough mirrors the sibling
	// sgs_shadow_value() (D281): a cloned button carries the draft's faithful
	// `var(--border)` / `var(--primary)` in colourBorder etc.; without this the
	// slug-sanitiser strips it to `var--border` and emits the malformed
	// `var(--wp--preset--color--var--border)`, which resolves to currentColor
	// (proven live 2026-07-05 on the ghost button — a dark border where the draft
	// wants the light `var(--border)`).
	if ( str_starts_with( $value, 'var(' ) ) {
		return esc_attr( $value );
	}

	if ( sgs_is_css_colour( $value ) ) {
		// Normalise functional-colour notations (rgb/rgba/hsl/hsla) to hex —
		// WordPress's safecss_filter_attr() strips them from every inline style
		// (and scoped real-property value), so a cloned/authored functional colour
		// would be silently dropped. Hex + named keywords pass through unchanged.
		// Universal: every SGS colour flows through here (see
		// sgs_functional_colour_to_hex). Proven live 2026-07-10.
		return esc_attr( sgs_functional_colour_to_hex( $value ) );
	}

	// Sanitise slug to valid WordPress preset characters only (prevents CSS injection).
	$slug = preg_replace( '/[^a-z0-9-]/', '', strtolower( $value ) );

	return 'var(--wp--preset--color--' . $slug . ')';
}

/**
 * Resolve a shadow attribute value to a CSS box-shadow string.
 *
 * If the value is already a raw CSS shadow (contains a digit early in the
 * string, or starts with `var(`, `0 `, `rgb`, `inset`) it is returned
 * escaped as-is. Otherwise it is treated as a design token slug and wrapped
 * in a CSS custom property reference: var(--wp--preset--shadow--{slug}).
 *
 * Universal — mirrors sgs_colour_value() / sgs_font_size_value() shape.
 *
 * @param string|null $slug_or_value A CSS shadow string or a design token slug.
 * @return string A CSS box-shadow value, or empty string if input is empty.
 */
function sgs_shadow_value( ?string $slug_or_value ): string {
	if ( ! $slug_or_value ) {
		return '';
	}

	$value = trim( $slug_or_value );

	// Raw CSS shadow detection — any of the indicators below means
	// "don't wrap in preset var, pass through".
	$is_raw = (
		str_starts_with( $value, 'var(' ) ||
		str_starts_with( $value, 'inset' ) ||
		str_starts_with( $value, 'rgb' ) ||
		str_starts_with( $value, '0 ' ) ||
		(bool) preg_match( '/^\d/', $value )
	);

	if ( $is_raw ) {
		// Normalise any embedded rgb/rgba/hsl colour to hex so a raw box-shadow
		// (e.g. `0 2px 4px rgba(0,0,0,0.1)`) survives safecss_filter_attr() when it
		// is emitted inline — proven live 2026-07-10 (safecss strips box-shadow with
		// a functional-colour token). Non-colour tokens + hex + var() are untouched.
		return esc_attr( sgs_normalise_css_functional_colours( $value ) );
	}

	// Sanitise slug to valid WordPress preset characters only.
	$slug = preg_replace( '/[^a-z0-9-]/', '', strtolower( $value ) );

	return 'var(--wp--preset--shadow--' . $slug . ')';
}

/**
 * Validate a CSS gradient value for safe emission into a scoped rule / custom
 * property.
 *
 * SECURITY: a prefix-only check (e.g. does the string START with
 * `linear-gradient(`) is NOT sufficient sanitisation — anything after the
 * opening paren, including a declaration-breakout (`;position:fixed;...`) or
 * a `url(...)` network fetch, would still pass and be emitted verbatim. This
 * helper instead requires the ENTIRE value to be one fully-bounded gradient
 * function built only from a safe character set, then defence-in-depth
 * rejects any residual breakout/URL/markup token.
 *
 * Universal — any block accepting an operator/cloned CSS gradient string
 * MUST route it through this helper before emission (mirrors
 * sgs_colour_value() / sgs_shadow_value() shape).
 *
 * @param string|null $value Raw gradient attribute value.
 * @return string The safe gradient string, or an empty string if rejected.
 */
function sgs_css_gradient_value( ?string $value ): string {
	$value = trim( (string) $value );

	if ( '' === $value ) {
		return '';
	}

	// Must be exactly one gradient function, fully bounded end-to-end, built
	// only from a safe character set (letters, digits, whitespace, . , % ( ) # -).
	if ( ! preg_match( '/^(repeating-)?(linear|radial|conic)-gradient\([A-Za-z0-9\s.,%()#\-]+\)$/i', $value ) ) {
		return '';
	}

	// Defence in depth: reject anything that could break out of a declaration,
	// fetch a URL, or inject markup — even if it somehow satisfied the character
	// class above (e.g. via a nested paren sequence).
	if ( preg_match( '/[;{}]|url\s*\(|<|>|@|expression/i', $value ) ) {
		return '';
	}

	return $value;
}

/**
 * Resolve a font-size attribute value to a CSS font-size string.
 *
 * If the value starts with a digit (e.g. "16px", "1.5em") or with "clamp(",
 * it is treated as a raw CSS value and returned escaped. Otherwise it is
 * treated as a design token slug: var(--wp--preset--font-size--{slug}).
 *
 * @param string|null $slug_or_value A CSS font-size string or a design token slug.
 * @return string A CSS font-size value, or an empty string if input is empty.
 */
function sgs_font_size_value( ?string $slug_or_value ): string {
	if ( ! $slug_or_value ) {
		return '';
	}

	$value = trim( $slug_or_value );

	// Raw CSS value: only permit <number><unit> or clamp() — block injection attempts.
	if ( preg_match( '/^\d+(\.\d+)?(px|em|rem|vh|vw|vmin|vmax|ch|ex|%)$/', $value ) ) {
		return $value;
	}
	if ( 0 === strpos( $value, 'clamp(' ) ) {
		$sanitised = safecss_filter_attr( 'font-size:' . $value );
		return $sanitised ? $value : '';
	}

	// Sanitise slug to valid WordPress preset characters only.
	$slug = preg_replace( '/[^a-z0-9-]/', '', strtolower( $value ) );

	return 'var(--wp--preset--font-size--' . $slug . ')';
}

/**
 * Build CSS custom properties for transition duration and easing.
 *
 * Extracts transition attributes from a block and returns an array of
 * CSS custom property strings. Used by 8+ blocks that share the same
 * hover transition controls.
 *
 * @param array $attributes Block attributes containing transitionDuration and transitionEasing.
 * @return array CSS custom property strings (e.g. '--sgs-transition-duration:300ms').
 */
function sgs_transition_vars( array $attributes ): array {
	$styles = array();

	$duration    = $attributes['transitionDuration'] ?? '';
	$duration_ms = preg_replace( '/[^0-9]/', '', $duration );
	$duration_ms = '' !== $duration_ms ? $duration_ms : '300';
	$styles[]    = '--sgs-transition-duration:' . $duration_ms . 'ms';

	$easing          = $attributes['transitionEasing'] ?? '';
	$allowed_easings = array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' );
	$safe_easing     = in_array( $easing, $allowed_easings, true ) ? $easing : 'ease-in-out';
	$styles[]        = '--sgs-transition-easing:' . $safe_easing;

	return $styles;
}
