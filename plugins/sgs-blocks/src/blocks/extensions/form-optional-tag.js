/**
 * The per-field "Optional" tag switch for the form field blocks (Spec 04 FR-4-13).
 *
 * Every field block whose block.json declares the `optionalTag` attribute gets a toggle in its inspector and an
 * editor-canvas preview of the tag. The blocks are found by that attribute, so there is no second list to keep.
 * The tag's text and look belong to the parent `sgs/form` (optionalText, optional typography and colour); the
 * front end prints it from includes/forms/field-render-helpers.php::field_optional_tag.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';
import { getBlockType } from '@wordpress/blocks';
import { InspectorControls, store as blockEditorStore } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';

const FORM_BLOCK = 'sgs/form';
const hasOptionalTag = ( name ) => !! getBlockType( name )?.attributes?.optionalTag;

/** Guard against double registration (a CJS + ESM double-load would register every filter twice). */
if ( ! window.__sgsFormOptionalTagRegistered ) {
	window.__sgsFormOptionalTagRegistered = true;

	const withOptionalTagControl = createHigherOrderComponent(
		( BlockEdit ) => ( props ) => {
			if ( ! hasOptionalTag( props.name ) ) {
				return <BlockEdit { ...props } />;
			}
			const { attributes, setAttributes } = props;
			const required = !! attributes.required;
			return (
				<>
					<BlockEdit { ...props } />
					<InspectorControls>
						<PanelBody title={ __( 'Optional tag', 'sgs-blocks' ) } initialOpen={ false }>
							<ToggleControl
								label={ __( 'Show the Optional tag', 'sgs-blocks' ) }
								checked={ !! attributes.optionalTag && ! required }
								disabled={ required }
								help={ __( 'Shown only when the field is not required. The form sets the tag\'s text and look.', 'sgs-blocks' ) }
								onChange={ ( optionalTag ) => setAttributes( { optionalTag } ) }
								__nextHasNoMarginBottom
							/>
						</PanelBody>
					</InspectorControls>
				</>
			);
		},
		'withOptionalTagControl'
	);
	addFilter( 'editor.BlockEdit', 'sgs/form-optional-tag/controls', withOptionalTagControl );

	/** The canvas wrapper carries the tag text as a custom property that editor.scss prints after the label. */
	const withOptionalTagPreview = createHigherOrderComponent( ( BlockListBlock ) => ( props ) => {
		const { name, attributes, clientId } = props;
		const target = hasOptionalTag( name );
		const formText = useSelect(
			( select ) => {
				if ( ! target ) {
					return '';
				}
				const store = select( blockEditorStore );
				const formId = store.getBlockParentsByBlockName( clientId, FORM_BLOCK )?.slice( -1 )[ 0 ];
				return formId ? String( store.getBlockAttributes( formId )?.optionalText ?? '' ).trim() : '';
			},
			[ target, clientId ]
		);
		if ( ! target || ! attributes.optionalTag || attributes.required ) {
			return <BlockListBlock { ...props } />;
		}
		const text = formText || __( 'Optional', 'sgs-blocks' );
		const wrapperProps = {
			...( props.wrapperProps || {} ),
			className: [ props.wrapperProps?.className, 'sgs-form-field--optional-tag' ].filter( Boolean ).join( ' ' ),
			style: { ...( props.wrapperProps?.style || {} ), '--sgs-optional-tag': JSON.stringify( text ) },
		};
		return <BlockListBlock { ...props } wrapperProps={ wrapperProps } />;
	}, 'withOptionalTagPreview' );
	addFilter( 'editor.BlockListBlock', 'sgs/form-optional-tag/preview', withOptionalTagPreview );
}
