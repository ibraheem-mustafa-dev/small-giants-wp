/**
 * Product-source sub-panels for the card-grid block editor (FP-E).
 *
 * Extracted from edit.js for file-length compliance — same precedent as
 * content-collection's components/ extraction (B3).
 *
 * Both components fetch via @wordpress/core-data getEntityRecords — no
 * custom REST endpoint (house pattern: content-collection handpicked-panel.js).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	TextControl,
	Spinner,
	CheckboxControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { useState } from '@wordpress/element';

/**
 * ProductTaxonomyChecklist — multi-select checkbox list for a WC product taxonomy.
 *
 * Shared by the category (product_cat) and tag (product_tag) filters in the
 * Products panel. Selected term IDs accumulate into the given attribute key
 * (productCategories / productTags), which render.php passes to
 * Card_Grid_Products::build_collection_args().
 *
 * WC-inactive / empty-taxonomy case: getEntityRecords resolves to an empty
 * array (or null while loading); we render a friendly note instead of
 * crashing — the taxonomy simply does not exist until WooCommerce is active.
 *
 * @param {Object}   props
 * @param {string}   props.taxonomy      Taxonomy slug (product_cat | product_tag).
 * @param {string}   props.label         Visible group label.
 * @param {string}   props.attributeKey  Block attribute to write IDs to.
 * @param {number[]} props.selectedIds   Currently selected term IDs.
 * @param {Function} props.setAttributes Block attribute setter.
 */
export function ProductTaxonomyChecklist( {
	taxonomy,
	label,
	attributeKey,
	selectedIds,
	setAttributes,
} ) {
	const { terms, isResolving } = useSelect(
		( select ) => {
			const query = {
				per_page: 100,
				orderby: 'name',
				order: 'asc',
				hide_empty: false,
			};
			return {
				terms: select( coreStore ).getEntityRecords(
					'taxonomy',
					taxonomy,
					query
				),
				isResolving: select( coreStore ).isResolving(
					'getEntityRecords',
					[ 'taxonomy', taxonomy, query ]
				),
			};
		},
		[ taxonomy ]
	);

	function toggleTerm( termId, checked ) {
		const next = checked
			? [ ...selectedIds, termId ]
			: selectedIds.filter( ( id ) => id !== termId );
		setAttributes( { [ attributeKey ]: next } );
	}

	return (
		<div style={ { marginBottom: 12 } }>
			<p style={ { margin: '12px 0 4px', fontWeight: 600, fontSize: 12 } }>
				{ label }
			</p>
			{ isResolving && <Spinner /> }
			{ ! isResolving && ( ! terms || terms.length === 0 ) && (
				<p style={ { fontSize: 12, color: '#6b7280', margin: '4px 0' } }>
					{ __(
						'No terms found. This list fills in once WooCommerce is active and terms exist.',
						'sgs-blocks'
					) }
				</p>
			) }
			{ ( terms || [] ).length > 0 && (
				<ul
					style={ {
						margin: '4px 0 0',
						padding: 0,
						listStyle: 'none',
						maxHeight: 220,
						overflowY: 'auto',
						border: '1px solid #e0e0e0',
						borderRadius: 4,
					} }
				>
					{ terms.map( ( term ) => (
						<li
							key={ term.id }
							style={ {
								display: 'flex',
								alignItems: 'center',
								minHeight: 44,
								padding: '0 8px',
								borderBottom: '1px solid #f0f0f0',
								fontSize: 12,
							} }
						>
							<CheckboxControl
								label={ term.name || `#${ term.id }` }
								checked={ selectedIds.includes( term.id ) }
								onChange={ ( checked ) =>
									toggleTerm( term.id, checked )
								}
								__nextHasNoMarginBottom
							/>
						</li>
					) ) }
				</ul>
			) }
		</div>
	);
}

/**
 * ProductHandpickPanel — searchable multi-select for specific WC products.
 *
 * Mirrors the handpicked-panel.js pattern from content-collection (house
 * pattern). Selected IDs accumulate into the productIds attribute; order
 * is respected by Card_Grid_Products::get_product_ids() handpick mode.
 *
 * @param {Object}   props
 * @param {number[]} props.productIds    Currently selected product IDs.
 * @param {Function} props.setAttributes Block attribute setter.
 */
export function ProductHandpickPanel( { productIds, setAttributes } ) {
	const [ search, setSearch ] = useState( '' );

	const { records, isResolving } = useSelect(
		( select ) => {
			const query = {
				per_page: 20,
				search: search || undefined,
				orderby: 'title',
				order: 'asc',
				status: 'publish',
			};
			return {
				records: select( coreStore ).getEntityRecords(
					'postType',
					'product',
					query
				),
				isResolving: select( coreStore ).isResolving(
					'getEntityRecords',
					[ 'postType', 'product', query ]
				),
			};
		},
		[ search ]
	);

	const options = ( records || [] ).map( ( p ) => ( {
		value: String( p.id ),
		label: p.title?.rendered || __( '(no title)', 'sgs-blocks' ),
	} ) );

	function onSearchChange( val ) {
		setSearch( val );
	}

	function onSelect( e ) {
		const id = Number.parseInt( e.target.value, 10 );
		if ( id && ! productIds.includes( id ) ) {
			setAttributes( { productIds: [ ...productIds, id ] } );
		}
		e.target.value = '';
	}

	function removeId( id ) {
		setAttributes( {
			productIds: productIds.filter( ( i ) => i !== id ),
		} );
	}

	return (
		<>
			<TextControl
				label={ __( 'Search products', 'sgs-blocks' ) }
				value={ search }
				onChange={ onSearchChange }
				placeholder={ __( 'Type to search…', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
			/>
			{ isResolving && <Spinner /> }
			{ options.length > 0 && (
				<select
					onChange={ onSelect }
					style={ {
						width: '100%',
						marginBottom: 8,
						minHeight: 44,
						fontSize: 13,
					} }
					aria-label={ __( 'Add product', 'sgs-blocks' ) }
					defaultValue=""
				>
					<option value="" disabled>
						{ __( '— select to add —', 'sgs-blocks' ) }
					</option>
					{ options.map( ( opt ) => (
						<option key={ opt.value } value={ opt.value }>
							{ opt.label }
						</option>
					) ) }
				</select>
			) }
			{ productIds.length > 0 && (
				<ul style={ { margin: '4px 0 0', padding: 0, listStyle: 'none' } }>
					{ productIds.map( ( id ) => {
						// Known limitation (v2 candidate): `records` only holds
						// the current search window (20 results), so selected
						// products outside it display as #ID rather than their
						// title. A v2 could fetch the selected IDs separately
						// via getEntityRecords( { include: productIds } ).
						const found = ( records || [] ).find(
							( p ) => p.id === id
						);
						const label = found
							? found.title?.rendered || `#${ id }`
							: `#${ id }`;
						return (
							<li
								key={ id }
								style={ {
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									padding: '4px 0',
									borderBottom: '1px solid #e0e0e0',
									fontSize: 12,
								} }
							>
								<span>{ label }</span>
								<button
									type="button"
									onClick={ () => removeId( id ) }
									style={ {
										background: 'none',
										border: 'none',
										cursor: 'pointer',
										color: '#cc1818',
										minWidth: 44,
										minHeight: 44,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
									} }
									aria-label={ __( 'Remove product', 'sgs-blocks' ) }
								>
									✕
								</button>
							</li>
						);
					} ) }
				</ul>
			) }
		</>
	);
}
