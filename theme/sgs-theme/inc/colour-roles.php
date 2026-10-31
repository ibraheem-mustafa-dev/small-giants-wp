<?php
/**
 * Colour roles: prints the framework role slugs as pointers to the client's own palette shades (Spec 32 FR-32-28).
 *
 * A cloned client's palette holds only its draft's shades; the framework roles that block defaults read
 * (`--wp--preset--color--primary`, `--surface`, `--text` and the rest) are named in the snapshot's
 * `settings.custom.colourRoles` as `{ "<role>": "<shade slug>" }`. This prints
 * `:root{--wp--preset--color--<role>:var(--wp--preset--color--<shade>)}` on the front end and in the block editor's
 * canvas, after WordPress's own preset declarations, so it wins where both exist. A status role with no shade holds a
 * raw hex instead. With the key absent (a starter snapshot that keeps the roles as palette entries) nothing is printed.
 * Every role, slug and hex is validated against a strict pattern before it reaches the stylesheet, and a pointer at a
 * slug the palette does not carry is skipped.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * The palette slugs the global settings carry, across every origin (theme, custom, default).
 *
 * @param array $settings Result of wp_get_global_settings().
 * @return string[] Slugs.
 */
function colour_role_palette_slugs( array $settings ): array {
	$palette = isset( $settings['color']['palette'] ) && is_array( $settings['color']['palette'] ) ? $settings['color']['palette'] : array();
	$slugs   = array();
	foreach ( $palette as $origin => $entries ) {
		// A flat list (a theme.json read directly) or origin-keyed lists (the merged global settings).
		$list = is_array( $entries ) && isset( $entries['slug'] ) ? array( $entries ) : ( is_array( $entries ) ? $entries : array() );
		foreach ( $list as $entry ) {
			if ( is_array( $entry ) && isset( $entry['slug'] ) && is_string( $entry['slug'] ) ) {
				$slugs[] = $entry['slug'];
			}
		}
	}
	return array_values( array_unique( $slugs ) );
}

/**
 * The stylesheet text that points each role at its shade.
 *
 * @param array|null $settings Global settings; null reads wp_get_global_settings().
 * @return string CSS, or '' when the snapshot sets no roles or none validates.
 */
function colour_roles_css( ?array $settings = null ): string {
	$settings = null === $settings ? wp_get_global_settings() : $settings;
	$roles    = isset( $settings['custom']['colourRoles'] ) && is_array( $settings['custom']['colourRoles'] ) ? $settings['custom']['colourRoles'] : array();
	if ( ! $roles ) {
		return '';
	}
	$palette = colour_role_palette_slugs( $settings );
	$slug_re = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';
	$hex_re  = '/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/';
	$decls   = array();
	foreach ( $roles as $role => $target ) {
		if ( ! is_string( $role ) || ! is_string( $target ) || 1 !== preg_match( $slug_re, $role ) ) {
			continue;
		}
		if ( 1 === preg_match( $hex_re, $target ) ) {
			$decls[] = '--wp--preset--color--' . $role . ':' . $target;
		} elseif ( $target !== $role && 1 === preg_match( $slug_re, $target ) && in_array( $target, $palette, true ) ) {
			$decls[] = '--wp--preset--color--' . $role . ':var(--wp--preset--color--' . $target . ')';
		}
	}
	return $decls ? ':root{' . implode( ';', $decls ) . '}' : '';
}

/**
 * Print the role pointers on the front end and in the editor canvas.
 *
 * `enqueue_block_assets` runs on both. On the front end the style depends on `global-styles`, which prints WordPress's
 * own preset declarations, so these come after them; the editor canvas loads its assets after its global styles.
 */
function enqueue_colour_roles(): void {
	$css = colour_roles_css();
	if ( '' === $css ) {
		return;
	}
	wp_register_style( 'sgs-colour-roles', false, is_admin() ? array() : array( 'global-styles' ), null );
	wp_enqueue_style( 'sgs-colour-roles' );
	wp_add_inline_style( 'sgs-colour-roles', $css );
}
add_action( 'enqueue_block_assets', __NAMESPACE__ . '\enqueue_colour_roles' );
