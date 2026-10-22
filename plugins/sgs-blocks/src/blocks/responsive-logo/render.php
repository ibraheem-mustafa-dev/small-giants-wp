<?php
/**
 * Server-side render for the SGS Responsive Logo block.
 *
 * Outputs a <picture> element with up to three logo slots (desktop / tablet /
 * mobile) or, when a `draw` layer on the wrapper names an SVG, an inline SVG for
 * desktop with static images for smaller breakpoints. A `lottie` layer on the
 * wrapper plays over the <picture>, which is its poster.
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
 *   .sgs-responsive-logo__picture     — <picture> element
 *   .sgs-responsive-logo__image (+ --desktop) / --tablet / --mobile — img elements
 *   .sgs-responsive-logo__svg         — inline SVG wrapper (draw layer or inlineSvg)
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

$desktop_logo_id  = isset( $attributes['logoId'] ) ? absint( $attributes['logoId'] ) : 0;
$tablet_logo_id   = isset( $attributes['logoIdTablet'] ) ? absint( $attributes['logoIdTablet'] ) : 0;
$mobile_logo_id   = isset( $attributes['logoIdMobile'] ) ? absint( $attributes['logoIdMobile'] ) : 0;
// Fill-width default: `width` carries no `default` in block.json (see that
// file's own attribute comment), so `isset()` here is a real "did the
// operator ever set this" check — WP's `prepare_attributes_for_render()` only
// injects a declared schema default, so an untouched instance genuinely has
// no `width` key. $width_explicit
// drives the scoped `--logo-width` CSS emission below (skipped when unset,
// letting style.scss's `var(--logo-width, 100%)` fallback fill the column);
// `$width` itself still falls back to 240 here ONLY for the <img width="">
// HTML attribute further down, which needs a real integer to stay valid
// markup and is a harmless intrinsic-size hint, not the visual constraint.
$width_explicit   = isset( $attributes['width'] );
$width            = $width_explicit ? absint( $attributes['width'] ) : 240;
$link_to_home     = isset( $attributes['linkToHome'] ) ? (bool) $attributes['linkToHome'] : true;
$alt              = isset( $attributes['alt'] ) ? sanitize_text_field( $attributes['alt'] ) : '';
$logo_decorative  = ! empty( $attributes['logoDecorative'] );

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

// ── Dark-mode logo variant (U-17, design §3.1). ──
$dark_logo_id  = isset( $attributes['darkLogoId'] ) ? absint( $attributes['darkLogoId'] ) : 0;
$dark_logo_url = $dark_logo_id > 0 ? (string) wp_get_attachment_url( $dark_logo_id ) : '';

// ── Early exit: nothing to render ────────────────────────────────────────────

// ── Resolve image URLs ────────────────────────────────────────────────────────
// When no desktop logo is set on the block, fall back to the site-level logo:
// the Site Info logo, then the WP site's custom logo (Appearance → Customise →
// Site Identity → Logo). Operators who upload a single site logo get all three
// breakpoints pointing at it automatically.

// ID-wins-URL-fallback — the same resolution order every other SGS
// image block uses (media/render.php: "imageId wins; fall back to
// imageUrl"). The attachment ID stays authoritative because it resolves to the
// CURRENT file if the media item is replaced, while the stored URL survives when
// the ID is absent — which is the case for a cloned block, where the draft gave
// a `<img src>` and no library item exists yet.
//
// That fallback also gives `alt` an `attr_type='string'` sibling to name as its
// `alt_companion_attr`, which is what walk.py requires before it will capture
// alt text at all. Three bare attachment IDs could never satisfy it.
$sgs_logo_url_attr = static function ( $key ) use ( $attributes ): string {
	return isset( $attributes[ $key ] ) ? esc_url_raw( (string) $attributes[ $key ] ) : '';
};

$desktop_logo_url_attr = $sgs_logo_url_attr( 'logoUrl' );
$tablet_logo_url_attr  = $sgs_logo_url_attr( 'logoUrlTablet' );
$mobile_logo_url_attr  = $sgs_logo_url_attr( 'logoUrlMobile' );

// Logo resolution chain (FR-36-22), first non-empty wins: (1) this block's own
// logoId / logoUrl, tested by the condition below; (2) Site Info `logo`;
// (3) WordPress core `custom_logo` theme mod; (4) nothing, so no logo element
// is rendered at all. Tiers 2 and 3 are resolved together by
// Sgs_Site_Info_Logo::resolve_id().
$sgs_logo_from_site = false;
if ( 0 === $desktop_logo_id && '' === $desktop_logo_url_attr ) {
	require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-site-info-logo.php';
	$sgs_site_logo_id = \SGS\Blocks\Sgs_Site_Info_Logo::resolve_id();
	if ( $sgs_site_logo_id > 0 ) {
		$desktop_logo_id    = $sgs_site_logo_id;
		$sgs_logo_from_site = true;
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
// destination intent; an operator-authored value always wins. A logo taken from
// the site-level tiers falls back to its own media-library alt text first.
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
// Unit-aware (Spec 35 C5): `shrinkWidth` is a plain number, the CSS unit
// lives in the paired `shrinkWidthUnit` attribute (px|%|em|rem, same set
// as maxWidthUnit) -- a client sizing a shrunk logo relative to its header
// row (%) or its own base font (em/rem) is not forced into px. The composed
// length runs through sgs_css_length_value() (contract §D), the same
// sanitiser every other CSS-length attribute on this block uses, not a bare
// absint() assumption.
$shrink_width_explicit = isset( $attributes['shrinkWidth'] ) && '' !== $attributes['shrinkWidth'];
if ( $shrink_width_explicit ) {
	$shrink_width_unit = isset( $attributes['shrinkWidthUnit'] ) ? sanitize_key( $attributes['shrinkWidthUnit'] ) : 'px';
	$shrink_width_raw  = (float) $attributes['shrinkWidth'] . $shrink_width_unit;
	$shrink_width_css  = function_exists( 'sgs_css_length_value' ) ? sgs_css_length_value( $shrink_width_raw ) : '';
	if ( '' === $shrink_width_css ) {
		$shrink_width_css = absint( $attributes['shrinkWidth'] ) . 'px';
	}
	$scoped_css[] = '.is-header-shrunk ' . $sel . ',.is-row-shrunk ' . $sel . '{--logo-width:' . $shrink_width_css . '}';
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
	$scoped_css[] = '@media(max-width:1023px){' . $sel . '{' . implode( ';', $border['tablet'] ) . ';}}';
}
if ( $border['mobile'] ) {
	$scoped_css[] = '@media(max-width:767px){' . $sel . '{' . implode( ';', $border['mobile'] ) . ';}}';
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
	$scoped_css[] = "{$sel} img{filter:brightness(0) invert(1);}";
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
// ⛔ `maxWidth` is a TIER OBJECT, and feeding
// the object straight to sgs_responsive_css_rule() would DROP IT SILENTLY — not
// warn, not error. That helper's validity gate is
// `$transform || is_numeric( $raw )` (helpers-responsive.php), this spec supplies
// no `transform`, and `is_numeric()` on an array is false, so every tier would
// fail the gate and the whole max-width cap would vanish with nothing in the
// error log to show for it. `unit_default` does not save it — the value never
// reaches the formatter.
//
// So the object is flattened back to the three keys the helper expects, keeping
// its unit handling and @media emission unchanged. `maxHeight` is the
// SAME tier-object shape — flattened identically
// below, via the same $rl_max_width_num() stripper (it is unit-agnostic and
// used for both families).
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
	),
	$sel
);

// --- Maximum height caps the logo IMAGE (light, tablet/mobile picture sources
// and the dark variant), not the root: the image keeps its aspect ratio
// (`width:auto`), so its width follows from the capped height, and the root
// drops its fill-width default (`width:auto`) so the block box shrinks to the
// image instead of filling its container. Both `width:auto` rules start at the
// largest tier that sets a cap, the tier the cap itself cascades down from, so
// an uncapped larger tier stays width-driven. With no tier set nothing is
// emitted and the logo stays width-driven. ---
$rl_has_max_height = '' !== $rl_css_attributes['maxHeight']
	|| '' !== $rl_css_attributes['maxHeightTablet']
	|| '' !== $rl_css_attributes['maxHeightMobile'];
if ( $rl_has_max_height ) {
	$rl_capped_at  = '' !== $rl_css_attributes['maxHeight'] ? 'desktop' : ( '' !== $rl_css_attributes['maxHeightTablet'] ? 'tablet' : 'mobile' );
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
	$scoped_css[] = sgs_responsive_css_rule( $rl_auto_tiers, $rl_auto_width, $sel . ',' . $sel . ' .sgs-responsive-logo__image--desktop,' . $sel . ' .sgs-responsive-logo__svg svg' );
	$scoped_css[] = sgs_responsive_css_rule(
		$rl_css_attributes,
		array(
			array(
				'attr'         => 'maxHeight',
				'css'          => 'max-height',
				'unit_attr'    => 'maxHeightUnit',
				'unit_default' => 'px',
				'tablet_attr'  => 'maxHeightTablet',
				'mobile_attr'  => 'maxHeightMobile',
			),
		),
		$sel . ' .sgs-responsive-logo__image--desktop,' . $sel . ' .sgs-responsive-logo__dark,' . $sel . ' .sgs-responsive-logo__svg svg'
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
	$scoped_css[] = '@media(max-width:1023px){' . "{$sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "{$margin_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// ── Wrapper attributes via get_block_wrapper_attributes() ────────────────────
// No `style` key (inline `--var` custom properties are forbidden, no
// exception). `--logo-width` lives in the scoped uid-class rule above.

$sgs_rl_wrapper_args = array(
	'class' => 'sgs-responsive-logo' . $animation_modifier . $has_dark_logo_modifier . $colour_auto_modifier . ' ' . $uid,
);
$wrapper_attributes = get_block_wrapper_attributes( $sgs_rl_wrapper_args );

// ── SVG inline render (draw layer, or the inlineSvg setting) ─────────────────

require_once dirname( __DIR__, 3 ) . '/includes/helpers-svg-inline-attachment.php';
$svg_html          = '';
$has_svg_animation = $svg_animation_id > 0;
if ( $has_svg_animation ) {
	$svg_html = sgs_svg_inline_attachment( $svg_animation_id );
}

// The inline logo carries the logo's accessible name as the <img> would (role="img" + aria-label), or is hidden
// from assistive tech when the logo is decorative.
$inline_logo_html = '';
if ( ! $has_svg_animation && $inline_svg_on && $desktop_logo_id > 0 ) {
	$inline_logo_html = sgs_svg_inline_root_attributes(
		sgs_svg_inline_attachment( $desktop_logo_id ),
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
	// Animation mode: inline SVG for desktop; static images for tablet + mobile.
	//
	// The draw layer's attributes sit on the block root (the motion renderer prints them), and `fx-draw.js` searches
	// that element's descendants for drawable shapes, so this wrapper span only holds the sanitised SVG.
	echo '<span class="sgs-responsive-logo__svg" aria-hidden="true">';
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rebuilt through sgs_svg_sanitise_document().
	echo $svg_html;
	echo '</span>';

	// Hidden static images for tablet and mobile (displayed by CSS media queries).
	printf(
		'<picture class="sgs-responsive-logo__picture sgs-responsive-logo__picture--fallback">' .
		'<source media="(max-width: 767px)" srcset="%1$s">' .
		'<source media="(max-width: 1023px)" srcset="%2$s">' .
		'<img class="sgs-responsive-logo__image sgs-responsive-logo__image--desktop" src="%3$s" alt="%4$s" width="%5$d" loading="eager"%6$s>' .
		'</picture>',
		esc_url( $effective_mobile_url ),
		esc_url( $effective_tablet_url ),
		esc_url( $desktop_url ),
		esc_attr( $img_alt ),
		absint( $width ),
		$img_aria_hidden // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal attribute string, no user input.
	);
} elseif ( '' !== $inline_logo_html ) {
	// Inline logo: the SVG file itself at every width; a compact logo (mobile, else tablet slot) swaps in below 1024px.
	$inline_compact_url = '' !== $mobile_url ? $mobile_url : $tablet_url;
	printf( '<span class="sgs-responsive-logo__svg%s">', '' !== $inline_compact_url ? ' sgs-responsive-logo__svg--swaps' : '' );
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rebuilt through sgs_svg_sanitise_document(); added attributes escaped by sgs_svg_inline_root_attributes().
	echo $inline_logo_html;
	echo '</span>';
	if ( '' !== $inline_compact_url ) {
		printf(
			'<picture class="sgs-responsive-logo__picture sgs-responsive-logo__picture--fallback">' .
			'<img class="sgs-responsive-logo__image sgs-responsive-logo__image--desktop" src="%1$s" alt="%2$s" width="%3$d" loading="eager" decoding="async"%4$s>' .
			'</picture>',
			esc_url( $inline_compact_url ),
			esc_attr( $img_alt ),
			absint( $width ),
			$img_aria_hidden // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal attribute string, no user input.
		);
	}
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
			'<img class="sgs-responsive-logo__image sgs-responsive-logo__image--desktop" src="%2$s" alt="%3$s" width="%4$d" loading="eager" decoding="async"%6$s>' .
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
			'<img class="sgs-responsive-logo__image sgs-responsive-logo__image--desktop" src="%2$s" alt="%3$s" width="%4$d" loading="eager" decoding="async"%5$s>' .
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
			'<img class="sgs-responsive-logo__image sgs-responsive-logo__image--desktop" src="%3$s" alt="%4$s" width="%5$d" loading="eager" decoding="async"%6$s>' .
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

// Dark-mode logo variant (U-17, design §3.1). Hidden by default; shown (and the light logo hidden)
// under :root[data-theme="dark"] / :root[data-theme="auto"][data-prefers-dark="true"]
// via style.css. No width/height HTML attributes are set on it deliberately
// — it shares the same box the light logo occupies (style.css positions both
// absolutely on top of one another), so it must inherit that box's size
// rather than impose its own intrinsic one.
if ( '' !== $dark_logo_url ) {
	printf(
		'<img class="sgs-responsive-logo__dark" src="%s" alt="" aria-hidden="true" loading="eager" decoding="async">',
		esc_url( $dark_logo_url )
	);
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
