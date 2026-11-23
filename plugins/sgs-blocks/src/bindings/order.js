/**
 * Block Bindings: editor-side registration for the `sgs/order` source.
 *
 * Pairs with the PHP registration in includes/class-order-binding.php; the name
 * must stay byte-identical. The order exists only on the thank-you page, so the
 * editor shows a sample of each key and the frontend resolves the real one.
 */
import { registerBlockBindingsSource } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

const FIELDS = {
	number: { label: __( 'Order number', 'sgs-blocks' ), sample: '1234' },
	email: {
		label: __( 'Email the order was placed with', 'sgs-blocks' ),
		sample: 'shopper@example.com',
	},
	delivery_method: {
		label: __( 'Delivery method', 'sgs-blocks' ),
		sample: __( 'Tracked delivery', 'sgs-blocks' ),
	},
	total: { label: __( 'Order total', 'sgs-blocks' ), sample: '£31.50' },
	date: {
		label: __( 'Order date', 'sgs-blocks' ),
		sample: '17 November 2026',
	},
	view_url: {
		label: __( 'View order link (signed-in owner only)', 'sgs-blocks' ),
		sample: '/my-account/view-order/1234/',
	},
	gift_to: {
		label: __( 'Gift: who it is for', 'sgs-blocks' ),
		sample: __( 'Aisha', 'sgs-blocks' ),
	},
	gift_message: {
		label: __( 'Gift: the note', 'sgs-blocks' ),
		sample: __( 'Happy birthday!', 'sgs-blocks' ),
	},
	item_count: { label: __( 'Number of items', 'sgs-blocks' ), sample: '3' },
	shipping_name: {
		label: __( 'Delivery: who it goes to', 'sgs-blocks' ),
		sample: __( 'Aisha Khan', 'sgs-blocks' ),
	},
	shipping_address: {
		label: __( 'Delivery address (one line)', 'sgs-blocks' ),
		sample: __( '12 High Street, Birmingham, B8 1AA', 'sgs-blocks' ),
	},
	billing_name: {
		label: __( 'Billing: who paid', 'sgs-blocks' ),
		sample: __( 'Aisha Khan', 'sgs-blocks' ),
	},
	billing_address: {
		label: __( 'Billing address (one line)', 'sgs-blocks' ),
		sample: __( '12 High Street, Birmingham, B8 1AA', 'sgs-blocks' ),
	},
	phone: {
		label: __( 'Phone number', 'sgs-blocks' ),
		sample: '07700 900123',
	},
	payment_method: {
		label: __( 'Payment method', 'sgs-blocks' ),
		sample: __( 'Card', 'sgs-blocks' ),
	},
};

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
		const fields = {};
		Object.keys( FIELDS ).forEach( ( key ) => {
			fields[ key ] = { label: FIELDS[ key ].label, type: 'string' };
		} );
		return fields;
	},
} );
