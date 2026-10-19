import { ColorPalette } from '@wordpress/components';

export default function ShadowColour( { colour, onChange } ) {
	return <ColorPalette value={ colour } onChange={ onChange } />;
}
