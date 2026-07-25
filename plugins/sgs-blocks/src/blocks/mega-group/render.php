<?php
/**
 * Server-side render for sgs/mega-group — one column of a mega panel.
 *
 * A deliberately dumb wrapper (CF-10, parent-paints-child): it emits ONLY the
 * `.sgs-mega-group` element carrying its InnerBlocks (a heading + an
 * sgs/icon-list). It has NO styling attributes of its own — every colour /
 * shape / arrangement decision is painted by the parent sgs/mega-panel's
 * scoped CSS, keyed on this class, so switching the panel's style/scheme
 * restyles every group uniformly.
 *
 * Dynamic (not static) so that `save` persists only the InnerBlocks marker —
 * the starter patterns store comment delimiters + children with no wrapper
 * div, which then validate cleanly, and a future wrapper change never strands
 * stored content (no deprecations, D270).
 *
 * @var string   $content Rendered InnerBlocks (heading + icon-list).
 * @var array    $attributes Block attributes (none of its own).
 * @var \WP_Block $block   Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$sgs_mega_group_wrapper = get_block_wrapper_attributes( array( 'class' => 'sgs-mega-group' ) );

// $content is do_blocks() output for the child blocks — already-safe rendered
// block HTML; get_block_wrapper_attributes() escapes the wrapper.
printf(
	'<div %1$s>%2$s</div>',
	$sgs_mega_group_wrapper, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() self-escapes.
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks render output, already-safe block HTML.
);
