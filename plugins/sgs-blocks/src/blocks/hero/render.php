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
 *   backgroundVideo, svgContent, minHeight*, badges, hoverBackground/Text/Border,
 *   transitionDuration, transitionEasing, bgParallax, bgKenBurns, bgVideo*,
 *   splitImageBleed, ctaPrimary/SecondaryHover*,
 *   headline/subHeadlineMarginBottom*, subHeadlineMaxWidth, splitImageMobileHeight,
 *   imageObjectFit/Position, image*Width/Height*, imageBorderRadius*,
 *   imageBorderStyle/Width/Colour*, imagePadding*, mediaBackgroundColour,
 *   mediaPadding*, contentPadding*, splitColumnRatio*, splitGap*,
 *   splitContentOrderMobile, verticalAlignment, ctaGap*.
 *   Headline / sub-headline / label FONT-SIZE (all breakpoints) is owned by the
 *   child sgs/heading / sgs/text / sgs/label blocks — not emitted here.
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
$overlay_colour      = sgs_colour_value( $attributes['backgroundOverlayColour'] ?? ( $attributes['overlayColour'] ?? 'text' ) );
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
$min_height          = $attributes['minHeight'] ?? '';
$min_height_tablet   = $attributes['minHeightTablet'] ?? '';
$min_height_mobile   = $attributes['minHeightMobile'] ?? '360px';
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

$hover_background_colour = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour       = $attributes['hoverTextColour'] ?? '';
$hover_border_colour     = $attributes['hoverBorderColour'] ?? '';
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
$image_width_unit   = $attributes['imageWidthUnit'] ?? '%';

$image_height        = $attributes['imageHeight'] ?? null;
$image_height_tablet = $attributes['imageHeightTablet'] ?? null;
$image_height_mobile = $attributes['imageHeightMobile'] ?? null;
$image_height_unit   = $attributes['imageHeightUnit'] ?? 'px';

// Image border radius (per-corner, per-breakpoint).
$image_br_tl        = $attributes['imageBorderRadiusTL'] ?? 0;
$image_br_tr        = $attributes['imageBorderRadiusTR'] ?? 0;
$image_br_br        = $attributes['imageBorderRadiusBR'] ?? 0;
$image_br_bl        = $attributes['imageBorderRadiusBL'] ?? 0;
$image_br_tab_tl    = $attributes['imageBorderRadiusTabletTL'] ?? null;
$image_br_tab_tr    = $attributes['imageBorderRadiusTabletTR'] ?? null;
$image_br_tab_br    = $attributes['imageBorderRadiusTabletBR'] ?? null;
$image_br_tab_bl    = $attributes['imageBorderRadiusTabletBL'] ?? null;
$image_br_mob_tl    = $attributes['imageBorderRadiusMobileTL'] ?? null;
$image_br_mob_tr    = $attributes['imageBorderRadiusMobileTR'] ?? null;
$image_br_mob_br    = $attributes['imageBorderRadiusMobileBR'] ?? null;
$image_br_mob_bl    = $attributes['imageBorderRadiusMobileBL'] ?? null;
$image_br_unit      = $attributes['imageBorderRadiusUnit'] ?? 'px';

// Image border.
$image_border_style       = $attributes['imageBorderStyle'] ?? 'none';
$image_border_width_top   = $attributes['imageBorderWidthTop'] ?? 0;
$image_border_width_right = $attributes['imageBorderWidthRight'] ?? 0;
$image_border_width_bot   = $attributes['imageBorderWidthBottom'] ?? 0;
$image_border_width_left  = $attributes['imageBorderWidthLeft'] ?? 0;
$image_border_width_unit  = $attributes['imageBorderWidthUnit'] ?? 'px';
$image_border_colour      = $attributes['imageBorderColour'] ?? '';

// imagePadding — inner padding on the <img> element itself.
$image_pad_top      = $attributes['imagePaddingTop'] ?? 0;
$image_pad_right    = $attributes['imagePaddingRight'] ?? 0;
$image_pad_bottom   = $attributes['imagePaddingBottom'] ?? 0;
$image_pad_left     = $attributes['imagePaddingLeft'] ?? 0;
$image_pad_tab_top  = $attributes['imagePaddingTopTablet'] ?? null;
$image_pad_tab_right = $attributes['imagePaddingRightTablet'] ?? null;
$image_pad_tab_bot  = $attributes['imagePaddingBottomTablet'] ?? null;
$image_pad_tab_left = $attributes['imagePaddingLeftTablet'] ?? null;
$image_pad_mob_top  = $attributes['imagePaddingTopMobile'] ?? null;
$image_pad_mob_right = $attributes['imagePaddingRightMobile'] ?? null;
$image_pad_mob_bot  = $attributes['imagePaddingBottomMobile'] ?? null;
$image_pad_mob_left = $attributes['imagePaddingLeftMobile'] ?? null;
$image_pad_unit     = $attributes['imagePaddingUnit'] ?? 'px';

// mediaPadding — outer padding on the .sgs-hero__media wrapper.
$media_bg_colour    = $attributes['mediaBackgroundColour'] ?? '';
$media_pad_top      = $attributes['mediaPaddingTop'] ?? null;
$media_pad_right    = $attributes['mediaPaddingRight'] ?? null;
$media_pad_bottom   = $attributes['mediaPaddingBottom'] ?? null;
$media_pad_left     = $attributes['mediaPaddingLeft'] ?? null;
$media_pad_tab_top  = $attributes['mediaPaddingTopTablet'] ?? null;
$media_pad_tab_right = $attributes['mediaPaddingRightTablet'] ?? null;
$media_pad_tab_bot  = $attributes['mediaPaddingBottomTablet'] ?? null;
$media_pad_tab_left = $attributes['mediaPaddingLeftTablet'] ?? null;
$media_pad_mob_top  = $attributes['mediaPaddingTopMobile'] ?? null;
$media_pad_mob_right = $attributes['mediaPaddingRightMobile'] ?? null;
$media_pad_mob_bot  = $attributes['mediaPaddingBottomMobile'] ?? null;
$media_pad_mob_left = $attributes['mediaPaddingLeftMobile'] ?? null;
$media_pad_unit     = $attributes['mediaPaddingUnit'] ?? 'px';

// contentPadding — padding on the .sgs-hero__content wrapper.
$content_pad_top      = $attributes['contentPaddingTop'] ?? null;
$content_pad_right    = $attributes['contentPaddingRight'] ?? null;
$content_pad_bottom   = $attributes['contentPaddingBottom'] ?? null;
$content_pad_left     = $attributes['contentPaddingLeft'] ?? null;
$content_pad_tab_top  = $attributes['contentPaddingTopTablet'] ?? null;
$content_pad_tab_right = $attributes['contentPaddingRightTablet'] ?? null;
$content_pad_tab_bot  = $attributes['contentPaddingBottomTablet'] ?? null;
$content_pad_tab_left = $attributes['contentPaddingLeftTablet'] ?? null;
$content_pad_mob_top  = $attributes['contentPaddingTopMobile'] ?? null;
$content_pad_mob_right = $attributes['contentPaddingRightMobile'] ?? null;
$content_pad_mob_bot  = $attributes['contentPaddingBottomMobile'] ?? null;
$content_pad_mob_left = $attributes['contentPaddingLeftMobile'] ?? null;
$content_pad_unit     = $attributes['contentPaddingUnit'] ?? 'px';

// HC2: per-breakpoint text-align on .sgs-hero__content. Desktop = base rule
// (no @media), tablet/mobile via the scoped <style> @media mechanism — mirrors
// the existing responsive-CSS builder. Empty string / 'inherit' = no emit so
// unset instances keep the variant's own alignment (sgs-hero--align-*).
$text_align_desktop = $attributes['textAlignDesktop'] ?? '';
$text_align_tablet  = $attributes['textAlignTablet'] ?? '';
$text_align_mobile  = $attributes['textAlignMobile'] ?? '';
$allowed_text_align = array( 'left', 'center', 'right', 'start', 'end', 'justify' );

// Layout grid (split variant).
$split_col_ratio        = $attributes['splitColumnRatio'] ?? '1fr 1fr';
$split_col_ratio_tablet = $attributes['splitColumnRatioTablet'] ?? '';
$split_col_ratio_mobile = $attributes['splitColumnRatioMobile'] ?? '';
$split_gap              = $attributes['splitGap'] ?? 0;
$split_gap_tablet       = $attributes['splitGapTablet'] ?? null;
$split_gap_mobile       = $attributes['splitGapMobile'] ?? null;
$split_gap_unit         = $attributes['splitGapUnit'] ?? 'px';
$split_order_mobile     = $attributes['splitContentOrderMobile'] ?? 'media-first';

// HC2: CTA row gap (.sgs-hero__ctas). Emitted as the --sgs-hero-cta-gap custom
// property which style.css consumes with the legacy spacing--30 default as the
// fallback — so an instance whose control was never touched is byte-unchanged.
// ctaGap has a schema default (12), so gate desktop emit on the attr being
// PRESENT in $attributes (operator actually set it), not on a non-null read.
$cta_gap_unit   = $attributes['ctaGapUnit'] ?? 'px';
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
if ( ! empty( $min_height ) ) {
	$styles[] = 'min-height:' . esc_attr( $min_height );
}

// Transition custom properties — consumed by CSS vars on the block and its children.
$styles = array_merge( $styles, sgs_transition_vars( $attributes ) );

// HC2: desktop CTA-row gap. Only emitted when the operator actually set ctaGap
// (array_key_exists) so untouched instances fall through to style.css's legacy
// var(--wp--preset--spacing--30) fallback and stay byte-identical. Wrapper-level
// custom property (not an inline gap) so the @media tablet/mobile overrides win.
if ( null !== $cta_gap ) {
	$styles[] = '--sgs-hero-cta-gap:' . $cta_gap . esc_attr( $cta_gap_unit );
}

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

// Split variant: replace the default flex layout with CSS Grid.
if ( $is_split ) {
	// Allowlist the ratio string: only fr, px, %, numbers, spaces, auto, calc() permitted.
	$safe_ratio = preg_match( '/^[\d.\s%a-zA-Z()+\-*\/]+$/', $split_col_ratio ) ? $split_col_ratio : '1fr 1fr';
	$styles[]   = 'display:grid';
	$styles[]   = 'grid-template-columns:' . $safe_ratio;
	$gap_val    = null !== $split_gap ? absint( $split_gap ) . esc_attr( $split_gap_unit ) : '0px';
	$styles[]   = 'gap:' . $gap_val;
}

// Standard variant: use <img> instead of CSS background-image so the browser can
// discover the LCP resource early and apply fetchpriority="high".
$has_standard_bg_image = ! $is_split && ! $is_video && ! $is_svg_animated
	&& ! empty( $bg_image['url'] );

// Generate a unique ID for responsive CSS scoping.
$uid = 'sgs-hero-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );

// ── Responsive CSS builder ──────────────────────────────────────────────────
$responsive_css = '';
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

// ── Split variant: tablet/mobile grid overrides ────────────────────────────
if ( $is_split ) {
	// Tablet grid-template-columns override.
	if ( $split_col_ratio_tablet ) {
		$safe_ratio_tab = preg_match( '/^[\d.\s%a-zA-Z()+\-*\/]+$/', $split_col_ratio_tablet ) ? $split_col_ratio_tablet : '';
		if ( $safe_ratio_tab ) {
			$responsive_css .= '@media (max-width:1023px){.' . $uid . '{grid-template-columns:' . $safe_ratio_tab . '}}';
		}
	}
	// Mobile grid-template-columns override. When splitColumnRatioMobile is
	// empty, default to single-column stacking (1fr) — the desktop ratio
	// inline-style would otherwise force two-column layout at mobile widths.
	$ratio_mob = $split_col_ratio_mobile;
	if ( ! $ratio_mob ) {
		$ratio_mob = '1fr';
	}
	$safe_ratio_mob = preg_match( '/^[\d.\s%a-zA-Z()+\-*\/]+$/', $ratio_mob ) ? $ratio_mob : '';
	if ( $safe_ratio_mob ) {
		// !important required to override the inline style="grid-template-columns:..."
		// emitted on the section element (line ~249). Without it the desktop ratio
		// would persist at mobile widths because inline > external CSS specificity.
		$responsive_css .= '@media (max-width:767px){.' . $uid . '{grid-template-columns:' . $safe_ratio_mob . ' !important}}';
	}
	// Tablet gap override.
	if ( null !== $split_gap_tablet ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . '{gap:' . absint( $split_gap_tablet ) . esc_attr( $split_gap_unit ) . '}}';
	}
	// Mobile gap override.
	if ( null !== $split_gap_mobile ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . '{gap:' . absint( $split_gap_mobile ) . esc_attr( $split_gap_unit ) . '}}';
	}
	// Mobile column order.
	if ( 'content-first' === $split_order_mobile ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__content{order:1}.' . $uid . ' .sgs-hero__media{order:2}}';
	} else {
		// media-first (default).
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__media{order:1}.' . $uid . ' .sgs-hero__content{order:2}}';
	}
}

// ── imagePadding: tablet / mobile overrides (on the <img> element) ─────────
$img_pad_desktop_has_value = ( $image_pad_top > 0 || $image_pad_right > 0 || $image_pad_bottom > 0 || $image_pad_left > 0 );
if ( null !== $image_pad_tab_top || null !== $image_pad_tab_right || null !== $image_pad_tab_bot || null !== $image_pad_tab_left ) {
	$tab_pt = null !== $image_pad_tab_top ? absint( $image_pad_tab_top ) : absint( $image_pad_top );
	$tab_pr = null !== $image_pad_tab_right ? absint( $image_pad_tab_right ) : absint( $image_pad_right );
	$tab_pb = null !== $image_pad_tab_bot ? absint( $image_pad_tab_bot ) : absint( $image_pad_bottom );
	$tab_pl = null !== $image_pad_tab_left ? absint( $image_pad_tab_left ) : absint( $image_pad_left );
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-image{padding:' . $tab_pt . esc_attr( $image_pad_unit ) . ' ' . $tab_pr . esc_attr( $image_pad_unit ) . ' ' . $tab_pb . esc_attr( $image_pad_unit ) . ' ' . $tab_pl . esc_attr( $image_pad_unit ) . '}}';
}
if ( null !== $image_pad_mob_top || null !== $image_pad_mob_right || null !== $image_pad_mob_bot || null !== $image_pad_mob_left ) {
	$mob_pt = null !== $image_pad_mob_top ? absint( $image_pad_mob_top ) : absint( $image_pad_top );
	$mob_pr = null !== $image_pad_mob_right ? absint( $image_pad_mob_right ) : absint( $image_pad_right );
	$mob_pb = null !== $image_pad_mob_bot ? absint( $image_pad_mob_bot ) : absint( $image_pad_bottom );
	$mob_pl = null !== $image_pad_mob_left ? absint( $image_pad_mob_left ) : absint( $image_pad_left );
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-image{padding:' . $mob_pt . esc_attr( $image_pad_unit ) . ' ' . $mob_pr . esc_attr( $image_pad_unit ) . ' ' . $mob_pb . esc_attr( $image_pad_unit ) . ' ' . $mob_pl . esc_attr( $image_pad_unit ) . '}}';
}

// ── imageBorderRadius: tablet / mobile overrides ───────────────────────────
$br_tab_has = ( null !== $image_br_tab_tl || null !== $image_br_tab_tr || null !== $image_br_tab_br || null !== $image_br_tab_bl );
if ( $br_tab_has ) {
	$tab_tl = null !== $image_br_tab_tl ? absint( $image_br_tab_tl ) : absint( $image_br_tl );
	$tab_tr = null !== $image_br_tab_tr ? absint( $image_br_tab_tr ) : absint( $image_br_tr );
	$tab_br = null !== $image_br_tab_br ? absint( $image_br_tab_br ) : absint( $image_br_br );
	$tab_bl = null !== $image_br_tab_bl ? absint( $image_br_tab_bl ) : absint( $image_br_bl );
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-image{border-radius:' . $tab_tl . esc_attr( $image_br_unit ) . ' ' . $tab_tr . esc_attr( $image_br_unit ) . ' ' . $tab_br . esc_attr( $image_br_unit ) . ' ' . $tab_bl . esc_attr( $image_br_unit ) . '}}';
}
$br_mob_has = ( null !== $image_br_mob_tl || null !== $image_br_mob_tr || null !== $image_br_mob_br || null !== $image_br_mob_bl );
if ( $br_mob_has ) {
	$mob_tl = null !== $image_br_mob_tl ? absint( $image_br_mob_tl ) : absint( $image_br_tl );
	$mob_tr = null !== $image_br_mob_tr ? absint( $image_br_mob_tr ) : absint( $image_br_tr );
	$mob_br = null !== $image_br_mob_br ? absint( $image_br_mob_br ) : absint( $image_br_br );
	$mob_bl = null !== $image_br_mob_bl ? absint( $image_br_mob_bl ) : absint( $image_br_bl );
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-image{border-radius:' . $mob_tl . esc_attr( $image_br_unit ) . ' ' . $mob_tr . esc_attr( $image_br_unit ) . ' ' . $mob_br . esc_attr( $image_br_unit ) . ' ' . $mob_bl . esc_attr( $image_br_unit ) . '}}';
}

// ── imageWidth / imageHeight: tablet / mobile overrides (custom fit only) ──
if ( 'custom' === $image_object_fit ) {
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

// ── mediaPadding: tablet / mobile overrides (on .sgs-hero__media) ──────────
if ( null !== $media_pad_tab_top || null !== $media_pad_tab_right || null !== $media_pad_tab_bot || null !== $media_pad_tab_left ) {
	$tab_mpt = null !== $media_pad_tab_top ? absint( $media_pad_tab_top ) : ( null !== $media_pad_top ? absint( $media_pad_top ) : 0 );
	$tab_mpr = null !== $media_pad_tab_right ? absint( $media_pad_tab_right ) : ( null !== $media_pad_right ? absint( $media_pad_right ) : 0 );
	$tab_mpb = null !== $media_pad_tab_bot ? absint( $media_pad_tab_bot ) : ( null !== $media_pad_bottom ? absint( $media_pad_bottom ) : 0 );
	$tab_mpl = null !== $media_pad_tab_left ? absint( $media_pad_tab_left ) : ( null !== $media_pad_left ? absint( $media_pad_left ) : 0 );
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__media{padding:' . $tab_mpt . esc_attr( $media_pad_unit ) . ' ' . $tab_mpr . esc_attr( $media_pad_unit ) . ' ' . $tab_mpb . esc_attr( $media_pad_unit ) . ' ' . $tab_mpl . esc_attr( $media_pad_unit ) . '}}';
}
if ( null !== $media_pad_mob_top || null !== $media_pad_mob_right || null !== $media_pad_mob_bot || null !== $media_pad_mob_left ) {
	$mob_mpt = null !== $media_pad_mob_top ? absint( $media_pad_mob_top ) : ( null !== $media_pad_top ? absint( $media_pad_top ) : 0 );
	$mob_mpr = null !== $media_pad_mob_right ? absint( $media_pad_mob_right ) : ( null !== $media_pad_right ? absint( $media_pad_right ) : 0 );
	$mob_mpb = null !== $media_pad_mob_bot ? absint( $media_pad_mob_bot ) : ( null !== $media_pad_bottom ? absint( $media_pad_bottom ) : 0 );
	$mob_mpl = null !== $media_pad_mob_left ? absint( $media_pad_mob_left ) : ( null !== $media_pad_left ? absint( $media_pad_left ) : 0 );
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__media{padding:' . $mob_mpt . esc_attr( $media_pad_unit ) . ' ' . $mob_mpr . esc_attr( $media_pad_unit ) . ' ' . $mob_mpb . esc_attr( $media_pad_unit ) . ' ' . $mob_mpl . esc_attr( $media_pad_unit ) . '}}';
}

// ── contentPadding: tablet / mobile overrides ──────────────────────────────
if ( null !== $content_pad_tab_top || null !== $content_pad_tab_right || null !== $content_pad_tab_bot || null !== $content_pad_tab_left ) {
	$tab_cpt = null !== $content_pad_tab_top ? absint( $content_pad_tab_top ) : ( null !== $content_pad_top ? absint( $content_pad_top ) : 0 );
	$tab_cpr = null !== $content_pad_tab_right ? absint( $content_pad_tab_right ) : ( null !== $content_pad_right ? absint( $content_pad_right ) : 0 );
	$tab_cpb = null !== $content_pad_tab_bot ? absint( $content_pad_tab_bot ) : ( null !== $content_pad_bottom ? absint( $content_pad_bottom ) : 0 );
	$tab_cpl = null !== $content_pad_tab_left ? absint( $content_pad_tab_left ) : ( null !== $content_pad_left ? absint( $content_pad_left ) : 0 );
	// !important required to beat the desktop inline-style on .sgs-hero__content emitted by the styles[] array (F4 fix from hero-poc-qc-2026-05-04.md).
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__content{padding:' . $tab_cpt . esc_attr( $content_pad_unit ) . ' ' . $tab_cpr . esc_attr( $content_pad_unit ) . ' ' . $tab_cpb . esc_attr( $content_pad_unit ) . ' ' . $tab_cpl . esc_attr( $content_pad_unit ) . ' !important}}';
}
if ( null !== $content_pad_mob_top || null !== $content_pad_mob_right || null !== $content_pad_mob_bot || null !== $content_pad_mob_left ) {
	$mob_cpt = null !== $content_pad_mob_top ? absint( $content_pad_mob_top ) : ( null !== $content_pad_top ? absint( $content_pad_top ) : 0 );
	$mob_cpr = null !== $content_pad_mob_right ? absint( $content_pad_mob_right ) : ( null !== $content_pad_right ? absint( $content_pad_right ) : 0 );
	$mob_cpb = null !== $content_pad_mob_bot ? absint( $content_pad_mob_bot ) : ( null !== $content_pad_bottom ? absint( $content_pad_bottom ) : 0 );
	$mob_cpl = null !== $content_pad_mob_left ? absint( $content_pad_mob_left ) : ( null !== $content_pad_left ? absint( $content_pad_left ) : 0 );
	// !important required to beat the desktop inline-style on .sgs-hero__content emitted by the styles[] array (F4 fix from hero-poc-qc-2026-05-04.md).
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__content{padding:' . $mob_cpt . esc_attr( $content_pad_unit ) . ' ' . $mob_cpr . esc_attr( $content_pad_unit ) . ' ' . $mob_cpb . esc_attr( $content_pad_unit ) . ' ' . $mob_cpl . esc_attr( $content_pad_unit ) . ' !important}}';
}

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
// Desktop value → --sgs-hero-cta-gap on the wrapper (style.css falls back to
// the legacy spacing--30 when unset). Tablet/mobile re-set the property within
// @media so the cascade beats the desktop value — Rule 6 (no losing inline).
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

// Build overlay.
$overlay_html = '';
if ( ( ! $is_split && ! empty( $bg_image['url'] ) ) || $is_video || $is_svg_animated ) {
	$overlay_style = sprintf(
		'background-color:%s;opacity:%s',
		$overlay_colour,
		esc_attr( $overlay_opacity / 100 )
	);
	$overlay_html  = '<span class="sgs-hero__overlay" style="' . esc_attr( $overlay_style ) . '" aria-hidden="true"></span>';
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
// FR-22-6: content column wraps InnerBlocks ($content) directly.
// Vertical alignment: top → flex-start, center → center, bottom → flex-end.
$v_align_map = array(
	'top'    => 'flex-start',
	'center' => 'center',
	'bottom' => 'flex-end',
);
$justify_content = $v_align_map[ $vertical_alignment ] ?? 'center';

$content_styles = array(
	'display:flex',
	'flex-direction:column',
	'justify-content:' . $justify_content,
);
if ( null !== $content_pad_top || null !== $content_pad_right || null !== $content_pad_bottom || null !== $content_pad_left ) {
	$cpt = null !== $content_pad_top ? absint( $content_pad_top ) : 0;
	$cpr = null !== $content_pad_right ? absint( $content_pad_right ) : 0;
	$cpb = null !== $content_pad_bottom ? absint( $content_pad_bottom ) : 0;
	$cpl = null !== $content_pad_left ? absint( $content_pad_left ) : 0;
	$content_styles[] = 'padding:' . $cpt . esc_attr( $content_pad_unit ) . ' ' . $cpr . esc_attr( $content_pad_unit ) . ' ' . $cpb . esc_attr( $content_pad_unit ) . ' ' . $cpl . esc_attr( $content_pad_unit );
}
$content_style_attr = ' style="' . implode( ';', $content_styles ) . '"';

// R-22-14: no scalar content rendering. $content = full InnerBlocks output
// (sgs/label + sgs/heading + sgs/text + sgs/button(s) supplied by converter).
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is WP core InnerBlocks output.
$content_html = '<div class="sgs-hero__content"' . $content_style_attr . '>' . $content . '</div>';

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

	// ── Build <img> inline styles ────────────────────────────────────────
	$img_styles = array();

	// object-fit.
	if ( 'custom' !== $image_object_fit ) {
		$allowed_fits = array( 'fill', 'contain', 'cover', 'match-height', 'match-width', 'none' );
		$safe_fit     = in_array( $image_object_fit, $allowed_fits, true ) ? $image_object_fit : 'cover';
		$img_styles[] = 'object-fit:' . $safe_fit;
	} else {
		// Custom: explicit width + height control.
		if ( null !== $image_width ) {
			$img_styles[] = 'width:' . absint( $image_width ) . esc_attr( $image_width_unit );
		}
		if ( null !== $image_height ) {
			$img_styles[] = 'height:' . absint( $image_height ) . esc_attr( $image_height_unit );
		}
	}

	// object-position.
	$img_styles[] = 'object-position:' . esc_attr( $image_object_position );

	// border-radius (desktop).
	$img_styles[] = 'border-radius:' . absint( $image_br_tl ) . esc_attr( $image_br_unit ) . ' ' . absint( $image_br_tr ) . esc_attr( $image_br_unit ) . ' ' . absint( $image_br_br ) . esc_attr( $image_br_unit ) . ' ' . absint( $image_br_bl ) . esc_attr( $image_br_unit );

	// border — only emit when style is not none OR any width > 0.
	$border_has_width = ( $image_border_width_top > 0 || $image_border_width_right > 0 || $image_border_width_bot > 0 || $image_border_width_left > 0 );
	if ( 'none' !== $image_border_style || $border_has_width ) {
		$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
		$safe_border_style     = in_array( $image_border_style, $allowed_border_styles, true ) ? $image_border_style : 'solid';
		$img_styles[]          = 'border-style:' . $safe_border_style;
		$img_styles[]          = 'border-width:' . absint( $image_border_width_top ) . esc_attr( $image_border_width_unit ) . ' ' . absint( $image_border_width_right ) . esc_attr( $image_border_width_unit ) . ' ' . absint( $image_border_width_bot ) . esc_attr( $image_border_width_unit ) . ' ' . absint( $image_border_width_left ) . esc_attr( $image_border_width_unit );
		if ( $image_border_colour ) {
			$img_styles[] = 'border-color:' . sgs_colour_value( $image_border_colour );
		}
	}

	// imagePadding — inner padding on the <img> element.
	if ( $image_pad_top > 0 || $image_pad_right > 0 || $image_pad_bottom > 0 || $image_pad_left > 0 ) {
		$img_styles[] = 'padding:' . absint( $image_pad_top ) . esc_attr( $image_pad_unit ) . ' ' . absint( $image_pad_right ) . esc_attr( $image_pad_unit ) . ' ' . absint( $image_pad_bottom ) . esc_attr( $image_pad_unit ) . ' ' . absint( $image_pad_left ) . esc_attr( $image_pad_unit );
	}

	$img_attrs = array(
		'class'         => 'sgs-hero__split-image',
		'loading'       => 'eager',
		'decoding'      => 'async',
		'fetchpriority' => 'high',
		'style'         => implode( ';', $img_styles ) . ';',
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

	// ── Build .sgs-hero__media wrapper inline styles ──────────────────────
	$media_styles = array();
	if ( $media_bg_colour ) {
		$media_styles[] = 'background-color:' . sgs_colour_value( $media_bg_colour );
	}
	// mediaPadding — outer padding on .sgs-hero__media wrapper (desktop).
	if ( null !== $media_pad_top || null !== $media_pad_right || null !== $media_pad_bottom || null !== $media_pad_left ) {
		$mpt            = null !== $media_pad_top ? absint( $media_pad_top ) : 0;
		$mpr            = null !== $media_pad_right ? absint( $media_pad_right ) : 0;
		$mpb            = null !== $media_pad_bottom ? absint( $media_pad_bottom ) : 0;
		$mpl            = null !== $media_pad_left ? absint( $media_pad_left ) : 0;
		$media_styles[] = 'padding:' . $mpt . esc_attr( $media_pad_unit ) . ' ' . $mpr . esc_attr( $media_pad_unit ) . ' ' . $mpb . esc_attr( $media_pad_unit ) . ' ' . $mpl . esc_attr( $media_pad_unit );
	}
	$media_style_attr = $media_styles ? ' style="' . implode( ';', $media_styles ) . '"' : '';

	$media_html = '<div class="' . esc_attr( $media_class ) . '"' . $media_style_attr . '>';

	// If a separate mobile image is set, emit BOTH images and let CSS toggle by breakpoint.
	if ( ! empty( $split_image_mobile['url'] ) ) {
		$mobile_img_id    = ! empty( $split_image_mobile['id'] ) ? absint( $split_image_mobile['id'] ) : 0;
		$mobile_img_attrs = array(
			'class'         => 'sgs-hero__split-image sgs-hero__split-image--mobile',
			'loading'       => 'eager',
			'decoding'      => 'async',
			'fetchpriority' => 'high',
			'style'         => 'object-position:' . esc_attr( $split_image_mobile_object_position ) . ';',
		);
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

// Output responsive CSS if needed.
if ( $responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $responsive_css built from esc_attr() values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), $responsive_css );
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
