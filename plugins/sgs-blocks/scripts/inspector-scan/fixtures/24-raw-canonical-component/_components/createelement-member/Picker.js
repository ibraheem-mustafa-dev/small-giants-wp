import * as C from '@wordpress/components';

export default function Picker( { colour, onChange } ) {
	return wp.element.createElement( C.ColorPalette, { value: colour, onChange } );
}
