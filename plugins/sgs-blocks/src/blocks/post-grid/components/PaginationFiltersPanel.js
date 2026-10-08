/**
 * Post Grid — Pagination and filters inspector panel.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import { PAGINATION_OPTIONS, FILTER_TAXONOMY_OPTIONS } from './constants';

export default function PaginationFiltersPanel( { attributes, set } ) {
	const {
		pagination,
		showFilters,
		filterTaxonomy,
		errorMessage,
	} = attributes;

	return (
				<PanelBody title={ __( 'Pagination & Filters', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Pagination', 'sgs-blocks' ) }
						value={ pagination }
						options={ PAGINATION_OPTIONS }
						onChange={ set( 'pagination' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Show filter buttons', 'sgs-blocks' ) }
						checked={ showFilters }
						onChange={ set( 'showFilters' ) }
						__nextHasNoMarginBottom
					/>
					{ showFilters && (
						<SelectControl
							label={ __( 'Filter taxonomy', 'sgs-blocks' ) }
							value={ filterTaxonomy }
							options={ FILTER_TAXONOMY_OPTIONS }
							onChange={ set( 'filterTaxonomy' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					{ ( 'none' !== pagination || showFilters ) && (
						<TextControl
							label={ __( 'Message if posts fail to load', 'sgs-blocks' ) }
							help={ __( 'Shown on the live site when a page or filter cannot load. Leave empty to keep the posts that were showing.', 'sgs-blocks' ) }
							value={ errorMessage || '' }
							onChange={ set( 'errorMessage' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>
	);
}
