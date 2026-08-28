/**
 * Fixture: edge case -- SELECTCONTROL variant with the width control wrapped
 * in a `{ borderStyle !== 'none' && ( ... ) }` conditional guard (icon-list /
 * timeline's real shape). The guard must be recognised AND stripped on
 * emission -- the settled target shape (both reference examples) never
 * conditions width on style.
 */
const BORDER_STYLE_OPTIONS = [
	{ label: 'None', value: 'none' },
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
				{ borderStyle !== 'none' && (
					<ResponsiveBoxControl
						label={ __( 'Border width', 'sgs-blocks' ) }
						presets={ [ '10', '20', '30' ] }
						values={ { base: borderWidth ?? {} } }
						showResponsive={ false }
						onChange={ ( tier, next ) => setAttributes( { borderWidth: next } ) }
					/>
				) }
			</PanelBody>
		</InspectorControls>
	);
}
