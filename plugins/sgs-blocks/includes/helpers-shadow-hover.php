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

/**
 * Is the automatic lift-on-hover allowed for this block instance? (Design H4/H5.)
 *
 * Two independent gates, either of which turns the lift off:
 *   1. The block-level switch, `$attributes['shadowLiftOnHover'] === false` (the client's
 *      per-instance ToggleControl; default true when the attribute is absent/anything else).
 *   2. The block TYPE's own declaration, `supports.sgs.shadowLift: false` — overlay surfaces
 *      (mega-panel, nav-drawer, modal, the cart drawer…) that are already floating and always
 *      under the pointer when open. Read via `WP_Block_Type_Registry`, guarded for a missing
 *      registry (standalone PHP tests run outside WordPress) — a missing registry or an
 *      unregistered block name means "no declaration", i.e. lift stays on.
 *
 * @param array  $attributes Block attributes (verbatim).
 * @param string $block_name Registered block name, e.g. 'sgs/hero'. '' skips gate 2.
 * @return bool True when the automatic lift may draw.
 */
function sgs_shadow_lift_enabled( array $attributes, string $block_name = '' ): bool {
	if ( isset( $attributes['shadowLiftOnHover'] ) && false === $attributes['shadowLiftOnHover'] ) {
		return false;
	}

	// ONE control (Bean's ruling, 2026-09-24, `.claude/reports/2026-09-24-u2-scrim-design.md`
	// sibling — see `.claude/reports/2026-09-23-shadow-hover-lift-design.md` for the lift
	// design this extends): the Shadow panel's own "Hover shadow" select writes the SAME
	// universal `sgsHoverShadow` attribute the Hover Effects panel uses (no new attribute —
	// see src/components/ShadowControl.js). A chosen preset there OVERRIDES the automatic
	// lift outright rather than fighting it at the same selector's :hover rule — only one of
	// the two may ever draw. `sgs_shadow_hover_is_slug()` mirrors the shape check the class-
	// injection path (includes/hover-effects.php::is_hover_shadow_slug()) already applies to
	// this same attribute, so an invalid/empty value never suppresses the lift.
	if ( isset( $attributes['sgsHoverShadow'] ) && is_string( $attributes['sgsHoverShadow'] )
		&& sgs_shadow_hover_is_slug( $attributes['sgsHoverShadow'] ) ) {
		return false;
	}

	if ( '' === $block_name || ! class_exists( 'WP_Block_Type_Registry' ) ) {
		return true;
	}

	$registered = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
	if ( null === $registered || ! is_array( $registered->supports ?? null ) ) {
		return true;
	}

	$flag = $registered->supports['sgs']['shadowLift'] ?? null;
	return false !== $flag;
}

/**
 * The complete touch-safe hover RULE for a resting shadow (design H4).
 *
 * '' when: the switch is off, the block type opts out (`sgs_shadow_lift_enabled()`), or the
 * resting shape/colour has no hover value at all (`sgs_shadow_hover_value()` returns '').
 * Otherwise a guarded `:hover` + unguarded `:focus-visible` pair via
 * `sgs_hover_state_rules()` — no `transition` (Council ruling, design doc H4/§Council: a
 * second `transition` declaration would silently cancel a block's own).
 *
 * Callers pass an EXPLICIT hover value (a hover shape/colour the block already declares)
 * separately and skip this helper entirely when one is set — explicit always wins.
 *
 * @param string $selector   One or more comma-separated base selectors (no `:hover` suffix).
 * @param string $shape      Stored resting shape: a preset slug, a layered shape, or `none`.
 * @param string $colour     Stored resting colour text.
 * @param array  $attributes Block attributes (verbatim) — read for the `shadowLiftOnHover` switch.
 * @param string $block_name Registered block name — read for `supports.sgs.shadowLift`.
 * @return string The touch-safe hover rule pair, or '' when nothing should be drawn.
 */
function sgs_shadow_hover_rules( string $selector, string $shape, string $colour, array $attributes, string $block_name = '' ): string {
	if ( '' === trim( $selector ) || ! sgs_shadow_lift_enabled( $attributes, $block_name ) ) {
		return '';
	}

	$hover = sgs_shadow_hover_value( $shape, $colour );
	if ( '' === $hover ) {
		return '';
	}

	// sgs-shadow-fallback: hover state only; the caller's own resting rule carries the
	// forced-colours fallback (every caller of this shared helper already emits one).
	return sgs_hover_state_rules( $selector, 'box-shadow:' . $hover, ':focus-visible' );
}

/**
 * Resolve a native WP `style.shadow` value (`supports.shadow`, the five style-engine blocks:
 * card-grid, info-box, process-steps, testimonial, timeline) to the shape text
 * `sgs_shadow_hover_value()` expects.
 *
 * The block editor's core Shadow panel stores a preset pick as `var:preset|shadow|<slug>`
 * (the style-engine preset-reference convention, distinct from SGS's own bare-slug
 * convention) or a raw CSS box-shadow layer list for a custom shadow. Both are handled by
 * `sgs_shadow_hover_value()` once the preset-reference wrapper is stripped down to the slug;
 * a raw value it cannot parse (e.g. an `rgba()` colour, which `sgs_shadow_resolve_colour()`
 * does not accept) safely yields '' downstream rather than a guessed transform.
 *
 * @param string $raw The stored `style.shadow` value.
 * @return string A bare slug or the raw shape text, ready for `sgs_shadow_hover_value()`.
 */
function sgs_shadow_style_engine_shape( string $raw ): string {
	if ( 1 === preg_match( '/^var:preset\|shadow\|([a-z0-9-]+)$/i', trim( $raw ), $m ) ) {
		return strtolower( $m[1] );
	}
	return $raw;
}
