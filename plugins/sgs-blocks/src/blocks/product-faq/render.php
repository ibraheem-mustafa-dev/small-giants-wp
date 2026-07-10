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
 * NO-INLINE, BLOCK-PRIVATE, NO-WRAPPER (per-block no-inline migration contract
 * §A/§B/§B3, 2026-07-10): sgs/product-faq is CONTENT-kind (box + width only)
 * — it never used SGS_Container_Wrapper's grid/section/background/overlay
 * machinery (content-kind gates gap/band-tier CSS off entirely — see
 * class-sgs-container-wrapper.php), so the wrapper was dead weight for this
 * block. Converter CSS routing keys on block_attributes by block_slug
 * (block.json-derived), not on wraps_block/container_kind, so dropping the
 * wrapper does not affect cloning (same reasoning as sgs/quote, D294).
 *
 * The `<section>` IS the block root, built via get_block_wrapper_attributes().
 * The rendered subtree carries ZERO inline CSS property declarations — every
 * declaration (WP color/typography/spacing/border supports) is emitted into
 * the block's OWN scoped `.{uid}` <style> tag via the stable core style-engine
 * API `wp_style_engine_get_styles()`. WP styling supports all declare
 * `__experimentalSkipSerialization` in block.json so get_block_wrapper_attributes()
 * never auto-inlines them.
 *
 * BOX-GROUP: base padding/margin/border-radius/border-width/border-color/
 * border-style = WP-native style.spacing / style.border objects (emitted
 * scoped, base only — no tiers, matches the pre-existing no-tier contract for
 * this block's border). Tablet/Mobile tiers exist for padding/margin only
 * (paddingTablet/paddingMobile/marginTablet/marginMobile object attrs, scoped
 * at 1023px/767px breakpoints).
 *
 * maxWidth/contentWidth (kept-scalar width family, base only — no tiers,
 * matches the pre-existing attrs) are reproduced scoped on the root: maxWidth
 * → max-width + margin-inline:auto; contentWidth → width. This is a
 * simplification of the old wrapper's two-layer (outer/band __inner) model —
 * the wrapper only emitted a separate __inner band div when contentWidth (or
 * band padding/background, never used by this block) was set; with no grid
 * and no band padding/background on this block, folding both onto the single
 * root selector produces the same effective width cap.
 *
 * gap/gapTablet/gapMobile were REMOVED (D-migration, 2026-07-10): the shared
 * wrapper gates gap CSS to section/layout kinds only (never content kind — see
 * class-sgs-container-wrapper.php `$is_section || $is_layout` gate on every
 * gap emission path), so these 3 attrs were dead on this block since the day
 * SGS_Container_Wrapper('content') was wired up. No editor control ever
 * existed for them either (ContainerWrapperControls kind="content" only
 * renders WidthPanel + spacing — no LayoutPanel/gap for content kind).
 *
 * Strategy chosen for the FAQPage JSON-LD collector: wp_footer hook over a
 * per-block printf(). Reason: the FAQ block is a content block that may
 * appear multiple times (e.g. general FAQ + shipping FAQ on the same page). A
 * footer hook lets us collect every item from every instance, deduplicate
 * questions, and emit exactly one <script> tag — the correct schema
 * structure. A static-flag approach with "first block wins" would silently
 * drop items from later instances, which violates the spec requirement of one
 * merged mainEntity array. UNCHANGED by this migration.
 *
 * @since 2026-07-10  No-inline migration: WP supports skip-serialised +
 *                    scoped output; SGS_Container_Wrapper dropped (content-
 *                    kind, box+width only); paddingTablet/paddingMobile/
 *                    marginTablet/marginMobile tier attrs added; dead
 *                    gap/gapTablet/gapMobile attrs removed.
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

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 2. Extract content attributes.
// ---------------------------------------------------------------------------

$heading       = $attributes['heading'] ?? 'Frequently Asked Questions';
$heading_level = (int) ( $attributes['headingLevel'] ?? 2 );
// Note: iconPosition is consumed by the child block via providesContext.

// Clamp heading level to permitted range 2–4.
$heading_level = max( 2, min( 4, $heading_level ) );
$heading_tag   = 'h' . $heading_level;

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

$style_color_text     = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg       = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$style_color_gradient = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
$preset_text_slug     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$style_font_size   = isset( $attributes['style']['typography']['fontSize'] ) ? (string) $attributes['style']['typography']['fontSize'] : '';
$style_line_height = isset( $attributes['style']['typography']['lineHeight'] ) ? (string) $attributes['style']['typography']['lineHeight'] : '';

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
$max_width     = $attributes['maxWidth'] ?? '';
$content_width = $attributes['contentWidth'] ?? '';

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
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
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

	if ( ! empty( $native_border ) ) {
		$base_style_engine_args['border'] = $native_border;
	}

	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( '' !== $style_color_gradient ) {
		$color_args['gradient'] = $style_color_gradient;
	}
	if ( ! empty( $color_args ) ) {
		$base_style_engine_args['color'] = $color_args;
	}

	$typography_args = array();
	if ( '' !== $style_font_size ) {
		$typography_args['fontSize'] = $style_font_size;
	}
	if ( '' !== $style_line_height ) {
		$typography_args['lineHeight'] = $style_line_height;
	}
	if ( ! empty( $typography_args ) ) {
		$base_style_engine_args['typography'] = $typography_args;
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
}

// --- Width (base only — outer maxWidth, content band width). ---
if ( $max_width ) {
	$mw_safe = $sgs_css_length( $max_width );
	if ( '' !== $mw_safe ) {
		$scoped_css[] = "{$root_sel}{max-width:{$mw_safe};margin-inline:auto;}";
	}
}
if ( $content_width ) {
	$cw_safe = $sgs_css_length( $content_width );
	if ( '' !== $cw_safe ) {
		$scoped_css[] = "{$root_sel}{width:{$cw_safe};}";
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B/§B2: tablet
// max-width:1023px, mobile max-width:767px). ---
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

$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );

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
// $scoped_css is pre-sanitised ($sgs_css_length / wp_style_engine_get_styles),
// so no un-sanitised value survives to here.
// ---------------------------------------------------------------------------

?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</style>
<?php endif; ?>
<section <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo $inner_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></section>
