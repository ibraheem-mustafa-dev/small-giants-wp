/**
 * Inspector panel for a multi-step form's progress steps: how the steps sit and the optional "Step 2 of 4" counter.
 * The counter's colour sits in the form's colour panel and its type in the Typography panel.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import { FlexWrapControl, ResponsiveOverride, SgsLengthControl } from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

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
	const { stepLayout, stepCounter, stepCounterLabel, stepCounterNameSuffix, stepCounterNameHidden, progressTrackHeight, statusRowWrap, statusRowGap } = attributes;
	const item = ( label, keys, children, isShownByDefault = false ) => (
		<ToolsPanelItem
			label={ label }
			hasValue={ () => keys.some( ( key ) => {
				const value = attributes[ key ];
				return value && 'object' === typeof value ? Object.keys( value ).length > 0 : ( undefined !== value && '' !== value && false !== value );
			} ) }
			onDeselect={ () => setAttributes( Object.fromEntries( keys.map( ( key ) => [ key, undefined ] ) ) ) }
			isShownByDefault={ isShownByDefault }
		>
			{ children }
		</ToolsPanelItem>
	);

	return (
		<ToolsPanel
			label={ __( 'Progress steps', 'sgs-blocks' ) }
			resetAll={ () => setAttributes( {
				stepLayout: undefined,
				stepCounter: undefined,
				stepCounterLabel: undefined,
				stepCounterNameSuffix: undefined,
				stepCounterNameHidden: undefined,
				statusRowWrap: undefined,
				statusRowGap: undefined,
				progressTrackHeight: undefined,
			} ) }
		>
			{ item( __( 'Step layout', 'sgs-blocks' ), [ 'stepLayout' ], (
				<SelectControl
					label={ __( 'Step layout', 'sgs-blocks' ) }
					value={ stepLayout || 'stacked' }
					options={ STEP_LAYOUT_OPTIONS }
					onChange={ ( value ) => setAttributes( { stepLayout: value } ) }
					help={ __( 'Inline puts each step’s number beside its label and shares the width equally. Labels still hide in a narrow form.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			), true ) }
			{ item( __( 'Step counter', 'sgs-blocks' ), [ 'stepCounter' ], (
				<ToggleControl
					label={ __( 'Show a step counter', 'sgs-blocks' ) }
					checked={ !! stepCounter }
					onChange={ ( value ) => setAttributes( { stepCounter: value } ) }
					help={ __( 'A line such as “Step 2 of 4” above the fields of a multi-step form.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
				/>
			), true ) }
			{ stepCounter && item( __( 'Counter wording', 'sgs-blocks' ), [ 'stepCounterLabel' ], (
				<TextControl
					label={ __( 'Counter wording', 'sgs-blocks' ) }
					value={ stepCounterLabel ?? '' }
					onChange={ ( value ) => setAttributes( { stepCounterLabel: value } ) }
					help={ __( '%1$d is the current step and %2$d the number of steps.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			), true ) }
			{ stepCounter && item( __( 'Step name wording', 'sgs-blocks' ), [ 'stepCounterNameSuffix', 'stepCounterNameHidden' ], (
				<>
					<TextControl
						label={ __( 'Step name wording', 'sgs-blocks' ) }
						value={ stepCounterNameSuffix ?? '' }
						onChange={ ( value ) => setAttributes( { stepCounterNameSuffix: value } ) }
						help={ __( 'Printed after the counter; %3$s is the current step’s name, for example “ · %3$s”. Empty shows no name.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ !! stepCounterNameSuffix && (
						<ResponsiveOverride
							label={ __( 'Hide the step name', 'sgs-blocks' ) }
							value={ stepCounterNameHidden }
							onChange={ ( obj ) => setAttributes( { stepCounterNameHidden: obj } ) }
						>
							{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
								<ToggleControl
									label={ __( 'Hide the step name on this device', 'sgs-blocks' ) }
									checked={ true === ( '' === ownValue ? effectiveValue : ownValue ) }
									onChange={ ( value ) => setOwnValue( value ? true : ( 'desktop' === tier ? undefined : false ) ) }
									__nextHasNoMarginBottom
								/>
							) }
						</ResponsiveOverride>
					) }
				</>
			), true ) }
			{ stepCounter && item( __( 'Counter row wrap and gap', 'sgs-blocks' ), [ 'statusRowWrap', 'statusRowGap' ], (
				<>
					<FlexWrapControl
						label={ __( 'Wrap the counter row', 'sgs-blocks' ) }
						value={ statusRowWrap }
						onChange={ ( value ) => setAttributes( { statusRowWrap: value } ) }
					/>
					<ResponsiveOverride
						label={ __( 'Counter row gap', 'sgs-blocks' ) }
						value={ statusRowGap }
						onChange={ ( obj ) => setAttributes( { statusRowGap: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SgsLengthControl
								presets={ false }
								label={ __( 'Counter row gap', 'sgs-blocks' ) }
								hideLabelFromVision
								help={ __( 'Space between the counter and the saved-progress notice, and between their lines when they wrap.', 'sgs-blocks' ) }
								value={ ownValue ?? '' }
								placeholder={ inherited ? effectiveValue : '0.5rem' }
								onChange={ ( val ) => setOwnValue( val || undefined ) }
							/>
						) }
					</ResponsiveOverride>
				</>
			), true ) }
			{ item( __( 'Progress track height', 'sgs-blocks' ), [ 'progressTrackHeight' ], (
				<ResponsiveOverride
					label={ __( 'Progress track height', 'sgs-blocks' ) }
					value={ progressTrackHeight }
					onChange={ ( obj ) => setAttributes( { progressTrackHeight: obj } ) }
				>
					{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
						<SgsLengthControl
							presets={ false }
							label={ __( 'Progress track height', 'sgs-blocks' ) }
							hideLabelFromVision
							help={ __( 'Height of the bar the progress fill runs along; empty keeps the 4px fill. The track colour is in the colour panel.', 'sgs-blocks' ) }
							value={ ownValue ?? '' }
							placeholder={ inherited ? effectiveValue : '4px' }
							onChange={ ( val ) => setOwnValue( val || undefined ) }
						/>
					) }
				</ResponsiveOverride>
			), true ) }
		</ToolsPanel>
	);
}
