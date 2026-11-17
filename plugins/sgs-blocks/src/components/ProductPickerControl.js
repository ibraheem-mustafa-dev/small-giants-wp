/**
 * Picks one WooCommerce product for a one-tap add-to-basket button: the cart drawer's empty state (`emptyProductId`) and
 * sgs/button's `add-to-basket` link source (`addProductId`).
 *
 * A searchable list of the shop's products, read through the WordPress REST API in the editor. The stored value is the
 * product's id; 0 means none.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import { ComboboxControl } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

/**
 * @param {Object}   props          Props.
 * @param {number}   props.value    The chosen product id (0 for none).
 * @param {Function} props.onChange Called with the new product id (0 to clear).
 * @param {string}   [props.label]  Field label.
 * @param {string}   [props.help]   Help line under the field.
 * @return {Element} The control.
 */
export default function ProductPickerControl( { value, onChange, label, help } ) {
	const [ options, setOptions ] = useState( [] );
	const [ search, setSearch ] = useState( '' );

	useEffect( () => {
		let live = true;
		const query = new URLSearchParams( { per_page: '20', _fields: 'id,title', status: 'publish' } );
		if ( search ) {
			query.set( 'search', search );
		}
		apiFetch( { path: `/wp/v2/product?${ query.toString() }` } )
			.then( ( rows ) => {
				if ( live ) {
					setOptions( ( Array.isArray( rows ) ? rows : [] ).map( ( row ) => ( { value: row.id, label: row.title?.rendered || `#${ row.id }` } ) ) );
				}
			} )
			.catch( () => {
				if ( live ) {
					setOptions( [] );
				}
			} );
		return () => {
			live = false;
		};
	}, [ search ] );

	// Keep the chosen product on the list even when the search no longer finds it.
	const withChosen = value > 0 && ! options.some( ( o ) => o.value === value ) ? [ { value, label: `#${ value }` }, ...options ] : options;

	return (
		<ComboboxControl
			label={ label || __( 'Product for the button', 'sgs-blocks' ) }
			help={ help || __( 'One tap adds it to the basket: a simple product, or a variable product whose default options are all set. Any other product makes the button a link to its page.', 'sgs-blocks' ) }
			value={ value > 0 ? value : null }
			options={ withChosen }
			onFilterValueChange={ setSearch }
			onChange={ ( next ) => onChange( Number( next ) || 0 ) }
			__next40pxDefaultSize
			__nextHasNoMarginBottom
		/>
	);
}
