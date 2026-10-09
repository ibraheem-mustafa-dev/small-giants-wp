/**
 * sgs/icon inspector: the Label panel (the optional visible label: show, text, position, gap and typography). The
 * label's colours are a row of the block's one Colour panel (inspector.js).
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { PanelBody, SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import { ResponsiveControl, SgsLengthControl, TypographyControls } from '../../components';
import { patchTier } from '../../utils';

const POSITION_OPTIONS = [
	{ label: __( 'After the icon', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Before the icon', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Below the icon', 'sgs-blocks' ), value: 'below' },
];

const GAP_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes (the icon's own).
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {Object}   props.state         { labelOn (a label shows, the row's switch included), labelFromRow (the row
 *                                       switched it on), defaultLabel (the text a blank label shows) }.
 * @return {JSX.Element} The Label panel.
 */
export default function IconLabelPanel( { attributes, setAttributes, state } ) {
	const { showLabel, labelText, labelPosition, labelGap } = attributes;
	const { labelOn, labelFromRow, defaultLabel } = state;

	return (
		<PanelBody title={ __( 'Label', 'sgs-blocks' ) } initialOpen={ !! labelOn }>
			<ToggleControl
				label={ __( 'Show a label', 'sgs-blocks' ) }
				help={
					labelFromRow
						? __( 'The Social Icons row shows a label on every icon.', 'sgs-blocks' )
						: __( 'Shows text beside the icon. Screen readers then read the label as the link name.', 'sgs-blocks' )
				}
				checked={ !! showLabel }
				onChange={ ( value ) => setAttributes( { showLabel: value } ) }
				__nextHasNoMarginBottom
			/>
			{ labelOn && (
				<>
					<TextControl
						label={ __( 'Label text', 'sgs-blocks' ) }
						help={
							defaultLabel
								? sprintf(
										/* translators: %s: the text a blank label shows. */
										__( 'Blank: "%s".', 'sgs-blocks' ),
										defaultLabel
								  )
								: __( 'Type the text to show.', 'sgs-blocks' )
						}
						value={ labelText }
						onChange={ ( value ) => setAttributes( { labelText: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Position', 'sgs-blocks' ) }
						value={ labelPosition || 'end' }
						options={ POSITION_OPTIONS }
						onChange={ ( value ) => setAttributes( { labelPosition: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ResponsiveControl label={ __( 'Space between icon and label', 'sgs-blocks' ) }>
						{ ( tier ) => (
							<SgsLengthControl
								label={ __( 'Space between icon and label', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ labelGap?.[ tier ] ?? '' }
								units={ GAP_UNITS }
								presets
								onChange={ ( value ) => patchTier( attributes, setAttributes, 'labelGap', tier, value || undefined ) }
							/>
						) }
					</ResponsiveControl>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="label"
						fontSizePresets
						showFontFamily
						showDecoration
						showTransform
						showLetterSpacing
						showTextWrap
					/>
				</>
			) }
		</PanelBody>
	);
}
