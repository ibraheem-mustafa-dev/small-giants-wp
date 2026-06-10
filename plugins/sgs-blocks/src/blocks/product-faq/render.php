<?php
/**
 * Product FAQ — server-side render.
 *
 * Renders an accessible disclosure-pattern FAQ list (content kind).
 * Registers structured FAQ data into a page-scoped collector so exactly ONE
 * FAQPage JSON-LD script tag is emitted via wp_footer — even when multiple
 * sgs/product-faq block instances appear on the same page (spec: one FAQPage
 * per page, all Q&A in a single mainEntity array, sibling of Product JSON-LD).
 *
 * Strategy chosen: wp_footer hook over a per-block printf().
 * Reason: the FAQ block is a content block that may appear multiple times
 * (e.g. general FAQ + shipping FAQ on the same page). A footer hook lets us
 * collect every item from every instance, deduplicate questions, and emit
 * exactly one <script> tag — the correct schema structure. A static-flag
 * approach with "first block wins" would silently drop items from later
 * instances, which violates the spec requirement of one merged mainEntity array.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (faq items).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/product-faq-schema.php';

$heading       = $attributes['heading'] ?? 'Frequently Asked Questions';
$heading_level = (int) ( $attributes['headingLevel'] ?? 2 );
// Note: iconPosition is consumed by the child block via providesContext.

// Clamp heading level to permitted range 2–4.
$heading_level = max( 2, min( 4, $heading_level ) );
$heading_tag   = 'h' . $heading_level;

// ─── Collect FAQ items for JSON-LD ─────────────────────────────────────────
// Page-scoped global collector — keyed by question text to deduplicate.
// Uses the WP global namespace via a safely-namespaced key.
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

// ─── Register the wp_footer hook exactly once per page load ─────────────────
if ( ! has_action( 'wp_footer', 'sgs_emit_faq_page_jsonld' ) ) {
	add_action( 'wp_footer', 'sgs_emit_faq_page_jsonld', 90 );
}

// ─── Build HTML ─────────────────────────────────────────────────────────────
$heading_html = sprintf(
	'<%1$s class="sgs-product-faq__heading">%2$s</%1$s>',
	esc_attr( $heading_tag ),
	esc_html( $heading )
);

$inner_html = $heading_html
	. '<div class="sgs-product-faq__items">'
	. $content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Inner blocks are already escaped.
	. '</div>';

$extra_classes = array( 'sgs-product-faq' );

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'content',
	array(
		'tag'           => 'section',
		'extra_classes' => $extra_classes,
		'extra_attrs'   => array( 'aria-label' => wp_strip_all_tags( $heading ) ),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
