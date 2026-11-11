<?php
/**
 * Server-side render for the SGS Hero block.
 *
 * FR-22-6: the content column (label, headline, sub-headline, CTAs) is
 * rendered via InnerBlocks ($content). CTAs are child sgs/multi-button >
 * sgs/button blocks (D270/D293).
 * FP-14: NO legacy scalar fallback.
 *
 * The background (`backgroundSource` and its settings) prints through SGS_Container_Wrapper and SGS_Background_Media
 * (`.sgs-bg-media`, `.sgs-bg-overlay`); the split media (`splitSource` and its settings) prints through
 * SGS_Media_Element::render() inside the `.sgs-hero__media` grid cell (Spec 49 7.1, 7.8).
 *
 * Scalar STYLING/LAYOUT attributes consumed here (wrapper/shell level):
 *   variant, alignment, minHeight*, background/text/border colour
 *   (resting + Hover, each with a {attr}Gradient sibling — D702),
 *   transitionDuration, transitionEasing, gridTemplateColumns, gap, splitContentOrder, verticalAlignment,
 *   contentPadding, contentBackground, contentGap, textAlign.
 *   Headline / sub-headline / label FONT-SIZE (all breakpoints) is
 *   owned by the child sgs/heading / sgs/text / sgs/label blocks — not emitted
 *   here.
 *
 * BOX-GROUP (contract B, 2026-07-09): contentPadding is a box
 * OBJECT ({top,right,bottom,left}, base + Tablet + Mobile tiers) — no more flat per-side attrs. The block's `padding`
 * is read + emitted entirely by SGS_Container_Wrapper on the content band (a split hero has no band, so it
 * stays on the section); contentPadding is read + emitted here, block-private.
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
// ctaSecondary*) are deliberately NOT read here. FP-14: no fallback.
$variant   = $attributes['variant'] ?? 'standard';
$alignment = $attributes['alignment'] ?? 'left';
// The background overlay's colour and gradient: the hero's own `has-background` flag below reads them.
$overlay_colour_raw     = $attributes['backgroundOverlayColour'] ?? '';
$overlay_gradient_value = sgs_css_gradient_value( $attributes['backgroundOverlayGradient'] ?? '' );

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
// transitionDuration/transitionEasing are read directly by sgs_transition_vars()
// below — no local variable needed here (dead-assignment cleanup).

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
// FP-14: no legacy read-time fallback for splitColumnRatio.
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
// through the shared wrapper itself (Composite wrapper rule, CLAUDE.md) —
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
// Root border (width, style, colour, gradient ring, hover paint, radius at
// three tiers) through the shared assembler; emitted with the other root
// rules further down, its hover colour joins the hover declarations here.
$border      = sgs_border_element_decls(
	$attributes,
	'',
	$root_sel,
	array(
		'colour' => array(
			'base'           => 'borderColour',
			'hover'          => 'borderColourHover',
			'gradient'       => 'borderColourGradient',
			'hover_gradient' => 'borderColourHoverGradient',
		),
	)
);
$hover_decls = array_merge( $hover_decls, $border['hover'] );
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
		$responsive_css .= SGS_Breakpoints::media( 'tablet' ) . '{.' . $uid . '{grid-template-rows:' . esc_attr( sgs_sanitize_grid_template( $grid_row_template_tablet ) ) . '}}';
	}
	if ( '' !== trim( (string) $grid_row_template_mobile ) ) {
		$responsive_css .= SGS_Breakpoints::media( 'mobile' ) . '{.' . $uid . '{grid-template-rows:' . esc_attr( sgs_sanitize_grid_template( $grid_row_template_mobile ) ) . '}}';
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
		// override in the snapshot, e.g. 1140px) — no hardcoded px
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

// F3 drain (§E2, D228 pattern): the outer section's vertical position is driven
// from verticalAlignment rather than a hardcoded centre in style.css.
//
// WHICH PROPERTY carries the vertical axis depends on the variant, because the
// two variants lay the section out differently:
// - split is `display:grid` (.sgs-hero--split), where `align-items` is the
// block axis, so `align-items` is the vertical one.
// - standard is a flex COLUMN (.sgs-hero--standard adds
// `flex-direction:column`), where the block axis is the MAIN axis, so
// `justify-content` is the vertical one and `align-items` would move the
// content sideways instead.
// `.sgs-hero--standard` sets no `justify-content` of its own, so the scoped
// `.uid` rule below beats it on source order (this block's CSS prints in an
// in-body <style> after the stylesheet), which is how every other scoped
// override in this file wins.
//
// The operator's raw `justifyContent` attribute is emitted further down for
// non-split variants and therefore still overrides this, which is the intended
// precedence: an explicit axis value beats the friendly position control.
$vertical_align_map   = array(
	'top'    => 'flex-start',
	'center' => 'center',
	'bottom' => 'flex-end',
);
$vertical_align_value = $vertical_align_map[ $vertical_alignment ] ?? 'center';
$responsive_css      .= '.' . $uid . '{'
	. ( $is_split ? 'align-items:' : 'justify-content:' )
	. $vertical_align_value . '}';

if ( ! empty( $min_height ) ) {
	$responsive_css .= '.' . $uid . '{min-height:' . esc_attr( $min_height ) . '}';
}
if ( $min_height_tablet ) {
	$responsive_css .= SGS_Breakpoints::media( 'tablet' ) . '{.' . $uid . '{min-height:' . esc_attr( $min_height_tablet ) . '}}';
}
if ( $min_height_mobile ) {
	$responsive_css .= SGS_Breakpoints::media( 'mobile' ) . '{.' . $uid . '{min-height:' . esc_attr( $min_height_mobile ) . '}}';
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
			$responsive_css .= SGS_Breakpoints::media( 'tablet' ) . '{.' . $uid . '{grid-template-columns:' . $safe_ratio_tab . '}}';
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
		$responsive_css .= SGS_Breakpoints::media( 'mobile' ) . '{.' . $uid . '{grid-template-columns:' . $safe_ratio_mob . '}}';
	}
	// Tablet gap override — shared gapTablet.
	$hero_gap_tablet = sgs_container_gap_value( $hero_gap_obj['tablet'] ?? '' );
	if ( '' !== $hero_gap_tablet ) {
		$responsive_css .= SGS_Breakpoints::media( 'tablet' ) . '{.' . $uid . '{gap:' . $hero_gap_tablet . '}}';
	}
	// Mobile gap override — shared gapMobile.
	$hero_gap_mobile = sgs_container_gap_value( $hero_gap_obj['mobile'] ?? '' );
	if ( '' !== $hero_gap_mobile ) {
		$responsive_css .= SGS_Breakpoints::media( 'mobile' ) . '{.' . $uid . '{gap:' . $hero_gap_mobile . '}}';
	}
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
			$responsive_css .= SGS_Breakpoints::media( 'tablet' ) . '{.' . $uid . ' .sgs-hero__content{order:1}.' . $uid . ' .sgs-hero__media{order:2}}';
		} else {
			// media-first.
			$responsive_css .= SGS_Breakpoints::media( 'tablet' ) . '{.' . $uid . ' .sgs-hero__media{order:1}.' . $uid . ' .sgs-hero__content{order:2}}';
		}
	}
	// Mobile column order. Mobile always stacks to a single column, so this is
	// an ABOVE/BELOW decision, not LEFT/RIGHT.
	if ( 'content-first' === $split_order_mobile ) {
		$responsive_css .= SGS_Breakpoints::media( 'mobile' ) . '{.' . $uid . ' .sgs-hero__content{order:1}.' . $uid . ' .sgs-hero__media{order:2}}';
	} else {
		// media-first (default).
		$responsive_css .= SGS_Breakpoints::media( 'mobile' ) . '{.' . $uid . ' .sgs-hero__media{order:1}.' . $uid . ' .sgs-hero__content{order:2}}';
	}
} else {
	// ── Flex-axis controls (non-split variants) — justifyContent/flexDirection/
	// flexWrap. `.sgs-hero{display:flex}` is the base rule in style.css (the
	// standard variant then adds `flex-direction:column`
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

// ── contentPadding: box-object family — base + tablet + mobile (on .sgs-hero__content).
$content_pad_base = sgs_box_object_longhands( $content_padding_obj, 'padding' );
if ( null !== $content_pad_base ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__content{' . $content_pad_base . '}';
}
$content_pad_tab = sgs_box_object_longhands( $content_padding_tablet_obj, 'padding' );
if ( null !== $content_pad_tab ) {
	$responsive_css .= SGS_Breakpoints::media( 'tablet' ) . '{.' . $uid . ' .sgs-hero__content{' . $content_pad_tab . '}}';
}
$content_pad_mob = sgs_box_object_longhands( $content_padding_mobile_obj, 'padding' );
if ( null !== $content_pad_mob ) {
	$responsive_css .= SGS_Breakpoints::media( 'mobile' ) . '{.' . $uid . ' .sgs-hero__content{' . $content_pad_mob . '}}';
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

// ── contentGap: the space between the content column's stacked items, per device ──
// `.sgs-hero__content` is a flex column, so `gap` is the vertical space between its children.
$responsive_css .= sgs_emit_responsive_css(
	'.' . $uid . ' .sgs-hero__content',
	array(
		array(
			'value'        => $attributes['contentGap'] ?? null,
			'css'          => 'gap',
			'unit_default' => 'px',
		),
	)
);

// ── HC2: text-align on .sgs-hero__content ──────────────────────────────────
// Desktop = base rule (no @media); tablet/mobile = scoped @media overrides.
// Each value is allowlisted; empty / unrecognised = no emit (keeps variant
// default). This makes textAlignDesktop a live render target for the cloning
// converter (H-C) and revives the inert tablet/mobile attrs.
if ( in_array( $text_align_desktop, $allowed_text_align, true ) ) {
	$responsive_css .= '.' . $uid . ' .sgs-hero__content{text-align:' . $text_align_desktop . '}';
}
if ( in_array( $text_align_tablet, $allowed_text_align, true ) ) {
	$responsive_css .= SGS_Breakpoints::media( 'tablet' ) . '{.' . $uid . ' .sgs-hero__content{text-align:' . $text_align_tablet . '}}';
}
if ( in_array( $text_align_mobile, $allowed_text_align, true ) ) {
	$responsive_css .= SGS_Breakpoints::media( 'mobile' ) . '{.' . $uid . ' .sgs-hero__content{text-align:' . $text_align_mobile . '}}';
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

// A split hero whose alignItems is set to anything but stretch positions its
// media box itself (the box then sizes to its content instead of filling the row).
if ( $is_split ) {
	$hero_align_items_tiers = sgs_responsive_normalise_object( $attributes['alignItems'] ?? null );
	foreach ( $hero_align_items_tiers as $hero_align_items_value ) {
		if ( is_string( $hero_align_items_value ) && '' !== $hero_align_items_value && 'stretch' !== $hero_align_items_value ) {
			$classes[] = 'sgs-hero--media-aligned';
			break;
		}
	}
}

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// (composite caveat, per the migration contract: do NOT pass these as wrapper
// `extra_styles` — that path inlines). Base spacing (padding/margin) is a
// SEPARATE mechanism the wrapper already handles scoped internally (reads
// $attributes['style']['spacing'] directly) — not duplicated here.

$hero_style_engine_args = array();

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
// Text indent follows core's convention: every paragraph that follows another
// paragraph inside the element.
$responsive_css .= sgs_typography_css_rule( $attributes, '', $root_sel, $root_sel . ' :is(p, .wp-block-sgs-text) + :is(p, .wp-block-sgs-text)' );

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
// image always paints over the colour. Measured live on a homepage
// clone, where a correct `background-color: surface-pink` sat invisible beneath
// the framework's primary-dark->primary gradient.
// This sets `has-background`, per the
// composite wrapper rule. Only the suppression flag is added, NOT the
// `has-<slug>-background-color` class: the hero paints its
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

// ── Root border: resting rule first, then its gradient ring, then the tier radii (computed above with the hover paint). ──
if ( $border['base'] ) {
	$responsive_css .= $root_sel . '{' . implode( ';', $border['base'] ) . ';}';
}
$responsive_css .= implode( '', $border['rules'] );
if ( $border['tablet'] ) {
	$responsive_css .= SGS_Breakpoints::media( 'tablet' ) . '{' . $root_sel . '{' . implode( ';', $border['tablet'] ) . ';}}';
}
if ( $border['mobile'] ) {
	$responsive_css .= SGS_Breakpoints::media( 'mobile' ) . '{' . $root_sel . '{' . implode( ';', $border['mobile'] ) . ';}}';
}

// FR-22-6: all content (label, headline, sub-headline, CTAs) is rendered via
// InnerBlocks. $content is the full serialised child-block output.

// ── Build content column wrapper ───────────────────────────────────────────
// FR-22-6: content column wraps InnerBlocks ($content) directly.
// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// display/flex-direction/justify-content/background-color are ALL emitted
// scoped (.uid .sgs-hero__content{...}) above.
// FP-14: no scalar content rendering. $content = full InnerBlocks output
// (sgs/label + sgs/heading + sgs/text + sgs/button(s) supplied by converter).
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is WP core InnerBlocks output.
// Floating layers (sgs/decorative-image) whose `anchorTo` is 'section' are lifted out of the content column and
// printed as direct children of the hero root, so their edge offsets are measured from the whole section (`.sgs-hero`
// is the nearest positioned ancestor), not from the content box, which changes size with the copy. The layer's own
// render marks its finished output (includes/section-anchored-layers.php), and the marked markup itself moves, so
// nothing renders twice. The layer's z-index sets whether it sits behind or in front of the content column
// (`.sgs-hero__content` is z-index 1).
list( $content_in_column, $section_layers_html ) = \SGS\Blocks\sgs_lift_section_anchored_layers( (string) $content );
$content_html = '<div class="sgs-hero__content">' . $content_in_column . '</div>';

// ── Split media: one slot through the media renderer (Spec 49 §7.1) ─────────
// `SGS_Media_Element::render()` prints the picture, video, SVG and embed siblings, the helper box (padding, background,
// radius, border, shadow, overlay), and every setting's scoped CSS. The hero keeps the grid cell around it.
$media_html = '';
if ( $is_split ) {
	// The slot's own scope class: the hero's `$uid` is the section's, and a rule printed for the media must not reach it.
	$sgs_hero_split_uid = $uid . '-split';
	// Grid tracks per device (`gridTemplateColumns` tiers; a device that sets none takes the wider one's, and the mobile
	// default is one track).
	$sgs_hero_split_columns = array();
	$sgs_hero_split_tracks  = 2;
	foreach ( array( 'desktop', 'tablet', 'mobile' ) as $sgs_hero_split_device ) {
		$sgs_hero_split_template = trim( (string) ( $split_col_tiers[ $sgs_hero_split_device ] ?? '' ) );
		if ( '' === $sgs_hero_split_template && 'mobile' === $sgs_hero_split_device ) {
			$sgs_hero_split_template = '1fr';
		}
		if ( '' !== $sgs_hero_split_template ) {
			$sgs_hero_split_tracks = max( 1, count( preg_split( '/\s+(?![^(]*\))/', $sgs_hero_split_template ) ?: array() ) );
		}
		$sgs_hero_split_columns[ $sgs_hero_split_device ] = $sgs_hero_split_tracks;
	}
	$sgs_hero_split     = SGS_Media_Element::render(
		array(
			'prefix'  => 'split',
			'kinds'   => array( 'image', 'video', 'svg' ),
			'context' => 'content',
		),
		$attributes,
		array(
			'uid'         => $sgs_hero_split_uid,
			'block'       => 'sgs/hero',
			'extra_class' => 'sgs-hero__split-media',
			'in_editor'   => defined( 'REST_REQUEST' ) && REST_REQUEST,
			// The media is one grid column wide: its `sizes` divide the viewport by the track count, so the browser
			// does not fetch a file as wide as the whole viewport.
			'item_set'    => array( 'columns' => $sgs_hero_split_columns ),
		)
	);
	if ( '' !== $sgs_hero_split['html'] ) {
		$media_html = '<div class="sgs-hero__media">' . $sgs_hero_split['html'] . '</div>';
		// Unset Width and Height fill the grid cell (the slot's own rules, printed after these on the same selector, win when set).
		$sgs_hero_split_set = static function ( string $name ) use ( $attributes ): bool {
			$tiers = sgs_responsive_normalise_object( $attributes[ $name ] ?? null );
			return '' !== trim( (string) ( $tiers['desktop'] ?? '' ) );
		};
		$sgs_hero_split_fill = '';
		if ( ! $sgs_hero_split_set( 'splitWidth' ) ) {
			$sgs_hero_split_fill .= 'width:100%;';
		}
		if ( ! $sgs_hero_split_set( 'splitHeight' ) && ! $sgs_hero_split_set( 'splitRatio' ) ) {
			$sgs_hero_split_fill .= 'height:100%;';
		}
		if ( '' !== $sgs_hero_split_fill ) {
			$responsive_css .= '.' . $sgs_hero_split_uid . '{display:block;' . $sgs_hero_split_fill . '}';
		}
		$responsive_css .= $sgs_hero_split['css'];
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

// WS-4: wrap the hero's interior in the shared sgs/container element (section KIND). The wrapper prints the background
// (`.sgs-bg-media`, `.sgs-bg-overlay`) through SGS_Background_Media, since the block declares `backgroundSource`, and the
// kept SVG layer (`bgSvg*`). Hero's own min-height rides $styles and is nulled in the helper's attribute copy so the
// wrapper does not print it twice. In split mode wrap_inner is false so a stray contentWidth can never inject an __inner
// div that would sit between the section grid and its __content/__media grid items.
$hero_inner_html = $content_html . $media_html . $section_layers_html;

// minHeight is a tier object: nulling the one attribute nulls all three tiers.
$hero_helper_attrs              = $attributes;
$hero_helper_attrs['minHeight'] = null;

$hero_helper_opts = array(
	'tag'           => isset( $attributes['tagName'] ) ? sanitize_key( $attributes['tagName'] ) : 'section',
	'extra_classes' => $classes,
	'extra_styles'  => $styles,
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
