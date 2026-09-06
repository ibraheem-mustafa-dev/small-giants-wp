<?php
/**
 * Server-side render for the SGS Responsive Logo block.
 *
 * Outputs a <picture> element with up to three logo slots (desktop / tablet /
 * mobile) or, when svgAnimationSource is set, an inline SVG for desktop with
 * static images for smaller breakpoints.
 *
 * SVG SECURITY NOTE: svgAnimationSource is a media library attachment ID.
 * The .svg file is fetched via get_attached_file() (a local disk path) and
 * sanitised with wp_kses() before inlining. Operators CANNOT paste raw SVG
 * markup into the block — the editor forces a media library upload.
 *
 * SGS-BEM naming:
 *   .sgs-responsive-logo              — root wrapper
 *   .sgs-responsive-logo__link        — home link (when linkToHome = true)
 *   .sgs-responsive-logo__picture     — <picture> element
 *   .sgs-responsive-logo__image--desktop / --tablet / --mobile — img elements
 *   .sgs-responsive-logo__svg         — inline SVG wrapper (animation mode)
 *   .sgs-responsive-logo--animate-draw / --animate-hover / --animate-scroll
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;



// This block calls sgs_responsive_css_rule() (below) and sgs_svg_kses_allowed_tags()
// (SVG animation path). Neither is autoloaded — the plugin bootstrap loads only
// includes/forms/field-render-helpers.php — so both resolve ONLY through
// render-helpers.php, which is the documented single entry point for every shared
// helper (see its own docblock).
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
// Security sanitisers (no-inline contract §D) — mirrors sgs/label/render.php.
// ---------------------------------------------------------------------------

// ── Attribute extraction ──────────────────────────────────────────────────────

$desktop_logo_id  = isset( $attributes['logoId'] ) ? absint( $attributes['logoId'] ) : 0;
$tablet_logo_id   = isset( $attributes['logoIdTablet'] ) ? absint( $attributes['logoIdTablet'] ) : 0;
$mobile_logo_id   = isset( $attributes['logoIdMobile'] ) ? absint( $attributes['logoIdMobile'] ) : 0;
$svg_animation_id = isset( $attributes['svgAnimationSource'] ) ? absint( $attributes['svgAnimationSource'] ) : 0;
$animation_style  = isset( $attributes['animationStyle'] ) ? sanitize_key( $attributes['animationStyle'] ) : 'none';
$width            = isset( $attributes['width'] ) ? absint( $attributes['width'] ) : 240;
$link_to_home     = isset( $attributes['linkToHome'] ) ? (bool) $attributes['linkToHome'] : true;
$alt              = isset( $attributes['alt'] ) ? sanitize_text_field( $attributes['alt'] ) : '';
$align            = isset( $attributes['align'] ) ? sanitize_key( $attributes['align'] ) : 'left';
$logo_decorative  = ! empty( $attributes['logoDecorative'] );

// Border (Block Customisation Standard — wrapper-level border control).
// Box-object interface contract §1/§2: borderWidth is an SGS custom OBJECT
// attr { top, right, bottom, left }, no tiers.
$border_style_raw = isset( $attributes['borderStyle'] ) ? sgs_css_keyword_sanitise( $attributes['borderStyle'] ) : 'solid';
$border_width_obj = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_rgt = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bot = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_lft = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width = ( '' !== $border_width_top || '' !== $border_width_rgt || '' !== $border_width_bot || '' !== $border_width_lft );

// Validate animationStyle against allowed values.
$allowed_animation_styles = array( 'none', 'draw-on-load', 'hover-redraw', 'scroll-trigger' );
if ( ! in_array( $animation_style, $allowed_animation_styles, true ) ) {
	$animation_style = 'none';
}

// ── Early exit: nothing to render ────────────────────────────────────────────

// ── Resolve image URLs ────────────────────────────────────────────────────────
// When no desktop logo is set on the block, fall back to the WP site's default
// custom logo (Appearance → Customise → Site Identity → Logo). Operators who
// upload a single logo via the Customiser get all three breakpoints pointing
// at it automatically. Per Bean's directive 2026-05-20.

// ID-wins-URL-fallback (2026-08-05) — the same resolution order every other SGS
// image block uses (`media/render.php:467`: "imageId wins; fall back to
// imageUrl"). The attachment ID stays authoritative because it resolves to the
// CURRENT file if the media item is replaced, while the stored URL survives when
// the ID is absent — which is the case for a cloned block, where the draft gave
// a `<img src>` and no library item exists yet.
//
// That fallback is the whole point of the change: it gives `alt` a
// `attr_type='string'` sibling to name as its `alt_companion_attr`, which is what
// `walk.py:295` requires before it will capture alt text at all. Three bare
// attachment IDs could never satisfy it.
$sgs_logo_url_attr = static function ( $key ) use ( $attributes ): string {
	return isset( $attributes[ $key ] ) ? esc_url_raw( (string) $attributes[ $key ] ) : '';
};

$desktop_logo_url_attr = $sgs_logo_url_attr( 'logoUrl' );
$tablet_logo_url_attr  = $sgs_logo_url_attr( 'logoUrlTablet' );
$mobile_logo_url_attr  = $sgs_logo_url_attr( 'logoUrlMobile' );

if ( 0 === $desktop_logo_id && '' === $desktop_logo_url_attr ) {
	$sgs_site_logo_id = (int) get_theme_mod( 'custom_logo', 0 );
	if ( $sgs_site_logo_id > 0 ) {
		$desktop_logo_id = $sgs_site_logo_id;
	} else {
		return;
	}
}

$desktop_url = $desktop_logo_id > 0 ? wp_get_attachment_url( $desktop_logo_id ) : '';
if ( ! $desktop_url ) {
	$desktop_url = $desktop_logo_url_attr;
}
if ( ! $desktop_url ) {
	return;
}
$desktop_url = (string) $desktop_url;

$tablet_url = $tablet_logo_id > 0 ? (string) wp_get_attachment_url( $tablet_logo_id ) : '';
if ( '' === $tablet_url ) {
	$tablet_url = $tablet_logo_url_attr;
}
$mobile_url = $mobile_logo_id > 0 ? (string) wp_get_attachment_url( $mobile_logo_id ) : '';
if ( '' === $mobile_url ) {
	$mobile_url = $mobile_logo_url_attr;
}

// Fall back to desktop when optional slots are empty.
$effective_tablet_url = $tablet_url ? $tablet_url : $desktop_url;
$effective_mobile_url = $mobile_url ? $mobile_url : $desktop_url;

// Functional default alt (FR-36-22 basics) — never the literal "logo" (an
// a11y anti-pattern: it tells a screen-reader user WHAT the graphic is, not
// what it DOES). Falls back to "[Business] home" so the alt communicates
// destination intent; an operator-authored value always wins.
if ( '' === $alt ) {
	$alt = sprintf(
		/* translators: %s: business/site name. */
		__( '%s home', 'sgs-blocks' ),
		get_bloginfo( 'name' )
	);
}

// Decorative override (WCAG 2.1 AA 1.1.1, FR-detector-18) — blanks the alt and
// hides the <img> from assistive tech. Safe on THIS block even when linked:
// the wrapping <a>'s accessible name comes from $link_aria_label below (set
// independently of the image), not from the <img alt>, so a linked-home logo
// keeps its "Go to [Site] homepage" announcement either way. Never strips the
// link itself — that stays an operator decision (linkToHome).
$img_alt         = $logo_decorative ? '' : $alt;
$img_aria_hidden = $logo_decorative ? ' aria-hidden="true"' : '';

// The wrapping <a>'s accessible name is driven DISTINCTLY from the <img alt>
// (FR-36-22): the image alt describes WHAT the graphic depicts, the link's
// aria-label describes WHERE it goes. Reusing one string for both risks a
// duplicated/confusing screen-reader announcement on the linked logo.
$link_aria_label = sprintf(
	/* translators: %s: business/site name. */
	__( 'Go to %s homepage', 'sgs-blocks' ),
	get_bloginfo( 'name' )
);

// ── Animation modifier class ──────────────────────────────────────────────────

$animation_modifier = '';
if ( 'draw-on-load' === $animation_style ) {
	$animation_modifier = ' sgs-responsive-logo--animate-draw';
} elseif ( 'hover-redraw' === $animation_style ) {
	$animation_modifier = ' sgs-responsive-logo--animate-hover';
} elseif ( 'scroll-trigger' === $animation_style ) {
	$animation_modifier = ' sgs-responsive-logo--animate-scroll';
}

// ── No-inline scoped box CSS (padding/margin, base + tablet/mobile tiers) ────
// uid is a CLASS (matches sgs/heading/sgs/container/sgs/label scoped pattern).
// The root carries NO inline declaration at all: `--logo-width` moved into the
// scoped uid-class rule below at D345 (see the emit a few lines down, and the
// note near the end of this file).

$uid = 'sgs-rl-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sel = '.' . $uid . '.wp-block-sgs-responsive-logo';

$scoped_css = array();

// --- Logo width custom property (D345: inline `--var` is forbidden, no
// exception for custom-property values). Lives in the same scoped uid-class
// rule as every other declaration on this block. ---
$scoped_css[] = $sel . '{--logo-width:' . absint( $width ) . 'px}';

// --- Border — width/style on the wrapper, colour (flat or gradient, base +
// hover) via the shared sgs_border_states_css() helper, radius via the
// shared sgs_border_radius_tiers() + core style engine (base) plus
// hand-built shorthand tiers (tablet/mobile). Mirrors sgs/button + sgs/quote. ---
$border_base_decls = array();
if ( $has_border_width ) {
	$bwt                 = '' !== $border_width_top ? $border_width_top : '0';
	$bwr                 = '' !== $border_width_rgt ? $border_width_rgt : '0';
	$bwb                 = '' !== $border_width_bot ? $border_width_bot : '0';
	$bwl                 = '' !== $border_width_lft ? $border_width_lft : '0';
	$border_base_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	if ( $border_style_raw && 'solid' !== $border_style_raw ) {
		$border_base_decls[] = 'border-style:' . $border_style_raw;
	}
}
if ( $border_base_decls ) {
	$scoped_css[] = "{$sel}{" . implode( ';', $border_base_decls ) . ';}';
}

$border_colour_css = sgs_border_states_css(
	$sel,
	$attributes,
	array(
		'base'           => 'borderColour',
		'hover'          => 'borderColourHover',
		'gradient'       => 'borderColourGradient',
		'hover_gradient' => 'borderColourHoverGradient',
		'width'          => $has_border_width && '' !== $border_width_top ? $border_width_top : '1px',
	)
);
if ( '' !== $border_colour_css ) {
	$scoped_css[] = $border_colour_css;
}

$border_radius_tiers      = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_base       = $border_radius_tiers['base'];
$border_radius_tablet_obj = $border_radius_tiers['tablet'];
$border_radius_mobile_obj = $border_radius_tiers['mobile'];
if ( null !== $border_radius_base ) {
	$border_radius_scoped = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_base ) ),
		array( 'selector' => $sel )
	);
	if ( ! empty( $border_radius_scoped['css'] ) ) {
		$scoped_css[] = $border_radius_scoped['css'];
	}
}
$border_radius_tab_val = sgs_corner_object_shorthand( $border_radius_tablet_obj );
$border_radius_mob_val = sgs_corner_object_shorthand( $border_radius_mobile_obj );
if ( null !== $border_radius_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$sel}{border-radius:{$border_radius_tab_val};}}";
}
if ( null !== $border_radius_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$sel}{border-radius:{$border_radius_mob_val};}}";
}

// --- Explicit left-alignment default (FR-36-22 basics) — NN/g: a left-aligned
// logo returns visitors home 6x more reliably than other placements. Only
// applied for the 'left' choice (the block's default) so an operator's
// explicit centre/right/wide alignment is left untouched; pins the block to
// the start of its flex/grid/block-level container without float (float
// would break a header flex row). ---
if ( 'left' === $align ) {
	$scoped_css[] = $sel . '{margin-inline-end:auto;margin-inline-start:0}';
}

// --- Per-tier max box (FR-36-22 basics) — caps the rendered logo box on top
// of the `width` custom property, independently per breakpoint. Unset tiers
// emit nothing (no cap at that tier). ---
// ⛔ `maxWidth` is a TIER OBJECT as of Spec 35 pass 2 (2026-08-11), and feeding
// the object straight to sgs_responsive_css_rule() would DROP IT SILENTLY — not
// warn, not error. That helper's validity gate is
// `$transform || is_numeric( $raw )` (helpers-responsive.php), this spec supplies
// no `transform`, and `is_numeric()` on an array is false, so every tier would
// fail the gate and the whole max-width cap would vanish with nothing in the
// error log to show for it. `unit_default` does not save it — the value never
// reaches the formatter.
//
// So the object is flattened back to the three keys the helper expects, keeping
// its unit handling and @media emission byte-identical. `maxHeight` became the
// SAME tier-object shape in the same pass (2026-08-11) — flattened identically
// below, via the same $rl_max_width_num() stripper (kept its historic name;
// it is unit-agnostic and used for both families).
$rl_max_width_tiers  = sgs_responsive_normalise_object( $attributes['maxWidth'] ?? null );
$rl_max_height_tiers = sgs_responsive_normalise_object( $attributes['maxHeight'] ?? null );

// This block stores maxWidth as a bare NUMBER with the unit in its own
// `maxWidthUnit` attr, and sgs_responsive_css_rule()'s validity gate is
// `is_numeric()` — so a unit-bearing string like "64px" is REJECTED and the cap
// silently disappears. The editor writes a bare number (parseMaxBoxValue splits
// it), but hand-authored, cloned or fixture content can carry the unit inline.
// Strip a trailing unit so both shapes work rather than one of them vanishing.
$rl_max_width_num = static function ( $raw ) {
	if ( null === $raw || '' === $raw ) {
		return '';
	}
	if ( is_numeric( $raw ) ) {
		return $raw;
	}
	return preg_match( '/^\s*([\d.]+)\s*[a-z%]*\s*$/i', (string) $raw, $m ) ? $m[1] : '';
};

$rl_css_attributes = array_merge(
	$attributes,
	array(
		'maxWidth'        => $rl_max_width_num( $rl_max_width_tiers['desktop'] ?? '' ),
		'maxWidthTablet'  => $rl_max_width_num( $rl_max_width_tiers['tablet'] ?? '' ),
		'maxWidthMobile'  => $rl_max_width_num( $rl_max_width_tiers['mobile'] ?? '' ),
		'maxHeight'       => $rl_max_width_num( $rl_max_height_tiers['desktop'] ?? '' ),
		'maxHeightTablet' => $rl_max_width_num( $rl_max_height_tiers['tablet'] ?? '' ),
		'maxHeightMobile' => $rl_max_width_num( $rl_max_height_tiers['mobile'] ?? '' ),
	)
);

$scoped_css[] = sgs_responsive_css_rule(
	$rl_css_attributes,
	array(
		array(
			'attr'         => 'maxWidth',
			'css'          => 'max-width',
			'unit_attr'    => 'maxWidthUnit',
			'unit_default' => 'px',
			'tablet_attr'  => 'maxWidthTablet',
			'mobile_attr'  => 'maxWidthMobile',
		),
		array(
			'attr'         => 'maxHeight',
			'css'          => 'max-height',
			'unit_attr'    => 'maxHeightUnit',
			'unit_default' => 'px',
			'tablet_attr'  => 'maxHeightTablet',
			'mobile_attr'  => 'maxHeightMobile',
		),
	),
	$sel
);

// --- Base padding/margin — WP-native style.spacing (skip-serialised) emitted
// scoped via the stable core style engine. ---

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

// --- Responsive padding/margin tiers — SGS custom object attrs, hand-built
// shorthand, scoped @media on the SAME selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );

$tablet_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// ── Wrapper attributes via get_block_wrapper_attributes() ────────────────────
// No `style` key (D345: inline `--var` custom properties are forbidden, no
// exception). `--logo-width` now lives in the scoped uid-class rule above.

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'          => 'sgs-responsive-logo' . $animation_modifier . ' ' . $uid,
		'data-animation' => 'none' !== $animation_style ? esc_attr( $animation_style ) : false,
	)
);

// Remove data-animation when falsy (get_block_wrapper_attributes doesn't strip false values).
if ( 'none' === $animation_style ) {
	$wrapper_attributes = preg_replace( '/\s*data-animation="false"/', '', $wrapper_attributes );
}

// ── SVG inline render (animation mode) ───────────────────────────────────────

$svg_html          = '';
$has_svg_animation = 'none' !== $animation_style && $svg_animation_id > 0;

if ( $has_svg_animation ) {
	$svg_path = get_attached_file( $svg_animation_id );
	if ( $svg_path && file_exists( $svg_path ) ) {
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local file, no network call.
		$raw_svg = file_get_contents( $svg_path );
		if ( $raw_svg ) {
			// Sanitise the SVG with wp_kses using the extended SVG element schema.
			// This allows all legitimate SVG drawing elements while stripping
			// script, event handlers, and other XSS vectors.
			$svg_html = wp_kses( $raw_svg, sgs_svg_kses_allowed_tags() );
		}
	}
}

// ── Build inner markup ────────────────────────────────────────────────────────

ob_start();

if ( $link_to_home ) {
	printf(
		'<a class="sgs-responsive-logo__link" href="%s" rel="home" aria-label="%s">',
		esc_url( home_url( '/' ) ),
		esc_attr( $link_aria_label )
	);
}

if ( $has_svg_animation && $svg_html ) {
	// Animation mode: inline SVG for desktop; static images for tablet + mobile.
	//
	// Tier G DrawSVG wiring (Spec 38 FR-38-15 / D408 — Vivus retirement). The
	// `data-sgs-fx="draw"` + `data-sgs-fx-trigger` pair sits on THIS wrapper
	// span, not on the inlined <svg> itself: the wrapper is markup this file
	// fully controls, while the <svg> comes from a sanitised media-library
	// upload whose internal shape this file must not assume. `fx-draw.js`'s
	// `collectDrawTargets()` searches an fx element's OWN descendants for
	// drawable shapes, so anchoring the attribute here still reaches every
	// path/line/polyline/polygon/rect/ellipse/circle inside. `SGS_Motion_Registry`
	// sniffs this exact `data-sgs-fx="draw"` string out of the rendered block
	// content (render_block filter, priority 99) to enqueue DrawSVG + this
	// effect module — no separate JS wiring is needed on this block.
	//
	// animationStyle's three animated values map 1:1 onto Spec 38 §11.2's
	// `load | scroll | hover` trigger grammar; the stored attribute enum is
	// unchanged (only the runtime swapped), so a stored instance renders
	// identically post-migration.
	$fx_trigger_by_style = array(
		'draw-on-load'   => 'load',
		'scroll-trigger' => 'scroll',
		'hover-redraw'   => 'hover',
	);
	$fx_trigger          = $fx_trigger_by_style[ $animation_style ] ?? 'load';

	printf(
		'<span class="sgs-responsive-logo__svg" aria-hidden="true" data-sgs-fx="draw" data-sgs-fx-trigger="%s">',
		esc_attr( $fx_trigger )
	);
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised above via wp_kses.
	echo $svg_html;
	echo '</span>';

	// Hidden static images for tablet and mobile (displayed by CSS media queries).
	printf(
		'<picture class="sgs-responsive-logo__picture sgs-responsive-logo__picture--fallback">' .
		'<source media="(max-width: 767px)" srcset="%1$s">' .
		'<source media="(max-width: 1023px)" srcset="%2$s">' .
		'<img class="sgs-responsive-logo__image--desktop" src="%3$s" alt="%4$s" width="%5$d" loading="eager"%6$s>' .
		'</picture>',
		esc_url( $effective_mobile_url ),
		esc_url( $effective_tablet_url ),
		esc_url( $desktop_url ),
		esc_attr( $img_alt ),
		absint( $width ),
		$img_aria_hidden // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal attribute string, no user input.
	);
} else {
	// Standard mode: the compact/alternate logo replaces the desktop logo per
	// logoSwitchMode. mobile/tablet swap at fixed viewport tiers; custom swaps
	// at the operator's own chosen viewport width (logoSwitchCustomPx). All
	// three use <picture><source media>. No switch happens until an alternate
	// logo is set.
	$switch_mode = isset( $attributes['logoSwitchMode'] ) ? sanitize_key( $attributes['logoSwitchMode'] ) : 'mobile';
	$compact_url = '' !== $mobile_url ? $mobile_url : $tablet_url; // square/stacked alt, else the tablet slot.
	$has_alt     = '' !== $compact_url;

	if ( 'custom' === $switch_mode && $has_alt ) {
		// The compact logo covers the operator's own breakpoint band
		// (<= logoSwitchCustomPx viewport), clamped to a sane pixel range.
		$custom_px = max( 320, min( 2000, absint( $attributes['logoSwitchCustomPx'] ?? 1024 ) ) );
		printf(
			'<picture class="sgs-responsive-logo__picture">' .
			'<source media="(max-width: %5$dpx)" srcset="%1$s">' .
			'<img class="sgs-responsive-logo__image--desktop" src="%2$s" alt="%3$s" width="%4$d" loading="eager" decoding="async"%6$s>' .
			'</picture>',
			esc_url( $compact_url ),
			esc_url( $desktop_url ),
			esc_attr( $img_alt ),
			absint( $width ),
			absint( $custom_px ),
			$img_aria_hidden // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal attribute string, no user input.
		);
	} elseif ( 'tablet' === $switch_mode && $has_alt ) {
		// The compact logo covers the whole tablet + mobile band (<=1023px viewport).
		printf(
			'<picture class="sgs-responsive-logo__picture">' .
			'<source media="(max-width: 1023px)" srcset="%1$s">' .
			'<img class="sgs-responsive-logo__image--desktop" src="%2$s" alt="%3$s" width="%4$d" loading="eager" decoding="async"%5$s>' .
			'</picture>',
			esc_url( $compact_url ),
			esc_url( $desktop_url ),
			esc_attr( $img_alt ),
			absint( $width ),
			$img_aria_hidden // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal attribute string, no user input.
		);
	} else {
		// mobile (default): compact at <=767px; a distinct tablet logo (if set) fills
		// the 768-1023 band. Empty slots fall back to desktop (no switch = one logo).
		printf(
			'<picture class="sgs-responsive-logo__picture">' .
			'<source media="(max-width: 767px)" srcset="%1$s">' .
			'<source media="(max-width: 1023px)" srcset="%2$s">' .
			'<img class="sgs-responsive-logo__image--desktop" src="%3$s" alt="%4$s" width="%5$d" loading="eager" decoding="async"%6$s>' .
			'</picture>',
			esc_url( $effective_mobile_url ),
			esc_url( $effective_tablet_url ),
			esc_url( $desktop_url ),
			esc_attr( $img_alt ),
			absint( $width ),
			$img_aria_hidden // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal attribute string, no user input.
		);
	}
}

if ( $link_to_home ) {
	echo '</a>';
}

$inner_html = ob_get_clean();

// ── Scoped CSS output (no-inline contract §A) ────────────────────────────────
// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving CSS
// combinators intact. Every value reaching $scoped_css is pre-sanitised
// (sgs_css_length_value() / wp_style_engine_get_styles), so no un-sanitised value
// survives here.

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
