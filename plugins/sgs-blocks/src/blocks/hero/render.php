<?php
/**
 * Server-side render for the SGS Hero block.
 *
 * FR-22-6 migration: the content column (label, headline, sub-headline, CTAs)
 * is now rendered via InnerBlocks ($content). Scalar content attrs (label,
 * headline, subHeadline, ctaPrimary*, ctaSecondary*) are NO LONGER read here.
 * They are retained in block.json for deprecated.js back-compat only.
 * R-22-14: NO legacy scalar fallback.
 *
 * Scalar STYLING/LAYOUT attributes still consumed here (wrapper/shell level):
 *   variant, alignment, backgroundImage, overlayColour, overlayOpacity,
 *   splitImage, splitMedia, splitImageMobile, splitImageMobileObjectPosition,
 *   backgroundVideo, svgContent, minHeight*, badges, background/text/border colourHover,
 *   transitionDuration, transitionEasing, bgParallax, bgKenBurns, bgVideo*,
 *   splitImageBleed, ctaPrimary/SecondaryHover*,
 *   headline/subHeadlineMarginBottom*, subHeadlineMaxWidth, splitImageMobileHeight,
 *   imageObjectFit/Position, image*Width/Height*, imageBorderStyle/Colour,
 *   splitColumnRatio*, splitGap*, splitContentOrderMobile, verticalAlignment,
 *   ctaGap*. Headline / sub-headline / label FONT-SIZE (all breakpoints) is
 *   owned by the child sgs/heading / sgs/text / sgs/label blocks — not emitted
 *   here.
 *
 * BOX-GROUP (contract §B, 2026-07-09): imageBorderRadius, imageBorderWidth,
 * imagePadding, mediaPadding, contentPadding, contentBandPadding are box
 * OBJECTS ({top,right,bottom,left} / {topLeft,topRight,bottomLeft,bottomRight},
 * base + Tablet + Mobile tiers) — no more flat per-side attrs or *Unit
 * companions. contentBandPadding is read + emitted entirely by
 * SGS_Container_Wrapper (mirrors sgs/container); the other 5 families are
 * read + emitted here, block-private.
 *
 * NO-INLINE (contract §A, 2026-07-09): the rendered subtree (section root,
 * overlay, content column, media wrapper, split image) carries ZERO inline
 * CSS property declarations. color/typography/spacing/__experimentalBorder
 * all declare __experimentalSkipSerialization in block.json; every value is
 * emitted into HERO'S OWN scoped `.{uid}` <style> instead (composite caveat —
 * these do NOT ride through the shared wrapper's `extra_styles`, which would
 * inline them). Section-level WP-native padding/margin remains the wrapper's
 * own scoped mechanism (unchanged).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    InnerBlocks HTML (label, headline, sub-headline, CTAs).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS length/unit sanitiser — for free-text attrs (embedded length strings like
// minHeight, and box-object side values) concatenated into raw CSS declarations
// inside this block's scoped <style> tag. Strips everything except letters,
// digits, dot, and % so a Contributor-authored malicious value (e.g.
// "600px;}body{display:none}.x{min-height:0") can never break out of the
// declaration into a new CSS rule. Mirrors sgs/button's proven sanitiser.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / object-fit) — letters + hyphen only.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// object-position sanitiser — allows the keyword/percentage/length grammar of
// CSS object-position ("center 20%", "top left", "10px 50%") while stripping
// anything that could break out of the declaration.
$sgs_css_object_position = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9%.\-\s]/', '', (string) $value );
};

// Box-object shorthand builder — { top, right, bottom, left } → a CSS
// `padding`/`border-width`-style 4-value shorthand string, each side
// sanitised. Returns null when every side is empty (nothing to emit).
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

// Border-radius object shorthand builder — { topLeft, topRight, bottomLeft,
// bottomRight } → CSS `border-radius` 4-value shorthand (TL TR BR BL order).
// Returns null when every corner is empty.
$sgs_radius_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$tl = $sgs_css_length( $box['topLeft'] ?? '' );
	$tr = $sgs_css_length( $box['topRight'] ?? '' );
	$br = $sgs_css_length( $box['bottomRight'] ?? '' );
	$bl = $sgs_css_length( $box['bottomLeft'] ?? '' );
	if ( '' === $tl && '' === $tr && '' === $br && '' === $bl ) {
		return null;
	}
	return ( '' !== $tl ? $tl : '0' ) . ' ' . ( '' !== $tr ? $tr : '0' ) . ' ' . ( '' !== $br ? $br : '0' ) . ' ' . ( '' !== $bl ? $bl : '0' );
};

// ── Shell / layout attributes (still scalar — drive the wrapper + media column).
// FR-22-6: scalar content attrs (label, headline, subHeadline, ctaPrimary*,
// ctaSecondary*) are deliberately NOT read here. R-22-14: no fallback.
$variant             = $attributes['variant'] ?? 'standard';
$alignment           = $attributes['alignment'] ?? 'left';
$bg_image            = $attributes['backgroundImage'] ?? null;
// WS-4: `overlayColour`/`overlayOpacity` renamed to `backgroundOverlayColour`/
// `backgroundOverlayOpacity` (the shared container owns those names). Read the new
// name first; fall back to the legacy name for un-migrated posts (belt-and-braces
// alongside the edit.js fallback). These dynamic blocks save <InnerBlocks.Content/>,
// so no save-markup deprecation is needed.
// Raw here; sanitised via sgs_colour_value() at the scoped-CSS concat site (matches the
// sibling colour pattern — media/content/image-border — so the sanitiser is locally
// obvious at every concatenation point and never double-applied to a resolved var()).
$overlay_colour      = $attributes['backgroundOverlayColour'] ?? ( $attributes['overlayColour'] ?? 'text' );
$overlay_opacity     = $attributes['backgroundOverlayOpacity'] ?? ( $attributes['overlayOpacity'] ?? 50 );
$split_image         = $attributes['splitImage'] ?? null;
// splitMedia (added 2026-05-05) is the unified image-or-video slot. For
// back-compat, when only the legacy splitImage is set, synthesise a
// splitMedia object so downstream rendering can use sgs_render_media() for
// video while keeping the rich image pipeline unchanged for images.
$split_media         = $attributes['splitMedia'] ?? null;
if ( empty( $split_media ) && ! empty( $split_image['url'] ) ) {
	$split_media = array(
		'url'  => $split_image['url'],
		'type' => 'image',
		'id'   => isset( $split_image['id'] ) ? absint( $split_image['id'] ) : 0,
		'alt'  => isset( $split_image['alt'] ) ? (string) $split_image['alt'] : '',
		'mime' => 'image/jpeg',
	);
}
// When splitMedia carries an image and the legacy splitImage is empty,
// hydrate splitImage so the existing srcset/responsive pipeline still runs.
if ( empty( $split_image['url'] ) && ! empty( $split_media['url'] ) && 'image' === ( $split_media['type'] ?? 'image' ) ) {
	$split_image = array(
		'url' => $split_media['url'],
		'id'  => isset( $split_media['id'] ) ? absint( $split_media['id'] ) : 0,
		'alt' => isset( $split_media['alt'] ) ? (string) $split_media['alt'] : '',
	);
}
$split_image_mobile  = $attributes['splitImageMobile'] ?? null;
$split_image_mobile_object_position = $attributes['splitImageMobileObjectPosition'] ?? 'center 20%';
$bg_video            = $attributes['backgroundVideo'] ?? null;
$svg_content         = $attributes['svgContent'] ?? '';
// Free-text embedded length strings (e.g. "600px") — sanitised before reaching
// the scoped <style> rule below (was esc_attr()-only, which does not strip
// ;{}() and so cannot prevent CSS-rule breakout).
$min_height          = $sgs_css_length( $attributes['minHeight'] ?? '' );
$min_height_tablet   = $sgs_css_length( $attributes['minHeightTablet'] ?? '' );
$min_height_mobile   = $sgs_css_length( $attributes['minHeightMobile'] ?? '360px' );
$badges              = $attributes['badges'] ?? array();

// Sub-headline / headline / label font-size are owned by the child
// sgs/text / sgs/heading / sgs/label blocks across all breakpoints — no
// scoped font-size <style> is emitted here.
$sub_headline_max_width     = $attributes['subHeadlineMaxWidth'] ?? null;

// Margin-bottom controls for headline and sub-headline (F1/F2).
$headline_margin_bottom        = $attributes['headlineMarginBottom'] ?? null;
$headline_margin_bottom_mobile = $attributes['headlineMarginBottomMobile'] ?? null;
$sub_headline_margin_bottom        = $attributes['subHeadlineMarginBottom'] ?? null;
$sub_headline_margin_bottom_mobile = $attributes['subHeadlineMarginBottomMobile'] ?? null;
$split_image_mobile_height  = $attributes['splitImageMobileHeight'] ?? null;

$hover_background_colour = $attributes['backgroundColourHover'] ?? '';
$hover_text_colour       = $attributes['textColourHover'] ?? '';
$hover_border_colour     = $attributes['borderColourHover'] ?? '';
$transition_duration     = $attributes['transitionDuration'] ?? '300';
$transition_easing       = $attributes['transitionEasing'] ?? 'ease-in-out';

// Background effect attributes.
$bg_parallax     = ! empty( $attributes['bgParallax'] );
$bg_ken_burns    = ! empty( $attributes['bgKenBurns'] );
$bg_video_attr   = $attributes['bgVideo'] ?? null;
$bg_video_mobile = $attributes['bgVideoMobile'] ?? null;

// Split-image bleed — removes border-radius and inner padding from the media column.
$split_image_bleed = ! empty( $attributes['splitImageBleed'] );

// Per-CTA hover colour overrides.
$cta_primary_hover_bg       = $attributes['ctaPrimaryHoverBackground'] ?? '';
$cta_primary_hover_colour   = $attributes['ctaPrimaryHoverColour'] ?? '';
$cta_secondary_hover_bg     = $attributes['ctaSecondaryHoverBackground'] ?? '';
$cta_secondary_hover_colour = $attributes['ctaSecondaryHoverColour'] ?? '';

// ── Phase 1: Image display attributes ──────────────────────────────────────
$image_object_fit      = $attributes['imageObjectFit'] ?? 'cover';
$image_object_position = $attributes['imageObjectPosition'] ?? 'center center';

$image_width        = $attributes['imageWidth'] ?? null;
$image_width_tablet = $attributes['imageWidthTablet'] ?? null;
$image_width_mobile = $attributes['imageWidthMobile'] ?? null;
$image_width_unit   = $sgs_css_length( $attributes['imageWidthUnit'] ?? '%' );

$image_height        = $attributes['imageHeight'] ?? null;
$image_height_tablet = $attributes['imageHeightTablet'] ?? null;
$image_height_mobile = $attributes['imageHeightMobile'] ?? null;
$image_height_unit   = $sgs_css_length( $attributes['imageHeightUnit'] ?? 'px' );

// Image border radius — box-object family (contract §B): base + tablet +
// mobile, each { topLeft, topRight, bottomLeft, bottomRight }, string values
// with the unit baked in (no separate *Unit companion any more).
$image_border_radius_obj        = is_array( $attributes['imageBorderRadius'] ?? null ) ? $attributes['imageBorderRadius'] : array();
$image_border_radius_tablet_obj = is_array( $attributes['imageBorderRadiusTablet'] ?? null ) ? $attributes['imageBorderRadiusTablet'] : array();
$image_border_radius_mobile_obj = is_array( $attributes['imageBorderRadiusMobile'] ?? null ) ? $attributes['imageBorderRadiusMobile'] : array();

// Image border — width is a box-object family (base only, no tiers, matches
// the pre-existing base-only contract). Style/colour stay scalar attrs.
$image_border_style  = $sgs_css_keyword( $attributes['imageBorderStyle'] ?? 'none' );
$image_border_width_obj = is_array( $attributes['imageBorderWidth'] ?? null ) ? $attributes['imageBorderWidth'] : array();
$image_border_colour = $attributes['imageBorderColour'] ?? '';

// imagePadding — inner padding on the <img> element itself. Box-object
// family: base + tablet + mobile, each { top, right, bottom, left }.
$image_padding_obj        = is_array( $attributes['imagePadding'] ?? null ) ? $attributes['imagePadding'] : array();
$image_padding_tablet_obj = is_array( $attributes['imagePaddingTablet'] ?? null ) ? $attributes['imagePaddingTablet'] : array();
$image_padding_mobile_obj = is_array( $attributes['imagePaddingMobile'] ?? null ) ? $attributes['imagePaddingMobile'] : array();

// mediaPadding — outer padding + background on the .sgs-hero__media wrapper.
$media_bg_colour           = $attributes['mediaBackgroundColour'] ?? '';
$media_padding_obj         = is_array( $attributes['mediaPadding'] ?? null ) ? $attributes['mediaPadding'] : array();
$media_padding_tablet_obj  = is_array( $attributes['mediaPaddingTablet'] ?? null ) ? $attributes['mediaPaddingTablet'] : array();
$media_padding_mobile_obj  = is_array( $attributes['mediaPaddingMobile'] ?? null ) ? $attributes['mediaPaddingMobile'] : array();

// contentPadding — padding on the .sgs-hero__content wrapper.
$content_padding_obj        = is_array( $attributes['contentPadding'] ?? null ) ? $attributes['contentPadding'] : array();
$content_padding_tablet_obj = is_array( $attributes['contentPaddingTablet'] ?? null ) ? $attributes['contentPaddingTablet'] : array();
$content_padding_mobile_obj = is_array( $attributes['contentPaddingMobile'] ?? null ) ? $attributes['contentPaddingMobile'] : array();

// HC2: per-breakpoint text-align on .sgs-hero__content. Desktop = base rule
// (no @media), tablet/mobile via the scoped <style> @media mechanism — mirrors
// the existing responsive-CSS builder. Empty string / 'inherit' = no emit so
// unset instances keep the variant's own alignment (sgs-hero--align-*).
$text_align_desktop = $attributes['textAlignDesktop'] ?? '';
$text_align_tablet  = $attributes['textAlignTablet'] ?? '';
$text_align_mobile  = $attributes['textAlignMobile'] ?? '';
$allowed_text_align = array( 'left', 'center', 'right', 'start', 'end', 'justify' );

// Layout grid (split variant). splitColumnRatio* was retired (Step 6 / D-next,
// 2026-06-11) — render.php now reads gridTemplateColumns* exclusively.
// deprecated.js v7 migrate() maps splitColumnRatio→gridTemplateColumns before resave.
// R-22-14: no legacy read-time fallback for splitColumnRatio.
// block.json defaults gridTemplateColumns to '' (unlike the retired
// splitColumnRatio whose default was '1fr 1fr') — ?? alone would let the
// empty string through, so default explicitly.
$split_col_ratio = $attributes['gridTemplateColumns'] ?? '';
if ( '' === trim( (string) $split_col_ratio ) ) {
	$split_col_ratio = '1fr 1fr';
}
$split_col_ratio_tablet = $attributes['gridTemplateColumnsTablet'] ?? '';
$split_col_ratio_mobile = $attributes['gridTemplateColumnsMobile'] ?? '';
// splitGap* REMOVED (de-duped 2026-07-06) — the split grid gap now reads the
// shared gap/gapTablet/gapMobile (see the gap emission below).
$split_order_mobile     = $attributes['splitContentOrderMobile'] ?? 'media-first';

// HC2: CTA row gap (.sgs-hero__ctas). Emitted as the --sgs-hero-cta-gap custom
// property which style.css consumes with the legacy spacing--30 default as the
// fallback — so an instance whose control was never touched is byte-unchanged.
// ctaGap has a schema default (12), so gate desktop emit on the attr being
// PRESENT in $attributes (operator actually set it), not on a non-null read.
$cta_gap_unit   = $sgs_css_length( $attributes['ctaGapUnit'] ?? 'px' );
$cta_gap_set    = array_key_exists( 'ctaGap', $attributes );
$cta_gap        = $cta_gap_set ? absint( $attributes['ctaGap'] ) : null;
$cta_gap_tablet = array_key_exists( 'ctaGapTablet', $attributes ) && null !== $attributes['ctaGapTablet'] ? absint( $attributes['ctaGapTablet'] ) : null;
$cta_gap_mobile = array_key_exists( 'ctaGapMobile', $attributes ) && null !== $attributes['ctaGapMobile'] ? absint( $attributes['ctaGapMobile'] ) : null;

// Vertical alignment. Content max-width now lives on the universal wrapper attr
// `contentWidth` (rendered by SGS_Container_Wrapper as the .sgs-container__inner
// cap) — the legacy per-hero contentMaxWidth* family was removed 2026-06-09.
$vertical_alignment      = $attributes['verticalAlignment'] ?? 'center';

// Split layout renders the media column on the explicit 'split' variant.
// FR-22-20 (2026-06-01): the cloning converter now DETECTS the variant from the
// draft's extracted fingerprint and sets variant='split' (universal variant
// detection — see Spec 22 §FR-22-20), so this original gate is correct. The
// 2026-06-01 data-presence band-aid (`|| ! empty( $split_image['url'] )`) is
// reverted per D133 — it mis-fired on stale data; variant detection replaces it.
$is_split        = ( 'split' === $variant );
$is_video        = 'video' === $variant;
$is_svg_animated = 'svg-animated' === $variant;

// Build wrapper styles.
$styles = array();
// min-height base is NOT inline (Pattern A, D-migration): it has tablet/mobile
// tiers, so base+tablet+mobile are emitted together on the SAME .uid selector
// in the scoped <style> below. minHeight* stays NULLED in the container-wrapper
// attr copy (C3 double-emit guard) — the hero's scoped style is the ONE channel.

// Transition custom properties — consumed by CSS vars on the block and its children.
$styles = array_merge( $styles, sgs_transition_vars( $attributes ) );

// HC2: desktop CTA-row gap. Only emitted when the operator actually set ctaGap
// (array_key_exists) so untouched instances fall through to style.css's legacy
// var(--wp--preset--spacing--30) fallback. The base var is NOT inline (Pattern A):
// it has tablet/mobile tiers, so base+tiers are emitted together on the SAME
// .uid selector in the scoped <style> below.

if ( $hover_background_colour ) {
	$styles[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_background_colour );
}
if ( $hover_text_colour ) {
	$styles[] = '--sgs-hover-text:' . sgs_colour_value( $hover_text_colour );
}
if ( $hover_border_colour ) {
	$styles[] = '--sgs-hover-border:' . sgs_colour_value( $hover_border_colour );
}

// Per-CTA hover overrides — written as CSS custom properties so the CSS rule can
// reference them without needing a unique selector per instance.
if ( $cta_primary_hover_bg ) {
	$styles[] = '--sgs-cta-pri-hover-bg:' . sgs_colour_value( $cta_primary_hover_bg );
}
if ( $cta_primary_hover_colour ) {
	$styles[] = '--sgs-cta-pri-hover-colour:' . sgs_colour_value( $cta_primary_hover_colour );
}
if ( $cta_secondary_hover_bg ) {
	$styles[] = '--sgs-cta-sec-hover-bg:' . sgs_colour_value( $cta_secondary_hover_bg );
}
if ( $cta_secondary_hover_colour ) {
	$styles[] = '--sgs-cta-sec-hover-colour:' . sgs_colour_value( $cta_secondary_hover_colour );
}

// Standard variant: use <img> instead of CSS background-image so the browser can
// discover the LCP resource early and apply fetchpriority="high".
$has_standard_bg_image = ! $is_split && ! $is_video && ! $is_svg_animated
	&& ! empty( $bg_image['url'] );

// Generate a unique ID for responsive CSS scoping. This is a CLASS (contract
// §B3-style scoping — matches the container/quote/heading convention): the
// root element also carries the WP `anchor` id (ToC target), so the scoped
// hook must never collide with it.
$uid      = 'sgs-hero-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-hero';

// ── Responsive CSS builder ──────────────────────────────────────────────────
// Pattern A throughout: base rule first, then tablet(≤1023), then mobile(≤767),
// all on the SAME selector — cascade order does the overriding, no !important.
$responsive_css = '';

// Split variant: replace the default flex layout with CSS Grid. No-inline
// contract (§A): display:grid is a real property declaration, so it is
// deferred to the scoped .uid rule (was previously pushed inline via $styles).
if ( $is_split ) {
	$responsive_css .= '.' . $uid . '{display:grid}';

	// ── Content-band cap (grid-aware) ──
	// The universal wrapper caps content via an injected `.sgs-container__inner`
	// div, which is SUPPRESSED for split (wrap_inner=false) because it would
	// collapse the two grid columns. So the `contentWidth` control had nothing
	// to act on for split heroes. Fix: apply the band directly to the section
	// grid as centred inline padding — the full-bleed background still paints
	// edge-to-edge behind the padding, while the two columns stay confined to a
	// centred band. Mirrors the wrapper's own token→length resolver
	// (normal→content-size, wide→wide-size, full/empty→no cap, else literal).
	$cw_raw = (string) ( $attributes['contentWidth'] ?? '' );
	$band   = '';
	if ( 'normal' === $cw_raw ) {
		// Tie to the theme.json global (framework default 1200px; per-site
		// override in the snapshot, e.g. Indus 1140px) — no hardcoded px
		// fallback, which would mask the theme value if the var ever resolved.
		$band = 'var(--wp--style--global--content-size)';
	} elseif ( 'wide' === $cw_raw ) {
		$band = 'var(--wp--style--global--wide-size)';
	} elseif ( '' !== $cw_raw && 'full' !== $cw_raw ) {
		$band = $sgs_css_length( $cw_raw );
	}
	if ( '' !== $band ) {
		$responsive_css .= '.' . $uid . '{padding-inline:max(var(--wp--style--root--padding-right,24px),calc((100% - ' . $band . ') / 2))}';
	}
}

// F3 drain (§E2, D228 pattern): the outer section's cross-axis `align-items`
// was hardcoded to `center` in style.css (.sgs-hero{align-items:center}).
// Drive it from verticalAlignment instead — same map render.php already uses
// for the content column's justify-content — so an untouched instance (default
// verticalAlignment='center') stays byte-identical while the control now
// actually governs the property it claims to.
$align_items_map = array(
	'top'    => 'flex-start',
	'center' => 'center',
	'bottom' => 'flex-end',
);
$responsive_css .= '.' . $uid . '{align-items:' . ( $align_items_map[ $vertical_alignment ] ?? 'center' ) . '}';

if ( ! empty( $min_height ) ) {
	$responsive_css .= '.' . $uid . '{min-height:' . esc_attr( $min_height ) . '}';
}
if ( $min_height_tablet ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . '{min-height:' . esc_attr( $min_height_tablet ) . '}}';
}
if ( $min_height_mobile ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . '{min-height:' . esc_attr( $min_height_mobile ) . '}}';
}

// ── Margin-bottom: headline + sub-headline (F1/F2) ─────────────────────────
// Desktop base rules — no @media wrapper, no !important.
if ( null !== $headline_margin_bottom ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__headline{margin-bottom:' . absint( $headline_margin_bottom ) . 'px}';
}
if ( null !== $sub_headline_margin_bottom ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__subheadline{margin-bottom:' . absint( $sub_headline_margin_bottom ) . 'px}';
}
// Mobile overrides — !important required to beat inline styles (F4 pattern).
if ( null !== $headline_margin_bottom_mobile ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__headline{margin-bottom:' . absint( $headline_margin_bottom_mobile ) . 'px !important}}';
}
if ( null !== $sub_headline_margin_bottom_mobile ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__subheadline{margin-bottom:' . absint( $sub_headline_margin_bottom_mobile ) . 'px !important}}';
}

// Sub-headline max-width.
if ( $sub_headline_max_width ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__subheadline{max-width:' . absint( $sub_headline_max_width ) . 'px}';
}

// Split image mobile height.
if ( $split_image_mobile_height ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-image{height:' . absint( $split_image_mobile_height ) . 'px;object-fit:cover}}';
}

// ── Split variant: grid-template-columns + gap (base + tablet + mobile) ────
if ( $is_split ) {
	// Base grid-template-columns — moved here from the old inline style="" on
	// the section element (Pattern A). Allowlist the ratio string: only fr,
	// px, %, numbers, spaces, auto, calc() permitted.
	$safe_ratio = preg_match( '/^[\d.\s%a-zA-Z()+\-*\/]+$/', $split_col_ratio ) ? $split_col_ratio : '1fr 1fr';
	$responsive_css .= '.' . $uid . '{grid-template-columns:' . $safe_ratio . '}';

	// Base gap — reads the SHARED `gap` attr (de-duped from splitGap, 2026-07-06).
	// The split 2-col grid gap IS the container gap; the bespoke splitGap* attrs +
	// their own "Column gap" control duplicated the shared gap/gapTablet/gapMobile
	// (ContainerWrapperControls "Gap"). One gap attr + one control now. Empty =
	// no gap emitted (grid default 0 = flush) — no more forced `gap:0px`.
	$hero_gap = sgs_container_gap_value( $attributes['gap'] ?? '' );
	if ( '' !== $hero_gap ) {
		$responsive_css .= '.' . $uid . '{gap:' . $hero_gap . '}';
	}

	// Tablet grid-template-columns override.
	if ( $split_col_ratio_tablet ) {
		$safe_ratio_tab = preg_match( '/^[\d.\s%a-zA-Z()+\-*\/]+$/', $split_col_ratio_tablet ) ? $split_col_ratio_tablet : '';
		if ( $safe_ratio_tab ) {
			$responsive_css .= '@media (max-width:1023px){.' . $uid . '{grid-template-columns:' . $safe_ratio_tab . '}}';
		}
	}
	// Mobile grid-template-columns override. When splitColumnRatioMobile is
	// empty, default to single-column stacking (1fr). No !important needed —
	// the desktop ratio now lives on this same .uid selector (base rule above)
	// so the later-source @media rule wins by normal cascade (F4 retired).
	$ratio_mob = $split_col_ratio_mobile;
	if ( ! $ratio_mob ) {
		$ratio_mob = '1fr';
	}
	$safe_ratio_mob = preg_match( '/^[\d.\s%a-zA-Z()+\-*\/]+$/', $ratio_mob ) ? $ratio_mob : '';
	if ( $safe_ratio_mob ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . '{grid-template-columns:' . $safe_ratio_mob . '}}';
	}
	// Tablet gap override — shared gapTablet.
	$hero_gap_tablet = sgs_container_gap_value( $attributes['gapTablet'] ?? '' );
	if ( '' !== $hero_gap_tablet ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . '{gap:' . $hero_gap_tablet . '}}';
	}
	// Mobile gap override — shared gapMobile.
	$hero_gap_mobile = sgs_container_gap_value( $attributes['gapMobile'] ?? '' );
	if ( '' !== $hero_gap_mobile ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . '{gap:' . $hero_gap_mobile . '}}';
	}
	// Mobile column order.
	if ( 'content-first' === $split_order_mobile ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__content{order:1}.' . $uid . ' .sgs-hero__media{order:2}}';
	} else {
		// media-first (default).
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__media{order:1}.' . $uid . ' .sgs-hero__content{order:2}}';
	}
}

// ── imagePadding: box-object family — base + tablet + mobile (on the <img>
// element). Gated on $is_split, matching the old emission's scope.
if ( $is_split ) {
	$img_pad_base = $sgs_box_shorthand( $image_padding_obj );
	if ( null !== $img_pad_base ) {
		$responsive_css .= '.' . $uid . ' .sgs-hero__split-image{padding:' . $img_pad_base . '}';
	}
	$img_pad_tab = $sgs_box_shorthand( $image_padding_tablet_obj );
	if ( null !== $img_pad_tab ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-image{padding:' . $img_pad_tab . '}}';
	}
	$img_pad_mob = $sgs_box_shorthand( $image_padding_mobile_obj );
	if ( null !== $img_pad_mob ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-image{padding:' . $img_pad_mob . '}}';
	}
}

// ── imageBorderRadius: box-object family — base + tablet + mobile.
// Gated on $is_split to match the old inline emission (which only ran inside
// the split-image branch).
if ( $is_split ) {
	$img_radius_base = $sgs_radius_shorthand( $image_border_radius_obj );
	if ( null !== $img_radius_base ) {
		$responsive_css .= '.' . $uid . ' .sgs-hero__split-image{border-radius:' . $img_radius_base . '}';
	}
	$img_radius_tab = $sgs_radius_shorthand( $image_border_radius_tablet_obj );
	if ( null !== $img_radius_tab ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-image{border-radius:' . $img_radius_tab . '}}';
	}
	$img_radius_mob = $sgs_radius_shorthand( $image_border_radius_mobile_obj );
	if ( null !== $img_radius_mob ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-image{border-radius:' . $img_radius_mob . '}}';
	}

	// ── imageBorderWidth / style / colour — box-object family (base only, no
	// tiers). Moved here from the inline style="" on the <img> element
	// (contract §A) — was previously the only remaining inline decl on the
	// split image alongside object-fit/object-position (below).
	$img_border_width_val = $sgs_box_shorthand( $image_border_width_obj );
	$img_border_has_width = null !== $img_border_width_val;
	if ( 'none' !== $image_border_style || $img_border_has_width ) {
		$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
		$safe_border_style     = in_array( $image_border_style, $allowed_border_styles, true ) ? $image_border_style : 'solid';
		$img_border_decls   = array( 'border-style:' . $safe_border_style );
		if ( $img_border_has_width ) {
			$img_border_decls[] = 'border-width:' . $img_border_width_val;
		}
		if ( $image_border_colour ) {
			$img_border_decls[] = 'border-color:' . sgs_colour_value( $image_border_colour );
		}
		$responsive_css .= '.' . $uid . ' .sgs-hero__split-image{' . implode( ';', $img_border_decls ) . '}';
	}

	// ── object-fit / object-position — moved from inline style="" (contract §A).
	if ( 'custom' !== $image_object_fit ) {
		$allowed_fits = array( 'fill', 'contain', 'cover', 'match-height', 'match-width', 'none' );
		$safe_fit     = in_array( $image_object_fit, $allowed_fits, true ) ? $image_object_fit : 'cover';
		$responsive_css .= '.' . $uid . ' .sgs-hero__split-image{object-fit:' . $safe_fit . '}';
	}
	$safe_object_position = $sgs_css_object_position( $image_object_position );
	if ( '' !== $safe_object_position ) {
		$responsive_css .= '.' . $uid . ' .sgs-hero__split-image{object-position:' . $safe_object_position . '}';
	}
}

// ── imageWidth / imageHeight: base + tablet + mobile (custom fit only) ─────
// Base moved here from the inline style="" on the split <img> (Pattern A).
if ( 'custom' === $image_object_fit ) {
	if ( null !== $image_width ) {
		$responsive_css .= '.' . $uid . ' .sgs-hero__split-image{width:' . absint( $image_width ) . esc_attr( $image_width_unit ) . '}';
	}
	if ( null !== $image_height ) {
		$responsive_css .= '.' . $uid . ' .sgs-hero__split-image{height:' . absint( $image_height ) . esc_attr( $image_height_unit ) . '}';
	}
	if ( null !== $image_width_tablet ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-image{width:' . absint( $image_width_tablet ) . esc_attr( $image_width_unit ) . '}}';
	}
	if ( null !== $image_width_mobile ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-image{width:' . absint( $image_width_mobile ) . esc_attr( $image_width_unit ) . '}}';
	}
	if ( null !== $image_height_tablet ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-image{height:' . absint( $image_height_tablet ) . esc_attr( $image_height_unit ) . '}}';
	}
	if ( null !== $image_height_mobile ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-image{height:' . absint( $image_height_mobile ) . esc_attr( $image_height_unit ) . '}}';
	}
}

// ── mediaPadding: box-object family — base + tablet + mobile (on .sgs-hero__media).
$media_pad_base = $sgs_box_shorthand( $media_padding_obj );
if ( null !== $media_pad_base ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__media{padding:' . $media_pad_base . '}';
}
$media_pad_tab = $sgs_box_shorthand( $media_padding_tablet_obj );
if ( null !== $media_pad_tab ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__media{padding:' . $media_pad_tab . '}}';
}
$media_pad_mob = $sgs_box_shorthand( $media_padding_mobile_obj );
if ( null !== $media_pad_mob ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__media{padding:' . $media_pad_mob . '}}';
}

// mediaBackground — moved here from the inline style="" on the media wrapper
// (contract §A). mediaBackground (shared per-area schema) takes priority over
// the legacy mediaBackgroundColour attr when both are set.
$media_bg_resolved = $attributes['mediaBackground'] ?? '';
if ( ! $media_bg_resolved ) {
	$media_bg_resolved = $media_bg_colour;
}
if ( $media_bg_resolved ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__media{background-color:' . sgs_colour_value( $media_bg_resolved ) . '}';
}

// ── contentPadding: box-object family — base + tablet + mobile (on .sgs-hero__content).
$content_pad_base = $sgs_box_shorthand( $content_padding_obj );
if ( null !== $content_pad_base ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__content{padding:' . $content_pad_base . '}';
}
$content_pad_tab = $sgs_box_shorthand( $content_padding_tablet_obj );
if ( null !== $content_pad_tab ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__content{padding:' . $content_pad_tab . '}}';
}
$content_pad_mob = $sgs_box_shorthand( $content_padding_mobile_obj );
if ( null !== $content_pad_mob ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__content{padding:' . $content_pad_mob . '}}';
}

// ── .sgs-hero__content base layout + background — moved here from the inline
// style="" built further down (contract §A). display:flex/flex-direction are
// structural declarations (previously duplicated in style.css AND inline);
// justify-content is driven by verticalAlignment (top/center/bottom).
$content_background = isset( $attributes['contentBackground'] ) ? (string) $attributes['contentBackground'] : '';
$v_align_map         = array(
	'top'    => 'flex-start',
	'center' => 'center',
	'bottom' => 'flex-end',
);
$content_justify = $v_align_map[ $vertical_alignment ] ?? 'center';
$content_decls    = array( 'display:flex', 'flex-direction:column', 'justify-content:' . $content_justify );
if ( $content_background ) {
	$content_decls[] = 'background-color:' . sgs_colour_value( $content_background );
}
$responsive_css .= '.' . $uid . ' .sgs-hero__content{' . implode( ';', $content_decls ) . '}';

// ── HC2: text-align on .sgs-hero__content ──────────────────────────────────
// Desktop = base rule (no @media); tablet/mobile = scoped @media overrides.
// Each value is allowlisted; empty / unrecognised = no emit (keeps variant
// default). This makes textAlignDesktop a live render target for the cloning
// converter (H-C) and revives the inert tablet/mobile attrs.
if ( in_array( $text_align_desktop, $allowed_text_align, true ) ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__content{text-align:' . $text_align_desktop . '}';
}
if ( in_array( $text_align_tablet, $allowed_text_align, true ) ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__content{text-align:' . $text_align_tablet . '}}';
}
if ( in_array( $text_align_mobile, $allowed_text_align, true ) ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__content{text-align:' . $text_align_mobile . '}}';
}

// ── HC2: CTA row gap (.sgs-hero__ctas) ─────────────────────────────────────
// Base + tablet + mobile --sgs-hero-cta-gap all on the SAME .uid selector
// (Pattern A; style.css falls back to the legacy spacing--30 when unset).
if ( null !== $cta_gap ) {
	$responsive_css .= '.' . $uid . '{--sgs-hero-cta-gap:' . $cta_gap . esc_attr( $cta_gap_unit ) . '}';
}
if ( null !== $cta_gap_tablet ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . '{--sgs-hero-cta-gap:' . $cta_gap_tablet . esc_attr( $cta_gap_unit ) . '}}';
}
if ( null !== $cta_gap_mobile ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . '{--sgs-hero-cta-gap:' . $cta_gap_mobile . esc_attr( $cta_gap_unit ) . '}}';
}

// Build wrapper classes.
$classes = array(
	'sgs-hero',
	'sgs-hero--' . esc_attr( $variant ),
	'sgs-hero--align-' . esc_attr( $alignment ),
	// 'alignfull' added UNCONDITIONALLY (not gated on the block's `align`
	// attribute): the hero's full-bleed is a design invariant of this block,
	// not an operator alignment choice. Without it, WP core's !important
	// global-styles rule `.is-layout-constrained > :where(:not(.alignfull))
	// { margin:auto !important }` matches the hero (its selector EXCLUDES
	// .alignfull) and beats our non-important negative-margin full-bleed —
	// producing the asymmetric outer margin regression. Adding alignfull
	// removes the hero from that selector's match set. (Restored from prior
	// session; PROVE live before commit.)
	'alignfull',
	$uid,
);

if ( $bg_parallax ) {
	$classes[] = 'sgs-hero--parallax';
}
if ( $bg_ken_burns ) {
	$classes[] = 'sgs-hero--ken-burns';
}
if ( $split_image_bleed ) {
	$classes[] = 'sgs-hero--split-bleed';
}

// ── WP-native color / border / typography supports — no-inline contract (§A). ──
// block.json declares color/typography/spacing/__experimentalBorder ALL with
// __experimentalSkipSerialization:true, so get_block_wrapper_attributes() (called
// inside SGS_Container_Wrapper::render() below) never auto-inlines them. Read
// the resolved values from $attributes['style'] here and emit them into HERO'S
// OWN scoped <style> (composite caveat, per the migration contract: do NOT pass
// these as wrapper `extra_styles` — that path inlines). Base spacing (padding/
// margin) is a SEPARATE mechanism the wrapper already handles scoped internally
// (reads $attributes['style']['spacing'] directly) — not duplicated here.
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$hero_style_engine_args = array();

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
		$hero_style_engine_args['color'] = $color_args;
	}

	$border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
			$border_args['radius'] = $sgs_css_length( $radius_raw );
		} elseif ( is_array( $radius_raw ) ) {
			$radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
				if ( ! empty( $radius_raw[ $corner ] ) ) {
					$radius_clean[ $corner ] = $sgs_css_length( $radius_raw[ $corner ] );
				}
			}
			if ( ! empty( $radius_clean ) ) {
				$border_args['radius'] = $radius_clean;
			}
		}
	}
	if ( ! empty( $border_args ) ) {
		$hero_style_engine_args['border'] = $border_args;
	}

	if ( ! empty( $hero_style_engine_args ) ) {
		$hero_scoped_styles = wp_style_engine_get_styles(
			$hero_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $hero_scoped_styles['css'] ) ) {
			$responsive_css .= $hero_scoped_styles['css'];
		}
	}

	// Typography — declared selector (block.json selectors.typography.root)
	// targets .sgs-hero__headline, so scope the rule there rather than root_sel.
	$typography_args = array();
	if ( isset( $attributes['style']['typography']['fontSize'] ) && '' !== $attributes['style']['typography']['fontSize'] ) {
		$typography_args['fontSize'] = (string) $attributes['style']['typography']['fontSize'];
	}
	if ( isset( $attributes['style']['typography']['lineHeight'] ) && '' !== $attributes['style']['typography']['lineHeight'] ) {
		$typography_args['lineHeight'] = (string) $attributes['style']['typography']['lineHeight'];
	}
	if ( isset( $attributes['style']['typography']['letterSpacing'] ) && '' !== $attributes['style']['typography']['letterSpacing'] ) {
		$typography_args['letterSpacing'] = $sgs_css_length( $attributes['style']['typography']['letterSpacing'] );
	}
	if ( isset( $attributes['style']['typography']['textTransform'] ) && '' !== $attributes['style']['typography']['textTransform'] ) {
		$typography_args['textTransform'] = $sgs_css_keyword( $attributes['style']['typography']['textTransform'] );
	}
	if ( isset( $attributes['style']['typography']['fontWeight'] ) && '' !== $attributes['style']['typography']['fontWeight'] ) {
		$typography_args['fontWeight'] = $sgs_css_keyword( (string) $attributes['style']['typography']['fontWeight'] );
	}
	if ( isset( $attributes['style']['typography']['fontStyle'] ) && '' !== $attributes['style']['typography']['fontStyle'] ) {
		$typography_args['fontStyle'] = $sgs_css_keyword( $attributes['style']['typography']['fontStyle'] );
	}
	if ( ! empty( $typography_args ) ) {
		$typography_scoped = wp_style_engine_get_styles(
			array( 'typography' => $typography_args ),
			array( 'selector' => $root_sel . ' .sgs-hero__headline' )
		);
		if ( ! empty( $typography_scoped['css'] ) ) {
			$responsive_css .= $typography_scoped['css'];
		}
	}
	if ( isset( $attributes['textAlign'] ) && in_array( $attributes['textAlign'], array( 'left', 'center', 'right' ), true ) ) {
		$responsive_css .= $root_sel . ' .sgs-hero__headline{text-align:' . $attributes['textAlign'] . '}';
	}
}

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/quote) so preset palette colours still resolve visually.
$hero_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$hero_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $hero_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $hero_preset_text_slug . '-color';
}
if ( '' !== $hero_preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $hero_preset_bg_slug . '-background-color';
}
// A CUSTOM background-colour or gradient (style.color.background / .gradient) also needs the
// `has-background` marker so the style.css default-gradient suppression
// (`.sgs-hero:not(.has-background)`, style.css line ~50) fires. Before the no-inline migration
// this was covered by the inline `[style*="background-color"]` selector; skip-serialisation moved
// the value to a scoped #uid <style> rule, so the inline selector no longer matches — re-add the
// class explicitly. Without this the framework's default primary-dark→primary gradient paints OVER
// a faithfully-transferred flat background (e.g. Mama's draft surface-pink #F5C2C8 read as dark
// pink). measurement-vs-eye recurrence (2026-05-05 hero-gradient incident); Bean-reported 2026-07-10.
$hero_custom_bg = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$hero_gradient  = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
if ( ( '' !== $hero_custom_bg || '' !== $hero_gradient ) && ! in_array( 'has-background', $classes, true ) ) {
	$classes[] = 'has-background';
}

// WS-4: the OUTER <section> is now rendered by SGS_Container_Wrapper::render() at
// the foot of this file (the element mirrors sgs/container). $classes + $styles
// ride through via extra_classes / extra_styles; hero keeps ALL its own media
// layers (LCP <img>, video, svg, overlay) as bespoke interior.

// Build video background.
// bgVideo / bgVideoMobile override the background image on their respective viewports.
// These attributes work independently of the 'video' variant — any variant can have a video bg.
$video_html        = '';
$has_variant_video = $is_video && ! empty( $bg_video['url'] );
$has_attr_video    = ! empty( $bg_video_attr['url'] );

if ( $has_variant_video || $has_attr_video ) {
	$desktop_src = ! empty( $bg_video_attr['url'] ) ? $bg_video_attr['url'] : ( $bg_video['url'] ?? '' );
	$mobile_src  = ! empty( $bg_video_mobile['url'] ) ? $bg_video_mobile['url'] : $desktop_src;

	if ( $desktop_src === $mobile_src ) {
		// Single source — no viewport switching needed.
		$video_html = sprintf(
			'<video class="sgs-hero__video-bg" autoplay loop muted playsinline aria-hidden="true">' .
			'<source src="%s" type="video/mp4"></video>',
			esc_url( $desktop_src )
		);
	} else {
		// Two sources — JS swaps src based on viewport via data attributes.
		$video_html = sprintf(
			'<video class="sgs-hero__video-bg sgs-hero__video-bg--responsive" autoplay loop muted playsinline aria-hidden="true"' .
			' data-src-desktop="%s" data-src-mobile="%s">' .
			'<source src="%s" type="video/mp4"></video>',
			esc_attr( $desktop_src ),
			esc_attr( $mobile_src ),
			esc_url( $desktop_src )
		);
	}
}

// Build standard background image element.
// Using an <img> instead of CSS background-image lets the browser discover the LCP
// resource early and apply fetchpriority="high". A static per-request counter ensures
// only the first hero on a page gets the high-priority hint.
$bg_img_html = '';
if ( $has_standard_bg_image ) {
	static $sgs_hero_count = 0;
	++$sgs_hero_count;

	$img_id         = ! empty( $bg_image['id'] ) ? absint( $bg_image['id'] ) : 0;
	$fetch_priority = 1 === $sgs_hero_count ? 'high' : 'auto';
	$loading        = 1 === $sgs_hero_count ? 'eager' : 'lazy';

	$img_attrs = array(
		'class'         => 'sgs-hero__bg-img',
		'aria-hidden'   => 'true',
		'fetchpriority' => $fetch_priority,
		'loading'       => $loading,
		'decoding'      => 1 === $sgs_hero_count ? 'sync' : 'async',
		'alt'           => '',
	);

	if ( $bg_parallax ) {
		$img_attrs['class'] .= ' sgs-hero__bg-img--parallax';
	}

	require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
	$bg_img_html = sgs_responsive_image(
		$img_id,
		$bg_image['url'],
		'',
		'full',
		$img_attrs
	);
}

// Build SVG background.
$svg_html = '';
if ( $is_svg_animated && ! empty( $svg_content ) ) {
	$svg_html = '<div class="sgs-hero__svg-bg" aria-hidden="true">' . wp_kses_post( $svg_content ) . '</div>';
}

// Build overlay. No-inline contract (§A): background-color/opacity move to the
// scoped <style> ($responsive_css, appended below) — the element carries only
// its class, no style="" attribute.
$overlay_html = '';
if ( ( ! $is_split && ! empty( $bg_image['url'] ) ) || $is_video || $is_svg_animated ) {
	$overlay_html    = '<span class="sgs-hero__overlay" aria-hidden="true"></span>';
	$responsive_css .= '.' . $uid . ' .sgs-hero__overlay{background-color:' . sgs_colour_value( $overlay_colour ) . ';opacity:' . esc_attr( $overlay_opacity / 100 ) . '}';
}

// FR-22-6: all content (label, headline, sub-headline, CTAs) is rendered via
// InnerBlocks. $content is the full serialised child-block output.

// Build badges.
$badges_html = '';
if ( ! empty( $badges ) ) {
	foreach ( $badges as $badge ) {
		$position = esc_attr( $badge['position'] ?? 'bottom-left' );
		$style    = esc_attr( $badge['style'] ?? 'light' );
		$number   = esc_html( $badge['number'] ?? '' );
		$suffix   = esc_html( $badge['suffix'] ?? '' );
		$label    = esc_html( $badge['label'] ?? '' );

		$badges_html .= sprintf(
			'<div class="sgs-hero__badge sgs-hero__badge--%s sgs-hero__badge--%s">' .
			'<span class="sgs-hero__badge-number">%s%s</span>' .
			'<span class="sgs-hero__badge-label">%s</span>' .
			'</div>',
			$position,
			$style,
			$number,
			$suffix,
			$label
		);
	}
	if ( $badges_html ) {
		$badges_html = '<div class="sgs-hero__badges">' . $badges_html . '</div>';
	}
}

// ── Build content column wrapper ───────────────────────────────────────────
// FR-22-6: content column wraps InnerBlocks ($content) directly. No-inline
// contract (§A): display/flex-direction/justify-content/background-color are
// ALL emitted scoped (.uid .sgs-hero__content{...}) above — this element
// carries NO style="" attribute any more.
// R-22-14: no scalar content rendering. $content = full InnerBlocks output
// (sgs/label + sgs/heading + sgs/text + sgs/button(s) supplied by converter).
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is WP core InnerBlocks output.
$content_html = '<div class="sgs-hero__content">' . $content . '</div>';

// ── Build split media area ─────────────────────────────────────────────────
$media_html = '';
// Video branch: when splitMedia is a video, defer to sgs_render_media() and skip
// the image pipeline entirely. The image branch below preserves the existing
// srcset / responsive handling for images (legacy splitImage path).
if ( $is_split && ! empty( $split_media ) && isset( $split_media['type'] ) && 'video' === $split_media['type'] && ! empty( $split_media['url'] ) ) {
	$media_class = 'sgs-hero__media';
	if ( $split_image_bleed ) {
		$media_class .= ' sgs-hero__media--bleed';
	}
	$media_html  = '<div class="' . esc_attr( $media_class ) . '">';
	$media_html .= sgs_render_media( $split_media, 'sgs/hero' );
	$media_html .= $badges_html;
	$media_html .= '</div>';
} elseif ( $is_split && ! empty( $split_image['url'] ) ) {
	// H13/H14: use responsive image helper for srcset + explicit dimensions.
	$img_id    = ! empty( $split_image['id'] ) ? absint( $split_image['id'] ) : 0;

	// No-inline contract (§A): object-fit / object-position / border-radius /
	// border-width/style/colour / imagePadding are ALL emitted scoped
	// (.uid .sgs-hero__split-image{...}) above — this element carries NO
	// style="" attribute any more.
	$img_attrs = array(
		'class'         => 'sgs-hero__split-image',
		'loading'       => 'eager',
		'decoding'      => 'async',
		'fetchpriority' => 'high',
	);
	if ( ! empty( $split_image['width'] ) ) {
		$img_attrs['width'] = absint( $split_image['width'] );
	}
	if ( ! empty( $split_image['height'] ) ) {
		$img_attrs['height'] = absint( $split_image['height'] );
	}

	// Fallback: if dimensions still missing, try to resolve them from WordPress
	// metadata. Prevents CLS when the editor hasn't stored the explicit size.
	if ( ! isset( $img_attrs['width'] ) || ! isset( $img_attrs['height'] ) ) {
		$resolve_id = $img_id;
		// If no ID was stored with the block, try to look up the attachment by URL.
		if ( 0 === $resolve_id && ! empty( $split_image['url'] ) ) {
			$resolve_id = absint( attachment_url_to_postid( $split_image['url'] ) );
		}
		if ( $resolve_id > 0 ) {
			$src_data = wp_get_attachment_image_src( $resolve_id, 'large' );
			if ( $src_data && ! empty( $src_data[1] ) && ! empty( $src_data[2] ) ) {
				$img_attrs['width']  = $img_attrs['width'] ?? (int) $src_data[1];
				$img_attrs['height'] = $img_attrs['height'] ?? (int) $src_data[2];
			}
		}
	}

	$media_class = 'sgs-hero__media';
	if ( $split_image_bleed ) {
		$media_class .= ' sgs-hero__media--bleed';
		// Also remove the border-radius on the image itself.
		$img_attrs['class'] .= ' sgs-hero__split-image--bleed';
	}

	// No-inline contract (§A): mediaBackground + mediaPadding are emitted
	// scoped (.uid .sgs-hero__media{...}) above — this element carries NO
	// style="" attribute any more.
	$media_html = '<div class="' . esc_attr( $media_class ) . '">';

	// If a separate mobile image is set, emit BOTH images and let CSS toggle by breakpoint.
	if ( ! empty( $split_image_mobile['url'] ) ) {
		$mobile_img_id    = ! empty( $split_image_mobile['id'] ) ? absint( $split_image_mobile['id'] ) : 0;
		// No-inline contract (§A): object-position moves to the scoped <style>.
		$mobile_img_attrs = array(
			'class'         => 'sgs-hero__split-image sgs-hero__split-image--mobile',
			'loading'       => 'eager',
			'decoding'      => 'async',
			'fetchpriority' => 'high',
		);
		$safe_mobile_object_position = $sgs_css_object_position( $split_image_mobile_object_position );
		if ( '' !== $safe_mobile_object_position ) {
			$responsive_css .= '.' . $uid . ' .sgs-hero__split-image--mobile{object-position:' . $safe_mobile_object_position . '}';
		}
		if ( ! empty( $split_image_mobile['width'] ) ) {
			$mobile_img_attrs['width'] = absint( $split_image_mobile['width'] );
		}
		if ( ! empty( $split_image_mobile['height'] ) ) {
			$mobile_img_attrs['height'] = absint( $split_image_mobile['height'] );
		}
		$media_html .= sgs_responsive_image(
			$mobile_img_id,
			$split_image_mobile['url'],
			$split_image_mobile['alt'] ?? '',
			'large',
			$mobile_img_attrs
		);

		// Mark the desktop image so CSS can hide it on mobile when both are present.
		$img_attrs['class'] .= ' sgs-hero__split-image--desktop';

		// Append the breakpoint-toggle CSS to the responsive_css output.
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-image--desktop{display:none}}';
		$responsive_css .= '@media (min-width:768px){.' . $uid . ' .sgs-hero__split-image--mobile{display:none}}';
	}

	$media_html .= sgs_responsive_image(
		$img_id,
		$split_image['url'],
		$split_image['alt'] ?? '',
		'large',
		$img_attrs
	);
	$media_html .= $badges_html;
	$media_html .= '</div>';
}

// Output responsive CSS if needed. wp_strip_all_tags (NOT esc_html) blocks a
// </style> breakout while leaving CSS combinators like `>` intact (contract
// §D — matches SGS_Container_Wrapper + sgs/quote + sgs/button). Every value
// reaching $responsive_css is pre-sanitised ($sgs_css_length / $sgs_css_keyword
// / $sgs_css_object_position / $sgs_box_shorthand / $sgs_radius_shorthand /
// absint / sgs_colour_value / wp_style_engine_get_styles), so no un-sanitised
// value survives to here.
if ( $responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) );
}

// WS-4: assemble hero's bespoke interior, then wrap it in the shared sgs/container
// element via the helper (section KIND). Hero renders ALL its own media layers
// (LCP <img>, bg-video, svg, overlay) + its own min-height (via $styles), so every
// attr that would drive a DUPLICATE helper layer is nulled in the helper's attr
// copy (C3 double-emit guard) and no_overlay is passed. In split mode wrap_inner
// is false so a stray contentWidth can never inject an __inner div that would sit
// between the section grid and its __content/__media grid items.
$hero_inner_html = $bg_img_html . $video_html . $svg_html . $overlay_html
	. $content_html . $media_html . ( ! $is_split ? $badges_html : '' );

$hero_helper_attrs = $attributes;
foreach ( array(
	'backgroundImage',
	'backgroundImageTablet',
	'backgroundImageMobile',
	'backgroundVideo',
	'bgVideo',
	'bgVideoMobile',
	'bgSvgContent',
	'minHeight',
	'minHeightTablet',
	'minHeightMobile',
) as $sgs_hero_null_attr ) {
	$hero_helper_attrs[ $sgs_hero_null_attr ] = null;
}

$hero_helper_opts = array(
	'tag'           => 'section',
	'extra_classes' => $classes,
	'extra_styles'  => $styles,
	'no_overlay'    => true,
);
if ( $is_split ) {
	$hero_helper_opts['wrap_inner'] = false;
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- helper returns an escaped wrapper; $hero_inner_html built with esc_url/esc_html/esc_attr above; $content is WP core InnerBlocks output.
echo SGS_Container_Wrapper::render( $hero_helper_attrs, $block, $hero_inner_html, 'section', $hero_helper_opts );
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
