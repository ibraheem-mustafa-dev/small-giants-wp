export default function Picker( { colour, onChange } ) {
	return wp.element.createElement( window.wp.components.ColorPicker, { color: colour, onChange } );
}
