export default function Field( { value, onChange } ) {
	return (
		<BaseControl label="Size" help={ __( 'Choose a size.', 'sgs-blocks' ) } __nextHasNoMarginBottom>
			<SelectControl options={ [] } value={ value } onChange={ onChange } />
		</BaseControl>
	);
}
