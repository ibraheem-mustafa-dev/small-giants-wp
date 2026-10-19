const { createElement } = wp.element;

export default function Picker( { colour, onChange } ) {
	return createElement( ColorPalette, { value: colour, onChange } );
}
