/**
 * Post Grid — Pagination and filters inspector panel.
 */

import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Button,
} from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../../components/primitives';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { DesignTokenPicker, ResponsiveBoxControl, SgsLengthControl } from '../../../components';
import { patchTier } from '../../../utils';
import { PAGINATION_OPTIONS, FILTER_TAXONOMY_OPTIONS } from './constants';

const WEIGHT_OPTIONS = [
	{ value: '', label: __( 'Default (600)', 'sgs-blocks' ) },
	...[ 400, 500, 600, 700, 800 ].map( ( w ) => ( { value: String( w ), label: String( w ) } ) ),
];

const ORDER_OPTIONS = [
	{ value: 'name', label: __( 'Name (A to Z)', 'sgs-blocks' ) },
	{ value: 'count', label: __( 'Number of posts (most first)', 'sgs-blocks' ) },
	{ value: 'term_order', label: __( 'Custom order', 'sgs-blocks' ) },
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
		filterTermIds,
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
							{ 'term_order' === filterOrder && (
								<TermOrderList
									taxonomy={ filterTaxonomy }
									order={ filterTermIds }
									onChange={ ( ids ) => setAttributes( { filterTermIds: ids } ) }
								/>
							) }
							<ToolsPanel
								label={ __( 'Filter chip look', 'sgs-blocks' ) }
								resetAll={ () => setAttributes( {
									filterBackground: '',
									filterActiveBackground: '',
									filterTextColour: '',
									filterActiveTextColour: '',
									filterBorderColour: '',
									filterActiveBorderColour: '',
									filterBorderWidth: '2px',
									filterActiveBorderWidth: '3px',
									filterMinHeight: '',
									filterPadding: {},
									filterFontWeight: '',
								} ) }
							>
								<ToolsPanelItem
									label={ __( 'Filter fill', 'sgs-blocks' ) }
									isShownByDefault
									hasValue={ () => !! ( attributes.filterBackground || attributes.filterActiveBackground ) }
									onDeselect={ () => setAttributes( { filterBackground: '', filterActiveBackground: '' } ) }
								>
									{ chipColour( __( 'Filter fill', 'sgs-blocks' ), 'filterBackground', 'filterActiveBackground' ) }
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Filter text colour', 'sgs-blocks' ) }
									isShownByDefault
									hasValue={ () => !! ( attributes.filterTextColour || attributes.filterActiveTextColour ) }
									onDeselect={ () => setAttributes( { filterTextColour: '', filterActiveTextColour: '' } ) }
								>
									{ chipColour( __( 'Filter text colour', 'sgs-blocks' ), 'filterTextColour', 'filterActiveTextColour' ) }
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Filter border colour', 'sgs-blocks' ) }
									isShownByDefault
									hasValue={ () => !! ( attributes.filterBorderColour || attributes.filterActiveBorderColour ) }
									onDeselect={ () => setAttributes( { filterBorderColour: '', filterActiveBorderColour: '' } ) }
								>
									{ chipColour( __( 'Filter border colour', 'sgs-blocks' ), 'filterBorderColour', 'filterActiveBorderColour' ) }
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Filter border width', 'sgs-blocks' ) }
									hasValue={ () => '2px' !== attributes.filterBorderWidth }
									onDeselect={ () => setAttributes( { filterBorderWidth: '2px' } ) }
								>
									<SgsLengthControl label={ __( 'Filter border width', 'sgs-blocks' ) } value={ attributes.filterBorderWidth || '' } onChange={ ( v ) => setAttributes( { filterBorderWidth: v ?? '' } ) } help={ __( 'Default 2px.', 'sgs-blocks' ) } presets={ false } />
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Active filter border width', 'sgs-blocks' ) }
									hasValue={ () => '3px' !== attributes.filterActiveBorderWidth }
									onDeselect={ () => setAttributes( { filterActiveBorderWidth: '3px' } ) }
								>
									<SgsLengthControl label={ __( 'Active filter border width', 'sgs-blocks' ) } value={ attributes.filterActiveBorderWidth || '' } onChange={ ( v ) => setAttributes( { filterActiveBorderWidth: v ?? '' } ) } help={ __( 'Default 3px.', 'sgs-blocks' ) } presets={ false } />
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Filter padding', 'sgs-blocks' ) }
									hasValue={ () => !! attributes.filterPadding && Object.keys( attributes.filterPadding ).length > 0 }
									onDeselect={ () => setAttributes( { filterPadding: {} } ) }
								>
									<ResponsiveBoxControl
										label={ __( 'Filter padding', 'sgs-blocks' ) }
										presets
										values={ {
											base: attributes.filterPadding?.desktop ?? {},
											tablet: attributes.filterPadding?.tablet ?? {},
											mobile: attributes.filterPadding?.mobile ?? {},
										} }
										onChange={ ( tier, next ) => {
											const tierMap = { base: 'desktop', tablet: 'tablet', mobile: 'mobile' };
											patchTier( attributes, setAttributes, 'filterPadding', tierMap[ tier ], next );
										} }
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Filter minimum height', 'sgs-blocks' ) }
									hasValue={ () => !! attributes.filterMinHeight }
									onDeselect={ () => setAttributes( { filterMinHeight: '' } ) }
								>
									<SgsLengthControl label={ __( 'Filter minimum height', 'sgs-blocks' ) } value={ attributes.filterMinHeight || '' } onChange={ ( v ) => setAttributes( { filterMinHeight: v ?? '' } ) } help={ __( 'Empty keeps 44px, the touch-target minimum.', 'sgs-blocks' ) } presets={ false } />
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Filter font weight', 'sgs-blocks' ) }
									hasValue={ () => !! attributes.filterFontWeight }
									onDeselect={ () => setAttributes( { filterFontWeight: '' } ) }
								>
									<SelectControl
										label={ __( 'Filter font weight', 'sgs-blocks' ) }
										value={ attributes.filterFontWeight || '' }
										options={ WEIGHT_OPTIONS }
										onChange={ set( 'filterFontWeight' ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
							</ToolsPanel>
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
