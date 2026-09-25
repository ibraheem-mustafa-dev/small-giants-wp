/**
 * Block Bindings: editor-side registration for the `sgs-product/field` source.
 *
 * Pairs with the PHP registration in includes/class-product-bindings.php
 * (`register_block_bindings_source( 'sgs-product/field', … )`); the name must
 * stay byte-identical. The field list (brand, SKU, every product attribute and
 * the product fields this site uses) is built server-side by
 * includes/product-field-values.php::sgs_product_field_list() and printed as
 * `window.sgsProductFields` before this bundle runs.
 *
 * `getValues()` returns '' per binding, like the `sgs/site-info` source: every
 * SGS block renders through ServerSideRender, so the canvas shows the real
 * product value resolved by the same PHP callback as the frontend.
 */
import { registerBlockBindingsSource } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

registerBlockBindingsSource( {
	name: 'sgs-product/field',
	label: __( 'SGS Product Field', 'sgs-blocks' ),

	/**
	 * @param {Object} params
	 * @param {Object} params.bindings Map of attribute name -> binding args.
	 * @return {Object} Map of attribute name -> ''.
	 */
	getValues( { bindings } ) {
		const values = {};
		Object.keys( bindings || {} ).forEach( ( attrName ) => {
			values[ attrName ] = '';
		} );
		return values;
	},

	/**
	 * @return {Record<string, {label: string, type: string}>} Pickable fields.
	 */
	getFieldsList() {
		const fields = window.sgsProductFields;
		return fields && typeof fields === 'object' ? fields : {};
	},
} );
