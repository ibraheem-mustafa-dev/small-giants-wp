/**
 * Block Defaults extension - "Save as Default" for SGS blocks.
 *
 * Adds a button to the inspector Advanced panel for any sgs/* block.
 * Clicking it saves current attribute values as defaults for new instances.
 *
 * TODO: "Apply saved defaults to new blocks" (seeding new instances on insert)
 * requires a blocks.getBlockDefaultClassName filter or a useSelect hook that
 * fetches from the REST API on block init. Deferred to a future phase.
 */
import { addFilter } from '@wordpress/hooks';
import { InspectorAdvancedControls } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

const withSaveAsDefault = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { attributes, name, isSelected } = props;
		const [ status, setStatus ] = useState( null ); // null | 'saving' | 'saved' | 'error'

		// Only show for SGS blocks.
		if ( ! name.startsWith( 'sgs/' ) ) {
			return <BlockEdit { ...props } />;
		}

		const handleSave = async () => {
			setStatus( 'saving' );
			try {
				await apiFetch( {
					path: `/sgs-blocks/v1/defaults/${ name }`,
					method: 'POST',
					data: { block: name, attributes },
				} );
				setStatus( 'saved' );
				setTimeout( () => setStatus( null ), 3000 );
			} catch ( err ) {
				setStatus( 'error' );
				setTimeout( () => setStatus( null ), 4000 );
			}
		};

		const statusLabel =
			status === 'saved'
				? __( 'Saved as default', 'sgs-blocks' )
				: status === 'error'
					? __( 'Failed to save', 'sgs-blocks' )
					: __( 'Save as Default', 'sgs-blocks' );

		return (
			<>
				<BlockEdit { ...props } />
				{ isSelected && (
					<InspectorAdvancedControls>
						<Button
							variant="secondary"
							onClick={ handleSave }
							isBusy={ status === 'saving' }
							disabled={ status === 'saving' }
							style={ {
								width: '100%',
								justifyContent: 'center',
							} }
						>
							{ statusLabel }
						</Button>
					</InspectorAdvancedControls>
				) }
			</>
		);
	};
}, 'withSaveAsDefault' );

addFilter(
	'editor.BlockEdit',
	'sgs/block-defaults',
	withSaveAsDefault
);
