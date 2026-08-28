/**
 * Fixture: COLOURROWS_EMBEDDED variant (product-card's real BEFORE shape) --
 * borderStyle/onBorderStyleChange live as extra properties on the SAME
 * colour-row object literal, no separate <SelectControl>.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { borderStyle, borderColour, borderColourGradient, borderWidth } = attributes;
	return (
		<InspectorControls>
			<SgsColourPanel
				rows={ [
					{
						key: 'cardBorder',
						label: __( 'Card border colour', 'sgs-blocks' ),
						borderStyle,
						onBorderStyleChange: ( val ) => setAttributes( { borderStyle: val } ),
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
			<PanelBody title={ __( 'Card border', 'sgs-blocks' ) } initialOpen={ false }>
				<ResponsiveBoxControl
					label={ __( 'Border width', 'sgs-blocks' ) }
					presets={ [ '10', '20', '30' ] }
					values={ { base: borderWidth ?? {} } }
					showResponsive={ false }
					onChange={ ( _tier, next ) => setAttributes( { borderWidth: next } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
