<?php
/**
 * Server-side render for sgs/choice-flow.
 *
 * Spec 43 Phase 2 (§9) — the branching-quiz wizard root. Renders its
 * InnerBlocks (sgs/form-step children) as-is via $content; the block
 * declares no colour/typography/box attrs this phase (block.json's own
 * supports.sgs.elements.wrapper._note), so there is nothing for
 * SGS_Container_Wrapper to mirror yet and this stays block-private
 * (matches sgs/form-review's minimal shape, not sgs/form's wrapped one —
 * see the composition_role decision in scripts/seed-composition-roles.py).
 *
 * `data-wp-interactive="sgs/choice-flow"` on the wrapper is the load-bearing
 * hook `view.js`'s FLOW_SELECTOR depends on
 * (`[data-wp-interactive="sgs/choice-flow"]`) — view.js was built and
 * verified against this exact contract before this file existed; do not
 * rename or remove it without updating view.js in the same commit.
 *
 * `title` (FR-43-9 build note) is shown to the editor operator as a canvas
 * preview only (edit.js) and here as an accessible landmark label — real
 * content for assistive tech, never a general-purpose visible heading (the
 * attribute's own help text: "not necessarily displayed to visitors").
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Inner block content (the sgs/form-step children).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$flow_title = isset( $attributes['title'] ) ? (string) $attributes['title'] : '';

$wrapper_args = array(
	'class'               => 'sgs-choice-flow',
	'data-wp-interactive' => 'sgs/choice-flow',
);

if ( '' !== $flow_title ) {
	$wrapper_args['aria-label'] = $flow_title;
}

$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

echo '<div ' . $wrapper_attributes . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped markup.
echo '<div class="sgs-choice-flow__inner">';
echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks content is pre-rendered/sanitised by the block editor's own save pipeline.
echo '</div>';
echo '</div>';
