/**
 * Custom CSS extension - adds a textarea to the block inspector
 * allowing per-block scoped CSS rules.
 *
 * The CSS is scoped automatically to `.sgs-custom-{uniqueId}` on the
 * block wrapper, preventing style leakage between blocks.
 *
 * Server-side: includes/custom-css.php handles output and scoping.
 */
import { addFilter } from '@wordpress/hooks';
import { InspectorAdvancedControls } from '@wordpress/block-editor';
import { TextareaControl } from '@wordpress/components';
import { createHigherOrderComponent } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';

// Add `sgsCustomCss` attribute to every block.
function addCustomCssAttribute( settings ) {
	if ( ! settings.attributes ) {
		return settings;
	}
	return {
		...settings,
		attributes: {
			...settings.attributes,
			sgsCustomCss: { type: 'string', default: '' },
		},
	};
}
addFilter(
	'blocks.registerBlockType',
	'sgs/custom-css-attribute',
	addCustomCssAttribute
);

// Add the textarea to every block's inspector Advanced panel.
const withCustomCssControl = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { attributes, setAttributes, isSelected } = props;
		const { sgsCustomCss } = attributes;

		return (
			<>
				<BlockEdit { ...props } />
				{ isSelected && (
					<InspectorAdvancedControls>
						<TextareaControl
							label={ __( 'Custom CSS', 'sgs-blocks' ) }
							help={ __(
								'CSS rules applied to this block only. Use &selector to target the block wrapper.',
								'sgs-blocks'
							) }
							value={ sgsCustomCss || '' }
							onChange={ ( val ) =>
								setAttributes( { sgsCustomCss: val } )
							}
							rows={ 6 }
							__nextHasNoMarginBottom
						/>
					</InspectorAdvancedControls>
				) }
			</>
		);
	};
}, 'withCustomCssControl' );

addFilter(
	'editor.BlockEdit',
	'sgs/custom-css-control',
	withCustomCssControl
);

// Save filter - attribute is stored in block comment markup by default.
function saveCustomCssAttribute( extraProps ) {
	return extraProps;
}
addFilter(
	'blocks.getSaveContent.extraProps',
	'sgs/custom-css-save',
	saveCustomCssAttribute
);
