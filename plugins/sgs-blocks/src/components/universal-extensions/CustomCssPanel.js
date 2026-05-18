/**
 * CustomCssPanel — shared Inspector panel for per-block custom CSS.
 *
 * Renders a textarea for scoped CSS rules. This component is a convenience
 * wrapper around the control already provided globally by
 * src/blocks/extensions/custom-css.js (which registers it on all blocks via
 * addFilter('editor.BlockEdit')). Use this panel directly inside a block's
 * edit.js when you want the control at a specific inspector position rather
 * than in the Advanced panel.
 *
 * NOTE: custom-css.js already wires this control to every block globally via
 * InspectorAdvancedControls. Only import this component if you need it in a
 * custom PanelBody position.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextareaControl } from '@wordpress/components';

/**
 * CustomCssPanel component.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes object.
 * @param {Function} props.setAttributes Block setAttributes callback.
 * @return {JSX.Element} Inspector panel.
 */
export default function CustomCssPanel( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Custom CSS', 'sgs-blocks' ) }
				initialOpen={ false }
			>
				<TextareaControl
					label={ __( 'Custom CSS', 'sgs-blocks' ) }
					help={ __(
						'CSS rules applied to this block only. Use &selector to target the block wrapper.',
						'sgs-blocks'
					) }
					value={ attributes.sgsCustomCss || '' }
					onChange={ ( val ) =>
						setAttributes( { sgsCustomCss: val } )
					}
					rows={ 8 }
					__nextHasNoMarginBottom
				/>
			</PanelBody>
		</InspectorControls>
	);
}
