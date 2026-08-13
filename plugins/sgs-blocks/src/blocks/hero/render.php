<?php
/**
 * Server-side render for the SGS Hero block.
 *
 * FR-22-6 migration: the content column (label, headline, sub-headline, CTAs)
 * is now rendered via InnerBlocks ($content). CTAs are child sgs/multi-button >
 * sgs/button blocks — the scalar ctaPrimary/ctaSecondary content/style/hover
 * attrs and ctaGap attrs were REMOVED entirely (no deprecated.js pre-production,
 * D270/D293): they drove no rendering output (their target selectors
 * .sgs-hero__cta-primary/--accent/--primary and .sgs-hero__ctas never render).
 * R-22-14: NO legacy scalar fallback.
 *
 * Scalar STYLING/LAYOUT attributes still consumed here (wrapper/shell level):
 *   variant, alignment, backgroundImage, backgroundOverlayColour, overlayOpacity,
 *   splitImage, splitImageMobile, splitImageMobileObjectPosition,
 *   imageObjectPositionTablet, minHeight*, background/text/border
 *   colourHover, transitionDuration, transitionEasing, bgParallax, bgKenBurns,
 *   bgVideo*, splitImageBleed,
 *   headline/subHeadlineMarginBottom*, subHeadlineMaxWidth,
 *   imageObjectFit/Position, imageWidth*, imageHeight (TIER OBJECT), imageBorderStyle/Colour,
 *   splitColumnRatio*, splitGap*,
 *   splitContentOrder, splitContentOrderTablet, splitContentOrderMobile,
 *   verticalAlignment.
 *   Headline / sub-headline / label FONT-SIZE (all breakpoints) is
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
// WS-4: `overlayColour`/`overlayOpacity` were renamed to `backgroundOverlayColour`/
// `backgroundOverlayOpacity` (the shared container owns those names). The legacy
// `overlayColour` attribute has since been deleted outright (D270 — pre-production
// framework, no migration path needed); only the canonical name is read. These
// dynamic blocks save <InnerBlocks.Content/>, so no save-markup deprecation is needed.
// Raw here; sanitised via sgs_colour_value() at the scoped-CSS concat site (matches the
// sibling colour pattern — media/content/image-border — so the sanitiser is locally
// obvious at every concatenation point and never double-applied to a resolved var()).
// Raw (undefaulted) value — used to decide WHETHER an overlay colour was
// explicitly set (the ungate condition below). 'text' is a real PAINT
// default applied only once the span is already going to exist for some
// other reason (media present); it must never itself trigger the span, or
// every hero with no media and no configured overlay would render an opaque
// full-bleed layer (caught live, 2026-08-11 — same session as the ungate).
$overlay_colour_raw  = $attributes['backgroundOverlayColour'] ?? '';
$overlay_colour      = '' !== $overlay_colour_raw ? $overlay_colour_raw : 'text';
// D5 (Background panel redesign, 2026-08-11): `backgroundOverlayOpacity` no
// longer exists as an attribute — the colour/gradient picker's own alpha is
// the one dimming mechanism now, matching SGS_Container_Wrapper's overlay.
// Bug fix 2026-08-11: these three were never read here at all, so the
// GradientOverlayControl UI could write a gradient and it would silently
// never render — the overlay's own CSS rule (below) only ever emitted a
// flat background-color. Same read pattern SGS_Container_Wrapper uses.
$overlay_gradient       = ! empty( $attributes['overlayGradient'] );
$overlay_gradient_angle = isset( $attributes['overlayGradientAngle'] ) ? absint( $attributes['overlayGradientAngle'] ) : 180;
$overlay_gradient_from  = $attributes['overlayGradientFrom'] ?? '';
$overlay_gradient_to    = $attributes['overlayGradientTo'] ?? '';
// The split column's sources are TYPED, one family per media kind:
// splitImage* (image), splitVideo* (video), splitSvg* (inline SVG), each with a
// per-tier splitMediaType* saying which kind that tier uses.
//
// ⛔ The `splitMedia` unified image-or-video slot (added 2026-05-05) and the two
// synthesise/hydrate bridges that kept it in sync with splitImage were DELETED
// 2026-08-13 (Bean: no legacy elements as fallbacks; the framework is
// pre-production, so there is nothing to migrate). They also contradicted this
// file's own R-22-14 contract at the top — "NO legacy scalar fallback" — and
// R-31-14, which bans exactly the `if ( empty($new) && !empty($legacy) )` shape.
// Verified before deletion, not assumed: across ALL post statuses on the canary
// the only rows carrying splitMedia/splitImage were one leftover DRAFT from the
// reverted D594 session and this session's own probe page, plus their revisions
// — zero real content.
$split_image         = $attributes['splitImage'] ?? null;
// splitImageTablet was DECLARED in block.json (b717717d) but read by nothing —
// no render, no editor control — so the attribute existed and did nothing. The
// dead-control gate did not catch it (it treats a responsive-family member as
// consumed when the BASE is consumed, which is exactly wrong here: rendering the
// base says nothing about whether the tablet tier renders). Wired 2026-08-07.
$split_image_tablet  = $attributes['splitImageTablet'] ?? null;
$split_image_mobile  = $attributes['splitImageMobile'] ?? null;
// Per-tier media TYPE (2026-08-13). The split media column may be an image on one
// device and a video or inline SVG on another, so each tier carries its own type
// alongside its own source. '' on a narrower tier = inherit the next wider tier,
// matching the fall-back-UP rule the source tiers already use (Spec 35 D3/D5).
$split_media_type        = $attributes['splitMediaType'] ?? 'image';
$split_media_type_tablet = $attributes['splitMediaTypeTablet'] ?? '';
$split_media_type_mobile = $attributes['splitMediaTypeMobile'] ?? '';
$split_video             = $attributes['splitVideo'] ?? null;
$split_video_tablet      = $attributes['splitVideoTablet'] ?? null;
$split_video_mobile      = $attributes['splitVideoMobile'] ?? null;
$split_svg               = (string) ( $attributes['splitSvg'] ?? '' );
$split_svg_tablet        = (string) ( $attributes['splitSvgTablet'] ?? '' );
$split_svg_mobile        = (string) ( $attributes['splitSvgMobile'] ?? '' );
// ⛔ The `splitMedia` -> `splitVideo` alias bridge was DELETED here 2026-08-13.
// `splitVideo*` is the only video source; a video is set through its own control.
$split_image_mobile_object_position = $attributes['splitImageMobileObjectPosition'] ?? 'center 20%';
// Tablet tier of the object-position triple (Spec 35 Track 1b Phase 1.4c —
// promoted from a mobile-only orphan). Desktop tier is $image_object_position
// below (imageObjectPosition, already wired); '' = inherit desktop.
$image_object_position_tablet = $attributes['imageObjectPositionTablet'] ?? '';
// Free-text embedded length strings (e.g. "600px") — sanitised before reaching
// the scoped <style> rule below (was esc_attr()-only, which does not strip
// ;{}() and so cannot prevent CSS-rule breakout).
// minHeight is a TIER OBJECT {desktop,tablet,mobile} (Spec 35 pass 3b,
// 2026-08-11) — the minHeightTablet/minHeightMobile siblings no longer exist
// in block.json (WP silently discards any attr the block.json doesn't
// declare, D338). sgs_responsive_normalise_object() is the canonical reader.
$min_height_obj      = sgs_responsive_normalise_object( $attributes['minHeight'] ?? null );
$min_height          = $sgs_css_length( $min_height_obj['desktop'] ?? '' );
$min_height_tablet   = $sgs_css_length( $min_height_obj['tablet'] ?? '' );
$min_height_mobile   = $sgs_css_length( $min_height_obj['mobile'] ?? '360px' );

// Sub-headline / headline / label font-size are owned by the child
// sgs/text / sgs/heading / sgs/label blocks across all breakpoints — no
// scoped font-size <style> is emitted here. headline/subHeadline margin-bottom
// and subHeadlineMaxWidth controls were RETIRED 2026-08-12 (Spec 35 Phase 2.3):
// the content itself moved to child InnerBlocks at FR-22-6 and these leftover
// parent-side spacing overrides never carried meaningful client intent (their
// live values were scratch-page defaults, not deliberate settings — Bean).
// splitImageHeight / splitImageHeightTablet / splitImageMobileHeight were REMOVED
// 2026-08-10 — they duplicated `imageHeight` on the same property AND the same
// element (`.sgs-hero__split-image`). See the consolidation note at the emission
// site. Height for the split image now comes solely from the `imageHeight` object.

$hover_background_colour = $attributes['backgroundColourHover'] ?? '';
$hover_text_colour       = $attributes['textColourHover'] ?? '';
$hover_border_colour     = $attributes['borderColourHover'] ?? '';
// transitionDuration/transitionEasing are read directly by sgs_transition_vars()
// below — no local variable needed here (dead-assignment cleanup).

// Background effect attributes.
$bg_parallax     = ! empty( $attributes['bgParallax'] );
$bg_ken_burns    = ! empty( $attributes['bgKenBurns'] );
$bg_video_attr   = $attributes['bgVideo'] ?? null;
$bg_video_tablet = $attributes['bgVideoTablet'] ?? null;
$bg_video_mobile = $attributes['bgVideoMobile'] ?? null;

// Split-image bleed — removes border-radius and inner padding from the media column.
$split_image_bleed = ! empty( $attributes['splitImageBleed'] );

// ── Phase 1: Image display attributes ──────────────────────────────────────
$image_object_fit      = $attributes['imageObjectFit'] ?? 'cover';
$image_object_position = $attributes['imageObjectPosition'] ?? 'center center';

$image_width        = $attributes['imageWidth'] ?? null;
$image_width_tablet = $attributes['imageWidthTablet'] ?? null;
$image_width_mobile = $attributes['imageWidthMobile'] ?? null;
$image_width_unit   = $sgs_css_length( $attributes['imageWidthUnit'] ?? '%' );

// imageHeight is a TIER OBJECT (Spec 35): one attr carrying all three tiers,
// replacing the imageHeight/imageHeightTablet/imageHeightMobile trio 2026-08-10.
// It also absorbed the removed splitImageHeight family — see the emission site.
// sgs_responsive_normalise_object() is the canonical reader (helpers-responsive.php:273);
// it always returns desktop/tablet/mobile keys, so the emission code below is unchanged.
$image_height_obj    = sgs_responsive_normalise_object( $attributes['imageHeight'] ?? null );
$image_height        = $image_height_obj['desktop'] ?? null;
$image_height_tablet = $image_height_obj['tablet'] ?? null;
$image_height_mobile = $image_height_obj['mobile'] ?? null;
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
$media_padding_obj         = is_array( $attributes['mediaPadding'] ?? null ) ? $attributes['mediaPadding'] : array();
$media_padding_tablet_obj  = is_array( $attributes['mediaPaddingTablet'] ?? null ) ? $attributes['mediaPaddingTablet'] : array();
$media_padding_mobile_obj  = is_array( $attributes['mediaPaddingMobile'] ?? null ) ? $attributes['mediaPaddingMobile'] : array();

// contentPadding — padding on the .sgs-hero__content wrapper. TIER-OF-BOXES
// OBJECT {desktop,tablet,mobile} as of Spec 35 box-tier migration (2026-08-11)
// — the contentPaddingTablet/contentPaddingMobile sibling attrs no longer
// exist in this block's schema; sgs_responsive_normalise_object() is the
// canonical reader (helpers-responsive.php:273), box=true so an unset/legacy
// value never mis-resolves as a flat side (D328 defence).
$content_padding_tiers       = sgs_responsive_normalise_object( $attributes['contentPadding'] ?? null, true );
$content_padding_obj         = is_array( $content_padding_tiers['desktop'] ) ? $content_padding_tiers['desktop'] : array();
$content_padding_tablet_obj  = is_array( $content_padding_tiers['tablet'] ) ? $content_padding_tiers['tablet'] : array();
$content_padding_mobile_obj  = is_array( $content_padding_tiers['mobile'] ) ? $content_padding_tiers['mobile'] : array();

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
// `gridTemplateColumns` is a TIER OBJECT as of Spec 35 pass 3a (2026-08-11) —
// ONE attr holding {desktop,tablet,mobile}, read through the shared normaliser.
// A `(string)` cast on the object would raise PHP "Array to string conversion"
// on EVERY render of a split hero and emit a garbage track list.
$split_col_tiers = sgs_responsive_normalise_object( $attributes['gridTemplateColumns'] ?? null );
$split_col_ratio = $split_col_tiers['desktop'] ?? '';
if ( '' === trim( (string) $split_col_ratio ) ) {
	$split_col_ratio = '1fr 1fr';
}
$split_col_ratio_tablet = $split_col_tiers['tablet'] ?? '';
$split_col_ratio_mobile = $split_col_tiers['mobile'] ?? '';
// splitGap* REMOVED (de-duped 2026-07-06) — the split grid gap now reads the
// shared gap/gapTablet/gapMobile (see the gap emission below).
// splitContentOrder is a TIER OBJECT {desktop,tablet,mobile} (Spec 35 pass
// 3b) — the *Tablet/*Mobile siblings no longer exist in block.json. '' on
// desktop/tablet = inherit (desktop falls back to natural DOM order; tablet
// falls back to the resolved desktop order); mobile falls back to
// 'media-first', matching block.json's declared default.
$split_order_obj    = sgs_responsive_normalise_object( $attributes['splitContentOrder'] ?? null );
$split_order        = $split_order_obj['desktop'] ?? '';
$split_order_tablet = $split_order_obj['tablet'] ?? '';
$split_order_mobile = $split_order_obj['mobile'] ?? 'media-first';

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

// Build wrapper styles.
$styles = array();
// min-height base is NOT inline (Pattern A, D-migration): it has tablet/mobile
// tiers, so base+tablet+mobile are emitted together on the SAME .uid selector
// in the scoped <style> below. minHeight* stays NULLED in the container-wrapper
// attr copy (C3 double-emit guard) — the hero's scoped style is the ONE channel.

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

// Standard variant: use <img> instead of CSS background-image so the browser can
// discover the LCP resource early and apply fetchpriority="high".
$has_standard_bg_image = ! $is_split && ! empty( $bg_image['url'] );

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
	// `contentWidth` is a TIER OBJECT as of Spec 35 pass 2 (2026-08-11). This
	// split-hero band is a DESKTOP-tier concern (it confines the two grid
	// columns, which stack below 768px), so it reads the desktop tier — via the
	// shared normaliser, never a `(string)` cast on the object, which raised PHP
	// "Array to string conversion" on every render and emitted a garbage band.
	$cw_tiers = sgs_responsive_normalise_object( $attributes['contentWidth'] ?? null );
	$cw_raw   = (string) ( $cw_tiers['desktop'] ?? '' );
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
	// `gap` is a TIER OBJECT (Spec 35 pass 1, 2026-08-10). sgs_container_gap_value()
	// expects a scalar length -- handing it the raw array would emit
	// "Array to string conversion" on every render plus literal `gap:Array`.
	$hero_gap_obj = sgs_responsive_normalise_object( $attributes['gap'] ?? null );
	$hero_gap = sgs_container_gap_value( $hero_gap_obj['desktop'] ?? '' );
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
	$hero_gap_tablet = sgs_container_gap_value( $hero_gap_obj['tablet'] ?? '' );
	if ( '' !== $hero_gap_tablet ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . '{gap:' . $hero_gap_tablet . '}}';
	}
	// Mobile gap override — shared gapMobile.
	$hero_gap_mobile = sgs_container_gap_value( $hero_gap_obj['mobile'] ?? '' );
	if ( '' !== $hero_gap_mobile ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . '{gap:' . $hero_gap_mobile . '}}';
	}
	// Split-image height is NOT emitted here. The `splitImageHeight` family was
	// REMOVED 2026-08-10: it wrote `height` to `.sgs-hero__split-image` — the exact
	// same property on the exact same element as the `imageHeight` family below, so
	// the two genuinely contended for one routing slot. The DB gate caught it
	// (`amb:sgs/hero:height:wrapper_css:split-image`) once the css-property
	// classifier was actually run for the first time; before that the collision was
	// invisible. At equal specificity the later rule wins, and `imageHeight` emits
	// later — so `imageHeight` was ALREADY the effective winner whenever both were
	// set. Consolidating onto it therefore changes no rendered output.
	// `imageHeight` was kept as the survivor because it carries a configurable unit
	// (`imageHeightUnit`) rather than hardcoding px, forces no `object-fit`, and was
	// the only one of the two named consistently across all three tiers
	// (`splitImageMobileHeight` put the tier token in the middle, which is also why
	// the classifier could not tier it). See the imageHeight block below.

	// Desktop/base column order. Blank ('') = natural DOM order (content is
	// first in markup, so it lands in the first/left grid track). 'media-first'
	// swaps: image first/left, content second/right. This is a LEFT/RIGHT
	// decision — the split is a 2-col grid at this width.
	if ( 'media-first' === $split_order ) {
		$responsive_css .= '.' . $uid . ' .sgs-hero__media{order:1}.' . $uid . ' .sgs-hero__content{order:2}';
	}
	// Tablet column order override. Blank = inherit the resolved desktop order
	// above (same "blank = inherit" convention as the tablet column ratio).
	// Meaning depends on whether the tablet grid is side-by-side or stacked at
	// this width (gridTemplateColumnsTablet) — LEFT/RIGHT if side-by-side,
	// ABOVE/BELOW if stacked.
	if ( $split_order_tablet ) {
		if ( 'content-first' === $split_order_tablet ) {
			$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__content{order:1}.' . $uid . ' .sgs-hero__media{order:2}}';
		} else {
			// media-first.
			$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__media{order:1}.' . $uid . ' .sgs-hero__content{order:2}}';
		}
	}
	// Mobile column order. Mobile always stacks to a single column, so this is
	// an ABOVE/BELOW decision, not LEFT/RIGHT.
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
	// Tablet tier override. Blank = inherit the desktop rule above.
	if ( $image_object_position_tablet ) {
		$safe_object_position_tablet = $sgs_css_object_position( $image_object_position_tablet );
		if ( '' !== $safe_object_position_tablet ) {
			$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-image{object-position:' . $safe_object_position_tablet . '}}';
		}
	}
}

// ── imageWidth: base + tablet + mobile (custom fit only) ──────────────────
// Base moved here from the inline style="" on the split <img> (Pattern A).
if ( 'custom' === $image_object_fit ) {
	if ( null !== $image_width ) {
		$responsive_css .= '.' . $uid . ' .sgs-hero__split-image{width:' . absint( $image_width ) . esc_attr( $image_width_unit ) . '}';
	}
	if ( null !== $image_width_tablet ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-image{width:' . absint( $image_width_tablet ) . esc_attr( $image_width_unit ) . '}}';
	}
	if ( null !== $image_width_mobile ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-image{width:' . absint( $image_width_mobile ) . esc_attr( $image_width_unit ) . '}}';
	}
}

// ── imageHeight: base + tablet + mobile, UNCONDITIONAL ────────────────────
// Deliberately OUTSIDE the `custom` object-fit gate above (2026-08-10). Height
// used to be gated with width, while the now-removed `splitImageHeight` family
// wrote the same property to the same element with NO gate. Consolidating onto
// `imageHeight` therefore has to keep the UNGATED reach, or every hero that set
// a split-image height without also choosing `custom` object-fit would silently
// lose it. Width stays gated — it never had an ungated equivalent.
// Emitted base -> tablet -> mobile so the later, narrower @media rule wins at
// its own width (same cascade convention as gap/grid-template-columns above).
if ( null !== $image_height ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__split-image{height:' . absint( $image_height ) . esc_attr( $image_height_unit ) . '}';
}
if ( null !== $image_height_tablet ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-image{height:' . absint( $image_height_tablet ) . esc_attr( $image_height_unit ) . '}}';
}
if ( null !== $image_height_mobile ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-image{height:' . absint( $image_height_mobile ) . esc_attr( $image_height_unit ) . '}}';
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
// (contract §A). The shared per-area schema attr; the legacy mediaBackgroundColour
// attr was removed 2026-07-23 (it duplicated this on css:background-color / element
// media and collided in the routing DB — mediaBackground is the sole canonical source).
// Gradient support added (Phase 4 Item 5, D561 plan) — mirrors the whole-block
// overlay's linear-gradient(%ddeg,%s,%s) shape 1:1
// (includes/class-sgs-container-wrapper.php ~1159-1176).
$media_bg_resolved         = $attributes['mediaBackground'] ?? '';
$media_bg_gradient         = ! empty( $attributes['mediaBackgroundGradient'] );
$media_bg_gradient_angle   = isset( $attributes['mediaBackgroundGradientAngle'] ) ? absint( $attributes['mediaBackgroundGradientAngle'] ) : 180;
$media_bg_gradient_from    = $attributes['mediaBackgroundGradientFrom'] ?? '';
$media_bg_gradient_to      = $attributes['mediaBackgroundGradientTo'] ?? '';
if ( $media_bg_gradient && $media_bg_gradient_from ) {
	$media_grad_from = sgs_colour_value( $media_bg_gradient_from );
	$media_grad_to   = $media_bg_gradient_to ? sgs_colour_value( $media_bg_gradient_to ) : 'transparent';
	$responsive_css  .= '.' . $uid . ' .sgs-hero__media{' . sprintf(
		'background-image:linear-gradient(%ddeg,%s,%s)',
		$media_bg_gradient_angle,
		$media_grad_from,
		$media_grad_to
	) . '}';
} elseif ( $media_bg_resolved ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__media{background-color:' . sgs_colour_value( $media_bg_resolved ) . '}';
}

// mediaOverlay — a SEPARATE overlay layered on TOP of the split media (image/
// video/SVG), distinct from mediaBackground above (which paints BEHIND an
// object-fit:cover image and is therefore invisible whenever media is
// present). Mirrors the section overlay's own gradient/flat-colour build
// (~line 969 below) 1:1, scoped to `.sgs-hero__media-overlay` instead of
// `.sgs-hero__overlay`.
$media_overlay_colour_raw  = $attributes['mediaOverlayColour'] ?? '';
$media_overlay_gradient    = ! empty( $attributes['mediaOverlayGradient'] );
$media_overlay_grad_angle  = isset( $attributes['mediaOverlayGradientAngle'] ) ? absint( $attributes['mediaOverlayGradientAngle'] ) : 180;
$media_overlay_grad_from   = $attributes['mediaOverlayGradientFrom'] ?? '';
$media_overlay_grad_to     = $attributes['mediaOverlayGradientTo'] ?? '';
$media_overlay_has_colour  = '' !== $media_overlay_colour_raw || ( $media_overlay_gradient && '' !== $media_overlay_grad_from );

// Media motion — mediaParallax/mediaKenBurns/mediaAnimationDuration (2026-08-13).
// A SEPARATE control family from the section's own bgParallax/bgKenBurns
// (read further below): those animate the SECTION BACKGROUND; these animate
// the foreground split-media column (`.sgs-hero__media`) itself. Mutually
// exclusive in the editor (edit.js); Ken-burns wins if somehow both are set.
$media_parallax           = ! empty( $attributes['mediaParallax'] );
$media_ken_burns          = ! empty( $attributes['mediaKenBurns'] ) && ! $media_parallax;
$media_animation_duration = isset( $attributes['mediaAnimationDuration'] ) ? absint( $attributes['mediaAnimationDuration'] ) : 20;

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
// Gradient support added (Phase 4 Item 5, D561 plan) — mirrors the whole-block
// overlay's linear-gradient(%ddeg,%s,%s) shape 1:1
// (includes/class-sgs-container-wrapper.php ~1159-1176).
$content_bg_gradient       = ! empty( $attributes['contentBackgroundGradient'] );
$content_bg_gradient_angle = isset( $attributes['contentBackgroundGradientAngle'] ) ? absint( $attributes['contentBackgroundGradientAngle'] ) : 180;
$content_bg_gradient_from  = $attributes['contentBackgroundGradientFrom'] ?? '';
$content_bg_gradient_to    = $attributes['contentBackgroundGradientTo'] ?? '';
$v_align_map         = array(
	'top'    => 'flex-start',
	'center' => 'center',
	'bottom' => 'flex-end',
);
$content_justify = $v_align_map[ $vertical_alignment ] ?? 'center';
$content_decls    = array( 'display:flex', 'flex-direction:column', 'justify-content:' . $content_justify );
if ( $content_bg_gradient && $content_bg_gradient_from ) {
	$content_grad_from = sgs_colour_value( $content_bg_gradient_from );
	$content_grad_to   = $content_bg_gradient_to ? sgs_colour_value( $content_bg_gradient_to ) : 'transparent';
	$content_decls[]   = sprintf(
		'background-image:linear-gradient(%ddeg,%s,%s)',
		$content_bg_gradient_angle,
		$content_grad_from,
		$content_grad_to
	);
} elseif ( $content_background ) {
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
// has-*-color class onto the wrapper — re-add it manually (mirrors sgs/quote)
// so preset palette text colours still resolve visually.
$hero_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
if ( '' !== $hero_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $hero_preset_text_slug . '-color';
}
// D6 (capability-routing doctrine, 2026-08-11): native `supports.color`
// background/gradients REMOVED — it competed with this block's own overlay
// mechanism (GradientOverlayControl / overlayGradient / backgroundOverlayColour)
// and, being wired up first, silently won, making the working overlay control
// look broken. The overlay is now the ONLY background-colour concept.
//
// `has-background` still needs setting here (not just left to the overlay's
// own render) so the style.css default-gradient suppression
// (`.sgs-hero:not(.has-background)`, style.css line ~50) fires — without it
// the framework's default primary-dark→primary gradient shows through a
// translucent overlay colour. measurement-vs-eye recurrence (2026-05-05 hero
// -gradient incident); Bean-reported 2026-07-10.
if ( ( '' !== $overlay_colour_raw || ( $overlay_gradient && '' !== $overlay_gradient_from ) ) && ! in_array( 'has-background', $classes, true ) ) {
	$classes[] = 'has-background';
}

// WS-4: the OUTER <section> is now rendered by SGS_Container_Wrapper::render() at
// the foot of this file (the element mirrors sgs/container). $classes + $styles
// ride through via extra_classes / extra_styles; hero keeps ALL its own media
// layers (LCP <img>, video, svg, overlay) as bespoke interior.

// Build video background.
// bgVideo / bgVideoMobile override the background image on their respective viewports.
// These attributes are NOT gated by $variant — any variant (standard/split) can carry a
// video background. The dedicated 'video' variant was retired 2026-08-12 — it was a dead
// duplicate: the shared BackgroundPanel already exposes this same bgVideo* family on
// every variant, and hero has always rendered it unconditionally, as below.
$video_html     = '';
$has_attr_video = ! empty( $bg_video_attr['url'] );

if ( $has_attr_video ) {
	$desktop_src = $bg_video_attr['url'];
	// Tiers fall back UPWARD (mobile -> tablet -> desktop), matching
	// SGS_Container_Wrapper::render()'s three-tier resolution. Hero duplicates the
	// wrapper's video path rather than calling it (a composite-mirror divergence
	// predating this change) — so the two must be kept in step by hand until hero
	// is routed through the wrapper. If you change one, change the other.
	$has_tablet_src = ! empty( $bg_video_tablet['url'] );
	$tablet_src     = $has_tablet_src ? $bg_video_tablet['url'] : $desktop_src;
	$mobile_src     = ! empty( $bg_video_mobile['url'] ) ? $bg_video_mobile['url'] : $tablet_src;

	if ( $desktop_src === $mobile_src && $desktop_src === $tablet_src ) {
		// Single source across every tier — no viewport switching needed.
		$video_html = sprintf(
			'<video class="sgs-hero__video-bg" autoplay loop muted playsinline aria-hidden="true">' .
			'<source src="%s" type="video/mp4"></video>',
			esc_url( $desktop_src )
		);
	} else {
		// Multiple sources — JS swaps src based on viewport via data attributes.
		// `data-src-tablet` is emitted ONLY when a tablet override was actually set,
		// so a block with no tablet value renders byte-identically to before.
		$tablet_attr = $has_tablet_src
			? sprintf( ' data-src-tablet="%s"', esc_attr( $tablet_src ) )
			: '';

		$video_html = sprintf(
			'<video class="sgs-hero__video-bg sgs-hero__video-bg--responsive" autoplay loop muted playsinline aria-hidden="true"' .
			' data-src-desktop="%s"%s data-src-mobile="%s">' .
			'<source src="%s" type="video/mp4"></video>',
			esc_attr( $desktop_src ),
			$tablet_attr,
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

// Build overlay. No-inline contract (§A): background-color/opacity move to the
// scoped <style> ($responsive_css, appended below) — the element carries only
// its class, no style="" attribute.
//
// Bug fix 2026-08-11: mirrors SGS_Container_Wrapper's own overlay fix
// (`class-sgs-container-wrapper.php`, "UNGATED 2026-08-08" comment) which
// this private copy never received. Two bugs, same root cause (hero renders
// its own overlay instead of the shared wrapper's, per the C3 double-emit
// guard above — so a fix to the shared version never reaches here):
// (a) a colour/gradient with no background image rendered NOTHING at all
// (the old gate required an image/video/SVG background to exist first);
// (b) `overlayGradient`/`overlayGradientFrom/To/Angle` were never read into
// this file at all, so the CSS rule could only ever emit a flat colour.
$overlay_html        = '';
$has_overlay_colour  = $overlay_colour_raw || ( $overlay_gradient && $overlay_gradient_from );
if ( ( ! $is_split && ! empty( $bg_image['url'] ) ) || $has_overlay_colour ) {
	$overlay_html = '<span class="sgs-hero__overlay" aria-hidden="true"></span>';
	if ( $overlay_gradient && $overlay_gradient_from ) {
		$grad_from       = sgs_colour_value( $overlay_gradient_from );
		$grad_to         = $overlay_gradient_to ? sgs_colour_value( $overlay_gradient_to ) : 'transparent';
		$responsive_css .= '.' . $uid . ' .sgs-hero__overlay{background-image:linear-gradient(' . $overlay_gradient_angle . 'deg,' . $grad_from . ',' . $grad_to . ')}';
	} else {
		$responsive_css .= '.' . $uid . ' .sgs-hero__overlay{background-color:' . sgs_colour_value( $overlay_colour ) . '}';
	}
}

// FR-22-6: all content (label, headline, sub-headline, CTAs) is rendered via
// InnerBlocks. $content is the full serialised child-block output.

// ── Build content column wrapper ───────────────────────────────────────────
// FR-22-6: content column wraps InnerBlocks ($content) directly. No-inline
// contract (§A): display/flex-direction/justify-content/background-color are
// ALL emitted scoped (.uid .sgs-hero__content{...}) above — this element
// carries NO style="" attribute any more.
// R-22-14: no scalar content rendering. $content = full InnerBlocks output
// (sgs/label + sgs/heading + sgs/text + sgs/button(s) supplied by converter).
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is WP core InnerBlocks output.
$content_html = '<div class="sgs-hero__content">' . $content . '</div>';

// ── Build split media area — image / video / SVG, per device tier ─────────
// 2026-08-13: unified onto the shared sgs_tier_media_render() helper
// (includes/helpers-tier-media.php) so a device tier can be a DIFFERENT media
// TYPE (image on desktop, video on tablet, inline SVG on mobile), which the
// old hand-rolled sibling-<img>-only logic this replaces could never express —
// splitMediaType*/splitVideo*/splitSvg* were declared + read into local vars
// above but never reached any output. A tier resolves to an explicit type only
// when splitMediaType* names one, OR (back-compat) when splitMediaType* is ''
// ("inherit") and that SAME tier already carries a source of its own — so every
// pre-2026-08-13 hero, which only ever set splitImage*/, keeps rendering
// byte-identically. A tier with nothing resolved is simply absent from
// $split_tiers; the helper's own upward cascade (mobile -> tablet -> desktop,
// Spec 35 D3/D5) takes over from there, matching every other tier family here.
$sgs_hero_resolve_split_type = static function ( string $declared_type, $image, $video, string $svg ): string {
	if ( 'video' === $declared_type ) {
		return ! empty( $video['url'] ) ? 'video' : '';
	}
	if ( 'svg' === $declared_type ) {
		return '' !== trim( $svg ) ? 'svg' : '';
	}
	// 'image' is STRICT, exactly like 'video' and 'svg' above. ⛔ It previously
	// fell through to inference when the tier had no image, to cover a
	// pre-2026-08-13 hero whose desktop media was a video carried by the legacy
	// `splitMedia` object. That object and its bridges are deleted, so the
	// fall-through has nothing left to protect and would only mask a genuine
	// misconfiguration (type says image, no image set) by silently rendering
	// something else.
	if ( 'image' === $declared_type ) {
		return ! empty( $image['url'] ) ? 'image' : '';
	}
	// '' (inherit) — NOT legacy: this is the canonical cascade. A tier that
	// names no type infers from whichever source it carries, and a tier with
	// nothing is absent, so the helper's upward cascade supplies it.
	if ( ! empty( $image['url'] ) ) {
		return 'image';
	}
	if ( ! empty( $video['url'] ) ) {
		return 'video';
	}
	if ( '' !== trim( $svg ) ) {
		return 'svg';
	}
	return '';
};

// Alt comes from the base image only. The former `$split_media['alt']` fallback
// referenced a variable deleted with the legacy bridge above; alt is deliberately
// NOT tiered (Spec 35 D5 — a different crop of the same subject describes the
// same thing, and a per-tier alt is a second place for it to drift).
$sgs_hero_split_alt = (string) ( $split_image['alt'] ?? '' );

$split_tiers = array();
foreach (
	array(
		'desktop' => array( $split_media_type, $split_image, $split_video, $split_svg ),
		'tablet'  => array( $split_media_type_tablet, $split_image_tablet, $split_video_tablet, $split_svg_tablet ),
		'mobile'  => array( $split_media_type_mobile, $split_image_mobile, $split_video_mobile, $split_svg_mobile ),
	) as $sgs_hero_tier_name => $sgs_hero_tier_args
) {
	list( $sgs_hero_tier_type_attr, $sgs_hero_tier_image, $sgs_hero_tier_video, $sgs_hero_tier_svg ) = $sgs_hero_tier_args;
	$sgs_hero_resolved_type = $sgs_hero_resolve_split_type( (string) $sgs_hero_tier_type_attr, $sgs_hero_tier_image, $sgs_hero_tier_video, $sgs_hero_tier_svg );
	if ( '' === $sgs_hero_resolved_type ) {
		continue;
	}
	if ( 'svg' === $sgs_hero_resolved_type ) {
		$split_tiers[ $sgs_hero_tier_name ] = array(
			'type' => 'svg',
			'svg'  => $sgs_hero_tier_svg,
		);
		continue;
	}
	$sgs_hero_tier_media     = 'video' === $sgs_hero_resolved_type ? $sgs_hero_tier_video : $sgs_hero_tier_image;
	$sgs_hero_tier_media_id  = ! empty( $sgs_hero_tier_media['id'] ) ? absint( $sgs_hero_tier_media['id'] ) : 0;
	$sgs_hero_tier_width     = ! empty( $sgs_hero_tier_media['width'] ) ? absint( $sgs_hero_tier_media['width'] ) : 0;
	$sgs_hero_tier_height    = ! empty( $sgs_hero_tier_media['height'] ) ? absint( $sgs_hero_tier_media['height'] ) : 0;
	// Image tier only: fall back to WP attachment metadata when the stored
	// attribute lacks explicit dimensions (prevents CLS) — mirrors the
	// pre-refactor desktop-image behaviour (tablet/mobile never had this).
	if ( 'image' === $sgs_hero_resolved_type && ( ! $sgs_hero_tier_width || ! $sgs_hero_tier_height ) ) {
		$sgs_hero_resolve_id = $sgs_hero_tier_media_id;
		if ( 0 === $sgs_hero_resolve_id && ! empty( $sgs_hero_tier_media['url'] ) ) {
			$sgs_hero_resolve_id = absint( attachment_url_to_postid( $sgs_hero_tier_media['url'] ) );
		}
		if ( $sgs_hero_resolve_id > 0 ) {
			$sgs_hero_src_data = wp_get_attachment_image_src( $sgs_hero_resolve_id, 'large' );
			if ( $sgs_hero_src_data && ! empty( $sgs_hero_src_data[1] ) && ! empty( $sgs_hero_src_data[2] ) ) {
				$sgs_hero_tier_width  = $sgs_hero_tier_width ? $sgs_hero_tier_width : (int) $sgs_hero_src_data[1];
				$sgs_hero_tier_height = $sgs_hero_tier_height ? $sgs_hero_tier_height : (int) $sgs_hero_src_data[2];
			}
		}
	}
	$split_tiers[ $sgs_hero_tier_name ] = array(
		'type'  => $sgs_hero_resolved_type,
		'media' => array(
			'id'     => $sgs_hero_tier_media_id,
			'url'    => (string) ( $sgs_hero_tier_media['url'] ?? '' ),
			'width'  => $sgs_hero_tier_width,
			'height' => $sgs_hero_tier_height,
		),
	);
}

$media_html = '';
if ( $is_split && ! empty( $split_tiers ) ) {
	// `sgs-hero__split-image` is kept as the IMAGE type's extra class (bleed
	// variant folded in) so the pre-existing object-fit/position/border-radius/
	// border/padding/width/height CSS above — all scoped to `.sgs-hero__split-image`,
	// none of it tier-specific — keeps applying unchanged. Split-image mobile
	// object-position (below) targets the compound `.split-image.split-media--mobile`
	// selector, since the mobile-tier element no longer carries a bare `--mobile`
	// suffix directly on `sgs-hero__split-image` (that suffix now lands on the
	// shared base class per sgs_tier_media_render()'s contract).
	$sgs_hero_split_image_class = 'sgs-hero__split-image';
	if ( $split_image_bleed ) {
		$sgs_hero_split_image_class .= ' sgs-hero__split-image--bleed';
	}
	$sgs_hero_tier_result = sgs_tier_media_render(
		$split_tiers,
		'sgs-hero__split-media',
		$uid,
		$sgs_hero_split_alt,
		array( 'image' => $sgs_hero_split_image_class )
	);
	if ( '' !== $sgs_hero_tier_result['html'] ) {
		$media_class = 'sgs-hero__media';
		if ( $split_image_bleed ) {
			$media_class .= ' sgs-hero__media--bleed';
		}
		// Media motion classes — scoped to `.sgs-hero__media` ONLY (never the
		// root `<section>`), and gated inside this `'' !== …['html']` branch so
		// they can only ever land on a media column that genuinely rendered
		// something (an operator toggling these before picking media leaves
		// $sgs_hero_tier_result['html'] empty, so $media_html itself never
		// prints and neither class reaches the page).
		if ( $media_parallax ) {
			$media_class .= ' sgs-hero__media--parallax';
		}
		if ( $media_ken_burns ) {
			$media_class .= ' sgs-hero__media--ken-burns';
			// Distinct custom property from the section's own
			// `--sgs-ken-burns-duration` (SGS_Container_Wrapper) — this one is
			// scoped to `.sgs-hero__media`, not the section root, so a hero with
			// BOTH the section and the media animating at different speeds
			// never collide on the same variable.
			$responsive_css .= '.' . $uid . ' .sgs-hero__media{--sgs-hero-media-ken-burns-duration:' . $media_animation_duration . 's}';
		}
		// Media overlay — a decorative span layered on top of the tier media,
		// appended AFTER it in the DOM so it paints above (mirrors the section
		// overlay's positioning approach). Emitted only when an overlay colour
		// or gradient has actually been set (mediaOverlay* read above) — an
		// empty overlay element must never render.
		$media_overlay_html = '';
		if ( $media_overlay_has_colour ) {
			$media_overlay_html = '<span class="sgs-hero__media-overlay" aria-hidden="true"></span>';
			if ( $media_overlay_gradient && '' !== $media_overlay_grad_from ) {
				$media_overlay_grad_from_val = sgs_colour_value( $media_overlay_grad_from );
				$media_overlay_grad_to_val   = '' !== $media_overlay_grad_to ? sgs_colour_value( $media_overlay_grad_to ) : 'transparent';
				$responsive_css              .= '.' . $uid . ' .sgs-hero__media-overlay{' . sprintf(
					'background-image:linear-gradient(%ddeg,%s,%s)',
					$media_overlay_grad_angle,
					$media_overlay_grad_from_val,
					$media_overlay_grad_to_val
				) . '}';
			} else {
				$responsive_css .= '.' . $uid . ' .sgs-hero__media-overlay{background-color:' . sgs_colour_value( $media_overlay_colour_raw ) . '}';
			}
		}
		$media_html      = '<div class="' . esc_attr( $media_class ) . '">' . $sgs_hero_tier_result['html'] . $media_overlay_html . '</div>';
		// ⛔ CALLER CONTRACT (helpers-tier-media.php): this MUST be appended to
		// $responsive_css BEFORE it is printed below — it is, at line ~1166.
		$responsive_css .= $sgs_hero_tier_result['css'];

		// Mobile-tier image object-position override — only meaningful when the
		// mobile tier actually resolved to an IMAGE (a video/SVG mobile tier has
		// no object-position concept here).
		if ( isset( $split_tiers['mobile'] ) && 'image' === $split_tiers['mobile']['type'] ) {
			$safe_mobile_object_position = $sgs_css_object_position( $split_image_mobile_object_position );
			if ( '' !== $safe_mobile_object_position ) {
				$responsive_css .= '.' . $uid . ' .sgs-hero__split-image.sgs-hero__split-media--mobile{object-position:' . $safe_mobile_object_position . '}';
			}
		}
	}
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
$hero_inner_html = $bg_img_html . $video_html . $overlay_html
	. $content_html . $media_html;

$hero_helper_attrs = $attributes;
$sgs_hero_null_attrs = array(
	'bgVideo',
	'bgVideoMobile',
	'bgSvgContent',
	// minHeight is a TIER OBJECT (Spec 35 pass 3b) — nulling the one attr
	// nulls all three tiers; the old minHeightTablet/minHeightMobile entries
	// no longer exist as real attribute keys.
	'minHeight',
);
if ( ! $is_split ) {
	// C3 double-emit guard, STANDARD-ONLY: standard paints its own private
	// LCP <img> (fetchpriority/loading/decoding) for backgroundImage, so the
	// wrapper must not ALSO paint one. Split has no private <img>
	// ($has_standard_bg_image is gated `! $is_split`), so it must NOT be
	// nulled here — SGS_Container_Wrapper paints background-image
	// universally on its `.{uid}::before` layer (the old section-kind gate
	// was removed at D6), so split can rely on the wrapper for its
	// background instead of going without one.
	$sgs_hero_null_attrs = array_merge(
		$sgs_hero_null_attrs,
		array( 'backgroundImage', 'backgroundImageTablet', 'backgroundImageMobile' )
	);
}
foreach ( $sgs_hero_null_attrs as $sgs_hero_null_attr ) {
	$hero_helper_attrs[ $sgs_hero_null_attr ] = null;
}

$hero_helper_opts = array(
	'tag'           => isset( $attributes['tagName'] ) ? sanitize_key( $attributes['tagName'] ) : 'section',
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
