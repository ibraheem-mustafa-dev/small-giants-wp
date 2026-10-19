import * as C from '@wordpress/components';

const P = C.ColorPalette;

export default function Picker( { colour, onChange } ) {
	return <P value={ colour } onChange={ onChange } />;
}
