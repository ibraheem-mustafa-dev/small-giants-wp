<?php
/**
 * Server-side render for the SGS Hero block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$variant             = $attributes['variant'] ?? 'standard';
$headline            = $attributes['headline'] ?? '';
$sub_headline        = $attributes['subHeadline'] ?? '';
$alignment           = $attributes['alignment'] ?? 'left';
$bg_image            = $attributes['backgroundImage'] ?? null;
$overlay_colour      = sgs_colour_value( $attributes['overlayColour'] ?? 'text' );
$overlay_opacity     = $attributes['overlayOpacity'] ?? 50;
$split_image         = $attributes['splitImage'] ?? null;
$split_image_mobile  = $attributes['splitImageMobile'] ?? null;
$split_image_mobile_object_position = $attributes['splitImageMobileObjectPosition'] ?? 'center 20%';
$label               = $attributes['label'] ?? '';
$bg_video            = $attributes['backgroundVideo'] ?? null;
$svg_content         = $attributes['svgContent'] ?? '';
$min_height          = $attributes['minHeight'] ?? '';
$min_height_tablet   = $attributes['minHeightTablet'] ?? '';
$min_height_mobile   = $attributes['minHeightMobile'] ?? '360px';
$badges              = $attributes['badges'] ?? array();
$cta_primary_text    = $attributes['ctaPrimaryText'] ?? '';
$cta_primary_url     = $attributes['ctaPrimaryUrl'] ?? '';
$cta_primary_style   = $attributes['ctaPrimaryStyle'] ?? 'accent';
$cta_secondary_text  = $attributes['ctaSecondaryText'] ?? '';
$cta_secondary_url   = $attributes['ctaSecondaryUrl'] ?? '';
$cta_secondary_style = $attributes['ctaSecondaryStyle'] ?? 'outline';

$headline_colour               = $attributes['headlineColour'] ?? '';
$sub_headline_font_size        = $attributes['subHeadlineFontSize'] ?? '';
$sub_headline_font_size_tablet = $attributes['subHeadlineFontSizeTablet'] ?? '';
$sub_headline_font_size_mobile = $attributes['subHeadlineFontSizeMobile'] ?? '';
$sub_headline_colour           = $attributes['subHeadlineColour'] ?? '';
$cta_primary_colour            = $attributes['ctaPrimaryColour'] ?? '';
$cta_primary_bg                = $attributes['ctaPrimaryBackground'] ?? '';
$cta_secondary_colour          = $attributes['ctaSecondaryColour'] ?? '';
$cta_secondary_bg              = $attributes['ctaSecondaryBackground'] ?? '';

// Per-breakpoint typography controls (new in v2).
$headline_font_size_desktop = $attributes['headlineFontSizeDesktop'] ?? null;
$headline_font_size_tablet  = $attributes['headlineFontSizeTablet'] ?? null;
$headline_font_size_mobile  = $attributes['headlineFontSizeMobile'] ?? null;
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

// Sub-headline typography (new Phase 1 attributes).
$sub_headline_font_family      = $attributes['subHeadlineFontFamily'] ?? '';
$sub_headline_font_weight      = $attributes['subHeadlineFontWeight'] ?? '';
$sub_headline_line_height      = $attributes['subHeadlineLineHeight'] ?? null;
$sub_headline_lh_unit          = $attributes['subHeadlineLineHeightUnit'] ?? 'em';
$sub_headline_letter_spacing   = $attributes['subHeadlineLetterSpacing'] ?? null;
$sub_headline_ls_unit          = $attributes['subHeadlineLetterSpacingUnit'] ?? 'px';
$sub_headline_text_transform   = $attributes['subHeadlineTextTransform'] ?? '';
$sub_headline_text_decoration  = $attributes['subHeadlineTextDecoration'] ?? '';

// Label (eyebrow) typography.
$label_font_family     = $attributes['labelFontFamily'] ?? '';
$label_font_size       = $attributes['labelFontSize'] ?? null;
$label_font_size_tab   = $attributes['labelFontSizeTablet'] ?? null;
$label_font_size_mob   = $attributes['labelFontSizeMobile'] ?? null;
$label_font_size_unit  = $attributes['labelFontSizeUnit'] ?? 'px';
$label_font_weight     = $attributes['labelFontWeight'] ?? '600';
$label_line_height     = $attributes['labelLineHeight'] ?? 1.2;
$label_lh_unit         = $attributes['labelLineHeightUnit'] ?? 'em';
$label_letter_spacing  = $attributes['labelLetterSpacing'] ?? null;
$label_ls_unit         = $attributes['labelLetterSpacingUnit'] ?? 'em';
$label_text_transform  = $attributes['labelTextTransform'] ?? 'uppercase';
$label_text_decoration = $attributes['labelTextDecoration'] ?? '';
$label_colour          = $attributes['labelColour'] ?? '';
$label_margin_bottom   = $attributes['labelMarginBottom'] ?? 8;
$label_mb_unit         = $attributes['labelMarginBottomUnit'] ?? 'px';

// Layout grid (split variant).
$split_col_ratio        = $attributes['splitColumnRatio'] ?? '1fr 1fr';
$split_col_ratio_tablet = $attributes['splitColumnRatioTablet'] ?? '';
$split_col_ratio_mobile = $attributes['splitColumnRatioMobile'] ?? '';
$split_gap              = $attributes['splitGap'] ?? 0;
$split_gap_tablet       = $attributes['splitGapTablet'] ?? null;
$split_gap_mobile       = $attributes['splitGapMobile'] ?? null;
$split_gap_unit         = $attributes['splitGapUnit'] ?? 'px';
$split_order_mobile     = $attributes['splitContentOrderMobile'] ?? 'media-first';

// Vertical alignment and content max-width.
$vertical_alignment      = $attributes['verticalAlignment'] ?? 'center';
$content_max_width       = $attributes['contentMaxWidth'] ?? null;
$content_max_width_tab   = $attributes['contentMaxWidthTablet'] ?? null;
$content_max_width_mob   = $attributes['contentMaxWidthMobile'] ?? null;
$content_max_width_unit  = $attributes['contentMaxWidthUnit'] ?? 'px';

$is_split        = 'split' === $variant;
$is_video        = 'video' === $variant;
$is_svg_animated = 'svg-animated' === $variant;

// Build wrapper styles.
$styles = array();
if ( ! empty( $min_height ) ) {
	$styles[] = 'min-height:' . esc_attr( $min_height );
}

// Transition custom properties — consumed by CSS vars on the block and its children.
$styles = array_merge( $styles, sgs_transition_vars( $attributes ) );

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
if ( $sub_headline_font_size_tablet ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__subheadline{font-size:' . sgs_font_size_value( $sub_headline_font_size_tablet ) . ' !important}}';
}
if ( $sub_headline_font_size_mobile ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__subheadline{font-size:' . sgs_font_size_value( $sub_headline_font_size_mobile ) . ' !important}}';
}

// Per-breakpoint headline font size.
if ( $headline_font_size_desktop ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__headline{font-size:' . absint( $headline_font_size_desktop ) . 'px}';
}
if ( $headline_font_size_tablet ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__headline{font-size:' . absint( $headline_font_size_tablet ) . 'px}}';
}
if ( $headline_font_size_mobile ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__headline{font-size:' . absint( $headline_font_size_mobile ) . 'px}}';
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

// ── contentMaxWidth: tablet / mobile overrides ─────────────────────────────
if ( null !== $content_max_width_tab ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__content{max-width:' . absint( $content_max_width_tab ) . esc_attr( $content_max_width_unit ) . '}}';
}
if ( null !== $content_max_width_mob ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__content{max-width:' . absint( $content_max_width_mob ) . esc_attr( $content_max_width_unit ) . '}}';
}

// ── labelFontSize: tablet / mobile overrides ───────────────────────────────
if ( null !== $label_font_size_tab ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__label{font-size:' . absint( $label_font_size_tab ) . esc_attr( $label_font_size_unit ) . '}}';
}
if ( null !== $label_font_size_mob ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__label{font-size:' . absint( $label_font_size_mob ) . esc_attr( $label_font_size_unit ) . '}}';
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

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
		'style' => implode( ';', $styles ) . ';',
	)
);

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

// CTA buttons are now rendered via sgs/multi-button + sgs/button InnerBlocks.
// $content is passed by WordPress and contains the rendered InnerBlocks output.
// Legacy ctaPrimary* / ctaSecondary* attributes are handled by deprecated.js migration.

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

// ── Build label (eyebrow) inline styles ────────────────────────────────────
$label_styles = array();
if ( $label_font_family ) {
	// Resolve as a theme.json preset slug or pass through if it contains spaces (custom family).
	$label_styles[] = 'font-family:var(--wp--preset--font-family--' . esc_attr( preg_replace( '/[^a-z0-9-]/', '', strtolower( $label_font_family ) ) ) . ')';
}
if ( null !== $label_font_size ) {
	$label_styles[] = 'font-size:' . absint( $label_font_size ) . esc_attr( $label_font_size_unit );
}
if ( $label_font_weight ) {
	$label_styles[] = 'font-weight:' . esc_attr( $label_font_weight );
}
if ( null !== $label_line_height ) {
	$label_styles[] = 'line-height:' . esc_attr( (string) $label_line_height ) . esc_attr( $label_lh_unit );
}
if ( null !== $label_letter_spacing ) {
	$label_styles[] = 'letter-spacing:' . esc_attr( (string) $label_letter_spacing ) . esc_attr( $label_ls_unit );
}
if ( $label_text_transform ) {
	$allowed_transforms = array( 'none', 'uppercase', 'lowercase', 'capitalize', 'inherit', 'initial' );
	if ( in_array( $label_text_transform, $allowed_transforms, true ) ) {
		$label_styles[] = 'text-transform:' . $label_text_transform;
	}
}
if ( $label_text_decoration ) {
	$allowed_decorations = array( 'none', 'underline', 'overline', 'line-through', 'inherit', 'initial' );
	if ( in_array( $label_text_decoration, $allowed_decorations, true ) ) {
		$label_styles[] = 'text-decoration:' . $label_text_decoration;
	}
}
if ( $label_colour ) {
	$label_styles[] = 'color:' . sgs_colour_value( $label_colour );
}
if ( null !== $label_margin_bottom ) {
	$label_styles[] = 'margin-bottom:' . absint( $label_margin_bottom ) . esc_attr( $label_mb_unit );
}
$label_style_attr = $label_styles ? ' style="' . implode( ';', $label_styles ) . '"' : '';

// ── Build content area ─────────────────────────────────────────────────────
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
if ( null !== $content_max_width ) {
	$content_styles[] = 'max-width:' . absint( $content_max_width ) . esc_attr( $content_max_width_unit );
}
$content_style_attr = ' style="' . implode( ';', $content_styles ) . '"';

$content_html = '<div class="sgs-hero__content"' . $content_style_attr . '>';
if ( $label ) {
	$content_html .= '<span class="sgs-hero__label"' . $label_style_attr . '>' . esc_html( $label ) . '</span>';
}
if ( $headline ) {
	$h_classes          = array( 'sgs-hero__headline' );
	$text_align_mobile  = $attributes['textAlignMobile'] ?? '';
	$text_align_tablet  = $attributes['textAlignTablet'] ?? '';
	$text_align_desktop = $attributes['textAlignDesktop'] ?? '';

	if ( $text_align_mobile ) {
		$h_classes[] = 'sgs-text-align-m-' . $text_align_mobile; }
	if ( $text_align_tablet ) {
		$h_classes[] = 'sgs-text-align-t-' . $text_align_tablet; }
	if ( $text_align_desktop ) {
		$h_classes[] = 'sgs-text-align-d-' . $text_align_desktop; }

	$h_styles = array();
	if ( $headline_colour ) {
		$h_styles[] = 'color:' . sgs_colour_value( $headline_colour ); }
	$headline_style_attr = $h_styles ? ' style="' . implode( ';', $h_styles ) . '"' : '';
	$headline_class_attr = ' class="' . esc_attr( implode( ' ', $h_classes ) ) . '"';

	$content_html .= '<h1' . $headline_class_attr . $headline_style_attr . '>' . wp_kses_post( $headline ) . '</h1>';
}
if ( $sub_headline ) {
	$sub_styles = array();
	if ( $sub_headline_colour ) {
		$sub_styles[] = 'color:' . sgs_colour_value( $sub_headline_colour );
	}
	if ( $sub_headline_font_size ) {
		$sub_styles[] = 'font-size:' . sgs_font_size_value( $sub_headline_font_size );
	}
	if ( $sub_headline_max_width ) {
		$sub_styles[] = 'max-width:' . absint( $sub_headline_max_width ) . 'px';
	}
	// Phase 1: Sub-headline typography extensions.
	if ( $sub_headline_font_family ) {
		$sub_styles[] = 'font-family:var(--wp--preset--font-family--' . esc_attr( preg_replace( '/[^a-z0-9-]/', '', strtolower( $sub_headline_font_family ) ) ) . ')';
	}
	if ( $sub_headline_font_weight ) {
		$sub_styles[] = 'font-weight:' . esc_attr( $sub_headline_font_weight );
	}
	if ( null !== $sub_headline_line_height ) {
		$sub_styles[] = 'line-height:' . esc_attr( (string) $sub_headline_line_height ) . esc_attr( $sub_headline_lh_unit );
	}
	if ( null !== $sub_headline_letter_spacing ) {
		$sub_styles[] = 'letter-spacing:' . esc_attr( (string) $sub_headline_letter_spacing ) . esc_attr( $sub_headline_ls_unit );
	}
	if ( $sub_headline_text_transform ) {
		$allowed_transforms = array( 'none', 'uppercase', 'lowercase', 'capitalize', 'inherit', 'initial' );
		if ( in_array( $sub_headline_text_transform, $allowed_transforms, true ) ) {
			$sub_styles[] = 'text-transform:' . $sub_headline_text_transform;
		}
	}
	if ( $sub_headline_text_decoration ) {
		$allowed_decorations = array( 'none', 'underline', 'overline', 'line-through', 'inherit', 'initial' );
		if ( in_array( $sub_headline_text_decoration, $allowed_decorations, true ) ) {
			$sub_styles[] = 'text-decoration:' . $sub_headline_text_decoration;
		}
	}
	$sub_style_attr = $sub_styles ? ' style="' . implode( ';', $sub_styles ) . '"' : '';
	$content_html  .= '<p class="sgs-hero__subheadline"' . $sub_style_attr . '>' . wp_kses_post( $sub_headline ) . '</p>';
}
// InnerBlocks output (sgs/multi-button + sgs/button) rendered by WordPress.
$content_html .= '<div class="sgs-hero__ctas">' . $content . '</div>';
$content_html .= '</div>';

// ── Build split media area ─────────────────────────────────────────────────
$media_html = '';
if ( $is_split && ! empty( $split_image['url'] ) ) {
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

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from WP core; all HTML strings built with esc_url/esc_html/esc_attr above.
printf(
	'<section %s>%s%s%s%s%s%s%s</section>',
	$wrapper_attributes,
	$bg_img_html,
	$video_html,
	$svg_html,
	$overlay_html,
	$content_html,
	$media_html,
	! $is_split ? $badges_html : ''
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
