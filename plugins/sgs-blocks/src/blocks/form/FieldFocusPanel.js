/**
 * The focused-field look and the floated-label size: border width and ring (thickness and side) of a focused field
 * control, and the size a floating label shrinks to once it has moved up. The focus ground, border colour and ring
 * colour are rows in the form's Colours panel. render.php prints these through includes/forms/field-focus-css.php.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem, NumberControl } from '../../components/primitives';
import { ResponsiveLengthControl, SgsBoxControl, BOX_UNITS } from '../../components';

const RING_STYLE_OPTIONS = [
	{ label: __( 'Outside the border', 'sgs-blocks' ), value: '' },
	{ label: __( 'Inside the border', 'sgs-blocks' ), value: 'inset' },
];

const hasKeys = ( value ) => Object.keys( value ?? {} ).length > 0;

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Form attributes (fieldFocus* and labelFloatedFontSize).
 * @param {Function} props.setAttributes Form attribute setter.
 * @return {JSX.Element} The panel.
 */
export default function FieldFocusPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Field focus and floating label', 'sgs-blocks' ) } initialOpen={ false }>
			<ToolsPanel
				label={ __( 'Focused field', 'sgs-blocks' ) }
				resetAll={ () => setAttributes( { fieldFocusBorderWidth: {}, fieldFocusRingWidth: 0, fieldFocusRingStyle: '' } ) }
			>
				<ToolsPanelItem
					label={ __( 'Focus border width', 'sgs-blocks' ) }
					isShownByDefault
					hasValue={ () => hasKeys( attributes.fieldFocusBorderWidth ) }
					onDeselect={ () => setAttributes( { fieldFocusBorderWidth: {} } ) }
				>
					<SgsBoxControl
						label={ __( 'Focus border width', 'sgs-blocks' ) }
						values={ attributes.fieldFocusBorderWidth ?? {} }
						units={ BOX_UNITS }
						onChange={ ( next ) => setAttributes( { fieldFocusBorderWidth: next } ) }
					/>
				</ToolsPanelItem>
				<ToolsPanelItem
					label={ __( 'Focus ring thickness', 'sgs-blocks' ) }
					isShownByDefault
					hasValue={ () => Number( attributes.fieldFocusRingWidth ) > 0 }
					onDeselect={ () => setAttributes( { fieldFocusRingWidth: 0 } ) }
				>
					<NumberControl
						label={ __( 'Focus ring thickness (px)', 'sgs-blocks' ) }
						value={ attributes.fieldFocusRingWidth || '' }
						min={ 0 }
						max={ 12 }
						help={ __( 'Used once a Focus ring colour is set in Colours. Empty is 2px.', 'sgs-blocks' ) }
						__next40pxDefaultSize
						onChange={ ( value ) => setAttributes( { fieldFocusRingWidth: Number( value ) || 0 } ) }
					/>
				</ToolsPanelItem>
				<ToolsPanelItem
					label={ __( 'Focus ring side', 'sgs-blocks' ) }
					isShownByDefault
					hasValue={ () => '' !== ( attributes.fieldFocusRingStyle ?? '' ) }
					onDeselect={ () => setAttributes( { fieldFocusRingStyle: '' } ) }
				>
					<SelectControl
						label={ __( 'Focus ring side', 'sgs-blocks' ) }
						value={ attributes.fieldFocusRingStyle ?? '' }
						options={ RING_STYLE_OPTIONS }
						help={ __( 'A set ring replaces the site focus outline and glow on field controls. The border colour and width above still change on focus.', 'sgs-blocks' ) }
						onChange={ ( fieldFocusRingStyle ) => setAttributes( { fieldFocusRingStyle } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</ToolsPanelItem>
			</ToolsPanel>
			<ToolsPanel
				label={ __( 'Floating label', 'sgs-blocks' ) }
				resetAll={ () => setAttributes( { labelFloatedFontSize: {} } ) }
			>
				<ToolsPanelItem
					label={ __( 'Floated label size', 'sgs-blocks' ) }
					isShownByDefault
					hasValue={ () => hasKeys( attributes.labelFloatedFontSize ) }
					onDeselect={ () => setAttributes( { labelFloatedFontSize: {} } ) }
				>
					<ResponsiveLengthControl
						label={ __( 'Floated label size', 'sgs-blocks' ) }
						value={ attributes.labelFloatedFontSize }
						scale="font-size"
						onChange={ ( next ) => setAttributes( { labelFloatedFontSize: next } ) }
					/>
				</ToolsPanelItem>
			</ToolsPanel>
		</PanelBody>
	);
}
