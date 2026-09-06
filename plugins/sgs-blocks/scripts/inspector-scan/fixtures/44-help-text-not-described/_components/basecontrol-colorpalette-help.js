export default function Field( { colours, value, onChange } ) {
	return (
		<BaseControl label="Colour" help={ __( 'Pick a brand colour.', 'sgs-blocks' ) } __nextHasNoMarginBottom>
			<ColorPalette colors={ colours } value={ value } onChange={ onChange } />
		</BaseControl>
	);
}
