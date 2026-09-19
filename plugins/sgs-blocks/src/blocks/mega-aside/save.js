import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block — render.php emits the `.sgs-mega-aside` wrapper
 * (parent-paints-child; the parent sgs/mega-panel paints the aside's width +
 * separator via its own scoped CSS). Save persists ONLY the InnerBlocks
 * marker, so a starter pattern (comment delimiters + children, no wrapper
 * div) validates cleanly and a wrapper change never strands stored
 * content (no deprecations).
 *
 * @return {JSX.Element} The InnerBlocks content marker.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
