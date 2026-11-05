/**
 * Block Bindings: editor-side registration for the `sgs/order` source.
 *
 * Pairs with the PHP registration in includes/class-order-binding.php; the name
 * must stay byte-identical. The order exists only on the thank-you page, so the
 * editor shows a sample number and the frontend resolves the real one.
 */
import { registerBlockBindingsSource } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

registerBlockBindingsSource( {
	name: 'sgs/order',
	label: __( 'SGS Order', 'sgs-blocks' ),

	/**
	 * @param {Object} params
	 * @param {Object} params.bindings Map of attribute name -> binding args.
	 * @return {Object} Map of attribute name -> sample value.
	 */
	getValues( { bindings } ) {
		const values = {};
		Object.keys( bindings || {} ).forEach( ( attrName ) => {
			values[ attrName ] = '1234';
		} );
		return values;
	},

	/**
	 * @return {Record<string, {label: string, type: string}>} Pickable fields.
	 */
	getFieldsList() {
		return {
			number: { label: __( 'Order number', 'sgs-blocks' ), type: 'string' },
		};
	},
} );
