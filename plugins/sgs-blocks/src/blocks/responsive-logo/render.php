<?php
/**
 * Server-side render for the SGS Responsive Logo block.
 *
 * The logo prints through `SGS_Media_Element::render()` for the `logo` slot (`logoSource` per device, `logoAlt`,
 * `logoDecorative`, loading from the priority resolver) and the dark variant through the `logoDark` slot. The block's own
 * switch mode and width (`logoSwitchMode`, `logoSwitchCustomPx`) choose which file each device shows
 * (`includes/helpers-logo-media.php::sgs_logo_switched_source`). When a `draw` layer on the wrapper names an SVG, an
 * inline SVG is desktop with static images for smaller breakpoints. A `lottie` layer on the wrapper plays over the
 * logo, which is its poster.
 *
 * With `inlineSvg` on and an SVG desktop logo, the logo's own file is printed
 * inline instead of the <img>, so its own animation plays and the block's custom
 * CSS reaches its parts; a compact logo, when set, still swaps in below 1024px.
 *
 * SVG SECURITY NOTE: the draw layer's `asset` and the inline logo are media
 * library attachment IDs. The .svg file is read from its local path and rebuilt
 * through sgs_svg_sanitise_document() (includes/helpers-svg-document.php, the
 * same sanitiser every upload passes) before inlining. Operators CANNOT paste
 * raw SVG markup into the block — the editor forces a media library upload.
 *
 * SGS-BEM naming:
 *   .sgs-responsive-logo              — root wrapper
 *   .sgs-responsive-logo__link        — home link (when linkToHome = true)
 *   .sgs-responsive-logo__picture     — the span holding the logo and its dark variant
 *   .sgs-responsive-logo__image (+ --desktop) — the renderer's outermost logo element
 *   .sgs-responsive-logo__dark        — the dark variant's outermost element
 *   .sgs-responsive-logo__svg         — inline SVG wrapper (draw layer or inlineSvg)
 *   .sgs-responsive-logo__svg--inline — the inlineSvg logo's wrapper (dark-logo swap, colour treatment)
 *   .sgs-responsive-logo__svg--swaps  — the inline SVG hides below 1024px for a compact logo
 *   .sgs-responsive-logo--animate-draw / --animate-hover / --animate-scroll
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// padding/margin are tier-object attrs {desktop,tablet,mobile}. Normalise
// them once, into fresh locals only -- never writing back into $attributes.
// sgs_responsive_normalise_object() lives in helpers-responsive.php, which
// this file's own render-helpers.php require below loads -- but these two
// calls run before that require executes. A block whose render.php is the
// first SGS block PHP to run in a request (e.g. the site-header navigation
// bar, present on every page) would otherwise fatal with "Call to undefined
// function". Requiring the defining file directly, here, removes the
// load-order dependency.
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
$sgs_tor_padding_tiers   = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers    = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


// This block calls sgs_responsive_css_rule() (below) and sgs_svg_kses_allowed_tags()
// (SVG animation path). Neither is autoloaded — the plugin bootstrap loads only
// includes/forms/field-render-helpers.php — so both resolve ONLY through
// render-helpers.php, which is the documented single entry point for every shared
// helper (see its own docblock).
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// Security sanitisers (no-inline contract) — mirrors sgs/label/render.php.
// ---------------------------------------------------------------------------

// ── Attribute extraction ──────────────────────────────────────────────────────

require_once dirname( __DIR__, 3 ) . '/includes/helpers-logo-media.php';

// Fill-width default: `width` carries no `default` in block.json, so `isset()` is a real "did the operator ever set
// this" check. $width_explicit drives the scoped `--logo-width` rule below (skipped when unset, letting style.scss's
// `var(--logo-width, 100%)` fill the column).
$width_explicit  = isset( $attributes['width'] );
$width           = $width_explicit ? absint( $attributes['width'] ) : 240;
$link_to_home    = isset( $attributes['linkToHome'] ) ? (bool) $attributes['linkToHome'] : true;
$alt             = isset( $attributes['logoAlt'] ) ? sanitize_text_field( $attributes['logoAlt'] ) : '';
$logo_decorative = ! empty( $attributes['logoDecorative'] );

// Background colour. Mirrors sgs/brand-strip's root background pair exactly: gradient (via
// background-image) wins over the flat colour when set+valid, base + hover.
$bg_colour                = isset( $attributes['backgroundColour'] ) ? (string) $attributes['backgroundColour'] : '';
$bg_colour_gradient       = isset( $attributes['backgroundColourGradient'] ) ? (string) $attributes['backgroundColourGradient'] : '';
$bg_colour_hover          = isset( $attributes['backgroundColourHover'] ) ? (string) $attributes['backgroundColourHover'] : '';
$bg_colour_hover_gradient = isset( $attributes['backgroundColourHoverGradient'] ) ? (string) $attributes['backgroundColourHoverGradient'] : '';

// A `draw` layer on the wrapper part supplies the SVG and the trigger (Spec 38A FR-38A-52); the motion renderer prints
// the draw attributes on the block, so the inline SVG span below adds none of its own.
require_once dirname( __DIR__, 3 ) . '/includes/motion/class-sgs-motion-draw-asset.php';
$draw_layer       = \SGS\Blocks\Motion\Sgs_Motion_Draw_Asset::find( $attributes['sgsMotion']['elements']['wrapper'] ?? null );
$svg_animation_id = null !== $draw_layer ? $draw_layer['asset'] : 0;
$inline_svg_on    = ! empty( $attributes['inlineSvg'] );

// ── Logo source ──────────────────────────────────────────────────────────────
// Logo resolution chain (FR-36-22), first non-empty wins: (1) this block's own `logoSource` desktop file; (2) Site Info
// `logo`; (3) WordPress core `custom_logo` theme mod; (4) nothing, so no logo element is rendered at all. Tiers 2 and 3
// are resolved together by Sgs_Site_Info_Logo::resolve_id(). Tablet and mobile files of the block stay its own.
$sgs_logo_stored    = is_array( $attributes['logoSource'] ?? null ) ? $attributes['logoSource'] : array();
$sgs_logo_from_site = false;
if ( null === sgs_logo_device_entry( $sgs_logo_stored, 'desktop' ) ) {
	require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-site-info-logo.php';
	$sgs_site_logo_id = \SGS\Blocks\Sgs_Site_Info_Logo::resolve_id();
	if ( $sgs_site_logo_id <= 0 ) {
		return;
	}
	$sgs_logo_stored['desktop'] = array(
		'kind' => 'image',
		'id'   => $sgs_site_logo_id,
	);
	$sgs_logo_from_site         = true;
}
$desktop_entry   = sgs_logo_device_entry( $sgs_logo_stored, 'desktop' );
$desktop_logo_id = absint( $desktop_entry['id'] ?? 0 );
$desktop_url     = sgs_logo_entry_url( $desktop_entry );
$compact_entry   = sgs_logo_device_entry( $sgs_logo_stored, 'mobile' ) ?? sgs_logo_device_entry( $sgs_logo_stored, 'tablet' );
$compact_url     = sgs_logo_entry_url( $compact_entry );
$switch_mode     = isset( $attributes['logoSwitchMode'] ) ? sanitize_key( $attributes['logoSwitchMode'] ) : 'mobile';
$sgs_logo_switch = sgs_logo_switched_source( $sgs_logo_stored, $switch_mode, absint( $attributes['logoSwitchCustomPx'] ?? 1024 ) );

// Dark-mode logo variant (U-17, design §3.1).
$dark_entry    = sgs_logo_device_entry( $attributes['logoDarkSource'] ?? null, 'desktop' );
$dark_logo_url = sgs_logo_entry_url( $dark_entry );

// Functional default alt (FR-36-22 basics): never the literal "logo" (it tells a screen-reader user WHAT the graphic
// is, not what it DOES). Falls back to "[Business] home" so the alt communicates destination intent; an
// operator-authored value always wins. A logo taken from the site-level tiers falls back to its own media-library alt
// text first.
if ( '' === $alt && $sgs_logo_from_site ) {
	$alt = sanitize_text_field( (string) get_post_meta( $desktop_logo_id, '_wp_attachment_image_alt', true ) );
}
if ( '' === $alt ) {
	$alt = sprintf(
		/* translators: %s: business/site name. */
		__( '%s home', 'sgs-blocks' ),
		get_bloginfo( 'name' )
	);
}

// Decorative override (WCAG 2.1 AA 1.1.1): blanks the alt and hides the logo from assistive tech. Safe on THIS block
// even when linked: the wrapping <a>'s accessible name comes from $link_aria_label below, not from the image alt.
$img_alt = $logo_decorative ? '' : $alt;

// The wrapping <a>'s accessible name is driven DISTINCTLY from the <img alt>
// (FR-36-22): the image alt describes WHAT the graphic depicts, the link's
// aria-label describes WHERE it goes. Reusing one string for both risks a
// duplicated/confusing screen-reader announcement on the linked logo.
$link_aria_label = sprintf(
	/* translators: %s: business/site name. */
	__( 'Go to %s homepage', 'sgs-blocks' ),
	get_bloginfo( 'name' )
);

// --- S10 shared stretched link: the WHOLE logo block becomes the home link,
// not just the logo image. The mechanism is the `blockLink` extension's
// overlay anchor (`SGS\Blocks\insert_block_link_overlay`); this block just
// hands it the destination it already knows, so the operator gets a toggle
// instead of a URL field. `linkToHome` stays the master switch: with it off
// the logo is not a link at all, whatever the toggle says.
//
// The handover returning true means the overlay now owns the block's single
// tab stop, so the inner <a class="sgs-responsive-logo__link"> is NOT printed
// — two anchors to the same destination would be two keyboard stops for one
// action. The overlay carries the same accessible name.
// Hand the home URL to the block-link extension. Called for its SIDE EFFECT:
// it writes the URL into `$block->parsed_block['attrs']`, which is the copy
// the `render_block` filter sees — render.php's own `$attributes` is a copy
// that filter never reads. The return value is not needed, because the real
// logo link is printed either way.
if ( $link_to_home ) {
	sgs_stretched_link_handover( $block, $attributes, home_url( '/' ), $link_aria_label );
}

// The real logo link is ALWAYS printed when the block links home. It is what
// the block-link extension lends the stretched surface to, so the link's
// accessible name comes from the logo's own content rather than an
// operator-typed label on an empty anchor
// (`SGS\Blocks\insert_block_link_overlay`).
$print_inner_link = $link_to_home;

// ── Animation modifier class ──────────────────────────────────────────────────

$animation_modifier = '';
if ( null !== $draw_layer ) {
	$animation_modifier = ' sgs-responsive-logo--animate-' . array(
		'load'   => 'draw',
		'hover'  => 'hover',
		'scroll' => 'scroll',
	)[ $draw_layer['trigger'] ];
}

// ── No-inline scoped box CSS (padding/margin, base + tablet/mobile tiers) ────
// uid is a CLASS (matches sgs/heading/sgs/container/sgs/label scoped pattern).
// The root carries NO inline declaration at all: `--logo-width` lives in the
// scoped uid-class rule below (see the emit a few lines down, and the
// note near the end of this file).

$uid = 'sgs-rl-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sel = '.' . $uid . '.wp-block-sgs-responsive-logo';

$scoped_css = array();

// --- Logo width custom property (inline `--var` is forbidden, no
// exception for custom-property values). Lives in the same scoped uid-class
// rule as every other declaration on this block. Emitted ONLY when the
// operator has explicitly set a width — an untouched instance emits nothing
// here, so style.scss's `var(--logo-width, 100%)` fallback fills the
// containing column/element instead of a hardcoded pixel value. ---
if ( $width_explicit ) {
	$scoped_css[] = $sel . '{--logo-width:' . absint( $width ) . 'px}';
}

// --- Shrink-with-header/row (proven gap, 2026-09-24): headerShrink
// (`sgs/site-header`) and rowShrink (`sgs/site-header-row`) both toggle a
// state class on THEIR OWN root element and reduce only their padding --
// neither reaches this block's `--logo-width` custom property, so a logo
// nested inside a shrinking header currently stays its resting size while the
// header/row shrinks around it (verified against the SGS-BEM draft, which
// hand-scripts the logo's own width/height on the same scroll state). This
// setting closes that gap generically: it targets BOTH ancestor state classes
// -- the logo does not know (and must not need to know) which one shrunk it,
// so a logo not nested inside either simply never matches and emits nothing
// extra (any-client test; FP-9, no per-block carve-out). Height is
// deliberately NOT a separate attribute: style.scss's `&__image--desktop`
// already sets `height:auto`, so overriding only `--logo-width` scales the
// shrunk logo at its own natural aspect ratio for ANY uploaded artwork,
// rather than the draft's hand-picked width/height pair which only fits its
// own logo. Off by default -- no `shrinkWidth` key emits nothing at all,
// byte-identical to a header that has never heard of this attribute.
//
// `shrinkWidth` holds one CSS length per device (px, %, em, rem, calc() ...),
// each read through sgs_css_length_value() and printed by the shared
// responsive emitter: the desktop value in the base rule, tablet and mobile in
// media queries only where they differ.
$shrink_width_css = sgs_emit_responsive_css(
	'.is-header-shrunk ' . $sel . ',.is-row-shrunk ' . $sel,
	array(
		array(
			'value' => $attributes['shrinkWidth'] ?? null,
			'css'   => '--logo-width',
		),
	)
);
if ( '' !== $shrink_width_css ) {
	$scoped_css[] = $shrink_width_css;
	// The transition lives on the wrapper's own `width` property (which reads
	// `--logo-width`, style.scss), not on the custom property itself -- custom
	// properties are not natively animatable, but a `width` declaration that
	// RESOLVES via var() still transitions smoothly when the variable's value
	// changes, so no `@property` registration is needed.
	// Timed by the shrinking row when it publishes its own speed and curve
	// (--sgs-row-shrink-*, sgs_row_shrink_settings_css()), so logo and row move as one.
	$scoped_css[] = $sel . '{transition:width var(--sgs-row-shrink-duration, 300ms) var(--sgs-row-shrink-easing, ease);}';
	// Self-contained prefers-reduced-motion reset (mirrors sgs/site-header's
	// own instance-scoped reset, render.php) -- this is per-instance CSS, so
	// the shared stylesheet has no equivalent rule to fall back on.
	$scoped_css[] = '@media (prefers-reduced-motion: reduce) {' . $sel . '{transition:none !important;}}';
}

// --- Border (width, style, colour flat or gradient, base and hover, radius at
// three tiers) through the shared assembler. The base rule prints before the
// tier rules so a tablet or mobile radius (same specificity) wins inside its
// media query. ---
$border = sgs_border_element_decls(
	$attributes,
	'',
	$sel,
	array(
		'colour' => array(
			'base'           => 'borderColour',
			'hover'          => 'borderColourHover',
			'gradient'       => 'borderColourGradient',
			'hover_gradient' => 'borderColourHoverGradient',
		),
	)
);
if ( $border['base'] ) {
	$scoped_css[] = $sel . '{' . implode( ';', $border['base'] ) . ';}';
}
$scoped_css = array_merge( $scoped_css, $border['rules'] );
if ( $border['hover'] ) {
	$scoped_css[] = sgs_hover_state_rules( $sel, implode( ';', $border['hover'] ), ':focus-within' );
}
if ( $border['tablet'] ) {
	$scoped_css[] = sgs_emit_tier_decls( $sel, array( 'tablet' => $border['tablet'] ) );
}
if ( $border['mobile'] ) {
	$scoped_css[] = sgs_emit_tier_decls( $sel, array( 'mobile' => $border['mobile'] ) );
}

// --- Background colour — gradient wins over flat
// colour when set+valid (sgs_background_paint_decl()), base + hover on the
// same wrapper selector. Mirrors sgs/brand-strip's root background pair. ---
$bg_decl = sgs_background_paint_decl( $bg_colour, $bg_colour_gradient );
if ( '' !== $bg_decl ) {
	$scoped_css[] = "{$sel}{" . $bg_decl . ';}';
}
$bg_hover_decl = sgs_background_paint_decl( $bg_colour_hover, $bg_colour_hover_gradient );
if ( '' !== $bg_hover_decl ) {
	$scoped_css[] = sgs_hover_state_rules( $sel, $bg_hover_decl, ':focus-within' );
}

// --- Colour treatment — forces the IMAGE (not the wrapper background above)
// to pure white, for a full-colour logo dropped onto a dark surface (e.g.
// inside sgs/site-footer). Targets every <img> the block can render (desktop/
// tablet/mobile picture sources all share this class name). 'white' is an
// unconditional operator choice, emitted here as instance CSS. 'auto' instead
// applies only where the logo actually sits on a dark ground — that check
// depends on ANCESTOR classes (static section tone, live header scroll state)
// this render pass cannot see, so it is a class flag only; style.scss carries
// the ground-conditional rules (§4.5 "The logo responds to its ground"). ---
$colour_treatment = isset( $attributes['colourTreatment'] ) ? (string) $attributes['colourTreatment'] : '';
if ( ! in_array( $colour_treatment, array( '', 'white', 'auto' ), true ) ) {
	$colour_treatment = '';
}
if ( 'white' === $colour_treatment ) {
	$scoped_css[] = "{$sel} img,{$sel} .sgs-responsive-logo__svg--inline svg{filter:brightness(0) invert(1);}";
}
$colour_auto_modifier = 'auto' === $colour_treatment ? ' sgs-responsive-logo--colour-auto' : '';

// --- Ground-response modifier classes (U-13 §4.5) — style.scss reads these
// alongside the ancestor tone/header-state classes it already targets for the
// dark-mode logo variant; see the "Ground response" section there. ---
$has_dark_logo_modifier = '' !== $dark_logo_url ? ' sgs-responsive-logo--has-dark-logo' : '';

// --- Left placement (FR-36-22 basics) — NN/g: a left-aligned logo returns visitors
// home 6x more reliably than other placements. The block adds NO alignment margin:
// its parent places it (start alignment in a flex or grid row, text-align in block
// flow). An auto margin here would take the row's free space before its own
// `justify-content` runs and override a row the operator spread or centred. ---

// --- Per-tier max box (FR-36-22 basics) — caps the rendered logo box on top
// of the `width` custom property, independently per breakpoint. Unset tiers
// emit nothing (no cap at that tier). ---
// `maxWidth` and `maxHeight` each hold one CSS length per device; the shared
// emitter prints desktop in the base rule and tablet and mobile in media
// queries only where they differ.
$rl_max_width_tiers  = sgs_responsive_normalise_object( $attributes['maxWidth'] ?? null );
$rl_max_height_tiers = sgs_responsive_normalise_object( $attributes['maxHeight'] ?? null );

$scoped_css[] = sgs_emit_responsive_css(
	$sel,
	array(
		array(
			'value'        => $attributes['maxWidth'] ?? null,
			'css'          => 'max-width',
			'unit_default' => 'px',
		),
	)
);

// --- Maximum height caps the logo IMAGE (every media element the renderer prints: light, compact and dark), not the root: the image keeps its aspect ratio
// (`width:auto`), so its width follows from the capped height, and the root
// drops its fill-width default (`width:auto`) so the block box shrinks to the
// image instead of filling its container. Both `width:auto` rules start at the
// largest tier that sets a cap, the tier the cap itself cascades down from, so
// an uncapped larger tier stays width-driven. With no tier set nothing is
// emitted and the logo stays width-driven. ---
$rl_max_height_valid = array();
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $rl_max_height_tier ) {
	$rl_max_height_valid[ $rl_max_height_tier ] = sgs_css_length_value( $rl_max_height_tiers[ $rl_max_height_tier ] ?? '' );
}
$rl_has_max_height = '' !== $rl_max_height_valid['desktop']
	|| '' !== $rl_max_height_valid['tablet']
	|| '' !== $rl_max_height_valid['mobile'];
if ( $rl_has_max_height ) {
	$rl_capped_at  = '' !== $rl_max_height_valid['desktop'] ? 'desktop' : ( '' !== $rl_max_height_valid['tablet'] ? 'tablet' : 'mobile' );
	$rl_auto_tiers = array(
		'rlAuto'       => 'desktop' === $rl_capped_at ? 'auto' : '',
		'rlAutoTablet' => 'tablet' === $rl_capped_at ? 'auto' : '',
		'rlAutoMobile' => 'mobile' === $rl_capped_at ? 'auto' : '',
	);
	$rl_auto_width = array(
		array(
			'attr'        => 'rlAuto',
			'css'         => 'width',
			'tablet_attr' => 'rlAutoTablet',
			'mobile_attr' => 'rlAutoMobile',
			'transform'   => static function () {
				return 'auto';
			},
		),
	);
	$scoped_css[]  = sgs_responsive_css_rule( $rl_auto_tiers, $rl_auto_width, $sel . ',' . $sel . ' .sgs-media-el,' . $sel . ' .sgs-responsive-logo__svg svg' );
	$scoped_css[]  = sgs_emit_responsive_css(
		$sel . ' .sgs-media-el,' . $sel . ' .sgs-responsive-logo__svg svg',
		array(
			array(
				'value'        => $attributes['maxHeight'] ?? null,
				'css'          => 'max-height',
				'unit_default' => 'px',
			),
		)
	);
}

// --- Base padding/margin — the desktop tier of the block-owned padding/margin
// objects, emitted scoped via the stable core style engine. ---

$base_padding_obj = ( ! empty( $sgs_tor_padding_desktop ) )
	? $sgs_tor_padding_desktop
	: array();
$base_margin_obj  = ( ! empty( $sgs_tor_margin_desktop ) )
	? $sgs_tor_margin_desktop
	: array();

if ( ! empty( $base_padding_obj ) || ! empty( $base_margin_obj ) ) {
	$spacing_args = array();
	if ( ! empty( $base_padding_obj ) ) {
		$spacing_args['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$spacing_args['margin'] = $base_margin_obj;
	}
	$base_scoped_styles = wp_style_engine_get_styles(
		array( 'spacing' => $spacing_args ),
		array( 'selector' => $sel )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// --- Responsive padding/margin tiers — SGS custom object attrs, longhands for
// the set sides and corners only, scoped @media on the SAME selector (tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

$padding_tab_val = sgs_box_object_longhands( $padding_tablet_obj, 'padding' );
$padding_mob_val = sgs_box_object_longhands( $padding_mobile_obj, 'padding' );
$margin_tab_val  = sgs_box_object_longhands( $margin_tablet_obj, 'margin' );
$margin_mob_val  = sgs_box_object_longhands( $margin_mobile_obj, 'margin' );

$tablet_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_decls[] = "{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_decls[] = "{$margin_tab_val}";
}
if ( $tablet_decls ) {
	$scoped_css[] = sgs_emit_tier_decls( $sel, array( 'tablet' => $tablet_decls ) );
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "{$margin_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = sgs_emit_tier_decls( $sel, array( 'mobile' => $mobile_decls ) );
}

// ── Wrapper attributes via get_block_wrapper_attributes() ────────────────────
// No `style` key (inline `--var` custom properties are forbidden, no
// exception). `--logo-width` lives in the scoped uid-class rule above.

$sgs_rl_wrapper_args = array(
	'class' => 'sgs-responsive-logo' . $animation_modifier . $has_dark_logo_modifier . $colour_auto_modifier . ' ' . $uid,
);
// The inline logo's named parts animate from a data document read by src/shared/svg-parts/svg-parts.js.
if ( $inline_svg_on && $desktop_logo_id > 0 ) {
	require_once dirname( __DIR__, 3 ) . '/includes/helpers-svg-parts.php';
	$sgs_rl_parts_data = sgs_svg_parts_data(
		$attributes['svgParts'] ?? array(),
		(string) ( $attributes['svgPartsTrigger'] ?? 'visible' ),
		$attributes['svgPartsHoverCooldown'] ?? 1400
	);
	if ( '' !== $sgs_rl_parts_data ) {
		$sgs_rl_wrapper_args['data-sgs-svg-parts'] = $sgs_rl_parts_data;
	}
}
$wrapper_attributes = get_block_wrapper_attributes( $sgs_rl_wrapper_args );

// ── SVG inline render (draw layer, or the inlineSvg setting) ─────────────────

// Both inline SVGs (the draw layer's and the inline logo) have their ids, keyframes and <style> rules scoped to this
// instance (a unique root id), so the file's CSS never reaches the rest of the page and two logos never share an id.
require_once dirname( __DIR__, 3 ) . '/includes/helpers-svg-inline-attachment.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-svg-instance-scope.php';
$svg_html          = '';
$has_svg_animation = $svg_animation_id > 0;
if ( $has_svg_animation ) {
	$svg_html = sgs_svg_scope_instance( sgs_svg_inline_attachment( $svg_animation_id ), wp_unique_id( 'sgs-logo-svg-' ) );
}

// The inline logo carries the logo's accessible name as the <img> would (role="img" + aria-label), or is hidden
// from assistive tech when the logo is decorative.
$inline_logo_html = '';
if ( ! $has_svg_animation && $inline_svg_on && $desktop_logo_id > 0 ) {
	$inline_logo_html = sgs_svg_inline_root_attributes(
		sgs_svg_scope_instance( sgs_svg_inline_attachment( $desktop_logo_id ), wp_unique_id( 'sgs-logo-svg-' ) ),
		$logo_decorative
			? array(
				'aria-hidden' => 'true',
				'focusable'   => 'false',
			)
			: array(
				'role'       => 'img',
				'aria-label' => $img_alt,
				'focusable'  => 'false',
			)
	);
}

// ── Logo media: the light logo (every device) and the dark variant, both through the shared renderer ──────────────

$sgs_rl_slot   = sgs_logo_media_slot( $block, 'logo' );
$sgs_rl_attrs  = array(
	'logoSource'     => $sgs_logo_switch['source'],
	'logoAlt'        => $alt,
	'logoDecorative' => $logo_decorative,
	'logoLoading'    => is_string( $attributes['logoLoading'] ?? null ) ? $attributes['logoLoading'] : '',
);
$sgs_rl_main   = array(
	'html' => '',
	'css'  => '',
);
$sgs_rl_compat = array(
	'html' => '',
	'css'  => '',
);
$sgs_rl_swaps  = '' !== $compact_url;
if ( $has_svg_animation ) {
	// Animation mode: the inline SVG is desktop; the static files show at tablet and below (a hidden fallback above).
	$sgs_rl_compat = sgs_logo_render(
		$sgs_rl_slot,
		$sgs_rl_attrs,
		$uid . '-f',
		'sgs/responsive-logo',
		array(
			'extra_class'    => 'sgs-responsive-logo__image sgs-responsive-logo__image--desktop',
			'device_queries' => $sgs_logo_switch['queries'],
		)
	);
} elseif ( '' !== $inline_logo_html ) {
	// Inline logo: the SVG file itself at every width; a compact logo swaps in below 1024px.
	if ( $sgs_rl_swaps ) {
		$sgs_rl_compat = sgs_logo_render(
			$sgs_rl_slot,
			array_merge( $sgs_rl_attrs, array( 'logoSource' => array( 'desktop' => $compact_entry ) ) ),
			$uid . '-f',
			'sgs/responsive-logo',
			array(
				'extra_class' => 'sgs-responsive-logo__image sgs-responsive-logo__image--desktop',
			)
		);
	}
} else {
	$sgs_rl_main = sgs_logo_render(
		$sgs_rl_slot,
		$sgs_rl_attrs,
		$uid . '-l',
		'sgs/responsive-logo',
		array(
			'extra_class'    => 'sgs-responsive-logo__image sgs-responsive-logo__image--desktop',
			'device_queries' => $sgs_logo_switch['queries'],
		)
	);
	if ( '' === $sgs_rl_main['html'] ) {
		return;
	}
}
$sgs_rl_dark = array(
	'html' => '',
	'css'  => '',
);
if ( '' !== $dark_logo_url ) {
	// Hidden by default; shown (and the light logo hidden) per the ground rules in style.scss. It sits over the light
	// logo's box, so it takes that box's size and reserves none of its own.
	$sgs_rl_dark = sgs_logo_render(
		sgs_logo_media_slot( $block, 'logoDark' ),
		array( 'logoDarkSource' => array( 'desktop' => $dark_entry ) ),
		$uid . '-d',
		'sgs/responsive-logo',
		array(
			'extra_class' => 'sgs-responsive-logo__dark',
			'hidden'      => true,
		)
	);
}
$scoped_css[] = $sgs_rl_main['css'] . $sgs_rl_compat['css'] . $sgs_rl_dark['css'];

// ── Build inner markup ────────────────────────────────────────────────────────

ob_start();

if ( $print_inner_link ) {
	printf(
		'<a class="sgs-responsive-logo__link" href="%s" rel="home" aria-label="%s">',
		esc_url( home_url( '/' ) ),
		esc_attr( $link_aria_label )
	);
}

if ( $has_svg_animation && $svg_html ) {
	// The draw layer's attributes sit on the block root (the motion renderer prints them), and `fx-draw.js` searches
	// that element's descendants for drawable shapes, so this wrapper span only holds the sanitised SVG.
	echo '<span class="sgs-responsive-logo__svg" aria-hidden="true">';
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rebuilt through sgs_svg_sanitise_document().
	echo $svg_html;
	echo '</span>';
	echo '<span class="sgs-responsive-logo__picture sgs-responsive-logo__picture--fallback">' . $sgs_rl_compat['html'] . '</span>' . $sgs_rl_dark['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the media renderer escapes its own output.
} elseif ( '' !== $inline_logo_html ) {
	printf( '<span class="sgs-responsive-logo__svg sgs-responsive-logo__svg--inline%s">', $sgs_rl_swaps ? ' sgs-responsive-logo__svg--swaps' : '' );
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rebuilt through sgs_svg_sanitise_document(); added attributes escaped by sgs_svg_inline_root_attributes().
	echo $inline_logo_html;
	echo '</span>';
	if ( $sgs_rl_swaps ) {
		echo '<span class="sgs-responsive-logo__picture sgs-responsive-logo__picture--fallback">' . $sgs_rl_compat['html'] . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the media renderer escapes its own output.
	}
	echo $sgs_rl_dark['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the media renderer escapes its own output.
} else {
	echo '<span class="sgs-responsive-logo__picture">' . $sgs_rl_main['html'] . $sgs_rl_dark['html'] . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the media renderer escapes its own output.
}

if ( $print_inner_link ) {
	echo '</a>';
}

$inner_html = ob_get_clean();

// ── Scoped CSS output (no-inline contract) ────────────────────────────────
// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving CSS
// combinators intact. Every value reaching $scoped_css is pre-sanitised
// (sgs_css_length_value() / wp_style_engine_get_styles), so no un-sanitised value
// survives here.

$scoped_css = array_filter( $scoped_css, 'strlen' );
if ( $scoped_css ) :
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
	<?php
endif;

// ── Final output ──────────────────────────────────────────────────────────────

printf(
	'<div %1$s>%2$s</div>',
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by get_block_wrapper_attributes().
	$inner_html           // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- all child elements escaped above.
);
