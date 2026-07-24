import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

/**
 * SGS Mega Aside — block editor UI.
 *
 * A locked-content side panel: media + heading + text + a call-to-action
 * button. It has no inspector controls at all (CF-10) — it carries no
 * styling attributes of its own, so there is nothing to configure here. Its
 * parent sgs/mega-panel paints the aside's width and separator via
 * data-mega-style / data-mega-scheme (see editor.css), so switching the
 * panel restyles the aside in the canvas uniformly.
 *
 * @return {JSX.Element} The block editor UI.
 */
const TEMPLATE = [
	[ 'sgs/media', {} ],
	[ 'sgs/heading', { level: 3 } ],
	[ 'sgs/text', {} ],
	[ 'sgs/button', {} ],
];

export default function Edit() {
	const blockProps = useBlockProps( { className: 'sgs-mega-aside' } );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
		templateLock: 'all',
	} );

	return <div { ...innerBlocksProps } />;
}
