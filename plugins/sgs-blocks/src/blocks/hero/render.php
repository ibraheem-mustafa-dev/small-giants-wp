<?php
/**
 * Server-side render for the SGS Hero block.
 *
 * FR-22-6: the content column (label, headline, sub-headline, CTAs) is
 * rendered via InnerBlocks ($content). CTAs are child sgs/multi-button >
 * sgs/button blocks (D270/D293).
 * R-31-14: NO legacy scalar fallback.
 *
 * Scalar STYLING/LAYOUT attributes still consumed here (wrapper/shell level):
 *   variant, alignment, backgroundImage, backgroundOverlayColour, overlayOpacity,
 *   splitImage, splitImageMobile, splitMediaObjectPositionMobile,
 *   splitMediaObjectPositionTablet, minHeight*, background/text/border colour
 *   (resting + Hover, each with a {attr}Gradient sibling — D702),
 *   transitionDuration, transitionEasing, bgParallax, bgKenBurns,
 *   bgVideo*,
 *   headline/subHeadlineMarginBottom*, subHeadlineMaxWidth,
 *   splitMediaObjectFit/Position, splitMediaWidth*, splitMediaHeight (TIER OBJECT), splitMediaBorderStyle/Colour,
 *   splitColumnRatio*, splitGap*,
 *   splitContentOrder, splitContentOrderTablet, splitContentOrderMobile,
 *   verticalAlignment.
 *   Headline / sub-headline / label FONT-SIZE (all breakpoints) is
 *   owned by the child sgs/heading / sgs/text / sgs/label blocks — not emitted
 *   here.
 *
 * BOX-GROUP (contract §B, 2026-07-09): splitMediaBorderRadius, splitMediaBorderWidth,
 * splitMediaPadding, mediaPadding, contentPadding, contentBandPadding are box
 * OBJECTS ({top,right,bottom,left} / {topLeft,topRight,bottomLeft,bottomRight},
 * base + Tablet + Mobile tiers) — no more flat per-side attrs or *Unit
 * companions. contentBandPadding is read + emitted entirely by
 * SGS_Container_Wrapper (mirrors sgs/container); the other 5 families are
 * read + emitted here, block-private.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * (composite caveat — these do NOT ride through the shared wrapper's
 * `extra_styles`, which would inline them). Section-level WP-native
 * padding/margin remains the wrapper's own scoped mechanism (unchanged).
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
// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / object-fit) — letters + hyphen only.
// object-position sanitiser — Wave 6 (2026-09-01): the hand-rolled
// $sgs_css_object_position closure that used to live here was REMOVED. Its
// only two callers (base+tablet object-position and the mobile-tier override)
// were replaced by the shared `focal-point` atom's own PHP twin
// (`sgs_media_atom_focal_point_css()`, `includes/media/atoms/focal-point.php`),
// which sanitises with the identical charset and now owns all three tiers —
// see the `SGS_Media_Element::style()` call further down this file.

// ── Shell / layout attributes (still scalar — drive the wrapper + media column).
// FR-22-6: scalar content attrs (label, headline, subHeadline, ctaPrimary*,
// ctaSecondary*) are deliberately NOT read here. R-31-14: no fallback.
$variant   = $attributes['variant'] ?? 'standard';
$alignment = $attributes['alignment'] ?? 'left';
$bg_image  = $attributes['backgroundImage'] ?? null;
// `overlayColour`/`overlayOpacity` were renamed to `backgroundOverlayColour`/
// `backgroundOverlayOpacity` (the shared container owns those names); only the
// canonical name is read (D270). These dynamic blocks save <InnerBlocks.Content/>,
// so no save-markup deprecation is needed.
// Raw here; sanitised via sgs_colour_value() at the scoped-CSS concat site (matches the
// sibling colour pattern — media/content/image-border — so the sanitiser is locally
// obvious at every concatenation point and never double-applied to a resolved var()).
// Raw (undefaulted) value — used to decide WHETHER an overlay colour was
// explicitly set (the ungate condition below).
$overlay_colour_raw = $attributes['backgroundOverlayColour'] ?? '';
// D718: hero gates its overlay exactly like SGS_Container_Wrapper does — no
// colour set, no overlay (R-31-9/D152: one shared control must not behave two
// ways). Hero still renders ALL its own media layers (so it controls their
// stacking), and its background image is a REAL <img> with fetchpriority="high"
// (the preload scanner finds it; the wrapper's CSS background-image is only
// discovered after the selector matches) — that is a genuine LCP win and it stays.
// D717: `backgroundOverlayOpacity` is the real 0-100 dimming attribute (see
// sgs_overlay_decls() in helpers-tokens.php) — alpha is off on that colour row.
// backgroundOverlayOpacity is a TIER OBJECT {desktop,tablet,mobile} (Spec 35
// migration, 2026-09-06); Tablet/Mobile siblings are no longer declared by
// any block.json. A raw read here would hand sgs_overlay_decls() an array,
// which is_numeric() silently rejects -- the desktop opacity would vanish
// with no error, same failure mode as the pre-fix minHeight bug.
$overlay_opacity_obj = sgs_responsive_normalise_object( $attributes['backgroundOverlayOpacity'] ?? null );
$overlay_opacity     = $overlay_opacity_obj['desktop'] ?? null;
// Read here (same pattern SGS_Container_Wrapper uses) so the overlay's own CSS
// rule below can paint it. overlayGradient is ONE attribute holding the complete
// CSS gradient value, validated through sgs_css_gradient_value() at the point of
// emission below.
$overlay_gradient_value = sgs_css_gradient_value( $attributes['overlayGradient'] ?? '' );
// D6/Step 8 (2026-08-22) — hover + responsive-tier siblings, plus blend mode,
// for the same overlay pair. Raw (undefaulted) values, exactly like
// $overlay_colour_raw above — resolved once, at the point of emission, by
// sgs_overlay_decls() itself (the same shared owner SGS_Container_Wrapper
// calls), never a second hand-rolled resolver here.
$overlay_colour_hover_raw   = $attributes['backgroundOverlayColourHover'] ?? '';
$overlay_gradient_hover_raw = $attributes['overlayGradientHover'] ?? '';
// D739: hero paints its OWN overlay (it opts out of the wrapper's), so it needs
// its own copy of the tier reads — and this is the SECOND OWNER that made D718's
// lesson recur: updating the shared wrapper alone left these four stranded, which
// audit-block-file-consistency caught as undeclared_render_ref. The tier axis is
// OPACITY now; null means this tier does not override.
$overlay_opacity_tablet = $overlay_opacity_obj['tablet'] ?? null;
$overlay_opacity_mobile = $overlay_opacity_obj['mobile'] ?? null;
$overlay_blend_mode     = $attributes['backgroundOverlayBlendMode'] ?? '';
// The split column's sources are TYPED, one family per media kind:
// splitImage* (image), splitVideo* (video), splitSvg* (inline SVG), each with a
// per-tier splitMediaType* saying which kind that tier uses.
//
// ⛔ The `splitMedia` unified image-or-video slot (added 2026-05-05) and the two
// synthesise/hydrate bridges that kept it in sync with splitImage were DELETED
// 2026-08-13 (Bean: no legacy elements as fallbacks; the framework is
// pre-production, so there is nothing to migrate). They also contradicted this
// file's own R-31-14 contract at the top — "NO legacy scalar fallback" — and
// R-31-14, which bans exactly the `if ( empty($new) && !empty($legacy) )` shape.
// Wave 6 (2026-09-01) — the `source` atom (prefix 'split') writes a NEW
// {base}Id/{base}Url pair (its own canonical shape — `source.control.js`'s
// `pairPickerRow()` always writes this, never the legacy composite object),
// which is NOT the shape hero's `splitImage`/`splitVideo` attributes declare
// (a composite `{id,url,alt}` object). NO legacy fallback is read here —
// Bean-locked (2026-09-02): R-31-14 bans exactly the
// `if ( empty($new) && !empty($legacy) )` shape, and this very block already
// carries a 2026-08-13 precedent of deleting an identically-shaped bridge
// for the same reason (see the comment block above this one). An
// already-published hero instance that only has the legacy `splitImage`/
// `splitVideo`/`splitSvg` shape renders an EMPTY split-media slot until
// re-uploaded through the new picker — a deliberate, accepted consequence of
// the strict reading, not an oversight. The legacy attributes stay DECLARED
// in block.json (never renamed — D338), simply unread and unwritten going
// forward.
$sgs_hero_resolve_split_image = static function ( array $attributes, string $suffix ) {
	$url = (string) ( $attributes[ 'splitImageUrl' . $suffix ] ?? '' );
	if ( '' === $url ) {
		return null;
	}
	return array(
		'id'  => absint( $attributes[ 'splitImageId' . $suffix ] ?? 0 ),
		'url' => $url,
		'alt' => (string) ( $attributes[ 'splitImageAlt' . $suffix ] ?? '' ),
	);
};
$sgs_hero_resolve_split_video = static function ( array $attributes, string $suffix ) {
	$url = (string) ( $attributes[ 'splitVideoUrl' . $suffix ] ?? '' );
	if ( '' === $url ) {
		return null;
	}
	return array(
		'id'  => absint( $attributes[ 'splitVideoId' . $suffix ] ?? 0 ),
		'url' => $url,
	);
};
$sgs_hero_resolve_split_svg   = static function ( array $attributes, string $suffix ) {
	return (string) ( $attributes[ 'splitSvgContent' . $suffix ] ?? '' );
};
$split_image                  = $sgs_hero_resolve_split_image( $attributes, '' );
$split_image_tablet           = $sgs_hero_resolve_split_image( $attributes, 'Tablet' );
$split_image_mobile           = $sgs_hero_resolve_split_image( $attributes, 'Mobile' );
// Per-tier media TYPE (2026-08-13). The split media column may be an image on one
// device and a video or inline SVG on another, so each tier carries its own type
// alongside its own source. '' on a narrower tier = inherit the next wider tier,
// matching the fall-back-UP rule the source tiers already use (Spec 35 D3/D5).
$split_media_type        = $attributes['splitMediaType'] ?? 'image';
$split_media_type_tablet = $attributes['splitMediaTypeTablet'] ?? '';
$split_media_type_mobile = $attributes['splitMediaTypeMobile'] ?? '';
$split_video             = $sgs_hero_resolve_split_video( $attributes, '' );
$split_video_tablet      = $sgs_hero_resolve_split_video( $attributes, 'Tablet' );
$split_video_mobile      = $sgs_hero_resolve_split_video( $attributes, 'Mobile' );
$split_svg               = $sgs_hero_resolve_split_svg( $attributes, '' );
$split_svg_tablet        = $sgs_hero_resolve_split_svg( $attributes, 'Tablet' );
$split_svg_mobile        = $sgs_hero_resolve_split_svg( $attributes, 'Mobile' );
// ⛔ The `splitMedia` -> `splitVideo` alias bridge was DELETED here 2026-08-13.
// `splitVideo*` is the only video source; a video is set through its own control.
// splitMediaObjectPosition/Tablet/Mobile (the object-position triple) are read
// entirely by the `focal-point` atom's own PHP twin now (Wave 6, 2026-09-01) —
// see the `SGS_Media_Element::style()` call further down this file. The three
// local variables that used to hold them here were removed along with the
// hand-rolled emission they fed.
// Free-text embedded length strings (e.g. "600px") — sanitised before reaching
// the scoped <style> rule below (was esc_attr()-only, which does not strip
// ;{}() and so cannot prevent CSS-rule breakout).
// minHeight is a TIER OBJECT {desktop,tablet,mobile} (Spec 35 pass 3b,
// 2026-08-11) — the minHeightTablet/minHeightMobile siblings no longer exist
// in block.json (WP silently discards any attr the block.json doesn't
// declare, D338). sgs_responsive_normalise_object() is the canonical reader.
$min_height_obj    = sgs_responsive_normalise_object( $attributes['minHeight'] ?? null );
$min_height        = sgs_css_length_value( $min_height_obj['desktop'] ?? '' );
$min_height_tablet = sgs_css_length_value( $min_height_obj['tablet'] ?? '' );
$min_height_mobile = sgs_css_length_value( $min_height_obj['mobile'] ?? '360px' );

// Sub-headline / headline / label font-size are owned by the child
// sgs/text / sgs/heading / sgs/label blocks across all breakpoints — no
// scoped font-size <style> is emitted here. headline/subHeadline margin-bottom
// and subHeadlineMaxWidth controls were retired (Spec 35 Phase 2.3) once the
// content moved to child InnerBlocks at FR-22-6.
// splitImageHeight / splitImageHeightTablet / splitImageMobileHeight were removed
// — they duplicated `splitMediaHeight` on the same property AND the same element
// (`.sgs-hero__split-image`). See the consolidation note at the emission site.
// Height for the split image now comes solely from the `splitMediaHeight` object.

// D702 — root background/text colour, resting + hover, each with a sibling
// `{attr}Gradient` (D636 storage shape: two attributes, gradient wins when
// set+valid, mirrors borderColour/borderColourHover above). Distinct from the
// decorative `.sgs-hero__overlay` dimming layer (backgroundOverlayColour/
// overlayGradient) — this paints the SECTION's own background-color, which
// the overlay sits on top of.
$resting_background_colour          = $attributes['backgroundColour'] ?? '';
$resting_background_colour_gradient = $attributes['backgroundColourGradient'] ?? '';
$resting_text_colour                = $attributes['textColour'] ?? '';
$resting_text_colour_gradient       = $attributes['textColourGradient'] ?? '';
$hover_background_colour            = $attributes['backgroundColourHover'] ?? '';
$hover_background_colour_gradient   = $attributes['backgroundColourHoverGradient'] ?? '';
$hover_text_colour                  = $attributes['textColourHover'] ?? '';
$hover_text_colour_gradient         = $attributes['textColourHoverGradient'] ?? '';
$hover_border_colour                = $attributes['borderColourHover'] ?? '';
// D636 border-colour gradient — sibling attribute, wins over $hover_border_colour when set.
$hover_border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourHoverGradient'] ?? '' );
// transitionDuration/transitionEasing are read directly by sgs_transition_vars()
// below — no local variable needed here (dead-assignment cleanup).

// Background effect attributes.
$bg_parallax     = ! empty( $attributes['bgParallax'] );
$bg_ken_burns    = ! empty( $attributes['bgKenBurns'] );
$bg_video_attr   = $attributes['bgVideo'] ?? null;
$bg_video_tablet = $attributes['bgVideoTablet'] ?? null;
$bg_video_mobile = $attributes['bgVideoMobile'] ?? null;


// ── Phase 1: Image display attributes ──────────────────────────────────────
// $image_object_fit is still read directly (the 'custom' explicit-sizing
// gate below, Width/Height family). $image_object_position was removed —
// the `focal-point` atom's own PHP twin reads `splitMediaObjectPosition*`
// directly now (Wave 6).
$image_object_fit = $attributes['splitMediaObjectFit'] ?? 'cover';

$image_width        = $attributes['splitMediaWidth'] ?? null;
$image_width_tablet = $attributes['splitMediaWidthTablet'] ?? null;
$image_width_mobile = $attributes['splitMediaWidthMobile'] ?? null;
$image_width_unit   = sgs_css_length_value( $attributes['splitMediaWidthUnit'] ?? '%' );

// splitMediaHeight is a TIER OBJECT (Spec 35): one attr carrying all three tiers,
// replacing the splitMediaHeight/splitMediaHeightTablet/splitMediaHeightMobile trio 2026-08-10.
// It also absorbed the removed splitImageHeight family — see the emission site.
// sgs_responsive_normalise_object() is the canonical reader (helpers-responsive.php:273);
// it always returns desktop/tablet/mobile keys, so the emission code below is unchanged.
$image_height_obj    = sgs_responsive_normalise_object( $attributes['splitMediaHeight'] ?? null );
$image_height        = $image_height_obj['desktop'] ?? null;
$image_height_tablet = $image_height_obj['tablet'] ?? null;
$image_height_mobile = $image_height_obj['mobile'] ?? null;
$image_height_unit   = sgs_css_length_value( $attributes['splitMediaHeightUnit'] ?? 'px' );

// Image border radius — box-object family (contract §B): base + tablet +
// mobile, each { topLeft, topRight, bottomLeft, bottomRight }, string values
// with the unit baked in (no separate *Unit companion any more).
$image_border_radius_obj        = is_array( $attributes['splitMediaBorderRadius'] ?? null ) ? $attributes['splitMediaBorderRadius'] : array();
$image_border_radius_tablet_obj = is_array( $attributes['splitMediaBorderRadiusTablet'] ?? null ) ? $attributes['splitMediaBorderRadiusTablet'] : array();
$image_border_radius_mobile_obj = is_array( $attributes['splitMediaBorderRadiusMobile'] ?? null ) ? $attributes['splitMediaBorderRadiusMobile'] : array();

// Image border — width is a box-object family (base only, no tiers, matches
// the pre-existing base-only contract). Style/colour stay scalar attrs.
$image_border_style     = sgs_css_keyword_sanitise( $attributes['splitMediaBorderStyle'] ?? 'none' );
$image_border_width_obj = is_array( $attributes['splitMediaBorderWidth'] ?? null ) ? $attributes['splitMediaBorderWidth'] : array();
$image_border_colour    = $attributes['splitMediaBorderColour'] ?? '';
// D636 border-colour gradient — sibling attribute, wins over $image_border_colour when set.
$image_border_colour_gradient = sgs_css_gradient_value( $attributes['splitMediaBorderColourGradient'] ?? '' );
// Hover pair (2026-09-07), colour-only — mirrors sgs/button's own accepted
// limitation (D636): the masked-::before gradient hover only exists when
// the RESTING state is already a gradient (see the gradient builder below).
$image_border_colour_hover          = $attributes['splitMediaBorderColourHover'] ?? '';
$image_border_colour_hover_gradient = sgs_css_gradient_value( $attributes['splitMediaBorderColourHoverGradient'] ?? '' );

// splitMediaPadding — inner padding on the <img> element itself. Box-object
// family: base + tablet + mobile, each { top, right, bottom, left }.
$image_padding_obj        = is_array( $attributes['splitMediaPadding'] ?? null ) ? $attributes['splitMediaPadding'] : array();
$image_padding_tablet_obj = is_array( $attributes['splitMediaPaddingTablet'] ?? null ) ? $attributes['splitMediaPaddingTablet'] : array();
$image_padding_mobile_obj = is_array( $attributes['splitMediaPaddingMobile'] ?? null ) ? $attributes['splitMediaPaddingMobile'] : array();

// mediaPadding — outer padding + background on the .sgs-hero__media wrapper.
$media_padding_obj        = is_array( $attributes['mediaPadding'] ?? null ) ? $attributes['mediaPadding'] : array();
$media_padding_tablet_obj = is_array( $attributes['mediaPaddingTablet'] ?? null ) ? $attributes['mediaPaddingTablet'] : array();
$media_padding_mobile_obj = is_array( $attributes['mediaPaddingMobile'] ?? null ) ? $attributes['mediaPaddingMobile'] : array();

// contentPadding — padding on the .sgs-hero__content wrapper. TIER-OF-BOXES
// OBJECT {desktop,tablet,mobile} as of Spec 35 box-tier migration (2026-08-11)
// — the contentPaddingTablet/contentPaddingMobile sibling attrs no longer
// exist in this block's schema; sgs_responsive_normalise_object() is the
// canonical reader (helpers-responsive.php:273), box=true so an unset/legacy
// value never mis-resolves as a flat side (D328 defence).
$content_padding_tiers      = sgs_responsive_normalise_object( $attributes['contentPadding'] ?? null, true );
$content_padding_obj        = is_array( $content_padding_tiers['desktop'] ) ? $content_padding_tiers['desktop'] : array();
$content_padding_tablet_obj = is_array( $content_padding_tiers['tablet'] ) ? $content_padding_tiers['tablet'] : array();
$content_padding_mobile_obj = is_array( $content_padding_tiers['mobile'] ) ? $content_padding_tiers['mobile'] : array();

// HC2: per-breakpoint text-align on .sgs-hero__content. Desktop = base rule
// (no @media), tablet/mobile via the scoped <style> @media mechanism — mirrors
// the existing responsive-CSS builder. Empty string / 'inherit' = no emit so
// unset instances keep the variant's own alignment (sgs-hero--align-*).
$text_align_tiers   = sgs_responsive_normalise_object( $attributes['textAlign'] ?? null );
$text_align_desktop = $text_align_tiers['desktop'] ?? '';
$text_align_tablet  = $text_align_tiers['tablet'] ?? '';
$text_align_mobile  = $text_align_tiers['mobile'] ?? '';
$allowed_text_align = array( 'left', 'center', 'right', 'start', 'end', 'justify' );

// Layout grid (split variant). splitColumnRatio* was retired (Step 6 / D-next,
// 2026-06-11) — render.php now reads gridTemplateColumns* exclusively.
// The former deprecated.js v7 migrate() mapped splitColumnRatio→gridTemplateColumns; deprecations were deleted at D271, so un-migrated posts keep the legacy attr.
// R-31-14: no legacy read-time fallback for splitColumnRatio.
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
$vertical_alignment = $attributes['verticalAlignment'] ?? 'center';

// ── Grid-track alignment (split variant) + flex-axis controls (standard
// variant) — 7 attributes declared in block.json with real inspector controls
// that render.php never read at all until now (root-caused this session: no
// grep match anywhere in this file). Hero has exactly TWO variants (`standard`
// / `split`, see the `variant` enum above) and its root element is a genuine
// CSS layout container either way — `.sgs-hero{display:flex}` is the base rule
// in style.css, and `.sgs-hero--split{display:grid}` overrides it for split
// (mirrored below by the unconditional `.uid{display:grid}` emission inside
// the `$is_split` branch). So: justifyItems/alignContent/gridAutoRows/
// gridTemplateRows are GRID-track properties, meaningful only when split;
// justifyContent/flexDirection/flexWrap are FLEX-axis properties, meaningful
// only when NOT split. Gating + allowlists mirror
// SGS_Container_Wrapper's own grid/flex branches exactly
// (includes/class-sgs-container-wrapper.php ~L879-902), so a value here means
// the same thing an operator already knows from sgs/container. Never routed
// through the shared wrapper itself (Composite-mirror rule, CLAUDE.md) —
// hero's split grid is bespoke (fixed 2-column, not the wrapper's generic
// column-count grid), so these extend hero's OWN existing $is_split CSS
// builder below rather than the wrapper's generic branch.
$justify_items         = $attributes['justifyItems'] ?? 'stretch';
$align_content         = $attributes['alignContent'] ?? 'stretch';
$allowed_justify_items = array( 'stretch', 'start', 'center', 'end' );
$allowed_align_content = array( 'stretch', 'start', 'center', 'end', 'space-between', 'space-around', 'space-evenly' );
if ( ! in_array( $justify_items, $allowed_justify_items, true ) ) {
	$justify_items = 'stretch';
}
if ( ! in_array( $align_content, $allowed_align_content, true ) ) {
	$align_content = 'stretch';
}
// gridAutoRows is a plain scalar (block.json: type string, default '') —
// is_array guard mirrors the wrapper's own D549 defence (a future tier-object
// migration of this attr would otherwise PHP-coerce to the literal "Array").
$grid_auto_rows = $attributes['gridAutoRows'] ?? '';
$grid_auto_rows = is_array( $grid_auto_rows ) ? '' : $grid_auto_rows;
// gridTemplateRows is ALREADY a TIER OBJECT on this block (block.json: type
// object, default {}) — same shape as gridTemplateColumns above, read through
// the same shared normaliser.
$grid_row_tiers           = sgs_responsive_normalise_object( $attributes['gridTemplateRows'] ?? null );
$grid_row_template        = $grid_row_tiers['desktop'] ?? '';
$grid_row_template_tablet = $grid_row_tiers['tablet'] ?? '';
$grid_row_template_mobile = $grid_row_tiers['mobile'] ?? '';

// Flex-axis attrs — apply to the root ONLY on the non-split (flex) variant.
// flexWrap's block.json default is 'wrap' (not '') — an untouched instance
// therefore already resolves to 'wrap' via the `?? 'wrap'` fallback below, and
// gating emission on "differs from that default" (not "is non-empty") is what
// keeps an untouched hero byte-identical: style.css has never declared a
// flex-wrap rule for `.sgs-hero`, so the current live default is the browser's
// own initial `nowrap` — emitting 'wrap' unconditionally would be a real,
// silent behaviour change for every existing hero on this attribute's default.
$justify_content         = $attributes['justifyContent'] ?? '';
$flex_direction          = $attributes['flexDirection'] ?? '';
$flex_wrap               = $attributes['flexWrap'] ?? 'wrap';
$allowed_justify_content = array( '', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around' );
$allowed_flex_direction  = array( '', 'row', 'column' );
$allowed_flex_wrap       = array( 'wrap', 'nowrap' );
if ( ! in_array( $justify_content, $allowed_justify_content, true ) ) {
	$justify_content = '';
}
if ( ! in_array( $flex_direction, $allowed_flex_direction, true ) ) {
	$flex_direction = '';
}
if ( ! in_array( $flex_wrap, $allowed_flex_wrap, true ) ) {
	$flex_wrap = 'wrap';
}

// Split layout renders the media column on the explicit 'split' variant.
// FR-22-20 (2026-06-01): the cloning converter now DETECTS the variant from the
// draft's extracted fingerprint and sets variant='split' (universal variant
// detection — see Spec 22 §FR-22-20), so this original gate is correct. The
// 2026-06-01 data-presence band-aid (`|| ! empty( $split_image['url'] )`) is
// reverted per D133 — it mis-fired on stale data; variant detection replaces it.
$is_split = ( 'split' === $variant );

// Build wrapper styles.
$styles = array();
// min-height base is NOT inline (Pattern A, D-migration): it has tablet/mobile
// tiers, so base+tablet+mobile are emitted together on the SAME .uid selector
// in the scoped <style> below. minHeight* stays NULLED in the container-wrapper
// attr copy (C3 double-emit guard) — the hero's scoped style is the ONE channel.

// Transition custom properties — consumed by CSS vars on the block and its children.
$styles = array_merge( $styles, sgs_transition_vars( $attributes ) );

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

// D702 — root background/text colour declarations, resting + hover, each
// emitted as a scoped `.uid{…}` / `.uid:hover,.uid:focus-visible{…}` rule via
// the shared helper (single call below). Gradient siblings win over the flat
// colour via sgs_background_paint_decl()/sgs_resolve_text_colour_or_gradient()
// (D636 storage shape) — mirrors heading/render.php's own text-colour builder.
$resting_decls           = array();
$resting_background_decl = sgs_background_paint_decl( $resting_background_colour, $resting_background_colour_gradient );
if ( '' !== $resting_background_decl ) {
	$resting_decls[] = $resting_background_decl;
}
$resting_text_colour_effective = sgs_resolve_text_colour_or_gradient( $resting_text_colour, $resting_text_colour_gradient );
if ( '' !== $resting_text_colour_effective ) {
	$resting_text_colour_decl = sgs_text_colour_decl( $resting_text_colour_effective );
	if ( '' !== $resting_text_colour_decl ) {
		$resting_decls[] = $resting_text_colour_decl;
	}
}

// Hover colour declarations — emitted as a scoped .uid{…}:hover rule via the
// shared helper. No fallback values for border-colour (matches the info-box
// pattern, unchanged) — background/text now go through the gradient-aware
// resolvers above.
$hover_decls           = array();
$hover_background_decl = sgs_background_paint_decl( $hover_background_colour, $hover_background_colour_gradient );
if ( '' !== $hover_background_decl ) {
	$hover_decls[] = $hover_background_decl;
}
$hover_text_colour_effective = sgs_resolve_text_colour_or_gradient( $hover_text_colour, $hover_text_colour_gradient );
if ( '' !== $hover_text_colour_effective ) {
	$hover_text_colour_decl = sgs_text_colour_decl( $hover_text_colour_effective );
	if ( '' !== $hover_text_colour_decl ) {
		$hover_decls[] = $hover_text_colour_decl;
	}
}
if ( $hover_border_colour ) {
	$hover_decls[] = 'border-color:' . sgs_colour_value( $hover_border_colour );
}
if ( $resting_decls || $hover_decls ) {
	$responsive_css .= sgs_emit_state_colour_css( $root_sel, $resting_decls, $hover_decls );
}
// Old-browser fallback for a gradient backgroundColour/textColour text-colour
// path (background-clip: text) — a no-op ('') when the flat colour applies
// (no gradient sibling set), matching heading/render.php's identical pattern.
$resting_text_colour_fallback_rule = sgs_text_colour_gradient_fallback_rule( $root_sel, $resting_text_colour_effective );
if ( '' !== $resting_text_colour_fallback_rule ) {
	$responsive_css .= $resting_text_colour_fallback_rule;
}
if ( $hover_decls ) {
	$hover_text_colour_fallback_rule = sgs_hover_media_wrap(
		sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover', $hover_text_colour_effective )
	) . sgs_text_colour_gradient_fallback_rule( $root_sel . ':focus-visible', $hover_text_colour_effective );
	if ( '' !== $hover_text_colour_fallback_rule ) {
		$responsive_css .= $hover_text_colour_fallback_rule;
	}
}

// --- Border gradient, hover state (D636 border builder) — masked ::before,
// scoped to the ":hover" selector itself so it paints ONLY on hover (the
// wrapper has no resting border-colour attribute of its own; the flat-colour
// path above already reads as inert at rest — border-style is never set — so
// the gradient mask mirrors that: it only exists inside the :hover rule). ---
if ( '' !== $hover_border_colour_gradient ) {
	$responsive_css .= sgs_hover_media_wrap(
		sgs_border_gradient_css( SGS_HOVER_NOT_TOUCH . " {$root_sel}:hover", $hover_border_colour_gradient, null, '1px' )
	);
}

// Split variant: replace the default flex layout with CSS Grid.
// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// display:grid is deferred to the scoped .uid rule (was previously pushed inline via $styles).
if ( $is_split ) {
	$responsive_css .= '.' . $uid . '{display:grid}';

	// ── Grid-track alignment + row controls (justifyItems/alignContent/
	// gridAutoRows/gridTemplateRows) — mirrors SGS_Container_Wrapper's own
	// grid branch gating exactly (unset/default = no declaration, matching
	// the browser's own grid initial values, so an untouched split hero stays
	// byte-identical). See the attribute-read block above for the rationale.
	if ( 'stretch' !== $justify_items ) {
		$responsive_css .= '.' . $uid . '{justify-items:' . esc_attr( $justify_items ) . '}';
	}
	if ( 'stretch' !== $align_content ) {
		$responsive_css .= '.' . $uid . '{align-content:' . esc_attr( $align_content ) . '}';
	}
	if ( '' !== trim( (string) $grid_auto_rows ) ) {
		$responsive_css .= '.' . $uid . '{grid-auto-rows:' . esc_attr( sgs_sanitize_grid_template( $grid_auto_rows ) ) . '}';
	}
	if ( '' !== trim( (string) $grid_row_template ) ) {
		$responsive_css .= '.' . $uid . '{grid-template-rows:' . esc_attr( sgs_sanitize_grid_template( $grid_row_template ) ) . '}';
	}
	if ( '' !== trim( (string) $grid_row_template_tablet ) ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . '{grid-template-rows:' . esc_attr( sgs_sanitize_grid_template( $grid_row_template_tablet ) ) . '}}';
	}
	if ( '' !== trim( (string) $grid_row_template_mobile ) ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . '{grid-template-rows:' . esc_attr( sgs_sanitize_grid_template( $grid_row_template_mobile ) ) . '}}';
	}

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
	$band     = '';
	if ( 'normal' === $cw_raw ) {
		// Tie to the theme.json global (framework default 1200px; per-site
		// override in the snapshot, e.g. Indus 1140px) — no hardcoded px
		// fallback, which would mask the theme value if the var ever resolved.
		$band = 'var(--wp--style--global--content-size)';
	} elseif ( 'wide' === $cw_raw ) {
		$band = 'var(--wp--style--global--wide-size)';
	} elseif ( '' !== $cw_raw && 'full' !== $cw_raw ) {
		$band = sgs_css_length_value( $cw_raw );
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
	$safe_ratio      = preg_match( '/^[\d.\s%a-zA-Z()+\-*\/]+$/', $split_col_ratio ) ? $split_col_ratio : '1fr 1fr';
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
	$hero_gap     = sgs_container_gap_value( $hero_gap_obj['desktop'] ?? '' );
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
	// Split-image height is NOT emitted here. The `splitImageHeight` family wrote
	// `height` to `.sgs-hero__split-image` — the exact same property on the exact
	// same element as `splitMediaHeight` below, so the two contended for one routing
	// slot. `splitMediaHeight` is the survivor: it carries a configurable unit
	// (`splitMediaHeightUnit`) rather than hardcoding px, forces no `object-fit`, and is
	// named consistently across all three tiers. See the splitMediaHeight block below.

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
} else {
	// ── Flex-axis controls (non-split variants) — justifyContent/flexDirection/
	// flexWrap. `.sgs-hero{display:flex}` is the base rule in style.css (the
	// standard variant then adds `flex-direction:column;justify-content:center`
	// at class specificity (0,1,0) via `.sgs-hero--standard`); these three
	// attrs let an operator override that on the scoped `.uid` rule, which
	// out-specifies the class default by source + specificity, matching every
	// other scoped override in this file. Unset/default = no declaration, so
	// an untouched hero keeps the CSS-class default unchanged.
	if ( '' !== $flex_direction ) {
		$responsive_css .= '.' . $uid . '{flex-direction:' . esc_attr( $flex_direction ) . '}';
	}
	if ( '' !== $justify_content ) {
		$responsive_css .= '.' . $uid . '{justify-content:' . esc_attr( $justify_content ) . '}';
	}
	if ( 'wrap' !== $flex_wrap ) {
		$responsive_css .= '.' . $uid . '{flex-wrap:' . esc_attr( $flex_wrap ) . '}';
	}
}

// ── splitMediaPadding: box-object family — base + tablet + mobile (on the <img>
// element). Gated on $is_split, matching the old emission's scope.
if ( $is_split ) {
	$img_pad_base = sgs_box_object_shorthand( $image_padding_obj );
	if ( null !== $img_pad_base ) {
		$responsive_css .= '.' . $uid . ' .sgs-hero__split-media{padding:' . $img_pad_base . '}';
	}
	$img_pad_tab = sgs_box_object_shorthand( $image_padding_tablet_obj );
	if ( null !== $img_pad_tab ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-media{padding:' . $img_pad_tab . '}}';
	}
	$img_pad_mob = sgs_box_object_shorthand( $image_padding_mobile_obj );
	if ( null !== $img_pad_mob ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-media{padding:' . $img_pad_mob . '}}';
	}
}

// ── splitMediaBorderRadius: box-object family — base + tablet + mobile.
// Gated on $is_split to match the old inline emission (which only ran inside
// the split-image branch).
if ( $is_split ) {
	$img_radius_base = sgs_corner_object_shorthand( $image_border_radius_obj );
	if ( null !== $img_radius_base ) {
		$responsive_css .= '.' . $uid . ' .sgs-hero__split-media{border-radius:' . $img_radius_base . '}';
	}
	$img_radius_tab = sgs_corner_object_shorthand( $image_border_radius_tablet_obj );
	if ( null !== $img_radius_tab ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-media{border-radius:' . $img_radius_tab . '}}';
	}
	$img_radius_mob = sgs_corner_object_shorthand( $image_border_radius_mobile_obj );
	if ( null !== $img_radius_mob ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-media{border-radius:' . $img_radius_mob . '}}';
	}

	// ── splitMediaBorderWidth / style / colour — box-object family (base only, no
	// tiers). Moved here from the inline style="" on the <img> element
	// (contract §A) — was previously the only remaining inline decl on the
	// split image alongside object-fit/object-position (below).
	// G5 (Bean, 2026-08-26): THIS is the bug that bit the hero image —
	// 'style set, no width' fell through to the browser's initial medium
	// (~3px) border-width. border-style is now only ever emitted alongside
	// a real width; a width-only or colour-only declaration is unchanged
	// (CSS's initial border-style is already 'none', so those already
	// rendered no visible border).
	$img_border_width_val = sgs_box_object_shorthand( $image_border_width_obj );
	$img_border_has_width = null !== $img_border_width_val;
	if ( 'none' !== $image_border_style || $img_border_has_width ) {
		$img_border_decls = array();
		if ( $img_border_has_width ) {
			$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
			$safe_border_style     = in_array( $image_border_style, $allowed_border_styles, true ) ? $image_border_style : 'solid';
			$img_border_decls[]    = 'border-width:' . $img_border_width_val;
			if ( 'none' !== $safe_border_style ) {
				$img_border_decls[] = 'border-style:' . $safe_border_style;
			}
		}
		if ( $image_border_colour ) {
			$img_border_decls[] = 'border-color:' . sgs_colour_value( $image_border_colour );
		}
		if ( $img_border_decls ) {
			$responsive_css .= '.' . $uid . ' .sgs-hero__split-media{' . implode( ';', $img_border_decls ) . '}';
		}
		// Hover colour (2026-09-07), flat-only — the masked-gradient hover
		// only exists when the resting state is already a gradient (handled
		// below), matching sgs/button's own accepted limitation (D636): a
		// hover gradient with a flat resting colour is unsupported here.
		if ( $image_border_colour_hover && '' === $image_border_colour_gradient ) {
			$responsive_css .= sgs_hover_state_rules(
				'.' . $uid . ' .sgs-hero__split-media',
				'border-color:' . sgs_colour_value( $image_border_colour_hover ) . ';'
			);
		}
	}

	// D636 border builder — masked ::before, wins over the flat border-color
	// decl above (emitted after it so the cascade favours the mask). Hover
	// pair (2026-09-07): hover gradient wins over hover flat colour, same
	// ternary shape as sgs/button/render.php's own border-gradient call.
	if ( '' !== $image_border_colour_gradient ) {
		$responsive_css .= sgs_border_gradient_css(
			'.' . $uid . ' .sgs-hero__split-media',
			$image_border_colour_gradient,
			'' !== $image_border_colour_hover_gradient ? $image_border_colour_hover_gradient : sgs_colour_value( $image_border_colour_hover ),
			$img_border_has_width ? $img_border_width_val : '1px'
		);
	}

	// ── object-fit / object-position — Wave 6 (2026-09-01). Now emitted by the
	// shared `object-fit`/`focal-point` atoms (prefix 'splitMedia', which
	// reproduces `splitMediaObjectFit`/`splitMediaObjectPosition*` EXACTLY —
	// see block.json's `_comment_mediaElements`), via `SGS_Media_Element::style()`.
	// REPLACES the hand-rolled `object-fit`/`object-position` CSS this block
	// used to build directly (base + tablet tiers here; the mobile-tier
	// override that used to live separately near the media-assembly site
	// below is ALSO replaced — the atom's own `css()` already emits all three
	// tiers). Targets the universal `.sgs-media-el` marker class, added to
	// every tier element (image/video/svg) via `sgs_tier_media_render()`'s
	// `$extra` parameter below — object-fit/object-position are no-ops on the
	// SVG `<span>` tier regardless of whether the rule reaches it (replaced-
	// element properties only), so a single unscoped-by-type marker is safe.
	// The atom's own `validate()` already rejects `custom` (hero's own
	// explicit-sizing sentinel — see `object-fit.js`'s module docblock) to ''
	// for the fit property, so no separate `'custom' !== $image_object_fit`
	// gate is needed here — it degrades identically to the old hand-rolled gate.
	$responsive_css .= SGS_Media_Element::style(
		$attributes,
		'splitMedia',
		'sgs/hero',
		$uid,
		array( 'object-fit', 'focal-point' )
	);
}

// ── splitMediaWidth: base + tablet + mobile (custom fit only) ──────────────────
// Base moved here from the inline style="" on the split <img> (Pattern A).
if ( 'custom' === $image_object_fit ) {
	if ( null !== $image_width ) {
		$responsive_css .= '.' . $uid . ' .sgs-hero__split-media{width:' . absint( $image_width ) . esc_attr( $image_width_unit ) . '}';
	}
	if ( null !== $image_width_tablet ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-media{width:' . absint( $image_width_tablet ) . esc_attr( $image_width_unit ) . '}}';
	}
	if ( null !== $image_width_mobile ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-media{width:' . absint( $image_width_mobile ) . esc_attr( $image_width_unit ) . '}}';
	}
}

// ── splitMediaHeight: base + tablet + mobile, UNCONDITIONAL ────────────────────
// Deliberately OUTSIDE the `custom` object-fit gate above (2026-08-10). Height
// used to be gated with width, while the now-removed `splitImageHeight` family
// wrote the same property to the same element with NO gate. Consolidating onto
// `splitMediaHeight` therefore has to keep the UNGATED reach, or every hero that set
// a split-image height without also choosing `custom` object-fit would silently
// lose it. Width stays gated — it never had an ungated equivalent.
// Emitted base -> tablet -> mobile so the later, narrower @media rule wins at
// its own width (same cascade convention as gap/grid-template-columns above).
if ( null !== $image_height ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__split-media{height:' . absint( $image_height ) . esc_attr( $image_height_unit ) . '}';
}
if ( null !== $image_height_tablet ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__split-media{height:' . absint( $image_height_tablet ) . esc_attr( $image_height_unit ) . '}}';
}
if ( null !== $image_height_mobile ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__split-media{height:' . absint( $image_height_mobile ) . esc_attr( $image_height_unit ) . '}}';
}

// ── C19 item 3 (2026-09-04): box-shape atom's remaining bases — sizing MODE,
// named SHAPE, aspect ratio, min-height, max-width/height/percent. Reuses the
// atom's own PHP twin helper functions (includes/media/atoms/box-shape.php,
// already required via render-helpers.php) rather than reimplementing them by
// hand. Deliberately does NOT gate the pre-existing width/height emission
// above by sizing mode — those stay UNGATED for back-compat (see the comment
// on the height block above: gating by mode would silently drop height for
// any pre-existing hero that set it while objectFit stayed 'cover', which
// resolves to mode 'auto'). Mode instead governs the EDITOR disclosure only
// (which control is greyed) plus these NEW, additive properties, which are
// inert on every pre-existing hero (their attrs default empty/'none').
$image_media_sizing = sgs_media_atom_box_shape_resolve_sizing_mode( $attributes['splitMediaMediaSizing'] ?? null, $image_object_fit );
$image_shape        = sgs_media_atom_box_shape_validate_shape( $attributes['splitMediaShape'] ?? null );
$image_aspect_ratio = sgs_media_atom_box_shape_normalise_ratio( $attributes['splitMediaAspectRatio'] ?? null );

if ( 'ratio' === $image_media_sizing && '' !== $image_aspect_ratio ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__split-media{aspect-ratio:' . esc_attr( $image_aspect_ratio ) . '}';
}

if ( 'none' !== $image_shape ) {
	$image_clip_paths = sgs_media_atom_box_shape_clip_paths();
	if ( isset( $image_clip_paths[ $image_shape ] ) ) {
		$responsive_css .= '.' . $uid . ' .sgs-hero__split-media{clip-path:' . esc_attr( $image_clip_paths[ $image_shape ] ) . '}';
	}
}

// splitMediaMinHeight — a SINGLE tier-object attr {desktop,tablet,mobile},
// matching the atom's own control shape (box-shape.control.js only ever
// writes the .desktop key — no separate Tablet/Mobile sibling attrs, unlike
// every other tier family in this file).
$image_min_height_obj = sgs_media_atom_box_shape_resolve_tier_object( $attributes['splitMediaMinHeight'] ?? null );
$image_min_height_bp  = array(
	'desktop' => '',
	'tablet'  => '1023px',
	'mobile'  => '767px',
);
foreach ( $image_min_height_bp as $sgs_hero_min_height_tier => $sgs_hero_min_height_bp ) {
	$sgs_hero_min_height_val = $image_min_height_obj[ $sgs_hero_min_height_tier ] ?? null;
	$sgs_hero_min_height_css = sgs_media_atom_box_shape_format_length(
		$sgs_hero_min_height_val,
		'px',
		! empty( $image_min_height_obj['__unitEmbedded'] )
	);
	if ( '' === $sgs_hero_min_height_css ) {
		continue;
	}
	$sgs_hero_min_height_decl = '.' . $uid . ' .sgs-hero__split-media{min-height:' . esc_attr( $sgs_hero_min_height_css ) . '}';
	$responsive_css          .= '' === $sgs_hero_min_height_bp
		? $sgs_hero_min_height_decl
		: '@media (max-width:' . $sgs_hero_min_height_bp . '){' . $sgs_hero_min_height_decl . '}';
}

// splitMediaMaxWidth / splitMediaMaxHeight — DESKTOP tier only, matching the
// atom's own css() (no tablet/mobile reach for max-width/max-height).
$image_max_width_obj  = is_array( $attributes['splitMediaMaxWidth'] ?? null ) ? $attributes['splitMediaMaxWidth'] : array();
$image_max_width_unit = sgs_css_length_value( $attributes['splitMediaMaxWidthUnit'] ?? 'px' );
if ( isset( $image_max_width_obj['desktop'] ) && '' !== $image_max_width_obj['desktop'] && is_numeric( $image_max_width_obj['desktop'] ) ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__split-media{max-width:' . absint( $image_max_width_obj['desktop'] ) . esc_attr( $image_max_width_unit ) . '}';
}

$image_max_height_obj  = is_array( $attributes['splitMediaMaxHeight'] ?? null ) ? $attributes['splitMediaMaxHeight'] : array();
$image_max_height_unit = sgs_css_length_value( $attributes['splitMediaMaxHeightUnit'] ?? 'px' );
if ( isset( $image_max_height_obj['desktop'] ) && '' !== $image_max_height_obj['desktop'] && is_numeric( $image_max_height_obj['desktop'] ) ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__split-media{max-height:' . absint( $image_max_height_obj['desktop'] ) . esc_attr( $image_max_height_unit ) . '}';
}

// splitMediaMaxWidthPercent — a bare percentage, same concept sgs/decorative-image
// uses (decorMedia's maxWidthPercent). Emitted AFTER the max-width object
// block above so it wins the cascade when an operator sets both.
$image_max_width_percent = $attributes['splitMediaMaxWidthPercent'] ?? null;
if ( is_numeric( $image_max_width_percent ) ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__split-media{max-width:' . esc_attr( (string) $image_max_width_percent ) . '%}';
}

// ── mediaPadding: box-object family — base + tablet + mobile (on .sgs-hero__media).
$media_pad_base = sgs_box_object_shorthand( $media_padding_obj );
if ( null !== $media_pad_base ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__media{padding:' . $media_pad_base . '}';
}
$media_pad_tab = sgs_box_object_shorthand( $media_padding_tablet_obj );
if ( null !== $media_pad_tab ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__media{padding:' . $media_pad_tab . '}}';
}
$media_pad_mob = sgs_box_object_shorthand( $media_padding_mobile_obj );
if ( null !== $media_pad_mob ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__media{padding:' . $media_pad_mob . '}}';
}

// mediaBackground — moved here from the inline style="" on the media wrapper
// (contract §A). The shared per-area schema attr; the legacy mediaBackgroundColour
// attr was removed 2026-07-23 (it duplicated this on css:background-color / element
// media and collided in the routing DB — mediaBackground is the sole canonical source).
// Gradient support (D561) mirrors the whole-block overlay's
// linear-gradient(%ddeg,%s,%s) shape 1:1 (includes/class-sgs-container-wrapper.php ~1159-1176).
$media_bg_resolved = $attributes['mediaBackground'] ?? '';
// mediaBackgroundGradient is ONE attribute holding the complete CSS gradient
// value, validated through sgs_css_gradient_value().
$media_bg_gradient_value = sgs_css_gradient_value( $attributes['mediaBackgroundGradient'] ?? '' );
if ( $media_bg_gradient_value ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__media{background-image:' . $media_bg_gradient_value . '}';
} elseif ( $media_bg_resolved ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__media{background-color:' . sgs_colour_value( $media_bg_resolved ) . '}';
}

// mediaOverlay — a SEPARATE overlay layered on TOP of the split media (image/
// video/SVG), distinct from mediaBackground above (which paints BEHIND an
// object-fit:cover image and is therefore invisible whenever media is
// present). Wave 6 (2026-09-01): the hand-rolled colour/gradient resolution
// that used to live here, plus the `$media_overlay_html` span it fed, are
// GONE — `mediaOverlayColour`/`mediaOverlayGradient` (+ Hover/Opacity/
// BlendMode siblings) are now read entirely by the shared `overlay` atom's
// PHP twin (`sgs_media_atom_overlay_css()`), which routes through the SAME
// `sgs_background_paint_value()` primitive `sgs_overlay_decls()` itself uses
// — see the `SGS_Media_Element::style()` call at the media-assembly site
// further down this file, and block.json's `_comment_mediaElements`.

// Media motion — mediaParallax/mediaKenBurns/mediaAnimationDuration (2026-08-13).
// A SEPARATE control family from the section's own bgParallax/bgKenBurns
// (read further below): those animate the SECTION BACKGROUND; these animate
// the foreground split-media column (`.sgs-hero__media`) itself. Mutually
// exclusive in the editor (edit.js); Ken-burns wins if somehow both are set.
$media_parallax           = ! empty( $attributes['mediaParallax'] );
$media_ken_burns          = ! empty( $attributes['mediaKenBurns'] ) && ! $media_parallax;
$media_animation_duration = isset( $attributes['mediaAnimationDuration'] ) ? absint( $attributes['mediaAnimationDuration'] ) : 20;

// ── contentPadding: box-object family — base + tablet + mobile (on .sgs-hero__content).
$content_pad_base = sgs_box_object_shorthand( $content_padding_obj );
if ( null !== $content_pad_base ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__content{padding:' . $content_pad_base . '}';
}
$content_pad_tab = sgs_box_object_shorthand( $content_padding_tablet_obj );
if ( null !== $content_pad_tab ) {
	$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__content{padding:' . $content_pad_tab . '}}';
}
$content_pad_mob = sgs_box_object_shorthand( $content_padding_mobile_obj );
if ( null !== $content_pad_mob ) {
	$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__content{padding:' . $content_pad_mob . '}}';
}

// ── .sgs-hero__content base layout + background — moved here from the inline
// style="" built further down (contract §A). display:flex/flex-direction are
// structural declarations (previously duplicated in style.css AND inline);
// justify-content is driven by verticalAlignment (top/center/bottom).
$content_background = isset( $attributes['contentBackground'] ) ? (string) $attributes['contentBackground'] : '';
// Gradient support (D561) mirrors the whole-block overlay's
// linear-gradient(%ddeg,%s,%s) shape 1:1 (includes/class-sgs-container-wrapper.php ~1159-1176).
// contentBackgroundGradient is ONE attribute holding the complete CSS gradient
// value, validated through sgs_css_gradient_value().
$content_bg_gradient_value = sgs_css_gradient_value( $attributes['contentBackgroundGradient'] ?? '' );
$v_align_map               = array(
	'top'    => 'flex-start',
	'center' => 'center',
	'bottom' => 'flex-end',
);
$content_justify           = $v_align_map[ $vertical_alignment ] ?? 'center';
$content_decls             = array( 'display:flex', 'flex-direction:column', 'justify-content:' . $content_justify );
if ( $content_bg_gradient_value ) {
	$content_decls[] = 'background-image:' . $content_bg_gradient_value;
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
	// removes the hero from that selector's match set.
	'alignfull',
	$uid,
);

if ( $bg_parallax ) {
	$classes[] = 'sgs-hero--parallax';
}
if ( $bg_ken_burns ) {
	$classes[] = 'sgs-hero--ken-burns';
}

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// (composite caveat, per the migration contract: do NOT pass these as wrapper
// `extra_styles` — that path inlines). Base spacing (padding/margin) is a
// SEPARATE mechanism the wrapper already handles scoped internally (reads
// $attributes['style']['spacing'] directly) — not duplicated here.

$hero_style_engine_args = array();

// (native border_args removed by the Shape-B migration -- width/style/colour
//  are block-private attrs now, emitted below)

if ( ! empty( $hero_style_engine_args ) ) {
	$hero_scoped_styles = wp_style_engine_get_styles(
		$hero_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $hero_scoped_styles['css'] ) ) {
		$responsive_css .= $hero_scoped_styles['css'];
	}
}

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). Replaces the old WP-native
// supports.typography (fontSize/lineHeight/letterSpacing/textTransform/
// fontWeight/fontStyle), which had been scoped to `.sgs-hero__headline` — a
// class hero's own rendered markup never emits (see block.json's
// `_selectorsNote`), so those 6 controls were silent no-ops. Scoped to
// $root_sel (the wrapper), matching block.json's corrected `selectors.typography`.
$responsive_css .= sgs_typography_css_rule( $attributes, '', $root_sel );

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color class onto the wrapper — re-add it manually (mirrors sgs/quote)
// so preset palette text colours still resolve visually.
$hero_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
if ( '' !== $hero_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $hero_preset_text_slug . '-color';
}
// D6: native `supports.color` background/gradients are REMOVED — the overlay
// mechanism (GradientOverlayControl / overlayGradient / backgroundOverlayColour)
// is the ONLY background-colour concept on this block.
//
// `has-background` still needs setting here (not just left to the overlay's
// own render) so the style.css default-gradient suppression
// (`.sgs-hero:not(.has-background)`, style.css line ~50) fires — without it
// the framework's default primary-dark→primary gradient shows through a
// translucent overlay colour.
//
// The RESTING background (`backgroundColour` / `backgroundColourGradient`) needs
// it for the same reason, and did not set it until 2026-08-25. That default
// gradient is `background-image`, while the resting colour is painted as
// `background-color` on the block's own `.{uid}` rule — two DIFFERENT properties,
// so they never compete and no amount of `:where()` de-specification helps: the
// image always paints over the colour. Measured live on the Mama's homepage
// clone, where a correct `background-color: surface-pink` sat invisible beneath
// the framework's primary-dark->primary gradient.
// `sgs/cta-section` already sets `has-background` from its own `backgroundColour`
// (cta-section/render.php:391) — this makes the hero mirror it, per the
// composite-mirror rule. Only the suppression flag is added, NOT the
// `has-<slug>-background-color` class: unlike cta-section, the hero paints its
// colour through the scoped `.{uid}` rule, so the preset class would be a second
// owner for one value.
if ( ( '' !== $overlay_colour_raw || $overlay_gradient_value
	|| '' !== $resting_background_colour || '' !== $resting_background_colour_gradient )
	&& ! in_array( 'has-background', $classes, true ) ) {
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

	// object-fit/object-position for the section background video — reads the
	// SAME backgroundSize/backgroundPosition attributes the shared
	// BackgroundPanel's Image tab already writes (the Video tab's new Size/
	// Position controls now write into them too, via the object-fit/
	// focal-point media atoms at backdrop scope — no second attribute
	// family). Mirrors SGS_Container_Wrapper::render()'s equivalent
	// `.sgs-container__video-bg` rule for sgs/container, cta-section,
	// multi-button, physics-canvas, site-footer, site-header, trust-bar —
	// but hero hand-rolls its OWN video markup rather than calling the
	// wrapper for it (see the "composite-mirror divergence" note above this
	// block), so this reads the shared attributes directly and emits its own
	// scoped rule using hero's own $uid/$responsive_css, exactly like the
	// split-media object-fit/object-position rule further up in this file.
	// No-inline contract (Spec 32): routes to the scoped <style>, never onto
	// the <video> tag itself.
	// ⚠ Uses `sgs_media_atom_focal_point_validate()` (includes/media/atoms/
	// focal-point.php, globbed in by render-helpers.php — the SAME validator
	// the split-media object-position rule above already calls), NOT the old
	// `$sgs_css_object_position` closure — that closure was REMOVED from this
	// file in the Wave 6 split-media migration (see the note near the top of
	// this file); calling it here would fatal.
	$bg_video_size          = $attributes['backgroundSize'] ?? 'cover';
	$allowed_bg_video_sizes = array( 'cover', 'contain', 'auto' );
	if ( ! in_array( $bg_video_size, $allowed_bg_video_sizes, true ) ) {
		$bg_video_size = 'cover';
	}
	$bg_video_position = sgs_media_atom_focal_point_validate( $attributes['backgroundPosition'] ?? 'center center', 'Position' );
	if ( '' === $bg_video_position ) {
		$bg_video_position = 'center center';
	}
	$responsive_css .= '.' . $uid . ' .sgs-hero__video-bg{object-fit:' . esc_attr( $bg_video_size ) . ';object-position:' . esc_attr( $bg_video_position ) . '}';
}

// Build standard background image element.
// Using an <img> instead of CSS background-image lets the browser discover the LCP
// resource early and apply fetchpriority="high".
//
// PAGE-SCOPED counter (Fix 3, adversarial-review corrected 2026-08-21): LCP
// priority is a property of the PAGE's render order, not of this block's own
// code path — a private `static $sgs_hero_count` here only knew "am I first
// within HERO's own render calls", so a hero background image followed by a
// sgs/container background image would previously mark BOTH
// `fetchpriority=high`, prioritising neither. sgs_next_background_image_index()
// (helpers-media.php) is now the ONE counter shared with
// SGS_Container_Wrapper's own background-image fast path, so only the image
// that renders first ON THE PAGE — whichever block it belongs to — gets the
// high-priority hint; every later instance stays lazy.
$bg_img_html = '';
if ( $has_standard_bg_image ) {
	require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

	$img_id         = ! empty( $bg_image['id'] ) ? absint( $bg_image['id'] ) : 0;
	$sgs_is_first   = 1 === sgs_next_background_image_index();
	$fetch_priority = $sgs_is_first ? 'high' : 'auto';
	$loading        = $sgs_is_first ? 'eager' : 'lazy';

	$img_attrs = array(
		'class'         => 'sgs-hero__bg-img',
		'aria-hidden'   => 'true',
		'fetchpriority' => $fetch_priority,
		'loading'       => $loading,
		'decoding'      => $sgs_is_first ? 'sync' : 'async',
		'alt'           => '',
	);

	if ( $bg_parallax ) {
		$img_attrs['class'] .= ' sgs-hero__bg-img--parallax';
	}

	$bg_img_html = sgs_responsive_image(
		$img_id,
		$bg_image['url'],
		'',
		'full',
		$img_attrs
	);
}

// Build overlay. NO-INLINE: this block emits zero inline style property
// declarations. Contract + mechanism: Spec 32. Enforced by
// scripts/audit-inline-styling.js --check. background-color/opacity move to

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
		$bwt             = '' !== $border_width_top ? $border_width_top : '0';
		$bwr             = '' !== $border_width_right ? $border_width_right : '0';
		$bwb             = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl             = '' !== $border_width_left ? $border_width_left : '0';
		$responsive_css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$responsive_css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$responsive_css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
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
$radius_tiers = sgs_border_radius_tiers( $attributes );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$responsive_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$responsive_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$responsive_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// the scoped <style> ($responsive_css, appended below) — the element carries
// only its class. Hero renders its own overlay instead of the shared
// wrapper's (per the C3 double-emit guard above).
$overlay_html = '';
// D718: the EXISTENCE test is the shared helper's own return value, not a
// separate hand-written condition. sgs_overlay_decls() returns '' when there is
// nothing to paint, so "is there an overlay?" and "what does it paint?" are one
// decision in one place. SGS_Container_Wrapper gates the identical way, so the
// two sites cannot drift apart on policy.
// D6/Step 8 (2026-08-22): blend mode joins the same call — one shared owner,
// not a second emitter appended after it (the exact divergence D718 closed
// for existence/opacity; blend mode does not reopen it).
$overlay_decls = sgs_overlay_decls( $overlay_colour_raw, $overlay_gradient_value, $overlay_opacity, $overlay_blend_mode );
if ( '' !== $overlay_decls ) {
	$overlay_html    = '<span class="sgs-hero__overlay" aria-hidden="true"></span>';
	$responsive_css .= '.' . $uid . ' .sgs-hero__overlay{' . $overlay_decls . '}';

	// Overlay HOVER state (D6, 2026-08-22) — same shared owner
	// (sgs_overlay_decls()), same pattern as SGS_Container_Wrapper. Opacity
	// and blend mode are not re-passed: the base rule above already declared
	// them, and the more specific `:hover`/`:focus-visible` selector only
	// needs to override colour/gradient. Gated on the span existing at all
	// (the outer `'' !== $overlay_decls` check) — a hover-only value with no
	// resting paint has nothing to select, matching D717/D718's "no colour
	// set means no overlay" rule.
	if ( '' !== $overlay_colour_hover_raw || '' !== $overlay_gradient_hover_raw ) {
		$overlay_hover_paint = sgs_overlay_decls( $overlay_colour_hover_raw, $overlay_gradient_hover_raw );
		if ( '' !== $overlay_hover_paint ) {
			$responsive_css .= sgs_emit_state_colour_css(
				'.' . $uid . ' .sgs-hero__overlay',
				array(),
				array( $overlay_hover_paint )
			);
		}
	}

	// Overlay responsive TIERS (D739) — the tier axis is OPACITY, not colour.
	// Project-standard 768/1024 breakpoints. Only the opacity declaration is
	// re-emitted: colour, gradient and blend mode are deliberately NOT per-tier,
	// so restating them here would make the @media rule a second owner of those
	// properties and it would silently outrank a later desktop edit.
	if ( null !== $overlay_opacity_tablet && '' !== $overlay_opacity_tablet ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-hero__overlay{opacity:' . esc_attr( (float) $overlay_opacity_tablet / 100 ) . '}}';
	}
	if ( null !== $overlay_opacity_mobile && '' !== $overlay_opacity_mobile ) {
		$responsive_css .= '@media (max-width:767px){.' . $uid . ' .sgs-hero__overlay{opacity:' . esc_attr( (float) $overlay_opacity_mobile / 100 ) . '}}';
	}
}

// FR-22-6: all content (label, headline, sub-headline, CTAs) is rendered via
// InnerBlocks. $content is the full serialised child-block output.

// ── Build content column wrapper ───────────────────────────────────────────
// FR-22-6: content column wraps InnerBlocks ($content) directly.
// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// display/flex-direction/justify-content/background-color are ALL emitted
// scoped (.uid .sgs-hero__content{...}) above.
// R-31-14: no scalar content rendering. $content = full InnerBlocks output
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

// Decorative-image toggle (finding 18, 2026-09-02, WCAG 2.1 AA 1.1.1). Only the
// split-media element — the sole real <img>/<video>/svg this block renders —
// gets this; backgroundImage paints via CSS background-image and is never
// exposed to assistive tech, so it carries no such toggle. When on, the alt is
// blanked (covers the image tier) and the media wrapper is marked aria-hidden
// (covers video/svg tiers, which have no alt attribute of their own), mirroring
// sgs/timeline's milestoneMediaDecorative treatment.
$split_media_decorative = ! empty( $attributes['splitMediaDecorative'] );
if ( $split_media_decorative ) {
	$sgs_hero_split_alt = '';
}

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
	$sgs_hero_tier_media    = 'video' === $sgs_hero_resolved_type ? $sgs_hero_tier_video : $sgs_hero_tier_image;
	$sgs_hero_tier_media_id = ! empty( $sgs_hero_tier_media['id'] ) ? absint( $sgs_hero_tier_media['id'] ) : 0;
	$sgs_hero_tier_width    = ! empty( $sgs_hero_tier_media['width'] ) ? absint( $sgs_hero_tier_media['width'] ) : 0;
	$sgs_hero_tier_height   = ! empty( $sgs_hero_tier_media['height'] ) ? absint( $sgs_hero_tier_media['height'] ) : 0;
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
	// `sgs-hero__split-image` is kept as the IMAGE type's extra class — but ONLY
	// for style.css's structural rules (base 100%/100% sizing + the hover-zoom
	// transform, both scoped to `.sgs-hero__split-image`; see style.css ~292 and
	// ~305-318). It is NOT what the editor-controlled splitMedia* CSS below
	// targets any more (fixed 2026-08-27): padding/border-radius/border/width/
	// height now target the shared `.sgs-hero__split-media` base so they reach
	// video and SVG tiers too, and object-fit/object-position target the
	// `--image, --video` compound (replaced-element properties only — a lie on
	// the SVG `<span>`). Previously ALL of that CSS was scoped to
	// `.sgs-hero__split-image`, so video/SVG tiers silently ignored every one of
	// those controls despite the inspector offering them.
	$sgs_hero_split_image_class = 'sgs-hero__split-image';
	// Wave 6 (2026-09-01) — every tier element (image/video/svg) now ALSO
	// carries the universal `sgs-media-el` marker + the `object-fit`/
	// `focal-point` atoms' scope class (prefix 'splitMedia'), so the shared
	// `.sgs-media-el`-keyed stylesheet (`assets/css/media-atoms/object-fit.css`
	// + `focal-point.css`) can reach these elements — the SAME mechanism
	// `sgs/media`/`sgs/before-after` use, not a hero-private duplicate. This
	// is what lets `SGS_Media_Element::style()` above (which computed this
	// exact scope class) actually paint: a rule with nowhere to attach is a
	// silent no-op, so the class MUST reach the same element the rule targets.
	$sgs_hero_media_el_extra = 'sgs-media-el ' . SGS_Media_Element::scope_class( $uid, 'splitMedia' );
	$sgs_hero_tier_result    = sgs_tier_media_render(
		$split_tiers,
		'sgs-hero__split-media',
		$uid,
		$sgs_hero_split_alt,
		array(
			'image' => $sgs_hero_split_image_class . ' ' . $sgs_hero_media_el_extra,
			'video' => $sgs_hero_media_el_extra,
			'svg'   => $sgs_hero_media_el_extra,
		)
	);
	if ( '' !== $sgs_hero_tier_result['html'] ) {
		// Wave 6 — the `overlay` atom (prefix 'media', attachesTo: 'box') paints
		// via `.sgs-media-box::after`, so `.sgs-hero__media` (this wrapper IS
		// that "box") carries the universal `sgs-media-box` marker + its own
		// scope class. REPLACES the hand-rolled `$media_overlay_html` span +
		// its manual background-color/background-image CSS string below —
		// that mechanism bypassed `sgs_overlay_decls()` entirely (no opacity,
		// no blend mode, no hover state); the shared `overlay.css` rule gives
		// all three for free, with zero hero-specific overlay CSS. The marker
		// is added UNCONDITIONALLY (matching every other adopting block) —
		// `overlay.css`'s own `::after` paints fully transparent when no
		// custom property is set, so an unused marker costs nothing.
		$media_class = 'sgs-hero__media sgs-media-box ' . SGS_Media_Element::scope_class( $uid, 'media' );
		// Media motion classes — scoped to `.sgs-hero__media` ONLY (never the
		// root `<section>`), and gated inside this `'' !== …['html']` branch so
		// they can only ever land on a media column that genuinely rendered
		// something (an operator toggling these before picking media leaves
		// $sgs_hero_tier_result['html'] empty, so $media_html itself never
		// prints and neither class reaches the page). Deliberately NOT routed
		// through the shared `motion` atom's `.sgs-media-el` mechanism — see
		// this migration's task report ("judgement calls") for why hero keeps
		// its own ken-burns/parallax CSS (a subtle clipping interaction with
		// the split-image hover-zoom rule that this migration did not risk
		// reproducing without a live canary). The motion atom's EDITOR
		// CONTROL is still fully adopted and writes to these SAME attributes.
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
		$responsive_css .= SGS_Media_Element::style( $attributes, 'media', 'sgs/hero', $uid, array( 'overlay' ) );
		// Decorative wrapper: covers video/svg tiers, which carry no alt attribute
		// of their own; the image tier's alt was already blanked above.
		$media_aria_hidden = $split_media_decorative ? ' aria-hidden="true"' : '';
		$media_html        = '<div class="' . esc_attr( $media_class ) . '"' . $media_aria_hidden . '>' . $sgs_hero_tier_result['html'] . '</div>';
		// ⛔ CALLER CONTRACT (helpers-tier-media.php): this MUST be appended to
		// $responsive_css BEFORE it is printed below — it is, at line ~1166.
		$responsive_css .= $sgs_hero_tier_result['css'];
	}
}

// Output responsive CSS if needed. wp_strip_all_tags (NOT esc_html) blocks a
// </style> breakout while leaving CSS combinators like `>` intact (contract
// §D — matches SGS_Container_Wrapper + sgs/quote + sgs/button). Every value
// reaching $responsive_css is pre-sanitised (sgs_css_length_value() / sgs_css_keyword_sanitise()
// / $sgs_css_object_position / sgs_box_object_shorthand() / $sgs_radius_shorthand /
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

$hero_helper_attrs   = $attributes;
$sgs_hero_null_attrs = array(
	'bgVideo',
	'bgVideoMobile',
	// ⛔ `bgSvgContent` was REMOVED from this list on 2026-09-05. It had no
	// counterpart to guard against. The C3 double-emit guard exists because hero
	// builds its own copy of a layer the wrapper would otherwise also paint —
	// $video_html (:1029), $bg_img_html (:1116), $overlay_html (:1240). There is
	// no hero-built SVG layer: `svg_html` appears ZERO times in this file, and
	// `bgSvg` appears in exactly one file under includes/ (the container
	// wrapper), so nothing else painted it either. The comment above says hero
	// renders its own "svg" — that refers to the SPLIT-MEDIA SVG family
	// (splitImageSvg / $sgs_hero_resolve_split_svg, :159-177), which is a
	// different family on a different element and is unaffected by this.
	//
	// Nulling it meant the wrapper's `$has_bg_svg = ! empty( $bg_svg_content )`
	// gate (class-sgs-container-wrapper.php:975) was permanently false, so the
	// seven bgSvg* attributes hero declares in block.json — and offers a client
	// in the Background panel — rendered NOTHING, on the page or in the editor.
	// A client could set a decorative background SVG, its position, opacity,
	// min-height, text-shadow, animation and speed, and see no effect anywhere.
	// Restoring it makes hero paint this layer exactly as the other seven
	// wrapper-adopting blocks do, per the composite-mirror rule. (Eight blocks declare
	// bgSvgContent in total INCLUDING hero, so the others number seven.)
	//
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

// Landmark label (nav/aside only — main was removed from the tagName allowlist
// entirely; header/footer lose their landmark role once nested so need no label).
if ( in_array( $hero_helper_opts['tag'], array( 'nav', 'aside' ), true ) && ! empty( $attributes['ariaLabel'] ) ) {
	$hero_helper_opts['extra_attrs'] = array(
		'aria-label' => sanitize_text_field( $attributes['ariaLabel'] ),
	);
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- helper returns an escaped wrapper; $hero_inner_html built with esc_url/esc_html/esc_attr above; $content is WP core InnerBlocks output.
echo SGS_Container_Wrapper::render( $hero_helper_attrs, $block, $hero_inner_html, SGS_Container_Wrapper::resolve_kind( $block, 'section' ), $hero_helper_opts );
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
