/**
 * "Pricing" inspector panel for `sgs/choice-flow` — Spec 43 FR-43-19/FR-43-20
 * (v1.4.0). Extracted into its own file rather than growing edit.js (already
 * well over this codebase's 250-line JS guideline).
 *
 * The product picker mirrors `card-grid`'s own `HandpickedPanel` search
 * pattern (`ComboboxControl` + `core-data` `getEntityRecords`) rather than a
 * free-text ID field, kept single-select and scoped to the `product` post
 * type only.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl, TextControl, ComboboxControl, Spinner } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { useState } from '@wordpress/element';

/**
 * @param {Object}   props
 * @param {boolean}  props.showPricePanel  Current `showPricePanel` attribute.
 * @param {string}   props.pricePanelTitle Current `pricePanelTitle` attribute.
 * @param {number}   props.flowProductId   Current `flowProductId` attribute.
 * @param {Function} props.setAttributes   Block attribute setter.
 */
export default function PricingSettingsPanel( {
	showPricePanel,
	pricePanelTitle,
	flowProductId,
	setAttributes,
} ) {
	const [ search, setSearch ] = useState( '' );

	const { records, isResolving, selectedProduct } = useSelect(
		( select ) => {
			const query = { per_page: 20, search: search || undefined, orderby: 'title', order: 'asc' };
			return {
				records: select( coreStore ).getEntityRecords( 'postType', 'product', query ),
				isResolving: select( coreStore ).isResolving( 'getEntityRecords', [ 'postType', 'product', query ] ),
				selectedProduct: flowProductId
					? select( coreStore ).getEntityRecord( 'postType', 'product', flowProductId )
					: null,
			};
		},
		[ search, flowProductId ]
	);

	const options = ( records || [] ).map( ( product ) => ( {
		value: product.id,
		label: product.title?.rendered || __( '(no title)', 'sgs-blocks' ),
	} ) );

	return (
		<PanelBody title={ __( 'Pricing', 'sgs-blocks' ) } initialOpen={ false }>
			<ToggleControl
				label={ __( 'Show price panel', 'sgs-blocks' ) }
				checked={ !! showPricePanel }
				onChange={ ( val ) => setAttributes( { showPricePanel: val } ) }
				help={ __(
					'A running total beside the steps for flows with priced add-on questions — the product’s price, then each chosen add-on, then the total. Display only.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
			{ showPricePanel && (
				<>
					<TextControl
						label={ __( 'Panel title', 'sgs-blocks' ) }
						value={ pricePanelTitle }
						onChange={ ( val ) => setAttributes( { pricePanelTitle: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ComboboxControl
						label={ __( 'Product (if not on that product’s own page)', 'sgs-blocks' ) }
						help={ __(
							'On a single product page this is ignored — the flow prices and buys whatever the shopper is already looking at.',
							'sgs-blocks'
						) }
						value={ flowProductId || null }
						options={
							selectedProduct && ! options.some( ( o ) => o.value === selectedProduct.id )
								? [
										{
											value: selectedProduct.id,
											label: selectedProduct.title?.rendered || `#${ selectedProduct.id }`,
										},
										...options,
								  ]
								: options
						}
						onChange={ ( value ) =>
							setAttributes( { flowProductId: value ? parseInt( value, 10 ) : 0 } )
						}
						onFilterValueChange={ setSearch }
						__nextHasNoMarginBottom
					/>
					{ isResolving && <Spinner /> }
				</>
			) }
		</PanelBody>
	);
}
