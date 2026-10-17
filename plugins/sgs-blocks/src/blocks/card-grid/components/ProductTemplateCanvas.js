/**
 * Card Grid — products-mode canvas: every product the grid will show, each rendered as the grid's one template
 * sgs/product-card under that product's block context (the core Query Loop post-template pattern).
 *
 * The active product shows the real, editable template card; every other product shows a read-only preview of the
 * same template. Clicking a preview makes that product the active one.
 */

import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { useEffect, useMemo, useState, memo } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Spinner } from '@wordpress/components';
import {
	BlockContextProvider,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useBlockPreview } from '../../../components/primitives';
import {
	TEMPLATE_CARD,
	templateSeed,
	itemContext,
	previewBlocks,
} from '../template-preview';

const ALLOWED = [ TEMPLATE_CARD ];

/**
 * The editable template card (the only place the grid's inner blocks are mounted).
 * @param root0
 * @param root0.source
 */
function TemplateCard( { source } ) {
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-card-grid__template' },
		{
			template: templateSeed( source ),
			templateLock: 'all',
			allowedBlocks: ALLOWED,
			renderAppender: false,
		}
	);
	return <div { ...innerBlocksProps } />;
}

/**
 * One product's read-only preview of the template card.
 * @param root0
 * @param root0.blocks
 * @param root0.item
 * @param root0.isHidden
 * @param root0.onActivate
 */
function TemplatePreview( { blocks, item, forwarded, isHidden, onActivate } ) {
	const itemBlocks = useMemo(
		() => previewBlocks( blocks, item, forwarded ),
		[ blocks, item, forwarded ]
	);
	const previewProps = useBlockPreview( {
		blocks: itemBlocks,
		props: { className: 'sgs-card-grid__template-preview' },
	} );
	return (
		<div
			{ ...previewProps }
			tabIndex={ 0 }
			role="button"
			aria-label={ __(
				'Edit the card design on this product',
				'sgs-blocks'
			) }
			onClick={ onActivate }
			onKeyDown={ ( event ) =>
				( 'Enter' === event.key || ' ' === event.key ) && onActivate()
			}
			hidden={ isHidden }
		/>
	);
}
const MemoTemplatePreview = memo( TemplatePreview );

/**
 * The grid's results, from the same server queries the page uses.
 *
 * @param {Object} attributes The grid's attributes.
 * @return {{items: Array|null, error: string}} Null items while loading.
 */
function useGridItems( attributes ) {
	const [ state, setState ] = useState( { items: null, error: '' } );
	const key = JSON.stringify( attributes );
	useEffect( () => {
		let live = true;
		setState( ( prev ) => ( { ...prev, items: null } ) );
		apiFetch( {
			path: '/sgs/v1/card-grid-items',
			method: 'POST',
			data: { attributes },
		} )
			.then(
				( res ) =>
					live &&
					setState( {
						items: Array.isArray( res?.items ) ? res.items : [],
						error: '',
					} )
			)
			.catch(
				( err ) =>
					live &&
					setState( {
						items: [],
						error:
							err?.message ||
							__( 'Products could not be loaded.', 'sgs-blocks' ),
					} )
			);
		return () => {
			live = false;
		};
		// The key is the attributes' value; the object itself changes identity every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ key ] );
	return state;
}

export default function ProductTemplateCanvas( {
	attributes,
	clientId,
	blockProps,
	gridStyle,
	forwarded,
} ) {
	const { source } = attributes;
	const { items, error } = useGridItems( attributes );
	const [ activeId, setActiveId ] = useState( null );
	const blocks = useSelect(
		( select ) => select( blockEditorStore ).getBlocks( clientId ),
		[ clientId ]
	);

	const list = items || [];
	const active = list.some( ( item ) => item.id === activeId )
		? activeId
		: list[ 0 ]?.id;

	return (
		<div { ...blockProps }>
			<div
				className="sgs-card-grid sgs-card-grid--card"
				style={ gridStyle }
			>
				{ null === items && <Spinner /> }
				{ null !== items && 0 === list.length && (
					<>
						<p className="sgs-card-grid__empty-message">
							{ error ||
								__(
									'No products match yet. The card below is the design every product will use.',
									'sgs-blocks'
								) }
						</p>
						<TemplateCard source={ source } />
					</>
				) }
				{ list.map( ( item ) => (
					<BlockContextProvider
						key={ item.id }
						value={ itemContext( item ) }
					>
						{ item.id === active && (
							<TemplateCard source={ source } />
						) }
						<MemoTemplatePreview
							blocks={ blocks }
							forwarded={ forwarded }
							item={ item }
							isHidden={ item.id === active }
							onActivate={ () => setActiveId( item.id ) }
						/>
					</BlockContextProvider>
				) ) }
			</div>
		</div>
	);
}
