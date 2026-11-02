/**
 * Inspector panel for a multi-step form's progress steps: how the steps sit and the optional "Step 2 of 4" counter.
 * The counter's colour sits in the form's colour panel and its type in the Typography panel.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, TextControl, ToggleControl } from '@wordpress/components';

const STEP_LAYOUT_OPTIONS = [
	{ label: __( 'Stacked (number above label)', 'sgs-blocks' ), value: 'stacked' },
	{ label: __( 'Inline (number beside label)', 'sgs-blocks' ), value: 'inline' },
];

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The panel.
 */
export default function StepSettingsPanel( { attributes, setAttributes } ) {
	const { stepLayout, stepCounter, stepCounterLabel } = attributes;

	return (
		<PanelBody title={ __( 'Progress steps', 'sgs-blocks' ) } initialOpen={ false }>
			<SelectControl
				label={ __( 'Step layout', 'sgs-blocks' ) }
				value={ stepLayout || 'stacked' }
				options={ STEP_LAYOUT_OPTIONS }
				onChange={ ( value ) => setAttributes( { stepLayout: value } ) }
				help={ __( 'Inline puts each step’s number beside its label and shares the width equally. Labels still hide in a narrow form.', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<ToggleControl
				label={ __( 'Show a step counter', 'sgs-blocks' ) }
				checked={ !! stepCounter }
				onChange={ ( value ) => setAttributes( { stepCounter: value } ) }
				help={ __( 'A line such as “Step 2 of 4” above the fields of a multi-step form.', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
			/>
			{ stepCounter && (
				<TextControl
					label={ __( 'Counter wording', 'sgs-blocks' ) }
					value={ stepCounterLabel ?? '' }
					onChange={ ( value ) => setAttributes( { stepCounterLabel: value } ) }
					help={ __( '%1$d is the current step and %2$d the number of steps.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</PanelBody>
	);
}
