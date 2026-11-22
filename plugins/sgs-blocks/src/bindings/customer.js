/**
 * Block Bindings: editor-side registration for the `sgs/customer` source.
 *
 * Pairs with the PHP registration in includes/class-customer-binding.php; the name must stay byte-identical. The
 * signed-in customer exists only on the live page, so the editor shows a sample value for the bound key (inside the
 * binding's `format` when it has one) and the frontend resolves the real one.
 */
import { registerBlockBindingsSource } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

const SAMPLES = {
	first_name: __( 'Aisha', 'sgs-blocks' ),
	display_name: __( 'Aisha', 'sgs-blocks' ),
	email: 'aisha@example.com',
};

const FIELDS = {
	first_name: __( 'Customer first name (else their display name)', 'sgs-blocks' ),
	display_name: __( 'Customer display name', 'sgs-blocks' ),
	email: __( 'Customer email address', 'sgs-blocks' ),
};

registerBlockBindingsSource( {
	name: 'sgs/customer',
	label: __( 'SGS Customer', 'sgs-blocks' ),

	/**
	 * @param {Object} params
	 * @param {Object} params.bindings Map of attribute name -> binding args.
	 * @return {Object} Map of attribute name -> sample value.
	 */
	getValues( { bindings } ) {
		const values = {};
		Object.entries( bindings || {} ).forEach( ( [ attrName, binding ] ) => {
			const format = String( binding?.args?.format ?? '' );
			const sample = SAMPLES[ binding?.args?.key ] ?? SAMPLES.first_name;
			values[ attrName ] = format.includes( '%s' ) ? format.replace( '%s', sample ) : sample;
		} );
		return values;
	},

	/**
	 * @return {Record<string, {label: string, type: string}>} Pickable fields.
	 */
	getFieldsList() {
		const fields = {};
		Object.keys( FIELDS ).forEach( ( key ) => {
			fields[ key ] = { label: FIELDS[ key ], type: 'string' };
		} );
		return fields;
	},
} );
