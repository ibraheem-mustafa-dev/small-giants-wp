import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block — render.php emits the `.sgs-mega-group` wrapper
 * (parent-paints-child; the parent sgs/mega-panel's scoped CSS styles this
 * class). Save persists ONLY the InnerBlocks marker, so nothing block-specific
 * is stored in post_content — which means a starter pattern (comment
 * delimiters + children, no wrapper div) validates cleanly, and a wrapper
 * change never strands stored content (no deprecations).
 *
 * @return {JSX.Element} The InnerBlocks content marker.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
