<?php
/**
 * Server-side render for the SGS Card Grid block.
 *
 * In manual mode:     renders the items array stored in block attributes.
 * In query mode:      fetches posts via WP_Query and maps them to card layout.
 * In wc-product mode: fetches WooCommerce products via Card_Grid_Products and
 *                     renders each as an sgs/product-card in wc-product mode.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — block is fully dynamic).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-card-grid-products.php';
// WooCommerce-INDEPENDENT collection engine + shared pagination markup.
// Card_Grid_Products above returns an empty array without WooCommerce, so
// this second engine is what keeps a product collection working on a bare
// WordPress install.
require_once dirname( __DIR__, 3 ) . '/includes/class-cpt-collection-query.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-grid-pagination.php';

// CSS length/unit sanitiser — for free-text length values (border width,
// letter-spacing) concatenated into raw CSS declarations inside this block's
// own scoped <style> tag. Strips everything except letters, digits, dot, and
// % so a Contributor-authored malicious value can never break out of the
// declaration into a new CSS rule. Mirrors sgs/hero's proven sanitiser.
// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / text-transform / font-weight / font-style) —
// letters + hyphen only.
$source  = $attributes['source'] ?? 'manual';
$variant = $attributes['variant'] ?? 'card';
$items   = $attributes['items'] ?? array();
// Card title heading level — an out-of-enum stored value is otherwise
// silently coerced to the block.json default (blockjson-enum-coerces-
// invalid-to-default), so it is validated here too (mirrors sgs/icon-list).
$allowed_heading_levels = array( 'h2', 'h3', 'h4', 'h5', 'h6', 'p' );
$heading_level          = in_array( $attributes['headingLevel'] ?? '', $allowed_heading_levels, true )
	? $attributes['headingLevel']
	: 'h3';
// `columns` is a TIER OBJECT (Spec 35 pass 4) — read each tier via
// the normaliser, never the raw attribute (absint() on an unresolved array
// throws "Array to int conversion" and would emit e.g. `columns:0`, exactly
// the D569/D570 bug class this normaliser exists to prevent).
$columns_obj    = sgs_responsive_normalise_object( $attributes['columns'] ?? null );
$columns        = $columns_obj['desktop'] ?? 3;
$columns_tablet = $columns_obj['tablet'] ?? 2;
$columns_mobile = $columns_obj['mobile'] ?? 1;
// `gap` is a TIER OBJECT (Spec 35 pass 1) - read the desktop tier, never
// the raw array (a string cast downstream would emit `gap:Array`).
$gap_obj      = sgs_responsive_normalise_object( $attributes['gap'] ?? null );
$gap          = ( '' !== (string) ( $gap_obj['desktop'] ?? '' ) ) ? $gap_obj['desktop'] : '30';
$aspect_ratio = $attributes['aspectRatio'] ?? '16/10';
// Whitelist — mirrors image-sequence/render.php's six-value ratio list (the
// shared source of truth is MediaSizingPanel.js's RATIO_OPTIONS, JS-side;
// this array is byte-identical to that list's values). Falls back to this
// block's OWN existing default ('16/10', unspaced) rather than
// image-sequence's '16 / 9', so a legacy stored value ('16/10', authored
// before this validation existed) renders exactly as it did before.
$allowed_ratios = array( '16 / 9', '21 / 9', '4 / 3', '1 / 1', '3 / 4', '9 / 16' );
if ( ! in_array( $aspect_ratio, $allowed_ratios, true ) ) {
	$aspect_ratio = '16/10';
}
$hover_effect = sanitize_key( $attributes['effectHover'] ?? 'zoom' );

$title_colour        = $attributes['titleColour'] ?? '';
$title_colour_gradient    = $attributes['titleColourGradient'] ?? '';
$subtitle_colour     = $attributes['subtitleColour'] ?? '';
$subtitle_colour_gradient = $attributes['subtitleColourGradient'] ?? '';
$hover_bg            = $attributes['backgroundColourHover'] ?? '';
$hover_bg_gradient   = $attributes['backgroundColourHoverGradient'] ?? '';
$hover_text          = $attributes['textColourHover'] ?? '';
$hover_border        = $attributes['borderColourHover'] ?? '';
// D636 border-colour gradient siblings — resolved once here, emitted via
// sgs_border_gradient_css() masked ::before further down; border-color can
// never legally hold a gradient value, so these never feed the flat
// border-colour paint above.
$hover_border_gradient = sgs_css_gradient_value( $attributes['borderColourHoverGradient'] ?? '' );
$transition_dur      = $attributes['transitionDuration'] ?? '300';
$transition_ease     = $attributes['transitionEasing'] ?? 'ease-in-out';
$hover_scale         = $attributes['scaleHover'] ?? '';
$hover_shadow        = $attributes['shadowHover'] ?? '';
$hover_shadow_colour = $attributes['shadowHoverColour'] ?? '';
$card_background          = $attributes['cardBackground'] ?? '';
$card_background_gradient = $attributes['cardBackgroundGradient'] ?? '';
$card_border_colour  = $attributes['cardBorderColour'] ?? '';
$card_border_gradient = sgs_css_gradient_value( $attributes['cardBorderColourGradient'] ?? '' );
$card_border_width   = $attributes['cardBorderWidth'] ?? array();
$card_radius         = $attributes['cardRadius'] ?? '';
$card_shadow         = $attributes['cardShadow'] ?? '';
$card_shadow_colour  = $attributes['cardShadowColour'] ?? '';
$hover_image_zoom    = ! empty( $attributes['imageZoomHover'] );
$hover_grayscale     = ! empty( $attributes['grayscaleHover'] );
$stagger_delay       = $attributes['staggerDelay'] ?? 0;
$query_post_type     = sanitize_key( $attributes['queryPostType'] ?? 'post' );
$query_per_page      = absint( $attributes['queryPostsPerPage'] ?? 6 );
$query_category      = absint( $attributes['queryCategory'] ?? 0 );

// ── Instance uid — a CLASS (matches the container/hero/quote convention) so
// this grid's WP-native supports + title/subtitle colours can be scoped to
// THIS instance only (multiple grids may sit on one page). Reused across all
// three render paths below (empty state / wc-product grid / manual-query grid)
// so every path shares the identical scoping hook.
$uid      = 'sgs-cg-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-card-grid';

// -------------------------------------------------------------------------
// Media-element atom layer (rule 37-media-no-handroll fix) — card-image
// object-fit only. `class_exists()` guards a class the plugin loader always
// registers; kept for the same "never fatal if load order changes" reason
// `sgs/gallery` and `sgs/before-after` guard it. Classes are appended to the
// `<img>`/`<video>` markup `sgs_render_media()` already returns (see the
// per-item loop below) — `.sgs-media-el` is the shared marker the generated
// assets/css/media-atoms/object-fit.css rule targets, `$sgs_cg_media_scope`
// is the per-instance scope the atom's custom-property value below is set
// on. This is one shared block-wide value applied to every card (mirrors the
// existing sgs_media_position_css() call below — items[] has no per-card
// object-fit field).
$sgs_cg_media_scope   = '';
$sgs_cg_media_classes = array();
if ( class_exists( 'SGS_Media_Element' ) ) {
	$sgs_cg_media_scope   = SGS_Media_Element::scope_class( $uid, 'sgs' );
	$sgs_cg_media_classes = SGS_Media_Element::element_classes( $sgs_cg_media_scope );
}

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
// --check. Values are read from $attributes['style'] and emitted into THIS
// block's OWN scoped <style> (composite caveat — do NOT pass these as
// wrapper `extra_styles`, that path inlines). Base spacing (padding/margin)
// is a separate mechanism the wrapper already handles scoped internally —
// not duplicated here.
$card_grid_native_css = '';

$cg_style_engine_args = array();

$cg_color_args = array();
if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
	$cg_color_args['text'] = (string) $attributes['style']['color']['text'];
}
if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
	$cg_color_args['background'] = (string) $attributes['style']['color']['background'];
}
if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
	$cg_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
}
if ( ! empty( $cg_color_args ) ) {
	$cg_style_engine_args['color'] = $cg_color_args;
}

$cg_border_args = array();
// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width. Gated together via the shared helper (helpers-box.php)
// so this rule is applied identically everywhere, not per block.

if ( isset( $attributes['style']['shadow'] ) && '' !== $attributes['style']['shadow'] ) {
	$cg_style_engine_args['shadow'] = (string) $attributes['style']['shadow'];
}

if ( ! empty( $cg_style_engine_args ) ) {
	$cg_scoped_styles = wp_style_engine_get_styles(
		$cg_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $cg_scoped_styles['css'] ) ) {
		$card_grid_native_css .= $cg_scoped_styles['css'];
	}
}

// Typography — block.json selectors.typography targets .sgs-card-grid__title,
// so scope the native typography rule there (distinct from the per-instance
// titleFontSize/subtitleFontSize custom-attr mechanism further below).
$cg_typography_args = array();
if ( isset( $attributes['style']['typography']['fontSize'] ) && '' !== $attributes['style']['typography']['fontSize'] ) {
	$cg_typography_args['fontSize'] = (string) $attributes['style']['typography']['fontSize'];
}
if ( isset( $attributes['style']['typography']['lineHeight'] ) && '' !== $attributes['style']['typography']['lineHeight'] ) {
	$cg_typography_args['lineHeight'] = (string) $attributes['style']['typography']['lineHeight'];
}
if ( isset( $attributes['style']['typography']['letterSpacing'] ) && '' !== $attributes['style']['typography']['letterSpacing'] ) {
	$cg_typography_args['letterSpacing'] = sgs_css_length_value( $attributes['style']['typography']['letterSpacing'] );
}
if ( isset( $attributes['style']['typography']['textTransform'] ) && '' !== $attributes['style']['typography']['textTransform'] ) {
	$cg_typography_args['textTransform'] = sgs_css_keyword_sanitise( $attributes['style']['typography']['textTransform'] );
}
if ( isset( $attributes['style']['typography']['fontWeight'] ) && '' !== $attributes['style']['typography']['fontWeight'] ) {
	$cg_typography_args['fontWeight'] = sgs_css_keyword_sanitise( (string) $attributes['style']['typography']['fontWeight'] );
}
if ( isset( $attributes['style']['typography']['fontStyle'] ) && '' !== $attributes['style']['typography']['fontStyle'] ) {
	$cg_typography_args['fontStyle'] = sgs_css_keyword_sanitise( $attributes['style']['typography']['fontStyle'] );
}
if ( ! empty( $cg_typography_args ) ) {
	$cg_typography_scoped = wp_style_engine_get_styles(
		array( 'typography' => $cg_typography_args ),
		array( 'selector' => $root_sel . ' .sgs-card-grid__title' )
	);
	if ( ! empty( $cg_typography_scoped['css'] ) ) {
		$card_grid_native_css .= $cg_typography_scoped['css'];
	}
}
if ( isset( $attributes['style']['typography']['textAlign'] ) && in_array( $attributes['style']['typography']['textAlign'], array( 'left', 'center', 'right' ), true ) ) {
	$card_grid_native_css .= $root_sel . ' .sgs-card-grid__title{text-align:' . $attributes['style']['typography']['textAlign'] . '}';
}

// FR-35-5 STATE_WITHOUT_BASE fix — resting-state fill/border/shadow for the
// card tile. An empty control means the card inherits the theme token
// exactly as before — these are custom-property FALLBACKS in style.css
// (`var(--sgs-card-background, var(--wp--preset--color--surface, #fff))`
// etc.), never a baked default. Scoped to `.sgs-card-grid__item` under this
// instance's own uid; the wc-product delegation path (below) renders
// sgs/product-card markup, which has no `.sgs-card-grid__item` element at
// all, so this rule is a harmless no-op there and never leaks into
// product-card's own styling.
$card_state_vars = array();
if ( '' !== $card_background || '' !== $card_background_gradient ) {
	$card_bg_paint = sgs_background_paint_value( $card_background, $card_background_gradient );
	if ( 'background-image' === $card_bg_paint['property'] ) {
		// Higher specificity than style.css's `.sgs-card-grid__item{background:var(...)}`
		// (this rule is scoped to `{$root_sel} .sgs-card-grid__item`), so a real
		// `background-image` declaration here always wins regardless of load order.
		$card_state_vars[] = 'background-image:' . $card_bg_paint['value'] . ';';
	} elseif ( 'background-color' === $card_bg_paint['property'] ) {
		$card_state_vars[] = '--sgs-card-background:' . $card_bg_paint['value'] . ';';
	}
}
if ( '' !== $card_border_colour ) {
	$card_state_vars[] = '--sgs-card-border-color:' . sgs_colour_value( $card_border_colour ) . ';';
}
if ( is_array( $card_border_width ) && array_filter( $card_border_width, static fn( $v ) => '' !== (string) $v ) ) {
	$card_border_width_sides = array();
	foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
		$side_value                = $card_border_width[ $side ] ?? '';
		$card_border_width_sides[] = '' !== $side_value ? sgs_css_length_value( $side_value ) : '0';
	}
	$card_state_vars[] = '--sgs-card-border-width:' . implode( ' ', $card_border_width_sides ) . ';';
}
if ( '' !== $card_radius ) {
	$card_state_vars[] = '--sgs-card-radius:' . sgs_css_length_value( $card_radius ) . ';';
}
if ( '' !== $card_shadow ) {
	$card_state_vars[] = '--sgs-card-shadow:' . sgs_shadow_value_composed( $card_shadow, $card_shadow_colour ) . ';';
}
if ( ! empty( $card_state_vars ) ) {
	$card_grid_native_css .= $root_sel . ' .sgs-card-grid__item{' . implode( '', $card_state_vars ) . '}';
}

// --- Hover COLOUR, via the one shared helper. The helper emits the real
// declarations on this instance's own scoped selector, matching sgs/info-box,
// sgs/hero, sgs/process-steps, sgs/cta-section and sgs/post-grid. Emitting
// here rather than per-branch also collapses the two duplicate emission
// sites into one — both branches resolve the SAME $hover_* variables further
// up.
//
// Colours resolve through sgs_colour_value(), the shared resolver this file
// already uses for the border-gradient hover paint below — it handles both a
// preset slug and a raw hex value.
$card_grid_hover_decls = array();
if ( $hover_bg ) {
	$card_grid_hover_decls[] = 'background-color:' . sgs_colour_value( $hover_bg );
}
$card_grid_hover_bg_gradient = sgs_css_gradient_value( $hover_bg_gradient );
if ( '' !== $card_grid_hover_bg_gradient ) {
	$card_grid_hover_decls[] = 'background-image:' . $card_grid_hover_bg_gradient;
}
if ( $hover_text ) {
	$card_grid_hover_decls[] = 'color:' . sgs_colour_value( $hover_text );
}
if ( $hover_border ) {
	$card_grid_hover_decls[] = 'border-color:' . sgs_colour_value( $hover_border );
}
if ( $card_grid_hover_decls ) {
	$card_grid_native_css .= sgs_emit_state_colour_css(
		$root_sel . ' .sgs-card-grid__item',
		array(),
		$card_grid_hover_decls
	);
}
// titleColourHover/subtitleColourHover target DIFFERENT elements than the
// item-level decls above (.sgs-card-grid__title / __subtitle, not
// .sgs-card-grid__item) — each needs its OWN emission at its OWN selector,
// not a shared array, or one attribute's `color:` declaration silently wins
// over the other's on the same rule when both are set (found live, 2026-09-03).
if ( '' !== ( $attributes['titleColourHover'] ?? '' ) ) {
	$card_grid_native_css .= sgs_emit_state_colour_css(
		$root_sel . ' .sgs-card-grid__title',
		array(),
		array( 'color:' . sgs_colour_value( $attributes['titleColourHover'] ) )
	);
}
if ( '' !== ( $attributes['subtitleColourHover'] ?? '' ) ) {
	$card_grid_native_css .= sgs_emit_state_colour_css(
		$root_sel . ' .sgs-card-grid__subtitle',
		array(),
		array( 'color:' . sgs_colour_value( $attributes['subtitleColourHover'] ) )
	);
}

// --- Border gradient (D636 border builder) — masked ::before, replaces the
// flat border-colour paint above when set (the resting --sgs-card-border-color
// var, and the scoped :hover border-color rule sgs_emit_state_colour_css()
// emits). ---
if ( '' !== $card_border_gradient ) {
	$card_grid_native_css .= sgs_border_gradient_css(
		$root_sel . ' .sgs-card-grid__item',
		$card_border_gradient,
		'' !== $hover_border_gradient ? $hover_border_gradient : sgs_colour_value( $hover_border ),
		'1px'
	);
}

// ── Explicit media crop (Spec 35 capability-routing doctrine Part 9,
// mechanism (c)) — block.json declares BOTH `imageControls: true` (keeps the
// sgsObjectPosition/sgsObjectFit attrs + the universal editor UI) and
// `imageControlsExplicit: true` (opts OUT of includes/image-controls.php's
// guessed-root render_block injector, which can never find this block's real
// media element — it lives inside `.sgs-card-grid__image-wrap`, several
// levels under the guessed root, and only in the manual/query render path
// below). This is the SINGLE block-wide crop setting applied uniformly to
// EVERY card's media (per-card cropping is an explicit non-goal — items[] is
// an array, one sgsObjectPosition/sgsObjectFit pair cannot differ per card).
// Targets both <img> and <video> since the media slot accepts either
// (sgs_render_media()). Scoped by $root_sel so multiple grids on one page
// never collide; harmless no-op in the wc-product/cpt-collection branches
// below, which delegate to sgs/product-card and never render
// `.sgs-card-grid__image-wrap` at all.
//
// object-fit split out (rule 37-media-no-handroll fix): `sgsObjectFit` is now
// read by the media-element atom below, not here — pass a copy with it
// cleared so this call only ever emits `object-position` (its `sgsObjectFit`
// half would otherwise duplicate the atom's `var(--sgs-media-object-fit)`
// declaration on the SAME element with higher specificity, silently making
// the atom's value dead the moment an operator set one). Object-position has
// no atom coverage yet and stays on this explicit mechanism unchanged.
$card_grid_native_css .= sgs_media_position_css(
	array_merge( $attributes, array( 'sgsObjectFit' => '' ) ),
	'sgs',
	$root_sel . ' .sgs-card-grid__image-wrap img, ' . $root_sel . ' .sgs-card-grid__image-wrap video'
);

// Media-element atom layer — object-fit only (rule 37-media-no-handroll fix).
// Reads the SAME `sgsObjectFit` attribute the block already stores (see the
// block.json `_comment_mediaElements`); emits `.{scope}{--sgs-media-object-fit:…}`
// which assets/css/media-atoms/object-fit.css's `.sgs-media-el` rule consumes.
// No value set -> no declaration -> that stylesheet's own `cover` fallback
// applies, matching the removed style.css default exactly (style.css).
if ( class_exists( 'SGS_Media_Element' ) ) {
	$card_grid_native_css .= SGS_Media_Element::style(
		$attributes,
		'sgs',
		'sgs/card-grid',
		$uid,
		array( 'object-fit' )
	);
}

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero / sgs/quote) so preset palette colours still
// resolve visually.
$card_grid_preset_classes = array();
$cg_preset_text_slug      = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$cg_preset_bg_slug        = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $cg_preset_text_slug ) {
	$card_grid_preset_classes[] = 'has-text-color';
	$card_grid_preset_classes[] = 'has-' . $cg_preset_text_slug . '-color';
}
if ( '' !== $cg_preset_bg_slug ) {
	$card_grid_preset_classes[] = 'has-background';
	$card_grid_preset_classes[] = 'has-' . $cg_preset_bg_slug . '-background-color';
}

// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt = '' !== $border_width_top ? $border_width_top : '0';
		$bwr = '' !== $border_width_right ? $border_width_right : '0';
		$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl = '' !== $border_width_left ? $border_width_left : '0';
		$card_grid_native_css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$card_grid_native_css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$card_grid_native_css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$radius_tiers = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$card_grid_native_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$card_grid_native_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$card_grid_native_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving CSS
// combinators like `>` intact (contract §D — matches SGS_Container_Wrapper +
// sgs/hero). Every value reaching $card_grid_native_css is pre-sanitised
// (sgs_css_length_value() / sgs_css_keyword_sanitise() / wp_style_engine_get_styles), so no
// un-sanitised value survives to here.
$card_grid_native_style_tag = $card_grid_native_css ? '<style id="' . esc_attr( $uid ) . '-native">' . wp_strip_all_tags( $card_grid_native_css ) . '</style>' : '';

// Query mode: fetch posts and map to card data.
if ( 'query' === $source ) {
	$query_args = array(
		'post_type'      => $query_post_type,
		'posts_per_page' => $query_per_page,
		'post_status'    => 'publish',
		'no_found_rows'  => true,
	);

	if ( $query_category > 0 ) {
		$query_args['cat'] = $query_category;
	}

	$grid_query  = new WP_Query( $query_args );
	$query_items = array();

	foreach ( $grid_query->posts as $grid_post ) {
		$thumb_id  = get_post_thumbnail_id( $grid_post->ID );
		$thumb_url = $thumb_id ? wp_get_attachment_image_url( $thumb_id, 'large' ) : '';
		$thumb_alt = $thumb_id ? (string) get_post_meta( $thumb_id, '_wp_attachment_image_alt', true ) : '';

		$query_items[] = array(
			'title'    => get_the_title( $grid_post ),
			'subtitle' => wp_trim_words( get_the_excerpt( $grid_post ), 15, '…' ),
			'link'     => get_permalink( $grid_post ),
			'image'    => $thumb_url ? array(
				'url' => $thumb_url,
				'alt' => $thumb_alt,
			) : null,
			'badge'    => '',
		);
	}

	$items = $query_items;
	wp_reset_postdata();
}

/*
 * Card-delegating modes: render each result through the dual-mode
 * sgs/product-card rather than this block's own generic card markup.
 *
 *   'wc-product'     — query delegated to Card_Grid_Products (HPOS-safe,
 *                      WC-canonical). Returns nothing without WooCommerce.
 *   'cpt-collection' — query delegated to CPT_Collection_Query. Plain WP_Query
 *                      over a custom post type with the seven meta-driven
 *                      selection rules. NO WooCommerce dependency — this
 *                      keeps a product collection working on a
 *                      non-WooCommerce site. Removing it would delete a
 *                      working capability from every install without
 *                      WooCommerce.
 *
 * Both share this branch's wrapper classes, CSS vars and empty state, so the
 * two data sources cannot drift apart visually.
 */
if ( 'wc-product' === $source || 'cpt-collection' === $source ) {
	$is_cpt_collection = ( 'cpt-collection' === $source );

	// Posts are only populated in cpt-collection mode; wc-product works from IDs.
	$collection_posts = array();
	$pagination_html  = '';

	if ( $is_cpt_collection ) {
		// Pagination is per-instance (sgs-page-{uid}) so several grids can
		// paginate independently on one page and neither collides with
		// WordPress's own `paged` var on a static Page.
		$collection_pagination = sanitize_key( $attributes['pagination'] ?? 'none' );
		$collection_page_var   = \SGS\Blocks\Grid_Pagination::page_var( $uid );
		$collection_paged      = 'none' !== $collection_pagination
			? \SGS\Blocks\Grid_Pagination::current_page_from_request( $collection_page_var )
			: 0;

		// The query helper primes the meta cache for the whole result set in one
		// round-trip (the N+1 guard ported from content-collection/render.php:167).
		$collection_result = \SGS\Blocks\CPT_Collection_Query::get_results(
			$attributes,
			array( 'paged' => $collection_paged )
		);

		$collection_posts = $collection_result['posts'];
		$product_ids      = array_map( 'absint', wp_list_pluck( $collection_posts, 'ID' ) );

		$pagination_html = \SGS\Blocks\Grid_Pagination::render(
			array(
				'base_class'   => 'sgs-card-grid',
				'type'         => $collection_pagination,
				'total_pages'  => (int) $collection_result['max_num_pages'],
				'current_page' => (int) $collection_result['paged'],
				// No view.js on this block — real links, not inert buttons.
				'mode'         => \SGS\Blocks\Grid_Pagination::MODE_LINK,
				'page_var'     => $collection_page_var,
				'nav_label'    => __( 'Collection pagination', 'sgs-blocks' ),
			)
		);

		$empty_message = sanitize_text_field(
			$attributes['emptyMessage'] ?? __( 'No items to show yet. Check back soon.', 'sgs-blocks' )
		);
	} else {
		$product_ids   = \SGS\Blocks\Card_Grid_Products::get_product_ids( $attributes );
		$empty_message = sanitize_text_field(
			$attributes['productEmptyMessage'] ?? __( 'No products to show at the moment. Check back soon.', 'sgs-blocks' )
		);
	}

	// ── Build shared wrapper props (same CSS vars the other modes use) ───────
	$wc_class_names = array_merge(
		array(
			'sgs-card-grid',
			'sgs-card-grid--card', // Product cards always use card variant.
			'sgs-card-grid--hover-' . esc_attr( $hover_effect ),
			$uid,
		),
		$card_grid_preset_classes
	);
	if ( $hover_scale ) {
		$wc_class_names[] = 'sgs-has-hover-scale';
	}
	if ( $hover_shadow ) {
		$wc_class_names[] = 'sgs-has-hover';
	}
	if ( $stagger_delay ) {
		$wc_class_names[] = 'sgs-has-stagger';
	}

	$gap_value_wc   = sgs_container_gap_value( $gap );
	$wc_style_parts = array(
		'--sgs-card-grid-columns: ' . absint( $columns ),
		'--sgs-card-grid-columns-mobile: ' . absint( $columns_mobile ),
		'--sgs-card-grid-columns-tablet: ' . absint( $columns_tablet ),
		'--sgs-card-grid-gap: ' . $gap_value_wc,
	);
	if ( $transition_dur ) {
		$wc_style_parts[] = '--sgs-transition-duration: ' . absint( $transition_dur ) . 'ms';
	}
	if ( $transition_ease ) {
		$wc_style_parts[] = '--sgs-transition-easing: ' . esc_attr( $transition_ease );
	}
	if ( $hover_scale ) {
		$wc_style_parts[] = '--sgs-hover-scale: ' . esc_attr( $hover_scale );
	}
	if ( $hover_shadow ) {
		$wc_style_parts[] = '--sgs-hover-shadow: ' . sgs_shadow_value_composed( $hover_shadow, $hover_shadow_colour );
	}
	if ( $stagger_delay ) {
		$wc_style_parts[] = '--sgs-stagger: ' . absint( $stagger_delay ) . 'ms';
	}

	$wc_wrapper_opts = array(
		'tag'           => 'div',
		'extra_classes' => $wc_class_names,
		'extra_styles'  => $wc_style_parts,
	);

	// ── Empty state (FR-24-6 reuse) ──────────────────────────────────────────
	if ( empty( $product_ids ) ) {
		ob_start();
		?>
		<div class="sgs-card-grid__empty">
			<p class="sgs-card-grid__empty-message">
				<?php echo esc_html( $empty_message ); ?>
			</p>
		</div>
		<?php
		// Keep the pagination visible on an empty page. Without this, a visitor
		// who lands on an out-of-range page (a stale link, or items deleted since
		// it was shared) sees only the empty message with no way back to page 1.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Grid_Pagination::render() escapes every interpolated value internally.
		echo $pagination_html;

		$empty_html = ob_get_clean();

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $card_grid_native_style_tag built from pre-sanitised values only (wp_strip_all_tags applied above).
		echo $card_grid_native_style_tag;
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes internally.
		echo SGS_Container_Wrapper::render( $attributes, $block, $empty_html, 'layout', $wc_wrapper_opts );
		return;
	}

	// ── Render each result as an sgs/product-card ───────────────────────────
	// Mirror of the former content-collection render.php §6 — render_block()
	// returns fully-rendered, escaped markup (house pattern file:render.php:242).
	ob_start();

	if ( $is_cpt_collection ) {
		/*
		 * Source mode is resolved PER ITEM (R-22-9 — universal, no hardcoded
		 * per-type dict), exactly as content-collection did:
		 *   - a WooCommerce `product` post, on a site where WC is active → 'wc-product'
		 *   - everything else (including sgs_product)                    → 'sgs-cpt'
		 * On a site WITHOUT WooCommerce every item resolves to 'sgs-cpt', which
		 * is the whole point of this path.
		 */
		$collection_has_woocommerce = function_exists( 'WC' );

		foreach ( $collection_posts as $collection_post ) :
			$collection_post_id   = absint( $collection_post->ID );
			$collection_post_type = $collection_post->post_type;

			$item_source_mode = ( $collection_has_woocommerce && 'product' === $collection_post_type )
				? 'wc-product'
				: 'sgs-cpt';

			// Collection-level card-behaviour attrs forwarded to each card.
			// Defaults match product-card's own defaults, so omitting them stays
			// backwards-compatible (R-22-9 — no per-item logic).
			$card_attrs = array(
				'sourceMode'   => $item_source_mode,
				'productId'    => $collection_post_id,
				// showPickers: false on browsing grids suppresses axis + pill pickers.
				'showPickers'  => isset( $attributes['showPickers'] ) ? (bool) $attributes['showPickers'] : true,
				// ctaBehaviour: learn-more (link to the product page) is the browsing default.
				'ctaBehaviour' => isset( $attributes['ctaBehaviour'] ) ? sanitize_key( $attributes['ctaBehaviour'] ) : 'learn-more',
				// showLadder: false on browsing grids — price + per-unit note only.
				'showLadder'   => isset( $attributes['showLadder'] ) ? (bool) $attributes['showLadder'] : false,
			);

			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
			echo render_block(
				array(
					'blockName' => 'sgs/product-card',
					'attrs'     => $card_attrs,
				)
			);
		endforeach;
	} else {
		foreach ( $product_ids as $wc_product_id ) :
			$card_attrs = array(
				'sourceMode' => 'wc-product',
				'productId'  => absint( $wc_product_id ),
				'showLadder' => (bool) ( $attributes['productShowLadder'] ?? false ),
			);
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
			echo render_block(
				array(
					'blockName' => 'sgs/product-card',
					'attrs'     => $card_attrs,
				)
			);
		endforeach;
	}

	// Pagination sits INSIDE the block wrapper but after the cards. Empty string
	// in wc-product mode and whenever there is a single page.
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Grid_Pagination::render() escapes every interpolated value internally.
	echo $pagination_html;

	$wc_inner_html = ob_get_clean();

	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $card_grid_native_style_tag built from pre-sanitised values only (wp_strip_all_tags applied above).
	echo $card_grid_native_style_tag;
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes internally.
	echo SGS_Container_Wrapper::render( $attributes, $block, $wc_inner_html, 'layout', $wc_wrapper_opts );

	// ItemList JSON-LD is emitted page-level by Product_Item_List
	// (includes/class-product-item-list.php) — single source of truth; no
	// per-grid emission here (prevents double-emission with loose cards).
	return;
}

if ( empty( $items ) ) {
	return '';
}

// Build class list. Reuses the shared $uid computed above (same instance
// scoping hook as the WP-native supports re-emit, wc-product branches).
$sgs_grid_uid = $uid;
$class_names  = array_merge(
	array(
		'sgs-card-grid',
		'sgs-card-grid--' . esc_attr( $variant ),
		'sgs-card-grid--hover-' . esc_attr( $hover_effect ),
		$sgs_grid_uid,
	),
	$card_grid_preset_classes
);

// Title/subtitle font-size (CG-9): block-wide typography via the shared
// TypographyControls attr shape, scoped to this grid instance's uid so
// multiple grids on one page can differ. Only set values are emitted.
$sgs_grid_typo_css  = sgs_typography_css_rule( $attributes, 'title', '.' . $sgs_grid_uid . ' .sgs-card-grid__title' );
$sgs_grid_typo_css .= sgs_typography_css_rule( $attributes, 'subtitle', '.' . $sgs_grid_uid . ' .sgs-card-grid__subtitle' );

// Per-item title/subtitle colour (was inline `style="color:…"` on every
// title/subtitle element — moved to a scoped rule keyed off the same uid so
// no rendered element carries an inline CSS property declaration).
// titleColourGradient/subtitleColourGradient (2026-09-03) are the sibling
// gradient attrs — gradient wins when set+valid (sgs_resolve_text_colour_or_gradient).
$sgs_grid_title_sel    = '.' . $sgs_grid_uid . ' .sgs-card-grid__title';
$sgs_grid_subtitle_sel = '.' . $sgs_grid_uid . ' .sgs-card-grid__subtitle';
$title_colour_effective = sgs_resolve_text_colour_or_gradient( $title_colour, $title_colour_gradient );
if ( '' !== $title_colour_effective ) {
	$title_colour_decl = sgs_text_colour_decl( $title_colour_effective );
	if ( '' !== $title_colour_decl ) {
		$sgs_grid_typo_css .= "{$sgs_grid_title_sel}{{$title_colour_decl};}";
	}
	$sgs_grid_typo_css .= sgs_text_colour_gradient_fallback_rule( $sgs_grid_title_sel, $title_colour_effective );
}
$subtitle_colour_effective = sgs_resolve_text_colour_or_gradient( $subtitle_colour, $subtitle_colour_gradient );
if ( '' !== $subtitle_colour_effective ) {
	$subtitle_colour_decl = sgs_text_colour_decl( $subtitle_colour_effective );
	if ( '' !== $subtitle_colour_decl ) {
		$sgs_grid_typo_css .= "{$sgs_grid_subtitle_sel}{{$subtitle_colour_decl};}";
	}
	$sgs_grid_typo_css .= sgs_text_colour_gradient_fallback_rule( $sgs_grid_subtitle_sel, $subtitle_colour_effective );
}

$sgs_grid_typo_tag = '' !== $sgs_grid_typo_css ? '<style>' . wp_strip_all_tags( $sgs_grid_typo_css ) . '</style>' : '';

if ( $hover_scale ) {
	$class_names[] = 'sgs-has-hover-scale';
}
if ( $hover_shadow ) {
	$class_names[] = 'sgs-has-hover';
}
if ( $hover_image_zoom ) {
	$class_names[] = 'sgs-has-img-zoom';
}
if ( $hover_grayscale ) {
	$class_names[] = 'sgs-has-grayscale';
}
if ( $stagger_delay ) {
	$class_names[] = 'sgs-has-stagger';
}

// Resolve gap via the shared helper — handles both preset slugs ("30" →
// var(--wp--preset--spacing--30)) and raw CSS lengths ("16px" → "16px").
// Back-compat: the old SelectControl only wrote bare numeric slugs, so
// existing posts are covered by the slug branch. New posts written via the
// shared ContainerWrapperControls SpacingControl may be raw lengths.
$gap_value = sgs_container_gap_value( $gap );

// Build grid CSS custom properties.
$grid_style_parts = array(
	'--sgs-card-grid-columns: ' . absint( $columns ),
	'--sgs-card-grid-columns-mobile: ' . absint( $columns_mobile ),
	'--sgs-card-grid-columns-tablet: ' . absint( $columns_tablet ),
	'--sgs-card-grid-gap: ' . $gap_value,
	'--sgs-card-grid-aspect: ' . esc_attr( $aspect_ratio ),
);

if ( $transition_dur ) {
	$grid_style_parts[] = '--sgs-transition-duration: ' . absint( $transition_dur ) . 'ms';
}
if ( $transition_ease ) {
	$grid_style_parts[] = '--sgs-transition-easing: ' . esc_attr( $transition_ease );
}
if ( $hover_scale ) {
	$grid_style_parts[] = '--sgs-hover-scale: ' . esc_attr( $hover_scale );
}
if ( $hover_shadow ) {
	$grid_style_parts[] = '--sgs-hover-shadow: ' . sgs_shadow_value_composed( $hover_shadow, $hover_shadow_colour );
}
if ( $stagger_delay ) {
	$grid_style_parts[] = '--sgs-stagger: ' . absint( $stagger_delay ) . 'ms';
}

// Per-item stagger-index custom-property VALUE (FR-32-4, D345) — varies per
// item, so it cannot be a single scoped rule on the block root; emitted into a
// `:nth-child(N)` scoped rule instead (same mechanism as sgs/social-icons' /
// sgs/pricing-table's per-item colour), N = this item's 1-based position among
// ALL rendered card items (every item renders `.sgs-card-grid__item`
// unconditionally).
$card_grid_stagger_css = '';

// Spec 35 Part 4 — per-item crop, keyed by the item's OWN stable `_key`
// (src/utils/generateItemKey.js), never by array index/`:nth-child` (both
// break the moment an operator reorders/adds/removes a card — the exact
// anti-pattern the doctrine names and rejects). `sgs_media_position_css()`
// already accepts an arbitrary attributes array + prefix; passed a per-item
// shim here rather than the block's own $attributes. A pre-existing item
// authored before this field existed has no `_key` yet (client-side
// backfill lands on next editor save) and also has no non-default
// objectFit/focalPoint to emit, so the index fallback below is never
// load-bearing in practice — it only prevents an empty selector.
$card_grid_per_item_css = '';

// Build the interior HTML (card items).
ob_start();
foreach ( $items as $index => $item ) :
	$card_grid_item_key = ! empty( $item['_key'] ) ? (string) $item['_key'] : 'idx-' . absint( $index );
	$card_grid_per_item_css .= sgs_media_position_css(
		array(
			'objectPosition' => $item['focalPoint'] ?? null,
			'objectFit'      => $item['objectFit'] ?? '',
		),
		'',
		$root_sel . ' [data-card-key="' . esc_attr( $card_grid_item_key ) . '"] img, '
			. $root_sel . ' [data-card-key="' . esc_attr( $card_grid_item_key ) . '"] video'
	);
	// Task 2.1) resolved via sgs_link_attributes() — link/linkTarget/linkRel
	// are the existing per-item storage keys, mapped to the shared
	// SgsLinkControl object shape { url, opensInNewTab, rel } at render time.
	$link_attr = sgs_link_attributes(
		array(
			'url'           => $item['link'] ?? '',
			'opensInNewTab' => isset( $item['linkTarget'] ) && '_blank' === $item['linkTarget'],
			'rel'           => $item['linkRel'] ?? '',
		)
	);
	$has_link  = '' !== $link_attr;
	$item_tag  = $has_link ? 'a' : 'div';
	if ( $stagger_delay ) {
		$card_grid_stagger_css .= $root_sel . ' .sgs-card-grid__item:nth-child(' . ( absint( $index ) + 1 ) . '){--sgs-item-index:' . absint( $index ) . ';}';
	}

	// Unified media slot — sgs_render_media() emits the right tag for either
	// image or video.
	$item_media = $item['media'] ?? null;
	// A BARE URL STRING is a first-class accepted shape. block.json declares
	// `items[].media` as `{"type":"string"}` while edit.js writes the object
	// form, and `sgs_render_media()` bails on anything that is not an array
	// (helpers-media.php:168) — so a string URL would render NOTHING, silently,
	// with an empty `.sgs-card-grid__image-wrap` left behind. Normalising here
	// fixes every caller at once — patterns, and any converter/clone output
	// that emits the documented string shape.
	// `alt` is deliberately '': these cards carry a visible title, so an alt
	// that repeated it would double-announce to a screen reader.
	if ( is_string( $item_media ) ) {
		$item_media = '' !== trim( $item_media )
			? array(
				'url'  => trim( $item_media ),
				'type' => 'image',
				'alt'  => '',
			)
			: null;
	}
	// Per-card decorative toggle (item 18 of the detector-findings backlog,
	// D918/S8 repeater-field naming — the media slot lives inside the `items`
	// array, so the flag does too). Blanking alt AND aria-hiding the wrapper
	// mirrors sgs/timeline's block-level `milestoneMediaDecorative` mechanism
	// so the image (or video) is skipped entirely by assistive tech, per
	// WCAG 2.1 AA 1.1.1. wc-product/cpt-collection modes never reach this
	// loop with client-authored media — `$items` there is the live product
	// query result, not this attribute, so decorative scoping is a no-op for
	// those modes rather than needing a separate exclusion.
	$item_decorative = ! empty( $item['decorative'] );
	if ( $item_decorative && is_array( $item_media ) ) {
		$item_media['alt'] = '';
	}
	$media_html = ! empty( $item_media ) ? sgs_render_media( $item_media, 'sgs/card-grid' ) : '';
	// Media-element atom layer (rule 37-media-no-handroll fix) — append the
	// `.sgs-media-el` marker + per-instance scope class onto the FIRST
	// <img>/<video> tag `sgs_render_media()` returned, so this element inherits
	// the `--sgs-media-object-fit` custom property set on $root_sel above and
	// picks up assets/css/media-atoms/object-fit.css's rule. `sgs_render_media()`
	// has no classes parameter (shared helper, out of this fix's scope), so the
	// class is appended here via a scoped regex rather than editing that helper.
	if ( '' !== $media_html && ! empty( $sgs_cg_media_classes ) ) {
		$media_html = preg_replace(
			'/(<(?:img|video)\b[^>]*\bclass=")/',
			'$1' . esc_attr( implode( ' ', $sgs_cg_media_classes ) ) . ' ',
			$media_html,
			1
		);
	}
	?>
	<<?php echo esc_attr( $item_tag ); ?> class="sgs-card-grid__item" data-card-key="<?php echo esc_attr( $card_grid_item_key ); ?>"<?php echo $link_attr; ?>>
		<div class="sgs-card-grid__image-wrap"<?php echo $item_decorative ? ' aria-hidden="true"' : ''; ?>>
			<?php if ( '' !== $media_html ) : ?>
				<?php echo $media_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside sgs_render_media(). ?>
			<?php endif; ?>
			<?php if ( 'overlay' === $variant || 'overlay-slide' === $hover_effect ) : ?>
				<div class="sgs-card-grid__overlay">
					<?php if ( ! empty( $item['title'] ) ) : ?>
						<span class="sgs-card-grid__title"><?php echo esc_html( $item['title'] ); ?></span>
					<?php endif; ?>
					<?php if ( ! empty( $item['subtitle'] ) ) : ?>
						<span class="sgs-card-grid__subtitle"><?php echo esc_html( $item['subtitle'] ); ?></span>
					<?php endif; ?>
				</div>
			<?php endif; ?>
		</div>
		<?php if ( 'card' === $variant ) : ?>
			<div class="sgs-card-grid__body">
				<?php if ( ! empty( $item['title'] ) ) : ?>
					<<?php echo esc_attr( $heading_level ); ?> class="sgs-card-grid__title"><?php echo esc_html( $item['title'] ); ?></<?php echo esc_attr( $heading_level ); ?>>
				<?php endif; ?>
				<?php if ( ! empty( $item['subtitle'] ) ) : ?>
					<p class="sgs-card-grid__subtitle"><?php echo esc_html( $item['subtitle'] ); ?></p>
				<?php endif; ?>
				<?php if ( ! empty( $item['badge'] ) && ! empty( $item['badgeVariant'] ) ) : ?>
					<span class="sgs-card-grid__badge sgs-card-grid__badge--<?php echo esc_attr( $item['badgeVariant'] ); ?>">
						<?php echo esc_html( $item['badge'] ); ?>
					</span>
				<?php endif; ?>
			</div>
		<?php endif; ?>
	</<?php echo esc_attr( $item_tag ); ?>>
	<?php
endforeach;
$card_grid_stagger_tag  = $card_grid_stagger_css ? '<style>' . wp_strip_all_tags( $card_grid_stagger_css ) . '</style>' : '';
$card_grid_per_item_tag = $card_grid_per_item_css ? '<style>' . wp_strip_all_tags( $card_grid_per_item_css ) . '</style>' : '';

// FR-32-4a (no-inline contract): the per-item stagger rule addresses items by
// `:nth-child(N)`, and `:nth-child` counts EVERY element sibling — including a
// `<style>` tag. Emitting these tags inside $inner_html would put them in the
// SAME parent as the card items and shift every index (by 1 to 3, depending on
// which of the three tags is non-empty), so item 0 would never be nth-child(1).
// They are therefore emitted BEFORE the wrapper — siblings of the block ROOT,
// not of the items — exactly as sgs/gallery, sgs/google-reviews and
// sgs/social-icons already do. $inner_html then holds ONLY the card items, so
// item N really is nth-child(N+1). Relative order of the three tags is
// preserved, and each is a `.{uid}`-scoped rule, so moving them earlier in the
// document cannot change which rule wins.
$card_grid_style_tags = $card_grid_native_style_tag . $sgs_grid_typo_tag . $card_grid_stagger_tag . $card_grid_per_item_tag;
$inner_html           = ob_get_clean();

echo $card_grid_style_tags . SGS_Container_Wrapper::render( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $card_grid_style_tags is CSS passed through wp_strip_all_tags(); SGS_Container_Wrapper::render() escapes internally.
	$attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $class_names,
		'extra_styles'  => $grid_style_parts,
	)
);
