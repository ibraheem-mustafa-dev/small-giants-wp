const { ColorPicker: Pick } = wp.components;

export default function Picker( { colour, onChange } ) {
	return <Pick color={ colour } onChange={ onChange } />;
}
