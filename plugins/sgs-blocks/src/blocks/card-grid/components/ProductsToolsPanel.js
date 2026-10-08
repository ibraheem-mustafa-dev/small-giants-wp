/**
 * Card Grid — Products ToolsPanel shown in WooCommerce product mode: selection, filters, price breakdown and empty message.
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, RangeControl, TextControl, ToggleControl } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../../components/primitives';
import { ProductTaxonomyChecklist, ProductHandpickPanel } from './product-panels';
import { PRODUCT_COLLECTION_OPTIONS } from './constants';

export default function ProductsToolsPanel( { attributes, setAttributes, isWcProductMode } ) {
	const {
		productSource,
		productCollection,
		productLimit,
		productCategories,
		productTags,
		productFeatured,
		productOnSale,
		productInStock,
		productIds,
		productShowLadder,
		productEmptyMessage,
	} = attributes;

	return (
		<>
				{ /* ── Products panel: visible only in wc-product mode.
					   S7 pilot (2026-09-02, uniformity sweep): converted from a flat
					   PanelBody to a ToolsPanel. Selection mode is core config
					   (isShownByDefault); collection/handpick controls and filters
					   are optional and resettable. */ }
				{ isWcProductMode && (
					<ToolsPanel
						label={ __( 'Products', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								productSource: 'collection',
								productCollection: 'latest',
								productLimit: 6,
								productCategories: [],
								productTags: [],
								productInStock: true,
								productOnSale: false,
								productFeatured: false,
								productShowLadder: false,
								productEmptyMessage: '',
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Selection mode', 'sgs-blocks' ) }
							hasValue={ () => ( productSource || 'collection' ) !== 'collection' }
							onDeselect={ () => setAttributes( { productSource: 'collection' } ) }
							isShownByDefault
						>
							<SelectControl
								label={ __( 'Selection mode', 'sgs-blocks' ) }
								value={ productSource || 'collection' }
								options={ [
									{ label: __( 'Smart collection', 'sgs-blocks' ), value: 'collection' },
									{ label: __( 'Hand-pick specific products', 'sgs-blocks' ), value: 'handpick' },
								] }
								onChange={ ( val ) => setAttributes( { productSource: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>

						{ ( productSource || 'collection' ) === 'collection' && (
							<>
								<ToolsPanelItem
									label={ __( 'Smart collection', 'sgs-blocks' ) }
									hasValue={ () => ( productCollection || 'latest' ) !== 'latest' }
									onDeselect={ () => setAttributes( { productCollection: 'latest' } ) }
									isShownByDefault
								>
									<SelectControl
										label={ __( 'Smart collection', 'sgs-blocks' ) }
										value={ productCollection || 'latest' }
										options={ PRODUCT_COLLECTION_OPTIONS }
										onChange={ ( val ) => setAttributes( { productCollection: val } ) }
										help={ __( 'One-click preset ordering for your product grid.', 'sgs-blocks' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Number of products', 'sgs-blocks' ) }
									hasValue={ () => ( productLimit || 6 ) !== 6 }
									onDeselect={ () => setAttributes( { productLimit: 6 } ) }
									isShownByDefault
								>
									<RangeControl
										label={ __( 'Number of products', 'sgs-blocks' ) }
										value={ productLimit || 6 }
										onChange={ ( val ) => setAttributes( { productLimit: val } ) }
										min={ 1 }
										max={ 24 }
										help={ __( 'Maximum 24 products.', 'sgs-blocks' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Categories', 'sgs-blocks' ) }
									hasValue={ () => ( productCategories || [] ).length > 0 }
									onDeselect={ () => setAttributes( { productCategories: [] } ) }
								>
									<p style={ { margin: '12px 0 4px', fontWeight: 600, fontSize: 12 } }>
										{ __( 'Filters', 'sgs-blocks' ) }
									</p>
									<ProductTaxonomyChecklist
										taxonomy="product_cat"
										label={ __( 'Categories', 'sgs-blocks' ) }
										attributeKey="productCategories"
										selectedIds={ productCategories || [] }
										setAttributes={ setAttributes }
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Tags', 'sgs-blocks' ) }
									hasValue={ () => ( productTags || [] ).length > 0 }
									onDeselect={ () => setAttributes( { productTags: [] } ) }
								>
									<ProductTaxonomyChecklist
										taxonomy="product_tag"
										label={ __( 'Tags', 'sgs-blocks' ) }
										attributeKey="productTags"
										selectedIds={ productTags || [] }
										setAttributes={ setAttributes }
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'In stock only', 'sgs-blocks' ) }
									hasValue={ () => productInStock !== true }
									onDeselect={ () => setAttributes( { productInStock: true } ) }
								>
									<SelectControl
										label={ __( 'In stock only', 'sgs-blocks' ) }
										value={ productInStock === false ? 'no' : 'yes' }
										options={ [
											{ label: __( 'Yes (recommended)', 'sgs-blocks' ), value: 'yes' },
											{ label: __( 'No — include out-of-stock', 'sgs-blocks' ), value: 'no' },
										] }
										onChange={ ( val ) => setAttributes( { productInStock: val === 'yes' } ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'On sale only', 'sgs-blocks' ) }
									hasValue={ () => productOnSale !== false }
									onDeselect={ () => setAttributes( { productOnSale: false } ) }
								>
									<SelectControl
										label={ __( 'On sale only', 'sgs-blocks' ) }
										value={ productOnSale ? 'yes' : 'no' }
										options={ [
											{ label: __( 'No', 'sgs-blocks' ), value: 'no' },
											{ label: __( 'Yes — sale items only', 'sgs-blocks' ), value: 'yes' },
										] }
										onChange={ ( val ) => setAttributes( { productOnSale: val === 'yes' } ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Featured only', 'sgs-blocks' ) }
									hasValue={ () => productFeatured !== false }
									onDeselect={ () => setAttributes( { productFeatured: false } ) }
								>
									<SelectControl
										label={ __( 'Featured only', 'sgs-blocks' ) }
										value={ productFeatured ? 'yes' : 'no' }
										options={ [
											{ label: __( 'No', 'sgs-blocks' ), value: 'no' },
											{ label: __( 'Yes — featured items only', 'sgs-blocks' ), value: 'yes' },
										] }
										onChange={ ( val ) => setAttributes( { productFeatured: val === 'yes' } ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
							</>
						) }

						{ ( productSource || 'collection' ) === 'handpick' && (
							<ProductHandpickPanel
								productIds={ productIds || [] }
								setAttributes={ setAttributes }
							/>
						) }

						<ToolsPanelItem
							label={ __( 'Show price breakdown on cards', 'sgs-blocks' ) }
							hasValue={ () => !! productShowLadder }
							onDeselect={ () => setAttributes( { productShowLadder: false } ) }
						>
							<ToggleControl
								label={ __( 'Show price breakdown on cards', 'sgs-blocks' ) }
								checked={ !! productShowLadder }
								onChange={ ( val ) => setAttributes( { productShowLadder: val } ) }
								help={ __( 'Off by default — grids are a browsing context; the ladder does its upsell work on the product page.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Empty state message', 'sgs-blocks' ) }
							hasValue={ () => productEmptyMessage !== '' }
							onDeselect={ () => setAttributes( { productEmptyMessage: '' } ) }
						>
							<TextControl
								label={ __( 'Empty state message', 'sgs-blocks' ) }
								value={ productEmptyMessage || '' }
								onChange={ ( val ) => setAttributes( { productEmptyMessage: val } ) }
								help={ __( 'Shown on the live site when no products match. Leave empty to show nothing; the editor shows a notice instead.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				) }
		</>
	);
}
