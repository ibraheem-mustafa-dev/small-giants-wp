import { __ } from '@wordpress/i18n';
import { ToggleControl } from '@wordpress/components';
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
				</>
			) }
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
