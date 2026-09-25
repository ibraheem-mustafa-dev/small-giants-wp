import { __ } from '@wordpress/i18n';
import { useBlockProps, useInnerBlocksProps, InspectorControls, useBlockEditContext } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { PanelBody, Notice } from '@wordpress/components';
import { LinkPopoverField } from '../../components';

/**
 * SGS Mega Group — block editor UI.
 *
 * A locked-content column: a heading + an icon-list of links, plus one
 * optional whole-group link (url/opensInNewTab/rel — SgsLinkControl object
 * shape, resolved at render via `sgs_link_attributes()`). Every other style
 * decision is painted by the parent sgs/mega-panel via data-mega-style /
 * data-mega-scheme (see mega-panel/style.css), so switching the panel's
 * style restyles every group in the canvas uniformly — this block has no
 * paint controls of its own.
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

// An `<a>`/`<button>` cannot legally nest inside another `<a>` — render.php
// falls back to a plain `<div>` when the rendered content already carries
// one (checked there via the literal markup string). The editor has no
// rendered-HTML string to check against, so this walks the same InnerBlocks
// tree render.php will serialise and asks the same question structurally:
// does any descendant block render its own `<a>`/`<button>`? `sgs/button`
// and `core/button(s)` always do; `sgs/icon-list` only does per item that
// has a `url` set (mirrors icon-list/render.php's own `$item_url` check).
function blockTreeHasLinkOrButton( blocks ) {
	return blocks.some( ( block ) => {
		if ( 'sgs/button' === block.name || 'core/button' === block.name || 'core/buttons' === block.name ) {
			return true;
		}
		if ( 'sgs/icon-list' === block.name ) {
			const items = Array.isArray( block.attributes?.items ) ? block.attributes.items : [];
			if ( items.some( ( item ) => item && '' !== ( item.url || '' ) ) ) {
				return true;
			}
		}
		if ( block.innerBlocks && block.innerBlocks.length && blockTreeHasLinkOrButton( block.innerBlocks ) ) {
			return true;
		}
		return false;
	} );
}

export default function Edit( { attributes, setAttributes } ) {
	const { url, opensInNewTab, rel } = attributes;
	const { clientId } = useBlockEditContext();

	const hasNestedLinkOrButton = useSelect(
		( select ) => {
			const innerBlocks = select( 'core/block-editor' ).getBlocks( clientId );
			return blockTreeHasLinkOrButton( innerBlocks );
		},
		[ clientId ]
	);

	const linkIgnored = !! url && hasNestedLinkOrButton;

	const blockProps = useBlockProps( {
		className: [ 'sgs-mega-group', url && ! linkIgnored && 'sgs-mega-group--link' ].filter( Boolean ).join( ' ' ),
	} );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
		templateLock: 'insert',
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Group link', 'sgs-blocks' ) } initialOpen={ false }>
					<LinkPopoverField
						label={ __( 'Link', 'sgs-blocks' ) }
						help={ __( 'Optional — makes the whole card (heading and text) one link to a page. Ignored while the card contains its own link or button.', 'sgs-blocks' ) }
						value={ {
							url: url || '',
							linkTarget: opensInNewTab ? '_blank' : '_self',
							rel: rel || '',
						} }
						targetMode="boolean"
						onChange={ ( next ) => {
							const patch = {};
							if ( undefined !== next.url ) patch.url = next.url;
							if ( undefined !== next.linkTarget ) patch.opensInNewTab = '_blank' === next.linkTarget;
							if ( undefined !== next.rel ) patch.rel = next.rel;
							setAttributes( patch );
						} }
					/>
					{ linkIgnored && (
						<Notice status="warning" isDismissible={ false }>
							{ __( 'This card already contains its own link or button, so the group link above is ignored.', 'sgs-blocks' ) }
						</Notice>
					) }
				</PanelBody>
			</InspectorControls>
			<div { ...innerBlocksProps } />
		</>
	);
}
