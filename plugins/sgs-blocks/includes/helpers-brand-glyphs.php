<?php
/**
 * Brand glyphs a block draws itself (never a Lucide icon: Lucide ships no
 * brand marks). One source per glyph, so every block shows the same mark.
 *
 * Used by `sgs/whatsapp-cta` (render.php) and `sgs/choice-flow`'s stage help
 * card (`includes/choice-flow-summary.php`).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_whatsapp_glyph_svg' ) ) {
	/**
	 * The WhatsApp logo (official brand path), filled with `currentColor` so
	 * CSS sets its colour. Decorative: the caller's own text names the action.
	 *
	 * @param string $class_name The `<svg>` element's class.
	 * @param int    $size       Width and height attributes, in px.
	 * @return string SVG markup (a fixed constant plus the escaped class).
	 */
	function sgs_whatsapp_glyph_svg( string $class_name, int $size = 24 ): string {
		$path  = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15';
		$path .= '-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15';
		$path .= '-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297';
		$path .= '-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497';
		$path .= '.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207';
		$path .= '-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01';
		$path .= '-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479';
		$path .= ' 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487';
		$path .= '.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118';
		$path .= '.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413';
		$path .= '-.074-.124-.272-.198-.57-.347';
		$path .= 'm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214';
		$path .= '-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26';
		$path .= 'c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898';
		$path .= 'a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884';
		$path .= 'm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892';
		$path .= 'c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654';
		$path .= 'a11.882 11.882 0 0 0 5.683 1.448h.005';
		$path .= 'c6.554 0 11.89-5.335 11.893-11.893';
		$path .= 'a11.821 11.821 0 0 0-3.48-8.413';

		return '<svg class="' . esc_attr( $class_name ) . '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"'
			. ' width="' . absint( $size ) . '" height="' . absint( $size ) . '" fill="currentColor" aria-hidden="true"'
			. ' focusable="false"><path d="' . $path . '"/></svg>';
	}
}
