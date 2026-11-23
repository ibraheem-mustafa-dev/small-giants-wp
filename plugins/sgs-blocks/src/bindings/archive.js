/**
 * Block Bindings: editor-side registration for the `sgs/archive` source.
 *
 * Pairs with the PHP registration in includes/class-archive-binding.php; the name must stay byte-identical. Which
 * category or tag an archive template shows is known only on the live page, so the editor shows a sample value for the
 * bound key (inside the binding's `format` when it has one) and the frontend resolves the real one, keeping the typed
 * text on pages that are not a category or tag archive.
 */
import { registerBlockBindingsSource } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

const SAMPLES = {
	title: __( 'Category name', 'sgs-blocks' ),
	description: __( 'Category description', 'sgs-blocks' ),
};

const FIELDS = {
	title: __( 'Category or tag name (archive pages)', 'sgs-blocks' ),
	description: __( 'Category or tag description (archive pages)', 'sgs-blocks' ),
};

registerBlockBindingsSource( {
	name: 'sgs/archive',
	label: __( 'SGS Archive', 'sgs-blocks' ),

	/**
	 * @param {Object} params
	 * @param {Object} params.bindings Map of attribute name -> binding args.
	 * @return {Object} Map of attribute name -> sample value.
	 */
	getValues( { bindings } ) {
		const values = {};
		Object.entries( bindings || {} ).forEach( ( [ attrName, binding ] ) => {
			const format = String( binding?.args?.format ?? '' );
			const sample = SAMPLES[ binding?.args?.key ] ?? SAMPLES.title;
			values[ attrName ] = format.includes( '%s' )
				? format.replace( '%s', sample )
				: sample;
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
