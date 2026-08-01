/**
 * CollectionPanel — inspector controls for card-grid's `cpt-collection` source.
 *
 * This is the WooCommerce-INDEPENDENT collection path, folded in from
 * sgs/content-collection on 2026-08-01. It queries a custom post type
 * (sgs_product by default) with seven meta-driven selection rules and renders
 * each result through sgs/product-card in sgs-cpt mode.
 *
 * The two sub-panels (handpicked / category) are the ones content-collection
 * already shipped — they are imported, not re-implemented, so there is one
 * copy of each picker.
 *
 * Extracted to its own file so card-grid/edit.js does not grow further; that
 * file is already over the project's length limit and splitting it is a
 * separate, deferred task.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import HandpickedPanel from '../../content-collection/components/handpicked-panel';
import CategoryPanel from '../../content-collection/components/category-panel';

/** Maximum result count enforced server-side (CPT_Collection_Query::MAX_COUNT). */
const MAX_COUNT = 24;

/** The seven selection rules. Mirrors CPT_Collection_Query::SELECTION_RULES. */
const SELECTION_RULE_OPTIONS = [
	{ value: 'newest', label: __( 'Newest', 'sgs-blocks' ) },
	{ value: 'featured', label: __( 'Featured / Starred', 'sgs-blocks' ) },
	{ value: 'most-expensive', label: __( 'Most expensive (price ↓)', 'sgs-blocks' ) },
	{ value: 'cheapest', label: __( 'Cheapest (price ↑)', 'sgs-blocks' ) },
	{ value: 'most-popular', label: __( 'Most popular (views ↓)', 'sgs-blocks' ) },
	{ value: 'handpicked', label: __( 'Hand-picked', 'sgs-blocks' ) },
	{ value: 'category', label: __( 'By category', 'sgs-blocks' ) },
];

/** Pagination modes. Mirrors Grid_Pagination::TYPES. */
const PAGINATION_OPTIONS = [
	{ value: 'none', label: __( 'None — show one page only', 'sgs-blocks' ) },
	{ value: 'standard', label: __( 'Numbered pages', 'sgs-blocks' ) },
];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 */
export default function CollectionPanel( { attributes, setAttributes } ) {
	const {
		contentType,
		selectionRule,
		count,
		handpickedIds,
		categoryTerm,
		emptyMessage,
		pagination,
		showPickers,
		ctaBehaviour,
		showLadder,
	} = attributes;

	return (
		<>
			<PanelBody title={ __( 'Collection', 'sgs-blocks' ) } initialOpen={ true }>
				<SelectControl
					label={ __( 'Content type', 'sgs-blocks' ) }
					help={ __(
						'The post type to query. Works with or without WooCommerce.',
						'sgs-blocks'
					) }
					value={ contentType || 'sgs_product' }
					options={ [
						{ value: 'sgs_product', label: __( 'Products (sgs_product)', 'sgs-blocks' ) },
					] }
					onChange={ ( v ) => setAttributes( { contentType: v } ) }
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Selection rule', 'sgs-blocks' ) }
					help={ __( 'How items are chosen and ordered.', 'sgs-blocks' ) }
					value={ selectionRule || 'newest' }
					options={ SELECTION_RULE_OPTIONS }
					onChange={ ( v ) => setAttributes( { selectionRule: v } ) }
					__nextHasNoMarginBottom
				/>
				<RangeControl
					label={ __( 'Number of items', 'sgs-blocks' ) }
					help={ __( 'Maximum 24 items per page (server-side cap).', 'sgs-blocks' ) }
					value={ count || 12 }
					min={ 1 }
					max={ MAX_COUNT }
					onChange={ ( v ) => setAttributes( { count: v } ) }
					__nextHasNoMarginBottom
				/>

				{ 'handpicked' === selectionRule && (
					<HandpickedPanel
						contentType={ contentType || 'sgs_product' }
						handpickedIds={ handpickedIds || [] }
						setAttributes={ setAttributes }
					/>
				) }

				{ 'category' === selectionRule && (
					<CategoryPanel
						contentType={ contentType || 'sgs_product' }
						categoryTerm={ categoryTerm || 0 }
						setAttributes={ setAttributes }
					/>
				) }

				{ 'handpicked' !== selectionRule && (
					<SelectControl
						label={ __( 'Pagination', 'sgs-blocks' ) }
						help={ __(
							'Numbered pages are real links — they work without JavaScript and search engines can follow them.',
							'sgs-blocks'
						) }
						value={ pagination || 'none' }
						options={ PAGINATION_OPTIONS }
						onChange={ ( v ) => setAttributes( { pagination: v } ) }
						__nextHasNoMarginBottom
					/>
				) }

				<TextControl
					label={ __( 'Empty state message', 'sgs-blocks' ) }
					help={ __(
						'Shown when nothing matches — the grid is never left blank.',
						'sgs-blocks'
					) }
					value={ emptyMessage || '' }
					onChange={ ( v ) => setAttributes( { emptyMessage: v } ) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody title={ __( 'Card behaviour', 'sgs-blocks' ) } initialOpen={ false }>
				<SelectControl
					label={ __( 'Button action', 'sgs-blocks' ) }
					help={ __(
						'What the button on each card does.',
						'sgs-blocks'
					) }
					value={ ctaBehaviour || 'learn-more' }
					options={ [
						{ value: 'learn-more', label: __( 'Go to the product page', 'sgs-blocks' ) },
						{ value: 'add-to-basket', label: __( 'Add to basket', 'sgs-blocks' ) },
						{ value: 'buy-now', label: __( 'Buy now (straight to checkout)', 'sgs-blocks' ) },
					] }
					onChange={ ( v ) => setAttributes( { ctaBehaviour: v } ) }
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Show option pickers on each card', 'sgs-blocks' ) }
					help={ __(
						'Off is usually right for a browsing grid — shoppers pick options on the product page.',
						'sgs-blocks'
					) }
					checked={ showPickers !== false }
					onChange={ ( v ) => setAttributes( { showPickers: v } ) }
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={ __( 'Show the price ladder on each card', 'sgs-blocks' ) }
					help={ __(
						'Off shows the price and per-unit note only.',
						'sgs-blocks'
					) }
					checked={ !! showLadder }
					onChange={ ( v ) => setAttributes( { showLadder: v } ) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>
		</>
	);
}
