import { ColorPalette } from '../colour-picker';

export default function Fork( { value, onChange } ) {
	return <ColorPalette value={ value } onChange={ onChange } />;
}
