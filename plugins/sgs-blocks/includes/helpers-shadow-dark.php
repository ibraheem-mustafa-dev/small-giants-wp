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
require_once __DIR__ . '/helpers-shadow-hover.php';

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

require_once __DIR__ . '/helpers-shadow-dark-css.php';
