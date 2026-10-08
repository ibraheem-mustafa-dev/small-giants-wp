<?php
/**
 * The brand and contact registry reader: brand glyphs, colours, Site Info keys and accessible names.
 *
 * One list, `includes/data/brand-registry.json`, read here by PHP and imported by the editor through
 * `src/utils/brand-registry.js`; no block keeps its own copy. `sgs/icon` draws brand glyphs and brand colours
 * from it; `sgs/whatsapp-cta` (render.php) and `sgs/choice-flow`'s stage help card
 * (`includes/choice-flow-showcase.php`) draw the WhatsApp mark through `sgs_whatsapp_glyph_svg()`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-colour-wcag.php';

if ( ! defined( 'SGS_BRAND_DARK_GLYPH' ) ) {
	/** The near-black glyph a light brand colour gets when white fails 3:1 on it (D5). */
	define( 'SGS_BRAND_DARK_GLYPH', '#1E1E1E' );
}

if ( ! function_exists( 'sgs_brand_registry' ) ) {
	/**
	 * Every registry entry, keyed by slug, in the registry's order. Entries with an unsafe slug or colour are
	 * dropped, so a bad edit to the JSON can never reach a stylesheet or a class attribute.
	 *
	 * @return array<string,array{slug:string,label:string,siteInfoKey:string,autoLabel:string,colour:string,glyph:array,glyphBrand?:array,ground?:string}>
	 */
	function sgs_brand_registry(): array {
		static $brands = null;
		if ( null !== $brands ) {
			return $brands;
		}
		$brands = array();
		$raw    = @file_get_contents( __DIR__ . '/data/brand-registry.json' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents,WordPress.PHP.NoSilencedErrors.Discouraged -- a local plugin data file; a missing file leaves an empty registry.
		$data   = is_string( $raw ) ? json_decode( $raw, true ) : null;
		$list   = is_array( $data['brands'] ?? null ) ? $data['brands'] : array();
		foreach ( $list as $entry ) {
			$slug   = is_string( $entry['slug'] ?? null ) ? $entry['slug'] : '';
			$colour = is_string( $entry['colour'] ?? null ) ? $entry['colour'] : '';
			$ground = is_string( $entry['ground'] ?? null ) ? $entry['ground'] : '';
			if ( ! preg_match( '/^[a-z0-9-]+$/', $slug ) || ! preg_match( '/^(#[0-9A-Fa-f]{6})?$/', $colour ) || ! preg_match( '/^(#[0-9A-Fa-f]{6})?$/', $ground ) || ! is_array( $entry['glyph'] ?? null ) ) {
				continue;
			}
			$brands[ $slug ] = array(
				'slug'        => $slug,
				'label'       => (string) ( $entry['label'] ?? $slug ),
				'siteInfoKey' => (string) ( $entry['siteInfoKey'] ?? '' ),
				'autoLabel'   => (string) ( $entry['autoLabel'] ?? '' ),
				'colour'      => $colour,
				'glyph'       => $entry['glyph'],
				'glyphBrand'  => is_array( $entry['glyphBrand'] ?? null ) ? $entry['glyphBrand'] : array(),
				'ground'      => $ground,
			);
		}
		return $brands;
	}
}

if ( ! function_exists( 'sgs_brand_by_slug' ) ) {
	/**
	 * One registry entry by its slug.
	 *
	 * @param string $slug Registry slug ('whatsapp', 'phone').
	 * @return array|null The entry, or null.
	 */
	function sgs_brand_by_slug( string $slug ): ?array {
		return sgs_brand_registry()[ $slug ] ?? null;
	}
}

if ( ! function_exists( 'sgs_brand_by_site_info_key' ) ) {
	/**
	 * The registry entry a Site Info key links to.
	 *
	 * @param string $key Site Info key ('phone', 'socials.whatsapp').
	 * @return array|null The entry whose value that key holds, or null.
	 */
	function sgs_brand_by_site_info_key( string $key ): ?array {
		foreach ( sgs_brand_registry() as $brand ) {
			if ( '' !== $key && $brand['siteInfoKey'] === $key ) {
				return $brand;
			}
		}
		return null;
	}
}

if ( ! function_exists( 'sgs_brand_by_lucide_name' ) ) {
	/**
	 * The brand a Lucide icon draws, when that icon is a brand's own mark (Instagram's `instagram`). Contact
	 * entries (phone, email, address) carry no brand colour and are never matched: a phone glyph is not a brand.
	 *
	 * @param string $name Lucide icon name.
	 * @return array|null The brand entry, or null.
	 */
	function sgs_brand_by_lucide_name( string $name ): ?array {
		foreach ( sgs_brand_registry() as $brand ) {
			if ( '' !== $brand['colour'] && ( $brand['glyph']['lucide'] ?? null ) === $name ) {
				return $brand;
			}
		}
		return null;
	}
}

if ( ! function_exists( 'sgs_brand_glyph_svg' ) ) {
	/**
	 * A registry glyph as inline SVG, decorative (`aria-hidden`): the caller's text or label names the action.
	 *
	 * @param array  $brand      Registry entry.
	 * @param string $class_name The `<svg>` element's class ('' for none).
	 * @param int    $size       Width and height attributes of an SVG mark, in px (a Lucide glyph keeps its own 24).
	 * @param bool   $branded    Draw the entry's fixed-colour `glyphBrand` mark when it has one.
	 * @return string SVG markup, or '' when the glyph cannot be drawn.
	 */
	function sgs_brand_glyph_svg( array $brand, string $class_name = '', int $size = 24, bool $branded = false ): string {
		$glyph = $branded && ! empty( $brand['glyphBrand'] ) ? $brand['glyphBrand'] : ( $brand['glyph'] ?? array() );
		if ( isset( $glyph['lucide'] ) && is_string( $glyph['lucide'] ) ) {
			require_once __DIR__ . '/lucide-icons.php';
			$svg = (string) sgs_get_lucide_icon( $glyph['lucide'] );
			if ( '' === $svg || '' === $class_name ) {
				return $svg;
			}
			return (string) preg_replace( '/<svg class="/', '<svg class="' . esc_attr( $class_name ) . ' ', $svg, 1 );
		}
		$svg = isset( $glyph['svg'] ) && is_string( $glyph['svg'] ) ? $glyph['svg'] : '';
		if ( 0 !== strpos( $svg, '<svg ' ) ) {
			return '';
		}
		$attrs = ( '' !== $class_name ? ' class="' . esc_attr( $class_name ) . '"' : '' )
			. ' width="' . absint( $size ) . '" height="' . absint( $size ) . '" aria-hidden="true" focusable="false"';
		return '<svg' . $attrs . substr( $svg, 4 );
	}
}

if ( ! function_exists( 'sgs_brand_paint' ) ) {
	/**
	 * The colours a brand paints an icon with (Bean decision D5): the brand colour as the ground and border, a white
	 * glyph when white reaches 3:1 on it, else a near-black glyph when that reaches 3:1, else no glyph colour (the
	 * theme's own glyph colour shows). Hover swaps glyph and ground. When the icon draws the brand's fixed-colour
	 * mark (`glyphBrand`), the mark sits on the brand's `ground` and keeps it on hover; it takes no glyph paint.
	 *
	 * @param array $brand      Registry entry.
	 * @param bool  $fixed_mark The icon draws the entry's `glyphBrand` mark.
	 * @return array{ground:string,glyph:string,border:string,ground_hover:string,glyph_hover:string,fixed:bool} Hex
	 *         colours ('' = no brand value for that slot); empty slots throughout for an entry with no colour.
	 */
	function sgs_brand_paint( array $brand, bool $fixed_mark = false ): array {
		$none   = array(
			'ground'       => '',
			'glyph'        => '',
			'border'       => '',
			'ground_hover' => '',
			'glyph_hover'  => '',
			'fixed'        => false,
		);
		$colour = (string) ( $brand['colour'] ?? '' );
		if ( '' === $colour ) {
			return $none;
		}
		if ( $fixed_mark && ! empty( $brand['glyphBrand'] ) ) {
			$ground = '' !== (string) ( $brand['ground'] ?? '' ) ? (string) $brand['ground'] : $colour;
			return array_merge(
				$none,
				array(
					'ground'       => $ground,
					'border'       => $colour,
					'ground_hover' => $ground,
					'fixed'        => true,
				)
			);
		}
		$glyph = '';
		if ( sgs_wcag_contrast_ratio( '#FFFFFF', $colour ) >= 3.0 ) {
			$glyph = '#FFFFFF';
		} elseif ( sgs_wcag_contrast_ratio( SGS_BRAND_DARK_GLYPH, $colour ) >= 3.0 ) {
			$glyph = SGS_BRAND_DARK_GLYPH;
		}
		return array_merge(
			$none,
			array(
				'ground'       => $colour,
				'glyph'        => $glyph,
				'border'       => $colour,
				'ground_hover' => $glyph,
				'glyph_hover'  => '' !== $glyph ? $colour : '',
			)
		);
	}
}

if ( ! function_exists( 'sgs_whatsapp_glyph_svg' ) ) {
	/**
	 * The WhatsApp mark from the registry, filled with `currentColor` so CSS sets its colour. Decorative: the
	 * caller's own text names the action.
	 *
	 * @param string $class_name The `<svg>` element's class.
	 * @param int    $size       Width and height attributes, in px.
	 * @return string SVG markup, or '' when the registry has no WhatsApp entry.
	 */
	function sgs_whatsapp_glyph_svg( string $class_name, int $size = 24 ): string {
		$brand = sgs_brand_by_slug( 'whatsapp' );
		return null === $brand ? '' : sgs_brand_glyph_svg( $brand, $class_name, $size );
	}
}
