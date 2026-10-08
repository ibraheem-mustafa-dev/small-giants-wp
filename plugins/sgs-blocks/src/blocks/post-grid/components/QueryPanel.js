/**
 * Post Grid — Query inspector panel.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, RangeControl, ToggleControl, TextControl } from '@wordpress/components';
import SgsMultiSelectField from '../../../components/SgsMultiSelectField';
import { ORDER_BY_OPTIONS, ORDER_OPTIONS } from './constants';

export default function QueryPanel( { attributes, set, catSuggestions, tagSuggestions, selectedCatNames, selectedTagNames, onCategoriesChange, onTagsChange } ) {
	const {
		postType,
		postsPerPage,
		orderBy,
		order,
		excludeCurrent,
		offset,
	} = attributes;

	return (
				<PanelBody title={ __( 'Query', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Post type', 'sgs-blocks' ) }
						value={ postType }
						options={ [
							{ label: __( 'Posts', 'sgs-blocks' ), value: 'post' },
							{ label: __( 'Pages', 'sgs-blocks' ), value: 'page' },
						] }
						onChange={ set( 'postType' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Posts per page', 'sgs-blocks' ) }
						value={ postsPerPage }
						onChange={ set( 'postsPerPage' ) }
						min={ 1 }
						max={ 24 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Order by', 'sgs-blocks' ) }
						value={ orderBy }
						options={ ORDER_BY_OPTIONS }
						onChange={ set( 'orderBy' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Order', 'sgs-blocks' ) }
						value={ order }
						options={ ORDER_OPTIONS }
						onChange={ set( 'order' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SgsMultiSelectField
						label={ __( 'Categories', 'sgs-blocks' ) }
						value={ selectedCatNames }
						suggestions={ catSuggestions }
						onChange={ onCategoriesChange }
					/>
					<SgsMultiSelectField
						label={ __( 'Tags', 'sgs-blocks' ) }
						value={ selectedTagNames }
						suggestions={ tagSuggestions }
						onChange={ onTagsChange }
					/>
					<RangeControl
						label={ __( 'Offset', 'sgs-blocks' ) }
						value={ offset }
						onChange={ set( 'offset' ) }
						min={ 0 }
						max={ 50 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Exclude current post', 'sgs-blocks' ) }
						checked={ excludeCurrent }
						onChange={ set( 'excludeCurrent' ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Message when there are no posts', 'sgs-blocks' ) }
						help={ __( 'Leave empty to show nothing.', 'sgs-blocks' ) }
						value={ attributes.emptyMessage || '' }
						onChange={ set( 'emptyMessage' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
	);
}
