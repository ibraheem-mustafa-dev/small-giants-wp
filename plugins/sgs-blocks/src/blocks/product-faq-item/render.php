<?php
/**
 * Product FAQ Item — server-side render.
 *
 * Accessible disclosure pattern: native <details>/<summary> — works without
 * JavaScript. aria-expanded on <summary> aids legacy screen readers that do
 * not announce the native open state. The visible question/answer is real
 * on-page content; the parent block reads the same attributes/inner blocks
 * to build the FAQPage JSON-LD, so structured data always mirrors what the
 * visitor sees (anti-cloaking).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (the answer).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$question = $attributes['question'] ?? '';
$is_open  = ! empty( $attributes['isOpen'] );
$icon_pos = $block->context['sgs/productFaqIconPosition'] ?? 'right';

// Skip empty items entirely — no question means nothing to disclose.
if ( '' === trim( wp_strip_all_tags( $question ) ) && '' === trim( $content ) ) {
	return;
}

$chevron_svg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

$icon_html = sprintf(
	'<span class="sgs-product-faq-item__chevron" aria-hidden="true">%s</span>',
	$chevron_svg
);

$aria_expanded = $is_open ? 'true' : 'false';

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => 'sgs-product-faq-item',
	)
);

?>
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
