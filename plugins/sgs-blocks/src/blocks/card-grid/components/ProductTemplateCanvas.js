/**
 * Card Grid — products-mode canvas: every product the grid will show, each rendered as the grid's one template
 * sgs/product-card under that product's block context (the core Query Loop post-template pattern), then the grid's
 * pagination as the page prints it (inert buttons here) or, when nothing matches, the empty-state message the page prints.
 *
 * The active product shows the real, editable template card; every other product shows a read-only preview of the same
 * template, marked as the template's mirror so the template's motion reaches it (`extensions/motion/canvas/mirrors.js`).
 * Clicking a preview makes that product the active one. With no product, the template is drawn once as a sample
 * (`data-sgs-sample`), which the page never prints. The edit component keeps the one template block in place
 * (`template-preview.js::templateBlocksFor`).
 */

import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { RawHTML, useEffect, useMemo, useState, memo } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Spinner } from '@wordpress/components';
import {
	BlockContextProvider,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useBlockPreview } from '../../../components/primitives';
import { MIRROR_ATTR } from '../../extensions/motion/canvas/mirrors';
import { TEMPLATE_CARD, itemContext, previewBlocks } from '../template-preview';

const ALLOWED = [ TEMPLATE_CARD ];

/**
 * The editable template card (the only place the grid's inner blocks are mounted).
 *
 * @param {Object}  props
 * @param {boolean} props.sample Drawn as the empty-state sample, which the page never prints.
 */
function TemplateCard( { sample = false } ) {
	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'sgs-card-grid__template',
			...( sample ? { 'data-sgs-sample': '' } : {} ),
		},
		{
			templateLock: 'all',
			allowedBlocks: ALLOWED,
			renderAppender: false,
		}
	);
	return <div { ...innerBlocksProps } />;
}

/**
 * One product's read-only preview of the template card.
 *
 * @param {Object}   props
 * @param {Array}    props.blocks     The grid's inner blocks.
 * @param {Object}   props.item       The product.
 * @param {boolean}  props.isHidden   The product is the active one (the editable card stands in its place).
 * @param {Function} props.onActivate Makes this product the active one.
 */
function TemplatePreview( { blocks, item, isHidden, onActivate } ) {
	const itemBlocks = useMemo( () => previewBlocks( blocks, item ), [ blocks, item ] );
	const templateId = blocks.find( ( block ) => block.name === TEMPLATE_CARD )?.clientId;
	const previewProps = useBlockPreview( {
		blocks: itemBlocks,
		props: {
			className: 'sgs-card-grid__template-preview',
			...( templateId ? { [ MIRROR_ATTR ]: templateId } : {} ),
		},
	} );
	return (
		<div
			{ ...previewProps }
			tabIndex={ 0 }
			role="button"
			aria-label={ __( 'Edit the card design on this product', 'sgs-blocks' ) }
			onClick={ onActivate }
			onKeyDown={ ( event ) => ( 'Enter' === event.key || ' ' === event.key ) && onActivate() }
			hidden={ isHidden }
		/>
	);
}
const MemoTemplatePreview = memo( TemplatePreview );

/**
 * The grid's results, its pagination and its empty-state message, from the same server code the page runs.
 *
 * @param {Object} query The grid settings that pick, page and describe its products (`CardGridCanvas.js`).
 * @return {{items: Array|null, paginationHtml: string, emptyMessage: string, error: string}} Null items while loading.
 */
function useGridItems( query ) {
	const [ state, setState ] = useState( { items: null, paginationHtml: '', emptyMessage: '', error: '' } );
	const key = JSON.stringify( query );
	useEffect( () => {
		let live = true;
		setState( ( prev ) => ( { ...prev, items: null } ) );
		apiFetch( { path: '/sgs/v1/card-grid-items', method: 'POST', data: { attributes: query } } )
			.then(
				( res ) =>
					live &&
					setState( {
						items: Array.isArray( res?.items ) ? res.items : [],
						paginationHtml: typeof res?.paginationHtml === 'string' ? res.paginationHtml : '',
						emptyMessage: typeof res?.emptyMessage === 'string' ? res.emptyMessage : '',
						error: '',
					} )
			)
			.catch(
				( err ) =>
					live &&
					setState( {
						items: [],
						paginationHtml: '',
						emptyMessage: '',
						error: err?.message || __( 'Products could not be loaded.', 'sgs-blocks' ),
					} )
			);
		return () => {
			live = false;
		};
		// The key is the query's value; the object itself changes identity every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ key ] );
	return state;
}

export default function ProductTemplateCanvas( { query, clientId, blockProps, gridStyle, sep } ) {
	const { items, paginationHtml, emptyMessage, error } = useGridItems( query );
	const [ activeId, setActiveId ] = useState( null );
	const blocks = useSelect( ( select ) => select( blockEditorStore ).getBlocks( clientId ), [ clientId ] );

	const list = items || [];
	const active = list.some( ( item ) => item.id === activeId ) ? activeId : list[ 0 ]?.id;

	return (
		<div { ...blockProps }>
			<div className="sgs-card-grid sgs-card-grid--card" ref={ sep?.ref } style={ { ...gridStyle, ...( sep?.style || {} ) } }>
				{ null === items && <Spinner /> }
				{ null !== items && 0 === list.length && (
					<>
						{ ( error || emptyMessage ) && (
							<div className="sgs-card-grid__empty">
								<p className="sgs-card-grid__empty-message">{ error || emptyMessage }</p>
							</div>
						) }
						<p className="sgs-card-grid__template-note">
							{ __( 'The card below is the design every product will use. Visitors do not see it.', 'sgs-blocks' ) }
						</p>
						<TemplateCard sample />
					</>
				) }
				{ list.map( ( item ) => (
					<BlockContextProvider key={ item.id } value={ itemContext( item ) }>
						{ item.id === active && <TemplateCard /> }
						<MemoTemplatePreview
							blocks={ blocks }
							item={ item }
							isHidden={ item.id === active }
							onActivate={ () => setActiveId( item.id ) }
						/>
					</BlockContextProvider>
				) ) }
				{ '' !== paginationHtml && <RawHTML>{ paginationHtml }</RawHTML> }
			</div>
		</div>
	);
}
