import { __ } from '@wordpress/i18n';
import { SelectControl, ToggleControl } from '@wordpress/components';
import SgsFreeTextField from '../../components/SgsFreeTextField';
import { IconPicker, ResponsiveOverride, SgsLengthControl } from '../../components';
import { NumberControl } from '../../components/primitives';

/**
 * The words on the form's own buttons (Submit, and a multi-step form's Next and Previous; an emptied field shows the
 * default words), the icon on them and the note at the left of the buttons row.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    The form block's attributes.
 * @param {Function} props.setAttributes The form block's attribute setter.
 * @return {Element} The label fields, the icon controls and the note fields.
 */
export default function ButtonLabelControls( { attributes, setAttributes } ) {
	return (
		<>
			<SgsFreeTextField
				type="rich"
				noLink
				label={ __( 'Button Label', 'sgs-blocks' ) }
				value={ attributes.submitLabel ?? '' }
				onChange={ ( value ) => setAttributes( { submitLabel: value } ) }
			/>
			<SgsFreeTextField
				type="rich"
				noLink
				label={ __( 'Next button label (multi-step)', 'sgs-blocks' ) }
				value={ attributes.nextLabel ?? '' }
				onChange={ ( value ) => setAttributes( { nextLabel: value } ) }
			/>
			<SgsFreeTextField
				type="rich"
				noLink
				label={ __( 'Previous button label (multi-step)', 'sgs-blocks' ) }
				value={ attributes.prevLabel ?? '' }
				onChange={ ( value ) => setAttributes( { prevLabel: value } ) }
			/>
			<IconPicker
				label={ __( 'Button icon', 'sgs-blocks' ) }
				/* render.php draws a Lucide icon after the Next and Submit labels and a mirrored copy before Previous's label. */
				sources={ [ 'lucide' ] }
				value={ attributes.navIcon ? { source: 'lucide', name: attributes.navIcon } : null }
				onChange={ ( val ) => setAttributes( { navIcon: val ? val.name : '' } ) }
			/>
			{ attributes.navIcon && (
				<>
					<NumberControl
						label={ __( 'Button icon size (px)', 'sgs-blocks' ) }
						value={ attributes.navIconSize ?? 18 }
						min={ 1 }
						onChange={ ( value ) => setAttributes( { navIconSize: value ? parseFloat( value ) : 18 } ) }
						__next40pxDefaultSize
					/>
					<SgsLengthControl
						presets
						label={ __( 'Gap between icon and label', 'sgs-blocks' ) }
						value={ attributes.navIconGap ?? '10px' }
						onChange={ ( value ) => setAttributes( { navIconGap: value || '10px' } ) }
					/>
					<NumberControl
						label={ __( 'Button icon stroke width', 'sgs-blocks' ) }
						value={ attributes.navIconStrokeWidth ?? '' }
						min={ 0.5 }
						step={ 0.1 }
						help={ __( 'Line thickness of the icon. Empty keeps 2.', 'sgs-blocks' ) }
						onChange={ ( value ) => setAttributes( { navIconStrokeWidth: value ? parseFloat( value ) : '' } ) }
						__next40pxDefaultSize
					/>
				</>
			) }
			<ResponsiveOverride
				label={ __( 'Next button fills the row', 'sgs-blocks' ) }
				value={ attributes.nextButtonFill }
				onChange={ ( obj ) => setAttributes( { nextButtonFill: obj } ) }
			>
				{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
					<ToggleControl
						label={ __( 'Next and Submit fill the row on this device', 'sgs-blocks' ) }
						checked={ true === ( '' === ownValue ? effectiveValue : ownValue ) }
						onChange={ ( value ) => setOwnValue( value ? true : ( 'desktop' === tier ? undefined : false ) ) }
						__nextHasNoMarginBottom
					/>
				) }
			</ResponsiveOverride>
			<ResponsiveOverride
				label={ __( 'Gap between the buttons', 'sgs-blocks' ) }
				value={ attributes.actionsGap }
				onChange={ ( obj ) => setAttributes( { actionsGap: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
					<SgsLengthControl
						presets={ false }
						label={ __( 'Gap between the buttons', 'sgs-blocks' ) }
						hideLabelFromVision
						value={ ownValue ?? '' }
						placeholder={ inherited ? effectiveValue : '' }
						onChange={ ( val ) => setOwnValue( val || undefined ) }
					/>
				) }
			</ResponsiveOverride>
			<ResponsiveOverride
				label={ __( 'Align the buttons vertically', 'sgs-blocks' ) }
				value={ attributes.actionsAlignItems }
				onChange={ ( obj ) => setAttributes( { actionsAlignItems: obj } ) }
			>
				{ ( { ownValue, effectiveValue, setOwnValue } ) => (
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Align the buttons vertically', 'sgs-blocks' ) }
						hideLabelFromVision
						value={ ownValue ?? '' }
						options={ [
							{ label: effectiveValue ? __( 'Same as the larger device', 'sgs-blocks' ) : __( 'Stretch to the tallest button', 'sgs-blocks' ), value: '' },
							{ label: __( 'Top', 'sgs-blocks' ), value: 'flex-start' },
							{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
							{ label: __( 'Bottom', 'sgs-blocks' ), value: 'flex-end' },
							{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
							{ label: __( 'Text baseline', 'sgs-blocks' ), value: 'baseline' },
						] }
						onChange={ ( val ) => setOwnValue( val || undefined ) }
					/>
				) }
			</ResponsiveOverride>
			<SgsFreeTextField
				type="rich"
				noLink
				label={ __( 'Note beside the buttons', 'sgs-blocks' ) }
				value={ attributes.actionsNote ?? '' }
				onChange={ ( value ) => setAttributes( { actionsNote: value } ) }
				help={ __( 'Short text at the left of the buttons row. Pair it with Space between in Button alignment.', 'sgs-blocks' ) }
			/>
			{ !! attributes.actionsNote && (
				<ToggleControl
					label={ __( 'Show the note on the first step only', 'sgs-blocks' ) }
					checked={ false !== attributes.actionsNoteFirstStepOnly }
					onChange={ ( value ) => setAttributes( { actionsNoteFirstStepOnly: value } ) }
					__nextHasNoMarginBottom
				/>
			) }
			{ !! attributes.actionsNote && (
				<ResponsiveOverride
					label={ __( 'Hide the note', 'sgs-blocks' ) }
					value={ attributes.actionsNoteHidden }
					onChange={ ( obj ) => setAttributes( { actionsNoteHidden: obj } ) }
				>
					{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
						<ToggleControl
							label={ __( 'Hide the note on this device', 'sgs-blocks' ) }
							checked={ true === ( '' === ownValue ? effectiveValue : ownValue ) }
							onChange={ ( value ) => setOwnValue( value ? true : ( 'desktop' === tier ? undefined : false ) ) }
							__nextHasNoMarginBottom
						/>
					) }
				</ResponsiveOverride>
			) }
		</>
	);
}
