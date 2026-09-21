<?php
/**
 * Dark variants of the theme's shadow presets, derived from the presets' own literals.
 *
 * The theme's shadow presets are written against one site shadow colour and read correctly on
 * light backgrounds. On a dark background a dark shadow is invisible. The usual remedy (Primer,
 * Radix) is a black shadow at a higher opacity plus a 1px light ring. This file derives that
 * variant from each preset's literal, so nothing is written per preset and a client theme
 * snapshot's presets work without a second list.
 *
 * Only a strictly parsed layer is understood. A layer that does not match the grammar makes the
 * whole preset unparseable and no variant is emitted for it, so text from a preset can never
 * reach the page unless it is rebuilt from validated fields or is a strict theme-colour layer
 * kept verbatim.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-shadow-layers.php';

const SGS_SHADOW_ON_DARK_COLOUR     = '#E8E8E8';
const SGS_SHADOW_DARK_RING_ALPHA    = 12;
const SGS_SHADOW_DARK_STRENGTH      = 2.2;
const SGS_SHADOW_DARK_SHADOW_BASE   = '#000000';
const SGS_SHADOW_DARK_SITE_VAR      = 'var(--wp--custom--shadow-colour)';
const SGS_SHADOW_DARK_LAYER_REGEX   = '/^((?i:inset) )?(-?\d+(?:\.\d+)?px) (-?\d+(?:\.\d+)?px) (-?\d+(?:\.\d+)?px) (-?\d+(?:\.\d+)?px) (.+)$/D';
const SGS_SHADOW_DARK_SITE_MIX      = '/^color-mix\(in srgb, var\(--wp--custom--shadow-colour\) (\d{1,3}(?:\.\d)?)%, transparent\)$/D';
const SGS_SHADOW_DARK_PRESET_COLOUR = '/^(?:color-mix\(in srgb, var\(--wp--preset--color--[a-z0-9-]+\) \d{1,3}(?:\.\d)?%, transparent\)|var\(--wp--preset--color--[a-z0-9-]+\))$/D';

/**
 * Format an opacity as a percentage number with no trailing zeros ("26.4", "20", "13.2").
 *
 * @param float $value Opacity, 0 to 100.
 * @return string Number text without the percent sign.
 */
function sgs_shadow_dark_format_alpha( float $value ): string {
	return rtrim( rtrim( number_format( $value, 1, '.', '' ), '0' ), '.' );
}

/**
 * The opacity a site-colour layer takes on a dark background: the original scaled by
 * SGS_SHADOW_DARK_STRENGTH, rounded to one decimal place and capped at 100.
 *
 * @param float $alpha Original opacity, 0 to 100 or more.
 * @return float Dark opacity, at most 100.
 */
function sgs_shadow_dark_scale_alpha( float $alpha ): float {
	return min( 100.0, round( $alpha * SGS_SHADOW_DARK_STRENGTH, 1 ) );
}

/**
 * The dark-background colour for a scaled opacity: the bare colour at full strength, otherwise
 * a `color-mix()` built here from the constant colour and the number.
 *
 * @param float $alpha Dark opacity, 0 to 100.
 * @return string CSS colour.
 */
function sgs_shadow_dark_colour( float $alpha ): string {
	if ( $alpha >= 100.0 ) {
		return SGS_SHADOW_DARK_SHADOW_BASE;
	}
	return 'color-mix(in srgb, ' . SGS_SHADOW_DARK_SHADOW_BASE . ' ' . sgs_shadow_dark_format_alpha( $alpha ) . '%, transparent)';
}

/**
 * The 1px light ring that keeps a raised element readable on a dark background.
 *
 * @return string One shadow layer.
 */
function sgs_shadow_dark_ring_layer(): string {
	return '0px 0px 0px 1px color-mix(in srgb, ' . SGS_SHADOW_ON_DARK_COLOUR . ' ' . SGS_SHADOW_DARK_RING_ALPHA . '%, transparent)';
}

/**
 * Classify a parsed layer's colour text.
 *
 * @param string $colour Colour part of a layer.
 * @return array{kind:string,alpha:float}|null `site` (with its opacity), `other` (a strict theme
 *                                             palette colour), or null when it is neither.
 */
function sgs_shadow_dark_classify_colour( string $colour ): ?array {
	if ( SGS_SHADOW_DARK_SITE_VAR === $colour ) {
		return array(
			'kind'  => 'site',
			'alpha' => 100.0,
		);
	}
	if ( 1 === preg_match( SGS_SHADOW_DARK_SITE_MIX, $colour, $match ) ) {
		return array(
			'kind'  => 'site',
			'alpha' => (float) $match[1],
		);
	}
	if ( 1 === preg_match( SGS_SHADOW_DARK_PRESET_COLOUR, $colour ) ) {
		return array(
			'kind'  => 'other',
			'alpha' => 100.0,
		);
	}
	return null;
}

/**
 * The dark variant of one shadow preset literal.
 *
 * Every layer painted in the site shadow colour becomes black at 2.2 times its opacity (capped at
 * 100); a layer in a theme palette colour is kept verbatim. When at least one site-colour layer is
 * an outer shadow, a 1px light ring is prepended so the edge still reads on a dark surface.
 *
 * @param string $literal Preset literal: layers separated by top-level commas.
 * @return string|null Dark variant, or null when no variant should be emitted (no site-colour
 *                     layer, or any part of the literal is not understood).
 */
function sgs_shadow_dark_variant( string $literal ): ?string {
	$literal = trim( $literal );
	if ( '' === $literal || strlen( $literal ) > SGS_SHADOW_MAX_BYTES ) {
		return null;
	}
	$layers = sgs_shadow_split_top( $literal, ',' );
	if ( count( $layers ) > SGS_SHADOW_MAX_LAYERS ) {
		return null;
	}
	$out       = array();
	$has_site  = false;
	$has_outer = false;
	foreach ( $layers as $layer ) {
		if ( 1 !== preg_match( SGS_SHADOW_DARK_LAYER_REGEX, $layer, $m ) ) {
			return null;
		}
		// A negative blur is invalid CSS; the source layer is already broken, so refuse it.
		if ( (float) $m[4] < 0.0 ) {
			return null;
		}
		$colour = sgs_shadow_dark_classify_colour( $m[6] );
		if ( null === $colour ) {
			return null;
		}
		// `inset` is matched in any case and written in lower case.
		$inset = '' === $m[1] ? '' : 'inset ';
		$layer = $inset . substr( $layer, strlen( $m[1] ) );
		if ( 'other' === $colour['kind'] ) {
			$out[] = $layer;
			continue;
		}
		$has_site = true;
		if ( '' === $m[1] ) {
			$has_outer = true;
		}
		$out[] = $inset . $m[2] . ' ' . $m[3] . ' ' . $m[4] . ' ' . $m[5] . ' '
			. sgs_shadow_dark_colour( sgs_shadow_dark_scale_alpha( $colour['alpha'] ) );
	}
	if ( ! $has_site ) {
		return null;
	}
	if ( $has_outer ) {
		array_unshift( $out, sgs_shadow_dark_ring_layer() );
	}
	return implode( ', ', $out );
}

/**
 * The theme's shadow presets as one flat list, one entry per slug.
 *
 * `wp_get_global_settings()` returns either a flat list or an array keyed by origin. Origins are
 * read in the order custom, theme, default and the first entry for a slug wins, so a user's own
 * preset replaces the theme's. Only an entry with a plain slug and a string shadow is kept.
 *
 * @return array<string,string> Map of slug to literal.
 */
function sgs_shadow_dark_presets(): array {
	if ( ! function_exists( 'wp_get_global_settings' ) ) {
		return array();
	}
	$raw = wp_get_global_settings( array( 'shadow', 'presets' ) );
	if ( ! is_array( $raw ) ) {
		return array();
	}
	$lists = array();
	if ( isset( $raw['custom'] ) || isset( $raw['theme'] ) || isset( $raw['default'] ) ) {
		foreach ( array( 'custom', 'theme', 'default' ) as $origin ) {
			if ( is_array( $raw[ $origin ] ?? null ) ) {
				$lists[] = $raw[ $origin ];
			}
		}
	} else {
		$lists[] = $raw;
	}
	$presets = array();
	foreach ( $lists as $list ) {
		foreach ( $list as $preset ) {
			if ( ! is_array( $preset ) || ! is_string( $preset['slug'] ?? null ) || ! is_string( $preset['shadow'] ?? null ) ) {
				continue;
			}
			if ( 1 !== preg_match( '/^[a-z][a-z0-9-]*$/D', $preset['slug'] ) || isset( $presets[ $preset['slug'] ] ) ) {
				continue;
			}
			$presets[ $preset['slug'] ] = $preset['shadow'];
		}
	}
	return $presets;
}

/**
 * The presets' original layers, joined with `, `, exactly as the theme writes them.
 *
 * Only call this for a literal whose dark variant exists: every layer has then passed the strict
 * layer grammar, so rebuilding from the split layers drops any stray whitespace and nothing else.
 *
 * @param string $literal Preset literal that has a dark variant.
 * @return string The literal with layers joined by `, `.
 */
function sgs_shadow_dark_original( string $literal ): string {
	return implode( ', ', sgs_shadow_split_top( trim( $literal ), ',' ) );
}

/**
 * The declaration lists for every preset that has a dark variant, computed once per request.
 *
 * `dark` holds the dark variants; `light` holds the same presets' original literals, used to reset
 * them inside a light container nested in a dark one. A preset with no dark variant (an all-brand
 * Glow) is in neither, so it never changes.
 *
 * @param bool $refresh True to discard the remembered value and recompute (used by tests).
 * @return array{dark:string,light:string} Declarations such as `--wp--preset--shadow--soft:...;`, or '' each when no preset has a variant.
 */
function sgs_shadow_dark_declarations( bool $refresh = false ): array {
	static $cache = null;
	if ( $refresh || null === $cache ) {
		$cache = array(
			'dark'  => '',
			'light' => '',
		);
		foreach ( sgs_shadow_dark_presets() as $slug => $literal ) {
			$variant = sgs_shadow_dark_variant( $literal );
			if ( null !== $variant ) {
				$cache['dark']  .= '--wp--preset--shadow--' . $slug . ':' . $variant . ';';
				$cache['light'] .= '--wp--preset--shadow--' . $slug . ':' . sgs_shadow_dark_original( $literal ) . ';';
			}
		}
	}
	return $cache;
}

/**
 * The stylesheet text that swaps shadow presets between their original and dark variants.
 *
 * `root` re-declares the presets on `:root` for an explicit dark theme and for a system dark
 * preference that has not been overridden. `section` re-declares them, and the site shadow
 * colour, on the CHILDREN of a `.sgs-on-dark` container (never the container itself, so its own
 * shadow is unchanged). `light` resets the presets and the shadow colour on the children of a
 * `.sgs-on-light` container, so a light panel nested in a dark section shows its own shadows
 * unchanged. The scopes are separate so the caller can print `light` after `section`.
 *
 * @param string $scope   'root', 'section' or 'light'.
 * @param bool   $refresh True to recompute the remembered declarations (used by tests).
 * @return string CSS, or '' for an unknown scope or when no preset has a dark variant.
 */
function sgs_shadow_dark_preset_css( string $scope, bool $refresh = false ): string {
	if ( 'root' !== $scope && 'section' !== $scope && 'light' !== $scope ) {
		return '';
	}
	$decls = sgs_shadow_dark_declarations( $refresh );
	if ( '' === $decls['dark'] ) {
		return '';
	}
	if ( 'section' === $scope ) {
		return '.sgs-on-dark>*{--wp--custom--shadow-colour:' . SGS_SHADOW_ON_DARK_COLOUR . ';' . $decls['dark'] . '}';
	}
	if ( 'light' === $scope ) {
		return '.sgs-on-light>*{--wp--custom--shadow-colour:' . SGS_SHADOW_DARK_SHADOW_BASE . ';' . $decls['light'] . '}';
	}
	return ':root[data-theme="dark"]{' . $decls['dark'] . '}'
		. '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="dark"]){' . $decls['dark'] . '}}';
}
