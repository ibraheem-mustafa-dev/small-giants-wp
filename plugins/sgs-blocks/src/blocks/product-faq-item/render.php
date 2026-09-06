<?php
/**
 * Product FAQ Item — server-side render.
 *
 * Accessible disclosure pattern: native <details>/<summary> — works without
 * JavaScript. aria-expanded on <summary> aids legacy screen readers that do
 * not announce the native open state. The visible question/answer is real
 * on-page content; the parent block reads the same attributes/inner blocks
 * to build the FAQPage JSON-LD, so structured data always mirrors what the
 * visitor sees (anti-cloaking). UNCHANGED by this migration.
 *
 * BLOCK-PRIVATE, NO-WRAPPER: this block never used SGS_Container_Wrapper —
 * it already called get_block_wrapper_attributes() directly on the
 * <details> root.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check. Border is passed WHOLESALE (radius/width/colour/style — this
 * block declares full native border support, not just radius), so no
 * sub-property is silently dropped by the skip-serialisation flip.
 *
 * Dead `contentWidth`/`maxWidth` attrs REMOVED from block.json (2026-07-10):
 * neither was ever read here or in edit.js — no editor control existed for
 * them either.
 *
 * @since 2026-07-10  No-inline migration: WP color/border supports
 *                    skip-serialised + scoped output; dead contentWidth/
 *                    maxWidth attrs removed.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (the answer).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$question = $attributes['question'] ?? '';
$is_open  = ! empty( $attributes['isOpen'] );
$icon_pos = $block->context['sgs/productFaqIconPosition'] ?? 'right';

// Skip empty items entirely — no question means nothing to disclose.
if ( '' === trim( wp_strip_all_tags( $question ) ) && '' === trim( $content ) ) {
	return;
}

// ---------------------------------------------------------------------------
// 1. WP-native style groups (skip-serialised in block.json → NOT auto-inlined
// by get_block_wrapper_attributes()). Border is passed wholesale (matches
// sgs/brand-strip — full native width/style/color/radius support).
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

$native_border = ( isset( $attributes['style']['border'] ) && is_array( $attributes['style']['border'] ) ) ? $attributes['style']['border'] : array();

// ---------------------------------------------------------------------------
// 2. Resolve scope id. Uid is a CLASS — this block declares no anchor
// support, but a class uid keeps the pattern consistent with every other
// migrated block (contract §B3).
// ---------------------------------------------------------------------------

$uid      = 'sgs-product-faq-item-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-product-faq-item';

$scoped_css = array();

$base_style_engine_args = array();

$sgs_pfi_fill_css = sgs_fill_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $sgs_pfi_fill_css ) {
	$scoped_css[] = $sgs_pfi_fill_css;
}

if ( ! empty( $native_border ) ) {
	$base_style_engine_args['border'] = $native_border;
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

// ---------------------------------------------------------------------------
// 3. Build HTML. UNCHANGED disclosure markup.
// ---------------------------------------------------------------------------

$chevron_svg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

$icon_html = sprintf(
	'<span class="sgs-product-faq-item__chevron" aria-hidden="true">%s</span>',
	$chevron_svg
);

$aria_expanded = $is_open ? 'true' : 'false';

// ---------------------------------------------------------------------------
// 4. Build the root element's classes + attributes. NO 'style' key is
// passed — the root carries ZERO inline property declarations (contract §A);
// everything is in the scoped <style> above. Preset colour classes re-added
// manually (skip-serialisation suppresses WP's automatic class addition too,
// not just the inline style).
// ---------------------------------------------------------------------------

$root_classes = array( 'sgs-product-faq-item', $uid );
if ( '' !== $preset_text_slug ) {
	$root_classes[] = 'has-text-color';
	$root_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$root_classes[] = 'has-background';
	$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $root_classes ),
	)
);

?>
<?php
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
$radius_tiers = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$scoped_css[] = $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}
?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</style>
<?php endif; ?>
<details <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-escaped. ?><?php echo $is_open ? ' open' : ''; ?>>
	<summary class="sgs-product-faq-item__question" aria-expanded="<?php echo esc_attr( $aria_expanded ); ?>">
		<?php if ( 'left' === $icon_pos ) : ?>
			<?php echo $icon_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG built above. ?>
		<?php endif; ?>
		<span class="sgs-product-faq-item__question-text"><?php echo wp_kses_post( $question ); ?></span>
		<?php if ( 'right' === $icon_pos ) : ?>
			<?php echo $icon_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG built above. ?>
		<?php endif; ?>
	</summary>
	<div class="sgs-product-faq-item__answer">
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Inner blocks are already escaped. ?>
	</div>
</details>
