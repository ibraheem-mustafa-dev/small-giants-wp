/**
 * Fixture: refusal -- heading's real shape. Border colour+style is mounted
 * TWICE: once embedded in the colourRows entry, once more via a standalone
 * <DesignTokenPicker borderStyle=... onBorderStyleChange=...>. Must be
 * refused as 'style-mount-count!=1' (embedded:1 + other:1), never folded
 * into either recognised case.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { borderStyle, borderColour, borderColourGradient, borderWidth } = attributes;
	return (
		<InspectorControls>
			<SgsColourPanel
				rows={ [
					{
						key: 'border',
						label: __( 'Border colour', 'sgs-blocks' ),
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
			<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
				<DesignTokenPicker
					label={ __( 'Border colour', 'sgs-blocks' ) }
					borderStyle={ borderStyle }
					onBorderStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
					states={ [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: borderColour,
							onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
							linked: true,
							gradientValue: borderColourGradient,
							onGradientChange: ( val ) => setAttributes( { borderColourGradient: val ?? '' } ),
						},
					] }
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
