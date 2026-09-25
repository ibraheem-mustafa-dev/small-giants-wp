<?php
/**
 * Server-side render for the SGS Icon List block.
 *
 * Outputs inline SVG icons via sgs_get_lucide_icon(), eliminating brittle
 * CSS content/Unicode rendering that breaks on some platforms.
 *
 * NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
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
 * Icon/text colour: the block-level `iconColour`/`textColour` emit ONCE into
 * the scoped `<style>` targeting `.{uid} .sgs-icon-list__icon` /
 * `.{uid} .sgs-icon-list__text` as the DEFAULT every item inherits. Each item
 * MAY override its own `iconColour`/`iconColourGradient` — those
 * overrides, and ALL gradient resolution, are emitted per-item inside the
 * render loop (step 7), `:nth-child(N)`-scoped, because the correct gradient
 * TECHNIQUE (SVG stroke vs text background-clip) depends on that item's own
 * icon source, which can differ item-to-item in the same list — a single
 * shared gradient rule cannot resolve that.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// padding/margin are owned tier-object attrs {desktop,tablet,mobile}.
// Normalise once, into fresh locals only -- never write back into
// $attributes.
// sgs_responsive_normalise_object() lives in helpers-responsive.php,
// which this file's own render-helpers.php require below WOULD load --
// but too late, since these two calls run before that require executes.
// A block whose render.php is the first SGS block PHP to run in a request
// (e.g. the site-header navigation bar, present on every page) would
// otherwise fatal with "Call to undefined function". Requiring the
// defining file directly, here, removes the load-order dependency.
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
$sgs_tor_padding_tiers   = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers    = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_radius_tiers        = sgs_responsive_normalise_object( $attributes['borderRadius'] ?? null );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/wp-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-nav-menu-source.php';

// ---------------------------------------------------------------------------
// 0. FR-36-26c — resolve `source: menu` into flat { text, url }
// items via the ONE shared resolver (SGS_Nav_Menu_Source, R-31-9 — never a
// second menu-walker). The flattening step mirrors the sgs/nav-bar-menu
// renderer (top-level items only; a submenu collapses to its own parent
// link); that class is not reusable across blocks, so the FLATTENING step
// (not the menu-walking step) is reproduced here at the same, small scope.
// The actual menu resolution (classic-menu lookup, term → items) is entirely
// delegated to SGS_Nav_Menu_Source; nothing here re-implements that.
// ---------------------------------------------------------------------------

// sgs_icon_list_flatten_menu_blocks() lives in includes/helpers-list-markers.php
// (aggregated by render-helpers.php), NOT here: render.php is re-included once
// per block instance, so a top-level function declared in it fatals with
// "Cannot redeclare" the moment a page holds two icon-lists.

// ---------------------------------------------------------------------------
// 1. Security sanitisers (contract §D) — a CSS-length sanitiser for box/side
// values and a CSS-keyword sanitiser for free-text properties (mirrors
// sgs/label + sgs/quote).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. Editor slug → Lucide name, for items that store `{icon: slug}`.
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
// Icon/SVG gradient sibling — non-empty wins over iconColour above.
$icon_colour_gradient       = $attributes['iconColourGradient'] ?? '';
$icon_colour_hover_gradient = $attributes['iconColourHoverGradient'] ?? '';
$icon_size                  = $attributes['iconSize'] ?? 'medium';
$dividers                   = ! empty( $attributes['dividers'] );
$divider_colour             = $attributes['dividerColour'] ?? '';
$divider_edges              = ! empty( $attributes['dividerEdges'] );
// Icon background circle — empty colour keeps today's output (no circle,
// no size override). Sanitised as a single CSS length (shared sanitiser).
$icon_bg_colour     = trim( (string) ( $attributes['iconBackgroundColour'] ?? '' ) );
$icon_box_size      = sgs_css_length_value( $attributes['iconBoxSize'] ?? '' );
$item_padding_block = sgs_css_length_value( $attributes['itemPaddingBlock'] ?? '' );
$text_colour        = $attributes['textColour'] ?? '';
$gap                = $attributes['gap'] ?? '20';

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

// FR-36-26c: `source`/`menuRef`/`renderLandmark` carry no JSON
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
if ( ! empty( $sgs_tor_padding_desktop ) ) {
	foreach ( $sgs_tor_padding_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( ! empty( $sgs_tor_margin_desktop ) ) {
	foreach ( $sgs_tor_margin_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

$padding_tablet_obj       = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj       = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj        = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj        = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();
$border_radius_tablet_obj = is_array( $sgs_radius_tiers['tablet'] ) ? $sgs_radius_tiers['tablet'] : array();
$border_radius_mobile_obj = is_array( $sgs_radius_tiers['mobile'] ) ? $sgs_radius_tiers['mobile'] : array();

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys). Skip-serialised
// → emitted scoped via the style engine below.
$base_border_radius = null;
if ( null !== $sgs_radius_tiers['desktop'] ) {
	$radius_raw = $sgs_radius_tiers['desktop'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$base_border_radius = $radius_raw;
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean   = array();
		$has_any_corner = false;
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
			$radius_clean[ $corner ] = isset( $radius_raw[ $corner ] ) ? sgs_css_length_value( $radius_raw[ $corner ] ) : '';
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
// only (no tiers — sgs/quote pattern). Paired with scalar borderColour/borderStyle attrs.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';
$border_colour         = $attributes['borderColour'] ?? '';
// Border-colour gradient — sibling attribute, wins over $border_colour when set.
$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );

// WP `typography` support values (skip-serialised → NOT auto-inlined).
//
// There are no `color` reads here. supports.color.background and .text are
// `false`, so core renders no colour panel competing with this block's
// SgsColourPanel; background and text colour are block-private
// backgroundColour* and textColour* attributes exposed through
// fillRow()/textRow(). With both sub-flags false nothing can write
// style.color.* or the textColor/backgroundColor preset slugs.
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
// on the page; the CSS selector below is class-based, so it is unaffected.
$heading_id   = wp_unique_id( 'sgs-ilist-heading-' );
$heading_sel  = $root_sel . ' .sgs-icon-list__heading';
$item_row_sel = $root_sel . ' .sgs-icon-list__item';

$scoped_css = array();

// --- Heading + item + item text typography families (shared emitter,
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
	// The item decoration lands on the <li>; a linked item's <a> carries the
	// theme's own link underline, which a parent's `none` cannot remove. When
	// itemTextDecoration is set, the link takes the row's value; unset leaves
	// links with the theme's link style.
	if ( ! empty( $attributes['itemTextDecoration'] ) ) {
		$scoped_css[] = $item_row_sel . ' .sgs-icon-list__item-link{text-decoration:inherit}';
	}
	$text_typography_css = sgs_typography_css_rule( $attributes, 'textEl', $text_sel );
	if ( '' !== $text_typography_css ) {
		$scoped_css[] = $text_typography_css;
	}
}

// --- Block-level DEFAULT icon/text colour — emitted ONCE, scoped, never
// inline on the repeated <li> elements. Every item inherits this unless it
// declares its own iconColour/iconColourGradient (step 7 below). Flat colour
// only here — gradient is resolved per-item in step 7, because the correct
// technique depends on each item's own icon source. ---
if ( $icon_colour ) {
	$scoped_css[] = "{$icon_sel}{color:" . sgs_colour_value( $icon_colour ) . ';}';
	if ( '' !== ( $attributes['iconColourHover'] ?? '' ) ) {
		$scoped_css[] = sgs_hover_state_rules( $icon_sel, 'color:' . sgs_colour_value( $attributes['iconColourHover'] ), ':focus-visible' );
	}
}
// --- Icon background circle — a filled circle behind every item's icon
// glyph (block-level only, matches the block-level icon colour above; no
// per-item override exists for this setting). Empty colour = no circle,
// today's output unchanged. iconBoxSize empty resolves to 26px, but only
// once a background colour is actually set — it has no effect on its own. ---
if ( '' !== $icon_bg_colour ) {
	$icon_box_size_value = '' !== $icon_box_size ? $icon_box_size : '26px';
	$scoped_css[]        = "{$icon_sel}{background-color:" . sgs_colour_value( $icon_bg_colour ) . ";border-radius:50%;width:{$icon_box_size_value};height:{$icon_box_size_value};}";
}
// --- Item vertical padding (top and bottom) — scoped to the item row, e.g.
// so a divided list gets breathing room. Independent of the dividers'
// own padding-top; this block's own <style> is emitted after the compiled
// stylesheet so equal-or-greater specificity wins by source order (matches
// option-picker's precedent for overriding a static default). ---
if ( '' !== $item_padding_block ) {
	$scoped_css[] = "{$item_row_sel}{padding-block:{$item_padding_block};}";
}
// Text colour (flat-or-gradient, resting + hover) — scoped to the item text
// element, never the root <ul>, matching the block's declared css:color slot.
// sgs_text_colour_decl() is the primary primitive: unlike a bare `color:`
// declaration it handles a resolved gradient string (which a bare `color:`
// would emit as invalid CSS, silently dropped).
$sgs_ilist_text_normal_resolved = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColour'] ?? '' ),
	(string) ( $attributes['textColourGradient'] ?? '' )
);
$sgs_ilist_text_hover_resolved  = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColourHover'] ?? '' ),
	(string) ( $attributes['textColourHoverGradient'] ?? '' )
);
$sgs_ilist_text_normal_decl     = sgs_text_colour_decl( $sgs_ilist_text_normal_resolved );
$sgs_ilist_text_hover_decl      = sgs_text_colour_decl( $sgs_ilist_text_hover_resolved );
if ( '' !== $sgs_ilist_text_normal_decl || '' !== $sgs_ilist_text_hover_decl ) {
	$scoped_css[] = sgs_emit_state_colour_css(
		$text_sel,
		'' !== $sgs_ilist_text_normal_decl ? array( $sgs_ilist_text_normal_decl ) : array(),
		'' !== $sgs_ilist_text_hover_decl ? array( $sgs_ilist_text_hover_decl ) : array()
	);
}
// Gradient companion rule — a no-op for a flat colour, MANDATORY beside
// sgs_text_colour_decl(): its gradient branch has no @supports fallback of
// its own.

$sgs_ilist_text_grad_css = sgs_text_colour_gradient_fallback_rule( $text_sel, $sgs_ilist_text_normal_resolved );
if ( '' !== $sgs_ilist_text_grad_css ) {
	$scoped_css[] = $sgs_ilist_text_grad_css;
}
if ( '' !== $sgs_ilist_text_hover_resolved && $sgs_ilist_text_hover_resolved !== $sgs_ilist_text_normal_resolved ) {
	$sgs_ilist_text_grad_hover_css = sgs_hover_media_wrap(
		sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $text_sel . ':hover', $sgs_ilist_text_hover_resolved )
	) . sgs_text_colour_gradient_fallback_rule( $text_sel . ':focus-visible', $sgs_ilist_text_hover_resolved );
	if ( '' !== $sgs_ilist_text_grad_hover_css ) {
		$scoped_css[] = $sgs_ilist_text_grad_hover_css;
	}
}

// --- WP typography support (fontSize/lineHeight) — scoped onto the text
// selector (matches the block's declared `selectors.typography`). ---

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

// --- Background fill (flat-or-gradient, resting + hover) — scoped onto the
// root. Owned by the shared fill emitter, NOT by the style engine and NOT by
// supports.color: this block's background is block-private (see the note at
// the colour reads above). Safe on the root here because the text gradient
// above clips to $text_sel, a DIFFERENT element, so background-clip:text can
// never eat this paint. ---
$sgs_ilist_fill_css = sgs_fill_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $sgs_ilist_fill_css ) {
	$scoped_css[] = $sgs_ilist_fill_css;
}

// --- Base spacing (padding/margin) + border-radius — WP-native style.*
// objects, skip-serialised, emitted scoped via the stable core style engine
// (exactly how WP core outputs `layout` support). ---

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

// --- Border width/style/colour (SGS custom, base only) — hand-built,
// scoped. ---
// 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width.
if ( 'none' !== $border_style && $has_border_width ) {
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

// --- Border gradient (border builder) — masked ::before, wins over the
// flat border-color decl above (emitted after it so the cascade favours the
// mask). ---
if ( '' !== $border_colour_gradient ) {
	$scoped_css[] = sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, $has_border_width ? $bwt : '1px' );
}

// --- Responsive padding/margin/border-radius tiers — box objects, hand-built
// shorthand, scoped @media on the SAME root selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );
$radius_tab_val  = sgs_corner_object_shorthand( $border_radius_tablet_obj );
$radius_mob_val  = sgs_corner_object_shorthand( $border_radius_mobile_obj );

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
// className attribute. NO style is passed at all — the root carries neither
// CSS property declarations (contract §A) nor custom-property values: the
// gap var lives in the scoped <style> above.
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
	// dividerEdges only makes sense with dividers on — boxes the list with a
	// line above the first item and below the last, in addition to the
	// between-item lines.
	if ( $divider_edges ) {
		$list_visual_classes .= ' sgs-icon-list--divider-edges';
	}
	// Divider colour override — a custom-property VALUE (contract-permitted,
	// same pattern as the gap var below), read by style.css's divider rules
	// via a var() fallback chain. Empty keeps today's default border-colour token.
	if ( '' !== $divider_colour ) {
		$scoped_css[] = "{$root_sel}{--sgs-icon-list-divider-colour:" . sgs_colour_value( $divider_colour ) . ';}';
	}
}

$wrapper_only_classes = $uid;

// Spec 32 FR-32-1/FR-32-4 (enforced by
// scripts/no-inline/check-no-inline.py): even a custom-property VALUE never
// rides the inline style attribute — the gap var is emitted into the block's
// own scoped <style> rule instead. $gap_slug is digits-only (sanitised above).
if ( $gap_slug ) {
	$scoped_css[] = "{$root_sel}{--sgs-icon-list-gap:var(--wp--preset--spacing--{$gap_slug});}";
}

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

// Wave 3C U-6 + U-7 (design .claude/reports/2026-09-25-u6-u7-design.md 3c, 3d,
// 3g): sibling dim, the label roll and the numbered list's number style. The
// list is the root element or sits inside a wrapper, so it is matched both ways.
$sgs_ilist_roll     = sgs_label_roll_value( $attributes['labelRoll'] ?? '' );
$sgs_ilist_list_sel = ':is(' . $root_sel . '.sgs-icon-list, ' . $root_sel . ' .sgs-icon-list)';
$scoped_css[]       = sgs_sibling_dim_css( $sgs_ilist_list_sel, '.sgs-icon-list__item', ' :is(.sgs-icon-list__text, .sgs-icon-list__item-link)', $attributes );
$scoped_css[]       = sgs_label_roll_css( $root_sel, ' .sgs-icon-list__item', '', $attributes );
if ( 'numbered' === $marker_type ) {
	$sgs_ilist_num_decls = array( 'color:var(--sgs-list-marker-colour, ' . ( '' !== trim( (string) ( $attributes['numberColour'] ?? '' ) ) ? sgs_colour_value( $attributes['numberColour'] ) : 'currentColor' ) . ')' );
	$sgs_ilist_num_size  = sgs_css_single_length_value( $attributes['numberFontSize'] ?? '' );
	if ( '' !== $sgs_ilist_num_size ) {
		$sgs_ilist_num_decls[] = 'font-size:' . $sgs_ilist_num_size;
	}
	$sgs_ilist_num_weight = (string) ( $attributes['numberFontWeight'] ?? '' );
	if ( preg_match( '/^[1-9]00$|^(normal|bold)$/', $sgs_ilist_num_weight ) ) {
		$sgs_ilist_num_decls[] = 'font-weight:' . $sgs_ilist_num_weight;
	}
	if ( 'decimal-leading-zero' === ( $attributes['numberFormat'] ?? '' ) ) {
		$scoped_css[] = $sgs_ilist_list_sel . '{list-style-type:decimal-leading-zero;}';
	}
	$scoped_css[] = $sgs_ilist_list_sel . ' > .sgs-icon-list__item::marker{' . implode( ';', $sgs_ilist_num_decls ) . ';}';
}
// Per-item colour/gradient — each item resolves its OWN colour
// and gradient (falling back to the block-level default when unset), and its
// OWN icon source decides the gradient TECHNIQUE via sgs_icon_gradient_css().
// Unlike flat colour (currentColor inheritance works identically regardless
// of source), a gradient def gets a per-item unique id, so no dedupe/inject-
// once logic is needed — every item that resolves a non-empty gradient gets
// its own <defs> and its own :nth-child(N)-scoped rule.
$sgs_icon_list_item_idx = 0;

// $resolved_items (step 0/3 above) is the SAME shape for both sources —
// typed items keep their optional iconSource/iconName/newTab keys, menu
// items carry only text/url. Iterating one array means BOTH sources render
// through this one loop (real <li><a> for menu-bound lists, per FR-36-26a).
$items_html = '';
foreach ( $resolved_items as $item ) {
	++$sgs_icon_list_item_idx;
	$marker_html = '';
	if ( $render_marker_icon ) {
		// Resolve the item's icon source + name (items may store `{icon: slug}`).
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
		$svg = $render_icon( $item_source, $item_name );

		// Per-item colour override + per-item gradient resolution — BOTH
		// states, via the shared sgs_icon_gradient_states_css() composer.
		// Block-level hover-flat already cascades onto every item via the
		// shared $icon_sel rule below (step 5), so a per-item hover-flat
		// rule is only needed when the ITEM sets its own hover colour.
		$item_has_own_colour       = isset( $item['iconColour'] ) && '' !== $item['iconColour'];
		$item_icon_colour          = $item_has_own_colour ? $item['iconColour'] : $icon_colour;
		$item_has_own_colour_hover = isset( $item['iconColourHover'] ) && '' !== $item['iconColourHover'];
		$item_icon_colour_hover    = $item_has_own_colour_hover ? $item['iconColourHover'] : ( $attributes['iconColourHover'] ?? '' );
		$item_icon_gradient        = ( isset( $item['iconColourGradient'] ) && '' !== $item['iconColourGradient'] )
			? $item['iconColourGradient']
			: $icon_colour_gradient;
		$item_icon_gradient_hover  = ( isset( $item['iconColourGradientHover'] ) && '' !== $item['iconColourGradientHover'] )
			? $item['iconColourGradientHover']
			: $icon_colour_hover_gradient;
		$item_sel                  = "{$root_sel} .sgs-icon-list__item:nth-child({$sgs_icon_list_item_idx}) .sgs-icon-list__icon";
		$item_grad_selector        = in_array( $item_source, array( 'dashicon', 'emoji' ), true ) ? $item_sel : "{$item_sel} svg";
		$item_grad                 = sgs_icon_gradient_states_css( $item_source, $item_icon_gradient, $item_icon_gradient_hover, $uid . '-ig-' . $sgs_icon_list_item_idx, $item_grad_selector );
		$svg                       = sgs_svg_inject_defs( $svg, $item_grad['defs_base'] );
		$svg                       = sgs_svg_inject_defs( $svg, $item_grad['defs_hover'] );
		if ( $item_grad['css'] ) {
			$scoped_css = array_merge( $scoped_css, $item_grad['css'] );
		} else {
			if ( $item_has_own_colour ) {
				$scoped_css[] = "{$item_sel}{color:" . sgs_colour_value( $item_icon_colour ) . ';}';
			}
			if ( $item_has_own_colour_hover ) {
				$scoped_css[] = sgs_hover_state_rules( $item_sel, 'color:' . sgs_colour_value( $item_icon_colour_hover ), ':focus-visible' );
			}
		}
		$marker_html = sgs_list_marker_render( $marker_type, $svg );
	}

	$item_text = $item['text'] ?? '';
	$item_url  = isset( $item['url'] ) ? esc_url( $item['url'] ) : '';

	// Wrap text in <a> when a per-item URL is provided. `data-sgs-nav-path`
	// mirrors nav-bar-menu/view.js's contract exactly (FR-36-26a rule 2):
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
			// The label roll (M-25) wraps the text INSIDE the link, so the link
			// stays the one focus target; unchanged when the roll is off.
			sgs_label_roll_wrap_html( wp_kses( $item_text, $linked_allowed ), $sgs_ilist_roll )
		);
	} else {
		$text_content = sgs_label_roll_wrap_html( wp_kses_post( $item_text ), $sgs_ilist_roll );
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
// - no heading, no landmark → root = the <ul>/<ol> itself (no wrapper
// markup).
// - heading and/or landmark → a wrapping element becomes the wp-block
// root: `<nav>` when $render_landmark is true (menu-bound, always; typed
// only when the operator opted in AND items carry urls — rule 3, never
// automatic), else a plain `<div>`. The `<nav>` carries
// `aria-labelledby` pointing at the rendered heading's id — the visible
// heading becomes the landmark's accessible name (rule 1), so unique
// landmark names hold by construction. No aria-labelledby is added when
// no heading is rendered (nothing for it to point at).
// ---------------------------------------------------------------------------

$needs_wrapper = ( '' !== $heading_text ) || $render_landmark;
$wrapper_tag   = $render_landmark ? 'nav' : 'div';

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from WP core; $items_html/$heading_html built with esc_url/wp_kses_post/esc_attr above; $scoped_css pre-sanitised (sgs_css_length_value()/sgs_css_keyword_sanitise()/allowlists/wp_style_engine_get_styles/sgs_colour_value/sgs_typography_css_rule) + wrapped in wp_strip_all_tags.
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
