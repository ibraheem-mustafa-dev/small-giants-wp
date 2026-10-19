import DesignTokenPicker from '../DesignTokenPicker';

export default function Row( { colour, onChange } ) {
	return <DesignTokenPicker label="Colour" value={ colour } onChange={ onChange } linked />;
}
