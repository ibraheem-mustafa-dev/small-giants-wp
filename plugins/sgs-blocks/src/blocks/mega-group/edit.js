import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

/**
 * SGS Mega Group — block editor UI.
 *
 * A locked-content column: a heading + an icon-list of links. It has no
 * inspector controls at all — it carries no styling attributes of
 * its own, so there is nothing to configure here. Its parent sgs/mega-panel
 * paints every colour/shape decision via data-mega-style / data-mega-scheme
 * (see mega-panel/style.css), so switching the panel's style restyles every group in
 * the canvas uniformly.
 *
 * `templateLock:'insert'`, NOT `'all'`. WordPress's
 * own template-sync effect (`useInnerBlockTemplateSync`) re-runs on EVERY
 * editor mount whenever the lock is `'all'`/`'contentOnly'`, and silently
 * discards any stored child that doesn't line up with `TEMPLATE` by position.
 * `'insert'` still blocks a client from adding/removing/
 * reordering the heading+list structure but never triggers that destructive
 * resync, so existing content survives every load.
 *
 * @param {Object} props Block props.
 * @return {JSX.Element} The block editor UI.
 */
const TEMPLATE = [
	[ 'sgs/heading', { level: 'h3' } ],
	[ 'sgs/icon-list', { heading: '' } ],
];

export default function Edit() {
	const blockProps = useBlockProps( { className: 'sgs-mega-group' } );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
		templateLock: 'insert',
	} );

	return <div { ...innerBlocksProps } />;
}
