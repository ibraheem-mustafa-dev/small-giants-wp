/**
 * Card Grid — Content Source panel: manual, query, WooCommerce or collection source and the query settings.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, RangeControl, TextControl } from '@wordpress/components';

export default function ContentSourcePanel( { attributes, setAttributes, isQueryMode, sourceHelp } ) {
	const {
		source,
		queryPostType,
		queryPostsPerPage,
		queryCategory,
	} = attributes;

	return (
				<PanelBody title={ __( 'Content Source', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Source', 'sgs-blocks' ) }
						value={ source || 'manual' }
						options={ [
							{ label: __( 'Manual (custom items)', 'sgs-blocks' ), value: 'manual' },
							{ label: __( 'Query (from posts)', 'sgs-blocks' ), value: 'query' },
							{ label: __( 'WooCommerce products', 'sgs-blocks' ), value: 'wc-product' },
							{ label: __( 'Product collection (no WooCommerce needed)', 'sgs-blocks' ), value: 'cpt-collection' },
						] }
						onChange={ ( val ) => setAttributes( { source: val } ) }
						help={ sourceHelp }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ isQueryMode && (
						<>
							<SelectControl
								label={ __( 'Post type', 'sgs-blocks' ) }
								value={ queryPostType || 'post' }
								options={ [
									{ label: __( 'Posts', 'sgs-blocks' ), value: 'post' },
									{ label: __( 'Pages', 'sgs-blocks' ), value: 'page' },
								] }
								onChange={ ( val ) => setAttributes( { queryPostType: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<RangeControl
								label={ __( 'Number of cards', 'sgs-blocks' ) }
								value={ queryPostsPerPage || 6 }
								onChange={ ( val ) => setAttributes( { queryPostsPerPage: val } ) }
								min={ 1 }
								max={ 24 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<TextControl
								label={ __( 'Category ID (optional)', 'sgs-blocks' ) }
								value={ queryCategory ? String( queryCategory ) : '' }
								onChange={ ( val ) => setAttributes( { queryCategory: Number.parseInt( val, 10 ) || 0 } ) }
								type="number"
								help={ __( 'Filter by category ID. Leave 0 for all categories.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</>
					) }
				</PanelBody>
	);
}
