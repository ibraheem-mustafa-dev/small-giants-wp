import { ColorPicker } from '@wordpress/components';

export function ColorPalette( { value, onChange } ) {
	return <ColorPicker color={ value } onChange={ onChange } />;
}
