<?php
/**
 * Render helpers for sgs/icon: the length allowlist its scoped CSS accepts, its link's accessible name, whether a
 * render is the editor's, the group defaults a wrapping `sgs/social-icons` row hands its icons, and the shape list
 * with the custom outlines' registry reader (`includes/data/icon-shapes.json`), SVG and stroke.
 *
 * Shared by `src/blocks/icon/render.php` and `src/blocks/social-icons/render.php`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-css-safety.php';
require_once __DIR__ . '/helpers-brand-glyphs.php';
require_once __DIR__ . '/helpers-box.php';
require_once __DIR__ . '/helpers-border-style.php';

if ( ! function_exists( 'sgs_icon_length_value' ) ) {
	/**
	 * A size an icon control stored, as one safe CSS length, or ''.
	 *
	 * Accepts only: a number (px), `<number>px|rem|em|%`, a theme spacing preset as `var(--wp--preset--spacing--x)`,
	 * or the bare preset slug the length control stores ('50'). Anything else, including `calc()`, keywords,
	 * negatives and any declaration breakout, gives ''. Lengths are clamped to `$max_px` (rem and em at 16px each,
	 * percentages at 100%).
	 *
	 * @param mixed $raw    Stored value.
	 * @param int   $max_px Largest length allowed, in px.
	 * @return string A CSS length, or ''.
	 */
	function sgs_icon_length_value( $raw, int $max_px = 512 ): string {
		if ( is_int( $raw ) || is_float( $raw ) ) {
			$raw = (string) $raw;
		}
		if ( ! is_string( $raw ) ) {
			return '';
		}
		$value = trim( $raw );
		if ( '' === $value ) {
			return '';
		}
		if ( preg_match( '/^var\(--wp--preset--spacing--([a-z0-9-]+)\)$/', $value ) ) {
			return $value;
		}
		if ( preg_match( '/^\d+$/', $value ) && in_array( $value, sgs_css_length_value_preset_slugs(), true ) ) {
			return 'var(--wp--preset--spacing--' . $value . ')';
		}
		if ( ! preg_match( '/^(\d+(?:\.\d+)?)(px|rem|em|%)?$/', $value, $m ) ) {
			return '';
		}
		$unit = $m[2] ?? '';
		$unit = '' === $unit ? 'px' : $unit;
		$max  = array(
			'px'  => (float) $max_px,
			'rem' => $max_px / 16,
			'em'  => $max_px / 16,
			'%'   => 100.0,
		)[ $unit ];
		$num  = min( (float) $m[1], $max );
		return rtrim( rtrim( number_format( $num, 3, '.', '' ), '0' ), '.' ) . $unit;
	}
}

if ( ! function_exists( 'sgs_icon_link_scheme' ) ) {
	/**
	 * A link's scheme, lowercase ('tel', 'mailto', 'https'), or '' for a relative link.
	 *
	 * @param string $url Link URL.
	 * @return string The scheme, or ''.
	 */
	function sgs_icon_link_scheme( string $url ): string {
		return preg_match( '/^([a-z][a-z0-9+.-]*):/i', trim( $url ), $m ) ? strtolower( $m[1] ) : '';
	}
}

if ( ! function_exists( 'sgs_icon_accessible_name' ) ) {
	/**
	 * The name a linked icon announces, first match wins: the client's own label; the registry's label for the Site
	 * Info key the link is bound to ('Call us'); the registry's label for the brand the glyph draws ('Follow us on
	 * Instagram'); a label from the link's scheme ('Call', 'Email'); the link's site name ('example.com'). '' when
	 * none applies (a relative link with no label), which the editor flags.
	 *
	 * @param string     $aria_label  The block's `ariaLabel`.
	 * @param string     $bound_key   Site Info key `linkUrl` is bound to, or ''.
	 * @param array|null $glyph_brand Registry entry the glyph draws, or null.
	 * @param string     $url         The link.
	 * @return string The accessible name (unescaped).
	 */
	function sgs_icon_accessible_name( string $aria_label, string $bound_key, ?array $glyph_brand, string $url ): string {
		$own = trim( $aria_label );
		if ( '' !== $own ) {
			return $own;
		}
		$key_brand = '' !== $bound_key ? sgs_brand_by_site_info_key( $bound_key ) : null;
		foreach ( array( $key_brand, $glyph_brand ) as $brand ) {
			if ( null !== $brand && '' !== $brand['autoLabel'] ) {
				return __( $brand['autoLabel'], 'sgs-blocks' ); // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText -- registry labels (includes/data/brand-registry.json).
			}
		}
		$scheme = sgs_icon_link_scheme( $url );
		if ( 'tel' === $scheme ) {
			return __( 'Call', 'sgs-blocks' );
		}
		if ( 'mailto' === $scheme ) {
			return __( 'Email', 'sgs-blocks' );
		}
		if ( in_array( $scheme, array( 'http', 'https' ), true ) ) {
			$host = (string) ( function_exists( 'wp_parse_url' ) ? wp_parse_url( $url, PHP_URL_HOST ) : parse_url( $url, PHP_URL_HOST ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url -- fallback outside WordPress (unit tests).
			return (string) preg_replace( '/^www\./i', '', $host );
		}
		return '';
	}
}

if ( ! function_exists( 'sgs_icon_visible_label' ) ) {
	/**
	 * The text a visible label shows: the client's own label text, else the icon's accessible name
	 * (sgs_icon_accessible_name()), so the words a sighted visitor reads are the link's name.
	 *
	 * @param string     $label_text  The block's `labelText`.
	 * @param string     $aria_label  The block's `ariaLabel`.
	 * @param string     $bound_key   Site Info key `linkUrl` is bound to, or ''.
	 * @param array|null $glyph_brand Registry entry the glyph draws, or null.
	 * @param string     $url         The link, or ''.
	 * @return string The label (unescaped), '' when nothing names the icon.
	 */
	function sgs_icon_visible_label( string $label_text, string $aria_label, string $bound_key, ?array $glyph_brand, string $url ): string {
		$own = trim( $label_text );
		return '' !== $own ? $own : sgs_icon_accessible_name( $aria_label, $bound_key, $glyph_brand, $url );
	}
}

if ( ! function_exists( 'sgs_icon_label_position' ) ) {
	/**
	 * Where an icon's visible label sits: its own position, except that an icon left on `end` (the default) inside an
	 * `sgs/social-icons` row takes the row's position.
	 *
	 * @param mixed  $own   The block's `labelPosition`.
	 * @param string $group The row's position from sgs_icon_group_context(), or ''.
	 * @return string end | start | below.
	 */
	function sgs_icon_label_position( $own, string $group ): string {
		$own = is_string( $own ) && in_array( $own, array( 'end', 'start', 'below' ), true ) ? $own : 'end';
		return 'end' === $own && '' !== $group ? $group : $own;
	}
}

if ( ! function_exists( 'sgs_icon_is_editor_render' ) ) {
	/**
	 * True when the block renders for the editor: an admin screen, or a REST request in the editor's `edit` context
	 * by a user who can edit posts (core's block renderer). A visitor's page, a logged-in admin on the front end and
	 * a public REST read are never the editor.
	 *
	 * @return bool
	 */
	function sgs_icon_is_editor_render(): bool {
		$is_ajax = function_exists( 'wp_doing_ajax' ) && wp_doing_ajax();
		if ( function_exists( 'is_admin' ) && is_admin() && ! $is_ajax ) {
			return true;
		}
		$is_rest = ( function_exists( 'wp_is_serving_rest_request' ) && wp_is_serving_rest_request() ) || ( defined( 'REST_REQUEST' ) && REST_REQUEST );
		if ( ! $is_rest ) {
			return false;
		}
		$context = isset( $_GET['context'] ) && is_string( $_GET['context'] ) ? strtolower( (string) preg_replace( '/[^a-z]/i', '', $_GET['context'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- read-only context flag, reduced to letters; the capability check decides.
		return 'edit' === $context && function_exists( 'current_user_can' ) && current_user_can( 'edit_posts' );
	}
}

if ( ! function_exists( 'sgs_icon_group_context' ) ) {
	/**
	 * The group defaults a wrapping `sgs/social-icons` hands its `sgs/icon` children through block context
	 * (`social-icons/block.json::providesContext`). The row is present when its colour-mode key is in the context:
	 * the attribute has a default, so core always passes it.
	 *
	 * @param mixed $context The icon's block context (`$block->context`).
	 * @return array{in_group:bool, colour_mode:string, hidden:string[], shape:string, show_bg:bool, border:bool, border_width:array, border_style:string, show_label:bool, label_position:string}
	 */
	function sgs_icon_group_context( $context ): array {
		$context   = is_array( $context ) ? $context : array();
		$in_group  = array_key_exists( 'sgs/socialIconsColourMode', $context );
		$mode      = (string) ( $context['sgs/socialIconsColourMode'] ?? '' );
		$hidden    = is_array( $context['sgs/socialIconsHiddenLinks'] ?? null ) ? array_values( array_filter( $context['sgs/socialIconsHiddenLinks'], 'is_string' ) ) : array();
		$shape     = (string) ( $context['sgs/socialIconsShape'] ?? '' );
		$width     = is_array( $context['sgs/socialIconsBorderWidth'] ?? null ) ? $context['sgs/socialIconsBorderWidth'] : array();
		$label_pos = (string) ( $context['sgs/socialIconsLabelPosition'] ?? '' );
		return array(
			'in_group'       => $in_group,
			'colour_mode'    => in_array( $mode, array( 'inherit', 'theme', 'brand' ), true ) ? $mode : 'inherit',
			'hidden'         => $hidden,
			'shape'          => in_array( $shape, sgs_icon_shape_slugs(), true ) ? $shape : '',
			'show_bg'        => ! empty( $context['sgs/socialIconsShowBackground'] ),
			'border'         => array() !== sgs_icon_group_border_decls( $width, $context['sgs/socialIconsBorderStyle'] ?? '' ),
			'border_width'   => $width,
			'border_style'   => is_string( $context['sgs/socialIconsBorderStyle'] ?? null ) ? $context['sgs/socialIconsBorderStyle'] : '',
			'show_label'     => ! empty( $context['sgs/socialIconsShowLabel'] ),
			'label_position' => in_array( $label_pos, array( 'end', 'start', 'below' ), true ) ? $label_pos : '',
		);
	}
}

if ( ! function_exists( 'sgs_icon_group_border_decls' ) ) {
	/**
	 * The group border a `sgs/social-icons` row gives its icons, as the custom properties icon/style.css reads
	 * (`--sgs-si-border-width`, `--sgs-si-border-style`), or none. A width with no chosen style paints solid; no width,
	 * or the style `none`, paints nothing. Editor twin: `sgsBorderPreview()` (border-preview.js) in social-icons/edit.js.
	 *
	 * @param mixed $width_box Stored `{top,right,bottom,left}` widths.
	 * @param mixed $style     Stored border style.
	 * @return string[] Declarations.
	 */
	function sgs_icon_group_border_decls( $width_box, $style ): array {
		$width = sgs_box_object_shorthand( is_array( $width_box ) ? $width_box : array() );
		$style = sgs_border_style_keyword( $style );
		if ( null === $width || 'none' === $style ) {
			return array();
		}
		return array( '--sgs-si-border-width:' . $width, '--sgs-si-border-style:' . $style );
	}
}

if ( ! function_exists( 'sgs_icon_outline_shapes' ) ) {
	/**
	 * The custom outline shapes (icon plan D2), keyed by slug, in the registry's order: one SVG path each in a
	 * `0 0 100 100` viewBox. Read from `includes/data/icon-shapes.json`, the one list the editor imports through
	 * `src/utils/icon-shapes.js`. An entry with an unsafe slug, a box-shape slug or a path holding anything but path
	 * commands and numbers is dropped, so a bad edit to the JSON never reaches the markup.
	 *
	 * @return array<string,array{slug:string,label:string,d:string}>
	 */
	function sgs_icon_outline_shapes(): array {
		static $shapes = null;
		if ( null !== $shapes ) {
			return $shapes;
		}
		$shapes = array();
		$raw    = @file_get_contents( __DIR__ . '/data/icon-shapes.json' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents,WordPress.PHP.NoSilencedErrors.Discouraged -- a local plugin data file; a missing file leaves no outline shapes.
		$data   = is_string( $raw ) ? json_decode( $raw, true ) : null;
		$list   = is_array( $data['shapes'] ?? null ) ? $data['shapes'] : array();
		foreach ( $list as $entry ) {
			$slug = is_string( $entry['slug'] ?? null ) ? $entry['slug'] : '';
			$d    = is_string( $entry['d'] ?? null ) ? trim( $entry['d'] ) : '';
			if ( ! preg_match( '/^[a-z][a-z0-9-]*$/', $slug ) || in_array( $slug, sgs_icon_box_shapes(), true ) || ! preg_match( '/^[MLHVCSQTAZmlhvcsqtaz0-9.,\s-]+$/', $d ) ) {
				continue;
			}
			$shapes[ $slug ] = array(
				'slug'  => $slug,
				'label' => is_string( $entry['label'] ?? null ) ? $entry['label'] : $slug,
				'd'     => $d,
			);
		}
		return $shapes;
	}
}

if ( ! function_exists( 'sgs_icon_box_shapes' ) ) {
	/**
	 * The shapes icon/style.css draws as a box (background and CSS border): the square takes a radius, the circle
	 * and pill draw their own.
	 *
	 * @return string[]
	 */
	function sgs_icon_box_shapes(): array {
		return array( 'square', 'circle', 'pill' );
	}
}

if ( ! function_exists( 'sgs_icon_shape_slugs' ) ) {
	/**
	 * Every `shape` value an icon accepts, box shapes first, then the outlines; `icon/block.json::attributes.shape.enum`
	 * lists exactly these (IconRenderTest asserts it).
	 *
	 * @return string[]
	 */
	function sgs_icon_shape_slugs(): array {
		return array_merge( sgs_icon_box_shapes(), array_keys( sgs_icon_outline_shapes() ) );
	}
}

if ( ! function_exists( 'sgs_icon_is_outline_shape' ) ) {
	/**
	 * @param string $shape A `shape` value.
	 * @return bool True for a custom outline (drawn by an inline SVG, not the box).
	 */
	function sgs_icon_is_outline_shape( string $shape ): bool {
		return isset( sgs_icon_outline_shapes()[ $shape ] );
	}
}

if ( ! function_exists( 'sgs_icon_shape_width_only' ) ) {
	/**
	 * @param string $shape A `shape` value.
	 * @return bool True when the shape's height always equals its width (the circle and every outline).
	 */
	function sgs_icon_shape_width_only( string $shape ): bool {
		return 'circle' === $shape || sgs_icon_is_outline_shape( $shape );
	}
}

if ( ! function_exists( 'sgs_icon_outline_svg' ) ) {
	/**
	 * The inline SVG an outline shape draws behind the glyph. Paint comes only from icon/style.css (classes
	 * `sgs-icon__outline`, `sgs-icon__outline-path` and the `--sgs-icon-*` chain): the markup carries no fill or
	 * stroke. The stroke is twice the border width and clipped to the path, so the visible half sits inside the shape
	 * and the viewBox never cuts it.
	 *
	 * @param string $shape   An outline slug.
	 * @param string $clip_id The clip path's id (unique per icon render).
	 * @return string SVG markup, or '' for a shape that is not an outline.
	 */
	function sgs_icon_outline_svg( string $shape, string $clip_id ): string {
		$entry = sgs_icon_outline_shapes()[ $shape ] ?? null;
		if ( null === $entry ) {
			return '';
		}
		$d  = esc_attr( $entry['d'] );
		$id = esc_attr( $clip_id );
		return '<svg class="sgs-icon__outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
			. '<defs><clipPath id="' . $id . '"><path d="' . $d . '"/></clipPath></defs>'
			. '<path class="sgs-icon__outline-path" d="' . $d . '" clip-path="url(#' . $id . ')"/>'
			. '</svg>';
	}
}

if ( ! function_exists( 'sgs_icon_outline_stroke' ) ) {
	/**
	 * The stroke an outline shape draws for a border width box and style (a wrapping row's group border): the same
	 * declarations a box border prints (sgs_border_box_decls()) read through sgs_icon_outline_from_border(), so a group
	 * border and an icon's own border follow one rule. Editor twin: `outlineStroke()` (src/blocks/icon/icon-state.js).
	 *
	 * @param mixed $width_box Stored `{top,right,bottom,left}` widths.
	 * @param mixed $style     Stored border style.
	 * @return array{width:string,dash:string} `dash` is 'solid', 'dashed' or 'dotted'; `width` '' for no stroke.
	 */
	function sgs_icon_outline_stroke( $width_box, $style ): array {
		$stroke = sgs_icon_outline_from_border( array( 'base' => sgs_border_box_decls( $width_box, $style ) ) );
		$width  = $stroke['width']['desktop'] ?? '';
		return array(
			'width' => $width,
			'dash'  => '' !== $width ? $stroke['dash'] : 'solid',
		);
	}
}

if ( ! function_exists( 'sgs_icon_outline_from_border' ) ) {
	/**
	 * An outline shape's stroke, read from the declarations `sgs_border_element_decls()` built for the icon's own
	 * border, so the border attributes are read in one place: per device the width (the top side when set, else the
	 * first set side; an unset side prints `0`), the dash pattern, the flat resting and hover colours, and whether the
	 * client chose the style `none` (which also keeps a row's group border off). A gradient prints no `border-color`,
	 * so an outline ignores it. Width: the first printed side that is set (an unset side prints `0`), as one length
	 * through sgs_css_single_length_value(), since style.css doubles it inside calc(); a side holding a list gives its
	 * first length.
	 *
	 * @param array $border sgs_border_element_decls() result.
	 * @return array{width:array<string,string>,dash:string,colour:string,hover:string,none:bool}
	 */
	function sgs_icon_outline_from_border( array $border ): array {
		$out = array(
			'width'  => array(),
			'dash'   => 'solid',
			'colour' => '',
			'hover'  => '',
			'none'   => false,
		);
		foreach ( (array) ( $border['rules'] ?? array() ) as $rule ) {
			if ( false !== strpos( (string) $rule, '{border-style:none;border-width:0;}' ) ) {
				$out['none'] = true;
			}
		}
		foreach ( array(
			'base'   => 'desktop',
			'tablet' => 'tablet',
			'mobile' => 'mobile',
		) as $key => $tier ) {
			$style = '';
			$sides = array();
			foreach ( (array) ( $border[ $key ] ?? array() ) as $decl ) {
				if ( ! preg_match( '/^border-(style|width|color):(.+)$/s', (string) $decl, $m ) ) {
					continue;
				}
				if ( 'style' === $m[1] ) {
					$style = $m[2];
				} elseif ( 'width' === $m[1] ) {
					$sides = sgs_icon_css_value_tokens( $m[2] );
				} elseif ( 'base' === $key ) {
					$out['colour'] = $m[2];
				}
			}
			foreach ( $sides as $side ) {
				$width = '0' === $side ? '' : sgs_css_single_length_value( $side );
				if ( '' !== $width ) {
					$out['width'][ $tier ] = $width;
					$out['dash']           = in_array( $style, array( 'dashed', 'dotted' ), true ) ? $style : 'solid';
					break;
				}
			}
		}
		foreach ( (array) ( $border['hover'] ?? array() ) as $decl ) {
			if ( preg_match( '/^border-color:(.+)$/s', (string) $decl, $m ) ) {
				$out['hover'] = $m[1];
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_icon_css_value_tokens' ) ) {
	/**
	 * A CSS value split on top-level spaces, so `calc(1px + 1px) 0 0 0` gives four tokens.
	 *
	 * @param string $value CSS value.
	 * @return string[] Tokens.
	 */
	function sgs_icon_css_value_tokens( string $value ): array {
		$tokens  = array();
		$current = '';
		$depth   = 0;
		$length  = strlen( $value );
		for ( $i = 0; $i < $length; $i++ ) {
			$char = $value[ $i ];
			if ( '(' === $char ) {
				++$depth;
			} elseif ( ')' === $char ) {
				--$depth;
			}
			if ( ' ' === $char && 0 === $depth ) {
				if ( '' !== $current ) {
					$tokens[] = $current;
				}
				$current = '';
				continue;
			}
			$current .= $char;
		}
		if ( '' !== $current ) {
			$tokens[] = $current;
		}
		return $tokens;
	}
}
