<?php
/**
 * Post Grid — scoped CSS assembly (NO-INLINE: no inline style declarations) and the root class list.
 *
 * Partial of render.php, included with a plain require so it shares render.php's
 * local scope (required once per block instance).
 *
 * Reads: $uid, $layout, $attributes, $card_params, $hover_bg, $hover_border, $hover_text_raw, $hover_text_gradient_raw, $extra_attrs.
 * Writes: $post_grid_classes, $responsive_css (printed as the scoped <style>), $extra_attrs (separator data attribute).
 *
 * @package SGS\Blocks
 */


defined( 'ABSPATH' ) || exit;

// -------------------------------------------------------------------------
// NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// Read the resolved values from
// $attributes['style'] here and emit them into POST-GRID'S OWN scoped <style>
// (composite caveat: do NOT pass these as wrapper `extra_styles` — that path
// inlines). Base spacing (padding/margin) is a SEPARATE mechanism the wrapper
// already handles scoped internally (reads $attributes['style']['spacing']
// directly) — not duplicated here.
// -------------------------------------------------------------------------
// $uid is computed earlier (before $card_params) — see the comment there.
$root_sel = '.' . $uid . '.wp-block-sgs-post-grid';

$post_grid_classes = array(
	'sgs-post-grid',
	'sgs-post-grid--' . $layout,
	$uid,
);

$responsive_css = '';

$post_grid_style_engine_args = array();

$color_args = array();
if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
	$color_args['text'] = (string) $attributes['style']['color']['text'];
}
if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
	$color_args['background'] = (string) $attributes['style']['color']['background'];
}
if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
	$color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
}
if ( ! empty( $color_args ) ) {
	$post_grid_style_engine_args['color'] = $color_args;
}

if ( ! empty( $post_grid_style_engine_args ) ) {
	$post_grid_scoped_styles = wp_style_engine_get_styles(
		$post_grid_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $post_grid_scoped_styles['css'] ) ) {
		$responsive_css .= $post_grid_scoped_styles['css'];
	}
}

// Typography — migrated off WP-native supports.typography onto the shared
// sgs_typography_css_rule() helper (D971/D972 full-replacement track). The
// native support's actual target was .sgs-post-grid__title (block.json used
// to declare selectors.typography for it, not the block root), so this reads
// the 'title'-prefixed attrs and scopes the rule at the same selector the
// native support used.
$responsive_css .= sgs_typography_css_rule( $attributes, 'title', $root_sel . ' .sgs-post-grid__title' );
// Pagination page buttons (built by Grid_Pagination) and the load-more button
// (Grid_Pagination in the page, rebuilt by view.js after a filter): each has its
// own typography surface; style.css keeps the 0.875rem/600 and 1rem/600
// defaults inside :where() so these scoped rules win.
$responsive_css .= sgs_typography_css_rule( $attributes, 'pageButton', $root_sel . ' .sgs-post-grid__page-btn' );
$responsive_css .= sgs_typography_css_rule( $attributes, 'loadMore', $root_sel . ' .sgs-post-grid__load-more' );
// Card text elements (built by \SGS\Blocks\Post_Grid_REST::render_card, and by the editor
// preview): meta line, image badge, plain category label, excerpt, read-more link.
// Each type default in style.css sits in :where() so these scoped rules win.
$responsive_css .= sgs_typography_css_rule( $attributes, 'meta', $root_sel . ' .sgs-post-grid__meta' );
$responsive_css .= sgs_typography_css_rule( $attributes, 'badge', $root_sel . ' .sgs-post-grid__badge' );
$responsive_css .= sgs_typography_css_rule( $attributes, 'category', $root_sel . ' .sgs-post-grid__category' );
$responsive_css .= sgs_typography_css_rule( $attributes, 'excerpt', $root_sel . ' .sgs-post-grid__excerpt' );
$responsive_css .= sgs_typography_css_rule( $attributes, 'readMore', $root_sel . ' .sgs-post-grid__readmore' );

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero, sgs/quote) so preset palette colours still
// resolve visually.
$post_grid_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$post_grid_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $post_grid_preset_text_slug ) {
	$post_grid_classes[] = 'has-text-color';
	$post_grid_classes[] = 'has-' . $post_grid_preset_text_slug . '-color';
}
if ( '' !== $post_grid_preset_bg_slug ) {
	$post_grid_classes[] = 'has-background';
	$post_grid_classes[] = 'has-' . $post_grid_preset_bg_slug . '-background-color';
}

// 37-media-no-handroll: the featured-image object-fit control. Emitted ONCE
// here (a `.{uid}{...}` bare-selector rule, not per-card) — every card's
// <img class="sgs-post-grid__img sgs-media-el {uid}"> shares the same
// block-level value (see the $sgs_pg_uid comment in class-post-grid-rest.php
// for how AJAX-injected cards pick up the same rule). Replaces the two
// hardcoded `object-fit: cover` declarations style.css used to carry
// (grid-mode .sgs-post-grid__img + list-mode .sgs-post-grid--list
// .sgs-post-grid__image img — both target this one element) — when unset,
// assets/css/media-atoms/object-fit.css's own var() fallback already
// resolves to 'cover', so removing them changes nothing by default.
if ( class_exists( 'SGS_Media_Element' ) ) {
	$post_grid_media_css = SGS_Media_Element::style( $attributes, '', 'sgs/post-grid', $uid, array( 'object-fit' ) );
	if ( '' !== $post_grid_media_css ) {
		$responsive_css .= $post_grid_media_css;
	}
}

// FR-32-4 as amended (D345): the per-instance card custom-property VALUES used
// to ride inline on EVERY card root (class-post-grid-rest.php). They are
// per-block-instance, not per-card, so they emit once here as a scoped
// descendant rule. Being a descendant selector on the block root, it also
// styles cards injected later by view.js AJAX pagination — those land inside
// `.sgs-post-grid__inner`, still within the root, and CSS applies to DOM added
// after the stylesheet was parsed. Built by the same helper the card renderer
// documents, so the two cannot drift apart.
$responsive_css .= $root_sel . ' .sgs-post-grid__card{' . \SGS\Blocks\Post_Grid_REST::card_vars_decls( $card_params ) . '}';

// categoryBadgeBgColour background layer — moved to ::after (D292) so the
// categoryBadgeColour text-colour gradient can use background-clip:text on the
// same element. This MUST run before the text-colour trio loop below.
$badge_bg_paint_decl = sgs_background_paint_decl( $card_params['categoryBadgeBgColour'], $attributes['categoryBadgeBgColourGradient'] ?? '' );
if ( '' !== $badge_bg_paint_decl ) {
	$responsive_css .= sgs_block_background_layer_css( $root_sel . ' .sgs-post-grid__badge,' . $root_sel . ' .sgs-post-grid__category', $badge_bg_paint_decl );
}

// D956 (778879732 rollout, Phase 3) — titleColour/excerptColour/metaColour/
// readMoreColour gradient siblings. Emitted as DIRECT declarations at the real
// card element selectors (not the --sgs-pg-* custom-property chain above,
// which cannot carry a gradient), scoped under $root_sel so the same
// descendant-selector rule also styles cards injected later by view.js AJAX
// pagination. Mirrors sgs/counter's numberColour/labelColour pattern.
//
// categoryBadgeColour joins this same loop (2026-09-05, colour-conformance
// closeout): the value is BLOCK-LEVEL, identical for every card in this grid
// (card_params is built once above from $attributes, not per-post), NOT
// per-post data — the badge paints a static operator-chosen colour, not a
// value derived from the post's own category term. It still rides the
// --sgs-pg-badge-colour custom property too (\SGS\Blocks\Post_Grid_REST::card_vars_decls(),
// consumed by style.css's `.sgs-post-grid__badge`/`.sgs-post-grid__category`
// fallback rules) — that legacy custom-property chain is harmless dead weight
// now (categoryBadgeBgColour still legitimately needs it, a fill/
// background-color value, not a text/color one), because this loop's
// $root_sel-scoped rule out-specifies the bare-class style.css default
// unconditionally (same "own scoped rule beats the compiled stylesheet"
// mechanism documented for sgs/option-picker — no new mechanism needed here
// either). categoryBadgeColour drives TWO mutually-exclusive elements
// depending on cardStyle (badge pill for card/overlay, plain inline label for
// flat/minimal — class-post-grid-rest.php render_card() lines ~440/480), so
// the selector is comma-joined to both, mirroring sgs/pricing-table's
// title_sel dual-alias-selector pattern.
$post_grid_text_rows = array(
	'titleColour'         => $root_sel . ' .sgs-post-grid__title a',
	'excerptColour'       => $root_sel . ' .sgs-post-grid__excerpt',
	'metaColour'          => $root_sel . ' .sgs-post-grid__meta',
	'categoryBadgeColour' => $root_sel . ' .sgs-post-grid__badge,' . $root_sel . ' .sgs-post-grid__category',
	'readMoreColour'      => $root_sel . ' .sgs-post-grid__readmore',
);
foreach ( $post_grid_text_rows as $post_grid_attr => $post_grid_sel ) {
	$post_grid_flat      = $card_params[ $post_grid_attr ] ?? '';
	$post_grid_gradient  = $attributes[ $post_grid_attr . 'Gradient' ] ?? '';
	$post_grid_effective = sgs_resolve_text_colour_or_gradient( $post_grid_flat, $post_grid_gradient );
	if ( '' === $post_grid_effective ) {
		continue;
	}
	$post_grid_decl = sgs_text_colour_decl( $post_grid_effective );
	if ( '' !== $post_grid_decl ) {
		$responsive_css .= $post_grid_sel . '{' . $post_grid_decl . ';}';
	}
	$responsive_css .= sgs_text_colour_gradient_fallback_rule( $post_grid_sel, $post_grid_effective );
}

// categoryBadgeColourHover (colour-conformance text-colour trio closeout,
// 2026-09-07) — category badge text colour on :hover/:focus-within, with
// optional gradient sibling. Emitted as a separate descendant rule for the
// same comma-joined selector as the base categoryBadgeColour (both
// .sgs-post-grid__badge and .sgs-post-grid__category are mutually-exclusive
// per cardStyle). This is a standalone section separate from the trio loop
// because it targets the CARD's :hover, not a text-element's direct :hover —
// render.php's own comment at line 609-611 calls this an 'ancestor-hover shape'.
if ( '' !== ( $attributes['categoryBadgeColourHover'] ?? '' ) ) {
	$badge_hover_colour = sgs_colour_value( $attributes['categoryBadgeColourHover'] );
	$responsive_css .= sgs_emit_state_colour_css(
		$root_sel . ' .sgs-post-grid__badge,' . $root_sel . ' .sgs-post-grid__category',
		array(),
		array( 'color:' . $badge_hover_colour )
	);
}

// Hover colour shifts (background/text/border) — per-instance scoped rules via
// sgs_emit_state_colour_css(), same as sgs/info-box.
// Bean-locked: no hardcoded fallback colour — an unset hover colour renders NO
// hover change at all.
$post_grid_card_sel = $root_sel . ' .sgs-post-grid__card';

// Background: card/overlay/flat/minimal all use the same --sgs-hover-bg override
// value, so one rule covers every card style.
if ( $hover_bg ) {
	$responsive_css .= sgs_emit_state_colour_css( $post_grid_card_sel, array(), array( 'background-color:' . $hover_bg ) );
}

// Border: card/overlay/flat all set `border-color` on hover (their fallbacks
// differed — transparent vs the theme border colour — but the override value
// was always the same --sgs-hover-border, so those three collapse into one
// rule). The `minimal` card style is genuinely different: it has no side
// border at rest, only a 2px TOP accent border, so it must keep setting
// `border-top-color` on its own — that is a real property difference, not
// just a fallback difference, so it cannot collapse with the other three.
if ( $hover_border ) {
	$responsive_css .= sgs_emit_state_colour_css( $post_grid_card_sel . ':not(.sgs-post-grid__card--minimal)', array(), array( 'border-color:' . $hover_border ) );
	$responsive_css .= sgs_emit_state_colour_css( $post_grid_card_sel . '.sgs-post-grid__card--minimal', array(), array( 'border-top-color:' . $hover_border ) );
}

// Text: NOT routed through sgs_emit_state_colour_css() — that helper's fixed
// template only supports "this selector's own :hover" (it appends `:hover`
// directly onto $selector). This text-hover CSS is the OPPOSITE shape:
// hovering the CARD changes the colour of four DESCENDANT elements (title
// link / excerpt / meta / read-more), each of which already carries its own
// explicit resting `color` declaration — an explicit declaration on an
// element always beats an inherited value regardless of specificity, so
// setting `color` on the card itself would not reach them.
// sgs_hover_state_rules()'s `$suffix` parameter exists for exactly this
// ancestor-hover shape — it lands AFTER the pseudo-class, giving
// `{card}:hover {target}` — so this still goes through the ONE shared
// touch-safe hover mechanism (helpers-hover-state.php) rather than
// hand-rolling a `:hover` rule. `:focus-within` (not `:focus-visible`) is the
// correct pseudo-class for this ancestor-hover shape, since the element that
// receives focus (the read-more link) is a descendant, not the card itself.
//
// Flat-or-gradient (D636 "text" builder) — sgs_resolve_text_colour_or_gradient()
// picks textColourHoverGradient when set + valid, leaving the flat
// textColourHover value untouched. sgs_text_colour_decl() emits a plain
// `color:` declaration for a flat colour, or the background-clip:text trio of
// declarations for a gradient. sgs_text_colour_gradient_fallback_rule() is the
// MANDATORY companion @supports fallback for browsers without
// background-clip:text (a no-op for a flat colour) — emitted only once the
// value is known to be a gradient, real declarations only, no hardcoded
// fallback colour, emitted only when the operator has actually set a hover
// text colour or gradient.
$hover_text_effective = sgs_resolve_text_colour_or_gradient( $hover_text_raw, $hover_text_gradient_raw );
$hover_text_decl      = sgs_text_colour_decl( $hover_text_effective );
if ( $hover_text_decl ) {
	$post_grid_hover_text_targets = array(
		' .sgs-post-grid__title a',
		' .sgs-post-grid__excerpt',
		' .sgs-post-grid__meta',
		' .sgs-post-grid__readmore',
	);
	foreach ( $post_grid_hover_text_targets as $post_grid_hover_text_target ) {
		$responsive_css .= sgs_hover_state_rules( $post_grid_card_sel, $hover_text_decl, ':focus-within', $post_grid_hover_text_target );

		// Companion rule — one call per target, matching sgs_hover_state_rules()
		// above (a comma-joined selector list here is safe: unlike
		// sgs_hover_state_rules(), sgs_text_colour_gradient_fallback_rule() takes
		// $selector as an opaque string and never appends a pseudo-class to it).
		$responsive_css .= sgs_text_colour_gradient_fallback_rule(
			$post_grid_card_sel . ':hover' . $post_grid_hover_text_target . ',' . $post_grid_card_sel . ':focus-within' . $post_grid_hover_text_target,
			$hover_text_effective
		);
	}
}

// Output responsive CSS if needed. wp_strip_all_tags (NOT esc_html) blocks a
// </style> breakout while leaving CSS combinators like `>` intact (contract
// §D — matches SGS_Container_Wrapper + sgs/hero + sgs/quote + sgs/button).

// ── Border (width, style, colour, gradient ring, none override, radius at
// three tiers) through the shared assembler. The base rule prints before the
// tier rules so a tablet or mobile radius (same specificity) wins in its query.
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
	$responsive_css .= $root_sel . '{' . implode( ';', $border['base'] ) . ';}';
}
if ( $border['tablet'] ) {
	$responsive_css .= '@media(max-width:1023px){' . $root_sel . '{' . implode( ';', $border['tablet'] ) . ';}}';
}
if ( $border['mobile'] ) {
	$responsive_css .= '@media(max-width:767px){' . $root_sel . '{' . implode( ';', $border['mobile'] ) . ';}}';
}
$responsive_css .= implode( '', $border['rules'] );

// Lines between the grid layout's cards: the shared Separators setting
// (includes/helpers-separators.php), flow path. The grid belongs to `__inner`, not the
// wrapper (the wrapper sees no `layout`, see below), so the block names that list and
// marks its own root for the runtime fallback. List, masonry and carousel draw none.
if ( 'grid' === $layout ) {
	$sgs_pg_sep_css = sgs_separators_css(
		$attributes['separators'] ?? array(),
		array(
			'list'   => $root_sel . ' > .sgs-post-grid__inner',
			'layout' => 'flow',
			'gap'    => is_array( $attributes['gap'] ?? null ) ? $attributes['gap'] : array(),
		),
		sgs_container_separators_caps()
	);
	if ( '' !== $sgs_pg_sep_css ) {
		$responsive_css                    .= $sgs_pg_sep_css;
		$sgs_pg_sep_root                    = sgs_separators_root_attrs( '> .sgs-post-grid__inner' );
		$post_grid_classes[]                = $sgs_pg_sep_root['class'];
		$extra_attrs['data-sgs-sep-list']   = '> .sgs-post-grid__inner';
	}
}

// Every value reaching $responsive_css is pre-sanitised (sgs_css_length_value() /
// sgs_css_keyword_sanitise() / wp_style_engine_get_styles), so no un-sanitised value
// survives to here.
if ( $responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) );
}
