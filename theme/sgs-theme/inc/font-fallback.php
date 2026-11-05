<?php
/**
 * Size-matched fallback faces and first-paint font preloads.
 *
 * While a web font loads the browser paints in a system font whose glyphs are a different width,
 * so headings reflow when the font arrives. For every theme.json font family that has a face file
 * listed in assets/fonts/fallback-metrics.json (generated from the woff2 files by
 * plugins/sgs-blocks/scripts/compute-font-fallback-metrics.py) this prints an `@font-face` rule
 * named "<Family> Fallback" over a local system font with `size-adjust` and the ascent, descent
 * and line-gap overrides, and appends that name to the family's stack right after the web font.
 * The fallback therefore occupies the same box as the web font. Families whose files are not in
 * the metrics file (for example fonts downloaded into uploads) are left untouched.
 *
 * Preloads: the heading font file the h1 paints with, and the body font file, resolved from the
 * active global styles (one file when both use the same face).
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * Metrics file contents.
 *
 * @return array{bases:array<string,array<string,mixed>>,fonts:array<string,array<string,mixed>>}
 */
function font_fallback_metrics(): array {
	static $data = null;
	if ( null !== $data ) {
		return $data;
	}
	$data = array(
		'bases' => array(),
		'fonts' => array(),
	);
	$path = get_theme_file_path( 'assets/fonts/fallback-metrics.json' );
	if ( ! is_readable( $path ) ) {
		return $data;
	}
	$decoded = json_decode( (string) file_get_contents( $path ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	if ( is_array( $decoded ) && isset( $decoded['bases'], $decoded['fonts'] ) ) {
		$data = $decoded;
	}
	return $data;
}

/**
 * Path of a font file relative to assets/fonts/, from a theme.json face `src` (file:./ path or URL).
 *
 * @param string $src Face source.
 * @return string Relative path, or '' when the source is not under assets/fonts/.
 */
function font_fallback_relative_path( string $src ): string {
	if ( preg_match( '#assets/fonts/(.+?\.woff2)(?:\?.*)?$#i', $src, $m ) ) {
		return $m[1];
	}
	return '';
}

/**
 * The first face of a family entry that has computed metrics.
 *
 * @param array<string,mixed> $family Font family entry.
 * @return array{face:array<string,mixed>,path:string}|null
 */
function font_fallback_first_face( array $family ): ?array {
	$fonts = font_fallback_metrics()['fonts'];
	foreach ( (array) ( $family['fontFace'] ?? array() ) as $face ) {
		foreach ( (array) ( is_array( $face ) ? ( $face['src'] ?? array() ) : array() ) as $src ) {
			$rel = is_string( $src ) ? font_fallback_relative_path( $src ) : '';
			if ( '' !== $rel && isset( $fonts[ $rel ] ) ) {
				return array(
					'face' => $face,
					'path' => $rel,
				);
			}
		}
	}
	return null;
}

/**
 * Split a CSS font stack into its first family name and its generic family.
 *
 * @param string $stack Font stack.
 * @return array{0:string,1:string} Primary family (unquoted) and generic keyword ('' when none).
 */
function font_fallback_split_stack( string $stack ): array {
	$parts   = array_map( 'trim', explode( ',', $stack ) );
	$primary = trim( (string) ( $parts[0] ?? '' ), " \t\"'" );
	$generic = '';
	foreach ( array_reverse( $parts ) as $part ) {
		if ( in_array( $part, array( 'serif', 'sans-serif' ), true ) ) {
			$generic = $part;
			break;
		}
	}
	return array( $primary, $generic );
}

/**
 * Fallback rule data for one family entry.
 *
 * @param array<string,mixed> $family Font family entry.
 * @return array<string,string>|null primary, name and css, or null when no fallback applies.
 */
function font_fallback_for_family( array $family ): ?array {
	$stack                     = (string) ( $family['fontFamily'] ?? '' );
	list( $primary, $generic ) = font_fallback_split_stack( $stack );
	$found                     = font_fallback_first_face( $family );
	$data                      = font_fallback_metrics();
	if ( '' === $primary || null === $found ) {
		return null;
	}
	// A stack without a generic keyword is treated as sans.
	$base = $data['bases'][ '' === $generic ? 'sans-serif' : $generic ] ?? null;
	$web  = $data['fonts'][ $found['path'] ] ?? null;
	if ( ! is_array( $base ) || ! is_array( $web ) || empty( $web['avgWidth'] ) || empty( $base['avgWidth'] ) ) {
		return null;
	}
	$scale  = (float) $web['avgWidth'] / (float) $base['avgWidth'];
	$upm    = (float) $web['unitsPerEm'];
	$name   = $primary . ' Fallback';
	$weight = isset( $found['face']['fontWeight'] ) ? (string) preg_replace( '/[^0-9 ]/', '', (string) $found['face']['fontWeight'] ) : '';
	$css    = sprintf(
		'@font-face{font-family:"%1$s";src:local("%2$s");%3$sascent-override:%4$s%%;descent-override:%5$s%%;line-gap-override:%6$s%%;size-adjust:%7$s%%;}',
		$name,
		$base['local'],
		'' !== $weight ? 'font-weight:' . $weight . ';' : '',
		round( (float) $web['ascender'] / $upm / $scale * 100, 2 ),
		round( abs( (float) $web['descender'] ) / $upm / $scale * 100, 2 ),
		round( (float) $web['lineGap'] / $upm / $scale * 100, 2 ),
		round( $scale * 100, 2 )
	);
	return array(
		'primary' => $primary,
		'name'    => $name,
		'css'     => $css,
	);
}

/**
 * All font family entries of the merged theme.json settings.
 *
 * @return array<int,array<string,mixed>>
 */
function font_fallback_families(): array {
	$groups = wp_get_global_settings( array( 'typography', 'fontFamilies' ) );
	$all    = array();
	foreach ( (array) $groups as $group ) {
		foreach ( (array) $group as $family ) {
			if ( is_array( $family ) ) {
				$all[] = $family;
			}
		}
	}
	return $all;
}

/**
 * Print the fallback @font-face rules (one per web font family).
 */
function print_font_fallback_css(): void {
	$seen = array();
	$css  = '';
	foreach ( font_fallback_families() as $family ) {
		$rule = font_fallback_for_family( $family );
		if ( null === $rule || isset( $seen[ $rule['name'] ] ) ) {
			continue;
		}
		$seen[ $rule['name'] ] = true;
		$css                  .= $rule['css'];
	}
	if ( '' !== $css ) {
		echo '<style id="sgs-font-fallback">' . $css . '</style>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from numbers and quoted family names from the theme data.
	}
}
add_action( 'wp_head', __NAMESPACE__ . '\print_font_fallback_css', 2 );

/**
 * Insert each family's fallback name right after the web font in its stack.
 *
 * @param \WP_Theme_JSON_Data $theme_json Theme JSON data.
 * @return \WP_Theme_JSON_Data
 */
function font_fallback_filter_stacks( $theme_json ) {
	$data     = $theme_json->get_data();
	$families = $data['settings']['typography']['fontFamilies'] ?? null;
	if ( ! is_array( $families ) ) {
		return $theme_json;
	}
	// Theme-origin entries sit in a flat list; other origins nest one level down.
	$changed = false;
	foreach ( $families as $key => $family ) {
		if ( ! is_array( $family ) || ! isset( $family['fontFamily'] ) ) {
			continue;
		}
		$rule = font_fallback_for_family( $family );
		if ( null === $rule || false !== strpos( (string) $family['fontFamily'], $rule['name'] ) ) {
			continue;
		}
		$parts = array_map( 'trim', explode( ',', (string) $family['fontFamily'] ) );
		array_splice( $parts, 1, 0, '"' . $rule['name'] . '"' );
		$families[ $key ]['fontFamily'] = implode( ', ', $parts );
		$changed                        = true;
	}
	if ( ! $changed ) {
		return $theme_json;
	}
	return $theme_json->update_with(
		array(
			'version'  => $data['version'] ?? 3,
			'settings' => array( 'typography' => array( 'fontFamilies' => $families ) ),
		)
	);
}
add_filter( 'wp_theme_json_data_theme', __NAMESPACE__ . '\font_fallback_filter_stacks', 30 );

/**
 * Font preset slug a global-styles font-family value points at.
 *
 * @param mixed $value Style value (`var:preset|font-family|x` or `var(--wp--preset--font-family--x)`).
 * @return string Slug, or ''.
 */
function font_fallback_slug( $value ): string {
	if ( is_string( $value ) && preg_match( '/font-family(?:\||--)([a-z0-9-]+)/i', $value, $m ) ) {
		return $m[1];
	}
	return '';
}

/**
 * Preload the heading and body font files the page paints with.
 */
function preload_first_paint_fonts(): void {
	$styles  = wp_get_global_styles();
	$slugs   = array(
		font_fallback_slug( $styles['elements']['h1']['typography']['fontFamily'] ?? ( $styles['elements']['heading']['typography']['fontFamily'] ?? '' ) ),
		font_fallback_slug( $styles['typography']['fontFamily'] ?? '' ),
	);
	$by_slug = array();
	foreach ( font_fallback_families() as $family ) {
		if ( isset( $family['slug'] ) ) {
			$by_slug[ $family['slug'] ] = $family;
		}
	}
	$done = array();
	foreach ( $slugs as $slug ) {
		$found = '' !== $slug && isset( $by_slug[ $slug ] ) ? font_fallback_first_face( $by_slug[ $slug ] ) : null;
		if ( null === $found || isset( $done[ $found['path'] ] ) ) {
			continue;
		}
		$done[ $found['path'] ] = true;
		printf(
			'<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
			esc_url( get_theme_file_uri( 'assets/fonts/' . $found['path'] ) )
		);
	}
}
add_action( 'wp_head', __NAMESPACE__ . '\preload_first_paint_fonts', 1 );
