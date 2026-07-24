import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

/**
 * Static save — persists this block's own wrapper markup + its InnerBlocks
 * content to post_content (CF-10, parent-paints-child). This block carries
 * NO styling attributes of its own: every colour/shape decision is painted
 * by the parent sgs/mega-panel's scoped CSS via data-mega-style /
 * data-mega-scheme, so the markup here is deliberately bare — a stable BEM
 * class and nothing else.
 *
 * @return {JSX.Element} The saved block markup.
 */
export default function Save() {
	const blockProps = useBlockProps.save( { className: 'sgs-mega-group' } );
	const innerBlocksProps = useInnerBlocksProps.save( blockProps );

	return <div { ...innerBlocksProps } />;
}
