<?php
/**
 * Shared link/CTA render helper — turns the shared `SgsLinkControl`
 * component's object attr `{ url, opensInNewTab, rel }` into a safe `<a>`
 * attribute string.
 *
 * Companion to `src/components/SgsLinkControl.js` (Spec 35A Part I action
 * item 2). Mirrors the flat linkUrl/linkTarget/linkRel pattern hand-rolled
 * per-block today (see `sgs/icon`'s `render.php`), centralised for every new
 * consumer of the shared component.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-link-source.php';

/**
 * Resolve an `SgsLinkControl` object attr into a safe HTML attribute string
 * for an `<a>` tag (href + target + rel), ready to interpolate directly
 * after the tag name.
 *
 * WordPress silently coerces an out-of-shape stored value for an
 * `object`-typed block attribute to the block.json `default` at render
 * (`object-typed-attr-coerces-flat-to-default`, D328) — so this helper is
 * defensive about a missing/malformed `$link` array rather than assuming the
 * JS side always sent the full shape.
 *
 * Auto-adds `noopener` to `rel` when `opensInNewTab` is true — a
 * `target="_blank"` link without `rel="noopener"` lets the new page reach
 * back into `window.opener` (security; matches `sgs/icon`'s existing
 * `'_blank' === $link_target && '' === $effective_rel` auto-rel behaviour).
 *
 * `source` is the link's stored link source (the shared link popover's `<urlAttr>Source`
 * sibling, includes/helpers-link-source.php): '' keeps `url` as typed, anything else
 * resolves through sgs_resolve_link_source() with `url` as the fallback, and the `top`
 * source adds its data attribute.
 *
 * @param array|null $link Link attribute value: { url, opensInNewTab, rel, source }.
 * @return string HTML attribute string (leading space), or '' when no url.
 */
function sgs_link_attributes( ?array $link ): string {
	$url    = isset( $link['url'] ) ? trim( (string) $link['url'] ) : '';
	$source = isset( $link['source'] ) && is_string( $link['source'] ) ? $link['source'] : '';
	if ( '' !== $source ) {
		$url = trim( sgs_link_source_href( $source, $url ) );
	}
	if ( '' === $url ) {
		return '';
	}

	$opens_new_tab = ! empty( $link['opensInNewTab'] );

	$rel_tokens = array_filter( explode( ' ', (string) ( $link['rel'] ?? '' ) ) );
	// Sanitise to the known-safe rel token vocabulary — never trust a stored
	// value verbatim into an attribute even though it is also esc_attr()'d
	// below (defence in depth; keeps unexpected tokens out entirely).
	$allowed_rel_tokens = array( 'nofollow', 'sponsored', 'noopener', 'noreferrer', 'ugc' );
	$rel_tokens         = array_values( array_intersect( $rel_tokens, $allowed_rel_tokens ) );

	if ( $opens_new_tab && ! in_array( 'noopener', $rel_tokens, true ) ) {
		$rel_tokens[] = 'noopener';
	}

	$attrs = ' href="' . esc_url( $url ) . '"';

	if ( $opens_new_tab ) {
		$attrs .= ' target="_blank"';
	}

	if ( ! empty( $rel_tokens ) ) {
		$attrs .= ' rel="' . esc_attr( implode( ' ', array_unique( $rel_tokens ) ) ) . '"';
	}

	return $attrs . sgs_link_source_attrs_html( $source );
}
