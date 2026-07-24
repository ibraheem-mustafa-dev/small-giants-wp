import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

/**
 * Static save — persists this block's own wrapper markup + its InnerBlocks
 * content to post_content (CF-10, parent-paints-child). This block carries
 * NO styling attributes of its own: the parent sgs/mega-panel paints the
 * aside's width + separator via its own scoped CSS, so the markup here is
 * deliberately bare — a stable BEM class and nothing else.
 *
 * @return {JSX.Element} The saved block markup.
 */
export default function Save() {
	const blockProps = useBlockProps.save( { className: 'sgs-mega-aside' } );
	const innerBlocksProps = useInnerBlocksProps.save( blockProps );

	return <div { ...innerBlocksProps } />;
}
