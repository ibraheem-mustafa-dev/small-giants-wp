/**
 * Block Defaults extension - "Save as Default" for SGS blocks.
 *
 * Two features:
 * 1. "Save as Default" button in the inspector Advanced panel — stores current
 *    attribute values to wp_options via REST API (admin only).
 * 2. Auto-seed new block instances — merges saved defaults into each block's
 *    attribute definitions when it registers, so new insertions use saved values.
 *    Defaults are output by PHP as window.sgsBlockDefaults on editor load.
 */
import { addFilter } from '@wordpress/hooks';

// ── Feature 2: seed new instances with saved defaults ────────────────────────
/**
 * Merge any saved defaults into a block's attribute definitions.
 * When a new block is inserted, WordPress uses the `default` value from the
 * attribute schema — so updating those defaults here is all we need.
 *
 * @param {Object} settings Block settings.
 * @param {string} name     Block name (e.g. "sgs/hero").
 * @return {Object} Settings with merged defaults.
 */
function applyBlockDefaults( settings, name ) {
	const saved = window.sgsBlockDefaults?.[ name ];
	if ( ! saved || typeof saved !== 'object' ) {
		return settings;
	}

	const merged = { ...( settings.attributes || {} ) };
	Object.entries( saved ).forEach( ( [ key, value ] ) => {
		if ( merged[ key ] !== undefined ) {
			merged[ key ] = { ...merged[ key ], default: value };
		}
	} );

	return { ...settings, attributes: merged };
}

addFilter(
	'blocks.registerBlockType',
	'sgs/apply-block-defaults',
	applyBlockDefaults
);
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
