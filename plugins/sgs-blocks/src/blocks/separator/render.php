<?php
/**
 * Server-side render for sgs/separator.
 *
 * A styleable horizontal divider replacing core/separator framework-wide.
 * Two structural shapes, chosen by `contentMode`:
 *   - `none` (default): the block root IS a single `<hr>` — no wrapper
 *     element (single-semantic-element rule, LOCKED per-block no-inline
 *     migration contract §B3).
 *   - `icon` | `text`: the root becomes a `<div>` flex row of two flanking
 *     `.sgs-separator__line` spans either side of a centred
 *     `.sgs-separator__content` slot. This wrapper is NOT "useless" (§B3) —
 *     it is structurally required to lay out two independent line segments
 *     either side of the content, which a single element cannot express.
 *
 * BLOCK-PRIVATE. NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check. The WP-native `spacing` support
 * (padding/margin) is emitted scoped via `wp_style_engine_get_styles()` (exactly how WP core outputs `layout` support),
 * alongside the paddingTablet/paddingMobile/marginTablet/
 * marginMobile object-attr tiers (contract §B2: @media 1023/767).
 *
 * The visible "line" is rendered as a `border-bottom` (NOT a background bar)
 * on the `<hr>` itself in `none` mode, or on each `.sgs-separator__line` span
 * in `icon`/`text` mode — this is the ONE mechanism for both shapes and for
 * both the flat-colour and gradient look: `border-bottom-style` /
 * `border-bottom-width` render lineStyle (solid/dashed/dotted/double) +
 * thickness in every case; the flat-colour look additionally sets
 * `border-bottom-color`, while the gradient look sets `border-image` instead
 * (CSS renders `border-image` only across the sides that actually carry a
 * border-width, so a bottom-only border-image paints just the visible line).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — no InnerBlocks slot).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/wp-icons.php';

// ---------------------------------------------------------------------------
// 1. Security sanitisers (contract §D) — mirrors sgs/quote + sgs/brand-strip.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. Extract + validate attributes.
// ---------------------------------------------------------------------------

$allowed_line_styles = array( 'solid', 'dashed', 'dotted', 'double', 'none' );
$line_style_raw      = $attributes['lineStyle'] ?? 'solid';
$line_style          = in_array( $line_style_raw, $allowed_line_styles, true ) ? $line_style_raw : 'solid';

$width_unit_raw = $attributes['widthUnit'] ?? '%';
$width_unit     = in_array( $width_unit_raw, array( 'px', '%' ), true ) ? $width_unit_raw : '%';

$thickness_unit = sgs_css_length_value( $attributes['thicknessUnit'] ?? 'px' );
$thickness_unit = '' !== $thickness_unit ? $thickness_unit : 'px';

$colour = $attributes['colour'] ?? '';

$opacity_raw = $attributes['opacity'] ?? 100;
$opacity     = is_numeric( $opacity_raw ) ? max( 0, min( 100, (float) $opacity_raw ) ) : 100;

$allowed_alignments = array( 'left', 'center', 'right' );
$alignment_raw      = $attributes['alignment'] ?? 'center';
$alignment          = in_array( $alignment_raw, $allowed_alignments, true ) ? $alignment_raw : 'center';

// A non-empty validated gradient wins over the flat `colour`; no boolean
// discriminator (an empty string is the "off" state). Storage matches the
// D636 gradient contract (one complete CSS gradient string).
$line_gradient = sgs_css_gradient_value( $attributes['lineGradient'] ?? '' );
$has_gradient  = '' !== $line_gradient;

$allowed_content_modes = array( 'none', 'icon', 'text' );
$content_mode_raw      = $attributes['contentMode'] ?? 'none';
$content_mode          = in_array( $content_mode_raw, $allowed_content_modes, true ) ? $content_mode_raw : 'none';

// ---------------------------------------------------------------------------
// 3. WP-native spacing support (skip-serialised → NOT auto-inlined) + the
// responsive box-object tiers (contract §B).
// ---------------------------------------------------------------------------

$base_padding_obj = array();
if ( isset( $attributes['padding'] ) && is_array( $attributes['padding'] ) ) {
	foreach ( $attributes['padding'] as $padding_side => $padding_value ) {
		if ( is_string( $padding_value ) && '' !== $padding_value ) {
			$base_padding_obj[ $padding_side ] = $padding_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['margin'] ) && is_array( $attributes['margin'] ) ) {
	foreach ( $attributes['margin'] as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}

$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// ---------------------------------------------------------------------------
// 4. Build the uid + selectors. Uid is a CLASS (contract §B3) — this block
// declares no anchor support, but every scoped selector in the framework is
// class-based by convention (never `#{$uid}` — D303).
// ---------------------------------------------------------------------------

$with_content = 'none' !== $content_mode;
$uid          = 'sgs-separator-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel     = '.' . $uid . '.wp-block-sgs-separator';
// The element that carries the visible line(s): the root itself in `none`
// mode (a single <hr>), or each flanking line span in `icon`/`text` mode.
$line_sel = $with_content ? "{$root_sel} .sgs-separator__line" : $root_sel;

$scoped_css = array();

// ---------------------------------------------------------------------------
// 5. Line rendering — lineStyle/thickness/colour OR gradient, on $line_sel.
// One mechanism for both shapes (contract: universal, no per-block carve-out).
// ---------------------------------------------------------------------------

$line_decls = array();
if ( 'none' === $line_style ) {
	$line_decls[] = 'border-bottom:0 none transparent';
} else {
	$line_decls[] = 'border-bottom-style:' . $line_style;
	if ( $has_gradient ) {
		// `border-image` is DELIBERATE here and is NOT the D636-banned usage.
		// That ban exists because border-image cannot respect `border-radius`
		// — a separator is a 1D rule with no radius, so the rationale does not
		// apply. It is also the ONLY mechanism that keeps a dashed/dotted
		// gradient line working: `lineStyle` feeds `border-bottom-style`, and
		// a background-image cannot express a dashed rule. Switching to
		// background-image here would silently drop that capability.
		$line_decls[] = 'border-image:' . $line_gradient . ' 1';
		$line_decls[] = 'border-bottom-color:transparent';
	} elseif ( '' !== $colour ) {
		$line_decls[] = 'border-bottom-color:' . sgs_colour_value( $colour );
	}
}
if ( $line_decls ) {
	$scoped_css[] = "{$line_sel}{" . implode( ';', $line_decls ) . ';}';
}

// `thickness` is a TIER OBJECT as of Spec 35 pass 2 (2026-08-11) — ONE attr
// holding {desktop,tablet,mobile}. `sgs_responsive_css_rule()`'s validity gate
// is `is_numeric( $raw )` (helpers-responsive.php), so feeding the object
// straight through would fail every tier's check and the whole thickness rule
// would vanish silently (same trap as sgs/responsive-logo's maxWidth,
// 2026-08-11). Flatten back to the three scalar keys the helper expects,
// keeping its unit handling and @media emission byte-identical.
$thickness_tiers = sgs_responsive_normalise_object( $attributes['thickness'] ?? null );

// Thickness — responsive (base/tablet/mobile) on the SAME line selector.
$thickness_css = sgs_responsive_css_rule(
	array_merge(
		$attributes,
		array(
			'thickness'       => $thickness_tiers['desktop'] ?? '',
			'thicknessTablet' => $thickness_tiers['tablet'] ?? '',
			'thicknessMobile' => $thickness_tiers['mobile'] ?? '',
		)
	),
	array(
		array(
			'attr'         => 'thickness',
			'css'          => 'border-bottom-width',
			'unit_default' => $thickness_unit,
			'tablet_attr'  => 'thicknessTablet',
			'mobile_attr'  => 'thicknessMobile',
		),
	),
	$line_sel
);
if ( '' !== $thickness_css ) {
	$scoped_css[] = $thickness_css;
}

// ---------------------------------------------------------------------------
// 6. Width + alignment — on the ROOT selector (overall element/group width;
// each line's own width inside a content-mode row is flex:1, set in style.css).
// ---------------------------------------------------------------------------

// `width` is a TIER OBJECT as of Spec 35 pass 2 (2026-08-11) — same flatten
// as `thickness` above, for the same reason (helper's is_numeric() gate).
$width_tiers = sgs_responsive_normalise_object( $attributes['width'] ?? null );

$width_css = sgs_responsive_css_rule(
	array_merge(
		$attributes,
		array(
			'width'       => $width_tiers['desktop'] ?? '',
			'widthTablet' => $width_tiers['tablet'] ?? '',
			'widthMobile' => $width_tiers['mobile'] ?? '',
		)
	),
	array(
		array(
			'attr'         => 'width',
			'css'          => 'width',
			'unit_default' => $width_unit,
			'tablet_attr'  => 'widthTablet',
			'mobile_attr'  => 'widthMobile',
		),
	),
	$root_sel
);
if ( '' !== $width_css ) {
	$scoped_css[] = $width_css;
}

$alignment_decls = array();
switch ( $alignment ) {
	case 'left':
		$alignment_decls[] = 'margin-left:0';
		$alignment_decls[] = 'margin-right:auto';
		break;
	case 'right':
		$alignment_decls[] = 'margin-left:auto';
		$alignment_decls[] = 'margin-right:0';
		break;
	case 'center':
	default:
		$alignment_decls[] = 'margin-left:auto';
		$alignment_decls[] = 'margin-right:auto';
		break;
}
$scoped_css[] = "{$root_sel}{" . implode( ';', $alignment_decls ) . ';}';

if ( 100.0 !== $opacity ) {
	$scoped_css[] = "{$root_sel}{opacity:" . rtrim( rtrim( number_format( $opacity / 100, 4, '.', '' ), '0' ), '.' ) . ';}';
}

// --- Base spacing (padding/margin) — skip-serialised WP support, emitted
// scoped via the stable core style engine (matches sgs/quote / sgs/heading). ---

$base_spacing = array();
if ( ! empty( $base_padding_obj ) ) {
	$base_spacing['padding'] = $base_padding_obj;
}
if ( ! empty( $base_margin_obj ) ) {
	$base_spacing['margin'] = $base_margin_obj;
}
if ( ! empty( $base_spacing ) ) {
	$base_scoped_styles = wp_style_engine_get_styles(
		array( 'spacing' => $base_spacing ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
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
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// ---------------------------------------------------------------------------
// 7. Content slot (icon or text) — only built when contentMode !== 'none'.
// ---------------------------------------------------------------------------

$content_html = '';

if ( 'icon' === $content_mode ) {
	$allowed_icon_sources = array( 'lucide', 'wp-icon', 'dashicon', 'emoji' );
	$icon_source          = $attributes['contentIconSource'] ?? 'lucide';
	$icon_source          = in_array( $icon_source, $allowed_icon_sources, true ) ? $icon_source : 'lucide';
	$icon_name            = preg_replace( '/[^a-z0-9-]/', '', strtolower( $attributes['contentIconName'] ?? 'star' ) );
	$icon_wp_name         = preg_replace( '/[^a-z0-9-]/', '', strtolower( $attributes['contentIconWpIcon'] ?? '' ) );
	$icon_dashicon_name   = preg_replace( '/[^a-z0-9-]/', '', strtolower( $attributes['contentIconDashicon'] ?? '' ) );
	$icon_emoji           = wp_strip_all_tags( trim( $attributes['contentIconEmoji'] ?? '' ) );
	$icon_size            = absint( $attributes['contentIconSize'] ?? 24 );
	$icon_colour          = $attributes['contentColour'] ?? '';

	$icon_decls = array( '--sgs-separator-icon-size:' . $icon_size . 'px' );
	if ( '' !== $icon_colour ) {
		$icon_decls[] = 'color:' . sgs_colour_value( $icon_colour );
	}
	$scoped_css[] = "{$root_sel} .sgs-separator__content{" . implode( ';', $icon_decls ) . ';}';

	if ( 'dashicon' === $icon_source ) {
		wp_enqueue_style( 'dashicons' );
		$safe_slug    = '' !== $icon_dashicon_name ? $icon_dashicon_name : 'star-filled';
		$content_html = sprintf( '<span class="sgs-separator__icon dashicons dashicons-%s" aria-hidden="true"></span>', esc_attr( $safe_slug ) );
	} elseif ( 'wp-icon' === $icon_source ) {
		$content_html = '<span class="sgs-separator__icon" aria-hidden="true">' . sgs_get_wp_icon( $icon_wp_name ) . '</span>';
	} elseif ( 'emoji' === $icon_source ) {
		$safe_emoji   = '' !== $icon_emoji ? $icon_emoji : '⭐';
		$content_html = '<span class="sgs-separator__icon" aria-hidden="true">' . esc_html( $safe_emoji ) . '</span>';
	} else {
		$content_html = '<span class="sgs-separator__icon" aria-hidden="true">' . sgs_get_lucide_icon( $icon_name ) . '</span>';
	}
} elseif ( 'text' === $content_mode ) {
	$content_text            = $attributes['contentText'] ?? '';
	$content_colour          = $attributes['contentColour'] ?? '';
	$content_colour_gradient = $attributes['contentColourGradient'] ?? '';

	if ( function_exists( 'sgs_typography_css_rule' ) ) {
		$content_typography_css = sgs_typography_css_rule( $attributes, 'content', "{$root_sel} .sgs-separator__content" );
		if ( '' !== $content_typography_css ) {
			$scoped_css[] = $content_typography_css;
		}
	}
	// D636 — sibling gradient attribute wins when set+valid. Only wired for
	// 'text' mode (a real text-clip target); 'icon' mode below stays flat-only
	// — background-clip:text clips to real glyph outlines and would blank a
	// lucide/wp-icon inline-SVG glyph.
	$content_colour_sel       = "{$root_sel} .sgs-separator__content";
	$content_colour_effective = sgs_resolve_text_colour_or_gradient( $content_colour, $content_colour_gradient );
	if ( '' !== $content_colour_effective ) {
		$content_colour_decl = sgs_text_colour_decl( $content_colour_effective );
		if ( '' !== $content_colour_decl ) {
			$scoped_css[] = "{$content_colour_sel}{{$content_colour_decl};}";
		}
		$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $content_colour_sel, $content_colour_effective );
	}

	$content_html = '<span class="sgs-separator__content">' . esc_html( $content_text ) . '</span>';
}

// ---------------------------------------------------------------------------
// 8. Output.
// ---------------------------------------------------------------------------

if ( $scoped_css ) :
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
	<?php
endif;

if ( ! $with_content ) {
	// Plain divider — the <hr> IS the block root (no wrapper, contract §B3).
	$wrapper_attributes = get_block_wrapper_attributes( array( 'class' => $uid ) );
	printf( '<hr %s />', $wrapper_attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- from WP core.
} else {
	// Content-in-middle — a genuinely-needed flex wrapper (two independent
	// flanking lines either side of the content; not expressible on one
	// element, so this wrapper is NOT the "useless div" contract §B3 forbids).
	$wrapper_attributes = get_block_wrapper_attributes(
		array(
			'class' => $uid . ' sgs-separator--with-content',
			'role'  => 'separator',
		)
	);
	printf(
		'<div %1$s><span class="sgs-separator__line" aria-hidden="true"></span>%2$s<span class="sgs-separator__line" aria-hidden="true"></span></div>',
		$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- from WP core.
		$content_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above with esc_html/esc_attr/sgs_get_*_icon (which escape their own output).
	);
}
