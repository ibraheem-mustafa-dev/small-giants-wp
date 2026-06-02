/**
 * HandpickedPanel — sub-panel for the content-collection block editor.
 *
 * Shows a searchable combobox listing all posts of the chosen content type.
 * Selected IDs are accumulated into the `handpickedIds` attribute array.
 *
 * Extracted from edit.js (B3 — QC refactor, file-length compliance).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { ComboboxControl, Spinner } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { useState } from '@wordpress/element';

/**
 * @param {Object}   props
 * @param {string}   props.contentType    Post type slug to search.
 * @param {number[]} props.handpickedIds  Currently selected post IDs.
 * @param {Function} props.setAttributes  Block attribute setter.
 */
export default function HandpickedPanel( { contentType, handpickedIds, setAttributes } ) {
	const [ search, setSearch ] = useState( '' );

	const { records, isResolving } = useSelect(
		( select ) => {
			const query = {
				per_page: 20,
				search: search || undefined,
				orderby: 'title',
				order: 'asc',
			};
			return {
				records: select( coreStore ).getEntityRecords(
					'postType',
					contentType,
					query
				),
				isResolving: select( coreStore ).isResolving(
					'getEntityRecords',
					[ 'postType', contentType, query ]
				),
			};
		},
		[ contentType, search ]
	);

	const options = ( records || [] ).map( ( p ) => ( {
		value: p.id,
		label: p.title?.rendered || __( '(no title)', 'sgs-blocks' ),
	} ) );

	function onSelect( value ) {
		if ( ! value ) {
			return;
		}
		const id = parseInt( value, 10 );
		if ( ! handpickedIds.includes( id ) ) {
			setAttributes( { handpickedIds: [ ...handpickedIds, id ] } );
		}
	}

	function removeId( id ) {
		setAttributes( {
			handpickedIds: handpickedIds.filter( ( i ) => i !== id ),
		} );
	}

	return (
		<>
			<ComboboxControl
				label={ __( 'Add item', 'sgs-blocks' ) }
				help={ __(
					'Search and add items. Order reflects the list below.',
					'sgs-blocks'
				) }
				value={ null }
				options={ options }
				onChange={ onSelect }
				onFilterValueChange={ setSearch }
				__nextHasNoMarginBottom
			/>
			{ isResolving && <Spinner /> }
			{ handpickedIds.length > 0 && (
				<ul style={ { margin: '8px 0 0', padding: 0, listStyle: 'none' } }>
					{ handpickedIds.map( ( id ) => {
						const found = ( records || [] ).find(
							( p ) => p.id === id
						);
						const label = found
							? found.title?.rendered || `#${ id }`
							: `#${ id }`;
						return (
							<li
								key={ id }
								style={ {
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									padding: '4px 0',
									borderBottom: '1px solid #e0e0e0',
									fontSize: '12px',
								} }
							>
								<span>{ label }</span>
								<button
									type="button"
									onClick={ () => removeId( id ) }
									style={ {
										background: 'none',
										border: 'none',
										cursor: 'pointer',
										color: '#cc1818',
										minWidth: 44,
										minHeight: 44,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
									} }
									aria-label={ __( 'Remove item', 'sgs-blocks' ) }
								>
									✕
								</button>
							</li>
						);
					} ) }
				</ul>
			) }
		</>
	);
}
