/**
 * CategoryPanel — sub-panel for the content-collection block editor.
 *
 * Fetches terms for `{contentType}_cat` taxonomy and presents a SelectControl.
 *
 * Extracted from edit.js (B3 — QC refactor, file-length compliance).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, Spinner } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * @param {Object}   props
 * @param {string}   props.contentType   Post type slug (drives taxonomy slug).
 * @param {number}   props.categoryTerm  Currently selected term ID.
 * @param {Function} props.setAttributes Block attribute setter.
 */
export default function CategoryPanel( { contentType, categoryTerm, setAttributes } ) {
	const [ terms, setTerms ] = useState( [] );
	const [ loading, setLoading ] = useState( false );

	const taxSlug = contentType + '_cat';

	useEffect( () => {
		let cancelled = false;
		setLoading( true );
		apiFetch( {
			path: `/wp/v2/${ taxSlug }?per_page=100&orderby=name&order=asc`,
		} )
			.then( ( data ) => {
				if ( ! cancelled ) {
					setTerms( data || [] );
				}
			} )
			.catch( () => {
				if ( ! cancelled ) {
					setTerms( [] );
				}
			} )
			.finally( () => {
				if ( ! cancelled ) {
					setLoading( false );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ taxSlug ] );

	const options = [
		{ value: 0, label: __( '— All categories —', 'sgs-blocks' ) },
		...terms.map( ( t ) => ( {
			value: t.id,
			label: t.name,
		} ) ),
	];

	if ( loading ) {
		return <Spinner />;
	}

	return (
		<SelectControl
			label={ __( 'Category', 'sgs-blocks' ) }
			value={ categoryTerm }
			options={ options }
			onChange={ ( v ) =>
				setAttributes( { categoryTerm: parseInt( v, 10 ) || 0 } )
			}
			__nextHasNoMarginBottom
		/>
	);
}
