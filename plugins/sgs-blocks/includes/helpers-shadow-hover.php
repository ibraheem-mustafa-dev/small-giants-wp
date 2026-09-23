<?php
/**
 * The automatic hover shadow: `theme.json::settings.custom.shadowHover` resolved to CSS.
 *
 * Design: `.claude/reports/2026-09-23-shadow-hover-lift-design.md` (H1/H2). Every preset that
 * draws a shadow gets a matching hover — either another preset (a "lifts to" reference) or a
 * literal written in the composer's own strict grammar. A custom layered shadow (the Layers /
 * Raw tabs, not a preset slug) instead lifts procedurally: each OUTER layer's y offset and
 * blur x1.25, rounded to the nearest whole pixel; spread, colour and inset layers untouched.
 *
 * Sibling of includes/helpers-shadow-layers.php (kept separate so that file stays under the
 * 300-line cap). JS twin: src/utils/shadow-hover.js, pinned to the same shared case table
 * (tests/shared/shadow-hover-cases.json) the composer's shared cases already use as precedent.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-shadow-layers.php';

const SGS_SHADOW_HOVER_LIFT_FACTOR = 1.25;

/**
 * Is `$text` a bare preset-slug reference — the same rule `sgs_shadow_layers()` uses to
 * recognise one, minus `none` (which never resolves to a hover).
 *
 * @param string $text Candidate text.
 * @return bool True when it reads as a slug, not a layered shape.
 */
function sgs_shadow_hover_is_slug( string $text ): bool {
	return 1 === preg_match( '/^[a-z][a-z0-9-]*$/i', $text )
		&& 'inset' !== strtolower( $text )
		&& 'none' !== strtolower( $text );
}

/**
 * The hover map (`settings.custom.shadowHover`) as slug => hover text, first origin wins.
 *
 * `wp_get_global_settings()` normally merges a plain custom setting into one flat object, but
 * (as with `shadow.presets`) this reads defensively for an origin-keyed shape too, the same
 * origin handling `sgs_shadow_dark_presets()` uses, so a future preset-style merge behaviour
 * for this key would still resolve correctly. A hostile or malformed slug (from a client
 * snapshot) is dropped rather than trusted into a CSS custom-property name.
 *
 * @return array<string,string> Map of preset slug to its hover text (a slug or a literal).
 */
function sgs_shadow_hover_raw_map(): array {
	if ( ! function_exists( 'wp_get_global_settings' ) ) {
		return array();
	}
	$raw = wp_get_global_settings( array( 'custom', 'shadowHover' ) );
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
	$map = array();
	foreach ( $lists as $list ) {
		foreach ( $list as $slug => $value ) {
			if ( ! is_string( $slug ) || ! is_string( $value ) || isset( $map[ $slug ] ) ) {
				continue;
			}
			if ( 1 !== preg_match( '/^[a-z][a-z0-9-]*$/D', $slug ) ) {
				continue;
			}
			$map[ $slug ] = $value;
		}
	}
	return $map;
}

/**
 * Lift a custom layered shape (not a preset slug): each OUTER layer's y offset and blur x1.25,
 * rounded to the nearest whole pixel; x, spread, colour and inset layers unchanged.
 *
 * @param string $shape Layers separated by top-level commas (never a bare slug or `none`).
 * @return string|null The lifted shape text, ready for `sgs_shadow_layers()`, or null when any
 *                     layer does not parse.
 */
function sgs_shadow_hover_lift_shape( string $shape ): ?string {
	$out = array();
	foreach ( sgs_shadow_split_top( $shape, ',' ) as $layer ) {
		$fields = sgs_shadow_parse_layer( $layer );
		if ( null === $fields ) {
			return null;
		}
		if ( $fields['inset'] ) {
			$out[] = trim( $layer );
			continue;
		}
		$text = sgs_shadow_format_length( $fields['x'] ) . ' '
			. sgs_shadow_format_length( (float) round( $fields['y'] * SGS_SHADOW_HOVER_LIFT_FACTOR ) ) . ' '
			. sgs_shadow_format_length( (float) round( $fields['blur'] * SGS_SHADOW_HOVER_LIFT_FACTOR ) ) . ' '
			. sgs_shadow_format_length( $fields['spread'] );
		if ( null !== $fields['colour'] ) {
			$text .= ' ' . $fields['colour'];
		}
		$out[] = $text;
	}
	return implode( ', ', $out );
}

/**
 * The hover shadow value for a resting shadow (`box-shadow`-ready CSS, or '' for none).
 *
 * A preset slug looks up the hover map: another slug becomes a preset variable reference; a
 * literal is validated through `sgs_shadow_layers()` before being trusted, then referenced by
 * the custom property WordPress generates for it (`--wp--custom--shadow-hover--<slug>`); no map
 * entry (or a literal that fails validation) yields ''. A custom layered shape (not a preset
 * slug) is lifted procedurally and re-composed through `sgs_shadow_layers()`. `none`, empty, or
 * anything the grammar rejects yields ''.
 *
 * @param string|null $shape  Stored resting shape: a preset slug, a layered shape, or `none`.
 * @param string|null $colour Stored resting colour text (used only for a custom layered shape).
 * @return string CSS `box-shadow` value, or '' when there is no hover to draw.
 */
function sgs_shadow_hover_value( ?string $shape, ?string $colour ): string {
	$shape = trim( (string) $shape );
	if ( '' === $shape || strlen( $shape ) > SGS_SHADOW_MAX_BYTES || 'none' === strtolower( $shape ) ) {
		return '';
	}
	if ( sgs_shadow_hover_is_slug( $shape ) ) {
		$slug  = strtolower( $shape );
		$entry = sgs_shadow_hover_raw_map()[ $slug ] ?? '';
		if ( '' === $entry ) {
			return '';
		}
		if ( sgs_shadow_hover_is_slug( $entry ) ) {
			return 'var(--wp--preset--shadow--' . strtolower( $entry ) . ')';
		}
		if ( '' === sgs_shadow_layers( $entry, null ) ) {
			return '';
		}
		return 'var(--wp--custom--shadow-hover--' . $slug . ')';
	}
	$layers = sgs_shadow_split_top( $shape, ',' );
	if ( count( $layers ) > SGS_SHADOW_MAX_LAYERS ) {
		return '';
	}
	$lifted = sgs_shadow_hover_lift_shape( $shape );
	if ( null === $lifted ) {
		return '';
	}
	return sgs_shadow_layers( $lifted, $colour );
}
