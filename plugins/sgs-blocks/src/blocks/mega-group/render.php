<?php
/**
 * Server-side render for sgs/mega-group — one column of a mega panel.
 *
 * A deliberately dumb wrapper (parent-paints-child): it emits ONLY the
 * `.sgs-mega-group` element carrying its InnerBlocks (a heading + an
 * sgs/icon-list). It has NO styling attributes of its own — every colour /
 * shape / arrangement decision is painted by the parent sgs/mega-panel's
 * scoped CSS, keyed on this class, so switching the panel's style/scheme
 * restyles every group uniformly.
 *
 * Optional whole-group link (`url`/`opensInNewTab`/`rel`, shared
 * `SgsLinkControl` object shape resolved via `sgs_link_attributes()` —
 * includes/helpers-link.php): when a url is set the wrapper renders as `<a>`
 * instead of `<div>`, carrying `.sgs-mega-group--link` alongside
 * `.sgs-mega-group` so style.css can paint the link-reset declarations
 * without a tag-qualified selector. An `<a>` must never contain another
 * `<a>`/`<button>` (invalid, and the browser closes the outer tag early on
 * the first nested one), so the check below falls back to the plain `<div>`
 * whenever the rendered InnerBlocks content already carries one — the group
 * still renders correctly, just without the whole-column link.
 *
 * Dynamic (not static) so that `save` persists only the InnerBlocks marker —
 * the starter patterns store comment delimiters + children with no wrapper
 * div, which then validate cleanly, and a wrapper change never strands
 * stored content (no deprecations).
 *
 * @var string   $content Rendered InnerBlocks (heading + icon-list).
 * @var array    $attributes Block attributes (url/opensInNewTab/rel).
 * @var \WP_Block $block   Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$sgs_mega_group_url = isset( $attributes['url'] ) ? trim( (string) $attributes['url'] ) : '';

// An `<a>` (or a `<button>`, which cannot legally nest inside one either) is
// interactive content already — nesting the group's own link around it would
// be invalid HTML and the child's link would win the click anyway. A plain
// case-insensitive substring check on the already-rendered InnerBlocks output
// is enough: every SGS block emits its own anchors/buttons literally in
// $content, never behind JS.
$sgs_mega_group_has_nested_link = $sgs_mega_group_url
	&& ( false !== stripos( $content, '<a ' ) || false !== stripos( $content, '<button' ) );

$sgs_mega_group_is_link = $sgs_mega_group_url && ! $sgs_mega_group_has_nested_link;

$sgs_mega_group_classes = 'sgs-mega-group';
if ( $sgs_mega_group_is_link ) {
	$sgs_mega_group_classes .= ' sgs-mega-group--link';
}

$sgs_mega_group_wrapper = get_block_wrapper_attributes( array( 'class' => $sgs_mega_group_classes ) );

if ( $sgs_mega_group_is_link ) {
	$sgs_mega_group_link_attrs = sgs_link_attributes(
		array(
			'url'           => $sgs_mega_group_url,
			'opensInNewTab' => ! empty( $attributes['opensInNewTab'] ),
			'rel'           => (string) ( $attributes['rel'] ?? '' ),
		)
	);

	// $content is do_blocks() output for the child blocks — already-safe
	// rendered block HTML; get_block_wrapper_attributes() and
	// sgs_link_attributes() both self-escape.
	printf(
		'<a %1$s%2$s>%3$s</a>',
		$sgs_mega_group_wrapper, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() self-escapes.
		$sgs_mega_group_link_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_link_attributes() self-escapes.
		$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks render output, already-safe block HTML.
	);
} else {
	// $content is do_blocks() output for the child blocks — already-safe
	// rendered block HTML; get_block_wrapper_attributes() self-escapes.
	printf(
		'<div %1$s>%2$s</div>',
		$sgs_mega_group_wrapper, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() self-escapes.
		$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks render output, already-safe block HTML.
	);
}
