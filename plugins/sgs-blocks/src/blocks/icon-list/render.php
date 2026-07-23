<?php
/**
 * Server-side render for the SGS Icon List block.
 *
 * Outputs inline SVG icons via sgs_get_lucide_icon(), eliminating brittle
 * CSS content/Unicode rendering that breaks on some platforms.
 *
 * NO-INLINE (LOCKED per-block no-inline migration contract §A, 2026-07-09):
 * the rendered `<ul>` root AND every `<li>`/icon-span/text-span descendant
 * carry ZERO inline CSS property declarations. Every declaration is emitted
 * into the block's OWN scoped `.{uid}` <style> tag. The `color`/`typography`/
 * `spacing`/`__experimentalBorder` WP supports declare
 * `__experimentalSkipSerialization` in block.json so
 * get_block_wrapper_attributes() never auto-inlines them. The `--sgs-icon-
 * list-gap` custom property on the root is a VALUE, not a declaration, so it
 * stays on the element per the contract.
 *
 * BLOCK-PRIVATE (this is a leaf composite — an arrayContentLift list of
 * icon+text items rendered from a single `items` attribute, not a genuine
 * section/layout composite) — no SGS_Container_Wrapper involved, mirrors
 * sgs/label.
 *
 * BOX-GROUP (contract §B): `padding`/`margin` are WP-native
 * `style.spacing.*` objects (skip-serialised → scoped via
 * wp_style_engine_get_styles); tiers = paddingTablet/paddingMobile/
 * marginTablet/marginMobile SGS object attrs. `borderRadius` is the
 * WP-native `style.border.radius` object (skip-serialised, scoped); tiers =
 * borderRadiusTablet/borderRadiusMobile SGS object attrs. `borderWidth` has
 * no WP-native per-side support in this block's `__experimentalBorder`
 * config (radius only), so it is an SGS custom object attr `{top,right,
 * bottom,left}` (base only, matches sgs/quote's pattern), paired with the
 * scalar `borderColour`/`borderStyle` attrs.
 *
 * Per-item icon/text colour (iconColour/textColour) previously wrote an
 * identical `style="color:…"` attribute onto EVERY `<li>`'s icon/text span
 * (not truly per-item — same value repeated across the array). These now
 * emit ONCE into the scoped `<style>` targeting `.{uid} .sgs-icon-list__icon`
 * / `.{uid} .sgs-icon-list__text`, never inline on the repeated elements.
 *
 * @since 2026-05-?? Initial icon-list render.
 * @since 2026-07-10 No-inline migration (box-object attrs + scoped output).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/wp-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-nav-menu-source.php';

// ---------------------------------------------------------------------------
// 0. FR-36-26c Dispatch B — resolve `source: menu` into flat { text, url }
// items via the ONE shared resolver (SGS_Nav_Menu_Source, R-31-9 — never a
// second menu-walker). This mirrors sgs/nav-menu's own
// SGS_Nav_Menu_Bar_Renderer::flatten() (top-level items only; a submenu
// collapses to its own parent link, matching the bar's Phase-1 behaviour) —
// that class is declared inside nav-menu/render.php's own file scope and is
// not reusable across blocks, so the FLATTENING step (not the menu-walking
// step) is reproduced here at the same, small scope. The actual menu
// resolution (classic-menu lookup, term → items) is entirely delegated to
// SGS_Nav_Menu_Source; nothing here re-implements that.
// ---------------------------------------------------------------------------

/**
 * Flatten resolved nav blocks (from SGS_Nav_Menu_Source::get_menu_blocks())
 * into `{ text, url }` pairs shaped like an `sgs/icon-list` typed item, so
 * they can be rendered through the SAME per-item loop as typed items.
 *
 * @param array $blocks Parsed nav blocks.
 * @return array<int, array{text:string, url:string}>
 */
function sgs_icon_list_flatten_menu_blocks( array $blocks ) {
	$flat = array();
	foreach ( $blocks as $block ) {
		$name = $block['blockName'] ?? '';
		switch ( $name ) {
			case 'core/navigation-link':
			case 'core/navigation-submenu': // Parent's own link only — no nested children this phase.
				$label = (string) ( $block['attrs']['label'] ?? '' );
				if ( '' === $label ) {
					break;
				}
				$flat[] = array(
					'text' => $label,
					'url'  => (string) ( $block['attrs']['url'] ?? '#' ),
				);
				break;
			case 'core/home-link':
				$flat[] = array(
					'text' => __( 'Home', 'sgs-blocks' ),
					'url'  => home_url( '/' ),
				);
				break;
			case 'core/page-list':
				$pages = get_pages(
					array(
						'parent'      => (int) ( $block['attrs']['parentPageID'] ?? 0 ),
						'sort_column' => 'menu_order,post_title',
						'post_status' => 'publish',
					)
				);
				foreach ( $pages as $page ) {
					$flat[] = array(
						'text' => (string) $page->post_title,
						'url'  => (string) get_permalink( $page->ID ),
					);
				}
				break;
			default:
				// Whitespace / unknown block — skip.
				break;
		}
	}
	return $flat;
}

// ---------------------------------------------------------------------------
// 1. Security sanitisers (contract §D) — a CSS-length sanitiser for box/side
// values and a CSS-keyword sanitiser for free-text properties (mirrors
// sgs/label + sgs/quote).
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 2. Legacy editor slug → Lucide name (items authored before the visual picker).
// ---------------------------------------------------------------------------

$icon_map = array(
	'check'       => 'check',
	'star-filled' => 'star',
	'arrow-right' => 'arrow-right',
	'shipping'    => 'truck',
	'shield'      => 'shield',
	'payment'     => 'credit-card',
	'globe'       => 'globe',
	'people'      => 'users',
);

/**
 * Render the inner markup for an icon from any of the four sources.
 * Decorative — the caller wraps it in an aria-hidden span.
 *
 * @param string $source lucide | wp-icon | dashicon | emoji.
 * @param string $name   Icon identifier for that source.
 * @return string Inner icon markup.
 */
$render_icon = static function ( $source, $name ) {
	switch ( $source ) {
		case 'emoji':
			return esc_html( $name );
		case 'dashicon':
			$slug = preg_replace( '/[^a-z0-9-]/', '', strtolower( $name ) );
			return '<span class="dashicons dashicons-' . esc_attr( $slug ) . '"></span>';
		case 'wp-icon':
			return sgs_get_wp_icon( preg_replace( '/[^a-z0-9-]/', '', strtolower( $name ) ) );
		case 'lucide':
		default:
			return sgs_get_lucide_icon( preg_replace( '/[^a-z0-9-]/', '', strtolower( $name ) ) );
	}
};

// ---------------------------------------------------------------------------
// 3. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$items          = $attributes['items'] ?? array();
$default_icon   = $attributes['icon'] ?? 'check';
$default_source = $attributes['defaultIconSource'] ?? 'lucide';
$icon_colour    = $attributes['iconColour'] ?? '';
$icon_size      = $attributes['iconSize'] ?? 'medium';
$dividers       = ! empty( $attributes['dividers'] );
$text_colour    = $attributes['textColour'] ?? '';
$gap            = $attributes['gap'] ?? '20';

// FR-36-26c: heading + marker-type. `heading` blank = no heading element at
// all. `headingLevel`/`markerType` carry no JSON `enum` (an out-of-enum
// stored value is otherwise silently coerced to the block.json default —
// blockjson-enum-coerces-invalid-to-default), so both are validated here.
$heading_text           = isset( $attributes['heading'] ) ? trim( (string) $attributes['heading'] ) : '';
$allowed_heading_levels = array( 'h2', 'h3', 'h4', 'h5', 'h6', 'p' );
$heading_level          = in_array( $attributes['headingLevel'] ?? '', $allowed_heading_levels, true )
	? $attributes['headingLevel']
	: 'h3';
$marker_type            = sgs_list_marker_sanitise_type( $attributes['markerType'] ?? '', 'icon' );
$list_tag               = sgs_list_marker_element_tag( $marker_type );

// FR-36-26c Dispatch B: `source`/`menuRef`/`renderLandmark` carry no JSON
// `enum` either (same blockjson-enum-coerces-invalid-to-default reason), so
// `source` is validated here too.
$source    = in_array( $attributes['source'] ?? '', array( 'typed', 'menu' ), true ) ? $attributes['source'] : 'typed';
$menu_ref  = absint( $attributes['menuRef'] ?? 0 );
$want_nav  = ! empty( $attributes['renderLandmark'] );
$menu_name = '';

// --- Resolve items for the two sources into ONE shape ({text,url,...}) so
// the SAME per-item render loop (step 7) handles both. `source: menu` with
// no menuRef set (0/invalid) renders nothing extra — fail soft, no fatal. ---
if ( 'menu' === $source ) {
	$resolved_items = array();
	if ( $menu_ref > 0 ) {
		// Resolve ONLY the requested menu ref (fail soft to empty on a
		// stale/deleted ref). `get_menu_blocks()` is the "find ANY menu"
		// resolver — on an unresolvable ref it falls through to the site
		// header nav / theme-location / latest-menu chain, which would make a
		// footer link-list silently render the SITE NAVIGATION instead of
		// nothing. That is especially likely on a CLONED site, where a numeric
		// ref from the source install has no matching menu id on the target.
		// `blocks_from_ref()` resolves the ref alone and returns [] when it
		// does not resolve — the fail-soft contract this block documents.
		$menu_blocks    = SGS_Nav_Menu_Source::blocks_from_ref( $menu_ref );
		$resolved_items = sgs_icon_list_flatten_menu_blocks( $menu_blocks );

		$menu_obj = wp_get_nav_menu_object( $menu_ref );
		if ( $menu_obj && ! is_wp_error( $menu_obj ) && ! empty( $menu_obj->name ) ) {
			$menu_name = (string) $menu_obj->name;
		}
	}
} else {
	$resolved_items = $items;
}

// --- FR-36-26a heading contract. An operator-entered `heading` is STICKY —
// it always wins over the menu's own name, so a later menu rename never
// silently replaces an operator's chosen title. Only a BLANK heading falls
// back to the resolved menu's name. ---
if ( '' === $heading_text && 'menu' === $source && '' !== $menu_name ) {
	$heading_text = $menu_name;
}

// --- FR-36-26a `<nav>` contract (rule 3: OPT-IN, never automatic).
// menu-bound  → always a landmark (when it resolved any items).
// typed + urls → landmark only when the operator opted in via renderLandmark.
// typed, no urls → NEVER a landmark, regardless of the renderLandmark attr —
// a list nobody can navigate through is not a navigation landmark. ---
$items_have_urls = false;
foreach ( $resolved_items as $maybe_url_item ) {
	if ( ! empty( $maybe_url_item['url'] ) ) {
		$items_have_urls = true;
		break;
	}
}

// A <nav> landmark MUST carry an accessible name (FR-36-26a rule 1 —
// aria-labelledby points at the visible heading). A nameless <nav> is an
// a11y defect and, when two link-list columns are both landmarks (this
// block's own multi-column-footer use case), fails axe `landmark-unique`.
// So the landmark is emitted ONLY when a heading exists to name it: for the
// menu source the heading has already fallen back to the menu's own name
// above, so a resolved menu always has one; a typed list needs the operator
// to have set a heading. No heading → degrade to a plain list, never a
// nameless landmark.
if ( 'menu' === $source ) {
	$render_landmark = ! empty( $resolved_items ) && '' !== $heading_text;
} else {
	$render_landmark = $want_nav && $items_have_urls && '' !== $heading_text;
}

// Validate icon size — only allow known sizes.
$allowed_icon_sizes = array( 'small', 'medium', 'large', 'xlarge' );
if ( ! in_array( $icon_size, $allowed_icon_sizes, true ) ) {
	$icon_size = 'medium';
}

// Sanitise gap to digits only — it is used as a spacing preset slug (e.g. "20", "30").
$gap_slug = preg_replace( '/[^0-9]/', '', $gap );

// ---------------------------------------------------------------------------
// 4. Box-object attrs — padding/margin (WP-native style.spacing.*, base) +
// SGS tier objects; border-radius (WP-native style.border.radius, base) +
// SGS tier objects; border-width (SGS custom object, base only).
// ---------------------------------------------------------------------------

$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

$padding_tablet_obj       = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj       = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj        = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj        = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys). Skip-serialised
// → emitted scoped via the style engine below.
$base_border_radius = null;
if ( isset( $attributes['style']['border']['radius'] ) ) {
	$radius_raw = $attributes['style']['border']['radius'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$base_border_radius = $radius_raw;
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean   = array();
		$has_any_corner = false;
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
			$radius_clean[ $corner ] = isset( $radius_raw[ $corner ] ) ? $sgs_css_length( $radius_raw[ $corner ] ) : '';
			if ( '' !== $radius_clean[ $corner ] ) {
				$has_any_corner = true;
			}
		}
		if ( $has_any_corner ) {
			$base_border_radius = $radius_clean;
		}
	}
}

// Border-width — SGS custom OBJECT attr { top, right, bottom, left }, base
// only (no tiers — matches the pre-existing base-only contract, sgs/quote
// pattern). Paired with scalar borderColour/borderStyle attrs.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = $sgs_css_length( $border_width_obj['top'] ?? '' );
$border_width_right  = $sgs_css_length( $border_width_obj['right'] ?? '' );
$border_width_bottom = $sgs_css_length( $border_width_obj['bottom'] ?? '' );
$border_width_left   = $sgs_css_length( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';
$border_colour         = $attributes['borderColour'] ?? '';

// WP `color`/`typography` support values (skip-serialised → NOT auto-inlined).
$style_color_text  = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg    = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug  = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug    = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
$style_font_size   = isset( $attributes['style']['typography']['fontSize'] ) ? (string) $attributes['style']['typography']['fontSize'] : '';
$style_line_height = isset( $attributes['style']['typography']['lineHeight'] ) ? (string) $attributes['style']['typography']['lineHeight'] : '';

// ---------------------------------------------------------------------------
// 5. Scoped CSS assembly. uid is a CLASS (this block has anchor support — the
// element's `id` attribute stays free for the anchor/ToC target, matching
// sgs/quote/sgs/container).
// ---------------------------------------------------------------------------

$uid      = 'sgs-ilist-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-icon-list';
$icon_sel = $root_sel . ' .sgs-icon-list__icon';
$text_sel = $root_sel . ' .sgs-icon-list__text';
// Heading id for FR-36-26a `aria-labelledby`. NOT derived from $uid: the uid
// is md5($attributes), so two blocks with byte-identical attributes share it —
// harmless for the class-scoped CSS (identical blocks want identical styling)
// but an INVALID duplicate DOM id, and it makes aria-labelledby ambiguous. A
// per-request unique id keeps the heading element's id and the wrapper's
// aria-labelledby consistent within THIS render while guaranteeing uniqueness
// on the page. (The CSS selector below is class-based, so it is unaffected.)
$heading_id   = wp_unique_id( 'sgs-ilist-heading-' );
$heading_sel  = $root_sel . ' .sgs-icon-list__heading';
$item_row_sel = $root_sel . ' .sgs-icon-list__item';

$scoped_css = array();

// --- Heading + item typography families (Bean R-22-13 — shared emitter,
// never a bespoke font-size control). Only set properties are emitted. ---
if ( function_exists( 'sgs_typography_css_rule' ) ) {
	$heading_typography_css = sgs_typography_css_rule( $attributes, 'heading', $heading_sel );
	if ( '' !== $heading_typography_css ) {
		$scoped_css[] = $heading_typography_css;
	}
	$item_typography_css = sgs_typography_css_rule( $attributes, 'item', $item_row_sel );
	if ( '' !== $item_typography_css ) {
		$scoped_css[] = $item_typography_css;
	}
}

// --- Per-item icon/text colour — emitted ONCE, scoped, never inline on the
// repeated <li> elements. ---
if ( $icon_colour ) {
	$scoped_css[] = "{$icon_sel}{color:" . sgs_colour_value( $icon_colour ) . ';}';
}
if ( $text_colour ) {
	$scoped_css[] = "{$text_sel}{color:" . sgs_colour_value( $text_colour ) . ';}';
}

// --- WP typography support (fontSize/lineHeight) — scoped onto the text
// selector (matches the block's declared `selectors.typography`). ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$typography_args = array();
	if ( '' !== $style_font_size ) {
		$typography_args['fontSize'] = $style_font_size;
	}
	if ( '' !== $style_line_height ) {
		$typography_args['lineHeight'] = $style_line_height;
	}
	if ( ! empty( $typography_args ) ) {
		$typography_scoped_styles = wp_style_engine_get_styles(
			array( 'typography' => $typography_args ),
			array( 'selector' => $text_sel )
		);
		if ( ! empty( $typography_scoped_styles['css'] ) ) {
			$scoped_css[] = $typography_scoped_styles['css'];
		}
	}
}

// --- WP colour support (text/background, skip-serialised) — scoped onto the
// root. Preset SLUGS get the standard has-* classes re-added manually below;
// custom hex/rgb values are emitted here via the style engine. ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( ! empty( $color_args ) ) {
		$color_scoped_styles = wp_style_engine_get_styles(
			array( 'color' => $color_args ),
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $color_scoped_styles['css'] ) ) {
			$scoped_css[] = $color_scoped_styles['css'];
		}
	}
}

// --- Base spacing (padding/margin) + border-radius — WP-native style.*
// objects, skip-serialised, emitted scoped via the stable core style engine
// (exactly how WP core outputs `layout` support). ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();

	$base_spacing = array();
	if ( ! empty( $base_padding_obj ) ) {
		$base_spacing['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$base_spacing['margin'] = $base_margin_obj;
	}
	if ( ! empty( $base_spacing ) ) {
		$base_style_engine_args['spacing'] = $base_spacing;
	}

	if ( null !== $base_border_radius ) {
		$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
	}

	if ( ! empty( $base_style_engine_args ) ) {
		$base_scoped_styles = wp_style_engine_get_styles(
			$base_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$scoped_css[] = $base_scoped_styles['css'];
		}
	}
}

// --- Border width/style/colour (SGS custom, base only) — hand-built,
// scoped. ---
if ( 'none' !== $border_style ) {
	$border_decls = array();
	if ( $has_border_width ) {
		$bwt            = '' !== $border_width_top ? $border_width_top : '0';
		$bwr            = '' !== $border_width_right ? $border_width_right : '0';
		$bwb            = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl            = '' !== $border_width_left ? $border_width_left : '0';
		$border_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	}
	$border_decls[] = 'border-style:' . $border_style;
	if ( $border_colour ) {
		$border_decls[] = 'border-color:' . sgs_colour_value( $border_colour );
	}
	$scoped_css[] = "{$root_sel}{" . implode( ';', $border_decls ) . ';}';
}

// --- Responsive padding/margin/border-radius tiers — box objects, hand-built
// shorthand, scoped @media on the SAME root selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

$sgs_corner_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$tl = $sgs_css_length( $box['topLeft'] ?? '' );
	$tr = $sgs_css_length( $box['topRight'] ?? '' );
	$br = $sgs_css_length( $box['bottomRight'] ?? '' );
	$bl = $sgs_css_length( $box['bottomLeft'] ?? '' );
	if ( '' === $tl && '' === $tr && '' === $br && '' === $bl ) {
		return null;
	}
	return ( '' !== $tl ? $tl : '0' ) . ' ' . ( '' !== $tr ? $tr : '0' ) . ' ' . ( '' !== $br ? $br : '0' ) . ' ' . ( '' !== $bl ? $bl : '0' );
};

$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );
$radius_tab_val  = $sgs_corner_shorthand( $border_radius_tablet_obj );
$radius_mob_val  = $sgs_corner_shorthand( $border_radius_mobile_obj );

$tablet_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_decls[] = "margin:{$margin_tab_val}";
}
if ( null !== $radius_tab_val ) {
	$tablet_decls[] = "border-radius:{$radius_tab_val}";
}
if ( $tablet_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "margin:{$margin_mob_val}";
}
if ( null !== $radius_mob_val ) {
	$mobile_decls[] = "border-radius:{$radius_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// ---------------------------------------------------------------------------
// 6. Build the root element's classes + attributes.
//
// uid is a CLASS (contract §B3 anchor-bearing rule) — the element's `id`
// attribute stays free for the anchor. is-style-* / align* classes are
// merged in automatically by get_block_wrapper_attributes() via the block's
// className attribute. The ONLY style passed is the `--sgs-icon-list-gap`
// custom-property VALUE (allowed, not a declaration) — the root carries NO
// CSS property declarations (contract §A).
// ---------------------------------------------------------------------------

// $list_visual_classes carries the LAYOUT classes (list-style/flex/gap in
// style.css) — always present on the `<ul>`/`<ol>` itself, whether or not it
// is also the wp-block root. $wrapper_only_classes carries the uid + WP
// preset colour classes and is added ONLY to whichever element ends up being
// the wp-block root (the list itself when there is no heading; the wrapping
// `<div>` when there is — see step 8).
$list_visual_classes = 'sgs-icon-list sgs-icon-list--icon-' . esc_attr( $icon_size ) . ' sgs-icon-list--marker-' . esc_attr( $marker_type );
if ( $dividers ) {
	$list_visual_classes .= ' sgs-icon-list--dividers';
}

$wrapper_only_classes = $uid;
if ( '' !== $preset_text_slug ) {
	$wrapper_only_classes .= ' has-text-color has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$wrapper_only_classes .= ' has-background has-' . $preset_bg_slug . '-background-color';
}

$root_style = $gap_slug ? '--sgs-icon-list-gap: var(--wp--preset--spacing--' . $gap_slug . ');' : '';

// Enqueue Dashicons on the frontend only when a dashicon can actually render
// (marker types other than icon/emoji never render the icon span at all).
$uses_dashicon = false;
if ( in_array( $marker_type, array( 'icon', 'emoji' ), true ) ) {
	$uses_dashicon = 'dashicon' === $default_source;
	foreach ( $items as $maybe_dashicon ) {
		if ( ( $maybe_dashicon['iconSource'] ?? '' ) === 'dashicon' ) {
			$uses_dashicon = true;
			break;
		}
	}
}
if ( $uses_dashicon ) {
	wp_enqueue_style( 'dashicons' );
}

// ---------------------------------------------------------------------------
// 7. Build each item's markup. NO inline style on the icon/text spans — the
// shared colour rules live in the scoped <style> above (step 5). The marker
// itself (icon span, or nothing for bullet/numbered/none) is built by the
// ONE shared helper, sgs_list_marker_render() (includes/helpers-list-markers.php).
// ---------------------------------------------------------------------------

$render_marker_icon = in_array( $marker_type, array( 'icon', 'emoji' ), true );

// $resolved_items (step 0/3 above) is the SAME shape for both sources —
// typed items keep their optional iconSource/iconName/newTab keys, menu
// items carry only text/url. Iterating one array means BOTH sources render
// through this one loop (real <li><a> for menu-bound lists, per FR-36-26a).
$items_html = '';
foreach ( $resolved_items as $item ) {
	$marker_html = '';
	if ( $render_marker_icon ) {
		// Resolve the item's icon source + name (migrating legacy {icon: slug} items).
		if ( ! empty( $item['iconSource'] ) ) {
			$item_source = $item['iconSource'];
			$item_name   = $item['iconName'] ?? $default_icon;
		} elseif ( ! empty( $item['icon'] ) ) {
			$item_source = 'lucide';
			$item_name   = $icon_map[ $item['icon'] ] ?? $item['icon'];
		} else {
			$item_source = $default_source;
			$item_name   = $default_icon;
		}
		$svg         = $render_icon( $item_source, $item_name );
		$marker_html = sgs_list_marker_render( $marker_type, $svg );
	}

	$item_text = $item['text'] ?? '';
	$item_url  = isset( $item['url'] ) ? esc_url( $item['url'] ) : '';

	// Wrap text in <a> when a per-item URL is provided. `data-sgs-nav-path`
	// mirrors nav-menu/view.js's contract exactly (FR-36-26a rule 2):
	// aria-current is computed CLIENT-SIDE only — a server-baked value would
	// be cached by LiteSpeed and served to every visitor on every page
	// (FR-36-11). Emitted for ANY item with a url, not just landmark items —
	// the FR-36-26a table's aria-current column applies whenever items carry
	// urls, independent of whether a <nav> wrapper is also rendered.
	if ( $item_url ) {
		// The text goes INSIDE this item's own <a>, so a stray <a> pasted into
		// the text field would nest anchors — invalid HTML and a broken focus
		// target. Allow inline formatting but strip anchors for the linked case.
		$linked_allowed = wp_kses_allowed_html( 'post' );
		unset( $linked_allowed['a'] );
		$text_content = sprintf(
			'<a href="%s" class="sgs-icon-list__item-link" data-sgs-nav-path="%s"%s>%s</a>',
			$item_url,
			esc_attr( wp_parse_url( $item_url, PHP_URL_PATH ) ?? '' ),
			! empty( $item['newTab'] ) ? ' target="_blank" rel="noopener noreferrer"' : '',
			wp_kses( $item_text, $linked_allowed )
		);
	} else {
		$text_content = wp_kses_post( $item_text );
	}

	$items_html .= sprintf(
		'<li class="sgs-icon-list__item">%s<span class="sgs-icon-list__text">%s</span></li>',
		$marker_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by sgs_list_marker_render() from $render_icon()/esc_html output.
		$text_content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
	);
}

// ---------------------------------------------------------------------------
// 8. Render. Root element depends on the heading + FR-36-26a landmark
// contract:
// - no heading, no landmark → root = the <ul>/<ol> itself (ZERO markup
// change vs. the pre-existing block).
// - heading and/or landmark → a wrapping element becomes the wp-block
// root: `<nav>` when $render_landmark is true (menu-bound, always; typed
// only when the operator opted in AND items carry urls — rule 3, never
// automatic), else the pre-existing plain `<div>`. The `<nav>` carries
// `aria-labelledby` pointing at the rendered heading's id — the visible
// heading becomes the landmark's accessible name (rule 1), so unique
// landmark names hold by construction. No aria-labelledby is added when
// no heading is rendered (nothing for it to point at).
// ---------------------------------------------------------------------------

$needs_wrapper = ( '' !== $heading_text ) || $render_landmark;
$wrapper_tag   = $render_landmark ? 'nav' : 'div';

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from WP core; $items_html/$heading_html built with esc_url/wp_kses_post/esc_attr above; $scoped_css pre-sanitised ($sgs_css_length/$sgs_css_keyword/allowlists/wp_style_engine_get_styles/sgs_colour_value/sgs_typography_css_rule) + wrapped in wp_strip_all_tags.
if ( $scoped_css ) {
	echo '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}

if ( $needs_wrapper ) {
	$wrapper_extra_attrs = array();
	// aria-labelledby belongs on the landmark ONLY (FR-36-26a: "when <nav>").
	// A plain <div> wrapper has no ARIA role, so labelling it names nothing and
	// is a spec deviation. $render_landmark already implies a non-empty heading
	// (see the landmark gate above), so a named landmark always resolves.
	if ( $render_landmark && '' !== $heading_text ) {
		$wrapper_extra_attrs['aria-labelledby'] = $heading_id;
	}
	$wrapper_attributes = get_block_wrapper_attributes(
		array_merge(
			array(
				'class' => $wrapper_only_classes,
				'style' => $root_style,
			),
			$wrapper_extra_attrs
		)
	);
	$heading_html       = '' !== $heading_text ? sprintf(
		'<%1$s id="%2$s" class="sgs-icon-list__heading">%3$s</%1$s>',
		esc_attr( $heading_level ),
		esc_attr( $heading_id ),
		wp_kses_post( $heading_text )
	) : '';
	printf(
		'<%1$s %2$s>%3$s<%4$s class="%5$s">%6$s</%4$s></%1$s>',
		esc_attr( $wrapper_tag ),
		$wrapper_attributes,
		$heading_html,
		esc_attr( $list_tag ),
		esc_attr( $list_visual_classes ),
		$items_html
	);
} else {
	$wrapper_attributes = get_block_wrapper_attributes(
		array(
			'class' => $list_visual_classes . ' ' . $wrapper_only_classes,
			'style' => $root_style,
		)
	);
	printf(
		'<%1$s %2$s>%3$s</%1$s>',
		esc_attr( $list_tag ),
		$wrapper_attributes,
		$items_html
	);
}
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
