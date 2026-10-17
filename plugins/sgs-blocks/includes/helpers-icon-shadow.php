<?php
/**
 * Shadow custom properties for `sgs/icon` and the `sgs/social-icons` row.
 *
 * One reader for both blocks: an icon prints `--sgs-icon-shadow` and `--sgs-icon-shadow-hover` and a row prints
 * `--sgs-si-shadow` and `--sgs-si-shadow-hover` (its group defaults), and `src/blocks/icon/style.css` reads own value,
 * then the row's. The shadow is composed by the shared shadow composer (`sgs_shadow_decls()`), so colours come from
 * the site colour, the palette or a hex, and a preset slug keeps its automatic hover partner.
 *
 * Editor twin: `src/blocks/icon/icon-shadow.js`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-colour-variants.php';
require_once __DIR__ . '/helpers-shadow-hover.php';

if ( ! function_exists( 'sgs_icon_shadow_vars' ) ) {
	/**
	 * The resting and hover shadow as custom properties.
	 *
	 * `$pin_hover` (an icon with a shadow of its own): when the hover resolves to nothing, the hover is pinned to the
	 * resting shadow, so a wrapping row's hover shadow cannot replace the icon's own resting one.
	 *
	 * @param array  $attributes Attributes holding the shadow (and `shadowLiftOnHover`).
	 * @param array  $map        Attribute names: base, colour, hover, hover_colour (see sgs_shadow_decls()).
	 * @param string $prefix     `--sgs-icon` or `--sgs-si`.
	 * @param bool   $pin_hover  Pin an unset hover to the resting shadow.
	 * @return string[] Declarations ('--sgs-icon-shadow:3px 3px 0px 0px #3A2A22').
	 */
	function sgs_icon_shadow_vars( array $attributes, array $map, string $prefix, bool $pin_hover = false ): array {
		$decls = sgs_shadow_decls( $attributes, $map, '' );
		// sgs-shadow-fallback: reads back the declarations sgs_shadow_decls() composed (the resting one carries the fallback); it writes none.
		$value = static function ( array $list ): string {
			foreach ( $list as $decl ) {
				// sgs-shadow-fallback: a read of the composed declaration, not a writer.
				if ( 0 === strpos( $decl, 'box-shadow:' ) ) {
					// sgs-shadow-fallback: a read of the composed declaration, not a writer.
					return substr( $decl, strlen( 'box-shadow:' ) );
				}
			}
			return '';
		};
		$rest  = $value( $decls['normal'] );
		$hover = $value( $decls['hover'] );
		if ( '' === $hover && $pin_hover ) {
			$hover = $rest;
		}
		$out = array();
		if ( '' !== $rest ) {
			$out[] = $prefix . '-shadow:' . $rest;
		}
		if ( '' !== $hover ) {
			$out[] = $prefix . '-shadow-hover:' . $hover;
		}
		return $out;
	}
}
