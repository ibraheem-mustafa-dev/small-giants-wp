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

// This file's helpers delegate to sgs_css_length_value() (Spec 32 §6.1 (a2)).
// Require it HERE, not just via render-helpers.php, because a render.php may
// require_once this file directly without ever loading render-helpers.php —
// without this line those pages would fatal on "Call to undefined function
// sgs_css_length_value()". Both files guard with function_exists(), so load
// order does not matter — only that both load before either is CALLED.
require_once __DIR__ . '/helpers-css-safety.php';

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
 * True when a CSS VALUE contains a declaration/rule-breakout or URL-fetch
 * token and must not be emitted into a scoped `<style>` element.
 *
 * SECURITY (2026-07-28). `esc_attr()` alone blocks markup breakout
 * (`</style>`, quotes) but leaves `;`, `{`, `}` intact — and the token
 * helpers' raw-passthrough branches (`var(...)` colours, raw box-shadows,
 * unrecognised functional colours falling through the normaliser unchanged)
 * are concatenated into scoped `<style>` elements by dozens of render
 * surfaces. A stored attr like `rgb(0,0,0);}body{position:fixed;...}`
 * passed the prefix-only checks and injected arbitrary CSS site-wide.
 * Mirrors the standard sgs_css_gradient_value() already documents ("a
 * prefix-only check is NOT sufficient sanitisation"). A legitimate value
 * (lengths, hex/named colours, `inset`, commas, `var()`, `calc()`) never
 * contains any rejected token, so this fails closed with zero false drops.
 *
 * @param string $value Candidate CSS value (post-normalisation).
 * @return bool True when the value must be REJECTED.
 */
function sgs_css_value_has_breakout( string $value ): bool {
	return (bool) preg_match( '/[;{}<>"\'`\\\\]|url\s*\(|expression\s*\(|@/i', $value );
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
		$r   = sgs_css_channel_to_255( $m[1] );
		$g   = sgs_css_channel_to_255( $m[2] );
		$b   = sgs_css_channel_to_255( $m[3] );
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
		$l = sgs_css_num_or_pct( $m[1], 1.0 );
		$c = sgs_css_num_or_pct( $m[2], 0.4 );
		$h = deg2rad( (float) $m[3] );
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
		$l = sgs_css_num_or_pct( $m[1], 100.0 );
		$c = sgs_css_num_or_pct( $m[2], 150.0 );
		$h = deg2rad( (float) $m[3] );
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
		// SECURITY: reject a declaration breakout riding the passthrough
		// (`var(--x);}body{...}`) — see sgs_css_value_has_breakout().
		return sgs_css_value_has_breakout( $value ) ? '' : esc_attr( $value );
	}

	if ( sgs_is_css_colour( $value ) ) {
		// Normalise functional-colour notations (rgb/rgba/hsl/hsla) to hex —
		// WordPress's safecss_filter_attr() strips them from every inline style
		// (and scoped real-property value), so a cloned/authored functional colour
		// would be silently dropped. Hex + named keywords pass through unchanged.
		// Universal: every SGS colour flows through here (see
		// sgs_functional_colour_to_hex). Proven live 2026-07-10.
		//
		// SECURITY: sgs_is_css_colour()'s functional-notation test is
		// PREFIX-ONLY (`^rgb\s*\(`, unanchored tail), and the normaliser's
		// anchored patterns return an unrecognised value UNCHANGED — so
		// `rgb(0,0,0);}body{...}` reached this return intact. Reject any
		// breakout before emission (see sgs_css_value_has_breakout()).
		$hex = sgs_functional_colour_to_hex( $value );
		return sgs_css_value_has_breakout( $hex ) ? '' : esc_attr( $hex );
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
		//
		// SECURITY (2026-07-28): this raw value reaches scoped <style>
		// elements in every caller (container wrapper, cta-section,
		// trust-bar, …); reject any declaration breakout before emission —
		// see sgs_css_value_has_breakout().
		$normalised = sgs_normalise_css_functional_colours( $value );
		if ( sgs_css_value_has_breakout( $normalised ) ) {
			return '';
		}
		return esc_attr( $normalised );
	}

	// Sanitise slug to valid WordPress preset characters only.
	$slug = preg_replace( '/[^a-z0-9-]/', '', strtolower( $value ) );

	return 'var(--wp--preset--shadow--' . $slug . ')';
}

/**
 * Compose a shadow SHAPE (offset-x/offset-y/blur/spread + optional `inset`,
 * no embedded colour — `ShadowControl`'s stored value under the shadow
 * colour-architecture redesign, D621/D622) with a separate colour attribute
 * into the final CSS `box-shadow` value.
 *
 * `$shape` may also be a bare theme shadow preset SLUG (self-contained —
 * colour already baked in by `theme.json` `settings.shadow.presets`), in
 * which case `$colour` is ignored and `sgs_shadow_value()` resolves the slug
 * to `var(--wp--preset--shadow--{slug})` exactly as before this split. Only
 * a RAW shape (starts with a digit or `inset`) gets the colour appended.
 *
 * @param string|null $shape  Raw shape string "X Y BLUR SPREAD" (optionally
 *                            "inset " prefixed) or a bare preset slug.
 * @param string|null $colour Colour value (hex/hex8/rgba/theme slug) — ignored
 *                            when $shape resolves to a preset slug.
 * @return string CSS box-shadow value, or '' when $shape is empty.
 */
function sgs_shadow_value_composed( ?string $shape, ?string $colour ): string {
	if ( ! $shape ) {
		return '';
	}

	$shape = trim( $shape );

	$is_raw_shape = (bool) preg_match( '/^(inset\s+)?-?[\d.]+px/i', $shape ) || 0 === strpos( $shape, 'inset' );

	if ( ! $is_raw_shape ) {
		// Bare preset slug — self-contained, no colour to compose in.
		return sgs_shadow_value( $shape );
	}

	$resolved_colour = sgs_colour_value( $colour ? $colour : '' );
	if ( '' === $resolved_colour ) {
		$resolved_colour = 'rgba(0,0,0,0.1)';
	}

	return sgs_shadow_value( $shape . ' ' . $resolved_colour );
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
	// only from a safe character set (letters, digits, whitespace, . , % ( ) # / _ -).
	//
	// `/` and `_` added 2026-08-16 (D643). Without `/`, CSS Color 4 slash syntax
	// (`rgb(0 0 0 / 50%)`, `hsl(210 50% 40% / .8)`) failed the match and the whole
	// gradient was silently dropped to '' — no error, no log, the solid colour just
	// painted instead. `_` admits custom-property names that carry an underscore.
	// Neither weakens the guard: `url(`, `;`, `{`, `}`, `<`, `>`, `@` and `expression`
	// are still rejected outright below, and CSS has no `//` or `/*` comment form
	// reachable from this character set (`*` is not in it).
	if ( ! preg_match( '/^(repeating-)?(linear|radial|conic)-gradient\([A-Za-z0-9\s.,%()#\/_\-]+\)$/i', $value ) ) {
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
 * Resolve a colour attribute + its sibling gradient attribute to the correct
 * `background-*` CSS declaration — Builder 1 of the D636 universal gradient
 * rollout (background-image mechanism).
 *
 * A non-empty, valid gradient ALWAYS wins over the flat colour — the same
 * resolution rule `GradientOverlayControl.js` already uses for the whole-block
 * overlay (D636), so the two mechanisms agree. `$gradient` is validated
 * through `sgs_css_gradient_value()`; `$colour` through `sgs_colour_value()`.
 *
 * Universal — any block emitting `background-color:<value>` from a flat
 * colour attribute should route through this helper once that attribute gains
 * a `{name}Gradient` sibling, rather than hand-rolling the win/flat check.
 *
 * @param string|null $colour   Flat colour attribute value (slug or CSS colour).
 * @param string|null $gradient Sibling gradient attribute value (CSS gradient string).
 * @return array{property:string,value:string} The winning CSS property + value,
 *                                              or `['property'=>'','value'=>'']` when both are empty.
 */
function sgs_background_paint_value( ?string $colour, ?string $gradient ): array {
	$gradient_value = sgs_css_gradient_value( $gradient );

	if ( '' !== $gradient_value ) {
		return array(
			'property' => 'background-image',
			'value'    => $gradient_value,
		);
	}

	$colour_value = sgs_colour_value( $colour );

	if ( '' === $colour_value ) {
		return array(
			'property' => '',
			'value'    => '',
		);
	}

	return array(
		'property' => 'background-color',
		'value'    => $colour_value,
	);
}

/**
 * Convenience wrapper around sgs_background_paint_value() that returns the
 * full CSS declaration string (`property:value`, no trailing semicolon) ready
 * to splice into a scoped rule, or an empty string when both inputs are empty.
 *
 * @param string|null $colour   Flat colour attribute value.
 * @param string|null $gradient Sibling gradient attribute value.
 * @return string CSS declaration (e.g. `background-color:#fff` or
 *                `background-image:linear-gradient(...)`), or `''`.
 */
function sgs_background_paint_decl( ?string $colour, ?string $gradient ): string {
	$paint = sgs_background_paint_value( $colour, $gradient );

	if ( '' === $paint['property'] ) {
		return '';
	}

	return $paint['property'] . ':' . $paint['value'];
}

/**
 * Move a block's own BLOCK BACKGROUND paint off the element itself onto a
 * `::after` pseudo-element layer, so a sibling text-gradient
 * (`sgs_text_colour_decl()`'s `background-clip:text`) painted on the SAME
 * element cannot overwrite it (both use `background-image`) or clip it to
 * the glyph shapes (both are subject to the same `background-clip`).
 *
 * WHY `::after` AND NOT `::before`: `sgs_border_gradient_css()` already owns
 * `::before` on every block this applies to (heading/text/label all call it
 * for their border-colour-gradient capability — a masked ring painted via
 * `{$selector}::before`). Two pseudo-elements cannot share one selector, so
 * this layer takes the only slot left. Paint order does not matter: both
 * pseudo-elements are absolutely positioned with `inset:0`, and this layer's
 * `z-index:-1` keeps it behind everything else inside the stacking context
 * `isolation:isolate` creates on the root — the border ring (auto z-index)
 * and the text glyphs both still paint above it regardless of source order.
 *
 * `isolation:isolate` (NOT `z-index:0`) is deliberate: `position:relative`
 * alone does not create a stacking context, so a `z-index:-1` child can
 * escape BEHIND an ancestor's own background (e.g. this element nested
 * inside an `sgs/container` that paints its own background) and vanish.
 * `isolation` creates the stacking context the negative z-index needs
 * without pulling the root itself out of `auto` stacking among its own
 * siblings — a side effect a bare `z-index:0` would additionally cause.
 *
 * A NO-OP (returns '') when both paint declarations are empty, so a block
 * with no background renders byte-identical CSS to before this helper
 * existed.
 *
 * @param string $selector         Scoped selector for the block root (e.g. `.{uid}.wp-block-sgs-heading`).
 * @param string $paint_decl       Resting-state paint, already resolved by `sgs_background_paint_decl()` (e.g. `background-color:...` or `background-image:...`). Empty = no resting paint.
 * @param string $hover_paint_decl Hover-state paint, same shape. Empty = no hover paint. Skipped when identical to $paint_decl.
 * @return string Scoped CSS (the root's position/isolation rule + one or two `::after` rules), or '' when there is no paint at all.
 */
function sgs_block_background_layer_css( string $selector, string $paint_decl, string $hover_paint_decl = '' ): string {
	if ( '' === $paint_decl && '' === $hover_paint_decl ) {
		return '';
	}

	// A comma-joined $selector (e.g. two alternate CTA markup shapes sharing
	// one style rule) must have `::after` appended to EVERY branch, not just
	// the last — plain string concatenation would silently drop the layer
	// from every branch but the final one. Mirrors sgs_hover_state_rules()'s
	// existing per-branch splitting (helpers-hover-state.php:109).
	$after_selector = implode(
		',',
		array_map(
			static function ( $part ) {
				return trim( $part ) . '::after';
			},
			explode( ',', $selector )
		)
	);

	$css  = "{$selector}{position:relative;isolation:isolate;}";
	$css .= "{$after_selector}{content:\"\";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;";
	$css .= $paint_decl . ';}';

	if ( '' !== $hover_paint_decl && $hover_paint_decl !== $paint_decl ) {
		$css .= sgs_hover_state_rules( $selector, $hover_paint_decl . ';', ':focus-within', '::after' );
	}

	return $css;
}

/**
 * Gradient sibling for a colour-valued custom property that has NO stable
 * CSS selector of its own to hang a direct scoped rule on (the shape
 * `sgs_fill_states_css()`/`sgs_block_background_layer_css()` both assume).
 * `survey.js`'s `paints-via-colour-valued-custom-property` refusal covers a
 * genuinely mixed population — 21 of the 29 rows measured 2026-09-04 DO have
 * a real selector and should migrate onto the direct helpers above instead
 * (this function is the wrong tool for those); this one is scoped to the
 * remainder.
 *
 * The trick: two SIBLING custom properties, not a conditional PHP branch.
 * `background-image` composites OVER `background-color` in CSS, so the
 * caller's EXISTING static style.css rule needs exactly ONE new line, added
 * ONCE, ever — `background-image: var(--{name}-gradient, none);` next to
 * its existing `background-color: var(--{name}, default)` — and an unset
 * gradient var falls back to `none`, leaving the flat colour to show through
 * completely unchanged. No `sgs_text_colour_decl()`-style branching is
 * needed because `background-color` (unlike `color`) never needs its value
 * blanked to `transparent` for the image layer to show — the two properties
 * are independent from the start.
 *
 * ⛔ Verify the ACTUAL style.css consumption before using this for a new
 * row — do not trust `survey.js`'s mechanism classification alone. Checked
 * live 2026-09-04: `sgs/icon.backgroundColour` looks identical from the
 * survey's own output but is actually TWO mechanisms depending on variant
 * (a direct `background-color:` declaration for the filled variant, this
 * custom-property shape only for the outline variant); `sgs/timeline.
 * connectorColour`'s var is ALSO reused as colour stops inside an unrelated
 * `repeating-linear-gradient()` elsewhere in the same stylesheet (the dashed-
 * line effect), so introducing a gradient sibling here would need to reason
 * about interaction with that existing usage first. Both were excluded from
 * this function's first two real callers for exactly this reason — read the
 * block's actual `style.css`/`style.scss`, every consumption site, before
 * applying this to a new row.
 *
 * A NO-OP (returns `[]`) when both inputs are empty, matching this file's
 * other paint helpers.
 *
 * @param string $var_name Custom-property name, WITHOUT the leading `--` and
 *                          WITHOUT a `-gradient` suffix (e.g. `sgs-tile-bg`).
 * @param string $flat     The resolved flat colour attribute value.
 * @param string $gradient The resolved gradient attribute value (raw —
 *                          validated internally via `sgs_css_gradient_value()`).
 * @return string[] Declarations (`--name:value`, no trailing `;`) to merge
 *                   into the caller's own custom-property array — the exact
 *                   same array the flat value already feeds
 *                   (`$css_vars[]`/`$root_var_decls[]`/`$wrapper_style_parts[]`
 *                   depending on the block).
 */
function sgs_custom_property_gradient_decls( string $var_name, string $flat, string $gradient ): array {
	$decls = array();
	if ( '' !== $flat ) {
		$decls[] = '--' . $var_name . ':' . sgs_colour_value( $flat );
	}
	$resolved_gradient = sgs_css_gradient_value( $gradient );
	if ( '' !== $resolved_gradient ) {
		$decls[] = '--' . $var_name . '-gradient:' . $resolved_gradient;
	}
	return $decls;
}

/**
 * Derive ONE of a gradient-overlay family's attribute names from its base.
 *
 * PHP twin of `gradientOverlayAttrName()` in
 * `src/components/GradientOverlayControl.js`. Both derive from one rule, so a
 * block names its base ONCE and neither side can typo the pairing.
 *
 * ⭐ ENUMERATED, NOT GENERALISED, and only HALF derivable. Every mount in the
 * tree (2026-08-26, all three in `sgs/hero`):
 *   `gradient` = `<base>Gradient`  — holds 3/3.
 *   `solid`    = `<base>` twice, `<base>Colour` once — NOT uniform, so it is
 *                defaulted and overridden, never derived from a second rule.
 * Deriving it would have named a non-existent attribute on one of the three,
 * and WP silently discards writes to undeclared attributes (D338).
 *
 * @param string $base Base attribute name, e.g. 'mediaOverlay'.
 * @param string $part One of 'gradient' | 'solid'.
 * @return string The attribute key, or '' for an unknown part.
 */
function sgs_gradient_overlay_attr( string $base, string $part = 'gradient' ): string {
	if ( '' === $base ) {
		return '';
	}
	if ( 'gradient' === $part ) {
		return $base . 'Gradient';
	}
	if ( 'solid' === $part ) {
		return $base;
	}
	return '';
}

/**
 * The attribute-key map for a gradient-overlay family.
 *
 * Feeds the value-taking consumers that already exist — `sgs_overlay_decls()`
 * and `sgs_background_paint_decl()` — so a render.php reads its two attributes
 * by ONE base name instead of two hand-typed keys.
 *
 * @param string      $base  Base attribute name, e.g. 'contentBackground'.
 * @param string|null $solid Override the solid-colour attribute name, for the
 *                           families that suffix it with `Colour`.
 * @return array{gradient:string, solid:string}
 */
function sgs_gradient_overlay_attr_map( string $base, ?string $solid = null ): array {
	return array(
		'gradient' => sgs_gradient_overlay_attr( $base, 'gradient' ),
		'solid'    => $solid ? $solid : sgs_gradient_overlay_attr( $base, 'solid' ),
	);
}

/**
 * Resolve an overlay LAYER's complete CSS declaration set — colour/gradient
 * paint plus its own opacity (D717, 2026-08-21) plus its own blend mode
 * (D6/Step 8, 2026-08-22).
 *
 * BLEND MODE IS OWNED HERE FOR THE SAME REASON OPACITY IS (D718's lesson,
 * applied on purpose rather than repeated): extracting a shared helper for
 * the VALUE while leaving a second overlay capability hand-rolled at each
 * call site is exactly how sgs/hero's overlay drifted from the wrapper's
 * before. Every future overlay capability goes through THIS function, not a
 * second emitter appended after it.
 *
 * WHY THIS EXISTS, and why it is a layer ABOVE sgs_background_paint_value()
 * rather than a widening of it: that helper answers one narrow question —
 * "given a flat colour and a sibling gradient, which background property
 * wins?" Opacity is not part of that question. It is a second, independent
 * declaration that only has meaning for an element deliberately layered OVER
 * something else, and pushing it down into the general paint resolver would
 * hand an overlay-only concept to every caller painting a plain background
 * (sgs/card-grid uses it for a card surface, where opacity means nothing).
 * So this composes that helper for the paint half and owns the layer concept
 * itself.
 *
 * THE DUPLICATION THIS REPLACES: the gradient-beats-colour check was
 * hand-rolled independently in TWO places — SGS_Container_Wrapper's
 * `.sgs-container__overlay` branch (which paints the overlay for seven of the
 * eight blocks mounting `<BackgroundPanel>`) and sgs/hero's own
 * `.sgs-hero__overlay` (hero passes `no_overlay => true` and paints its own).
 * Two copies of one concept had already begun to drift. Every future overlay
 * capability — the hover/tier siblings, blend mode — is now a single edit
 * here rather than two edits that can disagree.
 *
 * SUPERSEDES D581's D5 (2026-08-11), which deleted `backgroundOverlayOpacity`
 * on the reasoning that the colour picker's own alpha channel should be the
 * single transparency mechanism. D581 was RIGHT that one mechanism beats two
 * — do not read this as a reversal of that principle. It was wrong about
 * WHICH mechanism, because alpha's side effect was not known when the call
 * was made: `DesignTokenPicker` stores a palette SLUG only on exact string
 * equality with a palette entry, so altering the alpha breaks the match and
 * silently stores a raw hex, unlinking the client's brand token. Opacity is a
 * separate CSS property and leaves the stored colour untouched.
 *
 * NO-INLINE CONTRACT (Spec 32): the caller splices this into its own scoped
 * `.{uid} .sgs-*__overlay` rule. Nothing here rides inline on an element.
 *
 * @param string|null    $colour     Flat overlay colour (palette slug or CSS colour).
 * @param string|null    $gradient   Sibling gradient attribute (complete CSS gradient string).
 * @param int|float|null $opacity    Overlay opacity as a 0-100 PERCENTAGE (the attribute's
 *                                   stored shape). Null/absent emits no opacity declaration,
 *                                   so a block that has not adopted the attribute is unchanged.
 *                                   Clamped to 0-100; 100 emits nothing (it is the CSS default,
 *                                   and a redundant declaration is noise in every scoped rule).
 * @param string|null    $blend_mode `backgroundOverlayBlendMode` attribute value. Null/empty/
 *                                   'normal'/anything outside the allowed enum emits no
 *                                   declaration — 'normal' is the CSS default and an
 *                                   out-of-enum value is refused rather than passed through
 *                                   (the attribute's block.json enum is the source of truth;
 *                                   this allowlist mirrors it so a corrupted/hand-authored
 *                                   value can never reach the stylesheet unescaped).
 * @return string Declarations joined by `;`, no trailing semicolon (e.g.
 *                `background-color:var(--wp--preset--color--primary);opacity:0.3;mix-blend-mode:multiply`),
 *                or `''` when there is no paint at all.
 */
function sgs_overlay_decls( ?string $colour, ?string $gradient, $opacity = null, ?string $blend_mode = null ): string {
	$paint = sgs_background_paint_decl( $colour, $gradient );

	if ( '' === $paint ) {
		return '';
	}

	$decls = array( $paint );

	if ( null !== $opacity && '' !== $opacity && is_numeric( $opacity ) ) {
		$pct = max( 0.0, min( 100.0, (float) $opacity ) );
		if ( 100.0 !== $pct ) {
			// rtrim keeps `0.3` rather than `0.300000`; a bare `0` stays `0`.
			$decls[] = 'opacity:' . rtrim( rtrim( number_format( $pct / 100, 4, '.', '' ), '0' ), '.' );
		}
	}

	if ( null !== $blend_mode && '' !== $blend_mode && 'normal' !== $blend_mode ) {
		static $allowed_blend_modes = array(
			'multiply',
			'screen',
			'overlay',
			'darken',
			'lighten',
			'color-dodge',
			'color-burn',
			'soft-light',
			'hard-light',
			'difference',
			'exclusion',
		);
		if ( in_array( $blend_mode, $allowed_blend_modes, true ) ) {
			$decls[] = 'mix-blend-mode:' . $blend_mode;
		}
	}

	return implode( ';', $decls );
}

/**
 * Resolve a text-colour attribute (flat colour OR gradient string, D636
 * single-attribute storage) into a bare CSS declaration fragment — no
 * selector, no trailing `;`, matching the shape every block already pushes
 * onto its own `$decls[]`/`$text_decls[]` array (e.g.
 * `$text_decls[] = 'color:' . sgs_colour_value( $text_colour )` in
 * `heading/render.php`), so adopting gradient support is a one-line swap at
 * each call site rather than a restructure.
 *
 * D636 Task 1b "text" builder — the CSS mechanism for a gradient painted
 * through text glyphs is `background-clip: text` + `color: transparent`,
 * proven live first on `sgs/business-info`'s link-hover sweep (D643). A flat
 * colour (the common case — most instances of a text-colour attribute are
 * never set to a gradient) emits a plain `color:` declaration, byte-identical
 * to every attribute's previous behaviour.
 *
 * A gradient value additionally NEEDS `sgs_text_colour_gradient_fallback_rule()`
 * emitted as its own standalone rule (see that function) — this function
 * alone is not safe to use for a gradient without it, because `color:
 * transparent` with no `background-clip: text` support renders the text
 * INVISIBLE, not merely un-gradiented.
 *
 * @param string|null $value Stored attribute value — flat colour/slug or a
 *                            complete CSS gradient string.
 * @return string A single declaration fragment with no trailing `;`
 *                (e.g. `color:#fff` or
 *                `background-image:linear-gradient(...);-webkit-background-clip:text;background-clip:text;color:transparent`),
 *                or an empty string if $value is empty or an invalid gradient.
 */
function sgs_text_colour_decl( ?string $value ): string {
	$value = trim( (string) $value );

	if ( '' === $value ) {
		return '';
	}

	if ( ! preg_match( '/^(repeating-)?(linear|radial|conic)-gradient\(/i', $value ) ) {
		$colour = sgs_colour_value( $value );
		return '' === $colour ? '' : 'color:' . $colour;
	}

	$gradient = sgs_css_gradient_value( $value );
	if ( '' === $gradient ) {
		return '';
	}

	return 'background-image:' . $gradient . ';-webkit-background-clip:text;background-clip:text;color:transparent';
}

/**
 * The `@supports not (background-clip: text)` fallback rule that MUST
 * accompany `sgs_text_colour_decl()` whenever its input was a gradient (a
 * no-op — returns '' — for a flat colour, so it is always safe to call
 * unconditionally alongside the decl call).
 *
 * The fallback colour is the gradient's FIRST colour stop, extracted from
 * the already-validated gradient string (safe to slice — the whole string
 * has already passed `sgs_css_gradient_value()`'s character-class +
 * breakout gate), so an old browser gets a sensible solid colour instead of
 * an invisible `transparent` or a bare `inherit`.
 *
 * @param string      $selector Scoped CSS selector (already uid-prefixed by the caller) —
 *                               MUST be the exact same selector `sgs_text_colour_decl()`'s
 *                               declaration was emitted onto.
 * @param string|null $value    The same value passed to `sgs_text_colour_decl()`.
 * @return string A standalone `@supports` rule, or '' when $value is not a gradient.
 */
function sgs_text_colour_gradient_fallback_rule( string $selector, ?string $value ): string {
	$value = trim( (string) $value );

	if ( ! preg_match( '/^(repeating-)?(linear|radial|conic)-gradient\(/i', $value ) ) {
		return '';
	}

	$gradient = sgs_css_gradient_value( $value );
	if ( '' === $gradient ) {
		return '';
	}

	$fallback_colour = 'inherit';
	if ( preg_match( '/(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|var\(--wp--preset--color--[a-z0-9-]+\))/', $gradient, $stop_match ) ) {
		$fallback_colour = $stop_match[1];
	}

	return '@supports not ((background-clip:text) or (-webkit-background-clip:text)){' . $selector . '{background-image:none;color:' . esc_attr( $fallback_colour ) . ';}}';
}

/**
 * Resolve which of a text-colour attribute's two SIBLING values should be
 * used — the flat colour attribute, or its `{attr}Gradient` sibling.
 *
 * D636 storage correction (coordinator, 2026-08-16): the rollout does NOT
 * share one attribute slot between a flat colour and a gradient. It mirrors
 * `sgs/container`'s existing, shipped `backgroundOverlayColour` /
 * `overlayGradient` precedent (`class-sgs-container-wrapper.php` ~397-403) —
 * two sibling attributes, gradient wins when set and valid, the flat
 * attribute is left completely untouched. `sgs_text_colour_decl()` and
 * `sgs_text_colour_gradient_fallback_rule()` need NO change for this: they
 * already detect "is this a gradient function or a flat colour" from
 * whatever single value they're handed — this resolver just decides which
 * of the two sibling attributes that single value should be.
 *
 * @param string|null $flat_value     The flat-colour attribute's value (unchanged, never a gradient).
 * @param string|null $gradient_value The sibling `{attr}Gradient` attribute's value.
 * @return string The value to pass into `sgs_text_colour_decl()` /
 *                 `sgs_text_colour_gradient_fallback_rule()` — the gradient
 *                 string when valid and non-empty, otherwise the flat value
 *                 verbatim (untouched, even if empty).
 */
function sgs_resolve_text_colour_or_gradient( ?string $flat_value, ?string $gradient_value ): string {
	$gradient = sgs_css_gradient_value( (string) $gradient_value );
	return '' !== $gradient ? $gradient : (string) $flat_value;
}

/**
 * Split a `gridItemBorder`-style CSS border SHORTHAND string ("1px solid
 * #ccc") into its width/style/colour parts, order-independent.
 *
 * Mirrors `_gridBorderParts()` in
 * `container/components/ContainerWrapperControls.js` exactly (same
 * whitespace-split + fixed style-word list + width regex classification) —
 * PHP and JS must agree on which token is which, since the editor writes the
 * shorthand and render.php/the wrapper reads it back. Only the width part is
 * used by the gradient mechanism below (the colour part is superseded by the
 * gradient when one is set; the style part is untouched either way).
 *
 * @param string $value Raw shorthand string, e.g. "2px dashed #ccc".
 * @return array{width:string,style:string,colour:string}
 */
function sgs_grid_border_parts( string $value ): array {
	$parts = array(
		'width'  => '',
		'style'  => '',
		'colour' => '',
	);
	$style_words = array( 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none' );
	$tokens      = preg_split( '/\s+/', trim( $value ), -1, PREG_SPLIT_NO_EMPTY );
	if ( ! $tokens ) {
		return $parts;
	}
	foreach ( $tokens as $token ) {
		if ( '' === $parts['style'] && in_array( strtolower( $token ), $style_words, true ) ) {
			$parts['style'] = strtolower( $token );
		} elseif ( '' === $parts['width'] && preg_match( '/^[\d.]+(px|rem|em|%)?$/', $token ) ) {
			$parts['width'] = $token;
		} elseif ( '' === $parts['colour'] ) {
			$parts['colour'] = $token;
		}
	}
	return $parts;
}

/**
 * Universal masked-`::before` gradient-border emitter (D636 border builder,
 * 2026-08-16). `border-color` cannot legally hold a CSS gradient — the only
 * way to paint a gradient into a border-shaped ring that still respects
 * `border-radius` is a `background`, clipped to a ring via `mask` on a
 * `::before` pseudo-element. `border-image` is NEVER used for this (D636's
 * own ban): it cannot respect `border-radius`, which this framework's blocks
 * rely on pervasively (the one documented exception is `sgs/separator`,
 * D643 — a 1D rule with no radius, kept on `border-image` deliberately).
 *
 * Deliberately a NO-OP (returns '') when `$normal_paint` is empty — a block
 * with no gradient set renders byte-identical CSS to before this helper
 * existed. `$normal_paint`/`$hover_paint` are the caller's ALREADY-RESOLVED
 * winning paint (gradient-if-set-else-flat-colour, via
 * `sgs_css_gradient_value()`/`sgs_colour_value()`), never raw attribute
 * values — this helper only emits the mask CSS, it does not resolve colours.
 *
 * @param string      $selector     CSS selector for the bordered element (already scoped, e.g. "{$root_sel} .sgs-x__item").
 * @param string      $normal_paint Resolved CSS paint for the resting state. Empty short-circuits to ''.
 * @param string|null $hover_paint  Resolved CSS paint for `:hover`/`:focus-within`. Omitted/empty/identical to $normal_paint = no separate hover rule emitted.
 * @param string      $width        Border thickness, e.g. '1px' / '2px'. Should match the real border-width the mask replaces.
 * @return string Scoped CSS (one to two rules), or '' when there is nothing to paint.
 */
function sgs_border_gradient_css( string $selector, string $normal_paint, ?string $hover_paint = null, string $width = '2px' ): string {
	if ( '' === $normal_paint ) {
		return '';
	}

	$width = function_exists( 'sgs_css_length_value' ) ? sgs_css_length_value( $width ) : $width;
	if ( '' === $width ) {
		$width = '2px';
	}

	$css  = "{$selector}{border-color:transparent;position:relative;background-clip:padding-box;}";
	$css .= "{$selector}::before{content:\"\";position:absolute;inset:0;margin:-{$width};border-radius:inherit;padding:{$width};background:{$normal_paint};-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;}";

	if ( null !== $hover_paint && '' !== $hover_paint && $hover_paint !== $normal_paint ) {
		// Both declarations, not just the pseudo-element's background: a
		// pre-existing `:hover{border-color:…}` rule elsewhere in the same
		// stylesheet (a more specific selector than the plain base rule
		// above) would otherwise still win the cascade on hover and repaint
		// the real border solid, fighting the mask ring for the same pixels.
		$css .= sgs_hover_state_rules( $selector, 'border-color:transparent;', ':focus-within' );
		$css .= sgs_hover_state_rules( $selector, "background:{$hover_paint};", ':focus-within', '::before' );
	}

	return $css;
}

/**
 * Universal per-instance hover/focus-visible colour-state emitter.
 *
 * Generalises the scoped `:hover` rule shape `sgs/info-box` already used
 * before this helper existed (a per-instance `.{uid}.sgs-x:hover{…}` rule,
 * specificity 0,3,0, beating the variant base 0,2,0) so other blocks can be
 * converted to the same shape. Mirrors `sgs_border_gradient_css()` above:
 * deliberately a NO-OP (returns '') when both `$decls_normal` and
 * `$decls_hover` are empty — a block with no hover state set renders
 * byte-identical CSS to before this helper existed. `$decls_normal` /
 * `$decls_hover` are the caller's ALREADY-RESOLVED, complete CSS declaration
 * strings (e.g. `'background-color:var(--wp--preset--color--primary)'`) —
 * this helper only joins + wraps them into rules, it never resolves colours
 * or reads block attributes itself.
 *
 * Pairs `:focus-visible` with `:hover` on the hover rule so keyboard users
 * reach the same visual state as mouse users — the same accessibility
 * reasoning `sgs_border_gradient_css()` applies by pairing `:focus-within`.
 *
 * ⛔ `sgs/button` is EXEMPT from this helper — do NOT convert it. Its
 * `--sgs-btn-*-hover` custom properties feed a static rule in
 * `src/blocks/button/style.css` (around lines 87-98) AND three preset
 * classes (around lines 104-130) that carry `theme.json` fallback chains.
 * Routing button's hover colours through this per-instance-selector helper
 * would break that preset cascade — do not "finish the job" by converting
 * it later.
 *
 * @param string $selector      CSS selector for the element the hover state applies to (already scoped, e.g. "{$root_sel}" or "{$root_sel} .sgs-x__item").
 * @param array  $decls_normal  Complete CSS declaration strings for the resting state. Empty = no resting-state rule emitted.
 * @param array  $decls_hover   Complete CSS declaration strings for `:hover`/`:focus-visible`. Empty = no hover rule emitted.
 * @return string Scoped CSS (zero to two rules), or '' when there is nothing to paint.
 */
function sgs_emit_state_colour_css( string $selector, array $decls_normal, array $decls_hover ): string {
	$css = '';

	if ( $decls_normal ) {
		$css .= "{$selector}{" . implode( ';', $decls_normal ) . '}';
	}

	if ( $decls_hover ) {
		$css .= sgs_hover_state_rules( $selector, implode( ';', $decls_hover ), ':focus-visible' );
	}

	return $css;
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
