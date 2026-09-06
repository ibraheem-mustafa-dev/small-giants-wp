/**
 * Fixture: SELECTCONTROL variant (quote's real BEFORE shape) -- a standalone
 * <SelectControl> for border style + local BORDER_STYLE_OPTIONS, unconditional
 * width control, single-state (no hover) colour row.
 */
import { ResponsiveBoxControl, SgsColourPanel } from '../../components';
const BORDER_STYLE_OPTIONS = [
	{ label: 'None', value: 'none' },
	{ label: 'Solid', value: 'solid' },
];

export default function Edit( { attributes, setAttributes } ) {
	const { borderStyle, borderColour, borderColourGradient, borderWidth } = attributes;
	return (
		<InspectorControls>
			<SgsColourPanel
				rows={ [
					{
						key: 'borderColour',
						label: __( 'Border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: borderColour,
								onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
								linked: true,
								gradientValue: borderColourGradient,
								onGradientChange: ( val ) => setAttributes( { borderColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
				<SelectControl
					label={ __( 'Border style', 'sgs-blocks' ) }
					value={ borderStyle }
					options={ BORDER_STYLE_OPTIONS }
					onChange={ ( val ) => setAttributes( { borderStyle: val } ) }
				/>
				<ResponsiveBoxControl
					label={ __( 'Border width', 'sgs-blocks' ) }
					presets={ [ '10', '20', '30' ] }
					values={ { base: borderWidth ?? {} } }
					showResponsive={ false }
					onChange={ ( tier, next ) => setAttributes( { borderWidth: next } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
