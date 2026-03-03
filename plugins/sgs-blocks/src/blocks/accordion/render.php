<?php
/**
 * Accordion — server-side render.
 *
 * Wraps accordion items and conditionally outputs FAQ Schema JSON-LD.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (accordion items).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$style         = $attributes['style'] ?? 'bordered';
$icon_position = $attributes['iconPosition'] ?? 'right';
$allow_multi   = ! empty( $attributes['allowMultiple'] );
$default_open  = (int) ( $attributes['defaultOpen'] ?? -1 );
$faq_schema    = ! empty( $attributes['faqSchema'] );

$classes = [
	'sgs-accordion',
	'sgs-accordion--' . esc_attr( $style ),
	'sgs-accordion--icon-' . esc_attr( $icon_position ),
];

$block_id = 'sgs-acc-' . substr( md5( serialize( $attributes ) ), 0, 8 );

$wrapper = get_block_wrapper_attributes( [
	'class'                  => implode( ' ', $classes ),
	'data-allow-multiple'    => $allow_multi ? 'true' : 'false',
	'data-default-open'      => (string) $default_open,
	'data-wp-interactive'    => 'sgs/accordion',
	'data-wp-context'        => wp_json_encode( [ 'allowMultiple' => $allow_multi, 'accordionId' => $block_id ] ),
] );

// Output the accordion wrapper with rendered inner blocks.
printf(
	'<div %s>%s</div>',
	$wrapper,
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);

// ─── FAQ Schema JSON-LD ───
if ( $faq_schema && ! empty( $block->inner_blocks ) ) {
	$faq_items = [];

	foreach ( $block->inner_blocks as $inner_block ) {
		if ( 'sgs/accordion-item' !== $inner_block->name ) {
			continue;
		}

		$question = isset( $inner_block->attributes['title'] )
			? wp_strip_all_tags( $inner_block->attributes['title'] )
			: '';

		if ( empty( $question ) ) {
			continue;
		}

		// Render the item's inner blocks to get the answer HTML.
		$answer_html = '';
		if ( ! empty( $inner_block->inner_blocks ) ) {
			foreach ( $inner_block->inner_blocks as $answer_block ) {
				$answer_html .= ( new WP_Block( $answer_block->parsed_block ) )->render();
			}
		}

		$answer_html = trim( $answer_html );
		if ( empty( $answer_html ) ) {
			continue;
		}

		$faq_items[] = [
			'@type'          => 'Question',
			'name'           => $question,
			'acceptedAnswer' => [
				'@type' => 'Answer',
				'text'  => $answer_html,
			],
		];
	}

	if ( ! empty( $faq_items ) ) {
		$schema = [
			'@context'   => 'https://schema.org',
			'@type'      => 'FAQPage',
			'mainEntity' => $faq_items,
		];

		printf(
			'<script type="application/ld+json">%s</script>',
			wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES )
		);
	}
}
