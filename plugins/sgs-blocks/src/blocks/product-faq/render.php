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
 * BOX-GROUP: padding, margin and the border (the block's own borderWidth/
 * borderStyle/borderColour/borderRadius attributes) are emitted scoped;
 * padding, margin and radius are tier objects printed per @media tier with
 * only the sides or corners each tier sets.
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

// textColour hover state (2026-09-07, colour-conformance bg-layer batch).
// $root_sel ALSO paints a background via sgs_fill_states_css() above
// (backgroundColour/backgroundColourHover on the SAME selector), so a hover
// text-GRADIENT's background-clip:text would clip/overwrite that background.
// Only intervene when the resolved hover value is actually a gradient
// (mirrors the brand-strip itemTextColourHover fix, c785a3b7a, and
// sgs/form-step's identical fix in this same batch): neutralise the
// on-element hover background and repaint the identical resolved hover
// background on its own ::after layer instead.
$style_color_text_hover           = isset( $attributes['textColourHover'] ) ? (string) $attributes['textColourHover'] : '';
$style_color_text_hover_gradient  = isset( $attributes['textColourHoverGradient'] ) ? (string) $attributes['textColourHoverGradient'] : '';
$text_colour_hover_effective       = sgs_resolve_text_colour_or_gradient( $style_color_text_hover, $style_color_text_hover_gradient );
if ( '' !== $text_colour_hover_effective ) {
	$text_colour_hover_decl = sgs_text_colour_decl( $text_colour_hover_effective );
	if ( '' !== $text_colour_hover_decl ) {
		if ( str_contains( $text_colour_hover_effective, 'gradient(' ) ) {
			$pf_bg_hover_paint = sgs_background_paint_decl(
				isset( $attributes['backgroundColourHover'] ) ? (string) $attributes['backgroundColourHover'] : '',
				isset( $attributes['backgroundColourHoverGradient'] ) ? (string) $attributes['backgroundColourHoverGradient'] : ''
			);
			if ( '' !== $pf_bg_hover_paint ) {
				$scoped_css[] = sgs_hover_state_rules( $root_sel, 'position:relative;isolation:isolate;background-image:none;background-color:transparent;' );
				$scoped_css[] = sgs_hover_state_rules( $root_sel, 'content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;' . $pf_bg_hover_paint . ';', ':focus-visible', '::after' );
			}
		}
		$scoped_css[] = sgs_hover_state_rules( $root_sel, $text_colour_hover_decl );
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $root_sel . ':hover', $text_colour_hover_effective );
}

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). Replaces the old WP-native
// supports.typography (fontSize + lineHeight only) with the framework's own
// helper, which also now offers fontWeight/fontStyle.
// Text indent follows core's convention: every paragraph that follows another
// paragraph inside the element.
$sgs_pf_typography_css = sgs_typography_css_rule( $attributes, '', '.' . $uid . '.wp-block-sgs-product-faq', '.' . $uid . '.wp-block-sgs-product-faq :is(p, .wp-block-sgs-text) + :is(p, .wp-block-sgs-text)' );
if ( '' !== $sgs_pf_typography_css ) {
	$scoped_css[] = $sgs_pf_typography_css;
}

// Question typography — prefix 'question'. The <summary> is rendered by the
// child sgs/product-faq-item, which declares no typography attributes; this
// parent control paints every question in this FAQ instance through a
// descendant selector on the uid class (specificity 0,3,0, above the
// stylesheet's base and open/hover rules).
$sgs_pf_question_css = sgs_typography_css_rule( $attributes, 'question', '.' . $uid . '.wp-block-sgs-product-faq .sgs-product-faq-item__question' );
if ( '' !== $sgs_pf_question_css ) {
	$scoped_css[] = $sgs_pf_question_css;
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
$padding_tab_val = sgs_box_object_longhands( $padding_tablet_obj, 'padding' );
$padding_mob_val = sgs_box_object_longhands( $padding_mobile_obj, 'padding' );
$margin_tab_val  = sgs_box_object_longhands( $margin_tablet_obj, 'margin' );
$margin_mob_val  = sgs_box_object_longhands( $margin_mobile_obj, 'margin' );

$tablet_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_decls[] = "{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_decls[] = "{$margin_tab_val}";
}
if ( $tablet_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "{$margin_mob_val}";
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

// Border (width, style, colour, gradient ring, radius at three tiers) through
// the shared assembler.
$border = sgs_border_element_decls(
	$attributes,
	'',
	$root_sel,
	array(
		'colour' => array(
			'base'     => 'borderColour',
			'gradient' => 'borderColourGradient',
		),
	)
);
// The base border rule comes before the tier rules so a tablet or mobile
// radius (same specificity) wins inside its media query.
if ( $border['base'] ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $border['base'] ) . ';}';
}
if ( $border['tablet'] ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $border['tablet'] ) . ';}}';
}
if ( $border['mobile'] ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $border['mobile'] ) . ';}}';
}
// ── Border rules: the gradient ring and the explicit `none` override. ──
$scoped_css = array_merge( $scoped_css, $border['rules'] );

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
