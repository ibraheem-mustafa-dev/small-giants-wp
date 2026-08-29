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
$alignment        = $attributes['alignment'] ?? 'alternating';
$connector_style  = $attributes['connectorStyle'] ?? 'line';
$connector_colour = $attributes['connectorColour'] ?? 'border';
$date_colour      = $attributes['dateColour'] ?? 'accent';
$progress_fill    = ! empty( $attributes['connectorProgressFill'] );
$fill_colour      = $attributes['connectorFillColour'] ?? 'accent';
$reveal_on_scroll = isset( $attributes['revealOnScroll'] ) ? (bool) $attributes['revealOnScroll'] : true;
$reveal_stagger   = isset( $attributes['revealStagger'] ) ? absint( $attributes['revealStagger'] ) : 100;

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

// Milestone media placement (block-wide, not per entry — one decision for the
// client, and a timeline with mixed placements reads as untidy).
$media_placement = $attributes['milestoneMediaPlacement'] ?? 'under-date';
$media_placement = in_array( $media_placement, array( 'under-date', 'date-over-media' ), true )
	? $media_placement
	: 'under-date';
$media_width = sgs_css_length_value( $attributes['milestoneMediaWidth'] ?? '180px' );

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

// Sanitise orientation + alignment to avoid arbitrary CSS class injection.
$orientation     = in_array( $orientation, array( 'vertical', 'horizontal' ), true ) ? $orientation : 'vertical';
$alignment       = in_array( $alignment, array( 'left', 'centre', 'alternating' ), true ) ? $alignment : 'alternating';
$connector_style = in_array( $connector_style, array( 'line', 'dashed', 'dotted' ), true ) ? $connector_style : 'line';

// WP `color` support values (skip-serialised in block.json → NOT auto-inlined).
$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// WP `shadow` support value (skip-serialised).
$style_shadow = isset( $attributes['style']['shadow'] ) ? (string) $attributes['style']['shadow'] : '';

// WP `typography` support values (skip-serialised) — pass the whole filtered
// set to the style engine at once (base only; this block has no responsive
// typography tiers).
$style_typography_raw = isset( $attributes['style']['typography'] ) && is_array( $attributes['style']['typography'] ) ? $attributes['style']['typography'] : array();
$style_typography     = array();
foreach ( array( 'fontSize', 'lineHeight', 'letterSpacing', 'textTransform', 'fontWeight', 'fontStyle' ) as $typography_key ) {
	if ( isset( $style_typography_raw[ $typography_key ] ) && '' !== $style_typography_raw[ $typography_key ] ) {
		$style_typography[ $typography_key ] = $style_typography_raw[ $typography_key ];
	}
}

// `textAlign` is NOT nested under style.typography — WP's typography.textAlign
// support injects it as a TOP-LEVEL $attributes['textAlign'] string (mirrors
// sgs/notice-banner + sgs/countdown-timer). block.json maps css:text-align to
// the `title` element (`.sgs-timeline__title`), so it is scoped there, not
// the root <ol> (DB-first element manifest, R-31-1).
$text_align_raw = $attributes['textAlign'] ?? '';
$text_align     = in_array( $text_align_raw, array( 'left', 'center', 'right' ), true ) ? $text_align_raw : '';

// Base padding/margin — WP-native style.spacing.* objects (skip-serialised).
$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys). Tiers are the
// SGS object attrs borderRadiusTablet/borderRadiusMobile.
$base_border_radius = null;
if ( isset( $attributes['style']['border']['radius'] ) ) {
	$radius_raw = $attributes['style']['border']['radius'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$base_border_radius = $radius_raw;
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean   = array();
		$has_any_corner = false;
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
			$radius_clean[ $corner ] = isset( $radius_raw[ $corner ] ) ? sgs_css_length_value( $radius_raw[ $corner ] ) : '';
			if ( '' !== $radius_clean[ $corner ] ) {
				$has_any_corner = true;
			}
		}
		if ( $has_any_corner ) {
			$base_border_radius = $radius_clean;
		}
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

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

// --- Typography — routed to `.sgs-timeline__title` (matches the declared
// selectors.typography in block.json), not the root. ---
if ( ! empty( $style_typography ) ) {
	$typography_scoped_styles = wp_style_engine_get_styles(
		array( 'typography' => $style_typography ),
		array( 'selector' => $title_sel )
	);
	if ( ! empty( $typography_scoped_styles['css'] ) ) {
		$scoped_css[] = $typography_scoped_styles['css'];
	}
}

// --- text-align — not a style-engine `typography` key (hand-built, mirrors
// sgs/countdown-timer + sgs/icon-list), scoped to the title selector. ---
if ( '' !== $text_align ) {
	$scoped_css[] = "{$title_sel}{text-align:{$text_align};}";
}

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
	$wrapper_classes[] = 'sgs-timeline--align-' . $alignment;
}
$wrapper_classes[] = 'sgs-timeline--connector-' . $connector_style;
if ( $progress_fill ) {
	// FR-38-35 — suppression of the always-drawn ::before is keyed on THIS
	// class, never on @supports: an @supports-keyed hide would leave a doubled
	// line for every visitor on the JS driver, which today is all of Firefox.
	$wrapper_classes[] = 'sgs-timeline--connector-progress';
}

// Milestone-media placement + A/B row bands. Both are keyed on a wrapper class
// so that a timeline using neither is byte-identical to before: every new rule
// in style.scss sits behind one of these classes or behind
// `.sgs-timeline__entry--has-media`.
$wrapper_classes[] = 'sgs-timeline--media-' . ( 'date-over-media' === $media_placement ? 'overlay' : 'under' );
if ( $row_stripes ) {
	$wrapper_classes[] = 'sgs-timeline--row-stripes';
}
if ( 'connector' === $reveal_trigger ) {
	$wrapper_classes[] = 'sgs-timeline--reveal-connector';
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
if ( $connector_colour ) {
	$wrapper_style_parts[] = '--sgs-connector-colour:' . sgs_colour_value( $connector_colour );
}
if ( $date_colour ) {
	$wrapper_style_parts[] = '--sgs-date-colour:' . sgs_colour_value( $date_colour );
}
if ( $progress_fill && $fill_colour ) {
	$wrapper_style_parts[] = '--sgs-timeline-fill-colour:' . sgs_colour_value( $fill_colour );
}
if ( $reveal_stagger > 0 ) {
	$wrapper_style_parts[] = '--sgs-reveal-stagger:' . $reveal_stagger . 'ms';
}
if ( '' !== $media_width ) {
	$wrapper_style_parts[] = '--sgs-timeline-media-width:' . $media_width;
}
if ( $row_stripes ) {
	// An EMPTY stripe A is the useful default: the odd rows keep whatever the
	// page/section background already is, and only the even rows are banded. A
	// literal colour on both would fight a sectioned page for no gain.
	$wrapper_style_parts[] = '--sgs-timeline-stripe-a:' . ( $stripe_a ? sgs_colour_value( $stripe_a ) : 'transparent' );
	$wrapper_style_parts[] = '--sgs-timeline-stripe-b:' . ( $stripe_b ? sgs_colour_value( $stripe_b ) : 'transparent' );
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

// Pass scroll-reveal config to view.js via data attributes.
if ( $reveal_on_scroll ) {
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

$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

?>
<?php if ( $scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<ol <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
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

		// Pre-reveal when revealOnScroll is disabled.
		$entry_classes = array( 'sgs-timeline__entry' );
		if ( ! $reveal_on_scroll ) {
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
