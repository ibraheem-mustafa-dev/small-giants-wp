import { ColorPicker as P } from '@wordpress/components';

export default function Picker( { colour, onChange } ) {
	return <P color={ colour } onChange={ onChange } />;
}
