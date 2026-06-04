<?php
/**
 * Accordion — server-side render.
 *
 * WS-4 composite-mirror: wraps accordion items via SGS_Container_Wrapper (layout kind).
 * data-allow-multiple + data-default-open are passed via extra_attrs so view.js selectors
 * continue to work without modification.
 * Optionally outputs FAQ Schema JSON-LD.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (accordion items).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

$style         = $attributes['style'] ?? 'bordered';
$icon_position = $attributes['iconPosition'] ?? 'right';
$allow_multi   = ! empty( $attributes['allowMultiple'] );
$default_open  = (int) ( $attributes['defaultOpen'] ?? -1 );
$faq_schema    = ! empty( $attributes['faqSchema'] );

// ─── Inner HTML = $content (the accordion items) ────────────────────────────
// The accordion wrapper classes travel via extra_classes; the toggle attrs
// that view.js reads (data-allow-multiple / data-default-open) travel via
// extra_attrs so they are emitted on the OUTER wrapper by the helper.
$extra_classes = array(
	'sgs-accordion',
	'sgs-accordion--' . esc_attr( $style ),
	'sgs-accordion--icon-' . esc_attr( $icon_position ),
);

$extra_attrs = array(
	'data-allow-multiple' => $allow_multi ? 'true' : 'false',
	'data-default-open'   => (string) $default_open,
);

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $extra_classes,
		'extra_attrs'   => $extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped

// ─── FAQ Schema JSON-LD ───────────────────────────────────────────────────────
if ( $faq_schema && ! empty( $block->inner_blocks ) ) {
	$faq_items = array();

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

		$faq_items[] = array(
			'@type'          => 'Question',
			'name'           => $question,
			'acceptedAnswer' => array(
				'@type' => 'Answer',
				'text'  => $answer_html,
			),
		);
	}

	if ( ! empty( $faq_items ) ) {
		$schema = array(
			'@context'   => 'https://schema.org',
			'@type'      => 'FAQPage',
			'mainEntity' => $faq_items,
		);

		printf(
			'<script type="application/ld+json">%s</script>',
			wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES )
		);
	}
}
