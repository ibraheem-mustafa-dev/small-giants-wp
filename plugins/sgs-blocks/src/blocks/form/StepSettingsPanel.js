/**
 * Inspector panel for a multi-step form's progress steps: how the steps sit and the optional "Step 2 of 4" counter.
 * The counter's colour sits in the form's colour panel and its type in the Typography panel.
 *
 * @package SGS\Blocks
 */

import { spacingDefaultsFor } from '../../utils/spacing-defaults';
import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import { FlexWrapControl, ResponsiveOverride, SgsLengthControl, SgsBoxControl, BOX_UNITS, normaliseResponsiveBox, ShadowControl, shadowAttrKeys } from '../../components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

const PROGRESS_FILL_OPTIONS = [
	{ label: __( 'Counts the step being shown (step 1 of 5 = 20%)', 'sgs-blocks' ), value: 'current' },
	{ label: __( 'Counts finished steps only (0% on step 1, 100% on the last)', 'sgs-blocks' ), value: 'completed' },
];

const COMPLETED_ICON_OPTIONS = [
	{ label: __( 'The step number', 'sgs-blocks' ), value: 'number' },
	{ label: __( 'A check mark', 'sgs-blocks' ), value: 'tick' },
];

const STICKY_SHADOW_KEYS = shadowAttrKeys( 'actionsStickyShadow' );

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
	const { stepLayout, stepCounter, stepCounterLabel, stepCounterNameSuffix, stepCounterNameHidden, progressTrackHeight, statusRowWrap, statusRowGap, actionsTopPadding, statusRowMarginBottom, progressFill, stepCompletedIcon, actionsSticky, actionsStickyPadding, actionsStickyBleed } = attributes;
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
				actionsTopPadding: undefined,
				statusRowMarginBottom: undefined,
				progressTrackHeight: undefined,
				progressFill: undefined,
				stepCompletedIcon: undefined,
				actionsSticky: undefined,
				actionsStickyPadding: undefined,
				actionsStickyBleed: undefined,
				actionsStickyShadow: undefined,
				actionsStickyShadowColour: undefined,
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
			{ stepCounter && item( __( 'Counter row wrap and gap', 'sgs-blocks' ), [ 'statusRowWrap', 'statusRowGap', 'statusRowMarginBottom' ], (
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
					<SgsLengthControl
						presets={ false }
						label={ __( 'Counter row space below', 'sgs-blocks' ) }
						help={ __( 'Space under the counter row. Empty keeps 1rem.', 'sgs-blocks' ) }
						value={ statusRowMarginBottom ?? '' }
						placeholder="1rem"
						onChange={ ( val ) => setAttributes( { statusRowMarginBottom: val || undefined } ) }
					/>
				</>
			), true ) }
			{ item( __( 'Space above buttons', 'sgs-blocks' ), [ 'actionsTopPadding' ], (
				<ResponsiveOverride
					label={ __( 'Space above buttons', 'sgs-blocks' ) }
					value={ actionsTopPadding }
					onChange={ ( obj ) => setAttributes( { actionsTopPadding: obj } ) }
				>
					{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
						<SgsLengthControl
							presets={ false }
							label={ __( 'Space above buttons', 'sgs-blocks' ) }
							hideLabelFromVision
							help={ __( 'Gap between the last field and the buttons row. A sticky row uses its own padding setting.', 'sgs-blocks' ) }
							value={ ownValue ?? '' }
							placeholder={ inherited ? effectiveValue : '1rem' }
							onChange={ ( val ) => setOwnValue( val || undefined ) }
						/>
					) }
				</ResponsiveOverride>
			), true ) }
			{ item( __( 'Progress fill', 'sgs-blocks' ), [ 'progressFill' ], (
				<SelectControl
					label={ __( 'Progress fill counts', 'sgs-blocks' ) }
					value={ progressFill || 'current' }
					options={ PROGRESS_FILL_OPTIONS }
					onChange={ ( value ) => setAttributes( { progressFill: value } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			), true ) }
			{ item( __( 'Completed step marker', 'sgs-blocks' ), [ 'stepCompletedIcon' ], (
				<SelectControl
					label={ __( 'A completed step shows', 'sgs-blocks' ) }
					value={ stepCompletedIcon || 'number' }
					options={ COMPLETED_ICON_OPTIONS }
					onChange={ ( value ) => setAttributes( { stepCompletedIcon: value } ) }
					help={ __( 'The step name stays in the button’s accessible name either way. Bubble colours are in the colour panel.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			), true ) }
			{ item( __( 'Sticky buttons row', 'sgs-blocks' ), [ 'actionsSticky', 'actionsStickyPadding', 'actionsStickyBleed', 'actionsStickyShadow', 'actionsStickyShadowColour' ], (
				<>
					<ResponsiveOverride
						label={ __( 'Stick the buttons row to the bottom', 'sgs-blocks' ) }
						value={ actionsSticky }
						onChange={ ( obj ) => setAttributes( { actionsSticky: obj } ) }
					>
						{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
							<ToggleControl
								label={ __( 'Sticky on this device', 'sgs-blocks' ) }
								checked={ true === ( '' === ownValue ? effectiveValue : ownValue ) }
								onChange={ ( value ) => setOwnValue( value ? true : ( 'desktop' === tier ? undefined : false ) ) }
								help={ __( 'Pins Back / Next / Submit to the bottom of the screen while the form is in view. Colours are in the colour panel.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						value={ actionsStickyPadding }
						onChange={ ( obj ) => setAttributes( { actionsStickyPadding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Sticky row padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								defaults={ spacingDefaultsFor( 'sgs/form', 'actionsStickyPadding' ) }
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<SgsLengthControl
						presets={ false }
						label={ __( 'Sticky row side bleed', 'sgs-blocks' ) }
						help={ __( 'Set to the form card’s side padding so the row spans the card edge to edge. Empty = none.', 'sgs-blocks' ) }
						value={ actionsStickyBleed ?? '' }
						onChange={ ( val ) => setAttributes( { actionsStickyBleed: val || undefined } ) }
					/>
					<ShadowControl
						label={ __( 'Sticky row shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ STICKY_SHADOW_KEYS }
					/>
				</>
			), false ) }
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
