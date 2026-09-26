<?php
/**
 * Dark shadow presets, the stylesheet side: reads the theme's shadow presets and hover map,
 * and writes the scoped CSS that swaps them for their dark variants (dark surfaces, site dark
 * mode) and back (light surfaces). The variant maths lives in helpers-shadow-dark.php.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-shadow-dark.php';
require_once __DIR__ . '/helpers-global-settings.php';

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
 * Every LITERAL entry in `settings.custom.shadowHover` (H3) gets the same treatment, right after
 * the presets: its dark variant re-declares `--wp--custom--shadow-hover--<slug>`, its original
 * literal resets it in the light scope. A hover entry that is itself another preset slug (e.g.
 * `whisper` lifts to `soft`) needs nothing here — the preset it points at is already covered.
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
		foreach ( sgs_shadow_hover_raw_map() as $slug => $entry ) {
			if ( sgs_shadow_hover_is_slug( $entry ) ) {
				continue;
			}
			$variant = sgs_shadow_dark_variant( $entry );
			if ( null !== $variant ) {
				$cache['dark']  .= '--wp--custom--shadow-hover--' . $slug . ':' . $variant . ';';
				$cache['light'] .= '--wp--custom--shadow-hover--' . $slug . ':' . sgs_shadow_dark_original( $entry ) . ';';
			}
		}
	}
	return $cache;
}

/**
 * The site's configured shadow colour (`settings.custom.shadowColour`), for the light reset.
 *
 * Only a palette variable or a hex colour is accepted; anything else (or nothing) falls back to
 * black, so a hostile or missing value can never break out of the declaration.
 *
 * @return string A CSS colour value that is safe to print inside a declaration.
 */
function sgs_shadow_dark_site_colour(): string {
	$value = sgs_global_custom_setting( 'shadowColour' );
	if ( is_string( $value ) && preg_match( '/^(?:var\(--wp--preset--color--[a-z0-9-]+\)|#[0-9a-fA-F]{3,8})$/D', $value ) ) {
		return $value;
	}
	return SGS_SHADOW_DARK_SHADOW_BASE;
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
 * D7: `root` also carries a SECONDARY reset (site dark mode is unbuilt scaffolding — no
 * setting, no toggle — so this only ever fires once dark mode itself is switched on). Site
 * dark mode swaps the root `--wp--custom--shadow-colour` for its own (now light-toned)
 * palette, so a `.sgs-on-light` surface nested inside dark mode must NOT inherit that
 * inverted site colour — it hard-resets to black (`SGS_SHADOW_DARK_SHADOW_BASE`), never the
 * site's configured colour, and re-declares every preset back to its ORIGINAL literal. Printed
 * straight after the root dark declarations in both the explicit-theme rule and the
 * system-preference media query, in that order.
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
		return '.sgs-on-light>*{--wp--custom--shadow-colour:' . sgs_shadow_dark_site_colour() . ';' . $decls['light'] . '}';
	}
	$light_reset = '{--wp--custom--shadow-colour:' . SGS_SHADOW_DARK_SHADOW_BASE . ';' . $decls['light'] . '}';
	return ':root[data-theme="dark"]{' . $decls['dark'] . '}'
		. ':root[data-theme="dark"] .sgs-on-light>*' . $light_reset
		. '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="dark"]){' . $decls['dark'] . '}'
		. ':root:not([data-theme="light"]):not([data-theme="dark"]) .sgs-on-light>*' . $light_reset . '}';
}
