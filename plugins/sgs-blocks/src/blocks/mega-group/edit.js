import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

/**
 * SGS Mega Group — block editor UI.
 *
 * A locked-content column: a heading + an icon-list of links. It has no
 * inspector controls at all (CF-10) — it carries no styling attributes of
 * its own, so there is nothing to configure here. Its parent sgs/mega-panel
 * paints every colour/shape decision via data-mega-style / data-mega-scheme
 * (see editor.css), so switching the panel's style restyles every group in
 * the canvas uniformly.
 *
 * @param {Object} props Block props.
 * @return {JSX.Element} The block editor UI.
 */
const TEMPLATE = [
	[ 'sgs/heading', { level: 3 } ],
	[ 'sgs/icon-list', { heading: '' } ],
];

export default function Edit() {
	const blockProps = useBlockProps( { className: 'sgs-mega-group' } );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
		templateLock: 'all',
	} );

	return <div { ...innerBlocksProps } />;
}
