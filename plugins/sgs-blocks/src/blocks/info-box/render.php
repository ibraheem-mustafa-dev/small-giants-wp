<?php
/**
 * Server-side render for the SGS Info Box block.
 *
 * FR-22-6 migration: renders the wrapper shell (card-style / hover / media-position
 * driven classes + CSS custom property vars for hover colours, scale, shadow) and
 * echoes $content (InnerBlocks) for all card content — icon/media, heading,
 * subtitle, text body, and button.
 *
 * BLOCK-PRIVATE, NO-SGS-CONTAINER-WRAPPER (matches the D294 content-KIND
 * composite pattern proven on sgs/quote): sgs/info-box is CONTENT-kind (box +
 * width only) — it never used the shared wrapper's grid/section/background/
 * overlay/SVG/shape machinery (its own card background/border/shadow ride on
 * the static `sgs-info-box--{cardStyle}` BEM classes in style.css, and its
 * content is InnerBlocks-only), so `SGS_Container_Wrapper::render()` was
 * dropped. The block's OWN root `<div>` is built directly via
 * `get_block_wrapper_attributes()`.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check. Values are emitted via `wp_style_engine_get_styles()` (the exact
 * wholesale-passthrough pattern already proven on sgs/container's no-inline
 * residual + sgs/process-steps + sgs/timeline).
 *
 * BOX-GROUP (contract §B): base padding/margin = WP-native style.spacing.*
 * objects (skip-serialised, emitted scoped); tiers = paddingTablet/
 * paddingMobile/marginTablet/marginMobile object attrs (scoped @media
 * 1023/767). Border radius/width/colour/style stay WP-native
 * `style.border.*` (skip-serialised, wholesale-passed to the style engine —
 * matches sgs/container's no-inline residual; this block never had a
 * per-side custom-attr border model). width/maxWidth are kept-scalar
 * single-value families (contract §C), base only — matches the pre-existing
 * contract (no tablet/mobile tiers were ever declared for this block).
 *
 * Scalar CONTENT attributes heading/subtitle/description are no longer read
 * here (rendered by InnerBlocks children). The legacy media attrs mediaType/
 * image/icon/boxMedia/mediaEmoji predate the FR-22-6 InnerBlocks migration —
 * real media now lives in sgs/icon and sgs/media children — and were REMOVED
 * from block.json (no deprecated.js exists, D271; boxMedia/mediaEmoji were
 * already gone). R-31-14: NO legacy fallback hack.
 *
 * Scalar STYLING/LAYOUT attributes consumed here (wrapper-level only):
 *   cardStyle, effectHover, iconPosition, backgroundColour, backgroundColourGradient,
 *   backgroundColourHover, backgroundColourHoverGradient, textColour, textColourGradient,
 *   textColourHover, textColourHoverGradient, linkColour, linkColourHover,
 *   borderColourHover, scaleHover, shadowHover, grayscaleHover,
 *   transitionDuration, transitionEasing,
 *   sgsAnimation, sgsAnimationDuration, sgsAnimationEasing, staggerDelay.
 *
 * D744 — background/text/link colour were migrated OFF native supports.color
 * (background/text/link/gradients, all false in block.json now) onto these
 * block-private attrs, emitted via the shared colour-variant helpers
 * (includes/helpers-colour-variants.php) so the client sees ONE colour
 * control per property instead of a competing native + custom pair.
 *
 * @since 2026-05-05  FR-22-6 migration — InnerBlocks content model.
 * @since 2026-07-10  100% no-inline + box-group migration (D297).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    InnerBlocks HTML (all card content).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;



require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';


// [D-tier-object-render-fix 2026-09-06]
// Group 1 folded padding/margin into owned tier-object attrs
// {desktop,tablet,mobile}, but this block's own scoped CSS below still
// reads the pre-migration flat shape (a plain box for the base value,
// plus four separate flat attrs for the tablet/mobile overrides --
// block.json no longer declares any of those four). Normalise once,
// into fresh locals only -- every literal reference below has been
// redirected to these instead of writing back into $attributes.
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();
// ---------------------------------------------------------------------------
// 1. Box-object interface contract §1 + security §D sanitisers (mirrors
// sgs/quote + sgs/process-steps + sgs/container).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. Extract LAYOUT/STYLING scalar attributes with defaults.
// ---------------------------------------------------------------------------
$sgs_card_style    = isset( $attributes['cardStyle'] ) ? $attributes['cardStyle'] : 'elevated';
$sgs_hover_effect  = isset( $attributes['effectHover'] ) ? $attributes['effectHover'] : 'lift';
$sgs_icon_position = isset( $attributes['iconPosition'] ) ? $attributes['iconPosition'] : 'top';
$sgs_hover_border  = isset( $attributes['borderColourHover'] ) ? $attributes['borderColourHover'] : '';
// D636 border-colour gradient — sibling attribute, wins over $sgs_hover_border when set.
$sgs_hover_border_gradient = sgs_css_gradient_value( isset( $attributes['borderColourHoverGradient'] ) ? $attributes['borderColourHoverGradient'] : '' );
$sgs_hover_scale         = isset( $attributes['scaleHover'] ) ? $attributes['scaleHover'] : '';
$sgs_hover_shadow        = isset( $attributes['shadowHover'] ) ? $attributes['shadowHover'] : '';
$sgs_hover_shadow_colour = isset( $attributes['shadowHoverColour'] ) ? $attributes['shadowHoverColour'] : '';
$sgs_hover_gray          = isset( $attributes['grayscaleHover'] ) ? (bool) $attributes['grayscaleHover'] : false;

// D744 — background/text/link colour, block-private replacements for the
// retired native supports.color.background/text/link/gradients. Read raw
// here; resolution (slug -> var(), gradient validation, flat-vs-gradient
// win) happens where each is emitted below via the shared colour-variant
// helpers (includes/helpers-colour-variants.php) + sgs_text_decls().
$sgs_text_colour = isset( $attributes['textColour'] ) ? (string) $attributes['textColour'] : '';

// Width — SGS custom scalars (kept-scalar single-value families, contract §C).
// Base only — this block never declared maxWidthTablet/widthTablet.
// D540: this block renders NO inner band — it emits a plain `width:` on its
// own root selector, alongside `max-width:` from maxWidth. D540 reserves
// `contentWidth` for a block that genuinely wraps its content in a second
// layer; one that wants a fixed width says `width`.
$sgs_content_width = isset( $attributes['width'] ) ? $attributes['width'] : '';
$sgs_max_width     = isset( $attributes['maxWidth'] ) ? $attributes['maxWidth'] : '';

// ---------------------------------------------------------------------------
// 3. Base padding/margin — WP-native style.spacing.* objects (skip-serialised
// in block.json → NOT auto-inlined); tiers — SGS object attrs.
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

$padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

// ---------------------------------------------------------------------------
// 4. WP `color` / `typography` / `border` / `shadow` support values
// (skip-serialised in block.json → NOT auto-inlined). Passed WHOLESALE to the
// style engine below — the engine safely ignores any sub-key it doesn't
// recognise + resolves preset "var:preset|…" references itself. Mirrors
// sgs/container's no-inline residual (proven D292) + sgs/process-steps.
// ---------------------------------------------------------------------------

$style_group           = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();
$style_border_args     = ! empty( $style_group['border'] ) && is_array( $style_group['border'] ) ? $style_group['border'] : array();
// COLOUR key stripped (2026-08-30 owner decision): this block declares no
// __experimentalBorder/border support, so style.border.color was never a real
// editor control — the deleted bespoke picker's comment claiming it mirrored
// WP's native Border panel was false (no such panel exists on this block).
// borderColour (Shape B, §8-9 below) is the sole canonical owner of the
// block-private border colour. Live-verified 2026-08-30: 0 of 418 stored
// info-box instances carry style.border.color, so nothing is stranded.
// RADIUS (and any other key) is left untouched — 388 stored instances rely on
// style.border.radius reaching wp_style_engine_get_styles() below.
unset( $style_border_args['color'] );
$style_shadow = isset( $style_group['shadow'] ) ? (string) $style_group['shadow'] : '';

// D744: native color support (background/text/link/gradients) is retired —
// $style_group['color'] and $style_group['elements']['link'] are no longer
// read. WP does not add textColor/backgroundColor/gradient to this block's
// attribute schema once supports.color.background/text/gradients are false
// (they are conditionally-registered attrs, not always-present ones), so
// there is no preset-slug has-*-color class to re-add either — the whole
// native colour surface this section used to bridge is gone by construction,
// not by a runtime check.
//
// D971/D972 — typography (fontSize/lineHeight, previously a native
// supports.typography with __experimentalSkipSerialization) is retired the
// same way: fontSize is now a block-private tier-object attribute consumed
// below via sgs_typography_css_rule(), so there is no preset fontSize SLUG
// left to derive a has-*-font-size class from either.

// ---------------------------------------------------------------------------
// 5. Wrapper CSS custom-property VALUES (hover colours + transition timing).
// A `--var: value` is a value, not a declaration (contract §A) — stays inline.
// ---------------------------------------------------------------------------
$sgs_wrapper_styles = array();
$sgs_wrapper_styles = array_merge( $sgs_wrapper_styles, sgs_transition_vars( $attributes ) );

// Hover BORDER colour emits as a scoped `.{uid}.sgs-info-box:hover{…}` rule
// (assembled in §9 below), NOT as an inline `--sgs-hover-*` VALUE. An inline
// `--var` (a) leaves a `style` attribute on the root and (b) breaks the
// former `[style*="--sgs-hover-*"]` presence-selector gate the moment the
// value moves scoped (Spec 32 FR-32-4 as amended 2026-07-18 / D345;
// footprint GOTCHA F). A per-instance `:hover` rule (specificity 0,3,0)
// beats the variant base (0,2,0) and applies ONLY when the operator set a
// hover colour — variant-safe, so no resting-value fallback is needed.
// D744: background/text hover colours moved OUT of this array — they are
// now emitted by sgs_block_background_layer_css()/sgs_emit_state_colour_css()
// above (background on its own `::after` layer; text alongside its base
// state), so building them here too would duplicate the same declarations
// on the same selector.
$sgs_hover_decls = array();
if ( $sgs_hover_border ) {
	$sgs_hover_decls[] = 'border-color:' . sgs_colour_value( $sgs_hover_border );
}

$sgs_allowed_scales = array( '1.02', '1.05', '1.1' );

// ---------------------------------------------------------------------------
// 6. uid + root selector. uid is a CLASS (contract §B3 — this block declares
// `supports.anchor`, so the root `id` must stay free for the anchor).
// ---------------------------------------------------------------------------

$anchor   = $attributes['anchor'] ?? '';
$uid      = 'sgs-info-box-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-info-box';

// ---------------------------------------------------------------------------
// 7. Wrapper classes (parity with the pre-existing BEM scheme).
// ---------------------------------------------------------------------------
$sgs_classes = array(
	'wp-block-sgs-info-box',
	'sgs-info-box',
	$uid,
	'sgs-info-box--' . esc_attr( $sgs_card_style ),
	'sgs-info-box--hover-' . esc_attr( $sgs_hover_effect ),
	'sgs-info-box--media-' . esc_attr( $sgs_icon_position ),
);

if ( $sgs_hover_scale && in_array( $sgs_hover_scale, $sgs_allowed_scales, true ) ) {
	$sgs_wrapper_styles[] = '--sgs-hover-scale:' . esc_attr( $sgs_hover_scale );
	$sgs_classes[]        = 'sgs-has-hover-scale';
}
$sgs_safe_hover_shadow = sgs_shadow_value_composed( $sgs_hover_shadow, $sgs_hover_shadow_colour );
if ( '' !== $sgs_safe_hover_shadow ) {
	$sgs_wrapper_styles[] = '--sgs-hover-shadow:' . $sgs_safe_hover_shadow;
	$sgs_classes[]        = 'sgs-has-hover';
}
if ( $sgs_hover_gray ) {
	$sgs_classes[] = 'sgs-has-grayscale';
}

// D744/D971: has-text-color / has-background / has-*-gradient-background /
// has-*-font-size are all retired with their native supports — WP no longer
// registers textColor/backgroundColor/gradient/fontSize preset slugs on this
// block's schema, so there is no preset slug left to re-add a class for.

// ---------------------------------------------------------------------------
// 8. Scoped CSS assembly — box/border/colour/typography/shadow/width +
// responsive tiers. Nothing here lands inline (contract §A).
// ---------------------------------------------------------------------------

$scoped_css = array();

// --- Base spacing (padding/margin), colour, border (incl. radius/width/
// style), typography, shadow — skip-serialised, emitted scoped via the
// stable core style engine (exactly how WP core outputs these supports). ---

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

// D744: no 'color' key here — background/text colour are block-private
// (emitted separately below via the shared colour-variant helpers), not
// passed wholesale to the style engine any more.
if ( ! empty( $style_border_args ) ) {
	$base_style_engine_args['border'] = $style_border_args;
}

if ( '' !== $style_shadow ) {
	$base_style_engine_args['shadow'] = $style_shadow;
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

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). Replaces the old WP-native
// supports.typography (fontSize + lineHeight only) with the framework's own
// helper, which also now offers fontWeight/fontStyle. Emitted onto the SAME
// root selector InnerBlocks children inherit from (HC2 — parent owns LAYOUT,
// child owns TYPOGRAPHY; an unset child inherits this, any child setting its
// own typography still wins by cascade).
$scoped_css[] = sgs_typography_css_rule( $attributes, '', $root_sel );

// --- D744: Text colour (flat-or-gradient, base + hover) — block-private
// replacement for the retired native supports.color.text/gradients. Both
// states land on the SAME root selector as the background paint below.
// FIXED 2026-09-04 — was sgs_text_decls()/sgs_emit_state_colour_css(), which
// always emits a bare `color:` declaration even for a resolved gradient
// string (invalid CSS, silently dropped: live-verified this painted
// `color:var(--wp--preset--color--linear-gradient90degff...)`, i.e. never
// actually rendered a gradient). The MANDATORY companion rule below
// (sgs_text_colour_gradient_fallback_rule) was already present and correct —
// it emits only the `@supports not(...)` fallback branch, not the primary
// background-clip:text paint, so its presence alone could not have masked
// this. sgs_text_colour_decl() is the correct primary primitive: it resolves
// to the flat `color:` OR the full background-clip:text declaration set
// depending on what was resolved. See CLAUDE.md "Colour EMISSION helpers". ---
$sgs_info_text_normal_resolved = sgs_resolve_text_colour_or_gradient( $sgs_text_colour, (string) ( $attributes['textColourGradient'] ?? '' ) );
$sgs_info_text_hover_resolved  = sgs_resolve_text_colour_or_gradient(
	isset( $attributes['textColourHover'] ) ? (string) $attributes['textColourHover'] : '',
	(string) ( $attributes['textColourHoverGradient'] ?? '' )
);
$sgs_info_text_normal_decl     = sgs_text_colour_decl( $sgs_info_text_normal_resolved );
$sgs_info_text_hover_decl      = sgs_text_colour_decl( $sgs_info_text_hover_resolved );
if ( '' !== $sgs_info_text_normal_decl || '' !== $sgs_info_text_hover_decl ) {
	$scoped_css[] = sgs_emit_state_colour_css(
		$root_sel,
		'' !== $sgs_info_text_normal_decl ? array( $sgs_info_text_normal_decl ) : array(),
		'' !== $sgs_info_text_hover_decl ? array( $sgs_info_text_hover_decl ) : array()
	);
}
// Gradient companion rule — MUST accompany sgs_text_colour_decl(): its
// gradient branch has no `@supports` fallback of its own for a browser that
// doesn't support background-clip:text. A no-op for a flat colour, safe to
// call unconditionally.
$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $root_sel, $sgs_info_text_normal_resolved );
if ( '' !== $sgs_info_text_hover_resolved && $sgs_info_text_hover_resolved !== $sgs_info_text_normal_resolved ) {
	$scoped_css[] = sgs_hover_media_wrap(
		sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover', $sgs_info_text_hover_resolved )
	) . sgs_text_colour_gradient_fallback_rule( $root_sel . ':focus-visible', $sgs_info_text_hover_resolved );
}

// --- D744: Background colour (flat-or-gradient, base + hover) — painted on
// a `::after` layer, never the root itself, so the text colour/gradient
// above (background-clip:text on the SAME $root_sel) cannot clip or
// overwrite it (both use background-image). Mirrors sgs/product-card. ---
$sgs_info_bg_decls = sgs_fill_decls(
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
$scoped_css[]      = sgs_block_background_layer_css(
	$root_sel,
	$sgs_info_bg_decls['normal'][0] ?? '',
	$sgs_info_bg_decls['hover'][0] ?? ''
);

/*
 * text-align is the ONE declared typography support the wholesale passthrough
 * above cannot carry: it is not a style-engine key, so
 * wp_style_engine_get_styles() silently ignores it (same reason
 * sgs/notice-banner and sgs/cta-section each emit it by hand). Every other
 * declared support — fontSize / lineHeight / letterSpacing / textTransform /
 * fontWeight / fontStyle — already reaches $root_sel through
 * $style_typography_args, so this is the only gap.
 *
 * Emitted to the block ROOT, not a child element: this block renders its
 * heading and description as InnerBlocks children (HC2 migration, see
 * style.css:99), so plain CSS inheritance carries the value down. A
 * DECLARATION beats an INHERITED value regardless of specificity, so an
 * unset child inherits this and any child setting its own alignment wins.
 *
 * Reads the native key first — WP's "Align text" control writes
 * style.typography.textAlign — with the top-level attribute as the fallback
 * the cloning converter writes.
 */
$info_box_text_align = $attributes['style']['typography']['textAlign']
	?? ( $attributes['textAlign'] ?? '' );
if ( in_array( $info_box_text_align, array( 'left', 'center', 'right' ), true ) ) {
	$scoped_css[] = $root_sel . '{text-align:' . esc_attr( $info_box_text_align ) . '}';
}

// D744: Link colour — block-private replacement for the retired native
// Elements API (supports.color.link). Same descendant-link selector the
// native mechanism used (excludes `.wp-element-button` so a CTA rendered as
// a link-styled button keeps its own button colours), same base+hover shape
// as every other colour row on this block.
// FIXED 2026-09-04 — same defect as the text-colour block above: was
// sgs_text_decls()/sgs_emit_state_colour_css(), which always emits a bare
// `color:` even for a resolved gradient string (invalid CSS, dropped).
// sgs_text_colour_decl() is the correct primary primitive. $sgs_link_sel is a
// SINGLE selector (the :where() is one compound, not a list), so appending
// :hover to it below is safe.
$sgs_link_sel                  = $root_sel . ' a:where(:not(.wp-element-button))';
$sgs_info_link_normal_resolved = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['linkColour'] ?? '' ),
	(string) ( $attributes['linkColourGradient'] ?? '' )
);
$sgs_info_link_hover_resolved  = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['linkColourHover'] ?? '' ),
	(string) ( $attributes['linkColourHoverGradient'] ?? '' )
);
$sgs_info_link_normal_decl     = sgs_text_colour_decl( $sgs_info_link_normal_resolved );
$sgs_info_link_hover_decl      = sgs_text_colour_decl( $sgs_info_link_hover_resolved );
if ( '' !== $sgs_info_link_normal_decl || '' !== $sgs_info_link_hover_decl ) {
	$scoped_css[] = sgs_emit_state_colour_css(
		$sgs_link_sel,
		'' !== $sgs_info_link_normal_decl ? array( $sgs_info_link_normal_decl ) : array(),
		'' !== $sgs_info_link_hover_decl ? array( $sgs_info_link_hover_decl ) : array()
	);
}

// Companion rule — MANDATORY now that the link map carries gradient keys, and
// a harmless no-op for a flat colour. Enforced by
// scripts/check-text-gradient-companion.js (which checks a companion call is
// PRESENT, not that the primary emission is correct — see the fix note
// above for why that gap let this ship broken).

$sgs_info_link_grad_css = sgs_text_colour_gradient_fallback_rule( $sgs_link_sel, $sgs_info_link_normal_resolved );
if ( '' !== $sgs_info_link_grad_css ) {
	$scoped_css[] = $sgs_info_link_grad_css;
}
if ( '' !== $sgs_info_link_hover_resolved && $sgs_info_link_hover_resolved !== $sgs_info_link_normal_resolved ) {
	$sgs_info_link_grad_hover_css = sgs_hover_media_wrap(
		sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $sgs_link_sel . ':hover', $sgs_info_link_hover_resolved )
	) . sgs_text_colour_gradient_fallback_rule( $sgs_link_sel . ':focus-visible', $sgs_info_link_hover_resolved );
	if ( '' !== $sgs_info_link_grad_hover_css ) {
		$scoped_css[] = $sgs_info_link_grad_hover_css;
	}
}

// --- Border gradient, RESTING state (D636 border builder, base counterpart to
// the hover emission below) — masked ::before ring, emitted AFTER the base
// style-engine rule above so it wins the cascade over that rule's flat
// `border-color` (native style.border.color), same later-wins-in-source
// trick sgs/quote uses for its own base border-color/border-color-gradient
// pair. Width reads the native border width the style engine already
// resolved (style.border.width) so the ring matches whatever width the
// operator set in the native Border panel; '1px' is the fallback for "no
// width set" (matches the hover emission's own fallback below). ---
$sgs_border_width_native = isset( $style_border_args['width'] ) && is_string( $style_border_args['width'] )
	? sgs_css_length_value( $style_border_args['width'] )
	: '';

// --- Width (kept-scalar, base only) ---
if ( $sgs_content_width ) {
	$cw_safe = sgs_css_length_value( $sgs_content_width );
	if ( '' !== $cw_safe ) {
		$scoped_css[] = "{$root_sel}{width:{$cw_safe};}";
	}
}
if ( $sgs_max_width ) {
	$mw_safe = sgs_css_length_value( $sgs_max_width );
	if ( '' !== $mw_safe ) {
		$scoped_css[] = "{$root_sel}{max-width:{$mw_safe};margin-inline:auto;}";
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B/§B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );

$tablet_box_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_box_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_box_decls ) . ';}}';
}

$mobile_box_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_box_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_box_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_box_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_box_decls ) . ';}}';
}

// ---------------------------------------------------------------------------
// 9. Build the root element's classes + attributes. NO 'style' key carries a
// real CSS property — only `--var:value` custom-property VALUES (contract §A).
// ---------------------------------------------------------------------------

// Per-instance custom-property VALUES (transition timing, hover scale/shadow)
// → a scoped `.{uid}.sgs-info-box{…}` rule in the block's <style> (consolidated
// by the SGS CSS registry), NOT an inline `style="--var:…"` attribute. Spec 32
// FR-32-4 (as amended D345): nothing renders inline. Values pre-sanitised at
// source (sgs_colour_value / esc_attr / allowlists); the scoped channel is
// wp_strip_all_tags-guarded, not safecss-filtered.
if ( $sgs_wrapper_styles ) {
	$scoped_css[] = $root_sel . '{' . implode( ';', $sgs_wrapper_styles ) . '}';
}
if ( $sgs_hover_decls ) {
	$scoped_css[] = sgs_emit_state_colour_css( $root_sel, array(), $sgs_hover_decls );
}

// --- Border gradient, hover state (D636 border builder) — masked ::before,
// scoped to the ":hover" selector itself so it wins over the flat border-color
// decl above (emitted after it, same cascade-order trick as the flat rule). ---
if ( '' !== $sgs_hover_border_gradient ) {
	$scoped_css[] = sgs_hover_media_wrap(
		sgs_border_gradient_css( SGS_HOVER_NOT_TOUCH . " {$root_sel}:hover", $sgs_hover_border_gradient, null, '1px' )
	);
}

$root_attr_args = array(
	'class' => implode( ' ', $sgs_classes ),
);
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}

$sgs_wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is WP core InnerBlocks output.
$sgs_card_html = '';

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
		$scoped_css[] = $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$scoped_css[] = sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$scoped_css[] = $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
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
		$scoped_css[] = $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

if ( $scoped_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches SGS_Container_Wrapper
	// + sgs/quote + sgs/process-steps). Every value reaching $scoped_css is
	// pre-sanitised (sgs_css_length_value() / allowlists / wp_style_engine_get_styles /
	// sgs_colour_value), so no un-sanitised value survives to here.
	$sgs_card_html .= '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}
$sgs_card_html .= '<div ' . $sgs_wrapper_attrs . '>' . $content . '</div>';

// ---------------------------------------------------------------------------
// 10. Render. WS-4: CONTENT kind — width/spacing layers only (no bg/overlay/
// grid — the card's own background/border/shadow ride on the static
// sgs-info-box--{cardStyle} BEM classes in style.css).
// ---------------------------------------------------------------------------

// Block-link is handled universally by the sgsBlockLink extension
// (includes/hover-effects.php, render_block filter) — it injects a
// stretched-link overlay as this root's last child, so no per-block wrap
// belongs here.
echo $sgs_card_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from pre-sanitised/escaped parts above.
