<?php
/**
 * Product FAQ — server-side render.
 *
 * Renders an accessible disclosure-pattern FAQ list (content kind). Registers
 * structured FAQ data into a page-scoped collector so exactly ONE FAQPage
 * JSON-LD script tag is emitted via wp_footer — even when multiple
 * sgs/product-faq block instances appear on the same page (spec: one FAQPage
 * per page, all Q&A in a single mainEntity array, sibling of Product JSON-LD).
 *
 * BLOCK-PRIVATE, NO-WRAPPER: sgs/product-faq is CONTENT-kind (box + width
 * only) — it never used SGS_Container_Wrapper's grid/section/background/
 * overlay machinery (content-kind gates gap/band-tier CSS off entirely — see
 * class-sgs-container-wrapper.php), so the wrapper was dead weight for this
 * block. Converter CSS routing keys on block_attributes by block_slug
 * (block.json-derived), not on wraps_block/container_kind, so dropping the
 * wrapper does not affect cloning (same reasoning as sgs/quote, D294).
 *
 * The `<section>` IS the block root, built via get_block_wrapper_attributes().
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 *
 * BOX-GROUP: base padding/margin/border-radius/border-width/border-color/
 * border-style = WP-native style.spacing / style.border objects (emitted
 * scoped, base only — no tiers, matches the pre-existing no-tier contract for
 * this block's border). Tablet/Mobile tiers exist for padding/margin only
 * (paddingTablet/paddingMobile/marginTablet/marginMobile object attrs, scoped
 * at 1023px/767px breakpoints).
 *
 * maxWidth (kept-scalar width family, base only — no tiers, matches the
 * pre-existing attr) is reproduced scoped on the root: max-width +
 * margin-inline:auto. This block never renders an inner band, so there is
 * no separate content-width layer.
 *
 * gap is not emitted on this block: the shared wrapper gates gap CSS to
 * section/layout kinds only (never content kind — see
 * class-sgs-container-wrapper.php `$is_section || $is_layout` gate on every
 * gap emission path), and no editor control exists for it either
 * (ContainerWrapperControls kind="content" only renders WidthPanel + spacing
 * — no LayoutPanel/gap for content kind).
 *
 * Strategy chosen for the FAQPage JSON-LD collector: wp_footer hook over a
 * per-block printf(). Reason: the FAQ block is a content block that may
 * appear multiple times (e.g. general FAQ + shipping FAQ on the same page). A
 * footer hook lets us collect every item from every instance, deduplicate
 * questions, and emit exactly one <script> tag — the correct schema
 * structure. A static-flag approach with "first block wins" would silently
 * drop items from later instances, which violates the spec requirement of one
 * merged mainEntity array.
 *
 * @since 2026-07-10
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (faq items).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/product-faq-schema.php';

// ---------------------------------------------------------------------------
// 1. Security sanitiser (contract §D) — CSS-length sanitiser for box/side
// values (mirrors sgs/quote + sgs/brand-strip).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. Extract content attributes.
// ---------------------------------------------------------------------------

$heading = $attributes['heading'] ?? 'Frequently Asked Questions';
// Note: iconPosition is consumed by the child block via providesContext.

// Allowlisted against the block's own h2/h3/h4/p enum (mirrors sgs/icon-list's pattern).
$sgs_allowed_heading_levels = array( 'h2', 'h3', 'h4', 'p' );
$heading_tag                = in_array( $attributes['headingLevel'] ?? '', $sgs_allowed_heading_levels, true )
	? $attributes['headingLevel']
	: 'h2';

$anchor = $attributes['anchor'] ?? '';

// ---------------------------------------------------------------------------
// 3. Collect FAQ items for JSON-LD — UNCHANGED from pre-migration behaviour.
// ---------------------------------------------------------------------------

global $sgs_faq_jsonld_items;
if ( ! is_array( $sgs_faq_jsonld_items ) ) {
	$sgs_faq_jsonld_items = array();
}

foreach ( $block->inner_blocks as $inner_block ) {
	if ( 'sgs/product-faq-item' !== $inner_block->name ) {
		continue;
	}

	$question = isset( $inner_block->attributes['question'] )
		? wp_strip_all_tags( $inner_block->attributes['question'] )
		: '';

	if ( empty( $question ) ) {
		continue;
	}

	// Render the item's inner blocks to extract clean answer text.
	$answer_html = '';
	if ( ! empty( $inner_block->inner_blocks ) ) {
		foreach ( $inner_block->inner_blocks as $answer_block ) {
			if ( ! isset( $answer_block->parsed_block ) || ! is_array( $answer_block->parsed_block ) ) {
				continue;
			}
			$answer_html .= ( new WP_Block( $answer_block->parsed_block ) )->render();
		}
	}

	$answer_text = trim( wp_strip_all_tags( $answer_html ) );
	if ( empty( $answer_text ) ) {
		continue;
	}

	// Deduplicate by question (normalised). Later instances of the same
	// question overwrite earlier ones so the last-authored answer wins.
	$dedup_key                          = md5( $question );
	$sgs_faq_jsonld_items[ $dedup_key ] = array(
		'@type'          => 'Question',
		'name'           => $question,
		'acceptedAnswer' => array(
			'@type' => 'Answer',
			'text'  => $answer_text,
		),
	);
}

// Register the wp_footer hook exactly once per page load.
if ( ! has_action( 'wp_footer', 'sgs_emit_faq_page_jsonld' ) ) {
	add_action( 'wp_footer', 'sgs_emit_faq_page_jsonld', 90 );
}

// ---------------------------------------------------------------------------
// 4. WP-native style groups (skip-serialised in block.json → NOT auto-inlined
// by get_block_wrapper_attributes()). Border is passed wholesale (this block
// has full native width/style/color/radius support, matches sgs/brand-strip).
// ---------------------------------------------------------------------------

// D635-pattern migration: text now reads from the flat textColour attr
// (SgsColourPanel), not native style.color.text (supports.color.text is now
// false). Background (colour + gradient, resting + hover) is owned by the
// shared fill emitter below, NOT by the style engine and NOT by
// supports.color.gradients.
//
// supports.color.gradients was `true` here, so CORE rendered its own gradient
// panel in the Styles tab, competing with the SGS colour panel — the client
// saw two and could not tell which won. Switching the flag off alone would
// have REMOVED the only gradient control this block had, because the sole
// gradient read was $attributes['style']['color']['gradient'] (core's own
// storage). The flag flip is therefore PAIRED with a block-private
// backgroundColourGradient exposed through fillRow(), so capability is moved
// rather than lost.
$style_color_text = isset( $attributes['textColour'] ) ? (string) $attributes['textColour'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

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

$native_border = ( isset( $attributes['style']['border'] ) && is_array( $attributes['style']['border'] ) ) ? $attributes['style']['border'] : array();

$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// Width (SGS custom scalars — kept per contract §C: single-value families stay
// scalar, no tiers on this block). Emitted scoped block-private.
$max_width = $attributes['maxWidth'] ?? '';

// ---------------------------------------------------------------------------
// 5. Resolve scope id. Uid is a CLASS (contract §B3) — this block declares
// anchor:true, so the element's single `id` attribute stays free for the
// anchor (ToC target).
// ---------------------------------------------------------------------------

$uid      = 'sgs-product-faq-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-product-faq';

$scoped_css = array();

// --- Base spacing (padding/margin) + native border (width/style/colour/
// radius) + WP colour + typography supports — skip-serialised, emitted scoped
// via the stable core style engine (exactly how WP core outputs `layout`
// support). ---

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

// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width. The gate strips a lone 'style' key so this rule is
// applied identically everywhere, not per block (helpers-box.php).
if ( ! empty( $native_border ) ) {
	$base_style_engine_args['border'] = sgs_gate_native_border_style( $native_border );
}

$sgs_pf_fill_css = sgs_fill_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $sgs_pf_fill_css ) {
	$scoped_css[] = $sgs_pf_fill_css;
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

// D636 gap-closure — textColour gains a gradient-capable paint path
// (sibling attribute, matches sgs/counter's labelColour/labelColourGradient).
// Emitted as its own scoped rule rather than via wp_style_engine_get_styles'
// color.text (which would write an invalid `color:` declaration for a
// gradient string) — sgs_text_colour_decl() picks flat colour vs
// background-clip:text automatically, and the fallback rule is mandatory
// alongside it (self-no-ops on a flat colour).
$style_color_text_gradient = isset( $attributes['textColourGradient'] ) ? (string) $attributes['textColourGradient'] : '';
$text_colour_effective     = sgs_resolve_text_colour_or_gradient( $style_color_text, $style_color_text_gradient );
if ( '' !== $text_colour_effective ) {
	$text_colour_decl = sgs_text_colour_decl( $text_colour_effective );
	if ( '' !== $text_colour_decl ) {
		$scoped_css[] = "{$root_sel}{{$text_colour_decl};}";
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $root_sel, $text_colour_effective );
}

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). Replaces the old WP-native
// supports.typography (fontSize + lineHeight only) with the framework's own
// helper, which also now offers fontWeight/fontStyle.
$sgs_pf_typography_css = sgs_typography_css_rule( $attributes, '', $root_sel );
if ( '' !== $sgs_pf_typography_css ) {
	$scoped_css[] = $sgs_pf_typography_css;
}

// --- Width (base only — outer maxWidth). ---
if ( $max_width ) {
	$mw_safe = sgs_css_length_value( $max_width );
	if ( '' !== $mw_safe ) {
		$scoped_css[] = "{$root_sel}{max-width:{$mw_safe};margin-inline:auto;}";
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B/§B2: tablet
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
// 6. Build HTML.
// ---------------------------------------------------------------------------

$heading_html = sprintf(
	'<%1$s class="sgs-product-faq__heading">%2$s</%1$s>',
	esc_attr( $heading_tag ),
	esc_html( $heading )
);

$inner_html = $heading_html
	. '<div class="sgs-product-faq__items">'
	. $content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Inner blocks are already escaped.
	. '</div>';

// ---------------------------------------------------------------------------
// 7. Build the root element's classes + attributes. NO 'style' key is
// passed — the root carries ZERO inline property declarations (contract §A);
// everything is in the scoped <style> above. Preset colour classes re-added
// manually (skip-serialisation suppresses WP's automatic class addition too,
// not just the inline style).
// ---------------------------------------------------------------------------

$root_classes = array( 'sgs-product-faq', $uid );
if ( '' !== $preset_text_slug ) {
	$root_classes[] = 'has-text-color';
	$root_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$root_classes[] = 'has-background';
	$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$root_attr_args = array(
	'class'      => implode( ' ', $root_classes ),
	'aria-label' => wp_strip_all_tags( $heading ),
);
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

// ---------------------------------------------------------------------------
// 8. Render. wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while
// leaving CSS combinators like `>` intact (contract §D — matches
// SGS_Container_Wrapper + sgs/quote + sgs/brand-strip). Every value reaching

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
		$bwt = '' !== $border_width_top ? $border_width_top : '0';
		$bwr = '' !== $border_width_right ? $border_width_right : '0';
		$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl = '' !== $border_width_left ? $border_width_left : '0';
		$scoped_css[] = $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$scoped_css[] = sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$scoped_css[] = $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
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
$border_radius_obj = is_array( $attributes['borderRadius'] ?? null ) ? $attributes['borderRadius'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$scoped_css[] = $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// $scoped_css is pre-sanitised (sgs_css_length_value() / wp_style_engine_get_styles),
// so no un-sanitised value survives to here.
// ---------------------------------------------------------------------------

?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</style>
<?php endif; ?>
<section <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo $inner_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></section>
