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
 * NO-INLINE, BLOCK-PRIVATE, NO-WRAPPER (per-block no-inline migration
 * contract §A/§B/§B3, 2026-07-10): this block never used
 * SGS_Container_Wrapper — it already called get_block_wrapper_attributes()
 * directly on the <details> root. The <details> root carries ZERO inline CSS
 * property declarations — WP colour + border supports declare
 * `__experimentalSkipSerialization` in block.json so
 * get_block_wrapper_attributes() no longer auto-inlines them; every
 * declaration is emitted into the block's OWN scoped `.{uid}` <style> tag via
 * `wp_style_engine_get_styles()` (matches sgs/quote + sgs/brand-strip).
 * Border is passed WHOLESALE (radius/width/colour/style — this block declares
 * full native border support, not just radius), so no sub-property is
 * silently dropped by the skip-serialisation flip.
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

$style_color_text     = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg       = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$style_color_gradient = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
$preset_text_slug     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$native_border = ( isset( $attributes['style']['border'] ) && is_array( $attributes['style']['border'] ) ) ? $attributes['style']['border'] : array();

// ---------------------------------------------------------------------------
// 2. Resolve scope id. Uid is a CLASS — this block declares no anchor
// support, but a class uid keeps the pattern consistent with every other
// migrated block (contract §B3).
// ---------------------------------------------------------------------------

$uid      = 'sgs-product-faq-item-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-product-faq-item';

$scoped_css = array();

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();

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
