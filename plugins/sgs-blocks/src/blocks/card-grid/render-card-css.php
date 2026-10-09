<?php
/**
 * Card Grid - card tile CSS (resting state, hover, border gradient, media crop, preset, padding, glyph and overlay) and the native <style> tag.
 *
 * Partial of render.php, included with a plain require so it shares render.php's
 * local scope (required once per block instance).
 *
 * Reads: $attributes, $uid, $root_sel, the $card_* and $hover_* attribute locals, $glyph_size, $glyph_colour, $image_fallback_colour, $card_grid_overlay_active, $card_grid_overlay_decls and $card_grid_native_css from render-native-css.php.
 * Writes: $card_grid_native_css (extended), $card_grid_native_style_tag, $card_grid_preset_classes and the $card_state_vars, $card_pad_*, $card_grid_hover_* and $card_grid_item_sel working locals.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

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
	// AUTOMATIC LIFT (design H4) — the card variant has no explicit hover-shadow attr of
	// its own, so this is the automatic lift ONLY, gated by the switch/overlay rule.
	if ( sgs_shadow_lift_enabled( $attributes, ( $block instanceof \WP_Block ) ? (string) $block->name : '' ) ) {
		$card_shadow_hover_value = sgs_shadow_hover_value( $card_shadow, $card_shadow_colour );
		if ( '' !== $card_shadow_hover_value ) {
			$card_state_vars[] = '--sgs-card-shadow-hover:' . $card_shadow_hover_value . ';';
		}
	}
}
if ( ! empty( $card_state_vars ) ) {
	$card_grid_native_css .= $root_sel . ' .sgs-card-grid__item{' . implode( '', $card_state_vars ) . '}';
}

// --- Hover COLOUR, via the one shared helper. The helper emits the real
// declarations on this instance's own scoped selector, matching sgs/info-box,
// sgs/hero, sgs/process-steps and sgs/post-grid. Emitting
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
// textColourHoverGradient: a gradient text paint needs `background-clip:text`, which would
// clip the item's own background to the glyphs, so it paints the title and subtitle on item
// hover instead of the item. A flat textColourHover keeps painting the item's `color`.
$card_grid_hover_text_effective   = sgs_resolve_text_colour_or_gradient( $hover_text, $hover_text_gradient );
$card_grid_hover_text_is_gradient = '' !== sgs_css_gradient_value( $card_grid_hover_text_effective );
if ( $card_grid_hover_text_is_gradient ) {
	$card_grid_item_sel         = $root_sel . ' .sgs-card-grid__item';
	$card_grid_hover_text_decl  = sgs_text_colour_decl( $card_grid_hover_text_effective );
	$card_grid_hover_text_hover = $card_grid_item_sel . ':hover .sgs-card-grid__title,' . $card_grid_item_sel . ':hover .sgs-card-grid__subtitle';
	$card_grid_hover_text_focus = $card_grid_item_sel . ':focus-within .sgs-card-grid__title,' . $card_grid_item_sel . ':focus-within .sgs-card-grid__subtitle';
	if ( '' !== $card_grid_hover_text_decl ) {
		$card_grid_native_css .= sgs_hover_guarded_rule( $card_grid_hover_text_hover, $card_grid_hover_text_decl );
		$card_grid_native_css .= $card_grid_hover_text_focus . '{' . $card_grid_hover_text_decl . ';}';
	}
	$card_grid_native_css .= sgs_text_colour_gradient_fallback_rule( $card_grid_hover_text_hover . ',' . $card_grid_hover_text_focus, $card_grid_hover_text_effective );
} elseif ( $hover_text ) {
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

// ── Root border (width, style, colour, gradient ring, none override, radius at
// three tiers) through the shared assembler. borderColourHover and its
// gradient belong to the cards (above), not the root. ──
$border = sgs_border_element_decls(
	$attributes,
	'',
	$root_sel,
	array(
		'colour' => array(
			'base'     => 'borderColour',
			'gradient' => 'borderColourGradient',
		),
	)
);
if ( $border['base'] ) {
	$card_grid_native_css .= $root_sel . '{' . implode( ';', $border['base'] ) . ';}';
}
$card_grid_native_css .= implode( '', $border['rules'] );
if ( $border['tablet'] ) {
	$card_grid_native_css .= '@media(max-width:1023px){' . $root_sel . '{' . implode( ';', $border['tablet'] ) . ';}}';
}
if ( $border['mobile'] ) {
	$card_grid_native_css .= '@media(max-width:767px){' . $root_sel . '{' . implode( ';', $border['mobile'] ) . ';}}';
}

// ── cardPadding: tier-object box family {desktop,tablet,mobile} — base +
// tablet + mobile, on `.sgs-card-grid__body` (2026-09-15, closes the gap the
// classless sc-var responsive correlator surfaced — see block.json's `body`
// element note). Mirrors sgs/hero's mediaPadding read (render.php:299-306):
// sgs_responsive_normalise_object( …, true ) [box=true, D328 defence against
// an unset/legacy value mis-resolving as a flat side] + sgs_box_object_
// shorthand() per tier. An entirely-empty tier -> shorthand() returns null ->
// NO rule emitted for that tier, so style.css's own `.sgs-card-grid__body{
// padding:var(--wp--preset--spacing--30)}` default renders unchanged.
// The same padding reaches the OVERLAY variant's text area (.sgs-card-grid__overlay,
// 2026-09-29): it has no __body, so the setting was dead there and its 16px default
// could not be changed (shape tiles can need 18px under the title).
$card_pad_sel            = ' .sgs-card-grid__body,' . $root_sel . ' .sgs-card-grid__overlay';
$card_padding_tiers      = sgs_responsive_normalise_object( $attributes['cardPadding'] ?? null, true );
$card_padding_obj        = is_array( $card_padding_tiers['desktop'] ) ? $card_padding_tiers['desktop'] : array();
$card_padding_tablet_obj = is_array( $card_padding_tiers['tablet'] ) ? $card_padding_tiers['tablet'] : array();
$card_padding_mobile_obj = is_array( $card_padding_tiers['mobile'] ) ? $card_padding_tiers['mobile'] : array();

$card_pad_base = sgs_box_object_longhands( $card_padding_obj, 'padding' );
if ( null !== $card_pad_base ) {
	$card_grid_native_css .= $root_sel . $card_pad_sel . '{' . $card_pad_base . '}';
}
$card_pad_tab = sgs_box_object_longhands( $card_padding_tablet_obj, 'padding' );
if ( null !== $card_pad_tab ) {
	$card_grid_native_css .= '@media(max-width:1023px){' . $root_sel . $card_pad_sel . '{' . $card_pad_tab . '}}';
}
$card_pad_mob = sgs_box_object_longhands( $card_padding_mobile_obj, 'padding' );
if ( null !== $card_pad_mob ) {
	$card_grid_native_css .= '@media(max-width:767px){' . $root_sel . $card_pad_sel . '{' . $card_pad_mob . '}}';
}

// Per-item glyph icon + image-fallback tile — one scoped custom-property
// rule (glyph-fallback.php); empty inputs leave the property unset so
// style.css's own var() fallback chain renders exactly as before.
$card_grid_native_css .= sgs_card_grid_glyph_css( $root_sel, $glyph_colour, $glyph_size, $image_fallback_colour );

// Block-wide image overlay (image-overlay.php) — one scoped rule targeting
// `.sgs-card-grid__image-overlay`; empty when neither overlayColour nor
// overlayGradient is set, matching $card_grid_overlay_active above.
$card_grid_native_css .= sgs_card_grid_image_overlay_css( $root_sel, $card_grid_overlay_decls );

// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving CSS
// combinators like `>` intact (contract §D — matches SGS_Container_Wrapper +
// sgs/hero). Every value reaching $card_grid_native_css is pre-sanitised
// (sgs_css_length_value() / sgs_css_keyword_sanitise() / wp_style_engine_get_styles), so no
// un-sanitised value survives to here.
$card_grid_native_style_tag = $card_grid_native_css ? '<style id="' . esc_attr( $uid ) . '-native">' . wp_strip_all_tags( $card_grid_native_css ) . '</style>' : '';
