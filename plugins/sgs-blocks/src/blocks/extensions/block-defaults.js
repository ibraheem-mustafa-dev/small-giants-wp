/**
 * Block Defaults extension - "Save as Default" for SGS blocks.
 *
 * Two features:
 * 1. "Save as Default" button in the inspector Advanced panel — stores current
 *    attribute values to wp_options via REST API (admin only).
 * 2. New instances start from the saved values — they become the initial
 *    attributes of every block inserted from the inserter (Spec 02 "Block
 *    Defaults System": new insertions inherit, existing instances are
 *    unaffected). The attribute schema keeps block.json's defaults, so a block
 *    that never set a value previews exactly what render.php paints, and an
 *    inserted block stores the saved values in its own markup, where the front
 *    end reads them. Defaults are output by PHP as window.sgsBlockDefaults on
 *    editor load.
 */
import { addFilter } from '@wordpress/hooks';

/** Name of the inserter variation that carries the site defaults. */
export const SITE_DEFAULT_VARIATION = 'sgs-site-default';

/** Attributes never seeded: WP internals and per-instance identity (PHP twin: Block_Defaults::NOT_DEFAULTS). */
export const NOT_DEFAULTS = [ 'lock', 'className', 'style', 'metadata', 'anchor', 'formId' ];

// A variation's scopes; WordPress treats an undeclared scope as [ 'block', 'inserter' ].
const scopesOf = ( variation ) => ( Array.isArray( variation.scope ) ? variation.scope : [ 'block', 'inserter' ] );
const insertable = ( variation ) => scopesOf( variation ).includes( 'inserter' );

/**
 * Seed a block's inserter entries with its saved site defaults.
 *
 * Every inserter-scoped variation starts from the saved values, its own
 * attributes winning; a block with no default inserter variation gains one
 * (`isDefault`, so it replaces the block's own inserter entry with the same
 * title and icon). The attribute schema is not touched.
 *
 * @param {Object} settings Block settings.
 * @param {string} name     Block name (e.g. "sgs/hero").
 * @return {Object} Settings with seeded inserter variations.
 */
export function applyBlockDefaults( settings, name ) {
	const saved = window.sgsBlockDefaults?.[ name ];
	if ( ! saved || typeof saved !== 'object' || Array.isArray( saved ) ) {
		return settings;
	}
	// Keys the block does not declare when it is inserted are dropped by createBlock.
	const initial = Object.fromEntries( Object.entries( saved ).filter( ( [ key ] ) => ! NOT_DEFAULTS.includes( key ) ) );
	if ( ! Object.keys( initial ).length ) {
		return settings;
	}

	// Only the inserter is seeded. A variation that also switches an existing block (its `block` or `transform` scope)
	// is split: that copy keeps its own attributes, so switching never overwrites a block's settings with the defaults.
	const variations = ( settings.variations || [] ).flatMap( ( variation ) => {
		if ( ! insertable( variation ) ) {
			return [ variation ];
		}
		const seeded = { ...variation, scope: [ 'inserter' ], attributes: { ...initial, ...( variation.attributes || {} ) } };
		const others = scopesOf( variation ).filter( ( s ) => 'inserter' !== s );
		return others.length ? [ { ...variation, scope: others }, seeded ] : [ seeded ];
	} );
	if ( ! variations.some( ( variation ) => variation.isDefault && insertable( variation ) ) ) {
		variations.unshift( {
			name: SITE_DEFAULT_VARIATION,
			isDefault: true,
			scope: [ 'inserter' ],
			attributes: initial,
		} );
	}

	return { ...settings, variations };
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
					path: '/sgs-blocks/v1/defaults',
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
