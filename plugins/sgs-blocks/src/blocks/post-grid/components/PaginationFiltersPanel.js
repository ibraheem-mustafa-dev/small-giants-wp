/**
 * Post Grid — Pagination and filters inspector panel.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, TextControl, ToggleControl, Button } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { DesignTokenPicker, SgsLengthControl } from '../../../components';
import { PAGINATION_OPTIONS, FILTER_TAXONOMY_OPTIONS } from './constants';

const WEIGHT_OPTIONS = [
	{ value: '', label: __( 'Default (600)', 'sgs-blocks' ) },
	...[ 400, 500, 600, 700, 800 ].map( ( w ) => ( { value: String( w ), label: String( w ) } ) ),
];

const ORDER_OPTIONS = [
	{ value: 'name', label: __( 'Name (A to Z)', 'sgs-blocks' ) },
	{ value: 'count', label: __( 'Number of posts (most first)', 'sgs-blocks' ) },
	{ value: 'custom', label: __( 'Custom order', 'sgs-blocks' ) },
];

/** Move-up / move-down list of the taxonomy's terms; saves the ordered term IDs. */
function TermOrderList( { taxonomy, order, onChange } ) {
	const terms = useSelect(
		( select ) => select( coreStore ).getEntityRecords( 'taxonomy', taxonomy, { per_page: 100, hide_empty: true } ),
		[ taxonomy ]
	);
	if ( ! terms ) {
		return null;
	}
	const rank = new Map( ( order || [] ).map( ( id, i ) => [ id, i ] ) );
	const sorted = [ ...terms ].sort(
		( a, b ) => ( rank.get( a.id ) ?? 1e9 ) - ( rank.get( b.id ) ?? 1e9 ) || a.name.localeCompare( b.name )
	);
	const move = ( index, delta ) => {
		const ids = sorted.map( ( t ) => t.id );
		const target = index + delta;
		if ( target < 0 || target >= ids.length ) {
			return;
		}
		[ ids[ index ], ids[ target ] ] = [ ids[ target ], ids[ index ] ];
		onChange( ids );
	};
	return (
		<ul className="sgs-post-grid-term-order">
			{ sorted.map( ( term, i ) => (
				<li key={ term.id }>
					<span>{ term.name }</span>
					<Button
						icon="arrow-up-alt2"
						label={ __( 'Move up', 'sgs-blocks' ) }
						disabled={ 0 === i }
						onClick={ () => move( i, -1 ) }
						size="small"
					/>
					<Button
						icon="arrow-down-alt2"
						label={ __( 'Move down', 'sgs-blocks' ) }
						disabled={ i === sorted.length - 1 }
						onClick={ () => move( i, 1 ) }
						size="small"
					/>
				</li>
			) ) }
		</ul>
	);
}

export default function PaginationFiltersPanel( { attributes, setAttributes, set } ) {
	const {
		pagination,
		showFilters,
		filterTaxonomy,
		errorMessage,
		filterOrder,
		filterTermOrder,
	} = attributes;

	const chipColour = ( label, base, active ) => (
		<DesignTokenPicker
			label={ label }
			states={ [
				{ key: 'base', label: __( 'Normal', 'sgs-blocks' ), value: attributes[ base ], onChange: ( v ) => setAttributes( { [ base ]: v ?? '' } ) },
				{ key: 'active', label: __( 'Active chip', 'sgs-blocks' ), value: attributes[ active ], onChange: ( v ) => setAttributes( { [ active ]: v ?? '' } ) },
			] }
		/>
	);
	const chipLength = ( label, name, help ) => (
		<SgsLengthControl label={ label } value={ attributes[ name ] || '' } onChange={ ( v ) => setAttributes( { [ name ]: v ?? '' } ) } help={ help } presets={ false } />
	);

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
					{ showFilters && (
						<>
							<SelectControl
								label={ __( 'Filter order', 'sgs-blocks' ) }
								value={ filterOrder || 'name' }
								options={ ORDER_OPTIONS }
								onChange={ set( 'filterOrder' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							{ 'custom' === filterOrder && (
								<TermOrderList
									taxonomy={ filterTaxonomy }
									order={ filterTermOrder }
									onChange={ ( ids ) => setAttributes( { filterTermOrder: ids } ) }
								/>
							) }
							{ chipColour( __( 'Filter fill', 'sgs-blocks' ), 'filterBackground', 'filterActiveBackground' ) }
							{ chipColour( __( 'Filter text colour', 'sgs-blocks' ), 'filterTextColour', 'filterActiveTextColour' ) }
							{ chipColour( __( 'Filter border colour', 'sgs-blocks' ), 'filterBorderColour', 'filterActiveBorderColour' ) }
							{ chipLength( __( 'Filter border width', 'sgs-blocks' ), 'filterBorderWidth', __( 'Empty keeps 2px.', 'sgs-blocks' ) ) }
							{ chipLength( __( 'Active filter border width', 'sgs-blocks' ), 'filterActiveBorderWidth', __( 'Empty keeps 3px.', 'sgs-blocks' ) ) }
							{ chipLength( __( 'Filter minimum height', 'sgs-blocks' ), 'filterMinHeight', __( 'Empty keeps 44px, the touch-target minimum.', 'sgs-blocks' ) ) }
							<SelectControl
								label={ __( 'Filter font weight', 'sgs-blocks' ) }
								value={ attributes.filterFontWeight || '' }
								options={ WEIGHT_OPTIONS }
								onChange={ set( 'filterFontWeight' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</>
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
