import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block — render.php owns the frontend output (variant + colour
 * scheme styling, data-mega-style / data-mega-scheme attrs). Save persists
 * the InnerBlocks content (mega-group / mega-aside children) to post_content.
 *
 * @return {JSX.Element} The saved InnerBlocks content.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
