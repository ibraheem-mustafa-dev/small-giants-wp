<?php
/**
 * Server-side render for sgs/timeline.
 *
 * Renders a date-based timeline as a semantic <ol>/<li>/<time> structure.
 * Vertical and horizontal orientations supported. When revealOnScroll is
 * false, all entries are pre-revealed (is-revealed baked in, no JS dep).
 *
 * NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check. Block-private LEAF pattern (mirrors sgs/label/sgs/quote).
 * The `--sgs-connector-colour` / `--sgs-date-colour` / `--sgs-reveal-stagger`
 * custom-property VALUES route to the scoped `.{uid}` rule like everything
 * else — inline `--var` is FORBIDDEN by the FR-32-4 amendment (2026-07-18,
 * D345).
 *
 * BOX-GROUP (contract §B): `padding`/`margin` are WP-native
 * style.spacing.* objects (base) + SGS object tiers (paddingTablet/Mobile,
 * marginTablet/Mobile). `borderRadius` is WP-native style.border.radius
 * (base, string or 4-corner object) + SGS object tiers (borderRadiusTablet/
 * Mobile). `borderWidth` (custom, no WP per-side width support) is an SGS
 * object attr, base only (matches sgs/quote — no pre-existing tiers).
 * `borderColour`/`borderStyle` are kept-scalar custom attrs (Spec 32 §6.1(c)).
 *
 * Typography is routed to `.sgs-timeline__title` (per the declared
 * `selectors.typography` in block.json) rather than the root — the title is
 * the element the typography controls are meant to style.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// [D-tier-object-render-fix 2026-09-06]
// Group 1 folded padding/margin into owned tier-object attrs
// {desktop,tablet,mobile}, but this block's own scoped CSS below still
// reads the pre-migration flat shape (a plain box for the base value,
// plus four separate flat attrs for the tablet/mobile overrides --
// block.json no longer declares any of those four). Normalise once,
// into fresh locals only -- every literal reference below has been
// redirected to these instead of writing back into $attributes.
// Fixed 2026-09-06: sgs_responsive_normalise_object() lives in
// helpers-responsive.php, which this file's own render-helpers.php
// require below WOULD load -- but too late, since these two calls run
// before that require executes. A block whose render.php is the first
// SGS block PHP to run in a request (nav-menu in the site header, on
// every page) fatals with "Call to undefined function" before any
// other block's render.php has had a chance to load it. Requiring the
// defining file directly, here, removes the load-order dependency.
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Security sanitiser (contract §D) — a CSS-length sanitiser for box/side
// values. (No free-text keyword attr on this block — border-style is
// validated via an `in_array()` allowlist below, so no keyword sanitiser is
// needed.)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$entries          = isset( $attributes['entries'] ) && is_array( $attributes['entries'] ) ? $attributes['entries'] : array();
// Entry-title heading level — an out-of-enum stored value is otherwise
// silently coerced to the block.json default (blockjson-enum-coerces-
// invalid-to-default), so it is validated here too (mirrors sgs/icon-list).
$allowed_heading_levels = array( 'h2', 'h3', 'h4', 'h5', 'h6', 'p' );
$heading_level    = in_array( $attributes['headingLevel'] ?? '', $allowed_heading_levels, true )
	? $attributes['headingLevel']
	: 'h3';
$orientation      = $attributes['orientation'] ?? 'vertical';
// contentLayout / datePosition replace the old alignment / showDateColumn split
// (Task 3a). 'same-side' (Task 3b) is a distinct two-sided layout — every row
// uses the SAME date/content assignment instead of flipping per row, unlike
// 'alternating'. 'single-column' keeps the old 'left' shape (the mapping's 8px
// rail-offset difference against the old 'centre' is a known, accepted loss —
// Task 3a brief, "near-identical").
$content_layout   = $attributes['contentLayout'] ?? 'alternating';
$content_layout   = in_array( $content_layout, array( 'alternating', 'same-side', 'single-column' ), true )
	? $content_layout
	: 'alternating';
// contentSide — Task 3b. Meaningless outside 'same-side' (alternating flips by
// definition; single-column is one-sided), so it is read here but only turned
// into a class when contentLayout is 'same-side'. 'end' (content right, date
// left) is the default AND the layout's base rule in style.scss — it mirrors
// 'alternating's odd-row placement, so it needs no modifier class of its own;
// only 'start' (the mirrored, even-row placement) gets one.
$content_side = $attributes['contentSide'] ?? 'end';
$content_side = in_array( $content_side, array( 'start', 'end' ), true ) ? $content_side : 'end';
// Mobile layout — an axis of its own, independent of orientation/alignment
// (Task 2). 'stacked' is today's collapse, unchanged. 'carousel' is a native
// horizontal scroll-snap row, ≤767px ONLY — see style.scss's mobile-carousel
// section, gated on both the breakpoint and this class, so a 'stacked'
// timeline never carries a rule from it.
$mobile_layout    = $attributes['mobileLayout'] ?? 'stacked';
$mobile_layout    = in_array( $mobile_layout, array( 'stacked', 'carousel' ), true ) ? $mobile_layout : 'stacked';
$connector_style  = $attributes['connectorStyle'] ?? 'line';
$connector_colour = $attributes['connectorColour'] ?? 'border';
// connectorColourGradient (2026-09-06, colour-conformance closeout) — the
// `--sgs-connector-colour-gradient` sibling, same sgs_custom_property_gradient_decls()
// shape already proven on brand-strip/post-grid/social-icons/form/gallery/
// before-after/option-picker/tabs.
$connector_colour_gradient = $attributes['connectorColourGradient'] ?? '';
// connectorColourHover/HoverGradient (2026-09-06, colour-conformance FILL
// closeout) — the `--sgs-connector-colour-hover`/`-hover-gradient` siblings,
// same sgs_custom_property_gradient_decls() 5-arg form proven on
// before-after's handleColour.
$connector_colour_hover          = $attributes['connectorColourHover'] ?? '';
$connector_colour_hover_gradient = $attributes['connectorColourHoverGradient'] ?? '';
$date_colour      = $attributes['dateColour'] ?? 'accent';
$progress_fill    = ! empty( $attributes['connectorProgressFill'] );
$fill_colour      = $attributes['connectorFillColour'] ?? 'accent';
$reveal_on_scroll = isset( $attributes['revealOnScroll'] ) ? (bool) $attributes['revealOnScroll'] : true;
$reveal_stagger   = isset( $attributes['revealStagger'] ) ? absint( $attributes['revealStagger'] ) : 100;

// Step 4b — curated scroll-effect mode. Reuses the EXISTING GSAP fx slugs
// (`scrub` / `pin-scrub` / `horizontal-panel`) rather than registering a new
// one — this is a single-surface picker for those same modules, not a new
// effect. Sanitised to the declared enum, same idiom as $content_layout.
$scroll_effect = $attributes['scrollEffect'] ?? 'basic';
$scroll_effect = in_array( $scroll_effect, array( 'basic', 'scrub', 'pinned-journey', 'pinned-horizontal' ), true )
	? $scroll_effect
	: 'basic';
// 'pinned-journey' only makes sense on the vertical connector journey;
// 'pinned-horizontal' only makes sense when there is a horizontal track to
// slide. Fall back to 'basic' rather than emit an fx attribute the current
// orientation can't support — degrade to more content, not a broken pin.
if ( 'pinned-journey' === $scroll_effect && 'vertical' !== $orientation ) {
	$scroll_effect = 'basic';
}
if ( 'pinned-horizontal' === $scroll_effect && 'horizontal' !== $orientation ) {
	$scroll_effect = 'basic';
}

// Reveal trigger. `connector` reveals each entry as the progress fill reaches ITS
// dot rather than when the entry enters the viewport, so the journey assembles
// itself in step with the line. Sanitised to the declared enum: an out-of-enum
// stored value is otherwise silently coerced to the default anyway, but stating
// it here keeps the class name it emits safe.
$reveal_trigger = $attributes['revealTrigger'] ?? 'viewport';
$reveal_trigger = in_array( $reveal_trigger, array( 'viewport', 'connector' ), true )
	? $reveal_trigger
	: 'viewport';
// A connector-triggered reveal is meaningless without the fill that drives it —
// fall back rather than leave every entry hidden forever with nothing to reveal
// them. This is the degrade-to-MORE-content direction, deliberately.
if ( 'connector' === $reveal_trigger && ! $progress_fill ) {
	$reveal_trigger = 'viewport';
}

// Milestone media width (block-wide, not per entry).
$media_width = sgs_css_length_value( $attributes['milestoneMediaWidth'] ?? '180px' );

// Task 3 (2026-08-30) — milestoneSize. Sanitised against the declared enum,
// same idiom as $content_layout above: an out-of-enum stored value is
// otherwise silently coerced to the default anyway, but stating it here keeps
// the class name it emits safe.
$milestone_size = $attributes['milestoneSize'] ?? 'compact';
$milestone_size = in_array( $milestone_size, array( 'compact', 'full-height' ), true )
	? $milestone_size
	: 'compact';

// milestoneMinHeight / entryGap — CSS-length attrs, routed as custom-property
// VALUES only (no property declaration), matching $media_width above.
$milestone_min_height = sgs_css_length_value( $attributes['milestoneMinHeight'] ?? '80vh' );
$entry_gap             = sgs_css_length_value( $attributes['entryGap'] ?? '' );

// Decorative milestone media. WordPress already stores the real alt text on the
// ATTACHMENT, which is where it belongs and which this block reads — so this is
// not a second alt field, it is the operator saying "ignore that, this picture
// carries no information". It then renders with an empty alt AND aria-hidden, so
// a screen reader skips it entirely instead of announcing a filename.
//
// Block-level rather than per entry, for the same reason placement is: a client
// uses milestone pictures either as content or as decoration, consistently down
// one timeline, and three toggles per milestone is not a client-facing control.
$media_decorative = ! empty( $attributes['milestoneMediaDecorative'] );

// Alternating A/B row bands.
$row_stripes   = ! empty( $attributes['rowStripes'] );
$stripe_a      = $attributes['rowStripeColourA'] ?? '';
$stripe_b      = $attributes['rowStripeColourB'] ?? 'surface-alt';
// rowStripeColourA/BGradient (2026-09-06, colour-conformance closeout) — no
// attrMap entry (see block.json's rowStripeColourAGradient description: A/B
// both target the entry element's background-color via mutually exclusive
// :nth-child(odd)/:nth-child(even) selectors, not the declared states
// vocabulary), but the gradient siblings are still real custom-property values
// resolved the same way as every other sgs_custom_property_gradient_decls()
// adopter.
$stripe_a_gradient = $attributes['rowStripeColourAGradient'] ?? '';
$stripe_b_gradient = $attributes['rowStripeColourBGradient'] ?? '';
// rowStripeColourA/BHover(Gradient) (2026-09-06, colour-conformance FILL
// closeout) — same no-attrMap reasoning as the gradient siblings above; each
// row's own :hover/:focus-within rule falls back to its resting stripe
// colour, then transparent, when unset.
$stripe_a_hover          = $attributes['rowStripeColourAHover'] ?? '';
$stripe_a_hover_gradient = $attributes['rowStripeColourAHoverGradient'] ?? '';
$stripe_b_hover          = $attributes['rowStripeColourBHover'] ?? '';
$stripe_b_hover_gradient = $attributes['rowStripeColourBHoverGradient'] ?? '';

// Sanitise orientation to avoid arbitrary CSS class injection. $content_layout
// and $content_side were already validated above, so they need no separate
// sanitisation pass here.
$orientation     = in_array( $orientation, array( 'vertical', 'horizontal' ), true ) ? $orientation : 'vertical';
$connector_style = in_array( $connector_style, array( 'line', 'dashed', 'dotted' ), true ) ? $connector_style : 'line';

// Date gutter — the date in its OWN column, opposite the content, on every row.
//
// ⛔ THIS IS AN AXIS OF ITS OWN, not a layout value, and that distinction is
// the whole point. Researched 2026-08-29 against MUI (`TimelineOppositeContent`),
// Ant Design (`label`), PrimeReact (`opposite`) and Vuetify (`opposite` slot):
// 4 of 4 model "which side the content sits on" and "does the date get a gutter"
// as SEPARATE controls, and none of them forces a gutter when you pick `left`.
// This block used to weld the two together, which is why `left` read as
// "alternating without the flip" instead of as a layout of its own.
//
// `alternating`/`same-side` are inherently two-sided — there is nothing to
// alternate without a second column — so the toggle is ignored there rather
// than fighting it.
// ⛔ NAMED `showDateColumn`/`datePosition`, NOT `dateGutter`, and the name is
// load-bearing. The manifest's `date` element declares `prefix: "date"`, so
// ANY attribute spelled `date{Something}` is auto-resolved as a CSS property
// OF that element. `dateGutter` therefore got scanned as if it were a style
// value for the date text and came back ORPHAN:UNCLASSIFIED, failing
// check-element-manifest-conformance (gated at zero, no baseline permitted).
// It is a LAYOUT switch, not a CSS value — exactly the "prefix-string
// accident" that file's own baseline notes describe for sgs/before-after's
// dividerColour. Renaming is the principled fix; do not rename it back.
//
// ⛔ Task 3a mapping — `showDateColumn` was only ever effective when
// `alignment === 'left'` (render.php pre-Task-3a). `datePosition:own-column`
// carries the SAME condition forward against its replacement,
// `contentLayout === 'single-column'`, so a stored `own-column` on an
// `alternating`/`same-side` timeline stays inert exactly as the old boolean
// did on `alternating`/`centre` — never a blind 1:1 map (Task 3a brief).
$date_position = $attributes['datePosition'] ?? 'inline';
$date_position = in_array( $date_position, array( 'own-column', 'inline' ), true ) ? $date_position : 'inline';
$date_gutter   = 'own-column' === $date_position && 'single-column' === $content_layout;


// Wrapper text/background colour — block-private attrs (WP-native
// `supports.color` is disabled; the native `style.color.*` path is never
// populated, matching connectorColour/dateColour on this same block).
$style_color_text = isset( $attributes['textColour'] ) && '' !== $attributes['textColour'] ? sgs_colour_value( $attributes['textColour'] ) : '';
$style_color_bg   = isset( $attributes['backgroundColour'] ) && '' !== $attributes['backgroundColour'] ? sgs_colour_value( $attributes['backgroundColour'] ) : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// WP `shadow` support value (skip-serialised).
$style_shadow = isset( $attributes['style']['shadow'] ) ? (string) $attributes['style']['shadow'] : '';

// Entry-title typography (fontSize/lineHeight/fontWeight/fontStyle) is no
// longer a WP-native `style.typography` skip-serialised object — migrated to
// the shared `sgs_typography_css_rule()` helper (D971/D972 full-replacement
// track), called against $title_sel below alongside the other scoped-CSS
// assembly. letterSpacing/textTransform/textAlign had no shared-component
// equivalent and are dropped as honest gaps (mirrors sgs/accordion).

// Base padding/margin — WP-native style.spacing.* objects (skip-serialised).
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

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys). Tiers are the
// SGS object attrs borderRadiusTablet/borderRadiusMobile.
$radius_tiers            = sgs_border_radius_tiers( $attributes );
$base_border_radius       = $radius_tiers['base'];
$border_radius_tablet_obj = $radius_tiers['tablet'];
$border_radius_mobile_obj = $radius_tiers['mobile'];

// Border width/colour/style — SGS custom attrs (no WP-native per-side width
// support; matches sgs/quote + sgs/button). Base only, no tiers.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_colour = $attributes['borderColour'] ?? '';
// D636 border-colour gradient rollout — non-empty wins over $border_colour
// above, painted via the shared masked ::before ring mechanism.
$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
$border_style_raw       = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles  = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style           = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

// ---------------------------------------------------------------------------
// 3. Scoped CSS assembly. uid is a CLASS (this block has anchor support for
// the ToC, so the `id` attribute stays free for the anchor).
// ---------------------------------------------------------------------------

$uid       = 'sgs-tl-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel  = '.' . $uid . '.sgs-timeline';
$title_sel = $root_sel . ' .sgs-timeline__title';

$scoped_css = array();

// --- Root box/border declarations (custom borderWidth/Colour/Style — no WP
// native support for per-side width, matches sgs/quote + sgs/button). ---
$root_decls = array();
// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width.
if ( 'none' !== $border_style && $has_border_width ) {
	if ( $has_border_width ) {
		$bwt          = '' !== $border_width_top ? $border_width_top : '0';
		$bwr          = '' !== $border_width_right ? $border_width_right : '0';
		$bwb          = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl          = '' !== $border_width_left ? $border_width_left : '0';
		$root_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	}
	$root_decls[] = 'border-style:' . $border_style;
	if ( $border_colour ) {
		$root_decls[] = 'border-color:' . sgs_colour_value( $border_colour );
	}
}
if ( $root_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $root_decls ) . ';}';
}

// D636 border-colour gradient rollout — masked ::before ring, only when the
// operator has ALSO set a real border (matches every other border decl
// above, gated on 'none' !== $border_style). Width mirrors the resolved
// top border width when set, else the shared helper's own 2px default.
if ( 'none' !== $border_style && '' !== $border_colour_gradient ) {
	$border_gradient_width = '' !== $border_width_top ? $border_width_top : '2px';
	$scoped_css[]          = sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, $border_gradient_width );
}

// --- Base spacing (padding/margin), border-radius, WP colour + shadow
// supports — skip-serialised, emitted scoped via the stable core style
// engine (exactly how WP core outputs `layout` support). ---

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

if ( null !== $base_border_radius ) {
	$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
}

$color_args = array();
if ( '' !== $style_color_text ) {
	$color_args['text'] = $style_color_text;
}
if ( '' !== $style_color_bg ) {
	$color_args['background'] = $style_color_bg;
}
if ( ! empty( $color_args ) ) {
	$base_style_engine_args['color'] = $color_args;
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

// --- Typography — shared helper, routed to `.sgs-timeline__title` (matches
// the pre-migration `selectors.typography` in block.json), not the root.
// D971/D972 full-replacement track: fontSize/lineHeight/fontWeight/fontStyle
// only — letterSpacing/textTransform/textAlign have no shared-component
// equivalent and are dropped as honest gaps (mirrors sgs/accordion). ---
$scoped_css[] = sgs_typography_css_rule( $attributes, 'title', $title_sel );

// --- Responsive padding/margin/border-radius tiers — box objects, hand-built
// shorthand, scoped @media on the root selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );
$radius_tab_val  = sgs_corner_object_shorthand( $border_radius_tablet_obj );
$radius_mob_val  = sgs_corner_object_shorthand( $border_radius_mobile_obj );

$tablet_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_decls[] = "margin:{$margin_tab_val}";
}
if ( null !== $radius_tab_val ) {
	$tablet_decls[] = "border-radius:{$radius_tab_val}";
}
if ( $tablet_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "margin:{$margin_mob_val}";
}
if ( null !== $radius_mob_val ) {
	$mobile_decls[] = "border-radius:{$radius_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// ---------------------------------------------------------------------------
// 4. Build the root element's classes + attributes.
//
// uid is a CLASS (contract §B3 note — anchor support keeps the `id` free for
// the ToC target). is-style-*/align* classes are merged in automatically by
// get_block_wrapper_attributes() via the block's className attribute. The
// `style` attr carries ONLY the pre-existing custom-property VALUES
// (--sgs-connector-colour / --sgs-date-colour / --sgs-reveal-stagger) — no
// property declaration (contract §A); every declaration lives in the scoped
// <style> above.
// ---------------------------------------------------------------------------

// Build wrapper class list.
$wrapper_classes   = array( 'sgs-timeline', $uid );
$wrapper_classes[] = 'sgs-timeline--' . $orientation;
if ( 'vertical' === $orientation ) {
	// Emits 'content-alternating', 'content-same-side' or 'content-single-column'
	// straight from the validated $content_layout — the class name IS the
	// attribute value. 'same-side' (Task 3b) has its own CSS shape; it no
	// longer folds into 'content-alternating'.
	$wrapper_classes[] = 'sgs-timeline--content-' . $content_layout;
	// contentSide only means anything on the two-sided-but-not-flipping
	// layout. 'end' (content right, date left) is the base same-side rule in
	// style.scss and needs no class; only 'start' gets one.
	if ( 'same-side' === $content_layout && 'start' === $content_side ) {
		$wrapper_classes[] = 'sgs-timeline--side-start';
	}
}
$wrapper_classes[] = 'sgs-timeline--connector-' . $connector_style;
if ( $progress_fill ) {
	// FR-38-35 — suppression of the always-drawn ::before is keyed on THIS
	// class, never on @supports: an @supports-keyed hide would leave a doubled
	// line for every visitor on the JS driver, which today is all of Firefox.
	$wrapper_classes[] = 'sgs-timeline--connector-progress';
}

// Milestone media always sits under the date. A/B row bands are keyed on a
// wrapper class so that a timeline without them is byte-identical to before:
// every new rule in style.scss sits behind one of these classes or behind
// `.sgs-timeline__entry--has-media`.
$wrapper_classes[] = 'sgs-timeline--media-under';
if ( $row_stripes ) {
	$wrapper_classes[] = 'sgs-timeline--row-stripes';
}
if ( 'connector' === $reveal_trigger ) {
	$wrapper_classes[] = 'sgs-timeline--reveal-connector';
}
if ( $date_gutter ) {
	$wrapper_classes[] = 'sgs-timeline--date-gutter';
}
// Task 2 — 'carousel' is a native scroll-snap card row at ≤767px ONLY; every
// rule it needs in style.scss is scoped behind BOTH this class AND
// `@media (max-width:767px)`, so it is inert above that width and a 'stacked'
// timeline (the default) never carries a rule from it at all.
if ( 'carousel' === $mobile_layout ) {
	$wrapper_classes[] = 'sgs-timeline--mobile-carousel';
}
// Task 3 (2026-08-30) — 'full-height' milestones. Every rule this class
// unlocks in style.scss is scoped behind `@media (min-width: 768px)` as well,
// so phones always render the compact size regardless of this class.
if ( 'full-height' === $milestone_size ) {
	$wrapper_classes[] = 'sgs-timeline--milestone-full-height';
}

if ( '' !== $preset_text_slug ) {
	$wrapper_classes[] = 'has-text-color';
	$wrapper_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$wrapper_classes[] = 'has-background';
	$wrapper_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

// Wrapper CSS custom properties (VALUES only — contract §A allows `--var:value`).
$wrapper_style_parts = array();
// connectorColour/connectorColourGradient (2026-09-06, colour-conformance
// closeout) — same sgs_custom_property_gradient_decls() shape already proven
// on brand-strip/post-grid/social-icons/form/gallery/before-after/
// option-picker/tabs; style.scss carries the matching
// background-image:var(--sgs-connector-colour-gradient,none) line next to
// each existing background-color:var(--sgs-connector-colour) rule.
// connectorColourHover/HoverGradient (colour-conformance FILL closeout) are
// the 4th/5th args — style.scss's matching :hover/:focus-visible pair reads
// the resulting --sgs-connector-colour-hover(-gradient) vars.
$wrapper_style_parts = array_merge(
	$wrapper_style_parts,
	sgs_custom_property_gradient_decls( 'sgs-connector-colour', $connector_colour, $connector_colour_gradient, $connector_colour_hover, $connector_colour_hover_gradient )
);
if ( $date_colour ) {
	$wrapper_style_parts[] = '--sgs-date-colour:' . sgs_colour_value( $date_colour );
}
if ( $progress_fill && $fill_colour ) {
	$fill_colour_gradient = $attributes['connectorFillColourGradient'] ?? '';
	// connectorFillColourHover/HoverGradient (colour-conformance FILL closeout,
	// 2026-09-06) — 4th/5th args; style.scss's `.sgs-timeline:hover`/
	// `:focus-within` + `.is-reached:hover`/`:focus-visible` rules read the
	// resulting --sgs-timeline-fill-colour-hover(-gradient) vars.
	$fill_colour_hover          = $attributes['connectorFillColourHover'] ?? '';
	$fill_colour_hover_gradient = $attributes['connectorFillColourHoverGradient'] ?? '';
	$wrapper_style_parts        = array_merge( $wrapper_style_parts, sgs_custom_property_gradient_decls( 'sgs-timeline-fill-colour', $fill_colour, $fill_colour_gradient, $fill_colour_hover, $fill_colour_hover_gradient ) );
}
if ( $reveal_stagger > 0 ) {
	$wrapper_style_parts[] = '--sgs-reveal-stagger:' . $reveal_stagger . 'ms';
}
if ( '' !== $media_width ) {
	$wrapper_style_parts[] = '--sgs-timeline-media-width:' . $media_width;
}
// Task 3 — custom-property VALUES only (Spec 32 §A), same idiom as the block
// above. Both fall back inside style.scss's `var(…, default)` when unset, so
// emitting them unconditionally is safe and keeps the scoped-CSS block simple.
if ( '' !== $milestone_min_height ) {
	$wrapper_style_parts[] = '--sgs-timeline-milestone-min-height:' . $milestone_min_height;
}
if ( '' !== $entry_gap ) {
	$wrapper_style_parts[] = '--sgs-timeline-entry-gap:' . $entry_gap;
}
if ( $row_stripes ) {
	// An EMPTY stripe A is the useful default: the odd rows keep whatever the
	// page/section background already is, and only the even rows are banded. A
	// literal colour on both would fight a sectioned page for no gain.
	$wrapper_style_parts[] = '--sgs-timeline-stripe-a:' . ( $stripe_a ? sgs_colour_value( $stripe_a ) : 'transparent' );
	$wrapper_style_parts[] = '--sgs-timeline-stripe-b:' . ( $stripe_b ? sgs_colour_value( $stripe_b ) : 'transparent' );
	// Gradient siblings — no flat/'transparent' fallback semantics to preserve
	// here (unlike the two lines above), so a plain sgs_css_gradient_value()
	// resolve + conditional emit is correct: an unset/invalid gradient emits
	// nothing and style.scss's own var(…, none) fallback covers it.
	$resolved_stripe_a_gradient = sgs_css_gradient_value( $stripe_a_gradient );
	if ( '' !== $resolved_stripe_a_gradient ) {
		$wrapper_style_parts[] = '--sgs-timeline-stripe-a-gradient:' . $resolved_stripe_a_gradient;
	}
	$resolved_stripe_b_gradient = sgs_css_gradient_value( $stripe_b_gradient );
	if ( '' !== $resolved_stripe_b_gradient ) {
		$wrapper_style_parts[] = '--sgs-timeline-stripe-b-gradient:' . $resolved_stripe_b_gradient;
	}
	// rowStripeColourA/BHover(Gradient) (colour-conformance FILL closeout,
	// 2026-09-06) — unlike the resting values above, an unset hover emits
	// NOTHING here (no 'transparent' fallback): style.scss's own
	// var(…-hover, var(…, transparent)) fallback chain covers it, matching the
	// sgs_custom_property_gradient_decls() convention used elsewhere in this file.
	if ( '' !== $stripe_a_hover ) {
		$wrapper_style_parts[] = '--sgs-timeline-stripe-a-hover:' . sgs_colour_value( $stripe_a_hover );
	}
	$resolved_stripe_a_hover_gradient = sgs_css_gradient_value( $stripe_a_hover_gradient );
	if ( '' !== $resolved_stripe_a_hover_gradient ) {
		$wrapper_style_parts[] = '--sgs-timeline-stripe-a-hover-gradient:' . $resolved_stripe_a_hover_gradient;
	}
	if ( '' !== $stripe_b_hover ) {
		$wrapper_style_parts[] = '--sgs-timeline-stripe-b-hover:' . sgs_colour_value( $stripe_b_hover );
	}
	$resolved_stripe_b_hover_gradient = sgs_css_gradient_value( $stripe_b_hover_gradient );
	if ( '' !== $resolved_stripe_b_hover_gradient ) {
		$wrapper_style_parts[] = '--sgs-timeline-stripe-b-hover-gradient:' . $resolved_stripe_b_hover_gradient;
	}
}
// NO-INLINE (Spec 32 FR-32-4 as amended 2026-07-18 / D345): these are
// custom-property VALUES, and an inline `style="--sgs-…"` is FORBIDDEN on the
// frontend just as much as an inline property declaration — FR-32-1's done-when
// is "no `style` attribute at all", explicitly including a custom-property
// value. They route to the block's own scoped `.{uid}.sgs-timeline` rule
// instead.
if ( $wrapper_style_parts ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $wrapper_style_parts ) . ';}';
}

$wrapper_args = array(
	'class' => implode( ' ', $wrapper_classes ),
);

// Step 4b — curated scroll effect. `sniff_block()` regex-scans the rendered
// markup for `data-sgs-fx` on `render_block` priority 99 and enqueues the
// matching module, so this is the ONLY place that needs to know the slug.
if ( 'basic' !== $scroll_effect ) {
	$fx_slug_by_effect = array(
		'scrub'            => 'scrub',
		'pinned-journey'   => 'pin-scrub',
		'pinned-horizontal' => 'horizontal-panel',
	);
	$wrapper_args['data-sgs-fx'] = $fx_slug_by_effect[ $scroll_effect ];

	// fx-horizontal-panel.js self-gates at (min-width:768px) — nothing to add.
	// fx-scrub.js and fx-pin-scrub.js do NOT self-gate, so 'scrub' and
	// 'pinned-journey' need the central mobile-suppression flag honoured by
	// isDisabledAtThisTier() in shared/effects/gsap/provider.js. SC 2.5.7
	// exempts native `overflow` scrolling, not a rolled GSAP substitute for it.
	if ( 'scrub' === $scroll_effect || 'pinned-journey' === $scroll_effect ) {
		$wrapper_args['data-sgs-fx-disable-mobile'] = 'true';
	}
}

// Pass scroll-reveal config to view.js via data attributes.
if ( $reveal_on_scroll ) {
	// ⛔ 'pinned-journey' owns entry opacity/transform itself (GSAP drives
	// each milestone as the progress fill reaches it), so the viewport/
	// connector reveal must not ALSO run. Suppressing the driver alone is not
	// enough — style.scss hides `.sgs-timeline__entry:not(.is-revealed)`
	// under `[data-reveal-on-scroll].is-js`, and view.js adds `.is-js`
	// regardless of which fx is active. Shipped once as a "carousel that
	// painted nothing but a scrollbar" (D896) when a suppressed driver left
	// `data-reveal-on-scroll` on the wrapper with nothing left to reveal the
	// entries. Fix: don't emit the attribute at all in this mode, so the hide
	// rule can never match — entries render visible and GSAP animates them.
	if ( 'pinned-journey' !== $scroll_effect ) {
		$wrapper_args['data-reveal-stagger'] = (string) $reveal_stagger;
		$wrapper_args['data-reveal-trigger'] = $reveal_trigger;

		// ⛔ THE TWO TRIGGERS MUST NOT BOTH EMIT `data-reveal-on-scroll`, and this is
		// the whole reason the attribute is conditional. style.scss:392 hides an
		// unrevealed entry on the ATTRIBUTE alone, with no `.is-js` guard — so if a
		// connector-reveal timeline also carried it, that rule would hide every entry
		// with JS disabled and nothing would ever unhide them. Measured live on the
		// canary: the `.is-js` gate on the connector rule was completely defeated by
		// this older selector, and all four entries stayed at opacity 0.
		//
		// The viewport path keeps the attribute and therefore keeps its existing
		// behaviour exactly (including its own no-JS weakness, which is pre-existing
		// and raised separately rather than changed here — re-keying a shipped reveal
		// to `.is-js` trades a hidden-forever bug for a flash-then-hide one, and that
		// is a decision, not a tidy-up).
		if ( 'connector' !== $reveal_trigger ) {
			$wrapper_args['data-reveal-on-scroll'] = 'true';
		}
	}
}

// Task 2 — the carousel's accessible name (SC 2.1.1). The block has no
// heading attribute of its own (entry titles are per-milestone, not a
// block-wide label), so this is a sensible i18n'd default rather than a
// content-derived name. Emitted as a data attribute — never baked into
// view.js as a literal — so a translated site gets a translated name; the
// tabindex/role themselves stay JS-only (see view.js) because they can only
// be true while the element actually scrolls.
if ( 'carousel' === $mobile_layout ) {
	$wrapper_args['data-carousel-label'] = __( 'Timeline milestones', 'sgs-blocks' );
}

$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

?>
<?php if ( $scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php
	/*
	 * The `<ol>` is a DIRECT child of the block root, and carries the horizontal
	 * effect's track marker itself.
	 *
	 * ⛔ AN INTERMEDIATE `<div class="sgs-timeline__track">` WAS TRIED HERE AND
	 * REMOVED — do not reintroduce it. `fx-horizontal-panel.js` imposes TWO
	 * constraints at once, and that div satisfied only the first:
	 *   1. `resolveTrack()` matches `:scope > [data-sgs-fx-track]`, so the marked
	 *      element must be a DIRECT child of the element carrying `data-sgs-fx`.
	 *   2. `getTravelDistance()` measures the marked element's own `children` as
	 *      the panels and returns 0 — no motion, CSS fallback only — when there
	 *      are fewer than two.
	 * With the div in place the marked element had exactly ONE child (this
	 * `<ol>`), so the effect attached, created its pin, and slid nothing.
	 * Measured live at 1440px with 12 entries: the list overflowed
	 * (scrollWidth 2640 vs clientWidth 1410) and the track still translated 0px
	 * across 30 scroll samples.
	 *
	 * Marking the `<ol>` satisfies both: it is a direct child of the root, and
	 * its children ARE the `<li>` panels. This is legal precisely because Step
	 * 4a made the root a `<div>` — the original blocker was an `<ol>` ROOT,
	 * which may only contain `<li>`/`<script>`/`<template>`.
	 */
	?>
		<ol class="sgs-timeline__list"<?php echo 'pinned-horizontal' === $scroll_effect ? ' data-sgs-fx-track' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static string literal, no user input ?>>
			<?php foreach ( $entries as $index => $entry ) : ?>
				<?php
				$entry       = is_array( $entry ) ? $entry : array();
				$date_raw    = isset( $entry['date'] ) ? (string) $entry['date'] : '';
				$entry_title = isset( $entry['title'] ) ? (string) $entry['title'] : '';
				$description = isset( $entry['description'] ) ? (string) $entry['description'] : '';
				$icon        = isset( $entry['icon'] ) ? (string) $entry['icon'] : '';
				$image_id    = isset( $entry['image'] ) ? absint( $entry['image'] ) : 0;

				// Build a safe ISO 8601 datetime attribute from the raw date string.
				// Accept both full dates (YYYY-MM-DD) and year-only values.
				$datetime_attr = '';
				if ( $date_raw ) {
					if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date_raw ) ) {
						// Looks like YYYY-MM-DD — use as-is.
						$datetime_attr = $date_raw;
					} elseif ( preg_match( '/^\d{4}$/', $date_raw ) ) {
						// Year-only format.
						$datetime_attr = $date_raw;
					} else {
						// Attempt conversion via strtotime for human-readable strings.
						$ts = strtotime( $date_raw );
						if ( false !== $ts ) {
							$datetime_attr = gmdate( 'Y-m-d', $ts );
						}
					}
				}

				// Pre-reveal when revealOnScroll is disabled, and also in
				// 'pinned-journey' mode — that fx owns entry opacity/transform
				// itself and no data-reveal-* attribute is emitted for it (see
				// above), so entries must start visible for GSAP to animate.
				$entry_classes = array( 'sgs-timeline__entry' );
				if ( ! $reveal_on_scroll || 'pinned-journey' === $scroll_effect ) {
					$entry_classes[] = 'is-revealed';
				}
				$entry_class_attr = implode( ' ', $entry_classes );

				$image_alt = ( $image_id > 0 ) ? (string) get_post_meta( $image_id, '_wp_attachment_image_alt', true ) : '';

				// ── Milestone media ────────────────────────────────────────────────
				//
				// `entries` is declared `"type": "array"` with NO `items` schema, so new
				// per-entry keys round-trip freely and need no migration: an entry
				// authored before this feature has `image` set and `mediaType` absent,
				// resolves to 'image', and renders exactly as it did.
				//
				// ONE tier, not three. sgs/hero declares 32 attributes for split media
				// because it art-directs PER DEVICE; replicating that per milestone would
				// give a client three pickers times N milestones, which is unusable. A
				// single 'desktop' tier still buys the whole image/video/SVG switch and
				// the SVG allowlist, and emits no toggle CSS.
				$entry_media_type = isset( $entry['mediaType'] ) ? (string) $entry['mediaType'] : 'image';
				$entry_media_type = in_array( $entry_media_type, array( 'image', 'video', 'svg' ), true )
					? $entry_media_type
					: 'image';
				$entry_video = isset( $entry['video'] ) && is_array( $entry['video'] ) ? $entry['video'] : array();
				$entry_svg   = isset( $entry['svg'] ) ? (string) $entry['svg'] : '';

				$entry_media_spec = array();
				if ( 'svg' === $entry_media_type && '' !== trim( $entry_svg ) ) {
					$entry_media_spec = array(
						'type' => 'svg',
						'svg'  => $entry_svg,
					);
				} elseif ( 'video' === $entry_media_type && ! empty( $entry_video['url'] ) ) {
					$entry_media_spec = array(
						'type'  => 'video',
						'media' => array(
							'id'  => isset( $entry_video['id'] ) ? absint( $entry_video['id'] ) : 0,
							'url' => (string) $entry_video['url'],
						),
					);
				} elseif ( 'image' === $entry_media_type && $image_id > 0 ) {
					// Resolve dimensions server-side from the attachment ID so the image
					// reserves its space and does not shift the layout as it loads. Same
					// backfill sgs/hero does; the ID is stored rather than a URL so it
					// survives a media re-upload.
					$src               = wp_get_attachment_image_src( $image_id, 'large' );
					$entry_media_spec  = array(
						'type'  => 'image',
						'media' => array(
							'id'     => $image_id,
							'url'    => is_array( $src ) ? (string) $src[0] : (string) wp_get_attachment_image_url( $image_id, 'large' ),
							'width'  => is_array( $src ) ? absint( $src[1] ) : 0,
							'height' => is_array( $src ) ? absint( $src[2] ) : 0,
						),
					);
				}

				$entry_media_html = '';
				if ( $entry_media_spec ) {
					$entry_media_result = sgs_tier_media_render(
						array( 'desktop' => $entry_media_spec ),
						'sgs-timeline__media',
						$uid,
						$media_decorative ? '' : $image_alt,
						array(),
						// N milestones down a page, not one hero above the fold.
						array(
							'img_loading'       => 'lazy',
							'img_fetchpriority' => 'auto',
							'video_autoplay'    => false,
						)
					);
					$entry_media_html = $entry_media_result['html'];
					// The helper's CSS must reach $scoped_css BEFORE it is printed above
					// the <ol>. A single-tier call returns '' here, but appending
					// unconditionally keeps the caller contract honest if a tier is ever
					// added — sgs/image-sequence shipped broken by appending it after the
					// <style> had already been emitted.
					if ( '' !== $entry_media_result['css'] ) {
						$scoped_css[] = $entry_media_result['css'];
					}
				}
				if ( '' !== $entry_media_html ) {
					$entry_classes[]  = 'sgs-timeline__entry--has-media';
					$entry_class_attr = implode( ' ', $entry_classes );
				}
				?>
				<li class="<?php echo esc_attr( $entry_class_attr ); ?>">
					<time class="sgs-timeline__date"<?php echo $datetime_attr ? ' datetime="' . esc_attr( $datetime_attr ) . '"' : ''; ?>>
						<?php echo esc_html( $date_raw ); ?>
					</time>
					<?php
					// ⛔ A SIBLING of <time>, never a wrapper around it. Every alternation
					// rule targets `.sgs-timeline__date` directly to swap its grid-column
					// (style.scss :488-526); nesting the date inside a media div would
					// break all of them, and would also cost the <time> element its own
					// dateColour attrMap routing. For the overlay placement the two are
					// grid-STACKED into the same cell instead, which keeps the element
					// tree flat and every existing rule intact.
					//
					// The helper's markup is already escaped: images via
					// sgs_responsive_image(), SVG through wp_kses( …, sgs_allowed_svg_tags() ).
					if ( '' !== $entry_media_html ) :
						?>
						<div class="sgs-timeline__media-slot"<?php echo $media_decorative ? ' aria-hidden="true"' : ''; ?>>
							<?php echo $entry_media_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						</div>
						<?php
					endif;
					?>
					<div class="sgs-timeline__node" aria-hidden="true">
						<?php if ( $icon ) : ?>
							<span class="sgs-timeline__node-icon" data-icon="<?php echo esc_attr( $icon ); ?>" aria-hidden="true"></span>
						<?php endif; ?>
					</div>
					<div class="sgs-timeline__content">
						<<?php echo esc_attr( $heading_level ); ?> class="sgs-timeline__title"><?php echo esc_html( $entry_title ); ?></<?php echo esc_attr( $heading_level ); ?>>
						<?php if ( $description ) : ?>
							<div class="sgs-timeline__description"><?php echo wp_kses_post( $description ); ?></div>
						<?php endif; ?>
						<?php
						// The per-entry image used to render HERE, inside the content
						// column, which put every picture on the same side as the text. It
						// now renders in `.sgs-timeline__media-slot` above — opposite the
						// content, on the date's side. Same `image` attribute, same stored
						// data; only the position and the surrounding markup changed, so
						// no migration and no deprecation (D270).
						?>
					</div>
				</li>
		<?php endforeach; ?>
			<?php if ( $progress_fill ) : ?>
				<?php
				/*
				 * FR-38-35 scroll-driven progress connector. Decorative only.
				 *
				 * Emitted LAST and as an <li>, both deliberately:
				 *   - <ol> may only contain <li>/<script>/<template>, so a bare <svg>
				 *     or <div> here is invalid markup.
				 *   - `:nth-child(odd|even)` drives the alternating layout and counts
				 *     ALL children, so an element emitted FIRST shifts every entry's
				 *     index by one and inverts the alternation. Last is index-neutral.
				 *
				 * Three layers, one number: a blurred glow and a crisp fill, both
				 * masked to `--sgs-timeline-fill-progress`, plus a head dot at that
				 * same position. Sparks are appended here by view.js while scrolling.
				 */
				?>
				<li class="sgs-timeline__progress" aria-hidden="true">
					<span class="sgs-timeline__progress-glow"></span>
					<span class="sgs-timeline__progress-fill"></span>
				</li>
			<?php endif; ?>
			</ol>
</div>
